import React, { useEffect, useState } from 'react';
import {
  Award,
  RefreshCw,
  Scale,
  ShieldCheck,
  X,
} from 'lucide-react';
import { fetchBenchmark, simulateCase } from '../api';
import { BenchmarkDetailModal } from '../components/BenchmarkDetailModal';
import type { BenchmarkCase, SimulatedPresensiResponse } from '../types';

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

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200/60">
            Studi Kasus Modul 13 • Kelompok 6
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mt-1">
            Matriks Kasus M1 s.d. M6
          </h1>
          <p className="text-xs text-slate-500">
            Perbandingan aturan kaku vs aturan berkeadilan Human Oversight (UU PDP Pasal 34).
          </p>
        </div>

        <button
          onClick={() => void loadBenchmark()}
          disabled={isLoading}
          className="flex items-center space-x-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 transition shadow-xs self-start sm:self-center cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Ringkasan */}
      <p className="flex items-center space-x-2 text-xs text-slate-600 bg-white rounded-2xl border border-slate-200/80 px-4 py-3 shadow-xs">
        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
        <span>
          <strong className="font-bold text-slate-800">3 dari 6</strong> kasus dialihkan ke verifikasi dosen;{' '}
          <strong className="font-bold text-slate-800">3</strong> diputus otomatis. Simulasi berjalan dalam mode <em>dry-run</em> tanpa mengotori tabel kehadiran nyata.
        </span>
      </p>

      {simulationError && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl border text-xs bg-rose-50 border-rose-200 text-rose-800">
          <span>{simulationError}</span>
          <button
            onClick={() => setSimulationError(null)}
            className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-0.5 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Benchmark Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
        <h3 className="text-xs sm:text-sm font-bold text-slate-800">
          Tabel Skenario Pengujian Resmi
        </h3>

        <div className="overflow-x-auto rounded-lg border border-slate-200/70">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200/70">
              <tr>
                <th className="px-3 py-3">Kasus</th>
                <th className="px-3.5 py-3">Mahasiswa</th>
                <th className="px-3 py-3 text-center">Skor</th>
                <th className="px-3 py-3 text-center">Jarak</th>
                <th className="px-3 py-3 text-center">Telat</th>
                <th className="px-3 py-3 text-center">Awal</th>
                <th className="px-3 py-3 text-center">UU PDP</th>
                <th className="px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {benchmarkData.map((item) => {
                const isRunning = runningCaseId === item.case_id;
                return (
                  <tr key={item.case_id} className="hover:bg-slate-50/80 transition">
                    <td className="px-3 py-3 font-extrabold text-slate-800 text-xs">
                      {item.case_id}
                    </td>

                    <td className="px-3.5 py-3">
                      <div className="font-bold text-slate-800 text-xs">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.nim}</div>
                    </td>

                    <td className="px-3 py-3 text-center font-bold text-slate-700 font-mono">
                      {item.face_score}
                    </td>

                    <td className="px-3 py-3 text-center text-slate-700 font-mono">
                      {item.distance_meters}m
                    </td>

                    <td className="px-3 py-3 text-center text-slate-700 font-mono">
                      {item.late_minutes}m
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.status_initial === 'HADIR'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status_initial === 'TERLAMBAT'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.status_initial}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.status_uupdp === 'HADIR'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status_uupdp === 'TERLAMBAT'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}
                      >
                        {item.status_uupdp === 'PERLU_VERIFIKASI_DOSEN'
                          ? 'VERIFIKASI DOSEN'
                          : item.status_uupdp}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => setDetailItem(item)}
                          className="text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition cursor-pointer"
                        >
                          Detail
                        </button>
                        <button
                          onClick={() => void runSimulation(item)}
                          disabled={isRunning || runningCaseId !== null}
                          className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRunning ? 'Menguji...' : 'Uji Kasus'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200/60 px-2 py-0.5 rounded">
                    Simulasi Dry-Run Kasus {simulationResult.case_id}
                  </span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">
                    {simulationResult.name} ({simulationResult.nim})
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSimulationResult(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">
                  Rancangan Awal (Kaku)
                </span>
                <span
                  className={`inline-block mt-1 font-bold px-2 py-0.5 rounded text-xs ${
                    simulationResult.status_awal === 'HADIR'
                      ? 'bg-emerald-100 text-emerald-800'
                      : simulationResult.status_awal === 'TERLAMBAT'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {simulationResult.status_awal}
                </span>
              </div>

              <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-200">
                <span className="text-[10px] text-teal-700 font-bold block uppercase">
                  Rancangan UU PDP (Berkeadilan)
                </span>
                <span
                  className={`inline-block mt-1 font-bold px-2 py-0.5 rounded text-xs ${
                    simulationResult.status_uupdp === 'HADIR'
                      ? 'bg-emerald-100 text-emerald-800'
                      : simulationResult.status_uupdp === 'TERLAMBAT'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-teal-100 text-teal-800'
                  }`}
                >
                  {simulationResult.status_uupdp.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
              <span className="font-bold text-slate-700 block">Alasan Keputusan Sistem:</span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {simulationResult.decision_reason}
              </p>
            </div>

            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 text-xs space-y-1">
              <span className="font-bold text-blue-900 flex items-center space-x-1.5">
                <Scale className="w-3.5 h-3.5 text-blue-700" />
                <span>Landasan Hukum UU PDP:</span>
              </span>
              <p className="text-blue-800 leading-relaxed text-[11px]">
                {simulationResult.legal_basis}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSimulationResult(null)}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white transition cursor-pointer"
              >
                Tutup Simulasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
