/**
 * Daphne Editor Engine - Conversion Manager
 *
 * 转换管理器，处理内容的转换规则
 */
import lodashCloneDeep from "lodash-es/cloneDeep";

/**
 * 转换规则接口
 */
export interface ConversionRule {
  /** 转换类型 */
  type: "toDOM" | "fromDOM";
  /** 匹配条件 */
  match: (node: any) => boolean;
  /** 转换函数 */
  convert: (node: any) => any;
}

/**
 * 转换管理器类
 *
 * 负责管理内容的双向转换：
 * - DOM 到内部模型的转换
 * - 内部模型到 DOM 的转换
 */
export class ConversionManager {
  /** 转换规则映射 */
  private rules: Map<string, ConversionRule[]> = new Map();
  /**
   * 获取指定名称的规则（兼容旧代码）
   * @param name - 规则名称
   * @returns 规则对象或空对象
   */
  [key: string]: any;

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认转换规则
   */
  private initializeDefaultRules(): void {
    // 段落转换
    this.addRule("p", {
      type: "toDOM",
      match: (node) => node.type === "paragraph",
      convert: (node) => {
        const p = document.createElement("p");
        if (node.children) {
          node.children.forEach((child: any) => {
            p.appendChild(this.convertToDOM(child));
          });
        }
        return p;
      },
    });

    // 标题转换
    [1, 2, 3, 4, 5, 6].forEach((level) => {
      this.addRule(`h${level}`, {
        type: "toDOM",
        match: (node) => node.type === "heading" && node.level === level,
        convert: (node) => {
          const h = document.createElement(`h${level}`);
          if (node.children) {
            node.children.forEach((child: any) => {
              h.appendChild(this.convertToDOM(child));
            });
          }
          return h;
        },
      });
    });

    // 文本节点转换
    this.addRule("text", {
      type: "toDOM",
      match: (node) => node.type === "text",
      convert: (node) => document.createTextNode(node.text || ""),
    });

    // 默认元素保持原样
    this.addRule("default", {
      type: "toDOM",
      match: () => true,
      convert: (node) => {
        if (typeof node === "string") {
          return document.createTextNode(node);
        }
        return node;
      },
    });
  }

  /**
   * 添加转换规则
   * @param name - 规则名称
   * @param rule - 转换规则
   */
  addRule(name: string, rule: ConversionRule): void {
    if (!this.rules.has(name)) {
      this.rules.set(name, []);
    }
    this.rules.get(name)!.push(rule);
  }

  /**
   * 获取转换规则
   * @param name - 规则名称
   * @returns 转换规则数组
   */
  getRules(name: string): ConversionRule[] {
    return this.rules.get(name) || [];
  }

  /**
   * 转换为 DOM
   * @param node - 内部节点
   * @returns DOM 节点
   */
  convertToDOM(node: any): Node {
    // 尝试所有规则
    for (const [, rules] of this.rules) {
      for (const rule of rules) {
        if (rule.type === "toDOM" && rule.match(node)) {
          return rule.convert(node);
        }
      }
    }

    // 如果没有匹配的规则，返回文本节点
    return document.createTextNode(String(node));
  }

  /**
   * 从 DOM 转换
   * @param node - DOM 节点
   * @returns 内部节点
   */
  convertFromDOM(node: Node): any {
    // 简化实现：直接返回节点
    return node;
  }

  /**
   * 获取所有转换规则（兼容旧代码）
   * @returns 转换规则对象
   */
  getValue(): any {
    // 返回一个兼容的规则对象
    const rulesObj: any = {};

    // 添加默认支持的元素
    const supportedElements = [
      "p",
      "div",
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
      "span",
      "a",
      "code",
      "sub",
      "sup",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "del",
      "mark",
      "br",
      "hr",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ];

    // 为每个元素添加一个空规则，表示支持该元素
    supportedElements.forEach((element) => {
      rulesObj[element] = true;
    });

    return rulesObj;
  }

  clone() {
    const newManager = new ConversionManager();
    return newManager;
  }
}
