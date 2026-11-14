import React, { useState, useEffect } from 'react';
import { CameraCapture } from '../components/CameraCapture';
import { AttendanceSuccessModal } from '../components/AttendanceSuccessModal';
import { submitPresensi, fetchStudents } from '../api';
import { DEFAULT_CLASSROOM } from '../config';
import { getCoordinatesAtDistance, haversineDistance } from '../utils/geo';
import type { PresensiResponse, SimulatedCaseId, Student } from '../types';
import { Send, MapPin, Clock, AlertCircle, Sparkles, Navigation } from 'lucide-react';

interface PresensiPageProps {
  onGoToOversight?: () => void;
  onPresensiSuccess?: () => void;
}

export const PresensiPage: React.FC<PresensiPageProps> = ({
  onGoToOversight,
  onPresensiSuccess,
}) => {
  void onGoToOversight;
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedNim, setSelectedNim] = useState<string>('AUTO');
  const [customName, setCustomName] = useState<string>('');
  const [showManualSelect, setShowManualSelect] = useState<boolean>(false);

  // Camera state
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
  const [useRealGps, setUseRealGps] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Submit & Modal result state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<PresensiResponse | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents().then((data) => {
      setStudents(data);
      if (data.length > 0 && !selectedNim) {
        setSelectedNim(data[0].nim);
      }
    });
  }, [selectedNim]);

  const currentStudent = students.find((s) => s.nim === selectedNim);

  // Compute live distance
  const currentDistance = Math.round(
    haversineDistance(
      latitude,
      longitude,
      DEFAULT_CLASSROOM.latitude,
      DEFAULT_CLASSROOM.longitude
    )
  );

  const handleGetRealGps = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Browser tidak mendukung Geolocation GPS.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setUseRealGps(true);
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setSimulatedCase('CUSTOM');
      },
      (err) => {
        setIsLocating(false);
        setErrorMessage(`Gagal membaca GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSelectCase = (caseId: SimulatedCaseId) => {
    setSimulatedCase(caseId);
    setUseRealGps(false);
    setErrorMessage(null);

    const caseToNimMap: Record<string, string> = {
      M1: '210101',
      M2: '210102',
      M3: '210103',
      M4: '210104',
      M5: '210105',
      M6: '210106',
    };

    if (caseToNimMap[caseId]) {
      setSelectedNim(caseToNimMap[caseId]);
      const found = students.find((s) => s.nim === caseToNimMap[caseId]);
      if (found) setCustomName(found.name);
    }

    if (caseId === 'M1') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 20);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(5);
    } else if (caseId === 'M2') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 50);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(15);
    } else if (caseId === 'M3') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 15);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(3);
    } else if (caseId === 'M4') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 70);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(0);
    } else if (caseId === 'M5') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 10);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(2);
    } else if (caseId === 'M6') {
      const c = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 30);
      setLatitude(c.latitude);
      setLongitude(c.longitude);
      setLateMinutes(28);
    }
  };

  const handleSubmit = async () => {
    // 1. Validasi: Wajah HARUS difoto terlebih dahulu
    if (!capturedImage) {
      setErrorMessage('Silakan ambil foto wajah Anda terlebih dahulu sebelum mengirim presensi.');
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

      // 2. Jika wajah TIDAK DIKENAL atau skor kemiripan sangat rendah (< 0.70),
      // langsung tolak di halaman utama dengan notifikasi jelas, JANGAN buka modal sukses/catat presensi!
      if (res.name === 'Wajah Tidak Dikenal' || res.nim === 'UNKNOWN' || res.similarity_score < 0.70) {
        setErrorMessage(
          `⛔ PRESENSI DITOLAK: Wajah tidak cocok dengan data mahasiswa terdaftar (Kemiripan: ${Math.round(
            res.similarity_score * 100
          )}%). Pastikan Anda sudah mendaftar di menu Register.`
        );
        return;
      }

      setResult(res);
      setIsSuccessModalOpen(true);

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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Friendly Header Title */}
      <div className="text-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          Presensi Mandiri Mahasiswa
        </span>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Verifikasi Kehadiran Kuliah
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Pastikan wajah terlihat jelas di kamera dan posisi berada di ruang kelas.
        </p>
      </div>

      {/* Main Presensi Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        {/* Student Selector Card */}
        {/* Auto-Detect Wajah Header Banner */}
        <div className="bg-gradient-to-r from-indigo-50/90 via-blue-50/50 to-slate-50 rounded-2xl p-3.5 border border-indigo-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-800 text-xs">Auto-Detect Identitas Wajah Aktif</h3>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.2 rounded-full">
                  1:N AI Recognition
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {selectedNim === 'AUTO'
                  ? 'Identitas mahasiswa otomatis dikenali dari wajah yang terdaftar.'
                  : `Mode Manual: ${currentStudent?.name || selectedNim}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowManualSelect(!showManualSelect)}
            className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 px-2.5 py-1 rounded-lg hover:bg-white/80 transition cursor-pointer"
          >
            {showManualSelect ? 'Tutup' : 'Pilih Manual'}
          </button>
        </div>

        {/* Collapsible Manual Selector if needed */}
        {showManualSelect && (
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fade-in">
            <select
              value={selectedNim}
              onChange={(e) => {
                setSelectedNim(e.target.value);
                const found = students.find((s) => s.nim === e.target.value);
                if (found) setCustomName(found.name);
              }}
              className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
            >
              <option value="AUTO">-- Auto-Detect (Deteksi Wajah Otomatis) --</option>
              {students.map((s) => (
                <option key={s.nim} value={s.nim}>
                  {s.nim} - {s.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={customName || currentStudent?.name || ''}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Nama Mahasiswa Manual"
              className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none"
            />
          </div>
        )}

        {/* Live Camera Viewport */}
        <CameraCapture
          onCapture={(img) => setCapturedImage(img)}
          capturedImage={capturedImage}
          onClearCapture={() => setCapturedImage(null)}
          disabled={isSubmitting}
          selectedCaseId={simulatedCase}
        />

        {/* Status Indicators Pill (GPS & Time) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Location Badge */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${currentDistance <= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Jarak ke Kelas</span>
                <span className="text-xs font-bold text-slate-700">
                  {currentDistance} meter ({useRealGps ? 'GPS Perangkat' : currentDistance <= 50 ? 'Valid' : 'Di Luar 50m'})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGetRealGps}
              disabled={isLocating}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-200 transition shadow-xs flex items-center space-x-1 cursor-pointer"
              title="Gunakan koordinat GPS perangkat asli"
            >
              <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'GPS...' : 'GPS Asli'}</span>
            </button>
          </div>

          {/* Time Badge */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 flex items-center space-x-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${lateMinutes <= 15 ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Waktu Presensi</span>
              <span className="text-xs font-bold text-slate-700">
                {lateMinutes === 0 ? 'Tepat Waktu (0m)' : `Telat ${lateMinutes} menit`}
              </span>
            </div>
          </div>
        </div>

        {/* Mode & Skenario Selector */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Mode Pengujian:</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setSimulatedCase('CUSTOM');
                setSelectedNim('AUTO');
                setErrorMessage(null);
              }}
              className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                simulatedCase === 'CUSTOM'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              📸 Mode Live Asli (Neon DB)
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400 font-semibold">Simulasi Modul 13:</span>
            <span className="text-[10px] text-slate-500 font-bold">
              Aktif: <span className="text-indigo-600">{simulatedCase}</span>
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {(['M1', 'M2', 'M3', 'M4', 'M5', 'M6'] as SimulatedCaseId[]).map((cid) => (
              <button
                key={cid}
                type="button"
                onClick={() => handleSelectCase(cid)}
                className={`py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer text-center ${
                  simulatedCase === cid
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200'
                }`}
              >
                {cid}
              </button>
            ))}
          </div>
        </div>

        {/* Error / Rejection Alert Banner */}
        {errorMessage && (
          <div className="flex items-start space-x-3 text-xs text-rose-800 bg-rose-50 border-2 border-rose-300 p-4 rounded-2xl animate-fade-in shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold uppercase text-[11px] text-rose-700 tracking-wider block">Verifikasi Gagal</span>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Primary Submit Button */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className={`w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl font-extrabold text-sm shadow-md transition-all duration-150 cursor-pointer ${
            isSubmitting
              ? 'bg-slate-200 text-slate-400 cursor-wait'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-[0.99]'
          }`}
        >
          <Send className={`w-4 h-4 ${isSubmitting ? 'animate-bounce' : ''}`} />
          <span>{isSubmitting ? 'Menganalisis Wajah & Presensi...' : 'Ambil Foto & Presensi Sekarang'}</span>
        </button>
      </div>

      {/* Pop-up Modal when Attendance is Submitted */}
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
