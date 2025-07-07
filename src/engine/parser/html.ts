/**
 * Daphne Editor Engine - HTML Parser
 *
 * HTML解析器，负责解析和序列化HTML内容
 * 提供DOM到HTML字符串的转换功能
 */

import getNodeModel, { NodeModel } from "../core/node";
import { ParserInterface, ParseResult } from "../types";
import { BRAND, VOID_TAG_MAP } from "../constants";
import { removeUnit, toHex, transformCustomTags } from "../utils/string";
import { DAPHNE_ELEMENT } from "../constants/bookmark";
import transform, { filter } from "./transform";
import {
  CARD_ELEMENT_KEY,
  CARD_KEY,
  CARD_TYPE_KEY,
  CARD_VALUE_KEY,
  READY_CARD_KEY,
} from "../constants/card";
const pToDiv = (html: string) => {
  return html
    .replace(/<p(>|\s+[^>]*>)/gi, "<div$1")
    .replace(/<\/p>/gi, "</div>");
};
/**
 * data type:
 *
 * Value: <p>foo</p><p><br /><cursor /></p>
 * LowerValue: <p>foo</p><p><br /><span data-lake-element="cursor"></span></p>
 * DOM: HTML DOM tree
 * Markdown: ### heading
 * Text: plain text
 *
 */
export const lookupTree = (
  node: NodeModel,
  conversionRules: any,
  callbacks: any,
  isBlockNode: boolean = false
) => {
  let child = node.first();
  while (child) {
    if (child.isText()) {
      callbacks.onText(child.text());
    } else if (child.isElement()) {
      let name = child.name;
      let attrs = child.attr() as Record<string, any>;
      let styles = child.css() as unknown as CSSStyleDeclaration;
      if (attrs && attrs["style"]) {
        delete attrs["style"];
      }
      // 光标相关节点
      if (attrs[DAPHNE_ELEMENT] as string) {
        name = attrs[DAPHNE_ELEMENT].toLowerCase();
        attrs = {};
        styles = {} as CSSStyleDeclaration;
      }
      if (["left", "right"].indexOf(attrs[CARD_ELEMENT_KEY]) >= 0) {
        child = child.next();
        continue;
      }
      if (attrs[CARD_KEY] || attrs[READY_CARD_KEY]) {
        name = "card";
        const value = attrs[CARD_VALUE_KEY];
        attrs = {
          type: attrs[CARD_TYPE_KEY],
          name: (attrs[CARD_KEY] || attrs[READY_CARD_KEY]).toLowerCase(),
        };

        if (value !== undefined) {
          attrs.value = value;
        }
        styles = {} as CSSStyleDeclaration;
      }
      // 转换标签
      name = transform(conversionRules, name, attrs, styles, isBlockNode);
      if (conversionRules[name]) {
        callbacks.onOpenTag(name, attrs, styles);
        lookupTree(child, conversionRules, callbacks, isBlockNode);
        callbacks.onCloseTag(name, attrs, styles);
      } else if (isBlockNode) {
        callbacks.onOpenTag(name, attrs, styles);
        lookupTree(child, conversionRules, callbacks, isBlockNode);
        callbacks.onCloseTag(name, attrs, styles);
      }
    }
    child = child.next();
  }
  // if (isBlockNode && node.isElement() && !VOID_TAG_MAP[node.name()]) {
  //   // 如果是块级元素且不是自闭合标签，添加结束标签
  //   callbacks.onCloseTag(node.name(), node.attributes(), node.styles());
  // }
};

const escapeAttr = (value: string) => {
  return value
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};
const attrsToString = (attrs: Record<string, any>) => {
  let attrsString = "";
  Object.keys(attrs).forEach((key) => {
    if (key === "style") {
      return;
    }
    const val = escapeAttr(attrs[key]);
    attrsString += " ".concat(key, '="').concat(val, '"');
  });
  return attrsString.trim();
};

const stylesToString = (styles: CSSStyleDeclaration) => {
  let stylesString = "";
  Object.keys(styles).forEach((key) => {
    let val = escape(styles[key as any]);

    if (/^(padding|margin|text-indent)/.test(key) && removeUnit(val) === 0) {
      return;
    }

    if (/[^a-z]color$/.test(key)) {
      val = toHex(val);
    }

    stylesString += " ".concat(key, ": ").concat(val, ";");
  });
  return stylesString.trim();
};

/**
 * HTML解析器类
 *
 * 负责HTML内容的解析和序列化，包括：
 * - DOM节点到HTML字符串的转换
 * - HTML字符串到DOM节点的解析
 * - 内容的清理和规范化
 *
 * data type:
 *
 * Value: <p>foo</p><p><br /><cursor /></p>
 * LowerValue: <p>foo</p><p><br /><span data-lake-element="cursor"></span></p>
 * DOM: HTML DOM tree
 * Markdown: ### heading
 * Text: plain text
 * HTML: <p>foo</p><p><br /></p>
 *
 * @example
 * ```typescript
 * const parser = new ParserHtml(schema, conversion);
 *
 * // 序列化DOM为HTML
 * const html = parser.serialize(domElement);
 *
 * // 解析HTML为DOM
 * const result = parser.parse(domElement);
 * ```
 */
