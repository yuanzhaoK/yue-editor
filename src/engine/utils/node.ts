/**
 * Daphne Editor Engine - Node Utility
 *
 * 节点操作工具，提供DOM节点的各种操作和判断功能
 */

import {
  CARD_KEY,
  INDENT_KEY,
  READY_CARD_KEY,
  ROOT,
  ROOT_TAG_MAP,
} from "../constants";
import { ANCHOR, CURSOR, DAPHNE_ELEMENT, FOCUS } from "../constants/bookmark";
import getNodeModel, { NodeModel } from "../core/node";

export const Level: Record<string, number> = {
  blockquote: 3,
  h1: 2,
  h2: 2,
  h3: 2,
  h4: 2,
  h5: 2,
  h6: 2,
  ul: 2,
  ol: 2,
  li: 2,
  p: 1,
};

export const setNode = (node: Node, otherNode: Node) => {
  const nodeModel = getNodeModel(node);
  const otherNodeModel = getNodeModel(otherNode).clone(false);
  let child = nodeModel.first();

  while (child) {
    const next = child.next();
    otherNodeModel.append(child);
    child = next;
  }

  return nodeModel.replaceWith(otherNodeModel);
};
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
export const walkTree = (
  root: NodeModel,
  callback: (node: NodeModel) => boolean | undefined,
  order?: boolean
) => {
  order = order === undefined ? true : order;
  const walk = (node: NodeModel) => {
    let child = order ? node.first()?.[0] : node.last()?.[0];

    while (child) {
      const next = order ? child.nextSibling : child.previousSibling;
      const result = callback(getNodeModel(child));

      if (result === false) {
        return;
      }

      if (
        !getNodeModel(child).attr(CARD_KEY) &&
        !getNodeModel(child).attr(READY_CARD_KEY) &&
        result !== true
      ) {
        walk(getNodeModel(child));
      }

      child = next!;
    }
  };

  callback(root);
  walk(root);
};
// 获取所欲子节点
export const fetchAllChildren = (root: NodeModel) => {
  var children: NodeModel[] = [];
  walkTree(root, (node: NodeModel) => {
    children.push(node);
    return false;
  });
  children.shift();
  return children;
};

