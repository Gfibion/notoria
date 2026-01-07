import { useState, useEffect } from 'react';
import { Menu, Search, Plus, BookOpen, Trash2, Settings, Star, ChevronDown, ChevronRight, Hash, MoreHorizontal, Pencil, GripVertical, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Workspace, Subcategory, getSubcategoriesByWorkspace } from '@/lib/db';
import { cn } from '@/lib/utils';
import { User, Briefcase, Lightbulb, Folder, Heart, Home, Book, Music, Camera, Palette, Globe, Zap, Target, Trophy } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { WorkspaceDialog } from './WorkspaceDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const iconMap: Record<string, React.ElementType> = {
  user: User,
  briefcase: Briefcase,
  lightbulb: Lightbulb,
  folder: Folder,
  hash: Hash,
  star: Star,
  heart: Heart,
  home: Home,
  book: Book,
  music: Music,
  camera: Camera,
  palette: Palette,
  globe: Globe,
  zap: Zap,
  target: Target,
  trophy: Trophy,
  default: Hash,
};

interface MobileHeaderProps {
  workspaces: Workspace[];
  selectedWorkspace: string | null;
  selectedSubcategory?: string | null;
  onSelectWorkspace: (id: string | null) => void;
  onSelectSubcategory?: (subcategory: string | null) => void;
  onNewNote: () => void;
  onNewNoteInWorkspace?: (workspaceId: string, subcategory?: string) => void;
  onOpenSearch: () => void;
  onOpenTrash: () => void;
  onOpenSettings: () => void;
  onShowStarred?: () => void;
  showStarred?: boolean;
  onCreateWorkspace?: (name: string, color: string, icon: string) => Promise<void>;
  onUpdateWorkspace?: (id: string, name: string, color: string, icon: string) => Promise<void>;
  onDeleteWorkspace?: (id: string) => Promise<void>;
  onOpenPdf?: () => void;
}

