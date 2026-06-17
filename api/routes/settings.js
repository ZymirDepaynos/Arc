import express from "express";
import db from "../db.js";

const router = express.Router();

router.get("/:key", (req, res) => {
  try {
    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = ? AND user_id = ?")
      .get(req.params.key, req.user.id);
    if (!row) {
      return res.status(404).json({ error: "Setting not found" });
    }
    // Parse value if it is stored as stringified JSON
    let parsedValue;
    try {
      parsedValue = JSON.parse(row.value);
    } catch {
      parsedValue = row.value;
    }
    res.json({ value: parsedValue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:key", (req, res) => {
  try {
    const { value } = req.body;
    const stringValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);

    db.prepare(
      `
      INSERT INTO app_settings (key, value, user_id) 
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, user_id = excluded.user_id
    `,
    ).run(req.params.key, stringValue, req.user.id);

    res.json({ key: req.params.key, value: value, user_id: req.user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/export/database", (req, res) => {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    res.download(db.dbPath, `basic_ventures_backup_${timestamp}.sqlite`);
  } catch (err) {
    res.status(500).json({ error: "Failed to export database backup" });
  }
});

export default router;
