import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Camera, Calendar, LogOut, ChevronRight } from 'lucide-react';
import type { PresensiResponse } from '../types';

interface AttendanceHeaderCardProps {
  onRekamPresensi: () => void;
  lastPresensi?: PresensiResponse | null;
  isSubmitting?: boolean;
}

export const AttendanceHeaderCard: React.FC<AttendanceHeaderCardProps> = ({
  onRekamPresensi,
  lastPresensi,
  isSubmitting = false,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      };
      setCurrentDate(now.toLocaleDateString('id-ID', options));
      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setCurrentTime(`${timeStr} WIB`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isCheckedIn = !!lastPresensi && (lastPresensi.status === 'HADIR' || lastPresensi.status === 'TERLAMBAT');
  const checkInTime = lastPresensi?.timestamp ? lastPresensi.timestamp.split(' ')[1] || '08:57' : isCheckedIn ? '08:57' : '--:--';

  return (
    <div className="w-full">
      {/* Clean Attendance Card Without Profile Header (No Profile Account) */}
      <div className="w-full bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5">
        {/* Top Date & Live Clock Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>{currentDate || 'Sabtu, 14 November 2026'}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200/60">
            <Clock className="w-3.5 h-3.5 animate-pulse text-teal-600" />
            <span>{currentTime || '08:00:00 WIB'}</span>
          </div>
        </div>

        {/* 2 Neat Columns (Hadir vs Pulang) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Waktu Hadir */}
          <div
            className={`p-3 rounded-xl border transition-colors ${
              isCheckedIn
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-50 text-slate-700 border-slate-200/70'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Waktu Hadir
              </span>
              {isCheckedIn ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
            <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-800">
              {checkInTime}
            </div>
            <span className="text-[10px] text-slate-400 block font-medium">
              {isCheckedIn ? 'Presensi Masuk Sah' : 'Belum Rekam Masuk'}
            </span>
          </div>

          {/* Waktu Pulang */}
          <div className="p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/70">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Waktu Pulang
              </span>
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-400">
              --:--
            </div>
            <span className="text-[10px] text-slate-400 block font-medium">
              Jadwal: 15:00 WIB
            </span>
          </div>
        </div>

        {/* Solid Pastel Teal CTA Button */}
        <button
          type="button"
          onClick={onRekamPresensi}
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm tracking-wide text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2"
        >
          <Camera className="w-4 h-4 text-white" />
          <span>
            {isCheckedIn ? 'REKAM PRESENSI ULANG / PULANG' : 'AMBIL FOTO & REKAM KEHADIRAN'}
          </span>
          <ChevronRight className="w-4 h-4 text-teal-200" />
        </button>
      </div>
    </div>
  );
};
