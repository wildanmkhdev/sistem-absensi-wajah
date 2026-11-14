"""
ML Package for Face Recognition & Benchmark Analysis
Sistem Presensi Wajah Berbasis AI (Studi Kasus Kelompok 6 & UU PDP)
"""

from app.ml.engine import (
    process_face_image,
    compute_similarity,
    load_image,
    extract_features_numpy,
    generate_benchmark_embedding,
)

from app.ml.benchmark import (
    BENCHMARK_CASES,
    evaluate_initial_rule,
    evaluate_uu_pdp_rule,
    run_benchmark,
    get_benchmark_summary,
)

__all__ = [
    "process_face_image",
    "compute_similarity",
    "load_image",
    "extract_features_numpy",
    "generate_benchmark_embedding",
    "BENCHMARK_CASES",
    "evaluate_initial_rule",
    "evaluate_uu_pdp_rule",
    "run_benchmark",
    "get_benchmark_summary",
]
