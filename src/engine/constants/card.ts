/**
 * Daphne Editor Engine - Card Constants
 *
 * 卡片相关的常量定义
 */

/** 卡片标识属性 */
export const CARD_KEY = 'data-daphne-card';

/** 准备就绪的卡片标识属性 */
export const READY_CARD_KEY = 'data-ready-card';

/** 卡片类型属性 */
export const CARD_TYPE_KEY = 'data-card-type';

/** 卡片值属性 */
export const CARD_VALUE_KEY = 'data-card-value';

/** 卡片元素属性 */
export const CARD_ELEMENT_KEY = 'data-card-element';

/** 卡片选择器 */
export const CARD_SELECTOR = `div[${CARD_KEY}],span[${CARD_KEY}]`;

/** 准备就绪的卡片选择器 */
export const READY_CARD_SELECTOR = `div[${READY_CARD_KEY}],span[${READY_CARD_KEY}]`;

/** 卡片左侧游标选择器 */
export const CARD_LEFT_SELECTOR = `span[${CARD_ELEMENT_KEY}=left]`;

/** 卡片中心选择器 */
export const CARD_CENTER_SELECTOR = `div[${CARD_ELEMENT_KEY}=center],span[${CARD_ELEMENT_KEY}=center]`;

/** 卡片右侧游标选择器 */
export const CARD_RIGHT_SELECTOR = `span[${CARD_ELEMENT_KEY}=right]`;
