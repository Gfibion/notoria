import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, FileText, Calendar, Hash } from 'lucide-react';

export interface ExtractedTextMetadata {
  pdfTitle: string;
  pageNumber: number;
  timestamp: Date;
}

interface ExtractedTextDisplayProps {
  text: string;
  metadata: ExtractedTextMetadata;
  onRemove?: () => void;
}

export function ExtractedTextDisplay({ text, metadata, onRemove }: ExtractedTextDisplayProps) {
  const [showMetadata, setShowMetadata] = useState(false);

  const formattedDate = new Date(metadata.timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <span className="extracted-text-wrapper relative inline">
      <span className="bg-accent/30 rounded px-0.5">{text}</span>
      <button
        onClick={() => setShowMetadata(!showMetadata)}
        className="inline-flex items-center justify-center text-[10px] font-bold text-primary hover:text-primary/80 cursor-pointer align-super ml-0.5 transition-colors"
        title="View source"
      >
        ^
      </button>
      
      {/* Metadata popup */}
      {showMetadata && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMetadata(false)} 
          />
          <div className="absolute left-0 bottom-full mb-2 z-50 bg-popover border border-border rounded-lg shadow-elevated p-3 min-w-[200px] max-w-[280px] animate-fade-in">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="text-xs font-semibold text-foreground">Source</h4>
              <button
                onClick={() => setShowMetadata(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">PDF Title</p>
                  <p className="text-xs text-foreground truncate">{metadata.pdfTitle}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Page</p>
                  <p className="text-xs text-foreground">{metadata.pageNumber}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Extracted</p>
                  <p className="text-xs text-foreground">{formattedDate}</p>
                </div>
              </div>
            </div>

            {onRemove && (
              <button
                onClick={() => {
                  onRemove();
                  setShowMetadata(false);
                }}
                className="mt-3 w-full text-xs text-destructive hover:text-destructive/80 transition-colors"
              >
                Remove from note
              </button>
            )}
          </div>
        </>
      )}
    </span>
  );
}

// Helper to generate HTML for extracted text with metadata
export function generateExtractedTextHtml(text: string, metadata: ExtractedTextMetadata): string {
  const metadataJson = JSON.stringify(metadata);
  const encodedMetadata = encodeURIComponent(metadataJson);
  
  return `<span class="pdf-extracted-text" data-pdf-metadata="${encodedMetadata}"><span class="extracted-content">${text}</span><sup class="pdf-source-marker" title="View source">^</sup></span>`;
}

// Parse extracted text metadata from HTML element
export function parseExtractedTextMetadata(element: HTMLElement): ExtractedTextMetadata | null {
  const encodedMetadata = element.getAttribute('data-pdf-metadata');
  if (!encodedMetadata) return null;
  
  try {
    const metadata = JSON.parse(decodeURIComponent(encodedMetadata));
    return {
      ...metadata,
      timestamp: new Date(metadata.timestamp),
    };
  } catch {
    return null;
  }
}
