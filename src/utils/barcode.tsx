import React from 'react';

/**
 * Pure SVG Barcode Generator based on Code 39/pseudo-code representation.
 * Crisp, vector-rendered, perfect for high-resolution printing on exam cards and desk stickers.
 */
export const BarcodeSVG: React.FC<{
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}> = ({ value, width = 160, height = 36, showText = false, className = '' }) => {
  // Simple deterministic pattern generator from string value
  const generateBars = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    
    // Generate 45 bars (mix of thick and thin)
    const bars: { x: number; width: number }[] = [];
    let currentX = 2;
    const totalBars = 36;
    const step = (width - 4) / (totalBars * 1.5);

    // Guard bars
    bars.push({ x: currentX, width: step * 1.5 });
    currentX += step * 2.5;

    for (let i = 0; i < totalBars; i++) {
      const charCode = str.charCodeAt(i % str.length) || 65;
      const isThick = ((charCode + i + Math.abs(hash)) % 3) === 0;
      const barWidth = isThick ? step * 1.6 : step * 0.8;
      bars.push({ x: currentX, width: barWidth });
      currentX += barWidth + (isThick ? step * 1.2 : step * 0.8);
      if (currentX >= width - 6) break;
    }

    // End guard bars
    bars.push({ x: Math.min(currentX, width - 4), width: step * 1.5 });
    return bars;
  };

  const bars = generateBars(value || 'EXAM-2025');

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-hidden"
      >
        <rect width={width} height={height} fill="#ffffff" />
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={2}
            width={bar.width}
            height={height - 4}
            fill="#111827"
          />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-[9px] tracking-wider text-slate-800 font-semibold mt-0.5">
          *{value}*
        </span>
      )}
    </div>
  );
};

/**
 * Pure SVG QR Code lookalike vector graphic for student verification badges
 */
export const QRCodeSVG: React.FC<{
  value: string;
  size?: number;
  className?: string;
}> = ({ value, size = 52, className = '' }) => {
  // Deterministic 15x15 mini QR matrix
  const matrixSize = 13;
  const cellSize = size / matrixSize;

  let seed = 0;
  for (let i = 0; i < value.length; i++) {
    seed = (seed * 31 + value.charCodeAt(i)) & 0xffffffff;
  }

  const isCornerFinder = (r: number, c: number) => {
    // Top-left
    if (r < 4 && c < 4) return true;
    // Top-right
    if (r < 4 && c >= matrixSize - 4) return true;
    // Bottom-left
    if (r >= matrixSize - 4 && c < 4) return true;
    return false;
  };

  const isCornerCenter = (r: number, c: number) => {
    if (r === 1 && c === 1) return true;
    if (r === 1 && c === matrixSize - 2) return true;
    if (r === matrixSize - 2 && c === 1) return true;
    return false;
  };

  const cells: { r: number; c: number; fill: string }[] = [];

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (isCornerFinder(r, c)) {
        // Outer border of finder pattern
        const isBorder =
          r === 0 || r === 3 || c === 0 || c === 3 ||
          (r === 0 && c >= matrixSize - 4) || (r === 3 && c >= matrixSize - 4) ||
          (c === matrixSize - 1 && r < 4) || (c === matrixSize - 4 && r < 4) ||
          (r === matrixSize - 4 && c < 4) || (r === matrixSize - 1 && c < 4) ||
          (c === 0 && r >= matrixSize - 4) || (c === 3 && r >= matrixSize - 4);
        
        if (isBorder || isCornerCenter(r, c)) {
          cells.push({ r, c, fill: '#0f172a' });
        }
      } else {
        const val = ((seed ^ (r * 17 + c * 37)) >>> (r + c)) & 1;
        if (val === 1) {
          cells.push({ r, c, fill: '#0f172a' });
        }
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`bg-white p-0.5 border border-slate-300 rounded ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={size} height={size} fill="#ffffff" />
      {cells.map((cell, idx) => (
        <rect
          key={idx}
          x={cell.c * cellSize}
          y={cell.r * cellSize}
          width={cellSize}
          height={cellSize}
          fill={cell.fill}
        />
      ))}
    </svg>
  );
};
