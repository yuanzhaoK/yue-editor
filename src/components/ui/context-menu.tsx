import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface ContextMenuProps {
  children: React.ReactNode;
  items: ContextMenuItem[];
  disabled?: boolean;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
}

const ContextMenuContext = createContext<{
  state: ContextMenuState;
  setState: React.Dispatch<React.SetStateAction<ContextMenuState>>;
} | null>(null);

export function ContextMenu({ children, items, disabled }: ContextMenuProps) {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    if (disabled) return;
    
    event.preventDefault();
    setState({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleClose = () => {
    setState(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (state.isOpen) {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [state.isOpen]);

  return (
    <ContextMenuContext.Provider value={{ state, setState }}>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>
      
      {state.isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={{
            left: state.x,
            top: state.y,
          }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                item.disabled
                  ? "pointer-events-none opacity-50"
                  : item.destructive
                  ? "text-red-600 focus:bg-red-100 focus:text-red-600 hover:bg-red-100"
                  : "focus:bg-accent focus:text-accent-foreground hover:bg-accent",
                !item.disabled && "cursor-pointer"
              )}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  handleClose();
                }
              }}
            >
              {item.icon && (
                <span className="mr-2 h-4 w-4">
                  {item.icon}
                </span>
              )}
              {item.label}
            </div>
          ))}
        </div>
      )}
    </ContextMenuContext.Provider>
  );
}

export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenu');
  }
  return context;
} 