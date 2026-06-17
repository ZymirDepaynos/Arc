import api from "../lib/api";

const BV_PW_KEY = "bv_pw_hash";
const BV_DELETED_LOGS_KEY = "bv_deleted_logs";
const BV_ATTEMPTS_KEY = "bv_pw_attempts";
const BV_LOCKOUT_KEY = "bv_pw_lockout";
const DEFAULT_PASSWORD = "basic2026";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

export async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Returns seconds remaining in lockout (0 = not locked). */
function lockoutRemaining() {
  const end = parseInt(localStorage.getItem(BV_LOCKOUT_KEY) || "0");
  if (Date.now() < end) return Math.ceil((end - Date.now()) / 1000);
  return 0;
}

export async function verifyPassword(password) {
  const remaining = lockoutRemaining();
  if (remaining > 0) return { success: false, locked: true, remaining };

  const hash = await sha256(password);

  let stored;
  try {
    const res = await api.get(`/api/settings/${BV_PW_KEY}`);
    stored = res.data.value;
  } catch (err) {
    if (err.response?.status === 404) {
      stored = await sha256(DEFAULT_PASSWORD);
    } else {
      console.error("Failed to fetch password from backend", err);
      return { success: false, error: "Database connection failed" };
    }
  }

  if (hash === stored) {
    localStorage.removeItem(BV_ATTEMPTS_KEY);
    localStorage.removeItem(BV_LOCKOUT_KEY);
    return { success: true };
  }

  const attempts = parseInt(localStorage.getItem(BV_ATTEMPTS_KEY) || "0") + 1;

  if (attempts >= MAX_ATTEMPTS) {
    localStorage.setItem(BV_LOCKOUT_KEY, String(Date.now() + LOCKOUT_MS));
    localStorage.removeItem(BV_ATTEMPTS_KEY);
    return { success: false, locked: true, remaining: 60 };
  }

  localStorage.setItem(BV_ATTEMPTS_KEY, String(attempts));
  return {
    success: false,
    locked: false,
    attemptsLeft: MAX_ATTEMPTS - attempts,
  };
}

export async function changePassword(currentPassword, newPassword) {
  const result = await verifyPassword(currentPassword);
  if (!result.success) return result;

  const newHash = await sha256(newPassword);
  await api.put(`/api/settings/${BV_PW_KEY}`, { value: newHash });

  return { success: true };
}

export async function getAuditLogs() {
  try {
    const res = await api.get(`/api/settings/${BV_DELETED_LOGS_KEY}`);
    return Array.isArray(res.data.value) ? res.data.value : [];
  } catch (err) {
    if (err.response?.status === 404) return [];
    console.error("Failed to fetch audit logs", err);
    return [];
  }
}

export async function addAuditLog(newLogs) {
  try {
    const existing = await getAuditLogs();
    const updated = [
      ...existing,
      ...(Array.isArray(newLogs) ? newLogs : [newLogs]),
    ];
    await api.put(`/api/settings/${BV_DELETED_LOGS_KEY}`, { value: updated });
  } catch (err) {
    console.error("Failed to save audit logs", err);
  }
}
