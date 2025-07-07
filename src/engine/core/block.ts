/**
 * Daphne Editor Engine - Card Manager (TypeScript Implementation)
 *
 * 卡片管理器，负责管理编辑器的卡片系统
 * 提供卡片的创建、渲染、管理和操作功能
 */

import getNodeModel, { NodeModel } from './node'
import {
  CardInterface,
  CardStaticInterface,
  CardValue,
  CardType,
  RangeInterface,
  BlockComponentData,
  BlockConfig,
  CardToolbarItem,
  CardToolbarItemConfig,
  NodeModelInterface
} from '../types';
import { decodeCardValue, encodeCardValue, randomId, transformCustomTags } from '../utils/string';
import { BRAND, CARD_CENTER_SELECTOR, CARD_ELEMENT_KEY, CARD_KEY, CARD_LEFT_SELECTOR, CARD_RIGHT_SELECTOR, CARD_SELECTOR, CARD_TYPE_KEY, CARD_VALUE_KEY, READY_CARD_KEY, READY_CARD_SELECTOR } from '../constants';
import tooltip from '../toolbar/tooltip';
import { copyNode } from '../utils/clipboard';
import EmbedToolbar from '../toolbar';
import { Engine } from './engine';
import { shrinkRange } from '../utils/range';
import { getClosestBlock } from '../utils/node';
import { deleteContent } from '../changes/delete';
import { insertBlock, insertInline } from '../changes/insert';
import { unwrapBlock } from '../changes/utils/block';


const dndTemplate = () => `
  <div class="daphne-dnd-block" data-daphne-dnd-type="block" contenteditable="false" draggable="true">
    <div class="daphne-block-dnd-trigger">
      <i class="daphne-icon daphne-icon-drag"></i>
    </div>
    </div>
  `


const readBlockToolTemplate = () => `
  <div class="daphne-read-card-tool"></div>
`

const maximizeHeaderTemplate = (config: any) => `
<div class="header clearfix" data-transient="true">
  <div class="header-crumb header-crumb-sm">
    <a class="split">
      <i class="daphne-icon daphne-icon-arrow-left"></i>
    </a>
    <a>
      ${config.back}
    </a>
  </div>
</div>
`
let open = false;
export const getBlockRoot = (node: Node | NodeModel) => {
  let nodeCopy = getNodeModel(node)
  while (nodeCopy) {
    if (nodeCopy.isRoot())
      return
    if (nodeCopy.attr(CARD_KEY))
      return nodeCopy
    nodeCopy = nodeCopy.parent() as NodeModel
  }
  return nodeCopy
}

/**
 * 卡片管理器类
 *
 * 负责管理编辑器的卡片系统，包括：
 * - 卡片的注册和管理
 * - 卡片的创建和渲染
 * - 卡片的激活和选择
 * - 卡片的生命周期管理
 *
 * @example
 * ```typescript
 * const blockManager = new BlockManager();
 *
 * // 注册块
 * blockManager.add('image', ImageBlock);
 *
 * // 创建块
 * const imageBlock = blockManager.create('image', { src: 'image.jpg' });
 *
 * // 渲染块
 * const blockNode = imageBlock.render();
 * ```
 */
export class BlockManager {

  /** 卡片类映射 */
  private blocks: Map<string, BlockComponentData> = new Map();

  /** 卡片组件实例列表 */
  public components: Map<string | number, BlockComponentData> = new Map();


  public componentClasses: Map<string, CardStaticInterface> = new Map();

  private idCache: Map<string, BlockComponentData> = new Map();

  /** 编辑器引擎实例 */
  private engine: Engine;


  /**
 * 构造函数
 * @param engine - 编辑器引擎实例
 */
  constructor(engine?: any) {
    this.engine = engine;
  }
  getOptions(cfg: Omit<BlockConfig, 'component'>) {
    const { engine, contentView } = cfg
    if (engine)
      return engine.options
    if (contentView)
      return (contentView as any).options
    return undefined
  }

