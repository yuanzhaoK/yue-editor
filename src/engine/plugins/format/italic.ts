/**
 * Daphne Editor Engine - Italic Plugin
 *
 * 斜体插件，提供文本斜体功能
 */

import { BasePlugin } from '../../core/base-plugin';
import { PluginOptions } from '../../types';

/**
 * 斜体插件类
 *
 * 提供文本斜体功能，支持：
 * - 通过命令执行斜体
 * - 查询当前选区是否已斜体
 * - 快捷键支持 (Ctrl/Cmd + I)
 *
 * @example
 * ```typescript
 * // 注册插件
 * engine.plugin.register(ItalicPlugin);
 *
 * // 执行斜体
 * engine.plugin.execute('italic');
 *
 * // 查询状态
 * const isItalic = engine.plugin.queryState('italic');
 * ```
 */
export class ItalicPlugin extends BasePlugin {
  /** 插件名称 */
  static pluginName = 'italic';

  /** 默认选项 */
  static defaultOptions: PluginOptions = {
    version: '1.0.0',
    description: '斜体文本格式',
    author: 'Daphne Team',
    hotkeys: {
      execute: ['ctrl+i', 'cmd+i']
    },
    autoEnable: true,
    priority: 100
  };

  /**
   * 初始化插件
   */
  initialize(): void {
    // 注册到工具栏
    this.registerToolbarItem();
    
    // 监听选区变化以更新状态
    this.engine.event.on('select', () => {
      this.updateToolbarState();
    });
  }

  /**
   * 执行斜体命令
   */
  execute(): void {
    this.applyCommand(() => {
      const range = this.getRange();
      
      if (range.collapsed) {
        // 如果没有选中文本，切换斜体状态
        this.toggleItalicMark();
      } else {
        // 如果选中了文本，应用或移除斜体
        if (this.queryState()) {
          this.removeItalicMark();
        } else {
          this.applyItalicMark();
        }
      }
      
      this.triggerChange();
    });
  }

  /**
   * 查询当前是否斜体状态
   * @returns 是否斜体
   */
  queryState(): boolean {
    const range = this.getRange();
    
    if (!range) {
      return false;
    }

    // 检查当前选区是否有斜体标记
    return this.hasMark('em') || this.hasMark('i');
  }

  /**
   * 销毁插件
   */
  destroy(): void {
    // 移除事件监听
    this.engine.event.off('select');
    
    // 调用父类销毁方法
    super.destroy();
  }

  // ========== 私有方法 ==========

  /**
   * 应用斜体标记
   */
  private applyItalicMark(): void {
    const range = this.getRange();
    
    if (!range || range.collapsed) {
      return;
    }

    // 创建 em 元素
    const em = document.createElement('em');
    
    try {
      // 提取选中内容
      const contents = range.extractContents();
      
      // 将内容包裹在 em 元素中
      em.appendChild(contents);
      
      // 插入回文档
      range.insertNode(em);
      
      // 重新选中
      range.selectNodeContents(em);
      this.engine.change.select(range);
    } catch (error) {
      console.error('Failed to apply italic:', error);
    }
  }

  /**
   * 移除斜体标记
   */
  private removeItalicMark(): void {
    const range = this.getRange();
    
    if (!range) {
      return;
    }

    // 查找并移除所有斜体标记
    const marks = this.getMarksInRange(range, ['em', 'i']);
    
    marks.forEach(mark => {
      // 将标记的内容提取出来
      const parent = mark.parentNode;
      
      while (mark.firstChild) {
        parent?.insertBefore(mark.firstChild, mark);
      }
      
      // 移除空的标记元素
      mark.remove();
    });

    // 重新设置选区
    this.engine.change.select(range);
  }

  /**
   * 切换斜体标记（用于光标位置）
   */
  private toggleItalicMark(): void {
    // 在光标位置插入零宽字符并应用/移除斜体
    const range = this.getRange();
    
    if (!range || !range.collapsed) {
      return;
    }

    const zeroWidthSpace = '\u200B';
    const textNode = document.createTextNode(zeroWidthSpace);
    
    if (this.queryState()) {
      // 如果当前是斜体状态，插入非斜体的零宽字符
      range.insertNode(textNode);
    } else {
      // 如果当前不是斜体状态，插入斜体的零宽字符
      const em = document.createElement('em');
      em.appendChild(textNode);
      range.insertNode(em);
    }

    // 将光标移到零宽字符后面
    range.setStartAfter(textNode);
    range.collapse(true);
    this.engine.change.select(range);
  }

  /**
   * 检查是否有指定的标记
   * @param tagName - 标记名称
   * @returns 是否存在
   */
  private hasMark(tagName: string): boolean {
    const range = this.getRange();
    
    if (!range) {
      return false;
    }

    // 检查选区内是否有指定标记
    let node = range.commonAncestorContainer;
    
    // 如果是文本节点，从其父节点开始检查
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode!;
    }

    // 向上遍历查找标记
    while (node && node !== this.engine.editArea[0]) {
      if (node.nodeType === Node.ELEMENT_NODE && 
          (node as Element).tagName.toLowerCase() === tagName.toLowerCase()) {
        return true;
      }
      node = node.parentNode!;
    }

    return false;
  }

  /**
   * 获取选区内的标记元素
   * @param range - 选区
   * @param tagNames - 标记名称列表
   * @returns 标记元素数组
   */
  private getMarksInRange(range: Range, tagNames: string[]): Element[] {
    const marks: Element[] = [];
    const container = range.commonAncestorContainer;
    
    // 获取容器元素
    const containerElement = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement! 
      : container as Element;

    // 查找所有标记
    tagNames.forEach(tagName => {
      const elements = containerElement.getElementsByTagName(tagName);
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        
        // 检查元素是否在选区内
        if (range.intersectsNode(element)) {
          marks.push(element);
        }
      }
    });

    return marks;
  }

  /**
   * 注册工具栏项
   */
  private registerToolbarItem(): void {
    // 这里可以注册工具栏按钮
    // 实际实现需要根据工具栏系统的具体接口
    this.emit('toolbar:register', {
      name: 'italic',
      icon: 'italic',
      title: this.engine.lang['italic'] || 'Italic',
      onClick: () => this.execute(),
      queryState: () => this.queryState()
    });
  }

  /**
   * 更新工具栏状态
   */
  private updateToolbarState(): void {
    this.emit('toolbar:update', {
      name: 'italic',
      active: this.queryState()
    });
  }
} 