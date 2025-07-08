/**
 * 示例：使用命令管理器创建格式化命令
 * 
 * 这个文件展示了如何使用新的命令管理器来创建和管理格式化命令
 */

import { Engine } from '../../core/engine';
import { CommandType } from '../../types';

/**
 * 初始化基础格式化命令
 * @param engine - 编辑器引擎实例
 */
export function initializeFormatCommands(engine: Engine): void {
  // 加粗命令
  engine.command.register('bold', {
    type: CommandType.FORMAT,
    description: '加粗文本',
    hotkey: 'cmd+b',
    undoable: true,
    icon: 'bold',
    toolbar: {
      group: 'format',
      order: 1
    },
    execute: () => {
      console.log('执行加粗命令');
      // 这里会调用实际的加粗逻辑
      return formatText('bold');
    },
    queryState: () => {
      // 查询当前选区是否为加粗状态
      return isTextBold();
    },
    queryEnabled: () => {
      // 只有在编辑器不是只读模式时才启用
      return !engine.isReadonly;
    }
  });

  // 斜体命令
  engine.command.register('italic', {
    type: CommandType.FORMAT,
    description: '斜体文本',
    hotkey: 'cmd+i',
    undoable: true,
    icon: 'italic',
    toolbar: {
      group: 'format',
      order: 2
    },
    execute: () => {
      console.log('执行斜体命令');
      return formatText('italic');
    },
    queryState: () => {
      return isTextItalic();
    },
    queryEnabled: () => {
      return !engine.isReadonly;
    }
  });

  // 下划线命令
  engine.command.register('underline', {
    type: CommandType.FORMAT,
    description: '下划线文本',
    hotkey: 'cmd+u',
    undoable: true,
    icon: 'underline',
    toolbar: {
      group: 'format',
      order: 3
    },
    execute: () => {
      console.log('执行下划线命令');
      return formatText('underline');
    },
    queryState: () => {
      return isTextUnderlined();
    },
    queryEnabled: () => {
      return !engine.isReadonly;
    }
  });

  // 删除线命令
  engine.command.register('strikethrough', {
    type: CommandType.FORMAT,
    description: '删除线文本',
    hotkey: 'cmd+shift+x',
    undoable: true,
    icon: 'strikethrough',
    toolbar: {
      group: 'format',
      order: 4
    },
    execute: () => {
      console.log('执行删除线命令');
      return formatText('strikethrough');
    },
    queryState: () => {
      return isTextStrikethrough();
    },
    queryEnabled: () => {
      return !engine.isReadonly;
    }
  });

  // 清除格式命令
  engine.command.register('removeFormat', {
    type: CommandType.FORMAT,
    description: '清除格式',
    hotkey: 'cmd+\\',
    undoable: true,
    icon: 'clear-format',
    toolbar: {
      group: 'format',
      order: 5
    },
    execute: () => {
      console.log('执行清除格式命令');
      return clearFormat();
    },
    queryState: () => {
      // 如果有任何格式，则显示为激活状态
      return hasAnyFormat();
    },
    queryEnabled: () => {
      return !engine.isReadonly && hasAnyFormat();
    }
  });

  // 复合格式命令示例
  engine.command.register('boldItalic', {
    type: CommandType.FORMAT,
    description: '加粗斜体',
    hotkey: 'cmd+shift+b',
    undoable: true,
    icon: 'bold-italic',
    toolbar: {
      group: 'format',
      order: 6
    },
    execute: () => {
      console.log('执行加粗斜体命令');
      
      // 使用事务确保操作的原子性
      engine.command.beginTransaction();
      
      try {
        engine.command.execute('bold');
        engine.command.execute('italic');
        
        const results = engine.command.commitTransaction();
        return results.every(result => result.success);
      } catch (error) {
        engine.command.rollbackTransaction();
        throw error;
      }
    },
    queryState: () => {
      // 只有当文本既是加粗又是斜体时才返回 true
      return isTextBold() && isTextItalic();
    },
    queryEnabled: () => {
      return !engine.isReadonly;
    },
    dependencies: ['bold', 'italic']
  });
}

/**
 * 初始化历史命令
 * @param engine - 编辑器引擎实例
 */
export function initializeHistoryCommands(engine: Engine): void {
  // 撤销命令
  engine.command.register('undo', {
    type: CommandType.HISTORY,
    description: '撤销',
    hotkey: 'cmd+z',
    icon: 'undo',
    toolbar: {
      group: 'history',
      order: 1
    },
    execute: () => {
      console.log('执行撤销命令');
      if (engine.history.hasUndo) {
        engine.history.undo();
        return true;
      }
      return false;
    },
    queryState: () => {
      return engine.history.hasUndo;
    },
    queryEnabled: () => {
      return engine.history.hasUndo;
    }
  });

  // 重做命令
  engine.command.register('redo', {
    type: CommandType.HISTORY,
    description: '重做',
    hotkey: ['cmd+y', 'cmd+shift+z'],
    icon: 'redo',
    toolbar: {
      group: 'history',
      order: 2
    },
    execute: () => {
      console.log('执行重做命令');
      if (engine.history.hasRedo) {
        engine.history.redo();
        return true;
      }
      return false;
    },
    queryState: () => {
      return engine.history.hasRedo;
    },
    queryEnabled: () => {
      return engine.history.hasRedo;
    }
  });
}

