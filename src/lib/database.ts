import Database from '@tauri-apps/plugin-sql';
import { Note, Category, Tag, CreateNoteData, UpdateNoteData, CreateCategoryData, CreateTagData } from '../types';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:notes.db');
    await createTables();
  }
  return db;
}

async function createTables() {
  if (!db) return;
  
  // 创建分类表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3B82F6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建标签表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6B7280'
    )
  `);

  // 创建笔记表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      category_id INTEGER,
      is_pinned BOOLEAN DEFAULT FALSE,
      is_favorited BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    )
  `);

  // 创建笔记标签关联表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id INTEGER,
      tag_id INTEGER,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
    )
  `);

  // 创建默认分类
  const defaultCategories = [
    { name: '默认', color: '#3B82F6' },
    { name: '工作', color: '#10B981' },
    { name: '个人', color: '#F59E0B' },
    { name: '学习', color: '#8B5CF6' }
  ];

  for (const category of defaultCategories) {
    await db.execute(
      'INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)',
      [category.name, category.color]
    );
  }
}

// 笔记相关操作
export async function createNote(data: CreateNoteData): Promise<Note> {
  const database = await initDatabase();
  const result = await database.execute(
    `INSERT INTO notes (title, content, category_id, is_pinned, is_favorited) 
     VALUES (?, ?, ?, ?, ?) RETURNING *`,
    [data.title, data.content, data.category_id || null, data.is_pinned || false, data.is_favorited || false]
  );
  return result.rows[0] as Note;
}

export async function updateNote(data: UpdateNoteData): Promise<Note> {
  const database = await initDatabase();
  const fields = [];
  const values = [];
  
  if (data.title !== undefined) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.content !== undefined) {
    fields.push('content = ?');
    values.push(data.content);
  }
  if (data.category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(data.category_id);
  }
  if (data.is_pinned !== undefined) {
    fields.push('is_pinned = ?');
    values.push(data.is_pinned);
  }
  if (data.is_favorited !== undefined) {
    fields.push('is_favorited = ?');
    values.push(data.is_favorited);
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(data.id);
  
  await database.execute(
    `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  const result = await database.select('SELECT * FROM notes WHERE id = ?', [data.id]);
  return result[0] as Note;
}

export async function deleteNote(id: number): Promise<void> {
  const database = await initDatabase();
  await database.execute('DELETE FROM notes WHERE id = ?', [id]);
}

export async function getNotes(categoryId?: number): Promise<Note[]> {
  const database = await initDatabase();
  let query = 'SELECT * FROM notes';
  const params: any[] = [];
  
  if (categoryId) {
    query += ' WHERE category_id = ?';
    params.push(categoryId);
  }
  
  query += ' ORDER BY is_pinned DESC, updated_at DESC';
  
  const result = await database.select(query, params);
  return result as Note[];
}

export async function searchNotes(keyword: string): Promise<Note[]> {
  const database = await initDatabase();
  const result = await database.select(
    'SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC',
    [`%${keyword}%`, `%${keyword}%`]
  );
  return result as Note[];
}

// 分类相关操作
export async function createCategory(data: CreateCategoryData): Promise<Category> {
  const database = await initDatabase();
  const result = await database.execute(
    'INSERT INTO categories (name, color) VALUES (?, ?) RETURNING *',
    [data.name, data.color]
  );
  return result.rows[0] as Category;
}

export async function getCategories(): Promise<Category[]> {
  const database = await initDatabase();
  const result = await database.select('SELECT * FROM categories ORDER BY created_at ASC');
  return result as Category[];
}

export async function deleteCategory(id: number): Promise<void> {
  const database = await initDatabase();
  await database.execute('DELETE FROM categories WHERE id = ?', [id]);
}

// 标签相关操作
export async function createTag(data: CreateTagData): Promise<Tag> {
  const database = await initDatabase();
  const result = await database.execute(
    'INSERT INTO tags (name, color) VALUES (?, ?) RETURNING *',
    [data.name, data.color]
  );
  return result.rows[0] as Tag;
}

export async function getTags(): Promise<Tag[]> {
  const database = await initDatabase();
  const result = await database.select('SELECT * FROM tags ORDER BY name ASC');
  return result as Tag[];
}

export async function addTagToNote(noteId: number, tagId: number): Promise<void> {
  const database = await initDatabase();
  await database.execute(
    'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
    [noteId, tagId]
  );
}

export async function removeTagFromNote(noteId: number, tagId: number): Promise<void> {
  const database = await initDatabase();
  await database.execute(
    'DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?',
    [noteId, tagId]
  );
}

export async function getNoteTags(noteId: number): Promise<Tag[]> {
  const database = await initDatabase();
  const result = await database.select(`
    SELECT t.* FROM tags t
    JOIN note_tags nt ON t.id = nt.tag_id
    WHERE nt.note_id = ?
  `, [noteId]);
  return result as Tag[];
} 