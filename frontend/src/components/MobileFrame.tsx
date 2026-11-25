import React from 'react';
import { MobileBottomNav } from './MobileBottomNav';
import type { Role } from '../auth';

interface MobileFrameProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingOversightCount: number;
  role: Role;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  activeTab,
  setActiveTab,
  pendingOversightCount,
  role,
}) => {
  return (
    <div className="w-full flex flex-col min-h-screen text-[var(--ink)]">
      {/* Main Content Area */}
      <div className="flex-1 w-full pb-24 sm:pb-8">{children}</div>

      {/* Fixed Bottom Navigation Bar on Mobile Screens (< 640px) */}
      <div className="fixed bottom-0 inset-x-0 z-50 sm:hidden">
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingOversightCount={pendingOversightCount}
          role={role}
        />
      </div>
    </div>
  );
};
