import { Menu, Search, Plus, BookOpen, Trash2, Settings, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Workspace } from '@/lib/db';
import { cn } from '@/lib/utils';
import { User, Briefcase, Lightbulb, Folder, Hash } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const iconMap: Record<string, React.ElementType> = {
  user: User,
  briefcase: Briefcase,
  lightbulb: Lightbulb,
  folder: Folder,
  default: Hash,
};

interface MobileHeaderProps {
  workspaces: Workspace[];
  selectedWorkspace: string | null;
  onSelectWorkspace: (id: string | null) => void;
  onNewNote: () => void;
  onOpenSearch: () => void;
  onOpenTrash: () => void;
  onOpenSettings: () => void;
  showStarred?: boolean;
}

export function MobileHeader({
  workspaces,
  selectedWorkspace,
  onSelectWorkspace,
  onNewNote,
  onOpenSearch,
  onOpenTrash,
  onOpenSettings,
  showStarred = false,
}: MobileHeaderProps) {
  const currentWorkspace = workspaces.find((ws) => ws.id === selectedWorkspace);

  return (
    <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-50">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-gold" />
                <span className="font-display text-xl font-semibold">Notoria</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-2">
              <div className="px-2 py-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Workspaces
                </span>
              </div>
              <button
                onClick={() => onSelectWorkspace(null)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                  selectedWorkspace === null && !showStarred
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50'
                )}
              >
                <BookOpen className="w-4 h-4" />
                <span>All Notes</span>
              </button>
              {workspaces.map((workspace) => {
                const Icon = iconMap[workspace.icon] || iconMap.default;
                return (
                  <button
                    key={workspace.id}
                    onClick={() => onSelectWorkspace(workspace.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                      selectedWorkspace === workspace.id && !showStarred
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/50'
                    )}
                  >
                    <Icon className="w-4 h-4" style={{ color: workspace.color }} />
                    <span>{workspace.name}</span>
                  </button>
                );
              })}
              
              <div className="mt-4 pt-4 border-t border-border space-y-1">
                <button
                  onClick={onOpenTrash}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-secondary/50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Trash</span>
                </button>
                <button
                  onClick={onOpenSettings}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-secondary/50"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </div>
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-border">
              <ThemeToggle />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        {showStarred ? <Star className="w-5 h-5 text-gold" /> : <BookOpen className="w-5 h-5 text-gold" />}
        <span className="font-display font-semibold">
          {showStarred ? 'Starred' : (currentWorkspace ? currentWorkspace.name : 'All Notes')}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onOpenSearch}>
          <Search className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNewNote}>
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}