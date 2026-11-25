// Konfigurasi Sistem Presensi Wajah & Kepatuhan UU PDP

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && (window.location.port === '7860' || window.location.hostname !== 'localhost')
    ? ''
    : 'http://localhost:7860');

// Koordinat default untuk form pembuatan sesi baru dosen & referensi geofence kelas
// Target: Universitas Islam Negeri Sumatera Utara (UINSU) Kampus IV Tuntungan Medan
export const DEFAULT_CLASSROOM = {
  name: 'UINSU Kampus IV Tuntungan Medan (Lab AI & Komputer)',
  latitude: 3.493832,
  longitude: 98.587816,
  maxDistanceMeters: 50,
};

// Ambang Batas Logika Presensi (ArcFace Cosine Similarity & UU PDP)
export const THRESHOLDS = {
  FACE_SIMILARITY_MIN: 0.45, // Wajah cocok jika cosine >= 0.45
  FACE_AMBIGUOUS_MIN: 0.30,  // Batas bawah human oversight biometrik (0.30 - 0.45)
  FACE_OUTDATED_MIN: 0.15,   // Ambang minimal korelasi wajah sebelum ditolak otomatis
  DISTANCE_VALID_MAX: 50,    // Radius valid di dalam kelas
  DISTANCE_DRIFT_MAX: 100,   // Toleransi GPS drift gedung beton
  LATE_ON_TIME_MAX: 15,      // Terlambat <= 15 menit dianggap HADIR
  LATE_TOLERANCE_MAX: 30,    // 16-30 menit dianggap TERLAMBAT
};
