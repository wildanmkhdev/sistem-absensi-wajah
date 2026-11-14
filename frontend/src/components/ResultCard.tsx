import React from 'react';
import {
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import type { PresensiResponse } from '../types';

interface ResultCardProps {
  result: PresensiResponse;
  onGoToOversight: () => void;
  onReset: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  onGoToOversight,
  onReset,
}) => {
  const statusConfig = {
    HADIR: {
      title: 'PRESENSI HADIR',
      subtitle: 'Presensi Terverifikasi Sah dan Tepat Waktu',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      borderClass: 'border-emerald-200',
      icon: CheckCircle,
      iconColor: 'text-emerald-600',
    },
    TERLAMBAT: {
      title: 'PRESENSI TERLAMBAT',
      subtitle: 'Presensi Sah dalam Batas Toleransi Terlambat (16-30 Menit)',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      borderClass: 'border-purple-200',
      icon: Clock,
      iconColor: 'text-purple-600',
    },
    PERLU_VERIFIKASI_DOSEN: {
      title: 'PERLU VERIFIKASI DOSEN',
      subtitle: 'Memerlukan Human Oversight Sesuai UU PDP No. 27/2022 Pasal 34',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
      borderClass: 'border-orange-200',
      icon: HelpCircle,
      iconColor: 'text-orange-600',
    },
    TIDAK_SAH: {
      title: 'PRESENSI TIDAK SAH',
      subtitle: 'Tidak Memenuhi Kriteria Kehadiran & Pelanggaran Batas Fatal',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      borderClass: 'border-rose-200',
      icon: XCircle,
      iconColor: 'text-rose-600',
    },
  }[result.status];

  const Icon = statusConfig.icon;
  const faceScorePercent = Math.min(100, Math.round(result.similarity_score * 100));

  return (
    <div
      className={`bg-white rounded-3xl border-2 ${statusConfig.borderClass} p-6 shadow-xl space-y-6 transition-all duration-300`}
    >
      {/* Top Banner / Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center ${statusConfig.iconColor} border border-slate-200/80 shadow-xs`}>
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusConfig.badgeClass}`}>
                {result.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs font-mono text-slate-400 font-bold">ID #{result.id}</span>
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight mt-0.5">
              {statusConfig.title}
            </h2>
            <p className="text-xs text-slate-500">{statusConfig.subtitle}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Mahasiswa
          </span>
          <span className="text-sm font-extrabold text-slate-800">{result.name || 'Mahasiswa'}</span>
          <span className="text-xs text-slate-400 block font-mono">NIM: {result.nim}</span>
        </div>
      </div>

      {/* Decision Factor Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Skor Kemiripan Wajah */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            1. Skor Kemiripan Wajah
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-800 font-mono">
              {faceScorePercent}%
            </span>
            <span className="text-xs font-mono text-slate-400">
              {result.similarity_score.toFixed(3)}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                result.similarity_score >= 0.85
                  ? 'bg-emerald-500'
                  : result.similarity_score >= 0.70
                  ? 'bg-orange-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${faceScorePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-0.5">
            <span>Threshold: ≥ 85%</span>
            <span>Oversight: ≥ 70%</span>
          </div>
        </div>

        {/* Jarak GPS ke Kelas */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            2. Jarak Radius GPS
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-800 font-mono">
              {result.distance_meters.toFixed(0)} <span className="text-xs font-sans text-slate-400">meter</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                result.distance_meters <= 50
                  ? 'bg-emerald-100 text-emerald-800'
                  : result.distance_meters <= 100
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {result.distance_meters <= 50 ? 'Valid' : result.distance_meters <= 100 ? 'Drift Sinyal' : 'Luar Radius'}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                result.distance_meters <= 50
                  ? 'bg-emerald-500'
                  : result.distance_meters <= 100
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, (result.distance_meters / 150) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-0.5">
            <span>Batas Valid: ≤ 50m</span>
            <span>Toleransi: ≤ 100m</span>
          </div>
        </div>

        {/* Keterlambatan Waktu */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
            3. Waktu Presensi
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-800 font-mono">
              {result.late_minutes} <span className="text-xs font-sans text-slate-400">menit</span>
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                result.late_minutes <= 15
                  ? 'bg-emerald-100 text-emerald-800'
                  : result.late_minutes <= 30
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {result.late_minutes <= 15 ? 'Tepat Waktu' : result.late_minutes <= 30 ? 'Terlambat' : 'Lewat Batas'}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                result.late_minutes <= 15
                  ? 'bg-emerald-500'
                  : result.late_minutes <= 30
                  ? 'bg-purple-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, (result.late_minutes / 60) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-0.5">
            <span>Tepat: ≤ 15m</span>
            <span>Terlambat: 16-30m</span>
          </div>
        </div>
      </div>

      {/* Decision Reason Details */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <span className="text-xs font-bold text-slate-700 block mb-1">Pertimbangan Logika:</span>
        <p className="text-xs text-slate-600 leading-relaxed">{result.decision_reason}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-bold text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition cursor-pointer w-full sm:w-auto"
        >
          Presensi Mahasiswa Lain
        </button>

        {result.status === 'PERLU_VERIFIKASI_DOSEN' && (
          <button
            type="button"
            onClick={onGoToOversight}
            className="flex items-center justify-center space-x-1.5 text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer w-full sm:w-auto"
          >
            <span>Tinjau di Review Dosen</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
