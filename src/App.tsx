import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import { SettingsDialog } from './components/SettingsDialog';
import { ExportDialog } from './components/ExportDialog';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { AlertDialogProvider } from './components/ui/alert-dialog';
import { useAppStore } from './store/useAppStore';
import { useNotesStore } from './store/useNotesStore';
import { initDatabase } from './lib/database';
import { ContextMenuProvider } from './components/ui/context-menu';

function App() {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const { applyTheme, theme } = useAppStore();
  const { loadCategories, loadNotes, createNote } = useNotesStore();

  useEffect(() => {
    // 初始化主题
    applyTheme();

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => applyTheme();
    mediaQuery.addEventListener('change', handleThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, [theme]);

  useEffect(() => {
    // 初始化数据库和数据
    const initApp = async () => {
      try {
        await initDatabase();
        await loadCategories();
        await loadNotes();
      } catch (error) {
        // 静默处理错误，避免控制台输出
      }
    };

    initApp();
  }, []); // 只在组件挂载时执行一次

  useEffect(() => {
    // 监听全局快捷键事件
    const setupGlobalShortcuts = async () => {
      try {
        // 新建笔记快捷键
        const unlistenNewNote = await listen('new-note-shortcut', async () => {
          try {
            await createNote({
              title: '新笔记',
              content: ''
            });
          } catch (error) {
            // 静默处理错误
          }
        });

        // 搜索快捷键
        const unlistenSearch = await listen('search-shortcut', () => {
          // 聚焦到搜索框
          const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
        });

        return () => {
          unlistenNewNote();
          unlistenSearch();
        };
      } catch (error) {
        // 静默处理错误
        return () => {};
      }
    };

    let cleanupShortcuts: (() => void) | undefined;
    setupGlobalShortcuts().then(cleanup => {
      cleanupShortcuts = cleanup;
    });

    return () => {
      if (cleanupShortcuts) {
        cleanupShortcuts();
      }
    };
  }, []); // 只在组件挂载时设置一次

  return (
    <AlertDialogProvider>
      <ContextMenuProvider>
        <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
          {/* 自定义标题栏 */}
          <TitleBar 
            onExportClick={() => setIsExportOpen(true)} 
            onShortcutsClick={() => setIsShortcutsOpen(true)}
          />
          
          {/* 主要内容区域 */}
          <div className="flex-1 flex overflow-hidden">
            {/* 侧边栏 */}
            <Sidebar />
            
            {/* 笔记列表 */}
            <NoteList />
            
            {/* 编辑器 */}
            <NoteEditor />
          </div>

          {/* 设置对话框 */}
          <SettingsDialog />
          
          {/* 导出对话框 */}
          <ExportDialog 
            isOpen={isExportOpen} 
            onClose={() => setIsExportOpen(false)} 
          />
          
          {/* 快捷键帮助对话框 */}
          <ShortcutsDialog 
            isOpen={isShortcutsOpen} 
            onClose={() => setIsShortcutsOpen(false)} 
          />
        </div>
      </ContextMenuProvider>
    </AlertDialogProvider>
  );
}

export default App;
