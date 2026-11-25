import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  Info,
  RefreshCw,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { CameraCapture } from '../components/CameraCapture';
import { PresensiStatusCard } from '../components/PresensiStatusCard';
import { CourseSelect } from '../components/CourseSelect';
import { GpsMapCard } from '../components/GpsMapCard';
import { AttendanceSuccessModal } from '../components/AttendanceSuccessModal';
import { fetchActiveSessions, fetchAttendances, submitPresensi } from '../api';
import { DEFAULT_CLASSROOM } from '../config';
import { formatDistance } from '../utils/geo';
import type { AttendanceRecord, AttendanceStatus, PresensiResponse, SessionInfo } from '../types';
import type { Session } from '../auth';
import { IconClassroom } from '../components/icons/FlaticonIcons';

interface PresensiPageProps {
  student: Session;
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  HADIR: 'Hadir',
  TERLAMBAT: 'Terlambat',
  PERLU_VERIFIKASI_DOSEN: 'Review Dosen',
  TIDAK_SAH: 'Ditolak',
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const PresensiPage: React.FC<PresensiPageProps> = ({ student }) => {
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(true);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<PresensiResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [simulatedLateMinutes, setSimulatedLateMinutes] = useState<number>(5);

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
        radiusMeters: selectedSession.radius_m || 50,
        roomName: selectedSession.room_name || DEFAULT_CLASSROOM.name,
      }
    : {
        latitude: DEFAULT_CLASSROOM.latitude,
        longitude: DEFAULT_CLASSROOM.longitude,
        radiusMeters: DEFAULT_CLASSROOM.maxDistanceMeters,
        roomName: DEFAULT_CLASSROOM.name,
      };

