"use client";

import { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";

// Helper function to get renderable icon component
// Namespace imports return ForwardRef objects which React can render (same as WebApp)
function getIconComponent(iconName: string): any {
  // Use base name directly (WebApp pattern: (LucideIcons as any)[category.iconName])
  return (LucideIcons as any)[iconName];
}

// Helper to render icon - ForwardRef objects have a .render property
function IconRenderer({ iconName, className }: { iconName: string; className?: string }) {
  const Icon = getIconComponent(iconName);
  if (!Icon) return null;
  // ForwardRef objects from namespace imports have a .render property that's a function
  // Use that function directly
  if (Icon && typeof (Icon as any).render === 'function') {
    const RenderFunction = (Icon as any).render;
    return <RenderFunction className={className} />;
  }
  // Fallback: try using the object directly (shouldn't reach here)
  return null;
}

// Popular icons for categories (valid Lucide icon names)
const popularIcons = [
  'Shirt', 'Trophy', 'Users', 'Image', 'FileText', 'Star', 
  'Frame', 'Palette', 'Box', 'Football', 'Crown',
  'Sparkles', 'Zap', 'Heart', 'ShoppingBag', 'Tag', 'Gift',
  'Folder', 'Flag', 'Camera', 'Video', 'Music', 'ShoppingCart',
  'Home', 'Settings', 'Search', 'Filter', 'Download', 'Upload'
];

interface IconSelectorProps {
  value?: string | null;
  onChange: (iconName: string) => void;
}

export default function IconSelector({ value, onChange }: IconSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get all Lucide icons
  const allIcons = useMemo(() => {
    const keys = Object.keys(LucideIcons);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0d118c33-80b1-4094-b438-34ab212273a7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'IconSelector.tsx:27',message:'Starting icon extraction',data:{totalKeys:keys.length},timestamp:Date.now(),sessionId:'debug-session',runId:'debug1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const filtered = keys.filter(key => {
      const icon = LucideIcons[key as keyof typeof LucideIcons];
      // Exclude utility functions
      if (key === 'createLucideIcon') return false;
      // Exclude keys ending with "Icon" (we want the base names, not the Icon suffix variants)
      // The WebApp uses base names like "Shirt", not "ShirtIcon"
      if (key.endsWith('Icon')) return false;
      // Accept all truthy icons (objects are fine - React can render them)
      const isValid = !!icon;
      // #region agent log
      if (keys.indexOf(key) < 3) {
        fetch('http://127.0.0.1:7242/ingest/0d118c33-80b1-4094-b438-34ab212273a7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'IconSelector.tsx:38',message:'Checking icon (accepting objects)',data:{key,endsWithIcon:key.endsWith('Icon'),iconType:typeof icon,isValid},timestamp:Date.now(),sessionId:'debug-session',runId:'debug2',hypothesisId:'I'})}).catch(()=>{});
      }
      // #endregion
      return isValid;
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0d118c33-80b1-4094-b438-34ab212273a7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'IconSelector.tsx:42',message:'Filtering complete',data:{filteredCount:filtered.length,firstFew:filtered.slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'debug1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const sorted = filtered.sort();
    console.log('[IconSelector] allIcons count:', sorted.length);
    console.log('[IconSelector] First few:', sorted.slice(0, 10));
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0d118c33-80b1-4094-b438-34ab212273a7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'IconSelector.tsx:46',message:'Final allIcons',data:{finalCount:sorted.length,firstFew:sorted.slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'debug1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return sorted;
  }, []);
  
  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      return allIcons;
    }
    const query = searchQuery.toLowerCase().trim();
    return allIcons.filter(iconName =>
      iconName.toLowerCase().includes(query) ||
      iconName.toLowerCase().replace(/([A-Z])/g, ' $1').toLowerCase().includes(query)
    );
  }, [allIcons, searchQuery]);
  
  // Filter popular icons to only valid ones
  const validPopularIcons = useMemo(() => {
    return popularIcons.filter(iconName => {
      const Icon = getIconComponent(iconName);
      return !!Icon;
    });
  }, []);
  
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-2">
          Icon (Optional)
        </label>
        
        {/* Current Selection Preview */}
        {value && (
          <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-border flex items-center gap-3">
            <IconRenderer iconName={value} className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">{value}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange('')}
              className="ml-auto"
            >
              Clear
            </Button>
          </div>
        )}
        
        {/* Search */}
        <div className="mb-3">
          <Input
            placeholder="Search all icons... (e.g., 'shirt', 'trophy', 'user')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {!searchQuery && (
            <p className="text-xs text-muted-foreground mt-1">
              Browse all {allIcons.length} available Lucide icons below
            </p>
          )}
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-1">
              Found {filteredIcons.length} icon{filteredIcons.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
        
        {/* Popular Icons Quick Select */}
        {!searchQuery && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2">Popular Icons (Quick Select):</p>
            <div className="flex flex-wrap gap-2">
              {validPopularIcons.map(iconName => {
                const Icon = getIconComponent(iconName);
                if (!Icon) return null;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => onChange(iconName)}
                    className={`
                      px-3 py-1.5 rounded-lg border text-sm transition-all hover:scale-105
                      ${value === iconName 
                        ? 'border-primary bg-primary/10 text-primary' 
                        : 'border-border hover:border-primary/50'
                      }
                      flex items-center gap-2
                    `}
                  >
                    <IconRenderer iconName={iconName} className="w-4 h-4" />
                    {iconName}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Icon Grid - Shows ALL icons */}
        <div className="border border-border rounded-lg p-3 bg-background">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              {searchQuery 
                ? `Showing ${filteredIcons.length} icon${filteredIcons.length !== 1 ? 's' : ''}`
                : `All ${allIcons.length} Icons`
              }
            </p>
            {!searchQuery && (
              <p className="text-xs text-muted-foreground">
                Scroll to browse all icons
              </p>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 gap-2">
              {filteredIcons.map(iconName => {
                const Icon = getIconComponent(iconName);
                // #region agent log
                if (filteredIcons.indexOf(iconName) < 3) {
                  fetch('http://127.0.0.1:7242/ingest/0d118c33-80b1-4094-b438-34ab212273a7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'IconSelector.tsx:207',message:'Rendering icon via IconRenderer',data:{iconName,iconType:typeof Icon,hasIcon:!!Icon},timestamp:Date.now(),sessionId:'debug-session',runId:'debug5',hypothesisId:'O'})}).catch(()=>{});
                }
                // #endregion
                if (!Icon) return null;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => onChange(iconName)}
                    className={`
                      p-2 rounded-lg border-2 transition-all hover:scale-105
                      ${value === iconName 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                      }
                      flex items-center justify-center
                    `}
                    title={iconName}
                  >
                    <IconRenderer iconName={iconName} className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
            {filteredIcons.length === 0 && searchQuery && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No icons found matching &quot;{searchQuery}&quot;
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

