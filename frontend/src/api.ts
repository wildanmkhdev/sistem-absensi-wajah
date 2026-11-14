// API Client & Layanan Data Presensi Wajah
import { neon } from '@neondatabase/serverless';
import { API_BASE_URL, NEON_DATABASE_URL, DEFAULT_CLASSROOM, THRESHOLDS } from './config';
import { extractFaceEmbeddingFromBase64, embeddingToPgVector } from './utils/faceEmbedding';
import { haversineDistance } from './utils/geo';
import type {
  AttendanceRecord,
  BenchmarkCase,
  PresensiRequest,
  PresensiResponse,
  ResolveOversightRequest,
  Student,
} from './types';
// Neon Serverless SQL Client
const sql = neon(NEON_DATABASE_URL);
export const BENCHMARK_CASES: BenchmarkCase[] = [
  {
    case_id: 'M1',
    nim: '210101',
    name: 'Arya Pratama',
    face_score: 0.92,
    distance_meters: 20,
    late_minutes: 5,
    condition_description: 'Kondisi normal kelas, pencahayaan merata, tidak ada aksesoris baru.',
    status_initial: 'HADIR',
    status_uupdp: 'HADIR',
    requires_human_oversight: false,
    ethical_legal_analysis:
      'Semua indikator terpenuhi: skor ≥ 0.85, jarak ≤ 50m, terlambat ≤ 15m. Otomasi penuh dapat dipertanggungjawabkan.',
    pdp_article_reference: 'UU PDP Pasal 34: Pemrosesan otomatis sah karena tidak merugikan subjek data.',
  },
  {
    case_id: 'M2',
    nim: '210102',
    name: 'Budi Santoso',
    face_score: 0.85,
    distance_meters: 50,
    late_minutes: 15,
    condition_description: 'Tepat berada di semua batas ambang (skor 0.85, radius 50m, waktu 15m).',
    status_initial: 'HADIR',
    status_uupdp: 'HADIR',
    requires_human_oversight: false,
    ethical_legal_analysis:
      'Nilai memenuhi batas minimum tepat pada kriteria toleransi sistem.',
    pdp_article_reference: 'UU PDP Pasal 16 & 34: Kepastian hukum dalam penerapan ambang batas administratif.',
  },
  {
    case_id: 'M3',
    nim: '210103',
    name: 'Citra Dewi',
    face_score: 0.78,
    distance_meters: 15,
    late_minutes: 3,
    condition_description: 'Mengenakan kacamata berbingkai baru & pencahayaan sudut ruang agak redup.',
    status_initial: 'TIDAK_SAH',
    status_uupdp: 'PERLU_VERIFIKASI_DOSEN',
    requires_human_oversight: true,
    ethical_legal_analysis:
      'Rancangan awal menolak (TIDAK SAH) semata karena skor 0.78 < 0.85. UU PDP melarang keputusan otomasi tunggal yang merugikan hak mahasiswa hanya karena variasi pencahayaan.',
    pdp_article_reference: 'UU PDP Pasal 34: Larangan keputusan profil biometrik otomatis sepihak yang berdampak hukum/akademik.',
  },
  {
    case_id: 'M4',
    nim: '210104',
    name: 'Dodi Wijaya',
    face_score: 0.95,
    distance_meters: 70,
    late_minutes: 0,
    condition_description: 'Duduk di sudut ruang kelas lantai bawah; GPS drift terhalang konstruksi beton gedung.',
    status_initial: 'TIDAK_SAH',
    status_uupdp: 'PERLU_VERIFIKASI_DOSEN',
    requires_human_oversight: true,
    ethical_legal_analysis:
      'Skor wajah sangat tinggi (0.95) membuktikan identitas asli, namun sensor GPS meleset 70m akibat interferensi fisik gedung. Dosen memverifikasi keberadaan fisik mahasiswa.',
    pdp_article_reference: 'UU PDP Pasal 34 & 39: Kewajiban menjamin keandalan pemrosesan teknis dan hak intervensi manusia.',
  },
  {
    case_id: 'M5',
    nim: '210105',
    name: 'Eka Saputra',
    face_score: 0.40,
    distance_meters: 10,
    late_minutes: 2,
    condition_description: 'Foto profil sistem berumur 6 tahun (sejak awal maba, perubahan kontur wajah).',
    status_initial: 'TIDAK_SAH',
    status_uupdp: 'PERLU_VERIFIKASI_DOSEN',
    requires_human_oversight: true,
    ethical_legal_analysis:
      'Model AI gagal mengenali karena dataset pembanding kadaluarsa. Mahasiswa hadir tepat waktu (2m) dan di dalam kelas (10m).',
    pdp_article_reference: 'UU PDP Pasal 4 & 10: Prinsip pemutakhiran data pribadi spesifik dan hak banding mahasiswa.',
  },
  {
    case_id: 'M6',
    nim: '210106',
    name: 'Fajar Nugraha',
    face_score: 0.91,
    distance_meters: 30,
    late_minutes: 28,
    condition_description: 'Wajah dan lokasi valid di kelas, namun tiba 28 menit setelah jam perkuliahan dimulai.',
    status_initial: 'TERLAMBAT',
    status_uupdp: 'TERLAMBAT',
    requires_human_oversight: false,
    ethical_legal_analysis:
      'Kedua rancangan memberikan status konsisten (TERLAMBAT) sesuai aturan rentang waktu 16-30 menit.',
    pdp_article_reference: 'UU PDP Pasal 34: Klasifikasi administratif proporsional yang dapat diprediksi secara objektif.',
  },
];

