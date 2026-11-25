import React from 'react';
import { X, User } from 'lucide-react';
import type { PresensiResponse } from '../types';
import { IconVerifiedCheck } from './icons/FlaticonIcons';
import { formatDistance } from '../utils/geo';

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

  const statusInfo = isHadir
    ? {
        title: 'Presensi Berhasil Dicatat',
        subtitle: 'Wajah dan koordinat GPS terverifikasi sah.',
        headerBg: 'bg-[var(--mint)]',
        tagClass: 'hlb-tag ok',
        label: 'Hadir Sah',
      }
    : isTerlambat
    ? {
        title: 'Presensi Tercatat (Terlambat)',
        subtitle: 'Kehadiran dicatat dengan catatan keterlambatan.',
        headerBg: 'bg-[var(--paper)]',
        tagClass: 'hlb-tag accent',
        label: 'Terlambat',
      }
    : isOversight
    ? {
        title: 'Menunggu Verifikasi Dosen',
        subtitle: 'Sesuai UU PDP Pasal 34, anomali sensor dialihkan ke dosen.',
        headerBg: 'bg-[var(--paper)]',
        tagClass: 'hlb-tag paper',
        label: 'Review Dosen',
      }
    : {
        title: 'Presensi Tidak Sah',
        subtitle:
          result.late_minutes > 30
            ? `Waktu kehadiran melebihi batas toleransi keterlambatan 30 menit (${Math.round(result.late_minutes)}m).`
            : result.similarity_score < 0.45
            ? `Skor kecocokan wajah (${(result.similarity_score * 100).toFixed(0)}%) di bawah batas 45%.`
            : result.distance_meters > 50
            ? `Posisi berada di luar batas geofence ruang kelas (${formatDistance(result.distance_meters)}).`
            : 'Presensi tidak memenuhi syarat regulasi kehadiran.',
        headerBg: 'bg-[var(--pink)]',
        tagClass: 'hlb-tag warn',
        label: 'Tidak Sah',
      };

  const similarityPct = Math.min(100, Math.max(0, result.similarity_score * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--shadow)]/65 backdrop-blur-[2px] animate-fade-in">
      <div className="hlb-panel shadow-[6px_6px_0_var(--shadow)] max-w-md w-full overflow-hidden">
        {/* Semantic Tint Modal Header */}
        <div
          className={`${statusInfo.headerBg} p-5 border-b-2 border-[var(--edge)] flex items-start justify-between gap-3`}
        >
          <div className="flex items-start space-x-3">
            <div className="w-11 h-11 rounded-xl bg-[var(--surface)] border-2 border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)] flex items-center justify-center shrink-0 text-[var(--ink)]">
              <IconVerifiedCheck className="w-6 h-6" />
            </div>
            <div>
              <span className={statusInfo.tagClass}>{statusInfo.label}</span>
              <h2 className="font-display font-normal text-xl sm:text-2xl text-[var(--ink)] leading-tight mt-1">
                {statusInfo.title}
              </h2>
              <p className="font-sans text-xs text-[var(--soft)] mt-0.5 leading-relaxed">
                {statusInfo.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="hlb-btn-secondary p-1.5 rounded-xl cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Student Info Card */}
          <div className="bg-[var(--bg)] rounded-xl p-3 border-2 border-[var(--edge)] flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--surface)] border-2 border-[var(--edge)] flex items-center justify-center text-[var(--ink)] shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-sans font-semibold text-sm text-[var(--ink)] truncate">
                {result.name || result.student_name || 'Mahasiswa'}
              </div>
              <div className="text-[var(--soft)] font-mono text-[11px] tabular-nums">
                NIM {result.nim}
              </div>
            </div>
          </div>

          {/* Mono Similarity Bar (.hlb-progress) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="uppercase tracking-wider text-[var(--soft)] font-semibold">
                Cosine Similarity Wajah
              </span>
              <span className="font-semibold text-[var(--ink)] tabular-nums">
                {similarityPct.toFixed(1)}% ({result.similarity_score.toFixed(3)})
              </span>
            </div>
            <div className="hlb-progress">
              <div
                className="h-full bg-[var(--yellow)] transition-all duration-500"
                style={{ width: `${similarityPct}%` }}
              />
            </div>
          </div>

          {/* Metric details */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="hlb-tile bg-[var(--bg)] p-2.5">
              <span className="font-mono text-[9px] text-[var(--soft)] block uppercase font-semibold tracking-wider">
                Skor Wajah
              </span>
              <span className="font-display font-normal text-lg text-[var(--ink)] block mt-0.5 tabular-nums leading-tight">
                {similarityPct.toFixed(1)}%
              </span>
            </div>
            <div className="hlb-tile bg-[var(--bg)] p-2.5">
              <span className="font-mono text-[9px] text-[var(--soft)] block uppercase font-semibold tracking-wider">
                Jarak Kelas
              </span>
              <span className="font-display font-normal text-lg text-[var(--ink)] block mt-0.5 tabular-nums leading-tight">
                {formatDistance(result.distance_meters)}
              </span>
            </div>
            <div className="hlb-tile bg-[var(--bg)] p-2.5">
              <span className="font-mono text-[9px] text-[var(--soft)] block uppercase font-semibold tracking-wider">
                Terlambat
              </span>
              <span className="font-display font-normal text-lg text-[var(--ink)] block mt-0.5 tabular-nums leading-tight">
                {result.late_minutes}m
              </span>
            </div>
          </div>

          <div className="hlb-alert info p-3 space-y-1">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ink)] block">
              Keterangan Keputusan
            </span>
            <p className="font-sans text-xs text-[var(--soft)] leading-relaxed">
              {result.decision_reason}
            </p>
          </div>

          <div className="text-[11px] text-[var(--soft)] text-center font-mono tabular-nums pt-0.5">
            Dicatat pada: {formatTimestamp(result.timestamp)}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[var(--bg)] border-t-2 border-[var(--edge)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full hlb-btn-primary h-11 text-xs uppercase tracking-wider cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
