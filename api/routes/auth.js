import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import crypto from "crypto";

const router = express.Router();
const JWT_SECRET =
  process.env.JWT_SECRET || "local-offline-secret-key-for-basic-ventures";

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if ANY user exists (single-tenant app)
    const existing = db.prepare("SELECT id FROM users LIMIT 1").get();
    if (existing) {
      return res.status(400).json({ error: "Account already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    db.prepare(
      "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)",
    ).run(userId, email, hashedPassword);

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/recreate
router.post("/recreate", async (req, res) => {
  try {
    const { email, current_username, current_password, new_password } =
      req.body;

    // Get the user by current_username
    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(current_username);
    if (!user) {
      return res.status(404).json({ error: "Incorrect current username" });
    }

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    db.transaction(() => {
      // Overwrite the verified user's credentials
      db.prepare(
        "UPDATE users SET username = ?, password_hash = ? WHERE id = ?",
      ).run(email, hashedPassword, user.id);

      // Delete all OTHER users to enforce single-tenant going forward
      db.prepare("DELETE FROM users WHERE id != ?").run(user.id);
    })();

    res.json({
      message: "Account credentials overwritten successfully. Data preserved.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, email: user.username }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      session: {
        access_token: token,
        user: { id: user.id, email: user.username },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
