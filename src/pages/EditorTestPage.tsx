import React, { useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import CustomNoteEditor, { CustomNoteEditorRef } from '../components/CustomNoteEditor';
import { AlertDialogProvider } from '../components/ui/alert-dialog';
import { Bold, Italic, Link, Heading1, Type, List, ListOrdered, Code, FileJson, FileText, Save, Download } from 'lucide-react';

interface TestNote {
  id: number;
  title: string;
  content: string;
  editorType: 'custom';
  createdAt: Date;
  updatedAt: Date;
}

export function EditorTestPage() {
  const [notes, setNotes] = useState<TestNote[]>([
    {
      id: 1,
      title: '测试笔记 1',
      content: '<p>这是一个<strong>测试笔记</strong>，包含一些<em>格式化</em>的内容。</p><p>还有一个<a href="https://example.com">链接</a>。</p>',
      editorType: 'custom',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 2,
      title: '测试笔记 2',
      content: '<h1>标题 1</h1><p>这是第二个测试笔记。</p><ul><li>列表项 1</li><li>列表项 2</li></ul>',
      editorType: 'custom',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  const [currentNote, setCurrentNote] = useState<TestNote | null>(notes[0]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const customEditorRef = useRef<CustomNoteEditorRef>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // 工具栏状态
  const [toolbarState, setToolbarState] = useState({
    bold: false,
    italic: false,
    link: false
  });

  // 更新工具栏状态
  const updateToolbarState = () => {
    const engine = customEditorRef.current?.getEngine();
    if (engine) {
      setToolbarState({
        bold: engine.plugin.queryState('bold'),
        italic: engine.plugin.queryState('italic'),
        link: engine.plugin.queryState('link')
      });
    }
  };

  // 执行编辑器命令
  const executeCommand = (command: string, ...args: any[]) => {
    const engine = customEditorRef.current?.getEngine();
    if (engine) {
      try {
        engine.plugin.execute(command, ...args);
        updateToolbarState();
      } catch (error) {
        console.error(`Failed to execute ${command}:`, error);
      }
    }
  };

  // 插入标题
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

  // 插入列表
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

  // 插入代码块
  const insertCode = () => {
    const engine = customEditorRef.current?.getEngine();
    if (engine) {
      const range = engine.change.getRange();
      if (range) {
        engine.history.save(false, false);
        
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        
        if (range.collapsed) {
          code.textContent = '// 代码示例\nconsole.log("Hello, World!");';
        } else {
          const contents = range.extractContents();
          code.appendChild(contents);
        }
        
        pre.appendChild(code);
        range.insertNode(pre);
        range.selectNodeContents(code);
        
        engine.change.select(range);
        engine.history.save(true, true);
      }
    }
  };

  // 内容变化处理
  const handleContentChange = () => {
    setHasUnsavedChanges(true);
    updateToolbarState();
  };

  // 标题变化处理
  const handleTitleChange = () => {
    setHasUnsavedChanges(true);
  };

  // 保存笔记
  const handleSave = () => {
    if (!currentNote || !hasUnsavedChanges) return;

    const title = titleRef.current?.value || currentNote.title;
    const content = customEditorRef.current?.getContent() || '';

    const updatedNote = {
      ...currentNote,
      title,
      content,
      updatedAt: new Date()
    };

    setNotes(notes.map(note => 
      note.id === currentNote.id ? updatedNote : note
    ));
    setCurrentNote(updatedNote);
    setHasUnsavedChanges(false);
  };

  // 创建新笔记
  const handleCreateNote = () => {
    const newNote: TestNote = {
      id: Date.now(),
      title: `新笔记 ${notes.length + 1}`,
      content: '<p>开始编辑...</p>',
      editorType: 'custom',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setNotes([...notes, newNote]);
    setCurrentNote(newNote);
    setHasUnsavedChanges(false);
  };

  // 选择笔记
  const handleSelectNote = (note: TestNote) => {
    if (hasUnsavedChanges) {
      if (!confirm('有未保存的更改，是否放弃？')) {
        return;
      }
    }
    setCurrentNote(note);
    setHasUnsavedChanges(false);
  };

  // 导出内容
  const handleExport = (format: 'html' | 'json') => {
    const content = customEditorRef.current?.getContent() || '';
    const title = titleRef.current?.value || currentNote?.title || 'untitled';
    
    let data: string;
    let mimeType: string;
    let filename: string;

    if (format === 'html') {
      data = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body>
  <h1>${title}</h1>
  ${content}
</body>
</html>`;
      mimeType = 'text/html';
      filename = `${title}.html`;
    } else {
      data = JSON.stringify({
        title,
        content,
        exportedAt: new Date().toISOString()
      }, null, 2);
      mimeType = 'application/json';
      filename = `${title}.json`;
    }

    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 监听选区变化
  React.useEffect(() => {
    const interval = setInterval(() => {
      updateToolbarState();
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // 快捷键支持
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges]);

  return (
    <AlertDialogProvider>
      <div className="h-screen w-screen flex flex-col bg-background">
        {/* 头部 */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">编辑器测试页面</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/'}
              >
                返回主应用
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
              >
                {showDebugInfo ? '隐藏' : '显示'}调试信息
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            测试自定义编辑器功能，不依赖 Tauri API 和数据库
          </p>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 笔记列表 */}
          <div className="w-64 border-r p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">测试笔记</h2>
              <Button
                size="sm"
                onClick={handleCreateNote}
              >
                新建
              </Button>
            </div>
            <div className="space-y-2">
              {notes.map(note => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    currentNote?.id === note.id ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelectNote(note)}
                >
                  <h3 className="font-medium text-sm">{note.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    更新于 {note.updatedAt.toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 编辑器区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {currentNote && (
              <>
                {/* 工具栏 */}
                <div className="border-b p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {hasUnsavedChanges && (
                          <span className="text-yellow-600">● 未保存</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('html')}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        导出 HTML
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('json')}
                      >
                        <FileJson className="mr-2 h-4 w-4" />
                        导出 JSON
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        保存 (⌘S)
                      </Button>
                    </div>
                  </div>

                  {/* 标题输入 */}
                  <Input
                    ref={titleRef}
                    placeholder="笔记标题..."
                    defaultValue={currentNote.title}
                    onChange={handleTitleChange}
                    className="text-lg font-semibold border-none shadow-none px-0 mb-4"
                  />

                  {/* 格式化工具栏 */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Button
                        variant={toolbarState.bold ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => executeCommand('bold')}
                        title="加粗 (Ctrl/Cmd+B)"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={toolbarState.italic ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => executeCommand('italic')}
                        title="斜体 (Ctrl/Cmd+I)"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={toolbarState.link ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => executeCommand('link')}
                        title="链接 (Ctrl/Cmd+K)"
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>

                    <Separator orientation="vertical" className="h-6" />

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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={insertCode}
                        title="代码块"
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 编辑器内容 */}
                <div className="flex-1 overflow-y-auto">
                  <CustomNoteEditor
                    ref={customEditorRef}
                    initialContent={currentNote.content}
                    onChange={handleContentChange}
                  />
                </div>
              </>
            )}
          </div>

          {/* 调试信息面板 */}
          {showDebugInfo && (
            <div className="w-80 border-l p-4 overflow-y-auto">
              <h3 className="font-semibold mb-4">调试信息</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">当前笔记</h4>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify({
                      id: currentNote?.id,
                      title: currentNote?.title,
                      hasUnsavedChanges,
                      updatedAt: currentNote?.updatedAt
                    }, null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">工具栏状态</h4>
                  <pre className="text-xs bg-muted p-2 rounded">
                    {JSON.stringify(toolbarState, null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">当前内容 (HTML)</h4>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                    {customEditorRef.current?.getContent() || '(空)'}
                  </pre>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">引擎信息</h4>
                  <pre className="text-xs bg-muted p-2 rounded">
                    {JSON.stringify({
                      hasEngine: !!customEditorRef.current?.getEngine(),
                      plugins: ['bold', 'italic', 'link'] // 已注册的插件
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AlertDialogProvider>
  );
} 