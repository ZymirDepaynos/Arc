const ARC_PW_KEY      = 'arc_pw_hash';
const ARC_ATTEMPTS_KEY = 'arc_pw_attempts';
const ARC_LOCKOUT_KEY  = 'arc_pw_lockout';
const DEFAULT_PASSWORD = 'arc2026';
const MAX_ATTEMPTS     = 5;
const LOCKOUT_MS       = 60_000; // 60 seconds

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Call once on app startup to seed the default password if none exists. */
export async function initPassword() {
  if (!localStorage.getItem(ARC_PW_KEY)) {
    localStorage.setItem(ARC_PW_KEY, await sha256(DEFAULT_PASSWORD));
  }
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
  const stored = localStorage.getItem(ARC_PW_KEY);

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
  localStorage.setItem(ARC_PW_KEY, await sha256(newPassword));
  return { success: true };
}
