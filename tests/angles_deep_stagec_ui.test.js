// Angle Explorer stage C (2026-11-03): band-aware tab order and a "Start here"
// path whose ticks come from saved progress; one reveal rule on every tab (a
// second try, then "Show the answer" on demand, no credit); the AI nudge
// through ctx.getHint after two tries (stubbed); Challenges classify and create
// get a second try; translated quest labels. ANGLES_DEEP_SRC points at another copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mounted = [];
let live = null;
let xp = [];
let errors = [];
let said = [];

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'protractor');
  live = null; xp = []; errors = []; said = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 400)); });
});

afterEach(async () => {
  vi.restoreAllMocks();
  const screens = mounted.map(({ container }) => container.textContent).join(' ');
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
  expect(screens.match(/\{\w+\}/g), 'unfilled placeholder on screen').toBe(null);
  expect(said.filter((m) => /\{\w+\}/.test(m)), 'unfilled placeholder in an announcement').toEqual([]);
});

async function mount(init, extra) {
  const cfg = window.StemLab._registry.protractor;
  const container = document.createElement('div');
  document.body.appendChild(container);
  function Host() {
    const [angleValue, setAngleValue] = React.useState(init.angleValue != null ? init.angleValue : 45);
    const [angleChallenge, setAngleChallenge] = React.useState(init.angleChallenge || null);
    const [angleFeedback, setAngleFeedback] = React.useState(null);
    const [exploreScore, setExploreScore] = React.useState({ correct: 0, total: 0 });
    const [toolData, setToolData] = React.useState({ protractor: init.protractor || {}, angles: {} });
    live = { angleValue, angleChallenge, angleFeedback, exploreScore, d: toolData.protractor || {} };
    const update = (slot, key, val) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, { [key]: val }) }));
    const updateMulti = (slot, obj) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, obj) }));
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData, update, updateMulti,
      angleValue, setAngleValue, angleChallenge, setAngleChallenge, angleFeedback, setAngleFeedback,
      exploreScore, setExploreScore,
      awardXP: (id, n, why) => xp.push([id, n, why]),
      announceToSR: (m) => said.push(m),
      addToast: () => {},
      t: (k, fb) => fb || k,
    }, extra || {})));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return container;
}
async function unmountLast() { const { root, container } = mounted.pop(); await React.act(async () => root.unmount()); container.remove(); }
const click = async (el) => { expect(el, 'element to click').toBeTruthy(); await React.act(async () => { el.click(); }); };
const key = async (el, k) => React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true })); });
async function type(input, value) {
  expect(input, 'input').toBeTruthy();
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const byText = (c, text) => Array.from(c.querySelectorAll('button')).find((b) => (b.textContent || '').includes(text));
const tabIds = (c) => Array.from(c.querySelectorAll('[role="tab"]')).map((tb) => tb.id.replace('stem-angles-tab-', ''));
const reveal = (c, k) => c.querySelector('[data-angles-reveal="' + k + '"]');
const aiBtn = (c, k) => c.querySelector('[data-angles-ai="' + k + '"]');

const ALL = ['protractor', 'explore', 'challenges', 'puzzles', 'polygons', 'circles', 'contexts', 'construct', 'tools', 'reference'];

describe('band-aware tabs', () => {
  for (const [band, order, core] of [
    ['g35', ['protractor', 'challenges', 'explore', 'puzzles', 'polygons', 'contexts', 'circles', 'construct', 'tools', 'reference'], ['protractor', 'challenges']],
    ['g68', ['puzzles', 'polygons', 'contexts', 'protractor', 'challenges', 'explore', 'circles', 'construct', 'tools', 'reference'], ['puzzles', 'polygons', 'contexts']],
    ['g912', ['circles', 'construct', 'puzzles', 'polygons', 'contexts', 'protractor', 'challenges', 'explore', 'tools', 'reference'], ['circles', 'construct']],
  ]) {
    it(band + ': the core activities come first and open by default; all ten stay reachable; Reference is last', async () => {
      const c = await mount({ protractor: {} }, { gradeBand: band });
      expect(tabIds(c)).toEqual(order);
      expect(tabIds(c).slice().sort()).toEqual(ALL.slice().sort());
      expect(c.querySelector('[role="tab"][aria-selected="true"]').id).toBe('stem-angles-tab-' + order[0]);
      const marked = Array.from(c.querySelectorAll('[data-angles-core-tab="true"]')).map((tb) => tb.id.replace('stem-angles-tab-', ''));
      expect(marked).toEqual(core);
      // Core tabs say so to assistive tech; the note exists.
      const first = c.querySelector('#stem-angles-tab-' + core[0]);
      expect(c.querySelector('#' + first.getAttribute('aria-describedby')).textContent).toMatch(/core activities/);
      // The first "more" activity starts a new row of the grid.
      expect(c.querySelector('#stem-angles-tab-' + order[core.length]).style.gridColumnStart).toBe('1');
      // Arrow keys walk the band order.
      await key(c.querySelector('#stem-angles-tab-' + order[0]), 'ArrowRight');
      expect(live.d.activeTab).toBe(order[1]);
    });
  }
  it('a saved tab still wins; picking another level reorders the tabs; a teacher lock hides the path', async () => {
    const c = await mount({ protractor: { activeTab: 'construct' } }, { gradeBand: 'g35' });
    expect(c.querySelector('[role="tab"][aria-selected="true"]').id).toBe('stem-angles-tab-construct');
    await unmountLast();
    const p = await mount({ protractor: { activeTab: 'puzzles' } }, { gradeBand: 'g35' });
    // 2026-11-04 engagement build: the three level buttons became one level menu named by skill.
    const levelMenu = p.querySelector('[data-angles-level-select]');
    expect(Array.from(levelMenu.options).find((o) => o.value === 'g8').textContent).toBe('Transversals, circles and radians (Grade 8 and up)');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(levelMenu, 'g8');
      levelMenu.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    expect(tabIds(p)[0]).toBe('circles');
    expect(p.querySelector('[data-angles-path]').getAttribute('data-angles-path')).toBe('g8');
    await unmountLast();
    const l = await mount({ protractor: { teacher: { lockTab: 'polygons' } } }, { gradeBand: 'g35' });
    expect(tabIds(l)).toEqual(['polygons', 'reference']);
    expect(l.querySelector('[data-angles-path]')).toBe(null);
    expect(l.querySelector('[data-angles-core-tab]')).toBe(null);
  });
});

describe('"Start here" learning path', () => {
  const steps = (c) => Array.from(c.querySelectorAll('[data-angles-path-step]')).map((li) => [li.getAttribute('data-angles-path-step'), li.getAttribute('data-done')]);
  it('grade 4: protractor and estimate first; ticks come from saved credits and counts', async () => {
    const c = await mount({ protractor: { credited: { 'read:40:1:62': 1, 'cmp:40:75:120': 1 }, estimateCount: 1 } }, { gradeBand: 'g35' });
    expect(steps(c)).toEqual([['read', 'true'], ['draw', 'false'], ['estimate', 'true'], ['compare', 'true'], ['classify', 'false'], ['puzzle', 'false']]);
    expect(c.querySelector('[data-angles-path-count]').textContent).toBe('3 of 6 done');
    const next = c.querySelector('[data-angles-path-step="draw"] button');
    expect(next.getAttribute('aria-current')).toBe('step');
    expect(c.querySelector('[data-angles-path-step="read"] button').textContent).toMatch(/Done/);
    await click(c.querySelector('[data-angles-path-step="estimate"] button'));
    expect(live.d.activeTab).toBe('challenges');
    expect(live.d.estimateActive).toBe(true);
    expect(c.querySelector('[data-angles-estimate-svg]')).toBeTruthy();
    await click(c.querySelector('[data-angles-path-step="classify"] button'));
    expect(live.angleChallenge.type).toBe('classify');
    expect(live.d.estimateActive).toBe(false);
  });
  it('grades 5–7: puzzles, polygons and real world; a tick appears when the work is done', async () => {
    const vert = { kind: 'vert', a: 70, ask: 'vertical', askPos: 2, answer: 70, rot: 0, id: 'vert:70:2' };
    const c = await mount({ protractor: { activeTab: 'puzzles', pz: vert, pzKind: 'vert', pzSolved: { vert: 3 }, pgInv: { claim: true } } }, { gradeBand: 'g68' });
    expect(steps(c)).toEqual([['puzzles', 'true'], ['why', 'false'], ['pgsum', 'true'], ['pgext', 'false'], ['context', 'false']]);
    await type(c.querySelector('#stem-angles-pz-input'), '70');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    await click(byText(c, 'Vertical angles (across a crossing) are equal.'));
    expect(c.querySelector('[data-angles-path-step="why"]').getAttribute('data-done')).toBe('true');
    await click(c.querySelector('[data-angles-path-step="pgext"] button'));
    expect(live.d).toMatchObject({ activeTab: 'polygons', pgMode: 'ext' });
  });
  it('grade 8+: circles, the unit circle and constructions; steps open the right activity', async () => {
    const c = await mount({ protractor: { conSolved: { bisect: 1 }, ucSolved: { coord: 2, conv: 1 } } }, { gradeBand: 'g912' });
    expect(steps(c)).toEqual([['circle', 'false'], ['unit', 'true'], ['bisect', 'true'], ['copy', 'false'], ['trans', 'false']]);
    await click(c.querySelector('[data-angles-path-step="unit"] button'));
    expect(live.d).toMatchObject({ activeTab: 'circles', ciMode: 'unit', ucView: 'practice' });
    await click(c.querySelector('[data-angles-path-step="copy"] button'));
    expect(live.d.activeTab).toBe('construct');
    expect(live.d.conKind).toBe('copy');
    await click(c.querySelector('[data-angles-path-step="trans"] button'));
    expect(live.d.activeTab).toBe('puzzles');
    expect(live.d.pz.kind).toBe('trans');
    expect(errors).toEqual([]);
  });
});

describe('one reveal rule: a second try, then the answer on demand, never by itself', () => {
  const readTask = { base: 40, open: 1, m: 62, vx: 210, vy: 175, tol: 1, start: { x: 130, y: 240, rot: 0 } };
  const CARDS = [
    ['pgp', { activeTab: 'polygons', pgMode: 'practice', level: 'g57', pgpT: { kind: 'sum', n: 7, answer: 900, id: 'pg:sum:7' }, pgpKind: 'sum', pgSolved: { sum: 2 } }, 'Check my answer', ['1260', '1000'], /The answer is 900°/, 'polygon practice'],
    ['cit', { activeTab: 'circles', ciMode: 'inscribed', level: 'g8', citT: { kind: 'inscribed', a: 0, b: 100, p: 230, m: 100, ask: 'insc', given: 100, answer: 50, id: 'ci:insc:100:insc' } }, 'Check my prediction', ['100', '200'], /The angle is 50°/, 'circle theorem'],
    ['uct', { activeTab: 'circles', ciMode: 'unit', ucView: 'practice', level: 'g8', uctT: { kind: 'pinum', k: 1, den: 2, c: 1, answer: 2.57, id: 'uc:pinum:1-2-1' } }, 'Check my answer', ['91', '1'], /2\.57/, 'unit circle'],
    ['cxt', { activeTab: 'contexts', cxMode: 'clock', cxtT: { kind: 'clock', h: 4, m: 20, answer: 10, id: 'cx:clock:4:20' } }, 'Check my answer', ['20', '30'], /10°/, 'angle in context'],
  ];
  for (const [pf, state, checkName, wrongs, shown, reason] of CARDS) {
    it(pf + ' task card', async () => {
      const c = await mount({ protractor: state });
      const input = c.querySelector('#stem-angles-' + pf + '-input');
      await type(input, wrongs[0]);
      await click(c.querySelector('button[aria-label="' + checkName + '"]'));
      expect(reveal(c, pf), 'no reveal after one try').toBe(null);
      await type(c.querySelector('#stem-angles-' + pf + '-input'), wrongs[1]);
      await click(c.querySelector('button[aria-label="' + checkName + '"]'));
      expect(live.d[pf + 'Res'].revealed, 'revealed by itself').toBeFalsy();
      expect(c.querySelector('[data-angles-task-solution]')).toBe(null);
      expect(c.querySelector('button[aria-label="' + checkName + '"]').disabled, 'a third try is allowed').toBe(false);
      expect(c.querySelector('[data-angles-after-two="' + pf + '"]').textContent).toMatch(/earns no points/);
      await click(reveal(c, pf));
      expect(live.d[pf + 'Res'].revealed).toBe(true);
      expect(c.querySelector('[data-angles-task-result]').textContent).toMatch(shown);
      expect(c.querySelector('button[aria-label="' + checkName + '"]').disabled).toBe(true);
      expect(xp.filter((a) => a[2] === reason)).toEqual([]);
    });
  }
  it('protractor read, draw and compare', async () => {
    const r = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: readTask, mPlace: { x: 210, y: 175, rot: 40 } } });
    for (const v of ['118', '119']) { await type(r.querySelector('#stem-angles-read-input'), v); await click(r.querySelector('button[aria-label="Check my reading"]')); }
    expect(live.d.mResult.revealed).toBeFalsy();
    expect(r.textContent.includes('measures 62°')).toBe(false);
    await click(reveal(r, 'read'));
    expect(r.textContent.includes('The angle measures 62°')).toBe(true);
    await unmountLast();
    const dTask = { base: 200, open: -1, m: 70, vx: 210, vy: 175, tol: 1, start: { x: 290, y: 240, rot: 0 }, drawStart: 230 };
    const d = await mount({ protractor: { activeTab: 'protractor', mMode: 'draw', dTask, dDir: 310 } });
    await click(d.querySelector('button[aria-label="Check my drawing"]'));
    await click(d.querySelector('button[aria-label="Check my drawing"]'));
    expect(live.d.dResult.revealed).toBeFalsy();
    await click(reveal(d, 'draw'));
    expect(live.d.dResult.revealed).toBe(true);
    expect(live.d.dPlace).toEqual({ x: 210, y: 175, rot: 20 });
    await unmountLast();
    const cTask = { a: { m: 40, len: 120, base: 10 }, b: { m: 75, len: 60, base: 200 }, answer: 'B' };
    const k = await mount({ protractor: { activeTab: 'protractor', mMode: 'compare', cTask } });
    await click(byText(k, 'A is larger')); await click(byText(k, 'Same size'));
    expect(live.d.cResult.revealed).toBeFalsy();
    expect(byText(k, 'B is larger').disabled).toBe(false);
    await click(reveal(k, 'compare'));
    expect(k.textContent).toMatch(/Angle A opens 40° and angle B opens 75°/);
    expect(xp).toEqual([]);
  });
  it('polygon evidence row and a claim step', async () => {
    const c = await mount({ protractor: { activeTab: 'polygons', pgMode: 'sum', pgPred: { pick: 'p_360', locked: true }, pgN: 5, pgSeed: 7, pgDiags: [[0, 2], [0, 3]] } });
    const fillRow = async (tri, sum) => {
      const [ti, si] = Array.from(c.querySelectorAll('[data-angles-step="pg-evidence"] input'));
      await type(ti, tri); await type(si, sum); await click(byText(c, 'Record this row'));
    };
    await fillRow('5', '900');
    await fillRow('3', '360');
    expect(live.d.pgRow.revealed).toBeFalsy();
    expect((live.d.pgRuns || {})[5], 'no row filled in by itself').toBeFalsy();
    await click(reveal(c, 'pg-row'));
    expect(live.d.pgRuns[5]).toEqual({ tri: 3, sum: 540, revealed: true });
    expect(xp.filter((a) => a[2] === 'polygon evidence')).toEqual([]);
    await unmountLast();
    const runs = { 3: { tri: 1, sum: 180 }, 4: { tri: 2, sum: 360 }, 5: { tri: 3, sum: 540 } };
    const k = await mount({ protractor: { activeTab: 'polygons', pgMode: 'sum', pgPred: { pick: 'p_360', locked: true }, pgRuns: runs } });
    await click(byText(k, 'Angle sum = n × 180°'));
    await click(byText(k, 'Angle sum = 360° for every polygon'));
    expect(live.d.pgClaim.revealed).toBeFalsy();
    expect(k.querySelector('[data-angles-step="pg-why"]'), 'the next step waits').toBe(null);
    expect(byText(k, 'Angle sum = (n − 2) × 180°').disabled).toBe(false);
    await click(reveal(k, 'pg-claim'));
    expect(live.d.pgClaim.revealed).toBe(true);
    expect(k.textContent).toMatch(/The rule that fits every row is/);
    expect(k.querySelector('[data-angles-step="pg-why"]')).toBeTruthy();
    expect(xp).toEqual([]);
  });
  it('the puzzle reason step obeys "no reveals" (it used to show the rule on the second miss regardless)', async () => {
    const vert = { kind: 'vert', a: 70, ask: 'vertical', askPos: 2, answer: 70, rot: 0, id: 'vert:70:2' };
    for (const noReveal of [true, false]) {
      const c = await mount({ protractor: { activeTab: 'puzzles', level: 'g57', pz: vert, pzKind: 'vert', pzSolved: { vert: 3 }, teacher: { noReveal } } });
      await type(c.querySelector('#stem-angles-pz-input'), '70');
      await click(c.querySelector('button[aria-label="Check my answer"]'));
      const wrongs = Array.from(c.querySelectorAll('fieldset button')).filter((b) => !/Vertical angles/.test(b.textContent)).slice(0, 2);
      for (const w of wrongs) await click(w);
      expect(live.d.pzReason.revealed, 'noReveal=' + noReveal).toBeFalsy();
      expect(!!reveal(c, 'reason'), 'reveal button, noReveal=' + noReveal).toBe(!noReveal);
      if (!noReveal) { await click(reveal(c, 'reason')); expect(live.d.pzReason.revealed).toBe(true); }
      await unmountLast();
    }
  });
  it('Challenges classify: a miss crosses off that type and allows a second try with partial credit', async () => {
    const c = await mount({ angleValue: 120, angleChallenge: { type: 'classify', target: 120 }, protractor: { activeTab: 'challenges' } });
    await click(byText(c, 'Acute'));
    expect(c.textContent).toMatch(/Not Acute\. Compare 120° with a right angle/);
    expect(byText(c, 'Acute').disabled).toBe(true);
    expect(byText(c, 'Obtuse').disabled, 'second try').toBe(false);
    expect(live.angleChallenge.done).toBeFalsy();
    await click(byText(c, 'Obtuse'));
    expect(live.angleChallenge.done).toBe(true);
    expect(xp.filter((a) => a[2] === 'classify angle')).toEqual([['protractor', 3, 'classify angle']]);
    expect(live.exploreScore).toEqual({ correct: 1, total: 1 });
    await unmountLast();
    xp = [];
    const r = await mount({ angleValue: 120, angleChallenge: { type: 'classify', target: 120 }, protractor: { activeTab: 'challenges' } });
    await click(byText(r, 'Acute')); await click(byText(r, 'Reflex'));
    expect(live.angleChallenge.done).toBeFalsy();
    await click(reveal(r, 'challenge-classify'));
    expect(r.textContent).toMatch(/120° is Obtuse\./);
    expect(xp.filter((a) => a[2] === 'classify angle')).toEqual([]);
  });
  it('Challenges create: after two misses the target can be shown, for no credit', async () => {
    const c = await mount({ angleValue: 0, angleChallenge: { type: 'create', target: 105 }, protractor: { activeTab: 'challenges' } });
    await click(c.querySelector('button[aria-label="Check"]'));
    expect(reveal(c, 'challenge-create')).toBe(null);
    await React.act(async () => { const s = c.querySelector('input[data-angles-create-slider]'); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(s, '20'); s.dispatchEvent(new window.Event('input', { bubbles: true })); });
    await click(c.querySelector('button[aria-label="Check"]'));
    await click(reveal(c, 'challenge-create'));
    expect(live.angleValue).toBe(105);
    expect(live.angleChallenge).toMatchObject({ done: true, revealed: true });
    expect(xp.filter((a) => a[2] === 'create angle')).toEqual([]);
  });
});