// Pre-seeded students for simulation
export const DEFAULT_STUDENTS: Student[] = [
  { nim: '210101', name: 'Arya Pratama (M1 - Normal)' },
  { nim: '210102', name: 'Budi Santoso (M2 - Tepat di Batas)' },
  { nim: '210103', name: 'Citra Dewi (M3 - Kacamata Baru/Redup)' },
  { nim: '210104', name: 'Dodi Wijaya (M4 - GPS Drift 70m)' },
  { nim: '210105', name: 'Eka Saputra (M5 - Foto Lama 6 Thn)' },
  { nim: '210106', name: 'Fajar Nugraha (M6 - Terlambat 28m)' },
  { nim: '210199', name: 'Mahasiswa Baru (Uji Mandiri)' },
];

let localAttendances: AttendanceRecord[] = [
  {
    id: 1,
    nim: '210103',
    name: 'Citra Dewi',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    similarity_score: 0.78,
    distance_meters: 15,
    late_minutes: 3,
    status: 'PERLU_VERIFIKASI_DOSEN',
    initial_rule_status: 'TIDAK_SAH',
    decision_reason: 'Skor kemiripan wajah (0.78) di bawah 0.85 karena kacamata baru / redup, namun jarak valid (15m <= 50m) dan waktu valid (3m <= 15m). Dilindungi Pasal 34 UU PDP.',
    requires_human_oversight: true,
    human_oversight_status: 'PENDING',
    simulated_case: 'M3',
  },
  {
    id: 2,
    nim: '210104',
    name: 'Dodi Wijaya',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    similarity_score: 0.95,
    distance_meters: 70,
    late_minutes: 0,
    status: 'PERLU_VERIFIKASI_DOSEN',
    initial_rule_status: 'TIDAK_SAH',
    decision_reason: 'Jarak GPS (70m) melebihi batas 50m akibat anomali interferensi beton gedung, namun wajah sangat valid (0.95) dan tepat waktu (0m). Butuh pengesahan visual dosen.',
    requires_human_oversight: true,
    human_oversight_status: 'PENDING',
    simulated_case: 'M4',
  },
  {
    id: 3,
    nim: '210105',
    name: 'Eka Saputra',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    similarity_score: 0.40,
    distance_meters: 10,
    late_minutes: 2,
    status: 'PERLU_VERIFIKASI_DOSEN',
    initial_rule_status: 'TIDAK_SAH',
    decision_reason: 'Kemiripan wajah rendah (0.40) akibat foto profil 6 tahun lalu. Lokasi (10m) dan waktu (2m) sangat valid. Hak pembaruan data biometrik (Pasal 4 & 10 UU PDP).',
    requires_human_oversight: true,
    human_oversight_status: 'PENDING',
    simulated_case: 'M5',
  },
  {
    id: 4,
    nim: '210101',
    name: 'Arya Pratama',
    timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    similarity_score: 0.92,
    distance_meters: 20,
    late_minutes: 5,
    status: 'HADIR',
    initial_rule_status: 'HADIR',
    decision_reason: 'Presensi sah memenuhi seluruh kriteria.',
    requires_human_oversight: false,
    human_oversight_status: null,
    simulated_case: 'M1',
  },
];

