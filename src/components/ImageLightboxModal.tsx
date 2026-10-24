import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Download,
} from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  images?: string[]; // Optional list for gallery navigation
  initialIndex?: number;
  title?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  images = [],
  initialIndex = 0,
  title,
}) => {
  // If images array is provided, track active index; otherwise use single imageUrl
  const photoList = images.length > 0 ? images : imageUrl ? [imageUrl] : [];
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch gesture tracking for pinch-to-zoom
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchLastTapRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync index when initialIndex or photoList changes
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < photoList.length) {
      setCurrentIndex(initialIndex);
    } else {
      setCurrentIndex(0);
    }
    // Reset zoom whenever image changes
    resetZoom();
  }, [imageUrl, images, initialIndex]);

  // Reset zoom and pan
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Zoom in / out helper
  const handleZoomIn = () => {
    setScale((prev) => Math.min(5, Number((prev + 0.35).toFixed(2))));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(1, Number((prev - 0.35).toFixed(2)));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Keyboard navigation & escape listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && photoList.length > 1) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && photoList.length > 1) {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, photoList.length, currentIndex]);

  // Navigate images
  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (photoList.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photoList.length - 1));
    resetZoom();
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (photoList.length <= 1) return;
    setCurrentIndex((prev) => (prev < photoList.length - 1 ? prev + 1 : 0));
    resetZoom();
  };

  // Double-tap or double-click to toggle zoom (1x <-> 2.5x)
  const handleDoubleTap = (clientX: number, clientY: number) => {
    if (scale > 1.05) {
      resetZoom();
    } else {
      // Zoom in to 2.5x centered around tap point
      setScale(2.5);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = (rect.width / 2 - (clientX - rect.left)) * 1.5;
        const offsetY = (rect.height / 2 - (clientY - rect.top)) * 1.5;
        setPosition({ x: offsetX, y: offsetY });
      }
    }
  };

  // Touch handlers for mobile pinch-to-zoom & pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two-finger pinch start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      // Single finger tap or drag
      const now = Date.now();
      const timeSinceLastTap = now - touchLastTapRef.current;
      touchLastTapRef.current = now;

      if (timeSinceLastTap < 300) {
        // Double tap detected!
        handleDoubleTap(e.touches[0].clientX, e.touches[0].clientY);
        return;
      }

      // Drag start if scaled up
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      // Multi-touch pinch-to-zoom calculation
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / touchStartDistRef.current;
      const nextScale = Math.min(5, Math.max(1, touchStartScaleRef.current * factor));
      setScale(Number(nextScale.toFixed(2)));
      if (nextScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Single-touch panning when zoomed
      e.preventDefault();
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      // Allow panning with bounding clamping
      const maxDrag = 400 * (scale - 1);
      setPosition({
        x: Math.max(-maxDrag, Math.min(maxDrag, newX)),
        y: Math.max(-maxDrag, Math.min(maxDrag, newY)),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      touchStartDistRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
      // Snap back to 1x if barely zoomed
      if (scale < 1.05) {
        resetZoom();
      }
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      const maxDrag = 400 * (scale - 1);
      setPosition({
        x: Math.max(-maxDrag, Math.min(maxDrag, newX)),
        y: Math.max(-maxDrag, Math.min(maxDrag, newY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || photoList.length === 0) return null;

  const currentPhoto = photoList[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none touch-none animate-in fade-in duration-200"
      onClick={() => {
        if (scale === 1) onClose();
      }}
    >
      {/* Top Header Bar */}
      <div
        className="px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-white">
          <span className="font-bold text-sm sm:text-base truncate max-w-[200px] sm:max-w-md">
            {title || '照片全螢幕檢視'}
          </span>
          {photoList.length > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-teal-300 font-mono">
              {currentIndex + 1} / {photoList.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Direct image download */}
          <a
            href={currentPhoto}
            download={`photo-${Date.now()}.png`}
            className="p-2 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition"
            title="下載保存照片"
          >
            <Download className="w-5 h-5" />
          </a>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-rose-600/80 hover:bg-rose-500 text-white shadow-lg active:scale-95 transition flex items-center justify-center"
            title="關閉檢視 (ESC)"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentPhoto}
          alt="照片大圖預覽"
          draggable={false}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            touchAction: 'none',
          }}
          className="max-w-[95vw] max-h-[82vh] object-contain rounded-lg shadow-2xl pointer-events-auto"
        />

        {/* Previous Image arrow on left */}
        {photoList.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-teal-600 text-white border border-slate-700/80 shadow-2xl active:scale-95 transition z-20"
            title="上一張照片 (鍵盤 ←)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Next Image arrow on right */}
        {photoList.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-teal-600 text-white border border-slate-700/80 shadow-2xl active:scale-95 transition z-20"
            title="下一張照片 (鍵盤 →)"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div
        className="px-4 py-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center gap-2 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* On-screen zoom buttons for touch & mouse */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3 py-1.5 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 active:scale-95 transition"
            title="縮小 (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono font-bold text-teal-400 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 5}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 active:scale-95 transition"
            title="放大 (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={resetZoom}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 active:scale-95 transition"
            title="還原 100% 原始大小"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重設</span>
          </button>
        </div>

        {/* Gestures hint text for mobile */}
        <p className="text-[11px] text-slate-400 flex items-center gap-1 text-center font-medium">
          <span>🖐️ 支援雙指放大縮小・雙擊放大・拖曳平移</span>
        </p>
      </div>
    </div>
  );
};
