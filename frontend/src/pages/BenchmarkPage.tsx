import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { fetchBenchmark, BENCHMARK_CASES, submitPresensi } from '../api';
import { DEFAULT_CLASSROOM } from '../config';
import { AttendanceSuccessModal } from '../components/AttendanceSuccessModal';
import { BenchmarkDetailModal } from '../components/BenchmarkDetailModal';
import type { BenchmarkCase, PresensiResponse } from '../types';

interface BenchmarkPageProps {
  onAttendanceCreated?: () => void;
}

export const BenchmarkPage: React.FC<BenchmarkPageProps> = ({ onAttendanceCreated }) => {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkCase[]>(BENCHMARK_CASES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [runningCaseId, setRunningCaseId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<BenchmarkCase | null>(null);
  const [simulationResult, setSimulationResult] = useState<PresensiResponse | null>(null);
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
    loadBenchmark();
  }, []);

  const runSimulation = async (item: BenchmarkCase) => {
    setRunningCaseId(item.case_id);
    setSimulationError(null);
    try {
      const res = await submitPresensi({
        nim: item.nim,
        name: item.name,
        face_image: null,
        latitude: DEFAULT_CLASSROOM.latitude,
        longitude: DEFAULT_CLASSROOM.longitude,
        late_minutes: item.late_minutes,
        simulated_case: item.case_id,
      });
      setSimulationResult(res);
      onAttendanceCreated?.();
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
          onClick={loadBenchmark}
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
          <strong className="font-bold text-slate-800">3 dari 6</strong> kasus dialihkan ke dosen;{' '}
          <strong className="font-bold text-slate-800">3</strong> diputus otomatis.
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
        <h3 className="text-xs sm:text-sm font-bold text-slate-800">Tabel Skenario Pengujian Resmi</h3>

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
                    <td className="px-3 py-3 font-extrabold text-slate-800 text-xs">{item.case_id}</td>

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
                          {isRunning ? 'Menjalankan...' : 'Jalankan'}
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

      {simulationResult && (
        <AttendanceSuccessModal
          result={simulationResult}
          onClose={() => setSimulationResult(null)}
        />
      )}
    </div>
  );
};