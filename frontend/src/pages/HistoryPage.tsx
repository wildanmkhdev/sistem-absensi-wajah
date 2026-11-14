import React, { useState, useEffect } from 'react';
import { History, RefreshCw, Search, CheckCircle, Clock, HelpCircle, XCircle } from 'lucide-react';
import { fetchAttendances } from '../api';
import type { AttendanceRecord, AttendanceStatus } from '../types';

export const HistoryPage: React.FC = () => {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAttendances();
      setAttendances(data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredList = attendances.filter((item) => {
    const matchesSearch =
      item.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.simulated_case && item.simulated_case.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'HADIR':
        return (
          <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            <CheckCircle className="w-3 h-3" />
            <span>HADIR</span>
          </span>
        );
      case 'TERLAMBAT':
        return (
          <span className="flex items-center space-x-1 text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            <Clock className="w-3 h-3" />
            <span>TERLAMBAT</span>
          </span>
        );
      case 'PERLU_VERIFIKASI_DOSEN':
        return (
          <span className="flex items-center space-x-1 text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            <HelpCircle className="w-3 h-3 text-cyan-400" />
            <span>VERIFIKASI DOSEN</span>
          </span>
        );
      case 'TIDAK_SAH':
        return (
          <span className="flex items-center space-x-1 text-rose-400 bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
            <XCircle className="w-3 h-3" />
            <span>TIDAK SAH</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Database Log Presensi
            </span>
            <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
              Total {attendances.length} Rekaman
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white mt-1">Riwayat Presensi Mahasiswa</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Log lengkap seluruh transaksi presensi, skor pencocokan biometrik, dan status human oversight.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl border border-slate-700 transition self-start md:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'HADIR', label: 'Hadir' },
              { id: 'TERLAMBAT', label: 'Terlambat' },
              { id: 'PERLU_VERIFIKASI_DOSEN', label: 'Verifikasi Dosen' },
              { id: 'TIDAK_SAH', label: 'Tidak Sah' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-750 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIM atau Nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-xs">Memuat data presensi...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <History className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">Tidak Ada Data Presensi</p>
            <p className="text-xs text-slate-500">Silakan lakukan presensi di tab Presensi Kamera.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Mahasiswa</th>
                  <th className="px-3 py-3 text-center">Waktu Presensi</th>
                  <th className="px-3 py-3 text-center">Skor Wajah</th>
                  <th className="px-3 py-3 text-center">Jarak GPS</th>
                  <th className="px-3 py-3 text-center">Terlambat</th>
                  <th className="px-3 py-3 text-center">Status Akhir</th>
                  <th className="px-4 py-3">Alasan / Catatan Dosen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-sans">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-750/30 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white">{item.name || item.nim}</div>
                      <div className="font-mono text-slate-400 text-[11px]">NIM: {item.nim}</div>
                      {item.simulated_case && (
                        <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-cyan-400 border border-slate-700 font-mono">
                          {item.simulated_case}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono text-[11px] text-slate-300">
                      {new Date(item.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono font-bold">
                      <span
                        className={
                          item.similarity_score >= 0.85
                            ? 'text-emerald-400'
                            : item.similarity_score >= 0.70
                            ? 'text-cyan-400'
                            : 'text-amber-400'
                        }
                      >
                        {item.similarity_score.toFixed(2)}
                      </span>
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono text-slate-200">
                      {item.distance_meters} m
                    </td>

                    <td className="px-3 py-3.5 text-center font-mono text-slate-200">
                      {item.late_minutes} m
                    </td>

                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="px-4 py-3.5 max-w-xs text-[11px] text-slate-300">
                      <p className="line-clamp-2">{item.decision_reason}</p>
                      {item.lecturer_note && (
                        <div className="mt-1 text-[10px] text-cyan-300 italic">
                          Paraf Dosen: "{item.lecturer_note}"
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
