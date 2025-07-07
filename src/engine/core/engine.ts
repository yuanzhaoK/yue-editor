/**
 * Daphne Editor Engine - Engine Core 
 *
 * 编辑器引擎核心类，负责整个编辑器的生命周期管理
 * 这是整个编辑器系统的入口点和控制中心
 */

import {
  EngineOptions,
  LanguageInterface,
  ToolbarInterface,
  SidebarInterface,
  NodeModelInterface,
  ParserInterface,
  EventCallback
} from '../types';

import { BlockManager } from './block'


// 语言包
import langEN from '../lang/en';
import langZHCN from '../lang/zh-cn';
import { NodeModel } from './node';
import EventModel, { AsyncEventModel } from './event';
import DOMEventManager from './dom-event';
import CommandManager from './command';
import { CARD_SELECTOR, ROOT, ROOT_KEY } from '../constants';
import { DAPHNE_ELEMENT } from '../constants/bookmark';
import { createBookmark, moveToBookmark } from '../utils/range';
import { removeMinusStyle } from '../utils/node';
import { addOrRemoveBr } from '../utils/block';
import { ChangeManager } from './change';
import { HistoryManager } from './history';


const block = new BlockManager();
const setAttributes = () => { }
const removeAttributes = () => { }
const clickBottomArea = () => { }


/**
 * 语言包映射
 */
const LANGUAGE_MAP: Record<string, LanguageInterface> = {
  'en': langEN,
  'zh-cn': langZHCN
};



/**
 * 编辑器引擎类
 *
 * 这是整个编辑器的核心类，负责：
 * - 编辑区域的初始化和管理
 * - 插件系统的管理
 * - 事件系统的管理
 * - 变更和历史记录的管理
 * - 与外部系统的接口
 *
 * @example
 * ```typescript
 * const engine = new Engine('#editor', {
 *   lang: 'zh-cn',
 *   plugins: ['bold', 'italic', 'image']
 * });
 *
 * engine.on('change', (value) => {
 *   console.log('Content changed:', value);
 * });
 *
 * engine.setValue('<p>Hello World</p>');
 * ```
 */
export class Engine {
  // ========== 核心属性 ==========

  /** 编辑区域节点 */
  public readonly editArea: NodeModel;

  /** 配置选项 */
  public readonly options: EngineOptions;

  /** 父节点 */
  public readonly parentNode: NodeModel;

  /** 语言包 */
  public readonly lang: LanguageInterface;

  /** 是否只读模式 */
  public isReadonly: boolean = false;

  /** 异步事件管理器 */
  public readonly asyncEvent: AsyncEventModel;

  // ========== 管理器实例 ==========




  /** 事件管理器 */
  public readonly event: EventModel;

  /** DOM 事件管理器 */
  public readonly domEvent: DOMEventManager;

  /** 命令管理器 */
  public readonly command: CommandManager;

  /** 变更管理器 */
  public readonly change: ChangeManager;

  /** 卡片管理器 */
  public readonly block: BlockManager;



  /** 工具栏接口 */
  public toolbar: ToolbarInterface = {
    set: () => { },
    updateState: () => { },
    restore: () => { },
    disable: () => { },
    show: () => { },
    hide: () => { }
  };

  /** 侧边栏接口 */
  public sidebar: SidebarInterface = {
    set: () => { },
    close: () => { },
    restore: () => { }
  };
  schema: any;
  conversion: any;
  history: HistoryManager;
  /**
 * 构造函数
 * @param container - 编辑器容器，可以是选择器字符串或 DOM 元素
 * @param options - 配置选项
 */
  constructor(container: string | Node, options: EngineOptions = {}) {
    // 初始化编辑区域
    this.editArea = new NodeModel(container);
    this.options = { ...options };
    // 设置编辑区域属性
    this.setAttributes();

    // 初始化父节点
    this.parentNode = new NodeModel(this.options.parentNode || document.body);

    // 初始化语言包
    this.lang = LANGUAGE_MAP[this.options.lang || 'zh-cn'];

    // 初始化管理器
    this.event = new EventModel(this);
    this.block = new BlockManager(this);


    // 初始化变更管理器
    this.change = new ChangeManager(this.editArea, {
      engine: this,
      schema: this.schema,
      conversion: this.conversion,
      block: this.block,
      onChange: (value: string) => (this.event.trigger('change', value)),
      onSelect: () => this.event.trigger('select'),
      onSetValue: () => this.event.trigger('setvalue')
    });
    this.history = this.change.history

    this.asyncEvent = new AsyncEventModel(this);

    this.block = new BlockManager();

    this.isReadonly = false;

    // 初始化插件
    this.initializePlugins();

    // 初始化事件
    this.initializeEvents();
  }

