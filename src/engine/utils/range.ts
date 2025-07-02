/**
 * Daphne Editor Engine - Range Utility 
 *
 * 选区操作工具，提供选区的创建、操作和管理功能
 */

import { RangeInterface } from '../types';

/**
 * 收缩选区到可编辑内容
 * @param range - 选区对象
 */
export function shrinkRange(range: RangeInterface): void {
  if (range.collapsed) return;

  // 收缩开始位置
  let startContainer = range.startContainer;
  let startOffset = range.startOffset;

  while (startContainer.nodeType === Node.ELEMENT_NODE && startOffset < startContainer.childNodes.length) {
    const child = startContainer.childNodes[startOffset];
    if (child.nodeType === Node.TEXT_NODE) {
      startContainer = child;
      startOffset = 0;
      break;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      startContainer = child;
      startOffset = 0;
    } else {
      break;
    }
  }

  // 收缩结束位置
  let endContainer = range.endContainer;
  let endOffset = range.endOffset;

  while (endContainer.nodeType === Node.ELEMENT_NODE && endOffset > 0) {
    const child = endContainer.childNodes[endOffset - 1];
    if (child.nodeType === Node.TEXT_NODE) {
      endContainer = child;
      endOffset = child.textContent?.length || 0;
      break;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      endContainer = child;
      endOffset = child.childNodes.length;
    } else {
      break;
    }
  }

  range.setStart(startContainer, startOffset);
  range.setEnd(endContainer, endOffset);
}

/**
 * 创建书签
 * @param range - 选区对象
 * @returns 书签对象
 */
export function createBookmark(range: RangeInterface): { anchor: Node; focus: Node } {
  const doc = range.startContainer.ownerDocument || document;

  // 创建锚点标记
  const anchor = doc.createElement('span');
  anchor.setAttribute('data-daphne-bookmark', 'anchor');
  anchor.style.display = 'none';

  // 创建焦点标记
  const focus = doc.createElement('span');
  focus.setAttribute('data-daphne-bookmark', 'focus');
  focus.style.display = 'none';

  if (range.collapsed) {
    // 折叠选区，只插入一个标记
    range.insertNode(anchor);
    return { anchor, focus: anchor };
  }

  // 非折叠选区，插入两个标记
  const rangeClone = range.cloneRange();

  // 在结束位置插入焦点标记
  rangeClone.collapse(false);
  rangeClone.insertNode(focus);

  // 在开始位置插入锚点标记
  rangeClone.setStart(range.startContainer, range.startOffset);
  rangeClone.collapse(true);
  rangeClone.insertNode(anchor);

  return { anchor, focus };
}

/**
 * 移动到书签位置
 * @param range - 选区对象
 * @param bookmark - 书签对象
 */
export function moveToBookmark(range: RangeInterface, bookmark: { anchor: Node; focus: Node }): void {
  const { anchor, focus } = bookmark;

  if (anchor === focus) {
    // 折叠选区
    range.setStartAfter(anchor);
    range.collapse(true);
  } else {
    // 非折叠选区
    range.setStartAfter(anchor);
    range.setEndBefore(focus);
  }

  // 清除书签标记
  if (anchor.parentNode) {
    anchor.parentNode.removeChild(anchor);
  }
  if (focus !== anchor && focus.parentNode) {
    focus.parentNode.removeChild(focus);
  }
}

/**
 * 向上调整选区
 * @param range - 选区对象
 */
export function upRange(range: RangeInterface): void {
  let container = range.startContainer;
  let offset = range.startOffset;

  // 如果在元素节点中，尝试向上移动到父节点
  while (container.nodeType === Node.ELEMENT_NODE && container.parentNode) {
    const parent = container.parentNode;
    const childIndex = Array.from(parent.childNodes).indexOf(container as ChildNode);

    if (childIndex >= 0) {
      container = parent;
      offset = childIndex + (offset > 0 ? 1 : 0);
    } else {
      break;
    }
  }

  range.setStart(container, offset);

  if (range.collapsed) {
    range.setEnd(container, offset);
  }
}

/**
 * 向下调整选区
 * @param range - 选区对象
 */
