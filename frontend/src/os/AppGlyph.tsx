import React, { useState, useEffect } from 'react';
import { Server, Terminal, KeyRound, GraduationCap, Sparkles, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppInfo } from './types';
import SystemIcon from './SystemIcon';

const isImageIcon = (icon?: string) => !!icon && (icon.startsWith('http') || icon.startsWith('/'));

// Glyphs usable as an app icon via `icon: "lucide:Name"`.
const LUCIDE: Record<string, LucideIcon> = { Server, Terminal, KeyRound, GraduationCap, Sparkles, ShieldCheck };

// A logo image that degrades to a letter monogram if the file 404s or fails to
// load, so a missing logo never renders as a blank/greyed tile.
const ImgGlyph: React.FC<{ src: string; name: string; size: number }> = ({ src, name, size }) => {
  const [failed, setFailed] = useState(false);
  // Retry when the icon changes — otherwise a once-failed icon stays on the letter
  // fallback even after it's edited to a valid path (until a full reload).
  useEffect(() => { setFailed(false); }, [src]);
  if (failed) {
    const letter = (name || '').trim().charAt(0).toUpperCase() || '?';
    return <span aria-hidden="true" style={{ fontSize: size * 0.78, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{letter}</span>;
  }
  return <img src={src} alt="" aria-hidden="true" onError={() => setFailed(true)} />;
};

// Single source of truth for rendering an app's icon: a system glyph, a
// "lucide:Name" glyph, a logo image, or an emoji fallback. emojiClass lets
// callers keep their own sizing.
const AppGlyph: React.FC<{ app: AppInfo; size?: number; emojiClass?: string }> = ({
  app,
  size = 24,
  emojiClass = 'os-glyph-emoji',
}) => {
  if (app.system) return <SystemIcon name={app.iconName} size={size} />;
  if (app.icon?.startsWith('lucide:')) {
    const Icon = LUCIDE[app.icon.slice(7)] ?? Sparkles;
    return <Icon size={size} color="#fff" strokeWidth={2} />;
  }
  if (isImageIcon(app.icon)) return <ImgGlyph src={app.icon!} name={app.name} size={size} />;
  return <span className={emojiClass} aria-hidden="true">{app.icon || '🧩'}</span>;
};

export default AppGlyph;
