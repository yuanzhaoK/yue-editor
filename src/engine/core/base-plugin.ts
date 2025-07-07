/**
 * Daphne Editor Engine - Base Plugin
 *
 * 插件基类，提供插件的基础功能和生命周期管理
 * 所有插件都应该继承自这个基类
 */

import { Engine } from './engine';
import { 
  Plugin, 
  PluginOptions, 
  EventCallback
} from '../types';
import { CommandInterface } from './command';

/**
 * 插件基类
 *
 * 提供插件的基础实现，包括：
 * - 配置管理
 * - 事件系统
 * - 生命周期钩子
 * - 命令注册
 *
 * @example
 * ```typescript
 * class BoldPlugin extends BasePlugin {
 *   static pluginName = 'bold';
 *   
 *   static defaultOptions: PluginOptions = {
 *     hotkeys: {
 *       execute: ['ctrl+b', 'cmd+b']
 *     }
 *   };
 *
 *   execute() {
 *     // 执行加粗操作
 *     this.engine.change.applyMark('bold');
 *   }
 *
 *   queryState(): boolean {
 *     // 查询当前是否加粗
 *     return this.engine.change.hasMark('bold');
 *   }
 * }
 * ```
 */
export abstract class BasePlugin implements Plugin {
  /** 插件名称（子类必须重写） */
  static pluginName: string;

  /** 默认选项（子类可选重写） */
  static defaultOptions?: PluginOptions;

  /** 插件名称 */
  public readonly name: string;

  /** 引擎实例 */
  protected engine: Engine;

  /** 插件选项 */
  public options: PluginOptions;

  /** 是否已启用 */
  private _enabled: boolean = false;

  /** 事件监听器映射 */
  private _listeners: Map<string, Set<EventCallback>> = new Map();

  /** 注册的命令映射 */
  private _commands: Map<string, CommandInterface> = new Map();

  /**
   * 构造函数
   * @param engine - 引擎实例
   * @param options - 插件选项
   */
  constructor(engine: Engine, options?: PluginOptions) {
    const ctor = this.constructor as typeof BasePlugin;
    
    if (!ctor.pluginName) {
      throw new Error('Plugin must have a static pluginName property');
    }

    this.name = ctor.pluginName;
    this.engine = engine;
    this.options = {
      ...ctor.defaultOptions,
      ...options
    };
  }

  // ========== 生命周期方法 ==========

  /**
   * 插件安装时调用
   * @param engine - 引擎实例
   */
  async onInstall(engine: Engine): Promise<void> {
    // 子类可重写
  }

  /**
   * 插件卸载时调用
   * @param engine - 引擎实例
   */
  async onUninstall(engine: Engine): Promise<void> {
    // 子类可重写
  }

  /**
   * 插件启用时调用
   * @param engine - 引擎实例
   */
  async onEnable(engine: Engine): Promise<void> {
    this._enabled = true;
    // 子类可重写
  }

  /**
   * 插件禁用时调用
   * @param engine - 引擎实例
   */
  async onDisable(engine: Engine): Promise<void> {
    this._enabled = false;
    // 子类可重写
  }

  /**
   * 编辑器就绪时调用
   * @param engine - 引擎实例
   */
  async onReady(engine: Engine): Promise<void> {
    // 子类可重写
  }

  /**
   * 编辑器销毁时调用
   * @param engine - 引擎实例
   */
  async onDestroy(engine: Engine): Promise<void> {
    // 子类可重写
  }

  // ========== 核心方法 ==========

  /**
   * 初始化插件
   * 子类可重写此方法进行自定义初始化
   */
  initialize(): void {
    // 子类可重写
  }

  /**
   * 执行插件命令
   * 子类必须实现此方法
   * @param args - 命令参数
   */
  abstract execute(...args: any[]): any;

  /**
   * 查询插件状态
   * 子类可重写此方法
   * @returns 插件状态
   */
  queryState(): boolean {
    return false;
  }

  /**
   * 查询插件值
   * 子类可重写此方法
   * @returns 插件值
   */
  queryValue(): any {
    return undefined;
  }

  /**
   * 销毁插件
   * 子类可重写此方法进行自定义清理
   */
  destroy(): void {
    // 清理事件监听器
    this._listeners.clear();
    
    // 清理注册的命令
    this._commands.clear();
    
    // 子类可重写进行额外清理
  }

  // ========== 辅助方法 ==========

  /**
   * 获取引擎实例
   * @returns 引擎实例
   */
  getEngine(): Engine {
    return this.engine;
  }

  /**
   * 获取配置
   * @param key - 配置键，如果不提供则返回所有配置
   * @returns 配置值
   */
  getConfig<T = any>(key?: string): T {
    if (!key) {
      return this.options.config as T;
    }
    return this.options.config?.[key] as T;
  }

  /**
   * 设置配置
   * @param key - 配置键
   * @param value - 配置值
   */
  setConfig(key: string, value: any): void {
    if (!this.options.config) {
      this.options.config = {};
    }
    this.options.config[key] = value;
  }

  /**
   * 监听事件
   * @param event - 事件名
   * @param callback - 回调函数
   */
  on(event: string, callback: EventCallback): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
  }

  /**
   * 移除事件监听
   * @param event - 事件名
   * @param callback - 回调函数，如果不提供则移除所有监听器
   */
  off(event: string, callback?: EventCallback): void {
    if (!callback) {
      this._listeners.delete(event);
    } else {
      this._listeners.get(event)?.delete(callback);
    }
  }

  /**
   * 触发事件
   * @param event - 事件名
   * @param args - 事件参数
   */
  emit(event: string, ...args: any[]): void {
    const callbacks = this._listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(args[0]);
      }
    }
  }

  /**
   * 检查是否启用
   * @returns 是否启用
   */
  isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * 获取快捷键配置
   * @returns 快捷键配置
   */
  getHotkeys(): Record<string, string | string[]> {
    return this.options.hotkeys || {};
  }

  /**
   * 注册命令
   * @param name - 命令名
   * @param command - 命令对象
   */
  registerCommand(name: string, command: CommandInterface): void {
    this._commands.set(name, command);
  }

  /**
   * 注销命令
   * @param name - 命令名
   */
  unregisterCommand(name: string): void {
    this._commands.delete(name);
  }

  /**
   * 获取注册的命令
   * @param name - 命令名
   * @returns 命令对象
   */
  getCommand(name: string): CommandInterface | undefined {
    return this._commands.get(name);
  }

  // ========== 工具方法 ==========

  /**
   * 检查是否支持某个特性
   * @param feature - 特性名
   * @returns 是否支持
   */
  protected supports(feature: string): boolean {
    // 可以基于浏览器能力、配置等进行检查
    return true;
  }

  /**
   * 获取当前选区
   * @returns 选区范围
   */
  protected getRange() {
    return this.engine.change.getRange();
  }

  /**
   * 应用命令并保存历史
   * @param callback - 命令回调
   */
  protected applyCommand(callback: () => void): void {
    this.engine.history.save(false, false);
    try {
      callback();
      this.engine.history.save(true, true);
    } catch (error) {
      this.engine.history.stop();
      throw error;
    }
  }

  /**
   * 触发内容变更
   */
  protected triggerChange(): void {
    this.engine.change.onChange?.(this.engine.change.getValue());
  }
} 