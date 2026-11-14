import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MobileFrame } from './components/MobileFrame';
import { PresensiPage } from './pages/PresensiPage';
import { OversightPage } from './pages/OversightPage';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { HistoryPage } from './pages/HistoryPage';
import { RegisterPage } from './pages/RegisterPage';
import { fetchOversightAttendances } from './api';
import { ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('presensi');
  const [pendingOversightCount, setPendingOversightCount] = useState<number>(0);

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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingOversightCount={pendingOversightCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-3.5 sm:py-6">
        <MobileFrame
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingOversightCount={pendingOversightCount}
        >
          {activeTab === 'presensi' && (
            <PresensiPage
              onGoToOversight={() => setActiveTab('oversight')}
              onPresensiSuccess={refreshOversightCount}
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

      {/* Clean Desktop Footer */}
      <footer className="hidden sm:block bg-white border-t border-slate-200/80 py-5 text-xs text-slate-500 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-700">
              Presensi Wajah Cerdas &amp; Human Oversight
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">Modul 13 Kelompok 6</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>Neon PostgreSQL Terhubung</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
