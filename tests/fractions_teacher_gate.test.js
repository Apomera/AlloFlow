// Fraction Lab never read ctx.isTeacherMode, so a student could open the Teacher mode: worksheets with answer keys,
// RTI probes with their keys, exit tickets, IEP goals, lesson plans. Students now keep only Goals & progress and
// Multilingual. Only an explicit true from the host opens the teacher tools; an unknown role gets the student view.
// Also pins the pie digits: white read 3.35-3.69:1 on the slices, so each digit now takes the better of black or white.
// FRACTIONS_GATE_SRC points the suite at another copy for the fail-first proof.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.FRACTIONS_GATE_SRC || 'stem_lab/stem_tool_fractions.js';
const TEACHER = { isTeacherMode: true };
let root = null;

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : /create.*Gradient/.test(k) ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 20 }) : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  loadTool(FILE, 'fractionViz');
  loadTool(FILE, 'fractions');
  window.__fracTabTracked = true;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; document.body.innerHTML = '';
  if (window._fracKbHandler) { window.removeEventListener('keydown', window._fracKbHandler); window._fracKbHandler = null; }
  vi.restoreAllMocks();
});

async function mount(saved, overrides, id = 'fractionViz') {
  if (root) { await React.act(async () => root.unmount()); root = null; }
  document.body.innerHTML = '<div id="root"></div>';
  let latest, setter;
  function App() {
    const [state, setState] = React.useState({ _fractions: Object.assign({}, saved) });
    latest = state._fractions; setter = setState;
    return window.StemLab._registry[id].render(makeCtx(Object.assign({ toolData: state, setToolData: setState, addToast: () => {} }, overrides)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return {
    state: () => latest,
    merge: async (preset) => { await React.act(async () => { setter((prev) => Object.assign({}, prev, { _fractions: Object.assign({}, prev._fractions, preset) })); }); },
  };
}
const modes = () => [...document.querySelectorAll('.fraction-lab-goals [role="tab"]')].map((b) => b.id.replace('fraction-mode-tab-', ''));
const mode = () => document.querySelector('.fraction-lab-goals [aria-selected="true"]')?.id.replace('fraction-mode-tab-', '');
const activity = () => document.querySelector('#fraction-activity-list [aria-selected="true"]')?.id.replace('fraction-section-tab-', '');
const activities = () => [...document.querySelectorAll('#fraction-activity-list [role="tab"]')].map((b) => b.id.replace('fraction-section-tab-', ''));
const panel = () => document.getElementById('fraction-section-panel').textContent;
const buttonText = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
async function click(el) { expect(!!el).toBe(true); await React.act(async () => el.click()); }

// Every teacher tool: the live super-tabs, the sub-views behind them, and the old flat ids still in the dispatch.
const HIDDEN = ['standardsPlanning', 'printAssess', 'pedagogy',
  'worksheets', 'reports', 'rtiprobe', 'refcard', 'exitticket', 'printlab',
  'standards', 'scope', 'lessons', 'iep', 'rubric', 'udl', 'routines', 'checklist',
  'misconceptions', 'mcflow', 'activities', 'mathtalks', 'differentiation', 'parent', 'citations'];
// Text only those tools show. If one of these ever reaches a student, the gate leaked.
const TEACHER_TEXT = ['Answer Key', 'answer key', 'Worksheet generator', 'Progress report (teacher tool)', 'RTI', 'IEP', 'Misconceptions library', 'Scope & Sequence',
  'Standards & Planning', 'Print & Assess', 'Teaching guides', 'Parent guide', 'Exit ticket', 'Instructor tools', 'For teachers', 'Tab guide', 'substitute teachers'];
function expectNoTeacherText() {
  const text = document.getElementById('root').textContent;
  for (const bad of TEACHER_TEXT) expect(text.includes(bad), 'student sees "' + bad + '"').toBe(false);
}

describe('Fraction Lab Teacher section: what a student gets', () => {
  it.each([['fractionViz'], ['fractions']])('%s: a student has no Teacher mode and no teacher tool in any mode', async (id) => {
    await mount({}, { isTeacherMode: false }, id);
    expect(modes()).toEqual(['learn', 'practice', 'apply']);
    for (const m of modes()) {
      await click(document.getElementById('fraction-mode-tab-' + m));
      const more = document.querySelector('.fraction-lab-more');
      if (more) await click(more);
      for (const hid of ['standardsPlanning', 'printAssess', 'pedagogy']) expect(activities().includes(hid)).toBe(false);
    }
    expectNoTeacherText();
  });

  it('keeps Multilingual under Learn and Goals & progress under Practice, both working', async () => {
    await mount({}, { isTeacherMode: false });
    await click(document.querySelector('.fraction-lab-more'));
    expect(activities()).toContain('ml');
    await click(document.getElementById('fraction-section-tab-ml'));
    expect(mode()).toBe('learn');
    expect(panel()).toContain('Fraction vocabulary in 12 languages');
    await click(document.getElementById('fraction-mode-tab-practice'));
    await click(document.querySelector('.fraction-lab-more'));
    expect(activities()).toContain('myAccount');
    await click(document.getElementById('fraction-section-tab-myAccount'));
    expect(mode()).toBe('practice');
    expect(panel()).toContain('Goal setter');
    expect(panel()).toContain('Levels & XP');
  });

  it('those two kept items show no answers', async () => {
    for (const saved of [{ tab: 'ml' }, { tab: 'myAccount', maSub: 'goals' }, { tab: 'myAccount', maSub: 'daily' }, { tab: 'myAccount', maSub: 'mastery' }, { tab: 'myAccount', maSub: 'levels' }]) {
      await mount(saved, { isTeacherMode: false });
      expect(panel().length).toBeGreaterThan(40);
      expect(/answer key|solution/i.test(panel()), JSON.stringify(saved)).toBe(false);
      expectNoTeacherText();
    }
  });

  it('every mode key, arrow and End stays inside the three student modes', async () => {
    await mount({}, { isTeacherMode: false });
    const learn = document.getElementById('fraction-mode-tab-learn');
    learn.focus();
    await React.act(async () => learn.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })));
    expect(mode()).toBe('apply');
    expect(document.activeElement.id).toBe('fraction-mode-tab-apply');
    await React.act(async () => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })));
    expect(mode()).toBe('learn');
  });

  it('the Help tab does not list teacher tools', async () => {
    await mount({ tab: 'aboutSuper', aboutSub: 'help' }, { isTeacherMode: false });
    expect(panel()).toContain('(Learn, Practice, Apply) group related work.');
    expect(panel().includes('Teacher)')).toBe(false);
    expectNoTeacherText();
  });
});

