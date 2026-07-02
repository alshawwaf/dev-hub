import type { AppInfo } from './types';

export const LAUNCHPAD_ID = -1;

// Synthetic built-in apps. Negative ids keep them distinct from DB apps.
// These live in the dock (and Launchpad); they are not draggable to the desktop.
export const SYSTEM_APPS: AppInfo[] = [
  {
    id: -2, name: 'Settings', system: 'settings', iconName: 'Settings',
    description: 'Hub preferences', url: '', github_url: '', category: 'System', icon: '', is_live: true,
  },
  {
    id: -3, name: 'Activity', system: 'logs', iconName: 'Activity',
    description: 'Open windows and recent apps', url: '', github_url: '', category: 'System', icon: '', is_live: true,
  },
  {
    id: -4, name: 'Guide', system: 'guide', iconName: 'BookOpen',
    description: 'How to use the hub', url: '', github_url: '', category: 'System', icon: '', is_live: true,
  },
  {
    id: -5, name: 'About', system: 'about', iconName: 'Info',
    description: 'About DevHub', url: '', github_url: '', category: 'System', icon: '', is_live: true,
  },
  {
    id: -6, name: 'DevHub API', system: 'api', iconName: 'Braces',
    description: 'REST API reference', url: '', github_url: '', category: 'System', icon: '', is_live: true,
  },
];

export const getSystemApp = (key: string): AppInfo | undefined =>
  SYSTEM_APPS.find(a => a.system === key);
