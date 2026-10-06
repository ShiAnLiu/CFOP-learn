// util.js — tiny helpers shared by the UI and the quiz engine.

export function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function sample(a, n) {
  return shuffle(a).slice(0, n);
}

export function invMove(m) {
  return { base: m.base, amount: m.amount === 2 ? 2 : 4 - m.amount };
}

export function eqMove(a, b) {
  return a.base === b.base && a.amount === b.amount;
}

export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export function addDays(str, n) {
  const d = new Date(str + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return todayStr(d);
}
