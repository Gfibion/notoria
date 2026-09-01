import { useState, useEffect, useCallback } from 'react';
import { Note, Workspace, getSecretNotes, setNoteSecret, softDeleteNote } from '@/lib/db';
import { hasSafePin, setSafePin, verifySafePin, isValidPin, changeSafePin } from '@/lib/safe-folder';
import { Lock, ShieldCheck, X, Unlock, FolderOpen, Trash2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface SafeFolderViewProps {
  workspaces: Workspace[];
  onClose: () => void;
  onOpenNote: (note: Note) => void;
  onChanged: () => void;
}

export function SafeFolderView({ workspaces, onClose, onOpenNote, onChanged }: SafeFolderViewProps) {
  const [checking, setChecking] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [changing, setChanging] = useState(false);
  const [newPin, setNewPin] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    hasSafePin().then((v) => {
      setHasPin(v);
      setChecking(false);
    });
  }, []);

  const loadNotes = useCallback(async () => {
    setNotes(await getSecretNotes());
  }, []);

  const handleCreatePin = async () => {
    setError(null);
    if (!isValidPin(pin)) return setError('PIN must be 4-8 digits.');
    if (pin !== confirmPin) return setError('PINs do not match.');
    setBusy(true);
    try {
      await setSafePin(pin);
      setHasPin(true);
      setUnlocked(true);
      setPin('');
      setConfirmPin('');
      await loadNotes();
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async () => {
    setError(null);
    setBusy(true);
    try {
      const ok = await verifySafePin(pin);
      if (!ok) {
        setError('Incorrect PIN.');
        return;
      }
      setUnlocked(true);
      setPin('');
      await loadNotes();
    } finally {
      setBusy(false);
    }
  };

  const handleChangePin = async () => {
    setError(null);
    if (!isValidPin(newPin)) return setError('New PIN must be 4-8 digits.');
    setBusy(true);
    try {
      await changeSafePin(pin, newPin);
      toast({ title: 'PIN updated' });
      setChanging(false);
      setPin('');
      setNewPin('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change PIN.');
    } finally {
      setBusy(false);
    }
  };

  const handleMoveOut = async (id: string) => {
    await setNoteSecret(id, false);
    await loadNotes();
    onChanged();
    toast({ title: 'Note moved out of Safe Folder' });
  };

  const handleDelete = async (id: string) => {
    await softDeleteNote(id);
    await setNoteSecret(id, false);
    await loadNotes();
    onChanged();
    toast({ title: 'Note moved to trash' });
  };

  const getWorkspace = (id: string) => workspaces.find((ws) => ws.id === id);

  const header = (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-gold" />
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Safe Folder</h1>
          <p className="text-xs text-muted-foreground">
            PIN-protected notes — hidden from lists, starred and search
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {unlocked && (
          <Button variant="ghost" size="icon" onClick={() => { setUnlocked(false); setChanging(false); setPin(''); }} title="Lock">
            <Lock className="w-5 h-5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );

  if (checking) {
    return (
      <div className="h-full flex flex-col bg-background">
        {header}
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="h-full flex flex-col bg-background animate-fade-in">
        {header}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-6 h-6 text-muted-foreground" />
            </div>
            <h2 className="font-display text-lg font-semibold">
              {hasPin ? 'Enter your PIN' : 'Create a Safe Folder PIN'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasPin
                ? 'Your secret notes are locked.'
                : 'Choose a 4-8 digit PIN. It is stored only on this device and cannot be recovered.'}
            </p>
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && hasPin && handleUnlock()}
              placeholder="PIN"
              className="text-center tracking-[0.4em]"
            />
            {!hasPin && (
              <Input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePin()}
                placeholder="Confirm PIN"
                className="text-center tracking-[0.4em]"
              />
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={busy} onClick={hasPin ? handleUnlock : handleCreatePin}>
              <Unlock className="w-4 h-4 mr-2" />
              {hasPin ? 'Unlock' : 'Create PIN'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background animate-fade-in">
      {header}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6">
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={() => { setChanging((v) => !v); setError(null); }}>
            <KeyRound className="w-4 h-4 mr-2" />
            Change PIN
          </Button>
        </div>

        {changing && (
          <div className="mb-6 p-4 rounded-lg border border-border bg-card space-y-3 max-w-sm">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Current PIN"
            />
            <Input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="New PIN"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button size="sm" disabled={busy} onClick={handleChangePin}>Save PIN</Button>
          </div>
        )}

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ShieldCheck className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Safe Folder is empty</p>
            <p className="text-xs text-muted-foreground mt-1">
              Long-press a note and choose “Move to Safe Folder”
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const workspace = getWorkspace(note.workspace);
              return (
                <div
                  key={note.id}
                  className={cn('p-4 rounded-lg border border-border bg-card cursor-pointer', note.color && 'border-0')}
                  style={note.color ? { backgroundColor: note.color } : undefined}
                  onClick={() => onOpenNote(note)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className={cn('font-medium line-clamp-1', note.color ? 'text-gray-800' : 'text-foreground')}>
                        {note.title || 'Untitled'}
                      </h3>
                      <p className={cn('text-sm line-clamp-2 mt-1', note.color ? 'text-gray-600' : 'text-muted-foreground')}>
                        {note.content.replace(/<[^>]*>/g, '').slice(0, 120)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {workspace && (
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${workspace.color}20`, color: workspace.color }}
                          >
                            {workspace.name}
                          </span>
                        )}
                        <span>{format(new Date(note.updatedAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Move out of Safe Folder"
                        onClick={() => handleMoveOut(note.id)}
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Move to trash"
                        onClick={() => handleDelete(note.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
