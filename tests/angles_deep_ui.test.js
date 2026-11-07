// Angle Explorer deep rebuild (2026-11-03), through a live mount with the
// hub's hosted state. Regressions for the 2026-11-03 review (calc_angles_report:
// estimate leaks, double badge check, mislabelled buttons, "vertical angle 270",
// no protractor on Challenges, dangling aria-controls) and the new protractor,
// puzzle, estimate and teacher flows. ANGLES_DEEP_SRC points at another copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mounted = [];
let live = null;
let xp = [];
let toasts = [];
let errors = [];

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'protractor');
  live = null; xp = []; toasts = []; errors = [];
  vi.spyOn(console, 'error').mockImplementation((...a) => { errors.push(a.map(String).join(' ').slice(0, 300)); });
});

afterEach(async () => {
  vi.restoreAllMocks();
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
});

async function mount(init, extra) {
  const cfg = window.StemLab._registry.protractor;
  const container = document.createElement('div');
  document.body.appendChild(container);
  function Host() {
    const [angleValue, setAngleValue] = React.useState(init.angleValue != null ? init.angleValue : 45);
    const [angleChallenge, setAngleChallenge] = React.useState(init.angleChallenge || null);
    const [angleFeedback, setAngleFeedback] = React.useState(init.angleFeedback || null);
    const [exploreScore, setExploreScore] = React.useState(init.exploreScore || { correct: 0, total: 0 });
    const [toolData, setToolData] = React.useState({ protractor: init.protractor || {}, angles: init.angles || {} });
    live = { angleValue, angleChallenge, angleFeedback, exploreScore, d: toolData.protractor || {} };
    const update = (slot, key, val) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, { [key]: val }) }));
    const updateMulti = (slot, obj) => setToolData((p) => Object.assign({}, p, { [slot]: Object.assign({}, p[slot] || {}, obj) }));
    return cfg.render(makeCtx(Object.assign({
      toolData, setToolData, update, updateMulti,
      angleValue, setAngleValue, angleChallenge, setAngleChallenge, angleFeedback, setAngleFeedback,
      exploreScore, setExploreScore,
      awardXP: (id, n, why) => xp.push([id, n, why]),
      addToast: (m) => toasts.push(m),
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
const key = async (el, k, opts) => React.act(async () => { el.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, opts || {}))); });
async function type(input, value) {
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const byText = (c, text) => Array.from(c.querySelectorAll('button')).find((b) => (b.textContent || '').includes(text));
const xpFor = (why) => xp.filter((a) => a[2] === why);

describe('review bugs: estimate leaks are closed', () => {
  const est = { angleValue: 75, protractor: { activeTab: 'explore', estimateActive: true, estimateTarget: 75, showSecondRay: true, secondAngle: 0, anglePins: [{ deg: 30 }] } };
  it('no "Between" label, no pin, no number on the ray handle, no tick labels', async () => {
    const c = await mount(est);
    const svgText = Array.from(c.querySelectorAll('[data-protractor-svg] text')).map((t) => t.textContent).join(' | ');
    expect(/Between/.test(svgText), svgText).toBe(false);
    expect(/\b(30|60|90|120|150|180)°/.test(svgText), 'tick labels give the estimate away: ' + svgText).toBe(false);
    const handle = c.querySelector('[aria-label="Angle ray handle"]');
    expect(handle.getAttribute('aria-valuenow'), 'handle value').toBe(null);
    const pin = c.querySelector('button[aria-label="Pin this angle on the protractor"]');
    expect(pin.disabled).toBe(true);
    await React.act(async () => { pin.disabled = false; pin.click(); });
    expect((live.d.anglePins || []).length, 'pin added during an estimate').toBe(1);
    expect(c.textContent.includes('30° ✕'), 'old pin chips still print numbers').toBe(false);
  });
});

describe('review bugs: one badge check per answer', () => {
  it('a correct estimate that earns two badges pays each once and keeps both', async () => {
    const c = await mount({ angleValue: 45, protractor: { activeTab: 'challenges', estimateActive: true, estimateTarget: 45, estimateGuess: '45', streak: 4, estimateCount: 2, earnedBadges: {} } });
    await click(c.querySelector('button[aria-label="Check"]'));
    const earned = Object.keys(live.d.earnedBadges || {});
    expect(earned.includes('streak_5'), 'On Fire kept: ' + earned).toBe(true);
    expect(earned.includes('estimator')).toBe(true);
    expect(xp.filter((x) => x[0] === 'protractor_badge_first_angle').length).toBe(1);
    expect(xp.filter((x) => x[0] === 'protractor_badge_streak_5').length).toBe(1);
    expect(toasts.filter((m) => /First Angle/.test(m)).length).toBe(1);
  });
  it('a speed badge pays no XP', async () => {
    vi.useFakeTimers();
    try {
      const c = await mount({ protractor: { activeTab: 'challenges', soundEnabled: false } });
      await click(c.querySelector('button[aria-label="Speed Round"]'));
      await React.act(async () => { window.__anglesSpeedScore = 12; vi.advanceTimersByTime(31000); });
      expect(Object.keys(live.d.earnedBadges || {}).includes('speed_demon')).toBe(true);
      expect(xp.filter((x) => x[0] === 'protractor_badge_speed_demon').length).toBe(0);
    } finally { vi.useRealTimers(); }
  });
});

describe('review bugs: names, vertical angles, tabs', () => {
  it('pin chips, snapshot, SVG and sound buttons say what they do', async () => {
    const c = await mount({ angleValue: 60, protractor: { activeTab: 'explore', anglePins: [{ deg: 30 }, { deg: 120 }] } });
    expect(c.querySelector('button[aria-label="Remove the pin at 30 degrees"]')).toBeTruthy();
    expect(c.querySelector('button[aria-label="Remove the pin at 120 degrees"]')).toBeTruthy();
    expect(c.querySelector('button[aria-label="Complementary"]'), 'pin chips named Complementary').toBe(null);
    expect(c.querySelector('button[aria-label="Export S V G"]'), 'snapshot named Export SVG').toBe(null);
    const sound = c.querySelector('button[aria-label="Sound effects"]');
    expect(sound.getAttribute('aria-pressed')).toBe('true');
    // No two buttons in the explore tab share an accessible name but do different things.
    const names = Array.from(c.querySelectorAll('button')).map((b) => b.getAttribute('aria-label') || b.textContent.trim());
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dup, 'duplicate names').toEqual([]);
  });
  it('no vertical angle is claimed for 0, 180 or reflex angles', async () => {
    for (const a of [0, 180, 270, 359]) {
      const c = await mount({ angleValue: a, protractor: { activeTab: 'explore' } });
      const box = Array.from(c.querySelectorAll('div')).find((d) => d.textContent.startsWith('Vertical Angle') && d.className.includes('indigo'));
      expect(box.textContent.startsWith('Vertical Angle' + a + '°'), a + ': ' + box.textContent).toBe(false);
      expect(box.textContent.includes('Vertical angles are equal'), a + ': ' + box.textContent).toBe(false);
      await unmountLast();
    }
    const c2 = await mount({ angleValue: 70, protractor: { activeTab: 'explore' } });
    expect(c2.textContent.includes('Vertical angles are equal')).toBe(true);
  });
  it('every tab’s aria-controls points to an element that exists', async () => {
    for (const tab of ['protractor', 'explore', 'challenges', 'puzzles', 'tools', 'reference']) {
      const c = await mount({ protractor: { activeTab: tab } });
      const tabs = Array.from(c.querySelectorAll('[role="tab"]'));
      // Stage B added Polygons, Circles, Real world and Construct.
      expect(tabs.length).toBe(10);
      for (const tb of tabs) expect(c.querySelector('#' + tb.getAttribute('aria-controls')), tab + ' -> ' + tb.id).toBeTruthy();
      await unmountLast();
    }
  });
  it('the Challenges tab carries a protractor for a create challenge', async () => {
    const c = await mount({ angleValue: 0, angleChallenge: { type: 'create', target: 105 }, protractor: { activeTab: 'challenges' } });
    expect(c.querySelector('[data-protractor-svg]')).toBeTruthy();
    expect(c.querySelector('input[data-angles-create-slider]')).toBeTruthy();
  });
  // Stage C: the first tab follows the band; at grade 4 it is the protractor.
  it('the library sits behind the activities: only on the Reference tab, and the protractor tab is first at grade 4', async () => {
    const c = await mount({ protractor: {} }, { gradeBand: 'g35' });
    expect(c.querySelector('[role="tab"]').id).toBe('stem-angles-tab-protractor');
    expect(c.querySelector('[role="tab"][aria-selected="true"]').id).toBe('stem-angles-tab-protractor');
    expect(c.querySelector('[data-angles-library]'), 'library on the protractor tab').toBe(null);
    await unmountLast();
    const r = await mount({ protractor: { activeTab: 'reference' }, angles: { expSection: 'glossary' } });
    expect(r.querySelector('[data-angles-library]')).toBeTruthy();
    expect(r.textContent.includes('Vertex angle')).toBe(true);
  });
});

describe('protractor: read an angle', () => {
  const task = { base: 40, open: 1, m: 62, vx: 210, vy: 175, tol: 1, start: { x: 130, y: 240, rot: 0 } };
  it('names a misplaced centre, then credits a correct reading once', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task, mPlace: { x: 130, y: 240, rot: 0 } } });
    const input = c.querySelector('#stem-angles-read-input');
    await type(input, '70');
    await click(c.querySelector('button[aria-label="Check my reading"]'));
    expect(live.d.mResult.code).toBe('vertex_off');
    expect(c.textContent.includes('centre is not on the vertex')).toBe(true);
    // Place it properly and read again: second try, credited once.
    await React.act(async () => {});
    const c2 = c;
    const prot = c2.querySelector('[data-angles-protractor]');
    // Keyboard: 8 steps right and 6 steps up (10 units each) land on the vertex.
    for (let i = 0; i < 8; i++) await key(prot, 'ArrowRight');
    for (let i = 0; i < 6; i++) await key(c2.querySelector('[data-angles-protractor]'), 'ArrowUp');
    expect(live.d.mPlace.x).toBe(210);
    expect(live.d.mPlace.y).toBe(175);
    for (let i = 0; i < 40; i++) await key(c2.querySelector('[data-angles-protractor]'), 'PageUp');
    expect(live.d.mPlace.rot).toBe(40);
    expect(c2.querySelector('[data-angles-prot-desc]').textContent).toMatch(/centre is on the vertex/);
    expect(c2.querySelector('[data-angles-prot-desc]').textContent).toMatch(/inner scale at 62 /);
    await type(c2.querySelector('#stem-angles-read-input'), '62');
    const check = c2.querySelector('button[aria-label="Check my reading"]');
    await React.act(async () => { check.click(); check.click(); });
    expect(live.d.mResult.ok).toBe(true);
    expect(xpFor('protractor reading')).toEqual([['protractor', 3, 'protractor reading']]);
    expect(live.exploreScore).toEqual({ correct: 1, total: 1 });
  });
  // Stage C: after two misses the answer is offered on demand, never shown by itself.
  it('names the wrong scale; after a second miss the answer is on demand, places the protractor, and gives no credit', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task, mPlace: { x: 210, y: 175, rot: 40 } } });
    await type(c.querySelector('#stem-angles-read-input'), '118');
    await click(c.querySelector('button[aria-label="Check my reading"]'));
    expect(live.d.mResult.code).toBe('wrong_scale');
    expect(c.textContent.includes('You read the other scale')).toBe(true);
    expect(live.d.mResult.revealed).toBeFalsy();
    expect(c.querySelector('[data-angles-reveal]'), 'no reveal after one try').toBe(null);
    await type(c.querySelector('#stem-angles-read-input'), '119');
    await click(c.querySelector('button[aria-label="Check my reading"]'));
    expect(live.d.mResult.revealed, 'a second miss does not reveal by itself').toBeFalsy();
    expect(c.querySelector('button[aria-label="Check my reading"]').disabled, 'a third try is allowed').toBe(false);
    await click(c.querySelector('[data-angles-reveal="read"]'));
    expect(live.d.mResult.revealed).toBe(true);
    expect(live.d.mPlace).toEqual({ x: 210, y: 175, rot: 40 });
    expect(c.querySelector('button[aria-label="Check my reading"]').disabled).toBe(true);
    expect(xpFor('protractor reading').length).toBe(0);
    expect((live.d.misTally || {}).wrong_scale).toBe(2);
  });
  it('the answer is not on screen before the attempt', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'read', mTask: task, mPlace: task.start } });
    const svgText = Array.from(c.querySelectorAll('[data-angles-measure-svg] text')).map((t) => t.textContent);
    expect(svgText.includes('62°')).toBe(false);
    expect(c.textContent.includes('62°')).toBe(false);
  });
});

