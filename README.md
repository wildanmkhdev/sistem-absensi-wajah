---
title: Sistem Presensi Wajah AI
emoji: 📸
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Sistem Presensi Wajah AI

Presensi perkuliahan berbasis pengenalan wajah dan GPS dengan keputusan otomatis yang dapat ditinjau manusia (human oversight), sesuai UU PDP No. 27/2022 Pasal 34.

## Fitur

- Presensi swafoto dengan skor kemiripan wajah dan validasi jarak GPS ke ruang kelas.
- Keputusan otomatis: `HADIR`, `TERLAMBAT`, `TIDAK_SAH`; kasus ambang batas dialihkan ke dosen sebagai `PERLU_VERIFIKASI_DOSEN`.
- Review dosen untuk menyetujui atau menolak kasus yang tertahan, lengkap dengan catatan keputusan.
- Enam kasus benchmark (M1–M6) yang membandingkan rancangan awal dengan rancangan UU PDP.
- Riwayat presensi kelas dan pendaftaran wajah mahasiswa.

## Role

- **Mahasiswa** — Presensi, Riwayat Saya, Daftar Wajah.
- **Dosen** — Review Dosen, Riwayat Kelas, Kasus M1–M6.

Pemilihan role hanya pembatas tampilan untuk demo; tidak ada autentikasi password.

## Jalankan lokal

Backend (FastAPI):

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 7860
```

Frontend (Vite):

```bash
cd frontend
bun install
bun run dev
```

Buka `http://localhost:5173`.

Docker:

```bash
docker build -t presensi-wajah .
docker run -p 7860:7860 presensi-wajah
```

## Environment

- `DATABASE_URL` — opsional. Connection string PostgreSQL (Neon). Jika kosong, backend memakai SQLite lokal `backend/attendance.db`; pada Hugging Face Space data SQLite hilang saat restart/rebuild, jadi set secret `DATABASE_URL` untuk data persisten.
- `VITE_API_URL` — opsional, hanya saat build frontend. Default: origin yang sama pada port 7860, `http://localhost:7860` saat dev.
