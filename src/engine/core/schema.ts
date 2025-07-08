/**
 * Daphne Editor Engine - Schema Manager
 *
 * 模式管理器，定义编辑器支持的元素和属性规则
 */

import { SchemaRule } from '../types';
import lodashCloneDeep from 'lodash-es/cloneDeep';

/**
 * 模式管理器类
 *
 * 负责管理编辑器的元素规则，包括：
 * - 块级元素定义
 * - 行内元素定义
 * - 标记元素定义
 * - 属性规则
 */
export class SchemaManager {
  /** 规则映射 */
  private rules: Map<string, SchemaRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认规则
   */
  private initializeDefaultRules(): void {
    // 块级元素
    const blockElements = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre'];
    blockElements.forEach(name => {
      this.addRule({
        name,
        type: 'block',
        attributes: ['id', 'class', 'style', 'data-*']
      });
    });

    // 行内元素
    const inlineElements = ['span', 'a', 'code', 'sub', 'sup'];
    inlineElements.forEach(name => {
      this.addRule({
        name,
        type: 'inline',
        attributes: ['id', 'class', 'style', 'data-*']
      });
    });

    // 特殊的链接元素属性
    this.addRule({
      name: 'a',
      type: 'inline',
      attributes: ['id', 'class', 'style', 'href', 'target', 'rel', 'title', 'data-*']
    });

    // 标记元素
    const markElements = ['strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark'];
    markElements.forEach(name => {
      this.addRule({
        name,
        type: 'mark',
        attributes: ['class', 'style']
      });
    });

    // 空元素
    const voidElements = ['br', 'hr', 'img'];
    voidElements.forEach(name => {
      this.addRule({
        name,
        type: 'inline',
        isVoid: true,
        attributes: name === 'img' ? ['src', 'alt', 'width', 'height', 'class', 'style'] : ['class', 'style']
      });
    });
  }

  /**
   * 添加规则
   * @param rule - 规则定义
   */
  addRule(rule: SchemaRule): void {
    this.rules.set(rule.name, rule);
  }

  /**
   * 获取规则
   * @param name - 元素名称
   * @returns 规则定义
   */
  getRule(name: string): SchemaRule | undefined {
    return this.rules.get(name.toLowerCase());
  }

  /**
   * 检查元素是否有效
   * @param name - 元素名称
   * @returns 是否有效
   */
  isValidElement(name: string): boolean {
    return this.rules.has(name.toLowerCase());
  }

  /**
   * 检查属性是否有效
   * @param elementName - 元素名称
   * @param attrName - 属性名称
   * @returns 是否有效
   */
  isValidAttribute(elementName: string, attrName: string): boolean {
    const rule = this.getRule(elementName);
    if (!rule || !rule.attributes) return false;

    // 如果是数组形式的属性定义
    if (Array.isArray(rule.attributes)) {
      return rule.attributes.some((attr: string) => {
        if (attr.endsWith('*')) {
          return attrName.startsWith(attr.slice(0, -1));
        }
        return attr === attrName;
      });
    }

    // 如果是对象形式的属性定义
    return attrName in rule.attributes;
  }

  /**
   * 获取元素类型
   * @param name - 元素名称
   * @returns 元素类型
   */
  getType(name: string): 'block' | 'inline' | 'mark' | undefined {
    return this.getRule(name)?.type;
  }

  /**
   * 是否为空元素
   * @param name - 元素名称
   * @returns 是否为空元素
   */
  isVoid(name: string): boolean {
    return this.getRule(name)?.isVoid || false;
  }

  /**
   * 获取所有规则（兼容旧代码）
   * @returns 规则对象
   */
  getValue(): any {
    const rulesObj: any = {};

    // 将规则转换为兼容格式
    this.rules.forEach((rule, name) => {
      rulesObj[name] = {
        type: rule.type,
        attributes: rule.attributes,
        isVoid: rule.isVoid
      };
    });

    return rulesObj;
  }

  public addRules(rules: SchemaRule[]): void {
    rules.forEach(rule => {
      this.addRule(rule);
    });
  }

  public clone() {
    const dupData = lodashCloneDeep(this.rules)
    const dupSchema = new SchemaManager()
    dupSchema.rules = dupData
    return dupSchema
  }
} 