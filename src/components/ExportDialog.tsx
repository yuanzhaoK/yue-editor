import { useState } from 'react';
import { Download, FileText, Database, X } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useNotesStore } from '../store/useNotesStore';
import { exportNoteToMarkdown, exportAllNotesToMarkdown, exportNotesToJson } from '../lib/export';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { notes, currentNote } = useNotesStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCurrentNote = async () => {
    if (!currentNote) return;
    
    setIsExporting(true);
    try {
      await exportNoteToMarkdown(currentNote);
      onClose();
    } catch (error) {
      alert('导出失败: ' + error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAllNotes = async () => {
    setIsExporting(true);
    try {
      await exportAllNotesToMarkdown(notes);
      onClose();
    } catch (error) {
      alert('导出失败: ' + error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await exportNotesToJson(notes);
      onClose();
    } catch (error) {
      alert('导出失败: ' + error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg w-96 max-h-[80vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center">
            <Download className="mr-2 h-5 w-5" />
            导出笔记
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
        <div className="p-4 space-y-4">
          {/* 导出当前笔记 */}
          {currentNote && (
            <div>
              <h3 className="text-sm font-medium mb-3">导出当前笔记</h3>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportCurrentNote}
                disabled={isExporting}
              >
                <FileText className="mr-2 h-4 w-4" />
                导出 "{currentNote.title}" 为 Markdown
              </Button>
            </div>
          )}

          {currentNote && <Separator />}

          {/* 导出所有笔记 */}
          <div>
            <h3 className="text-sm font-medium mb-3">批量导出</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportAllNotes}
                disabled={isExporting || notes.length === 0}
              >
                <FileText className="mr-2 h-4 w-4" />
                导出所有笔记为 Markdown ({notes.length} 条笔记)
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportBackup}
                disabled={isExporting || notes.length === 0}
              >
                <Database className="mr-2 h-4 w-4" />
                导出数据备份 (JSON 格式)
              </Button>
            </div>
          </div>

          <Separator />

          {/* 说明 */}
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="font-medium">导出说明：</div>
            <ul className="space-y-1 text-xs">
              <li>• Markdown 格式可在任何文本编辑器中查看</li>
              <li>• JSON 备份包含完整数据，可用于恢复</li>
              <li>• 导出文件会保存到您选择的位置</li>
            </ul>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end p-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            {isExporting ? '导出中...' : '关闭'}
          </Button>
        </div>
      </div>
    </div>
  );
} 