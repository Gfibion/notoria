import { useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Convert HSL to hex (same math as the workspace color picker)
export function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => {
    const v = lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Best-effort hex -> hue so an existing color pre-positions the slider
function hexToHue(hex: string): number {
  const m = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return 45;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
}

interface HueColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  onClose?: () => void;
  showClose?: boolean;
  title?: string;
}

/**
 * Slider-style color picker matching the workspace creation dialog:
 * a rainbow hue track with a draggable cursor, live preview, and Clear.
 */
export function HueColorPicker({
  selectedColor,
  onSelectColor,
  onClose,
  showClose = true,
  title = 'Choose Color',
}: HueColorPickerProps) {
  const [hue, setHue] = useState(() => (selectedColor ? hexToHue(selectedColor) : 45));
  const [color, setColor] = useState(selectedColor || hslToHex(45, 60, 55));
  const [cleared, setCleared] = useState(!selectedColor);
  const sliderRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = sliderRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const h = Math.round((x / rect.width) * 360);
      const next = hslToHex(h, 60, 55);
      setHue(h);
      setColor(next);
      setCleared(false);
      // No onSelectColor here — the color is only committed when the
      // user confirms with "Apply Color" so they can slide freely.
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    updateFromClientX(e.clientX);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const handleClear = () => {
    setCleared(true);
    onSelectColor('');
  };

  const handleApply = () => {
    onSelectColor(cleared ? '' : color);
  };

  const sliderPct = (hue / 360) * 100;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-elevated p-4 animate-fade-in min-w-[280px]">
      {showClose && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Color preview + hex */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-muted-foreground">
          {cleared ? 'None' : color.toUpperCase()}
        </span>
        <div
          className="w-6 h-6 rounded-full border border-border"
          style={{ backgroundColor: cleared ? 'transparent' : color }}
        />
      </div>

      {/* Hue Slider */}
      <div
        ref={sliderRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-10 rounded-full cursor-pointer touch-none select-none mb-3"
        style={{
          background:
            'linear-gradient(to right, hsl(0,60%,55%), hsl(30,60%,55%), hsl(60,60%,55%), hsl(90,60%,55%), hsl(120,60%,55%), hsl(150,60%,55%), hsl(180,60%,55%), hsl(210,60%,55%), hsl(240,60%,55%), hsl(270,60%,55%), hsl(300,60%,55%), hsl(330,60%,55%), hsl(360,60%,55%))',
        }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow-elevated pointer-events-none"
          style={{
            left: `${sliderPct}%`,
            backgroundColor: cleared ? 'transparent' : color,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.35)',
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Slide, then apply your pick.</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear
          </Button>
          <Button size="sm" onClick={handleApply} disabled={cleared && !selectedColor}>
            Apply Color
          </Button>
        </div>
      </div>
    </div>
  );
}
