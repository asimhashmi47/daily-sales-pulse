import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export type Db = Database.Database;

export function openDatabase(file: string): Db {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      date      TEXT    NOT NULL,
      amount    REAL    NOT NULL CHECK (amount >= 0),
      note      TEXT,
      createdAt TEXT    NOT NULL,
      updatedAt TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);

    CREATE TABLE IF NOT EXISTS settings (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      dailyTarget REAL NOT NULL CHECK (dailyTarget >= 0),
      currency    TEXT NOT NULL,
      updatedAt   TEXT NOT NULL
    );
    INSERT OR IGNORE INTO settings (id, dailyTarget, currency, updatedAt)
    VALUES (1, 1000, 'USD', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
  `);
  return db;
}
