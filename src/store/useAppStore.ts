import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings } from '../types';

interface AppState extends AppSettings {
  // UI状态
  sidebarCollapsed: boolean;
  showSettings: boolean;
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAutoSave: (autoSave: boolean) => void;
  setAutoSaveInterval: (interval: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setShowSettings: (show: boolean) => void;
  applyTheme: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 默认设置
      theme: 'system',
      autoSave: true,
      autoSaveInterval: 3000, // 3秒
      sidebarCollapsed: false,
      showSettings: false,

      // Actions
      setTheme: (theme) => {
        set({ theme });
        get().applyTheme();
      },

      setAutoSave: (autoSave) => {
        set({ autoSave });
      },

      setAutoSaveInterval: (interval) => {
        set({ autoSaveInterval: interval });
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      setShowSettings: (show) => {
        set({ showSettings: show });
      },

      applyTheme: () => {
        const { theme } = get();
        const root = document.documentElement;
        
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          root.classList.toggle('dark', systemTheme === 'dark');
        } else {
          root.classList.toggle('dark', theme === 'dark');
        }
      },
    }),
    {
      name: 'app-settings',
      partialize: (state) => ({
        theme: state.theme,
        autoSave: state.autoSave,
        autoSaveInterval: state.autoSaveInterval,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
); 