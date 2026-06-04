/**
 * Shared formatting utilities.
 * Import from here instead of defining locally in each component.
 */

/** Format a number as Philippine Peso with 2 decimal places */
export const fmt = (n) =>
  '₱' + parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format a date string (ISO or date-only) as a human-readable short date */
export const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const isDateOnly = d.length === 10 || !d.includes('T');
    const date = isDateOnly ? new Date(d + 'T12:00:00') : new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
};

/** Get uppercase initials from a full name (up to 2 characters) */
export const initials = (name) =>
  (name || '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Map a status value to a display label */
export const getStatusLabel = (status) => {
  if (status === 'active') return 'Outstanding';
  if (status === 'partial') return 'Partial';
  if (status === 'paid') return 'Paid';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';
};

/**
 * Parse stored notes back into an items array.
 * Supports both JSON array format and legacy newline-separated text.
 */
export const parseItems = (notes) => {
  if (!notes) return [];
  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) { /* not JSON — legacy plain text */ }
  return notes.split('\n').map((l) => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
};
