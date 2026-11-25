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
      tagClass: 'hlb-tag ok',
      headerBg: 'bg-[var(--mint)]',
      icon: CheckCircle,
      iconColor: 'text-[var(--green)]',
    },
    TERLAMBAT: {
      title: 'PRESENSI TERLAMBAT',
      subtitle: 'Presensi Sah dalam Batas Toleransi Terlambat (16-30 Menit)',
      tagClass: 'hlb-tag accent',
      headerBg: 'bg-[var(--paper)]',
      icon: Clock,
      iconColor: 'text-[var(--orange)]',
    },
    PERLU_VERIFIKASI_DOSEN: {
      title: 'PERLU VERIFIKASI DOSEN',
      subtitle: 'Memerlukan Human Oversight Sesuai UU PDP No. 27/2022 Pasal 34',
      tagClass: 'hlb-tag paper',
      headerBg: 'bg-[var(--paper)]',
      icon: HelpCircle,
      iconColor: 'text-[var(--blue)]',
    },
    TIDAK_SAH: {
      title: 'PRESENSI TIDAK SAH',
      subtitle: 'Tidak Memenuhi Kriteria Kehadiran & Pelanggaran Batas Fatal',
      tagClass: 'hlb-tag warn',
      headerBg: 'bg-[var(--pink)]',
      icon: XCircle,
      iconColor: 'text-[var(--red)]',
    },
  }[result.status];

  const Icon = statusConfig.icon;
  const faceScorePercent = Math.min(100, Math.round(result.similarity_score * 100));

  return (
    <div className="hlb-panel overflow-hidden transition-all duration-300">
      {/* Top Semantic Tint Banner / Status Header */}
      <div
        className={`${statusConfig.headerBg} p-5 sm:p-6 border-b-2 border-[var(--edge)] flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
      >
        <div className="flex items-center space-x-3.5">
          <div
            className={`w-12 h-12 rounded-xl bg-[var(--surface)] border-2 border-[var(--edge)] shadow-[3px_3px_0_var(--shadow)] flex items-center justify-center shrink-0 ${statusConfig.iconColor}`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={statusConfig.tagClass}>
                {result.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs font-mono text-[var(--soft)] font-semibold">
                ID #{result.id}
              </span>
            </div>
            <h2 className="font-display font-normal text-2xl text-[var(--ink)] leading-tight mt-1">
              {statusConfig.title}
            </h2>
            <p className="font-sans text-xs text-[var(--soft)] mt-0.5">{statusConfig.subtitle}</p>
          </div>
        </div>

        <div className="sm:text-right shrink-0">
          <span className="font-mono text-[10px] uppercase font-semibold text-[var(--soft)] block tracking-wider">
            Mahasiswa
          </span>
          <span className="font-sans text-sm font-bold text-[var(--ink)]">
            {result.name || 'Mahasiswa'}
          </span>
          <span className="text-xs text-[var(--soft)] block font-mono tabular-nums">
            NIM: {result.nim}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Decision Factor Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Skor Kemiripan Wajah */}
          <div className="hlb-tile bg-[var(--bg)] p-4 space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)] font-semibold block">
              1. Skor Kemiripan Wajah
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-display font-normal text-3xl text-[var(--ink)] leading-none tabular-nums">
                {faceScorePercent}%
              </span>
              <span className="text-xs font-mono text-[var(--soft)] tabular-nums">
                {result.similarity_score.toFixed(3)}
              </span>
            </div>
            <div className="hlb-progress">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${faceScorePercent}%`,
                  backgroundColor:
                    result.similarity_score >= 0.85
                      ? 'var(--green)'
                      : result.similarity_score >= 0.70
                      ? 'var(--orange)'
                      : 'var(--red)',
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--soft)] font-mono pt-0.5">
              <span>Threshold: ≥85%</span>
              <span>Oversight: ≥70%</span>
            </div>
          </div>

          {/* Jarak GPS ke Kelas */}
          <div className="hlb-tile bg-[var(--bg)] p-4 space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)] font-semibold block">
              2. Jarak Radius GPS
            </span>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display font-normal text-3xl text-[var(--ink)] leading-none tabular-nums">
                {result.distance_meters.toFixed(0)}{' '}
                <span className="text-xs font-mono text-[var(--soft)]">m</span>
              </span>
              <span
                className={
                  result.distance_meters <= 50
                    ? 'hlb-tag ok'
                    : result.distance_meters <= 100
                    ? 'hlb-tag paper'
                    : 'hlb-tag warn'
                }
              >
                {result.distance_meters <= 50
                  ? 'Valid'
                  : result.distance_meters <= 100
                  ? 'Drift'
                  : 'Luar'}
              </span>
            </div>
            <div className="hlb-progress">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (result.distance_meters / 150) * 100)}%`,
                  backgroundColor:
                    result.distance_meters <= 50
                      ? 'var(--green)'
                      : result.distance_meters <= 100
                      ? 'var(--orange)'
                      : 'var(--red)',
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--soft)] font-mono pt-0.5">
              <span>Valid: ≤50m</span>
              <span>Toleransi: ≤100m</span>
            </div>
          </div>

          {/* Keterlambatan Waktu */}
          <div className="hlb-tile bg-[var(--bg)] p-4 space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)] font-semibold block">
              3. Waktu Presensi
            </span>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display font-normal text-3xl text-[var(--ink)] leading-none tabular-nums">
                {result.late_minutes}{' '}
                <span className="text-xs font-mono text-[var(--soft)]">mnt</span>
              </span>
              <span
                className={
                  result.late_minutes <= 15
                    ? 'hlb-tag ok'
                    : result.late_minutes <= 30
                    ? 'hlb-tag accent'
                    : 'hlb-tag warn'
                }
              >
                {result.late_minutes <= 15
                  ? 'Tepat'
                  : result.late_minutes <= 30
                  ? 'Telat'
                  : 'Lewat'}
              </span>
            </div>
            <div className="hlb-progress">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (result.late_minutes / 60) * 100)}%`,
                  backgroundColor:
                    result.late_minutes <= 15
                      ? 'var(--green)'
                      : result.late_minutes <= 30
                      ? 'var(--orange)'
                      : 'var(--red)',
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--soft)] font-mono pt-0.5">
              <span>Tepat: ≤15m</span>
              <span>Telat: 16-30m</span>
            </div>
          </div>
        </div>

        {/* Decision Reason Details */}
        <div className="hlb-alert info p-4 space-y-1">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)] block">
            Pertimbangan Logika
          </span>
          <p className="font-sans text-xs text-[var(--soft)] leading-relaxed">
            {result.decision_reason}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={onReset}
            className="hlb-btn-secondary font-mono text-xs uppercase tracking-wider px-4 py-2.5 cursor-pointer w-full sm:w-auto"
          >
            Presensi Mahasiswa Lain
          </button>

          {result.status === 'PERLU_VERIFIKASI_DOSEN' && (
            <button
              type="button"
              onClick={onGoToOversight}
              className="hlb-btn-primary flex items-center justify-center space-x-1.5 text-xs uppercase tracking-wider px-4 py-2.5 cursor-pointer w-full sm:w-auto"
            >
              <span>Tinjau di Review Dosen</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
