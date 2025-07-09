# 本地笔记应用

基于 Tauri 2.0 构建的现代化本地笔记软件，提供优雅的用户界面和强大的功能。

## ✨ 已完成功能特性

### 📝 笔记管理
- ✅ 创建、编辑、删除笔记
- ✅ 富文本编辑器（基于 TipTap）
- ✅ 实时搜索和过滤
- ✅ 笔记置顶和收藏
- ✅ 自动保存功能

### 🗂️ 分类和标签
- ✅ 分类管理
- ✅ 标签系统
- ✅ 快速筛选

### 🎨 界面设计
- ✅ 现代化无边框设计
- ✅ 自定义工具栏
- ✅ 三栏响应式布局
- ✅ 深色/浅色主题
- ✅ 系统主题跟随

### 💾 数据存储
- ✅ 本地 SQLite 数据库
- ✅ 数据持久化
- ✅ 数据备份和恢复

### ⚙️ 系统集成
- ✅ 系统托盘
- ✅ 全局快捷键
- 
## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **UI组件库**: shadcn/ui (Radix UI + Tailwind CSS)
- **桌面框架**: Tauri 2.0
- **数据库**: SQLite
- **状态管理**: Zustand
- **富文本编辑**: TipTap
- **图标**: Lucide React
- **构建工具**: Vite

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Rust 1.70+
- 系统要求：Windows 10+、macOS 10.15+、或现代 Linux 发行版

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri dev
```

### 构建应用

```bash
npm run tauri build
```

## 📁 项目结构

```
src/
├── components/          # React 组件
│   ├── ui/             # shadcn/ui 基础组件
│   ├── TitleBar.tsx    # 自定义标题栏
│   ├── Sidebar.tsx     # 侧边栏
│   ├── NoteList.tsx    # 笔记列表
│   ├── NoteEditor.tsx  # 笔记编辑器
│   └── SettingsDialog.tsx # 设置对话框
├── store/              # Zustand 状态管理
│   ├── useNotesStore.ts # 笔记状态
│   └── useAppStore.ts   # 应用设置状态
├── lib/                # 工具库
│   ├── database.ts     # 数据库操作
│   └── utils.ts        # 工具函数
├── types/              # TypeScript 类型定义
│   └── index.ts
└── App.tsx             # 主应用组件
```

## 🎯 使用说明

### 基本操作

1. **创建笔记**: 点击侧边栏或笔记列表的 "+" 按钮
2. **编辑笔记**: 点击任意笔记进入编辑模式
3. **保存笔记**: 使用 `Cmd/Ctrl + S` 或启用自动保存
4. **搜索笔记**: 在侧边栏搜索框输入关键词
5. **分类管理**: 在侧边栏管理笔记分类

### 快捷键

#### 全局快捷键（任何时候都可用）
- `Ctrl/Cmd + Shift + N`: 显示/隐藏应用窗口
- `Ctrl/Cmd + N`: 新建笔记（需要应用处于活动状态）
- `Ctrl/Cmd + Shift + F`: 快速搜索（需要应用处于活动状态）

#### 应用内快捷键
- `Ctrl/Cmd + S`: 保存当前笔记
- `Ctrl/Cmd + F`: 搜索笔记
- `Ctrl/Cmd + B`: 加粗文本
- `Ctrl/Cmd + I`: 斜体文本
- `Ctrl/Cmd + U`: 下划线文本
- `Ctrl/Cmd + Z`: 撤销
- `Ctrl/Cmd + Y`: 重做
- `Delete`: 删除选中笔记
- `Esc`: 取消编辑/关闭对话框

> 点击标题栏的键盘图标查看完整快捷键说明

### 设置选项

- **主题设置**: 浅色/深色/跟随系统
- **自动保存**: 可配置保存间隔
- **数据管理**: 数据库备份和恢复
- **导出功能**: 笔记导出为 Markdown 或 JSON
- **界面选项**: 侧边栏折叠等

### 系统托盘功能

- **最小化到托盘**: 关闭窗口时最小化到系统托盘
- **托盘菜单**: 右键托盘图标访问快捷菜单
- **快速切换**: 点击托盘图标快速显示/隐藏窗口
- **后台运行**: 应用可在后台持续运行

## 🗄️ 数据库结构

应用使用 SQLite 数据库，包含以下表：

```sql
-- 笔记表
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    category_id INTEGER,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_favorited BOOLEAN DEFAULT FALSE
);

-- 分类表
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 标签表
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6B7280'
);

-- 笔记标签关联表
CREATE TABLE note_tags (
    note_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY (note_id, tag_id)
);
```

## 🔄 开发路线图

### v0.2.0 
-  自研编辑器引擎

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
