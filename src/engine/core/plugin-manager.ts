/**
 * Daphne Editor Engine - Plugin Manager
 *
 * 插件管理器，负责管理编辑器的所有插件
 * 提供插件的注册、安装、启用、禁用、执行等功能
 */

import { Engine } from './engine';
import { 
  Plugin, 
  PluginConstructor, 
  PluginMetadata, 
  PluginManagerInterface,
  PluginOptions,
  EventCallback
} from '../types';

/**
 * 插件管理器类
 *
 * 负责整个插件系统的管理，包括：
 * - 插件的注册和安装
 * - 插件的启用和禁用
 * - 插件生命周期管理
 * - 插件依赖处理
 * - 插件间通信
 *
 * @example
 * ```typescript
 * const pluginManager = new PluginManager(engine);
 * 
 * // 注册插件
 * pluginManager.register(BoldPlugin);
 * pluginManager.register(ItalicPlugin, { hotkeys: { execute: 'ctrl+i' } });
 * 
 * // 启用插件
 * await pluginManager.enable('bold');
 * 
 * // 执行插件命令
 * pluginManager.execute('bold');
 * ```
 */
export class PluginManager implements PluginManagerInterface {
  /** 引擎实例 */
  private readonly engine: Engine;

  /** 插件元数据映射 */
  private readonly plugins: Map<string, PluginMetadata> = new Map();

  /** 插件执行顺序（基于优先级） */
  private pluginOrder: string[] = [];

  /** 是否已初始化 */
  private initialized: boolean = false;

  /**
   * 构造函数
   * @param engine - 引擎实例
   */
  constructor(engine: Engine) {
    this.engine = engine;
  }

  /**
   * 注册插件
   * @param pluginClass - 插件构造函数
   * @param options - 插件选项
   */
  register(pluginClass: PluginConstructor, options?: PluginOptions): void {
    const name = pluginClass.pluginName;
    
    if (!name) {
      throw new Error('Plugin must have a static pluginName property');
    }

    if (this.plugins.has(name)) {
      console.warn(`Plugin "${name}" is already registered`);
      return;
    }

    // 合并默认选项和传入选项
    const mergedOptions = {
      ...pluginClass.defaultOptions,
      ...options
    };

    // 创建插件元数据
    const metadata: PluginMetadata = {
      name,
      displayName: mergedOptions.description || name,
      type: this.detectPluginType(name),
      isCore: this.isCorePlugin(name),
      status: 'installed',
      constructor: pluginClass
    };

    this.plugins.set(name, metadata);
    this.updatePluginOrder();

    // 触发插件注册事件
    this.engine.event.trigger('plugin:register', { name, metadata });
  }

  /**
   * 批量注册插件
   * @param plugins - 插件构造函数数组
   */
  registerAll(plugins: PluginConstructor[]): void {
    plugins.forEach(plugin => this.register(plugin));
  }

  /**
   * 安装插件
   * @param name - 插件名称
   */
  async install(name: string): Promise<void> {
    const metadata = this.plugins.get(name);
    
    if (!metadata) {
      throw new Error(`Plugin "${name}" not found`);
    }

    if (metadata.status !== 'installed' || metadata.instance) {
      return;
    }

    try {
      // 检查依赖
      await this.checkDependencies(name);

      // 创建插件实例
      const instance = new metadata.constructor!(this.engine, metadata.constructor!.defaultOptions);
      metadata.instance = instance;

      // 设置插件引擎引用
      if (instance.getEngine) {
        Object.defineProperty(instance, 'engine', {
          get: () => this.engine,
          configurable: false
        });
      }

      // 绑定事件系统
      this.bindPluginEvents(name, instance);

      // 调用安装钩子
      if (instance.onInstall) {
        await instance.onInstall(this.engine);
      }

      metadata.loadTime = Date.now();

      // 如果自动启用，则启用插件
      const options = instance.options || metadata.constructor!.defaultOptions;
      if (options?.autoEnable !== false) {
        await this.enable(name);
      }

      // 触发插件安装事件
      this.engine.event.trigger('plugin:install', { name, instance });

    } catch (error) {
      metadata.status = 'error';
      metadata.error = error as Error;
      throw new Error(`Failed to install plugin "${name}": ${(error as Error).message}`);
    }
  }

