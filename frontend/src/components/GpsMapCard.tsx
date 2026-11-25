import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { formatDistance, getCoordinatesAtDistance, haversineDistance } from '../utils/geo';
import { IconGpsRadar } from './icons/FlaticonIcons';
import { DEFAULT_CLASSROOM } from '../config';

interface TargetLocation {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  roomName?: string | null;
}

interface GpsMapCardProps {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  onGpsChange: (lat: number, lon: number, accuracy: number) => void;
  target?: TargetLocation | null;
  simulatedLateMinutes?: number;
  onLateMinutesChange?: (minutes: number) => void;
}

type ScenarioType = 'real' | 'in_class' | 'drift' | 'outside' | 'city' | 'custom' | null;

export const GpsMapCard: React.FC<GpsMapCardProps> = ({
  latitude,
  longitude,
  accuracy,
  onGpsChange,
  target,
  simulatedLateMinutes = 5,
  onLateMinutesChange,
}) => {
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locatingError, setLocatingError] = useState<string | null>(null);
  const [showSimPanel, setShowSimPanel] = useState<boolean>(true);
  const [activeScenario, setActiveScenario] = useState<ScenarioType>(null);

  // Fallback ke UINSU Tuntungan bila target sesi belum dipilih
  const effectiveTarget: TargetLocation = target || {
    latitude: DEFAULT_CLASSROOM.latitude,
    longitude: DEFAULT_CLASSROOM.longitude,
    radiusMeters: DEFAULT_CLASSROOM.maxDistanceMeters,
    roomName: DEFAULT_CLASSROOM.name,
  };

  const [customLat, setCustomLat] = useState<string>(
    latitude !== null ? latitude.toFixed(6) : effectiveTarget.latitude.toFixed(6)
  );
  const [customLon, setCustomLon] = useState<string>(
    longitude !== null ? longitude.toFixed(6) : effectiveTarget.longitude.toFixed(6)
  );

  // Sinkronkan input manual jika koordinat berubah dari luar
  useEffect(() => {
    if (latitude !== null) setCustomLat(latitude.toFixed(6));
    if (longitude !== null) setCustomLon(longitude.toFixed(6));
  }, [latitude, longitude]);

  const currentDistance =
    latitude !== null && longitude !== null
      ? Math.round(
          haversineDistance(
            latitude,
            longitude,
            effectiveTarget.latitude,
            effectiveTarget.longitude
          )
        )
      : null;

  const radius = effectiveTarget.radiusMeters || 50;

  const status =
    currentDistance === null
      ? {
          label: 'Menunggu GPS',
          desc: 'Gunakan GPS asli perangkat atau pilih skenario simulasi uji coba di bawah.',
          tagClass: 'hlb-tag neutral',
          alertClass: 'hlb-alert info',
        }
      : currentDistance <= radius
      ? {
          label: `Valid ≤${radius}m`,
          desc: 'Presensi sah: posisi berada di dalam radius ruang kelas UINSU.',
          tagClass: 'hlb-tag ok',
          alertClass: 'hlb-alert success',
        }
      : currentDistance <= radius * 2
      ? {
          label: `GPS Drift (${radius + 1}–${radius * 2}m)`,
          desc: 'Pasal 34 UU PDP: Sinyal terdegradasi beton gedung, dialihkan ke verifikasi dosen.',
          tagClass: 'hlb-tag paper',
          alertClass: 'hlb-alert info',
        }
      : {
          label: `Luar Geofence >${radius * 2}m`,
          desc: `Jarak terlalu jauh (${formatDistance(currentDistance)} dari UINSU Tuntungan). Presensi akan ditolak otomatis.`,
          tagClass: 'hlb-tag warn',
          alertClass: 'hlb-alert danger',
        };

  const isAccuracyPoor = accuracy !== null && accuracy > 50;

  // 1. Ambil GPS asli dari perangkat browser
  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocatingError('Browser tidak mendukung sensor geolokasi GPS.');
      return;
    }

    setIsLocating(true);
    setLocatingError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const acc = pos.coords.accuracy || 10;
        setActiveScenario('real');
        onGpsChange(pos.coords.latitude, pos.coords.longitude, acc);
      },
      (err) => {
        setIsLocating(false);
        setLocatingError(`Gagal membaca sinyal GPS: ${err.message}. Pastikan izin lokasi aktif.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // 2. Terapkan skenario preset simulasi prototype
  const applyPresetScenario = (scenario: 'in_class' | 'drift' | 'outside' | 'city') => {
    setLocatingError(null);
    setActiveScenario(scenario);

    if (scenario === 'in_class') {
      // 15 meter dari target UINSU Tuntungan (SAH)
      const c = getCoordinatesAtDistance(effectiveTarget.latitude, effectiveTarget.longitude, 15);
      onGpsChange(c.latitude, c.longitude, 5);
    } else if (scenario === 'drift') {
      // 70 meter dari target UINSU Tuntungan (Human Oversight UU PDP)
      const c = getCoordinatesAtDistance(effectiveTarget.latitude, effectiveTarget.longitude, 70);
      onGpsChange(c.latitude, c.longitude, 35);
    } else if (scenario === 'outside') {
      // 500 meter di luar gerbang kampus UINSU
      const c = getCoordinatesAtDistance(effectiveTarget.latitude, effectiveTarget.longitude, 500);
      onGpsChange(c.latitude, c.longitude, 15);
    } else if (scenario === 'city') {
      // Pusat Kota Medan (~18 km dari UINSU Tuntungan)
      onGpsChange(3.592200, 98.678300, 15);
    }
  };

  // 3. Terapkan input manual kustom
  const applyCustomCoordinates = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      setLocatingError('Latitude dan Longitude harus berupa angka yang valid.');
      return;
    }

    setLocatingError(null);
    setActiveScenario('custom');
    onGpsChange(lat, lon, 10);
  };

  const gmapsDirUrl =
    latitude !== null && longitude !== null
      ? `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${effectiveTarget.latitude},${effectiveTarget.longitude}`
      : `https://www.google.com/maps?q=${effectiveTarget.latitude},${effectiveTarget.longitude}`;

  return (
    <div className="hlb-panel p-4 sm:p-5 space-y-4">
      {/* Target Location Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-[var(--edge)]">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[var(--paper)] border-2 border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)] flex items-center justify-center shrink-0 text-[var(--ink)]">
            <IconGpsRadar className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-normal text-lg sm:text-xl text-[var(--ink)] leading-tight truncate">
              {effectiveTarget.roomName}
            </h3>
            <p className="text-[11px] text-[var(--soft)] font-mono mt-0.5 tabular-nums">
              Target: {effectiveTarget.latitude.toFixed(6)}, {effectiveTarget.longitude.toFixed(6)} • Geofence ≤{radius}m
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <a
            href={gmapsDirUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hlb-btn-secondary font-mono text-[11px] uppercase tracking-wider px-3 py-2 flex items-center space-x-1.5 cursor-pointer"
            title="Buka titik target di Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Maps</span>
          </a>

          <button
            type="button"
            onClick={handleGetLiveLocation}
            disabled={isLocating}
            className="hlb-btn-primary text-[11px] uppercase tracking-wider px-3.5 py-2 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            title="Deteksi posisi GPS asli perangkat saat ini"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Mendeteksi...' : 'GPS Asli Saya'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Distance & Geofence Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="hlb-tile bg-[var(--bg)] p-3 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)]">
            Status Geofence
          </span>
          <span className={status.tagClass}>{status.label}</span>
        </div>

        <div className="hlb-tile bg-[var(--bg)] p-3 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)]">
            Jarak ke UINSU
          </span>
          <div className="text-right">
            <span className="font-display font-normal text-xl text-[var(--ink)] leading-none tabular-nums">
              {formatDistance(currentDistance)}
            </span>
            {currentDistance !== null && currentDistance >= 1000 && (
              <span className="text-[10px] text-[var(--soft)] font-mono block tabular-nums">
                ({currentDistance.toLocaleString('id-ID')} meter)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status explanation callout */}
      {currentDistance !== null && (
        <div className={`${status.alertClass} p-3 text-xs leading-relaxed font-sans`}>
          <p className="font-semibold text-[var(--ink)]">{status.desc}</p>
        </div>
      )}

      {/* Coordinate Display */}
      {latitude !== null && longitude !== null && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper)] border-2 border-[var(--edge)] text-[11px] font-mono text-[var(--ink)] tabular-nums">
          <span className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--ink)] shrink-0" />
            <span>
              Posisi: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </span>
          </span>
          {accuracy !== null && (
            <span className="flex items-center space-x-1 font-semibold">
              {isAccuracyPoor ? (
                <ShieldAlert className="w-3.5 h-3.5 text-[var(--red)]" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--green)]" />
              )}
              <span>±{Math.round(accuracy)}m</span>
            </span>
          )}
        </div>
      )}

      {/* Prototype Testing Panel */}
      <div className="pt-3 space-y-3 border-t-2 border-[var(--edge)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--blue)] shrink-0" />
            <span>Simulasi Uji Coba Prototype</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSimPanel((prev) => !prev)}
            className="hlb-chip font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 flex items-center space-x-1 cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{showSimPanel ? 'Sembunyikan' : 'Buka Panel'}</span>
          </button>
        </div>

        {showSimPanel && (
          <div className="space-y-3.5 p-3.5 rounded-xl bg-[var(--bg)] border-2 border-[var(--edge)]">
            <p className="font-sans text-xs text-[var(--soft)] leading-relaxed">
              Karena tahap pengujian prototype, Anda dapat memilih preset jarak untuk menguji logika sistem:
            </p>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPresetScenario('in_class')}
                className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer text-xs ${
                  activeScenario === 'in_class'
                    ? 'bg-[var(--yellow)] text-[var(--on-yellow)] border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)]'
                    : 'bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--ink)] border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)]'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <MapPin
                    className={`w-3.5 h-3.5 shrink-0 ${
                      activeScenario === 'in_class' ? 'text-[var(--on-yellow)]' : 'text-[var(--green)]'
                    }`}
                  />
                  <span className="font-sans font-semibold text-xs">Dalam Kelas</span>
                </div>
                <div
                  className={`text-[10px] font-mono mt-1 ${
                    activeScenario === 'in_class' ? 'text-[var(--on-yellow-soft)]' : 'text-[var(--soft)]'
                  }`}
                >
                  ~15 m (Sah)
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPresetScenario('drift')}
                className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer text-xs ${
                  activeScenario === 'drift'
                    ? 'bg-[var(--yellow)] text-[var(--on-yellow)] border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)]'
                    : 'bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--ink)] border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)]'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Compass
                    className={`w-3.5 h-3.5 shrink-0 ${
                      activeScenario === 'drift' ? 'text-[var(--on-yellow)]' : 'text-[var(--orange)]'
                    }`}
                  />
                  <span className="font-sans font-semibold text-xs">GPS Drift</span>
                </div>
                <div
                  className={`text-[10px] font-mono mt-1 ${
                    activeScenario === 'drift' ? 'text-[var(--on-yellow-soft)]' : 'text-[var(--soft)]'
                  }`}
                >
                  ~70 m (Oversight)
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPresetScenario('outside')}
                className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer text-xs ${
                  activeScenario === 'outside'
                    ? 'bg-[var(--yellow)] text-[var(--on-yellow)] border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)]'
                    : 'bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--ink)] border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)]'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Building2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      activeScenario === 'outside' ? 'text-[var(--on-yellow)]' : 'text-[var(--red)]'
                    }`}
                  />
                  <span className="font-sans font-semibold text-xs">Luar Kampus</span>
                </div>
                <div
                  className={`text-[10px] font-mono mt-1 ${
                    activeScenario === 'outside' ? 'text-[var(--on-yellow-soft)]' : 'text-[var(--soft)]'
                  }`}
                >
                  ~500 m (Tolak)
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPresetScenario('city')}
                className={`p-2.5 rounded-xl border-2 text-left transition cursor-pointer text-xs ${
                  activeScenario === 'city'
                    ? 'bg-[var(--yellow)] text-[var(--on-yellow)] border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)]'
                    : 'bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--ink)] border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)]'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <Navigation
                    className={`w-3.5 h-3.5 shrink-0 ${
                      activeScenario === 'city' ? 'text-[var(--on-yellow)]' : 'text-[var(--red)]'
                    }`}
                  />
                  <span className="font-sans font-semibold text-xs">Medan Kota</span>
                </div>
                <div
                  className={`text-[10px] font-mono mt-1 ${
                    activeScenario === 'city' ? 'text-[var(--on-yellow-soft)]' : 'text-[var(--soft)]'
                  }`}
                >
                  ~18.4 km (Jauh)
                </div>
              </button>
            </div>

            {/* Custom Coordinate Manual Input */}
            <form onSubmit={applyCustomCoordinates} className="pt-2.5 border-t border-[var(--line)]">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)] block mb-1.5">
                Atau Masukkan Koordinat Manual:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Latitude"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="hlb-input w-full text-xs font-mono px-3 py-2 tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Longitude"
                    value={customLon}
                    onChange={(e) => setCustomLon(e.target.value)}
                    className="hlb-input w-full text-xs font-mono px-3 py-2 tabular-nums"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="hlb-btn-secondary w-full h-9 font-mono text-[11px] uppercase tracking-wider flex items-center justify-center cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </form>

            {/* Waktu Kedatangan / Keterlambatan */}
            {onLateMinutesChange && (
              <div className="pt-2.5 border-t border-[var(--line)] space-y-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)] block">
                  Simulasi Waktu Kedatangan Mahasiswa:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onLateMinutesChange(5)}
                    className={`p-2.5 rounded-xl border-2 text-center transition cursor-pointer text-xs ${
                      simulatedLateMinutes <= 15
                        ? 'bg-[var(--yellow)] text-[var(--on-yellow)] border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)]'
                        : 'bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--ink)] border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)]'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 mx-auto mb-1 ${
                        simulatedLateMinutes <= 15 ? 'text-[var(--on-yellow)]' : 'text-[var(--green)]'
                      }`}
                    />
                    <span className="block font-sans font-semibold">Tepat Waktu</span>
                    <span
                      className={`text-[10px] font-mono ${
                        simulatedLateMinutes <= 15 ? 'text-[var(--on-yellow-soft)]' : 'text-[var(--soft)]'
                      }`}
                    >
                      5m (Hadir Sah)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLateMinutesChange(20)}
                    className={`p-2.5 rounded-xl border-2 text-center transition cursor-pointer text-xs ${
                      simulatedLateMinutes > 15 && simulatedLateMinutes <= 30
                        ? 'bg-[var(--yellow)] text-[var(--on-yellow)] border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)]'
                        : 'bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--ink)] border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)]'
                    }`}
                  >
                    <Clock
                      className={`w-4 h-4 mx-auto mb-1 ${
                        simulatedLateMinutes > 15 && simulatedLateMinutes <= 30
                          ? 'text-[var(--on-yellow)]'
                          : 'text-[var(--orange)]'
                      }`}
                    />
                    <span className="block font-sans font-semibold">Terlambat</span>
                    <span
                      className={`text-[10px] font-mono ${
                        simulatedLateMinutes > 15 && simulatedLateMinutes <= 30
                          ? 'text-[var(--on-yellow-soft)]'
                          : 'text-[var(--soft)]'
                      }`}
                    >
                      20m (Sah Telat)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLateMinutesChange(35)}
                    className={`p-2.5 rounded-xl border-2 text-center transition cursor-pointer text-xs ${
                      simulatedLateMinutes > 30
                        ? 'bg-[var(--yellow)] text-[var(--on-yellow)] border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)]'
                        : 'bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--ink)] border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)]'
                    }`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 mx-auto mb-1 ${
                        simulatedLateMinutes > 30 ? 'text-[var(--on-yellow)]' : 'text-[var(--red)]'
                      }`}
                    />
                    <span className="block font-sans font-semibold">Lewat Batas</span>
                    <span
                      className={`text-[10px] font-mono ${
                        simulatedLateMinutes > 30 ? 'text-[var(--on-yellow-soft)]' : 'text-[var(--soft)]'
                      }`}
                    >
                      &gt;30m (Tolak)
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {locatingError && (
        <div className="hlb-alert danger flex items-center space-x-2 p-3 text-xs font-sans">
          <AlertTriangle className="w-4 h-4 text-[var(--red)] shrink-0" />
          <span>{locatingError}</span>
        </div>
      )}
    </div>
  );
};
