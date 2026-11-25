import Database from "better-sqlite3";
import fs from "node:fs";
fs.mkdirSync("data", { recursive: true });
const db = new Database("data/torneo.sqlite");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS players (
  telegram_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  first_name TEXT NOT NULL,
  cash INTEGER NOT NULL DEFAULT 25000,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  car_color TEXT NOT NULL DEFAULT '#d7dce2',
  engine INTEGER NOT NULL DEFAULT 1,
  suspension INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
export function getOrCreatePlayer(user) {
  const id = String(user.id);
  let p = db.prepare("SELECT * FROM players WHERE telegram_id=?").get(id);
  if (!p) {
    db.prepare("INSERT INTO players (telegram_id, username, first_name) VALUES (?, ?, ?)")
      .run(id, user.username || "", user.first_name || "Driver");
    p = db.prepare("SELECT * FROM players WHERE telegram_id=?").get(id);
  } else {
    db.prepare("UPDATE players SET username=?, first_name=? WHERE telegram_id=?")
      .run(user.username || "", user.first_name || "Driver", id);
    p = db.prepare("SELECT * FROM players WHERE telegram_id=?").get(id);
  }
  return p;
}
export function playerById(id) {
  return db.prepare("SELECT * FROM players WHERE telegram_id=?").get(String(id));
}
export function updatePlayer(id, fields) {
  const allowed = ["cash", "xp", "level", "car_color", "engine", "suspension"];
  const keys = Object.keys(fields).filter(k => allowed.includes(k));
  if (!keys.length) return playerById(id);
  const sql = keys.map(k => `${k}=@${k}`).join(", ");
  db.prepare(`UPDATE players SET ${sql} WHERE telegram_id=@id`).run({ ...fields, id: String(id) });
  return playerById(id);
}
export function leaderboard() {
  return db.prepare("SELECT username, first_name, level, xp, cash FROM players ORDER BY level DESC, xp DESC LIMIT 20").all();
}