export function downRange(range: RangeInterface): void {
  let container = range.startContainer;
  let offset = range.startOffset;

  // 如果在元素节点中，尝试向下移动到子节点
  if (container.nodeType === Node.ELEMENT_NODE && offset < container.childNodes.length) {
    const child = container.childNodes[offset];
    if (child) {
      container = child;
      offset = 0;
    }
  }

  range.setStart(container, offset);

  if (range.collapsed) {
    range.setEnd(container, offset);
  }
}

/**
 * 扩展选区到单词边界
 * @param range - 选区对象
 */
export function expandToWord(range: RangeInterface): void {
  if (range.startContainer.nodeType !== Node.TEXT_NODE) return;

  const text = range.startContainer.textContent || '';
  let startOffset = range.startOffset;
  let endOffset = range.endOffset;

  // 向前扩展到单词开始
  while (startOffset > 0 && /\w/.test(text[startOffset - 1])) {
    startOffset--;
  }

  // 向后扩展到单词结束
  while (endOffset < text.length && /\w/.test(text[endOffset])) {
    endOffset++;
  }

  range.setStart(range.startContainer, startOffset);
  range.setEnd(range.endContainer, endOffset);
}

/**
 * 扩展选区到行边界
 * @param range - 选区对象
 */
export function expandToLine(range: RangeInterface): void {
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;

  // 找到行的开始
  let lineStart = startContainer;
  while (lineStart.previousSibling) {
    lineStart = lineStart.previousSibling;
  }

  // 找到行的结束
  let lineEnd = endContainer;
  while (lineEnd.nextSibling) {
    lineEnd = lineEnd.nextSibling;
  }

  range.setStartBefore(lineStart);
  range.setEndAfter(lineEnd);
}

/**
 * 检查选区是否在指定元素内
 * @param range - 选区对象
 * @param element - 元素节点
 * @returns 是否在元素内
 */
export function isRangeInElement(range: RangeInterface, element: Element): boolean {
  return element.contains(range.startContainer) && element.contains(range.endContainer);
}

/**
 * 获取选区的文本内容
 * @param range - 选区对象
 * @returns 文本内容
 */
export function getRangeText(range: RangeInterface): string {
  return range.toString();
}

/**
 * 获取选区的HTML内容
 * @param range - 选区对象
 * @returns HTML内容
 */
export function getRangeHTML(range: RangeInterface): string {
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  return container.innerHTML;
}

/**
 * 设置选区的HTML内容
 * @param range - 选区对象
 * @param html - HTML内容
 */
export function setRangeHTML(range: RangeInterface, html: string): void {
  range.deleteContents();

  const container = document.createElement('div');
  container.innerHTML = html;

  const fragment = document.createDocumentFragment();
  while (container.firstChild) {
    fragment.appendChild(container.firstChild);
  }

  range.insertNode(fragment);
}

/**
 * 比较两个选区是否相等
 * @param range1 - 选区1
 * @param range2 - 选区2
 * @returns 是否相等
 */
export function isRangeEqual(range1: RangeInterface, range2: RangeInterface): boolean {
  return range1.startContainer === range2.startContainer &&
    range1.startOffset === range2.startOffset &&
    range1.endContainer === range2.endContainer &&
    range1.endOffset === range2.endOffset;
}

/**
 * 克隆选区
 * @param range - 原选区
 * @returns 克隆的选区
 */
export function cloneRange(range: RangeInterface): RangeInterface {
  return range.cloneRange() as RangeInterface;
}

/**
 * 创建空选区
 * @param container - 容器节点
 * @param offset - 偏移量
 * @returns 选区对象
 */
export function createRange(container: Node, offset: number = 0): RangeInterface {
  const range = document.createRange() as RangeInterface;
  range.setStart(container, offset);
  range.collapse(true);
  return range;
}

/**
 * 创建包含整个元素的选区
 * @param element - 元素节点
 * @returns 选区对象
 */
export function createRangeFromElement(element: Element): RangeInterface {
  const range = document.createRange() as RangeInterface;
  range.selectNodeContents(element);
  return range;
}
