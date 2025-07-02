import getNodeModel, { NodeModel } from "../core/node"
import { fetchAllChildren } from "./node"

export const copyNode = (node: NodeModel, event: any): boolean => {
  const selection = window.getSelection()
  let range

  if (selection && selection.rangeCount > 0) {
    range = selection.getRangeAt(0)
  } else {
    range = document.createRange()
  }

  const prevRange = range.cloneRange();
  const block = getNodeModel('<div>&#8203;</div>')
  block.css({
    position: 'fixed',
    top: 0,
    clip: 'rect(0, 0, 0, 0)'
  })
  getNodeModel(document.body).append(block)
  block.append(getNodeModel(node).clone(true))
  if (event) {
    fetchAllChildren(block).forEach(child => {
      child = getNodeModel(child)
      event.trigger("copy:each", child)
    })
  }
  block.append('@&#8203;')
  range.selectNodeContents(block[0])
  selection?.removeAllRanges()
  selection?.addRange(range)
  let success = false

  try {
    success = document.execCommand('copy')
    if (!success) {
      throw 'copy command was unsuccessful'
    }
  } catch (err) {
    console.log('unable to copy using execCommand: ', err)
  } finally {
  }
  return success
}