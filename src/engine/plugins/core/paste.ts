import tinycolor2 from "tinycolor2";
import { BasePlugin } from "@/engine/core/base-plugin";
import { ParserHtml } from "@/engine/parser/html";
import { ParserText } from "@/engine/parser/text";
import {
  ROOT,
  CARD_SELECTOR,
  READY_CARD_KEY,
  READY_CARD_SELECTOR,
  ROOT_SELECTOR,
} from "@/engine/constants";
import {
  fetchAllChildren,
  isEmptyNodeWithTrim,
  removeMinusStyle,
  removeSideBr,
  unwrapNode,
} from "@/engine/utils/node";
import getNodeModel, { NodeModel } from "@/engine/core/node";
import {
  addListStartNumber,
  brToParagraph,
} from "@/engine/changes/utils/block";
import { createBookmark, moveToBookmark } from "@/engine/utils/range";
import { ParserMarkdown } from "@/engine/parser/markdown";

class Paste extends BasePlugin {
  private getDefaultStyleList = (): Partial<CSSStyleDeclaration>[] => {
    const defaultStyleList = [
      {
        color: tinycolor2(this.engine.editArea.css("color")).toHex(),
      },
      {
        "background-color": tinycolor2("white").toHex(),
      },
      {
        "font-size": this.engine.editArea.css("font-size"),
      },
    ];

    const blockRoot = this.engine.editArea.closest(CARD_SELECTOR);
    if (blockRoot.length) {
      const editArea = blockRoot.closest(ROOT_SELECTOR);
      defaultStyleList.push({
        color: tinycolor2(editArea.css("color")).toHex(),
      });
      defaultStyleList.push({
        "background-color": tinycolor2(
          editArea.css("background-color")
        ).toHex(),
      });
    }
    return defaultStyleList;
  };

