# 编辑器命令管理器

## 概述

命令管理器是 Daphne 编辑器引擎的核心模块之一，负责管理所有的编辑器命令操作。它提供了完整的命令注册、执行、状态查询、快捷键管理等功能。


- **命令注册和管理**：支持动态注册和注销命令
- **快捷键绑定**：自动处理快捷键映射和事件监听
- **状态查询**：查询命令状态、值和启用状态
- **命令分组**：支持将命令按功能分组管理
- **事务处理**：支持命令事务和批处理执行
- **事件系统**：完整的命令生命周期事件
- **统计信息**：提供命令执行统计和性能监控

## 基本用法

### 1. 注册基础命令

```typescript
import { Engine } from './engine';
import { CommandType } from '../types';

const engine = new Engine('#editor');

// 注册加粗命令
engine.command.register('bold', {
  type: CommandType.FORMAT,
  execute: () => {
    // 执行加粗操作
    console.log('Bold executed');
  },
  queryState: () => {
    // 查询当前是否为加粗状态
    return false;
  },
  hotkey: 'cmd+b',
  description: '加粗文本'
});

// 注册斜体命令
engine.command.register('italic', {
  type: CommandType.FORMAT,
  execute: () => {
    console.log('Italic executed');
  },
  queryState: () => false,
  hotkey: 'cmd+i',
  description: '斜体文本'
});
```

### 2. 执行命令

```typescript
// 直接执行命令
const result = engine.command.execute('bold');
console.log(result.success); // true

// 查询命令状态
const isBold = engine.command.queryState('bold');
console.log(isBold); // false

// 查询命令是否启用
const isEnabled = engine.command.queryEnabled('bold');
console.log(isEnabled); // true
```

### 3. 命令分组

```typescript
// 注册带分组的命令
engine.command.register('undo', {
  type: CommandType.HISTORY,
  execute: () => engine.history.undo(),
  queryState: () => engine.history.hasUndo,
  hotkey: 'cmd+z',
  toolbar: {
    group: 'history',
    order: 1
  }
});

engine.command.register('redo', {
  type: CommandType.HISTORY,
  execute: () => engine.history.redo(),
  queryState: () => engine.history.hasRedo,
  hotkey: 'cmd+shift+z',
  toolbar: {
    group: 'history',
    order: 2
  }
});

// 获取分组中的命令
const historyCommands = engine.command.getGroup('history');
console.log(historyCommands); // ['undo', 'redo']
```

### 4. 事务处理

```typescript
// 开始事务
engine.command.beginTransaction();

// 在事务中执行命令（命令会被缓存）
engine.command.execute('bold');
engine.command.execute('italic');

// 提交事务（实际执行命令）
const results = engine.command.commitTransaction();
console.log(results.length); // 2
```

### 5. 批处理

```typescript
// 开始批处理
engine.command.beginBatch();

// 添加命令到批处理队列
engine.command.execute('bold');
engine.command.execute('italic');

// 执行批处理
const results = engine.command.executeBatch();
console.log(results.length); // 2
```

### 6. 监听命令事件

```typescript
// 监听命令执行事件
engine.event.on('command:before-execute', (data) => {
  console.log('Command about to execute:', data.name);
});

engine.event.on('command:after-execute', (data) => {
  console.log('Command executed:', data.name, 'Result:', data.result);
});

engine.event.on('command:execute-error', (data) => {
  console.error('Command failed:', data.name, 'Error:', data.error);
});
```

## 高级用法

### 1. 自定义命令类

```typescript
class BoldCommand {
  constructor(private engine: Engine) {}

  execute() {
    // 实现加粗逻辑
    const range = this.engine.change.getRange();
    // ... 加粗操作
  }

  queryState() {
    // 查询当前选区是否为加粗状态
    return false;
  }

  queryEnabled() {
    // 查询命令是否可用
    return !this.engine.isReadonly;
  }
}

// 注册自定义命令
const boldCommand = new BoldCommand(engine);
engine.command.register('bold', {
  execute: () => boldCommand.execute(),
  queryState: () => boldCommand.queryState(),
  queryEnabled: () => boldCommand.queryEnabled(),
  hotkey: 'cmd+b'
});
```

### 2. 条件性命令

```typescript
engine.command.register('paste', {
  type: CommandType.INSERT,
  execute: () => {
    // 执行粘贴操作
    console.log('Paste executed');
  },
  queryEnabled: () => {
    // 只有在编辑器不是只读模式时才启用
    return !engine.isReadonly;
  },
  hotkey: 'cmd+v'
});
```

### 3. 命令依赖

```typescript
engine.command.register('complexFormat', {
  type: CommandType.FORMAT,
  execute: () => {
    // 先执行依赖命令
    engine.command.execute('bold');
    engine.command.execute('italic');
    
    // 然后执行自定义操作
    console.log('Complex format applied');
  },
  dependencies: ['bold', 'italic'],
  hotkey: 'cmd+shift+f'
});
```

## API 参考

### CommandManager

#### 主要方法

- `register(name: string, options: CommandOptions): void` - 注册命令
- `unregister(name: string): void` - 注销命令
- `execute(name: string, ...args: any[]): CommandResult` - 执行命令
- `queryState(name: string): boolean` - 查询命令状态
- `queryValue(name: string): any` - 查询命令值
- `queryEnabled(name: string): boolean` - 查询命令是否启用

#### 管理方法

- `enable(name: string): void` - 启用命令
- `disable(name: string): void` - 禁用命令
- `has(name: string): boolean` - 检查命令是否存在
- `getAll(): Map<string, CommandMetadata>` - 获取所有命令
- `getGroup(groupName: string): string[]` - 获取分组中的命令
- `getStatistics()` - 获取统计信息

#### 事务和批处理

- `beginTransaction(): void` - 开始事务
- `commitTransaction(): CommandResult[]` - 提交事务
- `rollbackTransaction(): void` - 回滚事务
- `beginBatch(): void` - 开始批处理
- `executeBatch(): CommandResult[]` - 执行批处理
- `cancelBatch(): void` - 取消批处理

### CommandOptions

```typescript
interface CommandOptions extends CommandInterface {
  type?: CommandType;
  description?: string;
  hotkey?: string | string[];
  undoable?: boolean;
  icon?: string;
  toolbar?: {
    position?: string;
    group?: string;
    order?: number;
  };
  dependencies?: string[];
  priority?: number;
  enabled?: boolean;
}
```

### CommandResult

```typescript
interface CommandResult {
  success: boolean;
  value?: any;
  error?: Error;
  executeTime: number;
}
```
