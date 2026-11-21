// Konfigurasi Sistem Presensi Wajah & Kepatuhan UU PDP

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && (window.location.port === '7860' || window.location.hostname !== 'localhost')
    ? ''
    : 'http://localhost:7860');

// Lokasi Target Ruang Kelas (Sesuai Studi Kasus Modul 13 Kelompok 6)
export const DEFAULT_CLASSROOM = {
  name: 'Ruang Kuliah Lab AI (Gedung B Lt. 3)',
  latitude: -6.200000,
  longitude: 106.816666,
  maxDistanceMeters: 50, // Batas toleransi lokasi valid
};

// Ambang Batas Logika Presensi (Modul 13 & UU PDP Pasal 34)
export const THRESHOLDS = {
  FACE_SIMILARITY_MIN: 0.85, // Wajah dianggap cocok jika >= 0.85
  FACE_AMBIGUOUS_MIN: 0.70,  // Kasus ambang pencahayaan/kacamata (M3: 0.78)
  FACE_OUTDATED_MIN: 0.35,   // Ambang minimal pengenalan foto lama (M5: 0.40)
  DISTANCE_VALID_MAX: 50,    // Jarak valid <= 50 meter
  DISTANCE_DRIFT_MAX: 100,   // Ambang batas toleransi GPS drift gedung beton (M4: 70m)
  LATE_ON_TIME_MAX: 15,      // Terlambat <= 15 menit dianggap HADIR
  LATE_TOLERANCE_MAX: 30,    // 16-30 menit dianggap TERLAMBAT
};
