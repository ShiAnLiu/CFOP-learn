// cases.js — the case catalogue: OLL / PLL metadata, levels and cached
// pictures. No DOM, no three.js, so it can be unit-tested in node.

import { OLL, PLL } from './data.js';
import { caseCube, parseAlg } from './cube.js';
import { topView } from './diagram.js';

export const SUBSET_CN = {
  cross: '十字形', 't-shape': 'T 形', 'c-shape': '直角形', 'corners-oriented': '角块已定向',
  'fish-shape': '鱼形', square: '方形', 'p-shape': 'P 形', 'lightning-bolt': '闪电形',
  'l-shape': 'L 形', 'w-shape': 'W 形', 'knight-shape': '马步形',
  'awkward-shape': '异形', 'i-shape': 'I 形', dot: '点形',
};

export const OLL_LEVEL_GROUPS = [
  { key: 'cross', title: '第 1 关 · 十字形', subs: ['cross'] },
  { key: 'tcorner', title: '第 2 关 · T 形与直角', subs: ['t-shape', 'c-shape', 'corners-oriented'] },
  { key: 'fish', title: '第 3 关 · 鱼形', subs: ['fish-shape'] },
  { key: 'square', title: '第 4 关 · 方形', subs: ['square'] },
  { key: 'p', title: '第 5 关 · P 形', subs: ['p-shape'] },
  { key: 'light', title: '第 6 关 · 闪电形', subs: ['lightning-bolt'] },
  { key: 'l', title: '第 7 关 · L 形', subs: ['l-shape'] },
  { key: 'w', title: '第 8 关 · W 形', subs: ['w-shape'] },
  { key: 'knight', title: '第 9 关 · 马步形', subs: ['knight-shape'] },
  { key: 'awkward', title: '第 10 关 · 异形', subs: ['awkward-shape'] },
  { key: 'i', title: '第 11 关 · I 形', subs: ['i-shape'] },
  { key: 'dot', title: '第 12 关 · 点形（最难）', subs: ['dot'] },
];

export const PLL_LEVEL_GROUPS = [
  { key: 'basic', title: 'PLL 第 1 关 · 棱块置换', ids: ['t', 'ja', 'jb', 'ua', 'ub', 'h', 'z'] },
  { key: 'corner', title: 'PLL 第 2 关 · 角块置换', ids: ['aa', 'ab', 'e', 'ra', 'rb'] },
  { key: 'g', title: 'PLL 第 3 关 · G 系列', ids: ['ga', 'gb', 'gc', 'gd'] },
  { key: 'adv', title: 'PLL 第 4 关 · 进阶', ids: ['f', 'v', 'U', 'na', 'nb'] },
];

function prep(list, kind) {
  return list.map((c) => ({
    id: c.id,
    name: c.name,
    subset: c.subset,
    kind,
    key: kind + ':' + c.id,
    alg: c.alg,
    moves: parseAlg(c.alg),
  }));
}

export const CASES = [...prep(OLL, 'oll'), ...prep(PLL, 'pll')];
export const BY_KEY = new Map(CASES.map((c) => [c.key, c]));
export const OLL_CASES = CASES.filter((c) => c.kind === 'oll');
export const PLL_CASES = CASES.filter((c) => c.kind === 'pll');

const _stateCache = new Map();
export function caseState(c) {
  if (!_stateCache.has(c.key)) _stateCache.set(c.key, caseCube(c.alg));
  return _stateCache.get(c.key);
}

const _diagCache = new Map();
export function caseDiagram(c) {
  if (!_diagCache.has(c.key)) _diagCache.set(c.key, topView(caseState(c), { mode: c.kind }));
  return _diagCache.get(c.key);
}

export function caseTitle(c) {
  return c.kind === 'oll' ? 'OLL ' + c.id.replace('oll-', '') : c.name.replace(' Permutation', '');
}
export function caseSub(c) {
  return c.kind === 'oll' ? SUBSET_CN[c.subset] || c.subset : '';
}

export const LEVELS = (() => {
  const out = [];
  for (const g of OLL_LEVEL_GROUPS) {
    const items = OLL_CASES.filter((c) => g.subs.includes(c.subset));
    if (items.length) out.push({ key: 'L:' + g.key, title: g.title, kind: 'oll', items });
  }
  for (const g of PLL_LEVEL_GROUPS) {
    const items = g.ids.map((id) => BY_KEY.get('pll:' + id)).filter(Boolean);
    out.push({ key: 'L:' + g.key, title: g.title, kind: 'pll', items });
  }
  return out;
})();
