import React, { useState, useRef, useEffect } from 'react';
import {
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
  Sparkles,
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
}

export const BuiltinPhotoEditorModal: React.FC<BuiltinPhotoEditorModalProps> = ({
  isOpen,
  photoUrl,
  onSave,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [isGrayscale, setIsGrayscale] = useState<boolean>(false);

  // Markup pen tool state
  const [isPenActive, setIsPenActive] = useState<boolean>(false);
  const [penColor, setPenColor] = useState<string>('#ef4444');
  const [penSize, setPenSize] = useState<number>(4);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [activeTab, setActiveTab] = useState<'transform' | 'adjust' | 'markup'>('transform');

  // Load image
  useEffect(() => {
    if (!isOpen || !photoUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      // Reset adjustments
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setBrightness(0);
      setContrast(0);
      setIsGrayscale(false);
      setStrokes([]);
      setIsPenActive(false);
    };
    img.src = photoUrl;
  }, [isOpen, photoUrl]);

  // Render canvas
  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determine dimensions based on rotation
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

    // Reset filter for annotations
    ctx.filter = 'none';

    // Draw strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, [imageObj, rotation, flipH, flipV, brightness, contrast, isGrayscale, strokes]);

  if (!isOpen) return null;

  // Drawing handlers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPenActive) return;
    setIsDrawing(true);
    const pt = getCanvasCoords(e);
    setStrokes((prev) => [...prev, { color: penColor, size: penSize, points: [pt] }]);
  };

  const handleMoveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isPenActive) return;
    const pt = getCanvasCoords(e);
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const updatedLast: Stroke = {
        ...last,
        points: [...last.points, pt],
      };
      return [...prev.slice(0, -1), updatedLast];
    });
  };

  const handleEndDraw = () => {
    setIsDrawing(false);
  };

  const handleUndoStroke = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleSaveResult = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Export compressed JPEG
    const editedBase64 = canvas.toDataURL('image/jpeg', 0.88);
    onSave(editedBase64);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95 backdrop-blur-md animate-fade-in">
      {/* Top Bar */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>內建畫布修圖工具</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                即開即修
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">支援旋轉、水平翻轉、明暗對比調節與塗鴉重點圈記</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>儲存修圖</span>
          </button>
        </div>
      </div>

      {/* Center Image Canvas Area */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 select-none">
        <div className="relative max-w-full max-h-full flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
          <canvas
            ref={canvasRef}
            onMouseDown={handleStartDraw}
            onMouseMove={handleMoveDraw}
            onMouseUp={handleEndDraw}
            onMouseLeave={handleEndDraw}
            onTouchStart={handleStartDraw}
            onTouchMove={handleMoveDraw}
            onTouchEnd={handleEndDraw}
            className={`max-w-full max-h-[60vh] sm:max-h-[68vh] object-contain touch-none ${
              isPenActive ? 'cursor-crosshair' : 'cursor-default'
            }`}
          />
        </div>
      </div>

      {/* Bottom Toolset Bar */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 sm:p-4 space-y-3">
        {/* Tool Category Tabs */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('transform');
              setIsPenActive(false);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'transform' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>旋轉與翻轉</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('adjust');
              setIsPenActive(false);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'adjust' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>明暗與對比</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('markup');
              setIsPenActive(true);
            }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'markup' ? 'bg-teal-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>重點塗鴉圈記</span>
          </button>
        </div>

        {/* Tab 1: Rotate & Flip Controls */}
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

        {/* Tab 2: Lightness & Contrast Adjustments */}
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
              <span className="w-8 text-right font-mono text-slate-300">{brightness > 0 ? `+${brightness}` : brightness}</span>
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
              <span className="w-8 text-right font-mono text-slate-300">{contrast > 0 ? `+${contrast}` : contrast}</span>
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

        {/* Tab 3: Markup Pen & Undo */}
        {activeTab === 'markup' && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <PenTool className="w-3.5 h-3.5 text-teal-400" />
              <span>筆刷顏色：</span>
            </span>

            {/* Color Swatches */}
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
                  penColor === c.color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'opacity-70 hover:opacity-100'
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
              onClick={handleUndoStroke}
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
