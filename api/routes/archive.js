import express from "express";
import db from "../db.js";

const router = express.Router();

function parseCustomer(c) {
  return {
    ...c,
    receipt_numbers: JSON.parse(c.receipt_numbers || "[]"),
    payment_history: JSON.parse(c.payment_history || "[]"),
  };
}

router.get("/", (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT * FROM customers 
      WHERE user_id = ? AND archived_at IS NOT NULL 
      ORDER BY archived_at DESC
    `,
      )
      .all(req.user.id);

    res.json(rows.map(parseCustomer));
  } catch (err) {
    console.error("API Error [GET /archive]:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/restore", (req, res) => {
  try {
    db.prepare(
      `
      UPDATE customers SET archived_at = NULL 
      WHERE id = ? AND user_id = ?
    `,
    ).run(req.params.id, req.user.id);

    const data = db
      .prepare("SELECT * FROM customers WHERE id = ?")
      .get(req.params.id);
    if (!data) return res.status(404).json({ error: "Record not found" });

    res.json(parseCustomer(data));
  } catch (err) {
    console.error("API Error [POST /archive/:id/restore]:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const result = db
      .prepare(
        `
      DELETE FROM customers 
      WHERE id = ? AND user_id = ? AND archived_at IS NOT NULL
    `,
      )
      .run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ error: "Record not found or not archived" });
    }

    res.json({ message: "Permanently deleted" });
  } catch (err) {
    console.error("API Error [DELETE /archive/:id]:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
