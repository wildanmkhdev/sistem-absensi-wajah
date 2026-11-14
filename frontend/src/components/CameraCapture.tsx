import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Upload, AlertCircle, Check, X, SwitchCamera, Sparkles, Image as ImageIcon } from 'lucide-react';
import { SAMPLE_SELFIES } from '../assets/sampleFaces';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  capturedImage: string | null;
  onClearCapture: () => void;
  disabled?: boolean;
  selectedCaseId?: string;
  onSelectCase?: (caseId: string) => void;
  onClose?: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  capturedImage,
  onClearCapture,
  disabled = false,
  selectedCaseId = 'CUSTOM',
  onSelectCase,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

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

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam tidak didukung oleh browser ini.');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode,
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

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
  }, [facingMode]);

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

  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

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

    // Mirror horizontal for user selfie
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
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
    <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
      {/* Top Header - Matches Dribbble Screen 3 ("Ambil Foto Selfie") */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
            Ambil Foto Selfie
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Pastikan wajah anda terlihat jelas di dalam frame
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Camera Viewfinder with Cyan/Teal Face Brackets (Exact Dribbble Match) */}
      <div className="relative w-full aspect-4/3 max-h-[380px] bg-slate-950 overflow-hidden flex items-center justify-center">
        {/* White Shutter Flash Effect */}
        {shutterFlash && (
          <div className="absolute inset-0 bg-white z-40 transition-opacity duration-200 opacity-95 pointer-events-none" />
        )}

        {/* Live Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${
            !capturedImage && cameraActive ? 'block' : 'hidden'
          }`}
        />

        {/* Cyan/Teal Face Guide Brackets - Dribbble Screen 3 */}
        {!capturedImage && cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-6">
            <div className="relative w-56 h-64 sm:w-64 sm:h-72 flex items-center justify-center">
              {/* Top-Left Bracket */}
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-cyan-400 rounded-tl-2xl shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
              {/* Top-Right Bracket */}
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-cyan-400 rounded-tr-2xl shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
              {/* Bottom-Left Bracket */}
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-cyan-400 rounded-bl-2xl shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
              {/* Bottom-Right Bracket */}
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-cyan-400 rounded-br-2xl shadow-[0_0_15px_rgba(6,182,212,0.6)]" />

              {/* Center Target Crosshair / Subtle Pulse */}
              <div className="w-16 h-16 rounded-full border border-cyan-400/30 flex items-center justify-center animate-pulse">
                <Sparkles className="w-5 h-5 text-cyan-300" />
              </div>

              {/* Helper text pill at bottom of viewfinder */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center">
                <span className="text-[11px] font-bold text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-md">
                  Posisikan wajah Anda tegak
                </span>
              </div>
            </div>
          </div>
        )}

        {/* View: Captured Image Display */}
        {capturedImage && (
          <div className="relative w-full h-full">
            <img
              src={capturedImage}
              alt="Hasil Swafoto"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>Foto Siap Dianalisis</span>
            </div>

            <div className="absolute bottom-3 inset-x-3 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-lg border border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5 ml-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Wajah Berhasil Diambil</span>
              </span>
              <button
                type="button"
                onClick={onClearCapture}
                disabled={disabled}
                className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                Ambil Ulang
              </button>
            </div>
          </div>
        )}

        {/* View: Camera Inactive or Error */}
        {!capturedImage && !cameraActive && (
          <div className="text-center p-6 space-y-3 max-w-sm z-10 text-white">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-relaxed">
                {isInitializing ? 'Memulai sensor webcam...' : cameraError || 'Webcam belum aktif.'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Gunakan tombol Upload atau pilih foto sampel KTM di bawah.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition shadow-md cursor-pointer"
            >
              Coba Nyalakan Ulang
            </button>
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

      {/* Bottom Shutter Controls - Exact Dribbble Screen 3 */}
      <div className="p-4 sm:p-5 bg-white space-y-4">
        {/* Dribbble Style 3-Control Bar */}
        <div className="flex items-center justify-around py-1">
          {/* Left: Switch Camera / Flip or Upload */}
          <button
            type="button"
            onClick={toggleFacingMode}
            disabled={disabled}
            className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            title="Ganti Kamera Depan / Belakang"
          >
            <SwitchCamera className="w-5 h-5 text-slate-600" />
          </button>

          {/* Center: Large Vibrant Orange Shutter Button (Dribbble Ref) */}
          <button
            type="button"
            onClick={takeSnapshot}
            disabled={disabled || !cameraActive}
            className={`w-18 h-18 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white shadow-xl shadow-orange-500/35 flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 ${
              disabled || !cameraActive
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:scale-105 hover:shadow-orange-500/50'
            }`}
            title="Ambil Foto Selfie Wajah"
          >
            <div className="w-14 h-14 rounded-full border-2 border-white/80 flex items-center justify-center">
              <Camera className="w-7 h-7" />
            </div>
          </button>

          {/* Right: Upload File KTM / Galeri */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            title="Upload Foto dari Galeri"
          >
            <Upload className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Quick Simulation Bar for Modul 13 Cases M1 to M6 */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>Simulasi Cepat Modul 13:</span>
            </span>
            <button
              type="button"
              onClick={() => handleUseSamplePhoto(selectedCaseId)}
              className="text-orange-600 hover:text-orange-700 font-bold lowercase flex items-center space-x-1 cursor-pointer"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Gunakan Sampel ({selectedCaseId})</span>
            </button>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {['M1', 'M2', 'M3', 'M4', 'M5', 'M6'].map((caseId) => (
              <button
                key={caseId}
                type="button"
                onClick={() => {
                  if (onSelectCase) onSelectCase(caseId);
                  handleUseSamplePhoto(caseId);
                }}
                className={`py-1.5 text-xs font-black rounded-xl border transition cursor-pointer text-center ${
                  selectedCaseId === caseId
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600'
                }`}
              >
                {caseId}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
