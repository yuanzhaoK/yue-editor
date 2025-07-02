export type EditorType = 'tiptap' | 'custom';

export interface Note {
  id: number;
  title: string;
  content: string;
  editor_type: EditorType;
  created_at: string;
  updated_at: string;
  category_id?: number;
  is_pinned: boolean;
  is_favorited: boolean;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: string;
  note_count?: number;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface NoteTag {
  note_id: number;
  tag_id: number;
}

export interface CreateNoteData {
  title: string;
  content: string;
  editor_type?: EditorType;
  category_id?: number;
  is_pinned?: boolean;
  is_favorited?: boolean;
}

export interface UpdateNoteData {
  id: number;
  title?: string;
  content?: string;
  editor_type?: EditorType;
  category_id?: number;
  is_pinned?: boolean;
  is_favorited?: boolean;
}

export interface CreateCategoryData {
  name: string;
  color: string;
}

export interface CreateTagData {
  name: string;
  color: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  autoSave: boolean;
  autoSaveInterval: number;
} 