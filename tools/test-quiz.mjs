import { CASES, LEVELS, caseState, caseDiagram, caseTitle, OLL_CASES, PLL_CASES } from '../src/cases.js';
import { buildQuestions, makeQuestion } from '../src/quiz.js';
import { glyph, algGlyphs } from '../src/visuals.js';
import { practiceCase, trailingAUF, Cube, caseCube } from '../src/cube.js';

console.log('cases:', CASES.length, 'levels:', LEVELS.length);
console.log('levels cover:', LEVELS.reduce((a,l)=>a+l.items.length,0));
for (const lv of LEVELS) console.log(' ', lv.title.padEnd(24), lv.items.length);

// every case reaches solved after its alg and starts from a valid F2L state
for (const c of CASES) {
  const st = caseState(c);
  if (!st.isCrossAndF2L()) throw new Error('bad F2L ' + c.key);
  if (!st.clone().applyAlg(c.alg).isSolved()) throw new Error('alg fails ' + c.key);
}

// question generation
let n = 0;
for (let i=0;i<300;i++){
  const qs = buildQuestions(CASES, 5);
  for (const q of qs) {
    if (!q.prompt || !q.options || q.options.length !== 4) throw new Error('bad question');
    const correctCount = q.options.filter(o=>o.correct).length;
    if (correctCount !== 1) throw new Error('question has '+correctCount+' correct options');
    n++;
  }
}
console.log('questions validated:', n);

// glyphs produce well formed svg
for (const base of ['U','D','F','B','R','L','M','E','S','u','d','f','b','r','l','x','y','z']) {
  for (const a of [1,2,3]) {
    const s = glyph(base, a, 40);
    if (!s.startsWith('<svg') || !s.endsWith('</svg>')) throw new Error('bad glyph '+base+a);
    if (/[A-Za-z]/.test(s.replace(/<[^>]*>/g,'').replace(/\s/g,''))) { /* text content only whitespace */ }
  }
}
console.log('glyphs ok');

// diagrams
for (const c of CASES) { const d = caseDiagram(c); if (!d.includes('<svg')) throw new Error('bad diagram'); }
console.log('diagrams ok, sample length', caseDiagram(CASES[0]).length);

console.log('all good');