  insertNode(range: RangeInterface, component: BlockComponentData | null, engine: any) {
    if (!component) {
      return
    }
    const isInline = component?.type === 'inline'; // const container = isInline ? $('<span />') : $('<div />');
    // container.attr(CARD_ELEMENT_KEY, 'center');
    // 范围为折叠状态时先删除内容

    if (!range.collapsed) {
      deleteContent(range)
    }
    this.gc()
    const blockRoot = this.create({
      component,
      engine,
      contentView: null
    })

    if (isInline) {
      insertInline(range, blockRoot)
    } else {
      insertBlock(range, blockRoot, true)
    }

    this.focus(range, blockRoot, engine)
    // 矫正错误 HTML 结构
    const parent = blockRoot.parent()
    if (parent && ['ol', 'ul', 'blockquote'].indexOf(parent.name) >= 0) {
      unwrapBlock(range, parent)
    }
    this.render(component.container, component)
    if (component.didInsert) {
      component.didInsert(component.value)
    }
    return blockRoot
  }

  removeNode(blockRoot: NodeModel, engine: Engine) {
    const component = this.getComponent(blockRoot)
    if (component) {
      this.destroyComponent(component)
      if (component.type === 'block' && engine) {
        engine.readonly(false)
      }
      this.removeComponent(blockRoot)
      blockRoot.remove()
    }
  }


  focusNextBlock(range: RangeInterface, blockRoot: NodeModel, hasModify: boolean) {
    let nextBlock
    if (blockRoot.attr(CARD_TYPE_KEY) === 'inline') {
      const block = getClosestBlock(blockRoot)

      if (block && block.isRoot()) {
        nextBlock = blockRoot.nextElement()
      } else {
        nextBlock = block?.nextElement()
      }
    } else {
      nextBlock = blockRoot.nextElement()
    }

    if (hasModify) {
      if (!nextBlock || nextBlock.attr(CARD_KEY)) {
        const _block = getNodeModel('<p><br /></p>')
        blockRoot.after(_block)
        range.selectNodeContents(_block[0])
        range.collapse(false)
        return
      }
    } else {
      if (!nextBlock) {
        return
      }

      if (nextBlock && nextBlock.attr(CARD_KEY)) {
        this.focus(range, nextBlock, false)
        return
      }
    }

    range.selectNodeContents(nextBlock[0])
    shrinkRange(range)
    range.collapse(true)
  }
  focusPrevBlock(range: RangeInterface, blockRoot: NodeModel, hasModify: boolean) {
    let prevBlock

    if (blockRoot.attr(CARD_TYPE_KEY) === 'inline') {
      const block = getClosestBlock(blockRoot)
      if (block && block.isRoot()) {
        prevBlock = blockRoot.prevElement()
      } else {
        prevBlock = block?.prevElement()
      }
    } else {
      prevBlock = blockRoot.prevElement()
    }

    if (hasModify) {
      if (!prevBlock || prevBlock.attr(CARD_KEY)) {
        const _block = getNodeModel('<p><br /></p>')
        blockRoot.before(_block)
        range.selectNodeContents(_block[0])
        range.collapse(false)
        return
      }
    } else {
      if (!prevBlock) {
        return
      }

      if (prevBlock.attr(CARD_KEY)) {
        this.focus(range, prevBlock, false)
        return
      }
    }

    range.selectNodeContents(prevBlock[0])
    shrinkRange(range)
    range.collapse(false)
  }

  /**
   * 聚焦卡片
   * @param range - 选区
   * @param block - 卡片根节点
   * @param toStart - 是否从开始聚焦
   */
  focus(range: RangeInterface, block: NodeModel, toStart: boolean) {
    const cardLeft = this.findByKey(block, 'left')
    const cardRight = this.findByKey(block, 'right')

    if (cardLeft.length === 0 || cardRight.length === 0) {
      return
    }
    range.selectNodeContents(toStart ? cardLeft[0] : cardRight[0])
    range.collapse(false)
  }

  showToolbar(blockRoot: NodeModel) {
    this.find(blockRoot, `.${BRAND}-card-dnd`).addClass(`${BRAND}-card-dnd-active`)
    this.showCardToolbar(blockRoot)
  }
  hideToolbar(activeBlock: NodeModel) {
    throw new Error("Method not implemented.");
  }



