# 🚀 快速开始指南

## 当前状态

您的本地笔记应用已经基本完成！目前应用包含以下完整功能：

### ✅ 已实现功能
- **完整的 UI 界面**：无边框设计 + 三栏布局
- **笔记管理**：创建、编辑、删除、搜索笔记
- **富文本编辑器**：基于 TipTap 的现代编辑器
- **分类系统**：笔记分类和标签管理
- **主题切换**：浅色/深色/系统主题
- **数据持久化**：SQLite 本地数据库
- **自动保存**：可配置的自动保存功能

## 🛠️ 启动应用

### 1. 安装依赖（如果尚未安装）
```bash
cd tauri-notes
npm install
```

### 2. 启动开发模式
```bash
npm run tauri dev
```

### 3. 构建生产版本
```bash
npm run tauri build
```

## 🎯 使用指南

### 基本操作
1. **创建笔记**：点击笔记列表顶部的 "+" 按钮
2. **选择笔记**：在左侧笔记列表中点击任意笔记
3. **编辑笔记**：在右侧编辑器中修改标题和内容
4. **保存笔记**：使用 `Cmd/Ctrl + S` 或启用自动保存
5. **搜索笔记**：在侧边栏顶部搜索框输入关键词

### 高级功能
- **置顶笔记**：鼠标悬停在笔记上，点击 📌 图标
- **收藏笔记**：鼠标悬停在笔记上，点击 ⭐ 图标
- **分类管理**：在侧边栏选择不同分类查看笔记
- **主题设置**：点击标题栏设置按钮切换主题

### 编辑器快捷键
- `Cmd/Ctrl + S`：保存笔记
- `Cmd/Ctrl + B`：加粗文本
- `Cmd/Ctrl + I`：斜体文本
- `Cmd/Ctrl + Z`：撤销
- `Cmd/Ctrl + Y`：重做

## 🔧 故障排除

### 如果应用无法启动
1. 确保 Rust 已安装：`rustup --version`
2. 确保 Node.js 已安装：`node --version`
3. 清理并重新安装依赖：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
4. 清理 Rust 缓存：
   ```bash
   cd src-tauri
   cargo clean
   cd ..
   ```

### 如果遇到权限问题
确保对项目目录有读写权限，并且系统安全设置允许运行未签名的应用。

## 📁 项目结构

```
tauri-notes/
├── src/                    # React 前端代码
│   ├── components/         # UI 组件
│   ├── store/             # 状态管理
│   ├── lib/               # 工具库和数据库
│   └── types/             # TypeScript 类型
├── src-tauri/             # Tauri 后端代码
├── public/                # 静态资源
└── dist/                  # 构建输出
```

## 🎨 预览界面

### 主界面预览
- **侧边栏**：搜索、分类、快捷操作
- **笔记列表**：显示所有笔记，支持筛选
- **编辑器**：富文本编辑，工具栏，自动保存

### 演示版本
如果想先预览界面效果，可以打开项目根目录下的 `demo.html` 文件，这是一个纯前端演示版本。

## 🔄 下一步计划

1. **功能增强**
   - 笔记导出（Markdown/PDF）
   - 数据备份和恢复
   - 插件系统

2. **系统集成**
   - 系统托盘
   - 全局快捷键
   - 开机自启动

3. **界面优化**
   - 拖拽排序
   - 更多主题选项
   - 自定义快捷键

## 💡 提示

- 所有数据都存储在本地 SQLite 数据库中
- 支持 Markdown 语法
- 应用会记住您的主题选择和窗口状态
- 自动保存功能可在设置中调整间隔时间

开始使用您的本地笔记应用吧！🎉 