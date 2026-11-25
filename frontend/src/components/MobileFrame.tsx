import React from 'react';
import type { Role } from '../auth';

interface MobileFrameProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingOversightCount: number;
  role: Role;
}

/**
 * Responsive page container. Mobile navigation is now handled via the
 * slide-over sidebar drawer in Navbar (no fixed bottom navigation bar).
 */
export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  return (
    <div className="w-full max-w-full min-w-0 flex flex-col min-h-screen text-[var(--ink)] overflow-x-clip">
      <div className="flex-1 w-full min-w-0 pb-8">{children}</div>
    </div>
  );
};
