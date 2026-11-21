import React, { useState } from 'react';
import { AlertTriangle, MapPin, Navigation } from 'lucide-react';
import { DEFAULT_CLASSROOM } from '../config';
import { haversineDistance } from '../utils/geo';

interface GpsMapCardProps {
  latitude: number | null;
  longitude: number | null;
  onGpsChange: (lat: number, lon: number) => void;
}

export const GpsMapCard: React.FC<GpsMapCardProps> = ({ latitude, longitude, onGpsChange }) => {
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locatingError, setLocatingError] = useState<string | null>(null);

  const currentDistance =
    latitude !== null && longitude !== null
      ? Math.round(
          haversineDistance(
            latitude,
            longitude,
            DEFAULT_CLASSROOM.latitude,
            DEFAULT_CLASSROOM.longitude
          )
        )
      : null;

  const status =
    currentDistance === null
      ? {
          label: 'Belum ada GPS',
          className: 'bg-slate-100 text-slate-600 border-slate-200',
        }
      : currentDistance <= DEFAULT_CLASSROOM.maxDistanceMeters
      ? {
          label: 'Valid ≤50m',
          className: 'bg-teal-50 text-teal-700 border-teal-200/80',
        }
      : currentDistance <= 100
      ? {
          label: 'Drift 51–100m',
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
        }
      : {
          label: 'Di luar area >100m',
          className: 'bg-rose-50 text-rose-700 border-rose-200/80',
        };

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
        onGpsChange(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setIsLocating(false);
        setLocatingError(`Gagal membaca sinyal GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
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
            <span className="text-xs font-bold text-slate-800">Lokasi Kelas</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${status.className}`}
            >
              {status.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium truncate">
            {currentDistance === null
              ? 'Lokasi belum aktif'
              : `${currentDistance}m dari titik kelas`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleGetLiveLocation}
          disabled={isLocating}
          className="shrink-0 inline-flex items-center space-x-1.5 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500 px-3 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Membaca GPS...' : 'Gunakan GPS'}</span>
        </button>
      </div>

      {locatingError && (
        <div className="flex items-start space-x-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-2 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
          <span>{locatingError}</span>
        </div>
      )}
    </div>
  );
};
