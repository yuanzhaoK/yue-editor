/// <reference types="vite/client" />
declare module "markdown-it-task-lists" {
  import MarkdownIt from "markdown-it";

  interface MarkdownItTaskListsOptions {
    enabled?: boolean;
    label?: boolean;
    labelAfter?: boolean;
  }

  function markdownitTaskLists(
    md: MarkdownIt,
    options?: MarkdownItTaskListsOptions
  ): void;

  export default markdownitTaskLists;
}

declare module "markdown-it-sup" {
  import MarkdownIt from "markdown-it";
  const markdownItSup: MarkdownIt.PluginWithParams;
  export default markdownItSup;
}

declare module "markdown-it" {
  interface MarkdownIt {
    render(md: string, env?: any): string;
    use(plugin: any, options?: any): MarkdownIt;
  }

  interface Options {
    html?: boolean;
    linkify?: boolean;
    breaks?: boolean;
    [key: string]: any;
  }

  interface MarkdownItConstructor {
    new (options?: Options): MarkdownIt;
    (options?: Options): MarkdownIt;
  }

  namespace MarkdownIt {
    interface PluginWithParams {
      (md: MarkdownIt, ...params: any[]): void;
    }
  }

  const MarkdownIt: MarkdownItConstructor;
  export default MarkdownIt;
}

declare module "markdown-it-abbr" {
  import MarkdownIt from "markdown-it";
  const markdownItAbbr: MarkdownIt.PluginWithParams;
  export default markdownItAbbr;
}

declare module "markdown-it-checkboxes" {
  import MarkdownIt from "markdown-it";
  const markdownItCheckboxes: MarkdownIt.PluginWithParams;
  export default markdownItCheckboxes;
}

declare module "markdown-it-emoji" {
  import MarkdownIt from "markdown-it";
  const markdownItEmoji: MarkdownIt.PluginWithParams;
  export default { full: markdownItEmoji };
}

declare module "markdown-it-footnote" {
  import MarkdownIt from "markdown-it";
  const markdownItFootnote: MarkdownIt.PluginWithParams;
  export default markdownItFootnote;
}

declare module "markdown-it-ins" {
  import MarkdownIt from "markdown-it";
  const markdownItIns: MarkdownIt.PluginWithParams;
  export default markdownItIns;
}

declare module "markdown-it-mark" {
  import MarkdownIt from "markdown-it";
  const markdownItMark: MarkdownIt.PluginWithParams;
  export default markdownItMark;
}

declare module "markdown-it-sub" {
  import MarkdownIt from "markdown-it";
  const markdownItSub: MarkdownIt.PluginWithParams;
  export default markdownItSub;
}
