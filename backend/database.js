const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'purecssart.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS artworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_url TEXT NOT NULL,
    css_code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    likes INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT 0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_name TEXT UNIQUE NOT NULL,
    key_value TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id INTEGER NOT NULL,
    css_code TEXT NOT NULL,
    snapshot_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_snapshots_artwork ON snapshots(artwork_id)
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS fusions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork1_id INTEGER NOT NULL,
    artwork2_id INTEGER NOT NULL,
    fusion_type TEXT NOT NULL,
    result_css_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (artwork1_id) REFERENCES artworks(id),
    FOREIGN KEY (artwork2_id) REFERENCES artworks(id)
  )
`);

module.exports = db;
