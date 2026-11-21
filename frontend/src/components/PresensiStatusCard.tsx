import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus } from '../types';
import type { Session } from '../auth';

interface PresensiStatusCardProps {
  student: Session;
  records: AttendanceRecord[];
}

const STATUS_BADGE: Record<AttendanceStatus, { label: string; className: string }> = {
  HADIR: {
    label: 'Hadir',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  TERLAMBAT: {
    label: 'Terlambat',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  PERLU_VERIFIKASI_DOSEN: {
    label: 'Verifikasi Dosen',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  TIDAK_SAH: {
    label: 'Tidak Sah',
    className: 'bg-rose-100 text-rose-800 border-rose-200',
  },
};

const toDateKey = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
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
    second: '2-digit',
  })} WIB`;

  const counts = useMemo(
    () =>
      records.reduce(
        (acc, record) => {
          if (record.status === 'HADIR') acc.hadir += 1;
          else if (record.status === 'TERLAMBAT') acc.terlambat += 1;
          else if (record.status === 'PERLU_VERIFIKASI_DOSEN') acc.review += 1;
          return acc;
        },
        { hadir: 0, terlambat: 0, review: 0 }
      ),
    [records]
  );

  const newestRecord = records[0] ?? null;
  const hasPresensiToday = newestRecord
    ? newestRecord.timestamp.slice(0, 10) === toDateKey(now)
    : false;

  const chips = [
    {
      label: 'Hadir',
      count: counts.hadir,
      icon: CheckCircle2,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      iconClass: 'text-emerald-600',
    },
    {
      label: 'Terlambat',
      count: counts.terlambat,
      icon: Clock,
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      iconClass: 'text-indigo-600',
    },
    {
      label: 'Review Dosen',
      count: counts.review,
      icon: ShieldAlert,
      className: 'bg-amber-50 text-amber-700 border-amber-200/80',
      iconClass: 'text-amber-600',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 min-w-0">
          <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="truncate">{currentDate}</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200/60 shrink-0">
          <Clock className="w-3.5 h-3.5 animate-pulse text-teal-600" />
          <span>{currentTime}</span>
        </div>
      </div>

      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
          Halo, {student.name}
        </h2>
        <p className="text-xs text-slate-500 font-mono">NIM {student.nim}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {chips.map((chip) => {
          const Icon = chip.icon;
          return (
            <div
              key={chip.label}
              className={`rounded-xl border px-2.5 py-2 ${chip.className}`}
            >
              <div className="flex items-center space-x-1">
                <Icon className={`w-3.5 h-3.5 ${chip.iconClass}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                  {chip.label}
                </span>
              </div>
              <span className="text-lg font-black font-mono leading-tight">{chip.count}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2">
        <span className="text-[11px] font-semibold text-slate-500">Status hari ini</span>
        {hasPresensiToday && newestRecord ? (
          <span
            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${
              STATUS_BADGE[newestRecord.status].className
            }`}
          >
            {newestRecord.status === 'TIDAK_SAH' ? (
              <XCircle className="w-3 h-3" />
            ) : newestRecord.status === 'PERLU_VERIFIKASI_DOSEN' ? (
              <ShieldAlert className="w-3 h-3" />
            ) : newestRecord.status === 'TERLAMBAT' ? (
              <Clock className="w-3 h-3" />
            ) : (
              <CheckCircle2 className="w-3 h-3" />
            )}
            <span>{STATUS_BADGE[newestRecord.status].label}</span>
          </span>
        ) : (
          <span className="text-[11px] font-bold text-slate-400">Belum presensi hari ini</span>
        )}
      </div>
    </div>
  );
};
