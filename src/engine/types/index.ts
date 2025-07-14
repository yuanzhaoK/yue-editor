/**
 * Daphne Editor Engine - TypeScript Type Definitions
 *
 * 这个文件定义了引擎层的所有核心类型，为整个编辑器提供类型安全保障
 */

import { CommandInterface } from "../core/command";
import { Engine } from "../core/engine";
import { NodeModel } from "../core/node";

/**
 * DOM 节点相关类型
 */
export type DOMNode = Node | Element | HTMLElement | Text;

/**
 * 选择器类型
 */
export type Selector = string;

/**
 * 事件回调函数类型
 */
export type EventCallback<T = any> = (data: T, ...rest: any[]) => void | boolean;

/**
 * 异步事件回调函数类型
 */
export type AsyncEventCallback<T = any> = (
  data?: T
) => Promise<void | boolean> | void | boolean;

/**
 * 编辑器配置选项
 */
export interface EngineOptions {
  /** 语言设置 */
  lang?: "en" | "zh-cn";

  /** 父节点 */
  parentNode?: HTMLElement;

  /** Tab 索引 */
  tabIndex?: number;

  /** 自定义 CSS 类名 */
  className?: string;

  /** 默认值 */
  defaultValue?: string;

  /** 启用的插件列表 */
  plugins?: string[];

  /** 插件配置 */
  [pluginName: string]: any;
}

/**
 * 卡片类型枚举
 */
export enum CardType {
  INLINE = "inline",
  BLOCK = "block",
}

export enum BlockType {
  INLINE = "inline",
  BLOCK = "block",
}
/**
 * 卡片状态接口
 */
export interface BlockState {
  /** 是否只读 */
  readonly: boolean;

  /** 是否已选中 */
  selected: boolean;

  /** 是否已激活 */
  activated: boolean;

  /** 是否被其他用户激活 */
  activatedByOther: boolean;

  /** 是否有焦点 */
  focused: boolean;

  /** 是否折叠 */
  collapsed: boolean;
}

/**
 * 卡片值类型
 */
export interface BlockValue {
  /** 卡片唯一标识 */
  id?: string;

  /** 其他属性 */
  [key: string]: any;
}

/**
 * 卡片工具栏项目类型
 */
export interface CardToolbarItemConfig {
  /** 工具栏项类型 */
  type:
  | "button"
  | "dropdown"
  | "separator"
  | "dnd"
  | "copy"
  | "delete"
  | "maximize"
  | "node"
  | "collapse"
  | "expand";

  /** 标题 */
  title?: string;

  /** 图标 */
  icon?: string;

  /** 是否禁用 */
  disabled?: boolean;
}
export interface CardToolbarItem {
  /** 工具栏项类型 */
  type:
  | "button"
  | "dropdown"
  | "separator"
  | "dnd"
  | "copy"
  | "delete"
  | "maximize"
  | "node"
  | "collapse"
  | "expand";

  node: NodeModel;

  name: string;

  iconName: string;

  title: string;

  /** 图标 */
  icon?: string;

  /** 点击回调 */
  onClick?: () => void;
}
/**
 * 选区范围接口
 */
export interface RangeInterface extends Range {
  /** 开始容器 */
  startContainer: Node;

  /** 开始偏移 */
  startOffset: number;

  /** 结束容器 */
  endContainer: Node;

  /** 结束偏移 */
  endOffset: number;

  /** 是否折叠 */
  collapsed: boolean;

  /** 公共祖先容器 */
  commonAncestorContainer: Node;

  /** 克隆选区 */
  cloneRange(): RangeInterface;

  /** 折叠选区 */
  collapse(toStart?: boolean): void;

  /** 选择节点内容 */
  selectNodeContents(node: Node): void;

  /** 选择节点 */
  selectNode(node: Node): void;

  /** 设置开始位置 */
  setStart(node: Node, offset: number): void;

  /** 设置结束位置 */
  setEnd(node: Node, offset: number): void;

  /** 在节点前设置开始位置 */
  setStartBefore(node: Node): void;

  /** 在节点后设置开始位置 */
  setStartAfter(node: Node): void;

  /** 在节点前设置结束位置 */
  setEndBefore(node: Node): void;

  /** 在节点后设置结束位置 */
  setEndAfter(node: Node): void;
}

/**
 * 变更操作类型枚举
 */
