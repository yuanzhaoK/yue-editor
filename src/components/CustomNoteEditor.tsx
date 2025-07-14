import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import CreateEditor, { Engine } from "../engine";
import { BoldPlugin, ItalicPlugin, LinkPlugin } from "../engine/plugins";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useNotesStore } from "../store/useNotesStore";
import { useAppStore } from "../store/useAppStore";

export interface CustomNoteEditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  getEngine: () => Engine | null;
}

interface CustomNoteEditorProps {
  initialContent?: string;
  onChange?: () => void;
}

const CustomNoteEditor = forwardRef<CustomNoteEditorRef, CustomNoteEditorProps>(
  (props, ref) => {
    const { initialContent = "", onChange } = props;
    const engineRef = useRef<Engine | null>(null);
    const isInitializedRef = useRef(false);
    const isSettingContentRef = useRef(false);

    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkText, setLinkText] = useState("");

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
      getContent: () => {
        return engineRef.current?.change.getValue() || "";
      },
      setContent: (content: string) => {
        if (engineRef.current) {
          // 设置标志以避免触发 onChange
          isSettingContentRef.current = true;
          engineRef.current.setValue(content);
          // 立即重置标志，因为 setValue 是同步的
          isSettingContentRef.current = false;
        }
      },
      getEngine: () => engineRef.current,
    }));

    // 初始化编辑器
    useEffect(() => {
      // 创建引擎实例
      const engine = CreateEditor("#custom-editor", {
        lang: "zh-cn",
      });

      // 保存引擎引用
      engineRef.current = engine;

      // 设置初始内容
      isSettingContentRef.current = true;
      engine.setValue(initialContent);
      isSettingContentRef.current = false;

      // 监听内容变化
      let isFirstChange = true;
      engine.on(
        "change",
        () => {
          // 跳过第一次 change 事件（由 setValue 触发）
          if (isFirstChange) {
            isFirstChange = false;
            return;
          }

          // 如果是通过 setContent 设置的内容，不触发 onChange
          if (!isSettingContentRef.current) {
            onChange?.();
          }
        },
        false
      );

      // 监听链接对话框事件
      engine.on(
        "plugin:link:dialog:link",
        (data: any) => {
          setLinkUrl(data.value?.url || "");
          const selection = window.getSelection();
          const selectedText =
            selection && selection.rangeCount > 0 ? selection.toString() : "";
          setLinkText(data.value?.text || selectedText);
          setLinkDialogOpen(true);

          // 保存回调函数
          (window as any).__linkDialogCallback = data;
        },
        false
      );

      // 触发 ready 事件以初始化插件
      setTimeout(() => {
        engine.event.trigger("ready");
      }, 0);

      isInitializedRef.current = true;

      // 清理函数
      return () => {
        if (engineRef.current) {
          engineRef.current.destroy();
          delete (window as any).__linkDialogCallback;
        }
      };
    }, []); // 移除所有依赖，避免重新创建引擎

    // 当内容改变时更新（只在笔记切换时更新）
    useEffect(() => {
      if (
        isInitializedRef.current &&
        engineRef.current &&
        initialContent !== undefined
      ) {
        const currentContent = engineRef.current.change.getValue();
        // 只有当内容真正不同时才更新
        if (currentContent !== initialContent) {
          isSettingContentRef.current = true;
          engineRef.current.setValue(initialContent);
          isSettingContentRef.current = false;
        }
      }
    }, [initialContent]);

    // 处理链接对话框确认
    const handleLinkConfirm = () => {
      const callback = (window as any).__linkDialogCallback;
      if (callback && callback.onConfirm) {
        callback.onConfirm({
          url: linkUrl,
          text: linkText || linkUrl,
        });
      }
      setLinkDialogOpen(false);
      setLinkUrl("");
      setLinkText("");
    };

    // 处理链接对话框取消
    const handleLinkCancel = () => {
      setLinkDialogOpen(false);
      setLinkUrl("");
      setLinkText("");
    };

    // 移除链接
    const handleRemoveLink = () => {
      const callback = (window as any).__linkDialogCallback;
      if (callback && callback.onRemove) {
        callback.onRemove();
      }
      setLinkDialogOpen(false);
      setLinkUrl("");
      setLinkText("");
    };

    return (
      <>
        {/* 编辑区域 */}
        <div className="h-full p-4">
          <div
            id="custom-editor"
            className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px]"
            style={{
              minHeight: "500px",
              padding: "1rem",
              backgroundColor: "#fff",
              borderRadius: "0.5rem",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            }}
          />
        </div>

        {/* 链接对话框 */}
        {linkDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
              <h3 className="text-lg font-semibold mb-4">插入/编辑链接</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    链接文本
                  </label>
                  <Input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="显示的文本"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    链接地址
                  </label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleLinkConfirm();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveLink}
                  className="text-red-600 hover:text-red-700"
                >
                  移除链接
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLinkCancel}
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleLinkConfirm}
                    disabled={!linkUrl}
                  >
                    确定
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

CustomNoteEditor.displayName = "CustomNoteEditor";

export default CustomNoteEditor;
