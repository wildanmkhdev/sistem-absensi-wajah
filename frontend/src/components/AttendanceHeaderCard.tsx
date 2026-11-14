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

  const studentName = student?.name || 'Anastasia Putri';
  const studentNim = student?.nim || '210101';
  const isCheckedIn = !!lastPresensi && (lastPresensi.status === 'HADIR' || lastPresensi.status === 'TERLAMBAT');
  const checkInTime = lastPresensi?.timestamp ? lastPresensi.timestamp.split(' ')[1] || '08:57' : isCheckedIn ? '08:57' : '--:--';

  return (
    <div className="w-full">
      {/* Solid Flat Pastel Teal Header (No Gradient, Single Color) */}
      <div className="w-full bg-teal-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xs">
        {/* Top Profile Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            {/* Student Profile Avatar */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/80 overflow-hidden bg-teal-700 flex items-center justify-center">
                {student?.profile_image_url ? (
                  <img
                    src={student.profile_image_url}
                    alt={studentName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-teal-700 flex items-center justify-center font-bold text-lg text-white">
                    {studentName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-teal-800" title="Online" />
            </div>

            <div className="space-y-0.5">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Halo, {studentName}
              </h1>
              <p className="text-xs text-teal-100 font-medium">
                S1 Informatika • Lab AI &amp; Modul 13
              </p>
              <div className="flex items-center space-x-2 pt-0.5">
                <span className="text-[10px] font-semibold bg-teal-900/60 px-2 py-0.2 rounded-md text-teal-100">
                  NIM: {studentNim}
                </span>
                <span className="text-[10px] font-semibold bg-teal-700/80 px-2 py-0.2 rounded-md text-teal-100">
                  Semester Genap
                </span>
              </div>
            </div>
          </div>

          {/* Right Live Time Pill */}
          <div className="text-right hidden sm:block">
            <div className="inline-flex items-center space-x-1.5 bg-teal-900/50 px-3 py-1.5 rounded-xl border border-teal-700/60 text-xs font-mono font-bold text-teal-100">
              <Clock className="w-3.5 h-3.5 text-teal-300 animate-pulse" />
              <span>{currentTime}</span>
            </div>
            <div className="text-[10px] text-teal-200 mt-1 font-medium">
              {currentDate}
            </div>
          </div>
        </div>

        {/* Clean Solid Floating Attendance Card */}
        <div className="mt-4 bg-white rounded-xl sm:rounded-2xl p-4 text-slate-800 shadow-sm border border-slate-100 space-y-3.5">
          {/* Mobile Date & Time Bar */}
          <div className="flex sm:hidden items-center justify-between pb-2.5 border-b border-slate-100 text-xs">
            <span className="text-slate-500 font-semibold flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>{currentDate}</span>
            </span>
            <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
              {currentTime}
            </span>
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

          {/* Solid Pastel Teal CTA Button (Flat color, No Gradient, No Orange) */}
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
    </div>
  );
};
