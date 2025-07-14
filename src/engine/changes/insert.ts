import { BlockManager } from "../core/block";
import getNodeModel, { NodeModel } from "../core/node";
import { RangeInterface } from "../types";
import { addOrRemoveBr } from "../utils/block";
import {
  getClosestBlock,
  getDocument,
  isEmptyNode,
  removeSideBr,
  wrapNode,
} from "../utils/node";
import {
  createBookmark,
  deepCut,
  enlargeRange,
  moveToBookmark,
  shrinkRange,
} from "../utils/range";
import { deleteContent } from "./delete";
import { mergeNode } from "./merge";
import { isBlockLastOffset } from "./utils/block";

function getFirstChild(node: Node): Node {
  let child = node.firstChild;
  if (!child) return node;
  if (!getNodeModel(child).isBlock()) return node;
  while (
    child &&
    ["blockquote", "ul", "ol"].includes(getNodeModel(child).name)
  ) {
    child = child.firstChild;
  }
  return child!;
}

export const insertNode = (range: RangeInterface, node: NodeModel) => {
  node = getNodeModel(node);
  range.insertNode(node[0]);
  range.selectNodeContents(node[0]);
  shrinkRange(range);
  range.collapse(false);
  return range;
};

export function insertInline(range: RangeInterface, inline: NodeModel) {
  const doc = getDocument(range.startContainer);
  if (typeof inline === "string") {
    inline = getNodeModel(inline, doc);
  }
  // 范围为折叠状态时先删除内容
  if (!range.collapsed) {
    deleteContent(range, false);
  }
  // 插入新 Inline
  insertNode(range, inline);

  if (inline.name !== "br") {
    addOrRemoveBr(range);
  }

  range.selectNode(inline[0]);
  range.collapse(false);
  return range;
}

export const insertBlock = (
  range: RangeInterface,
  block: NodeModel,
  noEmptyBlock: boolean
) => {
  const doc = getDocument(range.startContainer);
  if (typeof block === "string") {
    block = getNodeModel(block, doc);
  }

  // 范围为折叠状态时先删除内容
  if (!range.collapsed) {
    deleteContent(range);
  }

  // 获取上面第一个 Block
  const container = getClosestBlock(getNodeModel(range.startContainer));
  if (!container) {
    return range;
  }
  // 超出编辑范围
  if (!container.isRoot() && !container.isEditable()) {
    return range;
  }
  // 当前选择范围在段落外面
  if (container.isRoot()) {
    range = insertNode(range, block);
    range.collapse(false);
    return range;
  }
  // <p><cursor /><br /></p>
  // to
  // <p><br /><cursor /></p>
  if (container.children().length === 1 && container.first()?.name === "br") {
    range.selectNodeContents(container[0]);
    range.collapse(false);
  }
  // 插入范围的开始和结束标记
  enlargeRange(range);
  const bookmark = createBookmark(range);
  if (!bookmark) {
    return range;
  }
  // 子节点分别保存在两个变量
  const leftBlock = container.clone(false);
  const rightBlock = container.clone(false);
  // 切割 Block
  let node = container.first();
  let isLeft = true;

  while (node) {
    const next = node.next();
    if (node[0] !== bookmark.anchor) {
      if (isLeft) {
        leftBlock.append(node);
      } else {
        rightBlock.append(node);
      }
      node = next;
    } else {
      isLeft = false;
      node = next;
    }
  }

  // Block 的两边添加新的 Block
  if (isEmptyNode(leftBlock[0])) {
    if (isEmptyNode(rightBlock[0]!) && !noEmptyBlock) {
      container.before(leftBlock);
    }
  } else {
    container.before(leftBlock);
  }

  if (!isEmptyNode(rightBlock[0]!)) {
    container.after(rightBlock);
  }

  // 移除范围的开始和结束标记
  moveToBookmark(range, bookmark);
  // 移除原 Block
  range.setStartAfter(container[0]);
  range.collapse(true);
  container.remove();
  // 插入新 Block
  insertNode(range, block);
  return range;
};