  // ========== 静态方法 ==========

  /**
   * 创建引擎实例的工厂方法
   * @param container - 编辑器容器
   * @param options - 配置选项
   * @returns 引擎实例
   */
  static create(container: string | HTMLElement, options?: EngineOptions): Engine {
    return new Engine(container, options);
  }


  private typingKeydown(e: KeyboardEvent) {
    if (this.isReadonly) {
      return
    }

    if (this.block.closest(e.target as Node)) {
      return
    }

    // if (isHotkey('enter', e) && this.event.trigger('keydown:enter', e) !== false) {
    //   enter.call(this, e)
    //   return
    // }

    // if (isHotkey('shift+enter', e)) {
    //   shiftEnter.call(this, e)
    //   return
    // }

    // if (isHotkey('backspace', e) && this.event.trigger('keydown:backspace', e) !== false) {
    //   backspace.call(this, e)
    //   return
    // }

    // if (isHotkey('tab', e) && this.event.trigger('keydown:tab', e) !== false) {
    //   tab.call(this, e)
    //   return
    // }

    // if (isHotkey('shift+tab', e)) {
    //   shiftTab.call(this, e)
    //   return
    // }

    const range = this.change.getRange()
    const cardRoot = this.block.closest(range.commonAncestorContainer)

    if (cardRoot) {
      // let result
      // if (cardRoot.attr(CARD_TYPE_KEY) === 'inline') {
      //   result = inlineCard.call(this, cardRoot, e)
      // } else {
      //   result = blockCard.call(this, cardRoot, e)
      // }

      // if (result === false) {
      //   return
      // }
    }

    if (e.key === ' ') {
      this.event.trigger('keydown:space', e)
      return
    }
    // 在 Windows 下使用中文输入法， keyCode 为 229，需要通过 code 判断
    if (e.key === '@' || e.shiftKey && e.keyCode === 229 && e.code === 'Digit2') {
      this.event.trigger('keydown:at', e)
      return
    }
    // 搜狗输入法在中文输入状态下，输入“/”变成“、”，所以需要加额外的 keyCode 判断
    // Windows 下用微软拼音输入法（即系统默认输入法）时，输入“/”后，keyCode 为 229
    // if (e.key === '/' || isHotkey('/', e) || e.keyCode === 229 && e.code === 'Slash') {
    //   this.event.trigger('keydown:slash', e)
    //   return
    // }

    // if (isHotkey('mod+a', e)) {
    //   this.event.trigger('keydown:selectall', e)
    //   return
    // }
  }

  private typingKeyup(e: KeyboardEvent) {
    throw new Error('Method not implemented.');
  }

  private initializeEvents() {
    // 输入事件处理
    this.editArea.on('input', (e: Event) => {
      if (this.isReadonly || this.block.closest(e.target as Node)) {
        return;
      }
      addOrRemoveBr(this.change.getRange(), 'left');
    });

    // 点击底部区域事件
    this.editArea.on('click', (e: MouseEvent) => {
      this.handleClickBottomArea(e);
    });

    // 键盘事件
    this.editArea.on('keydown', (e: KeyboardEvent) => {
      return this.typingKeydown(e);
    });

    this.editArea.on('keyup', (e: KeyboardEvent) => {
      return this.typingKeyup(e);
    });

    // 焦点事件
    this.editArea.on('focus', () => {
      this.event.trigger('focus');
    });

    this.editArea.on('blur', () => {
      this.event.trigger('blur');
    });
  }

  handleClickBottomArea(e: MouseEvent) {
    throw new Error('Method not implemented.');
  }


  private initializePlugins() {

  }

  private initializeCommand() {
  }


