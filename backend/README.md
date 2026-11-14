---
title: Sistem Presensi Wajah AI
emoji: 📸
colorFrom: indigo
colorTo: blue
sdk: docker
pinned: false
app_port: 7860
---

# Sistem Presensi Wajah Berbasis AI & Geofencing
### Implementasi Kasus Kelompok 6: Etika AI & UU Pelindungan Data Pribadi (UU No. 27 Tahun 2022)

Sistem presensi mahasiswa berbasis pengenalan wajah (*Face Recognition*) dan verifikasi geofencing GPS, dilengkapi dengan mekanisme **Human Oversight (Human-in-the-Loop)** sesuai amanat Pasal 10 dan Pasal 34 UU PDP untuk mencegah keputusan otomatis sepihak yang merugikan subjek data.

## Fitur Utama:
- **ML Face Recognition Engine**: Ekstraksi face embedding 512-D dan kalkulasi Cosine Similarity.
- **Geofencing GPS**: Formula Haversine dengan ambang radius 50 meter.
- **Decision Rule Engine**:
  - `HADIR`: Skor kemiripan $\ge 0.85$, Jarak $\le 50$m, Keterlambatan $\le 15$ menit.
  - `TERLAMBAT`: Skor kemiripan $\ge 0.85$, Jarak $\le 50$m, Keterlambatan $16 - 30$ menit.
  - `PERLU_VERIFIKASI_DOSEN`: Kasus anomali/ambang (M3: kacamata/redup skor $0.78$; M4: GPS drift $70$m di gedung beton; M5: foto profil lama $6$ tahun).
  - `TIDAK_SAH`: Pelanggaran fatal (jarak $> 100$m, keterlambatan $> 30$ menit, wajah sangat tidak cocok $< 0.35$).
- **Dashboard Human Oversight**: Review manual dan eskalasi dosen untuk menyetujui atau menolak presensi.
- **Tabel Benchmark Interaktif**: Komparasi langsung 6 kasus mahasiswa (M1 s.d. M6) antara Rancangan Awal Kaku vs Rancangan Berkeadilan UU PDP.

## Arsitektur:
- **Frontend**: React 19 + TypeScript + Tailwind CSS + Lucide Icons.
- **Backend**: FastAPI + SQLite + NumPy ML Engine.
