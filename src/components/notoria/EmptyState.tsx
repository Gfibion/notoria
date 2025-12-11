import { BookOpen, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateNote: () => void;
}

export function EmptyState({ onCreateNote }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-16 animate-fade-in">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gold-soft to-secondary flex items-center justify-center">
          <BookOpen className="w-12 h-12 text-gold" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gold flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>
      <h2 className="font-display text-2xl font-semibold text-foreground mb-2 text-center">
        Your Thinking Space Awaits
      </h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Capture ideas, structure thoughts, and build clarity. Create your first note to begin your
        executive productivity journey.
      </p>
      <Button onClick={onCreateNote} size="lg" className="gap-2">
        <Plus className="w-5 h-5" />
        Create Your First Note
      </Button>
    </div>
  );
}
