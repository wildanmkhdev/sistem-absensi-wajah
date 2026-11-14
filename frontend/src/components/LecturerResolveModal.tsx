import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X, ShieldCheck } from 'lucide-react';
import type { AttendanceRecord } from '../types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Verifikasi Dosen (Human Oversight)</h3>
              <p className="text-xs text-slate-500">Kepatuhan UU PDP No. 27/2022 Pasal 34</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student & Anomaly Info Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-bold text-slate-800">{attendance.name || 'Mahasiswa'}</div>
              <div className="text-xs text-slate-500 font-mono">NIM: {attendance.nim}</div>
            </div>
            {attendance.simulated_case && (
              <span className="text-[10px] uppercase font-bold bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">
                Kasus {attendance.simulated_case}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] text-slate-400 block font-medium">Skor Wajah</span>
              <span className="font-bold text-orange-600 font-mono">
                {(attendance.similarity_score * 100).toFixed(1)}%
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] text-slate-400 block font-medium">Jarak GPS</span>
              <span className="font-bold text-slate-700">
                {attendance.distance_meters.toFixed(0)}m
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] text-slate-400 block font-medium">Telat</span>
              <span className="font-bold text-slate-700">{attendance.late_minutes}m</span>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80">
            <span className="font-bold text-slate-700 block mb-0.5">Indikasi Masalah:</span>
            <p className="text-[11px] leading-relaxed text-slate-500">{attendance.decision_reason}</p>
          </div>
        </div>

        {/* Note Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Catatan Dosen Pengampu <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuliskan alasan pengesahan atau penolakan presensi..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
          />
        </div>

        {error && (
          <div className="flex items-center space-x-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction(false)}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer active:scale-95"
          >
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>Tolak (Tidak Sah)</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleAction(true)}
            className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 transition cursor-pointer active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Setujui Hadir (Sah)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
