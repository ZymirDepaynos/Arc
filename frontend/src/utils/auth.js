import axios from 'axios';

const ARC_PW_KEY          = 'arc_pw_hash';
const ARC_DELETED_LOGS_KEY = 'arc_deleted_logs';
const ARC_ATTEMPTS_KEY    = 'arc_pw_attempts';
const ARC_LOCKOUT_KEY     = 'arc_pw_lockout';
const DEFAULT_PASSWORD    = 'arc2026';
const MAX_ATTEMPTS        = 5;
const LOCKOUT_MS          = 60_000; // 60 seconds

const API_URL = import.meta.env.VITE_API_URL || '';

export async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}



/** Returns seconds remaining in lockout (0 = not locked). */
function lockoutRemaining() {
  const end = parseInt(localStorage.getItem(ARC_LOCKOUT_KEY) || '0');
  if (Date.now() < end) return Math.ceil((end - Date.now()) / 1000);
  return 0;
}

/**
 * Verify a password attempt.
 * Returns { success: true }
 *       | { success: false, locked: true, remaining: <seconds> }
 *       | { success: false, locked: false, attemptsLeft: <n> }
 */
export async function verifyPassword(password) {
  const remaining = lockoutRemaining();
  if (remaining > 0) return { success: false, locked: true, remaining };

  const hash   = await sha256(password);
  
  let stored;
  try {
    const res = await axios.get(`${API_URL}/api/settings/${ARC_PW_KEY}`);
    stored = res.data.value;
  } catch (err) {
    if (err.response?.status === 404) {
      stored = await sha256(DEFAULT_PASSWORD);
    } else {
      console.error('Failed to fetch password from backend', err);
      return { success: false, error: 'Database connection failed' };
    }
  }

  if (hash === stored) {
    localStorage.removeItem(ARC_ATTEMPTS_KEY);
    localStorage.removeItem(ARC_LOCKOUT_KEY);
    return { success: true };
  }

  const attempts = parseInt(localStorage.getItem(ARC_ATTEMPTS_KEY) || '0') + 1;

  if (attempts >= MAX_ATTEMPTS) {
    localStorage.setItem(ARC_LOCKOUT_KEY, String(Date.now() + LOCKOUT_MS));
    localStorage.removeItem(ARC_ATTEMPTS_KEY);
    return { success: false, locked: true, remaining: 60 };
  }

  localStorage.setItem(ARC_ATTEMPTS_KEY, String(attempts));
  return { success: false, locked: false, attemptsLeft: MAX_ATTEMPTS - attempts };
}

/**
 * Change the stored password.
 * Returns the same shape as verifyPassword (currentPassword must pass first),
 * or { success: true } on success.
 */
export async function changePassword(currentPassword, newPassword) {
  const result = await verifyPassword(currentPassword);
  if (!result.success) return result;
  
  const newHash = await sha256(newPassword);
  await axios.put(`${API_URL}/api/settings/${ARC_PW_KEY}`, { value: newHash });
  
  return { success: true };
}

export async function getAuditLogs() {
  try {
    const res = await axios.get(`${API_URL}/api/settings/${ARC_DELETED_LOGS_KEY}`);
    return Array.isArray(res.data.value) ? res.data.value : [];
  } catch (err) {
    if (err.response?.status === 404) return [];
    console.error('Failed to fetch audit logs', err);
    return [];
  }
}

export async function addAuditLog(newLogs) {
  try {
    const existing = await getAuditLogs();
    const updated = [...existing, ...(Array.isArray(newLogs) ? newLogs : [newLogs])];
    await axios.put(`${API_URL}/api/settings/${ARC_DELETED_LOGS_KEY}`, { value: updated });
  } catch (err) {
    console.error('Failed to save audit logs', err);
  }
}
