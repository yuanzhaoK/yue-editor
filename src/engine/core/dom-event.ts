/**
 * Daphne Editor Engine - DOM Event Manager
 *
 * DOM事件管理器，负责处理编辑器的DOM事件
 * 提供事件的统一管理和处理
 */

import { CARD_ELEMENT_KEY } from "../constants";
import { getClipboardData } from "../utils/clipboard";
import { isHotkey } from "../utils/keyboard";
import { ChangeManager } from "./change";
import { Engine } from "./engine";
import getNodeModel, { NodeModel } from "./node";

/**
 * 事件处理器类型
 */
export type EventHandler = (event: Event) => void;

/**
 * DOM事件管理器类
 *
 * 负责管理编辑器的DOM事件，包括：
 * - 原生DOM事件的监听
 * - 输入事件的处理
 * - 组合输入的处理
 * - 文档级别事件的管理
 *
 * @example
 * ```typescript
 * const domEventManager = new DOMEventManager(editArea, window);
 *
 * // 监听输入事件
 * domEventManager.onInput((event) => {
 *   console.log('Input event:', event);
 * });
 *
 * // 监听文档事件
 * domEventManager.onDocument('click', (event) => {
 *   console.log('Document click:', event);
 * });
 * ```
 */
export class DOMEventManager {
  /** 编辑区域 */
  public readonly editArea: NodeModel;

  /** 窗口对象 */
  public readonly win: Window;

  /** 文档对象 */
  public readonly doc: Document;

  /** 是否正在组合输入 */
  public isComposing: boolean = false;

  /** 事件处理器映射 */
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /** 文档事件处理器映射 */
  private documentHandlers: Map<string, Set<EventHandler>> = new Map();

  public copySource?: string;

  public engine: Engine;

  /** 剪贴板数据 */
  public clipboardData?: DataTransfer;

  /**
   * 构造函数
   * @param editArea - 编辑区域
   * @param win - 窗口对象
   */
  constructor(change: ChangeManager) {
    this.editArea = change.editArea;
    this.win = change.win;
    this.doc = change.doc;
    this.engine = change.engine;

    // 初始化组合输入事件
    this.initializeCompositionEvents();
  }

  /**
   * 初始化组合输入事件
   * @private
   */
  private initializeCompositionEvents(): void {
    this.editArea.on("compositionstart", () => {
      this.isComposing = true;
    });

    this.editArea.on("compositionend", () => {
      this.isComposing = false;
    });
  }
  isBlockInput(e: Event): boolean {
    let node = getNodeModel(e.target as Node);
    while (node) {
      if (node.isRoot()) {
        return false;
      }
      if (node.attr(CARD_ELEMENT_KEY) === "center") {
        return true;
      }
      if (node.hasClass("lake-embed-toolbar")) {
        return true;
      }
      node = node.parent()!;
    }
    return false;
  }

  /**
   * 监听输入事件
   * @param handler - 事件处理器
   */
  onInput(handler: EventHandler): void {
    this.addEventListener("input", handler);
    this.editArea.on("input", handler);
  }

  /**
   * 移除输入事件监听
   * @param handler - 事件处理器
   */
  offInput(handler: EventHandler): void {
    this.removeEventListener("input", handler);
    this.editArea.off("input", handler);
  }

  /**
   * 监听键盘按下事件
   * @param handler - 事件处理器
   */
  onKeydown(handler: EventHandler): void {
    this.addEventListener("keydown", handler);
    this.editArea.on("keydown", handler);
  }

  /**
   * 移除键盘按下事件监听
   * @param handler - 事件处理器
   */
  offKeydown(handler: EventHandler): void {
    this.removeEventListener("keydown", handler);
    this.editArea.off("keydown", handler);
  }

  /**
   * 监听键盘抬起事件
   * @param handler - 事件处理器
   */
  onKeyup(handler: EventHandler): void {
    this.addEventListener("keyup", handler);
    this.editArea.on("keyup", handler);
  }

  /**
   * 移除键盘抬起事件监听
   * @param handler - 事件处理器
   */
  offKeyup(handler: EventHandler): void {
    this.removeEventListener("keyup", handler);
    this.editArea.off("keyup", handler);
  }

  /**
   * 监听鼠标按下事件
   * @param handler - 事件处理器
   */
  onMousedown(handler: EventHandler): void {
    this.addEventListener("mousedown", handler);
    this.editArea.on("mousedown", handler);
  }

  /**
   * 移除鼠标按下事件监听
   * @param handler - 事件处理器
   */
  offMousedown(handler: EventHandler): void {
    this.removeEventListener("mousedown", handler);
    this.editArea.off("mousedown", handler);
  }

