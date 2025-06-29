import { useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { Bold, Italic, List, ListOrdered, Quote, Code, Undo, Redo } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { useNotesStore } from '../store/useNotesStore';
import { useAppStore } from '../store/useAppStore';
import { formatDate } from '../lib/utils';
import { EmbeddedDatabaseNote } from './EmbeddedDatabaseNote';

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
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '开始写作...',
      }),
      Typography,
    ],
    content: currentNote?.content || '',
    onUpdate: ({ editor }) => {
      setHasUnsavedChanges(true);
      if (autoSave) {
        debouncedSave();
      }
      if (currentNote) {
        updateNote({
          id: currentNote.id,
          content: editor.getHTML()
        });
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4',
      },
    },
  });

  // 防抖保存
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, autoSaveInterval);
  }, [autoSaveInterval]);

  const handleSave = async () => {
    if (!currentNote || !hasUnsavedChanges) return;

    const title = titleRef.current?.value || currentNote.title;
    const content = editor?.getHTML() || '';

    try {
      await updateNote({
        id: currentNote.id,
        title,
        content,
      });
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const handleTitleChange = () => {
    setHasUnsavedChanges(true);
    if (autoSave) {
      debouncedSave();
    }
  };

  // 当选择新笔记时更新编辑器内容
  useEffect(() => {
    if (currentNote && editor) {
      editor.commands.setContent(currentNote.content || '');
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
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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

        {/* 格式化工具栏 */}
        {editor && (
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
              variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Button>
            
            <Button
              variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <Button
              variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
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
      </div>

      {/* 编辑器内容区域 */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      <EmbeddedDatabaseNote
        content={currentNote.content || ''}
        onContentChange={(newContent) => {
          if (currentNote) {
            updateNote({
              id: currentNote.id,
              content: newContent
            });
          }
        }}
      />
    </div>
  );
} 