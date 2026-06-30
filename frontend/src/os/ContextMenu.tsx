import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  separator?: boolean;
}

interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

interface ContextMenuContextType {
  open: (e: React.MouseEvent, items: MenuItem[]) => void;
  openAt: (x: number, y: number, items: MenuItem[]) => void;
  close: () => void;
}

const Ctx = createContext<ContextMenuContextType | undefined>(undefined);

export const ContextMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const openAt = useCallback((cx: number, cy: number, items: MenuItem[]) => {
    restoreFocus.current = document.activeElement as HTMLElement;
    const W = 210;
    const x = Math.min(cx, window.innerWidth - W - 8);
    const y = Math.min(cy, window.innerHeight - items.length * 38 - 8);
    setMenu({ x, y, items });
  }, []);

  const open = useCallback((e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    openAt(e.clientX, e.clientY, items);
  }, [openAt]);

  const close = useCallback(() => {
    setMenu(null);
    restoreFocus.current?.focus?.();
  }, []);

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (menu) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(null); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('resize', () => setMenu(null));
    return () => window.removeEventListener('mousedown', onDown);
  }, [menu]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!menuRef.current) return;
    const items = [...menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
  };

  return (
    <Ctx.Provider value={{ open, openAt, close }}>
      {children}
      {menu && (
        <div
          ref={menuRef}
          className="os-ctxmenu"
          role="menu"
          aria-label="Actions"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={e => e.stopPropagation()}
          onKeyDown={onKeyDown}
        >
          {menu.items.map((item, i) =>
            item.separator ? (
              <div key={i} className="os-ctxmenu-sep" role="separator" />
            ) : (
              <button
                key={i}
                role="menuitem"
                tabIndex={-1}
                className={`os-ctxmenu-item ${item.danger ? 'danger' : ''}`}
                onClick={() => { item.onClick?.(); close(); }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ),
          )}
        </div>
      )}
    </Ctx.Provider>
  );
};

export const useContextMenu = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useContextMenu must be used within a ContextMenuProvider');
  return ctx;
};
