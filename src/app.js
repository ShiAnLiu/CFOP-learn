// app.js — CFOP OLL / PLL visual learner.
//
// Everything a user sees for a formula is a picture: coloured face chips with
// rotation arrows. No "R", "R'", "F2" ever appears.

import { Cube, caseCube, practiceCase, trailingAUF, invertMoves, COLOR } from './cube.js';
import {
  CASES, BY_KEY, OLL_CASES, PLL_CASES, LEVELS,
  caseState, caseDiagram, caseTitle, caseSub,
} from './cases.js';
import { buildQuestions } from './quiz.js';
import { glyph, algGlyphs } from './visuals.js';
import { CubeRenderer } from './renderer.js';
import { shuffle, invMove, todayStr, addDays } from './util.js';

/* ============================================================ progress */

const PKEY = 'cfop-progress-v3';

let P = (() => {
  try {
    const raw = localStorage.getItem(PKEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { learned: {}, levels: {}, unlocked: 1, stats: { correct: 0, wrong: 0 }, days: {} };
})();

function save() {
  try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {}
}
function learnedCount() { return Object.keys(P.learned).length; }
function dueKeys() {
  const t = todayStr();
  return Object.keys(P.learned).filter((k) => (P.learned[k].due || t) <= t);
}
function markLearned(c) {  if (!P.learned[c.key]) P.learned[c.key] = { reps: 0, interval: 0, due: todayStr(), correct: 0, wrong: 0 };
  save();
}
const INTERVALS = [1, 2, 4, 7, 15, 30, 60];

function emptyProgress() {
  return { learned: {}, levels: {}, unlocked: 1, stats: { correct: 0, wrong: 0 }, days: {} };
}
function resetAllData() {
  try {
    localStorage.removeItem(PKEY);
    localStorage.removeItem('cfop-progress-v2');
    localStorage.removeItem('cfop-progress-v1');
  } catch (e) {}
  P = emptyProgress();
  save();
  toast('已清空所有学习数据');
  if (S.route === 'home') renderHome();
  else navigate('home');
}
function reviewAnswer(c, ok) {
  const r = P.learned[c.key] || (P.learned[c.key] = { reps: 0, interval: 0, due: todayStr(), correct: 0, wrong: 0 });
  if (ok) {
    r.correct++; r.reps++;
    r.interval = Math.min(r.interval + 1, INTERVALS.length - 1);
    P.stats.correct++;
  } else {
    r.wrong++; r.reps = 0; r.interval = 0;
    P.stats.wrong++;
  }
  r.due = addDays(todayStr(), INTERVALS[r.interval]);
  r.last = todayStr();
  save();
}

/* ============================================================ shell */

const app = document.getElementById('app');
let R3D = null;
const S = { route: 'home' };

function dispose3D() {
  if (R3D) { try { R3D.dispose(); } catch (e) {} R3D = null; }
}
function mount3D(box, cube) {
  dispose3D();
  R3D = new CubeRenderer(box);
  R3D.sync(cube);
  return R3D;
}
let toastTimer = null;
function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
}

function navigate(route, params = {}) {
  if (S.onLeave) { S.onLeave(); S.onLeave = null; }
  dispose3D();
  for (const k of Object.keys(params)) S[k] = params[k];
  S.route = route;
  try {
    const h = hashFor(route, params);
    if (h && location.hash !== h) history.replaceState(null, '', h);
  } catch (e) {}
  window.scrollTo({ top: 0 });
  render();
}
function hashFor(route, params) {
  if (route === 'learn') return '#/learn/' + (params.levelIndex || S.levelIndex || 0) + '/' + (params.learnIndex || 0);
  if (route === 'home') return '#/';
  return '#/' + route;
}
function applyHash() {
  const h = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
  const [p, a, b] = h.split('/');
  if (p === 'levels') navigate('levels');
  else if (p === 'learn') navigate('learn', { levelIndex: +a || 0, learnIndex: +b || 0, learnCases: null });
  else if (p === 'library') navigate('library');
  else if (p === 'practice') navigate('practice');
  else navigate('home');
}
function rerender() { render(); }
function render() {
  ({ home: renderHome, levels: renderLevels, learn: renderLearn, quiz: renderQuiz,
     practice: renderPracticeMenu, practiceRun: renderPracticeRun, library: renderLibrary }[S.route] || renderHome)();
}

const cubePanelHTML = (id = 'cubeBox') =>
  `<div class="cube-box" id="${id}"><div class="hint">拖动旋转视角 · 滚轮缩放</div></div>`;

function glyphTitle(m) {
  const CN = { U: '顶层', D: '底层', F: '前面', B: '后面', R: '右面', L: '左面', M: '中层', E: '中层', S: '中层', u: '上两层', d: '下两层', f: '前两层', b: '后两层', r: '右两层', l: '左两层', x: '整体转向', y: '整体转向', z: '整体转向' };
  return (CN[m.base] || m.base) + '·' + (m.amount === 1 ? '顺时针' : m.amount === 3 ? '逆时针' : '180°');
}

/* ============================================================ home */

function renderHome() {
  const learned = learnedCount();
  const due = dueKeys().length;
  const pct = Math.round((learned / CASES.length) * 100);
  app.innerHTML = `
  <div class="hero">
    <h1>CFOP 公式闯关</h1>
    <p>OLL 57 例 · PLL 21 例 · 全图形化（不出现任何字母公式）</p>
    <div class="bar" style="max-width:520px;margin:0 auto 10px"><i style="width:${pct}%"></i></div>
    <div class="muted">已学会 ${learned} / ${CASES.length} 个公式</div>
  </div>
  <div class="menu" style="margin-top:24px">
    <div class="card" data-go="levels"><div class="big">🗺️</div><h3>闯关学习</h3><div class="muted">按形状分关，先学公式再出题测验，全部图形化演示。</div></div>
    <div class="card" data-go="review"><div class="big">🔁</div><h3>每日复习</h3><div class="muted">${due ? `今天有 <b style="color:var(--accent)">${due}</b> 个公式到期，来巩固记忆。` : '今天的复习已完成，随时可以再来一遍。'}</div></div>
    <div class="card" data-go="practice"><div class="big">⚔️</div><h3>实战练习</h3><div class="muted">给一个打乱公式，直接打乱到十字 + F2L 已完成的状态，限时判断是哪个公式。</div></div>
    <div class="card" data-go="library"><div class="big">📚</div><h3>公式库</h3><div class="muted">浏览全部 78 个公式的 3D 动画与顶面图案。</div></div>
  </div>
  <div class="card" style="margin-top:20px">
    <h3>图例 · 如何读懂这些「图形公式」</h3>
    <div class="row" style="gap:22px;margin-top:8px">
      <div class="row" style="gap:8px">${glyph('R', 1, 44)}<span class="muted">色块＝要转的面<br>箭头＝转动方向</span></div>
      <div class="row" style="gap:8px">${glyph('U', 3, 44)}<span class="muted">反向箭头＝逆时针</span></div>
      <div class="row" style="gap:8px">${glyph('F', 2, 44)}<span class="muted">双箭头＝转 180°</span></div>
      <div class="row" style="gap:8px">${glyph('r', 1, 44)}<span class="muted">外框 = 两层一起转</span></div>
      <div class="row" style="gap:8px">${glyph('M', 1, 44)}<span class="muted">拼色 = 中间层</span></div>
      <div class="row" style="gap:8px">${glyph('y', 1, 44)}<span class="muted">深色圆环 = 整体转向</span></div>
    </div>
    <div class="legend">
      ${Object.entries({ U: '顶面', D: '底面', F: '前面', B: '后面', R: '右面', L: '左面' })
        .map(([f, n]) => `<span class="item"><i class="sw" style="background:${COLOR[f]}"></i>${n}</span>`)
        .join('')}
    </div>
  </div>
  <div class="footer-note">
    色块颜色对应魔方六个面：顶面黄色、底面白色、前面绿色、后面蓝色、右面红色、左面橙色（3D 视角下可以拖动观察）。<br>
    学习记录保存在本机浏览器中。
    <div style="margin-top:14px"><button class="btn sm" id="resetAll" style="color:#ff9b9b;border-color:#5a3030">🗑 清空所有学习数据</button></div>
  </div>`;
  app.querySelector('#resetAll').onclick = () => {
    if (!confirm('确定删除全部学习数据吗？\n（已学会的公式、复习进度、解锁关卡都会重置，且不可恢复）')) return;
    resetAllData();
  };
  app.querySelectorAll('[data-go]').forEach((elm) => {
    elm.onclick = () => {
      const g = elm.dataset.go;
      if (g === 'levels') navigate('levels');
      else if (g === 'library') navigate('library');
      else if (g === 'practice') navigate('practice');
      else if (g === 'review') startReview();
    };
  });
}

/* ============================================================ levels */

function levelProgress(lv) {
  const done = lv.items.filter((c) => P.learned[c.key]).length;
  const passed = P.levels[lv.key] && P.levels[lv.key].done;
  return { done, passed, total: lv.items.length };
}

function renderLevels() {
  app.innerHTML = `
  <div class="topbar">
    <button class="back" data-back>← 首页</button>
    <h1>闯关地图</h1>
    <div class="spacer"></div>
    <span class="pill">已解锁 ${Math.min(P.unlocked, LEVELS.length)} / ${LEVELS.length} 关</span>
  </div>
  <div class="level-list">
    ${LEVELS.map((lv, i) => {
      const pr = levelProgress(lv);
      const locked = i + 1 > P.unlocked;
      return `<div class="level ${locked ? 'locked' : ''} ${pr.passed ? 'done' : ''}" data-lv="${i}">
        <div class="idx">${pr.passed ? '✓' : i + 1}</div>
        <div class="meta">
          <b>${lv.title}</b>
          <div class="muted">${lv.kind.toUpperCase()} · ${pr.total} 个公式${locked ? ' · 未解锁' : ''}</div>
          <div class="pips">${lv.items.map((c) => `<i class="pip ${P.learned[c.key] ? 'on' : ''}"></i>`).join('')}</div>
        </div>
        <div class="tag">${pr.done}/${pr.total}</div>
      </div>`;
    }).join('')}
  </div>`;
  app.querySelector('[data-back]').onclick = () => navigate('home');
  app.querySelectorAll('[data-lv]').forEach((elm) => {
    elm.onclick = () => {
      const i = +elm.dataset.lv;
      if (i + 1 > P.unlocked) return toast('先完成前面的关卡吧');
      navigate('learn', { levelIndex: i, learnIndex: 0, learnCases: null });
    };
  });
}

/* ============================================================ learn */

function renderLearn() {
  const lv = S.learnCases ? null : LEVELS[S.levelIndex] || LEVELS[0];
  const cases = S.learnCases || lv.items;
  const idx = Math.min(S.learnIndex || 0, cases.length - 1);
  const c = cases[idx];
  const scrambleMoves = invertMoves(c.moves);
  const solveMoves = c.moves;

  let phase = 'scramble'; // 'scramble' | 'solve'
  let step = 0;
  let playing = false;
  let speed = 1;
  let workCube = new Cube();

  app.innerHTML = `
  <div class="topbar">
    <button class="back" data-back>← 返回</button>
    <h1>${S.learnCases ? '公式库 · ' + caseTitle(c) : lv.title}</h1>
    <div class="spacer"></div>
    <span class="pill">${idx + 1} / ${cases.length}</span>
  </div>
  <div class="learn">
    <div>
      ${cubePanelHTML()}
      <div class="playbar" style="margin-top:12px">
        <button class="btn sm" data-reset>⟲ 从头开始</button>
        <button class="btn sm" data-prev-step>◀ 单步</button>
        <button class="btn sm primary" data-play>▶ 播放</button>
        <button class="btn sm" data-next-step>单步 ▶</button>
        <div class="speed">速度 <input type="range" min="0.4" max="2.4" step="0.2" value="1" data-speed></div>
      </div>
      <div class="muted" data-statustext style="margin-top:8px"></div>
    </div>
    <div>
      <div class="card">
        <div class="case-title"><b>${caseTitle(c)}</b>${caseSub(c) ? `<span class="tag">${caseSub(c)}</span>` : ''}
          ${P.learned[c.key] ? '<span class="pill good">已学会</span>' : ''}</div>
        <div class="muted" style="margin:8px 0 4px">照着图形拧即可：先用 ① 把复原的魔方打成这个局面，再用 ② 复原。点任意一步可以跳到那里。</div>

        <div class="formula-block" data-block="scramble">
          <div class="formula-head" data-ph="scramble">
            <span class="badge">1</span><span>打乱公式</span>
            <span class="muted">在复原的魔方上做 → 得到本局面</span>
          </div>
          <div class="glyph-row">${scrambleMoves.map((m, i) => `<span class="glyph-cell" data-ph="scramble" data-gi="${i}" title="${glyphTitle(m)}">${glyph(m.base, m.amount, 46)}</span>`).join('')}</div>
        </div>

        <div class="formula-block" data-block="solve">
          <div class="formula-head" data-ph="solve">
            <span class="badge">2</span><span>复原公式</span>
            <span class="muted">从这个局面 → 复原</span>
          </div>
          <div class="glyph-row">${solveMoves.map((m, i) => `<span class="glyph-cell" data-ph="solve" data-gi="${i}" title="${glyphTitle(m)}">${glyph(m.base, m.amount, 46)}</span>`).join('')}</div>
        </div>

        <div class="muted" data-steptext style="margin-top:10px"></div>
      </div>
      <div class="card" style="margin-top:12px">
        <h3>顶面图案（从上方看）</h3>
        <div class="diagram-wrap">${caseDiagram(c)}</div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn" data-prevcase ${idx === 0 ? 'disabled' : ''}>← 上一个</button>
        <button class="btn primary" data-nextcase>${idx + 1 < cases.length ? '下一个 →' : '记住它'}</button>
        <button class="btn" data-mark>${P.learned[c.key] ? '★ 已学会' : '标记已学会'}</button>
      </div>
      ${S.learnCases ? '' : `<div class="row" style="margin-top:10px"><button class="btn blue" data-gotoquiz>开始本关测验（${Math.max(4, cases.length * 2)} 题）</button></div>`}
    </div>
  </div>`;

  R3D = mount3D(document.getElementById('cubeBox'), workCube);

  const cells = [...app.querySelectorAll('[data-gi]')];
  const blocks = [...app.querySelectorAll('[data-block]')];
  const stepText = app.querySelector('[data-steptext]');
  const statusText = app.querySelector('[data-statustext]');
  const playBtn = app.querySelector('[data-play]');

  function movesOf(ph) {
    return ph === 'scramble' ? scrambleMoves : solveMoves;
  }
  function buildCube(ph, st) {
    const cube = new Cube();
    if (ph === 'solve') cube.applyMoves(scrambleMoves);
    cube.applyMoves(movesOf(ph).slice(0, st));
    return cube;
  }

  function paint() {
    for (const b of blocks) b.classList.toggle('active', b.dataset.block === phase);
    for (const el of cells) {
      const on = el.dataset.ph === phase;
      const i = +el.dataset.gi;
      el.classList.toggle('done', on && i < step);
      el.classList.toggle('active', on && i === step);
    }
    const moves = movesOf(phase);
    if (phase === 'scramble') {
      statusText.textContent =
        step === 0 ? '当前：复原状态——先按 ① 打乱公式拧。'
        : step >= moves.length ? '当前：局面已就绪 —— 接下来用 ② 复原公式。'
        : `当前：正在打乱 ${step} / ${moves.length} 步`;
      stepText.textContent = step >= moves.length
        ? '① 打乱完成，局面已和左图一致（十字 + F2L 已完成）✅'
        : `① 打乱 ${step} / ${moves.length} 步`;
    } else {
      statusText.textContent = step >= moves.length
        ? (c.kind === 'oll' ? '当前：复原完成 —— 顶面已全部同色 ✅' : '当前：完全复原 ✅')
        : `当前：正在复原 ${step} / ${moves.length} 步`;
      stepText.textContent = step >= moves.length
        ? (c.kind === 'oll' ? '② 复原完成：顶面全部同色 ✅' : '② 复原完成：魔方已还原 ✅')
        : `② 复原 ${step} / ${moves.length} 步`;
    }
  }

  function jump(ph, st) {
    playing = false;
    playBtn.textContent = '▶ 播放';
    phase = ph;
    step = st;
    workCube = buildCube(ph, st);
    R3D.sync(workCube);
    paint();
  }
  function reset() { jump('scramble', 0); }

  async function stepForward() {
    const moves = movesOf(phase);
    if (step >= moves.length) {
      if (phase === 'scramble') {
        phase = 'solve';
        step = 0;
        paint();
        return true;
      }
      return false;
    }
    await R3D.animateMove(workCube, moves[step], 300 / speed);
    step++;
    paint();
    return true;
  }
  async function stepBack() {
    if (step > 0) {
      playing = false; playBtn.textContent = '▶ 播放';
      await R3D.animateMove(workCube, invMove(movesOf(phase)[step - 1]), 200 / speed);
      step--;
      paint();
    } else if (phase === 'solve') {
      phase = 'scramble';
      step = scrambleMoves.length;
      paint();
    }
  }
  async function play() {
    if (playing) { playing = false; playBtn.textContent = '▶ 播放'; return; }
    if (phase === 'solve' && step >= solveMoves.length) reset();
    playing = true;
    playBtn.textContent = '⏸ 暂停';
    while (playing) {
      const more = await stepForward();
      if (!more) break;
      await new Promise((r) => setTimeout(r, 220 / speed));
    }
    playing = false;
    playBtn.textContent = '▶ 播放';
  }

  app.querySelector('[data-back]').onclick = () => navigate(S.learnCases ? 'library' : 'levels');
  app.querySelector('[data-reset]').onclick = reset;
  app.querySelector('[data-play]').onclick = play;
  app.querySelector('[data-next-step]').onclick = async () => { playing = false; playBtn.textContent = '▶ 播放'; await stepForward(); };
  app.querySelector('[data-prev-step]').onclick = stepBack;
  app.querySelector('[data-speed]').oninput = (e) => { speed = +e.target.value; };
  for (const el of cells) {
    el.onclick = () => jump(el.dataset.ph, +el.dataset.gi);
  }
  for (const head of app.querySelectorAll('[data-ph]')) {
    if (head.classList.contains('formula-head')) {
      head.onclick = () => jump(head.dataset.ph, 0);
      head.style.cursor = 'pointer';
    }
  }
  app.querySelector('[data-mark]').onclick = (e) => {
    markLearned(c);
    e.target.textContent = '★ 已学会';
    e.target.classList.add('primary');
    toast('已标记，安排进每日复习');
  };
  app.querySelector('[data-prevcase]').onclick = () => {
    if (idx > 0) navigate('learn', { learnCases: S.learnCases, learnIndex: idx - 1, levelIndex: S.levelIndex });
  };
  app.querySelector('[data-nextcase]').onclick = () => {
    markLearned(c);
    if (idx + 1 < cases.length) navigate('learn', { learnCases: S.learnCases, learnIndex: idx + 1, levelIndex: S.levelIndex });
    else if (S.learnCases) navigate('library');
    else startLevelQuiz(S.levelIndex);
  };
  const gq = app.querySelector('[data-gotoquiz]');
  if (gq) gq.onclick = () => startLevelQuiz(S.levelIndex);

  const onKey = (e) => {
    if (S.route !== 'learn') return;
    if (e.key === 'ArrowRight') stepForward();
    else if (e.key === 'ArrowLeft') stepBack();
    else if (e.key === ' ' || e.key === 'r' || e.key === 'R') { e.preventDefault(); play(); }
  };
  window.addEventListener('keydown', onKey);
  S.onLeave = () => { playing = false; window.removeEventListener('keydown', onKey); };

  paint();
}

/* ============================================================ quiz */

function startLevelQuiz(levelIndex) {
  const lv = LEVELS[levelIndex];
  const count = Math.max(4, lv.items.length * 2);
  S.quiz = {
    title: lv.title + ' · 测验',
    questions: buildQuestions(lv.items, count),
    idx: 0, correct: 0, levelKey: lv.key, levelIndex,
  };
  navigate('quiz');
}

function startReview() {
  const keys = dueKeys();
  let pool = keys.map((k) => BY_KEY.get(k)).filter(Boolean);
  if (!pool.length) pool = CASES.filter((c) => P.learned[c.key]);
  if (!pool.length) { toast('还没有学过的公式，先去闯关吧'); return; }
  S.quiz = {
    title: '每日复习',
    questions: buildQuestions(pool, Math.min(12, Math.max(4, pool.length))),
    idx: 0, correct: 0, review: true,
  };
  navigate('quiz');
}

function renderQuiz() {
  const q = S.quiz;
  if (!q) return navigate('home');
  if (q.idx >= q.questions.length) return renderQuizResult();
  const Q = q.questions[q.idx];

  app.innerHTML = `
  <div class="topbar">
    <button class="back" data-quit>← 退出</button>
    <h1>${q.title}</h1>
    <div class="spacer"></div>
    <span class="pill" id="scorePill">答对 ${q.correct}</span>
  </div>
  <div class="qbar">
    <div class="bar"><i style="width:${(q.idx / q.questions.length) * 100}%"></i></div>
    <span class="muted">${q.idx + 1} / ${q.questions.length}</span>
  </div>
  <div class="card">
    <div style="text-align:center;margin-bottom:12px">${Q.prompt}</div>
    <div class="opt-grid" id="opts">
      ${Q.options.map((o, i) => `<div class="opt" data-opt="${i}">${o.html}${o.sub ? `<div class="sub">${o.sub}</div>` : ''}</div>`).join('')}
    </div>
    <div id="fb"></div>
    <div class="row" style="margin-top:14px;justify-content:flex-end">
      <button class="btn primary" id="nextQ" style="display:none">继续 →</button>
    </div>
  </div>`;

  app.querySelector('[data-quit]').onclick = () => { S.quiz = null; navigate('home'); };
  const opts = [...app.querySelectorAll('[data-opt]')];
  opts.forEach((el, i) => {
    el.onclick = () => {
      if (el.classList.contains('disabled')) return;
      const ok = Q.options[i].correct;
      opts.forEach((o, j) => {
        o.classList.add('disabled');
        if (Q.options[j].correct) o.classList.add('correct');
      });
      if (!ok) el.classList.add('wrong');
      if (ok) q.correct++;
      const c = Q.case;
      if (q.review) reviewAnswer(c, ok);
      app.querySelector('#fb').innerHTML = `
        <div class="feedback ${ok ? 'ok' : 'no'}">
          ${ok ? '✅ 正确！' : '❌ 正确答案已用绿框标出。'}
          <div class="row" style="margin-top:10px;align-items:flex-start;gap:16px">
            <div><div class="muted">${caseTitle(c)} ${caseSub(c)}</div>
              <div class="diagram-wrap" style="margin-top:6px">${caseDiagram(c)}</div></div>
            <div><div class="muted">正确公式</div>
              <div class="glyph-row" style="margin-top:6px">${algGlyphs(c.moves, 40)}</div></div>
          </div>
        </div>`;
      app.querySelector('#scorePill').textContent = '答对 ' + q.correct;
      const nx = app.querySelector('#nextQ');
      nx.style.display = '';
      nx.textContent = q.idx + 1 >= q.questions.length ? '查看结果 →' : '继续 →';
      nx.onclick = () => { S.quiz.idx++; rerender(); };
      nx.focus();
    };
  });
}

function renderQuizResult() {
  const q = S.quiz;
  const total = q.questions.length;
  const score = q.correct / total;
  const good = score >= 0.8;
  let unlockedMsg = '';
  if (q.levelKey && good) {
    const prevBest = (P.levels[q.levelKey] || {}).best || 0;
    P.levels[q.levelKey] = { done: true, best: Math.max(prevBest, Math.round(score * 100)) };
    if (q.levelIndex + 1 >= P.unlocked && P.unlocked < LEVELS.length) {
      P.unlocked = q.levelIndex + 2;
      unlockedMsg = `<div class="muted" style="margin-top:8px">🎉 已解锁：${LEVELS[q.levelIndex + 1].title}</div>`;
    }
    save();
  }
  app.innerHTML = `
  <div class="topbar"><button class="back" data-home>← 首页</button><h1>${q.title} · 结果</h1></div>
  <div class="card" style="text-align:center;padding:34px 18px">
    <div style="font-size:52px">${good ? '🏆' : '💪'}</div>
    <h2 style="margin:12px 0 6px">答对 ${q.correct} / ${total}（${Math.round(score * 100)}%）</h2>
    <div class="muted">${good ? '表现很棒，继续保持！' : '正确率需达到 80% 才能通关，再练一次吧。'}</div>
    ${unlockedMsg}
    <div class="row center" style="margin-top:22px">
      ${q.levelKey ? `<button class="btn primary" data-retry>重做本关</button>` : ''}
      ${q.levelKey ? `<button class="btn" data-next>下一关 / 继续</button>` : ''}
      <button class="btn" data-home2>回到首页</button>
    </div>
  </div>`;
  app.querySelector('[data-home]').onclick = () => { S.quiz = null; navigate('home'); };
  app.querySelector('[data-home2]').onclick = () => { S.quiz = null; navigate('home'); };
  const rt = app.querySelector('[data-retry]');
  if (rt) rt.onclick = () => startLevelQuiz(q.levelIndex);
  const nx = app.querySelector('[data-next]');
  if (nx) nx.onclick = () => {
    const li = q.levelIndex;
    S.quiz = null;
    if (good && li + 1 < LEVELS.length) navigate('learn', { levelIndex: li + 1, learnIndex: 0, learnCases: null });
    else navigate('levels');
  };
}

/* ============================================================ practice */

function renderPracticeMenu() {
  const learned = CASES.filter((c) => P.learned[c.key]);
  app.innerHTML = `
  <div class="topbar"><button class="back" data-back>← 首页</button><h1>实战练习</h1></div>
  <div class="card">
    <h3>选择练习内容</h3>
    <div class="muted" style="margin-bottom:12px">
      从已学过的公式中随机抽题：给一个打乱公式，直接打乱到「十字 + F2L 已完成」的状态，你要判断这是哪个公式。
    </div>
    <div class="row">
      <button class="btn primary" data-kind="oll">只练 OLL</button>
      <button class="btn primary" data-kind="pll">只练 PLL</button>
      <button class="btn blue" data-kind="mix">混合练习</button>
    </div>
    <div class="muted" style="margin-top:12px">已学公式：OLL ${learned.filter((c) => c.kind === 'oll').length}/57 · PLL ${learned.filter((c) => c.kind === 'pll').length}/21</div>
  </div>
  <div class="card" style="margin-top:16px">
    <h3>规则</h3>
    <ul class="muted" style="line-height:1.9;margin:0;padding-left:18px">
      <li>每题会随机加入 AUF（顶层预备旋转），更接近实战。</li>
      <li>看完打乱动画后，从 4 个顶面图案里选出正确答案。</li>
      <li>答完后可一键演示完整解法（含收尾 AUF）。</li>
      <li>PLL 的打乱公式同样只会打乱最后一层。</li>
    </ul>
  </div>`;
  app.querySelector('[data-back]').onclick = () => navigate('home');
  app.querySelectorAll('[data-kind]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.kind;
      let pool;
      if (k === 'mix') pool = learned.length >= 4 ? learned : CASES;
      else {
        const l = learned.filter((c) => c.kind === k);
        pool = l.length >= 4 ? l : CASES.filter((c) => c.kind === k);
      }
      S.practice = { pool, idx: 0, correct: 0, kind: k };
      navigate('practiceRun');
    };
  });
}

