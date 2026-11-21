import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, History, Send } from 'lucide-react';
import { CameraCapture } from '../components/CameraCapture';
import { PresensiStatusCard } from '../components/PresensiStatusCard';
import { GpsMapCard } from '../components/GpsMapCard';
import { AttendanceSuccessModal } from '../components/AttendanceSuccessModal';
import { fetchAttendances, submitPresensi } from '../api';
import type { AttendanceRecord, AttendanceStatus, PresensiResponse } from '../types';
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

export const PresensiPage: React.FC<PresensiPageProps> = ({ student }) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<PresensiResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(true);

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
    void loadRecords();
  }, [loadRecords]);

  const handleSubmit = async () => {
    if (!capturedImage) {
      setErrorMessage('Ambil foto wajah Anda terlebih dahulu sebelum mengirim presensi.');
      return;
    }

    if (latitude === null || longitude === null) {
      setErrorMessage('Aktifkan lokasi GPS terlebih dahulu sebelum mengirim presensi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitPresensi({
        nim: student.nim,
        name: student.name,
        face_image: capturedImage,
        latitude,
        longitude,
        late_minutes: 0,
      });

      if (res.nim === 'UNKNOWN') {
        setErrorMessage('Wajah tidak dikenali. Daftarkan wajah Anda di menu Daftar Wajah.');
        return;
      }

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

      <CameraCapture
        onCapture={(image) => setCapturedImage(image)}
        capturedImage={capturedImage}
        onClearCapture={() => setCapturedImage(null)}
        disabled={isSubmitting}
      />

      <GpsMapCard
        latitude={latitude}
        longitude={longitude}
        onGpsChange={(lat, lon) => {
          setLatitude(lat);
          setLongitude(lon);
        }}
      />

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
        disabled={isSubmitting}
        className={`w-full py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2 ${
          isSubmitting
            ? 'bg-slate-200 text-slate-400 cursor-wait'
            : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white'
        }`}
      >
        <Send className={`w-4 h-4 ${isSubmitting ? 'animate-bounce' : ''}`} />
        <span>{isSubmitting ? 'MEMPROSES...' : 'KIRIM PRESENSI'}</span>
      </button>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <History className="w-3.5 h-3.5 text-teal-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Riwayat Terakhir
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
                    {formatTimestamp(item.timestamp)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Skor {(item.similarity_score * 100).toFixed(0)}% • {item.distance_meters.toFixed(0)}m
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
