const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'css_art.db');
const dataDir = path.join(__dirname, 'data');

let db = null;

const initDB = () => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('数据库连接失败:', err.message);
        reject(err);
        return;
      }
      console.log('已连接到SQLite数据库');
    });

    const createArtworksTable = `
      CREATE TABLE IF NOT EXISTS artworks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        image_url TEXT NOT NULL,
        css_code TEXT NOT NULL,
        title TEXT DEFAULT 'CSS Artwork',
        likes INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        is_public INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME
      )
    `;

    const createLikesTable = `
      CREATE TABLE IF NOT EXISTS artwork_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artwork_id INTEGER NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (artwork_id) REFERENCES artworks(id),
        UNIQUE(artwork_id, ip_address, user_agent)
      )
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_artworks_uuid ON artworks(uuid);
      CREATE INDEX IF NOT EXISTS idx_artworks_is_public ON artworks(is_public);
      CREATE INDEX IF NOT EXISTS idx_artworks_published_at ON artworks(published_at);
      CREATE INDEX IF NOT EXISTS idx_artworks_likes ON artworks(likes);
      CREATE INDEX IF NOT EXISTS idx_likes_artwork ON artwork_likes(artwork_id);
    `;

    db.serialize(() => {
      db.run(createArtworksTable);
      db.run(createLikesTable);
      db.exec(createIndexes, (err) => {
        if (err) {
          console.error('创建索引失败:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};

const getDB = () => {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  return db;
};

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDB().run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDB().get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    getDB().all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

module.exports = {
  initDB,
  getDB,
  runQuery,
  getQuery,
  allQuery
};
