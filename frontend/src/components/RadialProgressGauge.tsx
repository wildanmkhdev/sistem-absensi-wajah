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
  size = 210,
}) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Calculate dash offset based on percentage
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="text-center mb-2">
        <span className="text-xs font-bold text-slate-700 tracking-tight block">
          {label}
        </span>
        {sublabel && (
          <span className="text-[10px] text-slate-400 font-medium block">
            {sublabel}
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* SVG Circle Progress */}
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
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active Animated Progress Arc in Vibrant Orange */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#orangeGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
          {/* Gradient Definition */}
          <defs>
            <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFA726" />
              <stop offset="60%" stopColor="#FB8C00" />
              <stop offset="100%" stopColor="#F57C00" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-1 shadow-xs">
            <Clock className="w-4 h-4 text-orange-500 animate-pulse" />
          </div>

          <div className="text-3xl font-extrabold text-slate-800 tracking-tight font-mono">
            {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            <span>Jam</span>
            <span>•</span>
            <span>Menit</span>
          </div>

          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-full mt-2">
            Aktif Berjalan
          </span>
        </div>
      </div>
    </div>
  );
};
