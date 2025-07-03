/**
 * Daphne Editor Engine - Command Manager 
 *
 * 命令管理器，负责管理编辑器的所有命令操作
 * 提供命令的注册、执行、状态查询等功能
 */


/**
 * 命令接口
 */
export interface CommandInterface {
  /** 执行命令 */
  execute?(...args: any[]): any;

  /** 查询命令状态 */
  queryState?(): boolean;

  /** 查询命令值 */
  queryValue?(): any;

  /** 查询命令是否启用 */
  queryEnabled?(): boolean;
}

/**
 * 命令管理器类
 *
 * 负责管理编辑器的所有命令，包括：
 * - 命令注册和管理
 * - 命令执行
 * - 命令状态查询
 * - 命令值查询
 *
 * @example
 * ```typescript
 * const commandManager = new CommandManager(changeManager);
 *
 * // 注册命令
 * commandManager.add('bold', {
 *   execute: () => console.log('Bold executed'),
 *   queryState: () => true
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


  /** 文档对象 */
  public readonly doc: Document;

  /** 命令数据存储 */
  private data: Record<string, CommandInterface> = {};

  /**
   * 构造函数
   * @param change - 变更管理器实例
   */
  constructor() {

  }

  /**
   * 添加命令
   * @param name - 命令名称
   * @param command - 命令实现
   */
  add(name: string, command: CommandInterface): void {
    this.data[name] = command;
  }

  /**
   * 移除命令
   * @param name - 命令名称
   */
  remove(name: string): void {
    delete this.data[name];
  }

  /**
   * 检查命令是否存在
   * @param name - 命令名称
   * @returns 是否存在
   */
  has(name: string): boolean {
    return name in this.data;
  }

  /**
   * 获取命令
   * @param name - 命令名称
   * @returns 命令实现
   */
  get(name: string): CommandInterface | undefined {
    return this.data[name];
  }

  /**
   * 获取所有命令名称
   * @returns 命令名称数组
   */
  getNames(): string[] {
    return Object.keys(this.data);
  }

  /**
   * 查询命令是否启用
   * @param name - 命令名称
   * @returns 是否启用
   */
  queryEnabled(name: string): boolean {
    const command = this.data[name];
    if (!command) return false;

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
    const command = this.data[name];

    if (command && command.queryState) {
      return command.queryState.apply(this, args);
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
    const command = this.data[name];

    if (command && command.queryValue) {
      return command.queryValue.apply(this, args);
    }

    return undefined;
  }

  /**
   * 执行命令
   * @param name - 命令名称
   * @param ...args - 命令参数
   * @returns 执行结果
   */
  execute(name: string, ...args: any[]): any {
    const command = this.data[name];

    if (command && command.execute) {
      return command.execute.apply(this, args);
    }

    return undefined;
  }

  /**
   * 批量执行命令
   * @param commands - 命令数组，每个元素为 [name, ...args]
   * @returns 执行结果数组
   */
  executeMultiple(commands: [string, ...any[]][]): any[] {
    return commands.map(([name, ...args]) => this.execute(name, ...args));
  }

  /**
   * 清除所有命令
   */
  clear(): void {
    this.data = {};
  }

  /**
   * 获取命令数量
   * @returns 命令数量
   */
  size(): number {
    return Object.keys(this.data).length;
  }
}

/**
 * 默认导出
 */
export default CommandManager;
