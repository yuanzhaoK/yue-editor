import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Settings, Download, Keyboard } from 'lucide-react';
import { Button } from './ui/button';
import { useAppStore } from '../store/useAppStore';

interface TitleBarProps {
  onExportClick?: () => void;
  onShortcutsClick?: () => void;
}

export function TitleBar({ onExportClick, onShortcutsClick }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const { setShowSettings } = useAppStore();

  useEffect(() => {
    const checkMaximized = async () => {
      const window = getCurrentWindow();
      const maximized = await window.isMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    // 监听窗口状态变化
    const unlisten = getCurrentWindow().listen('tauri://resize', checkMaximized);
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleMinimize = async () => {
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    await getCurrentWindow().toggleMaximize();
  };

  const handleClose = async () => {
    await getCurrentWindow().close();
  };

  return (
    <div className="flex items-center justify-between h-12 bg-background/95 backdrop-blur-sm border-b border-border drag-region">
      <div className="flex items-center px-4">
        <div className="flex items-center space-x-2 no-drag">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="ml-4 text-sm font-medium text-foreground">本地笔记</span>
      </div>

      <div className="flex items-center space-x-1 px-2 no-drag">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={onExportClick}
          title="导出笔记"
        >
          <Download className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={onShortcutsClick}
          title="快捷键帮助"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={handleMinimize}
        >
          <Minus className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted"
          onClick={handleMaximize}
        >
          <Square className={`h-4 w-4 ${isMaximized ? 'rotate-180' : ''}`} />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}