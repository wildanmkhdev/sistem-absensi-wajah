import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Upload, AlertCircle, Check, SwitchCamera, Sparkles } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  capturedImage: string | null;
  onClearCapture: () => void;
  disabled?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  capturedImage,
  onClearCapture,
  disabled = false,
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

  return (
    <div
      id="camera-capture-viewport"
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col"
    >
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Ambil Foto Selfie</h3>
        <p className="text-[11px] text-slate-400 font-medium">
          Posisikan wajah Anda tepat di dalam bingkai panduan
        </p>
      </div>

      {/* Camera Viewfinder with Cyan/Teal Face Brackets */}
      <div className="relative w-full aspect-4/3 max-h-[340px] bg-slate-950 overflow-hidden flex items-center justify-center">
        {shutterFlash && (
          <div className="absolute inset-0 bg-white z-40 transition-opacity duration-200 opacity-90 pointer-events-none" />
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

        {/* Cyan/Teal Face Guide Brackets */}
        {!capturedImage && cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-4">
            <div className="relative w-48 h-56 sm:w-56 sm:h-64 flex items-center justify-center">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-teal-400 rounded-tl-xl shadow-xs" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-teal-400 rounded-tr-xl shadow-xs" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-teal-400 rounded-bl-xl shadow-xs" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-teal-400 rounded-br-xl shadow-xs" />

              <div className="w-12 h-12 rounded-full border border-teal-400/40 flex items-center justify-center animate-pulse">
                <Sparkles className="w-4 h-4 text-teal-300" />
              </div>

              <div className="absolute bottom-2 inset-x-0 flex justify-center">
                <span className="text-[10px] font-bold text-white bg-black/60 px-2.5 py-0.5 rounded-full border border-white/20">
                  Wajah Terlihat Tegak
                </span>
              </div>
            </div>
          </div>
        )}

        {/* View: Captured Image Display */}
        {capturedImage && (
          <div className="relative w-full h-full">
            <img src={capturedImage} alt="Hasil Swafoto" className="w-full h-full object-cover" />
            <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow-xs flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>Foto Siap</span>
            </div>

            <div className="absolute bottom-2.5 inset-x-2.5 bg-white/95 backdrop-blur-md rounded-xl p-2 shadow-sm border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1 ml-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Foto Wajah Siap Dikirim</span>
              </span>
              <button
                type="button"
                onClick={onClearCapture}
                disabled={disabled}
                className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg transition cursor-pointer"
              >
                Ambil Ulang
              </button>
            </div>
          </div>
        )}

        {/* View: Camera Inactive or Error */}
        {!capturedImage && !cameraActive && (
          <div className="text-center p-5 space-y-2.5 max-w-xs z-10 text-white">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-relaxed">
                {isInitializing ? 'Memulai webcam...' : cameraError || 'Webcam belum aktif.'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Gunakan tombol Upload di bawah untuk mengunggah foto wajah.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer"
            >
              Nyalakan Ulang
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

      {/* Shutter Controls Bar */}
      <div className="p-3.5 sm:p-4 bg-white">
        <div className="flex items-center justify-around py-1">
          <button
            type="button"
            onClick={toggleFacingMode}
            disabled={disabled}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            title="Ganti Kamera"
          >
            <SwitchCamera className="w-4.5 h-4.5 text-slate-600" />
          </button>

          {/* Center Shutter Button */}
          <button
            type="button"
            onClick={takeSnapshot}
            disabled={disabled || !cameraActive}
            className={`w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-md shadow-teal-600/30 flex items-center justify-center transition active:scale-95 cursor-pointer ${
              disabled || !cameraActive ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title="Ambil Foto Wajah"
          >
            <div className="w-11 h-11 rounded-full border-2 border-white/80 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
            title="Upload Foto Galeri / KTM"
          >
            <Upload className="w-4.5 h-4.5 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
