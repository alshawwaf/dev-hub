import React from 'react';
import { Settings, Activity, BookOpen, Info, LayoutGrid } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const MAP: Record<string, LucideIcon> = { Settings, Activity, BookOpen, Info, LayoutGrid };

const SystemIcon: React.FC<{ name?: string; size?: number }> = ({ name, size = 24 }) => {
  const Icon = (name && MAP[name]) || LayoutGrid;
  return <Icon size={size} color="#fff" strokeWidth={2} />;
};

export default SystemIcon;
