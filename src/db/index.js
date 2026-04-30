import Database from "better-sqlite3";
import { config } from "../config.js";

const db = new Database(config.databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS monitored_urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    interval_seconds INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_checked_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS check_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (url_id) REFERENCES monitored_urls(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_check_results_url_id ON check_results(url_id);
  CREATE INDEX IF NOT EXISTS idx_check_results_checked_at ON check_results(checked_at);
`);

export { db };
