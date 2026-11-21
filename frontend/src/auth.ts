// Sesi autentikasi: token Bearer + identitas dari server.
// Disimpan di localStorage agar sesi bertahan setelah refresh; server tetap
// memvalidasi tanda tangan & masa berlaku token pada setiap permintaan.

export type Role = 'mahasiswa' | 'dosen';

export interface Session {
  role: Role;
  nim: string;
  name: string;
  username: string;
  token: string;
}

const STORAGE_KEY = 'presensi.auth.v1';

const isRole = (value: unknown): value is Role => value === 'mahasiswa' || value === 'dosen';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const candidate = parsed as Partial<Session>;
    if (!isRole(candidate.role)) return null;
    if (!isNonEmptyString(candidate.token)) return null;
    if (!isNonEmptyString(candidate.username)) return null;
    if (!isNonEmptyString(candidate.name)) return null;
    if (typeof candidate.nim !== 'string') return null;

    return {
      role: candidate.role,
      nim: candidate.nim,
      name: candidate.name,
      username: candidate.username,
      token: candidate.token,
    };
  } catch {
    return null;
  }
}

export function writeSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage tidak tersedia (mode privat / kuota penuh): sesi hanya di memori.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // tidak ada yang perlu dilakukan bila storage tidak dapat diakses.
  }
}