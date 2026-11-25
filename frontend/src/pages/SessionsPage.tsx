import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { createSession, fetchSessions } from '../api';
import { DEFAULT_CLASSROOM } from '../config';
import type { SessionCreateInput, SessionInfo } from '../types';
import { IconClassroom, IconGpsRadar } from '../components/icons/FlaticonIcons';

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Form State
  const now = new Date();
  const later = new Date(now.getTime() + 90 * 60 * 1000); // +90 mins

  const toInputDateTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const [formData, setFormData] = useState<SessionCreateInput>({
    course_code: 'IF3201',
    course_name: 'Kecerdasan Buatan & Pengenalan Pola',
    room_name: DEFAULT_CLASSROOM.name,
    latitude: DEFAULT_CLASSROOM.latitude,
    longitude: DEFAULT_CLASSROOM.longitude,
    radius_m: DEFAULT_CLASSROOM.maxDistanceMeters,
    starts_at: toInputDateTime(now),
    ends_at: toInputDateTime(later),
  });

  const loadSessionsList = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchSessions(50);
      setSessions(data);
    } catch (err) {
      console.error('Gagal mengambil daftar sesi:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessionsList();
  }, [loadSessionsList]);

  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung geolokasi GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }));
      },
      (err) => alert(`Gagal membaca GPS: ${err.message}`),
      { enableHighAccuracy: true }
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course_code.trim() || !formData.course_name.trim()) {
      setFeedback({ type: 'error', message: 'Kode dan nama mata kuliah wajib diisi.' });
      return;
    }

    setIsCreating(true);
    setFeedback(null);

    try {
      const newSession = await createSession({
        ...formData,
        starts_at: new Date(formData.starts_at).toISOString(),
        ends_at: new Date(formData.ends_at).toISOString(),
      });
      setFeedback({
        type: 'success',
        message: `Sesi "${newSession.course_name}" berhasil dibuka!`,
      });
      setShowCreateForm(false);
      await loadSessionsList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat sesi perkuliahan.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsCreating(false);
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 font-sans">
      {/* Page Header */}
      <div className="hlb-panel p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[var(--paper)] border-2 border-[var(--edge)] shadow-[3px_3px_0_var(--shadow)] flex items-center justify-center shrink-0">
            <IconClassroom className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-normal text-2xl sm:text-3xl leading-tight text-[var(--ink)]">
              Manajemen Sesi Perkuliahan
            </h1>
            <p className="text-sm text-[var(--soft)] mt-0.5">
              Pengaturan ruang kelas, koordinat geofence, dan jendela waktu presensi.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => void loadSessionsList()}
            disabled={isLoading}
            className="hlb-btn-secondary h-10 w-10 flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Segarkan data"
            aria-label="Segarkan data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className={`${
              showCreateForm ? 'hlb-btn-secondary' : 'hlb-btn-primary'
            } inline-flex items-center gap-1.5 text-xs uppercase tracking-wider h-10 px-4 cursor-pointer`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showCreateForm ? 'Tutup Formulir' : 'Buka Sesi Kuliah'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`hlb-alert ${
            feedback.type === 'success' ? 'success' : 'danger'
          } flex items-center gap-2.5 p-4 text-sm font-medium text-[var(--ink)]`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[var(--green)] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[var(--red)] shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Form Pembuatan Sesi */}
      {showCreateForm && (
        <div className="hlb-panel p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--edge)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[var(--yellow)] border-2 border-[var(--on-yellow)] flex items-center justify-center shrink-0">
                <IconGpsRadar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-normal text-xl text-[var(--ink)] leading-tight">
                  Formulir Sesi Perkuliahan Baru
                </h2>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--soft)]">
                  Konfigurasi Ruang &amp; Geofence GPS
                </p>
              </div>
            </div>
            <span className="hlb-tag paper hidden sm:inline-flex">Sesi Baru</span>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-1.5">
                  Kode Mata Kuliah
                </label>
                <input
                  type="text"
                  required
                  value={formData.course_code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, course_code: e.target.value }))
                  }
                  placeholder="IF3201"
                  className="hlb-input w-full text-sm font-mono px-3.5 py-2.5"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-1.5">
                  Nama Mata Kuliah
                </label>
                <input
                  type="text"
                  required
                  value={formData.course_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, course_name: e.target.value }))
                  }
                  placeholder="Kecerdasan Buatan"
                  className="hlb-input w-full text-sm px-3.5 py-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-1.5">
                  Ruang Kelas / Lokasi
                </label>
                <input
                  type="text"
                  value={formData.room_name || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, room_name: e.target.value }))
                  }
                  placeholder="Lab Komputer Lt. 3"
                  className="hlb-input w-full text-sm px-3.5 py-2.5"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-1.5">
                  Radius Geofence (meter)
                </label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  required
                  value={formData.radius_m}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, radius_m: Number(e.target.value) }))
                  }
                  className="hlb-input w-full text-sm font-mono tabular-nums px-3.5 py-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)]">
                    Latitude Kelas
                  </label>
                  <button
                    type="button"
                    onClick={handleGetCurrentGps}
                    className="hlb-chip text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Gunakan Posisi Saya</span>
                  </button>
                </div>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={formData.latitude}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, latitude: Number(e.target.value) }))
                  }
                  className="hlb-input w-full text-sm font-mono tabular-nums px-3.5 py-2.5"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-1.5">
                  Longitude Kelas
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={formData.longitude}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, longitude: Number(e.target.value) }))
                  }
                  className="hlb-input w-full text-sm font-mono tabular-nums px-3.5 py-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-1.5">
                  Waktu Mulai Kuliah
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.starts_at}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, starts_at: e.target.value }))
                  }
                  className="hlb-input w-full text-sm font-mono px-3.5 py-2.5"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)] mb-1.5">
                  Waktu Selesai (Batas Akhir)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.ends_at}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ends_at: e.target.value }))
                  }
                  className="hlb-input w-full text-sm font-mono px-3.5 py-2.5"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--line)] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="hlb-btn-secondary text-xs font-mono uppercase tracking-wider px-4 py-2.5 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="hlb-btn-primary text-xs font-mono uppercase tracking-wider px-5 py-2.5 cursor-pointer disabled:opacity-50"
              >
                {isCreating ? 'Menyimpan Sesi...' : 'Aktifkan Sesi Kuliah'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sesi List Card */}
      <div className="hlb-panel p-5 sm:p-6">
        <div className="pb-3.5 mb-4 border-b-2 border-[var(--edge)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[var(--ink)]" />
            <h2 className="font-display font-normal text-xl text-[var(--ink)]">
              Daftar Sesi Kuliah Terdaftar
            </h2>
          </div>
          <span className="hlb-tag paper font-mono tabular-nums">
            {sessions.length} Sesi
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-[var(--soft)] gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--soft)]" />
            <span className="font-mono text-xs uppercase tracking-wider">
              Memuat data sesi perkuliahan...
            </span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center space-y-1.5">
            <p className="font-display font-normal text-xl text-[var(--ink)]">
              Belum Ada Sesi Perkuliahan
            </p>
            <p className="text-sm text-[var(--soft)]">
              Klik &quot;Buka Sesi Kuliah&quot; di atas untuk membuka jendela presensi baru.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((item) => (
              <div
                key={item.id}
                className={`hlb-tile p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.is_open ? 'bg-[var(--paper)]' : 'bg-[var(--surface)]'
                }`}
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--ink)] text-sm sm:text-base">
                      {item.course_name}
                    </span>
                    <span className="hlb-tag neutral font-mono">
                      {item.course_code}
                    </span>
                    <span className={`hlb-tag ${item.is_open ? 'ok' : 'neutral'}`}>
                      {item.is_open ? 'AKTIF' : 'TUTUP'}
                    </span>
                  </div>

                  <div className="flex items-center gap-x-3 gap-y-1.5 text-[var(--soft)] text-xs flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[var(--ink)] shrink-0" />
                      <span>{item.room_name || 'Ruang Kuliah'}</span>
                    </span>
                    <span className="text-[var(--muted)]">•</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--ink)] shrink-0" />
                      <span>Radius ≤{item.radius_m}m</span>
                    </span>
                    <span className="text-[var(--muted)]">•</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-[var(--ink)] shrink-0" />
                      <span>
                        {formatDateTime(item.starts_at)} – {formatDateTime(item.ends_at)}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]">
                  <span className="font-mono text-xs font-semibold text-[var(--soft)] tabular-nums">
                    ID #{item.id}
                  </span>
                  {item.is_open && item.seconds_until_close && (
                    <span className="hlb-tag ok font-mono tabular-nums">
                      Tutup dlm {Math.round(item.seconds_until_close / 60)}m
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
