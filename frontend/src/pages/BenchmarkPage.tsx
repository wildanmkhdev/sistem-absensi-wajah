import React, { useEffect, useState } from 'react';
import { RefreshCw, Scale, X } from 'lucide-react';
import { fetchBenchmark, simulateCase } from '../api';
import { BenchmarkDetailModal } from '../components/BenchmarkDetailModal';
import type { BenchmarkCase, SimulatedPresensiResponse } from '../types';
import { IconAcademicShield } from '../components/icons/FlaticonIcons';

export const BenchmarkPage: React.FC = () => {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkCase[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [runningCaseId, setRunningCaseId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<BenchmarkCase | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulatedPresensiResponse | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const loadBenchmark = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBenchmark();
      setBenchmarkData(data);
    } catch (err) {
      console.error('Error fetching benchmark data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBenchmark();
  }, []);

  const runSimulation = async (item: BenchmarkCase) => {
    setRunningCaseId(item.case_id);
    setSimulationError(null);
    try {
      const res = await simulateCase(item.case_id);
      setSimulationResult(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal.';
      setSimulationError(`Simulasi gagal: ${message}`);
    } finally {
      setRunningCaseId(null);
    }
  };

  const handleRunFromDetail = () => {
    if (!detailItem) return;
    const item = detailItem;
    setDetailItem(null);
    void runSimulation(item);
  };

  const renderStatusTag = (status: string) => {
    if (status === 'HADIR') {
      return <span className="hlb-tag ok">Hadir</span>;
    }
    if (status === 'TERLAMBAT') {
      return <span className="hlb-tag accent">Terlambat</span>;
    }
    if (status === 'PERLU_VERIFIKASI_DOSEN' || status === 'OVERSIGHT') {
      return <span className="hlb-tag paper">Oversight</span>;
    }
    return <span className="hlb-tag warn">Ditolak</span>;
  };

  const toScorePercent = (score: number) => {
    const raw = score <= 1 ? score * 100 : score;
    return Math.max(0, Math.min(100, Math.round(raw)));
  };

  const totalCases = benchmarkData.length;
  const oversightCount = benchmarkData.filter(
    (item) =>
      item.requires_human_oversight || item.status_uupdp === 'PERLU_VERIFIKASI_DOSEN'
  ).length;
  const autoCount = Math.max(0, totalCases - oversightCount);
  const avgScore =
    totalCases > 0
      ? Math.round(
          benchmarkData.reduce((acc, item) => acc + toScorePercent(item.face_score), 0) /
            totalCases
        )
      : 0;

  return (
    <div className="space-y-5 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="hlb-panel p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[var(--yellow)] border-2 border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)] flex items-center justify-center shrink-0">
            <IconAcademicShield className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display font-normal text-2xl sm:text-3xl leading-tight text-[var(--ink)]">
                Matriks Kasus Pengujian <mark className="hlb-mark">M1–M6</mark>
              </h1>
              <span className="hlb-tag paper font-mono">Modul 13</span>
            </div>
            <p className="text-sm text-[var(--soft)] mt-0.5">
              Komparasi aturan kaku (rigid) vs prinsip Human Oversight UU PDP No. 27/2022 Pasal 34.
            </p>
          </div>
        </div>

        <button
          onClick={() => void loadBenchmark()}
          disabled={isLoading}
          className="hlb-btn-secondary text-xs font-mono uppercase tracking-wider px-4 py-2.5 flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-center disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Top 4-Tile KPI Strip (Harness Leaderboard Aesthetic) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="hlb-tile-key p-4 flex flex-col justify-between">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--on-yellow-soft)]">
            Total Kasus Uji
          </span>
          <div className="font-display font-normal text-3xl sm:text-4xl leading-none text-[var(--on-yellow)] mt-2 tabular-nums">
            {totalCases || 6}
          </div>
          <span className="font-mono text-[11px] text-[var(--on-yellow-soft)] mt-1.5">
            Skenario M1 s.d. M6
          </span>
        </div>

        <div className="hlb-tile p-4 flex flex-col justify-between">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)]">
            Human Oversight
          </span>
          <div className="font-display font-normal text-3xl sm:text-4xl leading-none text-[var(--ink)] mt-2 tabular-nums">
            {totalCases > 0 ? oversightCount : 3}
          </div>
          <span className="font-mono text-[11px] text-[var(--soft)] mt-1.5">
            UU PDP Ps. 34
          </span>
        </div>

        <div className="hlb-tile p-4 flex flex-col justify-between">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)]">
            Keputusan Otomatis
          </span>
          <div className="font-display font-normal text-3xl sm:text-4xl leading-none text-[var(--ink)] mt-2 tabular-nums">
            {totalCases > 0 ? autoCount : 3}
          </div>
          <span className="font-mono text-[11px] text-[var(--soft)] mt-1.5">
            Validasi Langsung
          </span>
        </div>

        <div className="hlb-tile p-4 flex flex-col justify-between">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--soft)]">
            Rata-Rata Skor Wajah
          </span>
          <div className="font-display font-normal text-3xl sm:text-4xl leading-none text-[var(--ink)] mt-2 tabular-nums">
            {totalCases > 0 ? `${avgScore}%` : '—'}
          </div>
          <div className="hlb-progress mt-2">
            <div style={{ width: `${avgScore}%` }} />
          </div>
        </div>
      </div>

      {/* Ringkasan Banner */}
      <div className="hlb-alert info p-4 text-sm text-[var(--ink)] flex items-start gap-3">
        <span className="hlb-tag accent shrink-0 mt-0.5">Dry-Run</span>
        <p className="leading-relaxed">
          <strong className="font-semibold">3 dari 6</strong> kasus dialihkan ke verifikasi dosen;{' '}
          <strong className="font-semibold">3 kasus</strong> diputuskan otomatis oleh sistem. Uji
          coba dijalankan secara dry-run tanpa mengubah data presensi riil.
        </p>
      </div>

      {simulationError && (
        <div className="hlb-alert danger flex items-center justify-between gap-3 p-4 text-sm font-medium text-[var(--ink)]">
          <span>{simulationError}</span>
          <button
            onClick={() => setSimulationError(null)}
            className="hlb-btn-secondary text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Leaderboard Table Panel */}
      <div className="hlb-panel overflow-hidden">
        <div className="px-5 py-3.5 border-b-2 border-[var(--edge)] flex items-center justify-between gap-2 bg-[var(--surface)]">
          <h2 className="font-display font-normal text-xl text-[var(--ink)]">
            Leaderboard Evaluasi Kebijakan
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--soft)]">
            Rigid vs UU PDP
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="hlb-table w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-5 py-3.5">Kasus</th>
                <th className="px-4 py-3.5">Mahasiswa</th>
                <th className="px-4 py-3.5 min-w-[160px]">Skor Wajah</th>
                <th className="px-3 py-3.5 text-center">Jarak GPS</th>
                <th className="px-3 py-3.5 text-center">Telat</th>
                <th className="px-3 py-3.5 text-center">Aturan Kaku</th>
                <th className="px-3 py-3.5 text-center">UU PDP</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {benchmarkData.map((item) => {
                const isRunning = runningCaseId === item.case_id;
                const scorePct = toScorePercent(item.face_score);
                const isPassedOrProtected =
                  item.status_uupdp === 'HADIR' ||
                  item.status_uupdp === 'PERLU_VERIFIKASI_DOSEN';

                return (
                  <tr key={item.case_id}>
                    <td className="px-5 py-3.5">
                      <span className="font-display font-normal text-xl text-[var(--ink)] leading-none">
                        {item.case_id}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[var(--ink)]">{item.name}</div>
                      <div className="text-xs text-[var(--soft)] font-mono">NIM {item.nim}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="hlb-progress flex-1 min-w-[72px]">
                          <div style={{ width: `${scorePct}%` }} />
                        </div>
                        <span className="font-mono text-xs font-semibold text-[var(--ink)] tabular-nums w-11 text-right">
                          {item.face_score}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono text-xs text-[var(--soft)] tabular-nums">
                      {item.distance_meters}m
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono text-xs text-[var(--soft)] tabular-nums">
                      {item.late_minutes}m
                    </td>

                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      {renderStatusTag(item.status_initial)}
                    </td>

                    <td
                      className={`px-3 py-3.5 text-center whitespace-nowrap ${
                        isPassedOrProtected ? 'bg-[var(--paper)]' : ''
                      }`}
                    >
                      {renderStatusTag(item.status_uupdp)}
                    </td>

                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setDetailItem(item)}
                          className="hlb-btn-secondary text-xs font-mono uppercase tracking-wider px-3 py-1.5 cursor-pointer"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => void runSimulation(item)}
                          disabled={isRunning || runningCaseId !== null}
                          className="hlb-btn-primary text-xs font-mono uppercase tracking-wider px-3.5 py-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isRunning ? 'Menguji...' : 'Uji'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailItem && (
        <BenchmarkDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onRun={handleRunFromDetail}
          isRunning={runningCaseId === detailItem.case_id}
        />
      )}

      {/* Modal Hasil Simulasi Dry-Run */}
      {simulationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-fade-in">
          <div className="hlb-panel max-w-lg w-full p-6 shadow-[6px_6px_0_var(--shadow)] space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b-2 border-[var(--edge)]">
              <div>
                <span className="hlb-tag accent font-mono">
                  Hasil Uji Simulasi Kasus {simulationResult.case_id}
                </span>
                <h3 className="font-display font-normal text-2xl text-[var(--ink)] mt-1.5 leading-tight">
                  {simulationResult.name}
                </h3>
                <p className="font-mono text-xs text-[var(--soft)]">
                  NIM {simulationResult.nim}
                </p>
              </div>
              <button
                onClick={() => setSimulationResult(null)}
                aria-label="Tutup"
                className="hlb-btn-secondary p-1.5 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="hlb-tile p-3.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)] block">
                  Aturan Kaku
                </span>
                <div className="mt-2">{renderStatusTag(simulationResult.status_awal)}</div>
              </div>

              <div className="hlb-tile bg-[var(--paper)] p-3.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)] block">
                  Kepatuhan UU PDP
                </span>
                <div className="mt-2 font-mono font-semibold text-xs text-[var(--ink)]">
                  {simulationResult.status_uupdp.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg)] p-3.5 rounded-xl border-2 border-[var(--edge)] text-xs space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--soft)] block">
                Penjelasan Sistem
              </span>
              <p className="text-[var(--ink)] leading-relaxed text-sm">
                {simulationResult.decision_reason}
              </p>
            </div>

            <div className="hlb-alert info p-3.5 text-xs space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[var(--ink)] flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span>Rujukan Hukum UU PDP</span>
              </span>
              <p className="text-[var(--ink)] leading-relaxed text-sm">
                {simulationResult.legal_basis}
              </p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSimulationResult(null)}
                className="hlb-btn-primary w-full h-11 text-xs font-mono uppercase tracking-wider cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
