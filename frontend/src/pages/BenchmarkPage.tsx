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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
            Studi Kasus Modul 13 • Kelompok 6
          </span>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">
            Matriks Kasus M1 s.d. M6
          </h1>
          <p className="text-xs text-slate-500">
            Perbandingan aturan kaku vs aturan berkeadilan Human Oversight (UU PDP Pasal 34).
          </p>
        </div>

        <button
          onClick={loadBenchmark}
          disabled={isLoading}
          className="flex items-center space-x-2 text-xs font-bold bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-600 px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs transition self-start sm:self-center cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Rancangan Awal (Kaku)
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-rose-600">50%</span>
            <span className="text-xs text-rose-600 font-semibold">Tolak Otomatis</span>
          </div>
          <p className="text-[11px] text-slate-400">
            3 dari 6 mahasiswa (M3, M4, M5) dirugikan sepihak tanpa penilaian manusia.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Rancangan UU PDP (Human Oversight)
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-600">100%</span>
            <span className="text-xs text-emerald-600 font-semibold">Terselamatkan</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Kasus anomali dialihkan ke Dosen pengampu untuk verifikasi berkeadilan.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Payung Hukum Kepatuhan
          </span>
          <div className="flex items-center space-x-2 pt-1">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-bold text-slate-800">UU No. 27 / 2022</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Kepatuhan Pasal 4 (data biometrik) dan Pasal 34 (larangan keputusan otomatis tunggal).
          </p>
        </div>
      </div>

      {/* Benchmark Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Tabel Skenario Pengujian Resmi</h3>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Semua Kasus (6)
            </button>
            <button
              onClick={() => setActiveFilter('OVERSIGHT_ONLY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === 'OVERSIGHT_ONLY'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Kasus Ambang Saja (3)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Kasus</th>
                <th className="px-3 py-3 text-center">Skor Wajah</th>
                <th className="px-3 py-3 text-center">Jarak GPS</th>
                <th className="px-3 py-3 text-center">Telat</th>
                <th className="px-3 py-3 text-center">Rancangan Awal</th>
                <th className="px-3 py-3 text-center">Rancangan UU PDP</th>
                <th className="px-4 py-3">Kondisi Lapangan</th>
                <th className="px-3 py-3 text-right">Uji Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {displayList.map((item) => (
                <tr key={item.case_id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3.5">
                    <span className="font-extrabold text-slate-800 text-xs block">{item.case_id}</span>
                    <span className="text-[11px] text-slate-400">{item.name}</span>
                  </td>

                  <td className="px-3 py-3.5 text-center font-bold text-slate-700">
                    {item.face_score}
                  </td>

                  <td className="px-3 py-3.5 text-center text-slate-700">
                    {item.distance_meters}m
                  </td>

                  <td className="px-3 py-3.5 text-center text-slate-700">
                    {item.late_minutes}m
                  </td>

                  <td className="px-3 py-3.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
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

                  <td className="px-3 py-3.5 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.status_uupdp === 'HADIR'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.status_uupdp === 'TERLAMBAT'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-orange-50 text-orange-700 border border-orange-200'
                      }`}
                    >
                      {item.status_uupdp === 'PERLU_VERIFIKASI_DOSEN'
                        ? 'VERIFIKASI DOSEN'
                        : item.status_uupdp}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <p className="text-[11px] text-slate-600 max-w-xs">{item.condition_description}</p>
                  </td>

                  <td className="px-3 py-3.5 text-right">
                    {onSimulateInPresensi && (
                      <button
                        onClick={() => onSimulateInPresensi(item.case_id as 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6')}
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-xl transition cursor-pointer"
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
