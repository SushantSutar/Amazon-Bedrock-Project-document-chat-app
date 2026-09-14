import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

router.post("/register", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!emailPattern.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      [email, passwordHash],
    );

    const user = { id: result.insertId, email };
    res.status(201).json({ token: createToken(user), user });
  } catch (error) {
    res.status(500).json({ error: error.message || "Registration failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const [rows] = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = ?",
      [email],
    );
    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    res.json({
      token: createToken(user),
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Login failed." });
  }
});

router.post("/change-password", authRequired, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password must be different from the current password." });
    }

    const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [
      req.user.id,
    ]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
      passwordHash,
      req.user.id,
    ]);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not change password." });
  }
});

export default router;
