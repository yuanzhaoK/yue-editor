import { X, Keyboard, Command } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: '全局快捷键',
      items: [
        { key: 'Ctrl+Shift+N', description: '显示/隐藏应用窗口' },
        { key: 'Ctrl+N', description: '新建笔记（需要应用处于活动状态）' },
        { key: 'Ctrl+Shift+F', description: '快速搜索（需要应用处于活动状态）' },
      ]
    },
    {
      category: '应用内快捷键',
      items: [
        { key: 'Ctrl+S', description: '保存当前笔记' },
        { key: 'Ctrl+F', description: '搜索笔记' },
        { key: 'Ctrl+B', description: '加粗文本' },
        { key: 'Ctrl+I', description: '斜体文本' },
        { key: 'Ctrl+U', description: '下划线文本' },
        { key: 'Ctrl+Z', description: '撤销' },
        { key: 'Ctrl+Y', description: '重做' },
        { key: 'Delete', description: '删除选中笔记' },
        { key: 'Esc', description: '取消编辑/关闭对话框' },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg w-[500px] max-h-[80vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center">
            <Keyboard className="mr-2 h-5 w-5" />
            快捷键帮助
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-6">
          {shortcuts.map((section, index) => (
            <div key={index}>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between py-2">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center space-x-1">
                      {shortcut.key.split('+').map((key, keyIndex, array) => (
                        <div key={keyIndex} className="flex items-center">
                          <kbd className="inline-flex items-center justify-center px-2 py-1 text-xs font-mono bg-muted border border-border rounded">
                            {key === 'Ctrl' ? (
                              <Command className="h-3 w-3" />
                            ) : (
                              key
                            )}
                          </kbd>
                          {keyIndex < array.length - 1 && (
                            <span className="mx-1 text-muted-foreground">+</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {index < shortcuts.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}

          <Separator />

          {/* 说明 */}
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="font-medium">使用说明：</div>
            <ul className="space-y-1 text-xs">
              <li>• 全局快捷键在任何时候都可以使用</li>
              <li>• 应用内快捷键需要应用窗口处于活动状态</li>
              <li>• 在 macOS 上，Ctrl 键对应 Command (⌘) 键</li>
              <li>• 部分快捷键可能与系统快捷键冲突</li>
            </ul>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}