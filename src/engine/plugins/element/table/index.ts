import { BasePlugin, PluginOptions } from "@/engine";
import {
  normalizeTable,
  getTableModel,
  unWrapperTable,
} from "@/engine/widgets/table";
import schema from "@/engine/widget/table/schema";
export class TablePlugin extends BasePlugin {
  // 必需：插件名称
  static pluginName = "table";

  // 可选：默认配置
  static defaultOptions: PluginOptions = {
    version: "1.0.0",
    description: "Table 插件，提供表格功能",
    author: "",
    dependencies: [], // 依赖的其他插件
    hotkeys: {
      execute: [],
    },
    config: {},
    autoEnable: true,
    priority: 50,
  };

  // 必需：执行方法
  execute(value: { rows: number; cols: number }): any {
    const blockRoot = this.engine.change.insertBlock(
      "table",
      value || {
        rows: 8,
        cols: 8,
      }
    );
    const component = this.engine.block.getComponent(blockRoot)!;
    this.engine.change.activateBlock(blockRoot[0], '');
    component.selection.selectFirstCell();
    return component;
  }

  initialize(): void {
    this.engine.schema.addRules(schema);
  }

  // 可选：销毁
  destroy(): void {
    super.destroy(); // 调用父类方法
    // 清理逻辑
  }
}
