/**
 * Daphne Editor Engine - Command Manager
 *
 * 命令管理器，负责管理编辑器的所有命令操作
 * 提供命令的注册、执行、状态查询、快捷键绑定等功能
 */

import { Engine } from './engine';
import { CommandInterface } from './command';
import { CommandType, Command, EventCallback } from '../types';

/**
 * 命令选项接口
 */
export interface CommandOptions extends CommandInterface {
  /** 命令类型 */
  type?: CommandType;

  /** 命令描述 */
  description?: string;

  /** 快捷键 */
  hotkey?: string | string[];

  /** 是否支持撤销 */
  undoable?: boolean;

  /** 命令图标 */
  icon?: string;

  /** 工具栏配置 */
  toolbar?: {
    position?: string;
    group?: string;
    order?: number;
  };

  /** 命令依赖 */
  dependencies?: string[];

  /** 命令优先级 */
  priority?: number;

  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 命令元数据
 */
export interface CommandMetadata {
  /** 命令名称 */
  name: string;

  /** 命令选项 */
  options: CommandOptions;

  /** 注册时间 */
  registerTime: number;

  /** 最后执行时间 */
  lastExecuteTime?: number;

  /** 执行次数 */
  executeCount: number;

  /** 是否启用 */
  enabled: boolean;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  /** 是否成功 */
  success: boolean;

  /** 返回值 */
  value?: any;

  /** 错误信息 */
  error?: Error;

  /** 执行时间 */
  executeTime: number;
}

/**
 * 命令管理器类
 *
 * 负责管理编辑器的所有命令，包括：
 * - 命令注册和管理
 * - 命令执行和状态查询
 * - 快捷键绑定和管理
 * - 命令分组和优先级
 * - 命令历史记录
 * - 命令事务和批处理
 *
 * @example
 * ```typescript
 * const commandManager = new CommandManager(engine);
 *
 * // 注册命令
 * commandManager.register('bold', {
 *   execute: () => console.log('Bold executed'),
 *   queryState: () => true,
 *   hotkey: 'cmd+b'
 * });
 *
 * // 执行命令
 * commandManager.execute('bold');
 *
 * // 查询状态
 * const isBold = commandManager.queryState('bold');
 * ```
 */
export class CommandManager {
  /** 引擎实例 */
  private readonly engine: Engine;

  /** 命令元数据存储 */
  private readonly commands: Map<string, CommandMetadata> = new Map();

  /** 命令分组 */
  private readonly groups: Map<string, Set<string>> = new Map();

  /** 快捷键映射 */
  private readonly hotkeys: Map<string, string> = new Map();

  /** 命令历史记录 */
  private readonly history: CommandMetadata[] = [];

  /** 事务状态 */
  private isInTransaction: boolean = false;

  /** 事务命令队列 */
  private transactionQueue: Array<{ name: string; args: any[] }> = [];

  /** 批处理状态 */
  private isBatching: boolean = false;

  /** 批处理命令队列 */
  private batchQueue: Array<{ name: string; args: any[] }> = [];

  /**
   * 构造函数
   * @param engine - 引擎实例
   */
  constructor(engine?: Engine) {
    this.engine = engine!;
    this.initializeHotkeyListeners();
  }

  /**
   * 注册命令
   * @param name - 命令名称
   * @param options - 命令选项
   */
  register(name: string, options: CommandOptions): void {
    // 检查命令是否已存在
    if (this.commands.has(name)) {
      console.warn(`Command "${name}" is already registered. It will be overwritten.`);
    }

    // 创建命令元数据
    const metadata: CommandMetadata = {
      name,
      options: {
        enabled: true,
        type: CommandType.TOOL,
        priority: 0,
        undoable: true,
        ...options
      },
      registerTime: Date.now(),
      executeCount: 0,
      enabled: options.enabled !== false
    };

    // 注册命令
    this.commands.set(name, metadata);

    // 处理快捷键
    this.registerHotkey(name, options.hotkey);

    // 处理分组
    if (options.toolbar?.group) {
      this.addToGroup(options.toolbar.group, name);
    }

    // 触发命令注册事件
    this.engine?.event?.trigger('command:register', {
      name,
      options,
      metadata
    });
  }