  public add(name: string, component: BlockComponentData) {
    this.blocks.set(name, component);
  }

  /**
   * 获取块的ID
   * @param id - 块ID
   * @param component - 块组件实例
   */
  public getId(id: string | null, component: BlockComponentData) {
    if (!id) {
      id = randomId()
    }
    while (this.idCache.get(id) && this.idCache.get(id) !== component) id = randomId()
    return id;
  }
  /**
   * 设置块的ID
   * @param component - 块组件实例
   */
  public setId(component: BlockComponentData) {
    const value = component.value;
    if (value && "object" === typeof value && value.id) {
      value.id = this.getId(value.id, component)
      this.idCache.set(value.id, component)
    }
  }

  getComponent(blockRoot: NodeModel): BlockComponentData | null {
    this.blocks.forEach(component => {
      if (component.node[0] === blockRoot[0]) {
        return component
      }
    })
    return null
  }

  // 设置 DOM 属性里的数据
  setValue(blockRoot: NodeModel, value: any) {
    if (value == null) {
      return
    }
    const component = this.getComponent(blockRoot)
    if (component) {
      if ("object" === typeof component.value && component.value.id) {
        value.id = component.value.id
      }
      // if (component.uid && open) {
      //   this.setId(component)
      // }
      component.value = value
    }
    value = encodeCardValue(value)
    blockRoot.attr(CARD_VALUE_KEY, value)
  }

  // 获取 DOM 属性里的数据
  getValue(blockRoot: NodeModel) {
    let value = blockRoot.attr(CARD_VALUE_KEY)
    if (!value)
      return null
    return decodeCardValue(value as string)
  }

