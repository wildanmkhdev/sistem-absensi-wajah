import React from 'react';
import { CalendarCheck2, UserX, Clock, ShieldAlert, Briefcase, Calendar } from 'lucide-react';

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
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-100',
      badgeColor: 'bg-teal-500 text-white',
    },
    {
      id: 'TIDAK_SAH',
      label: 'Tidak Hadir',
      count: alfaCount,
      icon: UserX,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100',
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'TERLAMBAT',
      label: 'Terlambat',
      count: terlambatCount,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      badgeColor: 'bg-purple-500 text-white',
    },
    {
      id: 'PERLU_VERIFIKASI_DOSEN',
      label: 'Review Dosen',
      count: oversightCount,
      icon: ShieldAlert,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100',
      badgeColor: 'bg-orange-500 text-white',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section 1: Rekap Kehadiran Anda */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">
              Rekap Kehadiran Anda
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Bulan ini (Semester Genap 2026)
            </span>
          </div>
        </div>

        {/* 4 Cards Grid - Matches Dribbble Screen 1 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterClick && onFilterClick(item.id)}
                className={`relative bg-white rounded-2xl p-3.5 border ${item.borderColor} shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-md transition-all text-left group cursor-pointer flex flex-col justify-between`}
              >
                {/* Top Badge Count */}
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={`w-9 h-9 rounded-xl ${item.bgColor} ${item.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${item.badgeColor} shadow-xs font-mono`}>
                    {item.count}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-700 block truncate">
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

      {/* Section 2: Jam Kerja / Jadwal Kuliah - Matches Dribbble Screen 1 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800">
            Jadwal Kuliah
          </h3>
          <span className="text-[11px] text-orange-600 font-bold bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100 flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-orange-500" />
            <span>Reguler S1</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Sesi 1 */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-800 block">
                08:00 WIB - 15:00 WIB
              </span>
              <span className="text-[11px] text-slate-400 block font-medium">
                Senin - Kamis • Kuliah Teori &amp; Studi Kasus AI
              </span>
            </div>
          </div>

          {/* Sesi 2 */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-800 block">
                07:30 WIB - 11:30 WIB
              </span>
              <span className="text-[11px] text-slate-400 block font-medium">
                Jumat • Praktikum Lab &amp; Simulasi Etika UU PDP
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