export enum ChangeType {
  INSERT_TEXT = "insert_text",
  DELETE_CONTENT = "delete_content",
  INSERT_BLOCK = "insert_block",
  INSERT_INLINE = "insert_inline",
  INSERT_MARK = "insert_mark",
  REMOVE_MARK = "remove_mark",
  SET_BLOCKS = "set_blocks",
  WRAP_BLOCK = "wrap_block",
  UNWRAP_BLOCK = "unwrap_block",
  SPLIT_BLOCK = "split_block",
  MERGE_BLOCK = "merge_block",
  INSERT_CARD = "insert_card",
  UPDATE_CARD = "update_card",
  REMOVE_CARD = "remove_card",
}

/**
 * 变更操作接口
 */
export interface ChangeOperation {
  /** 操作类型 */
  type: ChangeType;

  /** 操作路径 */
  path: number[];

  /** 操作数据 */
  data?: any;

  /** 操作前的值 */
  oldValue?: any;

  /** 操作后的值 */
  newValue?: any;
}

/**
 * 历史记录项接口
 */
export interface HistoryItem {
  /** 操作列表 */
  operations: ChangeOperation[];

  /** 时间戳 */
  timestamp: number;

  /** 选区信息 */
  range?: RangeInterface;
}

/**
 * OT 操作接口
 */
export interface OTOperation {
  /** 操作路径 */
  p: (string | number)[];

  /** 插入的对象 */
  oi?: any;

  /** 删除的对象 */
  od?: any;

  /** 插入的列表项 */
  li?: any;

  /** 删除的列表项 */
  ld?: any;

  /** 插入的字符串 */
  si?: string;

  /** 删除的字符串 */
  sd?: string;

  /** 数字增量 */
  na?: number;
}

/**
 * 协同编辑成员接口
 */
export interface CollaborativeMember {
  /** 成员 ID */
  id: string | number;

  /** UUID */
  uuid: string;

  /** 内部 ID */
  iid?: number;

  /** 成员名称 */
  name: string;

  /** 头像 URL */
  avatar?: string;

  /** 颜色 */
  color?: string;

  /** 是否在线 */
  online?: boolean;
}

/**
 * 选区数据接口
 */
export interface SelectionData {
  /** 成员 UUID */
  uuid: string;

  /** 选区范围 */
  range?: RangeInterface;

  /** 路径信息 */
  path?: number[];

  /** 是否激活 */
  active: boolean;
}

/**
 * 插件接口
 */
export interface PluginInterface {
  /** 插件名称 */
  name: string;

  /** 初始化方法 */
  initialize?(): void;

  /** 执行方法 */
  execute?(...args: any[]): void;

  /** 查询状态方法 */
  queryState?(): boolean;

  /** 查询值方法 */
  queryValue?(): any;

  /** 销毁方法 */
  destroy?(): void;
}

/**
 * 插件生命周期钩子
 */
export interface PluginLifecycle {
  /** 插件安装时调用 */
  onInstall?(engine: Engine): void | Promise<void>;

  /** 插件卸载时调用 */
  onUninstall?(engine: Engine): void | Promise<void>;

  /** 插件启用时调用 */
  onEnable?(engine: Engine): void | Promise<void>;

  /** 插件禁用时调用 */
  onDisable?(engine: Engine): void | Promise<void>;

  /** 编辑器就绪时调用 */
  onReady?(engine: Engine): void | Promise<void>;

  /** 编辑器销毁时调用 */
  onDestroy?(engine: Engine): void | Promise<void>;
}

/**
 * 插件配置选项
 */
export interface PluginOptions {
  /** 插件版本 */
  version?: string;

  /** 插件描述 */
  description?: string;

  /** 插件作者 */
  author?: string;

  /** 插件依赖 */
  dependencies?: string[];

  /** 热键配置 */
  hotkeys?: Record<string, string | string[]>;

  /** 插件配置 */
  config?: Record<string, any>;

  /** 是否自动启用 */
  autoEnable?: boolean;

  /** 优先级（数字越大优先级越高） */
  priority?: number;
}

/**
 * 完整的插件接口
 */
export interface Plugin extends PluginInterface, PluginLifecycle {
  /** 插件选项 */
  options?: PluginOptions;

  /** 获取引擎实例 */
  getEngine?(): Engine;

  /** 获取配置 */
  getConfig?<T = any>(key?: string): T;

  /** 设置配置 */
  setConfig?(key: string, value: any): void;

  /** 监听事件 */
  on?(event: string, callback: EventCallback): void;

