import { useEffect } from 'react';
import { Plus, Pin, Star, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useNotesStore } from '../store/useNotesStore';
import { formatDate, truncateText } from '../lib/utils';
import { Note } from '../types';
import { ContextMenu } from './ui/context-menu';
import { useAlertDialog } from './ui/alert-dialog';

export function NoteList() {
  const {
    notes,
    currentNote,
    isLoading,
    selectedCategoryId,
    categories,
    selectedTagId,
    tags,
    isFavoriteFilterActive,
    isPinnedFilterActive,
    loadNotes,
    createNote,
    setCurrentNote,
    toggleNotePinned,
    toggleNoteFavorited,
    deleteNote,
  } = useNotesStore();
  const { showAlert } = useAlertDialog();

  const getTitle = () => {
    if (selectedCategoryId) {
      const category = categories.find(c => c.id === selectedCategoryId);
      return category ? category.name : '分类笔记';
    }
    if (selectedTagId) {
      const tag = tags.find(t => t.id === selectedTagId);
      return tag ? tag.name : '标签笔记';
    }
    if (isFavoriteFilterActive) return '收藏笔记';
    if (isPinnedFilterActive) return '置顶笔记';
    return '所有笔记';
  };

  const handleCreateNote = async () => {
    try {
      await createNote({
        title: '新建笔记',
        content: '',
        category_id: selectedCategoryId || undefined,
      });
    } catch (error) {
      // 静默处理错误，避免控制台输出
    }
  };

  const handleNoteClick = (note: Note) => {
    setCurrentNote(note);
  };

  const handleTogglePin = async (e: React.MouseEvent, noteId: number) => {
    e.stopPropagation();
    await toggleNotePinned(noteId);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, noteId: number) => {
    e.stopPropagation();
    await toggleNoteFavorited(noteId);
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: number) => {
    e.stopPropagation();
    if (confirm('确定要删除这条笔记吗？')) {
      await deleteNote(noteId);
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 h-full bg-background border-r border-border flex items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-background border-r border-border flex flex-col">
      {/* 头部 */}
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {getTitle()} ({notes.length})
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCreateNote}
          className="h-8 w-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* 笔记列表 */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <div className="text-4xl">📝</div>
              <div className="text-sm">暂无笔记</div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNote}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                创建第一条笔记
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {notes.map((note) => (
              <ContextMenu
                key={note.id}
                items={[
                  {
                    label: note.is_pinned ? '取消置顶' : '置顶笔记',
                    icon: <Pin className="h-4 w-4" />,
                    onClick: () => toggleNotePinned(note.id),
                  },
                  {
                    label: note.is_favorited ? '取消收藏' : '收藏笔记',
                    icon: <Star className="h-4 w-4" />,
                    onClick: () => toggleNoteFavorited(note.id),
                  },
                  {
                    label: '删除笔记',
                    icon: <Trash2 className="h-4 w-4" />,
                    destructive: true,
                    onClick: () => {
                      showAlert({
                        title: '删除笔记',
                        message: `确定要删除 "${note.title || '无标题'}" 吗？`,
                        confirmText: '删除',
                        destructive: true,
                        onConfirm: () => deleteNote(note.id),
                      });
                    },
                  },
                ]}
              >
                <div
                  className={`p-3 rounded-lg cursor-pointer transition-colors group hover:bg-muted ${
                    currentNote?.id === note.id ? 'bg-muted border border-border' : ''
                  }`}
                  onClick={() => handleNoteClick(note)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {note.is_pinned && (
                          <Pin className="h-3 w-3 text-yellow-500 fill-current" />
                        )}
                        {note.is_favorited && (
                          <Star className="h-3 w-3 text-red-500 fill-current" />
                        )}
                        <h3 className="font-medium text-sm truncate">
                          {note.title || '无标题'}
                        </h3>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {truncateText(note.content || '无内容', 80)}
                      </p>
                      
                      <div className="text-xs text-muted-foreground">
                        {formatDate(note.updated_at)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleTogglePin(e, note.id)}
                      >
                        <Pin className={`h-3 w-3 ${note.is_pinned ? 'text-yellow-500 fill-current' : ''}`} />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => handleToggleFavorite(e, note.id)}
                      >
                        <Star className={`h-3 w-3 ${note.is_favorited ? 'text-red-500 fill-current' : ''}`} />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteNote(e, note.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </ContextMenu>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 