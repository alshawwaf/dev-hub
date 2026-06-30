import type React from 'react';

export const DRAG_MIME = 'application/devhub-app';

export interface DragPayload {
  id: number;
  source: 'desktop' | 'dock';
}

export function readDrag(e: React.DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
