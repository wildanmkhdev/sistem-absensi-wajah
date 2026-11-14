import React, { useState, useEffect } from 'react';
import { Wifi, Battery } from 'lucide-react';

export const MobileStatusBar: React.FC = () => {
  const [time, setTime] = useState<string>('19:02');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full px-6 py-2.5 flex items-center justify-between text-xs font-bold text-slate-800 bg-transparent select-none z-30">
      {/* Time - e.g. 19:02 */}
      <span className="tracking-tight text-[13px] font-black">{time}</span>

      {/* Dynamic Island / Notch Pill */}
      <div className="w-24 h-4.5 bg-slate-900 rounded-full flex items-center justify-center space-x-1.5 shadow-inner">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
      </div>

      {/* Right Icons: Signal, Wifi, Battery */}
      <div className="flex items-center space-x-1.5 text-slate-700">
        {/* Cellular Signal Bars */}
        <div className="flex items-end space-x-0.5 h-3">
          <div className="w-0.5 h-1.5 bg-slate-700 rounded-xs" />
          <div className="w-0.5 h-2 bg-slate-700 rounded-xs" />
          <div className="w-0.5 h-2.5 bg-slate-700 rounded-xs" />
          <div className="w-0.5 h-3 bg-slate-700 rounded-xs" />
        </div>
        <Wifi className="w-3.5 h-3.5" />
        <Battery className="w-4 h-4" />
      </div>
    </div>
  );
};
