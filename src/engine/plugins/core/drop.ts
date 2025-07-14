import { BasePlugin } from "@/engine/core/base-plugin";
import { RangeInterface } from "@/engine/types";
// https://www.kryogenix.org/code/browser/custom-drag-image.html
export class Drop extends BasePlugin {
  static pluginName = "drop";

  initialize() {
    const insertBlockAble = (dropRange: Range) => {
      // 找不到目标位置
      // TODO: 临时解决，如果 drop Range 在卡片里则不触发
      return (
        !dropRange ||
        this.engine.block.closest(dropRange.commonAncestorContainer)
      );
    };
    this.engine.domEvent.onDrop((data) => {
      const { event, dropRange, blockRoot, files } = data;
      // Check if the drop range is valid
      if (!insertBlockAble(dropRange!)) {
        return;
      }

      const component = this.engine.block.getComponent(blockRoot)!;
      this.engine.history.save();
      this.engine.history.stop();
      this.engine.change.removeBlock(blockRoot);
      this.engine.change.select(dropRange as RangeInterface);
      this.engine.change.insertBlock(component.name, component.value);
      this.engine.history.save();

      if (files.length > 0) {
        event.preventDefault();
        if (insertBlockAble(dropRange!)) {
          return;
        }
        this.engine.change.select(dropRange as RangeInterface);
        // Trigger the drop files event 文件上传
        this.engine.event.trigger("drop:files", files);
      }
    });
  }

  queryEnabled() {
    return true;
  }
  queryState() {
    return true;
  }

  execute(...args: any[]) {
    console.log(args);
    // Implement the drop functionality here
  }
}
