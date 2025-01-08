// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};
use std::sync::Mutex;

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;

#[derive(Default)]
struct GoalState(Mutex<Vec<Goal>>);

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct Goal {
    id: String,
    title: String,
    completed: bool,
}

fn create_menu(goals: &[Goal]) -> SystemTrayMenu {
    let mut menu = SystemTrayMenu::new();

    // Adiciona as metas pendentes primeiro
    let pending_goals: Vec<_> = goals.iter().filter(|g| !g.completed).collect();
    if !pending_goals.is_empty() {
        menu = menu.add_item(CustomMenuItem::new("pending_label".to_string(), "📝 Pendentes").disabled());
        for goal in &pending_goals {
            menu = menu.add_item(CustomMenuItem::new(goal.id.clone(), &goal.title));
        }
    }

    // Adiciona as metas concluídas
    let completed_goals: Vec<_> = goals.iter().filter(|g| g.completed).collect();
    if !completed_goals.is_empty() {
        if !pending_goals.is_empty() {
            menu = menu.add_native_item(SystemTrayMenuItem::Separator);
        }
        menu = menu.add_item(CustomMenuItem::new("completed_label".to_string(), "✅ Concluídas").disabled());
        for goal in &completed_goals {
            menu = menu.add_item(CustomMenuItem::new(goal.id.clone(), format!("✓ {}", goal.title)));
        }
    }

    // Adiciona os botões de ação
    menu = menu
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("show".to_string(), "Gerenciar Metas"))
        .add_item(CustomMenuItem::new("quit".to_string(), "Sair"));

    menu
}

#[tauri::command]
async fn update_tray_menu(
    app: tauri::AppHandle,
    goals: Vec<Goal>,
) -> Result<(), String> {
    app.tray_handle().set_menu(create_menu(&goals)).map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    let system_tray = SystemTray::new().with_menu(create_menu(&[]));

    let mut builder = tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                if id == "quit" {
                    app.exit(0);
                } else if id == "show" {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                }
            }
            _ => {}
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                event.window().hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        });

    #[cfg(target_os = "macos")]
    {
        builder = builder.setup(|app| {
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            Ok(())
        });
    }

    builder
        .invoke_handler(tauri::generate_handler![update_tray_menu])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
