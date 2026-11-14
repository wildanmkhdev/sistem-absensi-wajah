import React from 'react';
import { Camera, ShieldCheck, Award, UserPlus, History } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingOversightCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingOversightCount,
}) => {
  const navItems = [
    { id: 'presensi', label: 'Presensi', icon: Camera },
    {
      id: 'oversight',
      label: 'Review Dosen',
      icon: ShieldCheck,
      badge: pendingOversightCount > 0 ? pendingOversightCount : null,
    },
    { id: 'benchmark', label: 'Kasus M1-M6', icon: Award },
    { id: 'history', label: 'Riwayat Log', icon: History },
    { id: 'register', label: 'Daftar Wajah', icon: UserPlus },
  ];

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15 sm:h-16">
          {/* Logo & App Title */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={() => setActiveTab('presensi')}
          >
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Camera className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-800">
                  Presen<span className="text-teal-600">SI</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60">
                  Face AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block font-medium">
                Sistem Presensi Mahasiswa &amp; Human Oversight
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on small mobile screens since mobile has bottom nav) */}
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
                    <span className="ml-1 px-1.5 py-0.2 text-[9px] font-black rounded-full bg-teal-600 text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile Right Badge: Compact Semester Badge */}
          <div className="sm:hidden flex items-center">
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-lg border border-teal-200/60">
              Lab AI Genap
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
