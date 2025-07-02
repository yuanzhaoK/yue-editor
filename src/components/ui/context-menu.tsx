import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  items: MenuItem[];
}

interface ContextMenuContextType {
  showMenu: (x: number, y: number, items: MenuItem[]) => void;
  hideMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    items: [],
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const showMenu = useCallback((x: number, y: number, items: MenuItem[]) => {
    setMenu({ isOpen: true, position: { x, y }, items });
  }, []);

  const hideMenu = useCallback(() => {
    setMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menu.isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        hideMenu();
      }
    };
    
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hideMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menu.isOpen, hideMenu]);

  return (
    <ContextMenuContext.Provider value={{ showMenu, hideMenu }}>
      {children}
      {menu.isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 w-48 bg-background border border-border rounded-md shadow-lg p-1"
          style={{ top: menu.position.y, left: menu.position.x }}
          onClick={hideMenu} // Hide menu after a click inside it
        >
          {menu.items.map((item, index) => (
            <div
              key={index}
              onClick={item.onClick}
              className={cn(
                "flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent",
                item.destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground"
              )}
            >
              {item.icon && <div className="mr-2 h-4 w-4">{item.icon}</div>}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </ContextMenuContext.Provider>
  );
}

export const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider');
  }
  return context;
};

interface ContextMenuProps {
  items: MenuItem[];
  children: React.ReactNode;
}

export function ContextMenu({ items, children }: ContextMenuProps) {
  const { showMenu } = useContextMenu();

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showMenu(e.clientX, e.clientY, items);
  };

  return (
    <div onContextMenu={handleContextMenu}>
      {children}
    </div>
  );
} 