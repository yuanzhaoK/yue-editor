import { CARD_KEY, READY_CARD_KEY } from "../constants";
import getNodeModel, { NodeModel } from "../core/node"

// 遍历所有子节点
// return false：停止遍历
// return true：停止遍历当前节点，下一个兄弟节点继续遍历
const walkTree = (root: NodeModel, callback: (node: NodeModel) => boolean, order?: boolean) => {
    order = order === undefined ? true : order
    const walk = (node: NodeModel) => {
        let child = order ? node.first()?.[0] : node.last()?.[0]

        while (child) {
            const next = order ? child.nextSibling : child.previousSibling;
            const result = callback(getNodeModel(child))

            if (result === false) {
                return
            }

            if (!getNodeModel(child).attr(CARD_KEY) && !getNodeModel(child).attr(READY_CARD_KEY) && result !== true) {
                walk(getNodeModel(child))
            }

            child = next!;
        }
    };

    callback(root)
    walk(root)
}
// 获取所欲子节点
export const fetchAllChildren = (root: NodeModel) => {
    var children: NodeModel[] = []
    walkTree(root, (node: NodeModel) => {
        children.push(node)
        return false
    })
    children.shift()
    return children
} 