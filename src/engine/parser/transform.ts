import { validUrl } from "../utils/string";

export type ConversionRuleItem = [
  from: string | Record<string, Record<string, string>>,
  to: string
];

// 转换标签、属性、样式
export default (
  rules: ConversionRuleItem[],
  name: string,
  attrs: Record<string, any>,
  styles: CSSStyleDeclaration,
  isBlockNode: boolean
) => {
  if (name === "div") {
    name = "p";
  }

  if (!rules) {
    return name;
  }

  if (name === "card" || isBlockNode) {
    return name;
  }

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const from = rule[0];
    const to = rule[1];

    if (typeof from === "string" && name === from) {
      return to;
    }

    if (typeof from === "object") {
      const fromName = Object.keys(from)[0];

      if (name !== fromName) {
        continue;
      }

      const attrRule = from[fromName];
      const attrKeys = Object.keys(attrs);

      for (let _i = 0; _i < attrKeys.length; _i++) {
        const key = attrKeys[_i];

        if (!attrRule[key]) {
          continue;
        }

        if (typeof attrRule[key] === "string" && attrRule[key] === attrs[key]) {
          delete attrs[key];
          return to;
        }

        if (
          Array.isArray(attrRule[key]) &&
          attrRule[key].indexOf(attrs[key]) >= 0
        ) {
          delete attrs[key];
          return to;
        }
      }

      const styleRule = (attrRule.style || {}) as Record<
        string,
        string | Record<string, string>
      >;
      const styleKeys = Object.keys(styles) as string[];

      for (let _i2 = 0; _i2 < styleKeys.length; _i2++) {
        const _key: string = styleKeys[_i2];

        if (!styleRule[_key]) {
          continue;
        }

        if (
          typeof styleRule[_key] === "string" &&
          styleRule[_key] === styles.getPropertyValue(_key)
        ) {
          styles.removeProperty(_key);
          return to;
        }

        if (
          Array.isArray(styleRule[_key]) &&
          styleRule[_key].indexOf(styles.getPropertyValue(_key)) >= 0
        ) {
          styles.removeProperty(_key);
          return to;
        }
      }
    }
  }
  return name;
};
// 过滤一个属性或样式
const filterProp = (
  props: Record<string, any>,
  rule: Record<string, any>,
  key: string
) => {
  if (!rule[key]) {
    delete props[key];
    return;
  }
  // 内置规则
  if (typeof rule[key] === "string" && rule[key].charAt(0) === "@") {
    switch (rule[key]) {
      case "@number":
        rule[key] = /^-?\d+(\.\d+)?$/;
        break;

      case "@length":
        rule[key] = /^-?\d+(\.\d+)?(\w*|%)$/;
        break;

      case "@color":
        rule[key] = /^(rgb(.+?)|#\w{3,6}|\w+)$/i;
        break;

      case "@url":
        rule[key] = validUrl;
        break;

      default:
        break;
    }
  }
  // 字符串
  if (typeof rule[key] === "string") {
    if (rule[key] === "*") {
      return;
    }

    if (key === "class") {
      processClassName(props, key, (className) => {
        return rule[key] === className;
      });
      return;
    }

    if (rule[key] !== props[key]) {
      delete props[key];
    }
    return;
  }
  // 数组
  if (Array.isArray(rule[key])) {
    if (key === "class") {
      processClassName(props, key, (className) => {
        return rule[key].indexOf(className) >= 0;
      });
      return;
    }

    if (rule[key].indexOf(props[key]) < 0) {
      delete props[key];
    }
    return;
  }
  // 正则表达式
  if (typeof rule[key] === "object" && typeof rule[key].test === "function") {
    if (key === "class") {
      processClassName(props, key, (className) => {
        return rule[key].test(className);
      });
      return;
    }

    if (!rule[key].test(props[key])) {
      delete props[key];
    }
    return;
  }
  // 自定义函数
  if (typeof rule[key] === "function") {
    if (!rule[key](props[key])) {
      delete props[key];
    }
    return;
  }
};

// 对 class 进行过滤
const processClassName = (
  props: Record<string, any>,
  key: string,
  compareFunc: (className: string) => boolean
) => {
  if (key === "class") {
    const classList = props[key].split(" ");
    const newClassList: string[] = [];
    classList.forEach((className: string) => {
      if (compareFunc(className)) {
        newClassList.push(className);
      }
    });

    if (newClassList.length > 0) {
      props[key] = newClassList.join(" ");
    } else {
      delete props[key];
    }
    return;
  }
};

// 过滤标签、属性、样式
// return true：过滤标签
// return false：不过滤标签

export function filter(
  rules: Record<string, any>,
  name: string,
  attrs: Record<string, any>,
  styles: CSSStyleDeclaration
): boolean {
  if (!rules) {
    return false;
  }

  if (["anchor", "focus", "cursor", "card"].indexOf(name) >= 0) {
    return false;
  }

  if (!rules[name]) {
    return true;
  }

  if (!attrs) {
    return false;
  }

  Object.keys(attrs).forEach(function (key) {
    filterProp(attrs, rules[name], key);
  });
  const rulesStyle = rules[name].style || {};
  Object.keys(styles).forEach(function (key) {
    filterProp(styles, rulesStyle, key);
  });
  return false;
}

