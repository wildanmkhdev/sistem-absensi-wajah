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
    <div className={`bg-white rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col ${className}`}>
      {/* Map Interactive / Schematic View */}
      <div className="relative w-full h-56 bg-slate-100 overflow-hidden flex items-center justify-center">
        {/* Stylized Modern Vector Map Canvas */}
        <svg
          viewBox="0 0 500 240"
          className="w-full h-full object-cover select-none pointer-events-none opacity-90"
        >
          {/* Base Roads and Terrains */}
          <rect width="500" height="240" fill="#F1F5F9" />

          {/* Park / Campus Green Areas */}
          <path
            d="M 40 20 Q 120 40 160 110 T 60 190 Z"
            fill="#E2F5EA"
          />
          <path
            d="M 340 30 Q 420 50 460 120 T 380 200 Z"
            fill="#E2F5EA"
          />

          {/* Road Network Grids */}
          <path
            d="M 0 70 L 500 85 M 0 170 L 500 155 M 180 0 L 195 240 M 320 0 L 305 240"
            stroke="#FFFFFF"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M 0 70 L 500 85 M 0 170 L 500 155 M 180 0 L 195 240 M 320 0 L 305 240"
            stroke="#CBD5E1"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Secondary Pathways */}
          <path
            d="M 120 70 Q 250 120 380 160"
            stroke="#FFFFFF"
            strokeWidth="10"
            fill="none"
          />

          {/* Campus Buildings Schematic */}
          <rect x="210" y="30" width="80" height="45" rx="6" fill="#E2E8F0" />
          <text x="250" y="56" fontSize="9" fontWeight="bold" fill="#64748B" textAnchor="middle">
            Gedung B Lt. 3
          </text>

          <rect x="90" y="125" width="65" height="40" rx="6" fill="#E2E8F0" />
          <text x="122" y="148" fontSize="8" fontWeight="bold" fill="#94A3B8" textAnchor="middle">
            Gedung A
          </text>

          <rect x="340" y="80" width="70" height="40" rx="6" fill="#E2E8F0" />
          <text x="375" y="103" fontSize="8" fontWeight="bold" fill="#94A3B8" textAnchor="middle">
            Lab Komputer
          </text>

          {/* Geofence 50m Radius Circle (Around Classroom Center at 250, 115) */}
          <circle
            cx="250"
            cy="115"
            r="65"
            fill="rgba(16, 185, 129, 0.12)"
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <text x="250" y="195" fontSize="8" fontWeight="bold" fill="#059669" textAnchor="middle">
            Radius Geofence Valid (50m)
          </text>

          {/* User Location Marker with Pulse Radar */}
          <circle
            cx="250"
            cy="115"
            r="18"
            fill="rgba(249, 115, 22, 0.25)"
            className="animate-pulse"
          />
          <circle
            cx="250"
            cy="115"
            r="8"
            fill="#FF7A00"
            stroke="#FFFFFF"
            strokeWidth="3"
          />
        </svg>

        {/* Floating Controls on Map */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xs border border-slate-100 flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-orange-500" />
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
              Lokasi Presensi
            </span>
            <span className="text-xs font-bold text-slate-700">
              {DEFAULT_CLASSROOM.name}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGetLiveLocation}
          disabled={isLocating}
          className="absolute top-3 right-3 bg-white/95 backdrop-blur-md hover:bg-orange-50 text-slate-700 hover:text-orange-600 p-2.5 rounded-2xl shadow-md border border-slate-100 transition active:scale-95 cursor-pointer flex items-center justify-center"
          title="Ambil titik GPS Asli perangkat"
        >
          <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-orange-500' : 'text-slate-600'}`} />
        </button>

        {/* Live Distance Pill Over Map */}
        <div className="absolute bottom-3 right-3">
          <span
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md ${
              isValidRadius
                ? 'bg-emerald-500/90 text-white'
                : isDriftTolerated
                ? 'bg-amber-500/90 text-white'
                : 'bg-rose-500/90 text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>{currentDistance} meter ke kelas</span>
          </span>
        </div>
      </div>

      {/* Bottom Sheet / Card Information (Exact Dribbble layout) */}
      <div className="p-5 space-y-4">
        {locatingError && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-2xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{locatingError}</span>
          </div>
        )}

        <div>
          <span className="text-xs font-bold text-slate-400 block">Lokasi Anda Saat Ini</span>
          <div className="flex items-start space-x-2.5 mt-1">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Gedung B Lt. 3 — Ruang Lab Artificial Intelligence
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Kampus A, Jl. Merdeka Ilmu No. 45, S1 Informatika
              </p>
            </div>
          </div>
        </div>

        {/* Status Verification Badge */}
        <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isValidRadius ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : isDriftTolerated ? (
              <Compass className="w-4 h-4 text-amber-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            )}
            <div>
              <span className="text-xs font-bold text-slate-700 block">
                {isValidRadius
                  ? 'Dalam Radius Geofence (≤ 50 meter)'
                  : isDriftTolerated
                  ? 'Toleransi Drift Sinyal Gedung (51-100m)'
                  : 'Di Luar Radius Kuliah (> 100m)'}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                Lat: {latitude.toFixed(6)}, Lon: {longitude.toFixed(6)}
              </span>
            </div>
          </div>

          <span
            className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
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

        {/* LANJUTKAN Primary Action Button (Matches Dribbble orange pill) */}
        {onProceedToCamera && (
          <button
            type="button"
            onClick={onProceedToCamera}
            className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 active:scale-[0.99] transition duration-150 cursor-pointer flex items-center justify-center space-x-2"
          >
            <span>LANJUTKAN KE PEMINDAI WAJAH</span>
          </button>
        )}
      </div>
    </div>
  );
};
