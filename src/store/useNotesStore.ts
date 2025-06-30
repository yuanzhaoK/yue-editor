import { create } from 'zustand';
import { Note, Category, Tag, CreateNoteData, UpdateNoteData, CreateCategoryData } from '../types';
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
  createCategory: (data: CreateCategoryData) => Promise<Category>;
  deleteCategory: (id: number) => Promise<void>;
  deleteCategoriesBatch: (ids: number[]) => Promise<void>;
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
      // 静默处理错误
      set({ isLoading: false });
    }
  },

  loadCategories: async () => {
    try {
      const categories = await db.getCategories();
      set({ categories });
    } catch (error) {
      // 静默处理错误
    }
  },

  createCategory: async (data) => {
    try {
      const newCategory = await db.createCategory(data);
      const { categories } = get();
      set({ categories: [...categories, newCategory] });
      return newCategory;
    } catch (error) {
      // 静默处理错误
      throw error;
    }
  },

  loadTags: async () => {
    try {
      const tags = await db.getTags();
      set({ tags });
    } catch (error) {
      // 静默处理错误
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
      // 静默处理错误
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
      // 静默处理错误
      throw error;
    }
  },

  deleteCategory: async (id) => {
    try {
      await db.deleteCategory(id);
      const { categories, selectedCategoryId } = get();
      const updatedCategories = categories.filter(category => category.id !== id);
      set({ 
        categories: updatedCategories,
        selectedCategoryId: selectedCategoryId === id ? null : selectedCategoryId
      });
      // 如果删除的是当前选中的分类，重新加载笔记
      if (selectedCategoryId === id) {
        get().loadNotes();
      }
    } catch (error) {
      // 静默处理错误
      throw error;
    }
  },

  deleteCategoriesBatch: async (ids) => {
    try {
      await db.deleteCategoriesBatch(ids);
      const { categories, selectedCategoryId } = get();
      const updatedCategories = categories.filter(category => !ids.includes(category.id));
      set({ 
        categories: updatedCategories,
        selectedCategoryId: ids.includes(selectedCategoryId!) ? null : selectedCategoryId
      });
      // 如果删除的分类中包含当前选中的分类，重新加载笔记
      if (selectedCategoryId && ids.includes(selectedCategoryId)) {
        get().loadNotes();
      }
    } catch (error) {
      // 静默处理错误
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
      // 静默处理错误
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
      // 静默处理错误
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
      // 静默处理错误
    }
  },
})); 