import React from 'react';
import { Server, Terminal, KeyRound, GraduationCap, Sparkles, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppInfo } from './types';
import SystemIcon from './SystemIcon';

const isImageIcon = (icon?: string) => !!icon && (icon.startsWith('http') || icon.startsWith('/'));

// Glyphs usable as an app icon via `icon: "lucide:Name"`.
const LUCIDE: Record<string, LucideIcon> = { Server, Terminal, KeyRound, GraduationCap, Sparkles, ShieldCheck };

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
  if (isImageIcon(app.icon)) return <img src={app.icon} alt="" aria-hidden="true" />;
  return <span className={emojiClass} aria-hidden="true">{app.icon || '🧩'}</span>;
};

export default AppGlyph;
