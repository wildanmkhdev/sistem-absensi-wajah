"""
ML package: face recognition engine + policy benchmark.

The face engine uses SCRFD (detection) + ArcFace (embedding). The benchmark
module evaluates the M1-M6 policy cases and delegates all rule decisions to
``app.core.rules`` so there is a single source of truth.
"""

from app.ml.engine import (
    EMBEDDING_DIM,
    MODEL_NAME,
    MODEL_VERSION,
    DetectedFace,
    FaceEngineError,
    FaceEngineUnavailable,
    FaceNotFound,
    InvalidImage,
    align_face,
    compute_similarity,
    detect_faces,
    embed_aligned,
    engine_info,
    extract_face_embedding,
    is_available,
    load_image,
    process_face_image,
)

from app.ml.benchmark import (
    BENCHMARK_CASES,
    evaluate_initial_rule,
    evaluate_uu_pdp_rule,
    get_benchmark_summary,
    run_benchmark,
)

__all__ = [
    "EMBEDDING_DIM",
    "MODEL_NAME",
    "MODEL_VERSION",
    "DetectedFace",
    "FaceEngineError",
    "FaceEngineUnavailable",
    "FaceNotFound",
    "InvalidImage",
    "align_face",
    "compute_similarity",
    "detect_faces",
    "embed_aligned",
    "engine_info",
    "extract_face_embedding",
    "is_available",
    "load_image",
    "process_face_image",
    "BENCHMARK_CASES",
    "evaluate_initial_rule",
    "evaluate_uu_pdp_rule",
    "get_benchmark_summary",
    "run_benchmark",
]
