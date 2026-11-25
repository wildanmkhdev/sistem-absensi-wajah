import React from 'react';
import { Award, BookOpen, Camera, History, ShieldCheck, UserCheck, UserCircle } from 'lucide-react';
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
          { id: 'sessions', label: 'Sesi', icon: BookOpen },
          {
            id: 'oversight',
            label: 'Review',
            icon: ShieldCheck,
            badge: pendingOversightCount > 0 ? pendingOversightCount : null,
          },
          { id: 'history', label: 'Riwayat', icon: History },
          { id: 'benchmark', label: 'M1–M6', icon: Award },
          { id: 'profile', label: 'Akun', icon: UserCircle },
        ]
      : [
          { id: 'presensi', label: 'Presensi', icon: Camera },
          { id: 'history', label: 'Riwayat', icon: History },
          { id: 'register', label: 'Wajah', icon: UserCheck },
          { id: 'profile', label: 'Akun', icon: UserCircle },
        ];

  return (
    <div className="bg-[var(--surface)] border-t-2 border-[var(--edge)] px-2 py-2 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-2.5 rounded-full transition-transform cursor-pointer relative min-w-[56px] ${
                isActive
                  ? 'bg-[var(--yellow)] text-[var(--on-yellow)] border-2 border-[var(--on-yellow)] shadow-[2px_2px_0_var(--shadow)] font-semibold -translate-y-0.5'
                  : 'text-[var(--soft)] hover:text-[var(--ink)] border-2 border-transparent'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[var(--on-yellow)] stroke-[2.3px]' : 'text-[var(--soft)]'
                  }`}
                />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[var(--red)] text-white border border-[var(--edge)] text-[9px] font-mono font-semibold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={`font-mono uppercase text-[9.5px] mt-0.5 tracking-wide leading-none ${
                  isActive ? 'text-[var(--on-yellow)] font-semibold' : 'text-[var(--soft)]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