  /**
   * 卸载插件
   * @param name - 插件名称
   */
  async uninstall(name: string): Promise<void> {
    const metadata = this.plugins.get(name);
    
    if (!metadata || !metadata.instance) {
      return;
    }

    // 先禁用插件
    if (metadata.status === 'enabled') {
      await this.disable(name);
    }

    const instance = metadata.instance;

    // 调用卸载钩子
    if (instance.onUninstall) {
      await instance.onUninstall(this.engine);
    }

    // 解绑事件
    this.unbindPluginEvents(name);

    // 销毁插件
    if (instance.destroy) {
      instance.destroy();
    }

    // 清理元数据
    delete metadata.instance;
    metadata.status = 'installed';
    delete metadata.loadTime;
    delete metadata.error;

    // 触发插件卸载事件
    this.engine.event.trigger('plugin:uninstall', { name });
  }

  /**
   * 启用插件
   * @param name - 插件名称
   */
  async enable(name: string): Promise<void> {
    const metadata = this.plugins.get(name);
    
    if (!metadata) {
      throw new Error(`Plugin "${name}" not found`);
    }

    // 如果插件未安装，先安装
    if (!metadata.instance) {
      await this.install(name);
    }

    if (metadata.status === 'enabled') {
      return;
    }

    const instance = metadata.instance!;

    try {
      // 调用启用钩子
      if (instance.onEnable) {
        await instance.onEnable(this.engine);
      }

      // 初始化插件
      if (instance.initialize) {
        instance.initialize();
      }

      // 注册命令
      this.registerPluginCommands(name, instance);

      // 注册快捷键
      this.registerPluginHotkeys(name, instance);

      metadata.status = 'enabled';

      // 触发插件启用事件
      this.engine.event.trigger('plugin:enable', { name, instance });

    } catch (error) {
      metadata.status = 'error';
      metadata.error = error as Error;
      throw new Error(`Failed to enable plugin "${name}": ${(error as Error).message}`);
    }
  }

  /**
   * 禁用插件
   * @param name - 插件名称
   */
  async disable(name: string): Promise<void> {
    const metadata = this.plugins.get(name);
    
    if (!metadata || metadata.status !== 'enabled') {
      return;
    }

    const instance = metadata.instance!;

    // 检查是否有依赖此插件的其他插件
    const dependents = this.getDependents(name);
    if (dependents.length > 0) {
      throw new Error(
        `Cannot disable plugin "${name}" because it is required by: ${dependents.join(', ')}`
      );
    }

    // 调用禁用钩子
    if (instance.onDisable) {
      await instance.onDisable(this.engine);
    }

    // 注销命令
    this.unregisterPluginCommands(name);

    // 注销快捷键
    this.unregisterPluginHotkeys(name);

    metadata.status = 'disabled';

    // 触发插件禁用事件
    this.engine.event.trigger('plugin:disable', { name });
  }

