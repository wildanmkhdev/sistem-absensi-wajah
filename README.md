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

## Role & Autentikasi

- **Mahasiswa** (`nim` / default credential mahasiswa) — Presensi Sesi Aktif, Riwayat Presensi Saya, Pendaftaran & Penghapusan Biometrik Wajah (UU PDP).
- **Dosen** (`dosen` / `dosen123`) — Manajemen Sesi Kuliah & Geofence, Review Dosen (Human Oversight Pasal 34), Riwayat Kelas Lengkap, Benchmark Studi Kasus M1–M6 (Dry-Run).

Autentikasi menggunakan JSON Web Token (JWT) dengan penegakan `AUTH_SECRET`. Identitas presensi diikat langsung ke klaim token sesi untuk mencegah spoofing NIM.

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

- `DATABASE_URL` — connection string PostgreSQL (Neon). Jika kosong, backend memakai SQLite lokal `backend/attendance.db`.
- `DB_PATH` — lokasi file SQLite fallback. Wajib diarahkan ke direktori writable (`/tmp/attendance.db`) saat runtime read-only.
- `VITE_API_URL` — opsional, hanya saat build frontend. Default: origin yang sama.

## Deployment

### Vercel (production)

Production: <https://sistem-absensi-wajah.vercel.app>

Repo ini dideploy sebagai satu project Vercel dengan **Services**:

| Service | Root | Peran |
| --- | --- | --- |
| `web` | `frontend/` | Vite + React, disajikan dari CDN |
| `api` | `backend/` | FastAPI (Vercel Functions), entrypoint `app/main.py` |

`vercel.json` mengarahkan `/api/*` dan `/health` ke service `api`, sisanya ke `web`.
`.vercelignore` mengecualikan `Dockerfile`, `backend/venv`, database lokal, dan `api/`
agar Vercel tidak salah mendeteksi project sebagai container service.

Environment variable yang wajib diset di Vercel (Production + Preview):

- `DATABASE_URL` — Secret, connection string Neon (gunakan host `-pooler`).
- `DB_PATH` — `/tmp/attendance.db` (fallback SQLite; `/tmp` satu-satunya path writable).

Deploy dari CLI:

```bash
vercel link
vercel deploy --prod
```

### Hugging Face Spaces (Docker)

`Dockerfile` di root membangun frontend lalu menyajikannya lewat FastAPI pada port `7860`.
Set secret `DATABASE_URL` di Space Settings; tanpa itu data SQLite hilang setiap restart.

