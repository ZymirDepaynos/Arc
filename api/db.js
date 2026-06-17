import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const log = console;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath =
  process.env.DB_PATH || path.join(__dirname, "..", "data", "local_database.sqlite");

const SQL = await initSqlJs();

let db;
if (fs.existsSync(dbPath)) {
  const fileBuffer = fs.readFileSync(dbPath);
  const uint8Array = new Uint8Array(fileBuffer);
  db = new SQL.Database(uint8Array);
  log.info(`[Database] Loaded existing database from disk.`);
} else {
  db = new SQL.Database();
  log.info(`[Database] Created fresh auto-provisioned database.`);
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

// Auto-provision schema
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    advance_payment REAL NOT NULL DEFAULT 0,
    receipt_numbers TEXT DEFAULT '[]',
    date_borrowed TEXT NOT NULL,
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    payment_history TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    original_debt REAL NOT NULL DEFAULT 0,
    user_id TEXT,
    archived_at TEXT
  );
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    user_id TEXT
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

let _inTransaction = false;

// Writes the in-memory db to disk. Only runs outside of a transaction.
function persist() {
  if (_inTransaction) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// Immediately save if it was a new file to write the schema
if (!fs.existsSync(dbPath)) {
  persist();
}

// Get last modified row count using sql.js's built-in method
function getChanges() {
  try {
    const res = db.exec("SELECT changes()");
    return res[0]?.values[0][0] ?? 0;
  } catch {
    return 0;
  }
}

/**
 * A wrapper around sql.js that mimics the better-sqlite3 API
 * so that all route files can use db.prepare().get/all/run() without changes.
 */
const wrapper = {
  prepare(sql) {
    return {
      // Returns all matching rows as an array of plain objects
      all(...params) {
        const flatParams = params.flat();
        const stmt = db.prepare(sql);
        try {
          if (flatParams.length > 0) stmt.bind(flatParams);
          const rows = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          return rows;
        } finally {
          stmt.free();
        }
      },

      // Returns the first matching row as a plain object, or undefined
      get(...params) {
        const flatParams = params.flat();
        const stmt = db.prepare(sql);
        try {
          if (flatParams.length > 0) stmt.bind(flatParams);
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      // Executes a write query (INSERT, UPDATE, DELETE) and persists to disk
      run(...params) {
        const flatParams = params.flat();
        db.run(sql, flatParams);
        const changes = getChanges();
        persist();
        return { changes };
      },
    };
  },

  // Executes raw SQL string(s) — used for schema creation
  exec(sql) {
    db.exec(sql);
    persist();
  },

  // Wraps a function in a BEGIN/COMMIT transaction block
  // The returned function must be called: db.transaction(fn)()
  transaction(fn) {
    return function (...args) {
      _inTransaction = true;
      db.run("BEGIN TRANSACTION");
      try {
        fn(...args);
        db.run("COMMIT");
      } catch (err) {
        try {
          db.run("ROLLBACK");
        } catch {
          /* ignore rollback errors */
        }
        throw err;
      } finally {
        _inTransaction = false;
        persist();
      }
    };
  },
  dbPath
};

export default wrapper;
