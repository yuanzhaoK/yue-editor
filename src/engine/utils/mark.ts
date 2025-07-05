import { CARD_ELEMENT_KEY, CARD_KEY, ROOT_KEY } from "../constants"
import getNodeModel, { NodeModel } from "../core/node"
import { RangeInterface } from "../types"
import { equalNode, fetchAllChildren, isEmptyNode, unwrapNode } from "./node"
import { shrinkRange } from "./range"

// 获取向上第一个非 Mark 节点
export const getClosest = (node: Node) => {
  let nodeItem = getNodeModel(node)
  while (nodeItem && (nodeItem.isMark() || nodeItem.isText())) {
    if (nodeItem.isRoot())
      break
    nodeItem = nodeItem.parent()!
  }
  return node
}

// 获取对范围有效果的所有 Mark
export const getActiveMarks = (range: RangeInterface) => {

  const dupRange = range.cloneRange()

  // 左侧不动，只缩小右侧边界
  // <anchor /><strong>foo</strong><focus />bar
  // 改成
  // <anchor /><strong>foo<focus /></strong>bar
  if (!range.collapsed) {
    const rightRange = range.cloneRange()
    shrinkRange(rightRange)
    dupRange.setEnd(rightRange.endContainer, rightRange.endOffset)
  }
  const { startContainer, startOffset, endContainer, endOffset } = dupRange
  let startNode = startContainer;
  let endNode = endContainer;

  if (startContainer.nodeType === Node.ELEMENT_NODE) {
    if (startContainer.childNodes[startOffset]) {
      startNode = startContainer.childNodes[startOffset] || startContainer;
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
  const addNode = (nodes: NodeModel[], nodeB: NodeModel) => {
    if (!nodes.some(nodeA => nodeA[0] === nodeB[0])) {
      nodes.push(nodeB)
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

  const nodes = findNodes(startNode)
  // 非折叠状态，需要添加右侧节点
  if (!range.collapsed) {
    findNodes(endNode).forEach(nodeB => {
      return addNode(nodes, nodeB)
    })
  }
  return nodes
}


// 移除一个节点下的所有空 Mark，通过 callback 可以设置其它条件
export const removeEmptyMarks = (root: NodeModel, callback?: (node: NodeModel) => boolean) => {
  const children = fetchAllChildren(root)
  const remove = () => {
    children.forEach(child => {
      if (isEmptyNode(child[0]) && getNodeModel(child[0]).isMark() && (!callback || callback(child))) {
        unwrapNode(child[0])
      }
    })
  }
  remove()
}



// 判断是不是可移除的 Mark
export const canRemoveMark = (node: NodeModel, mark: NodeModel) => {
  if (node.isCard()) {
    return false
  }
  if (!mark) {
    return true
  }
  return equalNode(node[0], mark[0])
}
