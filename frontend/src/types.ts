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
  profile_image_path?: string;
  created_at?: string;
  has_embedding?: boolean;
  model_version?: string;
  enrollment_count?: number;
  consent_at?: string;
}

export interface SessionInfo {
  id: number;
  course_code: string;
  course_name: string;
  room_name?: string | null;
  room_lat: number;
  room_lon: number;
  radius_m: number;
  starts_at: string;
  ends_at: string;
  created_at?: string;
  is_open?: boolean;
  seconds_until_close?: number;
}

export interface SessionCreateInput {
  course_code: string;
  course_name: string;
  room_name?: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  starts_at: string;
  ends_at: string;
}

export interface FaceQuality {
  detection_score: number;
  face_ratio: number;
  faces_detected: number;
}

export interface IdentityCheck {
  claimed_similarity?: number;
  best_match_nim?: string | null;
  best_match_similarity?: number | null;
  is_identity_mismatch?: boolean;
}

export interface AttendanceRecord {
  id: number;
  nim: string;
  name?: string;
  student_name?: string;
  student_id?: number;
  session_id?: number;
  course_code?: string | null;
  course_name?: string | null;
  room_name?: string | null;
  timestamp: string;
  similarity_score: number;
  distance_meters: number;
  late_minutes: number;
  gps_accuracy?: number;
  status: AttendanceStatus;
  initial_rule_status?: InitialRuleStatus;
  status_awal?: InitialRuleStatus;
  status_uupdp?: AttendanceStatus;
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
  legal_basis?: string;
}

export interface PresensiRequest {
  session_id: number;
  face_image: string; // Base64 data URL
  latitude: number;
  longitude: number;
  gps_accuracy: number;
  captured_at?: string;
  simulated_late_minutes?: number;
}

export interface PresensiResponse {
  id: number;
  student_id?: number;
  nim: string;
  name?: string;
  student_name?: string;
  session_id: number;
  course_code?: string;
  course_name?: string;
  room_name?: string;
  status: AttendanceStatus;
  initial_rule_status?: InitialRuleStatus;
  status_awal?: InitialRuleStatus;
  status_uupdp?: AttendanceStatus;
  similarity_score: number;
  distance_meters: number;
  late_minutes: number;
  gps_accuracy?: number;
  decision_reason: string;
  requires_human_oversight: boolean;
  human_oversight_status?: OversightStatus | null;
  timestamp: string;
  duplicate?: boolean;
  face?: FaceQuality;
  identity_check?: IdentityCheck;
  legal_basis?: string;
  note?: string;
  thresholds?: {
    face_match: number;
    on_time_max_minutes: number;
    late_max_minutes: number;
    radius_m: number;
  };
}

export interface SimulatedPresensiResponse {
  case_id: string;
  nim: string;
  name: string;
  keterangan: string;
  status: AttendanceStatus;
  status_awal: InitialRuleStatus;
  status_uupdp: AttendanceStatus;
  similarity_score: number;
  distance_meters: number;
  late_minutes: number;
  requires_human_oversight: boolean;
  human_oversight_status: OversightStatus;
  decision_reason: string;
  legal_basis: string;
  persisted: boolean;
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