describe('Fraction Lab Teacher section: every other way in', () => {
  it.each(HIDDEN)('saved tab %s lands a student on Build a fraction, with or without the mode', async (tab) => {
    for (const saved of [{ tab }, { navMode: 'teacher', tab }]) {
      await mount(saved, { isTeacherMode: false });
      expect(mode()).toBe('learn');
      expect(activity()).toBe('practice');
      expect(document.getElementById('fraction-practice-title')?.textContent).toBe('3/8 of the whole');
      expectNoTeacherText();
    }
  });

  it.each(['standardsPlanning', 'printAssess', 'pedagogy', 'worksheets'])('saved %s under another mode lands on that mode\'s first activity', async (tab) => {
    await mount({ navMode: 'apply', tab }, { isTeacherMode: false });
    expect(mode()).toBe('apply');
    expect(activity()).toBe('wordproblems');
    expect(panel().length).toBeGreaterThan(40);
    expectNoTeacherText();
  });

  it('a saved Teacher mode with no tab opens Learn', async () => {
    await mount({ navMode: 'teacher' }, { isTeacherMode: false });
    expect(modes()).not.toContain('teacher');
    expect(mode()).toBe('learn');
    expect(activity()).toBe('practice');
  });

  it('a save inside a kept item still opens it, under its student mode', async () => {
    await mount({ navMode: 'teacher', tab: 'myAccount' }, { isTeacherMode: false });
    expect(mode()).toBe('practice');
    expect(activity()).toBe('myAccount');
    await mount({ navMode: 'teacher', tab: 'ml' }, { isTeacherMode: false });
    expect(mode()).toBe('learn');
    expect(activity()).toBe('ml');
  });

  it('an assessment preset naming a teacher tool still shows its fraction, on a student screen', async () => {
    const t = await mount({}, { isTeacherMode: false });
    await t.merge({ numerator: 3, denominator: 4, tab: 'printAssess' });
    expect(activity()).toBe('practice');
    expect(document.getElementById('fraction-practice-title').textContent).toBe('3/4 of the whole');
    expectNoTeacherText();
  });

  it('the tab guide is hidden, and a saved one falls back to Vocabulary, not an empty panel', async () => {
    await mount({ tab: 'reference', refSub: 'tabguide' }, { isTeacherMode: false });
    expect(buttonText('Tab guide')).toBeUndefined();
    expect(panel()).toContain('Search');
    expect(panel().includes('Tab guide')).toBe(false);
    expect(document.querySelector('.fraction-lab-subsections [aria-pressed="true"]').textContent).toContain('Vocabulary');
  });

  it('the number shortcuts and the learning path reach only student screens', async () => {
    const t = await mount({ navMode: 'teacher', tab: 'printAssess' }, { isTeacherMode: false });
    for (const [num, tab] of [['1', 'practice'], ['2', 'compare'], ['3', 'operations'], ['4', 'equivalents'], ['5', 'converter'], ['6', 'wall']]) {
      await React.act(async () => document.querySelector('[data-fractions-root]').dispatchEvent(new KeyboardEvent('keydown', { key: num, bubbles: true, cancelable: true })));
      expect(activity()).toBe(tab);
    }
    const path = [...document.querySelectorAll('details')].find((d) => d.querySelector('summary')?.textContent === 'Follow a learning path');
    for (const b of path.querySelectorAll('button')) await click(b);
    expect(modes()).not.toContain('teacher');
    expect(t.state().tab).toBe('operations');
    expectNoTeacherText();
  });

  it('a teacher who switches to student view leaves the tools, and comes back to them', async () => {
    let setRole;
    function App() {
      const [teacher, set] = React.useState(true);
      const [state, setState] = React.useState({ _fractions: { navMode: 'teacher', tab: 'printAssess' } });
      setRole = set;
      return window.StemLab._registry.fractionViz.render(makeCtx({ toolData: state, setToolData: setState, isTeacherMode: teacher }));
    }
    document.body.innerHTML = '<div id="root"></div>';
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => root.render(React.createElement(App)));
    expect(activity()).toBe('printAssess');
    await React.act(async () => setRole(false));
    expect(activity()).toBe('practice');
    expectNoTeacherText();
    await React.act(async () => setRole(true));
    expect(activity()).toBe('printAssess');
    expect(mode()).toBe('teacher');
  });
});

