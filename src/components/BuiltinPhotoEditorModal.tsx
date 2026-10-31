import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  Sparkles,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sun,
  Contrast,
  Sliders,
  PenTool,
  RotateCcw as UndoIcon,
  Check,
  X,
  Palette,
  Eye,
  Eraser,
  Wand2,
  Pipette,
  Layers,
  Square,
  RectangleHorizontal,
  RectangleVertical,
} from 'lucide-react';

interface BuiltinPhotoEditorModalProps {
  isOpen: boolean;
  photoUrl: string;
  onSave: (editedBase64: string) => void;
  onClose: () => void;
}

interface Stroke {
  color: string;
  size: number;
  points: { x: number; y: number }[];
  isEraser?: boolean;
}

type AspectRatioType = 'free' | '1:1' | '4:3' | '3:4' | '16:9';
type BackgroundColorType = 'transparent' | '#ffffff' | '#f1f5f9' | '#fef3c7';

export const BuiltinPhotoEditorModal: React.FC<BuiltinPhotoEditorModalProps> = ({
  isOpen,
  photoUrl,
  onSave,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active Tool Tab
  const [activeTab, setActiveTab] = useState<'crop' | 'cutout' | 'transform' | 'adjust' | 'markup'>('crop');

  // Base image state & History Stack
  const [currentImageBase64, setCurrentImageBase64] = useState<string>(photoUrl);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Transform state
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Adjustments state
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [isGrayscale, setIsGrayscale] = useState<boolean>(false);

  // Markup pen & eraser state
  const [penColor, setPenColor] = useState<string>('#ef4444');
  const [penSize, setPenSize] = useState<number>(5);
  const [isEraserActive, setIsEraserActive] = useState<boolean>(false);
  const [eraserSize, setEraserSize] = useState<number>(24);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Crop Tool State (Normalized 0.0 ~ 1.0)
  const [cropRatio, setCropRatio] = useState<AspectRatioType>('free');
  const [hasUserAdjustedCrop, setHasUserAdjustedCrop] = useState<boolean>(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  const [isDraggingCrop, setIsDraggingCrop] = useState<boolean>(false);
  const [dragHandle, setDragHandle] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartRect, setDragStartRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });

  // Cutout Tool State (100% Offline Background Removal)
  const [cutoutTolerance, setCutoutTolerance] = useState<number>(26); // 5 ~ 60%
  const [cutoutBgColor, setCutoutBgColor] = useState<BackgroundColorType>('transparent');
  const [isMagicWandActive, setIsMagicWandActive] = useState<boolean>(false);
  const [isCutoutProcessing, setIsCutoutProcessing] = useState<boolean>(false);
  const [cutoutNotice, setCutoutNotice] = useState<string | null>(null);

  // Load and downscale image smoothly for real-time mobile canvas performance
  const loadImage = useCallback((src: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Downscale if image is overly huge (> 1600px) to prevent mobile browser memory throttling
      const maxDim = 1600;
      let targetW = img.width;
      let targetH = img.height;
      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetW;
        tempCanvas.height = targetH;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0, targetW, targetH);
          const scaledImg = new Image();
          scaledImg.onload = () => setImageObj(scaledImg);
          scaledImg.src = tempCanvas.toDataURL('image/png');
          return;
        }
      }
      setImageObj(img);
    };
    img.src = src;
  }, []);

  // Initialize when opened
  useEffect(() => {
    if (!isOpen || !photoUrl) return;
    setCurrentImageBase64(photoUrl);
    setHistoryStack([photoUrl]);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(0);
    setContrast(0);
    setIsGrayscale(false);
    setStrokes([]);
    setIsEraserActive(false);
    setIsMagicWandActive(false);
    setActiveTab('crop');
    setCropRect({ x: 0, y: 0, width: 1, height: 1 });
    setHasUserAdjustedCrop(false);
    loadImage(photoUrl);
  }, [isOpen, photoUrl, loadImage]);

  // Push new state to undo history
  const pushHistory = (newBase64: string) => {
    setHistoryStack((prev) => [...prev, newBase64].slice(-10));
    setCurrentImageBase64(newBase64);
    loadImage(newBase64);
  };

  const handleUndo = () => {
    if (historyStack.length <= 1) return;
    const prev = historyStack.slice(0, -1);
    const last = prev[prev.length - 1];
    setHistoryStack(prev);
    setCurrentImageBase64(last);
    loadImage(last);
    setStrokes([]);
  };

  // Re-render canvas with transforms, adjustments, and markup
  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const isSideways = rotation % 180 !== 0;
    const width = isSideways ? imageObj.height : imageObj.width;
    const height = isSideways ? imageObj.width : imageObj.height;

    canvas.width = width;
    canvas.height = height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply rotation & flip from center
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Apply filters
    const bValue = 100 + brightness;
    const cValue = 100 + contrast;
    const grayValue = isGrayscale ? 100 : 0;
    ctx.filter = `brightness(${bValue}%) contrast(${cValue}%) grayscale(${grayValue}%)`;

    ctx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
    ctx.restore();

    // Draw annotations and eraser strokes
    ctx.filter = 'none';
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.save();
      ctx.beginPath();
      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.size;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    });
  }, [imageObj, rotation, flipH, flipV, brightness, contrast, isGrayscale, strokes]);

  // Coordinates helper
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, normX: 0, normY: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    return {
      x: normX * canvas.width,
      y: normY * canvas.height,
      normX,
      normY,
    };
  };

  // ----------------------------------------------------
  // CROP TOOL LOGIC (自由裁切與固定比例裁切)
  // ----------------------------------------------------
  const handleSetCropRatio = (ratio: AspectRatioType) => {
    setCropRatio(ratio);
    if (!imageObj) return;

    if (ratio === 'free') {
      return;
    }

    setHasUserAdjustedCrop(true);
    let targetRatio = 1;
    if (ratio === '1:1') targetRatio = 1;
    else if (ratio === '4:3') targetRatio = 4 / 3;
    else if (ratio === '3:4') targetRatio = 3 / 4;
    else if (ratio === '16:9') targetRatio = 16 / 9;

    const imgAspect = imageObj.width / imageObj.height;
    let newW = 0.8;
    let newH = (newW * imgAspect) / targetRatio;

    if (newH > 0.9) {
      newH = 0.8;
      newW = (newH * targetRatio) / imgAspect;
    }

    const newX = (1 - newW) / 2;
    const newY = (1 - newH) / 2;
    setCropRect({
      x: Math.max(0, newX),
      y: Math.max(0, newY),
      width: Math.min(1, newW),
      height: Math.min(1, newH),
    });
  };

  const handleStartCropDrag = (handle: 'move' | 'nw' | 'ne' | 'se' | 'sw', e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingCrop(true);
    setHasUserAdjustedCrop(true);
    setDragHandle(handle);
    const { normX, normY } = getCanvasCoords(e);
    setDragStartPos({ x: normX, y: normY });
    setDragStartRect({ ...cropRect });
  };

  const handleMoveCropDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingCrop || !dragHandle) return;
    const { normX, normY } = getCanvasCoords(e);
    const dx = normX - dragStartPos.x;
    const dy = normY - dragStartPos.y;

    if (dragHandle === 'move') {
      const newX = Math.max(0, Math.min(1 - dragStartRect.width, dragStartRect.x + dx));
      const newY = Math.max(0, Math.min(1 - dragStartRect.height, dragStartRect.y + dy));
      setCropRect((prev) => ({ ...prev, x: newX, y: newY }));
    } else {
      let x = dragStartRect.x;
      let y = dragStartRect.y;
      let w = dragStartRect.width;
      let h = dragStartRect.height;

      if (dragHandle === 'se') {
        w = Math.max(0.1, Math.min(1 - x, dragStartRect.width + dx));
        h = Math.max(0.1, Math.min(1 - y, dragStartRect.height + dy));
      } else if (dragHandle === 'sw') {
        const potentialX = Math.max(0, Math.min(dragStartRect.x + dragStartRect.width - 0.1, dragStartRect.x + dx));
        w = dragStartRect.x + dragStartRect.width - potentialX;
        x = potentialX;
        h = Math.max(0.1, Math.min(1 - y, dragStartRect.height + dy));
      } else if (dragHandle === 'ne') {
        w = Math.max(0.1, Math.min(1 - x, dragStartRect.width + dx));
        const potentialY = Math.max(0, Math.min(dragStartRect.y + dragStartRect.height - 0.1, dragStartRect.y + dy));
        h = dragStartRect.y + dragStartRect.height - potentialY;
        y = potentialY;
      } else if (dragHandle === 'nw') {
        const potentialX = Math.max(0, Math.min(dragStartRect.x + dragStartRect.width - 0.1, dragStartRect.x + dx));
        const potentialY = Math.max(0, Math.min(dragStartRect.y + dragStartRect.height - 0.1, dragStartRect.y + dy));
        w = dragStartRect.x + dragStartRect.width - potentialX;
        h = dragStartRect.y + dragStartRect.height - potentialY;
        x = potentialX;
        y = potentialY;
      }

      setCropRect({ x, y, width: w, height: h });
    }
  };

  const handleEndCropDrag = () => {
    setIsDraggingCrop(false);
    setDragHandle(null);
  };

  // Execute Crop and update image
  const handleApplyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sourceX = Math.round(cropRect.x * canvas.width);
    const sourceY = Math.round(cropRect.y * canvas.height);
    const sourceW = Math.round(cropRect.width * canvas.width);
    const sourceH = Math.round(cropRect.height * canvas.height);

    if (sourceW < 10 || sourceH < 10) return;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = sourceW;
    cropCanvas.height = sourceH;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    cropCtx.drawImage(canvas, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
    const croppedBase64 = cropCanvas.toDataURL('image/png');

    pushHistory(croppedBase64);
    setCropRect({ x: 0, y: 0, width: 1, height: 1 });
    setHasUserAdjustedCrop(false);
    setCutoutNotice('✅ 已套用裁切！');
    setTimeout(() => setCutoutNotice(null), 2500);
  };

  // ----------------------------------------------------
  // CUTOUT TOOL LOGIC (100% 離線智慧去背 & 容差魔術棒)
  // ----------------------------------------------------
  const performCutout = (sampleColors: [number, number, number][]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsCutoutProcessing(true);

    setTimeout(() => {
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const totalPixels = canvas.width * canvas.height;

        // Euclidean threshold in normalized 0-100 scale
        const maxDist = 441.67;
        const threshold = (cutoutTolerance / 100) * maxDist;

        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a === 0) continue;

          // Check if pixel color matches any sample color within tolerance
          let matched = false;
          for (const [sr, sg, sb] of sampleColors) {
            const dist = Math.sqrt((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2);
            if (dist <= threshold) {
              matched = true;
              break;
            }
          }

          if (matched) {
            data[idx + 3] = 0; // Transparent
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // If a solid background fill is selected, apply it underneath
        if (cutoutBgColor !== 'transparent') {
          const outCanvas = document.createElement('canvas');
          outCanvas.width = canvas.width;
          outCanvas.height = canvas.height;
          const outCtx = outCanvas.getContext('2d');
          if (outCtx) {
            outCtx.fillStyle = cutoutBgColor;
            outCtx.fillRect(0, 0, canvas.width, canvas.height);
            outCtx.drawImage(canvas, 0, 0);
            const filledBase64 = outCanvas.toDataURL('image/png');
            pushHistory(filledBase64);
          }
        } else {
          const transparentBase64 = canvas.toDataURL('image/png');
          pushHistory(transparentBase64);
        }

        setCutoutNotice(`✨ 智慧去背完成！（容差 ${cutoutTolerance}%）`);
        setTimeout(() => setCutoutNotice(null), 3000);
      } catch (err) {
        console.error('Cutout error:', err);
      } finally {
        setIsCutoutProcessing(false);
      }
    }, 50);
  };

  // 1. 一鍵自動偵測邊緣/角落背景去背 (Auto Edge/Perimeter Cutout)
  const handleAutoEdgeCutout = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const getPixel = (x: number, y: number): [number, number, number] => {
      const idx = (y * w + x) * 4;
      return [data[idx], data[idx + 1], data[idx + 2]];
    };

    // Sample from 4 corners + 4 edge midpoints
    const samples: [number, number, number][] = [
      getPixel(5, 5),
      getPixel(w - 6, 5),
      getPixel(5, h - 6),
      getPixel(w - 6, h - 6),
      getPixel(Math.floor(w / 2), 5),
      getPixel(Math.floor(w / 2), h - 6),
      getPixel(5, Math.floor(h / 2)),
      getPixel(w - 6, Math.floor(h / 2)),
    ];

    performCutout(samples);
  };

  // 2. 魔術吸管點擊去背 (Tap pixel on canvas to sample & remove)
  const handleCanvasTapForCutout = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isMagicWandActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    const px = Math.floor(x);
    const py = Math.floor(y);

    const pixel = ctx.getImageData(px, py, 1, 1).data;
    const targetColor: [number, number, number] = [pixel[0], pixel[1], pixel[2]];

    performCutout([targetColor]);
    setIsMagicWandActive(false);
  };

  // ----------------------------------------------------
  // DRAWING / ERASER LOGIC
  // ----------------------------------------------------
  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTab === 'crop') return;
    if (activeTab === 'cutout' && isMagicWandActive) {
      handleCanvasTapForCutout(e);
      return;
    }
    if (activeTab !== 'markup' && !isEraserActive) return;

    setIsDrawing(true);
    const pt = getCanvasCoords(e);
    setStrokes((prev) => [
      ...prev,
      {
        color: penColor,
        size: isEraserActive ? eraserSize : penSize,
        points: [{ x: pt.x, y: pt.y }],
        isEraser: isEraserActive,
      },
    ]);
  };

  const handleMoveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pt = getCanvasCoords(e);
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const updatedLast: Stroke = {
        ...last,
        points: [...last.points, { x: pt.x, y: pt.y }],
      };
      return [...prev.slice(0, -1), updatedLast];
    });
  };

  const handleEndDraw = () => {
    setIsDrawing(false);
  };

  // ----------------------------------------------------
  // SAVE RESULT (儲存修圖：自動套用所有變更，免二次確認)
  // ----------------------------------------------------
  const handleSaveResult = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let outputCanvas = canvas;

    // 儲存時：若有調整裁切範圍且尚未點擊套用，直接自動套用裁切變更！
    const needsPendingCrop =
      hasUserAdjustedCrop &&
      (cropRect.x > 0.005 || cropRect.y > 0.005 || cropRect.width < 0.99 || cropRect.height < 0.99);

    if (needsPendingCrop) {
      const sourceX = Math.max(0, Math.round(cropRect.x * canvas.width));
      const sourceY = Math.max(0, Math.round(cropRect.y * canvas.height));
      const sourceW = Math.min(canvas.width - sourceX, Math.round(cropRect.width * canvas.width));
      const sourceH = Math.min(canvas.height - sourceY, Math.round(cropRect.height * canvas.height));

      if (sourceW > 10 && sourceH > 10) {
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = sourceW;
        cropCanvas.height = sourceH;
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
          cropCtx.drawImage(canvas, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
          outputCanvas = cropCanvas;
        }
      }
    }

    // 儲存時：若去背後選擇了純色背景 (非透明)，直接合成純色底色
    if (cutoutBgColor !== 'transparent') {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = outputCanvas.width;
      bgCanvas.height = outputCanvas.height;
      const bgCtx = bgCanvas.getContext('2d');
      if (bgCtx) {
        bgCtx.fillStyle = cutoutBgColor;
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgCtx.drawImage(outputCanvas, 0, 0);
        outputCanvas = bgCanvas;
      }
    }

    // 檢查是否有透明像素
    const outCtx = outputCanvas.getContext('2d');
    let hasAlpha = false;
    if (outCtx && cutoutBgColor === 'transparent') {
      const data = outCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height).data;
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] < 250) {
          hasAlpha = true;
          break;
        }
      }
    }

    // If transparent or requested transparent, export PNG; else JPEG 90%
    const finalBase64 = hasAlpha
      ? outputCanvas.toDataURL('image/png')
      : outputCanvas.toDataURL('image/jpeg', 0.9);

    onSave(finalBase64);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/98 backdrop-blur-md animate-fade-in select-none">
      {/* Top Header */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>內建離線修圖工具</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                100% 離線・免外網
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              支援自由裁切、離線智慧去背、旋轉鏡像、明暗對比與重點塗鴉
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {historyStack.length > 1 && (
            <button
              type="button"
              onClick={handleUndo}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 font-bold text-xs flex items-center gap-1 border border-slate-700 transition"
              title="復原上一步修圖"
            >
              <UndoIcon className="w-3.5 h-3.5" />
              <span>復原</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSaveResult}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 text-xs font-bold shadow-lg flex items-center gap-1.5 transition active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>儲存修圖</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {cutoutNotice && (
        <div className="bg-teal-950 border-b border-teal-500/50 py-1.5 px-4 text-xs text-teal-200 text-center font-bold animate-in fade-in">
          {cutoutNotice}
        </div>
      )}

      {/* Center Image Canvas / Crop Preview Area */}
      <div
        ref={containerRef}
        onMouseMove={(e) => {
          if (activeTab === 'crop') handleMoveCropDrag(e);
          else handleMoveDraw(e);
        }}
        onMouseUp={() => {
          if (activeTab === 'crop') handleEndCropDrag();
          else handleEndDraw();
        }}
        onTouchMove={(e) => {
          if (activeTab === 'crop') handleMoveCropDrag(e);
          else handleMoveDraw(e);
        }}
        onTouchEnd={() => {
          if (activeTab === 'crop') handleEndCropDrag();
          else handleEndDraw();
        }}
        className="flex-1 overflow-hidden relative flex items-center justify-center p-3 sm:p-6 bg-slate-950/80"
      >
        {/* Transparent Checkerboard Pattern Background for Cutout visual inspection */}
        <div className="relative max-w-full max-h-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]">
          <canvas
            ref={canvasRef}
            onMouseDown={handleStartDraw}
            onTouchStart={handleStartDraw}
            className={`max-w-full max-h-[58vh] sm:max-h-[66vh] object-contain touch-none ${
              isMagicWandActive
                ? 'cursor-crosshair'
                : isEraserActive
                ? 'cursor-cell'
                : activeTab === 'markup'
                ? 'cursor-crosshair'
                : 'cursor-default'
            }`}
          />

          {/* Interactive Crop Overlay when Crop tab is active */}
          {activeTab === 'crop' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Dimmed Areas outside crop rectangle */}
              {/* Top */}
              <div
                className="absolute left-0 right-0 top-0 bg-black/65"
                style={{ height: `${cropRect.y * 100}%` }}
              />
              {/* Bottom */}
              <div
                className="absolute left-0 right-0 bottom-0 bg-black/65"
                style={{ height: `${(1 - cropRect.y - cropRect.height) * 100}%` }}
              />
              {/* Left */}
              <div
                className="absolute left-0 bg-black/65"
                style={{
                  top: `${cropRect.y * 100}%`,
                  height: `${cropRect.height * 100}%`,
                  width: `${cropRect.x * 100}%`,
                }}
              />
              {/* Right */}
              <div
                className="absolute right-0 bg-black/65"
                style={{
                  top: `${cropRect.y * 100}%`,
                  height: `${cropRect.height * 100}%`,
                  width: `${(1 - cropRect.x - cropRect.width) * 100}%`,
                }}
              />

              {/* Crop Boundary Box & Rule-of-Thirds Grid */}
              <div
                onMouseDown={(e) => handleStartCropDrag('move', e)}
                onTouchStart={(e) => handleStartCropDrag('move', e)}
                style={{
                  left: `${cropRect.x * 100}%`,
                  top: `${cropRect.y * 100}%`,
                  width: `${cropRect.width * 100}%`,
                  height: `${cropRect.height * 100}%`,
                }}
                className="absolute border-2 border-teal-400 pointer-events-auto cursor-move shadow-2xl"
              >
                {/* Rule of Thirds Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-white" />
                  <div className="border-r border-white" />
                  <div />
                </div>

                {/* 4 Corner Drag Handles */}
                <div
                  onMouseDown={(e) => handleStartCropDrag('nw', e)}
                  onTouchStart={(e) => handleStartCropDrag('nw', e)}
                  className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-teal-400 rounded-full border-2 border-slate-950 cursor-nwse-resize shadow-md"
                />
                <div
                  onMouseDown={(e) => handleStartCropDrag('ne', e)}
                  onTouchStart={(e) => handleStartCropDrag('ne', e)}
                  className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-teal-400 rounded-full border-2 border-slate-950 cursor-nesw-resize shadow-md"
                />
                <div
                  onMouseDown={(e) => handleStartCropDrag('sw', e)}
                  onTouchStart={(e) => handleStartCropDrag('sw', e)}
                  className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-teal-400 rounded-full border-2 border-slate-950 cursor-nesw-resize shadow-md"
                />
                <div
                  onMouseDown={(e) => handleStartCropDrag('se', e)}
                  onTouchStart={(e) => handleStartCropDrag('se', e)}
                  className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-teal-400 rounded-full border-2 border-slate-950 cursor-nwse-resize shadow-md"
                />
              </div>
            </div>
          )}

          {/* Processing Spinner for Cutout */}
          {isCutoutProcessing && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-teal-300">正在執行純本機離線智慧去背...</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Toolset Bar */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 space-y-3">
        {/* Tool Category Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('crop');
              setIsEraserActive(false);
              setIsMagicWandActive(false);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
              activeTab === 'crop' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>裁切</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('cutout');
              setIsEraserActive(false);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
              activeTab === 'cutout' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>去背</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('transform');
              setIsEraserActive(false);
              setIsMagicWandActive(false);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
              activeTab === 'transform' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>旋轉</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('adjust');
              setIsEraserActive(false);
              setIsMagicWandActive(false);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
              activeTab === 'adjust' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>明暗</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('markup');
              setIsEraserActive(false);
              setIsMagicWandActive(false);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${
              activeTab === 'markup' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>塗鴉</span>
          </button>
        </div>

        {/* TAB 1: CROP RATIO & APPLY */}
        {activeTab === 'crop' && (
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
            {/* Presets */}
            <div className="flex rounded-xl bg-slate-800 p-0.5 border border-slate-700">
              {(
                [
                  { id: 'free', label: '自由', icon: <Crop className="w-3 h-3" /> },
                  { id: '1:1', label: '1:1', icon: <Square className="w-3 h-3" /> },
                  { id: '4:3', label: '4:3', icon: <RectangleHorizontal className="w-3 h-3" /> },
                  { id: '3:4', label: '3:4', icon: <RectangleVertical className="w-3 h-3" /> },
                  { id: '16:9', label: '16:9', icon: <RectangleHorizontal className="w-3 h-3" /> },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSetCropRatio(item.id)}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                    cropRatio === item.id
                      ? 'bg-teal-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Apply Crop Button */}
            <button
              type="button"
              onClick={handleApplyCrop}
              className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>套用裁切</span>
            </button>
          </div>
        )}

        {/* TAB 2: CUTOUT (100% 離線智慧去背、魔術吸管與橡皮擦) */}
        {activeTab === 'cutout' && (
          <div className="space-y-2.5 max-w-lg mx-auto">
            {/* Action Bar */}
            <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
              {/* Auto Edge Cutout */}
              <button
                type="button"
                onClick={handleAutoEdgeCutout}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold flex items-center gap-1.5 shadow transition active:scale-95"
                title="自動識別圖片角落與四周背景色進行去背"
              >
                <Wand2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>一鍵邊緣智慧去背</span>
              </button>

              {/* Magic Wand Tap */}
              <button
                type="button"
                onClick={() => {
                  setIsMagicWandActive((p) => !p);
                  setIsEraserActive(false);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 border transition active:scale-95 ${
                  isMagicWandActive
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="點擊此按鈕後，在照片背景處點一下即可吸取該色去背"
              >
                <Pipette className="w-3.5 h-3.5" />
                <span>{isMagicWandActive ? '請點選背景處...' : '魔術吸管去背'}</span>
              </button>

              {/* Manual Eraser */}
              <button
                type="button"
                onClick={() => {
                  setIsEraserActive((p) => !p);
                  setIsMagicWandActive(false);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 border transition active:scale-95 ${
                  isEraserActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="手動橡皮擦抹除殘留背景"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>手動橡皮擦</span>
              </button>
            </div>

            {/* Cutout Settings: Tolerance & Background Color */}
            <div className="flex items-center justify-between gap-3 text-xs bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 flex-wrap">
              {/* Tolerance slider */}
              <div className="flex items-center gap-2 flex-1 min-w-[170px]">
                <span className="text-slate-400 text-[11px] shrink-0">容差</span>
                <input
                  type="range"
                  min="8"
                  max="50"
                  value={cutoutTolerance}
                  onChange={(e) => setCutoutTolerance(Number(e.target.value))}
                  className="flex-1 accent-teal-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] font-mono text-teal-300 w-8">{cutoutTolerance}%</span>
              </div>

              {/* Background Color Fill Option */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400">底色：</span>
                {(
                  [
                    { color: 'transparent', label: '透明', border: 'border-slate-600' },
                    { color: '#ffffff', label: '純白', border: 'border-white' },
                    { color: '#f1f5f9', label: '淺灰', border: 'border-slate-300' },
                    { color: '#fef3c7', label: '暖米', border: 'border-amber-200' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setCutoutBgColor(c.color)}
                    className={`px-2 py-0.5 rounded-md border transition text-[10px] font-bold ${
                      cutoutBgColor === c.color
                        ? 'bg-teal-500 text-slate-950 border-teal-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ROTATE & FLIP */}
        {activeTab === 'transform' && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-teal-400" />
              <span>逆時針 90°</span>
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition active:scale-95"
            >
              <RotateCw className="w-4 h-4 text-teal-400" />
              <span>順時針 90°</span>
            </button>
            <button
              type="button"
              onClick={() => setFlipH((f) => !f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition active:scale-95 ${
                flipH
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <FlipHorizontal className="w-4 h-4 text-teal-400" />
              <span>水平鏡像</span>
            </button>
            <button
              type="button"
              onClick={() => setFlipV((f) => !f)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition active:scale-95 ${
                flipV
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <FlipVertical className="w-4 h-4 text-teal-400" />
              <span>垂直翻轉</span>
            </button>
          </div>
        )}

        {/* TAB 4: LIGHTNESS & CONTRAST */}
        {activeTab === 'adjust' && (
          <div className="max-w-md mx-auto space-y-2.5">
            <div className="flex items-center gap-3 text-xs">
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="w-12 text-slate-400">亮度</span>
              <input
                type="range"
                min="-50"
                max="50"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="flex-1 accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="w-8 text-right font-mono text-slate-300">
                {brightness > 0 ? `+${brightness}` : brightness}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <Contrast className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="w-12 text-slate-400">對比</span>
              <input
                type="range"
                min="-50"
                max="50"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="flex-1 accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="w-8 text-right font-mono text-slate-300">
                {contrast > 0 ? `+${contrast}` : contrast}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setIsGrayscale((g) => !g)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition border ${
                  isGrayscale
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                黑白濾鏡
              </button>
              <button
                type="button"
                onClick={() => {
                  setBrightness(0);
                  setContrast(0);
                  setIsGrayscale(false);
                }}
                className="text-[11px] text-slate-400 hover:text-teal-400 underline"
              >
                還原明暗預設值
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: MARKUP DOODLE */}
        {activeTab === 'markup' && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <PenTool className="w-3.5 h-3.5 text-teal-400" />
              <span>筆刷顏色：</span>
            </span>

            {/* Colors */}
            {[
              { color: '#ef4444', label: '紅' },
              { color: '#f59e0b', label: '黃' },
              { color: '#10b981', label: '綠' },
              { color: '#06b6d4', label: '青' },
              { color: '#ffffff', label: '白' },
            ].map((c) => (
              <button
                key={c.color}
                type="button"
                onClick={() => setPenColor(c.color)}
                style={{ backgroundColor: c.color }}
                className={`w-6 h-6 rounded-full transition-transform ${
                  penColor === c.color
                    ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                    : 'opacity-70 hover:opacity-100'
                }`}
                title={c.label}
              />
            ))}

            {/* Brush Size */}
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] text-slate-400">粗細</span>
              {[3, 6, 10].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setPenSize(sz)}
                  className={`w-6 h-6 rounded-lg text-xs font-bold border transition ${
                    penSize === sz
                      ? 'bg-teal-500 text-slate-950 border-teal-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {sz === 3 ? '細' : sz === 6 ? '中' : '粗'}
                </button>
              ))}
            </div>

            {/* Undo last stroke */}
            <button
              type="button"
              disabled={strokes.length === 0}
              onClick={() => setStrokes((prev) => prev.slice(0, -1))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-30 disabled:pointer-events-none text-amber-300 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition"
              title="撤銷上一筆圈記"
            >
              <UndoIcon className="w-3.5 h-3.5" />
              <span>復原筆劃 ({strokes.length})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
