// diagram.js — flat "look down on the last layer" case pictures.

import { COLOR } from './cube.js';

function cell(x, y, fill, pad = 0.05) {
  return `<rect x="${x + pad}" y="${y + pad}" width="${1 - pad * 2}" height="${1 - pad * 2}" rx="0.13" fill="${fill}"/>`;
}

// Top view: a 5x5 grid where the middle 3x3 is the U face and the rim shows the
// top row of F / R / B / L. Front face (F) is at the bottom of the picture.
export function topView(cube, { size = 150, mode = 'oll' } = {}) {
  const g = cube.faceGrid();
  const bg = mode === 'oll' ? '#39414f' : '#39414f';
  let s = `<svg class="diagram" viewBox="0 0 5 5" width="${size}" height="${size}">`;
  s += `<rect x="0" y="0" width="5" height="5" rx="0.4" fill="#151a24"/>`;

  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const f = g.U[r * 3 + c];
      const col = f === 'U' ? COLOR.U : bg;
      s += cell(1 + c, 1 + r, col);
    }
  for (let c = 0; c < 3; c++) s += cell(1 + c, 4, COLOR[g.F[c]] || bg); // front
  for (let c = 0; c < 3; c++) s += cell(1 + c, 0, COLOR[g.B[2 - c]] || bg); // back
  for (let r = 0; r < 3; r++) s += cell(0, 1 + r, COLOR[g.L[r]] || bg); // left
  for (let r = 0; r < 3; r++) s += cell(4, 1 + r, COLOR[g.R[2 - r]] || bg); // right

  s += `</svg>`;
  return s;
}

// A separate "side view" strip is helpful for PLL (the U face is uniform there).
export function sideStrip(cube, { size = 240, height = 48 } = {}) {
  const g = cube.faceGrid();
  const order = ['F', 'R', 'B', 'L'];
  const w = size / 12;
  let s = `<svg class="strip" viewBox="0 0 12 1" width="${size}" height="${height}" preserveAspectRatio="none">`;
  order.forEach((face, i) => {
    for (let c = 0; c < 3; c++) {
      const col = COLOR[g[face][c]] || '#39414f';
      s += `<rect x="${i * 3 + c}" y="0" width="1" height="1" fill="${col}" stroke="#151a24" stroke-width="0.04"/>`;
    }
  });
  s += `</svg>`;
  return s;
}
