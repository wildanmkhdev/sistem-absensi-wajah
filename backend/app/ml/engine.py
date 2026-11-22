"""
Face Recognition Engine — SCRFD detection + ArcFace embedding.

Pipeline:
    1. Decode & normalise input image (base64 / bytes / path / PIL / ndarray).
    2. Detect faces with SCRFD-500M (ONNX, CPU).
    3. Pick the largest face and align it to the ArcFace 5-point template.
    4. Extract a 512-D embedding with ArcFace MobileFaceNet (w600k_mbf).
    5. Compare embeddings with cosine similarity.

Design notes:
    * Fail-closed: when no face passes the quality gate we raise, we never
      silently produce an embedding from background pixels.
    * The detector quality gate (`FACE_DETECTION_MIN_SCORE`, default 0.65)
      rejects non-photographic inputs (illustrations, thumbnails, blurry
      frames) instead of enrolling garbage templates.
    * Embeddings are L2-normalised, so cosine similarity is a plain dot
      product. Scores are reported in [0, 1]; negative cosine is clamped to 0
      because a negative correlation is never a match.
    * `model_name` / `model_version` are persisted with every template so a
      future model swap cannot silently compare incompatible vectors.
"""

from __future__ import annotations

import base64
import io
import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
from PIL import Image, ImageOps

logger = logging.getLogger("ml.engine")

# ==============================================================================
# CONFIGURATION
# ==============================================================================
_MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "weights")

DETECTOR_PATH = os.environ.get(
    "FACE_DETECTOR_PATH", os.path.join(_MODEL_DIR, "scrfd_500m.onnx")
)
RECOGNIZER_PATH = os.environ.get(
    "FACE_RECOGNIZER_PATH", os.path.join(_MODEL_DIR, "arcface_w600k_mbf.onnx")
)

MODEL_NAME = os.environ.get("FACE_MODEL_NAME", "scrfd_500m+arcface_w600k_mbf")
MODEL_VERSION = os.environ.get("FACE_MODEL_VERSION", "1.0.0")
EMBEDDING_DIM = 512

DETECTOR_INPUT_SIZE = int(os.environ.get("FACE_DETECTOR_INPUT_SIZE", "320"))
DETECTION_MIN_SCORE = float(os.environ.get("FACE_DETECTION_MIN_SCORE", "0.65"))
NMS_IOU_THRESHOLD = float(os.environ.get("FACE_NMS_IOU_THRESHOLD", "0.4"))
MIN_FACE_PIXELS = int(os.environ.get("FACE_MIN_PIXELS", "48"))

# Maximum accepted upload size (bytes, after base64 decode).
MAX_IMAGE_BYTES = int(os.environ.get("FACE_MAX_IMAGE_BYTES", str(8 * 1024 * 1024)))
# Reject absurdly large pixel dimensions before decoding to a bitmap.
MAX_IMAGE_PIXELS = int(os.environ.get("FACE_MAX_IMAGE_PIXELS", str(20_000_000)))

# ArcFace reference landmarks for a 112x112 aligned crop.
_ARC_TEMPLATE = np.array(
    [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041],
    ],
    dtype=np.float64,
)
_ALIGNED_SIZE = 112


class FaceEngineError(Exception):
    """Base class for face engine failures."""


class FaceEngineUnavailable(FaceEngineError):
    """ONNX runtime or model weights are not available."""


class FaceNotFound(FaceEngineError):
    """No face passed the detection quality gate."""


class InvalidImage(FaceEngineError):
    """The supplied image could not be decoded."""


# ==============================================================================
# SESSION MANAGEMENT (lazy, process-wide)
# ==============================================================================
_SESSIONS: Optional[Tuple[Any, Any]] = None
_SESSION_ERROR: Optional[str] = None


def _create_session(path: str):
    import onnxruntime as ort

    if not os.path.isfile(path):
        raise FaceEngineUnavailable(f"Model tidak ditemukan: {path}")

    options = ort.SessionOptions()
    options.intra_op_num_threads = int(os.environ.get("FACE_ORT_THREADS", "2"))
    options.inter_op_num_threads = 1
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    options.log_severity_level = 3
    return ort.InferenceSession(path, options, providers=["CPUExecutionProvider"])


def get_sessions():
    """Return (detector, recognizer) sessions, loading them once per process."""
    global _SESSIONS, _SESSION_ERROR
    if _SESSIONS is not None:
        return _SESSIONS
    try:
        detector = _create_session(DETECTOR_PATH)
        recognizer = _create_session(RECOGNIZER_PATH)
        _SESSIONS = (detector, recognizer)
        _SESSION_ERROR = None
        logger.info(
            "Face engine loaded: %s (detector=%s, recognizer=%s)",
            MODEL_NAME,
            os.path.basename(DETECTOR_PATH),
            os.path.basename(RECOGNIZER_PATH),
        )
        return _SESSIONS
    except Exception as exc:  # noqa: BLE001 - surfaced through API
        _SESSION_ERROR = str(exc)
        raise FaceEngineUnavailable(str(exc)) from exc


