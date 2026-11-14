import React from 'react';
import { Clock } from 'lucide-react';

interface RadialProgressGaugeProps {
  hours?: number;
  minutes?: number;
  label?: string;
  sublabel?: string;
  percentage?: number; // 0 to 100
  size?: number;
}

export const RadialProgressGauge: React.FC<RadialProgressGaugeProps> = ({
  hours = 6,
  minutes = 15,
  label = 'Sisa Durasi Kuliah',
  sublabel = 'Jadwal Kuliah: 08:00 - 15:00 WIB',
  percentage = 68,
  size = 175,
}) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="text-center mb-1">
        <span className="text-xs font-bold text-slate-800 block">
          {label}
        </span>
        {sublabel && (
          <span className="text-[10px] text-slate-400 font-medium block">
            {sublabel}
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* SVG Circle Progress - Solid Flat Teal Color (No Gradient, Single Color) */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active Progress Arc in Solid Pastel Teal */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#0D9488"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Clock className="w-4 h-4 text-teal-600 mb-0.5" />

          <div className="text-2xl font-black text-slate-800 tracking-tight font-mono">
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
          </div>

          <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Jam</span>
            <span>•</span>
            <span>Menit</span>
          </div>

          <span className="text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.2 rounded-md mt-1">
            Berjalan Aktif
          </span>
        </div>
      </div>
    </div>
  );
};
