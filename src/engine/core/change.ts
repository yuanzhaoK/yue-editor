import { BlockComponentData, CardType, EventCallback, RangeInterface } from "../types";
import { getActiveMarks } from "../utils/mark";
import { getActiveBlocks } from "../utils/block";
import { getWindow } from "../utils/node";
import { BlockManager } from "./block";
import DOMEventManager from "./dom-event";
import { HistoryManager } from "./history";
import getNodeModel, { NodeModel } from "./node";
import { shrinkRange } from "../utils/range";
import { BRAND, ROOT_SELECTOR } from "../constants";

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


  private activeBlock: NodeModel | undefined
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
    this.block = options.block;
    this.onChange = options.onChange;
    this.onSelect = options.onSelect;
    this.onSetValue = options.onSetValue;
    this.activeBlock = undefined


    // 初始化窗口和文档对象
    this.win = getWindow(editArea[0]);
    this.doc = editArea.doc;


    this.domEvent = new DOMEventManager(this.editArea, this.win);
    this.history = new HistoryManager(this, {
      onSave: (value: string) => {
        const range = this.getRange()
        const marks = getActiveMarks(range)
        const blocks = getActiveBlocks(range)
        this.change(value)
      }
    });


    // 初始化原生事件
    this.initializeNativeEvents();
  }
  change(value: string) {
    this.block.gc()
    this.onChange(value || this.getValue())
  }

  public getSelectionRange() {
    const selection = this.win.getSelection()!
    let range
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0)
    } else {
      range = this.doc.createRange()
      range.selectNodeContents(this.editArea[0])
      shrinkRange(range)
      range.collapse(false)
    }
    return range
  }

  private initializeNativeEvents() {
    this.editArea.on('keydown', (e: KeyboardEvent) => {
      if (this.engine.isReadonly ||
        this.block.closest(e.target as Node) ||
        this.history.hasUndo ||
        this.history.hasRedo) {
        return;
      }
    })
    // 初始化原生事件
    this.editArea.on('change', (value: string) => {
      this.onChange(value);
    });
    this.editArea.on('select', (range: RangeInterface) => {
      this.onSelect(range);
    });
    this.editArea.on('set-value', (value: string) => {
      this.onSetValue(value);
    });
  }

  getRange(): RangeInterface {
    if (this.currentRange) {
      return this.currentRange
    }
    return this.getSelectionRange()
  }

  insertInline(br: NodeModel) {
    throw new Error("Method not implemented.");
  }
  insertBlock(br: NodeModel) {
    throw new Error("Method not implemented.");
  }
  getValue() {
    return ''
  }
  setValue(value: string) {
    throw new Error("Method not implemented.");
  }
  getSelection() {
    throw new Error("Method not implemented.");
  }

  select(range: RangeInterface) {
    const selection = this.win.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    this.currentRange = range
    return this
  }

  getValueAndDOM() {
    return {
      value: this.getValue(),
      dom: this.editArea[0]
    }
  }

  activateBlock(activeNode: Node, triggerType: string) {
    const activeNodeItem = getNodeModel(activeNode)

    const editArea = activeNodeItem.closest(ROOT_SELECTOR);

    if (!editArea[0] || this.editArea[0] === editArea[0]) {
      let blockRoot = this.block.closest(activeNode)
      if (this.block.isLeftCursor(activeNode) || this.block.isRightCursor(activeNode)) {
        blockRoot = undefined
      }
      let isSameCard = blockRoot && this.activeBlock && blockRoot[0] === this.activeBlock[0]

      if (['updateCard'].indexOf(triggerType) >= 0) {
        isSameCard = false
      }
      if (this.activeBlock && !isSameCard) {
        this.block.hideToolbar(this.activeBlock)
        const component = this.block.getComponent(this.activeBlock)

        if (component) {
          if (component.unActivate) {
            component.blockRoot.removeClass('daphne-activated')
            component.state.activated = false
          }

          if ('block' === component.type) {
            this.engine.readonly(false)
          }
        }
      }

      if (blockRoot) {
        const component = this.block.getComponent(blockRoot)
        if (component) {
          if (component.state.activatedByOther) {
            return
          }
          if (!isSameCard) {
            this.block.showToolbar(blockRoot)
            if (component.type === 'inline' && component.autoSelected !== false && (triggerType !== 'click' || component.state && !component.state.readonly)) {
              this.selectBlock(blockRoot)
            }

            if (component.activate) {
              component.blockRoot.addClass("daphne-activated")
              component.activate(blockRoot)
              component.state.activated = true
            }

            if (component.type === 'block') {
              this.selectComponent(component, false)
              this.engine.readonly(true)
            }
          }
        }
      }
    }
  }
  private selectComponent(component: BlockComponentData, selected: boolean) {
    if (component && component.state.readonly || component.state.activatedByOther) {
      return
    }
    if (selected) {
      if (!component.state.selected) {
        component.blockRoot.addClass(`${BRAND}-selected`)
        if (component.select) {
          component.select()
        }
        component.state.selected = selected
      }
    } if (component.state.selected) {
      component.blockRoot.removeClass("lake-selected")
      if (component.unSelect) {
        component.unSelect()
      }
      component.state.selected = selected
    }
  }
  
  selectBlock(root: NodeModel) {
    const component = this.block.getComponent(root)!
    const { singleSelectable } = component
    if (singleSelectable !== false && (component.type !== CardType.BLOCK || !component.state.activated)) {
      let rootEl = root[0]

      const range = this.getRange()
      const parentNode = rootEl.parentNode!
      const nodes = Array.prototype.slice.call(parentNode.childNodes)
      const index = nodes.indexOf(root)
      range.setStart(parentNode, index)
      range.setEnd(parentNode, index + 1)
      this.select(range)
    }
  }

  focusBlok(block: NodeModel) {
    const range = this.getRange()
    this.block.focus(range, block, false)
    this.select(range)
    this.history.update()
    this.onSelect(block)
  }
}