describe('Fraction Lab Teacher section: the role', () => {
  it.each([[undefined], [null], ['true'], [1], [{}]])('isTeacherMode %s is not a yes: student view', async (v) => {
    await mount({ navMode: 'teacher', tab: 'printAssess' }, { isTeacherMode: v });
    expect(modes()).toEqual(['learn', 'practice', 'apply']);
    expect(activity()).toBe('practice');
  });

  it('no isTeacherMode on ctx at all (a host that sends nothing): student view', async () => {
    await mount({}, {});
    expect(modes()).toEqual(['learn', 'practice', 'apply']);
  });

  it.each([['fractionViz'], ['fractions']])('%s: a teacher keeps all four modes and every Teacher item, each with content', async (id) => {
    await mount({}, TEACHER, id);
    expect(modes()).toEqual(['learn', 'practice', 'apply', 'teacher']);
    await click(document.getElementById('fraction-mode-tab-teacher'));
    expect(activities()).toEqual(['standardsPlanning', 'printAssess', 'pedagogy', 'myAccount', 'ml']);
    for (const a of activities()) {
      await click(document.getElementById('fraction-section-tab-' + a));
      expect(activity()).toBe(a);
      expect(mode()).toBe('teacher');
      expect(panel().trim().length).toBeGreaterThan(40);
    }
  });

  it('a teacher reaches the answer-key tools, the tab guide and the full Help', async () => {
    await mount({ tab: 'printAssess' }, TEACHER);
    expect(panel()).toContain('Worksheet generator');
    expect(panel()).toContain('answer key');
    await mount({ tab: 'reference', refSub: 'tabguide' }, TEACHER);
    expect(panel()).toContain('every feature explained');
    await mount({ tab: 'aboutSuper', aboutSub: 'help' }, TEACHER);
    expect(panel()).toContain('(Learn, Practice, Apply, Teacher) group related work.');
    expect(panel()).toContain('Instructor tools');
    expect(panel()).toContain('For teachers');
  });

  it('a teacher\'s saved Teacher mode with no tab still opens it', async () => {
    await mount({ navMode: 'teacher' }, TEACHER);
    expect(mode()).toBe('teacher');
    expect(activity()).toBe('standardsPlanning');
  });
});

