import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Upload, AlertCircle, SwitchCamera } from 'lucide-react';
import { IconCameraView, IconFaceScan } from './icons/FlaticonIcons';

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
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;

        const handleReady = async () => {
          try {
            await video.play();
            setCameraActive(true);
            setIsInitializing(false);
          } catch (playErr) {
            console.error('Error auto-playing video:', playErr);
            setCameraActive(true);
            setIsInitializing(false);
          }
        };

        if (video.readyState >= 1) {
          void handleReady();
        } else {
          video.onloadedmetadata = () => void handleReady();
          video.oncanplay = () => void handleReady();
          setTimeout(() => {
            if (video.srcObject) {
              void handleReady();
            }
          }, 500);
        }
      }
    } catch (err: unknown) {
      console.warn('Camera access denied or failed:', err);
      const msg = err instanceof Error ? err.message : 'Kamera tidak dapat diakses.';
      setCameraError(msg);
      setCameraActive(false);
      setIsInitializing(false);
    }
  }, [facingMode]);

  useEffect(() => {
    if (!capturedImage) {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [capturedImage, startCamera, stopCamera]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 160);

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
      className="hlb-panel overflow-hidden flex flex-col"
    >
      {/* Top Header */}
      <div className="px-4 py-3.5 border-b-2 border-[var(--edge)] bg-[var(--surface)] flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--paper)] border-2 border-[var(--edge)] flex items-center justify-center text-[var(--ink)] shrink-0">
            <IconFaceScan className="w-4 h-4" />
          </div>
          <h3 className="font-display font-normal text-lg sm:text-xl text-[var(--ink)] leading-none">
            Verifikasi Wajah Swafoto
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {capturedImage ? (
            <span className="hlb-tag ok">TERAMBIL</span>
          ) : cameraActive ? (
            <span className="hlb-tag accent">LIVE</span>
          ) : (
            <span className="hlb-tag neutral">STANDBY</span>
          )}
          <span className="hlb-tag paper hidden sm:inline-flex">ArcFace 512-D</span>
        </div>
      </div>

      {/* Camera Viewfinder Frame */}
      <div className="p-3 sm:p-4 bg-[var(--bg)]">
        <div className="relative w-full aspect-4/3 max-h-[340px] bg-[#161513] rounded-xl border-2 border-[var(--edge)] shadow-[4px_4px_0_var(--shadow)] overflow-hidden flex items-center justify-center">
          {shutterFlash && (
            <div className="absolute inset-0 bg-[var(--paper)] z-40 transition-opacity duration-150 opacity-90 pointer-events-none" />
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

          {/* Top-left Mono HUD Pill on Live Feed */}
          {!capturedImage && cameraActive && (
            <div className="absolute top-3 left-3 z-20 pointer-events-none flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--tip)] text-[var(--tip-ink)] border border-[var(--edge)]">
                {facingMode === 'user' ? 'CAM: FRONT' : 'CAM: REAR'}
              </span>
            </div>
          )}

          {/* Crisp Face Guide Frame */}
          {!capturedImage && cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-4">
              <div className="relative w-48 h-56 sm:w-56 sm:h-64 flex items-center justify-center">
                <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] rounded-tl-xl border-[var(--yellow)]" />
                <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] rounded-tr-xl border-[var(--yellow)]" />
                <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] rounded-bl-xl border-[var(--yellow)]" />
                <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] rounded-br-xl border-[var(--yellow)]" />

                <div className="absolute bottom-2 inset-x-0 flex justify-center">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--on-yellow)] bg-[var(--yellow)] border-2 border-[var(--on-yellow)] px-3 py-1 rounded-full shadow-[2px_2px_0_var(--shadow)]">
                    Posisikan wajah di bingkai
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* View: Captured Image Display */}
          {capturedImage && (
            <div className="relative w-full h-full">
              <img src={capturedImage} alt="Hasil Swafoto" className="w-full h-full object-cover" />

              <div className="absolute bottom-3 inset-x-3 bg-[var(--surface)] rounded-xl p-2.5 border-2 border-[var(--edge)] shadow-[3px_3px_0_var(--shadow)] flex items-center justify-between gap-2">
                <span className="hlb-tag ok">Foto Wajah Terpilih</span>
                <button
                  type="button"
                  onClick={onClearCapture}
                  disabled={disabled}
                  className="hlb-btn-secondary font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 cursor-pointer disabled:opacity-40"
                >
                  Ambil Ulang
                </button>
              </div>
            </div>
          )}

          {/* View: Camera Inactive or Error */}
          {!capturedImage && !cameraActive && (
            <div className="text-center p-5 space-y-3 max-w-xs z-10 text-[#F4EFE3]">
              <div className="w-11 h-11 rounded-xl bg-[var(--paper)] border-2 border-[var(--edge)] shadow-[3px_3px_0_var(--shadow)] text-[var(--on-yellow)] mx-auto flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[var(--red)]" />
              </div>
              <div>
                <p className="font-sans text-xs sm:text-sm font-semibold leading-relaxed">
                  {isInitializing ? 'Memulai kamera...' : cameraError || 'Kamera belum aktif.'}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#ADA79A] mt-1">
                  Atau unggah file foto di bawah
                </p>
              </div>
              <button
                type="button"
                onClick={startCamera}
                className="hlb-btn-primary text-xs uppercase tracking-wider px-4 py-2 cursor-pointer"
              >
                Coba Lagi
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
      </div>

      {/* Shutter Controls Bar */}
      <div className="px-4 py-3.5 bg-[var(--surface)] border-t-2 border-[var(--edge)]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={toggleFacingMode}
            disabled={disabled}
            className="hlb-btn-secondary w-11 h-11 p-0 flex items-center justify-center cursor-pointer disabled:opacity-40 shrink-0"
            title="Ganti Kamera Depan/Belakang"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {/* Tactile Primary Capture Button */}
          <button
            type="button"
            onClick={capturedImage ? onClearCapture : takeSnapshot}
            disabled={disabled || (!cameraActive && !capturedImage && isInitializing)}
            className={`hlb-btn-primary flex-1 h-11 px-4 text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
              disabled || (!cameraActive && !capturedImage && isInitializing)
                ? 'opacity-40 cursor-not-allowed'
                : ''
            }`}
            title={capturedImage ? 'Ambil Ulang Foto' : 'Ambil Foto Wajah (Shutter)'}
          >
            <IconCameraView className="w-4 h-4" />
            <span>{capturedImage ? 'Ambil Ulang Swafoto' : 'Ambil Foto Wajah'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="hlb-btn-secondary w-11 h-11 p-0 flex items-center justify-center cursor-pointer disabled:opacity-40 shrink-0"
            title="Upload Foto Wajah"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