describe('protractor: draw and compare', () => {
  it('a ray drawn to the target is credited; one on the other scale is named', async () => {
    const dTask = { base: 200, open: -1, m: 70, vx: 210, vy: 175, tol: 1, start: { x: 290, y: 240, rot: 0 }, drawStart: 230 };
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'draw', dTask, dDir: 200 + 110 } });
    await click(c.querySelector('button[aria-label="Check my drawing"]'));
    expect(live.d.dResult.code).toBe('wrong_scale');
    const ray = c.querySelector('[aria-label="Ray you are drawing"]');
    expect(ray.getAttribute('aria-valuetext')).toMatch(/o’clock/);
    // Turn the ray clockwise by 40: 310 -> 270 = base + 70.
    for (let i = 0; i < 4; i++) await key(c.querySelector('[aria-label="Ray you are drawing"]'), 'ArrowRight', { shiftKey: true });
    expect(live.d.dDir).toBe(270);
    await click(c.querySelector('button[aria-label="Check my drawing"]'));
    expect(live.d.dResult.ok).toBe(true);
    expect(xpFor('protractor drawing')).toEqual([['protractor', 3, 'protractor drawing']]);
  });
  it('choosing the long-ray angle names the ray-length misconception', async () => {
    const cTask = { a: { m: 40, len: 120, base: 10 }, b: { m: 75, len: 60, base: 200 }, answer: 'B' };
    const c = await mount({ protractor: { activeTab: 'protractor', mMode: 'compare', cTask } });
    await click(byText(c, 'A is larger'));
    expect(live.d.cResult.code).toBe('ray_length');
    expect(c.textContent.includes('Longer rays do not make a bigger angle')).toBe(true);
    await click(byText(c, 'B is larger'));
    expect(live.d.cResult.ok).toBe(true);
    expect(xpFor('compare angles').length, 'no credit on a second try').toBe(0);
  });
});

