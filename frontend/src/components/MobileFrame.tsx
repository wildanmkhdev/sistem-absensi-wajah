import React, { useState, useEffect } from 'react';
import { MobileStatusBar } from './MobileStatusBar';
import { MobileBottomNav } from './MobileBottomNav';

interface MobileFrameProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingOversightCount: number;
  isMockupMode: boolean;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  activeTab,
  setActiveTab,
  pendingOversightCount,
  isMockupMode,
}) => {
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On real mobile devices (< 768px), or when mockup mode is turned off:
  // Render clean full-screen mobile/desktop web without mock hardware chassis
  if (!isMockupMode || !isLargeScreen) {
    return (
      <div className="w-full flex flex-col min-h-screen">
        <div className="flex-1 w-full pb-20 sm:pb-6">{children}</div>
        {/* On mobile screens, always show fixed bottom navigation bar */}
        <div className="fixed bottom-0 inset-x-0 z-50 sm:hidden">
          <MobileBottomNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            pendingOversightCount={pendingOversightCount}
          />
        </div>
      </div>
    );
  }

  // Realistic Smartphone Device Mockup Container (Shown on Desktop when "Mobile App" is active)
  return (
    <div className="w-full py-4 flex flex-col items-center justify-center animate-fade-in">
      {/* Decorative Device Label */}
      <div className="mb-3 text-center">
        <span className="text-xs font-black text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
          📱 Mode Simulasi Smartphone (iPhone 16 Pro Viewport)
        </span>
        <p className="text-[11px] text-slate-400 font-medium mt-1">
          Tampilan presisi 1:1 identik dengan desain referensi Dribbble
        </p>
      </div>

      {/* Phone Hardware Mockup Chassis */}
      <div className="relative w-full max-w-[400px] h-[780px] bg-slate-900 rounded-[50px] p-2.5 shadow-[0_25px_70px_rgba(249,115,22,0.22)] border-[7px] border-slate-800 flex flex-col overflow-hidden ring-1 ring-slate-700/80">
        {/* Dynamic Island / Status Bar Top */}
        <div className="bg-white rounded-t-[40px] pt-1">
          <MobileStatusBar />
        </div>

        {/* Scrollable Screen Body (Simulating Mobile OS) */}
        <div className="flex-1 bg-[#F8FAFC] overflow-y-auto overflow-x-hidden no-scrollbar px-3 pt-2 pb-6">
          {children}
        </div>

        {/* Fixed Mobile Bottom Navigation Bar */}
        <div className="bg-white rounded-b-[40px] overflow-hidden border-t border-slate-100">
          <MobileBottomNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            pendingOversightCount={pendingOversightCount}
          />
          {/* Home Indicator Bar */}
          <div className="w-full bg-white pb-2 flex justify-center">
            <div className="w-28 h-1 bg-slate-300 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