  private setNode(node: NodeModel, html: string) {
    let nodeModel = getNodeModel(node);
    let otherNode = getNodeModel(html).clone(false);
    let child = nodeModel.first();
    while (child) {
      let next = child.next();
      otherNode.append(child);
      child = next;
    }
    return nodeModel.replaceWith(otherNode);
  }
  private removeElementNodes(fragment: NodeModel) {
    const nodes = fetchAllChildren(fragment);
    nodes.forEach((node) => {
      node = getNodeModel(node);
      if (node.isElement()) {
        unwrapNode(node[0]);
      }
    });
  }
  private commonNormalize(fragment: NodeModel) {
    const defaultStyleList = this.getDefaultStyleList();
    // 第一轮预处理，主要处理 span 节点
    let nodes = fetchAllChildren(fragment);

    nodes.forEach((node) => {
      // 跳过卡片
      if (node.isCard()) {
        return;
      }
      // 删除与默认样式一样的 inline 样式
      if (node.isElement()) {
        defaultStyleList.forEach((item) => {
          const key = Object.keys(item)[0] as keyof CSSStyleDeclaration;
          const defaultValue = item[key];
          let currentValue = node.css(key as string) as string;

          if (currentValue) {
            if (/color$/.test(key as string)) {
              currentValue = tinycolor2(currentValue).toHex();
            }
            if (currentValue === defaultValue) {
              node.css(key as string, "");
            }
          }
        });
      }
      removeMinusStyle(node, "text-indent");
      // 删除从表格复制的背景样式
      if (node.name === "span" && this.engine.domEvent.copySource === "table") {
        node.css("background-color", "");
      }
      if (["ol", "ul"].includes(node.name)) {
        node.css("padding-left", "");
      }
      // 删除空 style 属性
      if (node.isElement()) {
        if (!node.attr("style")) {
          node.removeAttr("style");
        }
      }
      // 删除空 span
      if (
        node.name === "span" &&
        Object.keys(node.attr() as Record<string, string>).length === 0 &&
        Object.keys(node.css()).length === 0 &&
        (node.text().trim() === "" ||
          (node.first() && (node.first()?.isMark() || node.first()?.isBlock())))
      ) {
        unwrapNode(node[0]);
        return;
      }

      // br 换行改成正常段落
      if (node.isBlock()) {
        brToParagraph(node);
      }
    });

    nodes = fetchAllChildren(fragment);
    nodes.forEach((node) => {
      node = getNodeModel(node);
      // 跳过已被删除的节点
      if (!node.parent()) {
        return;
      }
      // 删除 google docs 根节点
      // <b style="font-weight:normal;" id="docs-internal-guid-e0280780-7fff-85c2-f58a-6e615d93f1f2">
      if (/^docs-internal-guid-/.test(node.attr("id") as string)) {
        unwrapNode(node[0]);
        return;
      }
      // 跳过卡片
      if (node.attr(READY_CARD_KEY)) {
        return;
      }
      // 删除零高度的空行
      if (
        node.isBlock() &&
        node.attr("data-type") !== "p" &&
        !node.isVoid() &&
        !node.isSolid() &&
        node.html() === ""
      ) {
        node.remove();
        return;
      }
      // 语雀段落
      if (node.attr("data-type") === "p") {
        node.removeAttr("data-type");
      }
      // 补齐 ul 或 ol
      if (
        node.name === "li" &&
        ["ol", "ul"].indexOf(node.parent()?.name || "") < 0
      ) {
        const ul = getNodeModel("<ul />");
        node.before(ul);
        ul.append(node);
        return;
      }
      // 补齐 li
      if (
        ["ol", "ul"].indexOf(node.name) >= 0 &&
        ["ol", "ul"].indexOf(node.parent()?.name || "") >= 0
      ) {
        const li = getNodeModel("<li />");
        node.before(li);
        li.append(node);
        return;
      }
      // <li>two<ol><li>three</li></ol>four</li>
      if (
        ["ol", "ul"].indexOf(node.name) >= 0 &&
        node.parent()?.name === "li" &&
        (node.prev() || node.next())
      ) {
        const parent = node.parent();
        let li: NodeModel | null = null;
        const hasList = parent?.parent()?.hasClass(`${ROOT}-list`);
        parent?.children().each((child) => {
          let childModel = getNodeModel(child);
          if (isEmptyNodeWithTrim(childModel[0])) {
            return;
          }
          const isList = ["ol", "ul"].indexOf(childModel.name) >= 0;
          if (!li || isList) {
            li = hasList
              ? getNodeModel('<li class="lake-list-node lake-list-task" />')
              : getNodeModel("<li />");
            parent.before(li);
          }
          li.append(child);
          if (isList) {
            li = null;
          }
        });
        parent?.remove();
        return;
      }
      // p 改成 li
      if (
        node.name === "p" &&
        ["ol", "ul"].indexOf(node.parent()?.name || "") >= 0
      ) {
        this.setNode(node, "<li />");
        return;
      }
      // 处理空 Block
      if (node.isBlock() && !node.isVoid() && node.html().trim() === "") {
        // <p></p> to <p><br /></p>
        if (node.isHeading() || node.name === "li") {
          node.html("<br />");
        }
      }
      // <li><p>foo</p></li>
      if (node.isHeading() && node.parent()?.name === "li") {
        // <li><p><br /></p></li>
        if (node.children().length === 1 && node.first()?.name === "br") {
          // nothing
        } else {
          node.after("<br />");
        }
        unwrapNode(node[0]);
        return;
      }
      // 移除两边的 BR
      removeSideBr(node);
    });
  }
  private normalizePaste(fragment: NodeModel) {
    this.commonNormalize(fragment);
    const range = this.engine.change.getRange();
    const ancestor = getNodeModel(range.commonAncestorContainer);
    if (ancestor.closest("code").length > 0) {
      this.removeElementNodes(fragment);
      return;
    }
    if (ancestor.isText() && range.startContainer === range.endContainer) {
      const text = ancestor[0].nodeValue;
      if (text) {
        const leftText = text.slice(0, range.startOffset);
        const rightText = text.slice(range.endOffset);
        // 光标在 [text](|) 里
        if (/\[.*?\]\($/.test(leftText) && /^\)/.test(rightText)) {
          this.removeElementNodes(fragment);
          return;
        }
      }
    }

    let nodes = fetchAllChildren(fragment);
    nodes.forEach((node) => {
      node = getNodeModel(node);
      this.engine.event.trigger("paste:each", node);
    });
    nodes = fetchAllChildren(fragment);
    nodes.forEach((node) => {
      node = getNodeModel(node);
      // 删除包含卡片的 pre 标签
      if (node.name === "pre" && node.find(READY_CARD_SELECTOR).length > 0) {
        unwrapNode(node[0]);
      }
    });
    this.normalizePaste(fragment);
    nodes = fetchAllChildren(fragment);
    nodes.forEach((node) => {
      node = getNodeModel(node);
      if (["ol", "ul"].includes(node.name)) {
        addListStartNumber(node, range);
      }
    });
  }

