import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const fixture = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-career-entry-baseline.json'), 'utf8'));
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'careerPaths', cp_view: 'paths' };
const FIELDS = { learning: 'desc', benefits: 'pros', commitments: 'cons', maine: 'maine' };
let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
const panel = (node = host) => node.querySelector('[data-career-entry]');
const $ = selector => panel().querySelector(selector);
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
function render(extra = {}) {
  const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }); return node;
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function pick(side, value) { await React.act(() => Simulate.change($('[data-career-entry-pick="' + side + '"]'), { target: { value } })); }
async function tab(label) { await click([...host.querySelectorAll('[role="tab"]')].find(node => node.textContent.includes(label))); }
function readEvidence(row, side) {
  const node = $('[data-career-entry-evidence="' + row + '"][data-side="' + side + '"]');
  return node.tagName === 'UL' ? [...node.querySelectorAll('li')].map(el => el.textContent) : node.textContent;
}
function assertPair(left, right) {
  expect(panel().dataset.left).toBe(String(left)); expect(panel().dataset.right).toBe(String(right));
  for (const [side, index] of [['left', left], ['right', right]]) {
    expect($('[data-career-entry-pick="' + side + '"]').value).toBe(String(index));
    expect($('[data-career-entry-side="' + side + '"]').dataset.index).toBe(String(index));
    for (const [row, field] of Object.entries(FIELDS)) expect(readEvidence(row, side)).toEqual(fixture[index][field]);
  }
}

