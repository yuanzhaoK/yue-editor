import { escape } from "../utils/string";
export class ParserText {
  source: string;
  constructor(source: string) {
    this.source = source;
  }

  toHTML() {
    let html = escape(this.source);
    html = html
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "</p><p>")
      .replace(/<p><\/p>/g, "<p><br /></p>")
      .replace(/^\s/, "&nbsp;")
      .replace(/\s$/, "&nbsp;")
      .replace(/\s\s/g, " &nbsp;");

    if (html.indexOf("</p><p>") >= 0) {
      html = "<p>".concat(html, "</p>");
    }
    return html;
  }
}
export const parseTextToHTML = (text: string): string => {
  const parser = new ParserText(text);
  return parser.toHTML();
}