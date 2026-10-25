import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { stripJointPositionPair } from './helpers/weldlab_position_pair_restore.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'jointCatalog', jc_tab: 'butt', proc2_pos: '6G' };
const ORIGINAL = {
  '1G': ['Flat Groove', 'Plates flat, welded from above. The weld axis and the weld face are horizontal, and gravity holds the puddle in the joint. The easiest groove position.'],
  '2G': ['Horizontal Groove', 'Plates stand vertical with the seam running side to side. The weld axis is horizontal, and the puddle wants to sag onto the lower plate.'],
  '3G': ['Vertical Groove', 'Plates stand vertical with the seam running up and down. Usually welded vertical-up for structural work; downhill is used on thin material.'],
  '4G': ['Overhead Groove', 'Plates overhead, welded from underneath. The puddle hangs against gravity: the hardest plate groove position.'],
  '1F': ['Flat Fillet', 'The joint is turned 45° so it forms a trough: the weld face is horizontal and the torch points straight down. The easiest fillet.'],
  '2F': ['Horizontal Fillet', 'One plate flat and one standing up, like a T on a table. The weld axis is horizontal, and the weld is laid into the corner from above and to the side.'],
  '3F': ['Vertical Fillet', 'The weld axis is vertical: the fillet runs up a vertical inside corner, welded uphill or downhill.'],
  '4F': ['Overhead Fillet', 'The fillet is on the underside of the joint, welded from below with the torch pointing up.']
};
let host, root;
const panel = (node = host) => node.querySelector('[data-joint-position-pair]');
const card = (kind, node = host) => panel(node).querySelector('[data-joint-position-card="' + kind + '"]');
const inputs = (node = host) => [...panel(node).querySelectorAll('input[type="radio"]')];
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() { const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast, update: (bucket, key, value) => { writes.push([key, value]); setData(previous => ({ ...previous, [bucket]: { ...previous[bucket], [key]: value } })); } })); }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host); await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
async function digit(value) { const input = panel().querySelector('[data-joint-position-digit="' + value + '"]'); expect(input).toBeTruthy(); await React.act(() => Simulate.change(input, { target: { value, checked: true } })); }

