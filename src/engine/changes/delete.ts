import { getClosestBlock } from "../utils/node"
import { createBookmark, enlargeRange, getNextNode, getPrevNode, moveToBookmark } from "../utils/range"
import getNodeModel, { NodeModel } from "../core/node"
import { RangeInterface } from "../types"
import { mergeNode } from "./merge"

// 深度合并
export const deepMergeNode = (range: RangeInterface, prevNode: NodeModel, nextNode: NodeModel) => {
  if (prevNode.isBlock() && !prevNode.isVoid() && !prevNode.isCard()) {
    range.selectNodeContents(prevNode[0])
    range.collapse(false)
    const bookmark = createBookmark(range)
    mergeNode(prevNode[0], nextNode[0])
    moveToBookmark(range, bookmark)
    const prevNodeModel = getPrevNode(range)!
    const nextNodeModel = getNextNode(range)!
    // 合并之后变成空 Block
    const container = getNodeModel(range.startContainer)
    if (!prevNodeModel && !nextNodeModel && container.isBlock()) {
      container.append('<br />')
      range.selectNodeContents(container[0])
      range.collapse(false)
    }

    if (prevNodeModel && nextNodeModel && !prevNodeModel.isCard() && !nextNodeModel.isCard()) {
      deepMergeNode(range, prevNodeModel as NodeModel, nextNodeModel as NodeModel)
    }
  }
}

export const deleteContent = (range: RangeInterface, isOnlyOne: boolean = false) => {

  if (range.collapsed) {
    return range
  }
  enlargeRange(range)
  // 获取上面第一个 Block
  const block = getClosestBlock(getNodeModel(range.startContainer))!
  // 获取的 block 超出编辑范围
  if (!block.isRoot() && !block.isEditable()) {
    return range
  }
  // 先删除范围内的所有内容
  range.extractContents()
  range.collapse(true)
  // 后续处理
  const container = getNodeModel(range.startContainer)
  const offset = range.startOffset
  // 只删除了文本，不做处理
  if (container.isText()) {
    return range
  }

  const prevNode = container[0].childNodes[offset - 1]
  const nextNode = container[0].childNodes[offset]

  if (prevNode || nextNode || !container.isBlock()) {
    if (prevNode && nextNode && getNodeModel(prevNode).isBlock() && getNodeModel(nextNode).isBlock() && !isOnlyOne) {
      deepMergeNode(range, getNodeModel(prevNode), getNodeModel(nextNode))
    }
    container.children().each(node => {
      const nodeModel = getNodeModel(node)
      if ((nodeModel.isVoid() || nodeModel.isElement()) && "" === nodeModel.html())
        nodeModel.remove()
    })
    return range
  } else {
    if (container.isRoot()) {
      container.append("<p><br /></p>")
      range.selectNodeContents(container.find("p")[0])
    } else {
      container.append("<br />")
      range.selectNodeContents(container[0])
    }
    range.collapse(false)
    return range
  }
}