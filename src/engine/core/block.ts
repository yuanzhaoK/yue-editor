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
  CardToolbarItemConfig
} from '../types';
import { decodeCardValue, encodeCardValue, randomId } from '../utils/string';
import { CARD_CENTER_SELECTOR, CARD_ELEMENT_KEY, CARD_KEY, CARD_LEFT_SELECTOR, CARD_RIGHT_SELECTOR, CARD_TYPE_KEY, CARD_VALUE_KEY } from '../constants';
import tooltip from '../toolbar/tooltip';
import { copyNode } from '../utils/clipboard';
import EmbedToolbar from '../toolbar';


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

export const getCardRoot = (node: Node) => {
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
  private engine: any;


  /**
 * 构造函数
 * @param engine - 编辑器引擎实例
 */
  constructor(engine?: any) {
    this.engine = engine;
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

  getComponent(cardRoot: NodeModel): BlockComponentData | null {
    this.blocks.forEach(component => {
      if (component.node[0] === cardRoot[0]) {
        return component
      }
    })
    return null
  }

  // 设置 DOM 属性里的数据
  setValue(cardRoot: NodeModel, value: any) {
    if (value == null) {
      return
    }
    const component = this.getComponent(cardRoot)
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
    cardRoot.attr(CARD_VALUE_KEY, value)
  }

  // 获取 DOM 属性里的数据
  getValue(cardRoot: NodeModel) {
    let value = cardRoot.attr(CARD_VALUE_KEY)
    if (!value)
      return null
    return decodeCardValue(value)
  }

  setToolbar(cfg: BlockConfig) {
    const { cardRoot, component, engine, contentView } = cfg
    let config = component.embedToolbar?.() as CardToolbarItemConfig[]


    if (!Array.isArray(config)) {
      return
    }

    const cardBody = cardRoot.first()
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
          this.hideCardToolbar(cardRoot)
        })

        dndNode.on('mouseup', () => {
          this.showCardToolbar(cardRoot)
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
              if (copyNode(cardRoot, engine.event)) {
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
              engine.change.removeCard(cardRoot)
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
              this.maximize({
                cardRoot,
                engine,
                contentView
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
                cardRoot,
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
                cardRoot,
                engine,
                contentView
              })
            }
          }
        }
        return item
      })
      const embedToolbar = new EmbedToolbar({
        list: config
      })
      embedToolbar.root.addClass('daphne-card-toolbar')
      embedToolbar.render(cardBody)
    } else {
      const readCardTool = getNodeModel(readBlockToolTemplate())
      readCardTool.hide()
      cardRoot.on('mouseenter', () => {
        cardBody.append(readCardTool)
        readCardTool.show()
      })

      cardRoot.on('mouseleave', () => {
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
                cardRoot,
                engine,
                contentView
              })
              break
            case 'collapse':
              this.collapse({
                cardRoot,
                engine,
                contentView
              })
              break
            case 'expand':
              this.expand({
                cardRoot,
                engine,
                contentView
              })
              break
            default:
              //     this[item.type]({
              //       cardRoot,
              //       engine,
              //       contentView
              //     })
              break;
          }

          this.hideCardToolbar(cardRoot)
        })
        return item
      })
    }
  }
  expand(arg0: { cardRoot: NodeModel; engine: any; contentView: HTMLElement; }) {
    throw new Error('Method not implemented.');
  }
  collapse(arg0: { cardRoot: NodeModel; engine: any; contentView: HTMLElement; }) {
    throw new Error('Method not implemented.');
  }
  maximize(arg0: { cardRoot: NodeModel; engine: any; contentView: HTMLElement; }) {
    throw new Error('Method not implemented.');
  }
  showCardToolbar(cardRoot: NodeModel) {
    const toolbarNode = cardRoot.find('.daphne-card-toolbar')
    toolbarNode.addClass('daphne-card-toolbar-active')
    toolbarNode.addClass('daphne-embed-toolbar-active')
  }

  hideCardToolbar(cardRoot: NodeModel) {
    const cardBody = cardRoot.first()
    if (cardBody) {
      cardBody.hide()
    }
  }
  // 获取卡片内的 DOM 节点
  find(cardRoot: NodeModel, selector: string) {
    const nodeList = cardRoot.find(selector)
    // 排除子卡片里的节点
    const newNodeList: Node[] = []
    nodeList.each(node => {
      const subCardRoot = this.closest(node)
      if (subCardRoot && subCardRoot[0] === cardRoot[0]) {
        newNodeList.push(node)
      }
    })
    return getNodeModel(newNodeList)
  }

  // 向上寻找卡片根节点
  closest(node: Node) {
    return getCardRoot(node)
  }



  isInline(cardRoot: NodeModel) {
    return cardRoot && cardRoot.length !== 0 && "inline" === cardRoot.attr(CARD_TYPE_KEY)
  }

  isBlock(cardRoot: NodeModel) {
    return cardRoot && cardRoot.length !== 0 && "block" === cardRoot.attr(CARD_TYPE_KEY)
  }

  getName(cardRoot: NodeModel) {
    if (cardRoot && 0 !== cardRoot.length)
      return cardRoot.attr(CARD_KEY)
    return ""
  }

  getCenter(cardRoot: NodeModel) {
    return cardRoot.find(CARD_CENTER_SELECTOR)
  }

  isCenter(cardRoot: NodeModel) {
    return "center" === cardRoot.attr(CARD_ELEMENT_KEY)
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
    let { cardRoot } = cfg
    const { type, name, value, container } = component
    const readonly = component.state.readonly
    const hasFocus = component.hasFocus === undefined ? !readonly : component.hasFocus;

    if (['inline', 'block'].indexOf(type) < 0) {
      throw "".concat(name, ": the type of card must be \"inline\", \"block\"")
    }

    const tagName = type === 'inline' ? 'span' : 'div'

    if (cardRoot) {
      cardRoot.empty()
    } else {
      cardRoot = getNodeModel(`<${tagName}/>`)
    }
    component.node = cardRoot;
    cardRoot.attr(CARD_TYPE_KEY, type)
    cardRoot.attr(CARD_KEY, name)
    this.blocks.set(randomId(), component)

    if (hasFocus) {
      container.attr('contenteditable', 'true')
    } else {
      container.attr('contenteditable', 'false')
    }

    const cardBody = getNodeModel(`<${tagName} ${CARD_ELEMENT_KEY}="body" />`)
    cardRoot.append(cardBody)
    if (hasFocus) {
      const cardLeft = getNodeModel(`<span ${CARD_ELEMENT_KEY}="left">&#8203;</span>`)
      const cardRight = getNodeModel(`<span ${CARD_ELEMENT_KEY}="right">&#8203;</span>`)
      cardBody.append(cardLeft)
      cardBody.append(container)
      cardBody.append(cardRight)
    } else {
      cardBody.append(container)
    }
    cardRoot.append(cardBody)
    if (component.embedToolbar) {
      this.setToolbar({
        cardRoot: cardRoot,
        component: component,
        engine: engine,
        contentView: contentView,
      } as BlockConfig)
    }
    component.blockRoot = cardRoot

    return cardRoot
  }
}