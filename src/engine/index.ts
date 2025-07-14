import { Engine } from "./core/engine";
import { EngineOptions } from "./types";
import { Paste } from "./plugins";
import { BoldPlugin, ItalicPlugin, LinkPlugin } from "../engine/plugins";
// Export all public API
export { Engine } from "./core/engine";
export { NodeModel } from "./core/node";
export { BasePlugin } from "./core/base-plugin";
export { PluginManager } from "./core/plugin-manager";
export * from "./types";

// 常量定义
export * from "./constants";

export default function initEngine(
  selector: string,
  options: EngineOptions
): Engine {
  let defaultPlugins = ["bold", "italic", "link", "paste"];
  const { plugins, ...rest } = options;
  if (plugins && plugins.length > 0) {
    defaultPlugins = defaultPlugins.concat(plugins);
  }
  const engineInstance = Engine.create(selector, {
    plugins: defaultPlugins,
    ...rest,
  });
  engineInstance.plugin.register(Paste, {});
  engineInstance.plugin.register(BoldPlugin, {});
  engineInstance.plugin.register(ItalicPlugin, {});
  engineInstance.plugin.register(LinkPlugin, {});
  return engineInstance;
}
