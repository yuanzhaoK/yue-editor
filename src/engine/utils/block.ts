







import { CARD_KEY } from "../constants";
import { DAPHNE_ELEMENT } from "../constants/bookmark";
import getNodeModel, { NodeModel } from '../core/node';



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