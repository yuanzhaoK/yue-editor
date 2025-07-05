import { CARD_ELEMENT_KEY, CARD_KEY, ROOT_KEY } from "../constants";
import { DAPHNE_ELEMENT } from "../constants/bookmark";
import getNodeModel, { NodeModel } from '../core/node';
import { RangeInterface } from "../types";
import { isEmptyNode, walkTree } from "./node";
import { downRange, shrinkRange } from "./range";



// 获取最近的 Block 节点，找不到则返回 node
export const getClosestBlock = (node: Node) => {
  let nodeModel = getNodeModel(node);
  const originNode = nodeModel
  while (nodeModel) {
    if (nodeModel.isRoot() || nodeModel.isBlock()) {
      return nodeModel
    }
    nodeModel = nodeModel.parent() as NodeModel
  }

  return originNode
}


export const addOrRemoveBr = (range: Range, align: string) => {
  const block = getClosestBlock(range.commonAncestorContainer)
  block.find('br').each(function (br) {
    const brModel = getNodeModel(br)!
    if ((!brModel.prev()
      || brModel.prev()!.attr(CARD_KEY) === 'checkbox')
      && brModel.next()
      && brModel.next()!.name !== 'br'
      && brModel.next()!.attr(DAPHNE_ELEMENT) !== 'cursor'
      || !brModel.next()
      && brModel.prev()
      && brModel.prev()!.name !== 'br') {
      if ("left" === align && brModel.prev() && "checkbox" !== brModel.prev()!.attr(CARD_KEY))
        return
      brModel.remove()
    }
  });

  if (!block.first() || block.children().length === 1 && block.first()!.attr(CARD_KEY) === 'checkbox') {
    block.append('<br />')
    return;
  }

  if (block.children().length === 2 && block.first()!.attr(CARD_KEY) === 'checkbox' && block.last()!.attr(DAPHNE_ELEMENT) === 'cursor') {
    block.first()!.after('<br />')
  }
}

// 获取对范围有效果的所有 Block

export const getActiveBlocks = (range: RangeInterface): NodeModel[] => {
  const dupRange = range.cloneRange()
  shrinkRange(dupRange)

  const { startContainer, startOffset, endContainer, endOffset } = dupRange
  let startNode = startContainer;
  let endNode = endContainer;

  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    if (startContainer.childNodes[startOffset]) {
      startNode = startContainer.childNodes[startOffset] || startContainer
    }
  }
  if (endContainer.nodeType === Node.ELEMENT_NODE) {
    if (endOffset > 0 && endContainer.childNodes[endOffset - 1]) {
      endNode = endContainer.childNodes[endOffset - 1] || startContainer;
    }
  }
  // 折叠状态时，按右侧位置的方式处理
  if (range.collapsed) {
    startNode = endNode
  }

  // 不存在时添加
  const addNode = (nodes: NodeModel[], nodeB: NodeModel, preppend?: boolean) => {
    if (!nodes.some(nodeA => nodeA[0] === nodeB[0])) {
      if (preppend) {
        nodes.unshift(nodeB)
      } else {
        nodes.push(nodeB)
      }
    }
  }

  //向上寻找 所有 Mark 节点, 不包括 卡片
  const findNodes = (node: Node) => {
    let nodeItem = getNodeModel(node)
    let nodes: NodeModel[] = []

    while (nodeItem) {
      if (nodeItem.type === Node.ELEMENT_NODE && nodeItem.attr(ROOT_KEY) === 'root') {
        break
      }
      if (nodeItem.isMark() && !nodeItem.attr(CARD_KEY) && !nodeItem.attr(CARD_ELEMENT_KEY)) {
        nodes.push(nodeItem)
      }
      nodeItem = nodeItem.parent()!
    }
    return nodes
  }

  const nodes = getRangeBlocks(range)

  // rang头部应该往数组头部插入节点
  findNodes(startNode).forEach(node => {
    return addNode(nodes, node, true)
  })

  // 非折叠状态，需要添加右侧节点
  if (!range.collapsed) {
    findNodes(endNode).forEach(node => {
      return addNode(nodes, node)
    })
  }

  return nodes;
}
/**
 * 获取 Range 范围内的所有 blocks
 * @param range 
 */
export const getRangeBlocks = (range: RangeInterface): NodeModel[] => {
  const dupRange = range.cloneRange()
  shrinkRange(dupRange)
  downRange(dupRange)
  const startBlock = getClosestBlock(dupRange.startContainer)
  const endBlock = getClosestBlock(dupRange.endContainer)
  const ancestor = dupRange.commonAncestorContainer
  const closestBlock = getClosestBlock(ancestor)
  const blocks: NodeModel[] = [];
  let started = false;


  walkTree(closestBlock, (node) => {
    if (node[0] === startBlock[0]) {
      started = true
    }
    if (started && node.isBlock() && !node.isCard() && node.isEditable()) {
      blocks.push(node)
    }
    if (node[0] === endBlock[0]) {
      started = false
      return false
    }
  })
  // 未选中文本时忽略该 Block
  // 示例：<h3><anchor />word</h3><p><focus />another</p>
  if (blocks.length > 1 && isBlockFirstOffset(dupRange, 'end')) {
    blocks.pop()
  }
  return blocks;


}

/**
 * 判断Range 的 edge 是否在 Block 的开始位置
 * edge = start：开始位置 edge = en：结束位置
 * @param dupRange 
 * @param arg1 
 */
function isBlockFirstOffset(range: RangeInterface, edge: 'start' | 'end') {
  const container = getNodeModel(range[`${edge}Container`])
  const offset = range[`${edge}Offset`]
  const newRange = range.cloneRange()
  const block = getClosestBlock(container[0])

  newRange.selectNodeContents(block[0])

  newRange.setEnd(container[0], offset)

  const fragment = newRange.cloneContents()

  if (!fragment.firstChild) {
    return true
  }

  if (fragment.childNodes.length === 1 && getNodeModel(fragment.firstChild).name === 'br') {
    return true
  }

  const node = getNodeModel('<div />')
  node.append(fragment)

  return isEmptyNode(node[0])
}

