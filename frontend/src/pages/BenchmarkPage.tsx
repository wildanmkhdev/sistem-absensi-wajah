import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { fetchBenchmark, BENCHMARK_CASES } from '../api';
import type { BenchmarkCase } from '../types';

interface BenchmarkPageProps {
  onSimulateInPresensi?: (caseId: 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6') => void;
}

export const BenchmarkPage: React.FC<BenchmarkPageProps> = ({ onSimulateInPresensi }) => {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkCase[]>(BENCHMARK_CASES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OVERSIGHT_ONLY'>('ALL');

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

  const displayList =
    activeFilter === 'OVERSIGHT_ONLY'
      ? benchmarkData.filter((b) => b.requires_human_oversight)
      : benchmarkData;

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Rancangan Awal (Kaku)
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-600">50%</span>
            <span className="text-xs text-rose-600 font-semibold">Tolak Otomatis</span>
          </div>
          <p className="text-[11px] text-slate-400">
            3 dari 6 mahasiswa (M3, M4, M5) dirugikan sepihak tanpa penilaian manusia.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Rancangan UU PDP (Human Oversight)
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-600">100%</span>
            <span className="text-xs text-emerald-600 font-semibold">Terselamatkan</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Kasus anomali dialihkan ke Dosen pengampu untuk verifikasi berkeadilan.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Payung Hukum Kepatuhan
          </span>
          <div className="flex items-center space-x-1.5 pt-0.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-bold text-slate-800">UU No. 27 / 2022</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Kepatuhan Pasal 4 (data biometrik) dan Pasal 34 (larangan keputusan otomatis tunggal).
          </p>
        </div>
      </div>

      {/* Benchmark Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800">Tabel Skenario Pengujian Resmi</h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Semua Kasus (6)
            </button>
            <button
              onClick={() => setActiveFilter('OVERSIGHT_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'OVERSIGHT_ONLY'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Kasus Ambang (3)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200/70">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200/70">
              <tr>
                <th className="px-3.5 py-3">Kasus</th>
                <th className="px-3 py-3 text-center">Skor</th>
                <th className="px-3 py-3 text-center">Jarak</th>
                <th className="px-3 py-3 text-center">Telat</th>
                <th className="px-3 py-3 text-center">Rancangan Awal</th>
                <th className="px-3 py-3 text-center">Rancangan UU PDP</th>
                <th className="px-3.5 py-3">Kondisi Lapangan</th>
                <th className="px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {displayList.map((item) => (
                <tr key={item.case_id} className="hover:bg-slate-50/80 transition">
                  <td className="px-3.5 py-3">
                    <span className="font-extrabold text-slate-800 text-xs block">{item.case_id}</span>
                    <span className="text-[10px] text-slate-400">{item.name}</span>
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

                  <td className="px-3.5 py-3">
                    <p className="text-[11px] text-slate-600 max-w-xs">{item.condition_description}</p>
                  </td>

                  <td className="px-3 py-3 text-right">
                    {onSimulateInPresensi && (
                      <button
                        onClick={() => onSimulateInPresensi(item.case_id as 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6')}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md transition cursor-pointer"
                      >
                        Uji
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
