import { NodeModelInterface, DOMNode, Selector, EventCallback } from "../types";
import EventModel from "./event";
import {
  CARD_TYPE_KEY,
  BLOCK_TAG_MAP,
  INLINE_TAG_MAP,
  ROOT_TAG_MAP,
  MARK_TAG_MAP,
  TABLE_TAG_MAP,
  ROOT_KEY,
  ROOT,
  VOID_TAG_MAP,
  SOLID_TAG_MAP,
  HEADING_TAG_MAP,
  TITLE_TAG_MAP,
  ROOT_SELECTOR,
} from "../constants";
import { getAttrMap, toCamel } from "../utils/string";
import { Engine } from "./engine";

/**
 * 获取文档对象
 * @param node - DOM 节点
 * @returns 文档对象
 */
const getDocument = (node?: Node): Document => {
  if (!node) {
    return document;
  }
  return (node as any).ownerDocument || (node as any).document || document;
};

/**
 * 获取窗口对象
 * @param node - DOM 节点
 * @returns 窗口对象
 */
const getWindow = (node?: Node): Window => {
  if (!node) {
    return window;
  }
  const doc = getDocument(node);
  return (doc as any).parentWindow || (doc as any).defaultView || window;
};

/**
 * 将表达式转换为节点数组
 * @param expr - 表达式
 * @param root - 根节点
 * @returns 节点数组
 */
const exprToNodes = (
  expr: string | Node | NodeModel | Node[] | NodeModel[],
  root?: Node
): Node[] => {
  let nodes: Node[] = [];

  if (typeof expr === "string") {
    const doc = getDocument(root);
    if (/^</.test(expr)) {
      // HTML 字符串
      const div = doc.createElement("div");
      div.innerHTML = expr;
      nodes = Array.from(div.childNodes);
    } else {
      // CSS 选择器
      const container = root || doc;
      if (container.nodeType === Node.DOCUMENT_NODE) {
        nodes = Array.from((container as Document).querySelectorAll(expr));
      } else {
        nodes = Array.from((container as Element).querySelectorAll(expr));
      }
    }
  } else if (expr instanceof NodeModel) {
    nodes = expr.toArray();
  } else if (expr && (expr as any).nodeType) {
    nodes = [expr as Node];
  } else if (Array.isArray(expr)) {
    nodes = expr.flatMap((item) =>
      item instanceof NodeModel ? item.toArray() : [item as Node]
    );
  }

  return nodes;
};

/**
 * 获取计算样式
 * @param node - DOM 节点
 * @param key - 样式属性名
 * @returns 样式值
 */
const getComputedCss = (
  node: Element,
  key?: string
): string | CSSStyleDeclaration => {
  const win = getWindow(node);
  const style = win.getComputedStyle(node, null);

  if (key) {
    // 获取所有计算样式
    const camelKey = toCamel(key);
    return (style as any)[camelKey];
  } else {
    return style;
  }
};

/**
 * 检查节点包含关系
 * @param nodeA - 父节点
 * @param nodeB - 子节点
 * @returns 是否包含
 */
const contains = (nodeA: Node, nodeB: Node): boolean => {
  // 对于 document 节点的特殊处理
  if (
    nodeA.nodeType === Node.DOCUMENT_NODE &&
    nodeB.nodeType !== Node.DOCUMENT_NODE
  ) {
    return true;
  }

  let current: Node | null = nodeB;
  while ((current = current.parentNode)) {
    if (current === nodeA) {
      return true;
    }
  }
  return false;
};

/**
 * 检查元素是否匹配选择器
 * @param element - 元素节点
 * @param selector - CSS 选择器
 * @returns 是否匹配
 */
