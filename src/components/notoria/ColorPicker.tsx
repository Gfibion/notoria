import { NOTE_COLORS } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  onClose?: () => void;
  showClose?: boolean;
}

export function ColorPicker({ selectedColor, onSelectColor, onClose, showClose = true }: ColorPickerProps) {
  return (
    <div className="bg-popover border border-border rounded-lg shadow-elevated p-3 animate-fade-in">
      {showClose && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Note Color</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {NOTE_COLORS.map((color) => (
          <button
            key={color.name}
            onClick={() => onSelectColor(color.value)}
            className={cn(
              'w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center',
              selectedColor === color.value
                ? 'border-foreground scale-110'
                : 'border-transparent hover:border-muted-foreground',
              color.value === '' && 'bg-card border-border'
            )}
            style={color.value ? { backgroundColor: color.value } : undefined}
            title={color.name}
          >
            {selectedColor === color.value && (
              <Check className={cn('w-4 h-4', color.value ? 'text-foreground' : 'text-muted-foreground')} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}