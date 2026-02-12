import React from 'react';
import { LayoutGrid, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTasksNavProps {
  activeTab: 'board' | 'projects';
  onTabChange: (tab: 'board' | 'projects') => void;
}

export const MobileTasksNav: React.FC<MobileTasksNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur-xl">
      <div className="flex">
        <button
          onClick={() => onTabChange('board')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
            activeTab === 'board' ? "text-primary" : "text-muted-foreground"
          )}
        >
          <LayoutGrid className="w-5 h-5" />
          Board
        </button>
        <button
          onClick={() => onTabChange('projects')}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
            activeTab === 'projects' ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Folder className="w-5 h-5" />
          Projects
        </button>
      </div>
    </div>
  );
};
