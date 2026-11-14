import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Camera, Calendar, LogOut, ChevronRight } from 'lucide-react';
import type { Student, PresensiResponse } from '../types';

interface AttendanceHeaderCardProps {
  student?: Student | null;
  onRekamPresensi: () => void;
  lastPresensi?: PresensiResponse | null;
  isSubmitting?: boolean;
}

export const AttendanceHeaderCard: React.FC<AttendanceHeaderCardProps> = ({
  student,
  onRekamPresensi,
  lastPresensi,
  isSubmitting = false,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      // Indonesian Date Format
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      };
      setCurrentDate(now.toLocaleDateString('id-ID', options));
      // Format digital clock
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

  const studentName = student?.name || 'Anastasia Putri';
  const studentNim = student?.nim || '210101';
  const isCheckedIn = !!lastPresensi && (lastPresensi.status === 'HADIR' || lastPresensi.status === 'TERLAMBAT');
  const checkInTime = lastPresensi?.timestamp ? lastPresensi.timestamp.split(' ')[1] || '08:57' : isCheckedIn ? '08:57' : '--:--';

  return (
    <div className="relative w-full overflow-hidden">
      {/* Warm Sunny Orange Gradient Background Banner (Exact Dribbble Style) */}
      <div className="w-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white relative shadow-lg shadow-orange-500/15">
        {/* Soft Decorative Ambient Background Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none transform translate-x-12 -translate-y-12" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-700/20 rounded-full blur-xl pointer-events-none transform -translate-x-12 translate-y-12" />

        {/* Top Profile Header Row */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>Halo, {studentName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-orange-100 font-medium">
              S1 Informatika • Lab AI &amp; Modul 13 UU PDP
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white border border-white/30">
                NIM: {studentNim}
              </span>
              <span className="text-[10px] font-bold bg-emerald-400/30 backdrop-blur-md px-2 py-0.5 rounded-full text-emerald-100 border border-emerald-300/40 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                <span>Semester Genap 2026</span>
              </span>
            </div>
          </div>

          {/* Student Profile Avatar with Glowing Ring */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-3 border-white/90 shadow-md overflow-hidden bg-white/20 flex items-center justify-center">
              {student?.profile_image_url ? (
                <img
                  src={student.profile_image_url}
                  alt={studentName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-amber-300 to-orange-400 flex items-center justify-center font-black text-xl text-white">
                  {studentName.charAt(0)}
                </div>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-xs" title="Status Online" />
          </div>
        </div>

        {/* Floating Attendance Punch Card (Inside or Layered over Gradient) */}
        <div className="relative z-10 mt-6 bg-white rounded-3xl p-5 sm:p-6 text-slate-800 shadow-[0_12px_36px_rgba(0,0,0,0.08)] border border-orange-100/80 space-y-4">
          {/* Date & Live Digital Clock Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-600">
              <Calendar className="w-4 h-4 text-orange-500" />
              <span>{currentDate || 'Senin, 14 November 2026'}</span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-extrabold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 self-start sm:self-auto font-mono">
              <Clock className="w-3.5 h-3.5 animate-pulse text-orange-500" />
              <span>{currentTime || '09:56:00 WIB'}</span>
            </div>
          </div>

          {/* Check-In vs Check-Out Grid (2 Columns, Exact Dribbble visual) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Waktu Hadir */}
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                isCheckedIn
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200/70'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isCheckedIn ? 'text-emerald-100' : 'text-slate-400'
                  }`}
                >
                  Waktu Hadir
                </span>
                {isCheckedIn ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                {checkInTime}
              </div>
              <span
                className={`text-[10px] font-semibold block mt-0.5 ${
                  isCheckedIn ? 'text-emerald-100' : 'text-slate-400'
                }`}
              >
                {isCheckedIn ? 'Presensi Valid Masuk' : 'Belum Rekam Masuk'}
              </span>
            </div>

            {/* Waktu Pulang / Selesai */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 text-slate-700 border border-slate-200/70">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Waktu Pulang
                </span>
                <LogOut className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-400">
                --:--
              </div>
              <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                Batas Jam: 15:00 WIB
              </span>
            </div>
          </div>

          {/* Vibrant Turquoise / Teal CTA Pill Button (Exact match from Dribbble) */}
          <button
            type="button"
            onClick={onRekamPresensi}
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wide text-white bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 hover:from-teal-600 hover:to-cyan-600 active:scale-[0.99] shadow-lg shadow-teal-500/25 transition-all duration-150 cursor-pointer flex items-center justify-center space-x-2.5"
          >
            <Camera className="w-5 h-5 text-teal-100" />
            <span className="uppercase">
              {isCheckedIn ? 'REKAM PRESENSI ULANG / PULANG' : 'REKAM KEHADIRAN SEKARANG'}
            </span>
            <ChevronRight className="w-4 h-4 text-teal-200" />
          </button>
        </div>
      </div>
    </div>
  );
};
