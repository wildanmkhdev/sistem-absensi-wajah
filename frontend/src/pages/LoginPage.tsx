import React, { useEffect, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  FileCheck2,
  Loader2,
  LockKeyhole,
  LogIn,
  User,
  UserPlus,
} from 'lucide-react';
import { login, registerAccount } from '../api';
import { CameraCapture } from '../components/CameraCapture';
import type { Session } from '../auth';

interface LoginPageProps {
  onLogin: (session: Session) => void;
  initialMode?: 'login' | 'register';
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

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
      setSuccessMsg('Pendaftaran akun dan wajah berhasil! Masuk ke sistem...');
      setTimeout(() => {
        onLogin(session);
      }, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mendaftar akun dan wajah.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 transition';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center px-4 py-8 font-sans selection:bg-teal-100 selection:text-teal-900">
      <div className="w-full max-w-lg mx-auto space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-800">
            Presen<span className="text-teal-600">SI</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-4">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-teal-800 shadow-xs font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-teal-800 shadow-xs font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              Daftar Akun Baru
            </button>
          </div>

          {/* Heading */}
          <div className="space-y-0.5">
            <h1 className="text-sm font-extrabold text-slate-800">
              {mode === 'login' ? 'Masuk ke PresenSI' : 'Registrasi Akun Mahasiswa Baru'}
            </h1>
            <p className="text-xs text-slate-500">
              {mode === 'login'
                ? 'Gunakan akun dosen atau mahasiswa yang terdaftar.'
                : 'Daftarkan identitas mahasiswa dan rekam wajah pertama kali untuk presensi biometrik.'}
            </p>
          </div>

          {/* Error & Success Alerts */}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200/70 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 leading-relaxed"
            >
              {error}
            </p>
          )}

          {successMsg && (
            <div className="flex items-center space-x-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Username
                </span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Username atau NIM"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    className={inputClass}
                  />
                </div>
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Password
                </span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={inputClass}
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={!canSubmitLogin}
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-xs transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memeriksa…</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="text-xs text-teal-700 hover:text-teal-800 font-semibold cursor-pointer"
                >
                  Belum punya akun? Daftar akun &amp; wajah di sini
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Nama Lengkap
                  </span>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 transition"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    NIM (Nomor Induk Mahasiswa)
                  </span>
                  <input
                    type="text"
                    required
                    value={regNim}
                    onChange={(e) => setRegNim(e.target.value)}
                    placeholder="Contoh: 2024007"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 transition"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Username Akun
                  </span>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Contoh: ahmad"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 transition"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Password (min. 4 karakter)
                  </span>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 transition"
                  />
                </label>
              </div>

              {/* Camera Capture for Initial Face */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700 block">
                  Foto Wajah Pertama Kali (Referensi Biometrik)
                </span>
                <CameraCapture
                  onCapture={(img) => setRegFaceImage(img)}
                  capturedImage={regFaceImage}
                  onClearCapture={() => setRegFaceImage(null)}
                  disabled={isSubmitting}
                />
              </div>

              {/* UU PDP Consent Gate */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center space-x-2 text-teal-800">
                  <FileCheck2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Persetujuan Biometrik UU PDP No. 27/2022
                  </span>
                </div>
                <label className="flex items-start space-x-2 cursor-pointer text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={regConsent}
                    onChange={(e) => setRegConsent(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <span className="leading-snug">
                    Saya menyetujui pemrosesan data biometrik wajah (ekstraksi vektor 512-D ArcFace) khusus untuk absensi perkuliahan, dan memahami hak saya atas penghapusan atau pembaruan data kapan saja (Pasal 8).
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!canSubmitRegister}
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-xs transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengekstrak Wajah &amp; Membuat Akun…</span>
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
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                >
                  Sudah punya akun? Masuk di sini
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400">
          UU PDP No. 27/2022 • Data biometrik dilindungi enkripsi representasi matematis.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
