import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
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
    // Periodic refresh every 30s
    const timer = setInterval(refreshOversightCount, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateCase = (caseId: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6') => {
    setActiveTab('presensi');
    // Allow React state cycle to settle before updating child
    setTimeout(() => {
      const event = new CustomEvent('SELECT_SIMULATION_CASE', { detail: caseId });
      window.dispatchEvent(event);
    }, 50);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingOversightCount={pendingOversightCount}
        onOpenUuInfo={() => setIsUuInfoOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-slate-700">
              Kelompok 6 — Modul 13: Etika AI &amp; UU PDP
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400">Sistem Presensi Wajah Berkeadilan</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-slate-500">
            <button
              onClick={() => setIsUuInfoOpen(true)}
              className="hover:text-indigo-600 transition cursor-pointer font-medium"
            >
              Pasal 34 UU No. 27/2022
            </button>
            <span>•</span>
            <span className="text-emerald-600 font-semibold">Human-in-the-Loop Active</span>
          </div>
        </div>
      </footer>

      {/* Legal & Ethical Explainer Modal */}
      {isUuInfoOpen && <UuPdpExplainer onClose={() => setIsUuInfoOpen(false)} />}
    </div>
  );
};

export default App;
