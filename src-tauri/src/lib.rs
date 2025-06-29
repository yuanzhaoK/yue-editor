use tauri::{
    tray::{TrayIconBuilder, TrayIconEvent},
    menu::{MenuBuilder, MenuItemBuilder},
    Manager,
};

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.unminimize();
    }
}

#[tauri::command]
fn hide_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
async fn export_note_to_markdown(title: String, content: String, file_path: String) -> Result<(), String> {
    use std::fs;
    
    let markdown_content = format!(
        "# {}\n\n{}\n\n---\n\n*导出时间: {}*",
        title,
        content,
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
    );
    
    fs::write(&file_path, markdown_content)
        .map_err(|e| format!("导出失败: {}", e))?;
        
    Ok(())
}

#[tauri::command]
async fn export_all_notes_to_markdown(notes_json: String, file_path: String) -> Result<(), String> {
    use std::fs;
    use serde_json::Value;
    
    let notes: Vec<Value> = serde_json::from_str(&notes_json)
        .map_err(|e| format!("解析笔记数据失败: {}", e))?;
    
    let mut markdown_content = String::new();
    markdown_content.push_str("# 笔记导出\n\n");
    markdown_content.push_str(&format!("导出时间: {}\n\n", chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")));
    markdown_content.push_str("---\n\n");
    
    for note in notes {
        let title = note["title"].as_str().unwrap_or("无标题");
        let content = note["content"].as_str().unwrap_or("");
        let created_at = note["created_at"].as_str().unwrap_or("");
        
        markdown_content.push_str(&format!("## {}\n\n", title));
        markdown_content.push_str(&format!("*创建时间: {}*\n\n", created_at));
        markdown_content.push_str(&format!("{}\n\n", content));
        markdown_content.push_str("---\n\n");
    }
    
    fs::write(&file_path, markdown_content)
        .map_err(|e| format!("导出失败: {}", e))?;
        
    Ok(())
}

#[tauri::command]
async fn backup_database(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
    use std::fs;
    
    // 获取应用数据目录中的数据库文件路径
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
    let db_path = app_data_dir.join("notes.db");
    
    if !db_path.exists() {
        return Err("数据库文件不存在".to_string());
    }
    
    fs::copy(&db_path, &file_path)
        .map_err(|e| format!("备份数据库失败: {}", e))?;
        
    Ok(())
}

#[tauri::command]
async fn restore_database(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
    use std::fs;
    
    if !std::path::Path::new(&file_path).exists() {
        return Err("备份文件不存在".to_string());
    }
    
    // 获取应用数据目录中的数据库文件路径
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {}", e))?;
    let db_path = app_data_dir.join("notes.db");
    
    // 备份当前数据库（如果存在）
    if db_path.exists() {
        let backup_path = app_data_dir.join(format!(
            "notes_backup_{}.db", 
            chrono::Utc::now().format("%Y%m%d_%H%M%S")
        ));
        fs::copy(&db_path, &backup_path)
            .map_err(|e| format!("备份当前数据库失败: {}", e))?;
    }
    
    // 恢复数据库
    fs::copy(&file_path, &db_path)
        .map_err(|e| format!("恢复数据库失败: {}", e))?;
        
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // 创建托盘菜单
            let show_item = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
            let hide_item = MenuItemBuilder::with_id("hide", "隐藏窗口").build(app)?;
            let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "退出").build(app)?;
            
            let menu = MenuBuilder::new(app)
                .items(&[&show_item, &hide_item, &separator, &quit_item])
                .build()?;

            // 创建系统托盘
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("本地笔记")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.unminimize();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(app) = tray.app_handle().get_webview_window("main") {
                            if app.is_visible().unwrap_or(false) {
                                let _ = app.hide();
                            } else {
                                let _ = app.show();
                                let _ = app.set_focus();
                                let _ = app.unminimize();
                            }
                        }
                    }
                })
                .build(app)?;

            // 注册全局快捷键
            // 注意：Tauri 2.0的全局快捷键API有变化，暂时注释掉
            // use tauri_plugin_global_shortcut::GlobalShortcutExt;
            
            // 显示/隐藏应用快捷键 (Ctrl+Shift+N)
            // let app_handle_1 = app.handle().clone();
            // let _ = app.global_shortcut().register("CommandOrControl+Shift+N", move || {
            //     if let Some(window) = app_handle_1.get_webview_window("main") {
            //         if window.is_visible().unwrap_or(false) {
            //             let _ = window.hide();
            //         } else {
            //             let _ = window.show();
            //             let _ = window.set_focus();
            //             let _ = window.unminimize();
            //         }
            //     }
            // });

            // 新建笔记快捷键 (Ctrl+N)
            // let app_handle_2 = app.handle().clone();
            // let _ = app.global_shortcut().register("CommandOrControl+N", move || {
            //     if let Some(window) = app_handle_2.get_webview_window("main") {
            //         let _ = window.show();
            //         let _ = window.set_focus();
            //         let _ = window.unminimize();
            //         
            //         // 发送新建笔记事件到前端
            //         let _ = window.emit("new-note-shortcut", ());
            //     }
            // });

            // 快速搜索快捷键 (Ctrl+Shift+F)
            // let app_handle_3 = app.handle().clone();
            // let _ = app.global_shortcut().register("CommandOrControl+Shift+F", move || {
            //     if let Some(window) = app_handle_3.get_webview_window("main") {
            //         let _ = window.show();
            //         let _ = window.set_focus();
            //         let _ = window.unminimize();
            //         
            //         // 发送搜索事件到前端
            //         let _ = window.emit("search-shortcut", ());
            //     }
            // });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_main_window, 
            hide_main_window, 
            export_note_to_markdown, 
            export_all_notes_to_markdown,
            backup_database,
            restore_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
