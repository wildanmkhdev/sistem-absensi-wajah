import React from 'react';
import { ShieldCheck, BookOpen, Scale, AlertOctagon, X, CheckCircle, FileText } from 'lucide-react';

interface UuPdpExplainerProps {
  onClose: () => void;
}

export const UuPdpExplainer: React.FC<UuPdpExplainerProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Analisis Etika AI & Kepatuhan UU PDP No. 27 Tahun 2022
              </h2>
              <p className="text-xs text-slate-400">
                Studi Kasus Kelompok 6: Sistem Presensi Kuliah Berbasis Pengenalan Wajah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Article Breakdown */}
        <div className="space-y-4 text-xs text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
          {/* Pasal 4 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold mb-1">
              <FileText className="w-4 h-4" />
              <span>Pasal 4 UU PDP: Klasifikasi Data Pribadi</span>
            </div>
            <p className="leading-relaxed">
              Data biometrik wajah dikategorikan sebagai <strong className="text-white">Data Pribadi yang Bersifat Spesifik</strong> (Pasal 4 ayat 2 huruf c). Pemrosesan data biometrik memiliki risiko diskriminasi dan dampak privasi yang jauh lebih tinggi daripada data umum (seperti nama atau NIM).
            </p>
          </div>

          {/* Pasal 34 - Core Focus */}
          <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-500/30">
            <div className="flex items-center space-x-2 text-blue-300 font-bold mb-1">
              <AlertOctagon className="w-4 h-4 text-cyan-400" />
              <span>Pasal 34 UU PDP: Larangan Otomasi Tunggal yang Merugikan</span>
            </div>
            <p className="leading-relaxed">
              Pengendali Data Pribadi <strong className="text-white">dilarang membuat keputusan yang semata-mata didasarkan pada pemrosesan otomatis</strong>, termasuk pembuatan profil (profiling), yang menimbulkan akibat hukum atau berdampak signifikan pada Subjek Data Pribadi.
            </p>
            <div className="mt-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300">
              <span className="font-semibold text-cyan-300">Dampak Nyata Kasus:</span> Bila presensi dinyatakan Tidak Sah secara otomatis &gt;25% pertemuan, mahasiswa otomatis dilarang mengikuti ujian akhir. Maka keputusan tidak boleh 100% bergantung pada algoritma AI tanpa intervensi manusia (human oversight).
            </div>
          </div>

          {/* Mengapa M3, M4, M5 Tidak Boleh Dinyatakan Tidak Sah Sepihak? */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 font-bold">
              <BookOpen className="w-4 h-4" />
              <span>Jawaban Studi Kasus: Mengapa Kasus M3, M4, dan M5 Wajib Human Oversight?</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-slate-300">
              <li>
                <strong className="text-white">M3 (Skor 0.78, Kacamata/Redup):</strong> Algoritma AI rentan terhadap perubahan aksesoris dan pencahayaan, padahal mahasiswa hadir fisik tepat waktu.
              </li>
              <li>
                <strong className="text-white">M4 (GPS 70m, Gedung Beton):</strong> GPS multipath error pada gedung bertingkat adalah limitasi fisik sensor ponsel, bukan kecurangan mahasiswa.
              </li>
              <li>
                <strong className="text-white">M5 (Skor 0.40, Foto 6 Thn):</strong> Kesalahan terjadi pada basis data lama kampus (pelanggaran prinsip akurasi Pasal 4). Mahasiswa berhak atas pemutakhiran data.
              </li>
            </ul>
          </div>

          {/* Prinsip Human-in-the-Loop */}
          <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/30">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Rancangan Alur Eskalasi & Solusi Human-in-the-Loop</span>
            </div>
            <div className="space-y-1 text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Status perantara <strong>PERLU_VERIFIKASI_DOSEN</strong> untuk zona ambang (skor 0.70-0.84 atau jarak 51-100m).</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Dosen pengampu dapat mengesahkan kehadiran langsung di ruang kuliah.</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Seluruh keputusan manual dicatat dengan timestamp dan catatan pertanggungjawaban.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
          >
            Tutup Penjelasan
          </button>
        </div>
      </div>
    </div>
  );
};
