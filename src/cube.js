// cube.js — exact cubie-level Rubik's cube model.
//
// A cube is 26 cubies. Every cubie carries:
//   home : its solved grid position [x,y,z] (each -1|0|1)
//   p    : its current grid position
//   o    : orientation as 3 world-space column vectors (images of the local
//          x / y / z axes). Always an exact integer rotation matrix.
//   s    : six sticker face-letters indexed by local direction, null if internal
//
// Moves rotate whole layers by exact 90 degree steps, so there is never any
// floating point drift and states compare exactly.

export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

// Standard colour scheme, last layer (U) is yellow like classic OLL/PLL charts.
export const COLOR = {
  U: '#ffd500',
  R: '#c41e3a',
  F: '#009e60',
  D: '#f4f4f4',
  L: '#ff5800',
  B: '#0051ba',
};

// Local direction index -> face letter.
export const DIRS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
const FACE_OF_DIR = ['R', 'L', 'U', 'D', 'F', 'B'];
const DIR_OF_FACE = { R: 0, L: 1, U: 2, D: 3, F: 4, B: 5 };

// Move geometry. axis: 0=x 1=y 2=z. layers: grid coordinates that turn.
// d: +1 means a right-hand positive rotation about the axis, -1 the opposite.
export const MOVE_DEF = {
  U: { axis: 1, layers: [1], d: -1 },
  D: { axis: 1, layers: [-1], d: 1 },
  R: { axis: 0, layers: [1], d: -1 },
  L: { axis: 0, layers: [-1], d: 1 },
  F: { axis: 2, layers: [1], d: -1 },
  B: { axis: 2, layers: [-1], d: 1 },
  M: { axis: 0, layers: [0], d: 1 },
  E: { axis: 1, layers: [0], d: 1 },
  S: { axis: 2, layers: [0], d: -1 },
  u: { axis: 1, layers: [0, 1], d: -1 },
  d: { axis: 1, layers: [-1, 0], d: 1 },
  r: { axis: 0, layers: [0, 1], d: -1 },
  l: { axis: 0, layers: [-1, 0], d: 1 },
  f: { axis: 2, layers: [0, 1], d: -1 },
  b: { axis: 2, layers: [-1, 0], d: 1 },
  x: { axis: 0, layers: [-1, 0, 1], d: -1 },
  y: { axis: 1, layers: [-1, 0, 1], d: -1 },
  z: { axis: 2, layers: [-1, 0, 1], d: -1 },
};

export const MOVE_BASES = Object.keys(MOVE_DEF);

// ---------------------------------------------------------------- parsing

export function parseMove(tok) {
  const base = tok[0];
  if (!MOVE_DEF[base]) throw new Error('bad move: ' + tok);
  const amount = tok.includes('2') ? 2 : tok.includes("'") ? 3 : 1;
  return { base, amount };
}

export function parseAlg(alg) {
  return String(alg).trim().split(/\s+/).filter(Boolean).map(parseMove);
}

export function moveToString(m) {
  return m.base + (m.amount === 2 ? '2' : m.amount === 3 ? "'" : '');
}

export function algToString(moves) {
  return moves.map(moveToString).join(' ');
}

export function invertMoves(moves) {
  return moves
    .slice()
    .reverse()
    .map((m) => ({ base: m.base, amount: (4 - m.amount) % 4 || 1 }));
}

export function invertAlgStr(alg) {
  return algToString(invertMoves(parseAlg(alg)));
}

// ---------------------------------------------------------------- rotation

// Rotate an integer vector by `q` right-hand quarter turns about `axis`.
export function rotVec(v, axis, q) {
  let [x, y, z] = v;
  q = ((q % 4) + 4) % 4;
  for (let i = 0; i < q; i++) {
    if (axis === 0) [x, y, z] = [x, -z, y];
    else if (axis === 1) [x, y, z] = [z, y, -x];
    else [x, y, z] = [-y, x, z];
  }
  return [x, y, z];
}

function eq(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}
function isIdentity(o) {
  return (
    eq(o[0], [1, 0, 0]) && eq(o[1], [0, 1, 0]) && eq(o[2], [0, 0, 1])
  );
}

// ---------------------------------------------------------------- cube

function solvedCubies() {
  const list = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue;
        const p = [x, y, z];
        const s = DIRS.map((n, d) =>
          p[0] * n[0] + p[1] * n[1] + p[2] * n[2] === 1 ? FACE_OF_DIR[d] : null
        );
        list.push({ home: [x, y, z], p: [x, y, z], o: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], s });
      }
  return list;
}

// World-space normal of a cubie's local direction `d`.
export function worldNormal(cubie, d) {
  const axis = d >> 1;
  const sign = d % 2 === 0 ? 1 : -1;
  const v = cubie.o[axis];
  return [v[0] * sign, v[1] * sign, v[2] * sign];
}

export class Cube {
  constructor() {
    this.cubies = solvedCubies();
  }