describe('angle puzzles', () => {
  const comp = { kind: 'comp', a: 35, answer: 55, rot: 0, id: 'comp:35' };
  it('a worked example fades: full, then set-up only, then none', async () => {
    const c0 = await mount({ protractor: { activeTab: 'puzzles', level: 'g57', pz: comp, pzKind: 'comp' } });
    const full = c0.querySelector('[data-angles-worked="full"]');
    expect(full).toBeTruthy();
    expect(full.textContent.includes('= 55°'), 'the example is not this puzzle').toBe(false);
    await unmountLast();
    const c1 = await mount({ protractor: { activeTab: 'puzzles', level: 'g57', pz: comp, pzKind: 'comp', pzSolved: { comp: 1 } } });
    expect(c1.querySelector('[data-angles-worked="setup"]').textContent).toMatch(/35 \+ x = 90/);
    await unmountLast();
    const c2 = await mount({ protractor: { activeTab: 'puzzles', level: 'g57', pz: comp, pzKind: 'comp', pzSolved: { comp: 2 } } });
    expect(c2.querySelector('[data-angles-worked]')).toBe(null);
  });
  it('names "used 180", offers the answer after a second miss without credit, then credits a new one', async () => {
    const c = await mount({ protractor: { activeTab: 'puzzles', level: 'g57', pz: comp, pzKind: 'comp', pzSolved: { comp: 2 } } });
    await type(c.querySelector('#stem-angles-pz-input'), '145');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(live.d.pzResult.code).toBe('used_180');
    expect(c.textContent.includes('You subtracted from 180°')).toBe(true);
    expect(c.textContent.includes('x = 55')).toBe(false);
    await type(c.querySelector('#stem-angles-pz-input'), '45');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    expect(live.d.pzResult.revealed).toBeFalsy();
    expect(c.textContent.includes('x = 55')).toBe(false);
    await click(c.querySelector('[data-angles-reveal="pz"]'));
    expect(live.d.pzResult.revealed).toBe(true);
    expect(c.textContent.includes('x = 55°')).toBe(true);
    await type(c.querySelector('#stem-angles-pz-input'), '55');
    expect(c.querySelector('button[aria-label="Check my answer"]').disabled).toBe(true);
    expect(xpFor('angle puzzle').length).toBe(0);
    await click(byText(c, 'Next puzzle'));
    const p = live.d.pz;
    expect(p.kind).toBe('comp');
    await type(c.querySelector('#stem-angles-pz-input'), String(p.answer));
    const chk = c.querySelector('button[aria-label="Check my answer"]');
    await React.act(async () => { chk.click(); chk.click(); });
    expect(xpFor('angle puzzle')).toEqual([['protractor', 5, 'angle puzzle']]);
  });
  it('asks for the justifying rule after a correct answer (grades 5 and up)', async () => {
    const vert = { kind: 'vert', a: 70, ask: 'vertical', askPos: 2, answer: 70, rot: 0, id: 'vert:70:2' };
    const c = await mount({ protractor: { activeTab: 'puzzles', level: 'g57', pz: vert, pzKind: 'vert', pzSolved: { vert: 3 } } });
    await type(c.querySelector('#stem-angles-pz-input'), '70');
    await click(c.querySelector('button[aria-label="Check my answer"]'));
    const right = byText(c, 'Vertical angles (across a crossing) are equal.');
    expect(right).toBeTruthy();
    await click(right);
    expect(live.d.pzReason.ok).toBe(true);
    expect(xpFor('angle reason').length).toBe(1);
  });
  it('transversal and radian puzzles appear only at grade 8+', async () => {
    const c = await mount({ protractor: { activeTab: 'puzzles', level: 'g57' } });
    expect(byText(c, 'Parallel lines')).toBeFalsy();
    await unmountLast();
    const c8 = await mount({ protractor: { activeTab: 'puzzles', level: 'g8' } });
    expect(byText(c8, 'Parallel lines')).toBeTruthy();
    expect(byText(c8, 'Radians')).toBeTruthy();
    await click(byText(c8, 'Parallel lines'));
    expect(live.d.pz.kind).toBe('trans');
    expect(c8.querySelector('[data-angles-puzzle-svg="trans"]')).toBeTruthy();
  });
  it('the host grade band picks the starting level', async () => {
    const c = await mount({ protractor: { activeTab: 'puzzles' } }, { gradeBand: 'g912' });
    expect(byText(c, 'Parallel lines')).toBeTruthy();
    await unmountLast();
    const c4 = await mount({ protractor: { activeTab: 'puzzles' } }, { gradeBand: 'g35' });
    expect(byText(c4, 'Crossing lines')).toBeFalsy();
  });
});

