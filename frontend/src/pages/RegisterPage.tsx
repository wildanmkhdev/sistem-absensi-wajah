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
import { IconStudentCard } from '../components/icons/FlaticonIcons';

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
        text: 'Persetujuan pemrosesan data biometrik (UU PDP Pasal 20) wajib dicentang.',
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
          text: res.message || `Wajah untuk ${effectiveName} (${effectiveNim}) berhasil disimpan.`,
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
      `Hapus data biometrik wajah untuk NIM ${effectiveNim}? Sesuai Pasal 8 UU PDP (Hak Penghapusan Data Pribadi).`
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
    <div className="max-w-xl mx-auto space-y-5">
      {/* Title */}
      <div className="hlb-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-[var(--yellow)] border-2 border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)] flex items-center justify-center text-[var(--on-yellow)] shrink-0">
            <IconStudentCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <span className="hlb-tag paper">UU PDP 27/2022</span>
              <span className="hlb-tag neutral">512-D ARCFACE</span>
            </div>
            <h1 className="font-display font-normal text-2xl text-[var(--ink)] leading-tight">
              {isStudent ? 'Data Wajah & Biometrik' : 'Pendaftaran Biometrik Mahasiswa'}
            </h1>
            <p className="font-sans text-xs text-[var(--soft)] mt-0.5">
              Representasi vektor 512-D ArcFace MobileFaceNet • Kepatuhan UU PDP No. 27/2022.
            </p>
          </div>
        </div>

        {isStudent && onOpenRegisterAccount && (
          <button
            type="button"
            onClick={onOpenRegisterAccount}
            className="hlb-btn-secondary font-mono text-[11px] uppercase tracking-wider px-3.5 py-2 flex items-center space-x-1.5 cursor-pointer shrink-0 self-start sm:self-center"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Akun Baru</span>
          </button>
        )}
      </div>

      {/* Status Biometrik Saat Ini */}
      {isStudent && (
        <div className="hlb-tile p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={hasExistingFace ? 'hlb-tag ok' : 'hlb-tag paper'}>
                  {hasExistingFace ? 'TERDAFTAR' : 'BELUM TERDAFTAR'}
                </span>
                <span className="font-sans text-sm font-semibold text-[var(--ink)]">
                  {hasExistingFace
                    ? 'Biometrik Wajah Aktif Terdaftar'
                    : 'Wajah Belum Terdaftar'}
                </span>
              </div>
              <p className="font-sans text-xs text-[var(--soft)]">
                {hasExistingFace
                  ? `Model ${existingProfile?.model_version || 'ArcFace 512-D'} • Dapat diganti dengan foto baru di bawah.`
                  : 'Ambil foto wajah Anda di bawah untuk mengaktifkan presensi biometrik.'}
              </p>
            </div>

            {hasExistingFace && (
              <button
                type="button"
                onClick={handleDeleteBiometric}
                disabled={isDeleting}
                className="hlb-btn-danger font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Hapus'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="hlb-panel p-4 sm:p-5 space-y-4">
        <div className="pb-3 border-b-2 border-[var(--edge)]">
          <h2 className="font-display font-normal text-xl text-[var(--ink)] leading-tight">
            {hasExistingFace ? 'Perbarui Foto Wajah' : 'Form Pendaftaran Wajah'}
          </h2>
          <p className="font-sans text-xs text-[var(--soft)] mt-0.5">
            {hasExistingFace
              ? 'Foto baru akan menimpa template biometrik wajah Anda saat ini.'
              : 'Pastikan pencahayaan cukup dan posisikan wajah lurus menghadap kamera.'}
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-1.5">
                NIM
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly={isStudent}
                  value={isStudent ? currentUser?.nim || '' : nim}
                  onChange={(e) => setNim(e.target.value)}
                  placeholder="Contoh: 2024001"
                  className={`hlb-input w-full text-xs font-mono px-3 py-2.5 ${
                    isStudent ? 'bg-[var(--bg)] text-[var(--soft)] cursor-not-allowed pr-9' : ''
                  }`}
                />
                {isStudent && (
                  <Lock className="w-3.5 h-3.5 text-[var(--soft)] absolute right-3 top-3" />
                )}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  readOnly={isStudent}
                  value={isStudent ? currentUser?.name || '' : name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Mahasiswa"
                  className={`hlb-input w-full text-xs font-sans px-3 py-2.5 ${
                    isStudent ? 'bg-[var(--bg)] text-[var(--soft)] cursor-not-allowed pr-9' : ''
                  }`}
                />
                {isStudent && (
                  <Lock className="w-3.5 h-3.5 text-[var(--soft)] absolute right-3 top-3" />
                )}
              </div>
            </div>
          </div>

          {/* Camera Capture */}
          <div>
            <label className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-2">
              {hasExistingFace ? 'Ambil Foto Baru untuk Replace Wajah' : 'Foto Wajah Referensi Resmi'}
            </label>
            <CameraCapture
              onCapture={(img) => setCapturedImage(img)}
              capturedImage={capturedImage}
              onClearCapture={() => setCapturedImage(null)}
              disabled={isSubmitting}
            />
          </div>

          {/* Biometric Consent Gate */}
          <div className="hlb-alert info p-4 space-y-2.5">
            <div className="flex items-center space-x-2 text-[var(--ink)]">
              <FileCheck2 className="w-4 h-4 text-[var(--ink)] shrink-0" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider">
                Persetujuan Pemrosesan Biometrik (UU PDP No. 27/2022)
              </span>
            </div>
            <label className="flex items-start space-x-2.5 cursor-pointer text-xs font-sans text-[var(--soft)]">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-2 border-[var(--edge)] accent-[var(--ink)] cursor-pointer shrink-0"
              />
              <span className="leading-relaxed">
                Saya memberikan <strong className="text-[var(--ink)]">persetujuan eksplisit</strong> (Pasal 20) atas ekstraksi fitur matematis wajah (vektor 512-D) untuk verifikasi absensi perkuliahan, dan memahami hak atas penghapusan atau pembaruan data (Pasal 8).
              </span>
            </label>
          </div>

          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`hlb-alert flex items-center space-x-2.5 text-xs p-3.5 ${
                statusMessage.type === 'success' ? 'success' : 'danger'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-[var(--green)] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[var(--red)] shrink-0" />
              )}
              <span className="font-sans font-semibold text-[var(--ink)] leading-relaxed">
                {statusMessage.text}
              </span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !consent || !capturedImage}
            className="w-full h-12 hlb-btn-primary text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
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
                ? 'Perbarui Foto Wajah'
                : 'Simpan & Daftarkan Wajah'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
