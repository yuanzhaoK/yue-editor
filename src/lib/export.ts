import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { Note } from '../types';

// 导出单个笔记为 Markdown
export async function exportNoteToMarkdown(note: Note): Promise<void> {
  try {
    const filePath = await save({
      filters: [{
        name: 'Markdown',
        extensions: ['md']
      }],
      defaultPath: `${note.title}.md`
    });

    if (filePath) {
      await invoke('export_note_to_markdown', {
        title: note.title,
        content: note.content,
        filePath
      });
    }
  } catch (error) {
    console.error('导出笔记失败:', error);
    throw error;
  }
}

// 导出所有笔记为单个 Markdown 文件
export async function exportAllNotesToMarkdown(notes: Note[]): Promise<void> {
  try {
    const filePath = await save({
      filters: [{
        name: 'Markdown',
        extensions: ['md']
      }],
      defaultPath: `所有笔记_${new Date().toISOString().split('T')[0]}.md`
    });

    if (filePath) {
      await invoke('export_all_notes_to_markdown', {
        notesJson: JSON.stringify(notes),
        filePath
      });
    }
  } catch (error) {
    console.error('导出所有笔记失败:', error);
    throw error;
  }
}

// 导出笔记数据为 JSON（用于备份）
export async function exportNotesToJson(notes: Note[]): Promise<void> {
  try {
    const filePath = await save({
      filters: [{
        name: 'JSON',
        extensions: ['json']
      }],
      defaultPath: `笔记备份_${new Date().toISOString().split('T')[0]}.json`
    });

    if (filePath) {
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        notes: notes
      };

      // 使用浏览器的文件API写入（因为是JSON数据）
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('导出JSON失败:', error);
    throw error;
  }
} 