describe('benchmark estimation', () => {
  it('grades the benchmark prediction and the estimate; the bare angle has no numbers until checked', async () => {
    const c = await mount({ angleValue: 100, protractor: { activeTab: 'challenges', estimateActive: true, estimateTarget: 100, estimateBase: 30, estimateGuess: '' } });
    const svg = c.querySelector('[data-angles-estimate-svg]');
    expect(Array.from(svg.querySelectorAll('text')).length, 'no scale or numbers').toBe(0);
    await click(byText(c, 'Between 45° and 90°'));
    await type(c.querySelector('input[aria-label="Angle estimate guess in degrees"]'), '85');
    await click(c.querySelector('button[aria-label="Check"]'));
    // Stage C: a miss says only "too small" and keeps the angle hidden for a second try.
    expect(live.d.estimateResult, 'no result after one miss').toBeFalsy();
    expect(c.querySelector('[data-angles-est-miss]').getAttribute('data-angles-est-miss')).toBe('low');
    expect(c.querySelector('[data-angles-estimate-svg]').textContent.includes('100°')).toBe(false);
    expect(c.querySelector('[data-angles-reveal]')).toBe(null);
    await type(c.querySelector('input[aria-label="Angle estimate guess in degrees"]'), '160');
    await click(c.querySelector('button[aria-label="Check"]'));
    expect(c.querySelector('[data-angles-est-miss]').getAttribute('data-angles-est-miss')).toBe('high');
    expect(c.querySelector('[data-angles-estimate-svg]').textContent.includes('100°')).toBe(false);
    await click(c.querySelector('[data-angles-reveal="estimate"]'));
    expect(live.d.estimateResult.revealed).toBe(true);
    expect(live.d.estimateResult.benchOk).toBe(false);
    expect(xp.length, 'a shown estimate earns nothing').toBe(0);
    expect(c.textContent.includes('Between 90° and 135°')).toBe(true);
    expect(c.querySelector('[data-angles-estimate-svg]').textContent.includes('100°')).toBe(true);
  });
});

