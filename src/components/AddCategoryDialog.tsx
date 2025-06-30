import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useNotesStore } from '../store/useNotesStore';
import { useAlertDialog } from './ui/alert-dialog';

interface AddCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', // 蓝色
  '#10B981', // 绿色
  '#F59E0B', // 黄色
  '#8B5CF6', // 紫色
  '#EF4444', // 红色
  '#06B6D4', // 青色
  '#84CC16', // 绿灰色
  '#F97316', // 橙色
  '#EC4899', // 粉色
  '#6B7280', // 灰色
  '#14B8A6', // 青绿色
  '#A855F7', // 紫罗兰色
];

export function AddCategoryDialog({ isOpen, onClose }: AddCategoryDialogProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const { createCategory } = useNotesStore();
  const { showAlert } = useAlertDialog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showAlert({
        title: '输入错误',
        message: '请输入分类名称',
        confirmText: '确定',
        onConfirm: () => {},
      });
      return;
    }

    setIsLoading(true);
    try {
      await createCategory({
        name: name.trim(),
        color: selectedColor,
      });
      
      // 重置表单并关闭对话框
      setName('');
      setSelectedColor(PRESET_COLORS[0]);
      onClose();
    } catch (error) {
      showAlert({
        title: '创建失败',
        message: '创建分类失败，请重试',
        confirmText: '确定',
        onConfirm: () => {},
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setSelectedColor(PRESET_COLORS[0]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={handleClose}
      />
      <div className="relative bg-background rounded-lg shadow-lg border max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">添加分类</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 分类名称输入 */}
          <div>
            <label className="text-sm font-medium block mb-2">
              分类名称
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入分类名称"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* 颜色选择器 */}
          <div>
            <label className="text-sm font-medium block mb-2">
              分类颜色
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    selectedColor === color
                      ? 'border-foreground shadow-lg'
                      : 'border-border hover:border-foreground/50'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  disabled={isLoading}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <div
                className="w-4 h-4 rounded-full border"
                style={{ backgroundColor: selectedColor }}
              />
              <span>已选择: {selectedColor}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? '创建中...' : '创建分类'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 