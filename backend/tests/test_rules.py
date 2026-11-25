"""Decision-engine tests: one source of truth for attendance policy."""

from datetime import datetime, timedelta, timezone

import pytest

from app.core.rules import (
    BENCHMARK_CASES,
    FACE_BORDERLINE_MIN,
    FACE_MATCH_THRESHOLD,
    MAX_VALID_LATE_MINUTES,
    AttendanceStatus,
    compute_late_minutes,
    evaluate_presensi,
    evaluate_rancangan_awal,
    evaluate_rancangan_uupdp,
)


def test_thresholds_are_on_the_cosine_scale():
    # ArcFace cosine thresholds, not the old chi-square 0.85.
    assert 0.3 <= FACE_MATCH_THRESHOLD <= 0.6
    assert FACE_BORDERLINE_MIN < FACE_MATCH_THRESHOLD


def test_clear_pass_is_hadir():
    status, reason = evaluate_rancangan_awal(0.80, 20.0, 5.0)
    assert status == AttendanceStatus.HADIR
    assert "Wajah cocok" in reason


def test_low_score_is_rejected_by_rigid_design():
    status, _ = evaluate_rancangan_awal(0.20, 10.0, 2.0)
    assert status == AttendanceStatus.TIDAK_SAH


def test_borderline_score_escalates_to_human():
    status, _, oversight, basis = evaluate_rancangan_uupdp(0.44, 15.0, 3.0)
    assert status == AttendanceStatus.PERLU_VERIFIKASI_DOSEN
    assert oversight is True
    assert "Pasal 10" in basis and "Pasal 34" in basis


def test_impostor_score_below_plausible_is_rejected_immediately():
    status, _, oversight, _ = evaluate_rancangan_uupdp(0.28, 10.0, 2.0)
    assert status == AttendanceStatus.TIDAK_SAH
    assert oversight is False


def test_gps_drift_escalates_but_outside_perimeter_rejects():
    drift, _, oversight, _ = evaluate_rancangan_uupdp(0.80, 70.0, 0.0)
    assert drift == AttendanceStatus.PERLU_VERIFIKASI_DOSEN
    assert oversight is True

    outside, _, oversight_out, _ = evaluate_rancangan_uupdp(0.80, 500.0, 0.0)
    assert outside == AttendanceStatus.TIDAK_SAH
    assert oversight_out is False


def test_late_beyond_limit_is_rejected():
    status, _, oversight, _ = evaluate_rancangan_uupdp(0.80, 20.0, 45.0)
    assert status == AttendanceStatus.TIDAK_SAH
    assert oversight is False


def test_late_within_tolerance_is_terlambat():
    status, _, _, _ = evaluate_rancangan_uupdp(0.80, 20.0, 28.0)
    assert status == AttendanceStatus.TERLAMBAT


def test_compute_late_minutes_uses_server_clock():
    now = datetime(2026, 11, 22, 8, 20, tzinfo=timezone.utc)
    start = datetime(2026, 11, 22, 8, 0, tzinfo=timezone.utc)
    assert compute_late_minutes(start, now) == 20.0
    assert compute_late_minutes(start, now, grace_minutes=5) == 15.0
    assert compute_late_minutes(start, start - timedelta(minutes=3)) == 0.0


def test_compute_late_minutes_accepts_iso_strings():
    assert compute_late_minutes("2026-11-22T08:00:00Z", "2026-11-22T08:10:00Z") == 10.0


def test_benchmark_cases_match_expected_policy_outcomes():
    expected = {
        "M1": AttendanceStatus.HADIR,
        "M2": AttendanceStatus.HADIR,
        "M3": AttendanceStatus.PERLU_VERIFIKASI_DOSEN,
        "M4": AttendanceStatus.PERLU_VERIFIKASI_DOSEN,
        "M5": AttendanceStatus.PERLU_VERIFIKASI_DOSEN,
        "M6": AttendanceStatus.TERLAMBAT,
    }
    assert [c["id"] for c in BENCHMARK_CASES] == list(expected)
    for case in BENCHMARK_CASES:
        result = evaluate_presensi(
            case["score"], case["distance"], case["late"], simulated_case=case["id"]
        )
        assert result["status_uupdp"] == expected[case["id"]].value, case["id"]


def test_max_valid_late_minutes_is_thirty():
    assert MAX_VALID_LATE_MINUTES == 30