export const removeMinusStyle = (node: NodeModel, indent: string) => {
  if (node.isBlock()) {
    const val = parseInt(node.css(indent), 10) || 0;
    if (val < 0) node.css(indent, "");
  }
};

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
      if (["SPAN", "EM", "STRONG", "B", "I", "U"].includes(child.tagName)) {
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
    "div",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "hr",
    "table",
    "tr",
    "td",
    "th",
    "thead",
    "tbody",
    "tfoot",
    "section",
    "article",
    "header",
    "footer",
    "main",
    "aside",
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
    "span",
    "a",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "code",
    "sub",
    "sup",
    "small",
    "big",
    "mark",
    "del",
    "ins",
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
  const contentEditable = element.getAttribute("contenteditable");

  if (contentEditable === "true") return true;
  if (contentEditable === "false") return false;

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
export function getClosestBlock(node: NodeModel): NodeModel | null {
  let current: Node | null = node[0];

  while (current && current.nodeType !== Node.DOCUMENT_NODE) {
    if (current.nodeType === Node.ELEMENT_NODE && isBlockNode(current)) {
      return getNodeModel(current);
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

  while (
    current &&
    current !== root &&
    current.nodeType !== Node.DOCUMENT_NODE
  ) {
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
export function wrapNode(node: Node, wrapper: Node): void {
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
  return (
    element.getAttribute("contenteditable") === "true" &&
    !getAncestors(node).some(
      (ancestor) => ancestor.getAttribute("contenteditable") === "true"
    )
  );
}

/**
 * 获取节点的纯文本内容
 * @param node - 节点
 * @returns 纯文本内容
 */
export function getTextContent(node: Node): string {
  return node.textContent || "";
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
  let nodeItem = getNodeModel(node);
  let otherNodeItem = getNodeModel(otherNode);

  if (nodeItem.name !== otherNodeItem.name) {
    return false;
  }

  const attrs = nodeItem.attr() as Record<string, string | number | boolean>;
  delete attrs.style;
  const otherAttrs = otherNodeItem.attr() as Record<
    string,
    string | number | boolean
  >;
  delete otherAttrs.style;
  const styles = nodeItem.css() as unknown as Record<string, string | number>;
  const otherStyles = otherNodeItem.css() as unknown as Record<
    string,
    string | number
  >;

  if (
    Object.keys(attrs).length === 0 &&
    Object.keys(otherAttrs).length === 0 &&
    Object.keys(styles).length === 0 &&
    Object.keys(otherStyles).length === 0
  ) {
    return true;
  }

  if (
    Object.keys(attrs).length !== Object.keys(otherAttrs).length ||
    Object.keys(styles).length !== Object.keys(otherStyles).length
  ) {
    return false;
  }

  if (Object.keys(attrs).length > 0) {
    return Object.keys(attrs).some((key) => {
      return otherAttrs[key];
    });
  }

  return Object.keys(styles).some((key: string) => {
    return otherStyles[key];
  });
};

// 移除占位符 \u200B
export const removeZeroWidthSpace = (root: NodeModel) => {
  walkTree(root, (node: NodeModel) => {
    if (node[0].nodeType !== Node.TEXT_NODE) {
      return false;
    }
    const text = node[0].nodeValue;
    if (text && text.length !== 2) {
      return;
    }
    if (
      text &&
      text.charCodeAt(1) === 0x200b &&
      node[0].nextSibling &&
      node[0].nextSibling.nodeType === Node.ELEMENT_NODE &&
      [ANCHOR, FOCUS, CURSOR].indexOf(
        (node[0].nextSibling as Element).getAttribute(DAPHNE_ELEMENT) || ""
      ) >= 0
    ) {
      return;
    }

    if (text && text.charCodeAt(0) === 0x200b) {
      const textNode = node[0] as Text;
      const newNode = textNode.splitText(1);
      newNode.parentNode?.removeChild(newNode.previousSibling!);
    }
  });
};

/**
 *  删除两边的 BR
 * @param node
 */
export const removeSideBr = (node: NodeModel) => {
  // 删除第一个 BR
  const firstNode = node.first();
  if (firstNode && firstNode.name === "br" && node.children().length > 1) {
    firstNode.remove();
  }
  // 删除最后一个 BR
  const lastNode = node.last();
  if (lastNode && lastNode.name === "br" && node.children().length > 1) {
    lastNode.remove();
  }
};

/**
 * 根据节点的层级关系决定保留哪个节点结构
 * 决定在节点提取过程中应该保留的主导节点，并处理特殊情况下的缩进关系
 * @param node - 子节点
 * @param parentNode - 父节点
 * @returns 应当保留的节点结构
 */
export const determineStructuralNode = (
  node: NodeModel,
  parentNode: NodeModel
) => {
  if (!Level[node.name] || !Level[parentNode.name]) return parentNode;
  if (Level[node.name] > Level[parentNode.name]) return node;
  if (
    ["ul", "ol"].includes(node.name) &&
    ["ul", "ol"].includes(parentNode.name)
  ) {
    const parentIndent =
      parseInt(parentNode.attr(INDENT_KEY) as string, 10) || 0;
    const nodeIndent = parseInt(node.attr(INDENT_KEY) as string, 10) || 0;
    parentNode.attr(INDENT_KEY, nodeIndent ? nodeIndent + 1 : parentIndent + 1);
  }
  return parentNode;
};

/**
 * 判断节点间的嵌套关系是否需要保留特殊格式
 * 主要用于处理列表（ol/ul与li）和引用块（blockquote）之间的嵌套关系
 * @param parentNodeName - 父节点名称
 * @param childNodeName - 子节点名称
 * @returns 是否需要保留特殊格式结构
 */
export const shouldPreserveNestedStructure = (
  parentNodeName: string,
  childNodeName: string
) => {
  return (
    (["ol", "ul"].includes(parentNodeName) && "li" === childNodeName) ||
    ("blockquote" === parentNodeName &&
      ROOT_TAG_MAP[childNodeName] &&
      "blockquote" !== childNodeName)
  );
};

export const replacePre = (node: NodeModel) => {
  const firstNode = node.first();
  if (firstNode && "code" !== firstNode.name) {
    const html = node.html();
    html.split(/\r?\n/).forEach((temHtml) => {
      temHtml = temHtml
        .replace(/^\s/, "&nbsp;")
        .replace(/\s$/, "&nbsp;")
        .replace(/\s\s/g, " &nbsp;")
        .trim();
      if ("" === temHtml) {
        temHtml = "<br />";
      }
      node.before("<p>".concat(temHtml, "</p>"));
    });
    node.remove();
  }
};
/**
 * 将节点从嵌套结构中提取并移动到更接近根节点的层级
 * 同时保留必要的层级关系和样式属性
 * @param node - 需要提取的节点
 * @param rootNode - 根节点，提取过程会停止在这个节点
 */
export const extractNodeTowardsRoot = (
  node: NodeModel,
  rootNode: NodeModel
) => {
  let parentNode = node.parent()!;
  while (parentNode[0] !== rootNode[0]) {
    if (node.isCard()) parentNode.before(node);
    else if (shouldPreserveNestedStructure(parentNode.name, node.name)) {
      const cloneNode = parentNode.clone(false);
      cloneNode.append(node);
      node = cloneNode;
      parentNode.before(node);
    } else {
      node = setNode(
        node[0],
        determineStructuralNode(parentNode, node).clone(false)[0]
      );
      parentNode.before(node);
    }
    if (!parentNode.first()) parentNode.remove();
    parentNode = node.parent()!;
  }
  if ("pre" === node.name) {
    replacePre(node);
  }
};

/**
 * 扁平化处理DOM节点结构，优化文档层级
 *
 * 此函数递归处理节点树，将复杂的嵌套结构转换为更加扁平的结构，使文档层级更加清晰。
 * 主要处理逻辑：
 * 1. 特殊块级元素（卡片、表格等）直接提取到根节点层级
 * 2. 普通块级元素递归处理其子节点
 * 3. 连续的内联元素会被合并到同类型容器中，然后提取到适当层级
 *
 * @param node - 要扁平化处理的节点
 * @param rootNode - 根节点，扁平化过程的参考点，默认为node本身
 */
export const flatten = (node: NodeModel, rootNode?: NodeModel) => {
  // 确定根节点，如果未提供则使用当前节点作为根节点
  let root = rootNode || node;

  // 检查当前节点是否为文档片段
  const isFragment = node.type === Node.DOCUMENT_FRAGMENT_NODE;

  // 获取第一个子节点，作为处理的起点
  let firstNode = node.first();

  // 创建临时节点用于后续克隆，如果是文档片段则创建p标签，否则克隆当前节点
  const tempNode = isFragment ? getNodeModel("<p />") : node.clone(false);

  // 遍历所有子节点进行处理
  while (firstNode) {
    // 保存下一个节点引用，因为当前节点可能会在处理中被移动
    let nextNode = firstNode.next();

    // 策略1：处理特殊块级元素（卡片、表格、简单块）
    if (
      firstNode.isBlockCard() ||
      firstNode.isTable() ||
      firstNode.isSimpleBlock()
    ) {
      // 直接将这些特殊块元素提取到根节点层级
      extractNodeTowardsRoot(firstNode, root);
    }
    // 策略2：处理普通块级元素
    else if (firstNode.isBlock()) {
      // 递归处理块级元素的子节点
      flatten(firstNode, rootNode);
    }
    // 策略3：处理内联元素
    else {
      // 创建一个容器节点，用于包装连续的内联元素
      const cloneNode = tempNode.clone(false);

      // 检查是否为列表项，列表项有特殊处理逻辑
      const isLI = "li" === cloneNode.name;

      // 将容器节点插入到当前处理节点之前
      firstNode.before(cloneNode);

      // 收集连续的内联元素到容器节点中
      while (firstNode) {
        // 保存下一个节点引用
        nextNode = firstNode.next();

        // 检查是否为换行符且不在列表项中
        const isBR = "br" === firstNode.name && !isLI;

        // 将当前内联节点添加到容器中
        cloneNode.append(firstNode);

        // 如果遇到换行符、没有下一个节点或下一个节点是块级元素，则停止收集
        if (isBR || !nextNode || nextNode.isBlock()) break;

        // 移动到下一个内联节点
        firstNode = nextNode;
      }

      // 清理容器节点，移除两端可能的多余BR标签
      removeSideBr(cloneNode);

      // 将处理好的容器节点提取到适当的层级
      extractNodeTowardsRoot(cloneNode, root);
    }

    // 更新firstNode为之前保存的nextNode，继续处理
    firstNode = nextNode;
  }
};

/**
 * 将源节点的所有子节点转移到目标节点，然后删除源节点
 * 用于合并相同类型的节点，保留内容但删除多余的容器结构
 * @param targetNode - 接收内容的目标节点
 * @param sourceNode - 提供内容的源节点，操作后会被删除
 */
const mergeNodeContents = (targetNode: NodeModel, sourceNode: NodeModel) => {
  let firstNode = sourceNode.first();
  while (firstNode) {
    let nextNode = firstNode.next();
    targetNode.append(firstNode);
    firstNode = nextNode;
  }
  sourceNode.remove();
};
const isCheckbox = (node: NodeModel) => {
  if (!node || !node[0]) {
    return false;
  }
  return (
    node.isCard() &&
    (node.attr("data-lake-card") === "checkbox" ||
      "checkbox" === node.attr("data-ready-card"))
  );
};
const isTaskListBlock = (listBlock: NodeModel) => {
  switch (listBlock.name) {
    case "li":
      return (
        isCheckbox(listBlock.first()!) ||
        listBlock.hasClass(`${ROOT}-list-task`)
      );

    case "ul":
      return listBlock.hasClass(`${ROOT}-list`);

    default:
      return false;
  }
};
/**
 * 检查两个列表节点是否属于同一类型列表
 * @param list1 - 第一个列表节点
 * @param list2 - 第二个列表节点
 * @returns 是否为同类列表
 */
const isSameList = (sourceNode: NodeModel, targetNode: NodeModel): boolean => {
  if (sourceNode.name !== targetNode.name) return false;
  if (isTaskListBlock(sourceNode) !== isTaskListBlock(targetNode)) return false;

  // 检查两个列表的缩进级别是否相同
  const sourceIndent = parseInt(sourceNode.attr(INDENT_KEY) as string, 10) || 0;
  const targetIndent = parseInt(targetNode.attr(INDENT_KEY) as string, 10) || 0;
  return sourceIndent === targetIndent;
};

/**
 * 合并相邻的相同类型节点
 * 递归处理节点树，合并相邻且类型相同的节点（如多个相邻的引用块或列表）
 * @param node - 要处理的节点
 */
const join = (node: NodeModel) => {
  let firstChild = node.first();
  while (firstChild) {
    let nextNode = firstChild.next();
    while (
      nextNode &&
      firstChild.name === nextNode.name &&
      ("blockquote" === firstChild.name ||
        (["ul", "ol"].includes(firstChild.name) &&
          isSameList(firstChild, nextNode)))
    ) {
      const nNode = nextNode.next();
      mergeNodeContents(firstChild, nextNode);
      join(firstChild);
      nextNode = nNode;
    }
    firstChild = nextNode;
  }
};

export const normalize = (node: NodeModel) => {
  flatten(node);
  join(node);
};
