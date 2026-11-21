import React from 'react';
import { Camera, ShieldCheck, Award, History, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '../auth';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | null;
}

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingOversightCount: number;
  role: Role;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  pendingOversightCount,
  role,
}) => {
  const navItems: NavItem[] =
    role === 'dosen'
      ? [
          {
            id: 'oversight',
            label: 'Review',
            icon: ShieldCheck,
            badge: pendingOversightCount > 0 ? pendingOversightCount : null,
          },
          { id: 'history', label: 'Riwayat', icon: History },
          { id: 'benchmark', label: 'Kasus', icon: Award },
        ]
      : [
          { id: 'presensi', label: 'Presensi', icon: Camera },
          { id: 'history', label: 'Riwayat', icon: History },
          { id: 'register', label: 'Daftar', icon: UserPlus },
        ];

  return (
    <div className="bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 py-1.5 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

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
              <span className="text-[10px] font-bold mt-1 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};