export class ParserHtml implements ParserInterface {
  /** 模式管理器 */
  private schemaRules: any;

  /** 转换管理器 */
  private conversionRules: any;

  private source: string = "";

  root: NodeModel;

  /**
   * 构造函数
   * @param source
   * @param schema - 模式管理器
   * @param conversion - 转换管理器
   */
  constructor(
    source: string | Node,
    schema: any,
    conversion: any,
    onParse: (root: NodeModel) => void
  ) {
    this.schemaRules = schema ? schema.getValue() : null;
    this.conversionRules = conversion ? conversion.getValue() : null;
    if (typeof source === "string") {
      source = pToDiv(source);
      this.source = transformCustomTags(source);
      const doc = new DOMParser().parseFromString(this.source, "text/html");
      this.root = getNodeModel(doc.body);
    } else {
      this.root = getNodeModel(source);
    }

    if (onParse) {
      onParse(this.root);
    }
  }

  // 遍历 DOM 树，生成符合标准的 XML 代码
  toValue() {
    const result: string[] = [];
    lookupTree(this.root, this.conversionRules, {
      onOpenTag: (
        name: string,
        attrs: Record<string, any>,
        styles: CSSStyleDeclaration
      ) => {
        if (filter(this.schemaRules, name, attrs, styles)) {
          return;
        }
        result.push("<");
        result.push(name);
        if (Object.keys(attrs).length > 0) {
          result.push(" " + attrsToString(attrs));
        }
        if (Object.keys(styles).length > 0) {
          const stylesString = stylesToString(styles);
          if (stylesString !== "") {
            result.push(' style="');
            result.push(stylesString);
            result.push('"');
          }
        }
        if (VOID_TAG_MAP[name]) {
          result.push(" />");
        } else {
          result.push(">");
        }
      },
      onText: (text: string) => {
        result.push(text);
      },
      onCloseTag: (
        name: string,
        attrs: Record<string, any>,
        styles: CSSStyleDeclaration
      ) => {
        if (filter(this.schemaRules, name, attrs, styles)) {
          return;
        }
        result.push("</".concat(name, ">"));
      },
    });
    return result.join("");
  }

  // 返回 DOM 树
  toDOM() {
    const value = transformCustomTags(this.toValue())
    const doc = new DOMParser().parseFromString(value, 'text/html')
    const fragment = doc.createDocumentFragment()
    const nodes = doc.body.childNodes

    while (nodes.length > 0) {
      fragment.appendChild(nodes[0])
    }
    return fragment
  }
  // HTML 代码，自定义标签被转化成浏览器能够识别的代码，用于设置到编辑器
  toLowerValue() {
    return transformCustomTags(this.toValue())
  }