  setToolbar(cfg: BlockConfig) {
    const { blockRoot, component, engine } = cfg
    const contentView = cfg.contentView! as any
    let config = component.embedToolbar?.() as CardToolbarItemConfig[]


    if (!Array.isArray(config) || !blockRoot) {
      return
    }

    const cardBody = blockRoot.first()
    if (!cardBody) {
      return
    }
    const lang = this.getLang({
      engine,
      contentView
    })

    if (engine) {
      // 拖拽图标
      if (config.find(item => item.type === 'dnd')) {
        const dndNode = getNodeModel(dndTemplate()) as NodeModel
        dndNode.on('mouseenter', () => {
          tooltip.show(dndNode, lang.dnd.tips)
        })

        dndNode.on('mouseleave', () => {
          tooltip.hide()
        })

        dndNode.on('mousedown', e => {
          e.stopPropagation()
          tooltip.hide()
          this.hideCardToolbar(blockRoot)
        })

        dndNode.on('mouseup', () => {
          this.showCardToolbar(blockRoot)
        })
        cardBody.append(dndNode)
        config = config.filter(item => item.type !== 'dnd')
      }
      // 卡片工具栏
      const toolbarItems: CardToolbarItem[] = config.map(item => {
        if (item.type === 'separator') {
          return {
            type: 'node',
            node: getNodeModel('<span class="lake-embed-toolbar-item-split"></span>')
          }
        }

        if (item.type === 'copy') {
          return {
            type: 'button',
            name: 'copy',
            iconName: 'copy',
            title: lang.copy.tips,
            onClick: () => {
              if (copyNode(blockRoot, engine.event)) {
                engine.messageSuccess(lang.copy.success)
              } else {
                engine.messageError(lang.copy.error)
              }
            }
          }
        }

        if (item.type === 'delete') {
          return {
            type: 'button',
            name: 'delete',
            iconName: 'delete',
            title: engine.lang.delete.tips,
            onClick: () => {
              engine.change.removeCard(blockRoot)
              engine.sidebar.restore()
            }
          }
        }

        if (item.type === 'maximize') {
          return {
            type: 'button',
            name: 'maximize',
            iconName: 'maximize',
            title: engine.lang.maximize.tips,
            onClick: () => {
              if (!blockRoot) {
                return;
              }
              this.maximize({
                blockRoot,
                engine,
                contentView,
              })
            }
          }
        }

        if (item.type === 'collapse') {
          return {
            type: "button",
            name: "collapse",
            iconName: "compact-display",
            title: engine.lang.collapse.tips,
            onClick: () => {
              this.collapse({
                blockRoot,
                engine,
                contentView
              })
            }
          }
        }

        if (item.type === 'expand') {
          return {
            type: "button",
            name: "expand",
            iconName: "embedded-preview",
            title: engine.lang.expand.tips,
            onClick: () => {
              this.expand({
                blockRoot,
                engine,
                contentView
              })
            }
          }
        }
        return item
      }) as CardToolbarItem[]
      const embedToolbar = new EmbedToolbar({
        list: toolbarItems as CardToolbarItem[]
      })
      embedToolbar.root.addClass('daphne-card-toolbar')
      embedToolbar.render(cardBody)
    } else {
      const readCardTool = getNodeModel(readBlockToolTemplate())
      readCardTool.hide()
      blockRoot.on('mouseenter', () => {
        cardBody.append(readCardTool)
        readCardTool.show()
      })

      blockRoot.on('mouseleave', () => {
        getNodeModel('body').append(readCardTool)
        readCardTool.hide()
      })
      config = config.filter(item => {
        return -1 !== ["maximize", "copyContent"].indexOf(item.type)
      })
      // 最大化卡片
      config.map(item => {
        const toolNode = getNodeModel(`<span class="daphne-icon daphne-icon-${item.type} daphne-card-${item.type}-trigger"></span>`)
        readCardTool.append(toolNode)

        toolNode.on('mouseenter', () => {
          tooltip.show(toolNode, lang.tips || lang[item.type].tips)
        })
        toolNode.on('mouseleave', () => {
          tooltip.hide()
        })
        toolNode.on('click', e => {
          e.stopPropagation()
          switch (item.type) {
            case 'maximize':
              this.maximize({
                blockRoot,
                engine,
                contentView
              })
              break
            case 'collapse':
              this.collapse({
                blockRoot,
                engine,
                contentView
              })
              break
            case 'expand':
              this.expand({
                blockRoot,
                engine,
                contentView
              })
              break
            default:
              //     this[item.type]({
              //       blockRoot,
              //       engine,
              //       contentView
              //     })
              break;
          }

          this.hideCardToolbar(blockRoot)
        })
        return item
      })
    }
  }

  expand(conifg: Omit<BlockConfig, 'component'>) {
    const { blockRoot } = conifg
    const component = this.getComponent(blockRoot!)
    if (!component) {
      return
    }
    if (component.state.collapsed === true) {
      component.state.collapsed = false
      if (component.expand) {
        component.expand()
      }
    }
  }
  collapse(conifg: Omit<BlockConfig, 'component'>) {
    const { blockRoot } = conifg
    const component = this.getComponent(blockRoot!)
    if (!component) {
      return
    }
    if (component.state.collapsed === false) {
      component.state.collapsed = true
      if (component.collapse)
        component.collapse()
    }
  }
  maximize(conifg: Omit<BlockConfig, 'component'>) {
    const { blockRoot, engine, contentView } = conifg
    const { customMaximize } = this.getOptions({
      engine,
      contentView
    })
    const defalutMaximize = () => {
      this.defalutMaximize({
        blockRoot,
        engine,
        contentView
      })
    }
    if (customMaximize && typeof customMaximize === 'function') {
      customMaximize({
        blockRoot,
        engine,
        contentView,
        defalutMaximize
      })
    }
    else
      defalutMaximize()
  }
  private defaultRestore(cfg: Omit<BlockConfig, 'component'>) {
    const { blockRoot, engine } = cfg
    const component = this.getComponent(blockRoot!)
    getNodeModel('body').css('overflow', 'auto')
    if (!blockRoot || !component) {
      return
    }
    blockRoot.removeClass(`${BRAND}-card-block-max`)
    blockRoot.find('.header').remove()
    if (component && component.restore) {
      component.restore()
    }

    if (engine) {
      const container = this.findByKey(blockRoot, 'center')
      container.removeClass('edit')
      engine.event.trigger('restorecard')
      engine.history.clear()
    } else {
      blockRoot.find(`.${BRAND}-card-read-tool`).hide()
    }
    component.state.collapsed = false
  }
  restore(cfg: Omit<BlockConfig, 'component'>) {
    const { blockRoot, engine, contentView } = cfg
    const { customMaximizeRestore } = this.getOptions({
      engine,
      contentView
    })
    const defaultRestore = () => {
      this.defaultRestore({
        blockRoot,
        engine,
        contentView
      })
    }
    if (customMaximizeRestore && typeof customMaximizeRestore === 'function') {
      customMaximizeRestore({
        blockRoot,
        engine,
        contentView,
        defaultRestore
      })
    }
    else
      defaultRestore()
  }

