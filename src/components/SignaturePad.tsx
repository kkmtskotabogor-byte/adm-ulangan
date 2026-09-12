import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool, Check, Eraser, Sparkles } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onClear?: () => void;
  initialSignature?: string;
  penColor?: string;
  width?: number;
  height?: number;
  label?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onClear,
  initialSignature,
  penColor: initialPenColor = '#1e3a8a', // Default to realistic navy blue pen
  width = 460,
  height = 180,
  label = 'Tanda Tangan Pengawas',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState<string>(initialPenColor);
  const [strokeWidth, setStrokeWidth] = useState<number>(2.5);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas with proper scale for sharp lines
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);

    // Clean transparent background
    ctx.clearRect(0, 0, width, height);

    // If there is an initial signature image, draw it
    if (initialSignature) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setHasDrawn(true);
      };
      img.src = initialSignature;
    } else {
      setHasDrawn(false);
    }
  }, [width, height, initialSignature]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Coordinate helper relative to canvas display bounding box
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getCoordinates(e);
    setIsDrawing(true);
    setLastPoint(point);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = penColor;
    ctx.fillStyle = penColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw small dot for single tap
    ctx.beginPath();
    ctx.arc(point.x, point.y, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPoint) return;
    const point = getCoordinates(e);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    setLastPoint(point);
    setHasDrawn(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      setIsDrawing(false);
      setLastPoint(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe ignore
      }

      // Automatically notify parent with current dataUrl
      const canvas = canvasRef.current;
      if (canvas && hasDrawn) {
        onSave(canvas.toDataURL('image/png'));
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    setHasDrawn(false);
    setLastPoint(null);
    if (onClear) onClear();
    onSave('');
  };

  // Generate a neat sample cursive initial signature for rapid testing
  const handleGenerateSample = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    handleClear();

    ctx.strokeStyle = penColor;
    ctx.lineWidth = strokeWidth + 0.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw an artistic signature curve
    const startX = width * 0.15;
    const baselineY = height * 0.65;

    ctx.beginPath();
    // Big loop
    ctx.moveTo(startX, baselineY);
    ctx.bezierCurveTo(startX + 30, baselineY - 60, startX + 60, baselineY - 40, startX + 70, baselineY);
    // Downstroke
    ctx.bezierCurveTo(startX + 80, baselineY + 25, startX + 40, baselineY + 30, startX + 50, baselineY - 10);
    // Flourish loop
    ctx.bezierCurveTo(startX + 90, baselineY - 30, startX + 130, baselineY - 20, startX + 160, baselineY);
    // Tail
    ctx.bezierCurveTo(startX + 180, baselineY + 10, startX + 220, baselineY - 15, startX + 260, baselineY - 5);
    // Sharp flourish underline
    ctx.moveTo(startX + 30, baselineY + 18);
    ctx.quadraticCurveTo(startX + 150, baselineY + 28, startX + 280, baselineY + 12);
    ctx.stroke();

    setHasDrawn(true);
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenTool className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-800">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Pen Color Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => setPenColor('#1e3a8a')}
              title="Tinta Biru Pulpen"
              className={`w-5 h-5 rounded flex items-center justify-center transition-transform ${
                penColor === '#1e3a8a' ? 'scale-110 ring-2 ring-indigo-500' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: '#1e3a8a' }}
            >
              {penColor === '#1e3a8a' && <Check className="w-3 h-3 text-white" />}
            </button>
            <button
              type="button"
              onClick={() => setPenColor('#0f172a')}
              title="Tinta Hitam"
              className={`w-5 h-5 rounded flex items-center justify-center transition-transform ${
                penColor === '#0f172a' ? 'scale-110 ring-2 ring-slate-800' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: '#0f172a' }}
            >
              {penColor === '#0f172a' && <Check className="w-3 h-3 text-white" />}
            </button>
          </div>

          {/* Stroke width selector */}
          <select
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="text-[11px] py-0.5 px-1.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
            title="Ketebalan Pena"
          >
            <option value={1.8}>Halus (1.8px)</option>
            <option value={2.5}>Sedang (2.5px)</option>
            <option value={3.5}>Tebal (3.5px)</option>
          </select>

          {/* Sample preset signature */}
          <button
            type="button"
            onClick={handleGenerateSample}
            className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-medium border border-amber-200 flex items-center gap-1 transition-colors"
            title="Isi contoh goresan tanda tangan otomatis"
          >
            <Sparkles className="w-3 h-3" />
            <span>Contoh TTD</span>
          </button>

          {/* Clear button */}
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium border border-slate-200 flex items-center gap-1 transition-colors"
            title="Hapus dan ulangi tanda tangan"
          >
            <Eraser className="w-3 h-3" />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      {/* Signature Canvas Box */}
      <div 
        className="relative bg-white rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 transition-colors overflow-hidden shadow-inner cursor-crosshair select-none"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-[160px] sm:h-[180px] block"
          style={{ touchAction: 'none' }}
        />

        {/* Subtle Guidelines */}
        <div className="absolute inset-x-6 bottom-8 border-b border-slate-300 pointer-events-none flex items-center justify-between text-[10px] text-slate-400 font-sans">
          <span>Garis dasar tanda tangan (TTD)</span>
          <span className="font-mono text-[9px] uppercase tracking-wider">Touch / Stylus / Mouse</span>
        </div>

        {!hasDrawn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 gap-1.5">
            <PenTool className="w-6 h-6 opacity-40 text-indigo-400" />
            <p className="text-xs font-medium text-slate-500">
              Goreskan tanda tangan Anda di sini menggunakan layar sentuh, stylus, atau kursor mouse
            </p>
            <p className="text-[10px] text-slate-400">
              Tanda tangan digital ini akan otomatis tersimpan dan tampil pada daftar hadir ujian
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
