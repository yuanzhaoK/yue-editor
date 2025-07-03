import { DiffDOM } from "diff-dom";

import { EventCallback, RangeInterface } from "../types";
import { encodeCardValue, removeBookmarkTags } from "../utils/string";
import { ChangeManager } from "./change";
import { NodeModel } from "./node";
import { CARD_KEY, CARD_SELECTOR, CARD_VALUE_KEY } from "../constants";
import { ANCHOR_SELECTOR, CURSOR_SELECTOR, FOCUS_SELECTOR } from "../constants/bookmark";
import { moveToBookmark } from "../utils/range";

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

  private updateStatus = () => {
    this.hasUndo = !!this.data[this.index - 1];
    this.hasRedo = !!this.data[this.index + 1];
  }
  /**
   * 设置选区范围
   * @param dom - DOM 元素
   */
  private setRange = (dom: HTMLElement) => {
    const editAreaNode = new NodeModel(dom);
    editAreaNode.attr('contenteditable', 'true');

    const { engine } = this.change
    const { editArea, block } = engine


    // 使用 DiffDOM 进行 DOM 差异对比和应用
    const dd = new DiffDOM({
      filterOuterDiff: (t1: any, t2: any, diffs: any[]) => {
        if (!diffs.length && t1.attributes && t1.attributes[CARD_KEY]) {
          t1.innerDone = true;
        }
      }
    });

    const diff = dd.diff(editArea[0], dom);
    dd.apply(editArea[0], diff);


    // 重新渲染卡片
    editArea.find(CARD_SELECTOR).each((child: Node) => {
      const node = new NodeModel(child);
      const component = block.getComponent(node);

      if (!component || encodeCardValue(component.value) !== node.attr(CARD_VALUE_KEY)) {
        block.reRenderAll(node, engine);
      }
    });


    // 恢复选区
    const cursor = editArea.find(CURSOR_SELECTOR);
    let curRange: { anchor: Node; focus: Node } | undefined;

    if (cursor.length > 0) {
      curRange = {
        anchor: cursor[0],
        focus: cursor[0]
      };
    }


    const anchor = editArea.find(ANCHOR_SELECTOR);
    const focus = editArea.find(FOCUS_SELECTOR);

    if (anchor.length > 0 && focus.length > 0) {
      curRange = {
        anchor: anchor[0],
        focus: focus[0]
      };
    }

    if (curRange) {
      const range = this.change.getRange() as RangeInterface;
      moveToBookmark(range, curRange);
      this.change.select(range);
    }
  }

  /**
    * 保存历史记录
    * @param force - 是否强制保存
    * @param triggerEvent - 是否触发事件
    * @returns 保存的内容
    */
  save(force: boolean = true, triggerEvent: boolean = true): string {
    if (force) {
      this.start();
    }

    if (!this.canSave) {
      return '';
    }

    const { value, dom } = this.change.getValueAndDOM();
    const id = removeBookmarkTags(value);
    const data = this.data[this.index];
    const dataId = data ? data.id : '';

    if (dataId === id) {
      triggerEvent = false;
    }

    this.index++;

    // 跳过相同的历史记录
    while (this.data[this.index - 1] && this.data[this.index - 1].id === id) {
      this.index--;
    }
    // 移除后续的历史记录
    this.data = this.data.slice(0, this.index);

    // 限制历史记录数量
    if (this.data.length >= this.maxUndoCount) {
      this.data.shift();
      this.index--;
    }

    this.updateStatus();

    // 保存新的历史记录
    this.data[this.index] = {
      id,
      dom: dom as HTMLElement,
      timestamp: Date.now()
    };

    this.updateStatus();

    if (triggerEvent) {
      this.onSave(value);
    }

    return value;
  }
  undo() {
    const value = this.change.getValue();
    const id = removeBookmarkTags(value);
    // 跳过相同的历史记录
    while (this.data[this.index - 1] && this.data[this.index - 1].id === id) {
      this.index--;
    }

    this.updateStatus();

    if (!this.hasUndo) {
      this.onSave(value);
      return;
    }

    const prevData = this.data[--this.index];
    this.updateStatus();
    this.setRange(prevData.dom);
    this.onSave(this.change.getValue());

  }
  redo() {
    const value = this.change.getValue();
    const id = removeBookmarkTags(value);

    // 跳过相同的历史记录
    while (this.data[this.index + 1] && this.data[this.index + 1].id === id) {
      this.index++;
    }

    this.updateStatus();

    if (!this.hasRedo) {
      return;
    }

    const nextData = this.data[++this.index];
    this.updateStatus();

    this.setRange(nextData.dom);
    this.onSave(this.change.getValue());
  }



  /**
   * 开始记录历史
   */
  start(): void {
    this.canSave = true;
  }

  /**
   * 停止记录历史
   */
  stop(): void {
    this.canSave = false;
  }


  /**
   * 清除历史记录
   */
  clear(): void {
    this.index = 0;
    const lastItem = this.data.pop();
    this.data = lastItem ? [lastItem] : [];
    this.updateStatus();
  }


  /**
   * 更新当前历史记录
   * @param removeRedo - 是否移除重做记录
   */
  update(removeRedo?: boolean): void {
    const { value, dom } = this.change.getValueAndDOM();
    const id = removeBookmarkTags(value);
    const data = this.data[this.index];
    const dataId = data ? data.id : '';

    let redo = removeRedo;

    if (dataId === id) {
      redo = false;
    }

    if (removeRedo) {
      this.data = this.data.slice(0, this.index);
      this.updateStatus();
    }

    this.data[this.index] = {
      id,
      dom: dom as HTMLElement,
      timestamp: Date.now()
    };

    if (redo) {
      this.onSave(value);
    }
  }


  /**
   * 获取历史记录数量
   * @returns 历史记录数量
   */
  size(): number {
    return this.data.length;
  }


  /**
   * 获取当前历史记录
   * @returns 当前历史记录
   */
  getCurrentItem(): HistoryItem | undefined {
    return this.data[this.index];
  }

  /**
   * 获取指定索引的历史记录
   * @param index - 索引
   * @returns 历史记录
   */
  getItem(index: number): HistoryItem | undefined {
    return this.data[index];
  }

  /**
   * 获取所有历史记录
   * @returns 历史记录数组
   */
  getAllItems(): HistoryItem[] {
    return [...this.data];
  }

  /**
   * 重置历史管理器
   */
  reset(): void {
    this.data = [];
    this.index = -1;
    this.hasUndo = false;
    this.hasRedo = false;
    this.canSave = true;
  }




}