def is_available() -> bool:
    """True when both ONNX sessions can be created."""
    try:
        get_sessions()
        return True
    except FaceEngineUnavailable:
        return False


def engine_info() -> Dict[str, Any]:
    """Diagnostics for /health and the UI."""
    available = is_available()
    return {
        "available": available,
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "embedding_dim": EMBEDDING_DIM,
        "detector": os.path.basename(DETECTOR_PATH),
        "recognizer": os.path.basename(RECOGNIZER_PATH),
        "detector_input_size": DETECTOR_INPUT_SIZE,
        "detection_min_score": DETECTION_MIN_SCORE,
        "error": None if available else _SESSION_ERROR,
    }


# ==============================================================================
# IMAGE LOADING
# ==============================================================================
def load_image(
    image_input: Union[bytes, bytearray, str, os.PathLike, Image.Image, np.ndarray],
) -> Image.Image:
    """
    Normalise any supported input into an RGB PIL image.

    Accepts base64 strings (with or without a data-URI prefix), raw bytes,
    filesystem paths, PIL images and numpy arrays. EXIF orientation is applied
    so portrait phone photos are not analysed sideways.
    """
    try:
        if isinstance(image_input, os.PathLike):
            image_input = os.fspath(image_input)

        if isinstance(image_input, Image.Image):
            img = image_input
        elif isinstance(image_input, np.ndarray):
            if image_input.ndim == 2:
                img = Image.fromarray(image_input)
            elif image_input.ndim == 3:
                img = Image.fromarray(image_input.astype(np.uint8))
            else:
                raise InvalidImage(
                    f"Array shape tidak didukung untuk gambar: {image_input.shape}"
                )
        elif isinstance(image_input, (bytes, bytearray)):
            raw = bytes(image_input)
            if len(raw) > MAX_IMAGE_BYTES:
                raise InvalidImage("Ukuran gambar melebihi batas yang diizinkan.")
            img = Image.open(io.BytesIO(raw))
        elif isinstance(image_input, str):
            value = image_input.strip()
            if os.path.isfile(value):
                if os.path.getsize(value) > MAX_IMAGE_BYTES:
                    raise InvalidImage("Ukuran gambar melebihi batas yang diizinkan.")
                img = Image.open(value)
            else:
                if "," in value and ";base64" in value:
                    value = value.split(",", 1)[1]
                try:
                    raw = base64.b64decode(value, validate=False)
                except Exception as exc:  # noqa: BLE001
                    raise InvalidImage("Gagal mendekode base64 gambar.") from exc
                if not raw:
                    raise InvalidImage("Data gambar kosong.")
                if len(raw) > MAX_IMAGE_BYTES:
                    raise InvalidImage("Ukuran gambar melebihi batas yang diizinkan.")
                img = Image.open(io.BytesIO(raw))
        else:
            raise InvalidImage(
                f"Tipe data gambar tidak didukung: {type(image_input).__name__}"
            )

        if img.width * img.height > MAX_IMAGE_PIXELS:
            raise InvalidImage("Resolusi gambar terlalu besar.")

        img = ImageOps.exif_transpose(img)
        return img.convert("RGB")
    except FaceEngineError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise InvalidImage(f"Gambar tidak valid: {exc}") from exc


# ==============================================================================
# DETECTION (SCRFD)
# ==============================================================================
@dataclass
class DetectedFace:
    score: float
    box: np.ndarray  # x1, y1, x2, y2 in original image coordinates
    landmarks: np.ndarray  # 5x2

    @property
    def area(self) -> float:
        return float(max(0.0, self.box[2] - self.box[0]) * max(0.0, self.box[3] - self.box[1]))


def _nms(dets: List[DetectedFace], iou_threshold: float) -> List[DetectedFace]:
    if not dets:
        return []
    dets = sorted(dets, key=lambda d: d.score, reverse=True)
    keep: List[DetectedFace] = []
    for cand in dets:
        ax1, ay1, ax2, ay2 = cand.box
        discard = False
        for kept in keep:
            bx1, by1, bx2, by2 = kept.box
            ix = max(0.0, min(ax2, bx2) - max(ax1, bx1))
            iy = max(0.0, min(ay2, by2) - max(ay1, by1))
            inter = ix * iy
            union = cand.area + kept.area - inter
            if union > 0 and inter / union > iou_threshold:
                discard = True
                break
        if not discard:
            keep.append(cand)
    return keep


