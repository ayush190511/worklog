'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/use-ui-store';

export function ImageLightbox() {
  const open = useUIStore((s) => s.lightboxOpen);
  const images = useUIStore((s) => s.lightboxImages);
  const index = useUIStore((s) => s.lightboxIndex);
  const close = useUIStore((s) => s.closeLightbox);
  const setIndex = useUIStore((s) => s.setLightboxIndex);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Create/revoke object URL
  useEffect(() => {
    if (!open || !images[index]) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(images[index].data);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [open, images, index]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft' && index > 0) setIndex(index - 1);
      if (e.key === 'ArrowRight' && index < images.length - 1) setIndex(index + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, index, images.length, close, setIndex]);

  const handleDownload = useCallback(() => {
    if (!images[index]) return;
    const url = URL.createObjectURL(images[index].data);
    const a = document.createElement('a');
    a.href = url;
    a.download = images[index].name;
    a.click();
    URL.revokeObjectURL(url);
  }, [images, index]);

  if (!open || !objectUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <span className="text-sm text-white/70">
          {index + 1} / {images.length}
        </span>
        <Button variant="ghost" size="icon" onClick={handleDownload} className="text-white hover:bg-white/10">
          <Download className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={close} className="text-white hover:bg-white/10">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Previous */}
      {index > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIndex(index - 1)}
          className="absolute left-4 text-white hover:bg-white/10 h-12 w-12"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {/* Image */}
      <img
        src={objectUrl}
        alt={images[index]?.name ?? 'Image'}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {index < images.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIndex(index + 1)}
          className="absolute right-4 text-white hover:bg-white/10 h-12 w-12"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Background click to close */}
      <div className="absolute inset-0 -z-10" onClick={close} />
    </div>
  );
}
