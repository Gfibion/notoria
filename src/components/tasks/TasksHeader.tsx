import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Calendar, Filter, LayoutGrid, List, Plus, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/notoria/ThemeToggle';

interface TasksHeaderProps {
  view: 'kanban' | 'list';
  onViewChange: (view: 'kanban' | 'list') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewTask: () => void;
  todayCount: number;
}

export const TasksHeader: React.FC<TasksHeaderProps> = ({
  view,
  onViewChange,
  searchQuery,
  onSearchChange,
  onNewTask,
  todayCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Back to Notes</span>
          </Link>
          
          <div className="h-6 w-px bg-border hidden sm:block" />
          
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h1 className="font-display text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Tasks
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Today indicator */}
          {todayCount > 0 && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium animate-pulse">
              <Calendar className="w-4 h-4" />
              {todayCount} due today
            </div>
          )}

          <ThemeToggle />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {todayCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                {todayCount > 9 ? '9+' : todayCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t border-border/50">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-48 md:w-64 h-9 bg-secondary/50"
            />
          </div>

          {/* View Toggle */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-lg bg-secondary/50">
            <button
              onClick={() => onViewChange('kanban')}
              className={cn(
                "p-2 rounded-md transition-all",
                view === 'kanban' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewChange('list')}
              className={cn(
                "p-2 rounded-md transition-all",
                view === 'list' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Filter */}
          <Button variant="ghost" size="sm" className="hidden md:flex gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>

        {/* New Task Button */}
        <Button 
          onClick={onNewTask}
          className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Task</span>
        </Button>
      </div>
    </header>
  );
};