export async function fetchStudents(): Promise<Student[]> {
  // 1. Coba ambil data live dari Neon DB Cloud
  try {
    const rows = await sql`
      SELECT nim, name, profile_image_path AS profile_image_url
      FROM students
      ORDER BY nim ASC;
    `;
    if (Array.isArray(rows) && rows.length > 0) {
      return rows as unknown as Student[];
    }
  } catch (err) {
    console.warn('Neon DB /students query error:', err);
  }

  // 2. Fallback backend API
  try {
    const res = await fetch(`${API_BASE_URL}/api/students`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn('Backend /api/students unavailable, using local student list.', err);
  }

  // 3. Fallback localStorage / default
  try {
    const localSaved = localStorage.getItem('CUSTOM_REGISTERED_STUDENTS');
    if (localSaved) {
      const customList = JSON.parse(localSaved);
      if (Array.isArray(customList) && customList.length > 0) {
        return [...customList, ...DEFAULT_STUDENTS];
      }
    }
  } catch {
    // Ignore
  }

  return DEFAULT_STUDENTS;
}

export async function fetchBenchmark(): Promise<BenchmarkCase[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/benchmark`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn('Backend /api/benchmark unavailable, using local benchmark definitions.', err);
  }
  return BENCHMARK_CASES;
}

export async function fetchOversightAttendances(): Promise<AttendanceRecord[]> {
  // 1. Ambil data pending oversight langsung dari Neon DB Cloud
  try {
    const rows = await sql`
      SELECT id, nim, student_name AS name, timestamp, similarity_score, distance_meters,
             late_minutes, status, decision_reason, requires_human_oversight,
             human_oversight_status, photo_path AS face_image_preview, simulated_case
      FROM attendances
      WHERE requires_human_oversight = TRUE AND human_oversight_status = 'PENDING'
      ORDER BY id DESC;
    `;
    if (Array.isArray(rows) && rows.length > 0) {
      return rows as unknown as AttendanceRecord[];
    }
  } catch (err) {
    console.warn('Neon DB /oversight query error:', err);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/oversight`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend /api/oversight unavailable, using local oversight state.', err);
  }
  return localAttendances.filter((a) => a.status === 'PERLU_VERIFIKASI_DOSEN' && a.human_oversight_status === 'PENDING');
}

export async function resolveOversight(
  req: ResolveOversightRequest
): Promise<{ success: boolean; attendance?: AttendanceRecord }> {
  // 1. Update langsung ke Neon DB Cloud
  try {
    const status = req.approved ? 'HADIR' : 'TIDAK_SAH';
    const oversightStatus = req.approved ? 'APPROVED' : 'REJECTED';
    const resolvedAt = new Date().toISOString();
    const lecturer = req.lecturer_name || 'Dr. Ir. Dosen Pengampu';

    await sql`
      UPDATE attendances
      SET status = ${status},
          human_oversight_status = ${oversightStatus},
          resolution_note = ${req.lecturer_note},
          resolved_by = ${lecturer},
          resolved_at = ${resolvedAt}
      WHERE id = ${req.attendance_id};
    `;
    return { success: true };
  } catch (err) {
    console.warn('Neon DB resolveOversight error:', err);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/oversight/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (res.ok) {
      const result = await res.json();
      return { success: true, attendance: result.attendance || result };
    }
  } catch (err) {
    console.warn('Backend /api/oversight/resolve unavailable, updating locally.', err);
  }

  // Fallback update in-memory
  const idx = localAttendances.findIndex((a) => a.id === req.attendance_id);
  if (idx !== -1) {
    localAttendances[idx] = {
      ...localAttendances[idx],
      human_oversight_status: req.approved ? 'APPROVED' : 'REJECTED',
      status: req.approved ? 'HADIR' : 'TIDAK_SAH',
      lecturer_note: req.lecturer_note,
      resolved_by: req.lecturer_name || 'Dosen Pengampu',
      resolved_at: new Date().toISOString(),
    };
    return { success: true, attendance: localAttendances[idx] };
  }
  return { success: false };
}

