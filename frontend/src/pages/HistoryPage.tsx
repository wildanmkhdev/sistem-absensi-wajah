import React, { useEffect, useState } from 'react';
import { History, RefreshCw, Search } from 'lucide-react';
import { fetchAttendances } from '../api';
import type { AttendanceRecord, AttendanceStatus } from '../types';
import type { Role } from '../auth';
import { IconVerifiedCheck } from '../components/icons/FlaticonIcons';
import { formatDistance } from '../utils/geo';

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

const STATUS_CONFIG: Record<AttendanceStatus, { tag: string; label: string }> = {
  HADIR: { tag: 'ok', label: 'Hadir' },
  TERLAMBAT: { tag: 'accent', label: 'Terlambat' },
  PERLU_VERIFIKASI_DOSEN: { tag: 'paper', label: 'Oversight' },
  TIDAK_SAH: { tag: 'warn', label: 'Ditolak' },
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'HADIR', label: 'Hadir Tepat' },
  { value: 'TERLAMBAT', label: 'Terlambat' },
  { value: 'PERLU_VERIFIKASI_DOSEN', label: 'Review Dosen' },
  { value: 'TIDAK_SAH', label: 'Ditolak' },
];

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
    void loadData();
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

  const title = isLecturer ? 'Riwayat Presensi Kelas' : 'Riwayat Presensi Saya';

  return (
    <div className="space-y-5 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="hlb-panel p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-[var(--mint)] border-2 border-[var(--edge)] shadow-[3px_3px_0_var(--shadow)] flex items-center justify-center shrink-0">
            <IconVerifiedCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display font-normal text-2xl sm:text-3xl leading-tight text-[var(--ink)]">
                {title}
              </h1>
              <span className="hlb-tag paper font-mono tabular-nums">
                {filteredList.length} Rekaman
              </span>
            </div>
            <p className="text-sm text-[var(--soft)] mt-0.5">
              Audit log presensi biometrik wajah, jarak GPS geofence, dan keputusan verifikasi dosen.
            </p>
          </div>
        </div>

        <button
          onClick={() => void loadData()}
          disabled={isLoading}
          className="hlb-btn-secondary text-xs font-mono uppercase tracking-wider px-4 py-2.5 flex items-center gap-2 cursor-pointer self-start sm:self-center shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Lecturer Filter Chips and Search Bar */}
      {isLecturer && (
        <div className="hlb-panel p-4 space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_OPTIONS.map((opt) => {
              const isActive = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`hlb-chip text-[11px] font-mono uppercase tracking-wider px-3.5 py-1.5 cursor-pointer ${
                    isActive ? 'hlb-chip-on' : ''
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--soft)]" />
            <input
              type="text"
              placeholder="Cari NIM, Nama Mahasiswa, atau Kasus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="hlb-input w-full text-sm pl-10 pr-3.5 py-2.5"
            />
          </div>
        </div>
      )}

      {/* Content Table / Mobile Cards */}
      <div className="hlb-panel overflow-hidden">
        {isLoading ? (
          <div className="py-14 flex flex-col items-center justify-center text-[var(--soft)] gap-2.5">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--soft)]" />
            <span className="font-mono text-xs uppercase tracking-wider">
              Memuat log presensi...
            </span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[var(--bg)] border-2 border-[var(--edge)] flex items-center justify-center mx-auto">
              <History className="w-6 h-6 text-[var(--soft)]" />
            </div>
            <p className="font-display font-normal text-2xl text-[var(--ink)]">
              Tidak Ada Rekaman Ditemukan
            </p>
            <p className="text-sm text-[var(--soft)]">
              {isLecturer
                ? 'Belum ada presensi yang cocok dengan filter pencarian.'
                : 'Silakan lakukan presensi pada menu Presensi.'}
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
                    <th className="px-3 py-3.5 text-center">Waktu</th>
                    <th className="px-3 py-3.5 text-center">Skor Wajah</th>
                    <th className="px-3 py-3.5 text-center">Jarak GPS</th>
                    <th className="px-3 py-3.5 text-center">Telat</th>
                    <th className="px-3 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5">Catatan / Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item) => {
                    const statusConf = STATUS_CONFIG[item.status] || {
                      tag: 'neutral',
                      label: item.status,
                    };
                    return (
                      <tr key={item.id}>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-[var(--ink)]">
                            {item.name || 'Mahasiswa'}
                          </div>
                          <div className="text-xs text-[var(--soft)] font-mono mt-0.5">
                            NIM {item.nim}
                            {item.course_name ? ` • ${item.course_name}` : ''}
                            {item.simulated_case ? ` • ${item.simulated_case}` : ''}
                          </div>
                        </td>

                        <td className="px-3 py-3.5 text-center font-mono text-xs text-[var(--soft)] tabular-nums">
                          {formatTime(item.timestamp)}
                        </td>

                        <td className="px-3 py-3.5 text-center font-mono text-xs font-semibold text-[var(--ink)] tabular-nums">
                          {(item.similarity_score * 100).toFixed(0)}%
                        </td>

                        <td className="px-3 py-3.5 text-center font-mono text-xs text-[var(--soft)] tabular-nums">
                          {formatDistance(item.distance_meters)}
                        </td>

                        <td className="px-3 py-3.5 text-center font-mono text-xs text-[var(--soft)] tabular-nums">
                          {item.late_minutes}m
                        </td>

                        <td className="px-3 py-3.5 text-center whitespace-nowrap">
                          <span className={`hlb-tag ${statusConf.tag}`}>
                            {statusConf.label}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 max-w-xs text-[var(--soft)] text-xs">
                          <div
                            className="line-clamp-2"
                            title={item.lecturer_note || item.decision_reason}
                          >
                            {item.lecturer_note ? (
                              <span className="text-[var(--ink)] font-semibold">
                                [Dosen]: {item.lecturer_note}
                              </span>
                            ) : (
                              item.decision_reason
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-4 space-y-3">
              {filteredList.map((item) => {
                const statusConf = STATUS_CONFIG[item.status] || {
                  tag: 'neutral',
                  label: item.status,
                };
                return (
                  <div key={item.id} className="hlb-tile p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-[var(--ink)] text-sm">
                          {item.name || 'Mahasiswa'}
                        </div>
                        <div className="font-mono text-[11px] text-[var(--soft)] truncate">
                          NIM {item.nim}
                          {item.simulated_case ? ` • ${item.simulated_case}` : ''}
                        </div>
                      </div>
                      <span className={`hlb-tag ${statusConf.tag} shrink-0`}>
                        {statusConf.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-lg p-1.5">
                        <span className="block font-mono text-[9px] uppercase text-[var(--soft)]">
                          Waktu
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[var(--ink)] tabular-nums">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-lg p-1.5">
                        <span className="block font-mono text-[9px] uppercase text-[var(--soft)]">
                          Wajah
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[var(--ink)] tabular-nums">
                          {(item.similarity_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-lg p-1.5">
                        <span className="block font-mono text-[9px] uppercase text-[var(--soft)]">
                          GPS
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[var(--ink)] tabular-nums">
                          {formatDistance(item.distance_meters)}
                        </span>
                      </div>
                      <div className="bg-[var(--bg)] border border-[var(--line)] rounded-lg p-1.5">
                        <span className="block font-mono text-[9px] uppercase text-[var(--soft)]">
                          Telat
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[var(--ink)] tabular-nums">
                          {item.late_minutes}m
                        </span>
                      </div>
                    </div>

                    {(item.lecturer_note || item.decision_reason) && (
                      <div className="text-xs text-[var(--soft)] bg-[var(--bg)] border border-[var(--line)] rounded-lg p-2.5 leading-relaxed">
                        {item.lecturer_note ? (
                          <span className="text-[var(--ink)] font-semibold">
                            [Dosen]: {item.lecturer_note}
                          </span>
                        ) : (
                          item.decision_reason
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
