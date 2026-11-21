import React, { useState } from 'react';
import { Camera, Loader2, LockKeyhole, LogIn, User } from 'lucide-react';
import { login } from '../api';
import type { Session } from '../auth';

interface LoginPageProps {
  onLogin: (session: Session) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = username.trim() !== '' && password !== '' && !isSubmitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

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

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 transition';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center px-4 py-10 font-sans selection:bg-teal-100 selection:text-teal-900">
      <div className="w-full max-w-md mx-auto space-y-5">
        <div className="flex items-center justify-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-800">
            Presen<span className="text-teal-600">SI</span>
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-4">
          <div className="space-y-1">
            <h1 className="text-sm font-extrabold text-slate-800">Masuk ke PresenSI</h1>
            <p className="text-xs text-slate-500">
              Gunakan akun dosen atau mahasiswa yang terdaftar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
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
                  placeholder="NIM atau username dosen"
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

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-200/70 bg-rose-50 px-2.5 py-2 text-[11px] font-medium text-rose-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-xs transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
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
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          UU PDP No. 27/2022 • Data biometrik hanya dipakai untuk presensi.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;