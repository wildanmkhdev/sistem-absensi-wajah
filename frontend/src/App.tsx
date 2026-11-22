import React, { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { MobileFrame } from './components/MobileFrame';
import { LoginPage } from './pages/LoginPage';
import { PresensiPage } from './pages/PresensiPage';
import { OversightPage } from './pages/OversightPage';
import { BenchmarkPage } from './pages/BenchmarkPage';
import { HistoryPage } from './pages/HistoryPage';
import { RegisterPage } from './pages/RegisterPage';
import { SessionsPage } from './pages/SessionsPage';
import { fetchMe, fetchOversightAttendances, setAuthToken } from './api';
import { clearSession, readSession, writeSession } from './auth';
import type { Role, Session } from './auth';

const ALLOWED_TABS: Record<Role, string[]> = {
  mahasiswa: ['presensi', 'history', 'register'],
  dosen: ['sessions', 'oversight', 'history', 'benchmark'],
};

export const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<string>(() => {
    const stored = readSession();
    return stored ? ALLOWED_TABS[stored.role][0] : 'presensi';
  });
  const [pendingOversightCount, setPendingOversightCount] = useState<number>(0);

  const handleLogout = useCallback(() => {
    clearSession();
    setAuthToken(null);
    setSession(null);
    setAuthMode('login');
    setActiveTab('presensi');
  }, []);

  const handleOpenRegister = useCallback(() => {
    clearSession();
    setAuthToken(null);
    setSession(null);
    setAuthMode('register');
    setActiveTab('presensi');
  }, []);

  // Pasang token tersimpan sekali di awal agar request pertama sudah terautentikasi.
  useEffect(() => {
    const stored = readSession();
    if (stored) setAuthToken(stored.token);
  }, []);

  // Validasi sesi ke server: token kedaluwarsa/dicabut langsung memaksa logout.
  useEffect(() => {
    if (!session) return;
    let active = true;

    setAuthToken(session.token);
    fetchMe()
      .then((user) => {
        if (!active) return;
        const refreshed: Session = {
          role: user.role,
          nim: user.nim ?? '',
          name: user.name,
          username: user.username,
          token: session.token,
        };
        writeSession(refreshed);
        setSession(refreshed);
      })
      .catch(() => {
        if (active) handleLogout();
      });

    return () => {
      active = false;
    };
  }, [session?.token, handleLogout]);

  // Setiap respons 401 dari API memicu event ini.
  useEffect(() => {
    const onUnauthorized = () => handleLogout();
    window.addEventListener('presensi:unauthorized', onUnauthorized);
    return () => window.removeEventListener('presensi:unauthorized', onUnauthorized);
  }, [handleLogout]);

  const refreshOversightCount = useCallback(async () => {
    try {
      const pending = await fetchOversightAttendances();
      setPendingOversightCount(pending.length);
    } catch (e) {
      console.warn('Could not update pending oversight count', e);
    }
  }, []);

  // Hanya dosen yang perlu antrean review; mahasiswa tidak menyentuh endpoint ini.
  useEffect(() => {
    if (session?.role !== 'dosen') {
      setPendingOversightCount(0);
      return;
    }

    void refreshOversightCount();
    const timer = setInterval(() => void refreshOversightCount(), 30000);
    return () => clearInterval(timer);
  }, [session?.role, refreshOversightCount]);

  // Jaga agar tab aktif selalu milik role yang sedang login.
  useEffect(() => {
    if (!session) return;
    if (!ALLOWED_TABS[session.role].includes(activeTab)) {
      setActiveTab(ALLOWED_TABS[session.role][0]);
    }
  }, [session, activeTab]);

  const handleLogin = (nextSession: Session) => {
    writeSession(nextSession);
    setAuthToken(nextSession.token);
    setSession(nextSession);
    setActiveTab(nextSession.role === 'dosen' ? 'sessions' : 'presensi');
  };

  if (!session) {
    return <LoginPage onLogin={handleLogin} initialMode={authMode} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingOversightCount={pendingOversightCount}
        role={session.role}
        sessionName={session.name}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-3.5 sm:py-6">
        <MobileFrame
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingOversightCount={pendingOversightCount}
          role={session.role}
        >
          {activeTab === 'presensi' && <PresensiPage student={session} />}

          {activeTab === 'sessions' && <SessionsPage />}

          {activeTab === 'oversight' && (
            <OversightPage
              lecturerName={session.name}
              onOversightUpdated={refreshOversightCount}
            />
          )}

          {activeTab === 'benchmark' && <BenchmarkPage />}

          {activeTab === 'history' && (
            <HistoryPage
              role={session.role}
              nim={session.role === 'mahasiswa' ? session.nim : undefined}
            />
          )}

          {activeTab === 'register' && (
            <RegisterPage
              currentUser={session}
              onRegisteredSuccess={() => setActiveTab('presensi')}
              onOpenRegisterAccount={handleOpenRegister}
            />
          )}
        </MobileFrame>
      </main>

      {/* Clean Desktop Footer */}
      <footer className="hidden sm:block bg-white border-t border-slate-200/80 py-5 text-xs text-slate-500 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <span className="font-bold text-slate-700">
            PresenSI • Sistem Presensi Wajah &amp; Human Oversight
          </span>
          <span className="text-slate-400">UU PDP No. 27/2022</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
