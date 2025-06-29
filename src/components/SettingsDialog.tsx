import { useState } from 'react';
import { X, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useAppStore } from '../store/useAppStore';

export function SettingsDialog() {
  const {
    theme,
    autoSave,
    autoSaveInterval,
    showSettings,
    setTheme,
    setAutoSave,
    setAutoSaveInterval,
    setShowSettings,
  } = useAppStore();

  const [tempAutoSaveInterval, setTempAutoSaveInterval] = useState(autoSaveInterval);

  const handleClose = () => {
    setShowSettings(false);
  };

  const handleSaveSettings = () => {
    setAutoSaveInterval(tempAutoSaveInterval);
    handleClose();
  };

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg w-96 max-h-[80vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">设置</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-6">
          {/* 主题设置 */}
          <div>
            <h3 className="text-sm font-medium mb-3">主题</h3>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === 'light' ? 'secondary' : 'outline'}
                className="flex flex-col items-center space-y-2 h-auto py-3"
                onClick={() => setTheme('light')}
              >
                <Sun className="h-4 w-4" />
                <span className="text-xs">浅色</span>
              </Button>
              
              <Button
                variant={theme === 'dark' ? 'secondary' : 'outline'}
                className="flex flex-col items-center space-y-2 h-auto py-3"
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-4 w-4" />
                <span className="text-xs">深色</span>
              </Button>
              
              <Button
                variant={theme === 'system' ? 'secondary' : 'outline'}
                className="flex flex-col items-center space-y-2 h-auto py-3"
                onClick={() => setTheme('system')}
              >
                <Monitor className="h-4 w-4" />
                <span className="text-xs">系统</span>
              </Button>
            </div>
          </div>

          <Separator />

          {/* 自动保存设置 */}
          <div>
            <h3 className="text-sm font-medium mb-3">自动保存</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">启用自动保存</span>
                <Button
                  variant={autoSave ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setAutoSave(!autoSave)}
                >
                  {autoSave ? '已开启' : '已关闭'}
                </Button>
              </div>
              
              {autoSave && (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    保存间隔 (毫秒)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1000"
                      max="10000"
                      step="500"
                      value={tempAutoSaveInterval}
                      onChange={(e) => setTempAutoSaveInterval(Number(e.target.value))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <span className="text-sm text-muted-foreground">ms</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* 关于 */}
          <div>
            <h3 className="text-sm font-medium mb-3">关于</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>本地笔记 v0.1.0</div>
              <div>基于 Tauri 2.0 构建</div>
              <div>使用 React + TypeScript</div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-2 p-4 border-t border-border">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleSaveSettings}>
            保存设置
          </Button>
        </div>
      </div>
    </div>
  );
} 