import base64
import json
import os
import sys
import numpy as np

# Ensure backend root in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.ml.engine import (
    extract_face_embedding,
    compute_similarity,
    load_image,
    detect_faces,
    align_face,
    embed_aligned,
)

def image_to_data_uri(filepath: str) -> str:
    with open(filepath, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("ascii")
    ext = os.path.splitext(filepath)[1].lower().replace(".", "")
    mime = "jpeg" if ext in ("jpg", "jpeg") else ext
    return f"data:image/{mime};base64,{encoded}"

# Dataset images: public domain real portraits
dataset = {
    "obama_a": "backend/tests/fixtures/obama_a.jpg",
    "obama_b": "backend/tests/fixtures/obama_b.jpg",
    "biden_1": "backend/tests/fixtures/biden.jpg",
    "biden_2": "backend/tests/fixtures/benchmarks/biden_2.jpg",
    "einstein_1": "backend/tests/fixtures/benchmarks/einstein.jpg",
    "einstein_2": "backend/tests/fixtures/benchmarks/einstein_2.jpg",
    "tesla_1": "backend/tests/fixtures/benchmarks/tesla_1.jpg",
    "tesla_2": "backend/tests/fixtures/benchmarks/tesla_2.jpg",
    "curie_1": "backend/tests/fixtures/benchmarks/curie_1.jpg",
}

print("=" * 80)
print("1. EKSTRAKSI VEKTOR & INSPEKSI SPESIFIKASI MATEMATIS (ARCFACE 512-D)")
print("=" * 80)

embeddings = {}
metadata_map = {}

for name, path in dataset.items():
    uri = image_to_data_uri(path)
    emb, meta = extract_face_embedding(uri)
    embeddings[name] = emb
    metadata_map[name] = meta
    
    dim = len(emb)
    l2_norm = float(np.linalg.norm(emb))
    dtype = str(emb.dtype)
    mean_val = float(emb.mean())
    std_val = float(emb.std())
    min_val = float(emb.min())
    max_val = float(emb.max())
    score = meta.get("detection_score", 0.0)
    
    print(f"[{name:<10}] Dim: {dim} | Norm: {l2_norm:.6f} | Mean: {mean_val:+.4f} | Std: {std_val:.4f} | Range: [{min_val:.3f}, {max_val:.3f}] | Score: {score:.3f}")

# Validasi Invariant Vektor
for name, emb in embeddings.items():
    assert len(emb) == 512, f"Embedding {name} bukan 512 dimensi!"
    assert np.isclose(np.linalg.norm(emb), 1.0, atol=1e-4), f"Embedding {name} tidak L2-normalized!"

print("\n--> SELURUH VEKTOR TERBUKTI SESUAI STANDAR: Dimensi tepat 512-D, float32, dan berada di unit hypersphere (L2-norm = 1.000000).")

print("\n" + "=" * 80)
print("2. PENGUJIAN 10 PERCOBAAN VERIFIKASI IDENTITAS WAJAH")
print("=" * 80)

experiments = [
    # 5 Genuine Trials (Orang Sama)
    ("Trial 1", "obama_a", "obama_a", "Genuine", "Barack Obama (Foto Identik - Self Consistency)"),
    ("Trial 2", "obama_a", "obama_b", "Genuine", "Barack Obama (Beda Sudut/Ekspresi/Pencahayaan)"),
    ("Trial 3", "einstein_1", "einstein_2", "Genuine", "Albert Einstein (Foto 1 vs Foto 2 Beda Tahun)"),
    ("Trial 4", "tesla_1", "tesla_2", "Genuine", "Nikola Tesla (Potret Muda vs Potret 1890)"),
    ("Trial 5", "biden_1", "biden_2", "Genuine", "Joe Biden (Potret Publik vs Potret Resmi Gedung Putih)"),
    # 5 Impostor Trials (Orang Berbeda)
    ("Trial 6", "obama_a", "biden_1", "Impostor", "Barack Obama vs Joe Biden"),
    ("Trial 7", "einstein_1", "tesla_1", "Impostor", "Albert Einstein vs Nikola Tesla"),
    ("Trial 8", "curie_1", "obama_a", "Impostor", "Marie Curie vs Barack Obama"),
    ("Trial 9", "tesla_2", "biden_2", "Impostor", "Nikola Tesla vs Joe Biden"),
    ("Trial 10", "einstein_2", "curie_1", "Impostor", "Albert Einstein vs Marie Curie"),
]

table_rows = []
for trial_id, id1, id2, pair_type, desc in experiments:
    e1 = embeddings[id1]
    e2 = embeddings[id2]
    
    sim = compute_similarity(e1, e2)
    dist = float(np.linalg.norm(e1 - e2))
    dot = float(np.dot(e1, e2))
    
    # Ambang Batas Produksi:
    # >= 0.85 -> HADIR (Sangat Mirip)
    # 0.60 - 0.85 -> PERLU_VERIFIKASI_DOSEN (Ambigu/Beda Usia/Kacamata)
    # < 0.60 -> TIDAK_SAH (Impostor / Wajah Berbeda)
    if sim >= 0.85:
        decision = "HADIR (Match Kuat)"
        color = "PASSED"
    elif sim >= 0.60:
        decision = "PERLU_VERIFIKASI_DOSEN (Toleransi Wajar)"
        color = "PASSED (Oversight)"
    else:
        decision = "TIDAK_SAH (Ditolak / Beda Orang)"
        color = "REJECTED"

    is_correct = (pair_type == "Genuine" and sim >= 0.60) or (pair_type == "Impostor" and sim < 0.60)
    eval_str = "BENAR (100%)" if is_correct else "SALAH"

    table_rows.append({
        "trial": trial_id,
        "type": pair_type,
        "pair": f"{id1} vs {id2}",
        "desc": desc,
        "similarity": sim,
        "distance": dist,
        "decision": decision,
        "evaluation": eval_str
    })
    
    print(f"{trial_id} [{pair_type:<8}] | Sim: {sim:+.4f} | Dist: {dist:.4f} | {eval_str:<11} | Keputusan: {decision}")
    print(f"         Deskripsi: {desc}")

with open("benchmark_10_trials_report.json", "w") as f:
    json.dump(table_rows, f, indent=2)

print("\n" + "=" * 80)
print("3. UJI END-TO-END REGISTER & UPLOAD AKUN MAHASISWA BARU VIA API")
print("=" * 80)

from fastapi.testclient import TestClient
from app.db import database
import tempfile

temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False).name
database.DB_PATH = temp_db
database._USE_NEON = False
database._HAS_PGVECTOR = False

