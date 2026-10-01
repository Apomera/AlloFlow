// Rock Cycle: Path detective (2026-09-28).
//
// A named rock's story; the student names the arrow it took, on the diagram or
// with buttons. A wrong pick gets a hint aimed at THAT pick, and the answer
// shows only once earned: right, or "Show me" after two misses. Solving it
// lights the arrow on the diagram and marks the clue words in the story.
//
// The cases are checked against the tool's own tables: each answer must start
// at the rock's real family, every arrow must be somebody's answer (the summary
// says so), and a story whose answer is metamorphic must say the rock did NOT
// melt, the misconception this whole diagram is fighting.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const SRC = readFileSync(ROCKS_FILE, 'utf8');
function lit(marker, open, close) {
  const at = SRC.indexOf(marker), st = SRC.indexOf(open, at);
  let d = 0, q = null;
  for (let i = st; i < SRC.length; i++) {
    const c = SRC[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === open) d++;
    else if (c === close && --d === 0) return new Function('return (' + SRC.slice(st, i + 1) + ')')();
  }
  throw new Error('unbalanced ' + marker);
}
const CASES = lit('var RC_PATH_CASES = [', '[', ']');
const SPEC = lit('var RC_SPECIMENS = [', '[', ']');
const RK = lit('var RK_ROCKS = [', '[', ']');
const FAM = Object.fromEntries(SPEC.map((s) => [s.id, s.family]));
// The six arrows in RC_PROCESSES order.
const ARROWS = [
  ['igneous', 'sedimentary'], ['sedimentary', 'metamorphic'], ['metamorphic', 'igneous'],
  ['igneous', 'metamorphic'], ['sedimentary', 'igneous'], ['metamorphic', 'sedimentary'],
];

function mk(rockCycle, extra) {
  const store = { rocks: {}, rockCycle: Object.assign({}, rockCycle) };
  const xp = [];
  const ctx = makeCtx(Object.assign({
    toolData: store,
    setToolData: (f) => { Object.assign(store, typeof f === 'function' ? f(store) : f); },
    t: (k, fb) => fb || String(k).split('.').pop(),
    awardXP: (n, why) => xp.push([n, why]),
  }, extra || {}));
  return { store, ctx, xp };
}
function tree(rockCycle) {
  const m = mk(rockCycle);
  return Object.assign(m, { node: window.StemLab._registry.rockCycle.render(m.ctx) });
}
function render(rockCycle) {
  const { ctx } = mk(rockCycle);
  return ReactDOMServer.renderToStaticMarkup(React.createElement(() => window.StemLab._registry.rockCycle.render(ctx)));
}
function findAll(node, pred, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, acc)); return acc; }
  if (pred(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, pred, acc);
  return acc;
}
const byAttr = (node, name, val) => findAll(node, (n) => n.props && n.props[name] !== undefined && (val === undefined || String(n.props[name]).split(':')[0] === String(val)));
// Press a button in a fresh render of the current state; returns the new state.
function press(rc, name, val) {
  const t = tree(rc);
  const b = byAttr(t.node, name, val);
  expect(b.length, name + ' ' + val).toBeGreaterThan(0);
  b[0].props.onClick();
  return Object.assign(t, { rc: t.store.rockCycle });
}
const open = (o) => Object.assign({ on: true, i: 0, picks: [], shown: false, log: {}, done: false }, o);
const text = (m) => m.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const attr = (m, name) => { const x = new RegExp(name + '="([^"]*)"').exec(m); return x && x[1]; };
const canvasProc = (m) => attr(/<canvas[^>]*>/.exec(m)[0], 'data-selected-proc');

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  document.body.innerHTML = '';
});

