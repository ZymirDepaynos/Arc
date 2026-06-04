export const getToday = () => new Date().toLocaleDateString('en-CA');

export const parseNaturalDate = (input) => {
  if (!input || !input.trim()) return null;
  const clean = input.trim();
  
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const normalized = clean.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();
  const parts = normalized.split(' ');

  // Format: "May 3 2026" or "May 3, 2026"
  if (parts.length >= 3) {
    const monthIdx = monthNames.findIndex(mn => parts[0].startsWith(mn));
    if (monthIdx !== -1) {
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(year) && year > 1900) {
        const d = new Date(year, monthIdx, day); // LOCAL date, no UTC shift
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-CA'); 
        }
      }
    }
  }

  
  if (parts.length >= 3) {
    const monthIdx = monthNames.findIndex(mn => parts[1] && parts[1].startsWith(mn));
    if (monthIdx !== -1) {
      const day = parseInt(parts[0]);
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(year) && year > 1900) {
        const d = new Date(year, monthIdx, day);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA');
      }
    }
  }

  
  if (parts.length === 2) {
    const monthIdx = monthNames.findIndex(mn => parts[0].startsWith(mn));
    if (monthIdx !== -1) {
      const day = parseInt(parts[1]);
      if (!isNaN(day)) {
        const year = new Date().getFullYear();
        const d = new Date(year, monthIdx, day);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('en-CA');
      }
    }
  }

  
  const withNoon = clean + ' 12:00:00';
  const direct = new Date(withNoon);
  if (!isNaN(direct.getTime())) {
    return direct.toLocaleDateString('en-CA');
  }

  return null;
};

export const formatDisplayDate = (isoDate) => {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
