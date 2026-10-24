import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'safetyHealth', sh_sect: 'controls', sh_mode: 'browse', safe2_hoc: { eng1: 0, ppe2: 4 }, sh_audit: { lev: 'no', ppe: 'yes' }, sh_shop_station: 'eyes', safe2_noise: [{ db: 100, h: 1 }, { db: 85, h: 6 }], safe2_gas: 'helium', safe2_level: 'middle' };
const LEVELS = [
  ['Elimination', 'Remove the hazard completely.', 'source', 'A · Hazard source'],
  ['Substitution', 'Swap in something less hazardous.', 'source', 'A · Hazard source'],
  ['Engineering controls', 'Isolate people from the hazard with equipment.', 'equipment', 'B · Equipment / workspace'],
  ['Administrative controls', 'Change the way people work: rules, schedules, training.', 'method', 'C · Work method'],
  ['PPE', 'Protect the worker with gear they wear.', 'worker', 'D · Worker']
];
const FEEDBACK = 'Engineering: the equipment pulls fume away without relying on anyone remembering a rule.';
let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-control-hierarchy]');
const map = () => panel().querySelector('[data-control-map]');
const placed = () => [...panel().querySelectorAll('[data-control-level]')].map(el => Number(el.dataset.placements));
async function level(i) { await React.act(() => panel().querySelector(`[data-control-level="${i}"]`).click()); }
async function textButton(text) { const el = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(el).toBeTruthy(); await React.act(() => el.click()); }
async function sort(id, value) { await React.act(() => Simulate.change(host.querySelector('#safe2-hoc-' + id), { target: { value } })); }
const geometry = () => [...map().querySelectorAll('[data-control-node-box]')].map(el => [el.dataset.controlNodeBox, ...['x', 'y', 'width', 'height'].map(k => el.getAttribute(k))]);

