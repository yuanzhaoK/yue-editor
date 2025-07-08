import { BlockManager } from "../core/block"
import getNodeModel, { NodeModel } from "../core/node"
import { RangeInterface } from "../types"
import { addOrRemoveBr } from "../utils/block"
import { getClosestBlock, getDocument, isEmptyNode, wrapNode } from "../utils/node"
import { createBookmark, deepCut, enlargeRange, moveToBookmark, shrinkRange } from "../utils/range"
import { deleteContent } from "./delete"
import { mergeNode } from "./merge"
import { isBlockLastOffset } from "./utils/block"

function getFirstChild(node: Node): Node {
  let child = node.firstChild
  if (!child) return node
  if (!getNodeModel(child).isBlock())
    return node
  while (child && ["blockquote", "ul", "ol"].includes(getNodeModel(child).name)) {
    child = child.firstChild
  }
  return child!
}

export const insertNode = (range: RangeInterface, node: NodeModel) => {
  node = getNodeModel(node)
  range.insertNode(node[0])
  range.selectNodeContents(node[0])
  shrinkRange(range)
  range.collapse(false)
  return range
}

export function insertInline(range: RangeInterface, inline: NodeModel) {
  const doc = getDocument(range.startContainer)
  if (typeof inline === 'string') {
    inline = getNodeModel(inline, doc)
  }
  // 范围为折叠状态时先删除内容
  if (!range.collapsed) {
    deleteContent(range, false)
  }
  // 插入新 Inline
  insertNode(range, inline)

  if (inline.name !== 'br') {
    addOrRemoveBr(range)
  }

  range.selectNode(inline[0])
  range.collapse(false)
  return range
}

export const insertBlock = (range: RangeInterface, block: NodeModel, noEmptyBlock: boolean) => {
  const doc = getDocument(range.startContainer)
  if (typeof block === 'string') {
    block = getNodeModel(block, doc)
  }

  // 范围为折叠状态时先删除内容
  if (!range.collapsed) {
    deleteContent(range)
  }

  // 获取上面第一个 Block
  const container = getClosestBlock(getNodeModel(range.startContainer));
  if (!container) {
    return range
  }
  // 超出编辑范围
  if (!container.isRoot() && !container.isEditable()) {
    return range
  }
  // 当前选择范围在段落外面
  if (container.isRoot()) {
    range = insertNode(range, block)
    range.collapse(false)
    return range
  }
  // <p><cursor /><br /></p>
  // to
  // <p><br /><cursor /></p>
  if (container.children().length === 1 && container.first()?.name === 'br') {
    range.selectNodeContents(container[0])
    range.collapse(false)
  }
  // 插入范围的开始和结束标记
  enlargeRange(range)
  const bookmark = createBookmark(range)
  if (!bookmark) {
    return range
  }
  // 子节点分别保存在两个变量
  const leftBlock = container.clone(false)
  const rightBlock = container.clone(false)
  // 切割 Block
  let node = container.first()
  let isLeft = true

  while (node) {
    const next = node.next()
    if (node[0] !== bookmark.anchor) {
      if (isLeft) {
        leftBlock.append(node)
      } else {
        rightBlock.append(node)
      }
      node = next
    } else {
      isLeft = false
      node = next
    }
  }

  // Block 的两边添加新的 Block
  if (isEmptyNode(leftBlock[0])) {
    if (isEmptyNode(rightBlock[0]!) && !noEmptyBlock) {
      container.before(leftBlock)
    }
  } else {
    container.before(leftBlock)
  }

  if (!isEmptyNode(rightBlock[0]!)) {
    container.after(rightBlock)
  }

  // 移除范围的开始和结束标记
  moveToBookmark(range, bookmark)
  // 移除原 Block
  range.setStartAfter(container[0])
  range.collapse(true)
  container.remove()
  // 插入新 Block
  insertNode(range, block)
  return range
}


export const insertFragment = (range: RangeInterface, block: BlockManager, fragment: Node, callback?: () => void) => {
  const firstBlock = getClosestBlock(getNodeModel(range.startContainer))
  const lastBlock = getClosestBlock(getNodeModel(range.endContainer))
  const blockquoteNode = firstBlock?.closest("blockquote")
  const childNodes = fragment.childNodes
  const firstNode = getNodeModel(fragment).first()!
  if (!range.collapsed) {
    deleteContent(range, (lastBlock?.[0] === firstBlock?.[0] || !isBlockLastOffset(range, "end")))
  }
  if (!firstNode[0]) return range
  if (!firstNode.isBlock() && !firstNode.isCard()) {
    shrinkRange(range)
    range.insertNode(fragment)
    range.collapse(false)
    return range
  }
  deepCut(range)
  const startNode = range.startContainer.childNodes[range.startOffset - 1]
  const startNode1 = range.startContainer.childNodes[range.startOffset]
  if (blockquoteNode?.[0] && childNodes.length > 0) {
    childNodes.forEach((node: any) => {
      if ("blockquote" !== getNodeModel(node).name) {
        wrapNode(node, blockquoteNode.clone(false)[0])
      }
    })
  }
  insertNode(range, block.closest(firstBlock!)!)
  if (blockquoteNode?.[0] && startNode) {
    const _firstNode = getNodeModel(getFirstChild(startNode.nextSibling!))
    const _lastNode = getNodeModel(getLastChild(startNode))
    if (isListChild(_lastNode, _firstNode)) {
      clearList(_lastNode, _firstNode)
      mergeNode(_lastNode, _firstNode, false)
      removeEmptyNode(_firstNode)
    } else {
      if (isEmptyNode(_lastNode[0]) || isEmptyListItem(_lastNode)) {
        removeEmptyNode(_lastNode)
      }
    }
  }

  if (startNode1) {
    const prevNode = getNodeModel(getLastChild(startNode1.previousSibling!)),
      nextNode = getNodeModel(getFirstChild(startNode1))
    range.selectNodeContents(prevNode[0])
    shrinkRange(range)
    range.collapse(false)
    if (isEmptyNode(nextNode[0])) {
      removeEmptyNode(nextNode)
    }
    else if (isListChild(prevNode, nextNode)) {
      mergeNode(prevNode, nextNode, false)
      removeEmptyNode(nextNode)
    }
  }
  mergeAdjacentBlockquote(range)
  mergeAdjacentList(range)
  if (callback)
    callback()
  return range
}

function getLastChild(node: Node): Node {
  let child = node.lastChild!
  if (!getNodeModel(child).isBlock()) return node
  while (["blockquote", "ul", "ol"].includes(getNodeModel(child).name)) {
    child = child.lastChild!
  }
  return child
}
function isListChild(_lastNode: NodeModel, _firstNode: NodeModel) {
  return "p" === _firstNode.name || _lastNode.name === _firstNode.name && !("li" === _lastNode.name && !isSameList(_lastNode.parent()!, _firstNode.parent()!))

}

function isSameList(lastNode: NodeModel, firstNode: NodeModel): boolean {
  return lastNode.name === firstNode.name && !("li" === lastNode.name && !isSameList(lastNode.parent()!, firstNode.parent()!))
}
function clearList(_lastNode: NodeModel, _firstNode: NodeModel) {
  throw new Error("Function not implemented.")
}

function removeEmptyNode(_firstNode: NodeModel) {
  throw new Error("Function not implemented.")
}

function isEmptyListItem(_lastNode: NodeModel): boolean {
  throw new Error("Function not implemented.")
}

function mergeAdjacentBlockquote(range: RangeInterface) {
  throw new Error("Function not implemented.")
}

function mergeAdjacentList(range: RangeInterface) {
  throw new Error("Function not implemented.")
}

