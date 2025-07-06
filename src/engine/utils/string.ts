/**
 * Daphne Editor Engine - String Utils
 *
 * 字符串处理相关的工具函数
 */

import { CARD_TYPE_KEY, CARD_VALUE_KEY, READY_CARD_KEY } from "../constants";
import { ANCHOR, CURSOR, DAPHNE_ELEMENT, FOCUS } from "../constants/bookmark";

const protocols = ["http:", "https:", "data:", "dingtalk:", "ftp:"];
/**
 * 将字符串转换为驼峰命名
 * @param str - 输入字符串
 * @returns 驼峰命名字符串
 */
export const toCamel = (str: string): string => {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
};

export const removeUnit = (value: string) => {
  let match;
  return value && (match = /^(-?\d+)/.exec(value)) ? parseInt(match[1], 10) : 0;
};

/**
 * 将逗号分隔的字符串转换为映射对象
 * @param str - 逗号分隔的字符串
 * @returns 映射对象
 */
export const toMap = (str: string): Record<string, boolean> => {
  const map: Record<string, boolean> = {};
  const items = str.split(",");

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

  const declarations = cssText.split(";");

  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(":");
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
export const getAttrMap = (
  attrText: string
): Record<string, string | number | boolean> => {
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
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
};

/**
 * 反转义 HTML 字符
 * @param str - 输入字符串
 * @returns 反转义后的字符串
 */
export const unescape = (str: string): string => {
  const div = document.createElement("div");
  div.innerHTML = str;
  return div.textContent || div.innerText || "";
};

/**
 * 生成随机 ID
 * @param length - ID 长度
 * @returns 随机 ID
 */
export const randomId = (length: number = 8): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

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
    console.error("Failed to encode card value:", error);
    return "";
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
    console.error("Failed to decode card value:", error);
    return null;
  }
};

/**
 * 移除书签标签
 * @param html - HTML 字符串
 * @returns 清理后的 HTML
 */
export const removeBookmarkTags = (html: string): string => {
  return html.replace(/<(anchor|focus|cursor)[^>]*>[\s\S]*?<\/\1>/gi, "");
};

/**
 * 获取文档版本
 * @returns 版本号
 */
export const DocVersion = "1.0.0";

export const transformCustomTags = (html: string) => {
  return html
    .replace(
      /<anchor\s*\/>/gi,
      "<span ".concat(DAPHNE_ELEMENT, '="').concat(ANCHOR, '"></span>')
    )
    .replace(
      /<focus\s*\/>/gi,
      "<span ".concat(DAPHNE_ELEMENT, '="').concat(FOCUS, '"></span>')
    )
    .replace(
      /<cursor\s*\/>/gi,
      "<span ".concat(DAPHNE_ELEMENT, '="').concat(CURSOR, '"></span>')
    )
    .replace(/(<card\s+[^>]+>).*?<\/card>/gi, (_whole, tag) => {
      const attrs = getAttrMap(tag);
      const { type, name, value } = attrs;
      const isInline = attrs.type === "inline";
      const tagName = isInline ? "span" : "div";
      const list = ["<".concat(tagName)];
      list.push(" ".concat(CARD_TYPE_KEY, '="').concat(type as string, '"'));
      list.push(" ".concat(READY_CARD_KEY, '="').concat(name as string, '"'));

      if (value !== undefined) {
        list.push(
          " ".concat(CARD_VALUE_KEY, '="').concat(value as string, '"')
        );
      }

      list.push("></".concat(tagName, ">"));
      return list.join("");
    });
};

export const validUrl = (url: string) => {
  if (typeof url !== "string") {
    return false;
  }

  url = url.toLowerCase(); // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs

  if (url.startsWith("data:text/html")) {
    return false;
  }

  if (!!!url.match(/^\S*$/)) {
    return false;
  }

  if (
    !!protocols.some((protocol) => {
      return url.startsWith(protocol);
    })
  ) {
    return true;
  }

  if (url.startsWith("./") || url.startsWith("/")) {
    return true;
  }

  if (url.indexOf(":") < 0) {
    return true;
  }
  return false;
};

export const toHex = (rgb: string) => {
  const hex = (d: string) => {
    const s = parseInt(d, 10).toString(16).toUpperCase();
    return s.length > 1 ? s : "0" + s;
  };

  const reg = /rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi;
  return rgb.replace(reg, (_$0, $1, $2, $3) => {
    return "#" + hex($1) + hex($2) + hex($3);
  });
};
export const toRgb = (hex: string) => {
  const reg = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
  const result = reg.exec(hex);
  if (!result) {
    return hex;
  }
  return `rgb(${parseInt(result[1], 16)}, ${parseInt(
    result[2],
    16
  )}, ${parseInt(result[3], 16)})`;
};
