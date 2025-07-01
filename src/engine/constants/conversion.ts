/**
 * Daphne Editor Engine - Conversion Constants 
 * 键盘输入标识字符直接转换为对应的 block 元素
 * 转换相关的常量定义
 */

/** 转换规则类型 */
export enum ConversionType {
  /** 块级转换 */
  BLOCK = 'block',
  /** 行内转换 */
  INLINE = 'inline',
  /** 标记转换 */
  MARK = 'mark',
  /** 卡片转换 */
  CARD = 'card'
}

/** 默认转换规则 */
export const DEFAULT_CONVERSION_RULES = {
  /** HTML 转换规则 */
  html: {
    // 块级元素转换
    'h1,h2,h3,h4,h5,h6': { type: ConversionType.BLOCK, tag: 'heading' },
    'p': { type: ConversionType.BLOCK, tag: 'paragraph' },
    'blockquote': { type: ConversionType.BLOCK, tag: 'quote' },
    'ul,ol': { type: ConversionType.BLOCK, tag: 'list' },
    'li': { type: ConversionType.BLOCK, tag: 'list-item' },

    // 行内元素转换
    'a': { type: ConversionType.INLINE, tag: 'link' },
    'img': { type: ConversionType.INLINE, tag: 'image' },
    'br': { type: ConversionType.INLINE, tag: 'break' },

    // 标记元素转换
    'strong,b': { type: ConversionType.MARK, tag: 'bold' },
    'em,i': { type: ConversionType.MARK, tag: 'italic' },
    'u': { type: ConversionType.MARK, tag: 'underline' },
    'del,s': { type: ConversionType.MARK, tag: 'strikethrough' },
    'code': { type: ConversionType.MARK, tag: 'code' },
    'sub': { type: ConversionType.MARK, tag: 'subscript' },
    'sup': { type: ConversionType.MARK, tag: 'superscript' }
  },

  /** Markdown 转换规则 */
  markdown: {
    '# ': { type: ConversionType.BLOCK, tag: 'h1' },
    '## ': { type: ConversionType.BLOCK, tag: 'h2' },
    '### ': { type: ConversionType.BLOCK, tag: 'h3' },
    '#### ': { type: ConversionType.BLOCK, tag: 'h4' },
    '##### ': { type: ConversionType.BLOCK, tag: 'h5' },
    '###### ': { type: ConversionType.BLOCK, tag: 'h6' },
    '> ': { type: ConversionType.BLOCK, tag: 'blockquote' },
    '- ': { type: ConversionType.BLOCK, tag: 'ul' },
    '* ': { type: ConversionType.BLOCK, tag: 'ul' },
    '+ ': { type: ConversionType.BLOCK, tag: 'ul' },
    '1. ': { type: ConversionType.BLOCK, tag: 'ol' },
    '```': { type: ConversionType.BLOCK, tag: 'code-block' },
    '**': { type: ConversionType.MARK, tag: 'bold' },
    '*': { type: ConversionType.MARK, tag: 'italic' },
    '~~': { type: ConversionType.MARK, tag: 'strikethrough' },
    '`': { type: ConversionType.MARK, tag: 'code' }
  }
} as const;