  /**
   * 监听鼠标抬起事件
   * @param handler - 事件处理器
   */
  onMouseup(handler: EventHandler): void {
    this.addEventListener("mouseup", handler);
    this.editArea.on("mouseup", handler);
  }

  /**
   * 移除鼠标抬起事件监听
   * @param handler - 事件处理器
   */
  offMouseup(handler: EventHandler): void {
    this.removeEventListener("mouseup", handler);
    this.editArea.off("mouseup", handler);
  }

  /**
   * 监听鼠标移动事件
   * @param handler - 事件处理器
   */
  onMousemove(handler: EventHandler): void {
    this.addEventListener("mousemove", handler);
    this.editArea.on("mousemove", handler);
  }

  /**
   * 移除鼠标移动事件监听
   * @param handler - 事件处理器
   */
  offMousemove(handler: EventHandler): void {
    this.removeEventListener("mousemove", handler);
    this.editArea.off("mousemove", handler);
  }

  /**
   * 监听点击事件
   * @param handler - 事件处理器
   */
  onClick(handler: EventHandler): void {
    this.addEventListener("click", handler);
    this.editArea.on("click", handler);
  }

  /**
   * 移除点击事件监听
   * @param handler - 事件处理器
   */
  offClick(handler: EventHandler): void {
    this.removeEventListener("click", handler);
    this.editArea.off("click", handler);
  }

  /**
   * 监听双击事件
   * @param handler - 事件处理器
   */
  onDblclick(handler: EventHandler): void {
    this.addEventListener("dblclick", handler);
    this.editArea.on("dblclick", handler);
  }

  /**
   * 移除双击事件监听
   * @param handler - 事件处理器
   */
  offDblclick(handler: EventHandler): void {
    this.removeEventListener("dblclick", handler);
    this.editArea.off("dblclick", handler);
  }

  /**
   * 监听拖拽开始事件
   * @param handler - 事件处理器
   */
  onDragstart(handler: EventHandler): void {
    this.addEventListener("dragstart", handler);
    this.editArea.on("dragstart", handler);
  }

  /**
   * 移除拖拽开始事件监听
   * @param handler - 事件处理器
   */
  offDragstart(handler: EventHandler): void {
    this.removeEventListener("dragstart", handler);
    this.editArea.off("dragstart", handler);
  }

  /**
   * 监听拖拽结束事件
   * @param handler - 事件处理器
   */
  onDragend(handler: EventHandler): void {
    this.addEventListener("dragend", handler);
    this.editArea.on("dragend", handler);
  }

  /**
   * 移除拖拽结束事件监听
   * @param handler - 事件处理器
   */
  offDragend(handler: EventHandler): void {
    this.removeEventListener("dragend", handler);
    this.editArea.off("dragend", handler);
  }

  /**
   * 监听拖拽进入事件
   * @param handler - 事件处理器
   */
  onDragenter(handler: EventHandler): void {
    this.addEventListener("dragenter", handler);
    this.editArea.on("dragenter", handler);
  }

  /**
   * 移除拖拽进入事件监听
   * @param handler - 事件处理器
   */
  offDragenter(handler: EventHandler): void {
    this.removeEventListener("dragenter", handler);
    this.editArea.off("dragenter", handler);
  }

  /**
   * 监听拖拽离开事件
   * @param handler - 事件处理器
   */
  onDragleave(handler: EventHandler): void {
    this.addEventListener("dragleave", handler);
    this.editArea.on("dragleave", handler);
  }

  /**
   * 移除拖拽离开事件监听
   * @param handler - 事件处理器
   */
  offDragleave(handler: EventHandler): void {
    this.removeEventListener("dragleave", handler);
    this.editArea.off("dragleave", handler);
  }

  /**
   * 监听拖拽悬停事件
   * @param handler - 事件处理器
   */
  onDragover(handler: EventHandler): void {
    this.addEventListener("dragover", handler);
    this.editArea.on("dragover", handler);
  }

  /**
   * 移除拖拽悬停事件监听
   * @param handler - 事件处理器
   */
  offDragover(handler: EventHandler): void {
    this.removeEventListener("dragover", handler);
    this.editArea.off("dragover", handler);
  }

  /**
   * 监听拖拽放置事件
   * @param handler - 事件处理器
   */
  onDrop(handler: EventHandler): void {
    this.addEventListener("drop", handler);
    this.editArea.on("drop", handler);
  }

  /**
   * 移除拖拽放置事件监听
   * @param handler - 事件处理器
   */
  offDrop(handler: EventHandler): void {
    this.removeEventListener("drop", handler);
    this.editArea.off("drop", handler);
  }

