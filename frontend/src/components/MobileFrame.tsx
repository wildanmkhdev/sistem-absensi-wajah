import React from 'react';
import { MobileBottomNav } from './MobileBottomNav';

interface MobileFrameProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingOversightCount: number;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  activeTab,
  setActiveTab,
  pendingOversightCount,
}) => {
  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Main Content Area */}
      <div className="flex-1 w-full pb-20 sm:pb-8">{children}</div>

      {/* Clean Fixed Bottom Navigation Bar on Mobile Screens (< 640px) */}
      <div className="fixed bottom-0 inset-x-0 z-50 sm:hidden">
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingOversightCount={pendingOversightCount}
        />
      </div>
    </div>
  );
};
