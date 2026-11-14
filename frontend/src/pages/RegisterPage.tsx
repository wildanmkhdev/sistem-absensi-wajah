import React, { useState } from 'react';
import { CameraCapture } from '../components/CameraCapture';
import { registerStudent } from '../api';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

interface RegisterPageProps {
  onRegisteredSuccess: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisteredSuccess }) => {
  const [nim, setNim] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nim.trim() || !name.trim()) {
      setStatusMessage({ type: 'error', text: 'NIM dan Nama Mahasiswa wajib diisi.' });
      return;
    }

    if (!capturedImage) {
      setStatusMessage({
        type: 'error',
        text: 'Silakan ambil foto swafoto wajah mahasiswa terlebih dahulu.',
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await registerStudent(nim.trim(), name.trim(), capturedImage);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Mahasiswa ${name} (${nim}) berhasil didaftarkan ke sistem!`,
        });
        setNim('');
        setName('');
        setCapturedImage(null);
        setTimeout(() => {
          onRegisteredSuccess();
        }, 1200);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'Gagal mendaftarkan mahasiswa.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan pendaftaran.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Title */}
      <div className="text-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          Pendaftaran Mahasiswa
        </span>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Daftarkan Wajah Baru
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Foto wajah ini akan menjadi data referensi resmi untuk verifikasi presensi.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        {/* Form Inputs */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor Induk Mahasiswa (NIM)
              </label>
              <input
                type="text"
                required
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                placeholder="Contoh: 2024007"
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Muhammad Wildan"
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Camera Capture */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Foto Wajah Referensi
            </label>
            <CameraCapture
              onCapture={(img) => setCapturedImage(img)}
              capturedImage={capturedImage}
              onClearCapture={() => setCapturedImage(null)}
              disabled={isSubmitting}
            />
          </div>

          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`flex items-center space-x-2 text-xs p-3.5 rounded-2xl border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-2xl font-bold text-xs shadow-md transition cursor-pointer ${
              isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 active:scale-[0.99]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Mengekstrak Vektor Wajah...' : 'Simpan & Daftarkan Wajah'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