  /**
   * 获取插件实例
   * @param name - 插件名称
   * @returns 插件实例
   */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name)?.instance;
  }

  /**
   * 获取所有插件
   * @returns 插件元数据映射
   */
  getAll(): Map<string, PluginMetadata> {
    return new Map(this.plugins);
  }

  /**
   * 检查插件是否存在
   * @param name - 插件名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * 检查插件是否启用
   * @param name - 插件名称
   * @returns 是否启用
   */
  isEnabled(name: string): boolean {
    const metadata = this.plugins.get(name);
    return metadata?.status === 'enabled';
  }

  /**
   * 执行插件命令
   * @param name - 插件名称
   * @param args - 命令参数
   * @returns 执行结果
   */
  execute(name: string, ...args: any[]): any {
    const plugin = this.get(name);
    
    if (!plugin) {
      throw new Error(`Plugin "${name}" not found`);
    }

    if (!this.isEnabled(name)) {
      throw new Error(`Plugin "${name}" is not enabled`);
    }

    if (!plugin.execute) {
      throw new Error(`Plugin "${name}" does not have an execute method`);
    }

    // 触发执行前事件
    const cancelled = this.engine.event.trigger('plugin:before-execute', {
      name,
      args
    });

    if (cancelled === false) {
      return;
    }

    // 执行插件命令
    const result = plugin.execute(...args);

    // 触发执行后事件
    this.engine.event.trigger('plugin:after-execute', {
      name,
      args,
      result
    });

    return result;
  }

  /**
   * 查询插件状态
   * @param name - 插件名称
   * @returns 状态值
   */
  queryState(name: string): boolean {
    const plugin = this.get(name);
    
    if (!plugin || !this.isEnabled(name)) {
      return false;
    }

    if (!plugin.queryState) {
      return false;
    }

    return plugin.queryState();
  }

  /**
   * 初始化所有插件
   */
  async initializeAll(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // 按优先级顺序初始化插件
    for (const name of this.pluginOrder) {
      const metadata = this.plugins.get(name);
      
      if (!metadata || metadata.status === 'error') {
        continue;
      }

      try {
        await this.install(name);
      } catch (error) {
        console.error(`Failed to initialize plugin "${name}":`, error);
      }
    }

    // 调用所有插件的 onReady 钩子
    for (const [name, metadata] of this.plugins) {
      if (metadata.instance?.onReady && metadata.status === 'enabled') {
        try {
          await metadata.instance.onReady(this.engine);
        } catch (error) {
          console.error(`Plugin "${name}" onReady hook failed:`, error);
        }
      }
    }

    this.initialized = true;

    // 触发插件系统初始化完成事件
    this.engine.event.trigger('plugin:ready');
  }

  /**
   * 销毁所有插件
   */
  async destroyAll(): Promise<void> {
    // 调用所有插件的 onDestroy 钩子
    for (const [name, metadata] of this.plugins) {
      if (metadata.instance?.onDestroy && metadata.status === 'enabled') {
        try {
          await metadata.instance.onDestroy(this.engine);
        } catch (error) {
          console.error(`Plugin "${name}" onDestroy hook failed:`, error);
        }
      }
    }

    // 按优先级逆序卸载插件
    const reverseOrder = [...this.pluginOrder].reverse();
    for (const name of reverseOrder) {
      try {
        await this.uninstall(name);
      } catch (error) {
        console.error(`Failed to uninstall plugin "${name}":`, error);
      }
    }

    this.plugins.clear();
    this.pluginOrder = [];
    this.initialized = false;

    // 触发插件系统销毁事件
    this.engine.event.trigger('plugin:destroy');
  }

  // ========== 私有方法 ==========

  /**
   * 检测插件类型
   * @param name - 插件名称
   * @returns 插件类型
   */
  private detectPluginType(name: string): 'core' | 'format' | 'element' | 'tool' | 'extension' {
    // 基于插件名称模式检测类型
    if (['bold', 'italic', 'underline', 'strikethrough'].includes(name)) {
      return 'format';
    }
    if (['image', 'video', 'table', 'code-block'].includes(name)) {
      return 'element';
    }
    if (['undo', 'redo', 'paste', 'drop'].includes(name)) {
      return 'core';
    }
    if (['search', 'replace', 'word-count'].includes(name)) {
      return 'tool';
    }
    return 'extension';
  }

  /**
   * 检查是否为核心插件
   * @param name - 插件名称
   * @returns 是否为核心插件
   */
  private isCorePlugin(name: string): boolean {
    const corePlugins = ['paste', 'drop', 'undo', 'selectall', 'paintformat', 'removeformat'];
    return corePlugins.includes(name);
  }

  /**
   * 更新插件执行顺序
   */
  private updatePluginOrder(): void {
    // 根据优先级和依赖关系排序插件
    const sorted = Array.from(this.plugins.entries())
      .sort(([nameA, metaA], [nameB, metaB]) => {
        // 核心插件优先
        if (metaA.isCore && !metaB.isCore) return -1;
        if (!metaA.isCore && metaB.isCore) return 1;

        // 按优先级排序
        const priorityA = metaA.instance?.options?.priority || 0;
        const priorityB = metaB.instance?.options?.priority || 0;
        
        return priorityB - priorityA;
      })
      .map(([name]) => name);

    this.pluginOrder = this.resolveDependencyOrder(sorted);
  }

  /**
   * 解析依赖顺序
   * @param plugins - 插件名称数组
   * @returns 按依赖关系排序的插件名称数组
   */
  private resolveDependencyOrder(plugins: string[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const metadata = this.plugins.get(name);
      if (!metadata) return;

      // 先访问依赖
      const dependencies = metadata.instance?.options?.dependencies || [];
      for (const dep of dependencies) {
        if (plugins.includes(dep)) {
          visit(dep);
        }
      }

      result.push(name);
    };

    // 访问所有插件
    for (const name of plugins) {
      visit(name);
    }

    return result;
  }

  /**
   * 检查插件依赖
   * @param name - 插件名称
   */
  private async checkDependencies(name: string): Promise<void> {
    const metadata = this.plugins.get(name);
    if (!metadata?.constructor) return;

    const dependencies = metadata.constructor.defaultOptions?.dependencies || [];
    
    for (const dep of dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Plugin "${name}" requires plugin "${dep}" which is not registered`);
      }

      // 确保依赖已启用
      if (!this.isEnabled(dep)) {
        await this.enable(dep);
      }
    }
  }

  /**
   * 获取依赖指定插件的插件列表
   * @param name - 插件名称
   * @returns 依赖插件列表
   */
  private getDependents(name: string): string[] {
    const dependents: string[] = [];

    for (const [pluginName, metadata] of this.plugins) {
      const dependencies = metadata.instance?.options?.dependencies || [];
      if (dependencies.includes(name)) {
        dependents.push(pluginName);
      }
    }

    return dependents;
  }

  /**
   * 绑定插件事件
   * @param name - 插件名称
   * @param instance - 插件实例
   */
  private bindPluginEvents(name: string, instance: Plugin): void {
    if (!instance.on || !instance.off || !instance.emit) {
      // 为插件提供事件系统
      const listeners = new Map<string, Set<EventCallback>>();

      instance.on = (event: string, callback: EventCallback) => {
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event)!.add(callback);

        // 代理到引擎事件系统
        this.engine.event.on(`plugin:${name}:${event}`, callback);
      };

      instance.off = (event: string, callback?: EventCallback) => {
        if (callback) {
          listeners.get(event)?.delete(callback);
          this.engine.event.off(`plugin:${name}:${event}`, callback);
        } else {
          listeners.delete(event);
          this.engine.event.off(`plugin:${name}:${event}`);
        }
      };

      instance.emit = (event: string, ...args: any[]) => {
        const callbacks = listeners.get(event);
        if (callbacks) {
          for (const callback of callbacks) {
            callback.apply(null, args);
          }
        }

        // 触发引擎事件
        this.engine.event.trigger(`plugin:${name}:${event}`, args);
      };
    }
  }

  /**
   * 解绑插件事件
   * @param name - 插件名称
   */
  private unbindPluginEvents(name: string): void {
    // 移除所有插件相关的事件监听
    this.engine.event.off(`plugin:${name}:`);
  }

  /**
   * 注册插件命令
   * @param name - 插件名称
   * @param instance - 插件实例
   */
  private registerPluginCommands(name: string, instance: Plugin): void {
    // 将插件作为命令注册到命令管理器
    // 暂时注释掉，等待 CommandManager 实现完整接口
    /*
    if (this.engine.command && instance.execute) {
      this.engine.command.register(name, {
        execute: (...args: any[]) => instance.execute!(...args),
        queryState: instance.queryState ? () => instance.queryState!() : undefined,
        queryValue: instance.queryValue ? () => instance.queryValue!() : undefined,
        queryEnabled: instance.isEnabled ? () => instance.isEnabled!() : undefined
      });
    }

    // 注册插件自定义命令
    if (instance.registerCommand) {
      const originalRegister = instance.registerCommand;
      instance.registerCommand = (cmdName: string, command: any) => {
        if (this.engine.command) {
          this.engine.command.register(`${name}:${cmdName}`, command);
        }
        originalRegister.call(instance, cmdName, command);
      };
    }
    */
  }

  /**
   * 注销插件命令
   * @param name - 插件名称
   */
  private unregisterPluginCommands(name: string): void {
    // 暂时注释掉，等待 CommandManager 实现完整接口
    /*
    if (this.engine.command) {
      // 注销主命令
      this.engine.command.unregister(name);

      // 注销所有子命令
      const allCommands = this.engine.command.getAll();
      for (const cmdName of allCommands.keys()) {
        if (cmdName.startsWith(`${name}:`)) {
          this.engine.command.unregister(cmdName);
        }
      }
    }
    */
  }

  /**
   * 注册插件快捷键
   * @param name - 插件名称
   * @param instance - 插件实例
   */
  private registerPluginHotkeys(name: string, instance: Plugin): void {
    const hotkeys = instance.getHotkeys?.() || instance.options?.hotkeys || {};

    for (const [action, keys] of Object.entries(hotkeys)) {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      
      for (const key of keyArray) {
        // 注册快捷键到引擎
        this.engine.event.on(`keydown:${key}`, (e: KeyboardEvent) => {
          e.preventDefault();
          
          if (action === 'execute' && instance.execute) {
            instance.execute();
          } else if (typeof instance[action as keyof Plugin] === 'function') {
            (instance[action as keyof Plugin] as Function)();
          }
        });
      }
    }
  }

  /**
   * 注销插件快捷键
   * @param name - 插件名称
   */
  private unregisterPluginHotkeys(name: string): void {
    const instance = this.get(name);
    if (!instance) return;

    const hotkeys = instance.getHotkeys?.() || instance.options?.hotkeys || {};

    for (const [, keys] of Object.entries(hotkeys)) {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      
      for (const key of keyArray) {
        // 移除快捷键事件监听
        this.engine.event.off(`keydown:${key}`);
      }
    }
  }
} 