  /**
   * 注销命令
   * @param name - 命令名称
   */
  unregister(name: string): void {
    const metadata = this.commands.get(name);
    if (!metadata) {
      console.warn(`Command "${name}" is not registered.`);
      return;
    }

    // 移除快捷键
    this.unregisterHotkey(name);

    // 从分组中移除
    for (const [groupName, commands] of this.groups) {
      if (commands.has(name)) {
        commands.delete(name);
        if (commands.size === 0) {
          this.groups.delete(groupName);
        }
      }
    }

    // 从命令列表中移除
    this.commands.delete(name);

    // 触发命令注销事件
    this.engine?.event?.trigger('command:unregister', {
      name,
      metadata
    });
  }

  /**
   * 添加命令（向后兼容）
   * @param name - 命令名称
   * @param command - 命令实现
   */
  add(name: string, command: CommandInterface): void {
    this.register(name, command);
  }

  /**
   * 移除命令（向后兼容）
   * @param name - 命令名称
   */
  remove(name: string): void {
    this.unregister(name);
  }

  /**
   * 检查命令是否存在
   * @param name - 命令名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * 获取命令元数据
   * @param name - 命令名称
   * @returns 命令元数据
   */
  get(name: string): CommandMetadata | undefined {
    return this.commands.get(name);
  }

  /**
   * 获取所有命令
   * @returns 命令元数据映射
   */
  getAll(): Map<string, CommandMetadata> {
    return new Map(this.commands);
  }

  /**
   * 获取命令名称列表
   * @returns 命令名称数组
   */
  getNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * 获取分组中的命令
   * @param groupName - 分组名称
   * @returns 命令名称数组
   */
  getGroup(groupName: string): string[] {
    return Array.from(this.groups.get(groupName) || []);
  }

  /**
   * 获取所有分组
   * @returns 分组映射
   */
  getGroups(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const [groupName, commands] of this.groups) {
      result.set(groupName, Array.from(commands));
    }
    return result;
  }

  /**
   * 查询命令是否启用
   * @param name - 命令名称
   * @returns 是否启用
   */
  queryEnabled(name: string): boolean {
    const metadata = this.commands.get(name);
    if (!metadata || !metadata.enabled) {
      return false;
    }

    const command = metadata.options;
    if (command.queryEnabled) {
      return command.queryEnabled();
    }

    return true;
  }

  /**
 * 查询命令状态
 * @param name - 命令名称
 * @param ...args - 其他参数
 * @returns 命令状态
 */
  queryState(name: string, ...args: any[]): boolean {
    const metadata = this.commands.get(name);
    if (!metadata || !metadata.enabled) {
      return false;
    }

    const command = metadata.options;
    if (command.queryState) {
      return command.queryState();
    }

    return false;
  }

  /**
 * 查询命令值
 * @param name - 命令名称
 * @param ...args - 其他参数
 * @returns 命令值
 */
  queryValue(name: string, ...args: any[]): any {
    const metadata = this.commands.get(name);
    if (!metadata || !metadata.enabled) {
      return undefined;
    }

    const command = metadata.options;
    if (command.queryValue) {
      return command.queryValue();
    }

    return undefined;
  }