function renderPracticeRun() {
  const pr = S.practice;
  if (!pr) return navigate('practice');
  if (pr.idx >= 10) return renderPracticeResult();

  const pool = pr.pool;
  const c = pool[Math.floor(Math.random() * pool.length)];
  const auf = Math.floor(Math.random() * 4);
  const { scramble } = practiceCase(c.alg, auf);
  const opts = shuffle([c, ...distractorsFor(c, pool)]);

  app.innerHTML = `
  <div class="topbar">
    <button class="back" data-quit>← 退出</button>
    <h1>实战练习 ${pr.idx + 1} / 10</h1>
    <div class="spacer"></div>
    <span class="pill good">答对 ${pr.correct}</span>
    <span class="pill" id="timer">0.0s</span>
  </div>
  <div class="learn">
    <div>
      ${cubePanelHTML()}
      <div class="card" style="margin-top:12px">
        <h3>打乱公式（图形）</h3>
        <div class="glyph-row" id="scr">${algGlyphs(scramble, 38)}</div>
        <button class="btn sm" id="replay">重新演示打乱</button>
      </div>
    </div>
    <div>
      <div class="card">
        <h3>这是哪个公式？</h3>
        <div class="opt-grid" id="opts" style="margin-top:10px">
          ${opts.map((o, i) => `<div class="opt" data-opt="${i}"><div class="diagram-wrap">${caseDiagram(o)}</div></div>`).join('')}
        </div>
        <div id="fb"></div>
        <div class="row" style="margin-top:14px;justify-content:flex-end">
          <button class="btn" id="showSol" style="display:none">演示解法</button>
          <button class="btn primary" id="nextQ" style="display:none">下一题 →</button>
        </div>
      </div>
    </div>
  </div>`;

  R3D = mount3D(document.getElementById('cubeBox'), new Cube());
  const work = new Cube();
  R3D.sync(work);

  let t0 = performance.now();
  let done = false;
  const timerEl = app.querySelector('#timer');
  const timerInt = setInterval(() => {
    if (!done) timerEl.textContent = ((performance.now() - t0) / 1000).toFixed(1) + 's';
  }, 100);
  S.onLeave = () => clearInterval(timerInt);

  async function demoScramble() {
    work.cubies = new Cube().cubies;
    R3D.sync(work);
    t0 = performance.now();
    await R3D.animateMoves(work, scramble, { duration: 190 });
  }
  demoScramble();

  app.querySelector('#replay').onclick = () => { if (!done) demoScramble(); };

  const optEls = [...app.querySelectorAll('[data-opt]')];
  optEls.forEach((el, i) => {
    el.onclick = () => {
      if (done) return;
      done = true;
      const ok = opts[i].key === c.key;
      if (ok) pr.correct++;
      optEls.forEach((o, j) => {
        o.classList.add('disabled');
        if (opts[j].key === c.key) o.classList.add('correct');
      });
      if (!ok) el.classList.add('wrong');
      timerEl.textContent = ((performance.now() - t0) / 1000).toFixed(1) + 's';
      app.querySelector('#fb').innerHTML = `
        <div class="feedback ${ok ? 'ok' : 'no'}">
          ${ok ? '✅ 判断正确！' : '❌ 正确答案已标绿。'}
          <div style="margin-top:8px">
            <div class="muted">${caseTitle(c)} ${caseSub(c)}${auf ? ' · 有 AUF 调整' : ''}</div>
            <div class="glyph-row" style="margin-top:6px">${algGlyphs(c.moves, 40)}</div>
          </div>
        </div>`;
      app.querySelector('#showSol').style.display = '';
      app.querySelector('#nextQ').style.display = '';
      app.querySelector('#nextQ').onclick = () => { pr.idx++; navigate('practiceRun'); };
    };
  });

  app.querySelector('#showSol').onclick = async () => {
    const aufMoves = auf ? [{ base: 'U', amount: auf }] : [];
    const full = aufMoves.concat(c.moves);
    const t = c.kind === 'pll' ? trailingAUF(work, full) : null;
    const all = t ? full.concat([{ base: 'U', amount: t }]) : full;
    const btn = app.querySelector('#showSol');
    btn.disabled = true;
    await R3D.animateMoves(work, all, { duration: 240 });
    btn.disabled = false;
    toast(c.kind === 'oll' ? 'OLL 完成：顶面已全部同色' : '复原完成 ✅');
  };

  app.querySelector('[data-quit]').onclick = () => { S.practice = null; navigate('practice'); };
}