export const insertNodeList = (
  range: RangeInterface,
  nodes: Node[],
  block: BlockManager
) => {
  const doc = getDocument(range.startContainer);

  if (nodes.length !== 0) {
    let lastNode = getNodeModel(nodes[nodes.length - 1]);
    if ("br" === lastNode.name) {
      lastNode.remove();
      lastNode = getNodeModel(nodes[nodes.length - 1]);
    }
    const fragment = doc.createDocumentFragment();
    let node: Node | NodeModel = nodes[0];
    while (node) {
      node = getNodeModel(node);
      removeSideBr(node);
      const next = node.next()!;

      if (!next) {
        lastNode = node;
      }
      fragment.appendChild(node[0]);
      node = next;
    }
    range.insertNode(fragment);
    range.collapse(false);
    focusToBlock(range, block);
  }
};

/**
 * 插入文档片段到指定范围
 *
 * 这个函数处理将文档片段(DocumentFragment)插入到编辑器的指定位置，同时保持文档结构的完整性。
 * 主要处理逻辑包括：
 * 1. 处理非空选区的内容删除
 * 2. 针对内联内容和块级内容采用不同的插入策略
 * 3. 保持引用块(blockquote)结构的一致性
 * 4. 处理列表项的合并和清理
 * 5. 合并相邻的结构相同的块级元素
 *
 * @param range - 要插入内容的选区范围
 * @param block - 块元素实例
 * @param fragment - 要插入的文档片段
 * @param callback - 插入完成后的回调函数
 * @returns 更新后的选区范围
 */
