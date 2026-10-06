import { CASES } from '../src/cases.js';
import { practiceCase, trailingAUF, Cube } from '../src/cube.js';
for (const c of CASES) {
  for (let auf=0; auf<4; auf++) {
    const { scramble } = practiceCase(c.alg, auf);
    const st = new Cube().applyMoves(scramble);
    if (!st.isCrossAndF2L()) throw new Error('practice not F2L ' + c.key + ' auf=' + auf);
    const aufMoves = auf ? [{base:'U', amount:auf}] : [];
    const full = aufMoves.concat(c.moves);
    if (c.kind === 'pll') {
      const t = trailingAUF(st, full);
      if (t === null) throw new Error('pll not solvable ' + c.key + ' auf=' + auf);
    } else {
      const done = st.clone().applyMoves(full);
      if (!done.isLastLayerOriented()) throw new Error('oll not oriented ' + c.key + ' auf=' + auf);
    }
  }
}
console.log('practice: all 78 cases x 4 AUF OK');
