"""Face engine quality tests on real (public-domain) photographs.

The demo dataset under ``data/`` contains cartoon placeholders that no face
model can separate; these fixtures are real portraits, so a genuine/impostor
separation can be asserted.
"""

from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from app.ml.engine import (
    FaceNotFound,
    compute_similarity,
    detect_faces,
    extract_face_embedding,
    is_available,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures"
REPO_ROOT = Path(__file__).resolve().parents[2]


pytestmark = pytest.mark.skipif(
    not is_available(), reason="ONNX face models are not available"
)


def embed(name: str):
    return extract_face_embedding(FIXTURES / name)


def test_same_person_scores_higher_than_impostor():
    obama_a, _ = embed("obama_a.jpg")
    obama_b, _ = embed("obama_b.jpg")
    biden, _ = embed("biden.jpg")

    genuine = compute_similarity(obama_a, obama_b)
    impostor_a = compute_similarity(obama_a, biden)
    impostor_b = compute_similarity(obama_b, biden)

    assert genuine > 0.6, genuine
    assert impostor_a < 0.2, impostor_a
    assert impostor_b < 0.2, impostor_b
    assert genuine - max(impostor_a, impostor_b) > 0.4


def test_embedding_is_l2_normalised_512d():
    embedding, metadata = embed("obama_a.jpg")
    assert embedding.shape == (512,)
    assert np.isclose(np.linalg.norm(embedding), 1.0, atol=1e-4)
    assert metadata["faces_detected"] == 1
    assert metadata["detection_score"] > 0.65


def test_non_photographic_input_is_rejected():
    """The bundled cartoon dataset must fail closed instead of enrolling."""
    cartoon = REPO_ROOT / "data" / "foto_profil" / "M1_profil.jpg"
    if not cartoon.exists():
        pytest.skip("cartoon fixture not present")
    with pytest.raises(FaceNotFound):
        extract_face_embedding(cartoon)


def test_multiple_faces_are_all_detected():
    left = Image.open(FIXTURES / "obama_a.jpg").convert("RGB")
    right = Image.open(FIXTURES / "biden.jpg").convert("RGB")
    canvas = Image.new("RGB", (left.width + right.width, max(left.height, right.height)))
    canvas.paste(left, (0, 0))
    canvas.paste(right, (left.width, 0))

    faces = detect_faces(canvas)
    assert len(faces) >= 2


def test_score_is_symmetric_and_bounded():
    a, _ = embed("obama_a.jpg")
    b, _ = embed("biden.jpg")
    assert compute_similarity(a, b) == pytest.approx(compute_similarity(b, a), abs=1e-6)
    assert 0.0 <= compute_similarity(a, b) <= 1.0
    assert compute_similarity(None, b) == 0.0