def _decode_scrfd(outputs, input_size: int, min_score: float):
    """Decode SCRFD raw outputs (scores, bboxes, keypoints for 3 strides)."""
    if len(outputs) != 9:
        raise FaceEngineUnavailable(
            f"Format output detektor tidak dikenali (jumlah output={len(outputs)})."
        )

    strides = (8, 16, 32)
    num_anchors = 2
    dets: List[DetectedFace] = []

    for i, stride in enumerate(strides):
        scores = outputs[i][:, 0]
        bbox_preds = outputs[3 + i]
        kps_preds = outputs[6 + i]

        grid_h = input_size // stride
        grid_w = input_size // stride
        expected = grid_h * grid_w * num_anchors
        if scores.shape[0] != expected:
            # Model was built for a different input size; skip this stride.
            logger.warning(
                "SCRFD stride %d: expected %d anchors, got %d", stride, expected, scores.shape[0]
            )
            continue

        ys, xs = np.mgrid[0:grid_h, 0:grid_w]
        centers = (
            np.stack([xs, ys], axis=-1).reshape(-1, 2).astype(np.float32) * stride
        )
        centers = np.repeat(centers, num_anchors, axis=0)

        for idx in np.where(scores >= min_score)[0]:
            center = centers[idx]
            distance = bbox_preds[idx] * stride
            box = np.array(
                [
                    center[0] - distance[0],
                    center[1] - distance[1],
                    center[0] + distance[2],
                    center[1] + distance[3],
                ],
                dtype=np.float32,
            )
            landmarks = (
                kps_preds[idx].reshape(5, 2) * stride + center
            ).astype(np.float32)
            dets.append(
                DetectedFace(
                    score=float(scores[idx]),
                    box=box,
                    landmarks=landmarks,
                )
            )

    return dets


def detect_faces(
    image: Union[Image.Image, str, bytes, np.ndarray],
    input_size: Optional[int] = None,
    min_score: Optional[float] = None,
) -> List[DetectedFace]:
    """Detect faces and return them in original-image coordinates."""
    img = load_image(image)
    size = input_size or DETECTOR_INPUT_SIZE
    threshold = DETECTION_MIN_SCORE if min_score is None else min_score

    detector, _ = get_sessions()

    resized = img.resize((size, size), Image.Resampling.BILINEAR)
    arr = np.asarray(resized, dtype=np.float32)[:, :, ::-1]  # RGB -> BGR
    blob = ((arr - 127.5) / 128.0).transpose(2, 0, 1)[None]

    input_name = detector.get_inputs()[0].name
    outputs = detector.run(None, {input_name: blob})

    dets = _decode_scrfd(outputs, size, threshold)

    # Scale boxes/landmarks back to the original image.
    sx = img.width / size
    sy = img.height / size
    for det in dets:
        det.box[0] *= sx
        det.box[2] *= sx
        det.box[1] *= sy
        det.box[3] *= sy
        det.landmarks[:, 0] *= sx
        det.landmarks[:, 1] *= sy

    dets = _nms(dets, NMS_IOU_THRESHOLD)
    dets = [
        d
        for d in dets
        if min(d.box[2] - d.box[0], d.box[3] - d.box[1]) >= MIN_FACE_PIXELS
    ]
    return dets


# ==============================================================================
# ALIGNMENT
# ==============================================================================
def _umeyama(src: np.ndarray, dst: np.ndarray) -> np.ndarray:
    """Least-squares similarity transform (scale + rotation + translation)."""
    src = np.asarray(src, dtype=np.float64)
    dst = np.asarray(dst, dtype=np.float64)
    src_mean = src.mean(axis=0)
    dst_mean = dst.mean(axis=0)
    src_d = src - src_mean
    dst_d = dst - dst_mean

    cov = dst_d.T @ src_d / src.shape[0]
    u, s, vt = np.linalg.svd(cov)

    d = np.ones(2)
    if np.linalg.det(u) * np.linalg.det(vt) < 0:
        d[-1] = -1.0

    rotation = u @ np.diag(d) @ vt
    var_src = (src_d ** 2).sum() / src.shape[0]
    if var_src <= 1e-12:
        raise FaceNotFound("Landmark wajah tidak valid untuk alignment.")
    scale = (s * d).sum() / var_src

    transform = np.zeros((2, 3), dtype=np.float64)
    transform[:, :2] = scale * rotation
    transform[:, 2] = dst_mean - scale * rotation @ src_mean
    return transform