  /**
   * 执行命令
   * @param name - 命令名称
   * @param ...args - 命令参数
   * @returns 执行结果
   */
  execute(name: string, ...args: any[]): CommandResult {
    const startTime = Date.now();

    // 检查命令是否存在
    const metadata = this.commands.get(name);
    if (!metadata) {
      return {
        success: false,
        error: new Error(`Command "${name}" is not registered.`),
        executeTime: Date.now() - startTime
      };
    }

    // 检查命令是否启用
    if (!this.queryEnabled(name)) {
      return {
        success: false,
        error: new Error(`Command "${name}" is not enabled.`),
        executeTime: Date.now() - startTime
      };
    }

    // 如果在事务中，加入事务队列
    if (this.isInTransaction) {
      this.transactionQueue.push({ name, args });
      return {
        success: true,
        value: undefined,
        executeTime: Date.now() - startTime
      };
    }

    // 如果在批处理中，加入批处理队列
    if (this.isBatching) {
      this.batchQueue.push({ name, args });
      return {
        success: true,
        value: undefined,
        executeTime: Date.now() - startTime
      };
    }

    try {
      // 触发执行前事件
      const cancelled = this.engine?.event?.trigger('command:before-execute', {
        name,
        args,
        metadata
      });

      if (cancelled === false) {
        return {
          success: false,
          error: new Error(`Command "${name}" execution was cancelled.`),
          executeTime: Date.now() - startTime
        };
      }

      // 执行命令
      const command = metadata.options;
      let result: any;

      if (command.execute) {
        result = command.execute(args);
      }

      // 更新统计信息
      metadata.executeCount++;
      metadata.lastExecuteTime = Date.now();

      // 触发执行后事件
      this.engine?.event?.trigger('command:after-execute', {
        name,
        args,
        result,
        metadata
      });

      return {
        success: true,
        value: result,
        executeTime: Date.now() - startTime
      };

    } catch (error) {
      // 触发执行错误事件
      this.engine?.event?.trigger('command:execute-error', {
        name,
        args,
        error: error as Error,
        metadata
      });

      return {
        success: false,
        error: error as Error,
        executeTime: Date.now() - startTime
      };
    }
  }

  /**
   * 批量执行命令
   * @param commands - 命令数组，每个元素为 [name, ...args]
   * @returns 执行结果数组
   */
  executeMultiple(commands: [string, ...any[]][]): CommandResult[] {
    return commands.map(([name, ...args]) => this.execute(name, ...args));
  }

  /**
   * 启用命令
   * @param name - 命令名称
   */
  enable(name: string): void {
    const metadata = this.commands.get(name);
    if (metadata) {
      metadata.enabled = true;
      this.engine?.event?.trigger('command:enable', { name, metadata });
    }
  }

  /**
   * 禁用命令
   * @param name - 命令名称
   */
  disable(name: string): void {
    const metadata = this.commands.get(name);
    if (metadata) {
      metadata.enabled = false;
      this.engine?.event?.trigger('command:disable', { name, metadata });
    }
  }

  /**
   * 开始事务
   */
  beginTransaction(): void {
    this.isInTransaction = true;
    this.transactionQueue = [];
    this.engine?.event?.trigger('command:transaction-begin');
  }

  /**
   * 提交事务
   */
  commitTransaction(): CommandResult[] {
    if (!this.isInTransaction) {
      throw new Error('No transaction in progress.');
    }

    const results: CommandResult[] = [];

    try {
      // 执行事务队列中的所有命令
      for (const { name, args } of this.transactionQueue) {
        const result = this.execute(name, ...args);
        results.push(result);

        // 如果有命令失败，回滚事务
        if (!result.success) {
          this.rollbackTransaction();
          throw new Error(`Transaction failed at command "${name}": ${result.error?.message}`);
        }
      }

      this.engine?.event?.trigger('command:transaction-commit', { results });

    } finally {
      this.isInTransaction = false;
      this.transactionQueue = [];
    }

    return results;
  }

  /**
   * 回滚事务
   */
  rollbackTransaction(): void {
    if (!this.isInTransaction) {
      throw new Error('No transaction in progress.');
    }

    this.engine?.event?.trigger('command:transaction-rollback', {
      commands: this.transactionQueue
    });

    this.isInTransaction = false;
    this.transactionQueue = [];
  }

  /**
   * 开始批处理
   */
  beginBatch(): void {
    this.isBatching = true;
    this.batchQueue = [];
    this.engine?.event?.trigger('command:batch-begin');
  }

  /**
   * 执行批处理
   */
  executeBatch(): CommandResult[] {
    if (!this.isBatching) {
      throw new Error('No batch in progress.');
    }

    const results: CommandResult[] = [];

    try {
      // 执行批处理队列中的所有命令
      for (const { name, args } of this.batchQueue) {
        const result = this.execute(name, ...args);
        results.push(result);
      }

      this.engine?.event?.trigger('command:batch-execute', { results });

    } finally {
      this.isBatching = false;
      this.batchQueue = [];
    }

    return results;
  }

