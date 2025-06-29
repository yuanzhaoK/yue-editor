import { create } from 'zustand';
import { Note, Category, Tag, CreateNoteData, UpdateNoteData } from '../types';
import * as db from '../lib/database';

interface NotesState {
  // 数据状态
  notes: Note[];
  categories: Category[];
  tags: Tag[];
  currentNote: Note | null;
  
  // UI状态
  selectedCategoryId: number | null;
  searchKeyword: string;
  isLoading: boolean;
  
  // 编辑器状态
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  
  // Actions
  loadNotes: (categoryId?: number) => Promise<void>;
  loadCategories: () => Promise<void>;
  loadTags: () => Promise<void>;
  createNote: (data: CreateNoteData) => Promise<Note>;
  updateNote: (data: UpdateNoteData) => Promise<Note>;
  deleteNote: (id: number) => Promise<void>;
  searchNotes: (keyword: string) => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
  setSelectedCategory: (categoryId: number | null) => void;
  setSearchKeyword: (keyword: string) => void;
  setIsEditing: (editing: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  toggleNotePinned: (id: number) => Promise<void>;
  toggleNoteFavorited: (id: number) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  // 初始状态
  notes: [],
  categories: [],
  tags: [],
  currentNote: null,
  selectedCategoryId: null,
  searchKeyword: '',
  isLoading: false,
  isEditing: false,
  hasUnsavedChanges: false,

  // Actions
  loadNotes: async (categoryId) => {
    try {
      set({ isLoading: true });
      const notes = await db.getNotes(categoryId);
      set({ notes, isLoading: false });
    } catch (error) {
      console.error('Failed to load notes:', error);
      set({ isLoading: false });
    }
  },

  loadCategories: async () => {
    try {
      const categories = await db.getCategories();
      set({ categories });
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  },

  loadTags: async () => {
    try {
      const tags = await db.getTags();
      set({ tags });
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  },

  createNote: async (data) => {
    try {
      set({ isLoading: true });
      const newNote = await db.createNote(data);
      const { notes } = get();
      set({ 
        notes: [newNote, ...notes],
        currentNote: newNote,
        isLoading: false,
        isEditing: true 
      });
      return newNote;
    } catch (error) {
      console.error('Failed to create note:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateNote: async (data) => {
    try {
      const updatedNote = await db.updateNote(data);
      const { notes } = get();
      const updatedNotes = notes.map(note => 
        note.id === data.id ? updatedNote : note
      );
      set({ 
        notes: updatedNotes,
        currentNote: updatedNote,
        hasUnsavedChanges: false
      });
      return updatedNote;
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  },

  deleteNote: async (id) => {
    try {
      await db.deleteNote(id);
      const { notes, currentNote } = get();
      const updatedNotes = notes.filter(note => note.id !== id);
      set({ 
        notes: updatedNotes,
        currentNote: currentNote?.id === id ? null : currentNote
      });
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  },

  searchNotes: async (keyword) => {
    try {
      set({ isLoading: true, searchKeyword: keyword });
      if (keyword.trim()) {
        const notes = await db.searchNotes(keyword);
        set({ notes, isLoading: false });
      } else {
        // 如果搜索关键词为空，重新加载所有笔记
        const { selectedCategoryId } = get();
        const notes = await db.getNotes(selectedCategoryId || undefined);
        set({ notes, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to search notes:', error);
      set({ isLoading: false });
    }
  },

  setCurrentNote: (note) => {
    set({ currentNote: note, isEditing: false, hasUnsavedChanges: false });
  },

  setSelectedCategory: (categoryId) => {
    set({ selectedCategoryId: categoryId });
    // 重新加载笔记
    get().loadNotes(categoryId || undefined);
  },

  setSearchKeyword: (keyword) => {
    set({ searchKeyword: keyword });
  },

  setIsEditing: (editing) => {
    set({ isEditing: editing });
  },

  setHasUnsavedChanges: (hasChanges) => {
    set({ hasUnsavedChanges: hasChanges });
  },

  toggleNotePinned: async (id) => {
    try {
      const { notes } = get();
      const note = notes.find(n => n.id === id);
      if (note) {
        await get().updateNote({ id, is_pinned: !note.is_pinned });
      }
    } catch (error) {
      console.error('Failed to toggle note pinned:', error);
    }
  },

  toggleNoteFavorited: async (id) => {
    try {
      const { notes } = get();
      const note = notes.find(n => n.id === id);
      if (note) {
        await get().updateNote({ id, is_favorited: !note.is_favorited });
      }
    } catch (error) {
      console.error('Failed to toggle note favorited:', error);
    }
  },
})); 