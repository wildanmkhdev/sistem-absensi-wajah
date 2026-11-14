import React from 'react';
import {
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Scale,
  ArrowRight,
  UserCheck,
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
  // Visual config based on status
  const statusConfig = {
    HADIR: {
      title: 'PRESENSI HADIR',
      subtitle: 'Presensi Terverifikasi Sah dan Tepat Waktu',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      borderClass: 'border-emerald-500/50',
      icon: CheckCircle,
      iconColor: 'text-emerald-400',
    },
    TERLAMBAT: {
      title: 'PRESENSI TERLAMBAT',
      subtitle: 'Presensi Sah dalam Batas Toleransi Terlambat (16-30 Menit)',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      borderClass: 'border-amber-500/50',
      icon: Clock,
      iconColor: 'text-amber-400',
    },
    PERLU_VERIFIKASI_DOSEN: {
      title: 'PERLU VERIFIKASI DOSEN',
      subtitle: 'Memerlukan Human Oversight Sesuai UU PDP No. 27/2022 Pasal 34',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      borderClass: 'border-blue-500/50',
      icon: HelpCircle,
      iconColor: 'text-cyan-400',
    },
    TIDAK_SAH: {
      title: 'PRESENSI TIDAK SAH',
      subtitle: 'Tidak Memenuhi Kriteria Kehadiran & Pelanggaran Batas Fatal',
      badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      borderClass: 'border-rose-500/50',
      icon: XCircle,
      iconColor: 'text-rose-400',
    },
  }[result.status];

  const Icon = statusConfig.icon;
  const faceScorePercent = Math.min(100, Math.round(result.similarity_score * 100));

  return (
    <div
      className={`bg-slate-800/90 rounded-2xl border-2 ${statusConfig.borderClass} p-6 shadow-2xl space-y-6 transition-all duration-300`}
    >
      {/* Top Banner / Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
        <div className="flex items-center space-x-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.badgeClass}`}>
            <Icon className={`w-7 h-7 ${statusConfig.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusConfig.badgeClass}`}
              >
                {statusConfig.title}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ID #{result.id.toString().slice(-4)}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              {result.name || `Mahasiswa (NIM: ${result.nim})`}
            </h2>
            <p className="text-xs text-slate-300">{statusConfig.subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="self-start sm:self-center text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-600 transition"
        >
          Presensi Mahasiswa Lain
        </button>
      </div>

      {/* Decision Factor Breakdown (Skor Wajah, Jarak, Waktu) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Face Similarity */}
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Kemiripan Biometrik Wajah</span>
            <span className="text-[11px] text-slate-500 font-mono">Ambang: ≥ 0.85</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-2">
            {result.similarity_score.toFixed(2)}{' '}
            <span className="text-xs text-slate-400 font-normal">({faceScorePercent}%)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                result.similarity_score >= 0.85
                  ? 'bg-emerald-400'
                  : result.similarity_score >= 0.70
                  ? 'bg-blue-400'
                  : result.similarity_score >= 0.35
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${faceScorePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-mono">
            <span>0.00</span>
            <span className="text-cyan-400 font-semibold">0.85 (Batas)</span>
            <span>1.00</span>
          </div>
        </div>

        {/* 2. GPS Distance */}
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Jarak GPS ke Kelas</span>
            <span className="text-[11px] text-slate-500 font-mono">Maks: ≤ 50m</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-2">
            {result.distance_meters}{' '}
            <span className="text-xs text-slate-400 font-normal">meter</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                result.distance_meters <= 50
                  ? 'bg-emerald-400'
                  : result.distance_meters <= 100
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
              style={{
                width: `${Math.min(100, (result.distance_meters / 100) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-mono">
            <span>0m</span>
            <span className="text-emerald-400 font-semibold">50m (Batas)</span>
            <span className="text-rose-400">100m+</span>
          </div>
        </div>

        {/* 3. Time / Late minutes */}
        <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-700/60">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Keterlambatan Waktu</span>
            <span className="text-[11px] text-slate-500 font-mono">Hadir: ≤ 15m</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mb-2">
            {result.late_minutes}{' '}
            <span className="text-xs text-slate-400 font-normal">menit</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                result.late_minutes <= 15
                  ? 'bg-emerald-400'
                  : result.late_minutes <= 30
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
              style={{
                width: `${Math.min(100, (result.late_minutes / 60) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-mono">
            <span>0m (Tepat)</span>
            <span className="text-amber-300">16-30m (Telat)</span>
            <span className="text-rose-400">&gt;30m</span>
          </div>
        </div>
      </div>

      {/* Comparison: Rancangan Awal vs Rancangan UU PDP */}
      <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-700/70 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
          <Scale className="w-4 h-4 text-cyan-400" />
          <span>Perbandingan: Rancangan Awal vs Rancangan Berbasis UU PDP</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Rancangan Awal (Otomasi Kaku):</div>
            <div className="font-semibold text-sm">
              Status:{' '}
              <span
                className={`font-mono ${
                  result.initial_rule_status === 'HADIR'
                    ? 'text-emerald-400'
                    : result.initial_rule_status === 'TERLAMBAT'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {result.initial_rule_status || 'TIDAK_SAH'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Keputusan 100% bergantung pada ambang batas biner tanpa toleransi faktor lingkungan.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Rancangan UU PDP (Human Oversight):</div>
            <div className="font-semibold text-sm">
              Status: <span className="text-cyan-400 font-mono">{result.status}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Pasal 34 UU PDP melindungi mahasiswa dari vonis gugur otomatis akibat degradasi sensor.
            </p>
          </div>
        </div>
      </div>

      {/* Decision Reason Details */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
        <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Justifikasi Keputusan Sistem:</span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed font-sans">{result.decision_reason}</p>
      </div>

      {/* Human Oversight Alert & Escalation Banner */}
      {result.status === 'PERLU_VERIFIKASI_DOSEN' && (
        <div className="bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-blue-900/40 border border-cyan-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-500/20 text-cyan-400 rounded-lg shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Tiket Eskalasi Human Oversight Dibuat</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Data presensi ini otomatis diteruskan ke antrean Dosen Pengampu untuk diperiksa dan disahkan secara manual.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToOversight}
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg shadow-blue-600/30 transition shrink-0"
          >
            <span>Buka Dashboard Dosen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
