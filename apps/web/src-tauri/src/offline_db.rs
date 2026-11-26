use serde_json::{Map, Value};
use sqlx::{
  sqlite::{SqliteArguments, SqliteConnectOptions, SqliteRow},
  Column, ConnectOptions, Connection, Row, Sqlite, SqliteConnection, TypeInfo, ValueRef,
};
use std::collections::HashMap;
use tauri::{AppHandle, Manager, Runtime, State};
use tokio::sync::Mutex;

#[derive(Default)]
pub struct OfflineDb(Mutex<HashMap<String, SqliteConnection>>);

fn text(error: impl ToString) -> String {
  error.to_string()
}

fn valid_name(name: &str) -> bool {
  !name.is_empty()
    && name
      .chars()
      .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
    && !name.contains("..")
}

fn bind(sql: &str, values: Vec<Value>) -> sqlx::query::Query<'_, Sqlite, SqliteArguments<'_>> {
  values.into_iter().fold(sqlx::query(sql), |query, value| match value {
    Value::Null => query.bind(None::<String>),
    Value::Bool(flag) => query.bind(flag),
    Value::Number(number) => match number.as_i64() {
      Some(integer) => query.bind(integer),
      None => query.bind(number.as_f64()),
    },
    Value::String(string) => query.bind(string),
    other => query.bind(other.to_string()),
  })
}

fn to_json(row: &SqliteRow) -> Value {
  let mut object = Map::new();
  for (index, column) in row.columns().iter().enumerate() {
    let kind = match row.try_get_raw(index) {
      Ok(raw) if !raw.is_null() => raw.type_info().name().to_string(),
      _ => String::new(),
    };
    let value = match kind.as_str() {
      "" => Value::Null,
      "INTEGER" => row.try_get::<i64, _>(index).map(Value::from).unwrap_or(Value::Null),
      "REAL" => row.try_get::<f64, _>(index).map(Value::from).unwrap_or(Value::Null),
      "BLOB" => row.try_get::<Vec<u8>, _>(index).map(Value::from).unwrap_or(Value::Null),
      _ => row.try_get::<String, _>(index).map(Value::from).unwrap_or(Value::Null),
    };
    object.insert(column.name().to_string(), value);
  }
  Value::Object(object)
}

#[tauri::command]
pub async fn offline_db_open<R: Runtime>(
  app: AppHandle<R>,
  state: State<'_, OfflineDb>,
  name: String,
) -> Result<(), String> {
  if !valid_name(&name) {
    return Err(format!("invalid database name: {name}"));
  }
  let mut connections = state.0.lock().await;
  if connections.contains_key(&name) {
    return Ok(());
  }
  let dir = app.path().app_data_dir().map_err(text)?;
  std::fs::create_dir_all(&dir).map_err(text)?;
  let connection = SqliteConnectOptions::new()
    .filename(dir.join(&name))
    .create_if_missing(true)
    .connect()
    .await
    .map_err(text)?;
  connections.insert(name, connection);
  Ok(())
}

#[tauri::command]
pub async fn offline_db_execute(
  state: State<'_, OfflineDb>,
  name: String,
  query: String,
  values: Vec<Value>,
) -> Result<(u64, i64), String> {
  let mut connections = state.0.lock().await;
  let connection = connections.get_mut(&name).ok_or("database not open")?;
  let result = bind(&query, values).execute(connection).await.map_err(text)?;
  Ok((result.rows_affected(), result.last_insert_rowid()))
}

#[tauri::command]
pub async fn offline_db_select(
  state: State<'_, OfflineDb>,
  name: String,
  query: String,
  values: Vec<Value>,
) -> Result<Vec<Value>, String> {
  let mut connections = state.0.lock().await;
  let connection = connections.get_mut(&name).ok_or("database not open")?;
  let rows = bind(&query, values).fetch_all(connection).await.map_err(text)?;
  Ok(rows.iter().map(to_json).collect())
}

#[tauri::command]
pub async fn offline_db_close(state: State<'_, OfflineDb>, name: String) -> Result<(), String> {
  let connection = state.0.lock().await.remove(&name);
  if let Some(connection) = connection {
    connection.close().await.map_err(text)?;
  }
  Ok(())
}

#[tauri::command]
pub async fn offline_db_delete<R: Runtime>(
  app: AppHandle<R>,
  state: State<'_, OfflineDb>,
  name: String,
) -> Result<(), String> {
  if !valid_name(&name) {
    return Err(format!("invalid database name: {name}"));
  }
  let connection = state.0.lock().await.remove(&name);
  if let Some(connection) = connection {
    connection.close().await.map_err(text)?;
  }
  let dir = app.path().app_data_dir().map_err(text)?;
  for suffix in ["", "-wal", "-shm", "-journal"] {
    match std::fs::remove_file(dir.join(format!("{name}{suffix}"))) {
      Err(error) if error.kind() != std::io::ErrorKind::NotFound => return Err(text(error)),
      _ => {}
    }
  }
  Ok(())
}

