mod offline_db;

use keyring::Entry;

const SERVICE: &str = "com.antoniositoe.wallet";
const ACCOUNT: &str = "auth-token";

fn entry() -> Result<Entry, String> {
  Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string())
}

#[tauri::command]
fn auth_token_get() -> Result<Option<String>, String> {
  match entry()?.get_password() {
    Ok(token) => Ok(Some(token)),
    Err(keyring::Error::NoEntry) => Ok(None),
    Err(e) => Err(e.to_string()),
  }
}

#[tauri::command]
fn auth_token_set(token: String) -> Result<(), String> {
  entry()?.set_password(&token).map_err(|e| e.to_string())
}

#[tauri::command]
fn auth_token_delete() -> Result<(), String> {
  match entry()?.delete_credential() {
    Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
    Err(e) => Err(e.to_string()),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .manage(offline_db::OfflineDb::default())
    .invoke_handler(tauri::generate_handler![
      auth_token_get,
      auth_token_set,
      auth_token_delete,
      offline_db::offline_db_open,
      offline_db::offline_db_execute,
      offline_db::offline_db_select,
      offline_db::offline_db_close
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
