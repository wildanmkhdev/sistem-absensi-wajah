// Sesi role demo: disimpan di sessionStorage agar berakhir saat tab ditutup.
// Ini bukan autentikasi nyata; hanya gate UX untuk memisahkan alur dosen/mahasiswa.

export type Role = 'mahasiswa' | 'dosen';

export interface Session {
  role: Role;
  nim: string;
  name: string;
}

const STORAGE_KEY = 'presensi.session.v1';

const isRole = (value: unknown): value is Role => value === 'mahasiswa' || value === 'dosen';

export function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const candidate = parsed as Partial<Session>;
    if (!isRole(candidate.role)) return null;
    if (typeof candidate.nim !== 'string') return null;
    if (typeof candidate.name !== 'string' || candidate.name.trim() === '') return null;

    return { role: candidate.role, nim: candidate.nim, name: candidate.name };
  } catch {
    return null;
  }
}

export function writeSession(session: Session): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage tidak tersedia (mode privat / kuota penuh): abaikan.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // tidak ada yang perlu dilakukan bila storage tidak dapat diakses.
  }
}
