import React, { useEffect, useState } from 'react';
import {
  FileCheck2,
  Loader2,
  LockKeyhole,
  LogIn,
  Moon,
  Sun,
  User,
  UserPlus,
} from 'lucide-react';
import { login, registerAccount } from '../api';
import { CameraCapture } from '../components/CameraCapture';
import type { Session } from '../auth';
import { PresenSILogo } from '../components/icons/PresenSILogo';

interface LoginPageProps {
  onLogin: (session: Session) => void;
  initialMode?: 'login' | 'register';
}

const readTheme = (): 'light' | 'dark' =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
    ? 'dark'
    : 'light';

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const sync = () => setTheme(readTheme());
    window.addEventListener('presensi:theme', sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      window.removeEventListener('presensi:theme', sync);
      observer.disconnect();
    };
  }, []);

  const handleToggleTheme = () => {
    const next = (window as unknown as { togglePresensiTheme?: () => 'light' | 'dark' })
      .togglePresensiTheme?.();
    setTheme(next ?? readTheme());
  };

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regNim, setRegNim] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFaceImage, setRegFaceImage] = useState<string | null>(null);
  const [regConsent, setRegConsent] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmitLogin = username.trim() !== '' && password !== '' && !isSubmitting;
  const canSubmitRegister =
    regName.trim() !== '' &&
    regNim.trim() !== '' &&
    regUsername.trim() !== '' &&
    regPassword.length >= 4 &&
    regFaceImage !== null &&
    regConsent &&
    !isSubmitting;

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitLogin) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const session = await login(username.trim(), password);
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitRegister) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const session = await registerAccount({
        username: regUsername.trim(),
        password: regPassword,
        nim: regNim.trim(),
        name: regName.trim(),
        faceImageBase64: regFaceImage,
        consent: regConsent,
      });
      setSuccessMsg('Pendaftaran akun dan wajah berhasil. Memasuki sistem...');
      setTimeout(() => {
        onLogin(session);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mendaftar akun dan wajah.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col items-center justify-center px-4 py-10 relative selection:bg-[var(--yellow)] selection:text-[var(--on-yellow)]">
      {/* Top-Right Theme Toggle */}
      <div className="fixed top-4 right-4 z-30">
        <button
          type="button"
          onClick={handleToggleTheme}
          aria-label={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
          title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          className="hlb-theme-btn"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Editorial Hero Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 flex items-center justify-center">
            <PresenSILogo className="w-16 h-16" label="Logo PresenSI" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              <h1 className="font-display text-4xl sm:text-[42px] leading-none text-[var(--ink)]">
                PresenSI <mark className="hlb-mark">Akademik</mark>
              </h1>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="hlb-tag paper shadow-[2px_2px_0_var(--shadow)]">
                UU PDP 27/2022
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--soft)]">
                Biometrik Wajah &amp; Human Oversight
              </span>
            </div>
          </div>
        </div>

        {/* Main Neo-Brutalist Paper Panel */}
        <div className="hlb-panel p-5 sm:p-6 space-y-5">
          {/* Segmented Mode Switcher (.hlb-switch) */}
          <div className="hlb-switch w-full grid grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`hlb-switch-item w-full ${mode === 'login' ? 'on' : ''}`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`hlb-switch-item w-full ${mode === 'register' ? 'on' : ''}`}
            >
              Daftar Mahasiswa
            </button>
          </div>

          {error && (
            <div className="hlb-alert danger text-xs sm:text-sm font-medium leading-snug">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="hlb-alert success text-xs sm:text-sm font-medium leading-snug">
              {successMsg}
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)] block">
                  Username atau NIM
                </span>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--soft)] pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: ahmad / 2024001 / dosen"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="hlb-input pl-10 pr-3.5 py-2.5"
                  />
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)] block">
                  Kata Sandi
                </span>
                <div className="relative">
                  <LockKeyhole className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--soft)] pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="hlb-input pl-10 pr-3.5 py-2.5"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={!canSubmitLogin}
                className="hlb-btn-primary w-full h-11 uppercase tracking-wider"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke Akun</span>
                  </>
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-mono text-xs text-[var(--soft)] hover:text-[var(--ink)] underline underline-offset-4 cursor-pointer"
                >
                  Belum punya akun? Daftar sebagai mahasiswa baru
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <label className="block space-y-1">
                  <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[var(--soft)] block">
                    Nama Lengkap
                  </span>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nama mahasiswa"
                    className="hlb-input px-3 py-2"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[var(--soft)] block">
                    NIM
                  </span>
                  <input
                    type="text"
                    required
                    value={regNim}
                    onChange={(e) => setRegNim(e.target.value)}
                    placeholder="Contoh: 2024007"
                    className="hlb-input px-3 py-2 font-mono"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[var(--soft)] block">
                    Username
                  </span>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Username akun"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="hlb-input px-3 py-2"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[var(--soft)] block">
                    Password (min. 4 char)
                  </span>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="hlb-input px-3 py-2"
                  />
                </label>
              </div>

              {/* Camera Capture for Initial Face */}
              <div className="space-y-1.5 pt-1">
                <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[var(--soft)] block">
                  Foto Wajah Awal (Perekaman Landmark Biometrik)
                </span>
                <CameraCapture
                  onCapture={(img) => setRegFaceImage(img)}
                  capturedImage={regFaceImage}
                  onClearCapture={() => setRegFaceImage(null)}
                  disabled={isSubmitting}
                />
              </div>

              {/* UU PDP Consent Gate */}
              <div className="hlb-alert info space-y-2">
                <div className="flex items-center gap-2 text-[var(--ink)]">
                  <FileCheck2 className="w-4 h-4 shrink-0" />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wide">
                    Persetujuan Biometrik UU PDP No. 27/2022
                  </span>
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={regConsent}
                    onChange={(e) => setRegConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[var(--ink)] cursor-pointer shrink-0"
                  />
                  <span className="leading-snug">
                    Saya menyetujui pemrosesan data biometrik wajah (ekstraksi vektor 512-D ArcFace)
                    khusus untuk absensi perkuliahan, dan memahami hak atas penghapusan atau
                    pembaruan data (Pasal 8).
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!canSubmitRegister}
                className="hlb-btn-primary w-full h-11 uppercase tracking-wider"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengekstrak Wajah &amp; Membuat Akun...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Daftar Akun &amp; Wajah</span>
                  </>
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-mono text-xs text-[var(--soft)] hover:text-[var(--ink)] underline underline-offset-4 cursor-pointer"
                >
                  Sudah punya akun? Masuk di sini
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center font-mono text-[11px] text-[var(--soft)]">
          UU PDP No. 27/2022 · Enkripsi representasi matematis vektor hypersphere.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
