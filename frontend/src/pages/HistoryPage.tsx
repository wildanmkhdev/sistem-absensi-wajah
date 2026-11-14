import React, { useState, useEffect } from 'react';
import { History, RefreshCw, Search, CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react';
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
          <span className="inline-flex items-center space-x-1 text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-black">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>HADIR</span>
          </span>
        );
      case 'TERLAMBAT':
        return (
          <span className="inline-flex items-center space-x-1 text-purple-800 bg-purple-100/80 border border-purple-200 px-2.5 py-0.5 rounded-full text-[10px] font-black">
            <Clock className="w-3 h-3 text-purple-600" />
            <span>TERLAMBAT</span>
          </span>
        );
      case 'PERLU_VERIFIKASI_DOSEN':
        return (
          <span className="inline-flex items-center space-x-1 text-orange-800 bg-orange-100/80 border border-orange-200 px-2.5 py-0.5 rounded-full text-[10px] font-black">
            <ShieldAlert className="w-3 h-3 text-orange-600" />
            <span>VERIFIKASI DOSEN</span>
          </span>
        );
      case 'TIDAK_SAH':
        return (
          <span className="inline-flex items-center space-x-1 text-rose-800 bg-rose-100/80 border border-rose-200 px-2.5 py-0.5 rounded-full text-[10px] font-black">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>TIDAK SAH</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner in Warm Orange Theme */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              Database Log Presensi
            </span>
            <span className="text-[10px] font-extrabold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
              Total {attendances.length} Rekaman
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mt-1.5">
            Riwayat Presensi Mahasiswa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log transaksi presensi biometrik, skor kemiripan wajah, jarak Haversine GPS, dan status audit UU PDP.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center space-x-2 text-xs font-bold bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-600 px-4 py-2.5 rounded-2xl border border-slate-200 transition shadow-xs self-start md:self-center cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: 'Semua Status' },
              { id: 'HADIR', label: 'Hadir' },
              { id: 'TERLAMBAT', label: 'Terlambat' },
              { id: 'PERLU_VERIFIKASI_DOSEN', label: 'Verifikasi Dosen' },
              { id: 'TIDAK_SAH', label: 'Tidak Sah' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-orange-50 hover:text-orange-600 border border-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIM, Nama, atau Kasus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
            />
          </div>
        </div>

        {/* Content Display */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            <span className="text-xs font-bold">Memuat log presensi biometrik...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Tidak Ada Rekaman Presensi Ditemukan</p>
            <p className="text-xs text-slate-400">Silakan lakukan presensi pada menu Presensi Wajah.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3.5">Mahasiswa</th>
                  <th className="px-3 py-3.5 text-center">Waktu</th>
                  <th className="px-3 py-3.5 text-center">Skor Wajah</th>
                  <th className="px-3 py-3.5 text-center">Jarak GPS</th>
                  <th className="px-3 py-3.5 text-center">Terlambat</th>
                  <th className="px-3 py-3.5 text-center">Status Akhir</th>
                  <th className="px-4 py-3.5">Alasan / Catatan Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                    {/* Mahasiswa */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {item.name ? item.name.charAt(0) : 'M'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">
                            {item.name || 'Mahasiswa'}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            NIM: {item.nim} {item.simulated_case ? `• Kasus ${item.simulated_case}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Waktu */}
                    <td className="px-3 py-3.5 text-center font-mono text-[11px] text-slate-600">
                      {item.timestamp ? item.timestamp.split(' ')[1] || item.timestamp : '-'}
                    </td>

                    {/* Skor Wajah */}
                    <td className="px-3 py-3.5 text-center">
                      <span className="font-black text-slate-800 font-mono text-xs">
                        {(item.similarity_score * 100).toFixed(0)}%
                      </span>
                    </td>

                    {/* Jarak GPS */}
                    <td className="px-3 py-3.5 text-center">
                      <span className="font-semibold text-slate-700 font-mono text-xs">
                        {item.distance_meters.toFixed(0)}m
                      </span>
                    </td>

                    {/* Terlambat */}
                    <td className="px-3 py-3.5 text-center">
                      <span className="font-semibold text-slate-700 font-mono text-xs">
                        {item.late_minutes}m
                      </span>
                    </td>

                    {/* Status Akhir */}
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Alasan */}
                    <td className="px-4 py-3.5 max-w-xs text-slate-600 text-[11px]">
                      <div className="line-clamp-2" title={item.lecturer_note || item.decision_reason}>
                        {item.lecturer_note ? (
                          <span className="text-orange-700 font-medium">
                            [Dosen]: {item.lecturer_note}
                          </span>
                        ) : (
                          item.decision_reason
                        )}
                      </div>
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
