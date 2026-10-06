// quiz.js — question construction (pure data, unit-testable).

import { CASES } from './cases.js';
import { caseDiagram } from './cases.js';
import { algGlyphs, glyph } from './visuals.js';
import { shuffle } from './util.js';

export function distractors(correct, pool, n = 3) {
  const sameKind = pool.filter((c) => c.kind === correct.kind && c.key !== correct.key);
  const sameKeys = new Set(sameKind.map((c) => c.key));
  const others = CASES.filter((c) => c.key !== correct.key && !sameKeys.has(c.key));
  const out = [];
  const used = new Set([correct.key]);
  for (const c of shuffle(sameKind).concat(shuffle(others))) {
    if (out.length >= n) break;
    if (used.has(c.key)) continue;
    used.add(c.key);
    out.push(c);
  }
  return out;
}

// Distractor moves: same family with a different amount first, then others.
export function moveDistractors(correct, n = 3) {
  const bases = ['U', 'D', 'F', 'B', 'R', 'L', 'M', 'E', 'S', 'r', 'l', 'u', 'd', 'f', 'b', 'x', 'y', 'z'];
  const near = [1, 2, 3]
    .filter((a) => a !== correct.amount)
    .map((a) => ({ base: correct.base, amount: a }));
  const rest = [];
  for (const b of bases) for (const a of [1, 2, 3]) rest.push({ base: b, amount: a });
  const out = [];
  const used = new Set([correct.base + correct.amount]);
  for (const m of shuffle(near).concat(shuffle(rest))) {
    if (out.length >= n) break;
    if (used.has(m.base + m.amount)) continue;
    used.add(m.base + m.amount);
    out.push(m);
  }
  return out;
}

function eqMove(a, b) {
  return a.base === b.base && a.amount === b.amount;
}

export function makeQuestion(type, c, pool) {
  if (type === 'alg') {
    const opts = shuffle([c, ...distractors(c, pool)]);
    return {
      type, case: c,
      prompt: `<div class="diagram-wrap">${caseDiagram(c)}<span class="muted">这是哪一个公式的局面？</span></div>`,
      options: opts.map((o) => ({
        correct: o.key === c.key,
        html: `<div class="opt-alg">${algGlyphs(o.moves, 38)}</div>`,
        sub: '',
      })),
    };
  }
  if (type === 'case') {
    const opts = shuffle([c, ...distractors(c, pool)]);
    return {
      type, case: c,
      prompt: `<div class="diagram-wrap"><div class="glyph-row" style="justify-content:center">${algGlyphs(c.moves, 42)}</div><span class="muted">这个公式解决的是哪个局面？</span></div>`,
      options: opts.map((o) => ({
        correct: o.key === c.key,
        html: `<div class="diagram-wrap">${caseDiagram(o)}</div>`,
        sub: '',
      })),
    };
  }
  const idx = Math.floor(Math.random() * c.moves.length);
  const missing = c.moves[idx];
  const opts = shuffle([missing, ...moveDistractors(missing)]);
  const shown = c.moves
    .map((m, i) => (i === idx ? `<span class="placeholder-glyph">?</span>` : glyph(m.base, m.amount, 42)))
    .map((h) => `<span class="glyph-cell">${h}</span>`)
    .join('');
  return {
    type, case: c,
    prompt: `<div class="diagram-wrap"><div class="glyph-row" style="justify-content:center">${shown}</div><span class="muted">补全这个公式缺少的一步</span></div>`,
    options: opts.map((o) => ({
      correct: eqMove(o, missing),
      html: `<div class="diagram-wrap">${glyph(o.base, o.amount, 52)}</div>`,
      sub: '',
    })),
  };
}

export function buildQuestions(pool, count, kinds) {
  const src = pool && pool.length ? pool : CASES;
  const ks = kinds || ['alg', 'case', 'missing'];
  const qs = [];
  let guard = 0;
  while (qs.length < count && guard++ < count * 6) {
    const c = src[Math.floor(Math.random() * src.length)];
    qs.push(makeQuestion(ks[Math.floor(Math.random() * ks.length)], c, src));
  }
  return qs;
}
