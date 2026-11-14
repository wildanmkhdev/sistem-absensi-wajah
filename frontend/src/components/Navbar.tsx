import React from 'react';
import { Camera, ShieldCheck, Award, UserPlus, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingOversightCount: number;
  onOpenUuInfo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingOversightCount,
  onOpenUuInfo,
}) => {
  const navItems = [
    { id: 'presensi', label: 'Presensi Wajah', icon: Camera },
    { id: 'register', label: 'Daftar Wajah', icon: UserPlus },
    {
      id: 'oversight',
      label: 'Review Dosen',
      icon: ShieldCheck,
      badge: pendingOversightCount > 0 ? pendingOversightCount : null,
    },
    { id: 'benchmark', label: 'Kasus M1-M6', icon: Award },
  ];

  return (
    <header className="bg-white/95 border-b border-slate-200/80 sticky top-0 z-40 backdrop-blur-md shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Title */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setActiveTab('presensi')}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-400 p-0.5 shadow-sm shadow-indigo-100 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Camera className="w-5 h-5 text-indigo-600 group-hover:scale-105 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-extrabold tracking-tight text-slate-800">
                  Presensi<span className="text-indigo-600">Ku</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  Face AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Sistem Presensi Kuliah Cerdas & Human Oversight (UU PDP)
              </p>
            </div>
          </div>

          {/* Right Side Action / Info */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenUuInfo}
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-slate-200/60 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Panduan UU PDP</span>
            </button>
          </div>
        </div>

        {/* Streamlined Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none border-t border-slate-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-extrabold rounded-full bg-amber-400 text-amber-950">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
