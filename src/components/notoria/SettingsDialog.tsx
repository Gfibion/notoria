import { useState, useEffect } from 'react';
import { X, Check, Sun, Moon, Palette, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSettings, saveSettings, AppSettings } from '@/lib/db';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

const themes = [
  { id: 'default', name: 'Default', icon: Sun, description: 'Light theme with warm tones' },
  { id: 'dark', name: 'Dark', icon: Moon, description: 'Dark theme for night use' },
  { id: 'purple-gradient', name: 'Purple Gradient', icon: Palette, description: 'Purple & dark blue gradient' },
] as const;

const fonts = [
  { id: 'cambria', name: 'Cambria', family: 'Cambria, "Hoefler Text", Georgia, serif', description: 'Elegant serif' },
  { id: 'times', name: 'Times New Roman', family: '"Times New Roman", Times, serif', description: 'Classic serif' },
  { id: 'calibri', name: 'Calibri', family: 'Calibri, "Gill Sans", sans-serif', description: 'Clean sans-serif' },
  { id: 'georgia', name: 'Georgia', family: 'Georgia, "Times New Roman", serif', description: 'Elegant serif' },
] as const;

const fontSizes = [
  { id: 'small', name: 'Small', size: '14px', description: 'Compact text' },
  { id: 'medium', name: 'Medium', size: '16px', description: 'Default size' },
  { id: 'large', name: 'Large', size: '18px', description: 'Easier to read' },
  { id: 'xlarge', name: 'Extra Large', size: '20px', description: 'Maximum readability' },
] as const;

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [settings, setSettings] = useState<AppSettings>({
    id: 'app-settings',
    theme: 'default',
    fontFamily: 'cambria',
    fontSize: 'medium',
  });
  const { setTheme } = useTheme();

  useEffect(() => {
    if (open) {
      getSettings().then(setSettings);
    }
  }, [open]);

  const handleThemeChange = async (theme: AppSettings['theme']) => {
    const newSettings = { ...settings, theme };
    setSettings(newSettings);
    await saveSettings(newSettings);
    
    // Apply theme
    if (theme === 'dark' || theme === 'purple-gradient') {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      setTheme('light');
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const handleFontChange = async (fontFamily: AppSettings['fontFamily']) => {
    const newSettings = { ...settings, fontFamily };
    setSettings(newSettings);
    await saveSettings(newSettings);
    
    // Apply font
    const font = fonts.find(f => f.id === fontFamily);
    if (font) {
      document.documentElement.style.setProperty('--app-font-family', font.family);
    }
  };

  const handleFontSizeChange = async (fontSize: AppSettings['fontSize']) => {
    const newSettings = { ...settings, fontSize };
    setSettings(newSettings);
    await saveSettings(newSettings);
    
    // Apply font size
    const size = fontSizes.find(f => f.id === fontSize);
    if (size) {
      document.documentElement.style.setProperty('--app-font-size', size.size);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-popover border border-border rounded-lg shadow-elevated w-full max-w-md animate-fade-in max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-popover z-10">
          <h2 className="font-display text-xl font-semibold text-foreground">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {/* Theme Section */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Theme</h3>
            <div className="space-y-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                    settings.theme === theme.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <theme.icon className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{theme.name}</p>
                    <p className="text-xs text-muted-foreground">{theme.description}</p>
                  </div>
                  {settings.theme === theme.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Font Section */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Font</h3>
            <div className="space-y-2">
              {fonts.map((font) => (
                <button
                  key={font.id}
                  onClick={() => handleFontChange(font.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                    settings.fontFamily === font.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground" style={{ fontFamily: font.family }}>
                      {font.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{font.description}</p>
                  </div>
                  {settings.fontFamily === font.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Section */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Font Size</h3>
            <div className="grid grid-cols-2 gap-2">
              {fontSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => handleFontSizeChange(size.id)}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border transition-colors text-left',
                    settings.fontSize === size.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <Type className="w-4 h-4 text-muted-foreground" style={{ fontSize: size.size }} />
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{size.name}</p>
                    <p className="text-xs text-muted-foreground">{size.description}</p>
                  </div>
                  {settings.fontSize === size.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
