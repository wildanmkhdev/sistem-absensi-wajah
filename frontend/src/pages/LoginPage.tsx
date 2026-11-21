import React, { useEffect, useMemo, useState } from 'react';
import { Camera, GraduationCap, Loader2, ShieldCheck } from 'lucide-react';
import { DEFAULT_STUDENTS, fetchStudents } from '../api';
import type { Role, Session } from '../auth';
import type { Student } from '../types';

interface LoginPageProps {
  onLogin: (session: Session) => void;
}

const LECTURER_DEFAULT = 'Dosen Pengampu';

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<Role>('mahasiswa');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [studentsFailed, setStudentsFailed] = useState(false);
  const [nim, setNim] = useState('');
  const [name, setName] = useState('');
  const [lecturerName, setLecturerName] = useState(LECTURER_DEFAULT);

  useEffect(() => {
    let active = true;

    fetchStudents()
      .then((list) => {
        if (!active) return;
        setStudents(list);
        const first = list[0];
        if (first) {
          setNim(first.nim);
          setName(first.name);
        }
      })
      .catch(() => {
        if (!active) return;
        setStudents(DEFAULT_STUDENTS);
        setStudentsFailed(true);
      })
      .finally(() => {
        if (active) setIsLoadingStudents(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const useManualEntry = studentsFailed || students.length === 0;

  const canSubmit = useMemo(() => {
    if (mode === 'dosen') return true;
    return nim.trim() !== '' && name.trim() !== '';
  }, [mode, nim, name]);

  const handleSelectStudent = (selectedNim: string) => {
    setNim(selectedNim);
    const selected = students.find((student) => student.nim === selectedNim);
    setName(selected?.name ?? '');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    if (mode === 'dosen') {
      onLogin({ role: 'dosen', nim: '', name: lecturerName.trim() || LECTURER_DEFAULT });
      return;
    }

    onLogin({ role: 'mahasiswa', nim: nim.trim(), name: name.trim() });
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 transition';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center px-4 py-10 font-sans selection:bg-teal-100 selection:text-teal-900">
      <div className="w-full max-w-md mx-auto space-y-5">
        <div className="flex items-center justify-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-800">
            Presen<span className="text-teal-600">SI</span>
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-4">
          <div className="space-y-1">
            <h1 className="text-sm font-extrabold text-slate-800">Masuk sebagai</h1>
            <p className="text-xs text-slate-500">Pilih peran untuk melanjutkan.</p>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {(['mahasiswa', 'dosen'] as Role[]).map((option) => {
              const isActive = mode === option;
              const Icon = option === 'mahasiswa' ? GraduationCap : ShieldCheck;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={`flex items-center justify-center space-x-1.5 rounded-lg px-3 py-2 text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-white text-teal-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span className="capitalize">{option}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'mahasiswa' ? (
              isLoadingStudents ? (
                <div className="flex items-center justify-center space-x-2 py-6 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memuat daftar mahasiswa…</span>
                </div>
              ) : useManualEntry ? (
                <div className="space-y-3">
                  {studentsFailed && (
                    <p className="rounded-lg border border-amber-200/70 bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-700">
                      Daftar mahasiswa tidak dapat dimuat. Isi NIM dan nama secara manual.
                    </p>
                  )}
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">NIM</span>
                    <input
                      type="text"
                      value={nim}
                      onChange={(event) => setNim(event.target.value)}
                      placeholder="210101"
                      inputMode="numeric"
                      className={inputClass}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Nama</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Nama lengkap"
                      className={inputClass}
                    />
                  </label>
                </div>
              ) : (
                <label className="block space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Mahasiswa</span>
                  <select
                    value={nim}
                    onChange={(event) => handleSelectStudent(event.target.value)}
                    className={`${inputClass} appearance-none`}
                  >
                    {students.map((student) => (
                      <option key={student.nim} value={student.nim}>
                        {student.nim} — {student.name}
                      </option>
                    ))}
                  </select>
                  <span className="block pt-1 text-[11px] text-slate-400">Nama terisi otomatis dari NIM.</span>
                </label>
              )
            ) : (
              <label className="block space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Nama Dosen</span>
                <input
                  type="text"
                  value={lecturerName}
                  onChange={(event) => setLecturerName(event.target.value)}
                  placeholder={LECTURER_DEFAULT}
                  className={inputClass}
                />
              </label>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-xs transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              Masuk
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          UU PDP No. 27/2022 • Data biometrik hanya dipakai untuk presensi.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;