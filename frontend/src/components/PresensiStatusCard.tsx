import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import type { AttendanceRecord } from '../types';
import type { Session } from '../auth';
import { IconStudentCard } from './icons/FlaticonIcons';

interface PresensiStatusCardProps {
  student: Session;
  records: AttendanceRecord[];
}

const AttendancePieChart: React.FC<{
  rate: number;
  hadir: number;
  terlambat: number;
  review: number;
  tidakSah: number;
  total: number;
}> = ({ rate, hadir, terlambat, review, tidakSah, total }) => {
  const r = 30;
  const stroke = 7;
  const c = 2 * Math.PI * r; // ≈ 188.495

  if (total === 0) {
    return (
      <div className="relative flex items-center justify-center shrink-0 w-20 h-20">
        <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 76 76">
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="transparent"
            stroke="var(--line)"
            strokeWidth={stroke}
          />
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="transparent"
            stroke="var(--green)"
            strokeWidth={stroke}
            strokeDasharray={`${c} 0`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display font-normal text-lg text-[var(--ink)] leading-none tabular-nums">
            100%
          </span>
          <span className="font-mono text-[8px] uppercase text-[var(--soft)] mt-0.5">Hadir</span>
        </div>
      </div>
    );
  }

  const hadirLen = (hadir / total) * c;
  const terlambatLen = (terlambat / total) * c;
  const reviewLen = (review / total) * c;
  const tidakSahLen = (tidakSah / total) * c;

  const hadirOffset = 0;
  const terlambatOffset = hadirLen;
  const reviewOffset = hadirLen + terlambatLen;
  const tidakSahOffset = hadirLen + terlambatLen + reviewLen;

  return (
    <div
      className="relative flex items-center justify-center shrink-0 w-20 h-20"
      title={`Tepat Waktu: ${hadir}, Terlambat: ${terlambat}, Review: ${review}, Tidak Sah: ${tidakSah}`}
    >
      <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 76 76">
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="transparent"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        {hadir > 0 && (
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="transparent"
            stroke="var(--green)"
            strokeWidth={stroke}
            strokeDasharray={`${hadirLen} ${c - hadirLen}`}
            strokeDashoffset={-hadirOffset}
          />
        )}
        {terlambat > 0 && (
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="transparent"
            stroke="var(--orange)"
            strokeWidth={stroke}
            strokeDasharray={`${terlambatLen} ${c - terlambatLen}`}
            strokeDashoffset={-terlambatOffset}
          />
        )}
        {review > 0 && (
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="transparent"
            stroke="var(--blue)"
            strokeWidth={stroke}
            strokeDasharray={`${reviewLen} ${c - reviewLen}`}
            strokeDashoffset={-reviewOffset}
          />
        )}
        {tidakSah > 0 && (
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="transparent"
            stroke="var(--red)"
            strokeWidth={stroke}
            strokeDasharray={`${tidakSahLen} ${c - tidakSahLen}`}
            strokeDashoffset={-tidakSahOffset}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display font-normal text-lg text-[var(--ink)] leading-none tabular-nums">
          {rate}%
        </span>
        <span className="font-mono text-[8px] uppercase text-[var(--soft)] mt-0.5">Hadir</span>
      </div>
    </div>
  );
};

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

  const totalValid = counts.hadir + counts.terlambat;
  const attendanceRate = records.length > 0 ? Math.round((totalValid / records.length) * 100) : 100;

  return (
    <div className="hlb-panel p-5 space-y-4">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-[var(--edge)]">
        <span className="font-sans text-xs font-semibold text-[var(--soft)]">{currentDate}</span>
        <span className="hlb-tag paper tabular-nums">{currentTime}</span>
      </div>

      {/* Student Profile Header & Attendance Rate Pie Chart */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[var(--yellow)] border-2 border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)] flex items-center justify-center text-[var(--on-yellow)] shrink-0">
            <IconStudentCard className="w-7 h-7" />
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

        {/* Attendance Rate SVG Pie/Donut Chart */}
        <AttendancePieChart
          rate={attendanceRate}
          hadir={counts.hadir}
          terlambat={counts.terlambat}
          review={counts.review}
          tidakSah={counts.tidakSah}
          total={records.length}
        />
      </div>

      {/* Metric KPI Tiles */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div className="hlb-tile-key p-3">
          <div className="flex items-center font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--on-yellow-soft)] mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--on-yellow)] mr-1.5 shrink-0" />
            <span className="truncate">Tepat Waktu</span>
          </div>
          <div className="font-display font-normal text-2xl sm:text-3xl text-[var(--on-yellow)] leading-none tabular-nums">
            {counts.hadir}
          </div>
        </div>

        <div className="hlb-tile p-3">
          <div className="flex items-center font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-1">
            <Clock className="w-3.5 h-3.5 text-[var(--orange)] mr-1.5 shrink-0" />
            <span className="truncate">Terlambat</span>
          </div>
          <div className="font-display font-normal text-2xl sm:text-3xl text-[var(--ink)] leading-none tabular-nums">
            {counts.terlambat}
          </div>
        </div>

        <div className="hlb-tile p-3">
          <div className="flex items-center font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--blue)] mr-1.5 shrink-0" />
            <span className="truncate">Review Dosen</span>
          </div>
          <div className="font-display font-normal text-2xl sm:text-3xl text-[var(--ink)] leading-none tabular-nums">
            {counts.review}
          </div>
        </div>
      </div>
    </div>
  );
};
