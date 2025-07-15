import {
  BlockComponentData,
  BlockValue,
  CardType,
  EventCallback,
  RangeInterface,
} from "../types";
import { getActiveMarks, getClosest } from "../utils/mark";
import { getActiveBlocks } from "../utils/block";
import {
  fetchAllChildren,
  getClosestBlock,
  getWindow,
  isEmptyNode,
  isEmptyNodeWithTrim,
} from "../utils/node";
import { BlockManager } from "./block";
import DOMEventManager from "./dom-event";
import { HistoryManager } from "./history";
import getNodeModel, { NodeModel } from "./node";
import {
  createBookmark,
  moveToBookmark,
  shrinkRange,
  upRange,
} from "../utils/range";
import {
  ROOT,
  CARD_CENTER_SELECTOR,
  CARD_ELEMENT_KEY,
  CARD_TYPE_KEY,
  ROOT_SELECTOR,
} from "../constants";
import { ParserHtml } from "../parser/html";
import { removeEmptyMarksAndAddBr } from "../changes/utils/mark";
import {
  ANCHOR_SELECTOR,
  CURSOR_SELECTOR,
  FOCUS_SELECTOR,
} from "../constants/bookmark";
import { insertFragment } from "../changes/insert";

/**
 * 变更管理器配置选项
 */
export interface ChangeManagerOptions {
  /** 引擎实例 */
  engine: any;

  /** 模式管理器 */
  schema: any;

  /** 转换管理器 */
  conversion: any;

  /** 卡片管理器 */
  block: BlockManager;

  /** 内容变更回调 */
  onChange: EventCallback<string>;

  /** 选区变更回调 */
  onSelect: EventCallback;

  /** 设置值回调 */
  onSetValue: EventCallback;
}

/**
 * 变更管理器类
 *
 * 负责处理编辑器的所有内容变更操作，包括：
 * - 选区管理
 * - 内容插入和删除
 * - 卡片操作
 * - 历史记录管理
 * - DOM 事件处理
 *
 * @example
 * ```typescript
 * const changeManager = new ChangeManager(editArea, {
 *   engine: engineInstance,
 *   schema: schemaInstance,
 *   conversion: conversionInstance,
 *   block: blockManager,
 *   onChange: (value) => console.log('Changed:', value),
 *   onSelect: () => console.log('Selection changed'),
 *   onSetValue: () => console.log('Value set')
 * });
 * ```
 */
export class ChangeManager {
  // ========== 核心属性 ==========

  /** 编辑区域 */
  public readonly editArea: NodeModel;

  /** 配置选项 */
  public readonly options: ChangeManagerOptions;

  /** 引擎实例 */
  public readonly engine: any;

  /** 模式管理器 */
  public readonly schema: any;

  /** 转换管理器 */
  public readonly conversion: any;

  /** 卡片管理器 */
  public readonly block: BlockManager;

  /** 窗口对象 */
  public readonly win: Window;

  /** 文档对象 */
  public readonly doc: any;

  // ========== 管理器实例 ==========

  /** DOM 事件管理器 */
  public readonly domEvent: DOMEventManager;

  /** 历史管理器 */
  public readonly history: HistoryManager;

  // ========== 状态属性 ==========

  /** 当前选区 */
  private currentRange: RangeInterface | null = null;

  /** 变更回调 */
  public onChange: EventCallback<string>;

  /** 选区变更回调 */
  private onSelect: EventCallback;

  /** 设置值回调 */
  private onSetValue: EventCallback;

  private activeBlock: NodeModel | undefined;

  private blocks: NodeModel[];

  private marks: NodeModel[];
  /**
   * 构造函数
   * @param editArea - 编辑区域
   * @param options - 配置选项
   */
  constructor(editArea: NodeModel, options: ChangeManagerOptions) {
    this.editArea = editArea;
    this.options = options;
    this.engine = options.engine;
    this.schema = options.schema;
    this.conversion = options.conversion;
    this.block = options.block || new BlockManager(this.engine);
    this.onChange = options.onChange;
    this.onSelect = options.onSelect;
    this.onSetValue = options.onSetValue;
    this.activeBlock = undefined;
    this.blocks = [];
    this.marks = [];
    // 初始化窗口和文档对象
    this.win = getWindow(editArea[0]);
    this.doc = editArea.doc;

    this.domEvent = new DOMEventManager(this);
    this.history = new HistoryManager(this, {
      onSave: (value: string) => {
        const range = this.getRange();
        this.marks = getActiveMarks(range);
        this.blocks = getActiveBlocks(range);
        this.change(value);
      },
    });
    // 初始化原生事件
    this.initializeNativeEvents();
  }

