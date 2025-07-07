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
import { getClosestBlock, getDocument, unwrapNode } from "../../utils/node";
import getNodeModel, { NodeModel } from "../../core/node";
import { BRAND, CARD_KEY } from "@/engine/constants";
import { createBookmark, moveToBookmark } from "@/engine/utils/range";

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

  if (block.children().length === 2 && block.first()?.attr(CARD_KEY) === 'checkbox' && block.last()?.attr(`data-${BRAND}-element`) === 'cursor') {
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