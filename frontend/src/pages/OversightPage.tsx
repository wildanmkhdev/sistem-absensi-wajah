import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { fetchOversightAttendances, resolveOversight } from '../api';
import { LecturerResolveModal } from '../components/LecturerResolveModal';
import type { AttendanceRecord } from '../types';

interface OversightPageProps {
  onOversightUpdated?: () => void;
}

export const OversightPage: React.FC<OversightPageProps> = ({ onOversightUpdated }) => {
  const [pendingList, setPendingList] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected item for resolution modal
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const pending = await fetchOversightAttendances();
      setPendingList(pending);
    } catch (err) {
      console.error('Failed to load oversight list', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (approved: boolean, note: string) => {
    if (!selectedAttendance) return;

    setIsSubmitting(true);
    try {
      const res = await resolveOversight({
        attendance_id: selectedAttendance.id,
        approved,
        lecturer_note: note,
        lecturer_name: 'Dr. Ir. Dosen Pengampu',
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Presensi ${selectedAttendance.name || selectedAttendance.nim} berhasil ${
            approved ? 'disetujui sebagai HADIR' : 'ditolak (TIDAK SAH)'
          }. Catatan audit telah tersimpan.`,
        });
        setSelectedAttendance(null);
        await loadData();
        if (onOversightUpdated) {
          onOversightUpdated();
        }
      }
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: 'Gagal menyimpan keputusan verifikasi dosen.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPending = pendingList.filter(
    (item) =>
      item.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.simulated_case && item.simulated_case.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
            Human-in-the-Loop • UU PDP Pasal 34
          </span>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">
            Review &amp; Verifikasi Dosen
          </h1>
          <p className="text-xs text-slate-500">
            Peninjauan manual kasus ambang batas (M3, M4, M5) sesuai UU PDP Pasal 34.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center space-x-2 text-xs font-bold bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-600 px-4 py-2 rounded-2xl border border-slate-200 shadow-xs transition self-start sm:self-center cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-semibold px-2 py-0.5 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Pending Table Card */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2">
                <span>Antrean Menunggu Verifikasi Dosen</span>
                <span className="text-xs font-black bg-orange-500 text-white px-2 py-0.5 rounded-full">
                  {pendingList.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Kasus membutuhkan peninjauan dan paraf pengesahan dosen</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIM / Nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Pending Table */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <span className="text-xs">Memuat antrean verifikasi...</span>
          </div>
        ) : filteredPending.length === 0 ? (
          <div className="py-12 text-center bg-slate-50/60 rounded-2xl border border-slate-100 space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Tidak Ada Antrean Verifikasi</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Semua presensi telah diproses atau tidak ada anomali sensor yang memerlukan intervensi manual.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Mahasiswa</th>
                  <th className="px-3 py-3 text-center">Skor Wajah</th>
                  <th className="px-3 py-3 text-center">Jarak GPS</th>
                  <th className="px-3 py-3 text-center">Telat</th>
                  <th className="px-4 py-3">Indikasi Masalah</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredPending.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800 text-xs">{item.name || 'Mahasiswa'}</div>
                      <div className="text-slate-400 text-[11px]">NIM: {item.nim}</div>
                      {item.simulated_case && (
                        <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                          Kasus {item.simulated_case}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3.5 text-center">
                      <span className="font-black text-orange-600 font-mono">
                        {(item.similarity_score * 100).toFixed(0)}%
                      </span>
                    </td>

                    <td className="px-3 py-3.5 text-center font-medium text-slate-700">
                      {item.distance_meters.toFixed(0)}m
                    </td>

                    <td className="px-3 py-3.5 text-center font-medium text-slate-700">
                      {item.late_minutes}m
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-[11px] text-slate-500 line-clamp-2 max-w-xs">{item.decision_reason}</p>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedAttendance(item)}
                        className="text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        Periksa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedAttendance && (
        <LecturerResolveModal
          attendance={selectedAttendance}
          onClose={() => setSelectedAttendance(null)}
          onResolve={handleResolve}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};
