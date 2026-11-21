import React from 'react';
import { Award, X, Play, Loader2, Scale, ShieldCheck } from 'lucide-react';
import type { BenchmarkCase } from '../types';

interface BenchmarkDetailModalProps {
  item: BenchmarkCase;
  onClose: () => void;
  onRun: () => void;
  isRunning: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  HADIR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TERLAMBAT: 'bg-amber-50 text-amber-700 border-amber-200',
  PERLU_VERIFIKASI_DOSEN: 'bg-teal-50 text-teal-700 border-teal-200',
};
const STATUS_BADGE_DEFAULT = 'bg-rose-50 text-rose-700 border-rose-200';

export const BenchmarkDetailModal: React.FC<BenchmarkDetailModalProps> = ({
  item,
  onClose,
  onRun,
  isRunning,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Kasus {item.case_id} • {item.name}
              </h3>
              <p className="text-xs text-slate-500">
                Studi Kasus Modul 13 • Kepatuhan UU PDP No. 27/2022
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup detail kasus"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-400 block font-medium">Skor Wajah</span>
            <span className="font-bold text-teal-700 font-mono">{item.face_score}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-400 block font-medium">Jarak GPS</span>
            <span className="font-bold text-slate-700 font-mono">{item.distance_meters}m</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-400 block font-medium">Telat</span>
            <span className="font-bold text-slate-700 font-mono">{item.late_minutes}m</span>
          </div>
        </div>

        {/* Condition */}
        <div className="space-y-1">
          <span className="block text-xs font-bold text-slate-700">Kondisi Lapangan</span>
          <p className="text-[11px] leading-relaxed text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            {item.condition_description}
          </p>
        </div>

        {/* Ethical / legal analysis */}
        <div className="space-y-1">
          <span className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
            <Scale className="w-3.5 h-3.5 text-teal-600" />
            <span>Analisis Etis &amp; Hukum</span>
          </span>
          <p className="text-[11px] leading-relaxed text-slate-600 bg-teal-50/50 p-3 rounded-xl border border-teal-100">
            {item.ethical_legal_analysis}
          </p>
        </div>

        {/* PDP reference */}
        <div className="space-y-1">
          <span className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Rujukan Pasal</span>
          </span>
          <p className="text-[11px] leading-relaxed text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80">
            {item.pdp_article_reference}
          </p>
        </div>

        {/* Status comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Aturan Awal
            </span>
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                STATUS_BADGE[item.status_initial] ?? STATUS_BADGE_DEFAULT
              }`}
            >
              {item.status_initial}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Hasil UU PDP
            </span>
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                STATUS_BADGE[item.status_uupdp] ?? STATUS_BADGE_DEFAULT
              }`}
            >
              {item.status_uupdp === 'PERLU_VERIFIKASI_DOSEN'
                ? 'VERIFIKASI DOSEN'
                : item.status_uupdp}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer active:scale-95"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center space-x-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>{isRunning ? 'Menjalankan...' : 'Jalankan Simulasi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};