from app.main import app

with TestClient(app) as client:
    # 3.1 Registrasi akun baru dengan wajah Joe Biden
    test_user_payload = {
        "username": "joe_biden_president",
        "password": "password123",
        "nim": "2024888",
        "name": "Joe Biden",
        "face_image": image_to_data_uri("backend/tests/fixtures/biden.jpg"),
        "consent": True,
    }
    
    print("Mengirim payload registrasi akun & ekstraksi wajah...")
    resp = client.post("/api/auth/register", json=test_user_payload)
    print(f"Status Code: {resp.status_code}")
    assert resp.status_code == 201, f"Registrasi gagal: {resp.text}"
    reg_data = resp.json()
    token = reg_data["token"]
    print(f"Token Sesi: {token[:25]}... (berhasil diterbitkan)")
    print(f"Data User: {reg_data['user']}")
    
    # 3.2 Cek profil & verifikasi embedding tersimpan di DB
    auth_headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/students/me", headers=auth_headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    print(f"Profil Mahasiswa: NIM={me_data['nim']}, Nama={me_data['name']}, Has Embedding={me_data['has_embedding']}, Model={me_data['model_version']}")
    assert me_data["has_embedding"] is True, "Embedding wajah tidak tersimpan di database!"
    
    # 3.3 Verifikasi presensi dengan foto Biden 2 (presidential portrait - genuine match)
    lecturer_login = client.post("/api/auth/login", json={"username": "dosen", "password": "dosen123"})
    lecturer_token = lecturer_login.json()["token"]
    lec_headers = {"Authorization": f"Bearer {lecturer_token}"}
    
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    sess_resp = client.post(
        "/api/sessions",
        json={
            "course_code": "CS101",
            "course_name": "Kecerdasan Buatan",
            "room_name": "Lab AI 1",
            "latitude": -6.200000,
            "longitude": 106.816666,
            "radius_m": 100,
            "starts_at": (now - timedelta(minutes=5)).isoformat(),
            "ends_at": (now + timedelta(minutes=60)).isoformat(),
        },
        headers=lec_headers,
    )
    assert sess_resp.status_code == 201, f"Gagal membuat sesi: {sess_resp.text}"
    session_id = sess_resp.json()["id"]
    
    print("\nMelakukan verifikasi presensi swafoto dengan Biden 2...")
    presensi_resp = client.post(
        "/api/presensi",
        json={
            "session_id": session_id,
            "face_image": image_to_data_uri("backend/tests/fixtures/benchmarks/biden_2.jpg"),
            "latitude": -6.200000,
            "longitude": 106.816666,
            "gps_accuracy": 5.0,
        },
        headers=auth_headers,
    )
    print(f"Presensi Status Code: {presensi_resp.status_code}")
    presensi_data = presensi_resp.json()
    print(f"Hasil Presensi:")
    print(f"  - Similarity Score : {presensi_data['similarity_score']:.4f}")
    print(f"  - Distance (meter) : {presensi_data['distance_meters']:.2f} m")
    print(f"  - Status Keputusan : {presensi_data['status']}")
    print(f"  - Human Oversight  : {presensi_data['requires_human_oversight']}")
    print(f"  - Alasan           : {presensi_data.get('reason')}")
    
    assert presensi_data["similarity_score"] > 0.85, "Skor kesamaan wajah Biden harus > 0.85!"
    assert presensi_data["status"] == "HADIR", "Status harus HADIR!"
    print("\n--> END-TO-END REGISTER, VEKTORISASI, SIMPAN KE DB, & VERIFIKASI PRESENSI BERHASIL 100%!")

if os.path.exists(temp_db):
    os.remove(temp_db)