describe('teacher hooks', () => {
  it('only teachers see the panel; it locks the level and the activity and lists misses', async () => {
    const s = await mount({ protractor: { activeTab: 'protractor' } });
    expect(s.querySelector('[data-angles-teacher]')).toBe(null);
    await unmountLast();
    const c = await mount({ protractor: { activeTab: 'protractor', misTally: { wrong_scale: 3, ray_length: 1 } } }, { isTeacherMode: true });
    const panel = c.querySelector('[data-angles-teacher]');
    expect(panel).toBeTruthy();
    expect(panel.querySelector('[data-angles-tally]').textContent).toMatch(/Read the wrong protractor scale\s*3/);
    const selects = panel.querySelectorAll('select');
    await React.act(async () => { selects[0].value = 'g8'; selects[0].dispatchEvent(new window.Event('change', { bubbles: true })); });
    await React.act(async () => { selects[1].value = 'puzzles'; selects[1].dispatchEvent(new window.Event('change', { bubbles: true })); });
    expect(live.d.teacher).toMatchObject({ lockLevel: 'g8', lockTab: 'puzzles' });
    await unmountLast();
    // A student now sees only the locked activity (plus Reference) at the locked level.
    const st = await mount({ protractor: { activeTab: 'protractor', level: 'g4', teacher: { lockLevel: 'g8', lockTab: 'puzzles' } } });
    const tabs = Array.from(st.querySelectorAll('[role="tab"]')).map((t) => t.id);
    expect(tabs).toEqual(['stem-angles-tab-puzzles', 'stem-angles-tab-reference']);
    expect(byText(st, 'Parallel lines')).toBeTruthy();
  });
  it('with reveals off, a second miss does not show the answer', async () => {
    const comp = { kind: 'comp', a: 35, answer: 55, rot: 0, id: 'comp:35' };
    const c = await mount({ protractor: { activeTab: 'puzzles', level: 'g57', pz: comp, pzKind: 'comp', pzSolved: { comp: 2 }, teacher: { noReveal: true } } });
    for (const v of ['145', '20', '30']) {
      await type(c.querySelector('#stem-angles-pz-input'), v);
      await click(c.querySelector('button[aria-label="Check my answer"]'));
    }
    expect(live.d.pzResult.revealed).toBeFalsy();
    expect(c.querySelector('[data-angles-reveal]'), 'no reveal button with reveals off').toBe(null);
    expect(c.textContent.includes('x = 55')).toBe(false);
    expect(c.querySelector('button[aria-label="Check my answer"]').disabled).toBe(false);
  });
});

