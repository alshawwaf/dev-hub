import React, { createContext, useContext } from 'react';
import type { AppInfo } from './types';

interface HubContextType {
  apps: AppInfo[];
  isAdmin: boolean;
  openAddApp: () => void;
  openEditApp: (app: AppInfo) => void;
  openRenameApp: (app: AppInfo) => void;
  openDeleteApp: (app: AppInfo) => void;
  openLaunchpad: () => void;
  /** open the macOS-style folder panel; focusTitle puts the name into edit mode (rename / just-created) */
  openFolderView: (folderId: number, focusTitle?: boolean) => void;
  /** which folder icon is in inline-rename mode on the desktop (macOS "New Folder" flow); null = none */
  renamingFolderId: number | null;
  setRenamingFolder: (id: number | null) => void;
  refetch: () => void;
}

const HubContext = createContext<HubContextType | undefined>(undefined);

export const HubProvider: React.FC<HubContextType & { children: React.ReactNode }> = ({ children, ...value }) => (
  <HubContext.Provider value={value}>{children}</HubContext.Provider>
);

export const useHub = () => {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error('useHub must be used within a HubProvider');
  return ctx;
};