  private defalutMaximize(conifg: Omit<BlockConfig, 'component'>) {
    const { blockRoot, engine, contentView } = conifg
    const component = this.getComponent(blockRoot!)
    if (!component || !blockRoot) {
      return
    }
    const lang = this.getLang({
      engine,
      contentView: contentView as any
    })
    const blockdBody = this.findByKey(blockRoot!, 'body')
    const maximizeHeader = getNodeModel(maximizeHeaderTemplate(lang.maximize))
    const backTrigger = maximizeHeader.find('.header-crumb')
    blockRoot.addClass(`${BRAND}-card-block-max`)
    backTrigger.on('click', () => {
      this.restore({
        blockRoot,
        engine,
        contentView
      })
    })
    blockdBody.prepend(maximizeHeader)
    getNodeModel('body').css('overflow', 'hidden')

    if (engine) {
      const container = this.findByKey(blockRoot, 'center')
      container.addClass('edit')
      engine.event.trigger('maximizeCard')
      engine.history.clear()
    }
    component.state.collapsed = true
    if (component.expand) {
      component.expand()
    }
  }
  showCardToolbar(blockRoot: NodeModel) {
    const toolbarNode = blockRoot.find('.daphne-card-toolbar')
    toolbarNode.addClass('daphne-card-toolbar-active')
    toolbarNode.addClass('daphne-embed-toolbar-active')
  }

  hideCardToolbar(blockRoot: NodeModel) {
    const cardBody = blockRoot.first()
    if (cardBody) {
      cardBody.hide()
    }
  }
  // 获取卡片内的 DOM 节点
  find(blockRoot: NodeModel, selector: string) {
    const nodeList = blockRoot.find(selector)
    // 排除子卡片里的节点
    const newNodeList: Node[] = []
    nodeList.each(node => {
      const subCardRoot = this.closest(node)
      if (subCardRoot && subCardRoot[0] === blockRoot[0]) {
        newNodeList.push(node)
      }
    })
    return getNodeModel(newNodeList)
  }

  // 向上寻找卡片根节点
  closest(node: Node | NodeModel) {
    return getBlockRoot(node)
  }

  copyContent(cfg: Omit<BlockConfig, 'component'>) {
    const { blockRoot } = cfg
    const component = this.getComponent(blockRoot!)!
    if (component.copyContent) {
      component.copyContent()
    }
  }
  /**
   * 判断是否为内联卡片
   * @param blockRoot - 卡片根节点
   * @returns 是否为内联卡片
   */
  isInline(blockRoot: NodeModel) {
    return blockRoot && blockRoot.length !== 0 && "inline" === blockRoot.attr(CARD_TYPE_KEY)
  }

  /**
   * 判断是否为块级卡片
   * @param blockRoot - 卡片根节点
   * @returns 是否为块级卡片
   */
  isBlock(blockRoot: NodeModel) {
    return blockRoot && blockRoot.length !== 0 && "block" === blockRoot.attr(CARD_TYPE_KEY)
  }

  getName(blockRoot: NodeModel) {
    if (blockRoot && 0 !== blockRoot.length)
      return blockRoot.attr(CARD_KEY)
    return ""
  }

