import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Radio, Clock, ShieldAlert } from 'lucide-react';
import { DEFAULT_CLASSROOM } from '../config';
import { haversineDistance, getCoordinatesAtDistance } from '../utils/geo';
import type { SimulatedCaseId } from '../types';

interface GpsCardProps {
  latitude: number;
  longitude: number;
  lateMinutes: number;
  simulatedCase: SimulatedCaseId;
  onGpsChange: (lat: number, lon: number) => void;
  onLateMinutesChange: (minutes: number) => void;
  onSelectCase: (caseId: SimulatedCaseId) => void;
}

export const GpsCard: React.FC<GpsCardProps> = ({
  latitude,
  longitude,
  lateMinutes,
  simulatedCase,
  onGpsChange,
  onLateMinutesChange,
  onSelectCase,
}) => {
  const [useRealGps, setUseRealGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const currentDistance = haversineDistance(
    latitude,
    longitude,
    DEFAULT_CLASSROOM.latitude,
    DEFAULT_CLASSROOM.longitude
  );

  const handleGetRealLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation tidak didukung browser ini.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setUseRealGps(true);
        onSelectCase('CUSTOM');
        onGpsChange(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setIsLocating(false);
        setGpsError(`Gagal mendapatkan lokasi GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const selectPresetCase = (caseId: SimulatedCaseId) => {
    setUseRealGps(false);
    onSelectCase(caseId);

    // Apply exact preset distances & times according to Modul 13 Panduan Page 15
    if (caseId === 'M1') {
      const coords = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 20);
      onGpsChange(coords.latitude, coords.longitude);
      onLateMinutesChange(5);
    } else if (caseId === 'M2') {
      const coords = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 50);
      onGpsChange(coords.latitude, coords.longitude);
      onLateMinutesChange(15);
    } else if (caseId === 'M3') {
      const coords = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 15);
      onGpsChange(coords.latitude, coords.longitude);
      onLateMinutesChange(3);
    } else if (caseId === 'M4') {
      const coords = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 70);
      onGpsChange(coords.latitude, coords.longitude);
      onLateMinutesChange(0);
    } else if (caseId === 'M5') {
      const coords = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 10);
      onGpsChange(coords.latitude, coords.longitude);
      onLateMinutesChange(2);
    } else if (caseId === 'M6') {
      const coords = getCoordinatesAtDistance(DEFAULT_CLASSROOM.latitude, DEFAULT_CLASSROOM.longitude, 30);
      onGpsChange(coords.latitude, coords.longitude);
      onLateMinutesChange(28);
    }
  };

  // Set initial default to M1 if not set
  useEffect(() => {
    if (simulatedCase === 'M1' && latitude === 0 && longitude === 0) {
      selectPresetCase('M1');
    }
  }, [simulatedCase, latitude, longitude]);

  // Determine Distance Category
  let distanceBadge = {
    label: 'Valid (≤ 50m)',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };
  if (currentDistance > 100) {
    distanceBadge = {
      label: 'Di Luar Batas (> 100m)',
      color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };
  } else if (currentDistance > 50) {
    distanceBadge = {
      label: 'Toleransi Drift Gedung (51-100m)',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    };
  }

  // Determine Late Category
  let lateBadge = {
    label: 'Tepat Waktu (≤ 15m)',
    color: 'text-emerald-400',
  };
  if (lateMinutes > 30) {
    lateBadge = {
      label: 'Terlambat Berat (> 30m)',
      color: 'text-rose-400',
    };
  } else if (lateMinutes > 15) {
    lateBadge = {
      label: 'Terlambat Sah (16-30m)',
      color: 'text-amber-300',
    };
  }

  return (
    <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Geolokasi & Waktu Presensi</h3>
            <p className="text-xs text-slate-400">Verifikasi Radius Presensi Haversine (Maks 50m)</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGetRealLocation}
          disabled={isLocating}
          className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition ${
            useRealGps
              ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
              : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 border-slate-600'
          }`}
          title="Ambil koordinat GPS asli dari sensor perangkat Anda"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Mencari...' : useRealGps ? 'GPS Asli Aktif' : 'Gunakan GPS Asli'}</span>
        </button>
      </div>

      {gpsError && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
          {gpsError}
        </div>
      )}

      {/* Target Classroom & Distance Monitor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-700/60">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Titik Acuan Kelas</span>
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
          </div>
          <div className="text-sm font-medium text-slate-200 truncate">{DEFAULT_CLASSROOM.name}</div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Lat: {DEFAULT_CLASSROOM.latitude.toFixed(6)}, Lon: {DEFAULT_CLASSROOM.longitude.toFixed(6)}
          </div>
        </div>

        <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-700/60 flex flex-col justify-between">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Jarak ke Ruang Kelas</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${distanceBadge.color}`}>
              {distanceBadge.label}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {currentDistance} <span className="text-xs text-slate-400 font-sans font-normal">meter</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Posisi: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </div>
        </div>
      </div>

      {/* Quick Simulation Presets (M1-M6 from Modul 13 Panduan) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Uji Simulasi Kasus Modul 13 (M1 - M6):
          </span>
          <span className="text-[11px] text-cyan-400">Pilih skenario siap uji</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: 'M1', label: 'M1: Normal', desc: 'Jarak 20m, Telat 5m, Wajah 0.92', badge: 'Hadir' },
            { id: 'M2', label: 'M2: Batas Toleransi', desc: 'Jarak 50m, Telat 15m, Wajah 0.85', badge: 'Hadir' },
            { id: 'M3', label: 'M3: Kacamata/Redup', desc: 'Jarak 15m, Telat 3m, Wajah 0.78', badge: 'Oversight' },
            { id: 'M4', label: 'M4: GPS Drift Gedung', desc: 'Jarak 70m, Telat 0m, Wajah 0.95', badge: 'Oversight' },
            { id: 'M5', label: 'M5: Foto Lama 6 Thn', desc: 'Jarak 10m, Telat 2m, Wajah 0.40', badge: 'Oversight' },
            { id: 'M6', label: 'M6: Terlambat 28m', desc: 'Jarak 30m, Telat 28m, Wajah 0.91', badge: 'Terlambat' },
          ].map((item) => {
            const isSelected = simulatedCase === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectPresetCase(item.id as SimulatedCaseId)}
                className={`p-2.5 rounded-xl text-left border transition-all ${
                  isSelected
                    ? 'bg-blue-600/30 border-blue-500 shadow-md shadow-blue-500/20'
                    : 'bg-slate-900/50 hover:bg-slate-900 border-slate-700/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{item.label}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      item.badge === 'Hadir'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : item.badge === 'Oversight'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-yellow-500/20 text-yellow-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slider Keterlambatan Waktu */}
      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center space-x-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Waktu Keterlambatan Mahasiswa:</span>
          </span>
          <span className={`font-mono font-bold ${lateBadge.color}`}>
            {lateMinutes} Menit ({lateBadge.label})
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="60"
          step="1"
          value={lateMinutes}
          onChange={(e) => {
            onSelectCase('CUSTOM');
            onLateMinutesChange(parseInt(e.target.value, 10));
          }}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0m (Tepat Waktu)</span>
          <span>15m (Batas Hadir)</span>
          <span>30m (Batas Terlambat)</span>
          <span>60m (Tidak Sah)</span>
        </div>
      </div>

      {/* UU PDP Protection Hint */}
      <div className="flex items-start space-x-2 text-[11px] text-blue-300 bg-blue-950/40 border border-blue-500/20 p-2.5 rounded-lg">
        <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Perlindungan Mahasiswa (UU PDP No. 27/2022): </span>
          Kondisi anomali fisik (sinyal GPS drift &gt;50m atau kacamata baru) tidak otomatis digugurkan, melainkan dialihkan untuk verifikasi manual dosen (Human-in-the-loop).
        </div>
      </div>
    </div>
  );
};