const isMatchesSelector = (element: Element, selector: string): boolean => {
  if (element.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  const matchesSelector =
    element.matches ||
    (element as any).webkitMatchesSelector ||
    (element as any).mozMatchesSelector ||
    (element as any).oMatchesSelector ||
    (element as any).matchesSelector;

  return matchesSelector.call(element, selector);
};

/**
 * 节点模型类
 *
 * 提供对 DOM 节点的高级封装，支持链式调用和批量操作
 *
 * @example
 * ```typescript
 * const node = new NodeModel('<div>Hello</div>');
 * node.addClass('active').css('color', 'red');
 * ```
 */

export class NodeModel implements NodeModelInterface {
  /** 节点数组长度 */
  public length: number;

  /** 文档对象 */
  public doc: Document;

  /** 根节点 */
  public root?: Node;

  /** 节点名称 */
  public name: string;

  /** 节点类型 */
  public type: number;

  /** 窗口对象 */
  public win: Window;

  /** 事件处理器Map */
  private events: Map<string, EventModel>;

  /** 节点索引访问 */
  [index: number]: Node;

  /**
   * 构造函数
   * @param nodes - 节点或节点数组
   * @param root - 根节点
   */
  constructor(nodes: string | Node | Node[], root?: Node, engine?: Engine) {
    this.events = new Map();
    let nodeArray: Node[];
    if (typeof nodes === "string") {
      nodeArray = exprToNodes(nodes, root);
    } else if (nodes && (nodes as Node).nodeType) {
      nodeArray = [nodes as Node];
    } else if (nodes && typeof (nodes as any).length === "number") {
      nodeArray = Array.from(nodes as Node[] | NodeList);
    } else {
      nodeArray = [];
    }
    // 设置节点索引访问
    for (let i = 0; i < nodeArray.length; i++) {
      this[i] = nodeArray[i];
      this.events.set(i.toString(), new EventModel(engine as Engine));
    }
    this.length = nodeArray.length;
    if (this.length > 0) {
      this.doc = getDocument(root);
      this.root = root;
      this.name = this[0].nodeName ? this[0].nodeName.toLowerCase() : "";
      this.type = this[0].nodeType;
      this.win = getWindow(this[0]);
    } else {
      this.doc = document;
      this.name = "";
      this.type = 0;
      this.win = window;
    }
  }

  // ========== 属性操作方法 begin ==========
  /**
   * 获取或设置属性
   */

  attr(
    keyOrAttrs?: string | Record<string, string | number | boolean>,
    val?: string | number | boolean
  ):
    | string
    | null
    | Record<string, string | number | boolean>
    | NodeModelInterface {
    if (keyOrAttrs === undefined) {
      const resultNode = this.clone(false)[0];
      if (resultNode && resultNode.nodeType === Node.ELEMENT_NODE) {
        return getAttrMap((resultNode as Element).outerHTML) as Record<
          string,
          string | number | boolean
        > | null;
      }
      return null;
    }

    if (typeof keyOrAttrs === "object") {
      // 批量设置属性
      this.each((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          Object.keys(keyOrAttrs).forEach((key) => {
            element.setAttribute(key, String(keyOrAttrs[key]));
          });
        }
      });
      return this as NodeModelInterface;
    }

    if (val !== undefined) {
      // 设置单个属性
      this.each((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          (node as Element).setAttribute(keyOrAttrs, String(val));
        }
      });
      return this as NodeModelInterface;
    }

    // 获取属性
    if (this.length === 0) {
      return null;
    }

    const element = this[0] as Element;
    return element.getAttribute ? element.getAttribute(keyOrAttrs) : null;
  }
  /**
   * 移除属性
   * @param key - 属性名
   */
  removeAttr(key: string): NodeModelInterface {
    this.each((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        (node as Element).removeAttribute(key);
      }
    });
    return this as NodeModelInterface;
  }
  // ========== 属性操作方法 end ==========

  // ========== CSS 类操作方法 begin ==========

  /**
   * 是否包含指定类名
   * @param className - 类名
   */
  hasClass(className: string): boolean {
    if (this.length === 0) {
      return false;
    }

    const element = this[0] as Element;
    return element.classList ? element.classList.contains(className) : false;
  }

  /**
   * 添加类名
   * @param className - 类名
   */
  addClass(className: string): NodeModelInterface {
    this.each((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.classList) {
          element.classList.add(className);
        }
      }
    });
    return this as NodeModelInterface;
  }

  /**
   * 移除类名
   * @param className - 类名
   */
  removeClass(className: string): NodeModelInterface {
    this.each((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.classList) {
          element.classList.remove(className);
        }
      }
    });
    return this as NodeModelInterface;
  }

  // ========== CSS 类操作方法 end ==========

  // ========== 样式操作方法 ==========

  /**
   * 获取或设置样式
   */
  css(key: string): string;
  css(key: string, val: string | number): NodeModelInterface;
  css(styles?: Record<string, string | number>): NodeModelInterface;
  css(
    keyOrStyles?: string | Record<string, string | number>,
    val?: string | number
  ): string | NodeModelInterface {
    const element = this[0] as Element;
    if (typeof keyOrStyles === "object") {
      // 批量设置样式
      this.each((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          Object.keys(keyOrStyles).forEach((key) => {
            element.style.setProperty(key, String(keyOrStyles[key]));
          });
        }
      });
      return this as NodeModelInterface;
    }

    if (val !== undefined) {
      // 设置单个样式
      this.each((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          element.style.setProperty(keyOrStyles!, String(val));
        }
      });
      return this as NodeModelInterface;
    }

    // 获取样式
    if (this.length === 0 || !keyOrStyles) {
      return "";
    }

    const computedStyle = getComputedCss(element, keyOrStyles);
    return typeof computedStyle === 'string' ? computedStyle : '';
  }

  /**
   * 获取宽度
   */
  width(): number {
    if (this.length === 0) {
      return 0;
    }

    const element = this[0] as HTMLElement;
    return element.offsetWidth || 0;
  }

  /**
   * 获取高度
   */
  height(): number {
    if (this.length === 0) {
      return 0;
    }

    const element = this[0] as HTMLElement;
    return element.offsetHeight || 0;
  }

  // ========== 样式操作方法 end ==========

  // ========== 遍历和访问方法 begin ==========
  /**
   * 遍历节点
   * @param callback - 回调函数
   */
  each(
    callback: (node: Node, index: number) => void | boolean
  ): NodeModelInterface {
    for (let i = 0; i < this.length; i++) {
      if (callback(this[i], i) === false) {
        break;
      }
    }
    return this as NodeModelInterface;
  }
  /**
   * 获取指定索引的节点
   * @param index - 索引
   */
  eq(index: number): NodeModelInterface | undefined {
    return this[index]
      ? (new NodeModel(this[index]) as NodeModelInterface)
      : undefined;
  }

  /**
   * 获取节点在父容器中的索引
   */
  index(): number {
    let prev = this[0].previousSibling;
    let index = 0;

    while (prev && prev.nodeType === Node.ELEMENT_NODE) {
      index++;
      prev = prev.previousSibling;
    }
    return index;
  }

  /**
   * 获取父节点
   */
  parent(): NodeModel | undefined {
    const node = this[0].parentNode;
    return node ? (new NodeModel(node) as NodeModel) : undefined;
  }

  /**
   * 获取子节点
   * @param selector - 可选的选择器
   */
  children(selector?: string): NodeModelInterface {
    const children: Node[] = [];

    this.each((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const childNodes = Array.from(node.childNodes);
        if (selector) {
          childNodes.forEach((child) => {
            if (
              child.nodeType === Node.ELEMENT_NODE &&
              isMatchesSelector(child as Element, selector)
            ) {
              children.push(child);
            }
          });
        } else {
          children.push(...childNodes);
        }
      }
    });

    return new NodeModel(children) as NodeModelInterface;
  }

  /**
   * 获取第一个子节点
   */
  first(): NodeModel | undefined {
    const node = this[0].firstChild;
    return node ? (new NodeModel(node) as NodeModel) : undefined;
  }

  /**
   * 获取最后一个子节点
   */
  last(): NodeModel | undefined {
    const node = this[0].lastChild;
    return node ? (new NodeModel(node) as NodeModel) : undefined;
  }

  /**
   * 获取前一个兄弟节点
   */
  prev(): NodeModel | undefined {
    const node = this[0].previousSibling;
    return node ? (new NodeModel(node) as NodeModel) : undefined;
  }

  /**
   * 获取后一个兄弟节点
   */
  next(): NodeModel | undefined {
    const node = this[0].nextSibling;
    return node ? (new NodeModel(node) as NodeModel) : undefined;
  }

  /**
   * 获取前一个元素兄弟节点
   */
  prevElement(): NodeModel | undefined {
    const node = (this[0] as Element).previousElementSibling;
    return node ? (new NodeModel(node) as NodeModel) : undefined;
  }

  /**
   * 获取后一个元素兄弟节点
   */
  nextElement(): NodeModel | undefined {
    const node = (this[0] as Element).nextElementSibling;
    return node ? (new NodeModel(node) as NodeModel) : undefined;
  }

  /**
   * 是否包含其他节点
   * @param otherNode - 其他节点
   */
  contains(otherNode: Node | NodeModel): boolean {
    const targetNode =
      otherNode instanceof NodeModel ? otherNode[0] : (otherNode as Node);
    return contains(this[0], targetNode as Node);
  }

  /**
   * 查找子节点
   * @param selector - CSS 选择器
   */
  find(selector: string): NodeModel {
    const results: Node[] = [];

    this.each((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const found = Array.from((node as Element).querySelectorAll(selector));
        results.push(...found);
      }
    });

    return new NodeModel(results) as NodeModel;
  }

  /**
   * 查找最近的祖先节点
   * @param selector - CSS 选择器
   */
  closest(selector: string): NodeModelInterface {
    let current: Node | null = this[0];

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      if (isMatchesSelector(current as Element, selector)) {
        return new NodeModel(current) as NodeModelInterface;
      }
      current = current.parentNode;
    }

    return new NodeModel([]) as NodeModelInterface;
  }

  // ========== 遍历和访问方法 end==========

  /**
   * 将节点模型转换为节点数组
   * @returns 节点数组
   */

  toArray(): Node[] {
    const array: Node[] = [];
    this.each((node) => {
      array.push(node);
    });
    return array;
  }

  /**
   * 移除字体大小类名
   * 用于清理编辑器生成的字体大小样式
   */
  removeFontSize(): NodeModelInterface {
    const classValue = this.attr("class") as string;
    if (classValue) {
      this.attr(
        "class",
        classValue.replace(/daphne-fontsize-[\d]{1,2}/, "")
      ) as NodeModelInterface;
    }
    return this as NodeModelInterface;
  }

  // ========== 节点类型判断方法 begin ==========

  /**
   * 是否为元素节点
   */
  isElement(): boolean {
    return this.type === Node.ELEMENT_NODE;
  }

  /**
   * 是否为文本节点
   */
  isText(): boolean {
    return this.type === Node.TEXT_NODE;
  }

  /**
   * 是否为块级元素
   */
  isBlock(): boolean {
    if (this.attr(CARD_TYPE_KEY) === "inline") {
      return false;
    }
    return !!BLOCK_TAG_MAP[this.name];
  }

  /**
   * 是否为行内元素
   */
  isInline(): boolean {
    return !!INLINE_TAG_MAP[this.name];
  }

  /**
   * 是否为根块级元素
   */
  isRootBlock(): boolean {
    return !!ROOT_TAG_MAP[this.name];
  }

  /**
   * 是否为简单块级元素（不包含其他块级元素）
   */
  isSimpleBlock(): boolean {
    if (!this.isBlock()) return false;

    let node = this.first();
    while (node) {
      if (node.isBlock()) return false;
      node = node.next();
    }
    return true;
  }

  /**
   * 是否为标记元素
   */
  isMark(): boolean {
    return !!MARK_TAG_MAP[this.name];
  }

  /**
   * 是否为卡片
   */
  isCard(): boolean {
    return !!this.attr(CARD_TYPE_KEY);
  }

  /**
   * 是否为块级卡片
   */
  isBlockCard(): boolean {
    return this.attr(CARD_TYPE_KEY) === "block";
  }

  /**
   * 是否为空元素
   */
  public isVoid(): boolean {
    return !!VOID_TAG_MAP[this.name];
  }

  /**
   * 是否为实体元素
   */
  public isSolid(): boolean {
    return !!SOLID_TAG_MAP[this.name];
  }

  /**
   * 是否为标题元素
   */
  public isHeading(): boolean {
    return !!HEADING_TAG_MAP[this.name];
  }

  /**
   * 是否为标题
   */
  public isTitle(): boolean {
    return !!TITLE_TAG_MAP[this.name];
  }

  /**
   * 是否为表格元素
   */
  public isTable(): boolean {
    return !!TABLE_TAG_MAP[this.name];
  }

  /**
   * 是否为根元素
   */
  public isRoot(): boolean {
    return this.attr(ROOT_KEY) === ROOT;
  }

  // ========== 节点类型判断方法 end ==========

  /**
   * 是否可编辑
   */
  public isEditable(): boolean {
    if (this.isRoot()) {
      return false;
    }
    return this.closest(ROOT_SELECTOR).length > 0;
  }

  // ========== 事件处理方法 ==========

  /**
   * 绑定事件
   * @param eventType - 事件类型
   * @param listener - 事件监听器
   */
  public on(eventType: string, listener: EventCallback): NodeModelInterface {
    this.each((node, index) => {
      node.addEventListener(eventType, listener);
      this.events.get(index.toString())?.on(eventType, listener);
    });
    return this as NodeModelInterface;
  }

  /**
   * 解绑事件
   * @param eventType - 事件类型
   * @param listener - 可选的事件监听器
   */
  public off(eventType: string, listener?: EventCallback): NodeModelInterface {
    this.each((node, index) => {
      if (listener) {
        node.removeEventListener(eventType, listener as EventListener);
        this.events.get(index.toString())?.off(eventType, listener);
      } else {
        this.events.get(index.toString())?.off(eventType);
      }
    });
    return this as NodeModelInterface;
  }

  /**
   * 移除所有事件
   */
  public removeAllEvents(): NodeModelInterface {
    this.each((node, index) => {
      this.events.get(index.toString())?.destroy();
      this.events.delete(index.toString());
    });
    return this as NodeModelInterface;
  }

  // ========== 几何属性方法 ==========

  /**
   * 获取边界矩形
   * @param defaultValue - 默认值
   */
  public getBoundingClientRect(defaultValue?: DOMRect): DOMRect {
    if (this.length === 0) {
      return defaultValue || new DOMRect();
    }

    const element = this[0] as Element;
    if (element.getBoundingClientRect) {
      return element.getBoundingClientRect();
    }

    return defaultValue || new DOMRect();
  }
  /**
   * 获取偏移位置
   */
  public offset(): { top: number; left: number } {
    if (this.length === 0) {
      return { top: 0, left: 0 };
    }

    const rect = this.getBoundingClientRect();
    const win = this.win;

    return {
      top: rect.top + win.pageYOffset,
      left: rect.left + win.pageXOffset,
    };
  }

  // ========== 内容操作方法 begin ==========

  /**
   * 获取或设置 HTML 内容
   */
  public html(): string;
  public html(val: string): NodeModelInterface;
  public html(val?: string): string | NodeModelInterface {
    if (val !== undefined) {
      // 设置 HTML
      this.each((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          (node as Element).innerHTML = val;
        }
      });
      return this;
    }

    // 获取 HTML
    if (this.length === 0) {
      return "";
    }

    const element = this[0] as Element;
    return element.innerHTML || "";
  }

  /**
   * 获取文本内容
   */
  public text(): string {
    if (this.length === 0) {
      return "";
    }

    return this[0].textContent || "";
  }

  // ========== 内容操作方法 end ==========

  // ========== 显示控制方法 begin ==========

  /**
   * 显示元素
   * @param display - 显示类型
   */
  public show(display?: string): NodeModelInterface {
    this.each((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        element.style.display = display || "";
      }
    });
    return this as NodeModelInterface;
  }

  /**
   * 隐藏元素
   */
  public hide(): NodeModelInterface {
    this.each((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        element.style.display = "none";
      }
    });
    return this as NodeModelInterface;
  }

  // ========== 显示控制方法 end ==========

  // ========== DOM 操作方法 ==========

  /**
   * 移除元素
   */
  public remove(): NodeModelInterface {
    this.each((node) => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
    return this as NodeModelInterface;
  }

  /**
   * 清空内容
   */
  public empty(): NodeModel {
    this.each((node) => {
      while (node.firstChild) {
        node.removeChild(node.firstChild);
      }
    });
    return this as NodeModel;
  }

  /**
   * 克隆节点
   * @param deep - 是否深度克隆
   */
  public clone(deep?: boolean): NodeModel {
    if (this.length === 0) {
      return new NodeModel([]) as NodeModel;
    }

    const cloned = this[0].cloneNode(deep !== false);
    return new NodeModel(cloned) as NodeModel;
  }

  /**
   * 在开头插入内容
   * @param content - 内容
   */
  public prepend(
    content: string | Node | NodeModel | NodeModelInterface
  ): NodeModelInterface {
    const nodes =
      content instanceof NodeModel
        ? content.toArray()
        : typeof content === "string"
          ? exprToNodes(content)
          : [content as Node];

    this.each((node) => {
      nodes.forEach((newNode) => {
        const clonedNode = newNode.cloneNode(true);
        if (node.firstChild) {
          node.insertBefore(clonedNode, node.firstChild);
        } else {
          node.appendChild(clonedNode);
        }
      });
    });

    return this as NodeModelInterface;
  }

  /**
   * 在末尾插入内容
   * @param content - 内容
   */
  public append(
    content: string | Node | NodeModel | NodeModelInterface
  ): NodeModelInterface {
    const nodes =
      content instanceof NodeModel
        ? content.toArray()
        : typeof content === "string"
          ? exprToNodes(content)
          : [content as Node];

    this.each((node) => {
      nodes.forEach((newNode) => {
        const clonedNode = newNode.cloneNode(true);
        node.appendChild(clonedNode);
      });
    });

    return this as NodeModelInterface;
  }

  /**
   * 在前面插入内容
   * @param content - 内容
   */
  public before(
    content: string | Node | NodeModel | NodeModelInterface
  ): NodeModelInterface {
    const nodes =
      content instanceof NodeModel
        ? content.toArray()
        : typeof content === "string"
          ? exprToNodes(content)
          : [content as Node];

    this.each((node) => {
      if (node.parentNode) {
        nodes.forEach((newNode: Node) => {
          const clonedNode = newNode.cloneNode(true);
          node.parentNode!.insertBefore(clonedNode, node);
        });
      }
    });

    return this as NodeModelInterface;
  }

  /**
   * 在后面插入内容
   * @param content - 内容
   */
  public after(
    content: string | Node | NodeModel | NodeModelInterface
  ): NodeModelInterface {
    const nodes =
      content instanceof NodeModel
        ? content.toArray()
        : typeof content === "string"
          ? exprToNodes(content)
          : [content as Node];

    this.each((node) => {
      if (node.parentNode) {
        const nextSibling = node.nextSibling;
        nodes.forEach((newNode) => {
          const clonedNode = newNode.cloneNode(true) as Node;
          if (nextSibling) {
            node.parentNode!.insertBefore(clonedNode, nextSibling);
          } else {
            node.parentNode!.appendChild(clonedNode);
          }
        });
      }
    });

    return this as NodeModelInterface;
  }

  /**
   * 替换内容
   * @param content - 内容
   */
  public replaceWith(
    content: string | Node | NodeModel | NodeModelInterface
  ): NodeModelInterface {
    const nodes =
      content instanceof NodeModel
        ? content.toArray()
        : typeof content === "string"
          ? exprToNodes(content)
          : [content as Node];

    this.each((node) => {
      if (node.parentNode && nodes.length > 0) {
        // 插入新节点
        nodes.forEach((newNode) => {
          const clonedNode = newNode.cloneNode(true);
          node.parentNode!.insertBefore(clonedNode, node);
        });

        // 移除原节点
        node.parentNode.removeChild(node);
      }
    });

    return new NodeModel(nodes) as NodeModelInterface;
  }

}

export default (
  expr: string | Node | NodeModel | Node[] | NodeModel[],
  root?: Node
): NodeModel => {
  const nodes = exprToNodes(expr, root);
  return new NodeModel(nodes, root) as NodeModel;
};
