import React from 'react';
import { CalendarCheck2, UserX, Clock, ShieldAlert, Briefcase } from 'lucide-react';

interface RekapKehadiranCardsProps {
  hadirCount?: number;
  alfaCount?: number;
  terlambatCount?: number;
  oversightCount?: number;
  onFilterClick?: (status: string) => void;
}

export const RekapKehadiranCards: React.FC<RekapKehadiranCardsProps> = ({
  hadirCount = 22,
  alfaCount = 0,
  terlambatCount = 1,
  oversightCount = 0,
  onFilterClick,
}) => {
  const statItems = [
    {
      id: 'HADIR',
      label: 'Kehadiran',
      count: hadirCount,
      icon: CalendarCheck2,
      color: 'text-teal-700',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200/80',
      badgeColor: 'bg-teal-600 text-white',
    },
    {
      id: 'TIDAK_SAH',
      label: 'Tidak Hadir',
      count: alfaCount,
      icon: UserX,
      color: 'text-rose-700',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200/80',
      badgeColor: 'bg-rose-600 text-white',
    },
    {
      id: 'TERLAMBAT',
      label: 'Terlambat',
      count: terlambatCount,
      icon: Clock,
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200/80',
      badgeColor: 'bg-indigo-600 text-white',
    },
    {
      id: 'PERLU_VERIFIKASI_DOSEN',
      label: 'Review Dosen',
      count: oversightCount,
      icon: ShieldAlert,
      color: 'text-amber-800',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200/80',
      badgeColor: 'bg-amber-600 text-white',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Rekap Kehadiran Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800">
            Rekap Kehadiran
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">
            Semester Genap 2026
          </span>
        </div>

        {/* 4 Cards Grid - Compact and Tidy */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-2">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterClick && onFilterClick(item.id)}
                className={`bg-white rounded-xl p-3 border ${item.borderColor} shadow-xs hover:border-slate-300 transition-colors text-left cursor-pointer flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className={`w-7 h-7 rounded-lg ${item.bgColor} ${item.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${item.badgeColor} font-mono`}>
                    {item.count}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 block truncate">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    {item.count} Sesi Tercatat
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Jadwal Kuliah Section - Compact 1-line style */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
            <Briefcase className="w-3.5 h-3.5 text-teal-600" />
            <span>Jadwal Kuliah</span>
          </span>
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
            Reguler
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-700 block">08:00 - 15:00 WIB</span>
            <span className="text-[10px] text-slate-500 block">Senin - Kamis • Kuliah Teori &amp; Kasus AI</span>
          </div>

          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
            <span className="font-bold text-slate-700 block">07:30 - 11:30 WIB</span>
            <span className="text-[10px] text-slate-500 block">Jumat • Praktikum Lab &amp; Etika AI</span>
          </div>
        </div>
      </div>
    </div>
  );
};
