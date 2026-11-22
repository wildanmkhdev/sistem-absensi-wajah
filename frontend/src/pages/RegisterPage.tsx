import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  FileCheck2,
  Lock,
  RefreshCw,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { CameraCapture } from '../components/CameraCapture';
import { deleteBiometric, fetchMyProfile, registerStudent } from '../api';
import type { Session } from '../auth';
import type { Student } from '../types';

interface RegisterPageProps {
  currentUser?: Session | null;
  onRegisteredSuccess: () => void;
  onOpenRegisterAccount?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  currentUser,
  onRegisteredSuccess,
  onOpenRegisterAccount,
}) => {
  const isStudent = currentUser?.role === 'mahasiswa';
  const [nim, setNim] = useState<string>(isStudent ? currentUser?.nim || '' : '');
  const [name, setName] = useState<string>(isStudent ? currentUser?.name || '' : '');
  const [consent, setConsent] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [existingProfile, setExistingProfile] = useState<Student | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const reloadProfile = () => {
    if (isStudent && currentUser?.nim) {
      setNim(currentUser.nim);
      setName(currentUser.name);
      fetchMyProfile()
        .then((p) => setExistingProfile(p))
        .catch(() => setExistingProfile(null));
    }
  };

  useEffect(() => {
    reloadProfile();
  }, [isStudent, currentUser]);

  const hasExistingFace = Boolean(existingProfile?.has_embedding);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveNim = (isStudent ? currentUser?.nim : nim) || nim;
    const effectiveName = (isStudent ? currentUser?.name : name) || name;

    if (!effectiveNim.trim() || !effectiveName.trim()) {
      setStatusMessage({ type: 'error', text: 'NIM dan Nama Mahasiswa wajib diisi.' });
      return;
    }

    if (!consent) {
      setStatusMessage({
        type: 'error',
        text: 'Persetujuan eksplisit pemrosesan data biometrik (UU PDP Pasal 20) wajib dicentang.',
      });
      return;
    }

    if (!capturedImage) {
      setStatusMessage({
        type: 'error',
        text: 'Silakan ambil foto wajah dengan kamera terlebih dahulu.',
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await registerStudent(effectiveNim.trim(), effectiveName.trim(), capturedImage, consent);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message || `Wajah untuk ${effectiveName} (${effectiveNim}) berhasil disimpan!`,
        });
        setCapturedImage(null);
        reloadProfile();
        setTimeout(() => {
          onRegisteredSuccess();
        }, 1500);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'Gagal memproses pendaftaran wajah.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan pendaftaran.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBiometric = async () => {
    const effectiveNim = (isStudent ? currentUser?.nim : nim) || nim;
    if (!effectiveNim.trim()) return;

    const confirm = window.confirm(
      `Apakah Anda yakin ingin menghapus seluruh data biometrik wajah untuk NIM ${effectiveNim}? Tindakan ini sesuai Pasal 8 UU PDP (Hak Penghapusan Data Pribadi).`
    );
    if (!confirm) return;

    setIsDeleting(true);
    setStatusMessage(null);
    try {
      const res = await deleteBiometric(effectiveNim.trim());
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Data biometrik NIM ${effectiveNim} telah dihapus dari basis data sesuai hak penghapusan UU PDP.`,
        });
        setExistingProfile(null);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'Gagal menghapus data biometrik.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus data biometrik.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
          {isStudent ? 'Data Wajah & Tata Kelola Biometrik' : 'Pendaftaran Biometrik Mahasiswa'}
        </h1>
        <p className="text-xs text-slate-500">
          Ekstraksi representasi fitur vektor 512-D ArcFace MobileFaceNet berorientasi privasi UU PDP No. 27/2022.
        </p>
      </div>

      {/* Banner Shortcut ke Form Registrasi Akun Baru */}
      {isStudent && onOpenRegisterAccount && (
        <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5 text-teal-900 font-extrabold text-xs">
              <UserPlus className="w-4 h-4 text-teal-600" />
              <span>Mau Daftarkan Akun Mahasiswa Baru?</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Halaman ini untuk mengelola / ganti wajah akun <strong>{currentUser?.name} ({currentUser?.nim})</strong>. Untuk mendaftarkan akun baru (NIM lain), buka form registrasi.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenRegisterAccount}
            className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Buka Registrasi Akun Baru</span>
          </button>
        </div>
      )}

      {/* Status Biometrik Saat Ini */}
      {isStudent && (
        <div
          className={`rounded-2xl p-4 border shadow-xs transition ${
            hasExistingFace
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  hasExistingFace
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {hasExistingFace ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div>
                <span
                  className={`text-xs font-bold block ${
                    hasExistingFace ? 'text-emerald-950' : 'text-amber-950'
                  }`}
                >
                  {hasExistingFace
                    ? 'Biometrik Wajah Aktif Terdaftar'
                    : 'Wajah Belum Terdaftar'}
                </span>
                <p
                  className={`text-[11px] ${
                    hasExistingFace ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {hasExistingFace
                    ? `Model ${existingProfile?.model_version || 'ArcFace 512-D'} • Anda dapat mengganti/replace wajah kapan saja di bawah.`
                    : 'Ambil foto wajah Anda di bawah untuk mengaktifkan presensi biometrik.'}
                </p>
              </div>
            </div>

            {hasExistingFace && (
              <button
                type="button"
                onClick={handleDeleteBiometric}
                disabled={isDeleting}
                className="text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-100/70 hover:bg-rose-100 px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer transition shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Hapus Biometrik'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {hasExistingFace ? 'Perbarui / Ganti Foto Wajah' : 'Form Pendaftaran Wajah'}
          </h2>
          <p className="text-[11px] text-slate-500">
            {hasExistingFace
              ? 'Ambil foto wajah baru untuk menimpa (replace) template biometrik wajah Anda saat ini.'
              : 'Pastikan wajah berada di pencahayaan yang cukup dan menghadap kamera lurus.'}
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor Induk Mahasiswa (NIM)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly={isStudent}
                  value={isStudent ? currentUser?.nim || '' : nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder="Contoh: 2024001"
                  className={`w-full text-xs font-semibold border rounded-lg px-3 py-2 text-slate-800 transition ${
                    isStudent
                      ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500'
                      : 'bg-slate-50 border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white'
                  }`}
                />
                {isStudent && (
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly={isStudent}
                  value={isStudent ? currentUser?.name || '' : name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi"
                  className={`w-full text-xs font-semibold border rounded-lg px-3 py-2 text-slate-800 transition ${
                    isStudent
                      ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500'
                      : 'bg-slate-50 border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white'
                  }`}
                />
                {isStudent && (
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                )}
              </div>
            </div>
          </div>

          {/* Camera Capture */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {hasExistingFace ? 'Ambil Foto Baru untuk Replace Wajah' : 'Foto Wajah Referensi Resmi'}
            </label>
            <CameraCapture
              onCapture={(img) => setCapturedImage(img)}
              capturedImage={capturedImage}
              onClearCapture={() => setCapturedImage(null)}
              disabled={isSubmitting}
            />
          </div>

          {/* Biometric Consent Gate (UU PDP Pasal 20 & 28) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center space-x-2 text-teal-800">
              <FileCheck2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Persetujuan Pemrosesan Biometrik (UU PDP No. 27/2022)
              </span>
            </div>
            <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <span className="leading-relaxed">
                Saya memberikan <strong>persetujuan eksplisit</strong> (Pasal 20) atas ekstraksi fitur matematis wajah (vektor 512-D) untuk keperluan verifikasi absensi perkuliahan. Saya memahami hak saya atas penghapusan atau pembaruan data kapan saja sesuai Pasal 8 UU PDP.
              </span>
            </label>
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
              <span className="font-medium leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !consent || !capturedImage}
            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer ${
              isSubmitting || !consent || !capturedImage
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white'
            }`}
          >
            {hasExistingFace ? (
              <RefreshCw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {isSubmitting
                ? 'Mengekstrak Vektor SCRFD & ArcFace...'
                : hasExistingFace
                ? 'Perbarui / Replace Wajah'
                : 'Simpan & Daftarkan Wajah'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
