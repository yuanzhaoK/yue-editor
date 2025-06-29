import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';

// SQLite数据库文件的Base64编码和解码
export async function encodeDatabaseToBase64(dbPath: string): Promise<string> {
  const dbContent = await readFile(dbPath);
  return btoa(String.fromCharCode(...new Uint8Array(dbContent)));
}

export async function decodeDatabaseFromBase64(base64Content: string, outputPath: string): Promise<void> {
  const binaryContent = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
  await writeFile(outputPath, binaryContent);
}

// 将数据库内容嵌入到笔记中
export async function embedDatabaseInNote(noteContent: string, dbPath: string): Promise<string> {
  const dbBase64 = await encodeDatabaseToBase64(dbPath);
  
  // 使用特殊标记包裹数据库内容
  const dbBlock = `
<!-- SQLITE-DB-START -->
${dbBase64}
<!-- SQLITE-DB-END -->
`;
  
  return noteContent + '\n\n' + dbBlock;
}

// 从笔记中提取数据库内容
export function extractDatabaseFromNote(noteContent: string): string | null {
  const startMarker = '<!-- SQLITE-DB-START -->';
  const endMarker = '<!-- SQLITE-DB-END -->';
  
  const startIndex = noteContent.indexOf(startMarker);
  const endIndex = noteContent.indexOf(endMarker);
  
  if (startIndex === -1 || endIndex === -1) {
    return null;
  }
  
  const base64Content = noteContent
    .substring(startIndex + startMarker.length, endIndex)
    .trim();
    
  return base64Content;
}

// 检查笔记是否包含嵌入的数据库
export function hasEmbeddedDatabase(noteContent: string): boolean {
  return noteContent.includes('<!-- SQLITE-DB-START -->') &&
         noteContent.includes('<!-- SQLITE-DB-END -->');
}

// 从笔记中加载数据库
export async function loadDatabaseFromNote(noteContent: string, tempDbPath: string): Promise<Database | null> {
  const dbContent = extractDatabaseFromNote(noteContent);
  if (!dbContent) return null;
  
  try {
    await decodeDatabaseFromBase64(dbContent, tempDbPath);
    return await Database.load(`sqlite:${tempDbPath}`);
  } catch (error) {
    console.error('Failed to load database from note:', error);
    return null;
  }
}

// 创建新的空数据库
export async function createEmptyDatabase(dbPath: string): Promise<void> {
  const db = await Database.load(`sqlite:${dbPath}`);
  
  // 创建基本表结构
  await db.execute(`
    CREATE TABLE IF NOT EXISTS embedded_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS embedded_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    
    CREATE TABLE IF NOT EXISTS embedded_note_tags (
      note_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES embedded_notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES embedded_tags(id) ON DELETE CASCADE
    );
  `);
} 