  /** 移除事件监听 */
  off?(event: string, callback?: EventCallback): void;

  /** 触发事件 */
  emit?(event: string, ...args: any[]): void;

  /** 检查是否启用 */
  isEnabled?(): boolean;

  /** 获取快捷键 */
  getHotkeys?(): Record<string, string | string[]>;

  /** 注册命令 */
  registerCommand?(name: string, command: CommandInterface): void;

  /** 注销命令 */
  unregisterCommand?(name: string): void;
}

/**
 * 插件构造函数
 */
export interface PluginConstructor {
  new(engine: Engine, options?: PluginOptions): Plugin;
  pluginName: string;
  defaultOptions?: PluginOptions;
}

/**
 * 插件元数据
 */
export interface PluginMetadata {
  /** 插件名称 */
  name: string;

  /** 显示名称 */
  displayName?: string;

  /** 插件类型 */
  type?: 'core' | 'format' | 'element' | 'tool' | 'extension';

  /** 插件分类 */
  category?: string;

  /** 插件图标 */
  icon?: string;

  /** 是否为核心插件 */
  isCore?: boolean;

  /** 插件状态 */
  status?: 'installed' | 'enabled' | 'disabled' | 'error';

  /** 插件实例 */
  instance?: Plugin;

  /** 插件构造函数 */
  constructor?: PluginConstructor;

  /** 加载时间 */
  loadTime?: number;

  /** 错误信息 */
  error?: Error;
}

/**
 * 插件管理器接口
 */
export interface PluginManagerInterface {
  /** 注册插件 */
  register(pluginClass: PluginConstructor, options?: PluginOptions): void;

  /** 批量注册插件 */
  registerAll(plugins: PluginConstructor[]): void;

  /** 安装插件 */
  install(name: string): Promise<void>;

  /** 卸载插件 */
  uninstall(name: string): Promise<void>;

  /** 启用插件 */
  enable(name: string): Promise<void>;

  /** 禁用插件 */
  disable(name: string): Promise<void>;

  /** 获取插件实例 */
  get(name: string): Plugin | undefined;

  /** 获取所有插件 */
  getAll(): Map<string, PluginMetadata>;

  /** 检查插件是否存在 */
  has(name: string): boolean;

  /** 检查插件是否启用 */
  isEnabled(name: string): boolean;

  /** 执行插件命令 */
  execute(name: string, ...args: any[]): any;

  /** 查询插件状态 */
  queryState(name: string): boolean;

  /** 初始化所有插件 */
  initializeAll(): Promise<void>;

  /** 销毁所有插件 */
  destroyAll(): Promise<void>;
}

/**
 * 命令类型
 */
export enum CommandType {
  /** 格式命令 */
  FORMAT = 'format',
  /** 插入命令 */
  INSERT = 'insert',
  /** 删除命令 */
  DELETE = 'delete',
  /** 选择命令 */
  SELECT = 'select',
  /** 历史命令 */
  HISTORY = 'history',
  /** 工具命令 */
  TOOL = 'tool'
}

/**
 * 增强的命令接口
 */
export interface Command extends CommandInterface {
  /** 命令名称 */
  name: string;

  /** 命令类型 */
  type?: CommandType;

  /** 命令描述 */
  description?: string;

  /** 快捷键 */
  hotkey?: string | string[];

  /** 是否支持撤销 */
  undoable?: boolean;

  /** 命令图标 */
  icon?: string;

  /** 工具栏配置 */
  toolbar?: {
    /** 工具栏位置 */
    position?: string;
    /** 工具栏分组 */
    group?: string;
    /** 工具栏顺序 */
    order?: number;
  };
}

/**
 * 卡片静态属性接口
 */
export interface CardStaticInterface {
  uid: boolean;
  /** 卡片名称 */
  cardName: string;

  /** 卡片类型 */
  cardType: CardType;

  /** 选择样式类型 */
  selectStyleType?: "outline" | "background";

  /** 是否可搜索 */
  canSearch?: boolean;
}

/**
 * 卡片接口
 */
export interface CardInterface {
  /** 卡片根节点 */
  cardRoot?: NodeModelInterface;

  /** 容器节点 */
  container?: NodeModelInterface;

  /** 卡片值 */
  value: BlockValue;

  /** 卡片状态 */
  state: BlockState;

  /** 渲染方法 */
  render(): NodeModelInterface | HTMLElement;