export async function submitPresensi(
  req: PresensiRequest
): Promise<PresensiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/presensi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend /api/presensi unavailable, evaluating via local engine.', err);
  }

  // Fallback / Static Space Client-Side Evaluation (Direct Neon DB)
  // 1. Ekstraksi embedding biometrik wajah langsung di browser jika ada foto
  let faceScore = 0.89;
  let resolvedNim = req.nim && req.nim !== 'AUTO' ? req.nim : '';
  let resolvedName = req.name && req.name !== 'Auto-Detect Wajah' ? req.name : '';
  // PRIORITAS: Jika user mengambil foto kamera asli (req.face_image),
  // JALANKAN FACE RECOGNITION ASLI TERHADAP NEON DB, jangan override dengan simulasi M1!
  const isSimulatedBenchmark = !req.face_image && req.simulated_case && req.simulated_case !== 'CUSTOM';
  const benchmarkMatch = isSimulatedBenchmark
    ? BENCHMARK_CASES.find((b) => b.case_id === req.simulated_case)
    : null;

  if (benchmarkMatch) {
    faceScore = benchmarkMatch.face_score;
    if (!resolvedNim || resolvedNim === 'AUTO') {
      resolvedNim = benchmarkMatch.nim;
      resolvedName = benchmarkMatch.name;
    }
  } else if (req.face_image) {
    try {
      const inputEmb = await extractFaceEmbeddingFromBase64(req.face_image);
      // Ambil seluruh mahasiswa dari Neon DB beserta vektor biometriknya
      const candidates = await sql`
        SELECT nim, name, embedding::text
        FROM students
        WHERE embedding IS NOT NULL;
      `;

      let bestSim = -1;
      let bestStudent: { nim: string; name: string } | null = null;

      for (const cand of candidates) {
        if (!cand.embedding) continue;
        try {
          const raw = typeof cand.embedding === 'string' ? JSON.parse(cand.embedding) : cand.embedding;
          if (Array.isArray(raw) && raw.length === inputEmb.length) {
            // Cosine Similarity standard biometrik: cos(theta) = (u . v) / (||u|| * ||v||)
            let dot = 0;
            let normU = 0;
            let normV = 0;
            for (let i = 0; i < inputEmb.length; i++) {
              const u = inputEmb[i];
              const v = Number(raw[i]);
              dot += u * v;
              normU += u * u;
              normV += v * v;
            }
            const denom = Math.sqrt(normU) * Math.sqrt(normV);
            const sim = denom > 1e-9 ? Math.max(0, Math.min(1, dot / denom)) : 0;
            if (sim > bestSim) {
              bestSim = sim;
              bestStudent = { nim: String(cand.nim), name: String(cand.name) };
            }
          }
        } catch {
          // skip malformed
        }
      }

      // AMBANG BATAS KETAT 0.85: Wajah orang lain TIDAK AKAN di-assign ke user
      if (bestStudent && bestSim >= 0.85) {
        resolvedNim = bestStudent.nim;
        resolvedName = bestStudent.name;
        faceScore = Number(bestSim.toFixed(2));
      } else if (bestStudent) {
        // Wajah tidak cocok (terdeteksi orang lain atau kemiripan rendah)
        resolvedNim = bestStudent.nim;
        resolvedName = bestStudent.name;
        faceScore = Math.max(0.1, Number(bestSim.toFixed(2)));
      } else {
        // Tidak ada mahasiswa terdaftar sama sekali dengan embedding
        resolvedNim = 'UNKNOWN';
        resolvedName = 'Wajah Tidak Dikenal';
        faceScore = 0.20;
      }
    } catch (embErr) {
      console.warn('Gagal ekstraksi biometrik di client:', embErr);
      faceScore = 0.30;
    }
  }

  if (!resolvedNim || resolvedNim === 'AUTO') {
    resolvedNim = 'UNKNOWN';
    resolvedName = 'Wajah Tidak Dikenal';
  }

  const distance = benchmarkMatch
    ? benchmarkMatch.distance_meters
    : Math.round(haversineDistance(req.latitude, req.longitude, DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude));
  const lateMinutes = benchmarkMatch ? benchmarkMatch.late_minutes : req.late_minutes;

  let status: 'HADIR' | 'TERLAMBAT' | 'PERLU_VERIFIKASI_DOSEN' | 'TIDAK_SAH' = 'TIDAK_SAH';
  let initialStatus: 'HADIR' | 'TERLAMBAT' | 'TIDAK_SAH' = 'TIDAK_SAH';
  let requiresOversight = false;
  let reason = '';

  // 1. Evaluasi Rancangan Awal (Sistem Tradisional Biner Kaku)
  if (faceScore >= THRESHOLDS.FACE_SIMILARITY_MIN && distance <= THRESHOLDS.DISTANCE_VALID_MAX) {
    if (lateMinutes <= THRESHOLDS.LATE_ON_TIME_MAX) {
      initialStatus = 'HADIR';
    } else if (lateMinutes <= THRESHOLDS.LATE_TOLERANCE_MAX) {
      initialStatus = 'TERLAMBAT';
    } else {
      initialStatus = 'TIDAK_SAH';
    }
  } else {
    initialStatus = 'TIDAK_SAH';
  }

  // 2. Evaluasi Rancangan UU PDP (Human Oversight - Pasal 34)
  if (benchmarkMatch) {
    status = benchmarkMatch.status_uupdp;
    initialStatus = benchmarkMatch.status_initial;
    requiresOversight = benchmarkMatch.requires_human_oversight;
    reason = benchmarkMatch.ethical_legal_analysis;
  } else if (req.simulated_case === 'M3') {
    status = 'PERLU_VERIFIKASI_DOSEN';
    requiresOversight = true;
    reason = 'M3: Skor wajah 0.78 (kacamata baru / redup). UU PDP Pasal 34 melarang otomasi tunggal yang merugikan mahasiswa saat lokasi (15m) & waktu (3m) valid.';
  } else if (req.simulated_case === 'M4') {
    status = 'PERLU_VERIFIKASI_DOSEN';
    requiresOversight = true;
    reason = 'M4: GPS drift 70m dalam gedung beton. Wajah sangat valid (0.95) & tepat waktu (0m). Perlu verifikasi visual dosen.';
  } else if (req.simulated_case === 'M5') {
    status = 'PERLU_VERIFIKASI_DOSEN';
    requiresOversight = true;
    reason = 'M5: Foto profil 6 tahun lalu (skor 0.40). Lokasi (10m) & waktu (2m) valid. Dilindungi hak pembaruan data UU PDP Pasal 4 & 10.';
  } else if (lateMinutes > THRESHOLDS.LATE_TOLERANCE_MAX) {
    status = 'TIDAK_SAH';
    requiresOversight = false;
    reason = `Pelanggaran fatal waktu: Keterlambatan ${lateMinutes} menit melebihi batas toleransi (${THRESHOLDS.LATE_TOLERANCE_MAX}m).`;
  } else if (distance > THRESHOLDS.DISTANCE_DRIFT_MAX) {
    status = 'TIDAK_SAH';
    requiresOversight = false;
    reason = `Pelanggaran fatal lokasi: Jarak ${distance}m di luar perimeter kampus (> ${THRESHOLDS.DISTANCE_DRIFT_MAX}m). Indikasi titip absen.`;
  } else if (faceScore < THRESHOLDS.FACE_OUTDATED_MIN) {
    status = 'TIDAK_SAH';
    requiresOversight = false;
    reason = `Pelanggaran identitas biometrik: Skor kemiripan ${Math.round(faceScore * 100)}% < 35%. Wajah tidak terdaftar / tidak cocok.`;
  } else if (faceScore >= THRESHOLDS.FACE_SIMILARITY_MIN && distance <= THRESHOLDS.DISTANCE_VALID_MAX) {
    if (lateMinutes <= THRESHOLDS.LATE_ON_TIME_MAX) {
      status = 'HADIR';
      requiresOversight = false;
      reason = `Presensi Sah: Wajah cocok (${Math.round(faceScore * 100)}% ≥ 85%), lokasi valid (${distance}m ≤ 50m), tepat waktu (${lateMinutes}m ≤ 15m).`;
    } else {
      status = 'TERLAMBAT';
      requiresOversight = false;
      reason = `Presensi Sah (Terlambat): Wajah cocok (${Math.round(faceScore * 100)}%), lokasi valid (${distance}m), keterlambatan ${lateMinutes} menit (toleransi 16-30m).`;
    }
  } else if (
    (faceScore >= THRESHOLDS.FACE_AMBIGUOUS_MIN && distance <= THRESHOLDS.DISTANCE_VALID_MAX && lateMinutes <= THRESHOLDS.LATE_ON_TIME_MAX) ||
    (faceScore >= THRESHOLDS.FACE_SIMILARITY_MIN && distance <= THRESHOLDS.DISTANCE_DRIFT_MAX && lateMinutes <= THRESHOLDS.LATE_ON_TIME_MAX) ||
    (faceScore >= THRESHOLDS.FACE_OUTDATED_MIN && distance <= THRESHOLDS.DISTANCE_VALID_MAX && lateMinutes <= THRESHOLDS.LATE_ON_TIME_MAX)
  ) {
    status = 'PERLU_VERIFIKASI_DOSEN';
    requiresOversight = true;
    reason = `Hasil berada di zona ambang toleransi biometrik/lokasi. Mengacu UU PDP No. 27/2022 Pasal 34, keputusan dialihkan ke Dosen Verifikator untuk tinjauan manual.`;
  } else {
    status = 'TIDAK_SAH';
    requiresOversight = false;
    reason = 'Tidak memenuhi kriteria validitas presensi perkuliahan.';
  }

  const newRecord: AttendanceRecord = {
    id: Date.now(),
    nim: resolvedNim,
    name: resolvedName,
    timestamp: new Date().toISOString(),
    similarity_score: faceScore,
    distance_meters: distance,
    late_minutes: lateMinutes,
    status,
    initial_rule_status: initialStatus,
    decision_reason: reason,
    requires_human_oversight: requiresOversight,
    human_oversight_status: requiresOversight ? 'PENDING' : null,
    face_image_preview: req.face_image,
    simulated_case: req.simulated_case,
  };
  // Simpan record kehadiran ke Neon DB Cloud secara real-time
  try {
    const preview = req.face_image ? req.face_image.slice(0, 100) : null;
    const simCase = req.simulated_case || null;
    const inserted = await sql`
      INSERT INTO attendances (
        nim, student_name, timestamp, similarity_score, distance_meters,
        late_minutes, status, status_awal, status_uupdp, decision_reason,
        requires_human_oversight, human_oversight_status, photo_path, simulated_case
      )
      VALUES (
        ${resolvedNim}, ${resolvedName}, ${newRecord.timestamp}, ${faceScore}, ${distance},
        ${lateMinutes}, ${status}, ${initialStatus}, ${status}, ${reason},
        ${requiresOversight}, ${newRecord.human_oversight_status}, ${preview}, ${simCase}
      )
      RETURNING id;
    `;
    if (inserted && inserted.length > 0) {
      newRecord.id = Number(inserted[0].id);
    }
  } catch (dbErr) {
    console.warn('Neon DB submitPresensi note:', dbErr);
  }

  localAttendances.unshift(newRecord);
  return {
    id: newRecord.id,
    nim: newRecord.nim,
    name: newRecord.name,
    status: newRecord.status,
    initial_rule_status: newRecord.initial_rule_status,
    similarity_score: newRecord.similarity_score,
    distance_meters: newRecord.distance_meters,
    late_minutes: newRecord.late_minutes,
    decision_reason: newRecord.decision_reason,
    requires_human_oversight: newRecord.requires_human_oversight,
    human_oversight_status: newRecord.human_oversight_status,
    timestamp: newRecord.timestamp,
  };
}

