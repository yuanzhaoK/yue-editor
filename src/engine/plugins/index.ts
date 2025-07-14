/**
 * Daphne Editor Engine - Plugins Export
 *
 * 导出所有内置插件
 */

// 格式化插件
export { BoldPlugin } from "./format/bold";
export { ItalicPlugin } from "./format/italic";
export { Paste } from "./core/paste";
export { Drop } from "./core/drop";

// 元素插件
export { LinkPlugin } from "./element/link";

// 插件集合
import { BoldPlugin } from "./format/bold";
import { ItalicPlugin } from "./format/italic";
import { LinkPlugin } from "./element/link";

export const FORMAT_PLUGINS = [BoldPlugin, ItalicPlugin];

export const ELEMENT_PLUGINS = [LinkPlugin];

export const ALL_PLUGINS = [...FORMAT_PLUGINS, ...ELEMENT_PLUGINS];