  getCenter(blockRoot: NodeModel) {
    return blockRoot.find(CARD_CENTER_SELECTOR)
  }

  isCenter(blockRoot: NodeModel) {
    return "center" === blockRoot.attr(CARD_ELEMENT_KEY)
  }

  isCursor(node: Node) {
    return this.isLeftCursor(node) || this.isRightCursor(node)
  }

  isLeftCursor(node: Node) {
    return getNodeModel(node).closest(CARD_LEFT_SELECTOR).length > 0
  }

  isRightCursor(node: Node) {
    return getNodeModel(node).closest(CARD_RIGHT_SELECTOR).length > 0
  }

  getLang(cfg: { engine: any; contentView: HTMLElement; }) {
    const { engine, contentView } = cfg
    if (engine)
      return engine.lang
    if (contentView)
      return contentView.lang
  }

  /**
   * 创建块
   * @param name - 块名称
   * @param value - 块值
   */
  public create(cfg: BlockConfig) {
    const { component, engine, contentView } = cfg
    let { blockRoot } = cfg
    const { type, name, value, container } = component
    const readonly = component.state.readonly
    const hasFocus = component.hasFocus === undefined ? !readonly : component.hasFocus;

    if (['inline', 'block'].indexOf(type) < 0) {
      throw "".concat(name, ": the type of card must be \"inline\", \"block\"")
    }

    const tagName = type === 'inline' ? 'span' : 'div'

    if (blockRoot) {
      blockRoot.empty()
    } else {
      blockRoot = getNodeModel(`<${tagName}/>`)
    }
    component.node = blockRoot;
    blockRoot.attr(CARD_TYPE_KEY, type)
    blockRoot.attr(CARD_KEY, name)
    this.blocks.set(randomId(), component)

    if (hasFocus) {
      container.attr('contenteditable', 'true')
    } else {
      container.attr('contenteditable', 'false')
    }

    const cardBody = getNodeModel(`<${tagName} ${CARD_ELEMENT_KEY}="body" />`)
    blockRoot.append(cardBody)
    if (hasFocus) {
      const cardLeft = getNodeModel(`<span ${CARD_ELEMENT_KEY}="left">&#8203;</span>`)
      const cardRight = getNodeModel(`<span ${CARD_ELEMENT_KEY}="right">&#8203;</span>`)
      cardBody.append(cardLeft)
      cardBody.append(container)
      cardBody.append(cardRight)
    } else {
      cardBody.append(container)
    }
    blockRoot.append(cardBody)
    if (component.embedToolbar) {
      this.setToolbar({
        blockRoot,
        component: component,
        engine: engine,
        contentView: contentView,
      } as BlockConfig)
    }
    component.blockRoot = blockRoot

    return blockRoot
  }
  // 销毁不存在节点的卡片控件
  public gc() {
    this.components.forEach((cmp, idx) => {
      const blockRoot = cmp.node;
      const component = cmp.component

      if (blockRoot[0] && blockRoot.closest('body').length > 0) {
        return
      }
      this.destroyComponent(component);
      this.components.delete(idx)
    })
  }

  private destroyComponent(component: BlockComponentData) {
    if (component.destroy && component.engine) {
      component.destroy()
    }
    const value = component.value
    if (value && typeof value === "object") {
      if (value.id && this.idCache.get(value.id)) {
        this.idCache.delete(value.id)
      }
    }
  }
  private removeComponent(blockRoot: NodeModel) {
    this.components.forEach((item, index) => {
      if (item.node[0] === blockRoot[0]) {
        this.components.delete(index)
        return false
      }
    })
  }
  public createComponent(cfg: Omit<BlockConfig, 'component'>): BlockComponentData | null {
    const { name, engine, contentView } = cfg
    let { value } = cfg
    const componentClass = this.componentClasses.get(name!)! as CardStaticInterface

    if (componentClass.cardType === "block" && open) {
      value = value || {}
      componentClass.uid = true
    }
    if (componentClass && typeof componentClass === 'function') {
      const component = new (componentClass as any)(engine, contentView)
      // 设置卡片只读属性
      component.engine = engine
      component.contentView = contentView
      component.state = {
        readonly: !engine,
        collapsed: false
      }
      component.type = (componentClass as CardStaticInterface).cardType
      component.name = name
      component.value = value
      // 生成卡片容器
      const container = component.type === 'inline' ? getNodeModel('<span />') : getNodeModel('<div />')
      container.attr(CARD_ELEMENT_KEY, 'center')
      // 设置卡片只读属性
      component.container = container
      return component
    }
    return null
  }

