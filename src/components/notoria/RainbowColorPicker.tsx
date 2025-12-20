import { useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RainbowColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  onClose?: () => void;
  showClose?: boolean;
  title?: string;
}

export function RainbowColorPicker({ 
  selectedColor, 
  onSelectColor, 
  onClose, 
  showClose = true,
  title = 'Choose Color'
}: RainbowColorPickerProps) {
  const [currentColor, setCurrentColor] = useState(selectedColor || '#ff0000');
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleSliderInteraction = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    
    // Map percentage to hue (0-360)
    const hue = Math.round(percentage * 360);
    const color = `hsl(${hue}, 80%, 50%)`;
    setCurrentColor(color);
    onSelectColor(color);
  }, [onSelectColor]);

  const handleMouseDown = (e: React.MouseEvent) => {
    handleSliderInteraction(e.clientX);
    
    const handleMouseMove = (e: MouseEvent) => {
      handleSliderInteraction(e.clientX);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleSliderInteraction(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleSliderInteraction(e.touches[0].clientX);
  };

  const handleClear = () => {
    setCurrentColor('');
    onSelectColor('');
  };

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
      
      {/* Rainbow Slider */}
      <div
        ref={sliderRef}
        className="h-8 rounded-lg cursor-pointer relative mb-3"
        style={{
          background: 'linear-gradient(to right, hsl(0, 80%, 50%), hsl(60, 80%, 50%), hsl(120, 80%, 50%), hsl(180, 80%, 50%), hsl(240, 80%, 50%), hsl(300, 80%, 50%), hsl(360, 80%, 50%))',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      />

      {/* Preview & Clear */}
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg border border-border"
          style={{ backgroundColor: currentColor || 'transparent' }}
        />
        <Button variant="outline" size="sm" onClick={handleClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