describe('the cases', () => {
  it('start each answer at the rock\'s own family, with a rock the tool can draw', () => {
    expect(CASES.length).toBe(8);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(8);
    CASES.forEach((c) => {
      expect(FAM[c.rock], c.id + ' is not a machine specimen').toBeTruthy();
      expect(RK.some((r) => r.id === c.rock), c.id + ' has no specimen art').toBe(true);
      expect(ARROWS[c.ans][0], c.id).toBe(FAM[c.rock]);
    });
  });

  it('use every arrow, shortcuts included, as the summary claims', () => {
    expect([...new Set(CASES.map((c) => c.ans))].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(SRC).toContain("'Every arrow was used, the shortcuts too.");
  });

  it('hold their clues, and never name the answer outright', () => {
    CASES.forEach((c) => {
      const clues = c.clues.split('|');
      expect(clues.length, c.id).toBeGreaterThan(0);
      clues.forEach((cl) => expect(c.story.toLowerCase(), c.id + ': ' + cl).toContain(cl.toLowerCase()));
      expect(c.story, c.id).not.toMatch(/igneous|sedimentary|metamorphi|weathering|erosion/i);
    });
  });

  it('say what the destination needs: metamorphic ones did NOT melt', () => {
    CASES.forEach((c) => {
      const to = ARROWS[c.ans][1], s = c.story.toLowerCase();
      if (to === 'metamorphic') expect(s, c.id).toMatch(/never melts|does not melt|stays solid/);
      if (to === 'igneous') expect(s, c.id).toMatch(/melts/);
      if (to === 'sedimentary') expect(s, c.id).toMatch(/settle|layers/);
      if (to !== 'igneous') expect(s.replace(/never melts|does not melt/g, ''), c.id).not.toMatch(/melt/);
    });
    // The trap is a wrong arrow leaving the same family: the tempting one.
    CASES.filter((c) => c.trap != null).forEach((c) => {
      expect(c.trap).not.toBe(c.ans);
      expect(ARROWS[c.trap][0]).toBe(ARROWS[c.ans][0]);
      expect(c.trapMsg.length).toBeGreaterThan(20);
    });
  });
});

describe('solving a case', () => {
  it('starts from the intro and shows the first rock\'s story', () => {
    const intro = render({});
    expect(attr(intro, 'data-rc-path')).toBe('intro');
    const s = press({}, 'data-rc-path-start');
    expect(s.rc.rcPath).toMatchObject({ on: true, i: 0, picks: [], done: false });
    const m = render(s.rc);
    expect(attr(m, 'data-rc-path')).toBe('0:open');
    expect(text(m)).toContain(CASES[0].story);
    // Before any pick the clues are not marked: finding them is the task.
    expect(m).not.toContain('data-rc-path-clue');
  });

  it('marks a right first pick, awards it, marks the clues and lights the arrow', () => {
    const c = CASES[0];
    const s = press({ rcPath: open({}) }, 'data-rc-path-pick', c.ans);
    expect(s.rc.rcPath).toMatchObject({ picks: [c.ans], solved: true, log: { 0: 1 } });
    expect(s.xp).toEqual([[5, 'Path detective']]);
    const m = render(s.rc);
    expect(attr(m, 'data-rc-path')).toBe('0:solved');
    expect(attr(m, 'data-rc-path-feedback')).toBe('right');
    expect(text(m)).toContain('First try.');
    expect(text(m)).toContain(c.why);
    expect((m.match(/data-rc-path-clue/g) || []).length).toBe(c.clues.split('|').length);
    expect(canvasProc(m)).toBe(String(c.ans));
    expect(m).toContain('data-rc-path-next');
  });

  it('answers a wrong start by asking, then by telling', () => {
    const c = CASES[0]; // granite: the answer leaves igneous
    const wrongStart = ARROWS.map((a, k) => k).filter((k) => ARROWS[k][0] !== 'igneous');
    const s1 = press({ rcPath: open({}) }, 'data-rc-path-pick', wrongStart[0]);
    expect(s1.rc.rcPath.picks).toEqual([wrongStart[0]]);
    expect(s1.xp).toEqual([]);
    const m1 = render(s1.rc);
    expect(attr(m1, 'data-rc-path-feedback')).toBe('hint');
    expect(text(m1)).toContain('Which family does Granite belong to?');
    expect(text(m1)).not.toContain('belongs to the');
    expect(canvasProc(m1)).toBe(String(wrongStart[0]));
    const s2 = press(s1.rc, 'data-rc-path-pick', wrongStart[1]);
    const m2 = render(s2.rc);
    // This harness's translator returns the key's last part, so family names read in lowercase.
    expect(text(m2)).toContain('Granite belongs to the igneous family, so its arrow starts at igneous.');
    expect(m2).toContain('data-rc-path-pick="' + wrongStart[0] + ':wrong"');
    expect(attr(m2, 'data-rc-path')).toBe('0:open');
    expect(c.ans).not.toBe(wrongStart[0]);
  });

  it('answers a right start with the wrong ending by what that ending needs', () => {
    // Shale squeezed and heated (answer sed -> met); the melting arrow from sed.
    const m = render({ rcPath: open({ i: 1, picks: [4] }) });
    expect(text(m)).toContain('That arrow means the rock MELTED and then cooled into new rock. Does the story say it melted?');
    const m2 = render({ rcPath: open({ i: 0, picks: [3] }) });
    expect(text(m2)).toContain('That arrow means the rock changed while still SOLID');
    const m3 = render({ rcPath: open({ i: 2, picks: [5] }) });
    expect(text(m3)).toContain('broken into bits that were carried, settled in layers and hardened');
  });

  it('answers the tempting trap with its own explanation', () => {
    const i = CASES.findIndex((c) => c.trap != null);
    const m = render({ rcPath: open({ i, picks: [CASES[i].trap] }) });
    expect(text(m)).toContain(CASES[i].trapMsg);
  });

  it('ignores a repeat pick and anything after the case is over', () => {
    const s = press({ rcPath: open({ picks: [1] }) }, 'data-rc-path-pick', 1);
    expect(s.rc.rcPath.picks).toEqual([1]);
    const done = press({ rcPath: open({ picks: [0], log: { 0: 1 } }) }, 'data-rc-path-pick', 2);
    expect(done.rc.rcPath).toEqual(open({ picks: [0], log: { 0: 1 } }));
    // The diagram still follows the explored arrow once the case is solved.
    expect(done.rc.selectedProcess).toMatchObject({ from: 'metamorphic', to: 'igneous' });
  });

  it('offers "Show me" only after two misses, and counts it as not first-try', () => {
    expect(render({ rcPath: open({ picks: [1] }) })).not.toContain('data-rc-path-show');
    const two = { rcPath: open({ i: 3, picks: [0, 1] }) };
    expect(render(two)).toContain('data-rc-path-show');
    const s = press(two, 'data-rc-path-show');
    expect(s.rc.rcPath).toMatchObject({ shown: true, log: { 3: 0 } });
    const m = render(s.rc);
    expect(attr(m, 'data-rc-path-feedback')).toBe('shown');
    expect(text(m)).toContain('It took igneous → metamorphic, by heat_pressure.');
    expect(m).toContain('data-rc-path-pick="3:answer"');
    expect(canvasProc(m)).toBe('3');
    expect((m.match(/data-rc-path-clue/g) || []).length).toBe(CASES[3].clues.split('|').length);
    // A late right answer is solved but not first-try, and earns nothing.
    const late = press({ rcPath: open({ picks: [1] }) }, 'data-rc-path-pick', 0);
    expect(late.rc.rcPath).toMatchObject({ solved: true, log: { 0: 0 } });
    expect(late.xp).toEqual([]);
  });

  it('moves case to case, then sums up and can start again', () => {
    const next = press({ rcPath: open({ picks: [0], log: { 0: 1 } }) }, 'data-rc-path-next');
    expect(next.rc.rcPath).toMatchObject({ i: 1, picks: [], shown: false, log: { 0: 1 } });
    const log = { 0: 1, 1: 1, 2: 0, 3: 1, 4: 0, 5: 1, 6: 1 };
    const last = press({ rcPath: open({ i: 7, picks: [5], log: Object.assign({ 7: 1 }, log) }) }, 'data-rc-path-next');
    expect(last.rc.rcPath.done).toBe(true);
    const m = render(last.rc);
    expect(attr(m, 'data-rc-path')).toBe('done');
    expect(text(m)).toContain('You traced all 8 paths, 6 on the first try.');
    expect(attr(m, 'data-rc-path-score')).toBe('6/8');
    expect([...m.matchAll(/data-rc-path-dot="(\w+)"/g)].map((x) => x[1])).toEqual(['first', 'first', 'later', 'first', 'later', 'first', 'first', 'first']);
    const again = press(last.rc, 'data-rc-path-again');
    expect(again.rc.rcPath).toEqual({ on: true, i: 0, picks: [], shown: false, log: {}, done: false });
  });
});

describe('the diagram during a case', () => {
  it('lights only this case\'s pick, not an arrow chosen before it', () => {
    const before = { selectedProcess: { from: 'igneous', to: 'metamorphic', label: 'x' } };
    expect(canvasProc(render(before))).toBe('3');
    expect(canvasProc(render(Object.assign({ rcPath: open({}) }, before)))).toBe('');
    expect(canvasProc(render(Object.assign({ rcPath: open({ picks: [5, 2] }) }, before)))).toBe('2');
    expect(canvasProc(render(Object.assign({ rcPath: open({ done: true, log: { 0: 1 } }) }, before)))).toBe('3');
  });

  it('takes an arrow clicked on the diagram as the answer', () => {
    window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
    HTMLCanvasElement.prototype.getContext = function () {
      return new Proxy({}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 20 }) : () => ({ addColorStop() {} })), set: () => true });
    };
    const clickArrow = (rc, k) => {
      const t = tree(rc);
      const el = document.createElement('canvas');
      const W = 600, H = 420;
      Object.defineProperty(el, 'offsetWidth', { value: W });
      Object.defineProperty(el, 'offsetHeight', { value: H });
      el.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H, right: W, bottom: H });
      document.body.appendChild(el);
      findAll(t.node, (n) => n.type === 'canvas')[0].ref(el);
      const N = { igneous: [W * 0.5, H * 0.15], sedimentary: [W * 0.82, H * 0.7], metamorphic: [W * 0.18, H * 0.7] };
      const f = N[ARROWS[k][0]], to = N[ARROWS[k][1]], bw = k >= 3 ? -0.34 : 0.2;
      const mx = (f[0] + to[0]) / 2 + (to[1] - f[1]) * bw, my = (f[1] + to[1]) / 2 - (to[0] - f[0]) * bw;
      el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, clientX: 0.25 * f[0] + 0.5 * mx + 0.25 * to[0], clientY: 0.25 * f[1] + 0.5 * my + 0.25 * to[1] }));
      return t;
    };
    const t = clickArrow({ rcPath: open({}) }, 0);
    expect(t.store.rockCycle.rcPath).toMatchObject({ picks: [0], solved: true, log: { 0: 1 } });
    expect(t.xp).toEqual([[5, 'Path detective']]);
    document.body.innerHTML = '';
    // With no case open, a click only picks the process.
    const t2 = clickArrow({}, 4);
    expect(t2.store.rockCycle.rcPath).toBeUndefined();
    expect(t2.store.rockCycle.selectedProcess).toMatchObject({ from: 'sedimentary', to: 'igneous' });
  });
});

