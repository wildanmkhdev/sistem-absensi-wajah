import React from 'react';
import { Home, Camera, ShieldCheck, Award, History } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingOversightCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  pendingOversightCount,
}) => {
  const navItems = [
    { id: 'presensi', label: 'Beranda', icon: Home },
    { id: 'camera_modal', label: 'Presensi', icon: Camera, isCenterShutter: true },
    {
      id: 'oversight',
      label: 'Review',
      icon: ShieldCheck,
      badge: pendingOversightCount > 0 ? pendingOversightCount : null,
    },
    { id: 'benchmark', label: 'M1-M6', icon: Award },
    { id: 'history', label: 'Riwayat', icon: History },
  ];

  return (
    <div className="sticky bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 px-3 py-2">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isCenterShutter) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab('presensi')}
                className="relative -top-5 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/35 flex items-center justify-center transform active:scale-95 transition group-hover:scale-105 border-4 border-white">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-bold text-orange-600 mt-1">
                  Presensi
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer relative ${
                isActive ? 'text-orange-600 font-extrabold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold mt-1 tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
