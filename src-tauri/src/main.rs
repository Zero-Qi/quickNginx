#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent};
use std::process::Command;
use std::fs;
use std::path::Path;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
struct NginxPaths {
    bin: String,
    conf: String,
    conf_dir: String,
    log_dir: String,
    run_dir: String,
}

impl Default for NginxPaths {
    fn default() -> Self {
        NginxPaths {
            bin: String::from("/usr/local/bin/nginx"),
            conf: String::from("/usr/local/nginx/conf/nginx.conf"),
            conf_dir: String::from("/usr/local/nginx/conf"),
            log_dir: String::from("/usr/local/nginx/logs"),
            run_dir: String::from("/usr/local/nginx"),
        }
    }
}

#[derive(Debug, Serialize)]
struct LogEntry {
    content: String,
    timestamp: String,
}

#[tauri::command]
async fn check_nginx_status() -> Result<bool, String> {
    let output = Command::new("pgrep")
        .arg("nginx")
        .output()
        .map_err(|e| e.to_string())?;
    
    Ok(output.status.success())
}

#[tauri::command]
async fn execute_nginx_command(command: &str) -> Result<String, String> {
    let nginx_paths = NginxPaths::default();
    
    let cmd = match command {
        "start" => vec![nginx_paths.bin],
        "stop" => vec![nginx_paths.bin, String::from("-s"), String::from("stop")],
        "reload" => vec![nginx_paths.bin, String::from("-s"), String::from("reload")],
        _ => return Err("Invalid command".to_string()),
    };

    let output = Command::new("sudo")
        .args(&cmd)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok("Command executed successfully".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
async fn modify_nginx_config(config_to_enable: &str) -> Result<(), String> {
    let nginx_paths = NginxPaths::default();
    let config_path = Path::new(&nginx_paths.conf);
    
    let content = fs::read_to_string(config_path)
        .map_err(|e| e.to_string())?;

    let configs = [
        ("yx_main", "include ./yx_conf/yx_main.conf;"),
        ("yx_h5", "include ./yx_conf/yx_h5.conf;"),
        ("yx_tob", "include ./yx_conf/yx_tob.conf;"),
        ("yx_tob_admin", "include ./yx_conf/yx_tob_admin.conf;"),
    ];

    // Remove existing includes
    let mut new_content = content.lines()
        .filter(|line| !configs.iter().any(|(_, inc)| line.trim() == inc))
        .collect::<Vec<&str>>()
        .join("\n");

    // Add new include if specified
    if let Some((_, include)) = configs.iter().find(|(name, _)| name == &config_to_enable) {
        if let Some(pos) = new_content.find("# 这里写对应include的文件") {
            new_content.insert_str(pos + "# 这里写对应include的文件".len(), &format!("\n        {}", include));
        }
    }

    fs::write(config_path, new_content)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn read_nginx_logs(log_type: &str) -> Result<Vec<LogEntry>, String> {
    let nginx_paths = NginxPaths::default();
    let log_file = match log_type {
        "access" => format!("{}/access.log", nginx_paths.log_dir),
        "error" => format!("{}/error.log", nginx_paths.log_dir),
        _ => return Err("Invalid log type".to_string()),
    };

    let content = fs::read_to_string(&log_file)
        .map_err(|e| e.to_string())?;

    let logs: Vec<LogEntry> = content
        .lines()
        .rev() // 倒序显示日志
        .take(1000) // 限制显示最新的1000行
        .map(|line| {
            // 简单的时间戳提取，实际格式可能需要调整
            let timestamp = if let Some(time_end) = line.find(']') {
                if let Some(time_start) = line.find('[') {
                    line[time_start+1..time_end].to_string()
                } else {
                    "Unknown".to_string()
                }
            } else {
                "Unknown".to_string()
            };

            LogEntry {
                content: line.to_string(),
                timestamp,
            }
        })
        .collect();

    Ok(logs)
}

#[tauri::command]
async fn clear_nginx_log(log_type: &str) -> Result<(), String> {
    let nginx_paths = NginxPaths::default();
    let log_file = match log_type {
        "access" => format!("{}/access.log", nginx_paths.log_dir),
        "error" => format!("{}/error.log", nginx_paths.log_dir),
        _ => return Err("Invalid log type".to_string()),
    };

    fs::write(&log_file, "")
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let tray_menu = SystemTrayMenu::new()
        .add_item(quit);
    
    let system_tray = SystemTray::new()
        .with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            check_nginx_status,
            execute_nginx_command,
            modify_nginx_config,
            read_nginx_logs,
            clear_nginx_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 