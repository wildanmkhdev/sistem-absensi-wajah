import React, { useState } from 'react';
import { AlertTriangle, MapPin, Navigation, ShieldAlert, ShieldCheck } from 'lucide-react';
import { haversineDistance } from '../utils/geo';

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
}

export const GpsMapCard: React.FC<GpsMapCardProps> = ({
  latitude,
  longitude,
  accuracy,
  onGpsChange,
  target,
}) => {
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locatingError, setLocatingError] = useState<string | null>(null);

  const currentDistance =
    latitude !== null && longitude !== null && target
      ? Math.round(haversineDistance(latitude, longitude, target.latitude, target.longitude))
      : null;

  const radius = target?.radiusMeters ?? 50;

  const status =
    currentDistance === null
      ? {
          label: target ? 'Belum ada GPS' : 'Pilih sesi kuliah dahulu',
          className: 'bg-slate-100 text-slate-600 border-slate-200',
        }
      : currentDistance <= radius
      ? {
          label: `Valid ≤${radius}m`,
          className: 'bg-teal-50 text-teal-700 border-teal-200/80',
        }
      : currentDistance <= radius * 2
      ? {
          label: `Drift ${radius + 1}–${radius * 2}m`,
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
        }
      : {
          label: `Di luar area >${radius * 2}m`,
          className: 'bg-rose-50 text-rose-700 border-rose-200/80',
        };

  const isAccuracyPoor = accuracy !== null && accuracy > 50;

  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocatingError('Browser tidak mendukung geolokasi GPS.');
      return;
    }

    setIsLocating(true);
    setLocatingError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const acc = pos.coords.accuracy || 10;
        onGpsChange(pos.coords.latitude, pos.coords.longitude, acc);
      },
      (err) => {
        setIsLocating(false);
        setLocatingError(`Gagal membaca sinyal GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-2">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-800">
              {target?.roomName || 'Lokasi Sesi'}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${status.className}`}
            >
              {status.label}
            </span>
            {accuracy !== null && (
              <span
                className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                  isAccuracyPoor
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {isAccuracyPoor ? (
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                ) : (
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                )}
                ±{Math.round(accuracy)}m
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium truncate">
            {currentDistance === null
              ? target
                ? 'Klik Gunakan GPS untuk validasi posisi'
                : 'Pilih sesi di atas terlebih dahulu'
              : `${currentDistance}m dari titik pusat ruang kelas`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleGetLiveLocation}
          disabled={isLocating}
          className="shrink-0 inline-flex items-center space-x-1.5 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500 px-3 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Mencari...' : 'Gunakan GPS'}</span>
        </button>
      </div>

      {isAccuracyPoor && (
        <div className="flex items-start space-x-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-2 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
          <span>
            Akurasi GPS ±{Math.round(accuracy)}m melebihi batas 50m. Pindah ke dekat jendela atau luar ruangan sebelum kirim.
          </span>
        </div>
      )}

      {locatingError && (
        <div className="flex items-start space-x-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-2 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
          <span>{locatingError}</span>
        </div>
      )}
    </div>
  );
};
