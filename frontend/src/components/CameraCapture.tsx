import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Upload, AlertCircle, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
import { SAMPLE_SELFIES } from '../assets/sampleFaces';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  capturedImage: string | null;
  onClearCapture: () => void;
  disabled?: boolean;
  selectedCaseId?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  capturedImage,
  onClearCapture,
  disabled = false,
  selectedCaseId = 'M1',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setCameraError(null);

    // Stop current stream if running
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam tidak didukung oleh browser ini.');
      }

      let stream: MediaStream;

      // Coba akses kamera
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });
      } catch {
        // Fallback constraint paling universal
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      // Pasang stream ke elemen video yang selalu ada di DOM
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.warn('Autoplay prevented:', e));
        };
        await videoRef.current.play().catch((e) => console.warn('Play error:', e));
      }

      setCameraActive(true);
    } catch (err: unknown) {
      console.warn('Webcam start failed:', err);
      const msg = err instanceof Error ? err.message : 'Gagal mengakses webcam.';
      setCameraError(msg);
      setCameraActive(false);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Mulai kamera saat komponen dimuat atau saat capturedImage dihapus
  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [capturedImage, startCamera, stopCamera]);

  // Jaminan stream terhubung bila videoRef ter-attach
  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  const takeSnapshot = () => {
    if (!videoRef.current) return;

    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontal untuk selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Data = canvas.toDataURL('image/jpeg', 0.9);
    onCapture(base64Data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onCapture(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseSamplePhoto = (caseId: string) => {
    const sample = SAMPLE_SELFIES[caseId] || SAMPLE_SELFIES['M1'];
    if (sample) {
      onCapture(sample);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Pemindai Wajah</h3>
            <p className="text-[11px] text-slate-400">Posisikan wajah di dalam lingkaran panduan</p>
          </div>
        </div>

        {capturedImage ? (
          <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <Check className="w-3.5 h-3.5" />
            <span>Foto Siap</span>
          </span>
        ) : cameraActive ? (
          <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>Kamera Aktif</span>
          </span>
        ) : null}
      </div>

      {/* Viewport Box - Always contains <video> in DOM */}
      <div className="relative w-full aspect-4/3 max-h-[360px] bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
        {/* Shutter White Flash Animation */}
        {shutterFlash && (
          <div className="absolute inset-0 bg-white z-30 transition-opacity duration-200 opacity-90 pointer-events-none" />
        )}

        {/* Live Video Element - ALWAYS MOUNTED IN DOM TO AVOID NULL REF */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1] ${
            !capturedImage && cameraActive ? 'block' : 'hidden'
          }`}
        />

        {/* Live Oval Silhouette Guide */}
        {!capturedImage && cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[190px] h-[240px] sm:w-[220px] sm:h-[280px] rounded-[50%] border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(15,23,42,0.4)] flex flex-col items-center justify-between p-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-white bg-slate-900/70 px-2.5 py-0.5 rounded-full mt-2">
                Posisikan Wajah
              </span>
              <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse mb-2" />
            </div>
          </div>
        )}

        {/* View 1: Display Captured Image */}
        {capturedImage && (
          <div className="relative w-full h-full">
            <img
              src={capturedImage}
              alt="Hasil Swafoto"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-sm border border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Foto Wajah Terpilih</span>
              </span>
              <button
                type="button"
                onClick={onClearCapture}
                disabled={disabled}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition cursor-pointer"
              >
                Ambil Ulang
              </button>
            </div>
          </div>
        )}

        {/* View 2: Camera Error / Inactive State */}
        {!capturedImage && !cameraActive && (
          <div className="text-center p-6 space-y-3 max-w-sm z-10">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                {isInitializing ? 'Memulai webcam...' : cameraError || 'Webcam belum aktif.'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Pastikan izin webcam diberikan pada browser, atau gunakan opsi di bawah.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={startCamera}
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
              >
                Aktifkan Webcam
              </button>
              <button
                type="button"
                onClick={() => handleUseSamplePhoto(selectedCaseId)}
                className="text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl border border-slate-700 transition flex items-center space-x-1 cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Foto Sampel</span>
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Shutter / Action Controls */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center space-x-1 py-1.5 px-3 rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Foto</span>
          </button>

          <button
            type="button"
            onClick={() => handleUseSamplePhoto(selectedCaseId)}
            disabled={disabled}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Foto Sampel ({selectedCaseId})</span>
          </button>
        </div>

        {!capturedImage && cameraActive && (
          <button
            type="button"
            onClick={takeSnapshot}
            disabled={disabled}
            className="flex items-center space-x-2 py-2 px-5 rounded-2xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 active:scale-95 transition cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Ambil Foto</span>
          </button>
        )}

        {capturedImage && (
          <button
            type="button"
            onClick={onClearCapture}
            disabled={disabled}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1 py-1 px-3 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Foto Lain</span>
          </button>
        )}
      </div>
    </div>
  );
};
