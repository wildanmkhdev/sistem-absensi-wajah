import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  MapPin,
  Clock,
  ChevronsUpDown,
  Check,
  CheckCheck,
  CircleDot,
} from 'lucide-react';
import type { AttendanceRecord, SessionInfo } from '../types';

interface CourseSelectProps {
  sessions: SessionInfo[];
  selectedSessionId: number | null;
  onSelectSession: (sessionId: number) => void;
  records: AttendanceRecord[];
}

const formatTimeShort = (isoString?: string | null): string => {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

export const CourseSelect: React.FC<CourseSelectProps> = ({
  sessions,
  selectedSessionId,
  onSelectSession,
  records,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const isSelectedAttended = selectedSession
    ? records.some((r) => r.session_id === selectedSession.id)
    : false;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!selectedSession) return null;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Neo-Brutalist Select Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full p-3.5 rounded-xl border-2 border-[var(--edge)] text-left transition-all flex items-center justify-between cursor-pointer shadow-[3px_3px_0_var(--shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] ${
          isOpen ? 'bg-[var(--paper)]' : 'bg-[var(--surface)] hover:bg-[var(--hover)]'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
          <div className="w-10 h-10 rounded-xl bg-[var(--paper)] border-2 border-[var(--edge)] flex items-center justify-center text-[var(--ink)] shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-sans font-semibold text-sm text-[var(--ink)] truncate">
                {selectedSession.course_name}
              </span>
              <span className="text-[11px] font-mono text-[var(--soft)] shrink-0">
                ({selectedSession.course_code})
              </span>
            </div>

            <div className="flex items-center space-x-2 mt-0.5 text-xs text-[var(--soft)] truncate">
              <span className="flex items-center space-x-1 shrink-0">
                <MapPin className="w-3 h-3 text-[var(--soft)]" />
                <span className="truncate">{selectedSession.room_name || 'Ruang Kuliah'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1 font-mono text-[11px] tabular-nums shrink-0">
                <Clock className="w-3 h-3 text-[var(--soft)]" />
                <span>
                  {formatTimeShort(selectedSession.starts_at)} – {formatTimeShort(selectedSession.ends_at)}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {isSelectedAttended ? (
            <span className="hlb-tag ok inline-flex items-center gap-1">
              <CheckCheck className="w-3 h-3" />
              <span>Tercatat</span>
            </span>
          ) : (
            <span className="hlb-tag accent inline-flex items-center gap-1">
              <CircleDot className="w-3 h-3" />
              <span>Buka</span>
            </span>
          )}
          <ChevronsUpDown className="w-4 h-4 text-[var(--ink)]" />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 z-40 hlb-panel p-2 space-y-1 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-[var(--soft)] uppercase border-b border-[var(--line)]">
            Pilih Mata Kuliah Aktif
          </div>

          {sessions.map((session) => {
            const isSelected = session.id === selectedSession.id;
            const isAttended = records.some((r) => r.session_id === session.id);

            return (
              <button
                key={session.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectSession(session.id);
                  setIsOpen(false);
                }}
                className={`w-full p-2.5 rounded-xl text-left transition flex items-center justify-between cursor-pointer border-2 ${
                  isSelected
                    ? 'bg-[var(--paper)] border-[var(--edge)] text-[var(--ink)] font-semibold'
                    : 'border-transparent hover:bg-[var(--hover)] text-[var(--ink)]'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    {isSelected ? <Check className="w-4 h-4 text-[var(--ink)]" /> : null}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-sans font-semibold text-xs sm:text-sm truncate">
                        {session.course_name}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--soft)] shrink-0">
                        ({session.course_code})
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-[var(--soft)]">
                      <span className="flex items-center space-x-1 shrink-0">
                        <MapPin className="w-3 h-3 text-[var(--soft)]" />
                        <span className="truncate">{session.room_name || 'Ruang Kuliah'}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1 font-mono tabular-nums shrink-0">
                        <Clock className="w-3 h-3 text-[var(--soft)]" />
                        <span>
                          {formatTimeShort(session.starts_at)} – {formatTimeShort(session.ends_at)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isAttended ? (
                    <span className="hlb-tag ok inline-flex items-center gap-1">
                      <CheckCheck className="w-3 h-3" />
                      <span>Tercatat</span>
                    </span>
                  ) : (
                    <span className="hlb-tag accent inline-flex items-center gap-1">
                      <CircleDot className="w-3 h-3" />
                      <span>Buka</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
