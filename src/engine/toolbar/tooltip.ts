import getNodeModel, { NodeModel } from '../core/node'
import { escape } from '../utils/string'

const template = (options: { placement?: 'top' | 'bottom' | 'left' | 'right' }) => {
  return `
  <div 
    data-daphne-element="embed-tooltip" 
    class="daphne-tooltip daphne-tooltip-placement-${options.placement} 
    daphne-embed-tooltip" style="transform-origin: 50% 45px 0px;"
  >
      <div class="daphne-tooltip-content">
        <div class="daphne-tooltip-arrow"></div>
        <div class="daphne-tooltip-inner" data-role="tooltip"></div>
      </div>
    </div>
    `
}

export default {
  show: function (node: NodeModel, title: string, options?: { placement?: 'top' | 'bottom' | 'left' | 'right' }) {
    options = options || {
      placement: "top"
    }
    this.hide()
    const root = getNodeModel(template(options))
    // 设置提示文字
    title = escape(title)
    root.find('[data-role=tooltip]').html(title)
    // 计算定位
    const container = getNodeModel(document.body)
    container.append(root)
    const rootWidth = (root[0] as HTMLElement).clientWidth
    const rootHeight = (root[0] as HTMLElement).clientHeight
    const nodeWidth = (node[0] as HTMLElement).clientWidth
    const offset = node.offset()
    const left = Math.round(window.pageXOffset + offset.left + nodeWidth / 2 - rootWidth / 2)
    const top = Math.round(window.pageYOffset + offset.top - rootHeight - 2)
    root.css({
      left: left + 'px',
      top: top + 'px'
    });
    root.addClass('daphne-embed-tooltip-active')
  },
  hide: function () {
    getNodeModel('div[data-daphne-element=embed-tooltip]').remove()
  }
}