  /** 激活方法 */
  activate?(): void;

  /** 取消激活方法 */
  unactivate?(): void;

  /** 选中方法 */
  select?(): void;

  /** 取消选中方法 */
  unselect?(): void;

  /** 最大化方法 */
  maximize?(): void;

  /** 恢复方法 */
  restore?(): void;

  /** 获取工具栏配置 */
  embedToolbar?(): CardToolbarItem[];

  /** 设置值 */
  setValue?(value: Partial<BlockValue>, saveHistory?: boolean): void;

  /** 获取值 */
  getValue?(): BlockValue;

  /** 销毁方法 */
  destroy?(): void;
}

/**
 * 节点模型接口
 */
export interface NodeModelInterface {
  /** 节点数组长度 */
  length: number;

  /** 文档对象 */
  doc: Document;

  /** 根节点 */
  root?: Node;

  /** 节点名称 */
  name: string;

  /** 节点类型 */
  type: number;

  /** 窗口对象 */
  win: Window;

  /** 节点索引访问 */
  [index: number]: Node;

  /** 转换为数组 */
  toArray(): Node[];

  /** 是否为元素节点 */
  isElement(): boolean;

  /** 是否为文本节点 */
  isText(): boolean;

  /** 是否为块级元素 */
  isBlock(): boolean;

  /** 是否为行内元素 */
  isInline(): boolean;

  /** 是否为根块级元素 */
  isRootBlock(): boolean;

  /** 是否为简单块级元素 */
  isSimpleBlock(): boolean;

  /** 是否为标记元素 */
  isMark(): boolean;

  /** 是否为卡片 */
  isCard(): boolean;

  /** 是否为块级卡片 */
  isBlockCard(): boolean;

  /** 是否为空元素 */
  isVoid(): boolean;

  /** 是否为实体元素 */
  isSolid(): boolean;

  /** 是否为标题元素 */
  isHeading(): boolean;

  /** 是否为标题 */
  isTitle(): boolean;

  /** 是否为表格元素 */
  isTable(): boolean;

  /** 是否为根元素 */
  isRoot(): boolean;

  /** 是否可编辑 */
  isEditable(): boolean;

  /** 遍历节点 */
  each(
    callback: (node: Node, index: number) => void | boolean
  ): NodeModelInterface;

  /** 获取指定索引的节点 */
  eq(index: number): NodeModelInterface | undefined;

  /** 获取节点在父容器中的索引 */
  index(): number;

  /** 获取父节点 */
  parent(): NodeModelInterface | undefined;

  /** 获取子节点 */
  children(selector?: string): NodeModelInterface;

  /** 获取第一个子节点 */
  first(): NodeModelInterface | undefined;

  /** 获取最后一个子节点 */
  last(): NodeModelInterface | undefined;

  /** 获取前一个兄弟节点 */
  prev(): NodeModelInterface | undefined;

  /** 获取后一个兄弟节点 */
  next(): NodeModelInterface | undefined;

  /** 获取前一个元素兄弟节点 */
  prevElement(): NodeModelInterface | undefined;

  /** 获取后一个元素兄弟节点 */
  nextElement(): NodeModelInterface | undefined;

  /** 是否包含其他节点 */
  contains(otherNode: Node | NodeModelInterface): boolean;

  /** 查找子节点 */
  find(selector: string): NodeModelInterface;

  /** 查找最近的祖先节点 */
  closest(selector: string): NodeModelInterface;

  /** 绑定事件 */
  on(eventType: string, listener: EventListener): NodeModelInterface;

  /** 解绑事件 */
  off(eventType: string, listener?: EventListener): NodeModelInterface;

  /** 移除所有事件 */
  removeAllEvents(): NodeModelInterface;

  /** 获取边界矩形 */
  getBoundingClientRect(defaultValue?: DOMRect): DOMRect;

  /** 获取偏移位置 */
  offset(): { top: number; left: number };

  /** 获取或设置属性 */
  attr(
    keyOrAttrs?: string | Record<string, string | number | boolean>,
    val?: string | number | boolean
  ):
    | string
    | null
    | Record<string, string | number | boolean>
    | NodeModelInterface;

  /** 移除属性 */
  removeAttr(key: string): NodeModelInterface;

  /** 是否包含指定类名 */
  hasClass(className: string): boolean;

  /** 添加类名 */
  addClass(className: string): NodeModelInterface;

  /** 移除类名 */
  removeClass(className: string): NodeModelInterface;