  change(value?: string) {
    this.block.gc();
    this.onChange(value || this.getValue());
  }

  public getSelectionRange() {
    const selection = this.win.getSelection()!;
    let range;
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      range = this.doc.createRange();
      range.selectNodeContents(this.editArea[0]);
      shrinkRange(range);
      range.collapse(false);
    }
    return range;
  }

  private initializeNativeEvents() {
    this.editArea.on("keydown", (e: KeyboardEvent) => {
      if (
        this.engine.isReadonly ||
        this.block.closest(e.target as Node) ||
        this.history.hasUndo ||
        this.history.hasRedo
      ) {
        return;
      }
    });
    // 初始化原生事件
    this.editArea.on("change", (value: string) => {
      this.onChange(value);
    });
    this.editArea.on("select", (range: RangeInterface) => {
      this.onSelect(range);
    });
    this.editArea.on("set-value", (value: string) => {
      this.onSetValue(value);
    });
  }

  getRange(): RangeInterface {
    if (this.currentRange) {
      return this.currentRange;
    }
    return this.getSelectionRange();
  }
  insertInline(br: NodeModel) {
    throw new Error("Method not implemented.");
  }
  private focusRang(range: RangeInterface) {
    const node = getNodeModel(range.startContainer);
    const startOffset = range.startOffset;
    const blockRoot = this.block.closest(node);
    if (blockRoot) {
      const node_center = blockRoot.find(CARD_CENTER_SELECTOR)[0];
      if (
        node_center &&
        (!node.isElement() ||
          node[0].parentNode !== blockRoot[0] ||
          node.attr(CARD_ELEMENT_KEY))
      ) {
        const comparePoint = () => {
          const doc_rang = document.createRange();
          doc_rang.selectNodeContents(node_center);
          return doc_rang.comparePoint(node[0], startOffset) < 0;
        };

        if ("inline" === blockRoot.attr(CARD_TYPE_KEY)) {
          range.selectNode(blockRoot[0]);
          range.collapse(comparePoint());
          return;
        }

        if (comparePoint()) {
          this.block.focusPrevBlock(range, blockRoot, true);
        } else {
          this.block.focusNextBlock(range, blockRoot, true);
        }
      }
    }
  }
  private repairRange(range: RangeInterface) {
    // 判断 Range 是否可编辑，不可编辑时焦点自动移到编辑区域内
    const ancestor = getNodeModel(range.commonAncestorContainer);
    if (!ancestor.isRoot() && !ancestor.isEditable()) {
      range.selectNodeContents(this.editArea[0]);
      shrinkRange(range);
      range.collapse(false);
    }

    let rangeClone = range.cloneRange();
    rangeClone.collapse(true);
    this.focusRang(rangeClone);
    range.setStart(rangeClone.startContainer, rangeClone.startOffset);

    rangeClone = range.cloneRange();
    rangeClone.collapse(false);
    this.focusRang(rangeClone);
    range.setEnd(rangeClone.endContainer, rangeClone.endOffset);

    if (range.collapsed) {
      rangeClone = range.cloneRange();
      upRange(rangeClone);

      const startNode = getNodeModel(rangeClone.startContainer);
      const startOffset = rangeClone.startOffset;

      if (startNode.name === "a" && startOffset === 0) {
        range.setStartBefore(startNode[0]);
      }
      if (
        startNode.name === "a" &&
        startOffset === startNode[0].childNodes.length
      ) {
        range.setStartAfter(startNode[0]);
      }
      range.collapse(true);
    }
  }
  // 插入并渲染Block
  insertBlock(name: string, value: BlockValue) {
    const component = this.block.createComponent({
      name,
      value,
      engine: this.engine,
      contentView: null,
    })!;
    const range = this.getRange();
    this.repairRange(range);
    const blockRoot = this.block.insertNode(range, component, this.engine)!;

    if (component.type === "inline") {
      this.block.focus(range, blockRoot, false);
      this.select(range);
    } else {
      // 块级卡片前面预留一个空行
      this.block.focus(range, blockRoot, true);
      this.repairRange(range);
      const prevBlock = getClosestBlock(getNodeModel(range.startContainer))!;
      if (prevBlock.text().trim() !== "") {
        blockRoot.before("<p><br /></p>");
      }
      // 块级卡片后面面预留一个空行
      this.block.focus(range, blockRoot, false);
      this.repairRange(range);

      const nextBlock = getClosestBlock(getNodeModel(range.startContainer))!;
      if (nextBlock.text().trim() !== "") {
        const empty_node = getNodeModel("<p><br /></p>");
        blockRoot.after(empty_node);
        range.setStart(empty_node[0], 1);
        range.collapse(true);
      }
    }
    if (component.type === "block") {
      this.activateBlock(blockRoot[0], "insertCard");
    }
    this.history.save(false);
    return blockRoot;
  }

  insertFragment(fragment: DocumentFragment, callback: () => void) {
    const range = this.getRange();
    this.repairRange(range);
    this.select(range);
    insertFragment(range, this.block, fragment, callback);
  }

  getValue() {
    return this.getValueAndDOM(["value"]).value || "";
  }

  getSelection() {
    throw new Error("Method not implemented.");
  }

  select(range: RangeInterface) {
    const selection = this.win.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    this.currentRange = range;
    return this;
  }

  getValueAndDOM(types: string[] = ["value", "dom"]) {
    const range = this.getRange();
    let value, dom;
    if (
      getNodeModel(range.commonAncestorContainer).closest(CARD_CENTER_SELECTOR)
        .length > 0
    ) {
      if (types.includes("value")) {
        value = new ParserHtml(
          this.editArea[0],
          this.schema,
          this.conversion,
          () => {}
        ).toValue();
      }
      if (types.includes("dom")) {
        dom = this.editArea[0].cloneNode(true);
      }
    } else {
      const bookmark = createBookmark(range);
      if (types.includes("value")) {
        value = new ParserHtml(
          this.editArea[0],
          this.schema,
          this.conversion,
          () => {}
        ).toValue();
      }
      if (types.includes("dom")) {
        dom = this.editArea[0].cloneNode(true);
      }
      moveToBookmark(range, bookmark);
    }
    return {
      value,
      dom,
    };
  }

  activateBlock(activeNode: Node, triggerType: string) {
    const activeNodeItem = getNodeModel(activeNode);
    const editArea = activeNodeItem.closest(ROOT_SELECTOR);

    if (!editArea[0] || this.editArea[0] === editArea[0]) {
      let blockRoot = this.block.closest(activeNode);
      if (
        this.block.isLeftCursor(activeNode) ||
        this.block.isRightCursor(activeNode)
      ) {
        blockRoot = undefined;
      }
      let isSameCard =
        blockRoot && this.activeBlock && blockRoot[0] === this.activeBlock[0];

      if (["updateCard"].indexOf(triggerType) >= 0) {
        isSameCard = false;
      }
      if (this.activeBlock && !isSameCard) {
        this.block.hideToolbar(this.activeBlock);
        const component = this.block.getComponent(this.activeBlock);

        if (component) {
          if (component.unActivate) {
            component.blockRoot.removeClass("daphne-activated");
            component.state.activated = false;
          }

          if ("block" === component.type) {
            this.engine.readonly(false);
          }
        }
      }

      if (blockRoot) {
        const component = this.block.getComponent(blockRoot);
        if (component) {
          if (component.state.activatedByOther) {
            return;
          }
          if (!isSameCard) {
            this.block.showToolbar(blockRoot);
            if (
              component.type === "inline" &&
              component.autoSelected !== false &&
              (triggerType !== "click" ||
                (component.state && !component.state.readonly))
            ) {
              this.selectBlock(blockRoot);
            }

            if (component.activate) {
              component.blockRoot.addClass("daphne-activated");
              component.activate(blockRoot);
              component.state.activated = true;
            }

            if (component.type === "block") {
              this.selectComponent(component, false);
              this.engine.readonly(true);
            }
          }
        }
      }
    }
  }

  private selectComponent(component: BlockComponentData, selected: boolean) {
    if (
      (component && component.state.readonly) ||
      component.state.activatedByOther
    ) {
      return;
    }
    if (selected) {
      if (!component.state.selected) {
        component.blockRoot.addClass(`${ROOT}-selected`);
        if (component.select) {
          component.select();
        }
        component.state.selected = selected;
      }
    }
    if (component.state.selected) {
      component.blockRoot.removeClass("lake-selected");
      if (component.unSelect) {
        component.unSelect();
      }
      component.state.selected = selected;
    }
  }

  selectBlock(root: NodeModel) {
    const component = this.block.getComponent(root)!;
    const { singleSelectable } = component;
    if (
      singleSelectable !== false &&
      (component.type !== CardType.BLOCK || !component.state.activated)
    ) {
      let rootEl = root[0];

      const range = this.getRange();
      const parentNode = rootEl.parentNode!;
      const nodes = Array.prototype.slice.call(parentNode.childNodes);
      const index = nodes.indexOf(root);
      range.setStart(parentNode, index);
      range.setEnd(parentNode, index + 1);
      this.select(range);
    }
  }

  focusBlok(block: NodeModel) {
    const range = this.getRange();
    this.block.focus(range, block, false);
    this.select(range);
    this.history.update();
    this.onSelect(block);
  }

  // 焦点放到编辑区域
  focus() {
    const range = this.getRange();
    this.select(range);
    (this.editArea[0] as HTMLLinkElement).focus();
    return this;
  }

  focusToStart() {
    const range = this.getRange();
    range.selectNodeContents(this.editArea[0]);
    shrinkRange(range);
    range.collapse(true);
    this.select(range);
    (this.editArea[0] as HTMLElement).focus();
    return this;
  }

  /**
   * 焦点移到结束位置
   */
  focusToEnd(): void {
    const range = document.createRange() as RangeInterface;
    range.selectNodeContents(this.editArea[0]);
    range.collapse(false);
    this.select(range);
  }

  /**
   * 失去焦点
   */
  blur(): void {
    (this.editArea[0] as HTMLElement).blur();
  }
  // ========== 内容操作方法 ==========

  /**
   * 设置编辑器内容
   * @param value - HTML 内容
   */
  setValue(value: string = "") {
    const range = this.getRange();

    if (value === "") {
      range.setStart(this.editArea[0], 0);
      range.collapse(true);
      this.select(range);
    } else {
      const parser = new ParserHtml(
        value,
        this.schema,
        this.conversion,
        (root: NodeModel) => {
          fetchAllChildren(root).forEach((node) => {
            removeEmptyMarksAndAddBr(node);
          });
        }
      );
      this.editArea.html(parser.toLowerValue());
      this.block.renderAll(this.editArea, this.engine, null);
      const cursor = this.editArea.find(CURSOR_SELECTOR);
      let bookmark;
      if (cursor.length > 0) {
        bookmark = {
          anchor: cursor[0],
          focus: cursor[0],
        };
      }
      const anchor = this.editArea.find(ANCHOR_SELECTOR);
      const focus = this.editArea.find(FOCUS_SELECTOR);

      if (anchor.length > 0 && focus.length > 0) {
        bookmark = {
          anchor: anchor[0],
          focus: focus[0],
        };
      }
      if (bookmark) {
        moveToBookmark(range, bookmark);
        this.select(range);
      }
    }

    this.onSetValue(value);
    this.history.save(false);
  }

  isEmpty() {
    return isEmptyNodeWithTrim(this.editArea[0]);
  }

  removeBlock(blockRoot: NodeModel) {
    const range = this.getRange();
    if (this.block.isInline(blockRoot)) {
      range.setEndAfter(blockRoot[0]);
      range.collapse(false);
    } else {
      this.block.focusPrevBlock(range, blockRoot, true);
    }
    const parent = blockRoot.parent()!;
    this.block.removeNode(blockRoot, this.engine);
    if (isEmptyNode(parent[0])) {
      if (parent.isRoot()) {
        parent.html("<p><br /></p>");
        range.selectNodeContents(parent[0]);
        shrinkRange(range);
        range.collapse(false);
      } else {
        parent.html("<br />");
        range.selectNodeContents(parent[0]);
        range.collapse(false);
      }
    }

    this.select(range);
    this.history.save(false);
  }
}
