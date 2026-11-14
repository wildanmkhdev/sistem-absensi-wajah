import React, { useState, useEffect, useRef } from 'react';
import { CameraCapture } from '../components/CameraCapture';
import { AttendanceSuccessModal } from '../components/AttendanceSuccessModal';
import { AttendanceHeaderCard } from '../components/AttendanceHeaderCard';
import { RekapKehadiranCards } from '../components/RekapKehadiranCards';
import { RadialProgressGauge } from '../components/RadialProgressGauge';
import { GpsMapCard } from '../components/GpsMapCard';
import { submitPresensi, fetchStudents, fetchOversightAttendances, fetchAttendances } from '../api';
import { DEFAULT_CLASSROOM } from '../config';
import { getCoordinatesAtDistance } from '../utils/geo';
import type { PresensiResponse, SimulatedCaseId, Student, AttendanceRecord } from '../types';
import { Send, AlertCircle, Sparkles, ChevronDown, History } from 'lucide-react';

interface PresensiPageProps {
  onGoToOversight?: () => void;
  onPresensiSuccess?: () => void;
}

export const PresensiPage: React.FC<PresensiPageProps> = ({
  onGoToOversight,
  onPresensiSuccess,
}) => {
  const cameraSectionRef = useRef<HTMLDivElement | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedNim, setSelectedNim] = useState<string>('AUTO');
  const [customName, setCustomName] = useState<string>('');
  const [showManualSelect, setShowManualSelect] = useState<boolean>(false);

  // Camera & Face state
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // GPS & Simulation state
  const defaultCoords = getCoordinatesAtDistance(
    DEFAULT_CLASSROOM.latitude,
    DEFAULT_CLASSROOM.longitude,
    20
  );
  const [latitude, setLatitude] = useState<number>(defaultCoords.latitude);
  const [longitude, setLongitude] = useState<number>(defaultCoords.longitude);
  const [lateMinutes, setLateMinutes] = useState<number>(0);
  const [simulatedCase, setSimulatedCase] = useState<SimulatedCaseId>('CUSTOM');

  // Submit & Modal result state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<PresensiResponse | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stats & Recent History
  const [oversightCount, setOversightCount] = useState<number>(0);
  const [recentAttendances, setRecentAttendances] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchStudents().then((data) => {
      setStudents(data);
      if (data.length > 0 && selectedNim === 'AUTO') {
        setCustomName(data[0].name);
      }
    });

    fetchOversightAttendances().then((pending) => {
      setOversightCount(pending.length);
    }).catch(() => {});

    fetchAttendances().then((records) => {
      setRecentAttendances(records.slice(0, 5));
    }).catch(() => {});
  }, [selectedNim]);

  const currentStudent = students.find((s) => s.nim === selectedNim) || (students.length > 0 ? students[0] : null);

  const handleSelectCase = (caseId: SimulatedCaseId | string) => {
    const cId = caseId as SimulatedCaseId;
    setSimulatedCase(cId);
    setErrorMessage(null);

    const caseToNimMap: Record<string, string> = {
      M1: '210101',
      M2: '210102',
      M3: '210103',
      M4: '210104',
      M5: '210105',
      M6: '210106',
    };

    if (caseToNimMap[cId]) {
      setSelectedNim(caseToNimMap[cId]);
      const found = students.find((s) => s.nim === caseToNimMap[cId]);
      if (found) setCustomName(found.name);
    }

    if (cId === 'M1') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 20);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(5);
    } else if (cId === 'M2') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 50);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(15);
    } else if (cId === 'M3') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 15);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(3);
    } else if (cId === 'M4') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 70);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(0);
    } else if (cId === 'M5') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 10);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(2);
    } else if (cId === 'M6') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 30);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(28);
    }
  };

  const handleScrollToCamera = () => {
    if (cameraSectionRef.current) {
      cameraSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSubmit = async () => {
    if (!capturedImage) {
      setErrorMessage('Silakan ambil foto wajah Anda terlebih dahulu pada panel kamera.');
      handleScrollToCamera();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const isAuto = selectedNim === 'AUTO';
      const studentName = isAuto ? undefined : (customName || currentStudent?.name || `Mahasiswa (${selectedNim})`);

      const res = await submitPresensi({
        nim: isAuto ? 'AUTO' : selectedNim,
        name: studentName,
        face_image: capturedImage,
        latitude,
        longitude,
        late_minutes: lateMinutes,
        simulated_case: simulatedCase,
      });

      if (res.name === 'Wajah Tidak Dikenal' || res.nim === 'UNKNOWN' || res.similarity_score < 0.70) {
        setErrorMessage(
          `⛔ PRESENSI DITOLAK: Wajah tidak cocok dengan basis data mahasiswa (Skor Kemiripan: ${Math.round(
            res.similarity_score * 100
          )}%). Pastikan wajah Anda sudah didaftarkan pada menu Daftar Wajah.`
        );
        return;
      }

      setResult(res);
      setIsSuccessModalOpen(true);

      fetchAttendances().then((records) => setRecentAttendances(records.slice(0, 5))).catch(() => {});
      fetchOversightAttendances().then((pending) => setOversightCount(pending.length)).catch(() => {});

      if (onPresensiSuccess) {
        onPresensiSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat mengirim presensi.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* 1. Top Header Card (Clean Solid Flat Teal, No Gradient, No Orange) */}
      <AttendanceHeaderCard
        onRekamPresensi={handleScrollToCamera}
        lastPresensi={result}
        isSubmitting={isSubmitting}
      />

      {/* 2. Compact Mode Bar: Auto-Detect Indicator + Collapsible Manual Select */}
      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-xs flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-800 text-[11px] sm:text-xs">
              {selectedNim === 'AUTO' ? 'Auto-Detect Biometrik Aktif' : `Mode: ${customName || selectedNim}`}
            </span>
            <span className="text-[10px] text-slate-400 block">
              Pencocokan 1:N Vektor Embedding Wajah
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowManualSelect(!showManualSelect)}
          className="text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200/70 transition flex items-center space-x-1 cursor-pointer"
        >
          <span>{showManualSelect ? 'Tutup' : 'Pilih Manual'}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showManualSelect ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Collapsible Manual Selector */}
      {showManualSelect && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-fade-in text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-1 block">
              Pilih Mahasiswa:
            </label>
            <select
              value={selectedNim}
              onChange={(e) => {
                setSelectedNim(e.target.value);
                const found = students.find((s) => s.nim === e.target.value);
                if (found) setCustomName(found.name);
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value="AUTO">-- Auto-Detect (Otomatis) --</option>
              {students.map((s) => (
                <option key={s.nim} value={s.nim}>
                  {s.nim} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-1 block">
              Nama Lengkap:
            </label>
            <input
              type="text"
              value={customName || currentStudent?.name || ''}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nama Lengkap"
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
        </div>
      )}

      {/* 3. Main Responsive Grid: Structured, Tidy, No Visual Clutter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column (Desktop: 7 cols) */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
          {/* Rekap Kehadiran 4 Cards + Jadwal Kuliah */}
          <RekapKehadiranCards
            hadirCount={22}
            alfaCount={0}
            terlambatCount={1}
            oversightCount={oversightCount}
            onFilterClick={() => {
              if (onGoToOversight) onGoToOversight();
            }}
          />

          {/* Sisa Durasi Kuliah Gauge */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
            <RadialProgressGauge
              hours={6}
              minutes={15}
              label="Sisa Durasi Kuliah Hari Ini"
              sublabel="Jadwal Reguler: 08:00 - 15:00 WIB"
              percentage={68}
            />
          </div>

          {/* GPS Map Card */}
          <GpsMapCard
            latitude={latitude}
            longitude={longitude}
            onGpsChange={(lat, lon) => {
              setLatitude(lat);
              setLongitude(lon);
            }}
            onProceedToCamera={handleScrollToCamera}
            onSelectCase={handleSelectCase}
          />
        </div>

        {/* Right Column (Desktop: 5 cols) */}
        <div className="lg:col-span-5 space-y-4" ref={cameraSectionRef}>
          {/* Pemindai Wajah Selfie Camera */}
          <CameraCapture
            onCapture={(img) => setCapturedImage(img)}
            capturedImage={capturedImage}
            onClearCapture={() => setCapturedImage(null)}
            disabled={isSubmitting}
            selectedCaseId={simulatedCase}
            onSelectCase={handleSelectCase}
          />

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800 text-xs flex items-start space-x-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[11px] text-rose-700 block">
                  Verifikasi Wajah / Lokasi Gagal
                </span>
                <p className="mt-0.5 leading-relaxed font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Primary Submit Attendance Button - Solid Flat Teal */}
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
            <span>
              {isSubmitting
                ? 'Memproses AI & Haversine...'
                : capturedImage
                ? 'KIRIM VERIFIKASI PRESENSI SEKARANG'
                : 'AMBIL FOTO & KIRIM PRESENSI'}
            </span>
          </button>

          {/* Riwayat Absensi Mini */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5 text-teal-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Riwayat Terakhir
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {recentAttendances.length} Catatan
              </span>
            </div>

            <div className="space-y-1.5">
              {recentAttendances.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-xs">
                  Belum ada catatan presensi hari ini.
                </div>
              ) : (
                recentAttendances.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-[10px]">
                        {item.simulated_case || 'AI'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-xs truncate max-w-[140px]">
                          {item.name || item.nim}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.timestamp ? item.timestamp.split(' ')[1] : '08:57'} • {item.distance_meters}m
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                        item.status === 'HADIR'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'TERLAMBAT'
                          ? 'bg-indigo-100 text-indigo-800'
                          : item.status === 'PERLU_VERIFIKASI_DOSEN'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Result Modal Popup */}
      {isSuccessModalOpen && result && (
        <AttendanceSuccessModal
          result={result}
          onClose={() => setIsSuccessModalOpen(false)}
          capturedPhotoUrl={capturedImage}
          registeredPhotoUrl={currentStudent?.profile_image_url || null}
        />
      )}
    </div>
  );
};
