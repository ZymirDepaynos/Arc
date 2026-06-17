import express from "express";
import crypto from "crypto";
import db from "../db.js";

const router = express.Router();

const processDate = (inputDate) => {
  if (!inputDate) return new Date().toISOString();
  const todayStr = new Date()
    .toLocaleString("en-CA", { timeZone: "Asia/Manila" })
    .split(",")[0];
  if (inputDate === todayStr) return new Date().toISOString();
  return inputDate;
};

const computeStatus = (balance, advance) =>
  balance <= 0 ? "paid" : advance > 0 ? "partial" : "active";

function parseCustomer(c) {
  if (!c) return c;
  return {
    ...c,
    receipt_numbers: JSON.parse(c.receipt_numbers || "[]"),
    payment_history: JSON.parse(c.payment_history || "[]"),
  };
}

router.post("/import-all", (req, res) => {
  try {
    const customers = req.body;
    if (!Array.isArray(customers)) {
      return res
        .status(400)
        .json({ error: "Data must be an array of customers" });
    }

    const insertCustomer = db.prepare(`
      INSERT INTO customers (
        id, name, original_debt, balance, advance_payment, payment_history, 
        date_borrowed, notes, receipt_numbers, status, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const results = [];

    db.transaction(() => {
      for (const c of customers) {
        const rawBalance = parseFloat(c.balance) || 0;
        const rawAdvance = parseFloat(c.advance_payment) || 0;
        const storedBalance = Math.max(0, rawBalance - rawAdvance);
        const history = [];
        if (rawAdvance > 0) {
          history.push({
            date:
              c.advance_payment_date ||
              c.date_borrowed ||
              new Date().toISOString().split("T")[0],
            amount: rawAdvance,
            balance_after: storedBalance,
            note: "Advance Payment",
            created_at: new Date().toISOString(),
          });
        }

        const newCustomer = {
          id: crypto.randomUUID(),
          name: c.name,
          original_debt: rawBalance,
          balance: storedBalance,
          advance_payment: rawAdvance,
          payment_history: JSON.stringify(history),
          date_borrowed:
            c.date_borrowed || new Date().toISOString().split("T")[0],
          notes: c.notes || "",
          receipt_numbers: JSON.stringify(c.receipt_numbers || []),
          status: computeStatus(storedBalance, rawAdvance),
          user_id: req.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        insertCustomer.run(
          newCustomer.id,
          newCustomer.name,
          newCustomer.original_debt,
          newCustomer.balance,
          newCustomer.advance_payment,
          newCustomer.payment_history,
          newCustomer.date_borrowed,
          newCustomer.notes,
          newCustomer.receipt_numbers,
          newCustomer.status,
          newCustomer.user_id,
          newCustomer.created_at,
          newCustomer.updated_at,
        );
        results.push(parseCustomer(newCustomer));
      }
    })();

    res.status(201).json(results);
  } catch (err) {
    console.error("API Error [POST /bulk]:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", (req, res) => {
  try {
    const { search } = req.query;
    let rows;

    if (search) {
      rows = db
        .prepare(
          `
        SELECT * FROM customers 
        WHERE user_id = ? AND archived_at IS NULL AND name LIKE ?
        ORDER BY created_at DESC
      `,
        )
        .all(req.user.id, `%${search}%`);
    } else {
      rows = db
        .prepare(
          `
        SELECT * FROM customers 
        WHERE user_id = ? AND archived_at IS NULL
        ORDER BY created_at DESC
      `,
        )
        .all(req.user.id);
    }

    res.json(rows.map(parseCustomer));
  } catch (err) {
    console.error("API Error [GET /]:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", (req, res) => {
  try {
    const data = db
      .prepare("SELECT * FROM customers WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!data) return res.status(404).json({ error: "Record not found" });
    res.json(parseCustomer(data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const {
      name,
      balance,
      advance_payment,
      receipt_numbers,
      date_borrowed,
      notes,
      original_debt: requestedOriginalDebt,
    } = req.body;

    const rawBalance = parseFloat(balance) || 0;
    const rawAdvance = parseFloat(advance_payment) || 0;
    const originalDebt = parseFloat(requestedOriginalDebt) || rawBalance;

    if (rawAdvance > originalDebt) {
      return res.status(400).json({
        error: "Advance payment cannot be greater than the initial balance",
      });
    }

    const storedBalance = Math.max(0, originalDebt - rawAdvance);
    const history = [];
    if (rawAdvance > 0) {
      history.push({
        date: processDate(date_borrowed),
        amount: rawAdvance,
        balance_after: storedBalance,
        note: "Advance Payment",
        created_at: new Date().toISOString(),
      });
    }

    const newCustomer = {
      id: crypto.randomUUID(),
      name,
      original_debt: originalDebt,
      balance: storedBalance,
      advance_payment: rawAdvance,
      payment_history: JSON.stringify(history),
      receipt_numbers: JSON.stringify(receipt_numbers || []),
      date_borrowed,
      notes: notes || "",
      status: computeStatus(storedBalance, rawAdvance),
      user_id: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.prepare(
      `
      INSERT INTO customers (
        id, name, original_debt, balance, advance_payment, payment_history, 
        receipt_numbers, date_borrowed, notes, status, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      newCustomer.id,
      newCustomer.name,
      newCustomer.original_debt,
      newCustomer.balance,
      newCustomer.advance_payment,
      newCustomer.payment_history,
      newCustomer.receipt_numbers,
      newCustomer.date_borrowed,
      newCustomer.notes,
      newCustomer.status,
      newCustomer.user_id,
      newCustomer.created_at,
      newCustomer.updated_at,
    );

    res.status(201).json(parseCustomer(newCustomer));
  } catch (err) {
    console.error("[CREATE ERROR]", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", (req, res) => {
  try {
    const {
      name,
      balance,
      advance_payment,
      receipt_numbers,
      date_borrowed,
      notes,
      original_debt: requestedOriginalDebt,
      payment_history,
    } = req.body;

    const current = db
      .prepare("SELECT * FROM customers WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!current) return res.status(404).json({ error: "Record not found" });

    const newOriginalDebt =
      parseFloat(requestedOriginalDebt || balance) ||
      parseFloat(current.original_debt);
    let newAdvance = parseFloat(current.advance_payment) || 0;
    let newBalance = parseFloat(current.balance) || 0;

    if (
      newOriginalDebt !== parseFloat(current.original_debt) &&
      (parseFloat(current.advance_payment) || 0) === 0
    ) {
      newBalance = newOriginalDebt;
      newAdvance = 0;
    }

    const historyStr = payment_history
      ? JSON.stringify(payment_history)
      : current.payment_history;
    const newStatus = computeStatus(newBalance, newAdvance);
    const updated_at = new Date().toISOString();

    db.prepare(
      `
      UPDATE customers SET 
        name = ?, original_debt = ?, balance = ?, advance_payment = ?, 
        receipt_numbers = ?, date_borrowed = ?, notes = ?, status = ?, 
        payment_history = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `,
    ).run(
      name,
      newOriginalDebt,
      newBalance,
      newAdvance,
      JSON.stringify(receipt_numbers || []),
      date_borrowed,
      notes || "",
      newStatus,
      historyStr,
      updated_at,
      req.params.id,
      req.user.id,
    );

    const updated = db
      .prepare("SELECT * FROM customers WHERE id = ?")
      .get(req.params.id);
    res.json(parseCustomer(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  try {
    db.prepare(
      `UPDATE customers SET archived_at = ? WHERE id = ? AND user_id = ?`,
    ).run(new Date().toISOString(), req.params.id, req.user.id);
    res.json({ message: "Customer archived successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/pay", (req, res) => {
  try {
    const { amount, date } = req.body;

    const current = db
      .prepare(
        "SELECT balance, advance_payment, payment_history FROM customers WHERE id = ? AND user_id = ?",
      )
      .get(req.params.id, req.user.id);
    if (!current) return res.status(404).json({ error: "Record not found" });

    const payAmount = parseFloat(amount);
    const currentBalance = parseFloat(current.balance);

    if (payAmount > currentBalance) {
      return res
        .status(400)
        .json({ error: "Payment amount cannot exceed outstanding balance" });
    }

    let newBalance = currentBalance - payAmount;
    let newAdvance = parseFloat(current.advance_payment) + payAmount;
    const paymentDate = processDate(date);

    const paymentEntry = {
      date: paymentDate,
      amount: payAmount,
      balance_after: newBalance,
      note: "Advance Payment",
      created_at: new Date().toISOString(),
    };

    const currentHistory = JSON.parse(current.payment_history || "[]");
    currentHistory.push(paymentEntry);

    let newStatus = "partial";
    if (newBalance <= 0) {
      newBalance = 0;
      newStatus = "paid";
    }

    db.prepare(
      `
      UPDATE customers SET balance = ?, advance_payment = ?, payment_history = ?, status = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `,
    ).run(
      newBalance,
      newAdvance,
      JSON.stringify(currentHistory),
      newStatus,
      new Date().toISOString(),
      req.params.id,
      req.user.id,
    );

    const updated = db
      .prepare("SELECT * FROM customers WHERE id = ?")
      .get(req.params.id);
    if (newStatus === "paid") {
      return res.json({
        message: "Debt fully settled and marked as paid",
        settled: true,
        data: parseCustomer(updated),
      });
    }

    res.json(parseCustomer(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/edit-history", (req, res) => {
  try {
    const { index, newAmount } = req.body;

    const current = db
      .prepare("SELECT * FROM customers WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!current) return res.status(404).json({ error: "Record not found" });

    const history = JSON.parse(current.payment_history || "[]");
    if (index < 0 || index >= history.length) {
      return res.status(400).json({ error: "Invalid history index" });
    }

    const item = history[index];
    if (item.type === "edit" || item.type === "manual_adjustment") {
      return res
        .status(400)
        .json({ error: "Cannot edit this type of history item" });
    }

    const oldAmount = parseFloat(item.amount) || 0;
    const rawNewAmount = parseFloat(newAmount) || 0;

    const maxAllowed = parseFloat(current.balance) + oldAmount;
    const clampedNewAmount = Math.min(rawNewAmount, maxAllowed);
    const diff = clampedNewAmount - oldAmount;

    item.amount = clampedNewAmount;
    if (!item.note) item.note = "Advance Payment";
    if (!item.note.includes("[Edited]")) {
      item.note = `${item.note} [Edited]`;
    }

    for (let i = index; i < history.length; i++) {
      if (history[i].balance_after !== undefined) {
        history[i].balance_after = parseFloat(history[i].balance_after) - diff;
      }
    }

    const newBalance = Math.max(0, parseFloat(current.balance) - diff);
    const newAdvance = parseFloat(current.advance_payment) + diff;
    const newStatus = computeStatus(newBalance, newAdvance);

    db.prepare(
      `
      UPDATE customers SET balance = ?, advance_payment = ?, payment_history = ?, status = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `,
    ).run(
      newBalance,
      newAdvance,
      JSON.stringify(history),
      newStatus,
      new Date().toISOString(),
      req.params.id,
      req.user.id,
    );

    const updated = db
      .prepare("SELECT * FROM customers WHERE id = ?")
      .get(req.params.id);
    res.json(parseCustomer(updated));
  } catch (err) {
    console.error("API Error [POST /:id/edit-history]:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id/history/:index", (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const current = db
      .prepare("SELECT * FROM customers WHERE id = ? AND user_id = ?")
      .get(req.params.id, req.user.id);
    if (!current) return res.status(404).json({ error: "Record not found" });

    const history = JSON.parse(current.payment_history || "[]");
    if (isNaN(index) || index < 0 || index >= history.length) {
      return res.status(400).json({ error: "Invalid history index" });
    }

    const item = history[index];
    if (item.type === "edit") {
      return res
        .status(400)
        .json({ error: "Profile edit entries cannot be deleted" });
    }

    const deletedAmount = parseFloat(item.amount) || 0;
    history.splice(index, 1);

    for (let i = index; i < history.length; i++) {
      if (history[i].balance_after !== undefined) {
        history[i].balance_after =
          parseFloat(history[i].balance_after) + deletedAmount;
      }
    }

    const newBalance = parseFloat(current.balance) + deletedAmount;
    const newAdvance = Math.max(
      0,
      parseFloat(current.advance_payment) - deletedAmount,
    );
    const newStatus = computeStatus(newBalance, newAdvance);

    db.prepare(
      `
      UPDATE customers SET balance = ?, advance_payment = ?, payment_history = ?, status = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `,
    ).run(
      newBalance,
      newAdvance,
      JSON.stringify(history),
      newStatus,
      new Date().toISOString(),
      req.params.id,
      req.user.id,
    );

    const updated = db
      .prepare("SELECT * FROM customers WHERE id = ?")
      .get(req.params.id);
    res.json(parseCustomer(updated));
  } catch (err) {
    console.error("API Error [DELETE /:id/history/:index]:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
