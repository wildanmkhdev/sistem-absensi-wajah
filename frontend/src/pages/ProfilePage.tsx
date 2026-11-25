import React, { useEffect, useState } from 'react';
import {
  FileCheck2,
  Loader2,
  LogOut,
  RefreshCw,
  Trash2,
  User,
} from 'lucide-react';
import type { Session } from '../auth';
import type { Student } from '../types';
import { deleteBiometric, fetchMyProfile } from '../api';
import {
  IconAcademicShield,
  IconAuditScale,
  IconStudentCard,
  IconVerifiedCheck,
} from '../components/icons/FlaticonIcons';

interface ProfilePageProps {
  session: Session;
  onLogout: () => void;
  onNavigateTab: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  session,
  onLogout,
  onNavigateTab,
}) => {
  const isMahasiswa = session.role === 'mahasiswa';
  const isDosen = session.role === 'dosen';

  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(isMahasiswa);
  const [isDeletingBiometric, setIsDeletingBiometric] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isMahasiswa) {
      setIsLoadingProfile(true);
      fetchMyProfile()
        .then((data) => setStudentProfile(data))
        .catch(() => setStudentProfile(null))
        .finally(() => setIsLoadingProfile(false));
    }
  }, [isMahasiswa]);

  const handleDeleteBiometric = async () => {
    if (!session.nim) return;
    const confirm = window.confirm(
      `Apakah Anda yakin ingin menghapus seluruh data biometrik wajah Anda (NIM: ${session.nim})? Tindakan ini dijamin oleh Pasal 8 UU PDP No. 27/2022 (Hak Penghapusan Data Pribadi).`
    );
    if (!confirm) return;

    setIsDeletingBiometric(true);
    setActionMessage(null);
    try {
      const res = await deleteBiometric(session.nim);
      if (res.success) {
        setActionMessage({
          type: 'success',
          text: 'Data biometrik wajah Anda telah dihapus dari basis data sesuai hak penghapusan UU PDP.',
        });
        setStudentProfile(null);
      } else {
        setActionMessage({
          type: 'error',
          text: res.message || 'Gagal menghapus data biometrik.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan saat menghapus biometrik.';
      setActionMessage({ type: 'error', text: msg });
    } finally {
      setIsDeletingBiometric(false);
    }
  };

  const hasFaceEmbedding = Boolean(studentProfile?.has_embedding);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Profile Header Banner */}
      <div className="hlb-panel p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-xl bg-[var(--yellow)] border-2 border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)] flex items-center justify-center text-[var(--on-yellow)] shrink-0">
            {isDosen ? (
              <IconAcademicShield className="w-8 h-8" />
            ) : (
              <IconStudentCard className="w-8 h-8" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display font-normal text-2xl sm:text-3xl text-[var(--ink)] leading-tight">
                {session.name}
              </h1>
              <span className="hlb-tag ok">Aktif</span>
            </div>
            <p className="text-xs text-[var(--soft)] font-mono mt-0.5 tabular-nums">
              {isMahasiswa ? `NIM ${session.nim} • Mahasiswa` : `@${session.username} • Dosen Pengampu`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="hlb-btn-danger font-mono text-xs uppercase tracking-wider px-4 py-2.5 flex items-center space-x-1.5 cursor-pointer self-start sm:self-center"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Sesi</span>
        </button>
      </div>

      {actionMessage && (
        <div
          className={`hlb-alert p-3.5 text-xs font-sans font-semibold text-[var(--ink)] ${
            actionMessage.type === 'success' ? 'success' : 'danger'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Grid: 2 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Informasi Akun */}
        <div className="hlb-panel p-5 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b-2 border-[var(--edge)]">
            <User className="w-4 h-4 text-[var(--ink)]" />
            <h2 className="font-display font-normal text-xl text-[var(--ink)] leading-none">
              Informasi Akun &amp; Identitas
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)]">
                Nama Lengkap
              </span>
              <span className="font-sans font-semibold text-[var(--ink)] text-right">
                {session.name}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)]">
                Username
              </span>
              <span className="font-mono font-semibold text-[var(--ink)]">
                @{session.username}
              </span>
            </div>

            {isMahasiswa && (
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)]">
                  NIM
                </span>
                <span className="font-mono font-semibold text-[var(--ink)] tabular-nums">
                  {session.nim}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)]">
                Peran Sistem
              </span>
              <span className="hlb-tag paper">
                {isDosen ? 'Dosen Pengampu' : 'Mahasiswa'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)]">
                Otorisasi Sesi
              </span>
              <span className="font-mono text-[11px] text-[var(--soft)]">JWT Bearer HS256</span>
            </div>
          </div>
        </div>

        {/* Card 2: Tata Kelola Biometrik & Regulasi UU PDP */}
        <div className="hlb-panel p-5 space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b-2 border-[var(--edge)]">
            <IconAuditScale className="w-5 h-5 text-[var(--ink)]" />
            <h2 className="font-display font-normal text-xl text-[var(--ink)] leading-none">
              {isMahasiswa ? 'Tata Kelola Biometrik Wajah' : 'Otoritas Pengawasan Dosen'}
            </h2>
          </div>

          {isMahasiswa ? (
            <div className="space-y-3.5 text-xs">
              <div className="hlb-tile bg-[var(--bg)] p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)]">
                    Status Template Biometrik
                  </span>
                  {isLoadingProfile ? (
                    <span className="inline-flex items-center font-mono text-[11px] text-[var(--soft)]">
                      <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                      Memeriksa...
                    </span>
                  ) : (
                    <span className={hasFaceEmbedding ? 'hlb-tag ok' : 'hlb-tag paper'}>
                      {hasFaceEmbedding ? 'Wajah Terdaftar' : 'Belum Ada'}
                    </span>
                  )}
                </div>
                <div className="font-sans text-xs text-[var(--soft)] leading-relaxed">
                  Model:{' '}
                  <span className="font-mono font-semibold text-[var(--ink)]">
                    ArcFace 512-D MobileFaceNet
                  </span>
                  . Data foto dikonversi menjadi representasi matematis vektor hypersphere non-reversibel.
                </div>
              </div>

              {/* Hak Subjek Data UU PDP */}
              <div className="space-y-2 pt-1">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)] block">
                  Hak Subjek Data (UU PDP No. 27/2022)
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('register')}
                    className="hlb-btn-secondary font-mono text-[11px] uppercase tracking-wider p-2.5 flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ganti Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteBiometric}
                    disabled={isDeletingBiometric || !hasFaceEmbedding}
                    className="hlb-btn-danger font-mono text-[11px] uppercase tracking-wider p-2.5 flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus (Ps. 8)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 text-xs">
              <div className="hlb-alert info p-3.5 space-y-1.5">
                <div className="font-sans font-semibold text-[var(--ink)] flex items-center space-x-1.5">
                  <IconVerifiedCheck className="w-4 h-4 text-[var(--ink)]" />
                  <span>Mandat Human Oversight (Pasal 34)</span>
                </div>
                <p className="font-sans text-xs text-[var(--soft)] leading-relaxed">
                  Sebagai Dosen Pengampu, Anda memiliki wewenang untuk meninjau dan menetapkan keputusan final atas anomali biometrik (skor ambang batas) dan geofence (degradasi GPS beton gedung).
                </p>
              </div>

              <div className="hlb-tile bg-[var(--bg)] p-3.5 space-y-2.5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)] block">
                  Akses Cepat Pengawasan
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('oversight')}
                    className="hlb-btn-primary text-[11px] uppercase tracking-wider p-2.5 flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <IconAcademicShield className="w-4 h-4" />
                    <span>Antrean Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateTab('benchmark')}
                    className="hlb-btn-secondary font-mono text-[11px] uppercase tracking-wider p-2.5 flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <IconAuditScale className="w-4 h-4" />
                    <span>Kasus M1–M6</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Standar Kepatuhan Hukum & Privasi */}
      <div className="hlb-panel p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-[var(--edge)]">
          <div className="flex items-center space-x-2.5">
            <FileCheck2 className="w-4 h-4 text-[var(--ink)]" />
            <h2 className="font-display font-normal text-xl text-[var(--ink)] leading-none">
              Jaminan Pelindungan Data Pribadi
            </h2>
          </div>
          <span className="hlb-tag paper">UU PDP 27/2022</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="hlb-tile bg-[var(--paper)] p-3.5 space-y-1.5">
            <span className="hlb-tag accent">Pasal 4 Ayat 2 (c)</span>
            <p className="font-sans text-xs leading-relaxed text-[var(--soft)]">
              Data biometrik diklasifikasikan sebagai data pribadi spesifik berisiko tinggi dengan protokol enkripsi matematis.
            </p>
          </div>
          <div className="hlb-tile bg-[var(--paper)] p-3.5 space-y-1.5">
            <span className="hlb-tag accent">Pasal 20 &amp; 28</span>
            <p className="font-sans text-xs leading-relaxed text-[var(--soft)]">
              Persetujuan eksplisit diperoleh sebelum perekaman landmark wajah untuk tujuan absensi perkuliahan.
            </p>
          </div>
          <div className="hlb-tile bg-[var(--paper)] p-3.5 space-y-1.5">
            <span className="hlb-tag accent">Pasal 34</span>
            <p className="font-sans text-xs leading-relaxed text-[var(--soft)]">
              Larangan otomasi tunggal yang merugikan hak akademik. Intervensi manusia dosen menjamin keadilan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