  const alreadyAttendedThisSession =
    selectedSessionId !== null &&
    records.some((record) => record.session_id === selectedSessionId);

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!selectedSessionId) {
      setErrorMessage('Pilih sesi perkuliahan aktif terlebih dahulu.');
      return;
    }

    if (!capturedImage) {
      setErrorMessage('Ambil atau unggah foto wajah terlebih dahulu.');
      return;
    }

    if (latitude === null || longitude === null) {
      setErrorMessage('Koordinat GPS belum dipilih. Klik tombol "GPS Asli Saya" atau gunakan preset simulasi uji coba pada kartu lokasi.');
      return;
    }

    const currentLat = latitude;
    const currentLon = longitude;

    setIsSubmitting(true);

    try {
      const res = await submitPresensi({
        session_id: selectedSessionId,
        face_image: capturedImage,
        latitude: currentLat,
        longitude: currentLon,
        gps_accuracy: accuracy ?? 10,
        simulated_late_minutes: simulatedLateMinutes,
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
    <div className="max-w-xl mx-auto space-y-5">
      {/* Student Profile & KPI */}
      <PresensiStatusCard student={student} records={records} />

      {/* Sesi Perkuliahan Card */}
      <div className="hlb-panel p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b-2 border-[var(--edge)]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--paper)] border-2 border-[var(--edge)] flex items-center justify-center text-[var(--ink)] shrink-0">
              <IconClassroom className="w-4 h-4" />
            </div>
            <h3 className="font-display font-normal text-lg sm:text-xl text-[var(--ink)] leading-none">
              Sesi Perkuliahan Aktif
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void loadSessions()}
            disabled={isLoadingSessions}
            className="hlb-chip font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingSessions ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>

        {isLoadingSessions ? (
          <div className="py-6 text-center font-mono text-xs text-[var(--soft)]">
            Memeriksa jadwal sesi perkuliahan...
          </div>
        ) : activeSessions.length === 0 ? (
          <div className="hlb-alert info p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <Info className="w-4 h-4 text-[var(--ink)] shrink-0 mt-0.5" />
              <div>
                <p className="font-sans font-semibold text-[var(--ink)]">
                  Belum Ada Sesi Kuliah Terbuka
                </p>
                <p className="mt-0.5 font-sans text-[var(--soft)] text-xs leading-relaxed">
                  Dosen belum membuka jendela presensi untuk hari ini. Silakan klik tombol di samping untuk memuat sesi otomatis.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadSessions()}
              disabled={isLoadingSessions}
              className="hlb-btn-secondary font-mono text-[11px] uppercase tracking-wider px-3.5 py-2 shrink-0 flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSessions ? 'animate-spin' : ''}`} />
              <span>Muat Sesi</span>
            </button>
          </div>
        ) : (
          <CourseSelect
            sessions={activeSessions}
            selectedSessionId={selectedSessionId}
            onSelectSession={(id) => setSelectedSessionId(id)}
            records={records}
          />
        )}
      </div>

      {/* Kamera & Panduan Swafoto */}
      <CameraCapture
        onCapture={(image) => setCapturedImage(image)}
        capturedImage={capturedImage}
        onClearCapture={() => setCapturedImage(null)}
        disabled={isSubmitting}
        enableRealtimePreview
      />

      {/* GPS Geofence */}
      <GpsMapCard
        latitude={latitude}
        longitude={longitude}
        accuracy={accuracy}
        target={targetLocation}
        simulatedLateMinutes={simulatedLateMinutes}
        onLateMinutesChange={(mins) => setSimulatedLateMinutes(mins)}
        onGpsChange={(lat, lon, acc) => {
          setLatitude(lat);
          setLongitude(lon);
          setAccuracy(acc);
        }}
      />

      {alreadyAttendedThisSession && (
        <div className="hlb-alert info p-3.5 text-xs flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-[var(--ink)] shrink-0 mt-0.5" />
          <div>
            <span className="font-sans font-semibold text-[var(--ink)] block">
              Sesi Sudah Pernah Tercatat
            </span>
            <p className="mt-0.5 font-sans leading-relaxed text-[var(--soft)]">
              Anda telah mengirim presensi untuk sesi ini. Mengirim ulang akan memperbarui status secara idempoten.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="hlb-alert danger p-3.5 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-[var(--red)] shrink-0 mt-0.5" />
          <div>
            <span className="font-sans font-semibold text-[var(--ink)] block">Presensi Gagal</span>
            <p className="mt-0.5 font-sans leading-relaxed text-[var(--ink)]">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Primary Submit Button */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || activeSessions.length === 0}
          className={`w-full h-12 px-4 text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 ${
            isSubmitting || activeSessions.length === 0
              ? 'rounded-xl border-2 border-[var(--line)] bg-[var(--bg)] text-[var(--muted)] font-mono cursor-not-allowed'
              : 'hlb-btn-primary cursor-pointer'
          }`}
        >
          <Send className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
          <span>{isSubmitting ? 'Memproses Biometrik...' : 'Kirim Presensi Wajah & GPS'}</span>
        </button>

        {activeSessions.length === 0 && (
          <p className="hlb-alert info p-3 font-sans text-xs text-[var(--soft)] text-center">
            Tombol dinonaktifkan karena belum ada sesi perkuliahan aktif. Klik &quot;Segarkan&quot; atau &quot;Muat Sesi&quot; di atas untuk mengaktifkan sesi.
          </p>
        )}
      </div>

      {/* Riwayat Presensi Terakhir */}
      <div className="hlb-panel p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b-2 border-[var(--edge)]">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-[var(--ink)]" />
            <h4 className="font-display font-normal text-lg text-[var(--ink)] leading-none">
              Riwayat Terakhir Anda
            </h4>
          </div>
          <span className="hlb-tag paper tabular-nums">
            {records.length} Catatan
          </span>
        </div>

        <div className="divide-y divide-[var(--line)]">
          {isLoadingRecords ? (
            <div className="text-center py-4 font-mono text-[var(--soft)] text-xs">
              Memuat riwayat...
            </div>
          ) : recentRecords.length === 0 ? (
            <div className="text-center py-4 font-sans text-[var(--soft)] text-xs">
              Belum ada presensi tercatat.
            </div>
          ) : (
            recentRecords.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-sans font-semibold text-[var(--ink)] block truncate">
                    {item.course_name ? `${item.course_name} • ` : ''}
                    {formatTimestamp(item.timestamp)}
                  </span>
                  <span className="text-[11px] text-[var(--soft)] font-mono mt-0.5 block tabular-nums">
                    Skor {(item.similarity_score * 100).toFixed(1)}% • {formatDistance(item.distance_meters)}
                    {item.late_minutes > 0 ? ` • +${item.late_minutes}m` : ''}
                  </span>
                </div>

                <span
                  className={`shrink-0 inline-flex items-center gap-1 ${
                    item.status === 'HADIR'
                      ? 'hlb-tag ok'
                      : item.status === 'TERLAMBAT'
                      ? 'hlb-tag accent'
                      : item.status === 'PERLU_VERIFIKASI_DOSEN'
                      ? 'hlb-tag paper'
                      : 'hlb-tag warn'
                  }`}
                >
                  {item.status === 'HADIR' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                  {item.status === 'TERLAMBAT' && <Clock className="w-3 h-3 shrink-0" />}
                  {item.status === 'PERLU_VERIFIKASI_DOSEN' && (
                    <ShieldAlert className="w-3 h-3 shrink-0" />
                  )}
                  {item.status === 'TIDAK_SAH' && <AlertCircle className="w-3 h-3 shrink-0" />}
                  <span>{STATUS_LABEL[item.status]}</span>
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