  public render(container: NodeModel, component: BlockComponentData) {
    try {
      const { blockRoot, value } = component
      if (value && typeof value === 'object' && value.id) {
        blockRoot.attr('id', value.id)
      }
      component.render(container, component.value)
    } catch (err) {
      console.error('render error: ', err)
    }
  }
  // 对所有待创建的Block进行渲染
  renderAll(root: NodeModel, engine: Engine, contentView: HTMLElement | null) {
    root = getNodeModel(root)
    const nodeList = root.find(READY_CARD_SELECTOR)
    this.gc()
    nodeList.each(node => {
      const nodeItem = getNodeModel(node)
      const name = nodeItem.attr(READY_CARD_KEY) as string
      const componentClass = this.componentClasses.get(name)

      if (!componentClass) {
        return
      }

      const value = this.getValue(nodeItem)

      const component = this.createComponent({
        name,
        engine,
        contentView,
        value,
      })!
      // 替换空的占位标签
      const blockRoot = this.create({
        component,
        engine,
        contentView,
      })

      nodeItem.replaceWith(blockRoot)
      // 重新渲染
      this.render(component.container, component)
    })
  }
  public reRenderAll(root: NodeModel, engine: Engine) {
    root = getNodeModel(root)
    const nodeList = root.isCard() ? root : root.find(CARD_SELECTOR)

    this.gc()
    nodeList.each(node => {
      const blockRoot = getNodeModel(node)
      const key = blockRoot.attr(CARD_KEY) as string;
      const commentClass = this.componentClasses.get(key);
      if (commentClass) {
        let component = this.getComponent(blockRoot)
        if (component) {
          this.destroyComponent(component)
        }
        this.removeComponent(blockRoot)
        const value = this.getValue(blockRoot)
        component = this.createComponent({
          name: key,
          engine,
          value,
          contentView: null
        })!
        this.create({
          component,
          engine,
          blockRoot,
          contentView: null
        })
        this.render(component.container, component)
      }
    })
  }

  // 通过 data-card-element 的值，获取当前卡片内的 DOM 节点
  findByKey(blockRoot: NodeModel, key: string) {
    return this.find(blockRoot, "[".concat(CARD_ELEMENT_KEY, "=").concat(key, "]"))
  }


  // 更新卡片
  updateNode(blockRoot: NodeModel, component: BlockComponentData) {
    this.destroyComponent(component)
    const container = this.findByKey(blockRoot, 'center')
    container.empty()
    this.setValue(blockRoot, component.value)
    this.render(container, component)
    if (component.didUpdate) {
      component.didUpdate(component.value)
    }
  }
  // 将指定节点替换成等待创建的卡片 DOM 节点
  replaceNode(node: NodeModel, name: string, value: any) {
    const componentClass = this.componentClasses.get(name)
    const type = componentClass?.cardType!
    const html = transformCustomTags(`<card type=${type} name=${name}></card>`)
    const readyCardRoot = getNodeModel(html)
    this.setValue(readyCardRoot, value)
    node.before(readyCardRoot)
    readyCardRoot.append(node)
  }

  getSingleBlockRoot(rang: RangeInterface): NodeModel | null {
    let ancestorContainer = this.closest(rang.commonAncestorContainer)
    if (!ancestorContainer) {
      ancestorContainer = this.getSingleSelectedBlock(rang)!
    }
    return ancestorContainer || null
  }

  getSingleSelectedBlock(rang: RangeInterface) {
    const cardRoot = this.getSingleBlockRoot(rang)
    if (cardRoot) {
      return cardRoot
    }
    return null
  }
}