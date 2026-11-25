// API Client & Layanan Data Presensi Wajah
// Satu pintu data: seluruh permintaan melewati FastAPI. Tidak ada akses database dari browser.
import { API_BASE_URL } from './config';
import { clearSession, readSession } from './auth';
import type { Session } from './auth';
import type {
  AttendanceRecord,
  BenchmarkCase,
  PresensiRequest,
  PresensiResponse,
  ResolveOversightRequest,
  SessionCreateInput,
  SessionInfo,
  SimulatedPresensiResponse,
  Student,
} from './types';

export interface AuthUser {
  username: string;
  role: 'dosen' | 'mahasiswa';
  nim: string | null;
  name: string;
}

let authToken: string | null = (typeof window !== 'undefined' ? readSession()?.token : null) ?? null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  if (!authToken && typeof window !== 'undefined') {
    authToken = readSession()?.token ?? null;
  }
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
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  // Sesi kedaluwarsa/dicabut: bersihkan penyimpanan dan beri tahu aplikasi
  // HANYA jika request memang membawa token tapi ditolak 401 oleh server.
  if (res.status === 401 && path !== '/api/auth/login' && token) {
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

/** Pendaftaran akun mahasiswa baru beserta ekstraksi wajah pertama kali. */
export async function registerAccount(data: {
  username: string;
  password: string;
  nim: string;
  name: string;
  faceImageBase64: string;
  consent: boolean;
}): Promise<Session> {
  const json = await request<{ token: string; user: AuthUser; message?: string }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: data.username,
      password: data.password,
      nim: data.nim,
      name: data.name,
      face_image: data.faceImageBase64,
      consent: data.consent,
    }),
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

/** Mahasiswa: ambil profil diri sendiri */
export async function fetchMyProfile(): Promise<Student> {
  return request<Student>('/api/students/me');
}

/** Dosen: ambil daftar seluruh mahasiswa */
export async function fetchStudents(): Promise<Student[]> {
  return request<Student[]>('/api/students');
}

/** Sesi aktif untuk presensi (mahasiswa & dosen) */
export async function fetchActiveSessions(): Promise<SessionInfo[]> {
  return request<SessionInfo[]>('/api/sessions/active');
}

/** Dosen: daftar seluruh sesi perkuliahan */
export async function fetchSessions(limit: number = 50): Promise<SessionInfo[]> {
  return request<SessionInfo[]>(`/api/sessions?limit=${limit}`);
}

/** Dosen: buat sesi perkuliahan baru */
export async function createSession(data: SessionCreateInput): Promise<SessionInfo> {
  return request<SessionInfo>('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

/** Benchmark kebijakan M1-M6 (resmi dari server, bukan buatan client) */
export async function fetchBenchmark(): Promise<BenchmarkCase[]> {
  return request<BenchmarkCase[]>('/api/benchmark');
}

/** Simulasi kasus M1-M6 (dry-run dosen, tidak menyimpan record absensi) */
export async function simulateCase(caseId: string): Promise<SimulatedPresensiResponse> {
  return request<SimulatedPresensiResponse>('/api/presensi/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ case_id: caseId }),
  });
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

export interface FacePreviewResponse {
  detected: boolean;
  face_count: number;
  bbox: { x: number; y: number; w: number; h: number } | null;
  matched_name: string | null;
  similarity_percent: number;
  match_status: 'MATCH' | 'BORDERLINE' | 'MISMATCH' | 'NOT_ENROLLED' | 'NO_FACE';
  quality: { brightness: number; sharpness: number; face_brightness?: number };
  guidance: { level: 'ok' | 'warn' | 'error'; title: string; solution: string };
}

export async function previewFace(faceImageBase64: string): Promise<FacePreviewResponse> {
  return request<FacePreviewResponse>('/api/presensi/preview-face', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ face_image: faceImageBase64 }),
  });
}

export async function submitPresensi(req: PresensiRequest): Promise<PresensiResponse> {
  return request<PresensiResponse>('/api/presensi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

export async function fetchAttendances(limit: number = 100): Promise<AttendanceRecord[]> {
  return request<AttendanceRecord[]>(`/api/attendances?limit=${limit}`);
}

export async function registerStudent(
  nim: string,
  name: string,
  faceImageBase64: string,
  consent: boolean = true
): Promise<{ success: boolean; message?: string }> {
  const json = await request<{ success?: boolean; message?: string }>('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nim,
      name,
      face_image: faceImageBase64,
      consent,
    }),
  });
  return { success: Boolean(json.success), message: json.message };
}

export async function deleteBiometric(nim: string): Promise<{ success: boolean; message?: string }> {
  return request<{ success: boolean; message?: string }>(`/api/students/${nim}/biometric`, {
    method: 'DELETE',
  });
}
