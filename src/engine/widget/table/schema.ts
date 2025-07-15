import { SchemaRule } from "@/engine/types";

export default [
  {
    name: "table",
    class: "lake-table",
    style: {
      width: "@length",
    },
    type: 'block',
    isVoid: true,
  },
  {
    name: "colgroup",
    isVoid: true,
    type: 'inline',
  },
  {
    name: "col",
    attribute: {
      span: "@number",
      width: "@length",
    },
    isVoid: true,
    type: 'inline',
  },
  {
    name: "thead",
    isVoid: true,
    type: 'inline',
  },
  {
    name: "tbody",
    isVoid: true,
    type: 'inline',
  },
  {
    name: "tr",
    style: {
      height: "@length",
    },
    isVoid: true,
    type: 'inline',
  },
  {
    name: "td",
    attribute: {
      colspan: "@number",
      rowspan: "@number",
    },
    style: {
      "text-align": ["left", "center", "right", "justify"],
      "vertical-align": ["top", "middle", "bottom"],
      "background-color": "@color",
      background: "@color",
      color: "@color",
    },
    isVoid: false,
    type: 'inline',
  },
  {
    name: "th",
    attribute: {
      colspan: "@number",
      rowspan: "@number",
    },
    style: {
      "text-align": ["left", "center", "right", "justify"],
      "vertical-align": ["top", "middle", "bottom"],
      "background-color": "@color",
      background: "@color",
      color: "@color",
    },
    isVoid: false,
    type: 'inline',
  },
] as SchemaRule[];
