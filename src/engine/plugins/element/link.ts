/**
 * Daphne Editor Engine - Link Plugin
 *
 * 链接插件，提供插入和编辑链接功能
 */

import { BasePlugin } from '../../core/base-plugin';
import { PluginOptions } from '../../types';

/**
 * 链接插件类
 *
 * 提供链接功能，支持：
 * - 插入链接
 * - 编辑现有链接
 * - 移除链接
 * - 快捷键支持 (Ctrl/Cmd + K)
 *
 * @example
 * ```typescript
 * // 注册插件
 * engine.plugin.register(LinkPlugin);
 *
 * // 插入链接
 * engine.plugin.execute('link', { url: 'https://example.com', text: 'Example' });
 *
 * // 查询是否在链接上
 * const isLink = engine.plugin.queryState('link');
 * ```
 */
export class LinkPlugin extends BasePlugin {
  /** 插件名称 */
  static pluginName = 'link';

  /** 默认选项 */
  static defaultOptions: PluginOptions = {
    version: '1.0.0',
    description: '插入和编辑链接',
    author: 'Daphne Team',
    hotkeys: {
      execute: ['ctrl+k', 'cmd+k']
    },
    config: {
      allowedProtocols: ['http', 'https', 'mailto', 'tel'],
      defaultTarget: '_blank',
      defaultRel: 'noopener noreferrer'
    },
    autoEnable: true,
    priority: 90
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

    // 监听点击事件处理链接点击
    this.engine.editArea.on('click', (e: MouseEvent) => {
      this.handleLinkClick(e);
    });
  }

  /**
   * 执行链接命令
   * @param options - 链接选项
   */
  execute(options?: { url?: string; text?: string; target?: string }): void {
    this.applyCommand(() => {
      if (!options || !options.url) {
        // 如果没有提供 URL，显示链接对话框
        this.showLinkDialog();
        return;
      }

      const range = this.getRange();
      
      if (this.queryState()) {
        // 如果已经是链接，更新链接
        this.updateLink(options);
      } else {
        // 否则插入新链接
        this.insertLink(options);
      }
      
      this.triggerChange();
    });
  }

  /**
   * 查询当前是否在链接上
   * @returns 是否在链接上
   */
  queryState(): boolean {
    const link = this.getCurrentLink();
    return link !== null;
  }

  /**
   * 查询当前链接的值
   * @returns 链接信息
   */
  queryValue(): { url: string; text: string; target?: string } | null {
    const link = this.getCurrentLink();
    
    if (!link) {
      return null;
    }

    return {
      url: link.getAttribute('href') || '',
      text: link.textContent || '',
      target: link.getAttribute('target') || undefined
    };
  }

  /**
   * 销毁插件
   */
  destroy(): void {
    // 移除事件监听
    this.engine.event.off('select');
    this.engine.editArea.off('click');
    
    // 调用父类销毁方法
    super.destroy();
  }

  // ========== 私有方法 ==========

  /**
   * 插入链接
   * @param options - 链接选项
   */
  private insertLink(options: { url: string; text?: string; target?: string }): void {
    const range = this.getRange();
    
    if (!range) {
      return;
    }

    // 验证 URL
    if (!this.isValidUrl(options.url)) {
      console.error('Invalid URL:', options.url);
      return;
    }

    // 创建链接元素
    const link = document.createElement('a');
    link.href = options.url;
    
    // 设置目标
    const target = options.target || this.getConfig<string>('defaultTarget');
    if (target) {
      link.target = target;
    }

    // 设置 rel 属性
    const rel = this.getConfig<string>('defaultRel');
    if (rel && target === '_blank') {
      link.rel = rel;
    }

    // 设置链接文本
    if (range.collapsed) {
      // 如果没有选中文本，使用提供的文本或 URL
      const text = options.text || options.url;
      link.textContent = text;
      
      // 插入链接
      range.insertNode(link);
      
      // 将光标移到链接后面
      range.setStartAfter(link);
      range.collapse(true);
    } else {
      // 如果选中了文本，将选中的内容包裹在链接中
      try {
        const contents = range.extractContents();
        link.appendChild(contents);
        range.insertNode(link);
        
        // 选中整个链接
        range.selectNodeContents(link);
      } catch (error) {
        console.error('Failed to insert link:', error);
      }
    }

    this.engine.change.select(range);
  }