describe('the quest', () => {
  it('counts cases worked through, shown ones too, from a clean read of the save', () => {
    const hook = window.StemLab._registry.rockCycle.questHooks.find((q) => q.id === 'path_detective_4');
    expect(hook).toBeTruthy();
    expect(hook.check({})).toBe(false);
    expect(hook.progress({})).toBe('0/4 cases');
    expect(hook.check({ rcPath: open({ log: { 0: 1, 1: 0, 2: 1 } }) })).toBe(false);
    expect(hook.check({ rcPath: open({ log: { 0: 1, 1: 0, 2: 1, 3: 0 } }) })).toBe(true);
    expect(hook.progress({ rcPath: open({ log: { 0: 1, 1: 0, 2: 1, 3: 0 } }) })).toBe('4/4 cases');
    // Junk entries do not count.
    expect(hook.check({ rcPath: open({ log: { 0: 1, 1: 5, 99: 1, x: 1 } }) })).toBe(false);
    expect(hook.check({ rcPath: 'x' })).toBe(false);
    expect(hook.check(null)).toBe(false);
  });
});

describe('a saved case is input', () => {
  it('keeps what it can use and renders whatever it was given', () => {
    ['x', 5, [], { on: 'yes' }, null].forEach((bad) => {
      const m = render({ rcPath: bad });
      expect(attr(m, 'data-rc-path'), JSON.stringify(bad)).toBe('intro');
    });
    const m = render({ rcPath: { on: true, i: 99, picks: ['a', 1, 1, 9, 2.5, -1], log: { 0: 5, 99: 1, 1: 1, x: 0 }, solved: true } });
    expect(attr(m, 'data-rc-path')).toBe('0:open');
    expect(m).toContain('data-rc-path-pick="1:wrong"');
    expect((m.match(/:wrong"/g) || []).length).toBe(1);
    expect(attr(m, 'data-rc-path-score')).toBe('1/1');
    // "solved" comes from the picks, never from a saved flag.
    expect(m).not.toContain('data-rc-path-next');
    // A repeated miss in a save is still one miss: "Show me" waits for a second.
    expect(render({ rcPath: open({ picks: [1, 1] }) })).not.toContain('data-rc-path-show');
  });
});

describe('the answer buttons', () => {
  it('say which arrow each is, and which ones were wrong', () => {
    const m = render({ rcPath: open({ picks: [1] }) });
    const labels = [...m.matchAll(/<button[^>]*data-rc-path-pick="(\d)[^"]*"[^>]*>/g)].map((x) => attr(x[0], 'aria-label'));
    expect(labels.length).toBe(6);
    expect(labels[1]).toContain('sedimentary → metamorphic, heat_pressure');
    expect(labels[1]).toContain('Not this one.');
    expect(labels[0]).not.toContain('Not this one.');
    expect(m).toMatch(/role="group" aria-label="The six arrows"/);
    expect(m).toMatch(/aria-live="polite" data-rc-path-feedback="hint"/);
  });
});
