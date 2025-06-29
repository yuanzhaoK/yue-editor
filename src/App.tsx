import { useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import { SettingsDialog } from './components/SettingsDialog';
import { useAppStore } from './store/useAppStore';
import { useNotesStore } from './store/useNotesStore';
import { initDatabase } from './lib/database';

function App() {
  const { applyTheme } = useAppStore();
  const { loadCategories, loadNotes } = useNotesStore();

  useEffect(() => {
    // 初始化主题
    applyTheme();

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => applyTheme();
    mediaQuery.addEventListener('change', handleThemeChange);

    // 初始化数据库和数据
    const initApp = async () => {
      try {
        await initDatabase();
        await loadCategories();
        await loadNotes();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initApp();

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, [applyTheme, loadCategories, loadNotes]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* 自定义标题栏 */}
      <TitleBar />
      
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
    </div>
  );
}

export default App;
