import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
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

  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size={collapsed ? 'icon' : 'sm'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'text-muted-foreground hover:text-foreground transition-colors',
        !collapsed && 'w-full justify-start'
      )}
    >
      <div className="relative w-4 h-4">
        <Sun
          className={cn(
            'w-4 h-4 absolute inset-0 transition-all duration-300',
            isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          )}
        />
        <Moon
          className={cn(
            'w-4 h-4 absolute inset-0 transition-all duration-300',
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          )}
        />
      </div>
      {!collapsed && (
        <span className="ml-2">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      )}
    </Button>
  );
}
