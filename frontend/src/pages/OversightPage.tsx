import React, { useState, useEffect } from 'react';
import { CheckCircle, RefreshCw, Search } from 'lucide-react';
import { fetchOversightAttendances, resolveOversight } from '../api';
import { LecturerResolveModal } from '../components/LecturerResolveModal';
import type { AttendanceRecord } from '../types';

interface OversightPageProps {
  lecturerName: string;
  onOversightUpdated?: () => void;
}

export const OversightPage: React.FC<OversightPageProps> = ({
  lecturerName,
  onOversightUpdated,
}) => {
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
        lecturer_name: lecturerName,
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
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
              Review Dosen
            </h1>
            <span className="text-[10px] font-bold bg-teal-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
              {pendingList.length} menunggu
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kasus ambang batas memerlukan keputusan manusia (UU PDP Pasal 34).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIM / Nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 transition"
            />
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            aria-label="Segarkan data"
            title="Segarkan data"
            className="flex items-center justify-center text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 p-2 rounded-xl border border-slate-200 transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
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

      {/* Pending Table */}
      <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
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
                  <th className="px-3 py-3 text-center">Skor</th>
                  <th className="px-3 py-3 text-center">Jarak</th>
                  <th className="px-3 py-3 text-center">Telat</th>
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
                        <span className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/70">
                          Kasus {item.simulated_case}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3.5 text-center">
                      <span className="font-bold text-teal-700 font-mono">
                        {(item.similarity_score * 100).toFixed(0)}%
                      </span>
                    </td>

                    <td className="px-3 py-3.5 text-center font-medium text-slate-700">
                      {item.distance_meters.toFixed(0)}m
                    </td>

                    <td className="px-3 py-3.5 text-center font-medium text-slate-700">
                      {item.late_minutes}m
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedAttendance(item)}
                        className="text-xs font-bold bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-3.5 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
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