def _warp_bilinear(arr: np.ndarray, matrix: np.ndarray, size: int) -> np.ndarray:
    """Warp an HxWx3 array into size x size using a 2x3 affine matrix."""
    h, w = arr.shape[:2]
    inverse = np.linalg.inv(np.vstack([matrix, [0, 0, 1]]))[:2]

    xs, ys = np.meshgrid(np.arange(size), np.arange(size))
    ones = np.ones_like(xs)
    dst = np.stack([xs, ys, ones], axis=-1).reshape(-1, 3).astype(np.float64)
    src = dst @ inverse.T

    x = src[:, 0]
    y = src[:, 1]
    x0 = np.floor(x).astype(np.int64)
    y0 = np.floor(y).astype(np.int64)
    x1 = x0 + 1
    y1 = y0 + 1
    wx = (x - x0)[:, None]
    wy = (y - y0)[:, None]

    x0c = np.clip(x0, 0, w - 1)
    x1c = np.clip(x1, 0, w - 1)
    y0c = np.clip(y0, 0, h - 1)
    y1c = np.clip(y1, 0, h - 1)

    src_arr = arr.astype(np.float32)
    top = src_arr[y0c, x0c] * (1 - wx) + src_arr[y0c, x1c] * wx
    bottom = src_arr[y1c, x0c] * (1 - wx) + src_arr[y1c, x1c] * wx
    out = top * (1 - wy) + bottom * wy
    return np.clip(out, 0, 255).reshape(size, size, 3).astype(np.uint8)


def align_face(img: Image.Image, face: DetectedFace, size: int = _ALIGNED_SIZE) -> np.ndarray:
    """Align a detected face to the ArcFace template and return RGB uint8."""
    matrix = _umeyama(face.landmarks, _ARC_TEMPLATE * (size / 112.0))
    arr = np.asarray(img, dtype=np.uint8)
    return _warp_bilinear(arr, matrix, size)


# ==============================================================================
# EMBEDDING
# ==============================================================================
def embed_aligned(aligned_rgb: np.ndarray) -> np.ndarray:
    """Run ArcFace on an aligned 112x112 RGB crop and L2-normalise the output."""
    _, recognizer = get_sessions()
    x = aligned_rgb.astype(np.float32)
    x = (x - 127.5) / 127.5
    blob = x.transpose(2, 0, 1)[None]
    input_name = recognizer.get_inputs()[0].name
    embedding = recognizer.run(None, {input_name: blob})[0][0].astype(np.float32)
    norm = float(np.linalg.norm(embedding))
    if norm <= 1e-8:
        raise FaceEngineError("Embedding wajah tidak valid (norm ~ 0).")
    return embedding / norm


def extract_face_embedding(
    image_input: Union[bytes, bytearray, str, Image.Image, np.ndarray],
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Full pipeline: decode -> detect -> align -> embed.

    Returns (embedding, metadata). Raises FaceNotFound when no usable face is
    present, so callers can fail closed instead of enrolling a background.
    """
    img = load_image(image_input)
    faces = detect_faces(img)
    if not faces:
        raise FaceNotFound(
            "Wajah tidak terdeteksi. Gunakan foto wajah asli, menghadap kamera, "
            "dengan pencahayaan yang cukup."
        )

    face = max(faces, key=lambda f: f.area)
    aligned = align_face(img, face)
    embedding = embed_aligned(aligned)

    if embedding.shape[0] != EMBEDDING_DIM:
        raise FaceEngineError(
            f"Dimensi embedding tidak sesuai: {embedding.shape[0]} != {EMBEDDING_DIM}"
        )

    image_area = float(img.width * img.height)
    metadata = {
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "detection_score": round(face.score, 4),
        "face_ratio": round(face.area / image_area, 4) if image_area else 0.0,
        "faces_detected": len(faces),
        "image_width": img.width,
        "image_height": img.height,
    }
    return embedding, metadata


def process_face_image(
    image_input: Union[bytes, bytearray, str, Image.Image, np.ndarray],
) -> np.ndarray:
    """Backward-compatible helper returning only the embedding vector."""
    embedding, _ = extract_face_embedding(image_input)
    return embedding


# ==============================================================================
# SIMILARITY
# ==============================================================================
def compute_similarity(emb1: Optional[np.ndarray], emb2: Optional[np.ndarray]) -> float:
    """
    Cosine similarity between two L2-normalised embeddings, in [0, 1].

    Negative cosine (anti-correlated vectors) is clamped to 0.0 because it can
    never represent a genuine match. A score of 0.45 is the default acceptance
    threshold; 0.30-0.45 is the human-oversight band.
    """
    if emb1 is None or emb2 is None:
        return 0.0

    u = np.asarray(emb1, dtype=np.float32).flatten()
    v = np.asarray(emb2, dtype=np.float32).flatten()
    if u.shape != v.shape or u.size == 0:
        return 0.0

    nu = float(np.linalg.norm(u))
    nv = float(np.linalg.norm(v))
    if nu <= 1e-8 or nv <= 1e-8:
        return 0.0

    cosine = float(np.dot(u, v) / (nu * nv))
    return float(np.clip(cosine, 0.0, 1.0))
