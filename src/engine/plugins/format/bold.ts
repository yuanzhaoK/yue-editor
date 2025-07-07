/**
 * Daphne Editor Engine - Bold Plugin
 *
 * 加粗插件，提供文本加粗功能
 */

import { BasePlugin } from '../../core/base-plugin';
import { PluginOptions } from '../../types';

/**
 * 加粗插件类
 *
 * 提供文本加粗功能，支持：
 * - 通过命令执行加粗
 * - 查询当前选区是否已加粗
 * - 快捷键支持 (Ctrl/Cmd + B)
 *
 * @example
 * ```typescript
 * // 注册插件
 * engine.plugin.register(BoldPlugin);
 *
 * // 执行加粗
 * engine.plugin.execute('bold');
 *
 * // 查询状态
 * const isBold = engine.plugin.queryState('bold');
 * ```
 */
export class BoldPlugin extends BasePlugin {
  /** 插件名称 */
  static pluginName = 'bold';

  /** 默认选项 */
  static defaultOptions: PluginOptions = {
    version: '1.0.0',
    description: '加粗文本格式',
    author: 'Daphne Team',
    hotkeys: {
      execute: ['ctrl+b', 'cmd+b']
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
   * 执行加粗命令
   */
  execute(): void {
    this.applyCommand(() => {
      const range = this.getRange();
      
      if (range.collapsed) {
        // 如果没有选中文本，切换加粗状态
        this.toggleBoldMark();
      } else {
        // 如果选中了文本，应用或移除加粗
        if (this.queryState()) {
          this.removeBoldMark();
        } else {
          this.applyBoldMark();
        }
      }
      
      this.triggerChange();
    });
  }

  /**
   * 查询当前是否加粗状态
   * @returns 是否加粗
   */
  queryState(): boolean {
    const range = this.getRange();
    
    if (!range) {
      return false;
    }

    // 检查当前选区是否有加粗标记
    return this.hasMark('strong') || this.hasMark('b');
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
   * 应用加粗标记
   */
  private applyBoldMark(): void {
    const range = this.getRange();
    
    if (!range || range.collapsed) {
      return;
    }

    // 创建 strong 元素
    const strong = document.createElement('strong');
    
    try {
      // 提取选中内容
      const contents = range.extractContents();
      
      // 将内容包裹在 strong 元素中
      strong.appendChild(contents);
      
      // 插入回文档
      range.insertNode(strong);
      
      // 重新选中
      range.selectNodeContents(strong);
      this.engine.change.select(range);
    } catch (error) {
      console.error('Failed to apply bold:', error);
    }
  }

  /**
   * 移除加粗标记
   */
  private removeBoldMark(): void {
    const range = this.getRange();
    
    if (!range) {
      return;
    }

    // 查找并移除所有加粗标记
    const marks = this.getMarksInRange(range, ['strong', 'b']);
    
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
   * 切换加粗标记（用于光标位置）
   */
  private toggleBoldMark(): void {
    // 在光标位置插入零宽字符并应用/移除加粗
    const range = this.getRange();
    
    if (!range || !range.collapsed) {
      return;
    }

    const zeroWidthSpace = '\u200B';
    const textNode = document.createTextNode(zeroWidthSpace);
    
    if (this.queryState()) {
      // 如果当前是加粗状态，插入非加粗的零宽字符
      range.insertNode(textNode);
    } else {
      // 如果当前不是加粗状态，插入加粗的零宽字符
      const strong = document.createElement('strong');
      strong.appendChild(textNode);
      range.insertNode(strong);
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
      name: 'bold',
      icon: 'bold',
      title: this.engine.lang['bold'] || 'Bold',
      onClick: () => this.execute(),
      queryState: () => this.queryState()
    });
  }

  /**
   * 更新工具栏状态
   */
  private updateToolbarState(): void {
    this.emit('toolbar:update', {
      name: 'bold',
      active: this.queryState()
    });
  }
} 