// WCAG relative luminance of what the browser would paint.
function rgbOf(c) {
  c = c.trim().toLowerCase();
  if (c === 'white') return [255, 255, 255];
  let m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(c);
  if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
  m = /^hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)$/.exec(c);
  if (!m) throw new Error('colour not read: ' + c);
  const hue = Number(m[1]) % 360, s = Number(m[2]) / 100, l = Math.min(1, Number(m[3]) / 100);
  const f = (n) => { const k = (n + hue / 30) % 12; return 255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
  return [f(0), f(8), f(4)];
}
const lum = (c) => { const [r, g, b] = rgbOf(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function digits(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = [];
  for (const svg of doc.querySelectorAll('svg[aria-label$="parts shaded"]')) {
    const paths = [...svg.querySelectorAll('path')];
    for (const t of svg.querySelectorAll('text')) {
      const n = Number(t.textContent);
      if (!Number.isInteger(n) || !/fill:/.test(t.getAttribute('style') || '')) continue;
      out.push({ n, ink: /fill:\s*([^;]+)/.exec(t.getAttribute('style'))[1], slice: paths[n - 1].getAttribute('fill'), cls: paths[n - 1].getAttribute('class') || '', style: t.getAttribute('style') });
    }
  }
  return out;
}

describe('Fraction Lab pie digits', () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 10, 12, 16])('the Build pie: every digit of a filled /%i reaches 4.5:1 on its own slice', (den) => {
    const ds = digits(renderTool('fractionViz', { _fractions: { tab: 'practice', pieces: { numerator: den, denominator: den } } }));
    expect(ds.length).toBe(den);
    for (const d of ds) expect(contrast(d.ink, d.slice), d.n + '/' + den + ' ' + d.ink + ' on ' + d.slice).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['rose', 'okabe', 'viridis', 'high'])('the %s palette: digits reach 4.5:1 on the model pie', (palette) => {
    const ds = digits(renderTool('fractionViz', { _fractions: { tab: 'models', palette, modelType: 'pie', pieces: { numerator: 3, denominator: 4 } } }));
    expect(ds.length).toBeGreaterThan(0);
    for (const d of ds) expect(contrast(d.ink, d.slice), d.ink + ' on ' + d.slice).toBeGreaterThanOrEqual(4.5);
  });

  it('the compare pies reach 4.5:1 too, including the darker colours', () => {
    const ds = digits(renderTool('fractionViz', { _fractions: { navMode: 'practice', tab: 'compare', mode: 'pie', num1: 2, den1: 3, num2: 3, den2: 4 } }));
    expect(ds.length).toBeGreaterThan(0);
    for (const d of ds) expect(contrast(d.ink, d.slice), d.ink + ' on ' + d.slice).toBeGreaterThanOrEqual(4.5);
  });

  it('a slice with a digit is not dimmed on hover, which would drop the digit under 4.5:1', () => {
    const ds = digits(renderTool('fractionViz', { _fractions: { tab: 'practice', pieces: { numerator: 3, denominator: 4 } } }));
    for (const d of ds) expect(d.cls.includes('hover:opacity-80')).toBe(false);
  });

  it('the contrast theme keeps white digits, the form its halo rule looks for', () => {
    const ds = digits(renderTool('fractionViz', { _fractions: { tab: 'practice', pieces: { numerator: 3, denominator: 4 } } }, { isContrast: true }));
    expect(ds.length).toBe(3);
    for (const d of ds) expect(d.style).toMatch(/fill:\s*white/);
  });
});
