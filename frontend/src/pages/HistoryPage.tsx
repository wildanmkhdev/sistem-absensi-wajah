import React, { useEffect, useState } from 'react';
import { History, RefreshCw, Search, CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react';
import { fetchAttendances } from '../api';
import type { AttendanceRecord, AttendanceStatus } from '../types';
import type { Role } from '../auth';

interface HistoryPageProps {
  role: Role;
  nim?: string;
}

const formatTime = (timestamp: string): string => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp.split(' ')[1] || timestamp;
  }
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const HistoryPage: React.FC<HistoryPageProps> = ({ role, nim }) => {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const isLecturer = role === 'dosen';

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

  const visibleList = nim ? attendances.filter((item) => item.nim === nim) : attendances;

  const filteredList = visibleList.filter((item) => {
    if (!isLecturer) return true;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.nim.toLowerCase().includes(query) ||
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.simulated_case && item.simulated_case.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'HADIR':
        return (
          <span className="inline-flex items-center space-x-1 text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>HADIR</span>
          </span>
        );
      case 'TERLAMBAT':
        return (
          <span className="inline-flex items-center space-x-1 text-indigo-800 bg-indigo-100/80 border border-indigo-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
            <Clock className="w-3 h-3 text-indigo-600" />
            <span>TERLAMBAT</span>
          </span>
        );
      case 'PERLU_VERIFIKASI_DOSEN':
        return (
          <span className="inline-flex items-center space-x-1 text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            <span>VERIFIKASI DOSEN</span>
          </span>
        );
      case 'TIDAK_SAH':
        return (
          <span className="inline-flex items-center space-x-1 text-rose-800 bg-rose-100/80 border border-rose-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>TIDAK SAH</span>
          </span>
        );
    }
  };

  const title = isLecturer ? 'Riwayat Kelas' : 'Riwayat Presensi Saya';

  return (
    <div className="space-y-3 sm:space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              {filteredList.length} rekaman
            </span>
          </div>
          <p className="text-xs text-slate-500">Log presensi, skor wajah, dan keputusan dosen.</p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center space-x-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl border border-slate-200 transition shadow-xs self-start sm:self-center cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Lecturer Filter and Search Bar */}
      {isLecturer && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600 sm:w-48 cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="HADIR">Hadir</option>
            <option value="TERLAMBAT">Terlambat</option>
            <option value="PERLU_VERIFIKASI_DOSEN">Verifikasi Dosen</option>
            <option value="TIDAK_SAH">Tidak Sah</option>
          </select>

          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIM, Nama, Kasus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 font-medium"
            />
          </div>
        </div>
      )}

      {/* Content Table */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
            <span className="text-xs font-semibold">Memuat log presensi...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-1">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Tidak Ada Rekaman Ditemukan</p>
            <p className="text-[11px] text-slate-400">
              {isLecturer
                ? 'Belum ada presensi yang cocok dengan filter.'
                : 'Silakan lakukan presensi pada menu Presensi.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200/70">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200/70">
                <tr>
                  <th className="px-3.5 py-3">Mahasiswa</th>
                  <th className="px-3 py-3 text-center">Waktu</th>
                  <th className="px-3 py-3 text-center">Skor</th>
                  <th className="px-3 py-3 text-center">Jarak</th>
                  <th className="px-3 py-3 text-center">Telat</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3.5 py-3 hidden sm:table-cell">Catatan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3.5 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
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

                    <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-600">
                      {formatTime(item.timestamp)}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="font-bold text-slate-800 font-mono text-xs">
                        {(item.similarity_score * 100).toFixed(0)}%
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center font-mono text-xs">
                      {item.distance_meters.toFixed(0)}m
                    </td>

                    <td className="px-3 py-3 text-center font-mono text-xs">
                      {item.late_minutes}m
                    </td>

                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    <td className="px-3.5 py-3 max-w-xs text-slate-600 text-[11px] hidden sm:table-cell">
                      <div className="line-clamp-2" title={item.lecturer_note || item.decision_reason}>
                        {item.lecturer_note ? (
                          <span className="text-teal-800 font-medium">
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
