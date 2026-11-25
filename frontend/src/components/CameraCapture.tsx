import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Lightbulb, SwitchCamera, AlertTriangle } from 'lucide-react';
import { previewFace, type FacePreviewResponse } from '../api';
import { IconCameraView, IconFaceScan } from './icons/FlaticonIcons';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  capturedImage: string | null;
  onClearCapture: () => void;
  disabled?: boolean;
  /** Enable live face tracking bbox, similarity %, and lighting/framing coaching */
  enableRealtimePreview?: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  capturedImage,
  onClearCapture,
  disabled = false,
  enableRealtimePreview = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewBusyRef = useRef<boolean>(false);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [livePreview, setLivePreview] = useState<FacePreviewResponse | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setLivePreview(null);
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
        throw new Error('Kamera tidak didukung oleh browser ini.');
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

  // Real-time frame analysis loop (name, match %, bbox, lighting/framing guidance)
  useEffect(() => {
    if (!enableRealtimePreview || !cameraActive || capturedImage || disabled) {
      return;
    }

    let cancelled = false;

    const runPreview = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || previewBusyRef.current) {
        return;
      }

      previewBusyRef.current = true;
      try {
        const canvas = document.createElement('canvas');
        const targetW = 320;
        const targetH = Math.max(180, Math.round((video.videoHeight / video.videoWidth) * targetW));
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Match what the user sees on screen (mirrored when using front camera)
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const frameBase64 = canvas.toDataURL('image/jpeg', 0.72);
        const res = await previewFace(frameBase64);
        if (!cancelled) {
          setLivePreview(res);
        }
      } catch {
        // Silently ignore transient network drops during live preview polling
      } finally {
        previewBusyRef.current = false;
      }
    };

    const initialTimer = setTimeout(() => void runPreview(), 450);
    const interval = setInterval(() => void runPreview(), 1700);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [enableRealtimePreview, cameraActive, capturedImage, disabled, facingMode]);

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

  // Visual theme for live tracking box based on match status
  const boxStyle =
    livePreview?.match_status === 'MATCH'
      ? {
          border: 'border-[#86CFA2]',
          pillBg: 'bg-[#86CFA2] text-[#16241C] border-[#16241C]',
        }
      : livePreview?.match_status === 'BORDERLINE'
      ? {
          border: 'border-[#FCE8B2]',
          pillBg: 'bg-[#FCE8B2] text-[#1C2620] border-[#1C2620]',
        }
      : livePreview?.match_status === 'MISMATCH'
      ? {
          border: 'border-[#F26B63]',
          pillBg: 'bg-[#F6C7C4] text-[#1C2620] border-[#1C2620]',
        }
      : {
          border: 'border-[#FBF8F1]',
          pillBg: 'bg-[#FBF8F1] text-[#1C2620] border-[#1C2620]',
        };

  return (
    <div
      id="camera-capture-viewport"
      className="hlb-panel overflow-hidden flex flex-col"
    >
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-[var(--edge)] bg-[var(--surface)] flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--paper)] border border-[var(--edge)] flex items-center justify-center text-[var(--ink)] shrink-0">
            <IconFaceScan className="w-4 h-4" />
          </div>
          <h3 className="font-display font-normal text-lg sm:text-xl text-[var(--ink)] leading-none truncate">
            Kamera Swafoto Langsung
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
        </div>
      </div>

      {/* Camera Viewfinder Frame */}
      <div className="p-3 sm:p-4 bg-[var(--bg)] space-y-2.5">
        <div className="relative w-full aspect-4/3 max-h-[360px] bg-[#161513] rounded-xl border border-[var(--edge)] shadow-[3px_3px_0_var(--shadow)] overflow-hidden flex items-center justify-center">
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

          {/* Top-left Camera Orientation Pill */}
          {!capturedImage && cameraActive && (
            <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#1C2620]/85 text-[#F4EFE3] border border-[#6E8075]">
                {facingMode === 'user' ? 'KAMERA DEPAN' : 'KAMERA BELAKANG'}
              </span>
            </div>
          )}

          {/* Real-Time Face Tracking Box + Name & Match % Label */}
          {!capturedImage && cameraActive && enableRealtimePreview && livePreview?.detected && livePreview.bbox && (
            <div
              className={`absolute z-20 pointer-events-none rounded-xl border-2 transition-all duration-300 ease-out ${boxStyle.border}`}
              style={{
                left: `${Math.max(2, Math.min(94, livePreview.bbox.x * 100))}%`,
                top: `${Math.max(2, Math.min(92, livePreview.bbox.y * 100))}%`,
                width: `${Math.max(12, Math.min(96, livePreview.bbox.w * 100))}%`,
                height: `${Math.max(14, Math.min(94, livePreview.bbox.h * 100))}%`,
              }}
            >
              {/* Floating Identity + Score % Tag above the face box */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-[10.5px] font-semibold shadow-[2px_2px_0_rgba(0,0,0,0.45)] tabular-nums ${boxStyle.pillBg}`}
                >
                  <span className="max-w-[130px] truncate">
                    {livePreview.matched_name || 'Subjek'}
                  </span>
                  {livePreview.match_status !== 'NOT_ENROLLED' && (
                    <>
                      <span className="opacity-50">·</span>
                      <span>{livePreview.similarity_percent.toFixed(0)}%</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Subtle Static Guide Corners (shown when no live bbox yet) */}
          {!capturedImage && cameraActive && (!enableRealtimePreview || !livePreview?.detected) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 p-4">
              <div className="relative w-44 h-52 sm:w-52 sm:h-60 flex items-center justify-center">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 rounded-tl-xl border-[var(--yellow)]" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 rounded-tr-xl border-[var(--yellow)]" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 rounded-bl-xl border-[var(--yellow)]" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 rounded-br-xl border-[var(--yellow)]" />
              </div>
            </div>
          )}

          {/* View: Captured Image Display */}
          {capturedImage && (
            <div className="relative w-full h-full">
              <img src={capturedImage} alt="Hasil Swafoto" className="w-full h-full object-cover" />

              <div className="absolute bottom-3 inset-x-3 bg-[var(--surface)] rounded-xl p-2.5 border border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)] flex items-center justify-between gap-2">
                <span className="hlb-tag ok">Swafoto Siap</span>
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
              <div className="w-11 h-11 rounded-xl bg-[var(--paper)] border border-[var(--edge)] shadow-[2px_2px_0_var(--shadow)] text-[var(--on-yellow)] mx-auto flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[var(--red)]" />
              </div>
              <div>
                <p className="font-sans text-xs sm:text-sm font-semibold leading-relaxed">
                  {isInitializing ? 'Memulai kamera...' : cameraError || 'Kamera belum aktif.'}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#ADA79A] mt-1">
                  Izinkan akses kamera pada browser untuk melanjutkan
                </p>
              </div>
              <button
                type="button"
                onClick={startCamera}
                className="hlb-btn-primary text-xs uppercase tracking-wider px-4 py-2 cursor-pointer"
              >
                Aktifkan Kamera
              </button>
            </div>
          )}
        </div>

        {/* Real-Time Camera Quality & Lighting Guidance Banner */}
        {!capturedImage && cameraActive && enableRealtimePreview && (
          <div
            className={`rounded-xl px-3.5 py-2.5 border border-[var(--edge)] flex items-start gap-2.5 transition-colors ${
              livePreview?.guidance.level === 'ok'
                ? 'bg-[var(--mint)]'
                : livePreview?.guidance.level === 'error'
                ? 'bg-[var(--pink)]'
                : 'bg-[var(--paper)]'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {livePreview?.guidance.level === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />
              ) : livePreview?.guidance.level === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-[var(--red)]" />
              ) : (
                <Lightbulb className="w-4 h-4 text-[var(--orange)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-sans text-xs font-bold text-[var(--ink)]">
                  {livePreview
                    ? livePreview.guidance.title
                    : 'Memindai kondisi pencahayaan & posisi wajah...'}
                </span>
                {livePreview?.detected && livePreview.match_status !== 'NOT_ENROLLED' && (
                  <span className="font-mono text-[10.5px] font-semibold text-[var(--ink)] tabular-nums">
                    Kecocokan: {livePreview.similarity_percent.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="font-sans text-[11.5px] text-[var(--soft)] leading-snug mt-0.5">
                {livePreview
                  ? livePreview.guidance.solution
                  : 'Posisikan wajah di tengah bingkai dengan cahaya yang cukup.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Shutter Controls Bar (Live Camera Only — No File Upload) */}
      <div className="px-4 py-3 bg-[var(--surface)] border-t border-[var(--edge)]">
        <div className="flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={toggleFacingMode}
            disabled={disabled}
            className="hlb-btn-secondary w-11 h-11 p-0 flex items-center justify-center cursor-pointer disabled:opacity-40 shrink-0"
            title="Ganti Kamera Depan/Belakang"
            aria-label="Ganti Kamera Depan atau Belakang"
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
            title={capturedImage ? 'Ambil Ulang Foto' : 'Ambil Foto Wajah'}
          >
            <IconCameraView className="w-4 h-4" />
            <span>{capturedImage ? 'Ambil Ulang Swafoto' : 'Ambil Foto Wajah'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
