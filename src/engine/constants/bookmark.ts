/**
 * Daphne Editor Engine - Bookmark Constants
 *
 * 书签相关的常量定义
 */

/** Lake 元素属性 */
export const DAPHNE_ELEMENT = "data-daphne-element";

export const ANCHOR = "anchor";
export const FOCUS = "focus";
export const CURSOR = 'cursor'

/** 游标选择器 */
export const CURSOR_SELECTOR = `[${DAPHNE_ELEMENT}=cursor]`;

/** 锚点选择器 */
export const ANCHOR_SELECTOR = `[${DAPHNE_ELEMENT}=anchor]`;

/** 焦点选择器 */
export const FOCUS_SELECTOR = `[${DAPHNE_ELEMENT}=focus]`;
