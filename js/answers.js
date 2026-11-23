// Parsing and grading of student answers (shared by all questions).

export function parseNumber(text) {
  if (typeof text !== 'string') return null;
  let s = text.trim().replace(/−/g, '-').replace(/[$\s]/g, '');
  if (!/^-?[\d.,]+$/.test(s) || !/\d/.test(s)) return null;
  const neg = s.startsWith('-'); if (neg) s = s.slice(1);
  const hasDot = s.includes('.'), hasComma = s.includes(',');
  if (hasDot && hasComma) {
    const dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    const thou = dec === '.' ? ',' : '.';
    if (s.split(dec).length !== 2) return null;
    s = s.split(thou).join('').replace(dec, '.');
  } else if (hasComma) {
    if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
    else if (/^\d*,\d+$/.test(s)) s = s.replace(',', '.');
    else return null;
  } else if (hasDot) {
    if (/^\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, '');
    else if (!/^\d*\.\d+$/.test(s)) return null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

export function parseNumberCandidates(text) {
  const main = parseNumber(text);
  if (main === null) return [];
  const t = String(text).trim().replace(/[$\s]/g, '').replace(/−/g, '-');
  if (/^-?\d{1,3}[.,]\d{3}$/.test(t)) {
    const digits = Number(t.replace(/[.,]/, '')), dec = Number(t.replace(',', '.'));
    return [...new Set([digits, dec])];
  }
  return [main];
}

// built = { kind: 'mc'|'numeric', answer, absolute? }. absolute: accept the signed convention (elasticity).
export function gradeAnswer(built, input) {
  if (built.kind === 'mc') return input === built.answer;
  if (Array.isArray(input)) return input.some((x) => gradeAnswer(built, x));
  if (typeof input !== 'number' || !Number.isFinite(input)) return false;
  const x = built.absolute ? Math.abs(input) : input;
  if (built.percentOk && x > 1 && x <= 100 && gradeAnswer({ ...built, percentOk: false }, x / 100)) return true; // "60" or "60%" for 0.60
  return Math.abs(x - built.answer) <= Math.max(0.02 * Math.abs(built.answer), 0.01);
}
