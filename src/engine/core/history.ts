

import { EventCallback } from "../types";
import { ChangeManager } from "./change";

/** 最大撤销记录数量 */
const MAX_UNDO_COUNT = 100;

/**
 * 历史记录项
 */
export interface HistoryItem {
  /** 内容 ID */
  id: string;

  /** DOM 快照 */
  dom: HTMLElement;

  /** 时间戳 */
  timestamp?: number;
}

/**
 * 历史管理器配置选项
 */
export interface HistoryManagerOptions {
  /** 保存历史记录时的回调 */
  onSave: EventCallback<string>;

  /** 最大撤销数量 */
  maxUndoCount?: number;
}
/**
 * 历史记录（操作栈）管理器类
 *
 * 负责管理编辑器的历史记录，包括：
 * - 历史记录的保存
 * - 撤销操作
 * - 重做操作
 * - 历史记录的清理
 *
 * @example
 * ```typescript
 * const historyManager = new HistoryManager(changeManager, {
 *   onSave: (value) => console.log('History saved:', value),
 *   maxUndoCount: 50
 * });
 *
 * // 保存历史记录
 * historyManager.save();
 *
 * // 撤销
 * historyManager.undo();
 *
 * // 重做
 * historyManager.redo();
 * ```
 */
export class HistoryManager {
  /** 变更管理器 */
  public readonly change: ChangeManager;

  /** 配置选项 */
  public readonly options: HistoryManagerOptions;

  /** 保存回调 */
  private onSave: EventCallback<string>;

  /** 是否有撤销记录 */
  public hasUndo: boolean = false;

  /** 是否有重做记录 */
  public hasRedo: boolean = false;

  /** 历史数据 */
  public data: HistoryItem[] = [];

  /** 当前索引 */
  public index: number = -1;

  /** 是否可以保存 */
  public canSave: boolean = true;

  /** 最大撤销数量 */
  private maxUndoCount: number;

  /**
   * 构造函数
   * @param change - 变更管理器实例
   * @param options - 配置选项
   */
  constructor(change: ChangeManager, options: HistoryManagerOptions) {
    this.change = change;
    this.options = options;
    this.onSave = options.onSave;
    this.maxUndoCount = options.maxUndoCount || MAX_UNDO_COUNT;
  }

  save() {
    throw new Error("Method not implemented.");
  }
  undo() {
    throw new Error("Method not implemented.");
  }
  redo() {
    throw new Error("Method not implemented.");
  }
}