  initialize() {
    this.engine.command.register("paste", {
      description: "粘贴",
      execute: (source: string) => {
        const schema = this.engine.schema.clone();
        const conversion = this.engine.conversion.clone();
        schema.addRules([
          {
            name: "pre",
            type: "block",
            isVoid: true,
          },
          {
            name: "p",
            type: "block",
            attributes: {
              "data-type": "*",
            },
            style: {
              "font-size": "@length",
            },
            isVoid: false,
          },
          {
            name: "span",
            type: "inline",
            isVoid: false,
            attributes: {
              "data-type": "*",
            },
            style: {
              "font-size": "@length",
            },
          },
          {
            name: "mark",
            type: "inline",
            isVoid: true,
          },
          {
            name: "block",
            type: "block",
            isVoid: false,
            attributes: {
              id: "*",
            },
          },
        ]);
        this.engine.event.trigger("paste:schema", schema);

        const fragment = new ParserHtml(source, schema, conversion, (root) => {
          this.engine.event.trigger("paste:origin", root);
        }).toDOM();

        this.normalizePaste(getNodeModel(fragment));
        this.engine.event.trigger("paste:before", fragment);
        this.engine.change.insertFragment(fragment, () => {
          this.engine.event.trigger("paste:insert");
          const range = this.engine.change.getRange();
          const bookmark = createBookmark(range);
          this.engine.block.renderAll(this.engine.editArea, this.engine, null);
          moveToBookmark(range, bookmark);
        });
        this.engine.event.trigger("paste:after", fragment);
      },
      queryEnabled: () => {
        return true;
      },
      queryState: () => {
        return true;
      },
    });
    this.engine.domEvent.onPaste((data) => {
      // 文件上传
      if (data.files && data.files.length > 0) {
        this.engine.event.trigger("paste:files", data.files);
      } else {
        let source = "";
        // 纯文本粘贴
        if (data.isPasteText) {
          let text = "";
          if (data.html) {
            text = new ParserHtml(data.html).toText();
          } else if (data.text) {
            text = data.text;
          }
          source = new ParserText(text).toHTML();
        } else {
          // 富文本粘贴
          if (data.html) {
            source = data.html;
          } else if (data.text) {
            var _text = data.text;
            // 链接粘贴走 markdown 解析

            if (/^https?:\/\/\S+$/.test(_text)) {
              source = new ParserMarkdown().toHTML(_text);
            } else {
              source = new ParserText(_text).toHTML();
            }
          }
        }

        const prevValue = this.engine.change.getValue() as string;
        this.engine.event.trigger("paste:string", data, prevValue);
        this.engine.command.execute("paste", source);
      }
    });
    // 监听插件事件
    this.on("custom-event", (data) => {
      console.log("自定义事件:", data);
    });
  }
  execute(...args: any[]) {
    this.emit("custom-event", { message: "Hello" });
    this.engine.event.trigger("custom-event", {
      message: "这是一个自定义事件",
      args: args,
    });
  }
}
export default Paste;
