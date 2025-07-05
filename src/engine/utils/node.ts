/**
 * Daphne Editor Engine - Node Utility
 *
 * 节点操作工具，提供DOM节点的各种操作和判断功能
 */

import { CARD_KEY, READY_CARD_KEY } from "../constants";
import getNodeModel, { NodeModel } from "../core/node"


/**
 * 获取窗口对象
 * @param node - DOM节点
 * @returns 窗口对象
 */
export function getWindow(node: Node): Window {
    const doc = node.ownerDocument || document;
    return doc.defaultView || window;
}


/**
 * 获取文档对象
 * @param node - DOM节点
 * @returns 文档对象
 */
export function getDocument(node: Node): Document {
    return node.ownerDocument || document;
}


// 遍历所有子节点
// return false：停止遍历
// return true：停止遍历当前节点，下一个兄弟节点继续遍历
export const walkTree = (root: NodeModel, callback: (node: NodeModel) => boolean | undefined, order?: boolean) => {
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


export const removeMinusStyle = (node: NodeModel, indent: string) => {
    if (node.isBlock()) {
        const val = parseInt(node.css(indent), 10) || 0
        if (val < 0)
            node.css(indent, "")
    }
}




/**
 * 检查节点是否为空（忽略空白字符）
 * @param node - 要检查的节点
 * @returns 是否为空
 */
export function isEmptyNodeWithTrim(node: Node): boolean {
    if (!node) return true;

    if (node.nodeType === Node.TEXT_NODE) {
        return !node.textContent?.trim();
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;

        // 检查是否有非空白文本内容
        const textContent = element.textContent?.trim();
        if (textContent) return false;

        // 检查是否有非空元素
        const children = element.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];

            // 忽略空的span、em、strong等标签
            if (['SPAN', 'EM', 'STRONG', 'B', 'I', 'U'].includes(child.tagName)) {
                if (!isEmptyNodeWithTrim(child)) return false;
            } else {
                // 其他元素如果存在就认为不为空
                return false;
            }
        }

        return true;
    }

    return false;
}

/**
 * 检查节点是否为空
 * @param node - 要检查的节点
 * @returns 是否为空
 */
export function isEmptyNode(node: Node): boolean {
    if (!node) return true;

    if (node.nodeType === Node.TEXT_NODE) {
        return !node.textContent;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        return element.children.length === 0 && !element.textContent;
    }

    return false;
}

/**
 * 检查节点是否为块级元素
 * @param node - 要检查的节点
 * @returns 是否为块级元素
 */
export function isBlockNode(node: Node): boolean {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    const blockTags = [
        'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'hr',
        'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
        'section', 'article', 'header', 'footer', 'main', 'aside'
    ];

    return blockTags.includes(tagName);
}

/**
 * 检查节点是否为内联元素
 * @param node - 要检查的节点
 * @returns 是否为内联元素
 */
export function isInlineNode(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) return true;
    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    const inlineTags = [
        'span', 'a', 'strong', 'b', 'em', 'i', 'u', 'code',
        'sub', 'sup', 'small', 'big', 'mark', 'del', 'ins'
    ];

    return inlineTags.includes(tagName);
}

/**
 * 检查节点是否为可编辑元素
 * @param node - 要检查的节点
 * @returns 是否可编辑
 */
export function isEditableNode(node: Node): boolean {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    const element = node as Element;
    const contentEditable = element.getAttribute('contenteditable');

    if (contentEditable === 'true') return true;
    if (contentEditable === 'false') return false;

    // 检查父元素
    const parent = element.parentElement;
    if (parent) {
        return isEditableNode(parent);
    }

    return false;
}

/**
 * 获取节点的最近块级祖先
 * @param node - 起始节点
 * @returns 最近的块级祖先节点
 */
export function getClosestBlock(node: Node): Element | null {
    let current: Node | null = node;

    while (current && current.nodeType !== Node.DOCUMENT_NODE) {
        if (current.nodeType === Node.ELEMENT_NODE && isBlockNode(current)) {
            return current as Element;
        }
        current = current.parentNode;
    }

    return null;
}

/**
 * 获取节点的所有祖先元素
 * @param node - 起始节点
 * @param root - 根节点（可选）
 * @returns 祖先元素数组
 */
export function getAncestors(node: Node, root?: Node): Element[] {
    const ancestors: Element[] = [];
    let current: Node | null = node.parentNode;

    while (current && current !== root && current.nodeType !== Node.DOCUMENT_NODE) {
        if (current.nodeType === Node.ELEMENT_NODE) {
            ancestors.push(current as Element);
        }
        current = current.parentNode;
    }

    return ancestors;
}

/**
 * 获取两个节点的最近公共祖先
 * @param node1 - 节点1
 * @param node2 - 节点2
 * @returns 最近公共祖先
 */
