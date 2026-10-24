import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

// Three Teacher-dashboard lesson plans taught wrong math, in the tool AND in
// the English that ui_strings.js ships:
//   3 − (−2): one zero pair gives only ONE red, but two reds must be removed;
//   "a hundred thousand-cubes is 1,000,000 ... now you understand ten million";
//   abacus 9 + 4 as "+5 with the heaven bead, take back 1" (the heaven bead is
//   already down at 9; 9 + 4 needs the tens rod).
// The translation pipeline never updates an existing key's value, so each
// corrected text carries a new key.
//
// MR2_NUMBERSENSE_MANIP_SRC points the suite at another copy of the tool
// (mutation check: the pre-fix copy must turn these red).

const FILE = process.env.MR2_NUMBERSENSE_MANIP_SRC || 'stem_lab/stem_tool_manipulatives.js';
const src = fs.readFileSync(FILE, 'utf8');
const UI = fs.readFileSync('ui_strings.js', 'utf8');

function shipped(key) {
  const leaf = key.split('.').pop();
  const re = new RegExp('"' + leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")', 'g');
  const values = [...UI.matchAll(re)].map((m) => JSON.parse(m[1]));
  return values.length ? values[0] : undefined;
}

// The tool's own lesson table, with every __alloT(key, fallback) recorded.
const used = [];
// eslint-disable-next-line no-new-func
const LESSONS = new Function('__alloT', sliceBetween(src, 'var lessonPlans = [', "return h('div', { className: 'space-y-4 max-w-4xl", { file: FILE }) + '\nreturn lessonPlans;')(
  (k, fb) => { used.push([k, fb]); return fb; }
);
const lesson = (title) => {
  const found = LESSONS.find((l) => l.title === title);
  expect(found, title).toBeTruthy();
  return found.desc;
};

describe('the lesson plans state true arithmetic', () => {
  it('3 − (−2) with counters: two zero pairs, then remove two reds, leaving 5', () => {
    const d = lesson('Subtracting negatives');
    expect(d).toMatch(/two zero pairs/i);
    expect(d).not.toMatch(/add a zero pair \(1 yellow \+ 1 red/);
    // Model it: 3 yellow, add two zero pairs, remove 2 reds.
    let yellow = 3, red = 0;
    yellow += 2; red += 2;
    red -= 2;
    expect(yellow - red).toBe(5);
    expect(d).toMatch(/\b5\b/);
  });

  it('place value to one million: 10, 100, 1,000 thousand-cubes', () => {
    const d = lesson('Place value to one million');
    expect(d).not.toMatch(/ten million/i);
    expect(d).not.toMatch(/hundred of those is 1,000,000/i);
    expect(d).toContain('100,000');
    expect(d).toContain('1,000,000');
    expect(d).toMatch(/one million/i);
  });

  it('abacus 9 + 4: the tens rod takes the ten, the ones rod gives back 6, reading 13', () => {
    const d = lesson('Counting on with the abacus');
    expect(d).not.toMatch(/add 5 by sliding the heaven bead down, then take back 1/);
    expect(9 + 10 - 6).toBe(13);
    expect(d).toMatch(/tens rod/);
    expect(d).toMatch(/\b6\b/);
    expect(d).toMatch(/\b13\b/);
  });

  it('no lesson key ships English that differs from the tool (a corrected text needs a NEW key)', () => {
    expect(used.length).toBeGreaterThan(80);
    const stale = used.filter(([k, fb]) => shipped(k) !== undefined && shipped(k) !== fb).map(([k]) => k);
    expect(stale).toEqual([]);
  });
});

describe('what the Teacher dashboard shows with the shipped English pack', () => {
  class NoopObserver { observe() {} unobserve() {} disconnect() {} }
  if (!window.ResizeObserver) window.ResizeObserver = NoopObserver;
  const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })), set: (t, k, v) => { t[k] = v; return true; } });
  let root = null;
  beforeEach(() => {
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx2d);
    resetStemLab();
    loadTool(FILE, 'base10');
  });
  afterEach(async () => {
    if (root) { await React.act(async () => { root.unmount(); }); root = null; }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('none of the three wrong lessons reaches the page', async () => {
    const tool = window.StemLab._registry.base10;
    const watched = new Set(used.map(([k]) => k));
    const t = (k) => (watched.has(k) ? shipped(k) : undefined);
    function App() {
      const [state, setState] = React.useState({ _manipulatives: { mode: 'teacher' } });
      return tool.render(makeCtx({ toolData: state, setToolData: setState, t }));
    }
    document.body.innerHTML = '<div id="m-root"></div>';
    root = ReactDOMClient.createRoot(document.getElementById('m-root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const text = document.body.textContent;
    expect(text).toContain('Lesson plan templates');
    expect(text).not.toContain('So FIRST add a zero pair (1 yellow + 1 red');
    expect(text).not.toContain('Now you understand "ten million."');
    expect(text).not.toContain('add 5 by sliding the heaven bead down, then take back 1');
  });
});
