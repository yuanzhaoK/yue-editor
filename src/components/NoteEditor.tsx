import { useEffect, useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { Bold, Italic, List, ListOrdered, Quote, Code, Undo, Redo, Heading1, Type, Link } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { useNotesStore } from '../store/useNotesStore';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../lib/utils';
import CustomNoteEditor, { CustomNoteEditorRef } from './CustomNoteEditor';

export function NoteEditor() {
  const {
    currentNote,
    updateNote,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    setIsEditing,
  } = useNotesStore();

  const { autoSave, autoSaveInterval } = useAppStore();
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<number>();
  const customEditorRef = useRef<CustomNoteEditorRef>(null);
  const [customToolbarState, setCustomToolbarState] = useState({
    bold: false,
    italic: false,
    link: false
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
      Typography,
    ],
    content: currentNote?.content || '',
    onUpdate: () => {
      setHasUnsavedChanges(true);
      if (autoSave) {
        debouncedSave();
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4',
      },
    },
  });

  // 保存内容
  const handleSave = useCallback(async () => {
    if (!currentNote || !hasUnsavedChanges) return;

    const title = titleRef.current?.value || currentNote.title;
    let content = currentNote.content;

    if (currentNote.editor_type === 'tiptap' && editor) {
      content = editor.getHTML();
    } else if (currentNote.editor_type === 'custom' && customEditorRef.current) {
      content = customEditorRef.current.getContent();
    }

    try {
      await updateNote({
        id: currentNote.id,
        title,
        content,
      });
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  }, [currentNote, hasUnsavedChanges, editor, updateNote]);

  // 防抖保存
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      handleSave();
    }, autoSaveInterval);
  }, [autoSaveInterval, handleSave]);

  const handleTitleChange = () => {
    setHasUnsavedChanges(true);
    if (autoSave) {
      debouncedSave();
    }
  };

  // 更新自定义编辑器的工具栏状态
  const updateCustomToolbarState = () => {
    const engine = customEditorRef.current?.getEngine();
    if (engine) {
      setCustomToolbarState({
        bold: engine.plugin.queryState('bold'),
        italic: engine.plugin.queryState('italic'),
        link: engine.plugin.queryState('link')
      });
    }
  };

  // 执行自定义编辑器命令
  const executeCustomCommand = (command: string, ...args: any[]) => {
    const engine = customEditorRef.current?.getEngine();
    if (engine) {
      try {
        engine.plugin.execute(command, ...args);
        updateCustomToolbarState();
      } catch (error) {
        console.error(`Failed to execute ${command}:`, error);
      }
    }
  };

  // 插入标题（自定义编辑器）
  const insertHeading = (level: number) => {
    const engine = customEditorRef.current?.getEngine();
    if (engine) {
      const range = engine.change.getRange();
      if (range) {
        engine.history.save(false, false);
        
        const heading = document.createElement(`h${level}`);
        if (range.collapsed) {
          heading.textContent = `标题 ${level}`;
          range.insertNode(heading);
          range.selectNodeContents(heading);
        } else {
          const contents = range.extractContents();
          heading.appendChild(contents);
          range.insertNode(heading);
        }
        
        engine.change.select(range);
        engine.history.save(true, true);
      }
    }
  };

  // 插入列表（自定义编辑器）
  const insertList = (ordered: boolean = false) => {
    const engine = customEditorRef.current?.getEngine();
    if (engine) {
      const range = engine.change.getRange();
      if (range) {
        engine.history.save(false, false);
        
        const list = document.createElement(ordered ? 'ol' : 'ul');
        const li = document.createElement('li');
        
        if (range.collapsed) {
          li.textContent = '列表项';
        } else {
          const contents = range.extractContents();
          li.appendChild(contents);
        }
        
        list.appendChild(li);
        range.insertNode(list);
        range.selectNodeContents(li);
        
        engine.change.select(range);
        engine.history.save(true, true);
      }
    }
  };

  // 自定义编辑器内容变化处理
  const handleCustomEditorChange = () => {
    setHasUnsavedChanges(true);
    if (autoSave) {
      debouncedSave();
    }
  };

  // 当选择新笔记时更新编辑器内容
  useEffect(() => {
    if (currentNote && editor) {
      if (currentNote.editor_type === 'tiptap') {
        editor.commands.setContent(currentNote.content || '');
      }
      if (titleRef.current) {
        titleRef.current.value = currentNote.title || '';
      }
      setHasUnsavedChanges(false);
    }
  }, [currentNote, editor]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]); // 添加 handleSave 作为依赖

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 监听自定义编辑器的选区变化
  useEffect(() => {
    if (currentNote?.editor_type === 'custom') {
      const interval = setInterval(() => {
        updateCustomToolbarState();
      }, 200);
      return () => clearInterval(interval);
    }
  }, [currentNote]);

  if (!currentNote) {
    return (
      <div className="flex-1 h-full bg-background flex items-center justify-center">
        <div className="text-center space-y-4 text-muted-foreground">
          <div className="text-6xl">📔</div>
          <div className="text-lg">选择一条笔记开始编辑</div>
          <div className="text-sm">或者创建一条新笔记</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-background flex flex-col">
      {/* 编辑器工具栏 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {formatDate(currentNote.updated_at)}
            </span>
            {hasUnsavedChanges && (
              <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                未保存
              </span>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
          >
            保存 (⌘S)
          </Button>
        </div>

        {/* 标题输入 */}
        <Input
          ref={titleRef}
          placeholder="笔记标题..."
          defaultValue={currentNote.title}
          onChange={handleTitleChange}
          className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0"
        />

        <Separator className="my-4" />

        {/* 根据编辑器类型显示不同的工具栏 */}
        {currentNote.editor_type === 'tiptap' && editor && (
          <div className="flex items-center space-x-1">
            <Button
              variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>

            <Button
              variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant={
                editor.isActive('bulletList') ? 'secondary' : 'ghost'
              }
              size="sm"
              onClick={() =>
                editor.chain().focus().toggleBulletList().run()
              }
            >
              <List className="h-4 w-4" />
            </Button>

            <Button
              variant={
                editor.isActive('orderedList') ? 'secondary' : 'ghost'
              }
              size="sm"
              onClick={() =>
                editor.chain().focus().toggleOrderedList().run()
              }
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Button
              variant={
                editor.isActive('blockquote') ? 'secondary' : 'ghost'
              }
              size="sm"
              onClick={() =>
                editor.chain().focus().toggleBlockquote().run()
              }
            >
              <Quote className="h-4 w-4" />
            </Button>

            <Button
              variant={editor.isActive('code') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              <Code className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 自定义编辑器工具栏 */}
        {currentNote.editor_type === 'custom' && (
          <div className="flex items-center gap-1 flex-wrap">
            {/* 文本格式 */}
            <div className="flex items-center gap-1">
              <Button
                variant={customToolbarState.bold ? "secondary" : "ghost"}
                size="sm"
                onClick={() => executeCustomCommand('bold')}
                title="加粗 (Ctrl/Cmd+B)"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant={customToolbarState.italic ? "secondary" : "ghost"}
                size="sm"
                onClick={() => executeCustomCommand('italic')}
                title="斜体 (Ctrl/Cmd+I)"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                variant={customToolbarState.link ? "secondary" : "ghost"}
                size="sm"
                onClick={() => executeCustomCommand('link')}
                title="链接 (Ctrl/Cmd+K)"
              >
                <Link className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* 标题 */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertHeading(1)}
                title="标题 1"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertHeading(2)}
                title="标题 2"
              >
                <Type className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* 列表 */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertList(false)}
                title="无序列表"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertList(true)}
                title="有序列表"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 编辑器内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {currentNote.editor_type === 'tiptap' ? (
          <EditorContent editor={editor} className="h-full" />
        ) : (
          <CustomNoteEditor 
            ref={customEditorRef}
            initialContent={currentNote.content || ''}
            onChange={handleCustomEditorChange}
          />
        )}
      </div>
    </div>
  );
} 