  clone() {
    const c = new Cube();
    c.cubies = this.cubies.map((k) => ({
      home: k.home.slice(),
      p: k.p.slice(),
      o: [k.o[0].slice(), k.o[1].slice(), k.o[2].slice()],
      s: k.s.slice(),
    }));
    return c;
  }

  applyMove(mv) {
    const def = MOVE_DEF[mv.base];
    const q = ((def.d * mv.amount) % 4 + 4) % 4;
    for (const c of this.cubies) {
      if (!def.layers.includes(c.p[def.axis])) continue;
      c.p = rotVec(c.p, def.axis, q);
      c.o = [rotVec(c.o[0], def.axis, q), rotVec(c.o[1], def.axis, q), rotVec(c.o[2], def.axis, q)];
    }
    return this;
  }

  applyMoves(moves) {
    for (const m of moves) this.applyMove(m);
    return this;
  }

  applyAlg(alg) {
    return this.applyMoves(typeof alg === 'string' ? parseAlg(alg) : alg);
  }

  // 54 facelets in Kociemba order U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53).
  facelets() {
    const out = new Array(54).fill(null);
    for (const c of this.cubies) {
      for (let d = 0; d < 6; d++) {
        const f = c.s[d];
        if (!f) continue;
        const n = worldNormal(c, d);
        out[faceletIndex(c.p, n)] = f;
      }
    }
    return out;
  }

  // { U:[9], R:[9], F:[9], D:[9], L:[9], B:[9] } row-major per face.
  faceGrid() {
    const fl = this.facelets();
    const g = {};
    FACE_ORDER.forEach((f, i) => {
      g[f] = fl.slice(i * 9, i * 9 + 9);
    });
    return g;
  }

  isSolved() {
    const f = this.facelets();
    return f.every((c, i) => c === SOLVED_FACELETS[i]);
  }

  isCrossAndF2L() {
    const f = this.facelets();
    for (let i = 27; i < 36; i++) if (f[i] !== SOLVED_FACELETS[i]) return false;
    for (const b of [9, 18, 36, 45])
      for (let i = 3; i < 9; i++) if (f[b + i] !== SOLVED_FACELETS[b + i]) return false;
    return true;
  }

  isLastLayerOriented() {
    const f = this.facelets();
    for (let i = 0; i < 9; i++) if (f[i] !== 'U') return false;
    return this.isCrossAndF2L();
  }
}

// Facelet index for a sticker at grid position p whose outward normal is n.
const SOLVED_FACELETS = (() => {
  const c = new Cube();
  return c.facelets();
})();

export function faceletIndex(p, n) {
  const d = n[0] === 1 ? 0 : n[0] === -1 ? 1 : n[1] === 1 ? 2 : n[1] === -1 ? 3 : n[2] === 1 ? 4 : 5;
  const f = FACE_OF_DIR[d];
  const base = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 }[f];
  let row, col;
  if (f === 'U') {
    row = p[2] + 1;
    col = p[0] + 1;
  } else if (f === 'D') {
    row = 1 - p[2];
    col = p[0] + 1;
  } else if (f === 'F') {
    row = 1 - p[1];
    col = p[0] + 1;
  } else if (f === 'B') {
    row = 1 - p[1];
    col = 1 - p[0];
  } else if (f === 'R') {
    row = 1 - p[1];
    col = 1 - p[2];
  } else {
    row = 1 - p[1];
    col = p[2] + 1;
  }
  return base + row * 3 + col;
}

// ---------------------------------------------------------------- helpers

// The state an algorithm solves: start from solved and undo the algorithm.
export function caseCube(alg) {
  return new Cube().applyMoves(invertMoves(parseAlg(alg)));
}

export const SOLVED = new Cube();

// A short, canonical key for a cube state (used to compare states / recognise).
export function stateKey(cube) {
  return cube.facelets().join('');
}

// Random pre-AUF (0..3) for practice mode.
export function randomAUF() {
  return Math.floor(Math.random() * 4);
}

// Build a practice scramble: the cube is shown with a random AUF already applied
// to the last layer and F2L solved. Solve = AUF + alg (+ trailing AUF for PLL).
// Returns { moves, auf, alg } where moves are the scramble moves to apply to a
// solved cube to reach the displayed state.
export function practiceCase(alg, auf) {
  const aufMoves = auf ? [{ base: 'U', amount: auf }] : [];
  // displayed = inverse(auf + alg) applied to solved = inverse(alg) then inverse(auf)
  const scramble = invertMoves(parseAlg(alg)).concat(invertMoves(aufMoves));
  return { scramble, auf, alg };
}

// Trailing AUF that finishes the solve after `moves` have been applied to
// `startCube`. Returns 0..3 (number of clockwise U turns).
export function trailingAUF(startCube, moves) {
  const c = startCube.clone().applyMoves(moves);
  for (let k = 0; k < 4; k++) {
    const t = c.clone();
    if (k) t.applyMove({ base: 'U', amount: k });
    if (t.isSolved()) return k;
  }
  return null;
}
