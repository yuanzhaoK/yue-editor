import { BlockManager, getBlockRoot } from "../core/block";
import { NodeModel } from "../core/node";
import { RangeInterface } from "../types";
import { getDocument } from "./node";

const CARD_CURSOR_WIDTH = 2;

export class DragToolkit {
  public doc: Document | null = null;
  rangeParent: RangeInterface | null = null;
  rangeOffset: number = 0;
  x: number = 0;
  y: number = 0;
  target: Node | null = null;
  currentBlockRoot: NodeModel | null = null;
  caretRange: Range | null = null;
  caretBlockRoot: NodeModel | null = null;
  range: Range | null = null;
  isBlockLeftRange: boolean = false;
  block: BlockManager | null = null;

  private getCurrentBlockRoot(event: DragEvent) {
    return this.block?.closest(event.target as Node);
  }

  private getBlockRoot() {
    return this.currentBlockRoot || this.caretBlockRoot;
  }
  // 获取逼近的插入区间
  private getCaretRange(): Range | null {
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/caretRangeFromPoint

    const doc = this.doc!;
    const x = this.x;
    const y = this.y;
    //@ts-ignore
    const { event } = window;
    if (doc.caretRangeFromPoint && doc.caretRangeFromPoint(x, y)) {
      return doc.caretRangeFromPoint(x, y);
      //@ts-ignore
    } else if (event?.rangeParent) {
      const range = doc.createRange();
      //@ts-ignore
      range.setStart(event.rangeParent, event.rangeOffset);
      range.collapse(true);
      return range;
    }
    return null;
  }

  parseEvent(event: DragEvent) {
    // 文件从 Finder 拖进来，不触发 dragstart 事件
    // 卡片拖动，禁止浏览器行为
    // 禁止拖图进浏览器，浏览器默认打开图片文件
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer!.dropEffect = "move";
    // 获取拖动的坐标
    this.x = event.clientX;
    this.y = event.clientY;
    // 获取拖动的目标元素
    this.target = event.target as Node;
    // 获取当前拖动的 Block 根节点
    this.currentBlockRoot = this.getCurrentBlockRoot(event)!;
    // 获取光标所在位置的 Range
    this.caretRange = this.getCaretRange()!;
    // 获取光标所在位置的 Block 根节点
    this.caretBlockRoot = getBlockRoot(
      this.caretRange.commonAncestorContainer
    )!;
    // 获取文档对象
    this.doc = getDocument(event.target as Node);
    // 记录 Range 的父节点和偏移量
    //@ts-ignore
    this.rangeParent = event.rangeParent || null;
    //@ts-ignore
    this.rangeOffset = event.rangeOffset || 0;
  }

  // 有逼近选区获得的逼近块
  getRange() {
    const caretRange = this.caretRange,
      doc = this.doc!,
      x = this.x;

    const blockRoot = this.getBlockRoot() as NodeModel;

    let blockCaretRange;

    if (blockRoot) {
      blockCaretRange = doc!.createRange();
      const rect = blockRoot.getBoundingClientRect();
      const centerX = (rect.left + rect.right) / 2;
      blockCaretRange.selectNode(blockRoot[0]);
      // 以块中点为中心为分割线，逼近两侧可插入的区间
      if (centerX < x) {
        blockCaretRange.collapse(false);
        this.isBlockLeftRange = false;
      } else {
        blockCaretRange.collapse(true);
        this.isBlockLeftRange = true;
      }
    }

    this.range = blockCaretRange || caretRange;
    return this.range;
  }

  getCursor() {
    const isCardLeftRange = this.isBlockLeftRange,
      range = this.range;

    const cardRoot = this.getBlockRoot();

    if (cardRoot && range) {
      if (isCardLeftRange) {
        // 如果选区在卡片左侧，则向后选取一个元素，选中卡片区域
        range.setEnd(range.commonAncestorContainer, range.endOffset + 1);
        const _rect2 = range.getBoundingClientRect();
        range.setEnd(range.commonAncestorContainer, range.endOffset - 1);
        return {
          x: _rect2.left - CARD_CURSOR_WIDTH,
          y: _rect2.top,
          height: _rect2.bottom - _rect2.top,
        };
      }
      // 如果选区在卡片右侧，则向前选取一个元素，选中卡片区域
      range.setStart(range.commonAncestorContainer, range.startOffset - 1);
      const _rect = range.getBoundingClientRect();
      range.setStart(range.commonAncestorContainer, range.startOffset + 1);
      return {
        x: _rect.right - CARD_CURSOR_WIDTH,
        y: _rect.top,
        height: _rect.bottom - _rect.top,
      };
    }
    // 如果卡片根节点不存在，则原逻辑不变
    let rect = this.range?.getBoundingClientRect();

    if (rect?.height === 0) {
      const node = this.range?.startContainer as HTMLElement;
      rect = node?.getBoundingClientRect();
    }

    return {
      x: rect?.left,
      y: rect?.top,
      height: rect!.bottom - rect!.top,
    };
  }
}
