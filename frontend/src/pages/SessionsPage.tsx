import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
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
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Manajemen Sesi Perkuliahan
          </h1>
          <p className="text-xs text-slate-500">
            Jadwalkan ruang kelas, koordinat geofence, dan jendela waktu presensi mahasiswa.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => void loadSessionsList()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-800 transition cursor-pointer shadow-xs"
            title="Segarkan data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex items-center space-x-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showCreateForm ? 'Tutup Formulir' : 'Buka Sesi Kuliah'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center space-x-2 text-xs p-3.5 rounded-2xl border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Form Pembuatan Sesi */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl border border-teal-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-teal-800 border-b border-slate-100 pb-2.5">
            <BookOpen className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Formulir Sesi Perkuliahan Baru
            </h3>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ruang Kelas / Lokasi
                </label>
                <input
                  type="text"
                  value={formData.room_name || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, room_name: e.target.value }))
                  }
                  placeholder="Lab Komputer Lt. 3"
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Radius Geofence Maksimal (meter)
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
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Latitude Kelas</label>
                  <button
                    type="button"
                    onClick={handleGetCurrentGps}
                    className="text-[10px] text-teal-700 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                  >
                    <Navigation className="w-2.5 h-2.5" />
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
                  className="w-full text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Waktu Mulai Kuliah
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.starts_at}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, starts_at: e.target.value }))
                  }
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Waktu Selesai (Batas Akhir Presensi)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.ends_at}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ends_at: e.target.value }))
                  }
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-xs transition cursor-pointer disabled:bg-slate-300"
              >
                {isCreating ? 'Menyimpan Sesi...' : 'Aktifkan Sesi Kuliah'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sesi List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Sesi Kuliah Terdaftar
            </h3>
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-400">
            {sessions.length} Sesi
          </span>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Memuat data sesi...</div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Belum ada sesi perkuliahan. Klik "Buka Sesi Kuliah" di atas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="font-bold text-slate-800 text-sm">{item.course_name}</span>
                    <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200/60 px-2 py-0.5 rounded">
                      {item.course_code}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        item.is_open
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {item.is_open ? 'SEDANG DIBUKA' : 'DITUTUP'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-slate-500 text-[11px] flex-wrap">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.room_name || 'Ruang Kuliah'}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Radius ≤{item.radius_m}m</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {formatDateTime(item.starts_at)} – {formatDateTime(item.ends_at)}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-[10px] text-slate-400 block font-mono">
                    ID #{item.id}
                  </span>
                  {item.is_open && item.seconds_until_close && (
                    <span className="text-[10px] font-bold text-emerald-600 block">
                      Tutup dalam {Math.round(item.seconds_until_close / 60)} menit
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