describe('AI nudge through ctx.getHint (stubbed)', () => {
  const pgp = { activeTab: 'polygons', pgMode: 'practice', level: 'g57', pgpT: { kind: 'sum', n: 7, answer: 900, id: 'pg:sum:7' }, pgpKind: 'sum', pgSolved: { sum: 2 } };
  async function twoMisses(c, pf, wrongs, checkName) {
    for (const w of wrongs) { await type(c.querySelector('#stem-angles-' + pf + '-input'), w); await click(c.querySelector('button[aria-label="' + checkName + '"]')); }
  }
  it('offered only after two tries; calls the host with the question and answer; shows and announces the reply; resets on a new question', async () => {
    const calls = [];
    const getHint = (tool, q, wrong, right, tries, cb) => { calls.push({ tool, q, wrong, right, tries }); cb('💡 Count the triangles first.  — AI hint, may be imperfect'); };
    const c = await mount({ protractor: pgp }, { getHint, aiHintsEnabled: true });
    await twoMisses(c, 'pgp', ['1260'], 'Check my answer');
    expect(aiBtn(c, 'pgp'), 'not after one try').toBe(null);
    await twoMisses(c, 'pgp', ['1000'], 'Check my answer');
    await click(aiBtn(c, 'pgp'));
    expect(calls).toEqual([{ tool: 'protractor', q: 'A polygon has 7 sides. What do its interior angles add up to?', wrong: '1000', right: '900°', tries: 2 }]);
    expect(c.querySelector('[data-angles-ai-text="pgp"]').textContent).toMatch(/Count the triangles first/);
    expect(said.slice(-1)[0]).toMatch(/Count the triangles first/);
    expect(aiBtn(c, 'pgp'), 'one nudge per question').toBe(null);
    await click(byText(c, 'Next question'));
    expect(c.querySelector('[data-angles-ai-text]')).toBe(null);
  });
  it('every stage-B card offers it; none when AI is off, missing, or the answer is shown; a throwing host does not break the tab', async () => {
    const stub = () => {};
    for (const [pf, state, wrongs, checkName] of [
      ['cit', { activeTab: 'circles', ciMode: 'inscribed', level: 'g8', citT: { kind: 'inscribed', a: 0, b: 100, p: 230, m: 100, ask: 'insc', given: 100, answer: 50, id: 'ci:insc:100:insc' } }, ['100', '200'], 'Check my prediction'],
      ['uct', { activeTab: 'circles', ciMode: 'unit', ucView: 'practice', level: 'g8', uctT: { kind: 'pinum', k: 1, den: 2, c: 1, answer: 2.57, id: 'uc:pinum:1-2-1' } }, ['91', '1'], 'Check my answer'],
      ['cxt', { activeTab: 'contexts', cxMode: 'clock', cxtT: { kind: 'clock', h: 4, m: 20, answer: 10, id: 'cx:clock:4:20' } }, ['20', '30'], 'Check my answer'],
    ]) {
      const c = await mount({ protractor: state }, { getHint: stub });
      await twoMisses(c, pf, wrongs, checkName);
      expect(aiBtn(c, pf), pf).toBeTruthy();
      await click(reveal(c, pf));
      expect(aiBtn(c, pf), pf + ' after the reveal').toBe(null);
      await unmountLast();
    }
    for (const extra of [{ getHint: stub, aiHintsEnabled: false }, {}]) {
      const c = await mount({ protractor: pgp }, extra);
      await twoMisses(c, 'pgp', ['1260', '1000'], 'Check my answer');
      expect(aiBtn(c, 'pgp')).toBe(null);
      expect(reveal(c, 'pgp'), 'the offline path keeps the reveal').toBeTruthy();
      await unmountLast();
    }
    const c = await mount({ protractor: pgp }, { getHint: () => { throw new Error('host down'); } });
    await twoMisses(c, 'pgp', ['1260', '1000'], 'Check my answer');
    await click(aiBtn(c, 'pgp'));
    expect(c.querySelector('[data-angles-after-two="pgp"]')).toBeTruthy();
    expect(errors).toEqual([]);
  });
  it('a nudge saved for another question is not shown', async () => {
    const c = await mount({ protractor: Object.assign({}, pgp, { pgpTries: 2, pgpRes: { code: 'n180' }, pgpA: '1260', pgpAi: { id: 'pg:sum:9', text: 'old hint' } }) }, { getHint: () => {} });
    expect(c.textContent.includes('old hint')).toBe(false);
    expect(aiBtn(c, 'pgp')).toBeTruthy();
  });
  it('puzzles: the nudge waits for two tries (the host refuses before that, so the old one-try button did nothing)', async () => {
    const calls = [];
    const comp = { kind: 'comp', a: 35, answer: 55, rot: 0, id: 'comp:35' };
    const c = await mount({ protractor: { activeTab: 'puzzles', level: 'g57', pz: comp, pzKind: 'comp', pzSolved: { comp: 2 } } }, { getHint: (...a) => { calls.push(a); a[5]('try 90'); } });
    await type(c.querySelector('#stem-angles-pz-input'), '145');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(byText(c, 'Ask the AI for a nudge'), 'offered after one try').toBeFalsy();
    await type(c.querySelector('#stem-angles-pz-input'), '45');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    await click(aiBtn(c, 'pz'));
    expect(calls[0].slice(0, 5)).toEqual(['protractor', 'The two angles together make a right angle. One is 35°. Find x.', '45', '55°', 2]);
    expect(live.d.pzAiHint).toEqual({ id: 'comp:35', text: 'try 90' });
  });
});

describe('quest labels', () => {
  it('quest labels and progress use the last render’s translator', async () => {
    const cfg = window.StemLab._registry.protractor;
    expect(cfg.questHooks.map((q) => q.id)).toEqual(['pin_3_angles', 'use_bisector', 'explore_challenges']);
    expect(cfg.questHooks[0].label).toBe('Save 3 angle measurements');
    await mount({ protractor: {} }, { t: (k, fb) => (/^stem\.angles\.quest_/.test(k) ? 'FR:' + k.slice(18) : fb) });
    expect(cfg.questHooks.map((q) => q.label)).toEqual(['FR:pin3', 'FR:bisector', 'FR:challenges']);
    expect(cfg.questHooks[0].progress({ anglePins: [{ deg: 1 }] })).toBe('FR:pins_of');
    await unmountLast();
    await mount({ protractor: {} });
    expect(cfg.questHooks[0].progress({ anglePins: [{ deg: 1 }, { deg: 2 }] })).toBe('2/3 pins');
    expect(cfg.questHooks[2].progress({ activeTab: 'challenges' })).toBe('Exploring!');
  });
});