  /**
   * 监听粘贴事件
   * @param handler - 事件处理器
   */
  onPaste(
    handler: (data: {
      isPlainText: boolean;
      isPasteText: boolean;
      text?: string;
      html?: string;
      files?: File[];
    }) => void
  ): void {
    let isPasteText = false;
    this.editArea.on("keydown", (event: KeyboardEvent) => {
      if (this.engine && this.engine.isReadonly) {
        return;
      }
      if (
        isHotkey("mod", event) ||
        !isHotkey("shift", event) ||
        !isHotkey("v", event)
      ) {
        isPasteText = false;
      }
      if (
        // isHotkey("mod+v", event) ||
        isHotkey("mod+shift+v", event) ||
        isHotkey("mod+alt+shift+v", event)
      ) {
        isPasteText = true;
      }
    });
    this.editArea.on("paste", (e) => {
      if (this.engine && this.engine.isReadonly) {
        return;
      }

      if (this.isBlockInput(e)) {
        return;
      }

      e.preventDefault();
      const data = getClipboardData(e);
      data.isPasteText = isPasteText;
      isPasteText = false;
      handler(
        data as {
          isPlainText: boolean;
          isPasteText: boolean;
          text: string | undefined;
          html: string | undefined;
          files: File[];
        }
      );
    });
  }

  /**
   * 移除粘贴事件监听
   * @param handler - 事件处理器
   */
  offPaste(handler: EventHandler): void {
    this.removeEventListener("paste", handler);
    this.editArea.off("paste", handler);
  }

  /**
   * 监听复制事件
   * @param handler - 事件处理器
   */
  onCopy(handler: EventHandler): void {
    this.addEventListener("copy", handler);
    this.editArea.on("copy", handler);
  }

  /**
   * 移除复制事件监听
   * @param handler - 事件处理器
   */
  offCopy(handler: EventHandler): void {
    this.removeEventListener("copy", handler);
    this.editArea.off("copy", handler);
  }

  /**
   * 监听剪切事件
   * @param handler - 事件处理器
   */
  onCut(handler: EventHandler): void {
    this.addEventListener("cut", handler);
    this.editArea.on("cut", handler);
  }

  /**
   * 移除剪切事件监听
   * @param handler - 事件处理器
   */
  offCut(handler: EventHandler): void {
    this.removeEventListener("cut", handler);
    this.editArea.off("cut", handler);
  }

  /**
   * 监听文档级别事件
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   */
  onDocument(eventType: string, handler: EventHandler): void {
    this.addDocumentEventListener(eventType, handler);
    this.doc.addEventListener(eventType, handler);
  }

  /**
   * 移除文档级别事件监听
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   */
  offDocument(eventType: string, handler: EventHandler): void {
    this.removeDocumentEventListener(eventType, handler);
    this.doc.removeEventListener(eventType, handler);
  }

  /**
   * 监听窗口级别事件
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   */
  onWindow(eventType: string, handler: EventHandler): void {
    this.win.addEventListener(eventType, handler);
  }

  /**
   * 移除窗口级别事件监听
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   */
  offWindow(eventType: string, handler: EventHandler): void {
    this.win.removeEventListener(eventType, handler);
  }

  /**
   * 添加事件监听器
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @private
   */
  private addEventListener(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * 移除事件监听器
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @private
   */
  private removeEventListener(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * 添加文档事件监听器
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @private
   */
  private addDocumentEventListener(
    eventType: string,
    handler: EventHandler
  ): void {
    if (!this.documentHandlers.has(eventType)) {
      this.documentHandlers.set(eventType, new Set());
    }
    this.documentHandlers.get(eventType)!.add(handler);
  }

  /**
   * 移除文档事件监听器
   * @param eventType - 事件类型
   * @param handler - 事件处理器
   * @private
   */
  private removeDocumentEventListener(
    eventType: string,
    handler: EventHandler
  ): void {
    const handlers = this.documentHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.documentHandlers.delete(eventType);
      }
    }
  }

  /**
   * 清除所有事件监听器
   */
  clear(): void {
    // 清除编辑区域事件
    this.handlers.forEach((handlers, eventType) => {
      handlers.forEach((handler) => {
        this.editArea.off(eventType, handler);
      });
    });
    this.handlers.clear();

    // 清除文档事件
    this.documentHandlers.forEach((handlers, eventType) => {
      handlers.forEach((handler) => {
        this.doc.removeEventListener(eventType, handler);
      });
    });
    this.documentHandlers.clear();
  }

  /**
   * 销毁事件管理器
   */
  destroy(): void {
    this.clear();
  }
}

/**
 * 默认导出
 */
export default DOMEventManager;