export const insertFragment = (
  range: RangeInterface,
  block: BlockManager,
  fragment: DocumentFragment,
  callback?: () => void
) => {
  // 获取选区起始和结束位置所在的最近块级元素
  const firstBlock = getClosestBlock(getNodeModel(range.startContainer));
  const lastBlock = getClosestBlock(getNodeModel(range.endContainer));

  // 检查是否在引用块内，用于保持引用块结构
  const blockquoteNode = firstBlock?.closest("blockquote");

  // 获取文档片段的子节点和第一个子节点
  const childNodes = fragment.childNodes! as unknown as Node[];
  const firstNode = getNodeModel(fragment.firstChild!);

  // 步骤1: 如果选区不是折叠的(即有选中内容)，先删除选中内容
  // 参数决定是否保留段落结构：当起止块相同或结束位置不在块末尾时保留
  if (!range.collapsed) {
    deleteContent(
      range,
      lastBlock?.[0] === firstBlock?.[0] || !isBlockLastOffset(range, "end")
    );
  }

  // 如果文档片段为空，直接返回选区
  if (!firstNode[0]) return range;

  // 步骤2: 处理内联内容插入
  // 如果第一个节点不是块级元素也不是卡片，作为内联内容处理
  if (!firstNode.isBlock() && !firstNode.isCard()) {
    shrinkRange(range); // 缩小选区确保精确定位
    range.insertNode(fragment); // 直接插入片段
    range.collapse(false); // 将光标移至插入内容之后
    return range;
  }

  // 步骤3: 处理块级内容插入
  // 深度切割选区位置，确保插入点在块级元素边界
  deepCut(range);

  // 获取插入位置前后的节点，用于后续处理相邻节点的合并
  const startNode = range.startContainer.childNodes[range.startOffset - 1]; // 插入点前的节点
  const startNode1 = range.startContainer.childNodes[range.startOffset]; // 插入点后的节点

  // 步骤4: 保持引用块结构一致性
  // 如果在引用块内，确保插入的内容也在引用块内
  if (blockquoteNode?.[0] && childNodes.length > 0) {
    childNodes.forEach((node: any) => {
      // 对非blockquote节点进行包装，保持引用块结构
      if ("blockquote" !== getNodeModel(node).name) {
        wrapNode(node, blockquoteNode.clone(false)[0]);
      }
    });
  }

  // 步骤5: 插入节点列表
  insertNodeList(range, childNodes, block);

  // 步骤6: 处理插入点前节点的后续清理和合并
  if (blockquoteNode?.[0] && startNode) {
    // 获取startNode的最后一个子节点和其下一个兄弟节点的第一个子节点
    const _firstNode = getNodeModel(getFirstChild(startNode.nextSibling!));
    const _lastNode = getNodeModel(getLastChild(startNode));

    // 如果两个节点可以合并(如同类型段落或列表项)
    if (isListChild(_lastNode, _firstNode)) {
      clearList(_lastNode, _firstNode); // 清理列表结构
      mergeNode(_lastNode, _firstNode, false); // 合并节点
      removeEmptyNode(_firstNode); // 删除合并后可能空的节点
    } else {
      // 处理可能的空节点
      if (isEmptyNode(_lastNode[0]) || isEmptyListItem(_lastNode)) {
        removeEmptyNode(_lastNode);
      }
    }
  }

  // 步骤7: 处理插入点后节点的后续清理和合并
  if (startNode1) {
    // 获取startNode1的前一个兄弟节点的最后一个子节点和其第一个子节点
    const prevNode = getNodeModel(getLastChild(startNode1.previousSibling!)),
      nextNode = getNodeModel(getFirstChild(startNode1));

    // 将光标定位到prevNode内容末尾
    range.selectNodeContents(prevNode[0]);
    shrinkRange(range);
    range.collapse(false);

    // 处理nextNode：如果为空则删除，否则尝试与prevNode合并
    if (isEmptyNode(nextNode[0])) {
      removeEmptyNode(nextNode);
    } else if (isListChild(prevNode, nextNode)) {
      mergeNode(prevNode, nextNode, false);
      removeEmptyNode(nextNode);
    }
  }

  // 步骤8: 合并相邻的相同类型块级元素
  mergeAdjacentBlockquote(range); // 合并相邻的引用块
  mergeAdjacentList(range); // 合并相邻的列表

  // 执行回调函数
  if (callback) callback();

  // 返回更新后的选区
  return range;
};

function getLastChild(node: Node): Node {
  let child = node.lastChild!;
  if (!getNodeModel(child).isBlock()) return node;
  while (["blockquote", "ul", "ol"].includes(getNodeModel(child).name)) {
    child = child.lastChild!;
  }
  return child;
}
function isListChild(_lastNode: NodeModel, _firstNode: NodeModel) {
  return (
    "p" === _firstNode.name ||
    (_lastNode.name === _firstNode.name &&
      !(
        "li" === _lastNode.name &&
        !isSameList(_lastNode.parent()!, _firstNode.parent()!)
      ))
  );
}

function isSameList(lastNode: NodeModel, firstNode: NodeModel): boolean {
  return (
    lastNode.name === firstNode.name &&
    !(
      "li" === lastNode.name &&
      !isSameList(lastNode.parent()!, firstNode.parent()!)
    )
  );
}
function clearList(_lastNode: NodeModel, _firstNode: NodeModel) {
  throw new Error("Function not implemented.");
}

function removeEmptyNode(_firstNode: NodeModel) {
  throw new Error("Function not implemented.");
}

function isEmptyListItem(_lastNode: NodeModel): boolean {
  throw new Error("Function not implemented.");
}

function mergeAdjacentBlockquote(range: RangeInterface) {
  throw new Error("Function not implemented.");
}

function mergeAdjacentList(range: RangeInterface) {
  throw new Error("Function not implemented.");
}
function focusToBlock(range: RangeInterface, block: BlockManager) {
  const blockRoot = block.closest(range.startContainer);
  if (blockRoot && block) block.focus(range, blockRoot, false);
}
