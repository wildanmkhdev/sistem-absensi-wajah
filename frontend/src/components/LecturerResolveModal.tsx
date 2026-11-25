import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { AttendanceRecord } from '../types';
import { IconAcademicShield } from './icons/FlaticonIcons';
import { formatDistance } from '../utils/geo';

interface LecturerResolveModalProps {
  attendance: AttendanceRecord;
  onClose: () => void;
  onResolve: (approved: boolean, note: string) => Promise<void>;
  isSubmitting: boolean;
}

export const LecturerResolveModal: React.FC<LecturerResolveModalProps> = ({
  attendance,
  onClose,
  onResolve,
  isSubmitting,
}) => {
  const defaultNote =
    attendance.simulated_case === 'M3'
      ? 'Mahasiswa terverifikasi hadir fisik di kelas. Penurunan skor pengenalan wajah akibat kacamata berbingkai baru dan pencahayaan redup telah dikonfirmasi.'
      : attendance.simulated_case === 'M4'
      ? 'Terkonfirmasi hadir fisik di sudut ruang kelas. Penyimpangan jarak GPS (70m) disebabkan oleh degradasi sinyal beton gedung kuliah.'
      : attendance.simulated_case === 'M5'
      ? 'Identitas mahasiswa cocok secara visual langsung. Disetujui hadir dengan catatan wajib memperbarui foto profil biometrik di SIAKAD.'
      : 'Telah diperiksa dan diverifikasi secara visual oleh Dosen Pengampu.';

  const [note, setNote] = useState<string>(defaultNote);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (approved: boolean) => {
    if (!note.trim()) {
      setError('Catatan dosen wajib diisi sebagai dokumentasi audit kepatuhan UU PDP.');
      return;
    }
    setError(null);
    await onResolve(approved, note.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-fade-in font-sans">
      <div className="hlb-panel max-w-lg w-full p-6 shadow-[6px_6px_0_var(--shadow)] space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b-2 border-[var(--edge)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--yellow)] border-2 border-[var(--on-yellow)] shadow-[2px_2px_0_var(--shadow)] flex items-center justify-center shrink-0">
              <IconAcademicShield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-normal text-2xl leading-tight text-[var(--ink)]">
                Verifikasi Human Oversight
              </h3>
              <p className="font-mono text-[11px] text-[var(--soft)]">
                Kepatuhan UU PDP No. 27/2022 Pasal 34
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="hlb-btn-secondary p-1.5 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Student & Anomaly Info Card */}
        <div className="bg-[var(--paper)] border-2 border-[var(--edge)] rounded-xl p-4 space-y-3.5">
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="text-base font-semibold text-[var(--ink)]">
                {attendance.name || 'Mahasiswa'}
              </div>
              <div className="text-xs text-[var(--soft)] font-mono">
                NIM {attendance.nim}
              </div>
            </div>
            {attendance.simulated_case && (
              <span className="hlb-tag accent font-mono">
                Kasus {attendance.simulated_case}
              </span>
            )}
          </div>

          {/* Side-by-side Face Comparison / Biometric Capture Frame */}
          {attendance.face_image_preview && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[var(--surface)] border-2 border-[var(--edge)] rounded-xl p-2 space-y-1.5">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--soft)] text-center">
                  Tangkapan Presensi
                </span>
                <img
                  src={attendance.face_image_preview}
                  alt={`Tangkapan wajah ${attendance.name || attendance.nim}`}
                  className="w-full h-28 object-cover rounded-lg border-2 border-[var(--edge)]"
                />
              </div>
              <div className="bg-[var(--surface)] border-2 border-[var(--edge)] rounded-xl p-3 flex flex-col justify-between">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--soft)]">
                  Skor Kecocokan
                </span>
                <div className="font-display font-normal text-3xl text-[var(--ink)] tabular-nums">
                  {(attendance.similarity_score * 100).toFixed(1)}%
                </div>
                <div className="hlb-progress">
                  <div
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, Math.round(attendance.similarity_score * 100))
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[var(--surface)] p-2.5 rounded-xl border-2 border-[var(--edge)]">
              <span className="font-mono text-[10px] text-[var(--soft)] block uppercase font-semibold">
                Skor Wajah
              </span>
              <span className="font-semibold text-[var(--ink)] font-mono text-xs block mt-0.5 tabular-nums">
                {(attendance.similarity_score * 100).toFixed(1)}%
              </span>
            </div>
            <div className="bg-[var(--surface)] p-2.5 rounded-xl border-2 border-[var(--edge)]">
              <span className="font-mono text-[10px] text-[var(--soft)] block uppercase font-semibold">
                Jarak GPS
              </span>
              <span className="font-semibold text-[var(--ink)] font-mono text-xs block mt-0.5 tabular-nums">
                {formatDistance(attendance.distance_meters)}
              </span>
            </div>
            <div className="bg-[var(--surface)] p-2.5 rounded-xl border-2 border-[var(--edge)]">
              <span className="font-mono text-[10px] text-[var(--soft)] block uppercase font-semibold">
                Telat
              </span>
              <span className="font-semibold text-[var(--ink)] font-mono text-xs block mt-0.5 tabular-nums">
                {attendance.late_minutes}m
              </span>
            </div>
          </div>

          <div className="text-xs bg-[var(--surface)] p-3 rounded-xl border-2 border-[var(--edge)]">
            <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--soft)] block mb-1">
              Indikasi Sistem
            </span>
            <p className="text-xs leading-relaxed text-[var(--ink)]">
              {attendance.decision_reason}
            </p>
          </div>
        </div>

        {/* Note Input */}
        <div className="space-y-1.5">
          <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)]">
            Catatan Dosen Pengampu <span className="text-[var(--red)]">*</span>
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuliskan catatan verifikasi kehadiran mahasiswa..."
            className="hlb-input w-full text-sm p-3"
          />
        </div>

        {error && (
          <div className="hlb-alert danger flex items-center gap-2 text-xs text-[var(--ink)] p-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-[var(--red)]" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction(false)}
            className="hlb-btn-danger h-11 px-4 font-mono text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            Tolak (Tidak Sah)
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction(true)}
            className="hlb-btn-primary h-11 px-4 font-mono text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            Setujui Hadir (Sah)
          </button>
        </div>
      </div>
    </div>
  );
};
