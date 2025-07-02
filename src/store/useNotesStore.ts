import { create } from 'zustand';
import { Note, Category, Tag, CreateNoteData, UpdateNoteData, CreateCategoryData, CreateTagData } from '../types';
import * as db from '../lib/database';

// Mirroring the interface from database.ts to avoid circular dependencies
interface GetNotesFilters {
  categoryId?: number;
  tagId?: number;
  isFavorite?: boolean;
  isPinned?: boolean;
}

interface NotesState {
  // 数据状态
  notes: Note[];
  categories: Category[];
  tags: Tag[];
  currentNote: Note | null;
  
  // UI状态
  selectedCategoryId: number | null;
  selectedTagId: number | null;
  searchKeyword: string;
  isLoading: boolean;
  isFavoriteFilterActive: boolean;
  isPinnedFilterActive: boolean;
  
  // 编辑器状态
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  
  // Actions
  loadNotes: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadTags: () => Promise<void>;
  createNote: (data: CreateNoteData) => Promise<Note>;
  updateNote: (data: UpdateNoteData) => Promise<Note>;
  deleteNote: (id: number) => Promise<void>;
  createCategory: (data: CreateCategoryData) => Promise<Category>;
  deleteCategory: (id: number) => Promise<void>;
  deleteCategoriesBatch: (ids: number[]) => Promise<void>;
  createTag: (data: CreateTagData) => Promise<Tag>;
  deleteTag: (id: number) => Promise<void>;
  searchNotes: (keyword: string) => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
  setSelectedCategory: (categoryId: number | null) => void;
  setSelectedTag: (tagId: number | null) => void;
  setSearchKeyword: (keyword: string) => void;
  setIsEditing: (editing: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  toggleNotePinned: (id: number) => Promise<void>;
  toggleNoteFavorited: (id: number) => Promise<void>;
  toggleFavoriteFilter: () => void;
  togglePinnedFilter: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  // 初始状态
  notes: [],
  categories: [],
  tags: [],
  currentNote: null,
  selectedCategoryId: null,
  selectedTagId: null,
  searchKeyword: '',
  isLoading: false,
  isFavoriteFilterActive: false,
  isPinnedFilterActive: false,
  isEditing: false,
  hasUnsavedChanges: false,

  // Actions
  loadNotes: async () => {
    try {
      set({ isLoading: true });
      const { selectedCategoryId, selectedTagId, isFavoriteFilterActive, isPinnedFilterActive } = get();
      const notes = await db.getNotes({
        categoryId: selectedCategoryId ?? undefined,
        tagId: selectedTagId ?? undefined,
        isFavorite: isFavoriteFilterActive,
        isPinned: isPinnedFilterActive,
      });
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

  createTag: async (data) => {
    try {
      const newTag = await db.createTag(data);
      const { tags } = get();
      set({ tags: [...tags, newTag] });
      return newTag;
    } catch (error) {
      // 静默处理错误
      throw error;
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

  deleteTag: async (id) => {
    try {
      await db.deleteTag(id);
      const { tags, selectedTagId } = get();
      const updatedTags = tags.filter(tag => tag.id !== id);
      set({ tags: updatedTags });
      
      // 如果删除的是当前选中的标签，取消选中并重新加载笔记
      if (selectedTagId === id) {
        set({ selectedTagId: null });
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
        get().loadNotes();
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
    set({ 
      selectedCategoryId: categoryId,
      selectedTagId: null,
      isFavoriteFilterActive: false,
      isPinnedFilterActive: false,
    });
    get().loadNotes();
  },

  setSelectedTag: (tagId) => {
    set({ 
      selectedTagId: tagId,
      selectedCategoryId: null,
      isFavoriteFilterActive: false,
      isPinnedFilterActive: false,
    });
    get().loadNotes();
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
      const note = get().notes.find(n => n.id === id);
      if (note) {
        const updatedNote = await db.updateNote({ id, is_pinned: !note.is_pinned });
        set((state) => ({
          currentNote: state.currentNote?.id === id ? updatedNote : state.currentNote,
        }));
        await get().loadNotes();
      }
    } catch (error) {
      // 静默处理错误
    }
  },

  toggleNoteFavorited: async (id) => {
    try {
      const note = get().notes.find(n => n.id === id);
      if (note) {
        const updatedNote = await db.updateNote({ id, is_favorited: !note.is_favorited });
        set((state) => ({
          currentNote: state.currentNote?.id === id ? updatedNote : state.currentNote,
        }));
        await get().loadNotes();
      }
    } catch (error) {
      // 静默处理错误
    }
  },

  toggleFavoriteFilter: () => {
    set((state) => ({ 
      isFavoriteFilterActive: !state.isFavoriteFilterActive,
      isPinnedFilterActive: false,
      selectedCategoryId: null,
      selectedTagId: null,
      searchKeyword: ''
    }));
    get().loadNotes();
  },

  togglePinnedFilter: () => {
    set((state) => ({ 
      isPinnedFilterActive: !state.isPinnedFilterActive,
      isFavoriteFilterActive: false,
      selectedCategoryId: null,
      selectedTagId: null,
      searchKeyword: ''
    }));
    get().loadNotes();
  },
}));

interface GetNotesFilters {
  categoryId?: number;
  tagId?: number;
  isFavorite?: boolean;
  isPinned?: boolean;
} 