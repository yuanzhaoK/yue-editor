import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Plus, FolderOpen, Star, Pin, Hash, Trash2, CheckSquare, Square, MoreHorizontal } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { ContextMenu } from './ui/context-menu';
import { useAlertDialog } from './ui/alert-dialog';
import { AddCategoryDialog } from './AddCategoryDialog';
import { useNotesStore } from '../store/useNotesStore';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { AddTagDialog } from './AddTagDialog';

export function Sidebar() {
  const {
    categories,
    selectedCategoryId,
    tags,
    selectedTagId,
    isFavoriteFilterActive,
    isPinnedFilterActive,
    searchKeyword,
    loadCategories,
    loadTags,
    deleteCategory,
    deleteCategoriesBatch,
    setSelectedCategory,
    setSelectedTag,
    toggleFavoriteFilter,
    togglePinnedFilter,
    setSearchKeyword,
    searchNotes,
    loadNotes,
    deleteTag,
  } = useNotesStore();

  const { sidebarCollapsed } = useAppStore();
  const { showAlert } = useAlertDialog();
  const [localSearchKeyword, setLocalSearchKeyword] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddTagDialogOpen, setIsAddTagDialogOpen] = useState(false);
  const searchTimeoutRef = useRef<number>();

  const handleContextMenu = (event: React.MouseEvent, categoryId: number) => {
    // 阻止默认的浏览器右键菜单
    event.preventDefault();
    // 这里可以实现自定义的上下文菜单逻辑
    // 例如，使用 ContextMenu 组件
    console.log('Context menu for category:', categoryId);
  };

  useEffect(() => {
    loadCategories();
    loadTags();
  }, []);

  // 防抖搜索
  const handleSearch = (keyword: string) => {
    setLocalSearchKeyword(keyword);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = window.setTimeout(async () => {
      setSearchKeyword(keyword);
      if (keyword.trim()) {
        await searchNotes(keyword);
      } else {
        await loadNotes(selectedCategoryId || undefined);
      }
    }, 300);
  };

  const handleCategorySelect = (categoryId: number | null) => {
    if (isSelectionMode) return; // 选择模式下不允许切换分类
    setSelectedCategory(categoryId);
    setLocalSearchKeyword('');
    setSearchKeyword('');
  };

  const handleDeleteCategory = (categoryId: number) => {
    showAlert({
      title: '删除分类',
      message: '确定要删除这个分类吗？删除后该分类下的笔记将移至未分类。',
      confirmText: '删除',
      cancelText: '取消',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteCategory(categoryId);
        } catch (error) {
          showAlert({
            title: '删除失败',
            message: '删除分类失败，请重试',
            confirmText: '确定',
            onConfirm: () => {},
          });
        }
      },
    });
  };

  const handleToggleSelection = (categoryId: number) => {
    const newSelected = new Set(selectedCategoryIds);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategoryIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCategoryIds.size === categories.length) {
      setSelectedCategoryIds(new Set());
    } else {
      setSelectedCategoryIds(new Set(categories.map(cat => cat.id)));
    }
  };

  const handleBatchDelete = () => {
    const selectedIds = Array.from(selectedCategoryIds);
    showAlert({
      title: '批量删除分类',
      message: `确定要删除选中的 ${selectedIds.length} 个分类吗？删除后这些分类下的笔记将移至未分类。`,
      confirmText: '删除',
      cancelText: '取消',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteCategoriesBatch(selectedIds);
          setSelectedCategoryIds(new Set());
          setIsSelectionMode(false);
        } catch (error) {
          showAlert({
            title: '删除失败',
            message: '批量删除分类失败，请重试',
            confirmText: '确定',
            onConfirm: () => {},
          });
        }
      },
    });
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedCategoryIds(new Set());
  };

  if (sidebarCollapsed) {
    return (
      <div className="w-16 h-full bg-muted/50 border-r border-border flex flex-col items-center py-4 space-y-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleCategorySelect(null)}
        >
          <FolderOpen className="h-4 w-4" />
        </Button>
        <Separator className="w-8" />
        {categories.slice(0, 4).map((category) => (
          <Button
            key={category.id}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleCategorySelect(category.id)}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-muted/50 border-r border-border flex flex-col">
      {/* 搜索栏 */}
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索笔记..."
            value={localSearchKeyword}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Separator />

      {/* 快捷分类 */}
      <div className="p-4 space-y-2">
        <Button
          variant={selectedCategoryId === null ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => handleCategorySelect(null)}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          所有笔记
        </Button>
        
        <Button
          variant={isFavoriteFilterActive ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={toggleFavoriteFilter}
        >
          <Star className="mr-2 h-4 w-4" />
          收藏笔记
        </Button>
        
        <Button
          variant={isPinnedFilterActive ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={togglePinnedFilter}
        >
          <Pin className="mr-2 h-4 w-4" />
          置顶笔记
        </Button>
      </div>

      <Separator />

      {/* 分类列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">分类</span>
            <div className="flex items-center gap-1">
              {!isSelectionMode && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setIsSelectionMode(true)}
                    title="多选模式"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setIsAddCategoryDialogOpen(true)}
                    title="添加分类"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 pt-0">
          {/* 批量操作工具栏 */}
          {isSelectionMode && (
            <div className="bg-muted rounded-md p-2 mb-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-6 text-xs"
                  >
                    {selectedCategoryIds.size === categories.length ? (
                      <>
                        <CheckSquare className="h-3 w-3 mr-1" />
                        取消全选
                      </>
                    ) : (
                      <>
                        <Square className="h-3 w-3 mr-1" />
                        全选
                      </>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    已选择 {selectedCategoryIds.size} 项
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitSelectionMode}
                  className="h-6 text-xs"
                >
                  取消
                </Button>
              </div>
              {selectedCategoryIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchDelete}
                  className="w-full h-6 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  删除选中项 ({selectedCategoryIds.size})
                </Button>
              )}
            </div>
          )}

          {categories.map((category) => {
            const isSelected = selectedCategoryIds.has(category.id);
            
            if (isSelectionMode) {
              return (
                <div
                  key={category.id}
                  onContextMenu={(e) => handleContextMenu(e, category.id)}
                  className={cn(
                    "flex items-center p-2 rounded-md cursor-pointer hover:bg-accent",
                    isSelected && "bg-accent"
                  )}
                  onClick={() => !isSelectionMode && handleCategorySelect(category.id)}
                >
                  {isSelectionMode && (
                    <div onClick={(e) => { e.stopPropagation(); handleToggleSelection(category.id); }}>
                      {selectedCategoryIds.has(category.id) ? (
                        <CheckSquare className="h-4 w-4 mr-2 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 mr-2 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                  <span className="text-sm flex-1">{category.name}</span>
                </div>
              );
            }

            return (
              <ContextMenu
                key={category.id}
                items={[
                  {
                    label: '删除分类',
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: () => handleDeleteCategory(category.id),
                    destructive: true,
                  },
                ]}
              >
                <Button
                  variant={selectedCategoryId === category.id ? "secondary" : "ghost"}
                  className="w-full justify-start h-8"
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center flex-1 min-w-0">
                      <div
                        className="mr-2 w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate flex-1">{category.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">{category.note_count}</span>
                  </div>
                </Button>
              </ContextMenu>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* 标签区域 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">标签</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsAddTagDialogOpen(true)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <ContextMenu
              key={tag.id}
              items={[
                {
                  label: '删除标签',
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: () => {
                    showAlert({
                      title: '删除标签',
                      message: `确定要删除 "${tag.name}" 标签吗？`,
                      confirmText: '删除',
                      destructive: true,
                      onConfirm: () => deleteTag(tag.id),
                    });
                  },
                  destructive: true,
                },
              ]}
            >
              <Button 
                variant={selectedTagId === tag.id ? "secondary" : "outline"} 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => setSelectedTag(tag.id)}
              >
                <span 
                  className="w-2 h-2 rounded-full mr-2" 
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </Button>
            </ContextMenu>
          ))}
        </div>
      </div>

      {/* 添加分类对话框 */}
      <AddCategoryDialog
        isOpen={isAddCategoryDialogOpen}
        onClose={() => setIsAddCategoryDialogOpen(false)}
      />
      {/* 添加标签对话框 */}
      <AddTagDialog
        isOpen={isAddTagDialogOpen}
        onClose={() => setIsAddTagDialogOpen(false)}
      />
    </div>
  );
} 