import React, { useState, useEffect } from 'react';
import { CheckCircle, RefreshCw, Search } from 'lucide-react';
import { fetchOversightAttendances, resolveOversight } from '../api';
import { LecturerResolveModal } from '../components/LecturerResolveModal';
import type { AttendanceRecord } from '../types';
import { IconAuditScale } from '../components/icons/FlaticonIcons';
import { formatDistance } from '../utils/geo';

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
          }.`,
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
    <div className="space-y-5 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="hlb-panel p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[var(--yellow)] border-2 border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)] flex items-center justify-center shrink-0">
            <IconAuditScale className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display font-normal text-2xl sm:text-3xl leading-tight text-[var(--ink)]">
                Review Verifikasi Dosen
              </h1>
              <span
                className={`hlb-tag font-mono tabular-nums ${
                  pendingList.length > 0 ? 'accent' : 'ok'
                }`}
              >
                {pendingList.length} Antrean
              </span>
            </div>
            <p className="text-sm text-[var(--soft)] mt-0.5">
              Intervensi manusia atas anomali biometrik &amp; geofence (UU PDP No. 27/2022 Pasal 34).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--soft)]" />
            <input
              type="text"
              placeholder="Cari NIM atau Nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="hlb-input w-full text-sm pl-10 pr-3.5 py-2"
            />
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            aria-label="Segarkan data"
            title="Segarkan data"
            className="hlb-btn-secondary h-10 w-10 flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`hlb-alert ${
            notification.type === 'success' ? 'success' : 'danger'
          } flex items-center justify-between gap-3 p-4 text-sm font-medium text-[var(--ink)]`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="hlb-btn-secondary text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Pending Queue Panel */}
      <div className="hlb-panel overflow-hidden">
        {isLoading ? (
          <div className="py-14 flex flex-col items-center justify-center text-[var(--soft)] gap-2.5">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--soft)]" />
            <span className="font-mono text-xs uppercase tracking-wider">
              Memuat antrean verifikasi...
            </span>
          </div>
        ) : filteredPending.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[var(--mint)] border-2 border-[var(--edge)] shadow-[3px_3px_0_var(--shadow)] flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 text-[var(--green)]" />
            </div>
            <p className="font-display font-normal text-2xl text-[var(--ink)]">
              Tidak Ada Antrean Verifikasi
            </p>
            <p className="text-sm text-[var(--soft)] max-w-md mx-auto">
              Semua presensi telah tervalidasi atau tidak ada anomali yang membutuhkan intervensi dosen.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="hlb-table w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-3.5">Mahasiswa</th>
                    <th className="px-3 py-3.5 text-center">Skor Wajah</th>
                    <th className="px-3 py-3.5 text-center">Jarak GPS</th>
                    <th className="px-3 py-3.5 text-center">Telat</th>
                    <th className="px-3 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map((item) => (
                    <tr key={item.id} className="bg-[var(--paper)]/50">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[var(--ink)]">
                          {item.name || 'Mahasiswa'}
                        </div>
                        <div className="text-[var(--soft)] font-mono text-xs flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span>NIM {item.nim}</span>
                          {item.simulated_case && (
                            <span className="hlb-tag accent">Kasus {item.simulated_case}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-center font-mono font-semibold text-[var(--ink)] tabular-nums">
                        {(item.similarity_score * 100).toFixed(0)}%
                      </td>

                      <td className="px-3 py-3.5 text-center font-mono text-[var(--soft)] tabular-nums">
                        {formatDistance(item.distance_meters)}
                      </td>

                      <td className="px-3 py-3.5 text-center font-mono text-[var(--soft)] tabular-nums">
                        {item.late_minutes}m
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <span className="hlb-tag paper">Pending Review</span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedAttendance(item)}
                          className="hlb-btn-primary text-xs font-mono uppercase tracking-wider px-4 py-2 cursor-pointer"
                        >
                          Periksa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-3">
              {filteredPending.map((item) => (
                <div
                  key={item.id}
                  className="hlb-tile bg-[var(--paper)] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[var(--ink)] text-base">
                        {item.name || 'Mahasiswa'}
                      </div>
                      <div className="font-mono text-xs text-[var(--soft)]">
                        NIM {item.nim}
                      </div>
                    </div>
                    {item.simulated_case ? (
                      <span className="hlb-tag accent">Kasus {item.simulated_case}</span>
                    ) : (
                      <span className="hlb-tag paper">Pending</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-[var(--surface)] border-2 border-[var(--edge)] rounded-lg p-2">
                      <span className="block font-mono text-[10px] uppercase text-[var(--soft)]">
                        Wajah
                      </span>
                      <span className="font-mono font-semibold text-xs text-[var(--ink)] tabular-nums">
                        {(item.similarity_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="bg-[var(--surface)] border-2 border-[var(--edge)] rounded-lg p-2">
                      <span className="block font-mono text-[10px] uppercase text-[var(--soft)]">
                        GPS
                      </span>
                      <span className="font-mono font-semibold text-xs text-[var(--ink)] tabular-nums">
                        {formatDistance(item.distance_meters)}
                      </span>
                    </div>
                    <div className="bg-[var(--surface)] border-2 border-[var(--edge)] rounded-lg p-2">
                      <span className="block font-mono text-[10px] uppercase text-[var(--soft)]">
                        Telat
                      </span>
                      <span className="font-mono font-semibold text-xs text-[var(--ink)] tabular-nums">
                        {item.late_minutes}m
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedAttendance(item)}
                    className="hlb-btn-primary w-full text-xs font-mono uppercase tracking-wider py-2.5 cursor-pointer"
                  >
                    Periksa &amp; Verifikasi
                  </button>
                </div>
              ))}
            </div>
          </>
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
