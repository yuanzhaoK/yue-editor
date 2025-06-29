import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';

// 备份数据库
export async function backupDatabase(): Promise<void> {
  try {
    const filePath = await save({
      filters: [{
        name: 'SQLite Database',
        extensions: ['db']
      }],
      defaultPath: `笔记备份_${new Date().toISOString().split('T')[0]}.db`
    });

    if (filePath) {
      await invoke('backup_database', { filePath });
    }
  } catch (error) {
    console.error('备份数据库失败:', error);
    throw error;
  }
}

// 恢复数据库
export async function restoreDatabase(): Promise<void> {
  try {
    const files = await open({
      filters: [{
        name: 'SQLite Database',
        extensions: ['db']
      }],
      multiple: false
    });

    if (files && typeof files === 'string') {
      // 确认恢复操作
      const confirmed = confirm(
        '恢复数据库会覆盖当前所有数据，当前数据将被自动备份。\n\n是否继续？'
      );
      
      if (confirmed) {
        await invoke('restore_database', { filePath: files });
        
        // 提示用户重启应用
        alert('数据库恢复成功！请重启应用以查看恢复的数据。');
      }
    }
  } catch (error) {
    console.error('恢复数据库失败:', error);
    throw error;
  }
}

// 导出数据为JSON（便于查看和编辑）
export async function exportDataAsJson(): Promise<void> {
  try {
    const filePath = await save({
      filters: [{
        name: 'JSON',
        extensions: ['json']
      }],
      defaultPath: `笔记数据_${new Date().toISOString().split('T')[0]}.json`
    });

    if (filePath) {
      // 这里需要从数据库获取所有数据
      // 暂时使用占位符，后续可以完善
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        notes: [], // 这里应该是实际的笔记数据
        categories: [], // 这里应该是实际的分类数据
        tags: [] // 这里应该是实际的标签数据
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('导出JSON数据失败:', error);
    throw error;
  }
} 