  /**
   * 更新链接
   * @param options - 链接选项
   */
  private updateLink(options: { url?: string; text?: string; target?: string }): void {
    const link = this.getCurrentLink();
    
    if (!link) {
      return;
    }

    // 更新 URL
    if (options.url && this.isValidUrl(options.url)) {
      link.href = options.url;
    }

    // 更新目标
    if (options.target !== undefined) {
      if (options.target) {
        link.target = options.target;
      } else {
        link.removeAttribute('target');
      }
    }

    // 更新文本
    if (options.text !== undefined) {
      link.textContent = options.text;
    }

    // 更新 rel 属性
    if (link.target === '_blank') {
      const rel = this.getConfig<string>('defaultRel');
      if (rel) {
        link.rel = rel;
      }
    } else {
      link.removeAttribute('rel');
    }
  }

  /**
   * 移除链接
   */
  private removeLink(): void {
    const link = this.getCurrentLink();
    
    if (!link) {
      return;
    }

    const range = this.getRange();
    
    // 将链接内容提取出来
    const parent = link.parentNode;
    
    while (link.firstChild) {
      parent?.insertBefore(link.firstChild, link);
    }
    
    // 移除链接元素
    link.remove();

    // 重新设置选区
    if (range) {
      this.engine.change.select(range);
    }
  }

  /**
   * 获取当前链接元素
   * @returns 链接元素或 null
   */
  private getCurrentLink(): HTMLAnchorElement | null {
    const range = this.getRange();
    
    if (!range) {
      return null;
    }

    // 获取当前节点
    let node = range.commonAncestorContainer;
    
    // 如果是文本节点，从其父节点开始
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode!;
    }

    // 向上查找链接元素
    while (node && node !== this.engine.editArea[0]) {
      if (node.nodeType === Node.ELEMENT_NODE && 
          (node as Element).tagName.toLowerCase() === 'a') {
        return node as HTMLAnchorElement;
      }
      node = node.parentNode!;
    }

    return null;
  }

  /**
   * 验证 URL 是否有效
   * @param url - URL 字符串
   * @returns 是否有效
   */
  private isValidUrl(url: string): boolean {
    if (!url) {
      return false;
    }

    // 获取允许的协议
    const allowedProtocols = this.getConfig<string[]>('allowedProtocols') || [];
    
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol.slice(0, -1); // 移除末尾的冒号
      
      return allowedProtocols.includes(protocol);
    } catch {
      // 如果不是完整的 URL，尝试添加 http://
      try {
        new URL(`http://${url}`);
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * 处理链接点击
   * @param e - 鼠标事件
   */
  private handleLinkClick(e: MouseEvent): void {
    const target = e.target as Element;
    
    // 如果点击的是链接
    if (target.tagName.toLowerCase() === 'a') {
      // 如果按住了 Ctrl 或 Cmd，打开链接
      if (e.ctrlKey || e.metaKey) {
        return; // 让浏览器默认行为处理
      }
      
      // 否则阻止默认行为，进入编辑模式
      e.preventDefault();
      
      // 选中链接
      const range = document.createRange();
      range.selectNodeContents(target);
      
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // 显示链接编辑对话框
      this.showLinkDialog();
    }
  }

  /**
   * 显示链接对话框
   */
  private showLinkDialog(): void {
    // 获取当前链接信息
    const currentValue = this.queryValue();
    
    // 触发显示链接对话框事件
    this.emit('dialog:link', {
      value: currentValue,
      onConfirm: (options: { url: string; text?: string; target?: string }) => {
        this.execute(options);
      },
      onRemove: () => {
        this.removeLink();
        this.triggerChange();
      }
    });
  }

  /**
   * 注册工具栏项
   */
  private registerToolbarItem(): void {
    this.emit('toolbar:register', {
      name: 'link',
      icon: 'link',
      title: this.engine.lang['link'] || 'Link',
      onClick: () => this.execute(),
      queryState: () => this.queryState()
    });
  }

  /**
   * 更新工具栏状态
   */
  private updateToolbarState(): void {
    this.emit('toolbar:update', {
      name: 'link',
      active: this.queryState()
    });
  }
} 