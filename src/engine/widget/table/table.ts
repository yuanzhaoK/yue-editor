import { Engine } from "@/engine/core/engine";
import { BaseWidget } from "../base";
import { BlockComponentData } from "@/engine/types";

class Table extends BaseWidget implements BlockComponentData {
  active: boolean = false;

  engine: Engine;
  contentView: any;

  static widgetName = "table";

  constructor(engine: Engine, contentView: any) {
    super();
    this.engine = engine;
    this.contentView = contentView;
  }

  destroy(): void {
    this.active = false;
    this.unBindKeyEvents();
    this.engine!.toolbar.restore();
  }
  unBindKeyEvents() {
    throw new Error("Method not implemented.");
  }

  activate(): void {
    this.active = true;
  }
}
