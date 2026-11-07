// Fraction Lab leftovers from the last review: the length model label, strip parts under the contrast theme's button
// rules, teacher links to retired tab ids, the "Mark today complete" click that claimed a streak, and teacher features
// named to students in About and Changelog.
// FRACTIONS_LEFTOVERS_SRC points the suite at another copy for the fail-first proof.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.FRACTIONS_LEFTOVERS_SRC || 'stem_lab/stem_tool_fractions.js';
const TEACHER = { isTeacherMode: true };
let root = null;

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : /create.*Gradient/.test(k) ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 20 }) : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  loadTool(FILE, 'fractionViz');
  window.__fracTabTracked = true;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; document.body.innerHTML = '';
  if (window._fracKbHandler) { window.removeEventListener('keydown', window._fracKbHandler); window._fracKbHandler = null; }
  vi.restoreAllMocks();
});

async function mount(saved, overrides) {
  if (root) { await React.act(async () => root.unmount()); root = null; }
  document.body.innerHTML = '<div id="root"></div>';
  const view = { toasts: [], xp: [] };
  function App() {
    const [state, setState] = React.useState({ _fractions: Object.assign({}, saved) });
    view.state = state._fractions;
    return window.StemLab._registry.fractionViz.render(makeCtx(Object.assign({ toolData: state, setToolData: setState, addToast: (m, k) => view.toasts.push([m, k]), awardXP: (...a) => view.xp.push(a) }, overrides)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const panel = () => document.getElementById('fraction-section-panel').textContent;
const activity = () => document.querySelector('#fraction-activity-list [aria-selected="true"]')?.id.replace('fraction-section-tab-', '');
const mode = () => document.querySelector('.fraction-lab-goals [aria-selected="true"]')?.id.replace('fraction-mode-tab-', '');
const subPressed = () => document.querySelector('.fraction-lab-subsections [aria-pressed="true"]')?.textContent || '';
const buttonText = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
const click = async (el) => { expect(!!el).toBe(true); await React.act(async () => el.click()); };

// ---- colour arithmetic, as the browser paints it
const rgb = (hex) => { const h = hex.replace('#', ''); const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); };
const named = (c) => ({ white: '#ffffff', black: '#000000' })[c] || c;
const lum = (c) => { const [r, g, b] = rgb(named(c)).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('1. the length model label', () => {
  const svgOf = (saved, ctx) => {
    const html = renderTool('fractionViz', { _fractions: Object.assign({ tab: 'models', model: 'length' }, saved) }, ctx);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.querySelector('svg[data-fraction-model="length"]');
  };
  it.each([[1, 8], [1, 3], [3, 8], [1, 2], [5, 8], [7, 8], [8, 8], [0, 4]])('%i/%i: ink on its own plate reaches 4.5:1, whatever is under the plate', (n, d) => {
    const svg = svgOf({ pieces: { numerator: n, denominator: d } });
    const text = svg.querySelector('text');
    const plate = svg.querySelector('[data-fraction-label-plate]');
    expect(!!plate, 'no plate behind the label').toBe(true);
    expect(contrast(text.getAttribute('fill'), plate.getAttribute('fill'))).toBeGreaterThanOrEqual(4.5);
    // The plate is drawn after the fill and ticks and before the text, and covers the text box.
    const kids = [...svg.children];
    expect(kids.indexOf(plate)).toBeGreaterThan(kids.findIndex((k) => k.tagName.toLowerCase() === 'rect'));
    expect(kids.indexOf(text)).toBe(kids.indexOf(plate) + 1);
    const cx = Number(text.getAttribute('x'));
    const half = (String(n + '/' + d).length * 14 * 0.6) / 2;
    expect(Number(plate.getAttribute('x'))).toBeLessThanOrEqual(cx - half);
    expect(Number(plate.getAttribute('x')) + Number(plate.getAttribute('width'))).toBeGreaterThanOrEqual(cx + half);
  });
  it('the contrast theme gets yellow on a black plate with a visible edge', () => {
    const svg = svgOf({ pieces: { numerator: 1, denominator: 8 } }, { isContrast: true });
    expect(svg.querySelector('text').getAttribute('fill')).toBe('#ffff00');
    const plate = svg.querySelector('[data-fraction-label-plate]');
    expect(plate.getAttribute('fill')).toBe('#000');
    expect(plate.getAttribute('stroke')).toBe('#fff');
  });
  it.each(['rose', 'okabe', 'viridis', 'high'])('the %s palette does not change the plate', (palette) => {
    const svg = svgOf({ palette, pieces: { numerator: 1, denominator: 4 } });
    expect(contrast(svg.querySelector('text').getAttribute('fill'), svg.querySelector('[data-fraction-label-plate]').getAttribute('fill'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('2. strip parts in the contrast theme', () => {
  const src = fs.readFileSync(FILE, 'utf8');
  const blockStart = src.indexOf("st.id = 'allo-fractions-hc-extra-css'");
  const line = src.slice(blockStart, src.indexOf('\n', src.indexOf('st.textContent', blockStart)));
  const extra = line.slice(line.indexOf('"') + 1, line.lastIndexOf('"')).replace(/\\"/g, '"');
  // The real rules in a real stylesheet, on top of the host's: every button black ink, and green under the pointer.
  const rulesFor = (sel) => extra.split('}').filter(Boolean).filter((r) => r.split('{')[0].split(/,(?=\.theme-contrast)/).some((s) => s.trim().endsWith(sel))).map((r) => r.split('{')[1]).join(';');
  it.each([
    ['.fraction-lab-strip-segment.is-filled:hover', '#ffff00', '#000'],
    ['.fraction-lab-strip-segment.is-empty:hover', '#000', '#fff'],
    ['.fraction-lab-strip-segment.is-filled', '#ffff00', '#000'],
    ['.fraction-lab-strip-segment.is-empty', '#000', '#fff'],
  ])('%s fixes both background and ink, so the host hover cannot leave yellow on green or black on black', (sel, bg, ink) => {
    const rule = rulesFor(sel);
    expect(rule, sel + ' has no rule').toContain('background-color:' + bg + '!important');
    expect(rule).toContain('color:' + ink + '!important');
    expect(contrast(bg, ink)).toBeGreaterThanOrEqual(4.5);
  });
  it('the words inside the part follow the part', () => {
    expect(rulesFor('.fraction-lab-strip-segment.is-filled:hover *')).toContain('color:#000!important');
    expect(rulesFor('.fraction-lab-strip-segment.is-empty:hover *')).toContain('color:#fff!important');
  });
  it('the pointer still shows, with an edge that reads at 3:1 on black', () => {
    const rule = rulesFor('.fraction-lab-strip-segment:hover');
    expect(rule).toContain('outline:3px solid #fff!important');
    expect(contrast('#fff', '#000')).toBeGreaterThanOrEqual(3);
  });
});

describe('3. teacher links go to the tool they name', () => {
  // id on the link -> the activity it must select, and the sub-view pressed inside it.
  const EXPECT = {
    mathtalks: ['pedagogy', 'Math talks', 'Math Talks'],
    practice: ['practice', null, null],
    benchmarks: ['drill', 'Estimation', null],
    examples: ['reference', 'Worked examples', null],
    operations: ['operations', null, null],
    exitticket: ['printAssess', 'Exit ticket', null],
    rtiprobe: ['printAssess', 'RTI Probes', null],
    cra: ['cra', null, null],
    pbank: ['drill', 'Practice bank', null],
    mastery: ['myAccount', 'Mastery', null],
    brain: ['brain', null, null],
    games: ['games', null, null],
    rwt: ['rwt', null, null],
    estimation: ['drill', 'Estimation', null],
    worksheets: ['printAssess', 'Worksheets', 'Worksheet generator'],
    wordproblems: ['wordproblems', null, null],
    refcard: ['printAssess', 'Reference card', null],
    cheatsheet: ['reference', 'Cheat sheet', null],
    activities: ['pedagogy', 'Hands-on activities', null],
    reports: ['printAssess', 'Reports', null],
  };
  const MODE = { pedagogy: 'teacher', printAssess: 'teacher', practice: 'learn', cra: 'learn', reference: 'learn', drill: 'practice', operations: 'practice', myAccount: 'teacher', brain: 'apply', games: 'apply', rwt: 'apply', wordproblems: 'apply' };

  async function check(saved, link) {
    await mount(saved, TEACHER);
    const b = document.querySelector('[data-fraction-tool-link="' + link + '"]');
    expect(!!b, 'no link for ' + link).toBe(true);
    await click(b);
    const [act, sub, text] = EXPECT[link];
    expect(activity(), link).toBe(act);
    expect(mode(), link).toBe(MODE[act]);
    if (sub) expect(subPressed(), link).toContain(sub);
    if (text) expect(panel()).toContain(text);
    expect(panel().trim().length, link).toBeGreaterThan(40);
  }

  // Which link lives on which screen, read from the page, so a new link cannot go unchecked.
  it('the routines tab: every routine, every link, resolves', async () => {
    const ROUTINES = ['k-3-warmup', 'g4-5-block', 'rti-tier2', 'enrichment', 'review-day'];
    let checked = 0;
    for (const routId of ROUTINES) {
      const saved = { tab: 'standardsPlanning', spSub: 'routines', routId };
      await mount(saved, TEACHER);
      const links = [...document.querySelectorAll('[data-fraction-tool-link]')].map((b) => b.getAttribute('data-fraction-tool-link'));
      expect(links.length, routId).toBeGreaterThan(2);
      for (const link of links) {
        expect(Object.keys(EXPECT), link).toContain(link);
        await check(saved, link);
        checked++;
      }
    }
    expect(checked).toBe(19);
  }, 90000);

  it.each(['worksheets', 'rtiprobe', 'refcard', 'cheatsheet', 'activities', 'reports'])('the print lab: %s resolves', async (link) => {
    await check({ tab: 'printAssess', paSub: 'printlab' }, link);
  });

  it('the review\'s own case: Worksheets opens the worksheet generator, not Standards & Planning', async () => {
    await check({ tab: 'printAssess', paSub: 'printlab' }, 'worksheets');
    expect(activity()).not.toBe('standardsPlanning');
  });

  it('a link reads as a tool, not an old id', async () => {
    await mount({ tab: 'standardsPlanning', spSub: 'routines', routId: 'rti-tier2' }, TEACHER);
    const text = [...document.querySelectorAll('[data-fraction-tool-link]')].map((b) => b.textContent);
    expect(text).toEqual(['→ Go to RTI Probes', '→ Go to Build, draw & write', '→ Go to Practice bank', '→ Go to Mastery']);
  });

  it('focus lands on what the link opened', async () => {
    vi.useFakeTimers();
    try {
      await mount({ tab: 'printAssess', paSub: 'printlab' }, TEACHER);
      await click(document.querySelector('[data-fraction-tool-link="worksheets"]'));
      await React.act(async () => { vi.runOnlyPendingTimers(); });
      expect(document.activeElement.id).toBe('fraction-section-panel');
    } finally { vi.useRealTimers(); }
  });

  it('a student still reaches no teacher tool through a saved route', async () => {
    await mount({ tab: 'printAssess', paSub: 'worksheets' }, { isTeacherMode: false });
    expect(activity()).toBe('practice');
  });
});

describe('4. the practice log claims nothing it cannot know', () => {
  const OPEN = { tab: 'myAccount', maSub: 'daily' };
  const LOG = () => buttonText('I practiced today');

  it('nothing reads as credit: no streak, no complete, no flame', async () => {
    await mount(OPEN, { isTeacherMode: false });
    const text = panel();
    expect(text).not.toMatch(/streak|Mark today|complete|🔥|Build a streak|5 problems per day/i);
    expect(text).toContain('does not check this log');
    expect(text).toContain('earns no XP or badges');
  });

  it('a student with nothing done is told what to do, and the link goes there', async () => {
    await mount(OPEN, { isTeacherMode: false });
    expect(panel()).toContain('Not yet? Answer some questions in Practice & quizzes, then come back and add today.');
    await click(document.querySelector('[data-fraction-tool-link="drill"]'));
    expect(activity()).toBe('drill');
  });

  it('a click adds the day, plainly: no XP, no streak toast', async () => {
    const v = await mount(OPEN, { isTeacherMode: false });
    expect(panel()).toContain('0 days logged');
    await click(LOG());
    expect(v.state.dpDays).toEqual([new Date().toLocaleDateString()]);
    expect(v.xp).toEqual([]);
    expect(v.toasts).toEqual([['Added today to your practice log.', 'info']]);
    expect(panel()).toContain('1 day logged');
    expect(panel()).toContain('Added today');
    expect(LOG()).toBeUndefined();
  });

  it('days already saved are kept and still counted and shown', async () => {
    const d = new Date(); d.setDate(d.getDate() - 2);
    const saved = [d.toLocaleDateString(), '1/1/2026', '1/2/2026'];
    const v = await mount(Object.assign({ dpDays: saved }, OPEN), { isTeacherMode: false });
    expect(panel()).toContain('3 days logged');
    expect(document.querySelectorAll('.grid-cols-7 .bg-emerald-700').length).toBe(1);
    await click(LOG());
    expect(v.state.dpDays).toEqual(saved.concat([new Date().toLocaleDateString()]));
  });

  it('a damaged save neither crashes nor counts', async () => {
    await mount(Object.assign({ dpDays: 'not a list' }, OPEN), { isTeacherMode: false });
    expect(panel()).toContain('0 days logged');
  });

  it('the old claim is gone from the tab strip', async () => {
    await mount(OPEN, { isTeacherMode: false });
    expect(subPressed()).toContain('Practice log');
    expect(subPressed()).not.toContain('streak');
  });
});

describe('5. About and Changelog for students', () => {
  const HIDDEN_ABOUT = ['37 CCSS standards mapped', '12 misconceptions library', '9 IEP goal templates', '4 lesson plan templates', '8 hands-on activity recipes', '5 math talk strings', 'Visit the Standards tab'];
  const HIDDEN_LOG = ['Learn, Practice, Apply, Teacher', 'RTI probe generator', 'IEP goal templates', 'lesson plan templates', 'misconception library', 'hands-on activity recipes', 'Worksheet generator', 'parent guide'];
  it('a student sees none of it, and keeps the rest', async () => {
    await mount({ tab: 'aboutSuper', aboutSub: 'about' }, { isTeacherMode: false });
    for (const bad of HIDDEN_ABOUT) expect(panel().includes(bad), bad).toBe(false);
    expect(panel()).toContain('7 visual models');
    expect(panel()).toContain('12 languages');
    await mount({ tab: 'aboutSuper', aboutSub: 'changelog' }, { isTeacherMode: false });
    for (const bad of HIDDEN_LOG) expect(panel().includes(bad), bad).toBe(false);
    expect(panel()).toContain('Added: Multilingual vocabulary in 12 languages.');
    expect(panel()).toContain('Added: Story mode');
    expect(panel()).toContain('Benchmark fractions reference.');
  });
  it('a teacher sees all of it', async () => {
    await mount({ tab: 'aboutSuper', aboutSub: 'about' }, TEACHER);
    for (const want of HIDDEN_ABOUT) expect(panel(), want).toContain(want);
    await mount({ tab: 'aboutSuper', aboutSub: 'changelog' }, TEACHER);
    for (const want of HIDDEN_LOG) expect(panel(), want).toContain(want);
  });
  it('"Multilingual" keeps its spelling: it is the term in education', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    expect(src).toContain("'Added: Multilingual vocabulary in 12 languages.'");
    expect(src).not.toContain('Multilingual'.replace('lingual', 'language') + ' vocabulary');
  });
});