/**
 * 初始化选择命令
 * @param engine - 编辑器引擎实例
 */
export function initializeSelectionCommands(engine: Engine): void {
  // 全选命令
  engine.command.register('selectAll', {
    type: CommandType.SELECT,
    description: '全选',
    hotkey: 'cmd+a',
    icon: 'select-all',
    execute: () => {
      console.log('执行全选命令');
      const range = engine.change.getRange();
      range.selectNodeContents(engine.editArea[0]);
      engine.change.select(range);
      return true;
    },
    queryEnabled: () => {
      return engine.editArea.text().length > 0;
    }
  });

  // 取消选择命令
  engine.command.register('deselectAll', {
    type: CommandType.SELECT,
    description: '取消选择',
    hotkey: 'esc',
    execute: () => {
      console.log('执行取消选择命令');
      const range = engine.change.getRange();
      range.collapse(true);
      engine.change.select(range);
      return true;
    },
    queryEnabled: () => {
      return !engine.change.getRange().collapsed;
    }
  });
}

/**
 * 示例：自定义命令类
 */
export class CustomFormatCommand {
  constructor(private engine: Engine, private formatType: string) {}

  execute() {
    console.log(`执行自定义格式命令: ${this.formatType}`);
    
    // 获取当前选区
    const range = this.engine.change.getRange();
    
    if (range.collapsed) {
      // 如果没有选择文本，则在光标处插入格式标记
      const formatNode = document.createElement('span');
      formatNode.className = `custom-format-${this.formatType}`;
      formatNode.textContent = `[${this.formatType}]`;
      
      range.insertNode(formatNode);
      range.setStartAfter(formatNode);
      range.collapse(true);
      this.engine.change.select(range);
    } else {
      // 如果有选择文本，则包装选择的内容
      const contents = range.extractContents();
      const formatNode = document.createElement('span');
      formatNode.className = `custom-format-${this.formatType}`;
      formatNode.appendChild(contents);
      
      range.insertNode(formatNode);
      range.selectNode(formatNode);
      this.engine.change.select(range);
    }
    
    return true;
  }

  queryState() {
    // 检查当前选区是否包含此格式
    const range = this.engine.change.getRange();
    const container = range.commonAncestorContainer;
    
    if (container.nodeType === Node.ELEMENT_NODE) {
      const element = container as Element;
      return element.classList.contains(`custom-format-${this.formatType}`);
    }
    
    return false;
  }

  queryEnabled() {
    return !this.engine.isReadonly;
  }
}

/**
 * 演示如何使用命令管理器
 */
export function demonstrateCommandManager(engine: Engine): void {
  console.log('=== 命令管理器演示 ===');

  // 1. 初始化所有命令
  initializeFormatCommands(engine);
  initializeHistoryCommands(engine);
  initializeSelectionCommands(engine);

  // 2. 注册自定义命令
  const highlightCommand = new CustomFormatCommand(engine, 'highlight');
  engine.command.register('highlight', {
    type: CommandType.FORMAT,
    description: '高亮文本',
    hotkey: 'cmd+h',
    execute: () => highlightCommand.execute(),
    queryState: () => highlightCommand.queryState(),
    queryEnabled: () => highlightCommand.queryEnabled(),
    icon: 'highlight'
  });

  // 3. 演示命令执行
  console.log('执行加粗命令...');
  const boldResult = engine.command.execute('bold');
  console.log('加粗命令结果:', boldResult);

  // 4. 演示状态查询
  console.log('加粗状态:', engine.command.queryState('bold'));
  console.log('斜体状态:', engine.command.queryState('italic'));

  // 5. 演示批处理
  console.log('开始批处理...');
  engine.command.beginBatch();
  engine.command.execute('bold');
  engine.command.execute('italic');
  engine.command.execute('underline');
  const batchResults = engine.command.executeBatch();
  console.log('批处理结果:', batchResults);

  // 6. 演示分组查询
  console.log('格式化命令组:', engine.command.getGroup('format'));
  console.log('历史命令组:', engine.command.getGroup('history'));

  // 7. 演示统计信息
  console.log('命令统计:', engine.command.getStatistics());

  // 8. 演示事件监听
  engine.event.on('command:before-execute', (data: any) => {
    console.log(`即将执行命令: ${data.name}`);
  });

  engine.event.on('command:after-execute', (data: any) => {
    console.log(`命令执行完成: ${data.name}, 耗时: ${data.executeTime}ms`);
  });

  console.log('=== 演示完成 ===');
}

// ========== 辅助函数 ==========
// 这些函数在实际实现中会连接到真正的编辑器逻辑

function formatText(type: string): boolean {
  console.log(`应用格式: ${type}`);
  // 在实际实现中，这里会调用真正的格式化逻辑
  return true;
}

function isTextBold(): boolean {
  // 在实际实现中，这里会检查当前选区的格式状态
  return false;
}

function isTextItalic(): boolean {
  return false;
}

function isTextUnderlined(): boolean {
  return false;
}

function isTextStrikethrough(): boolean {
  return false;
}

function hasAnyFormat(): boolean {
  return isTextBold() || isTextItalic() || isTextUnderlined() || isTextStrikethrough();
}

function clearFormat(): boolean {
  console.log('清除所有格式');
  // 在实际实现中，这里会移除所有格式标记
  return true;
} 