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
    tagClass: 'hlb-tag ok',
  };
  if (currentDistance > 100) {
    distanceBadge = {
      label: 'Di Luar Batas (> 100m)',
      tagClass: 'hlb-tag warn',
    };
  } else if (currentDistance > 50) {
    distanceBadge = {
      label: 'Toleransi Drift (51-100m)',
      tagClass: 'hlb-tag paper',
    };
  }

  // Determine Late Category
  let lateBadge = {
    label: 'Tepat Waktu (≤ 15m)',
    color: 'text-[var(--green)]',
  };
  if (lateMinutes > 30) {
    lateBadge = {
      label: 'Terlambat Berat (> 30m)',
      color: 'text-[var(--red)]',
    };
  } else if (lateMinutes > 15) {
    lateBadge = {
      label: 'Terlambat Sah (16-30m)',
      color: 'text-[var(--orange)]',
    };
  }

  return (
    <div className="hlb-panel p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[var(--edge)]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--paper)] border-2 border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)] flex items-center justify-center text-[var(--ink)] shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-normal text-xl text-[var(--ink)] leading-tight">
              Geolokasi &amp; Waktu Presensi
            </h3>
            <p className="font-sans text-xs text-[var(--soft)]">
              Verifikasi Radius Presensi Haversine (Maks 50m)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGetRealLocation}
          disabled={isLocating}
          className={`flex items-center space-x-1.5 text-xs uppercase tracking-wider px-3.5 py-2 cursor-pointer shrink-0 ${
            useRealGps ? 'hlb-btn-primary' : 'hlb-btn-secondary'
          }`}
          title="Ambil koordinat GPS asli dari sensor perangkat Anda"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Mencari...' : useRealGps ? 'GPS Asli Aktif' : 'Gunakan GPS Asli'}</span>
        </button>
      </div>

      {gpsError && (
        <div className="hlb-alert danger p-3 text-xs font-sans">
          {gpsError}
        </div>
      )}

      {/* Target Classroom & Distance Monitor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="hlb-tile p-3.5 bg-[var(--bg)] space-y-1">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)] flex items-center justify-between">
            <span>Titik Acuan Kelas</span>
            <Radio className="w-3.5 h-3.5 text-[var(--green)] animate-pulse" />
          </div>
          <div className="font-sans text-sm font-semibold text-[var(--ink)] truncate">
            {DEFAULT_CLASSROOM.name}
          </div>
          <div className="text-[11px] font-mono text-[var(--soft)] tabular-nums">
            Lat: {DEFAULT_CLASSROOM.latitude.toFixed(6)}, Lon: {DEFAULT_CLASSROOM.longitude.toFixed(6)}
          </div>
        </div>

        <div className="hlb-tile p-3.5 bg-[var(--bg)] flex flex-col justify-between gap-1.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)] flex items-center justify-between gap-2">
            <span>Jarak ke Kelas</span>
            <span className={distanceBadge.tagClass}>{distanceBadge.label}</span>
          </div>
          <div className="font-display font-normal text-3xl text-[var(--ink)] leading-none tabular-nums">
            {currentDistance}{' '}
            <span className="text-xs text-[var(--soft)] font-mono uppercase">meter</span>
          </div>
          <div className="text-[11px] font-mono text-[var(--soft)] tabular-nums">
            Posisi: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </div>
        </div>
      </div>

      {/* Quick Simulation Presets (M1-M6 from Modul 13 Panduan) */}
      <div className="pt-2 border-t border-[var(--line)]">
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-mono text-[11px] font-semibold text-[var(--ink)] uppercase tracking-wider">
            Uji Simulasi Kasus Modul 13 (M1 - M6)
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)]">
            Pilih skenario
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
                className={`p-2.5 rounded-xl text-left border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--yellow)] text-[var(--on-yellow)] border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)]'
                    : 'bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--ink)] border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-sans text-xs font-bold truncate">{item.label}</span>
                  <span
                    className={`hlb-tag shrink-0 ${
                      item.badge === 'Hadir'
                        ? 'ok'
                        : item.badge === 'Oversight'
                        ? 'paper'
                        : 'accent'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
                <div
                  className={`text-[10px] font-mono mt-1 line-clamp-1 ${
                    isSelected ? 'text-[var(--on-yellow-soft)]' : 'text-[var(--soft)]'
                  }`}
                >
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slider Keterlambatan Waktu */}
      <div className="p-3.5 rounded-xl bg-[var(--bg)] border-2 border-[var(--edge)] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center space-x-1.5 font-sans font-semibold text-[var(--ink)]">
            <Clock className="w-3.5 h-3.5 text-[var(--soft)]" />
            <span>Waktu Keterlambatan Mahasiswa:</span>
          </span>
          <span className={`font-mono font-semibold tabular-nums ${lateBadge.color}`}>
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
          className="w-full h-2 bg-[var(--surface)] border border-[var(--edge)] rounded-full appearance-none cursor-pointer accent-[var(--ink)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--soft)] font-mono">
          <span>0m (Tepat)</span>
          <span>15m (Batas Hadir)</span>
          <span>30m (Terlambat)</span>
          <span>60m (Tolak)</span>
        </div>
      </div>

      {/* UU PDP Protection Hint */}
      <div className="hlb-alert info p-3 flex items-start space-x-2.5 text-xs">
        <ShieldAlert className="w-4 h-4 text-[var(--ink)] shrink-0 mt-0.5" />
        <div className="font-sans leading-relaxed text-[var(--soft)]">
          <span className="font-semibold text-[var(--ink)]">Perlindungan Mahasiswa (UU PDP No. 27/2022): </span>
          Kondisi anomali fisik (sinyal GPS drift &gt;50m atau kacamata baru) tidak otomatis digugurkan, melainkan dialihkan untuk verifikasi manual dosen (Human-in-the-loop).
        </div>
      </div>
    </div>
  );
};