  /**
   * 规范化文档树结构
   * @private
   */
  private normalizeTree(): void {
    let block = new NodeModel('<p />');
    const range = this.change.getRange();
    const bookmark = createBookmark(range);

    // 确保所有行内元素都在段落内
    this.editArea.children().each((node) => {
      const nodeModel = new NodeModel(node);

      if (nodeModel.isBlock()) {
        if (block.children().length > 0) {
          nodeModel.before(block);
        }
        block = new NodeModel('<p />');
      } else {
        block.append(nodeModel);
      }
    });

    if (block.children().length > 0) {
      this.editArea.append(block);
    }

    // 处理空段落
    this.editArea.children().each((node) => {
      const nodeModel = new NodeModel(node);
      removeMinusStyle(nodeModel, 'text-indent');

      if (nodeModel.isHeading()) {
        const childrenCount = nodeModel.children().length;

        if (childrenCount === 0) {
          nodeModel.remove();
        } else {
          const child = nodeModel.first();
          if (child && childrenCount === 1 && child.name === 'span' &&
            ['cursor', 'anchor', 'focus'].includes(child.attr(DAPHNE_ELEMENT) || '')) {
            nodeModel.prepend('<br />');
          }
        }
      }
    });

    moveToBookmark(range, bookmark);
  }




  public getHtml(parser: ParserInterface) {
    if (!parser)
      throw "Need to pass in a parser"
    const node = this.editArea[0].cloneNode(true) as HTMLElement
    node.removeAttribute("contenteditable")
    node.removeAttribute("tabindex")
    node.removeAttribute("autocorrect")
    node.removeAttribute("autocomplete")
    node.removeAttribute("spellcheck")
    node.removeAttribute("data-gramm")
    node.removeAttribute("role")
    const { html } = parser.parse(node)
    return html
  }

  destroy() {
    removeAttributes.call(this)
    this.editArea.removeAllEvents()
    this.domEvent.destroy()
    // this.block.gc()
  }


  isSub() {
    return this.editArea.closest(CARD_SELECTOR).length > 0
  }

  readonly(val: boolean) {
    if (this.isReadonly === val)
      return

    if (val) {
      this.editArea.attr('contenteditable', 'false')
    } else {
      this.editArea.attr('contenteditable', 'true')
    }

    this.event.trigger('readonly', val)
    this.isReadonly = val
  }

  setAttributes() {
    const { editArea, options } = this;

    editArea.attr(ROOT_KEY, ROOT);
    editArea.attr({
      'contenteditable': 'true',
      'role': 'textbox',
      'autocorrect': options.lang === 'en' ? 'on' : 'off',
      'autocomplete': 'off',
      'spellcheck': options.lang === 'en' ? 'true' : 'false',
      'data-gramm': 'false'
    });

    if (!editArea.hasClass('lake-engine')) {
      editArea.addClass('lake-engine');
    }

    if (options.tabIndex !== undefined) {
      editArea.attr('tabindex', options.tabIndex);
    }

    if (options.className) {
      editArea.addClass(options.className);
    }
  }

  removeAttributes() {
    const editArea = this.editArea
    const options = this.options
    editArea.removeAttr(ROOT_KEY)
    editArea.removeAttr('contenteditable')
    editArea.removeAttr('role')
    editArea.removeAttr('autocorrect')
    editArea.removeAttr('autocomplete')
    editArea.removeAttr('spellcheck')
    editArea.removeAttr('data-gramm')
    editArea.removeAttr('tabindex')
    editArea.removeClass(options.className || '')
    // 卡片里的编辑器
    if (this.block.closest(editArea)) {
      editArea.removeClass('lake-engine')
    }
  }
  on(eventType: string, listener: EventCallback<unknown>, rewrite: boolean | undefined) {
    this.event.on(eventType, listener, rewrite)
    return this
  }

  off(eventType: string, listener: EventCallback<unknown> | undefined) {
    this.event.off(eventType, listener)
    return this
  }
  setValue(value: any) {
    this.change.setValue(value)
    this.normalizeTree()
    return this
  }

  setJsonValue(value: any) {
    throw new Error('Method not implemented.');
  }

  setDefaultValue(value) {
    this.history.stop()
    this.setValue(value)
    this.history.start()
    this.history.save(true, false)
  }
}