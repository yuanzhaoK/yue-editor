import getNodeModel, { NodeModel } from "../core/node";
import { fetchAllChildren } from "./node";

export const copyNode = (node: NodeModel, event: any): boolean => {
  const selection = window.getSelection();
  let range;

  if (selection && selection.rangeCount > 0) {
    range = selection.getRangeAt(0);
  } else {
    range = document.createRange();
  }

  const prevRange = range.cloneRange();
  const block = getNodeModel("<div>&#8203;</div>");
  block.css({
    position: "fixed",
    top: 0,
    clip: "rect(0, 0, 0, 0)",
  });
  getNodeModel(document.body).append(block);
  block.append(getNodeModel(node).clone(true));
  if (event) {
    fetchAllChildren(block).forEach((child) => {
      child = getNodeModel(child);
      event.trigger("copy:each", child);
    });
  }
  block.append("@&#8203;");
  range.selectNodeContents(block[0]);
  selection?.removeAllRanges();
  selection?.addRange(range);
  let success = false;

  try {
    success = document.execCommand("copy");
    if (!success) {
      throw "copy command was unsuccessful";
    }
  } catch (err) {
    console.log("unable to copy using execCommand: ", err);
  } finally {
  }
  return success;
};

const getClipboardData = (
  event: ClipboardEvent | DragEvent
): {
  text?: string;
  html?: string;
  files?: File[];
  [key: string]: any;
} => {
  if (
    !(event as DragEvent).dataTransfer &&
    !(event as ClipboardEvent).clipboardData
  ) {
    return {};
  }
  const transfer =
    (event as DragEvent).dataTransfer! ||
    (event as ClipboardEvent).clipboardData!;
  let html = transfer.getData("text/html");
  let text = transfer.getData("text");
  let files: File[] = [];
  try {
    if (transfer.items && transfer.items.length > 0) {
      files = Array.from(transfer.items)
        .map((item) => {
          let file = item.kind === "file" ? item.getAsFile() : null;
          if (file !== null) {
            if (
              file.type &&
              file.type.indexOf("image/png") > -1 &&
              !file.lastModified
            ) {
              file = new File([file], "image.png", {
                type: file.type,
              });
            }
            // @ts-ignore
            file.ext = text.split(".").pop();
          }
          return file;
        })
        .filter((exists) => {
          return exists;
        }) as File[];
    } else if (transfer.files && transfer.files.length > 0) {
      files = Array.from(transfer.files);
    }
  } catch (error) {
    if (transfer.files && transfer.files.length > 0) {
      files = Array.from(transfer.files);
    }
    console.error("Error getting clipboard data: ", error);
  }
  // 从 Mac OS Finder 复制文件
  if (html === "" && /^.+\.\w+$/.test(text) && files.length > 0) {
    text = ""; // 在图片上，点击右键复制
  } else if (
    text === "" &&
    /^(<meta.+?>)?<img.+?>$/.test(html) &&
    files.length > 0
  ) {
    html = ""; // 从 Excel、Numbers 复制
  } else if (html || text) {
    files = [];
  }
  return {
    html,
    text,
    files,
  };
};

export { getClipboardData };