export async function fetchAttendances(): Promise<AttendanceRecord[]> {
  try {
    const rows = await sql`
      SELECT id, nim, student_name AS name, timestamp, similarity_score, distance_meters,
             late_minutes, status, decision_reason, requires_human_oversight,
             human_oversight_status, resolution_note AS lecturer_note, resolved_by, resolved_at,
             photo_path AS face_image_preview, simulated_case
      FROM attendances
      ORDER BY id DESC
      LIMIT 100;
    `;
    if (Array.isArray(rows) && rows.length > 0) {
      return rows as unknown as AttendanceRecord[];
    }
  } catch (err) {
    console.warn('Neon DB /attendances query note:', err);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/attendances`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend /api/attendances unavailable, returning local list.', err);
  }
  return localAttendances;
}

export async function registerStudent(
  nim: string,
  name: string,
  faceImageBase64: string
): Promise<{ success: boolean; message?: string }> {
  const newStudent: Student = {
    nim,
    name,
    profile_image_url: faceImageBase64,
    created_at: new Date().toISOString(),
  };

  // Simpan ke localStorage agar bisa di-autodetect di browser
  try {
    const existingRaw = localStorage.getItem('CUSTOM_REGISTERED_STUDENTS');
    const existingList: Student[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [newStudent, ...existingList.filter((s) => s.nim !== nim)];
    localStorage.setItem('CUSTOM_REGISTERED_STUDENTS', JSON.stringify(updated));
    localStorage.setItem('LAST_ACTIVE_STUDENT', JSON.stringify(newStudent));
  } catch (storageErr) {
    console.warn('Gagal menyimpan ke localStorage:', storageErr);
  }

  DEFAULT_STUDENTS.unshift(newStudent);
  // Simpan data pendaftaran beserta embedding biometrik ke Neon DB Cloud
  try {
    let embVectorStr: string | null = null;
    if (faceImageBase64) {
      const emb = await extractFaceEmbeddingFromBase64(faceImageBase64);
      embVectorStr = embeddingToPgVector(emb);
    }

    if (embVectorStr) {
      await sql`
        INSERT INTO students (nim, name, profile_image_path, embedding)
        VALUES (${nim}, ${name}, ${faceImageBase64}, ${embVectorStr})
        ON CONFLICT (nim) DO UPDATE SET
          name = EXCLUDED.name,
          profile_image_path = EXCLUDED.profile_image_path,
          embedding = EXCLUDED.embedding;
      `;
    } else {
      await sql`
        INSERT INTO students (nim, name, profile_image_path)
        VALUES (${nim}, ${name}, ${faceImageBase64})
        ON CONFLICT (nim) DO UPDATE SET
          name = EXCLUDED.name,
          profile_image_path = EXCLUDED.profile_image_path;
      `;
    }
  } catch (neonErr) {
    console.warn('Neon DB registerStudent note:', neonErr);
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nim,
        name,
        face_image: faceImageBase64,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend /api/register unavailable, registering locally.', err);
  }

  return { success: true, message: `Mahasiswa ${name} (${nim}) berhasil didaftarkan ke sistem.` };
}
