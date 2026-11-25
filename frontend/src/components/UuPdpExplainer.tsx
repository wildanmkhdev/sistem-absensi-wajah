import React from 'react';
import { BookOpen, Scale, AlertOctagon, X, CheckCircle2, FileText, ChevronDown } from 'lucide-react';
import { IconAcademicShield } from './icons/FlaticonIcons';

interface UuPdpExplainerProps {
  onClose: () => void;
}

export const UuPdpExplainer: React.FC<UuPdpExplainerProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--shadow)]/65 backdrop-blur-[2px] animate-fade-in overflow-y-auto">
      <div className="hlb-panel max-w-2xl w-full p-5 sm:p-6 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-[var(--edge)] pb-3.5">
          <div className="flex items-start space-x-3">
            <div className="w-11 h-11 rounded-xl bg-[var(--yellow)] border-2 border-[var(--on-yellow)] shadow-[3px_3px_0_var(--shadow)] flex items-center justify-center text-[var(--on-yellow)] shrink-0">
              <IconAcademicShield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="hlb-tag paper">UU PDP 27/2022</span>
                <span className="hlb-tag neutral">METHOD &amp; ETHICS</span>
              </div>
              <h2 className="font-display font-normal text-xl sm:text-2xl text-[var(--ink)] leading-tight">
                Analisis Etika AI &amp; UU PDP No. 27 Tahun 2022
              </h2>
              <p className="font-sans text-xs sm:text-sm text-[var(--soft)] mt-0.5">
                Studi Kasus: Sistem Presensi Kuliah Berbasis Pengenalan Wajah &amp; Human Oversight
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="hlb-btn-secondary p-2 rounded-xl cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsible Editorial FAQ / Method Breakdown */}
        <div className="divide-y divide-[var(--line)] border-y-2 border-[var(--edge)] max-h-[60vh] overflow-y-auto pr-1 font-sans text-xs sm:text-sm text-[var(--soft)]">
          {/* Pasal 4 */}
          <details open className="group py-3.5">
            <summary className="flex items-center justify-between gap-2 cursor-pointer list-none select-none">
              <div className="flex items-center space-x-2 text-[var(--ink)] font-semibold">
                <FileText className="w-4 h-4 text-[var(--blue)] shrink-0" />
                <span>Pasal 4 UU PDP: Klasifikasi Data Pribadi Spesifik</span>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--soft)] shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="leading-relaxed text-xs text-[var(--soft)] mt-2.5 pl-6">
              Data biometrik wajah dikategorikan sebagai{' '}
              <strong className="text-[var(--ink)] font-semibold">Data Pribadi yang Bersifat Spesifik</strong>{' '}
              (Pasal 4 ayat 2 huruf c). Pemrosesan data biometrik memiliki risiko diskriminasi dan dampak privasi tinggi, sehingga wajib dikelola dengan prinsip akurasi, pembatasan tujuan, dan perlindungan ketat.
            </p>
          </details>

          {/* Pasal 34 - Core Focus */}
          <details open className="group py-3.5">
            <summary className="flex items-center justify-between gap-2 cursor-pointer list-none select-none">
              <div className="flex items-center space-x-2 text-[var(--ink)] font-semibold">
                <AlertOctagon className="w-4 h-4 text-[var(--red)] shrink-0" />
                <span>Pasal 34 UU PDP: Larangan Keputusan Otomasi Tunggal yang Merugikan</span>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--soft)] shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2.5 pl-6 space-y-2.5">
              <p className="leading-relaxed text-xs text-[var(--soft)]">
                Pengendali Data Pribadi{' '}
                <strong className="text-[var(--ink)] font-semibold">
                  dilarang membuat keputusan yang semata-mata didasarkan pada pemrosesan otomatis
                </strong>
                , termasuk profiling biometrik, yang menimbulkan akibat hukum atau berdampak signifikan pada Subjek Data Pribadi (Mahasiswa).
              </p>
              <div className="hlb-alert info p-3 text-xs text-[var(--ink)]">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold block mb-1">
                  Dampak Akademik
                </span>
                <p className="leading-relaxed text-[var(--soft)]">
                  Bila presensi dinyatakan Tidak Sah secara otomatis &gt;25% pertemuan, mahasiswa dilarang mengikuti ujian akhir semester. Maka keputusan final tidak boleh 100% bergantung pada algoritma AI tanpa intervensi pengawasan manusia (human oversight).
                </p>
              </div>
            </div>
          </details>

          {/* Mengapa M3, M4, M5 Wajib Human Oversight? */}
          <details open className="group py-3.5">
            <summary className="flex items-center justify-between gap-2 cursor-pointer list-none select-none">
              <div className="flex items-center space-x-2 text-[var(--ink)] font-semibold">
                <BookOpen className="w-4 h-4 text-[var(--orange)] shrink-0" />
                <span>Mengapa Kasus M3, M4, dan M5 Wajib Human Oversight?</span>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--soft)] shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="space-y-2 text-xs text-[var(--soft)] mt-2.5 pl-6">
              <li className="flex items-start space-x-2">
                <span className="hlb-tag paper shrink-0 mt-0.5">M3</span>
                <div className="leading-relaxed">
                  <strong className="text-[var(--ink)] font-semibold">Skor 0.78, Kacamata/Redup:</strong>{' '}
                  Algoritma AI rentan terhadap variasi aksesoris baru dan pencahayaan redup, padahal mahasiswa hadir fisik tepat waktu di kelas.
                </div>
              </li>
              <li className="flex items-start space-x-2">
                <span className="hlb-tag paper shrink-0 mt-0.5">M4</span>
                <div className="leading-relaxed">
                  <strong className="text-[var(--ink)] font-semibold">GPS 70m, Gedung Beton:</strong>{' '}
                  GPS drift terjadi karena degradasi fisik sinyal beton gedung kuliah (multipath error), bukan kecurangan mahasiswa.
                </div>
              </li>
              <li className="flex items-start space-x-2">
                <span className="hlb-tag paper shrink-0 mt-0.5">M5</span>
                <div className="leading-relaxed">
                  <strong className="text-[var(--ink)] font-semibold">Skor 0.40, Foto Usang:</strong>{' '}
                  Ketidakcocokan bersumber dari foto KTM usang di sistem kampus (pelanggaran prinsip akurasi data). Mahasiswa berhak memutakhirkan datanya.
                </div>
              </li>
            </ul>
          </details>

          {/* Prinsip Human-in-the-Loop */}
          <details open className="group py-3.5">
            <summary className="flex items-center justify-between gap-2 cursor-pointer list-none select-none">
              <div className="flex items-center space-x-2 text-[var(--ink)] font-semibold">
                <Scale className="w-4 h-4 text-[var(--green)] shrink-0" />
                <span>Solusi Berkeadilan: Human-in-the-Loop Dosen</span>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--soft)] shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-2 text-xs text-[var(--soft)] mt-2.5 pl-6">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)] shrink-0 mt-0.5" />
                <span>
                  Status transisi{' '}
                  <strong className="font-mono text-[11px] text-[var(--ink)]">PERLU_VERIFIKASI_DOSEN</strong>{' '}
                  untuk skor ambang (0.70–0.84) atau jarak 51–100m.
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)] shrink-0 mt-0.5" />
                <span>
                  Dosen pengampu memverifikasi kehadiran fisik dan memberikan catatan audit berintegritas.
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)] shrink-0 mt-0.5" />
                <span>
                  Seluruh keputusan audit dicatat di database PostgreSQL untuk akuntabilitas hukum.
                </span>
              </div>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="pt-1 flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--soft)]">
            PresenSI • Tata Kelola Biometrik Akademik
          </span>
          <button
            type="button"
            onClick={onClose}
            className="hlb-btn-primary text-xs uppercase tracking-wider px-5 py-2 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