  /**
   * 取消批处理
   */
  cancelBatch(): void {
    if (!this.isBatching) {
      throw new Error('No batch in progress.');
    }

    this.engine?.event?.trigger('command:batch-cancel', {
      commands: this.batchQueue
    });

    this.isBatching = false;
    this.batchQueue = [];
  }

  /**
   * 清除所有命令
   */
  clear(): void {
    // 清除快捷键
    this.hotkeys.clear();

    // 清除分组
    this.groups.clear();

    // 清除命令
    this.commands.clear();

    // 清除历史记录
    this.history.length = 0;

    this.engine?.event?.trigger('command:clear');
  }

  /**
   * 获取命令统计信息
   * @returns 统计信息
   */
  getStatistics(): {
    total: number;
    enabled: number;
    disabled: number;
    executionCount: number;
    groups: number;
    hotkeys: number;
  } {
    let enabled = 0;
    let disabled = 0;
    let executionCount = 0;

    for (const metadata of this.commands.values()) {
      if (metadata.enabled) {
        enabled++;
      } else {
        disabled++;
      }
      executionCount += metadata.executeCount;
    }

    return {
      total: this.commands.size,
      enabled,
      disabled,
      executionCount,
      groups: this.groups.size,
      hotkeys: this.hotkeys.size
    };
  }

  /**
   * 获取命令数量
   * @returns 命令数量
   */
  size(): number {
    return this.commands.size;
  }

  // ========== 私有方法 ==========

  /**
   * 注册快捷键
   * @param commandName - 命令名称
   * @param hotkey - 快捷键
   */
  private registerHotkey(commandName: string, hotkey?: string | string[]): void {
    if (!hotkey) return;

    const keys = Array.isArray(hotkey) ? hotkey : [hotkey];

    for (const key of keys) {
      // 检查快捷键是否已被占用
      if (this.hotkeys.has(key)) {
        console.warn(`Hotkey "${key}" is already registered for command "${this.hotkeys.get(key)}". It will be overwritten.`);
      }

      this.hotkeys.set(key, commandName);
    }
  }

  /**
   * 注销快捷键
   * @param commandName - 命令名称
   */
  private unregisterHotkey(commandName: string): void {
    const keysToRemove: string[] = [];

    for (const [key, name] of this.hotkeys) {
      if (name === commandName) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.hotkeys.delete(key);
    }
  }

  /**
   * 将命令添加到分组
   * @param groupName - 分组名称
   * @param commandName - 命令名称
   */
  private addToGroup(groupName: string, commandName: string): void {
    if (!this.groups.has(groupName)) {
      this.groups.set(groupName, new Set());
    }

    this.groups.get(groupName)!.add(commandName);
  }

  /**
   * 初始化快捷键监听器
   */
  private initializeHotkeyListeners(): void {
    if (!this.engine) return;

    // 监听键盘事件
    this.engine.event?.on('keydown', (e: KeyboardEvent) => {
      const hotkeyString = this.getHotkeyString(e);
      const commandName = this.hotkeys.get(hotkeyString);

      if (commandName) {
        e.preventDefault();
        this.execute(commandName);
      }
    });
  }

  /**
   * 获取快捷键字符串
   * @param e - 键盘事件
   * @returns 快捷键字符串
   */
  private getHotkeyString(e: KeyboardEvent): string {
    const parts: string[] = [];

    if (e.ctrlKey || e.metaKey) {
      parts.push('cmd');
    }
    if (e.altKey) {
      parts.push('alt');
    }
    if (e.shiftKey) {
      parts.push('shift');
    }

    // 处理特殊键
    const specialKeys: Record<string, string> = {
      'Enter': 'enter',
      'Tab': 'tab',
      'Backspace': 'backspace',
      'Delete': 'delete',
      'Escape': 'esc',
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',
      ' ': 'space'
    };

    const key = specialKeys[e.key] || e.key.toLowerCase();
    parts.push(key);

    return parts.join('+');
  }
}