export function MobileHeader({
  workspaces,
  selectedWorkspace,
  selectedSubcategory,
  onSelectWorkspace,
  onSelectSubcategory,
  onNewNote,
  onNewNoteInWorkspace,
  onOpenSearch,
  onOpenTrash,
  onOpenSettings,
  onShowStarred,
  showStarred = false,
  onCreateWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onOpenPdf,
}: MobileHeaderProps) {
  const currentWorkspace = workspaces.find((ws) => ws.id === selectedWorkspace);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [workspaceSubcategories, setWorkspaceSubcategories] = useState<Record<string, Subcategory[]>>({});
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  // Load subcategories for all workspaces
  useEffect(() => {
    const loadAllSubcategories = async () => {
      const subcatMap: Record<string, Subcategory[]> = {};
      for (const ws of workspaces) {
        const subcats = await getSubcategoriesByWorkspace(ws.id);
        if (subcats.length > 0) {
          subcatMap[ws.id] = subcats;
        }
      }
      setWorkspaceSubcategories(subcatMap);
    };
    loadAllSubcategories();
  }, [workspaces]);

  // Auto-expand workspace if a subcategory is selected
  useEffect(() => {
    if (selectedWorkspace && selectedSubcategory) {
      setExpandedWorkspaces(prev => new Set([...prev, selectedWorkspace]));
    }
  }, [selectedWorkspace, selectedSubcategory]);

  const toggleWorkspaceExpand = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedWorkspaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId);
      } else {
        newSet.add(workspaceId);
      }
      return newSet;
    });
  };

  const handleWorkspaceClick = (workspaceId: string) => {
    onSelectSubcategory?.(null);
    onSelectWorkspace(workspaceId);
    setIsSheetOpen(false);
  };

  const handleSubcategoryClick = (workspaceId: string, subcategoryName: string) => {
    onSelectWorkspace(workspaceId);
    onSelectSubcategory?.(subcategoryName);
    setIsSheetOpen(false);
  };

  const handleNewWorkspace = () => {
    setEditingWorkspace(null);
    setWorkspaceDialogOpen(true);
  };

  const handleEditWorkspace = (workspace: Workspace, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkspace(workspace);
    setWorkspaceDialogOpen(true);
  };

  const handleSaveWorkspace = async (name: string, color: string, icon: string) => {
    if (editingWorkspace && onUpdateWorkspace) {
      await onUpdateWorkspace(editingWorkspace.id, name, color, icon);
    } else if (onCreateWorkspace) {
      await onCreateWorkspace(name, color, icon);
    }
  };

  const handleDeleteWorkspace = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteWorkspace) {
      await onDeleteWorkspace(id);
      if (selectedWorkspace === id) {
        onSelectWorkspace(null);
      }
    }
  };

  const handleNewNoteInWorkspace = (workspaceId: string, subcategory?: string) => {
    if (onNewNoteInWorkspace) {
      onNewNoteInWorkspace(workspaceId, subcategory);
    }
    setIsSheetOpen(false);
  };

  const getTitle = () => {
    if (showStarred) return 'Starred';
    if (selectedSubcategory && currentWorkspace) {
      return `${currentWorkspace.name} / ${selectedSubcategory}`;
    }
    return currentWorkspace ? currentWorkspace.name : 'All Notes';
  };

  return (
    <>
      <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-50">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
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
                <div className="px-2 py-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Workspaces
                  </span>
                  {onCreateWorkspace && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={handleNewWorkspace}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {/* All Notes */}
                <button
                  onClick={() => {
                    onSelectSubcategory?.(null);
                    onSelectWorkspace(null);
                    setIsSheetOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                    selectedWorkspace === null && !showStarred && !selectedSubcategory
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50'
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>All Notes</span>
                </button>

                {/* Starred Notes */}
                {onShowStarred && (
                  <button
                    onClick={() => {
                      onShowStarred();
                      setIsSheetOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                      showStarred
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/50'
                    )}
                  >
                    <Star className="w-4 h-4 text-gold" />
                    <span>Starred</span>
                  </button>
                )}

                {/* Workspaces with subcategories */}
                {workspaces.map((workspace) => {
                  const Icon = iconMap[workspace.icon] || iconMap.default;
                  const subcats = workspaceSubcategories[workspace.id] || [];
                  const hasSubcats = subcats.length > 0;
                  const isExpanded = expandedWorkspaces.has(workspace.id);
                  const isWorkspaceSelected = selectedWorkspace === workspace.id && !showStarred && !selectedSubcategory;

                  return (
                    <div key={workspace.id}>
                      <div
                        className={cn(
                          'w-full flex items-center gap-1 px-2 py-2 rounded-md text-sm transition-colors group',
                          isWorkspaceSelected
                            ? 'bg-secondary text-foreground'
                            : 'text-muted-foreground hover:bg-secondary/50'
                        )}
                      >
                        {/* Expand/Collapse toggle */}
                        {hasSubcats ? (
                          <button
                            onClick={(e) => toggleWorkspaceExpand(workspace.id, e)}
                            className="p-0.5 hover:bg-secondary rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        ) : (
                          <div className="w-4" />
                        )}

                        <button
                          onClick={() => handleWorkspaceClick(workspace.id)}
                          onDoubleClick={() => handleNewNoteInWorkspace(workspace.id)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <Icon
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: workspace.color }}
                          />
                          <span>{workspace.name}</span>
                        </button>

                        {/* Edit menu */}
                        {(onUpdateWorkspace || onDeleteWorkspace) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              {onUpdateWorkspace && (
                                <DropdownMenuItem onClick={(e) => handleEditWorkspace(workspace, e)}>
                                  <Pencil className="w-3 h-3 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {onDeleteWorkspace && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                                >
                                  <Trash2 className="w-3 h-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {/* Subcategories */}
                      {hasSubcats && isExpanded && (
                        <div className="ml-6 mt-1 space-y-1">
                          {subcats.map((subcat) => (
                            <button
                              key={subcat.id}
                              onClick={() => handleSubcategoryClick(workspace.id, subcat.name)}
                              onDoubleClick={() => handleNewNoteInWorkspace(workspace.id, subcat.name)}
                              className={cn(
                                'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors',
                                selectedWorkspace === workspace.id && selectedSubcategory === subcat.name
                                  ? 'bg-secondary text-foreground'
                                  : 'text-muted-foreground hover:bg-secondary/50'
                              )}
                            >
                              <Hash className="w-3 h-3 flex-shrink-0" />
                              <span>{subcat.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="mt-4 pt-4 border-t border-border space-y-1">
                  {onOpenPdf && (
                    <button
                      onClick={() => {
                        onOpenPdf();
                        setIsSheetOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-secondary/50"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Open PDF</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onOpenTrash();
                      setIsSheetOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-secondary/50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Trash</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setIsSheetOpen(false);
                    }}
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

        <div className="flex items-center gap-2 flex-1 justify-center overflow-hidden">
          {showStarred ? <Star className="w-5 h-5 text-gold flex-shrink-0" /> : <BookOpen className="w-5 h-5 text-gold flex-shrink-0" />}
          <span className="font-display font-semibold truncate">
            {getTitle()}
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

      {/* Workspace Dialog */}
      <WorkspaceDialog
        open={workspaceDialogOpen}
        onOpenChange={(open) => {
          setWorkspaceDialogOpen(open);
          if (!open) setEditingWorkspace(null);
        }}
        onSave={handleSaveWorkspace}
        workspace={editingWorkspace}
      />
    </>
  );
}