export function getCommonAncestor(node1: Node, node2: Node): Node | null {
    const ancestors1 = [node1, ...getAncestors(node1)];
    const ancestors2 = [node2, ...getAncestors(node2)];

    for (const ancestor1 of ancestors1) {
        if (ancestors2.includes(ancestor1)) {
            return ancestor1;
        }
    }

    return null;
}

/**
 * 检查节点是否包含另一个节点
 * @param container - 容器节点
 * @param contained - 被包含的节点
 * @returns 是否包含
 */
export function containsNode(container: Node, contained: Node): boolean {
    if (container === contained) return true;

    if (container.nodeType === Node.ELEMENT_NODE) {
        return (container as Element).contains(contained);
    }

    return false;
}

/**
 * 获取节点在父节点中的索引
 * @param node - 子节点
 * @returns 索引值，如果不是子节点返回-1
 */
export function getNodeIndex(node: Node): number {
    if (!node.parentNode) return -1;

    return Array.from(node.parentNode.childNodes).indexOf(node as ChildNode);
}

/**
 * 获取节点的下一个兄弟元素
 * @param node - 起始节点
 * @returns 下一个兄弟元素
 */
export function getNextElementSibling(node: Node): Element | null {
    let current = node.nextSibling;

    while (current) {
        if (current.nodeType === Node.ELEMENT_NODE) {
            return current as Element;
        }
        current = current.nextSibling;
    }

    return null;
}

/**
 * 获取节点的前一个兄弟元素
 * @param node - 起始节点
 * @returns 前一个兄弟元素
 */
export function getPreviousElementSibling(node: Node): Element | null {
    let current = node.previousSibling;

    while (current) {
        if (current.nodeType === Node.ELEMENT_NODE) {
            return current as Element;
        }
        current = current.previousSibling;
    }

    return null;
}

/**
 * 移除节点但保留其子节点
 * @param node - 要移除的节点
 */
export function unwrapNode(node: Node): void {
    if (!node.parentNode) return;

    const parent = node.parentNode;

    // 将子节点移动到父节点中
    while (node.firstChild) {
        parent.insertBefore(node.firstChild, node);
    }

    // 移除空节点
    parent.removeChild(node);
}

/**
 * 用新节点包装现有节点
 * @param node - 要包装的节点
 * @param wrapper - 包装节点
 */
export function wrapNode(node: Node, wrapper: Element): void {
    if (!node.parentNode) return;

    const parent = node.parentNode;
    parent.insertBefore(wrapper, node);
    wrapper.appendChild(node);
}

/**
 * 克隆节点（深拷贝）
 * @param node - 要克隆的节点
 * @returns 克隆的节点
 */
export function cloneNode(node: Node): Node {
    return node.cloneNode(true);
}

/**
 * 检查节点是否为根编辑区域
 * @param node - 要检查的节点
 * @returns 是否为根编辑区域
 */
export function isRootEditableNode(node: Node): boolean {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    const element = node as Element;
    return element.getAttribute('contenteditable') === 'true' &&
        !getAncestors(node).some(ancestor =>
            ancestor.getAttribute('contenteditable') === 'true'
        );
}

/**
 * 获取节点的纯文本内容
 * @param node - 节点
 * @returns 纯文本内容
 */
export function getTextContent(node: Node): string {
    return node.textContent || '';
}

/**
 * 设置节点的纯文本内容
 * @param node - 节点
 * @param text - 文本内容
 */
export function setTextContent(node: Node, text: string): void {
    if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = text;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        (node as Element).textContent = text;
    }
}




// 对比两个节点的标签
/**
 * 对比两个节点的标签
 * @param node - 节点
 * @param otherNode - 另一个节点
 * @returns 是否相等
 */
export const equalNode = (node: Node, otherNode: Node) => {
    let nodeItem = getNodeModel(node)
    let otherNodeItem = getNodeModel(otherNode)

    if (nodeItem.name !== otherNodeItem.name) {
        return false
    }

    const attrs = nodeItem.attr() as Record<string, string | number | boolean>
    delete attrs.style
    const otherAttrs = otherNodeItem.attr() as Record<string, string | number | boolean>
    delete otherAttrs.style
    const styles = nodeItem.css() as unknown as Record<string, string | number>
    const otherStyles = otherNodeItem.css() as unknown as Record<string, string | number>

    if (Object.keys(attrs).length === 0 &&
        Object.keys(otherAttrs).length === 0 &&
        Object.keys(styles).length === 0 &&
        Object.keys(otherStyles).length === 0) {
        return true
    }

    if (Object.keys(attrs).length !== Object.keys(otherAttrs).length || Object.keys(styles).length !== Object.keys(otherStyles).length) {
        return false
    }

    if (Object.keys(attrs).length > 0) {
        return Object.keys(attrs).some(key => {
            return otherAttrs[key]
        })
    }

    return Object.keys(styles).some((key: string) => {
        return otherStyles[key]
    })
} 