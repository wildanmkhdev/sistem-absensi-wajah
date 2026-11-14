import React from 'react';
import { ShieldCheck, BookOpen, Scale, AlertOctagon, X, CheckCircle2, FileText } from 'lucide-react';

interface UuPdpExplainerProps {
  onClose: () => void;
}

export const UuPdpExplainer: React.FC<UuPdpExplainerProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-100 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200 shrink-0">
              <Scale className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800">
                Analisis Etika AI &amp; UU PDP No. 27 Tahun 2022
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Studi Kasus Kelompok 6: Sistem Presensi Kuliah Berbasis Pengenalan Wajah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Article Breakdown */}
        <div className="space-y-4 text-xs text-slate-600 max-h-[62vh] overflow-y-auto pr-1 no-scrollbar">
          {/* Pasal 4 */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center space-x-2 text-orange-700 font-black mb-1">
              <FileText className="w-4 h-4 text-orange-500" />
              <span>Pasal 4 UU PDP: Klasifikasi Data Pribadi Spesifik</span>
            </div>
            <p className="leading-relaxed">
              Data biometrik wajah dikategorikan sebagai <strong className="text-slate-900">Data Pribadi yang Bersifat Spesifik</strong> (Pasal 4 ayat 2 huruf c). Pemrosesan data biometrik memiliki risiko diskriminasi dan dampak privasi tinggi, sehingga wajib dikelola dengan prinsip akurasi, pembatasan tujuan, dan perlindungan ketat.
            </p>
          </div>

          {/* Pasal 34 - Core Focus */}
          <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-200">
            <div className="flex items-center space-x-2 text-orange-800 font-black mb-1">
              <AlertOctagon className="w-4 h-4 text-orange-600" />
              <span>Pasal 34 UU PDP: Larangan Keputusan Otomasi Tunggal yang Merugikan</span>
            </div>
            <p className="leading-relaxed text-slate-700">
              Pengendali Data Pribadi <strong className="text-slate-900">dilarang membuat keputusan yang semata-mata didasarkan pada pemrosesan otomatis</strong>, termasuk profiling biometrik, yang menimbulkan akibat hukum atau berdampak signifikan pada Subjek Data Pribadi (Mahasiswa).
            </p>
            <div className="mt-2.5 bg-white p-3 rounded-xl border border-orange-200/80 text-[11px] text-slate-700">
              <span className="font-bold text-orange-700">Dampak Akademik Nyata:</span> Bila presensi dinyatakan Tidak Sah secara otomatis &gt;25% pertemuan, mahasiswa dilarang mengikuti ujian akhir semester. Maka keputusan final tidak boleh 100% bergantung pada algoritma AI tanpa intervensi pengawasan manusia (human oversight).
            </div>
          </div>

          {/* Mengapa M3, M4, M5 Wajib Human Oversight? */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center space-x-2 text-slate-800 font-black">
              <BookOpen className="w-4 h-4 text-orange-500" />
              <span>Mengapa Kasus M3, M4, dan M5 Wajib Human Oversight?</span>
            </div>
            <ul className="space-y-2 text-slate-600">
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                <div>
                  <strong className="text-slate-900">M3 (Skor 0.78, Kacamata/Redup):</strong> Algoritma AI rentan terhadap variasi aksesoris baru dan pencahayaan redup, padahal mahasiswa hadir fisik tepat waktu di kelas.
                </div>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                <div>
                  <strong className="text-slate-900">M4 (GPS 70m, Gedung Beton):</strong> GPS drift terjadi karena degradasi fisik sinyal beton gedung kuliah (multipath error), bukan kecurangan mahasiswa.
                </div>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                <div>
                  <strong className="text-slate-900">M5 (Skor 0.40, Foto Lama 6 Thn):</strong> Ketidakcocokan bersumber dari foto KTM usang di sistem kampus (pelanggaran prinsip akurasi data). Mahasiswa berhak memutakhirkan datanya.
                </div>
              </li>
            </ul>
          </div>

          {/* Prinsip Human-in-the-Loop */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
            <div className="flex items-center space-x-2 text-emerald-800 font-black mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Solusi Berkeadilan: Human-in-the-Loop Dosen</span>
            </div>
            <div className="space-y-1.5 text-slate-700">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Status transisi <strong>PERLU_VERIFIKASI_DOSEN</strong> untuk skor ambang (0.70-0.84) atau jarak 51-100m.</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dosen pengampu memverifikasi kehadiran fisik dan memberikan catatan audit berintegritas.</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Seluruh keputusan audit dicatat di database Neon PostgreSQL untuk akuntabilitas hukum.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer"
          >
            Tutup Penjelasan
          </button>
        </div>
      </div>
    </div>
  );
};
