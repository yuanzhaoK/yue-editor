import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Database } from '@tauri-apps/plugin-sql';
import { hasEmbeddedDatabase, loadDatabaseFromNote, createEmptyDatabase, embedDatabaseInNote } from '../lib/sqliteNote';

interface EmbeddedDatabaseNoteProps {
  content: string;
  onContentChange: (newContent: string) => void;
}

export function EmbeddedDatabaseNote({ content, onContentChange }: EmbeddedDatabaseNoteProps) {
  const [hasDatabase, setHasDatabase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setHasDatabase(hasEmbeddedDatabase(content));
  }, [content]);

  const handleCreateDatabase = async () => {
    try {
      setIsLoading(true);
      
      // 创建临时数据库文件
      const tempDbPath = `temp_${Date.now()}.db`;
      await createEmptyDatabase(tempDbPath);
      
      // 将数据库嵌入到笔记中
      const newContent = await embedDatabaseInNote(content, tempDbPath);
      onContentChange(newContent);
      
      setHasDatabase(true);
    } catch (error) {
      console.error('Failed to create embedded database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDatabase = async () => {
    try {
      setIsLoading(true);
      
      // 从笔记中加载数据库
      const tempDbPath = `temp_${Date.now()}.db`;
      const db = await loadDatabaseFromNote(content, tempDbPath);
      
      if (db) {
        // 查询示例数据
        const tables = await db.select<{ name: string }[]>(
          "SELECT name FROM sqlite_master WHERE type='table'"
        );
        
        console.log('Tables in database:', tables);
      }
    } catch (error) {
      console.error('Failed to view embedded database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 mt-4">
      {!hasDatabase ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateDatabase}
          disabled={isLoading}
        >
          创建嵌入式数据库
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewDatabase}
          disabled={isLoading}
        >
          查看数据库内容
        </Button>
      )}
    </div>
  );
} 