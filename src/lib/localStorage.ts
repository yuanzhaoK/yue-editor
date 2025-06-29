import { Note, Category, Tag, CreateNoteData, UpdateNoteData, CreateCategoryData, CreateTagData } from '../types';

// 本地存储键名
const STORAGE_KEYS = {
  NOTES: 'notes',
  CATEGORIES: 'categories',
  TAGS: 'tags',
  NEXT_ID: 'nextId'
};

// 获取下一个ID
function getNextId(): number {
  const nextId = localStorage.getItem(STORAGE_KEYS.NEXT_ID);
  const id = nextId ? parseInt(nextId) : 1;
  localStorage.setItem(STORAGE_KEYS.NEXT_ID, (id + 1).toString());
  return id;
}

// 通用存储函数
function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

// 初始化数据库
export async function initDatabase(): Promise<void> {
  // 检查是否已有数据，如果没有则创建默认分类
  const categories = loadFromStorage<Category>(STORAGE_KEYS.CATEGORIES);
  if (categories.length === 0) {
    const defaultCategories: Category[] = [
      { id: 1, name: '默认', color: '#3B82F6', created_at: new Date().toISOString() },
      { id: 2, name: '工作', color: '#10B981', created_at: new Date().toISOString() },
      { id: 3, name: '个人', color: '#F59E0B', created_at: new Date().toISOString() },
      { id: 4, name: '学习', color: '#8B5CF6', created_at: new Date().toISOString() }
    ];
    saveToStorage(STORAGE_KEYS.CATEGORIES, defaultCategories);
    
    // 设置下一个ID
    localStorage.setItem(STORAGE_KEYS.NEXT_ID, '5');
  }
}

// 笔记相关操作
export async function createNote(data: CreateNoteData): Promise<Note> {
  const notes = loadFromStorage<Note>(STORAGE_KEYS.NOTES);
  const now = new Date().toISOString();
  
  const newNote: Note = {
    id: getNextId(),
    title: data.title,
    content: data.content,
    created_at: now,
    updated_at: now,
    category_id: data.category_id,
    is_pinned: data.is_pinned || false,
    is_favorited: data.is_favorited || false,
  };
  
  notes.unshift(newNote);
  saveToStorage(STORAGE_KEYS.NOTES, notes);
  return newNote;
}

export async function updateNote(data: UpdateNoteData): Promise<Note> {
  const notes = loadFromStorage<Note>(STORAGE_KEYS.NOTES);
  const index = notes.findIndex(note => note.id === data.id);
  
  if (index === -1) {
    throw new Error('Note not found');
  }
  
  const updatedNote = {
    ...notes[index],
    ...data,
    updated_at: new Date().toISOString(),
  };
  
  notes[index] = updatedNote;
  saveToStorage(STORAGE_KEYS.NOTES, notes);
  return updatedNote;
}

export async function deleteNote(id: number): Promise<void> {
  const notes = loadFromStorage<Note>(STORAGE_KEYS.NOTES);
  const filteredNotes = notes.filter(note => note.id !== id);
  saveToStorage(STORAGE_KEYS.NOTES, filteredNotes);
}

export async function getNotes(categoryId?: number): Promise<Note[]> {
  const notes = loadFromStorage<Note>(STORAGE_KEYS.NOTES);
  let filteredNotes = notes;
  
  if (categoryId) {
    filteredNotes = notes.filter(note => note.category_id === categoryId);
  }
  
  // 按置顶和更新时间排序
  return filteredNotes.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export async function searchNotes(keyword: string): Promise<Note[]> {
  const notes = loadFromStorage<Note>(STORAGE_KEYS.NOTES);
  const lowerKeyword = keyword.toLowerCase();
  
  return notes.filter(note => 
    note.title.toLowerCase().includes(lowerKeyword) || 
    note.content.toLowerCase().includes(lowerKeyword)
  ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

// 分类相关操作
export async function createCategory(data: CreateCategoryData): Promise<Category> {
  const categories = loadFromStorage<Category>(STORAGE_KEYS.CATEGORIES);
  
  const newCategory: Category = {
    id: getNextId(),
    name: data.name,
    color: data.color,
    created_at: new Date().toISOString(),
  };
  
  categories.push(newCategory);
  saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
  return newCategory;
}

export async function getCategories(): Promise<Category[]> {
  return loadFromStorage<Category>(STORAGE_KEYS.CATEGORIES);
}

export async function deleteCategory(id: number): Promise<void> {
  const categories = loadFromStorage<Category>(STORAGE_KEYS.CATEGORIES);
  const filteredCategories = categories.filter(category => category.id !== id);
  saveToStorage(STORAGE_KEYS.CATEGORIES, filteredCategories);
  
  // 同时更新相关笔记的分类ID为null
  const notes = loadFromStorage<Note>(STORAGE_KEYS.NOTES);
  const updatedNotes = notes.map(note => 
    note.category_id === id ? { ...note, category_id: undefined } : note
  );
  saveToStorage(STORAGE_KEYS.NOTES, updatedNotes);
}

// 标签相关操作（简化实现）
export async function createTag(data: CreateTagData): Promise<Tag> {
  const tags = loadFromStorage<Tag>(STORAGE_KEYS.TAGS);
  
  const newTag: Tag = {
    id: getNextId(),
    name: data.name,
    color: data.color,
  };
  
  tags.push(newTag);
  saveToStorage(STORAGE_KEYS.TAGS, tags);
  return newTag;
}

export async function getTags(): Promise<Tag[]> {
  return loadFromStorage<Tag>(STORAGE_KEYS.TAGS);
}

export async function addTagToNote(noteId: number, tagId: number): Promise<void> {
  // 简化实现，暂时不实现
  console.log('addTagToNote not implemented in localStorage version');
}

export async function removeTagFromNote(noteId: number, tagId: number): Promise<void> {
  // 简化实现，暂时不实现
  console.log('removeTagFromNote not implemented in localStorage version');
}

export async function getNoteTags(noteId: number): Promise<Tag[]> {
  // 简化实现，暂时返回空数组
  return [];
} 