  /** 获取或设置样式 */
  css(key: string): string;
  css(key: string, val: string | number): NodeModelInterface;
  css(styles?: Record<string, string | number>): NodeModelInterface;

  /** 获取宽度 */
  width(): number;

  /** 获取高度 */
  height(): number;

  /** 获取或设置 HTML 内容 */
  html(): string;
  html(val: string): NodeModelInterface;

  /** 获取文本内容 */
  text(): string;

  /** 显示元素 */
  show(display?: string): NodeModelInterface;

  /** 隐藏元素 */
  hide(): NodeModelInterface;

  /** 移除元素 */
  remove(): NodeModelInterface;

  /** 清空内容 */
  empty(): NodeModelInterface;

  /** 克隆节点 */
  clone(deep?: boolean): NodeModel;

  /** 在开头插入内容 */
  prepend(content: string | Node | NodeModelInterface): NodeModelInterface;

  /** 在末尾插入内容 */
  append(content: string | Node | NodeModelInterface): NodeModelInterface;

  /** 在前面插入内容 */
  before(content: string | Node | NodeModelInterface): NodeModelInterface;

  /** 在后面插入内容 */
  after(content: string | Node | NodeModelInterface): NodeModelInterface;

  /** 替换内容 */
  replaceWith(content: string | Node | NodeModelInterface): NodeModelInterface;
}

/**
 * 语言包接口
 */
export interface LanguageInterface {
  [key: string]: string | LanguageInterface;
}

/**
 * 模式规则接口
 */
export interface SchemaRule {
  /** 元素名称 */
  name: string;
  /** 元素类型 */
  type: 'block' | 'inline' | 'mark';
  /** 允许的属性 */
  attributes?: string[] | Record<string, any>;
  /** 是否为空元素 */
  isVoid?: boolean;
  /** 样式规则 */
  style?: Record<string, any>;
}
export type ParseResult = {
  html: string;
  text: string;
};
/**
 * 解析器接口
 */
export interface ParserInterface {
  /** 解析 DOM 节点 */
  parse(node: Node): ParseResult;

  /** 序列化为 HTML */
  serialize(value: any): string;
}

/**
 * 工具栏接口
 */
export interface ToolbarInterface {
  /** 设置工具栏 */
  set(config: any[]): void;

  /** 更新状态 */
  updateState(): void;

  /** 恢复默认状态 */
  restore(): void;

  /** 禁用/启用工具栏 */
  disable(disabled: boolean, exclude?: string[]): void;

  /** 显示工具栏 */
  show(): void;

  /** 隐藏工具栏 */
  hide(): void;
}

/**
 * 侧边栏接口
 */
export interface SidebarInterface {
  /** 设置侧边栏 */
  set(config: any): void;

  /** 关闭侧边栏 */
  close(): void;

  /** 恢复侧边栏 */
  restore(): void;
}

/**
 * 块组件数据
 */
export interface BlockComponentData {
  select?: () => void;

  unSelect?: () => void;

  autoSelected: boolean;

  activate?: (block: NodeModel) => void;

  unActivate?: (block: NodeModel) => void;
  /** 块组件名称 */
  name: string;
  /** 卡片组件实例 */
  component: BlockComponentData;
  /** 卡片根节点 */
  node: NodeModel;

  blockRoot: NodeModel;

  /** 块组件实例 */
  instance: CardInterface;

  value: BlockValue;

  type: CardType;

  container: NodeModel;

  state: BlockState;

  hasFocus?: boolean;

  /** 是否嵌入工具栏 */
  embedToolbar?: () => CardToolbarItemConfig[];

  singleSelectable: boolean;

  render(container: NodeModel, value: any): void;

  engine: Engine;

  destroy?: () => void;

  didUpdate?: (value: any) => void;

  copyContent?: () => void;

  didInsert?: (value: any) => void;

  expand?: () => void;

  collapse?: () => void;

  restore?: () => void;
}

export interface BlockConfig {
  name?: string;
  component: BlockComponentData;
  engine: any;
  contentView: HTMLElement | NodeModel | null;
  blockRoot?: NodeModel;
  node?: NodeModel;
  value?: string | Record<string, any>
}

/**
 * 解析器接口
 */
export interface ParserInterface {
  /** 解析 DOM 节点 */
  parse(node: Node): { html: string; text: string };

  /** 序列化为 HTML */
  serialize(value: any): string;
}