describe('non-visual equivalents, dark mode, i18n, clean mounts', () => {
  it('a sonified sweep stops when the tool closes', async () => {
    const tones = [];
    class FakeParam { setValueAtTime() {} linearRampToValueAtTime() {} exponentialRampToValueAtTime() {} }
    class FakeAC {
      constructor() { this.currentTime = 0; this.destination = {}; this.state = 'running'; }
      createOscillator() { const o = { type: 'sine', frequency: Object.assign(new FakeParam(), { value: 0 }), connect() {}, start() { tones.push(o.frequency.value); }, stop() {} }; return o; }
      createGain() { return { gain: new FakeParam(), connect() {} }; }
    }
    window.AudioContext = FakeAC;
    vi.useFakeTimers();
    try {
      resetStemLab(); loadTool(SOURCE, 'protractor');
      const c = await mount({ angleValue: 170, protractor: { activeTab: 'explore', soundEnabled: false } });
      await click(byText(c, 'Hear the opening'));
      const started = tones.length;
      expect(started).toBeGreaterThan(0);
      await React.act(async () => { vi.advanceTimersByTime(600); });
      const mid = tones.length;
      expect(mid).toBeGreaterThan(started); // the 45-degree beat
      await unmountLast();
      vi.advanceTimersByTime(5000);
      expect(tones.length, 'tones after unmount').toBe(mid);
    } finally { vi.useRealTimers(); delete window.AudioContext; }
  });
  it('a running speed round stops ticking when the tool closes', async () => {
    vi.useFakeTimers();
    try {
      const c = await mount({ protractor: { activeTab: 'challenges', soundEnabled: false } });
      await click(c.querySelector('button[aria-label="Speed Round"]'));
      expect(window.__anglesSpeedTimer, 'timer running').toBeTruthy();
      await unmountLast();
      expect(window.__anglesSpeedTimer, 'timer left running after unmount').toBe(null);
      expect(window.__anglesSpeedPaused).toBe(true);
    } finally { vi.useRealTimers(); window.__anglesSpeedTimer = null; window.__anglesSpeedPaused = false; }
  });
  it('the explorer describes the angle in words with a clock position', async () => {
    const c = await mount({ angleValue: 120, protractor: { activeTab: 'explore' } });
    expect(c.querySelector('[data-angles-explore-desc]').textContent).toMatch(/about 11 o’clock.*120°/);
  });
  it('dark mode repaints the protractor', async () => {
    const c = await mount({ protractor: { activeTab: 'protractor' } }, { isDark: true });
    expect(c.querySelector('[data-angles-measure-svg] rect').getAttribute('fill')).toBe('#0f172a');
  });
  it('every visible string in the new tabs goes through t()', async () => {
    for (const [tab, extra] of [['protractor', { mMode: 'read' }], ['protractor', { mMode: 'draw' }], ['protractor', { mMode: 'compare' }], ['puzzles', { level: 'g8' }], ['challenges', { estimateActive: true, estimateTarget: 100 }]]) {
      const c = await mount({ protractor: Object.assign({ activeTab: tab }, extra) }, { t: (k) => (/^stem\.angles\./.test(k) ? '⟦T⟧' : k) });
      const walker = document.createTreeWalker(c, window.NodeFilter.SHOW_TEXT);
      const bad = [];
      while (walker.nextNode()) {
        const s = walker.currentNode.nodeValue.trim();
        if (s && /[A-Za-z]{3,}/.test(s) && !s.includes('⟦T⟧')) bad.push(s);
      }
      expect(bad, tab + ' ' + JSON.stringify(extra)).toEqual([]);
      await unmountLast();
    }
  });
  it('mounts every tab and mode, light, dark and teacher, with no console errors', async () => {
    const states = [];
    for (const tab of ['protractor', 'explore', 'challenges', 'puzzles', 'tools', 'reference']) states.push({ activeTab: tab });
    states.push({ activeTab: 'protractor', mMode: 'draw' }, { activeTab: 'protractor', mMode: 'compare' });
    for (const lv of ['g4', 'g57', 'g8']) states.push({ activeTab: 'puzzles', level: lv });
    states.push({ activeTab: 'challenges', estimateActive: true, estimateTarget: 200 });
    for (const st of states) {
      for (const extra of [{}, { isDark: true }, { isTeacherMode: true }]) {
        await mount({ protractor: st, angles: { expSection: st.activeTab === 'reference' ? 'pisaCross' : null } }, extra);
        await unmountLast();
      }
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
  it('old saved state with junk values still loads', async () => {
    const junk = { activeTab: 'nope', mTask: { base: 'x' }, mPlace: null, pz: { kind: 'trans' }, pzSolved: 'x', misTally: [1], missedLog: 'x', teacher: 5, level: 'g99', credited: null, estimateResult: 'x', speedTarget: 4 };
    // Stage C: a junk tab falls back to the first activity of the level (grades 5–7: puzzles; grade 4: the protractor).
    const c = await mount({ protractor: junk });
    expect(c.querySelector('[data-angles-puzzle-svg]')).toBeTruthy();
    await unmountLast();
    const c4 = await mount({ protractor: junk }, { gradeBand: 'g35' });
    expect(c4.querySelector('[data-angles-measure-svg]')).toBeTruthy();
    expect(errors).toEqual([]);
  });
});