  // 转换成纯文本
  toText() {
    const result: string[] = []
    lookupTree(this.root, this.conversionRules, {
      onOpenTag: (name: string) => {
        if (name === 'br') {
          result.push('\n')
        }
      },
      onText: (text: string) => {
        text = unescape(text)
        text = text.replace(/\u00a0/g, ' ')
        result.push(text)
      },
      onCloseNode: (node: NodeModel) => {
        if (node.isBlock()) {
          result.push('\n')
        }
      }
    })
    return result.join('').replace(/\n{2,}/g, '\n').trim()
  }
  /**
   * 序列化为HTML
   * @param node - DOM节点或HTML字符串
   * @returns HTML字符串
   */
  serialize(node: Node | string): string {
    const serializer = new XMLSerializer();

    if (typeof node === "string") {
      return node;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      return this.escapeHtml(node.textContent || "");
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      return serializer.serializeToString(node);
    }
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      return this.serializeFragment(node as DocumentFragment);
    }
    return "";
  }

  private escapeHtml(text: string): string {
    const entityMap: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return text.replace(/[&<>"']/g, (char) => entityMap[char] || char);
  }
  /**
   * 反转义HTML字符
   * @param html - HTML字符串
   * @returns 反转义后的文本
   * @private
   */
  private unescapeHtml(html: string): string {
    const entityMap: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#39;": "'",
    };

    return html.replace(
      /&(amp|lt|gt|quot|#39);/g,
      (entity) => entityMap[entity] || entity
    );
  }
  /**
   * 序列化元素节点
   * @param element - 元素节点
   * @returns HTML字符串
   * @private
   */
  private serializeElement(element: Element): string {
    const tagName = element.tagName.toLowerCase();
    const attributes = this.serializeAttributes(element);

    // 检查是否为自闭合标签
    if (this.isVoidElement(tagName)) {
      return `<${tagName}${attributes}>`;
    }

    // 序列化子节点
    const children = this.serializeChildren(element);

    return `<${tagName}${attributes}>${children}</${tagName}>`;
  }
  /**
   * 序列化子节点
   * @param parent - 父节点
   * @returns HTML字符串
   * @private
   */
  private serializeChildren(element: Node) {
    const children = Array.from(element.childNodes);
    return children.map((child) => this.serialize(child)).join("");
  }
  private isVoidElement(tagName: string): boolean {
    const voidElements = [
      "area",
      "base",
      "br",
      "col",
      "command",
      "embed",
      "hr",
      "img",
      "input",
      "keygen",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr",
    ];
    return voidElements.includes(tagName);
  }
  /**
   * 序列化属性
   * @param element - 元素节点
   * @returns 属性字符串
   * @private
   */
  private serializeAttributes(element: Element) {
    const attributes: string[] = [];

    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      const name = attr.name;
      const value = attr.value;

      // 过滤不需要的属性
      if (this.shouldSerializeAttribute(name, value)) {
        const escapedValue = this.escapeAttributeValue(value);
        attributes.push(`${name}="${escapedValue}"`);
      }
    }

    return attributes.length > 0 ? " " + attributes.join(" ") : "";
  }
  /**
   * 转义属性值
   * @param value - 属性值
   * @returns 转义后的属性值
   * @private
   */
  escapeAttributeValue(value: string) {
    return value.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  shouldSerializeAttribute(name: string, value: string) {
    // 过滤内部属性
    if (name.startsWith(`data-${BRAND}-`)) {
      return false;
    }

    // 过滤空属性
    if (!value && name !== "alt" && name !== "title") {
      return false;
    }

    return true;
  }

  /**
   * 序列化文档片段
   * @param fragment - 文档片段
   * @returns HTML字符串
   * @private
   */
  private serializeFragment(fragment: DocumentFragment): string {
    return this.serializeChildren(fragment);
  }

  /**
   * 清理HTML内容
   * @param html - HTML字符串
   * @returns 清理后的HTML
   */
  clean(html: string): string {
    // 创建临时容器
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    // 移除不允许的元素和属性
    this.cleanElement(tempDiv);

    return tempDiv.innerHTML;
  }

  /**
   * 清理元素
   * @param element - 元素节点
   * @private
   */
  private cleanElement(element: Element): void {
    const children = Array.from(element.children);

    children.forEach((child) => {
      // 递归清理子元素
      this.cleanElement(child);

      // 检查元素是否允许
      if (!this.isAllowedElement(child.tagName.toLowerCase())) {
        // 不允许的元素，用其内容替换
        const content = child.innerHTML;
        const textNode = document.createTextNode(content);
        child.parentNode?.replaceChild(textNode, child);
        return;
      }

      // 清理属性
      this.cleanAttributes(child);
    });
  }
  /**
   * 检查元素是否允许
   * @param tagName - 标签名
   * @returns 是否允许
   * @private
   */
  private isAllowedElement(tagName: string): boolean {
    const allowedElements = [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "code",
      "sup",
      "sub",
      "mark",
      "a",
      "img",
      "br",
      "hr",
      "ul",
      "ol",
      "li",
      "blockquote",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "div",
      "span",
    ];

    return allowedElements.includes(tagName);
  }
  /**
   * 清理属性
   * @param element - 元素节点
   * @private
   */
  private cleanAttributes(element: Element): void {
    const allowedAttributes: Record<string, string[]> = {
      a: ["href", "title", "target"],
      img: ["src", "alt", "title", "width", "height"],
      table: ["border", "cellpadding", "cellspacing"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    };

    const tagName = element.tagName.toLowerCase();
    const allowed = allowedAttributes[tagName] || [];

    // 移除不允许的属性
    const attributes = Array.from(element.attributes);
    attributes.forEach((attr) => {
      if (!allowed.includes(attr.name) && !attr.name.startsWith("data-")) {
        element.removeAttribute(attr.name);
      }
    });
  }

  /**
   * 格式化HTML
   * @param html - HTML字符串
   * @returns 格式化后的HTML
   */
  format(html: string): string {
    // 简单的HTML格式化
    return html
      .replace(/></g, ">\n<")
      .replace(/^\s+|\s+$/gm, "")
      .split("\n")
      .filter((line) => line.trim())
      .join("\n");
  }
  /**
   * 解析DOM节点
   * @param node - DOM节点
   * @returns 解析结果
   */
  parse(node: Node): ParseResult {
    const nodeModel = new NodeModel(node);
    // 获取HTML内容
    const html = this.serialize(node);

    // 获取纯文本内容
    const text = nodeModel.text();

    return { html, text };
    // const domParser = new DOMParser();
    // const doc = domParser.parseFromString(html, "text/html");
    // return doc.body;
  }
}