function distractorsFor(c, pool) {
  const src = pool.length >= 4 ? pool : CASES;
  const same = shuffle(src.filter((x) => x.kind === c.kind && x.key !== c.key));
  const other = shuffle(CASES.filter((x) => x.kind !== c.kind && x.key !== c.key));
  const out = [];
  const used = new Set([c.key]);
  for (const x of same.concat(other)) {
    if (out.length >= 3) break;
    if (used.has(x.key)) continue;
    used.add(x.key);
    out.push(x);
  }
  return out;
}

function renderPracticeResult() {
  const pr = S.practice;
  app.innerHTML = `
  <div class="topbar"><button class="back" data-home>← 首页</button><h1>实战练习 · 完成</h1></div>
  <div class="card" style="text-align:center;padding:34px">
    <div style="font-size:52px">⚔️</div>
    <h2 style="margin:12px 0">答对 ${pr.correct} / 10</h2>
    <div class="muted">坚持练习，实战识别会越来越快。</div>
    <div class="row center" style="margin-top:20px">
      <button class="btn primary" data-again>再来 10 题</button>
      <button class="btn" data-home2>回到首页</button>
    </div>
  </div>`;
  app.querySelector('[data-home]').onclick = () => { S.practice = null; navigate('home'); };
  app.querySelector('[data-home2]').onclick = () => { S.practice = null; navigate('home'); };
  app.querySelector('[data-again]').onclick = () => { pr.idx = 0; pr.correct = 0; navigate('practiceRun'); };
}

