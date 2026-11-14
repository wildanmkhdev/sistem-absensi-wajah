import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MobileFrame } from './components/MobileFrame';
import { PresensiPage } from './pages/PresensiPage';
import { OversightPage } from './pages/OversightPage';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { HistoryPage } from './pages/HistoryPage';
import { RegisterPage } from './pages/RegisterPage';
import { UuPdpExplainer } from './components/UuPdpExplainer';
import { fetchOversightAttendances } from './api';
import { ShieldCheck } from 'lucide-react';
export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('presensi');
  const [pendingOversightCount, setPendingOversightCount] = useState<number>(0);
  const [isUuInfoOpen, setIsUuInfoOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const refreshOversightCount = async () => {
    try {
      const pending = await fetchOversightAttendances();
      setPendingOversightCount(pending.length);
    } catch (e) {
      console.warn('Could not update pending oversight count', e);
    }
  };

  useEffect(() => {
    refreshOversightCount();
    const timer = setInterval(refreshOversightCount, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateCase = (caseId: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6') => {
    setActiveTab('presensi');
    setTimeout(() => {
      console.log('Simulating case', caseId);
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingOversightCount={pendingOversightCount}
        onOpenUuInfo={() => setIsUuInfoOpen(true)}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Main Content Area Wrapped in Dual Version Mobile / Desktop Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col justify-center">
        <MobileFrame
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingOversightCount={pendingOversightCount}
          isMockupMode={viewMode === 'mobile'}
        >
          {activeTab === 'presensi' && (
            <PresensiPage
              onGoToOversight={() => setActiveTab('oversight')}
              onPresensiSuccess={refreshOversightCount}
              isMobileLayout={viewMode === 'mobile'}
            />
          )}

          {activeTab === 'oversight' && (
            <OversightPage onOversightUpdated={refreshOversightCount} />
          )}

          {activeTab === 'benchmark' && (
            <BenchmarkPage onSimulateInPresensi={handleSimulateCase} />
          )}

          {activeTab === 'history' && <HistoryPage />}

          {activeTab === 'register' && (
            <RegisterPage
              onRegisteredSuccess={() => {
                setActiveTab('presensi');
                refreshOversightCount();
              }}
            />
          )}
        </MobileFrame>
      </main>

      {/* Footer (Hidden if inside mockup frame to keep mobile screen pristine) */}
      {viewMode === 'desktop' && (
        <footer className="bg-white border-t border-slate-100 py-6 text-xs text-slate-500 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-700">
                Sistem Presensi Kuliah Cerdas AI &amp; Human Oversight
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400">UU PDP No. 27/2022 Pasal 34 &amp; 35</span>
            </div>

            <div className="flex items-center space-x-4 text-slate-400">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Neon PostgreSQL Online</span>
              </span>
              <span>Kelompok 6 — Informatika</span>
            </div>
          </div>
        </footer>
      )}

      {/* Legal & Ethical Explainer Modal */}
      {isUuInfoOpen && <UuPdpExplainer onClose={() => setIsUuInfoOpen(false)} />}
    </div>
  );
};

export default App;
