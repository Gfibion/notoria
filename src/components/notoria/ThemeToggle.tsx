import { Moon, Sun, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '@/lib/db';

interface ThemeToggleProps {
  collapsed?: boolean;
}

type AppTheme = 'default' | 'dark' | 'purple-gradient';

const themeOrder: AppTheme[] = ['default', 'dark', 'purple-gradient'];
const themeLabels: Record<AppTheme, string> = {
  default: 'Light Mode',
  dark: 'Dark Mode',
  'purple-gradient': 'Purple Mode',
};

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('default');

  useEffect(() => {
    setMounted(true);
    getSettings().then((settings) => {
      setCurrentTheme(settings.theme);
    });
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={collapsed ? 'icon' : 'sm'}
        className="text-muted-foreground"
        disabled
      >
        <Sun className="w-4 h-4" />
        {!collapsed && <span className="ml-2">Theme</span>}
      </Button>
    );
  }

  const handleToggle = async () => {
    const currentIndex = themeOrder.indexOf(currentTheme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setCurrentTheme(nextTheme);

    // Apply theme
    if (nextTheme === 'dark' || nextTheme === 'purple-gradient') {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', nextTheme);
    } else {
      setTheme('light');
      document.documentElement.removeAttribute('data-theme');
    }

    // Persist
    const settings = await getSettings();
    await saveSettings({ ...settings, theme: nextTheme });
  };

  const icon =
    currentTheme === 'default' ? Sun :
    currentTheme === 'dark' ? Moon : Palette;

  const Icon = icon;

  return (
    <Button
      variant="ghost"
      size={collapsed ? 'icon' : 'sm'}
      onClick={handleToggle}
      className={cn(
        'text-muted-foreground hover:text-foreground transition-colors',
        !collapsed && 'w-full justify-start'
      )}
    >
      <Icon className="w-4 h-4" />
      {!collapsed && (
        <span className="ml-2">{themeLabels[currentTheme]}</span>
      )}
    </Button>
  );
}
