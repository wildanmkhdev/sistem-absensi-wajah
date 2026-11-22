import React from 'react';
import { Award, BookOpen, Camera, History, LogOut, ShieldCheck, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '../auth';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | null;
}

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingOversightCount: number;
  role: Role;
  sessionName: string;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingOversightCount,
  role,
  sessionName,
  onLogout,
}) => {
  const isDosen = role === 'dosen';

  const navItems: NavItem[] = isDosen
    ? [
        { id: 'sessions', label: 'Sesi Kuliah', icon: BookOpen },
        {
          id: 'oversight',
          label: 'Review Dosen',
          icon: ShieldCheck,
          badge: pendingOversightCount > 0 ? pendingOversightCount : null,
        },
        { id: 'history', label: 'Riwayat Kelas', icon: History },
        { id: 'benchmark', label: 'Kasus M1–M6', icon: Award },
      ]
    : [
        { id: 'presensi', label: 'Presensi', icon: Camera },
        { id: 'history', label: 'Riwayat Saya', icon: History },
        { id: 'register', label: 'Data Wajah', icon: UserPlus },
      ];

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & App Title */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => setActiveTab(isDosen ? 'sessions' : 'presensi')}
          >
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-800">
              Presen<span className="text-teal-600">SI</span>
            </span>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden sm:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 border border-teal-200/70'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black rounded-full bg-teal-600 text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Session Cluster: role chip + name + logout */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60 whitespace-nowrap">
              {isDosen ? 'Dosen' : 'Mahasiswa'}
            </span>
            <span
              className="max-w-[120px] truncate text-xs font-bold text-slate-700"
              title={sessionName}
            >
              {sessionName}
            </span>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Keluar / Ganti Akun"
              title="Keluar / Ganti Akun"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
