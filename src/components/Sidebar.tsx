import { useEffect, useState } from 'react';
import { Search, Plus, FolderOpen, Star, Pin, Hash } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useNotesStore } from '../store/useNotesStore';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

export function Sidebar() {
  const {
    categories,
    selectedCategoryId,
    searchKeyword,
    loadCategories,
    setSelectedCategory,
    setSearchKeyword,
    searchNotes,
    loadNotes,
  } = useNotesStore();

  const { sidebarCollapsed } = useAppStore();
  const [localSearchKeyword, setLocalSearchKeyword] = useState('');

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSearch = async (keyword: string) => {
    setLocalSearchKeyword(keyword);
    setSearchKeyword(keyword);
    if (keyword.trim()) {
      await searchNotes(keyword);
    } else {
      await loadNotes(selectedCategoryId || undefined);
    }
  };

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setLocalSearchKeyword('');
    setSearchKeyword('');
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
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            // TODO: 实现收藏笔记过滤
          }}
        >
          <Star className="mr-2 h-4 w-4" />
          收藏笔记
        </Button>
        
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            // TODO: 实现置顶笔记过滤
          }}
        >
          <Pin className="mr-2 h-4 w-4" />
          置顶笔记
        </Button>
      </div>

      <Separator />

      {/* 分类列表 */}
      <div className="flex-1 p-4 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">分类</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              // TODO: 实现添加分类
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategoryId === category.id ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleCategorySelect(category.id)}
          >
            <div
              className="mr-2 w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {category.name}
          </Button>
        ))}
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
            onClick={() => {
              // TODO: 实现添加标签
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {/* TODO: 显示标签列表 */}
          <Button variant="outline" size="sm" className="h-6 text-xs">
            <Hash className="mr-1 h-3 w-3" />
            示例标签
          </Button>
        </div>
      </div>
    </div>
  );
} 