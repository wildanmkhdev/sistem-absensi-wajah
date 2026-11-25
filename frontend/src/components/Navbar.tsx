import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Camera,
  History,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  UserCheck,
  UserCircle,
  X,
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Close mobile sidebar on Escape key and lock background scroll while open
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

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

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setDrawerOpen(false);
  };

  return (
    <>
      <header className="hlb-topbar">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6">
          <div className="flex items-center justify-between gap-3 h-16">
            {/* Left: Mobile Sidebar Trigger + Brand Identity */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Buka menu navigasi"
                aria-expanded={drawerOpen}
                aria-controls="mobile-sidebar-drawer"
                className="md:hidden w-10 h-10 rounded-xl bg-[var(--surface)] text-[var(--ink)] border-2 border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)] flex items-center justify-center relative active:translate-x-[1px] active:translate-y-[1px] transition-transform cursor-pointer"
              >
                <Menu className="w-5 h-5" />
                {isDosen && pendingOversightCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 text-[9.5px] leading-none font-mono font-semibold rounded-full bg-[var(--red)] text-white border-[1.5px] border-[var(--edge)] flex items-center justify-center">
                    {pendingOversightCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab(isDosen ? 'sessions' : 'presensi')}
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
            </div>

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
                className={`${
                  activeTab === 'profile' ? 'hlb-chip-on' : 'hlb-chip'
                } !py-1.5 !px-2.5 hidden sm:inline-flex`}
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
                className="hidden sm:inline-flex hlb-btn-danger px-2.5 py-1.5 !text-[11.5px] !rounded-full"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wide">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Sidebar Drawer (< md) */}
      {drawerOpen && (
        <div
          id="mobile-sidebar-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menu Navigasi Mobile"
          className="fixed inset-0 z-50 md:hidden flex"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Sidebar Panel */}
          <aside className="relative z-10 w-72 max-w-[82vw] h-full bg-[var(--surface)] text-[var(--ink)] border-r-2 border-[var(--edge)] shadow-[6px_0_0_var(--shadow)] flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b-2 border-[var(--edge)] bg-[var(--bg)]">
              <div className="flex items-center gap-2.5">
                <PresenSILogo className="w-9 h-9 shrink-0" />
                <div className="leading-none">
                  <span className="font-display text-xl text-[var(--ink)] block leading-none">
                    PresenSI
                  </span>
                  <span className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--soft)] block mt-0.5">
                    UINSU • UU PDP 27/2022
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu navigasi"
                className="w-9 h-9 rounded-xl bg-[var(--surface)] text-[var(--ink)] border-2 border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Session Identity Strip */}
            <div className="px-4 pt-4 pb-2">
              <div className="rounded-xl bg-[var(--paper)] border-2 border-[var(--edge)] shadow-[3px_3px_0_var(--shadow)] px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--green)] border border-[var(--edge)] shrink-0" />
                  <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--soft)]">
                    {isDosen ? 'Mode Dosen' : 'Mode Mahasiswa'}
                  </span>
                </div>
                <p className="font-semibold text-sm text-[var(--ink)] truncate mt-1" title={sessionName}>
                  {sessionName}
                </p>
              </div>
            </div>

            {/* Vertical Navigation Links */}
            <nav aria-label="Daftar Halaman" className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--yellow)] text-[var(--on-yellow)] border-2 border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)] font-semibold'
                        : 'bg-transparent text-[var(--ink)] border-2 border-transparent hover:bg-[var(--hover)] hover:border-[var(--line)] font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== null && item.badge !== undefined && (
                      <span className="px-2 py-0.5 text-[10px] leading-none font-mono font-semibold rounded-full bg-[var(--red)] text-white border border-[var(--edge)]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t-2 border-[var(--edge)] bg-[var(--bg)] space-y-2.5">
              <button
                type="button"
                onClick={handleToggleTheme}
                className="w-full min-h-[42px] hlb-btn-secondary justify-between px-3.5 py-2"
              >
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}</span>
                </span>
                <span className="font-mono text-[10px] uppercase text-[var(--soft)]">
                  {theme === 'dark' ? 'DARK' : 'LIGHT'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onLogout();
                }}
                className="w-full min-h-[42px] hlb-btn-danger justify-center px-3.5 py-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar / Ganti Akun</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
