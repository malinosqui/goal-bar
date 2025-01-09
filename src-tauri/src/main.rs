// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
    SystemTraySubmenu,
};
use std::sync::Mutex;

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;

#[derive(Default)]
struct GoalState(Mutex<Vec<Goal>>);

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct Goal {
    id: String,
    title: String,
    completed: bool,
    impediments: Option<String>,
}

fn create_menu(goals: &[Goal]) -> SystemTrayMenu {
    let mut menu = SystemTrayMenu::new();

    // Adiciona as metas pendentes primeiro
    let pending_goals: Vec<_> = goals.iter().filter(|g| !g.completed).collect();
    if !pending_goals.is_empty() {
        menu = menu.add_item(CustomMenuItem::new("pending_label".to_string(), "📝 Pendentes").disabled());
        for goal in &pending_goals {
            // Submenu para cada meta pendente
            let goal_id = goal.id.clone();
            let mut submenu = SystemTrayMenu::new()
                .add_item(CustomMenuItem::new(
                    format!("complete_{}", goal_id),
                    "✓ Marcar como concluída"
                ));

            submenu = if goal.impediments.is_some() {
                submenu.add_item(CustomMenuItem::new(
                    format!("remove_impediment_{}", goal_id),
                    "🔓 Remover impedimento"
                ))
            } else {
                submenu.add_item(CustomMenuItem::new(
                    format!("add_impediment_{}", goal_id),
                    "🚫 Adicionar impedimento"
                ))
            };

            let title = if let Some(imp) = &goal.impediments {
                format!("🚫 {} (Bloqueado: {})", goal.title, imp)
            } else {
                goal.title.clone()
            };

            menu = menu.add_submenu(SystemTraySubmenu::new(title, submenu));
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
            let goal_id = goal.id.clone();
            let submenu = SystemTrayMenu::new()
                .add_item(CustomMenuItem::new(
                    format!("uncomplete_{}", goal_id),
                    "↩️ Desfazer conclusão"
                ));

            menu = menu.add_submenu(SystemTraySubmenu::new(
                format!("✓ {}", goal.title),
                submenu
            ));
        }
    }

    // Adiciona os botões de ação
    menu = menu
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("add_goal".to_string(), "➕ Nova meta"))
        .add_item(CustomMenuItem::new("show".to_string(), "🔧 Gerenciar Metas"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit".to_string(), "Sair"));

    menu
}

#[tauri::command]
async fn update_tray_menu(
    app: tauri::AppHandle,
    goals: Vec<Goal>,
) -> Result<(), String> {
    println!("Updating menu with goals: {:?}", goals);
    app.tray_handle().set_menu(create_menu(&goals)).map_err(|e| e.to_string())?;
    println!("Menu updated successfully");
    Ok(())
}

#[tauri::command]
async fn toggle_goal(app: tauri::AppHandle, id: String, goals: Vec<Goal>) -> Result<(), String> {
    println!("Toggling goal: {}", id);
    app.tray_handle().set_menu(create_menu(&goals)).map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    let system_tray = SystemTray::new().with_menu(create_menu(&[]));

    let mut builder = tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                println!("Menu item clicked: {}", id);
                
                if id == "quit" {
                    app.exit(0);
                } else if id == "show" || id == "add_goal" {
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                } else if id.starts_with("complete_") {
                    let goal_id = id.replace("complete_", "");
                    let window = app.get_window("main").unwrap();
                    window.emit("toggle_goal", goal_id).unwrap();
                } else if id.starts_with("uncomplete_") {
                    let goal_id = id.replace("uncomplete_", "");
                    let window = app.get_window("main").unwrap();
                    window.emit("toggle_goal", goal_id).unwrap();
                } else if id.starts_with("remove_impediment_") {
                    let goal_id = id.replace("remove_impediment_", "");
                    let window = app.get_window("main").unwrap();
                    window.emit("remove_impediment", goal_id).unwrap();
                } else if id.starts_with("add_impediment_") {
                    let goal_id = id.replace("add_impediment_", "");
                    let window = app.get_window("main").unwrap();
                    window.show().unwrap();
                    window.emit("add_impediment", goal_id).unwrap();
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
        .invoke_handler(tauri::generate_handler![update_tray_menu, toggle_goal])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
