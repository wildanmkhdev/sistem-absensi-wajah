import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react';
import type { AttendanceRecord } from '../types';
import type { Session } from '../auth';
import { IconStudentCard } from './icons/FlaticonIcons';

interface PresensiStatusCardProps {
  student: Session;
  records: AttendanceRecord[];
}

export const PresensiStatusCard: React.FC<PresensiStatusCardProps> = ({ student, records }) => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentDate = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const currentTime = `${now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })} WIB`;

  const counts = useMemo(() => {
    return records.reduce(
      (acc, record) => {
        if (record.status === 'HADIR') acc.hadir += 1;
        else if (record.status === 'TERLAMBAT') acc.terlambat += 1;
        else if (record.status === 'PERLU_VERIFIKASI_DOSEN') acc.review += 1;
        else acc.tidakSah += 1;
        return acc;
      },
      { hadir: 0, terlambat: 0, review: 0, tidakSah: 0 }
    );
  }, [records]);

  const total = records.length;
  const totalValid = counts.hadir + counts.terlambat;
  const attendanceRate = total > 0 ? Math.round((totalValid / total) * 100) : 0;

  const pct = (count: number) => (total > 0 ? (count / total) * 100 : 0);

  const segments = [
    {
      key: 'hadir',
      label: 'Tepat Waktu',
      count: counts.hadir,
      percent: pct(counts.hadir),
      color: 'var(--green)',
      dotClass: 'bg-[var(--green)]',
      icon: CheckCircle2,
      iconColor: 'text-[var(--green)]',
    },
    {
      key: 'terlambat',
      label: 'Terlambat',
      count: counts.terlambat,
      percent: pct(counts.terlambat),
      color: 'var(--orange)',
      dotClass: 'bg-[var(--orange)]',
      icon: Clock,
      iconColor: 'text-[var(--orange)]',
    },
    {
      key: 'review',
      label: 'Review Dosen',
      count: counts.review,
      percent: pct(counts.review),
      color: 'var(--blue)',
      dotClass: 'bg-[var(--blue)]',
      icon: ShieldAlert,
      iconColor: 'text-[var(--blue)]',
    },
    {
      key: 'tidakSah',
      label: 'Ditolak',
      count: counts.tidakSah,
      percent: pct(counts.tidakSah),
      color: 'var(--red)',
      dotClass: 'bg-[var(--red)]',
      icon: XCircle,
      iconColor: 'text-[var(--red)]',
    },
  ];

  return (
    <div className="hlb-panel p-4 sm:p-5 space-y-4">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--line)]">
        <span className="font-sans text-xs font-semibold text-[var(--soft)]">{currentDate}</span>
        <span className="hlb-tag paper tabular-nums">{currentTime}</span>
      </div>

      {/* Student Profile Header & Verified Attendance Rate */}
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[var(--yellow)] border border-[var(--on-yellow)] shadow-[2px_2px_0_var(--shadow)] flex items-center justify-center text-[var(--on-yellow)] shrink-0">
            <IconStudentCard className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display font-normal text-xl sm:text-2xl text-[var(--ink)] leading-tight truncate">
                {student.name}
              </span>
              <span className="hlb-tag neutral shrink-0">NIM {student.nim}</span>
            </div>
            <p className="font-sans text-xs text-[var(--soft)] truncate mt-0.5">
              Mahasiswa Aktif • Program Studi Sarjana
            </p>
          </div>
        </div>

        {/* Clean Attendance Rate Pill */}
        <div className="hlb-tile-key px-3.5 py-2 text-right shrink-0">
          <div className="font-display font-normal text-2xl sm:text-3xl text-[var(--on-yellow)] leading-none tabular-nums">
            {attendanceRate}%
          </div>
          <div className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--on-yellow-soft)] mt-0.5 tabular-nums">
            {total > 0 ? `${totalValid}/${total} Sah` : 'Belum Ada Data'}
          </div>
        </div>
      </div>

      {/* Modern Segmented Distribution Bar (replaces clunky donut chart) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--soft)]">
          <span>Distribusi Kehadiran</span>
          <span className="tabular-nums">{total} Total Catatan</span>
        </div>

        <div
          className="w-full h-3.5 rounded-full bg-[var(--bg)] border border-[var(--edge)] overflow-hidden flex"
          role="img"
          aria-label={`Distribusi kehadiran: ${counts.hadir} tepat waktu, ${counts.terlambat} terlambat, ${counts.review} review dosen, ${counts.tidakSah} ditolak dari ${total} catatan`}
        >
          {total === 0 ? (
            <div className="w-full h-full bg-[var(--line)]/60" />
          ) : (
            segments.map(
              (seg) =>
                seg.count > 0 && (
                  <div
                    key={seg.key}
                    style={{ width: `${seg.percent}%`, backgroundColor: seg.color }}
                    className="h-full transition-all duration-500 border-r last:border-r-0 border-[var(--surface)]/70"
                    title={`${seg.label}: ${seg.count} (${Math.round(seg.percent)}%)`}
                  />
                )
            )
          )}
        </div>
      </div>

      {/* 4-Column Accurate Breakdown Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {segments.map((seg) => {
          const Icon = seg.icon;
          const roundedPct = Math.round(seg.percent);
          return (
            <div key={seg.key} className="hlb-tile p-2.5 sm:p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="flex items-center font-mono text-[9.5px] font-semibold uppercase tracking-wider text-[var(--soft)] truncate">
                  <Icon className={`w-3.5 h-3.5 ${seg.iconColor} mr-1 shrink-0`} />
                  <span className="truncate">{seg.label}</span>
                </span>
                <span className={`w-2 h-2 rounded-full ${seg.dotClass} shrink-0`} />
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="font-display font-normal text-2xl text-[var(--ink)] leading-none tabular-nums">
                  {seg.count}
                </span>
                <span className="font-mono text-[10px] text-[var(--soft)] tabular-nums">
                  {roundedPct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
