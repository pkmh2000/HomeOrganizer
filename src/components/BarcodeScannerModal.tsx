import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Zap, Search, AlertCircle, Check } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (code: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
  title = '掃描條碼或 QR 碼',
  subtitle = '將相機對準物品外包裝條碼或收納盒 QR 標籤',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('此設備或瀏覽器不支援相機存取');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Start Barcode Detection loop if BarcodeDetector is supported
      startBarcodeDetection();
    } catch (err: any) {
      console.warn('Camera access warning:', err);
      setHasCamera(false);
      setCameraError(err.message || '無法開啟相機，請確認已授予相機權限，或直接手動輸入條碼');
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track as any).applyConstraints) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      } catch (e) {
        console.warn('Torch not supported', e);
      }
    }
  };

  const startBarcodeDetection = () => {
    // Check if BarcodeDetector API exists (Native in Android Chrome!)
    if ('BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'qr_code', 'code_128', 'code_39', 'upc_a', 'upc_e'],
        });

        const detectLoop = async () => {
          if (!streamRef.current || !videoRef.current) return;
          try {
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const detected = barcodes[0].rawValue;
                if (detected) {
                  onScanResult(detected);
                  stopCamera();
                  onClose();
                  return;
                }
              }
            }
          } catch (e) {
            // detection frame error, continue next frame
          }
          if (isOpen) {
            requestAnimationFrame(detectLoop);
          }
        };

        requestAnimationFrame(detectLoop);
      } catch (err) {
        console.log('BarcodeDetector init fallback', err);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScanResult(manualCode.trim());
      stopCamera();
      onClose();
    }
  };

  // Quick preset bar codes for testing / demo
  const handleQuickPreset = (code: string) => {
    onScanResult(code);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-400" />
            {title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Viewfinder Area */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden bg-black p-4">
        {hasCamera && !cameraError ? (
          <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden border-2 border-teal-500/80 shadow-2xl bg-slate-950 flex items-center justify-center">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />

            {/* Scanning Laser Line Animation */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
              <div className="w-full h-0.5 bg-gradient-to-r from-teal-500 via-teal-300 to-teal-500 shadow-[0_0_12px_#14b8a6] animate-pulse" />
              {/* Corner brackets */}
              <div className="flex justify-between">
                <div className="w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                <div className="w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
              </div>
              <div className="flex justify-between">
                <div className="w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                <div className="w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />
              </div>
            </div>

            {/* Flash toggle */}
            <button
              onClick={toggleTorch}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 text-amber-300 backdrop-blur-xs border border-slate-700 active:scale-90"
              title="開關補光燈"
            >
              <Zap className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-200">相機不可用或權限受限</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              {cameraError || '可直接在下方手動輸入商品條碼或選取示範條碼快速建檔。'}
            </p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 重新偵測相機
            </button>
          </div>
        )}

        {/* Quick barcode simulation buttons for instant testing */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-sm text-xs">
          <span className="text-[11px] text-slate-400 w-full text-center">或點擊範例條碼快速模擬：</span>
          <button
            onClick={() => handleQuickPreset('4902370535747')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-teal-400"
          >
            Switch手把 (4902370535747)
          </button>
          <button
            onClick={() => handleQuickPreset('4710123456789')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-teal-400"
          >
            普拿疼 (4710123456789)
          </button>
          <button
            onClick={() => handleQuickPreset('4710088432190')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-teal-400"
          >
            有機燕麥片 (4710088432190)
          </button>
        </div>
      </div>

      {/* Manual Input Footer */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 pb-8">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="手動輸入商品條碼或 QR 代碼..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="px-4 py-2.5 rounded-xl bg-teal-500 disabled:bg-slate-800 text-slate-950 font-bold text-sm transition"
          >
            確認
          </button>
        </form>
      </div>
    </div>
  );
};
