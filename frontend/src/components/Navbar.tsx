import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Camera,
  History,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  UserCheck,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '../auth';
import { PresenSILogo } from './icons/PresenSILogo';

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

const readTheme = (): 'light' | 'dark' =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
    ? 'dark'
    : 'light';

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingOversightCount,
  role,
  sessionName,
  onLogout,
}) => {
  const isDosen = role === 'dosen';
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme);

  useEffect(() => {
    const sync = () => setTheme(readTheme());
    window.addEventListener('presensi:theme', sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      window.removeEventListener('presensi:theme', sync);
      observer.disconnect();
    };
  }, []);

  const handleToggleTheme = () => {
    const next = (window as unknown as { togglePresensiTheme?: () => 'light' | 'dark' })
      .togglePresensiTheme?.();
    setTheme(next ?? readTheme());
  };

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
        { id: 'profile', label: 'Akun', icon: UserCircle },
      ]
    : [
        { id: 'presensi', label: 'Presensi', icon: Camera },
        { id: 'history', label: 'Riwayat Saya', icon: History },
        { id: 'register', label: 'Data Wajah', icon: UserCheck },
        { id: 'profile', label: 'Akun', icon: UserCircle },
      ];

  return (
    <header className="hlb-topbar">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6">
        <div className="flex items-center justify-between gap-3 h-16">
          {/* Left: Brand Identity */}
          <button
            type="button"
            onClick={() => setActiveTab(isDosen ? 'sessions' : 'presensi')}
            className="flex items-center gap-2.5 cursor-pointer group select-none text-left shrink-0"
          >
            <PresenSILogo className="w-10 h-10 shrink-0 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
            <div className="leading-none">
              <span className="font-display text-xl sm:text-2xl tracking-tight text-[var(--ink)] block leading-none">
                PresenSI
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)] block mt-0.5">
                Presensi Wajah
              </span>
            </div>
          </button>

          {/* Center: Desktop Segmented Pill Navigation (.hlb-switch) */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden md:inline-flex hlb-switch"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`hlb-switch-item ${isActive ? 'on' : ''}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="ml-0.5 px-1.5 py-0.5 text-[10px] leading-none font-mono font-semibold rounded-full bg-[var(--red)] text-white border border-[var(--edge)]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: User Pill + Theme Toggle + Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              title="Buka Menu Akun & Profil"
              className={activeTab === 'profile' ? 'hlb-chip-on !py-1.5 !px-2.5' : 'hlb-chip !py-1.5 !px-2.5'}
            >
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--green)] border border-[var(--edge)] shrink-0" />
              <span className="uppercase text-[10.5px] opacity-80 hidden lg:inline">{role}</span>
              <span className="opacity-50 hidden lg:inline">·</span>
              <span
                className="max-w-[92px] sm:max-w-[120px] truncate text-[11.5px] font-semibold"
                title={sessionName}
              >
                {sessionName}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
              className="hlb-theme-btn"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Keluar / Ganti Akun"
              title="Keluar / Ganti Akun"
              className="hlb-btn-danger px-2.5 py-1.5 !text-[11.5px] !rounded-full"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline uppercase tracking-wide">Keluar</span>
            </button>
          </div>
        </div>

        {/* Tablet compact nav row (sm..md) so pills stay readable without crowding */}
        <div className="hidden sm:flex md:hidden justify-center pb-2.5">
          <nav aria-label="Navigasi Tablet" className="hlb-switch overflow-x-auto no-scrollbar max-w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`hlb-switch-item !px-2.5 !py-1 !text-[11px] whitespace-nowrap ${
                    isActive ? 'on' : ''
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="ml-0.5 px-1.5 py-0.5 text-[9.5px] leading-none font-mono font-semibold rounded-full bg-[var(--red)] text-white border border-[var(--edge)]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
