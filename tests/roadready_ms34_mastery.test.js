import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 34, lane mastery (ms34). Permit mastery is keyed by the question's id (its bank index), not by its
// text, so rewording a question (or showing it in another language) keeps a student's mastery.
// - a save keyed by today's text, or by an OLDER wording of the question, moves to the id;
// - a right answer is saved under the id, and survives the question being worded differently;
// - a retired duplicate passes its mastery to the live question it duplicated;
// - hostile saved data (wrong types, huge strings, prototype keys) never crashes and never counts.
// Black-box: the tool is mounted and only the screen and device storage are read.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const SRC = readFileSync(path.resolve(process.cwd(), TOOL), 'utf8');
const DEV = 'roadReady.permitMastery.v1';
let loadTool, resetStemLab, makeCtx, React, ReactDOMClient, RR, BANK, LIVE;

beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
  window.__RR_TEST_EXPORTS__ = {};
  resetStemLab();
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  BANK = RR.PERMIT_BANK;
  LIVE = BANK.filter((q) => !q.retired).length;
});

let mounted = [];
const tick = async (n = 4) => { for (let i = 0; i < n; i++) await React.act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
async function mount(roadReady, extra) {
  window.__testHooks = {};
  window.__RR_TEST_EXPORTS__ = {};
  delete window.__alloflowRoadReady; delete window.__alloflowRoadReadyBank;
  resetStemLab();
  const config = loadTool(TOOL, 'roadReady');
  const state = { toolData: { roadReady } };
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData;
    const ctx = makeCtx(Object.assign({
      toolData,
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    }, extra || {}));
    return config.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  await tick();
  const m = { host, root, state };
  mounted.push(m);
  return m;
}
afterEach(async () => {
  for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
  mounted = [];
  try { localStorage.clear(); } catch (e) {}
  vi.restoreAllMocks();
});
const d = (m) => m.state.toolData.roadReady;
const meter = (m) => {
  const el = m.host.querySelector('[aria-label^="Permit Mastery:"]');
  const g = el && /Permit Mastery: (\d+) of (\d+)/.exec(el.getAttribute('aria-label'));
  return g ? Number(g[1]) : NaN;
};
const devKeys = () => Object.keys(JSON.parse(localStorage.getItem(DEV) || '{}')).sort();
const options = (m) => [...m.host.querySelectorAll('button')].filter((b) => /^[A-D]\. /.test(b.textContent));
const entry = () => ({ firstCorrectAt: '2026-10-01T12:00:00.000Z', lastCorrectAt: '2026-10-02T12:00:00.000Z', correctCount: 2, category: 'general' });
// Older wordings, read from the tool's git history by hand-check (they are the texts students saved under):
// q1 and q14 as they read in the original bank, q88 before round 31.
const OLD = [
  [1, 'A solid yellow line on your side of the centerline means:'],
  [14, 'On wet pavement, your stopping distance:'],
  [88, 'You are driving and smell gasoline inside the car. You should:'],
];

describe('ms34: saved mastery moves from question text to question id', () => {
  it('a save keyed by today\'s English text is moved to ids, on the device and in the tool, and still counts', async () => {
    const saved = { [BANK[5].q]: entry(), [BANK[200].q]: entry() };
    localStorage.setItem(DEV, JSON.stringify(saved));
    const m = await mount({ view: 'permitStart' });
    expect(meter(m)).toBe(2);
    expect(devKeys()).toEqual(['200', '5']);
    expect(Object.keys(d(m).permitMastery).sort()).toEqual(['200', '5']);
    expect(d(m).permitMastery['5']).toEqual(entry());
    expect(localStorage.getItem(DEV)).not.toContain(BANK[5].q.slice(0, 20));
  });
  it('a reworded question keeps its mastery: a save under an OLDER wording still counts', async () => {
    OLD.forEach(([i, t]) => expect(BANK[i].q, 'q' + i + ' has been reworded since').not.toBe(t));
    const saved = {};
    OLD.forEach(([, t]) => { saved[t] = entry(); });
    localStorage.setItem(DEV, JSON.stringify(saved));
    const m = await mount({ view: 'permitStart' });
    expect(meter(m), 'all three old wordings matched').toBe(3);
    expect(devKeys()).toEqual(['1', '14', '88']);
  });
  it('the old-wordings table: hashes of older texts, one question each, and the known old texts are in it', () => {
    const X = window.__RR_TEST_EXPORTS__.roadReadyMastery;
    expect(X, 'lane export').toBeTruthy();
    const old = X.RR_PERMIT_OLD_WORDINGS;
    expect(old.length).toBeGreaterThan(100);
    const seen = new Map();
    old.forEach(([i, h]) => {
      expect(typeof h).toBe('string');
      expect(h).toMatch(/^[0-9a-z]+\.[0-9a-z]+$/);
      expect(BANK[i], 'row ' + i).toBeTruthy();
      if (seen.has(h)) expect(seen.get(h), h).toBe(i);
      seen.set(h, i);
    });
    // more old texts (git history of the tool and of ui_strings.js), each must find its question
    const more = OLD.concat([
      [27, 'Reaction time is typically increased by how much at legally drunk levels?'],
      [42, 'The friction circle concept teaches you to:'],
      [76, 'A "no zone" refers to:'],
      [130, 'Ice on your windshield is best cleared by:'],
      [166, 'Wiper blades should be replaced approximately:'],
    ]);
    more.forEach(([i, t]) => {
      expect(seen.get(X.rrPermitTextHash(t)), t).toBe(i);
      expect(Object.keys(X.rrMigratePermitMastery({ [t]: { correctCount: 1 } })), t).toEqual([String(i)]);
      // spacing differences do not matter
      expect(Object.keys(X.rrMigratePermitMastery({ ['  ' + t.replace(/ /g, '  ') + ' ']: true })), t).toEqual([String(i)]);
    });
    // the table holds no question text (some old texts state rules that changed)
    expect(SRC).not.toContain('A "no zone" refers to:');
  });
  it('a right answer is saved under the question id, and keeps counting when the question is worded differently', async () => {
    const qs = RR.buildCategoryTest('signs').slice(0, 2);
    const m = await mount({ view: 'permit', permit: { questions: qs, index: 0, answers: [], score: 0, done: false, mode: 'category' } });
    await React.act(async () => { options(m)[qs[0].correct].click(); });
    await tick();
    expect(devKeys()).toEqual([String(qs[0].bi)]);
    expect(localStorage.getItem(DEV)).not.toContain(qs[0].q.slice(0, 15));
    // the same student later: the English shown for that question changed (a reworded ui_strings value)
    const bi = qs[0].bi;
    const reworded = (k, fb) => (k === 'stem.roadready.permit_q' + bi + '_q' ? 'A new wording of this question?' : fb);
    const later = await mount({ view: 'permitStart' }, { t: reworded });
    expect(meter(later)).toBe(1);
  });
  it('a save made in another language matches once that language is shown', async () => {
    const es = (k, fb) => { const g = /^stem\.roadready\.permit_q(\d+)_q$/.exec(k); return g ? 'ES ' + g[1] + ': ' + fb : fb; };
    localStorage.setItem(DEV, JSON.stringify({ ['ES 7: ' + BANK[7].q]: entry() }));
    const en = await mount({ view: 'permitStart' });
    expect(meter(en), 'not matched in English').toBe(0);
    expect(devKeys(), 'kept for later, not dropped').toEqual(['ES 7: ' + BANK[7].q]);
    const m = await mount({ view: 'permitStart' }, { t: es });
    expect(meter(m)).toBe(1);
    expect(devKeys()).toEqual(['7']);
  });
});

describe('ms34: retired questions', () => {
  it('a retired duplicate gives its mastery to the live question it duplicated', async () => {
    const retired = BANK.map((q, i) => (q.retired ? i : -1)).filter((i) => i >= 0);
    expect(retired).toEqual([67, 73, 93, 173]);
    localStorage.setItem(DEV, JSON.stringify({ [BANK[67].q]: entry(), 73: entry(), [BANK[93].q]: entry(), 173: { correctCount: 1 } }));
    const m = await mount({ view: 'permitStart' });
    expect(devKeys()).toEqual(['186', '36', '40', '44']);
    expect(meter(m)).toBe(4);
    // and the twin is the same question: same category, same rule
    [[67, 40], [73, 44], [93, 186], [173, 36]].forEach(([r, t]) => expect(BANK[t].retired, 'q' + t + ' is live').toBeFalsy());
  });
  it('a retired question is never counted and never stored under its own id', async () => {
    localStorage.setItem(DEV, JSON.stringify({ 67: entry(), 40: entry() }));
    const m = await mount({ view: 'permitStart' });
    expect(meter(m)).toBe(1);
    expect(devKeys()).toEqual(['40']);
    expect(JSON.parse(localStorage.getItem(DEV))['40'].correctCount).toBe(2);
  });
});

describe('ms34: hostile saved mastery', () => {
  const big = 'x'.repeat(200000);
  const hostile = () => {
    const o = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"correctCount": 5}, "prototype": true}');
    Object.assign(o, {
      [big]: entry(), 12: 'yes', 13: [1, 2], 14: null, 15: { correctCount: 'NaN', firstCorrectAt: big, category: big }, 16: { correctCount: 1e300 },
      9999: entry(), '-1': entry(), '1.5': entry(), 'Maria Lopez-Ortiz': 42, 17: false, 18: 0, 19: true, 20: {},
    });
    return o;
  };
  it('wrong types, huge strings and prototype keys: no crash, no pollution, only real answers count', async () => {
    localStorage.setItem(DEV, JSON.stringify(hostile()));
    const m = await mount({ view: 'permitStart' });
    expect(m.host.textContent).not.toContain('RoadReady Error');
    expect(({}).polluted).toBeUndefined();
    expect(meter(m), '15, 16, 19, 20').toBe(4);
    const kept = JSON.parse(localStorage.getItem(DEV));
    expect(kept['15']).toEqual({ correctCount: 1 });
    expect(kept['16'].correctCount).toBe(1000000);
    expect(Object.keys(kept).some((k) => k.length > 1000), 'huge key dropped').toBe(false);
    expect(localStorage.getItem(DEV).length).toBeLessThan(2000);
    ['12', '13', '14', '17', '18', '9999', '-1', '1.5', '__proto__', 'constructor', 'prototype'].forEach((k) => expect(Object.prototype.hasOwnProperty.call(kept, k), k).toBe(false));
  });
  it('a device copy that is not a map at all, and hostile state from a project file, open the permit page', async () => {
    for (const raw of ['"garbage"', '[1,2,3]', '7', 'null', '{not json']) {
      localStorage.setItem(DEV, raw);
      const m = await mount({ view: 'permitStart' });
      expect(m.host.textContent, raw).not.toContain('RoadReady Error');
      expect(meter(m), raw).toBe(0);
    }
    localStorage.clear();
    const m = await mount({ view: 'permitStart', permitMastery: hostile() });
    expect(m.host.textContent).not.toContain('RoadReady Error');
    expect(meter(m)).toBe(4);
    // an unmatched text key is kept as it is (on this device only: the host never stores it)
    expect(Object.keys(d(m).permitMastery).sort()).toEqual(['15', '16', '19', '20', 'Maria Lopez-Ortiz']);
  });
  it('Load Progress with a text-keyed (older) mastery map: moved to ids, counted', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true });
    const input = m.host.querySelector('#rr-load-progress-file');
    expect(input).toBeTruthy();
    const file = { tool: 'roadReady', version: 1, badges: {}, permitMastery: { [OLD[0][1]]: entry(), [BANK[30].q]: entry() } };
    const OrigFR = window.FileReader;
    window.FileReader = function () { this.readAsText = () => { this.onload({ target: { result: JSON.stringify(file) } }); }; };
    try {
      await React.act(async () => {
        Object.defineProperty(input, 'files', { value: [{ name: 'p.json' }], configurable: true });
        input.dispatchEvent(new window.Event('change', { bubbles: true }));
      });
      await tick();
    } finally { window.FileReader = OrigFR; }
    expect(Object.keys(d(m).permitMastery).sort()).toEqual(['1', '30']);
    expect(devKeys()).toEqual(['1', '30']);
  });
});

describe('ms34: the source keeps the id rule in one place', () => {
  it('no view counts mastery by question text any more', () => {
    expect(SRC).not.toMatch(/_permitMastery\[mq\.q\]|rrMastered\[mq\.q\]|nextMastery\[q\.q\]|prevMastery\[q\.q\]/);
  });
});