describe('Career entry paths comparison desk', () => {
  it('preserves the exact four original routes and all descriptions, benefits, commitments and Maine leads', async () => {
    await mount(); expect(fixture).toHaveLength(4); const refs = [...panel().querySelectorAll('[data-career-entry-original]')];
    expect(refs).toHaveLength(4); expect($('[data-career-entry-reference]').tagName).toBe('DETAILS');
    for (let index = 0; index < fixture.length; index++) {
      const ref = refs[index], expected = fixture[index];
      expect(ref.querySelector('[data-career-entry-original-name]').textContent).toBe(expected.name);
      expect(ref.querySelector('[data-career-entry-original-desc]').textContent).toBe(expected.desc);
      expect([...ref.querySelectorAll('[data-career-entry-original-pros] li')].map(el => el.textContent)).toEqual(expected.pros);
      expect([...ref.querySelectorAll('[data-career-entry-original-cons] li')].map(el => el.textContent)).toEqual(expected.cons);
      expect(ref.querySelector('[data-career-entry-original-maine]').textContent).toBe(expected.maine);
    }
    for (const select of panel().querySelectorAll('select')) expect([...select.options].map(option => option.textContent)).toEqual(fixture.map(item => item.name));
  });

  it('renders all twelve distinct ordered route pairs from independent selections and swaps without changing evidence', async () => {
    const app = await mount(); const saved = structuredClone(app.latest()); let pairs = 0;
    for (let left = 0; left < 4; left++) for (let right = 0; right < 4; right++) {
      if (left === right) continue;
      await pick('left', String(left)); await pick('right', String(right)); assertPair(left, right); pairs++;
      expect($('[data-career-entry-same]')).toBeNull();
      await click($('[data-career-entry-swap]')); assertPair(right, left);
    }
    expect(pairs).toBe(12); expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it('allows all four same-route choices honestly and never silently substitutes another route', async () => {
    await mount();
    for (let index = 0; index < 4; index++) {
      await pick('left', String(index)); await pick('right', String(index)); assertPair(index, index);
      expect($('[data-career-entry-same]').textContent).toContain('Both sides show the same route.');
      await click($('[data-career-entry-swap]')); assertPair(index, index);
    }
    await pick('right', '0'); await pick('left', '2'); expect($('[data-career-entry-same]')).toBeNull();
  });

  it('emphasizes each row while keeping every benefit and commitment visible', async () => {
    const app = await mount(); await pick('left', '2'); await pick('right', '3');
    const saved = structuredClone(app.latest());
    for (const focus of ['learning', 'benefits', 'commitments', 'maine', 'all']) {
      await click($('[data-career-entry-focus="' + focus + '"]')); expect(panel().dataset.focus).toBe(focus); assertPair(2, 3);
      expect(panel().querySelectorAll('[data-career-entry-row]')).toHaveLength(4);
      const emphasized = [...panel().querySelectorAll('[data-career-entry-row][data-focused="true"]')]; expect(emphasized.map(el => el.dataset.careerEntryRow)).toEqual(focus === 'all' ? [] : [focus]);
      expect(panel().querySelectorAll('[data-career-entry-evidence][hidden], [data-career-entry-row][hidden]')).toHaveLength(0);
      expect(panel().querySelectorAll('[data-career-entry-focus][aria-pressed="true"]')).toHaveLength(1);
    }
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it('ignores invalid synthetic route values without corrupting selected routes or saved career work', async () => {
    const extra = { car2_earn: { ot: 3, loan: 5 }, car2_edit: 'college', car2_pred: { a25: 'college', a35: 'degree', shown: true }, car2_ladder: ['pipe6G', 'firstCert', 'cte', 'cwi'], car2_lad_chk: true, car2_lad_ref: true };
    const app = await mount(extra), saved = structuredClone(app.latest()); await pick('left', '3'); await pick('right', '2');
    for (const raw of ['-1', '4', '1.5', 'NaN', '', {}, null, 1]) { await pick('left', raw); assertPair(3, 2); }
    await click($('[data-career-entry-focus="maine"]')); await click($('[data-career-entry-swap]')); assertPair(2, 3);
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0); expect(panel().outerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
  });

  it('leaves the existing prediction and ladder reference gates in force when switching tabs', async () => {
    const app = await mount({ car2_pred: { a25: 'apprentice', a35: null, shown: false }, car2_lad_chk: false, car2_lad_ref: false });
    await pick('left', '2'); await click($('[data-career-entry-focus="commitments"]')); await tab('Earnings + debt'); expect(panel()).toBeNull();
    expect(host.textContent).toContain('Step 1 — predict before you look'); expect(host.textContent).not.toContain('Your predictions against the model');
    const lock = [...host.querySelectorAll('button')].find(el => el.textContent.includes('Lock in my predictions')); expect(lock.disabled).toBe(true); await click(lock); expect(app.latest().car2_pred.shown).toBe(false);
    await tab('Cert Ladder'); expect(panel()).toBeNull(); expect(host.textContent).not.toContain('Welding career ladder — typical progression');
    expect(app.latest().car2_lad_chk).toBe(false); expect(app.latest().car2_lad_ref).toBe(false);
    const show = [...host.querySelectorAll('button')].find(el => el.textContent === 'Show it now anyway'); expect(show).toBeTruthy(); await click(show);
    expect(host.textContent).toContain('Welding career ladder — typical progression'); expect(app.latest().car2_lad_ref).toBe(true);
    await tab('Entry Paths'); assertPair(2, 1); expect(panel().dataset.focus).toBe('commitments'); expect(app.latest().car2_pred.shown).toBe(false); expect(app.latest().car2_lad_chk).toBe(false);
  });

  it('stays exclusive to Entry Paths and retains the other career views', () => {
    for (const view of ['overview', 'earnings', 'ladder', 'employers', 'unknown']) expect(panel(render({ cp_view: view }))).toBeNull();
    expect(render({ cp_view: 'overview' }).textContent).toContain("What's the day-to-day actually like?");
    expect(render({ cp_view: 'employers' }).textContent).toContain('Other places to look');
    for (const view of ['careerStories', 'maineEcosystem']) expect(panel(render({ view }))).toBeNull();
  });

  it.each([false, true])('provides accessible native controls and readable manual illustrations (contrast=%s)', async contrast => {
    await mount({}, contrast);
    expect(panel().style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    expect(panel().style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(239, 246, 255)');
    expect(panel().style.getPropertyValue('--career-entry-focus')).toBe(contrast ? '#ffff00' : '#1e40af');
    expect(panel().querySelector('style').textContent).toContain(':is(button,select,summary):focus-visible{outline:3px solid var(--career-entry-focus);outline-offset:3px}');
    expect(panel().querySelector('style').textContent).toContain('transition-property:none!important');
    for (const control of panel().querySelectorAll('button,select,summary')) expect(parseInt(control.style.minHeight)).toBeGreaterThanOrEqual(44);
    for (const select of panel().querySelectorAll('select')) { expect(panel().querySelector('label[for="' + select.id + '"]')).toBeTruthy(); expect(select.style.appearance).toBe(''); }
    for (const svg of panel().querySelectorAll('svg')) { expect(svg.getAttribute('aria-label')).toBeTruthy(); expect(svg.getAttribute('viewBox')).toBe('0 0 260 152'); expect(svg.querySelector('text')).toBeNull(); }
    expect(panel().querySelectorAll('[data-career-entry-side] > h4')).toHaveLength(2);
    expect(panel().querySelector('animate,animateTransform,marquee,canvas')).toBeNull();
  });
});
