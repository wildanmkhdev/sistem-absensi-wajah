// Tipe Data untuk Sistem Presensi Wajah Berbasis AI & Kepatuhan UU PDP

export type AttendanceStatus =
  | 'HADIR'
  | 'TERLAMBAT'
  | 'PERLU_VERIFIKASI_DOSEN'
  | 'TIDAK_SAH';

export type InitialRuleStatus = 'HADIR' | 'TERLAMBAT' | 'TIDAK_SAH';

export type OversightStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type SimulatedCaseId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'CUSTOM';

export interface Student {
  id?: number;
  nim: string;
  name: string;
  profile_image_url?: string;
  created_at?: string;
}

export interface AttendanceRecord {
  id: number;
  nim: string;
  name?: string;
  student_id?: number;
  timestamp: string;
  similarity_score: number;
  distance_meters: number;
  late_minutes: number;
  status: AttendanceStatus;
  initial_rule_status?: InitialRuleStatus;
  decision_reason: string;
  requires_human_oversight: boolean;
  human_oversight_status?: OversightStatus | null;
  lecturer_note?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  face_image_preview?: string | null;
  simulated_case?: SimulatedCaseId | null;
  latitude?: number;
  longitude?: number;
}

export interface PresensiRequest {
  nim: string;
  name?: string;
  face_image: string | null; // Base64 data URL
  latitude: number;
  longitude: number;
  late_minutes: number;
  simulated_case?: SimulatedCaseId;
}

export interface PresensiResponse {
  id: number;
  student_id?: number;
  nim: string;
  name?: string;
  status: AttendanceStatus;
  initial_rule_status?: InitialRuleStatus;
  similarity_score: number;
  distance_meters: number;
  late_minutes: number;
  decision_reason: string;
  requires_human_oversight: boolean;
  human_oversight_status?: OversightStatus | null;
  timestamp: string;
  note?: string;
}

export interface ResolveOversightRequest {
  attendance_id: number;
  approved: boolean;
  lecturer_note: string;
  lecturer_name?: string;
}

export interface BenchmarkCase {
  case_id: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6';
  nim: string;
  name: string;
  face_score: number;
  distance_meters: number;
  late_minutes: number;
  condition_description: string;
  status_initial: InitialRuleStatus;
  status_uupdp: AttendanceStatus;
  requires_human_oversight: boolean;
  ethical_legal_analysis: string;
  pdp_article_reference: string;
}
