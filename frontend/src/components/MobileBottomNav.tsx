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
    { id: 'camera_action', label: 'Presensi', icon: Camera, isCenterShutter: true },
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
    <div className="bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 py-1.5 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isCenterShutter) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab('presensi');
                  // Smoothly scroll to camera section
                  const el = document.getElementById('camera-capture-viewport');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="relative -top-4 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div className="w-13 h-13 rounded-full bg-teal-600 text-white shadow-md shadow-teal-600/30 flex items-center justify-center transform active:scale-95 transition border-3 border-white">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-bold text-teal-700 mt-0.5">
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
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer relative ${
                isActive ? 'text-teal-700 font-extrabold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-teal-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
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