/* ============================================================ library */

function renderLibrary() {
  if (!S.libKind) S.libKind = 'oll';
  const list = S.libKind === 'oll' ? OLL_CASES : PLL_CASES;
  app.innerHTML = `
  <div class="topbar"><button class="back" data-back>← 首页</button><h1>公式库</h1></div>
  <div class="tabs">
    <div class="tab ${S.libKind === 'oll' ? 'on' : ''}" data-tab="oll">OLL（57）</div>
    <div class="tab ${S.libKind === 'pll' ? 'on' : ''}" data-tab="pll">PLL（21）</div>
  </div>
  <div class="library-grid">
    ${list.map((c) => `
      <div class="lib-card" data-key="${c.key}">
        <div class="row" style="justify-content:space-between;align-items:flex-start">
          <b>${caseTitle(c)}</b>${P.learned[c.key] ? '<span class="pill good">已学</span>' : ''}
        </div>
        <div class="muted" style="font-size:12px;margin-top:2px">${caseSub(c) || 'PLL'}</div>
        <div class="diagram-wrap" style="margin-top:8px">${caseDiagram(c)}</div>
        <div class="gl">${c.moves.slice(0, 16).map((m) => glyph(m.base, m.amount, 30)).join('')}${c.moves.length > 16 ? '<span class="muted" style="align-self:center">…</span>' : ''}</div>
      </div>`).join('')}
  </div>`;
  app.querySelector('[data-back]').onclick = () => navigate('home');
  app.querySelectorAll('[data-tab]').forEach((t) => {
    t.onclick = () => { S.libKind = t.dataset.tab; renderLibrary(); };
  });
  app.querySelectorAll('[data-key]').forEach((el) => {
    el.onclick = () => {
      const c = BY_KEY.get(el.dataset.key);
      const list2 = c.kind === 'oll' ? OLL_CASES : PLL_CASES;
      const i = list2.findIndex((x) => x.key === c.key);
      navigate('learn', { learnCases: list2, learnIndex: i, levelIndex: 0, libKind: c.kind });
    };
  });
}

window.addEventListener('hashchange', applyHash);

/* ============================================================ boot */

applyHash();
