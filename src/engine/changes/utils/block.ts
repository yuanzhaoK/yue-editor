// 输入内容时，删除浏览器生成的 BR 标签，对空 block 添加 BR
// 删除场景
// <p><br />foo</p>
// <p>foo<br /></p>
// 保留场景
// <p><br /><br />foo</p>
// <p>foo<br /><br /></p>
// <p>foo<br />bar</p>
// 添加场景
// <p></p>

import { RangeInterface } from "../../types";
import { getClosestBlock, getDocument, isEmptyNode, unwrapNode } from "../../utils/node";
import getNodeModel, { NodeModel } from "../../core/node";
import { ROOT, CARD_KEY, INDENT_KEY } from "@/engine/constants";
import { createBookmark, moveToBookmark } from "@/engine/utils/range";
import { DAPHNE_ELEMENT } from "@/engine/constants/bookmark";
import { getRangeBlocks } from "@/engine/utils/block";

export const addOrRemoveBr = (range: RangeInterface, align: string) => {
  const block = getClosestBlock(getNodeModel(range.commonAncestorContainer))
  if (!block) {
    return
  }
  block.find('br').each((br) => {
    const brModel = getNodeModel(br)
    if ((!brModel.prev() || brModel.prev()?.attr(CARD_KEY) === 'checkbox') && brModel.next() && brModel.next()?.name !== 'br' && brModel.next()?.attr('data-lake-element') !== 'cursor' || !brModel.next() && brModel.prev() && brModel.prev()?.name !== 'br') {
      if ("left" === align && brModel.prev() && "checkbox" !== brModel.prev()?.attr(CARD_KEY))
        return
      brModel.remove()
    }
  });

  if (!block.first() || (block.children().length === 1 && block.first()?.attr(CARD_KEY) === 'checkbox')) {
    block.append('<br />')
    return;
  }

  if (block.children().length === 2 && block.first()?.attr(CARD_KEY) === 'checkbox' && block.last()?.attr(`data-${ROOT}-element`) === 'cursor') {
    block.first()?.after('<br />')
  }
}
// 获取目标 Block 节点
const getTargetBlock = (node: NodeModel, tagName: string) => {
  let block = getClosestBlock(node)
  while (block) {
    const parent = block.parent()
    if (!parent)
      break
    if (!block.isEditable())
      break
    if (block.text().trim() !== parent.text().trim())
      break
    if (parent.name === tagName)
      break
    block = parent
  }
  return block
}

// 获取范围内的兄弟 Block
const getBlockSiblings = (range: RangeInterface, block: NodeModel) => {
  const blocks = []
  const startBlock = getTargetBlock(getNodeModel(range.startContainer), block.name)!
  const endBlock = getTargetBlock(getNodeModel(range.endContainer), block.name)!
  const parentBlock = startBlock!.parent()!
  let status = 'left'
  let node = parentBlock.first()

  while (node) {
    node = getNodeModel(node)
    if (!node.isBlock())
      return blocks
    // 超过编辑区域
    if (!node.isEditable())
      return blocks

    if (node[0] === startBlock[0]) {
      status = 'center'
    }

    blocks.push({
      status: status,
      node: node
    })

    if (node[0] === endBlock[0]) {
      status = 'right'
    }
    node = node.next()
  }
  return blocks
}

export function unwrapBlock(range: RangeInterface, blockRoot: string | NodeModel) {
  const doc = getDocument(range.startContainer)
  if (typeof blockRoot === 'string') {
    blockRoot = getNodeModel(blockRoot, doc)
  }
  const blocks = getBlockSiblings(range, blockRoot)
  if (blocks.length === 0) {
    return range
  }

  const firstNodeParent = blocks[0].node.parent()!
  if (!firstNodeParent.isEditable()) {
    return range
  }
  if (firstNodeParent.isTable()) {
    return range
  }
  const hasLeft = blocks.some(item => item.status === 'left')
  const hasRight = blocks.some(item => item.status === 'right')
  let leftParent: NodeModel | null = null

  if (hasLeft) {
    const parent = firstNodeParent
    leftParent = parent.clone(false) as NodeModel
    parent.before(leftParent)
  }

  let rightParent: NodeModel | null = null
  if (hasRight) {
    const _parent = blocks[blocks.length - 1].node.parent()!
    rightParent = _parent.clone(false) as NodeModel
    _parent.after(rightParent)
  }

  // 插入范围的开始和结束标记
  const bookmark = createBookmark(range)
  blocks.forEach(item => {
    const status = item.status, node = item.node, parent = node.parent()!

    if (status === 'left') {
      leftParent?.append(node)
    }

    if (status === 'center') {
      if (parent.name === blockRoot.name && parent.isEditable()) {
        unwrapNode(parent[0])
      }
    }

    if (status === 'right') {
      rightParent?.append(node)
    }
  })
  // 有序列表被从中间拆开后，剩余的两个部分的需要保持序号连续
  if (leftParent && leftParent.name === 'ol' && rightParent && rightParent.name === 'ol') {
    rightParent.attr('start', (parseInt(String(leftParent.attr('start')), 10) || 1) + leftParent.find('li').length)
  }
  moveToBookmark(range, bookmark)
  return range
}


