import React from 'react';
import { Camera, ShieldCheck, Award, UserPlus, Sparkles, Smartphone, Monitor, History } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingOversightCount: number;
  onOpenUuInfo: () => void;
  viewMode: 'desktop' | 'mobile';
  setViewMode: (mode: 'desktop' | 'mobile') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingOversightCount,
  onOpenUuInfo,
  viewMode,
  setViewMode,
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
    { id: 'history', label: 'Riwayat Log', icon: History },
  ];

  return (
    <header className="bg-white/95 border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & App Title */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setActiveTab('presensi')}
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-600 p-0.5 shadow-md shadow-orange-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Camera className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg sm:text-xl font-black tracking-tight text-slate-800">
                  Presen<span className="text-orange-500">SI</span>
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                  Face AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
                Presensi Wajah Cerdas &amp; Human Oversight (UU PDP No. 27/2022)
              </p>
            </div>
          </div>

          {/* Center / Right: Desktop & Mobile Viewport Toggle + Guide */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* View Mode Toggle Switch (Dual Version Mobile & Web) */}
            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('desktop')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'desktop'
                    ? 'bg-white text-orange-600 shadow-xs border border-orange-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilkan Layout Dashboard Web Lebar"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Web Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('mobile')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'mobile'
                    ? 'bg-white text-orange-600 shadow-xs border border-orange-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilkan Mockup Aplikasi Smartphone"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile App</span>
              </button>
            </div>

            {/* UU PDP Explainer Button */}
            <button
              onClick={onOpenUuInfo}
              className="text-xs font-bold text-slate-700 hover:text-orange-600 bg-slate-50 hover:bg-orange-50/50 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              <span className="hidden sm:inline">Etika &amp; UU PDP</span>
              <span className="sm:hidden">UU PDP</span>
            </button>
          </div>
        </div>

        {/* Desktop Nav Tabs (Hidden if mobile preview or mobile screen) */}
        {viewMode === 'desktop' && (
          <nav className="hidden sm:flex space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-slate-100 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-orange-50 text-orange-600 shadow-xs border border-orange-200/80'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-orange-500 text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};
