import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  History,
  Info,
  MapPin,
  RefreshCw,
  Send,
} from 'lucide-react';
import { CameraCapture } from '../components/CameraCapture';
import { PresensiStatusCard } from '../components/PresensiStatusCard';
import { GpsMapCard } from '../components/GpsMapCard';
import { AttendanceSuccessModal } from '../components/AttendanceSuccessModal';
import { fetchActiveSessions, fetchAttendances, submitPresensi } from '../api';
import type { AttendanceRecord, AttendanceStatus, PresensiResponse, SessionInfo } from '../types';
import type { Session } from '../auth';

interface PresensiPageProps {
  student: Session;
}

const STATUS_BADGE_CLASS: Record<AttendanceStatus, string> = {
  HADIR: 'bg-emerald-100 text-emerald-800',
  TERLAMBAT: 'bg-indigo-100 text-indigo-800',
  PERLU_VERIFIKASI_DOSEN: 'bg-amber-100 text-amber-800',
  TIDAK_SAH: 'bg-rose-100 text-rose-800',
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTimeShort = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const PresensiPage: React.FC<PresensiPageProps> = ({ student }) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<PresensiResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(true);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const sessions = await fetchActiveSessions();
      setActiveSessions(sessions);
      if (sessions.length > 0) {
        setSelectedSessionId((prev) => {
          if (prev && sessions.some((s) => s.id === prev)) return prev;
          return sessions[0].id;
        });
      } else {
        setSelectedSessionId(null);
      }
    } catch (err) {
      console.error('Gagal memuat sesi aktif:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const loadRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const data = await fetchAttendances();
      setRecords(data.filter((record) => record.nim === student.nim));
    } catch (err) {
      console.error('Gagal memuat riwayat presensi', err);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [student.nim]);

  useEffect(() => {
    void loadSessions();
    void loadRecords();
  }, [loadSessions, loadRecords]);

  const selectedSession = activeSessions.find((s) => s.id === selectedSessionId) ?? null;

  const targetLocation = selectedSession
    ? {
        latitude: selectedSession.room_lat,
        longitude: selectedSession.room_lon,
        radiusMeters: selectedSession.radius_m,
        roomName: selectedSession.room_name || selectedSession.course_name,
      }
    : null;

  const alreadyAttendedThisSession =
    selectedSessionId !== null &&
    records.some((r) => r.session_id === selectedSessionId);

  const handleSubmit = async () => {
    if (!selectedSessionId) {
      setErrorMessage('Pilih sesi kuliah aktif terlebih dahulu.');
      return;
    }

    if (!capturedImage) {
      setErrorMessage('Ambil foto wajah Anda terlebih dahulu sebelum mengirim presensi.');
      return;
    }

    if (latitude === null || longitude === null || accuracy === null) {
      setErrorMessage('Aktifkan lokasi GPS terlebih dahulu sebelum mengirim presensi.');
      return;
    }

    if (accuracy > 50) {
      setErrorMessage(
        `Akurasi sinyal GPS terlalu rendah (±${Math.round(accuracy)}m). Sistem mewajibkan akurasi ≤ 50m untuk mencegah kecurangan spoofing.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitPresensi({
        session_id: selectedSessionId,
        face_image: capturedImage,
        latitude,
        longitude,
        gps_accuracy: accuracy,
      });

      setResult(res);
      setIsModalOpen(true);
      await loadRecords();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat mengirim presensi.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const recentRecords = records.slice(0, 3);

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <PresensiStatusCard student={student} records={records} />

      {/* Sesi Perkuliahan Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Sesi Kuliah Aktif
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void loadSessions()}
            disabled={isLoadingSessions}
            className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingSessions ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {isLoadingSessions ? (
          <div className="py-4 text-center text-xs text-slate-400">Memeriksa jadwal sesi...</div>
        ) : activeSessions.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Belum Ada Sesi Perkuliahan Dibuka</p>
              <p className="mt-0.5 text-amber-800 text-[11px] leading-relaxed">
                Dosen pengampu belum membuka jendela presensi untuk kelas hari ini. Silakan tunggu hingga dosen mengaktifkan sesi perkuliahan.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-600 block">
              Pilih Sesi yang Sedang Berlangsung:
            </label>
            <div className="grid grid-cols-1 gap-2">
              {activeSessions.map((session) => {
                const isSelected = session.id === selectedSessionId;
                const isAttended = records.some((r) => r.session_id === session.id);
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-800">
                          {session.course_name}
                        </span>
                        <span className="text-[10px] font-mono text-teal-700 bg-teal-100/60 px-1.5 py-0.2 rounded font-semibold">
                          {session.course_code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{session.room_name || 'Ruang Kuliah'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {formatTimeShort(session.starts_at)} – {formatTimeShort(session.ends_at)}
                          </span>
                        </span>
                      </div>
                    </div>
                    {isAttended ? (
                      <span className="shrink-0 flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Sudah Presensi</span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-md">
                        Buka
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Kamera & Panduan Swafoto */}
      <CameraCapture
        onCapture={(image) => setCapturedImage(image)}
        capturedImage={capturedImage}
        onClearCapture={() => setCapturedImage(null)}
        disabled={isSubmitting || activeSessions.length === 0}
      />

      {/* GPS Geofence */}
      <GpsMapCard
        latitude={latitude}
        longitude={longitude}
        accuracy={accuracy}
        target={targetLocation}
        onGpsChange={(lat, lon, acc) => {
          setLatitude(lat);
          setLongitude(lon);
          setAccuracy(acc);
        }}
      />

      {alreadyAttendedThisSession && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-900 text-xs flex items-start space-x-2 shadow-xs">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[11px] text-blue-800 block">Sesi Sudah Tercatat</span>
            <p className="mt-0.5 leading-relaxed font-medium">
              Anda telah mengirim presensi untuk sesi ini sebelumnya. Mengirim ulang akan memperbarui status secara idempoten tanpa duplikasi.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800 text-xs flex items-start space-x-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[11px] text-rose-700 block">Presensi Gagal</span>
            <p className="mt-0.5 leading-relaxed font-medium">{errorMessage}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || activeSessions.length === 0}
        className={`w-full py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2 ${
          isSubmitting || activeSessions.length === 0
            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white'
        }`}
      >
        <Send className={`w-4 h-4 ${isSubmitting ? 'animate-bounce' : ''}`} />
        <span>{isSubmitting ? 'MEMPROSES VERIFIKASI...' : 'KIRIM PRESENSI'}</span>
      </button>

      {/* Riwayat Presensi Terakhir */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <History className="w-3.5 h-3.5 text-teal-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Riwayat Terakhir Anda
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {records.length} Catatan
          </span>
        </div>

        <div className="space-y-1.5">
          {isLoadingRecords ? (
            <div className="text-center py-4 text-slate-400 text-xs">Memuat riwayat...</div>
          ) : recentRecords.length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-xs">
              Belum ada presensi tercatat.
            </div>
          ) : (
            recentRecords.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    {item.course_name ? `${item.course_name} • ` : ''}
                    {formatTimestamp(item.timestamp)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Skor {(item.similarity_score * 100).toFixed(1)}% • {item.distance_meters.toFixed(0)}m
                    {item.late_minutes > 0 ? ` • +${item.late_minutes}m` : ''}
                  </span>
                </div>

                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                    STATUS_BADGE_CLASS[item.status]
                  }`}
                >
                  {item.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && result && (
        <AttendanceSuccessModal result={result} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};