/**
 * br 换行改成段落
 * @param block 
 * @returns 
 */
export const brToParagraph = (block: NodeModel) => {
  // 没有子节点
  if (!block.first()) {
    return
  }
  // 只有一个节点
  if (block.children().length === 1) {
    return
  }
  if (block.isTable())
    return
  if ("li" === block.name)
    return
  // 只有一个节点（有光标标记节点）
  if (block.children().length === 2 && block.first()?.attr(DAPHNE_ELEMENT) === 'cursor' || block.last()?.attr(DAPHNE_ELEMENT) === 'cursor') {
    return
  }

  let container
  let prevContainer
  let node = block.first()

  while (node) {
    const next = node.next()
    if (!container || node.name === 'br') {
      prevContainer = container
      container = block.clone(false)
      block.before(container)
    }
    if (node.name !== 'br') {
      container.append(node)
    }
    if ((node.name === 'br' || !next) && prevContainer && !prevContainer.first()) {
      prevContainer.append('<br />')
    }
    node = next
  }

  if (container && !container.first()) {
    container.remove()
  }
  block.remove()
}



// ol 添加 start 属性
// 有序列表序号修正策略：连续的列表会对有序列表做修正，不连续的不做修正
export const addListStartNumber = (rangeNode: NodeModel, range: RangeInterface) => {
  let block;
  if (["ol", "ul"].includes(rangeNode.name)) {
    block = rangeNode
  } else {
    const blocks = getRangeBlocks(range)
    if (blocks.length === 0)
      return rangeNode
    block = blocks[0].closest('ul,ol')
    if (!block[0])
      return rangeNode
  }
  const startIndent = parseInt(block.attr(INDENT_KEY) as string, 10) || 0
  // 当前选区起始位置如果不是第一层级，需要向前遍历，找到各层级的前序序号
  // 直到遇到一个非列表截止，比如 p

  let startCache: any[] = [];
  let cacheIndent = startIndent
  let prevNode = block.prev()

  while (prevNode && ['ol', 'ul'].includes(prevNode.name)) {
    if (prevNode.name === 'ol') {
      const prevIndent = parseInt(prevNode.attr(INDENT_KEY) as string, 10) || 0
      const prevStart = parseInt(prevNode.attr('start') as string, 10) || 1
      const len = prevNode.find('li').length

      if (prevIndent === 0) {
        startCache[prevIndent] = prevStart + len
        break
      }
      if (prevIndent <= cacheIndent) {
        cacheIndent = prevIndent
        startCache[prevIndent] = startCache[prevIndent] || prevStart + len
      }
    } else
      cacheIndent = parseInt(prevNode.attr(INDENT_KEY) as string, 10) || 0
    prevNode = prevNode.prev()
  }

  let nextNode = block
  while (nextNode) {
    if (['ol', 'ul'].includes(nextNode.name)) {
      const nextIndent = parseInt(nextNode.attr(INDENT_KEY) as string, 10) || 0
      const nextStart = parseInt(nextNode.attr('start') as string, 10)
      const _len = nextNode.find('li').length

      if (nextNode.name === 'ol') {
        let currentStart = startCache[nextIndent];
        if (nextIndent > 0) {
          currentStart = currentStart || 1
          if (currentStart > 1)
            nextNode.attr("start", currentStart)
          else
            nextNode.removeAttr("start")
          startCache[nextIndent] = currentStart + _len
        } else {
          if (currentStart && currentStart !== nextStart) {
            if (currentStart > 1)
              nextNode.attr("start", currentStart)
            else
              nextNode.removeAttr("start")
            startCache[nextIndent] = currentStart + _len
          } else {
            startCache[nextIndent] = (nextStart || 1) + _len
            startCache = startCache.slice(0, nextIndent + 1)
          }
        }
      }
    } else
      startCache = []

    nextNode = nextNode.next()!
  }
}


export const isBlockLastOffset = (range: RangeInterface, edge: 'start' | 'end') => {
  const container = getNodeModel(range[`${edge}Container` as keyof RangeInterface] as any)
  const offset = range[`${edge}Offset` as keyof RangeInterface] as number
  const newRange = range.cloneRange()
  const block = getClosestBlock(container)
  if (!block) return false
  newRange.selectNodeContents(block[0])
  newRange.setStart(container[0], offset)
  const fragment = newRange.cloneContents()

  if (!fragment.firstChild) {
    return true
  }

  const node = getNodeModel('<div />')
  node.append(fragment)

  return !(node.find('br').length > 0) && isEmptyNode(node[0])
} 
