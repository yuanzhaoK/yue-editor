import { CardToolbarItem, CardToolbarItemConfig } from "../types";
import getNodeModel, { NodeModel } from "../core/node";

class EmbedToolbar {
  private template: string = `
  '<div class="daphne-embed-toolbar daphne-embed-toolbar-active" contenteditable="false"></div>'
  `

  list: CardToolbarItemConfig[]

  public root: NodeModel
  
  constructor({ list }: { list: CardToolbarItemConfig[] }) {
    this.list = list
    this.root = getNodeModel(this.template)
  }

  render(container: NodeModel) {
    const root = getNodeModel(this.template)
    this.list.forEach(item => {
      root.append(getNodeModel(item.node))
    })
  }
}

export default EmbedToolbar