describe('Local groove and fillet position pairing', () => {
  it('starts closed with native disclosure, one labelled radio group and a local flat pair', () => {
    const node = render(), section = panel(node);
    expect(section.tagName).toBe('DETAILS'); expect(section.open).toBe(false); expect(section.dataset.jointPositionPair).toBe('1');
    expect(section.querySelector('summary').textContent).toBe('Compare groove and fillet at one position');
    expect(section.querySelector('summary').style.minHeight).toBe('44px');
    expect(section.querySelector('fieldset legend').textContent).toBe('Plate-position number to compare');
    expect(inputs(node).map(input => [input.value, input.checked])).toEqual([['1', true], ['2', false], ['3', false], ['4', false]]);
    for (const input of inputs(node)) { expect(node.querySelector('label[for="' + input.id + '"]')).toBeTruthy(); expect(input.closest('label').style.minHeight).toBe('44px'); }
    expect(section.textContent).toContain('leaves the position chosen above unchanged');
    expect(card('G', node).dataset.code).toBe('1G'); expect(card('F', node).dataset.code).toBe('1F');
  });

  it.each(['1', '2', '3', '4'])('pairs groove and fillet for number %s with complete original copy and exactly reused original SVGs', async value => {
    // Render each untouched position chooser before mounting the interactive
    // fixture, keeping the server-rendered references independent of that root.
    const references = {};
    for (const kind of ['G', 'F']) {
      const code = value + kind, oldHost = render({ proc2_pos: code });
      const originalPositionSection = oldHost.querySelector('#proc2-pos-h')?.closest('section');
      const originalSvg = originalPositionSection?.querySelector('[data-proc2="pos-' + code + '"]');
      expect(originalSvg, 'original chooser reference for ' + code).toBeTruthy();
      references[code] = originalSvg.outerHTML;
    }
    await mount(); await digit(value);
    expect(panel().dataset.jointPositionPair).toBe(value);
    expect(inputs().filter(input => input.checked).map(input => input.value)).toEqual([value]);
    expect([...panel().querySelectorAll('[data-joint-position-card]')].map(node => node.dataset.code)).toEqual([value + 'G', value + 'F']);
    for (const kind of ['G', 'F']) {
      const code = value + kind, element = card(kind);
      expect(element.querySelector('[data-joint-position-name]').textContent).toBe(code + ' · ' + ORIGINAL[code][0]);
      expect(element.querySelector('[data-joint-position-description]').textContent).toBe(ORIGINAL[code][1]);
      expect(element.querySelector('svg').outerHTML).toBe(references[code]);
      expect(element.querySelector('svg').getAttribute('aria-label')).toBe(code + ' ' + ORIGINAL[code][0] + ': ' + ORIGINAL[code][1]);
      expect(element.querySelector('svg').getAttribute('viewBox')).toBe('0 0 200 160');
    }
  });

  it('keeps the original chooser, saved work, selected preparation and quiz records independent', async () => {
    const saved = { proc2_pos: '6G', proc2_prep: 'u', proc2_jqSeed: 31, proc2_jqAns: ['butt'], proc2_jqBest: 7, proc2_guess: { g1: 0 }, car2_cmp: [1, 2] };
    const app = await mount(saved), before = structuredClone(app.latest());
    const original = host.querySelector('[data-proc2="pos-6G"]').outerHTML;
    for (const value of ['4', '2', '3', '1']) await digit(value);
    expect(app.latest()).toEqual(before); expect(app.writes).toHaveLength(0);
    expect(host.querySelector('[data-proc2="pos-6G"]').outerHTML).toBe(original);
    expect(host.querySelector('[data-proc2="prep-u"]')).toBeTruthy();
    expect([...host.querySelectorAll('button[role="radio"]')].find(button => button.getAttribute('aria-label')?.startsWith('6G ')).getAttribute('aria-checked')).toBe('true');
  });

  it('preserves native disclosure state when changing pairs and never writes for opening or closing', async () => {
    const app = await mount(); const section = panel();
    await React.act(() => section.querySelector('summary').click()); expect(section.open).toBe(true);
    await digit('3'); expect(panel()).toBe(section); expect(section.open).toBe(true);
    await React.act(() => section.querySelector('summary').click()); expect(section.open).toBe(false); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('has labelled responsive diagrams and visible native focus support in contrast=%s', contrast => {
    const node = render({}, contrast), section = panel(node);
    expect(section.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    expect(section.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    expect(section.querySelector('[data-joint-position-cards]').className).toContain('grid-cols-1 sm:grid-cols-2');
    expect(section.querySelectorAll('svg[role="img"][aria-label]')).toHaveLength(2);
    expect(section.querySelector('style').textContent).toContain(':focus-visible'); expect(section.querySelector('style').textContent).toContain('animation:none!important');
    const ids = [...node.querySelectorAll('[id]')].map(element => element.id); expect(new Set(ids).size).toBe(ids.length);
  });

  it('stays outside the active quiz and does not introduce assessment hints', () => {
    const node = render({ proc2_jqOn: true, proc2_jqIdx: 0, proc2_jqSeed: 31, proc2_jqAns: [] });
    expect(panel(node)).toBeNull(); expect(node.textContent).toContain('Identify this joint');
  });

  it('recovers the complete original JointCatalog code after removing only the three local additions', () => {
    const source = readFileSync(resolve(SRC), 'utf8'); const restored = stripJointPositionPair(source);
    const begin = restored.indexOf('      function JointCatalog() {'), finish = restored.indexOf('      // ─────────────────────────────────────────────────────', begin);
    const expected = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-position-pair-baseline.json'), 'utf8'));
    expect(createHash('sha256').update(restored.slice(begin, finish)).digest('hex')).toBe(expected.jointCatalogSha256);
    expect(restored).not.toContain('joint8_');
  });
});
