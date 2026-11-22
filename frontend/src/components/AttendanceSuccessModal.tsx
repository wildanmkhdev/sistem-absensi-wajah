import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, User, X } from 'lucide-react';
import type { PresensiResponse } from '../types';

interface AttendanceSuccessModalProps {
  result: PresensiResponse;
  onClose: () => void;
}

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const AttendanceSuccessModal: React.FC<AttendanceSuccessModalProps> = ({
  result,
  onClose,
}) => {
  const isHadir = result.status === 'HADIR';
  const isTerlambat = result.status === 'TERLAMBAT';
  const isOversight = result.status === 'PERLU_VERIFIKASI_DOSEN';

  const badgeConfig = isHadir
    ? {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
        title: 'Presensi Berhasil Dicatat!',
        subtitle: 'Wajah dan lokasi terverifikasi valid sesuai aturan.',
        ringColor: 'ring-emerald-400',
      }
    : isTerlambat
    ? {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
        title: 'Presensi Diterima (Terlambat)',
        subtitle: 'Kehadiran dicatat dengan catatan keterlambatan 16-30 menit.',
        ringColor: 'ring-amber-400',
      }
    : isOversight
    ? {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: ShieldCheck,
        title: 'Perlu Verifikasi Dosen',
        subtitle: 'Sesuai UU PDP Pasal 34, kasus anomali dialihkan untuk ditinjau dosen.',
        ringColor: 'ring-blue-400',
      }
    : {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: AlertTriangle,
        title: 'Presensi Tidak Sah',
        subtitle: 'Wajah tidak cocok, radius GPS terlampau jauh, atau melebihi batas waktu.',
        ringColor: 'ring-rose-400',
      };

  const StatusIcon = badgeConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden transform transition-all">
        {/* Top Header Banner */}
        <div className={`p-6 border-b flex items-start justify-between ${badgeConfig.bg}`}>
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center ${badgeConfig.ringColor} ring-4 ring-opacity-20`}
            >
              <StatusIcon className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80 border border-current shadow-xs">
                Status: {result.status.replace(/_/g, ' ')}
              </span>
              <h2 className="text-lg font-bold text-slate-800 mt-1">{badgeConfig.title}</h2>
              <p className="text-xs text-slate-600">{badgeConfig.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Student Info Card */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-800 text-sm truncate">
                {result.name || 'Mahasiswa'}
              </h4>
              <p className="text-xs text-slate-500">NIM: {result.nim}</p>
              <p className="text-[11px] text-slate-400">{formatTimestamp(result.timestamp)}</p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-2.5">
              <span className="text-[10px] text-teal-700 font-bold block">Skor Wajah</span>
              <span className="text-base font-black text-teal-950 font-mono">
                {(result.similarity_score * 100).toFixed(1)}%
              </span>
              <span className="text-[9px] text-teal-600 block">
                Ambang: ≥ {((result.thresholds?.face_match ?? 0.45) * 100).toFixed(0)}%
              </span>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2.5">
              <span className="text-[10px] text-emerald-600 font-semibold block">Jarak GPS</span>
              <span className="text-base font-extrabold text-emerald-950">
                {result.distance_meters.toFixed(0)}m
              </span>
              <span className="text-[9px] text-emerald-500 block">
                Batas: ≤ {result.thresholds?.radius_m ?? 50}m
              </span>
            </div>

            <div className="bg-slate-100/60 border border-slate-200 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-600 font-semibold block">Keterlambatan</span>
              <span className="text-base font-extrabold text-slate-800">
                {result.late_minutes}m
              </span>
              <span className="text-[9px] text-slate-500 block">
                Batas: ≤ {result.thresholds?.on_time_max_minutes ?? 15}m
              </span>
            </div>
          </div>

          {/* Reason / Legal Explanation */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-700">Analisis Sistem:</div>
            <p className="leading-relaxed text-[11px]">{result.decision_reason}</p>
          </div>

          {result.note && (
            <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/80 text-xs text-amber-800 space-y-1">
              <div className="font-semibold text-amber-900">Catatan:</div>
              <p className="leading-relaxed text-[11px]">{result.note}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition cursor-pointer"
          >
            Tutup &amp; Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
