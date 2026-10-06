import { applyMoves, parseAlg, solvedCube, toFacelets } from '@moishy/cubing-core';
import { Cube, parseAlg as myParse, caseCube, SOLVED } from '../src/cube.js';
import { OLL, PLL } from '../src/data.js';

const tests = [
  "R U R' U'", "R U2 R2 F R F' U2 R' F R F'", "M2 U M2 U2 M2 U M2",
  "x R2 D2 R U R' D2 R U' R x'", "r U R' U' M U R U' R'", "u d' f b l r",
  "x y z", "F R U R' U' F'", "S E M",
];
let bad = 0;
for (const alg of tests) {
  const ref = toFacelets(applyMoves(solvedCube(), parseAlg(alg)));
  const mine = new Cube().applyAlg(alg).facelets().join('');
  if (ref !== mine) { bad++; console.log('MISMATCH', alg); console.log(' ref ', ref); console.log(' mine', mine); }
}
console.log('move tests:', bad === 0 ? 'ALL OK' : bad + ' mismatches');

// Every case alg must bring the case state back to solved, and the case state
// must have cross+F2L solved.
let errs = 0;
for (const c of [...OLL, ...PLL]) {
  const st = caseCube(c.alg);
  if (!st.isCrossAndF2L()) { errs++; console.log('NOT F2L:', c.id, c.alg); }
  const solved = st.clone().applyAlg(c.alg).isSolved();
  if (!solved) { errs++; console.log('NOT SOLVED AFTER ALG:', c.id); }
  // OLL case state: last layer must NOT be oriented (otherwise alg is trivial)
  if (c.id.startsWith('oll') && st.isLastLayerOriented()) { console.log('note: already oriented', c.id); }
}
console.log('case integrity:', errs === 0 ? 'ALL OK' : errs + ' errors');
