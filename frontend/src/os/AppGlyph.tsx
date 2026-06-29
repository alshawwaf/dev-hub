import React from 'react';
import type { AppInfo } from './types';
import SystemIcon from './SystemIcon';

const isImageIcon = (icon?: string) => !!icon && (icon.startsWith('http') || icon.startsWith('/'));

// Single source of truth for rendering an app's icon: a system glyph, a logo
// image, or an emoji fallback. emojiClass lets callers keep their own sizing.
const AppGlyph: React.FC<{ app: AppInfo; size?: number; emojiClass?: string }> = ({
  app,
  size = 24,
  emojiClass = 'os-glyph-emoji',
}) => {
  if (app.system) return <SystemIcon name={app.iconName} size={size} />;
  if (isImageIcon(app.icon)) return <img src={app.icon} alt="" aria-hidden="true" />;
  return <span className={emojiClass} aria-hidden="true">{app.icon || '🧩'}</span>;
};

export default AppGlyph;
