/**
 * Daphne Editor Engine - String Utils 
 *
 * 字符串处理相关的工具函数
 */

/**
 * 将字符串转换为驼峰命名
 * @param str - 输入字符串
 * @returns 驼峰命名字符串
 */
export const toCamel = (str: string): string => {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
};

/**
 * 将逗号分隔的字符串转换为映射对象
 * @param str - 逗号分隔的字符串
 * @returns 映射对象
 */
export const toMap = (str: string): Record<string, boolean> => {
  const map: Record<string, boolean> = {};
  const items = str.split(',');

  for (const item of items) {
    const trimmed = item.trim();
    if (trimmed) {
      map[trimmed] = true;
    }
  }

  return map;
};

/**
 * 获取 CSS 映射
 * @param cssText - CSS 文本
 * @returns CSS 映射对象
 */
export const getCssMap = (cssText: string): Record<string, string> => {
  const map: Record<string, string> = {};

  if (!cssText) return map;

  const declarations = cssText.split(';');

  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex > 0) {
      const property = declaration.slice(0, colonIndex).trim();
      const value = declaration.slice(colonIndex + 1).trim();
      if (property && value) {
        map[property] = value;
      }
    }
  }

  return map;
};

/**
 * 获取属性映射
 * @param attrText - 属性文本
 * @returns 属性映射对象
 */
export const getAttrMap = (attrText: string): Record<string, string | number | boolean> => {
  const map: Record<string, string> = {};

  if (!attrText) return map;

  // 简单的属性解析，可能需要更复杂的正则表达式
  const attrRegex = /(\w+)=["']([^"']*)["']/g;
  let match;

  while ((match = attrRegex.exec(attrText)) !== null) {
    map[match[1]] = match[2];
  }

  return map;
};

/**
 * 转义 HTML 字符
 * @param str - 输入字符串
 * @returns 转义后的字符串
 */
export const escape = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * 反转义 HTML 字符
 * @param str - 输入字符串
 * @returns 反转义后的字符串
 */
export const unescape = (str: string): string => {
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || div.innerText || '';
};

/**
 * 生成随机 ID
 * @param length - ID 长度
 * @returns 随机 ID
 */
export const randomId = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
};

/**
 * 编码卡片值
 * @param value - 卡片值
 * @returns 编码后的字符串
 */
export const encodeCardValue = (value: any): string => {
  try {
    return encodeURIComponent(JSON.stringify(value));
  } catch (error) {
    console.error('Failed to encode card value:', error);
    return '';
  }
};

/**
 * 解码卡片值
 * @param encodedValue - 编码的值
 * @returns 解码后的对象
 */
export const decodeCardValue = (encodedValue: string): any => {
  try {
    return JSON.parse(decodeURIComponent(encodedValue));
  } catch (error) {
    console.error('Failed to decode card value:', error);
    return null;
  }
};

/**
 * 转换自定义标签
 * @param html - HTML 字符串
 * @returns 转换后的 HTML
 */
export const transformCustomTags = (html: string): string => {
  // 这里可以实现自定义标签的转换逻辑
  return html;
};

/**
 * 移除书签标签
 * @param html - HTML 字符串
 * @returns 清理后的 HTML
 */
export const removeBookmarkTags = (html: string): string => {
  return html.replace(/<(anchor|focus|cursor)[^>]*>[\s\S]*?<\/\1>/gi, '');
};

/**
 * 获取文档版本
 * @returns 版本号
 */
export const DocVersion = '1.0.0';
