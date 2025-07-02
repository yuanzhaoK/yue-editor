import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useNotesStore } from '../store/useNotesStore';
import { useAlertDialog } from './ui/alert-dialog';

interface AddTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', 
  '#EF4444', '#EC4899', '#6366F1', '#22C55E',
  '#F97316', '#06B6D4', '#D946EF', '#6B7280'
];

export function AddTagDialog({ isOpen, onClose }: AddTagDialogProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[5]);
  const [isLoading, setIsLoading] = useState(false);
  const { createTag } = useNotesStore();
  const { showAlert } = useAlertDialog();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      showAlert({
        title: '输入错误',
        message: '请输入标签名称',
        confirmText: '确定',
        onConfirm: () => {},
      });
      return;
    }

    setIsLoading(true);
    try {
      await createTag({
        name: name.trim(),
        color: selectedColor,
      });
      
      handleClose();
    } catch (error) {
      showAlert({
        title: '创建失败',
        message: '创建标签失败，可能名称已存在',
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
      setSelectedColor(PRESET_COLORS[5]);
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={handleClose}
      />
      <div className="relative bg-background rounded-lg shadow-lg border max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">添加新标签</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">
              标签名称
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入标签名称"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">
              标签颜色
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
          </div>

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
              {isLoading ? '创建中...' : '创建标签'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 