// API Client & Layanan Data Presensi Wajah
// Satu pintu data: seluruh permintaan melewati FastAPI. Tidak ada akses database dari browser.
import { API_BASE_URL } from './config';
import { clearSession } from './auth';
import type { Session } from './auth';
import type {
  AttendanceRecord,
  BenchmarkCase,
  PresensiRequest,
  PresensiResponse,
  ResolveOversightRequest,
  Student,
} from './types';

export interface AuthUser {
  username: string;
  role: 'dosen' | 'mahasiswa';
  nim: string | null;
  name: string;
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  // Sesi kedaluwarsa/dicabut: bersihkan penyimpanan dan beri tahu aplikasi.
  if (res.status === 401 && path !== '/api/auth/login') {
    clearSession();
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('presensi:unauthorized'));
    }
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let detail = raw;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof (parsed as { detail?: unknown }).detail === 'string') {
        detail = (parsed as { detail: string }).detail;
      }
    } catch {
      // Respons bukan JSON: pakai teks mentah.
    }
    throw new ApiError(detail || `Permintaan ${path} gagal (HTTP ${res.status}).`, res.status);
  }
  return (await res.json()) as T;
}

/** Tukar username/password menjadi token sesi. */
export async function login(username: string, password: string): Promise<Session> {
  const json = await request<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  setAuthToken(json.token);
  return {
    role: json.user.role,
    nim: json.user.nim ?? '',
    name: json.user.name,
    username: json.user.username,
    token: json.token,
  };
}

/** Validasi token tersimpan dan ambil identitas terbaru dari server. */
export async function fetchMe(): Promise<AuthUser> {
  return request<AuthUser>('/api/auth/me');
}

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

export async function fetchStudents(): Promise<Student[]> {
  try {
    return await request<Student[]>('/api/students');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    return DEFAULT_STUDENTS;
  }
}

export async function fetchBenchmark(): Promise<BenchmarkCase[]> {
  try {
    return await request<BenchmarkCase[]>('/api/benchmark');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error;
    return BENCHMARK_CASES;
  }
}

export async function fetchOversightAttendances(): Promise<AttendanceRecord[]> {
  return request<AttendanceRecord[]>('/api/oversight');
}

export async function resolveOversight(
  req: ResolveOversightRequest
): Promise<{ success: boolean; attendance?: AttendanceRecord }> {
  const json = await request<{ success?: boolean; attendance?: AttendanceRecord }>(
    '/api/oversight/resolve',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }
  );
  return { success: true, attendance: json.attendance };
}

export async function submitPresensi(req: PresensiRequest): Promise<PresensiResponse> {
  return request<PresensiResponse>('/api/presensi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

export async function fetchAttendances(): Promise<AttendanceRecord[]> {
  return request<AttendanceRecord[]>('/api/attendances');
}

export async function registerStudent(
  nim: string,
  name: string,
  faceImageBase64: string
): Promise<{ success: boolean; message?: string }> {
  const json = await request<{ success?: boolean; message?: string }>('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nim, name, face_image: faceImageBase64 }),
  });
  return { success: Boolean(json.success), message: json.message };
}
