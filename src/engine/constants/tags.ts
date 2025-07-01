/**
 * Daphne Editor Engine - Tags Constants (TypeScript Implementation)
 *
 * HTML 标签相关的常量定义
 */

import { toMap } from '../utils/string';

/** 块级标签映射 */
export const BLOCK_TAG_MAP = toMap('html,head,body,h1,h2,h3,h4,h5,h6,p,div,pre,blockquote,hr,ul,ol,li,table,thead,tbody,colgroup,col,tr,td,th,video,iframe');

/** 行内标签映射 */
export const INLINE_TAG_MAP = toMap('a,br,img');

/** 标记标签映射 */
export const MARK_TAG_MAP = toMap('b,strong,i,em,u,del,s,strike,code,mark,span,sub,sup');

/** 空标签映射 */
export const VOID_TAG_MAP = toMap('br,hr,img,col,anchor,focus,cursor');

/** 实体标签映射 */
export const SOLID_TAG_MAP = toMap('table,thead,tbody,colgroup,col,tr,td,th,ul,ol,li');

/** 标题标签映射 */
export const HEADING_TAG_MAP = toMap('h1,h2,h3,h4,h5,h6,p');

/** 标题标签映射（仅标题） */
export const TITLE_TAG_MAP = toMap('h1,h2,h3,h4,h5,h6');

/** 根标签映射 */
export const ROOT_TAG_MAP = toMap('h1,h2,h3,h4,h5,h6,p,blockquote,ul,ol');

/** 表格标签映射 */
export const TABLE_TAG_MAP = toMap('table,thead,tbody,tr,td,th');
