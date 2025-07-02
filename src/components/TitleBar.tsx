import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';
import { Minus, Square, X, Settings, Download, Keyboard, DatabaseZap } from 'lucide-react';
import { Button } from './ui/button';
import { useAppStore } from '../store/useAppStore';
import { useAlertDialog } from './ui/alert-dialog';

interface TitleBarProps {
  onExportClick?: () => void;
  onShortcutsClick?: () => void;
}

// 检查是否在Tauri环境中
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__;

export function TitleBar({ onExportClick, onShortcutsClick }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<string>('');
  const { setShowSettings } = useAppStore();
  const { showAlert } = useAlertDialog();

  useEffect(() => {
    if (!isTauri) return; // 如果不在Tauri环境中，跳过
    
    // 获取平台信息
    const getPlatform = async () => {
      try {
        const platformName = platform();
        setCurrentPlatform(platformName);
      } catch (error) {
        // 静默处理错误，默认使用Windows样式
        setCurrentPlatform('windows');
      }
    };
    
    getPlatform();
    
    const checkMaximized = async () => {
      try {
        const window = getCurrentWindow();
        const maximized = await window.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        // 静默处理错误
      }
    };

    checkMaximized();

    // 监听窗口状态变化
    const setupListeners = async () => {
      try {
        const window = getCurrentWindow();
        const unlistenResize = await window.onResized(() => {
          checkMaximized();
        });
        
        return unlistenResize;
      } catch (error) {
        // 静默处理错误
        return () => {};
      }
    };

    let cleanup: (() => void) | undefined;
    setupListeners().then(fn => {
      cleanup = fn;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const handleMinimize = async () => {
    if (!isTauri) return;
    try {
      const window = getCurrentWindow();
      await window.minimize();
    } catch (error) {
      // 静默处理错误
    }
  };

  const handleMaximize = async () => {
    if (!isTauri) return;
    try {
      const window = getCurrentWindow();
      await window.toggleMaximize();
      setIsMaximized(!isMaximized);
    } catch (error) {
      // 静默处理错误
    }
  };

  const handleClose = async () => {
    if (!isTauri) return;
    try {
      const window = getCurrentWindow();
      await window.close();
    } catch (error) {
      // 静默处理错误
    }
  };

  const handleDeleteDatabase = () => {
    showAlert({
      title: '删除数据库',
      message: '确定要删除数据库文件吗？此操作不可逆，并将重启应用。',
      confirmText: '删除并重启',
      destructive: true,
      onConfirm: async () => {
        try {
          await invoke('delete_database');
        } catch (error) {
          console.error('Failed to delete database:', error);
          showAlert({
            title: '删除失败',
            message: `无法删除数据库文件: ${error}`,
            confirmText: '好的',
            onConfirm: () => {},
          });
        }
      },
    });
  };

  // macOS样式的窗口控制按钮（左上角）
  const MacOSControls = () => (
    <div className="flex items-center gap-2 pl-4">
      <button
        onClick={handleClose}
        className="w-3 h-3 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center"
        title="关闭"
      >
        <X className="w-2 h-2 text-white opacity-0 hover:opacity-100" />
      </button>
      <button
        onClick={handleMinimize}
        className="w-3 h-3 bg-yellow-500 hover:bg-yellow-600 rounded-full flex items-center justify-center"
        title="最小化"
      >
        <Minus className="w-2 h-2 text-white opacity-0 hover:opacity-100" />
      </button>
      <button
        onClick={handleMaximize}
        className="w-3 h-3 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center"
        title={isMaximized ? "还原" : "最大化"}
      >
        <Square className="w-2 h-2 text-white opacity-0 hover:opacity-100" />
      </button>
    </div>
  );

  // Windows样式的窗口控制按钮（右上角）
  const WindowsControls = () => (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMinimize}
        className="hover:bg-gray-200 dark:hover:bg-gray-700 h-8 w-8 p-0"
        title="最小化"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleMaximize}
        className="hover:bg-gray-200 dark:hover:bg-gray-700 h-8 w-8 p-0"
        title={isMaximized ? "还原" : "最大化"}
      >
        <Square className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClose}
        className="hover:bg-red-500 hover:text-white h-8 w-8 p-0"
        title="关闭"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  const isMacOS = currentPlatform === 'macos';

  return (
    <div 
      className="flex justify-between items-center h-12 bg-background border-b select-none"
      data-tauri-drag-region
    >
      {/* 左侧区域 */}
      <div className="flex items-center">
        {isMacOS && <MacOSControls />}
        {!isMacOS && (
          <div className="pl-4">
            <span className="text-sm font-medium">本地笔记</span>
          </div>
        )}
      </div>

      {/* 中间区域 - macOS显示标题 */}
      {isMacOS && (
        <div className="flex-1 text-center">
          <span className="text-sm font-medium">本地笔记</span>
        </div>
      )}

      {/* 右侧区域 */}
      <div className="flex items-center gap-2 pr-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onShortcutsClick}
          className="hover:bg-gray-200 dark:hover:bg-gray-700 h-8 w-8 p-0"
          title="快捷键"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onExportClick}
          className="hover:bg-gray-200 dark:hover:bg-gray-700 h-8 w-8 p-0"
          title="导出"
        >
          <Download className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(true)}
          className="hover:bg-gray-200 dark:hover:bg-gray-700 h-8 w-8 p-0"
          title="设置"
        >
          <Settings className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteDatabase}
          className="hover:bg-destructive hover:text-destructive-foreground h-8 w-8 p-0"
          title="删除数据库并重启"
        >
          <DatabaseZap className="h-4 w-4" />
        </Button>

        {!isMacOS && <WindowsControls />}
      </div>
    </div>
  );
}