import isNil from "lodash-es/isNil";

/**
 * 获取宽度
 * @param  {HTMLElement} el - dom节点
 * @param  {Number} defaultValue - 默认值
 * @return {Number} 宽度
 */
export const getWidth = (el: HTMLElement, defaultValue?: number) => {
  let width = getStyle(el, "width", defaultValue);

  if (width === "auto") {
    width = el.offsetWidth;
  }

  return parseFloat(width);
};

/**
 * 获取样式
 * @param  {Object} dom - DOM节点
 * @param  {String} name - 样式名
 * @param  {Any} defaultValue - 默认值
 * @return {String} 属性值
 */

export const getStyle = (
  dom: HTMLElement,
  name: keyof CSSStyleDeclaration,
  defaultValue: any
) => {
  try {
    if (window.getComputedStyle) {
      return window.getComputedStyle(dom, null)[name] || defaultValue;
    }
    // @ts-ignore
    return dom.currentStyle[name];
  } catch (e) {
    if (!isNil(defaultValue)) {
      return defaultValue;
    }
    return null;
  }
};
/**
 * 获取高度
 * @param  {HTMLElement} el - dom节点
 * @param  {Number} defaultValue - 默认值
 * @return {Number} 高度
 */
export const getHeight = (el: HTMLElement, defaultValue?: number) => {
  let height = getStyle(el, "height", defaultValue);

  if (height === "auto") {
    height = el.offsetHeight;
  }

  return parseFloat(height);
};
