// visuals.js — renders cube moves as pure pictures (no letter notation).
//
// Every move becomes a small chip: the face colour, a rotation arrow, plus a
// layer hint (double border = wide turn, split colour = middle slice, dark ring
// = whole-cube rotation). Nothing here ever shows "R", "U'", "F2" ...

import { COLOR } from './cube.js';

const WIDE_FACE = { u: 'U', d: 'D', f: 'F', b: 'B', r: 'R', l: 'L' };
const SLICE_PAIR = { M: ['L', 'R'], E: ['U', 'D'], S: ['B', 'F'] };
const ROT_BASES = { x: 1, y: 1, z: 1 };

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

// Arrow head at angle `deg`; dir +1 = increasing angle (clockwise on screen).
function head(cx, cy, r, deg, dir, color) {
  const [x, y] = polar(cx, cy, r, deg);
  const a = ((deg + 90 * dir) * Math.PI) / 180;
  const tx = Math.cos(a) * 6;
  const ty = Math.sin(a) * 6;
  const px = -Math.sin(a) * 4.6;
  const py = Math.cos(a) * 4.6;
  const f = (v) => v.toFixed(1);
  return `<polygon points="${f(x + tx)},${f(y + ty)} ${f(x + px)},${f(y + py)} ${f(x - px)},${f(y - py)}" fill="${color}"/>`;
}

function arc(cx, cy, r, from, to) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to > from ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} ${sweep} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function arrow(amount, fg, cx = 24, cy = 24, r = 11.5) {
  const stroke = `fill="none" stroke="${fg}" stroke-width="3.4" stroke-linecap="round"`;
  if (amount === 2) {
    return (
      `<path d="${arc(cx, cy, r, 180, 360)}" ${stroke}/>` +
      head(cx, cy, r, 180, 1, fg) +
      head(cx, cy, r, 360, 1, fg)
    );
  }
  if (amount === 3) {
    return `<path d="${arc(cx, cy, r, 30, -210)}" ${stroke}/>` + head(cx, cy, r, -210, -1, fg);
  }
  return `<path d="${arc(cx, cy, r, 150, 390)}" ${stroke}/>` + head(cx, cy, r, 390, 1, fg);
}

const DARK = '#161616';
const LIGHT = '#ffffff';
const lightFaces = new Set(['U', 'D', 'L']);

function background(base) {
  if (base in WIDE_FACE) {
    const f = WIDE_FACE[base];
    const c = COLOR[f];
    return {
      fg: lightFaces.has(f) ? DARK : LIGHT,
      bg: `<rect x="6" y="6" width="36" height="36" rx="10" fill="${c}"/>
           <rect x="2.5" y="2.5" width="43" height="43" rx="13" fill="none" stroke="${c}" stroke-width="2.4"/>`,
    };
  }
  if (base in SLICE_PAIR) {
    return { fg: base === 'E' ? DARK : LIGHT, bg: '' };
  }
  if (base in ROT_BASES) {
    return {
      fg: LIGHT,
      bg: `<circle cx="24" cy="24" r="20" fill="#31394d"/>
           <circle cx="24" cy="24" r="20" fill="none" stroke="#98a4bd" stroke-width="2"/>`,
    };
  }
  const c = COLOR[base] || '#888';
  return {
    fg: lightFaces.has(base) ? DARK : LIGHT,
    bg: `<rect x="4" y="4" width="40" height="40" rx="10" fill="${c}"/>`,
  };
}

export function glyph(base, amount = 1, size = 48) {
  const { bg, fg } = background(base);
  const isSlice = base in SLICE_PAIR;
  // halves need clipping; redo with a stable id per call
  let bgFinal = bg;
  if (isSlice) {
    const id = 'c' + Math.random().toString(36).slice(2, 8);
    const [a, b] = SLICE_PAIR[base];
    const ca = COLOR[a];
    const cb = COLOR[b];
    let halves;
    if (base === 'M') halves = `<rect x="0" y="0" width="24" height="48" fill="${ca}"/><rect x="24" y="0" width="24" height="48" fill="${cb}"/>`;
    else if (base === 'E') halves = `<rect x="0" y="0" width="48" height="24" fill="${ca}"/><rect x="0" y="24" width="48" height="24" fill="${cb}"/>`;
    else halves = `<rect x="0" y="0" width="48" height="24" fill="${cb}"/><rect x="0" y="24" width="48" height="24" fill="${ca}"/>`;
    bgFinal = `<defs><clipPath id="${id}"><rect x="4" y="4" width="40" height="40" rx="10"/></clipPath></defs>
      <g clip-path="url(#${id})">${halves}</g>
      <rect x="4" y="4" width="40" height="40" rx="10" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="2"/>`;
  }

  let inner;
  if (base in ROT_BASES) {
    inner = `<circle cx="24" cy="24" r="6.5" fill="none" stroke="#98a4bd" stroke-width="1.4" opacity="0.75"/>${arrow(amount, fg, 24, 24, 13)}`;
  } else {
    const grid = `<g stroke="${fg}" stroke-width="0.8" opacity="0.2">
      <line x1="4" y1="17.3" x2="44" y2="17.3"/><line x1="4" y1="30.6" x2="44" y2="30.6"/>
      <line x1="17.3" y1="4" x2="17.3" y2="44"/><line x1="30.6" y1="4" x2="30.6" y2="44"/></g>`;
    inner = grid + arrow(amount, fg);
  }
  return `<svg class="glyph" viewBox="0 0 48 48" width="${size}" height="${size}" role="img">${bgFinal}${inner}</svg>`;
}

// A whole algorithm as a row of chips.
export function algGlyphs(moves, size = 48) {
  return moves.map((m) => `<span class="glyph-cell">${glyph(m.base, m.amount, size)}</span>`).join('');
}

// Chinese description (tooltips / legend only, never used as the formula).
export const CN = {
  U: '顶层', D: '底层', F: '前面', B: '后面', R: '右面', L: '左面',
  M: '中层(随左面)', E: '中层(随底面)', S: '中层(随前面)',
  u: '上两层', d: '下两层', f: '前两层', b: '后两层', r: '右两层', l: '左两层',
  x: '整体绕右轴', y: '整体绕上轴', z: '整体绕前轴',
};
export function describe(move) {
  const dir = move.amount === 1 ? '顺时针' : move.amount === 3 ? '逆时针' : '转半圈';
  return (CN[move.base] || move.base) + ' ' + dir;
}
