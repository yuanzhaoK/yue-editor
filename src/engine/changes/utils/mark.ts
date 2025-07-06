import { DAPHNE_ELEMENT } from "@/engine/constants/bookmark"
import { NodeModel } from "@/engine/core/node"

// 从下开始往上遍历删除空 Mark，当遇到空 Block，添加 BR 标签
export const removeEmptyMarksAndAddBr = (node: NodeModel, notFirst?: boolean) => {
  if (!node || node.isRoot() || node.isCard() || node.attr(DAPHNE_ELEMENT)) {
    return
  }

  if (!node.attr(DAPHNE_ELEMENT)) {
    const parent = node.parent()
    // 包含光标标签
    // <p><strong><cursor /></strong></p>
    if (node.children().length === 1 && node.first()?.attr(DAPHNE_ELEMENT)) {
      if (node.isMark()) {
        node.before(node.first()!)
        node.remove()
        removeEmptyMarksAndAddBr(parent!, true)
      } else if (notFirst && node.isBlock()) {
        node.prepend('<br />')
      }
      return
    }

    const html = node.html()

    if (html === '' || html === "\u200B") {
      if (node.isMark()) {
        node.remove()
        removeEmptyMarksAndAddBr(parent!, true)
      } else if (notFirst && node.isBlock()) {
        node.html('<br />')
      }
    }
  }
}