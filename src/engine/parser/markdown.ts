import markdownIt from "markdown-it";
import markdownItAbbr from "markdown-it-abbr";
import markdownItCheckboxes from "markdown-it-checkboxes";
import { full as markdownItEmoji } from 'markdown-it-emoji'
import markdownItFootnote from "markdown-it-footnote";
import markdownItIns from "markdown-it-ins";
import markdownItMark from "markdown-it-mark";
import markdownItSub from "markdown-it-sub";
import markdownItSup from "markdown-it-sup";
import markdownITaskLists from "markdown-it-task-lists";

export class ParserMarkdown {
  private md: markdownIt;
  constructor() {
    const md = (this.md = new markdownIt({
      // Enable HTML tags in source
      html: true,
      // Autoconvert URL-like text to links
      linkify: true,
      // Convert '\n' in paragraphs into <br>
      breaks: true,
    }));
    md.use(markdownItAbbr);
    md.use(markdownItCheckboxes);
    md.use(markdownItEmoji);
    md.use(markdownItFootnote);
    md.use(markdownItIns);
    md.use(markdownItMark);
    md.use(markdownItSub);
    md.use(markdownItSup);
    md.use(markdownITaskLists);
  }

  toHTML(source: string): string {
    return this.md.render(source);
  }
}
