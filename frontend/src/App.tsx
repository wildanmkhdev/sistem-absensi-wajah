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
import { ProfilePage } from './pages/ProfilePage';
import { ApiError, fetchMe, fetchOversightAttendances, setAuthToken } from './api';
import { clearSession, readSession, writeSession } from './auth';
import type { Role, Session } from './auth';

const ALLOWED_TABS: Record<Role, string[]> = {
  mahasiswa: ['presensi', 'history', 'register', 'profile'],
  dosen: ['sessions', 'oversight', 'history', 'benchmark', 'profile'],
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
      .catch((err: unknown) => {
        // HANYA logout jika server secara eksplisit mengembalikan 401 Unauthorized.
        // Jangan logout pada gangguan jaringan, server cold start, atau kegagalan sementara.
        if (active && err instanceof ApiError && err.status === 401) {
          handleLogout();
        }
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans selection:bg-[var(--yellow)] selection:text-[var(--on-yellow)]">
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
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-7">
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

          {activeTab === 'profile' && (
            <ProfilePage
              session={session}
              onLogout={handleLogout}
              onNavigateTab={setActiveTab}
            />
          )}
        </MobileFrame>
      </main>

      {/* Editorial Paper & Mono Desktop Colophon Footer */}
      <footer className="hidden sm:block bg-[var(--surface)] border-t-2 border-[var(--edge)] py-4 text-xs text-[var(--soft)] mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-base text-[var(--ink)] leading-none">PresenSI</span>
            <span className="text-[var(--muted)]">•</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--soft)]">
              Sistem Presensi Wajah &amp; Human Oversight
            </span>
          </div>
          <span className="hlb-tag paper">UU PDP No. 27/2022</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
