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

  // 调试：确保getCurrentWindow可用
  useEffect(() => {
    console.log('TitleBar mounted');
    const window = getCurrentWindow();
    console.log('Current window:', window);
  }, []);

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const window = getCurrentWindow();
        const maximized = await window.isMaximized();
        setIsMaximized(maximized);
        console.log('Window maximized state:', maximized);
      } catch (error) {
        console.error('Failed to check maximized state:', error);
      }
    };

    checkMaximized();

    // 监听窗口状态变化
    const unlisten = getCurrentWindow().listen('tauri://resize', checkMaximized);
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleMinimize = async () => {
    try {
      console.log('Minimize button clicked');
      const window = getCurrentWindow();
      console.log('About to minimize window:', window.label);
      await window.minimize();
      console.log('Window minimized successfully');
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      console.log('Maximize button clicked');
      const window = getCurrentWindow();
      console.log('About to toggle maximize window:', window.label);
      await window.toggleMaximize();
      console.log('Window maximize toggled successfully');
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      console.log('Close button clicked');
      const window = getCurrentWindow();
      console.log('About to close window:', window.label);
      await window.close();
      console.log('Window closed successfully');
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  // 测试按钮点击
  const handleTestClick = () => {
    console.log('Test button clicked - events are working!');
    alert('按钮点击事件正常工作！');
  };

  return (
    <div data-tauri-drag-region className="flex items-center justify-between h-12 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center px-4">
        <div className="flex items-center space-x-2" data-tauri-drag-region={false}>
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="ml-4 text-sm font-medium text-foreground" data-tauri-drag-region>本地笔记</span>
      </div>

      <div className="flex items-center space-x-1 px-2" data-tauri-drag-region={false}>
        {/* 测试按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-blue-500"
          onClick={handleTestClick}
          title="测试按钮"
        >
          <span className="text-xs">T</span>
        </Button>

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