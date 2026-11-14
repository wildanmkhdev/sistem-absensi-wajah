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
  isMobileLayout?: boolean;
}

export const PresensiPage: React.FC<PresensiPageProps> = ({
  onGoToOversight,
  onPresensiSuccess,
  isMobileLayout = false,
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
        // Default student for greeting
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
      cameraSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmit = async () => {
    if (!capturedImage) {
      setErrorMessage('Silakan ambil foto wajah Anda terlebih dahulu pada panel pemindai kamera.');
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

      // Refresh list
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner & Floating Check-In Card (Exact Dribbble Style) */}
      <AttendanceHeaderCard
        student={currentStudent}
        onRekamPresensi={handleScrollToCamera}
        lastPresensi={result}
        isSubmitting={isSubmitting}
      />

      {/* 2. Identity Mode Banner (Auto-Detect vs Manual Selector) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-orange-100/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-slate-800">
                {selectedNim === 'AUTO' ? 'Auto-Detect Wajah Mahasiswa Aktif' : `Mode Mahasiswa: ${customName || selectedNim}`}
              </span>
              <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-2 py-0.2 rounded-full font-mono">
                1:N Biometric AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Sistem mencocokkan vektor embedding biometrik secara otomatis terhadap database mahasiswa.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowManualSelect(!showManualSelect)}
          className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3.5 py-1.5 rounded-xl border border-orange-200/80 transition flex items-center space-x-1 self-start sm:self-auto cursor-pointer"
        >
          <span>{showManualSelect ? 'Tutup Pilihan' : 'Pilih Mahasiswa Manual'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showManualSelect ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Collapsible Manual Selector */}
      {showManualSelect && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">
              Pilih Identitas Terdaftar:
            </label>
            <select
              value={selectedNim}
              onChange={(e) => {
                setSelectedNim(e.target.value);
                const found = students.find((s) => s.nim === e.target.value);
                if (found) setCustomName(found.name);
              }}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              <option value="AUTO">-- Auto-Detect (Kenali Wajah Otomatis) --</option>
              {students.map((s) => (
                <option key={s.nim} value={s.nim}>
                  {s.nim} - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">
              Nama Mahasiswa:
            </label>
            <input
              type="text"
              value={customName || currentStudent?.name || ''}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nama Lengkap"
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
            </input>
          </div>
        </div>
      )}

      {/* 3. Main Adaptive Grid Layout (Responsive Desktop vs Mobile) */}
      <div className={`grid grid-cols-1 ${isMobileLayout ? 'gap-6' : 'lg:grid-cols-12 gap-6'}`}>
        {/* Left Column (Desktop: 7 cols) or Top Area (Mobile) */}
        <div className={`space-y-6 ${isMobileLayout ? '' : 'lg:col-span-7'}`}>
          {/* Rekap Kehadiran (4 Category Cards from Dribbble) & Jadwal Kuliah */}
          <RekapKehadiranCards
            hadirCount={22}
            alfaCount={0}
            terlambatCount={1}
            oversightCount={oversightCount}
            onFilterClick={() => {
              if (onGoToOversight) onGoToOversight();
            }}
          />

          {/* Sisa Durasi Kuliah - Radial Progress Gauge (Exact Dribbble Screen 4) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-2">
            <RadialProgressGauge
              hours={6}
              minutes={15}
              label="Sisa Durasi Kuliah Hari Ini"
              sublabel="Sesi Kuliah Reguler: 08:00 - 15:00 WIB"
              percentage={68}
            />
          </div>

          {/* GPS Location & Map (Exact Dribbble Screen 2) */}
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

        {/* Right Column (Desktop: 5 cols) or Bottom Area (Mobile) */}
        <div className={`space-y-6 ${isMobileLayout ? '' : 'lg:col-span-5'}`} ref={cameraSectionRef}>
          {/* Pemindai Wajah Selfie Camera (Exact Dribbble Screen 3) */}
          <CameraCapture
            onCapture={(img) => setCapturedImage(img)}
            capturedImage={capturedImage}
            onClearCapture={() => setCapturedImage(null)}
            disabled={isSubmitting}
            selectedCaseId={simulatedCase}
            onSelectCase={handleSelectCase}
          />

          {/* Error / Rejection Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-3xl text-rose-800 text-xs flex items-start space-x-3 shadow-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold uppercase text-[11px] text-rose-700 tracking-wider block">
                  Verifikasi Wajah / Lokasi Gagal
                </span>
                <p className="mt-0.5 leading-relaxed font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Primary Submit Attendance Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wide shadow-xl transition-all duration-150 cursor-pointer flex items-center justify-center space-x-2.5 ${
              isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-wait'
                : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 active:scale-[0.99]'
            }`}
          >
            <Send className={`w-4 h-4 ${isSubmitting ? 'animate-bounce' : ''}`} />
            <span>
              {isSubmitting
                ? 'Memproses AI & Menghitung Haversine...'
                : capturedImage
                ? 'KIRIM VERIFIKASI PRESENSI SEKARANG'
                : 'AMBIL FOTO & KIRIM PRESENSI'}
            </span>
          </button>

          {/* Recent Attendances / Riwayat Presensi Mini List */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-orange-500" />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Riwayat Absensi Terakhir
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {recentAttendances.length} Catatan
              </span>
            </div>

            <div className="space-y-2">
              {recentAttendances.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium">
                  Belum ada catatan presensi hari ini.
                </div>
              ) : (
                recentAttendances.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-[10px]">
                        {item.simulated_case || 'AI'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block truncate max-w-[140px]">
                          {item.name || item.nim}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.timestamp ? item.timestamp.split(' ')[1] : '08:57'} • {item.distance_meters}m
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        item.status === 'HADIR'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'TERLAMBAT'
                          ? 'bg-purple-100 text-purple-800'
                          : item.status === 'PERLU_VERIFIKASI_DOSEN'
                          ? 'bg-orange-100 text-orange-800'
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

      {/* Success / Result Modal Popup */}
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