describe('Hierarchy of controls focus map', () => {
  it('starts at elimination and presents the existing five levels in NIOSH order', async () => {
    await mount();
    expect(panel().dataset).toMatchObject({ controlHierarchy: '0', focusTarget: 'source' });
    const buttons = [...panel().querySelectorAll('[data-control-level]')];
    expect(buttons).toHaveLength(5);
    expect(buttons.map(el => el.querySelector('span').textContent)).toEqual(LEVELS.map((lv, i) => `${i + 1}. ${lv[0]}`));
    expect(panel().querySelector('[data-control-definition]').textContent).toBe(LEVELS[0][1]);
    expect(panel().querySelector('[data-control-focus]').dataset.controlFocus).toBe('source');
    expect(panel().querySelectorAll('[data-control-node][data-active="true"]')).toHaveLength(1);
    expect(host.querySelectorAll('select[id^="safe2-hoc-"]')).toHaveLength(10);
    const outline = panel().querySelector('[data-control-outline]'); expect(outline.tagName).toBe('DETAILS');
    for (const [label, definition] of LEVELS) { expect(outline.textContent).toContain(label + ' — ' + definition); }
  });

  it('maps each level to its qualitative focus with the exact existing definition', async () => {
    await mount();
    for (const [i, [label, definition, target, reading]] of LEVELS.entries()) {
      await level(i);
      expect(panel().dataset.controlHierarchy).toBe(String(i)); expect(panel().dataset.focusTarget).toBe(target);
      expect(panel().querySelector('[data-control-reading]').dataset).toMatchObject({ controlReading: String(i), target });
      expect(panel().querySelector('[data-control-reading-label]').textContent).toBe(`${i + 1}. ${label}`);
      expect(panel().querySelector('[data-control-definition]').textContent).toBe(definition);
      expect(panel().querySelector('[data-control-target-reading]').textContent).toBe('Map focus: ' + reading);
      expect(map().querySelector('[data-control-focus]').getAttribute('data-control-focus')).toBe(target);
      expect(map().querySelector(`[data-control-node="${target}"]`).dataset.active).toBe('true');
      expect(panel().querySelectorAll('[data-control-level][aria-pressed="true"]')).toHaveLength(1);
    }
  });

  it('keeps four equal-size, full-strength nodes and unchanged symbols instead of an effectiveness area chart', async () => {
    await mount();
    const original = geometry();
    expect(original).toEqual([
      ['source', '24', '16', '280', '96'], ['equipment', '336', '16', '280', '96'],
      ['method', '24', '128', '280', '96'], ['worker', '336', '128', '280', '96']
    ]);
    const symbols = () => [...map().querySelectorAll('[data-control-symbol]')].map(el => el.outerHTML);
    const fixedSymbols = symbols();
    for (const i of [1, 2, 3, 4, 0]) {
      await level(i); expect(geometry()).toEqual(original); expect(symbols()).toEqual(fixedSymbols);
      expect(map().querySelectorAll('[data-control-focus]')).toHaveLength(1);
      for (const node of map().querySelectorAll('[data-control-node]')) { expect(node.getAttribute('opacity')).toBeNull(); expect(node.style.opacity).toBe(''); }
      for (const box of map().querySelectorAll('[data-control-node-box]')) expect(box.getAttribute('fill')).toBe('#1e293b');
    }
    expect(panel().querySelector('[data-control-map-note]').textContent).toContain('Their size and color do not measure effectiveness or exposure');
    expect(map().querySelector('linearGradient,radialGradient,animate,animateTransform')).toBeNull();
  });

  it('reports the learner placements without revealing or checking card classifications', async () => {
    const app = await mount(), before = JSON.stringify(app.latest()), writes = app.writes.length;
    expect(placed()).toEqual([1, 0, 0, 0, 1]);
    expect(host.textContent).not.toContain(FEEDBACK);
    for (const i of [2, 4, 1, 3, 0]) await level(i);
    expect(host.textContent).not.toContain(FEEDBACK);
    expect(host.textContent).not.toContain('PPE: the noise is still there');
    expect(panel().textContent).not.toContain('Put a fume-extractor hood');
    expect(panel().textContent).not.toContain('Hand out earplugs');
    expect(placed()).toEqual([1, 0, 0, 0, 1]);
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
    await sort('eng1', '2'); expect(placed()).toEqual([0, 0, 1, 0, 1]);
    expect(host.textContent).not.toContain(FEEDBACK); expect(app.latest().safe2_hoc).toEqual({ eng1: 2, ppe2: 4 });
  });

  it('preserves Check, wrong-answer feedback, edit re-gating and Reset behavior', async () => {
    const app = await mount();
    await level(3); await textButton('Check my sort');
    expect(host.textContent).toContain('1 of 10 placed correctly'); expect(host.textContent).toContain('You chose Elimination. ' + FEEDBACK);
    expect(host.textContent).toContain('Some cards have no level yet; place them all for a full score.');
    for (const i of [4, 0, 2]) await level(i);
    expect(host.textContent).toContain(FEEDBACK); expect(app.latest().safe2_hoc).toEqual(BASE.safe2_hoc);
    await sort('eng1', '2'); expect(host.textContent).not.toContain(FEEDBACK);
    await textButton('Check my sort'); expect(host.textContent).toContain('2 of 10 placed correctly'); expect(host.textContent).toContain('✓ ' + FEEDBACK);
    await textButton('↺ Reset');
    expect(app.latest().safe2_hoc).toEqual({}); expect(placed()).toEqual([0, 0, 0, 0, 0]);
    expect(host.textContent).not.toContain(FEEDBACK); expect(host.textContent).toContain('0 of 10 placed');
    expect(panel().dataset.controlHierarchy).toBe('2');
  });

  it('keeps reference selection local across tabs while preserving saved safety tasks and other explorer gates', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest());
    await level(4); expect(JSON.stringify(app.latest())).toBe(saved);
    await textButton('⚕️ Overview'); expect(panel()).toBeNull();
    await textButton('🧱 Hierarchy of controls'); expect(panel().dataset.controlHierarchy).toBe('4');
    expect(app.latest().safe2_hoc).toEqual(BASE.safe2_hoc); expect(app.latest().sh_audit).toEqual(BASE.sh_audit);
    expect(app.latest().safe2_noise).toEqual(BASE.safe2_noise); expect(app.latest().safe2_gas).toBe('helium'); expect(app.latest().safe2_level).toBe('middle');
    for (const sh_sect of ['fume', 'eyes', 'noise', 'burns', 'ergonomics', 'electrical', 'mental']) expect(renderTool('weldLab', { weldLab: { ...BASE, sh_sect } })).not.toContain('data-control-hierarchy');
    expect(renderTool('weldLab', { weldLab: { ...BASE, sh_mode: 'audit' } })).not.toContain('data-control-hierarchy');
  });

  it('has a primary source link and complete readable HTML equivalents for the map', async () => {
    await mount();
    const source = panel().querySelector('[data-control-source]');
    expect(source.href).toBe('https://www.cdc.gov/niosh/topics/hierarchy/default.html'); expect(source.textContent).toBe('NIOSH · Hierarchy of Controls');
    expect(source.target).toBe('_blank'); expect(source.rel).toContain('noopener');
    expect([...panel().querySelectorAll('[data-control-legend]')].map(el => el.textContent)).toEqual(['A · Hazard source', 'B · Equipment / workspace', 'C · Work method', 'D · Worker']);
    expect(panel().querySelector('[data-control-reading]').getAttribute('aria-live')).toBe('polite');
    expect(panel().querySelector('[data-control-map-note]').textContent).toContain('Selecting a level does not place or check any sorting cards');
    expect(host.textContent).toContain('Higher levels protect everyone without relying on people to do the right thing every time.');
    expect(map().getAttribute('viewBox')).toBe('0 0 640 240'); expect(map().style.width).toBe('100%'); expect(map().style.height).toBe('auto');
  });

  it('uses native44px manual controls, explicit contrast colors and full-strength focus outlines', async () => {
    await mount({}, true);
    expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const button of panel().querySelectorAll('button')) {
      expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px');
      expect(panel().querySelector('#' + button.getAttribute('aria-controls'))).toBeTruthy();
    }
    expect(panel().querySelector('[data-control-level="0"]').style.background).toBe('rgb(255, 255, 0)');
    expect(panel().querySelector('[data-control-level="0"]').style.color).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('[data-control-level="1"]').style.background).toBe('rgb(0, 0, 0)');
    expect(map().querySelector('[data-control-focus]').getAttribute('stroke')).toBe('#ffff00');
    const css = panel().querySelector('style').textContent;
    expect(css).toContain('outline: 3px solid #ffff00'); expect(css).toContain('a:focus-visible'); expect(css).toContain('summary:focus-visible');
    expect(css).toContain('transition: none !important'); expect(css).toContain('animation: none !important');
    expect(panel().querySelector('summary').style.minHeight).toBe('44px'); expect(panel().querySelector('a').style.minHeight).toBe('44px');
    expect(panel().querySelector('input,select,animate,animateTransform')).toBeNull();
    await level(4); expect(panel().dataset.focusTarget).toBe('worker');
  });
});
