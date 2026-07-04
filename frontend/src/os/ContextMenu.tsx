import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Check, ChevronRight } from 'lucide-react';

export interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  separator?: boolean;
  /** render a leading check slot; toggles live in place when keepOpen */
  checked?: boolean;
  /** keep the menu open after click (for checklists like widgets / placement) */
  keepOpen?: boolean;
  /** non-interactive uppercase section heading row */
  heading?: string;
  /** non-interactive muted note row */
  note?: string;
  /** custom row content (e.g. a folder-color swatch strip); rendered as-is */
  content?: React.ReactNode;
  /** one level of nested items — rendered as a macOS-style flyout submenu.
   *  A submenu opens on hover/click and stays open while its keepOpen items are
   *  toggled, so a user can flip several (e.g. widgets) before clicking away. */
  children?: MenuItem[];
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

const MENU_W = 210;

export const ContextMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [subOpen, setSubOpen] = useState<number | null>(null);   // index of the open submenu parent
  const menuRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const openAt = useCallback((cx: number, cy: number, items: MenuItem[]) => {
    restoreFocus.current = document.activeElement as HTMLElement;
    const x = Math.min(cx, window.innerWidth - MENU_W - 8);
    // Height estimate ignores submenu flyouts (they scroll if long); the top-level
    // list is what must fit at the click point.
    const y = Math.min(cy, window.innerHeight - items.length * 38 - 8);
    setSubOpen(null);
    setMenu({ x, y, items });
  }, []);

  const open = useCallback((e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    openAt(e.clientX, e.clientY, items);
  }, [openAt]);

  const close = useCallback(() => {
    setMenu(null);
    setSubOpen(null);
    restoreFocus.current?.focus?.();
  }, []);

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (menu) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"],[role="menuitemcheckbox"]')?.focus();
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) close(); };
    const onResize = () => close();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('resize', onResize); };
  }, [menu, close]);

  // Toggle the `checked` state of a keepOpen item in place, addressed by its path
  // ([i] at the top level, [parent, child] inside a submenu) so the menu — and any
  // open submenu — stays put while the user flips several checkboxes.
  const toggleAt = (path: number[]) => {
    setMenu(m => {
      if (!m) return m;
      const items = m.items.map((it, i) => {
        if (i !== path[0]) return it;
        if (path.length === 1) return { ...it, checked: !it.checked };
        const kids = (it.children || []).map((c, j) => (j === path[1] ? { ...c, checked: !c.checked } : c));
        return { ...it, children: kids };
      });
      return { ...m, items };
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!menuRef.current) return;
    const items = [...menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"],[role="menuitemcheckbox"]')];
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
  };

  // Render a non-nesting row (button / separator / heading / note / content).
  // `onEnter` closes any open submenu when the pointer lands on a sibling — but
  // only for top-level rows, so hovering a submenu's own children never closes it.
  const renderLeaf = (item: MenuItem, key: React.Key, path: number[], onEnter?: () => void) => {
    if (item.separator) return <div key={key} className="os-ctxmenu-sep" role="separator" />;
    if (item.heading !== undefined) return <div key={key} className="os-ctxmenu-head">{item.heading}</div>;
    if (item.note !== undefined) return <div key={key} className="os-ctxmenu-note">{item.note}</div>;
    if (item.content !== undefined) return <div key={key} className="os-ctxmenu-row">{item.content}</div>;
    const checkable = item.checked !== undefined;
    return (
      <button
        key={key}
        role={checkable ? 'menuitemcheckbox' : 'menuitem'}
        aria-checked={checkable ? !!item.checked : undefined}
        tabIndex={-1}
        className={`os-ctxmenu-item ${item.danger ? 'danger' : ''}`}
        onMouseEnter={onEnter}
        onClick={() => {
          item.onClick?.();
          if (item.keepOpen) toggleAt(path);
          else close();
        }}
      >
        {checkable && <span className={`os-ck ${item.checked ? 'on' : ''}`}><Check size={13} /></span>}
        {item.icon}
        <span>{item.label}</span>
      </button>
    );
  };

  // Does the submenu flyout fit to the right of the menu? If not, flip it left.
  const subRight = menu ? menu.x + MENU_W * 2 + 12 <= window.innerWidth : true;

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
          {menu.items.map((item, i) => {
            if (item.children) {
              const openHere = subOpen === i;
              return (
                <div
                  key={i}
                  className={`os-ctxmenu-subwrap ${subRight ? 'right' : 'left'}`}
                  onMouseEnter={() => setSubOpen(i)}
                >
                  <button
                    role="menuitem"
                    aria-haspopup="menu"
                    aria-expanded={openHere}
                    tabIndex={-1}
                    className={`os-ctxmenu-item ${openHere ? 'sub-open' : ''}`}
                    onClick={() => setSubOpen(i)}
                    onKeyDown={e => {
                      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSubOpen(i); }
                      else if (e.key === 'ArrowLeft') { setSubOpen(null); }
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    <ChevronRight size={14} className="os-ctxmenu-chev" />
                  </button>
                  {openHere && (
                    <div className="os-ctxmenu os-ctxmenu-sub" role="menu" aria-label={item.label}>
                      {item.children.map((c, j) => renderLeaf(c, j, [i, j]))}
                    </div>
                  )}
                </div>
              );
            }
            return renderLeaf(item, i, [i], () => setSubOpen(null));
          })}
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
