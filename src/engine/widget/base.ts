import uniqueId from "lodash-es/uniqueId";
import { ROOT } from "../constants";
import { Engine } from "../core/engine";
import $, { NodeModel } from "../core/node";
import {
  BlockComponentData,
  CardInterface,
  CardToolbarItemConfig,
  CardType,
  Position,
} from "../types";
import { getHeight, getWidth } from "../utils/dom";

export abstract class BaseWidget implements Partial<BlockComponentData> {
  public static canSearch: boolean = false;
  public static selectStyleType: "background" | "outline" = "outline";

  private destroyed: boolean = false;

  public state = {
    readonly: false,
    selected: false,
    activated: false,
    activatedByOther: false,
    focused: false,
    collapsed: false,
  };
  public engine?: Engine;
  public contentView?: Engine;
  public resizeController: any; // Resize controller instance
  public value: Record<string, any> = {};
  public blockRoot: NodeModel | undefined = undefined;
  public container?: NodeModel;

  unSelect?: (() => void) | undefined;
  autoSelected?: boolean | undefined;
  unActivate?: ((block: NodeModel) => void) | undefined;
  name?: string | undefined;
  component?: BlockComponentData | undefined;
  node?: NodeModel | undefined;
  instance?: CardInterface | undefined;
  type?: CardType | undefined;
  hasFocus?: boolean | undefined;
  singleSelectable?: boolean | undefined;
  didUpdate?: ((value: any) => void) | undefined;
  copyContent?: (() => void) | undefined;
  didInsert?: ((value: any) => void) | undefined;
  expand?: (() => void) | undefined;
  collapse?: (() => void) | undefined;

  private events: Map<
    string,
    { element: NodeModel; type: string; handler: EventListener }
  > = new Map();

  constructor() {}
  abstract embedToolbar(contasiner?: HTMLElement): CardToolbarItemConfig[];
  abstract toolbar(): void;
  abstract maximize(): void;
  abstract restore(): void;
  abstract render(): void;
  abstract activate(): void;
  abstract unactivate(): void;

  public onBeforeRenderImage = (src: string) => {
    return this.getOptions()?.onBeforeRenderImage(src);
  };

  public getOptions() {
    return this.state.readonly
      ? this.contentView?.options
      : this.engine?.options;
  }

  select() {
    const { container } = this;
    if (container && container[0].childNodes.length > 0) {
      container.addClass(
        "background" === (this.constructor as typeof BaseWidget).selectStyleType
          ? `${ROOT}-selected-background`
          : `${ROOT}-selected-outline`
      );
    }
  }
  unselect() {
    const { container } = this;
    if (container) {
      container.removeClass(
        "background" === (this.constructor as typeof BaseWidget).selectStyleType
          ? `${ROOT}-selected-background`
          : `${ROOT}-selected-outline`
      );
    }
  }

  selectByOther(outline: string, background: string) {
    const { container } = this;
    if (container && container[0].childNodes.length > 0) {
      if (
        "background" === (this.constructor as typeof BaseWidget).selectStyleType
      ) {
        container.css("background", background);
      } else {
        container.css("outline", "2px solid " + outline);
      }
    }
  }

  unselectByOther() {
    const { container } = this;
    if (container && container[0].childNodes.length > 0) {
      container.css(
        "background" === (this.constructor as typeof BaseWidget).selectStyleType
          ? "background"
          : "outline",
        ""
      );
    }
  }

  unactivateByOther() {
    this.unselectByOther();
  }

  activateByOther(outline: string, background: string) {
    return this.selectByOther(outline, background);
  }

  getContainerWidth() {
    return getWidth(this.container![0] as HTMLElement);
  }
  getContainerHeight() {
    return getHeight(this.container![0] as HTMLElement);
  }

  destroy() {
    this.destroyed = true;
    this.removeEvent();
  }
  removeEvent() {
    this.events.forEach((event) => {
      const { element, type, handler } = event;
      element.off(type, handler);
    });
    this.events.clear();
  }
  bindEvents(element: NodeModel, type: string, handler: EventListener) {
    this.events.set(`${uniqueId()}-${type}`, { element, type, handler });
  }

  getViewEngine() {
    return this.engine || this.contentView;
  }
  getLang() {
    return this.getOptions()?.lang;
  }
  setValue(value: Record<string, any> | string, saveHistory: boolean = true) {
    const blockRoot = this.blockRoot;
    const readonly = this.state.readonly;
    if (!readonly && blockRoot) {
      this.engine?.block.setValue(blockRoot, Object.assign(this.value, value));
    }
    if (saveHistory) {
      this.engine?.history.save();
    } else {
      this.engine?.change.change();
    }
  }

  addResizeController(container: NodeModel) {
    let height: number, start: boolean, cssHeight: number;
    this.resizeController = this.createResizeController({
      container: this.container!,
      dragstart: () => {
        height = getHeight(container[0] as HTMLElement);
        start = true;
      },
      dragmove: (y) => {
        if (start) {
          container.css(
            "height",
            (cssHeight = 80 > (cssHeight = height + y) ? 80 : cssHeight) + "px"
          );
        }
      },
      dragend: () => {
        if (start) {
          this.setValue({
            height: getHeight(container[0] as HTMLElement),
          });
          start = false;
        }
      },
    });
    this.resizeController.hide();
  }

  createResizeController(options: {
    container: NodeModel;
    dragstart?: (p: Position) => void;
    dragmove?: (y: number) => void;
    dragend?: () => void;
  }) {
    const { container, dragstart, dragmove, dragend } = options;
    const resizeImg = $(
      '<div class="card-resize-button-ud" draggable="true" />'
    );
    let point: Position | undefined = undefined;
    container.append(resizeImg);
    this.bindEvent(resizeImg, "dragstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.cancelBubble = true;
      point = {
        x: e.clientX,
        y: e.clientY,
      };
      dragstart && dragstart(point);
    });

    this.bindEvent($(document), "mousemove", (e) => {
      if (point) {
        dragmove && dragmove(e.clientY - point.y);
      }
    });

    this.bindEvent($(document), "mouseup", () => {
      point = undefined;
      dragend && dragend();
    });

    resizeImg.on("click", (event) => {
      event.stopPropagation();
    });
    return resizeImg;
  }
  bindEvent(element: NodeModel, type: string, handler: (e: any) => void) {
    element.on(type, handler);
    this.events.set(`${uniqueId()}-${type}`, {
      element,
      type,
      handler,
    });
  }

  remove() {
    if (!this.state.readonly) {
      this.engine?.change.removeBlock(this.blockRoot!);
    }
  }
}
