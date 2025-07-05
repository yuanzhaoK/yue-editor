import React, { useEffect } from "react";
import { Engine } from "../engine";
debugger
const CustomNoteEditor: React.FC = () => {
  useEffect(() => {
    const engine = new Engine("#editor", {
      lang: "zh-cn",
      plugins: ["bold", "italic", "image"],
    });
    engine.setValue("Hello World");
  }, []);
  return (
    <div className="p-4 h-full w-full">
      <h1 className="text-2xl font-bold mb-4">Custom Note Editor</h1>
      <div id="editor"></div>
    </div>
  );
};

export default CustomNoteEditor;
