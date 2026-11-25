import React from 'react';
import { X, Play, Loader2, Scale, ShieldCheck } from 'lucide-react';
import type { BenchmarkCase } from '../types';
import { IconAcademicShield } from './icons/FlaticonIcons';

interface BenchmarkDetailModalProps {
  item: BenchmarkCase;
  onClose: () => void;
  onRun: () => void;
  isRunning: boolean;
}

export const BenchmarkDetailModal: React.FC<BenchmarkDetailModalProps> = ({
  item,
  onClose,
  onRun,
  isRunning,
}) => {
  const scorePct = Math.max(
    0,
    Math.min(100, Math.round(item.face_score <= 1 ? item.face_score * 100 : item.face_score))
  );

  const renderStatusTag = (status: string) => {
    if (status === 'HADIR') return <span className="hlb-tag ok">Hadir</span>;
    if (status === 'TERLAMBAT') return <span className="hlb-tag accent">Terlambat</span>;
    if (status === 'PERLU_VERIFIKASI_DOSEN') {
      return <span className="hlb-tag paper">Verifikasi Dosen</span>;
    }
    return <span className="hlb-tag warn">{status.replace(/_/g, ' ')}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-fade-in font-sans">
      <div className="hlb-panel max-w-lg w-full p-6 shadow-[6px_6px_0_var(--shadow)] space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b-2 border-[var(--edge)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--yellow)] border-2 border-[var(--on-yellow)] shadow-[2px_2px_0_var(--shadow)] flex items-center justify-center shrink-0">
              <IconAcademicShield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="hlb-tag accent font-mono">{item.case_id}</span>
                <h3 className="font-display font-normal text-2xl leading-tight text-[var(--ink)]">
                  {item.name}
                </h3>
              </div>
              <p className="font-mono text-[11px] text-[var(--soft)] mt-0.5">
                Studi Kasus Modul 13 • Kepatuhan UU PDP No. 27/2022
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup detail kasus"
            className="hlb-btn-secondary p-1.5 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="hlb-tile p-3 space-y-1.5">
            <span className="font-mono text-[10px] text-[var(--soft)] block uppercase font-semibold">
              Skor Wajah
            </span>
            <span className="font-mono font-semibold text-sm text-[var(--ink)] block tabular-nums">
              {item.face_score}
            </span>
            <div className="hlb-progress">
              <div style={{ width: `${scorePct}%` }} />
            </div>
          </div>
          <div className="hlb-tile p-3 flex flex-col justify-center">
            <span className="font-mono text-[10px] text-[var(--soft)] block uppercase font-semibold">
              Jarak GPS
            </span>
            <span className="font-mono font-semibold text-sm text-[var(--ink)] block mt-1 tabular-nums">
              {item.distance_meters}m
            </span>
          </div>
          <div className="hlb-tile p-3 flex flex-col justify-center">
            <span className="font-mono text-[10px] text-[var(--soft)] block uppercase font-semibold">
              Telat
            </span>
            <span className="font-mono font-semibold text-sm text-[var(--ink)] block mt-1 tabular-nums">
              {item.late_minutes}m
            </span>
          </div>
        </div>

        {/* Condition */}
        <div className="space-y-1.5">
          <span className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)]">
            Kondisi Lapangan
          </span>
          <p className="text-sm leading-relaxed text-[var(--ink)] bg-[var(--bg)] p-3.5 rounded-xl border-2 border-[var(--edge)]">
            {item.condition_description}
          </p>
        </div>

        {/* Ethical / legal analysis */}
        <div className="space-y-1.5">
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--soft)]">
            <Scale className="w-3.5 h-3.5 text-[var(--ink)]" />
            <span>Analisis Etis &amp; Hukum</span>
          </span>
          <p className="text-sm leading-relaxed text-[var(--ink)] bg-[var(--bg)] p-3.5 rounded-xl border-2 border-[var(--edge)]">
            {item.ethical_legal_analysis}
          </p>
        </div>

        {/* PDP reference */}
        <div className="hlb-alert info p-3.5 space-y-1">
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink)]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Rujukan Pasal UU PDP</span>
          </span>
          <p className="text-sm leading-relaxed text-[var(--ink)]">
            {item.pdp_article_reference}
          </p>
        </div>

        {/* Status comparison */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="hlb-tile p-3.5">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--soft)] mb-2">
              Aturan Kaku (Awal)
            </span>
            <div>{renderStatusTag(item.status_initial)}</div>
          </div>
          <div className="hlb-tile bg-[var(--paper)] p-3.5">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--soft)] mb-2">
              Rancangan UU PDP
            </span>
            <div>{renderStatusTag(item.status_uupdp)}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={onClose}
            className="hlb-btn-secondary font-mono text-xs uppercase tracking-wider px-4 py-2.5 cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            className="hlb-btn-primary flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider px-4 py-2.5 cursor-pointer disabled:opacity-50"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{isRunning ? 'Menjalankan...' : 'Jalankan Simulasi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
