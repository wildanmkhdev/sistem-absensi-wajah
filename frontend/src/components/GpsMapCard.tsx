import React, { useState } from 'react';
import { MapPin, Navigation, Compass, CheckCircle2, AlertTriangle, Building2, Radio } from 'lucide-react';
import { DEFAULT_CLASSROOM } from '../config';
import { haversineDistance } from '../utils/geo';
import type { SimulatedCaseId } from '../types';

interface GpsMapCardProps {
  latitude: number;
  longitude: number;
  onGpsChange?: (lat: number, lon: number) => void;
  onProceedToCamera?: () => void;
  onSelectCase?: (caseId: SimulatedCaseId) => void;
  className?: string;
}

export const GpsMapCard: React.FC<GpsMapCardProps> = ({
  latitude,
  longitude,
  onGpsChange,
  onProceedToCamera,
  onSelectCase,
  className = '',
}) => {
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locatingError, setLocatingError] = useState<string | null>(null);

  const currentDistance = Math.round(
    haversineDistance(
      latitude,
      longitude,
      DEFAULT_CLASSROOM.latitude,
      DEFAULT_CLASSROOM.longitude
    )
  );

  const isValidRadius = currentDistance <= DEFAULT_CLASSROOM.maxDistanceMeters;
  const isDriftTolerated = currentDistance <= 100;

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
        if (onGpsChange) {
          onGpsChange(pos.coords.latitude, pos.coords.longitude);
        }
        if (onSelectCase) {
          onSelectCase('CUSTOM');
        }
      },
      (err) => {
        setIsLocating(false);
        setLocatingError(`Gagal membaca sinyal GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col ${className}`}>
      {/* Map Schematic View - Compact Height */}
      <div className="relative w-full h-40 sm:h-48 bg-slate-100 overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 500 200"
          className="w-full h-full object-cover select-none pointer-events-none"
        >
          {/* Base Background */}
          <rect width="500" height="200" fill="#F8FAFC" />

          {/* Park Green Areas */}
          <path d="M 30 10 Q 100 30 130 90 T 50 160 Z" fill="#F0FDF4" />
          <path d="M 360 20 Q 430 40 470 100 T 400 170 Z" fill="#F0FDF4" />

          {/* Road Network */}
          <path
            d="M 0 60 L 500 70 M 0 140 L 500 130 M 170 0 L 180 200 M 320 0 L 310 200"
            stroke="#FFFFFF"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M 0 60 L 500 70 M 0 140 L 500 130 M 170 0 L 180 200 M 320 0 L 310 200"
            stroke="#CBD5E1"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Buildings */}
          <rect x="210" y="20" width="80" height="35" rx="5" fill="#E2E8F0" />
          <text x="250" y="42" fontSize="9" fontWeight="bold" fill="#64748B" textAnchor="middle">
            Gedung B Lt. 3
          </text>

          {/* Geofence 50m Radius Circle */}
          <circle
            cx="250"
            cy="100"
            r="55"
            fill="rgba(20, 184, 166, 0.12)"
            stroke="#0D9488"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />

          {/* User Location Marker - Solid Pastel Teal */}
          <circle cx="250" cy="100" r="14" fill="rgba(13, 148, 136, 0.2)" />
          <circle cx="250" cy="100" r="6" fill="#0D9488" stroke="#FFFFFF" strokeWidth="2.5" />
        </svg>

        {/* Floating Top Controls */}
        <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-xs border border-slate-200/80 flex items-center space-x-1.5 text-xs font-bold text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-teal-600" />
          <span className="text-[11px] truncate max-w-[170px]">{DEFAULT_CLASSROOM.name}</span>
        </div>

        <button
          type="button"
          onClick={handleGetLiveLocation}
          disabled={isLocating}
          className="absolute top-2.5 right-2.5 bg-white hover:bg-slate-50 text-slate-700 p-2 rounded-lg shadow-xs border border-slate-200/80 transition cursor-pointer flex items-center space-x-1 text-xs font-semibold"
          title="Sinkronkan GPS Asli"
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-teal-600' : 'text-slate-600'}`} />
          <span className="hidden sm:inline text-[11px]">{isLocating ? 'GPS...' : 'GPS Asli'}</span>
        </button>

        {/* Live Distance Pill Over Map */}
        <div className="absolute bottom-2.5 right-2.5">
          <span
            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold shadow-xs ${
              isValidRadius
                ? 'bg-teal-600 text-white'
                : isDriftTolerated
                ? 'bg-amber-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            <Radio className="w-3 h-3 animate-pulse" />
            <span>{currentDistance}m ke kelas</span>
          </span>
        </div>
      </div>

      {/* Card Info Bottom */}
      <div className="p-3.5 sm:p-4 space-y-3">
        {locatingError && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{locatingError}</span>
          </div>
        )}

        <div className="flex items-start space-x-2 text-xs">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-xs">
              Gedung B Lt. 3 — Lab Artificial Intelligence
            </h4>
            <p className="text-[11px] text-slate-500">
              Kampus A, S1 Informatika
            </p>
          </div>
        </div>

        {/* Status Verification Badge */}
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {isValidRadius ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : isDriftTolerated ? (
              <Compass className="w-4 h-4 text-amber-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            )}
            <div>
              <span className="font-bold text-slate-700 block text-[11px]">
                {isValidRadius
                  ? 'Dalam Radius Valid (≤ 50 meter)'
                  : isDriftTolerated
                  ? 'Toleransi Drift Gedung (51-100m)'
                  : 'Di Luar Radius Kuliah (> 100m)'}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                Lat: {latitude.toFixed(5)}, Lon: {longitude.toFixed(5)}
              </span>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              isValidRadius
                ? 'bg-emerald-100 text-emerald-800'
                : isDriftTolerated
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {isValidRadius ? 'Valid' : isDriftTolerated ? 'Oversight' : 'Jauh'}
          </span>
        </div>

        {/* Action Button - Solid Flat Teal */}
        {onProceedToCamera && (
          <button
            type="button"
            onClick={onProceedToCamera}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <span>Lanjutkan ke Pemindai Wajah</span>
          </button>
        )}
      </div>
    </div>
  );
};
