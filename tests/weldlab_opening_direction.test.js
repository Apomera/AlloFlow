import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'qualPrep', qp_view: 'bend' };
const ANGLES = [0, 45, 90, 135, 180];
let root, host;
const bench = (node = host) => node.querySelector('[data-qp-opening-direction]');
const plot = (node = host) => bench(node).querySelector('[data-qp-opening-plot]');
const reading = () => bench().querySelector('[data-qp-opening-reading]');
const firstRange = () => host.querySelector('input[type="range"]');
const angleNumber = () => bench().querySelector('[data-qp-opening-angle-number]');
const angleRange = () => bench().querySelector('[data-qp-opening-angle-range]');
const named = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null; host?.remove(); host = null;
});
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}, contrast = false) {
  let latest;
  const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (tool, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })); }
    }));
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function input(node, value) { await React.act(() => Simulate.change(node, { target: { value: String(value) } })); }
async function preset(value) { await click(bench().querySelector(`[data-qp-opening-angle="${value}"]`)); }
function bCenter(svg) {
  const points = svg.querySelector('[data-qp-opening-endpoint="b"]').getAttribute('points').trim().split(/\s+/).map(point => point.split(',').map(Number));
  return points.reduce((sum, point) => [sum[0] + point[0] / 4, sum[1] + point[1] / 4], [0, 0]);
}
function coordinates(svg) {
  const a = svg.querySelector('[data-qp-opening-endpoint="a"]');
  return [[Number(a.getAttribute('cx')), Number(a.getAttribute('cy'))], bCenter(svg)];
}
function assertGeometry(flaw, angle) {
  const section = bench(), svg = plot(), [[ax, ay], [bx, by]] = coordinates(svg);
  const length = flaw / 32, radians = angle * Math.PI / 180;
  expect(section.dataset.length).toBe(String(length)); expect(section.dataset.angle).toBe(String(angle)); expect(section.dataset.scale).toBe('640');
  expect(svg.getAttribute('viewBox')).toBe('0 0 480 310');
  expect((ax + bx) / 2).toBeCloseTo(240, 10); expect((ay + by) / 2).toBeCloseTo(136, 10);
  expect(bx - ax).toBeCloseTo(length * 640 * Math.cos(radians), 10);
  expect(by - ay).toBeCloseTo(-length * 640 * Math.sin(radians), 10);
  expect(Math.hypot(bx - ax, by - ay)).toBeCloseTo(length * 640, 10);
  for (const [x, y] of [[ax, ay], [bx, by]]) { expect(x).toBeGreaterThanOrEqual(80); expect(x).toBeLessThanOrEqual(400); expect(y).toBeGreaterThanOrEqual(36); expect(y).toBeLessThanOrEqual(236); }
  const gauge = svg.querySelector('[data-qp-opening-reference]');
  expect(['x1', 'y1', 'x2', 'y2'].map(name => Number(gauge.getAttribute(name)))).toEqual([200, 268, 280, 268]);
  expect(Number(gauge.getAttribute('x2')) - Number(gauge.getAttribute('x1'))).toBe(0.125 * 640);
  const extent = svg.querySelector('[data-qp-opening-extent]');
  if (flaw === 0) {
    expect(extent).toBeNull(); expect(svg.querySelector('[data-qp-opening-dimension]')).toBeNull();
    expect(svg.querySelector('[data-qp-opening-zero]')).toBeTruthy(); expect([ax, ay]).toEqual([240, 136]); expect([bx, by]).toEqual([240, 136]);
    expect(reading().textContent).toContain('both endpoints coincide');
  } else {
    expect(extent).toBeTruthy(); expect(svg.querySelector('[data-qp-opening-zero]')).toBeNull();
    ['x1', 'y1', 'x2', 'y2'].forEach((name, index) => expect(Number(extent.getAttribute(name))).toBeCloseTo([ax, ay, bx, by][index], 10));
    expect(reading().textContent).toContain('stays the same at every direction');
  }
  expect(host.querySelector('[data-pipe2-bend-result]').dataset.pipe2BendResult).toBe(length > 0.125 ? 'reject' : 'accept');
  expect(angleNumber().value).toBe(String(angle)); expect(angleRange().value).toBe(String(angle));
  expect(reading().textContent).toContain(`Direction: ${angle}°`);
  expect(svg.outerHTML).not.toMatch(/NaN|Infinity/);
}

describe('Qualification opening direction bench', () => {
  it('adds a separate straight-reference bench after the intact measured bend, original result and complete acceptance note', () => {
    const node = render({ pipe2_bend: 'root', pipe2_flaw: 4 }), section = bench(node);
    expect(section).toBeTruthy(); expect(section.dataset.angle).toBe('0'); expect(section.dataset.length).toBe('0.125');
    expect(node.querySelector('[data-pipe2-finished-bend="root"]')).toBeTruthy(); expect(node.querySelector('[data-pipe2-journey-stage]')).toBeTruthy();
    expect(node.querySelector('[data-pipe2-bend-result]').textContent).toContain('Accept on this rule: 1/8 in.');
    expect(node.textContent).toContain('The code also caps the total of the smaller ones and treats corner cracks separately, so verify against the current edition.');
    expect(node.textContent).toContain('For common carbon steel the plunger is typically 1-1/2 in. across for a 3/8 in. thick strip; higher-strength metals use a larger plunger. Check the code figure.');
    expect(node.querySelector('input[type="range"]').hasAttribute('data-qp-opening-angle-range')).toBe(false);
    expect(section.textContent).toContain('flat, straight reference represents end-to-end extent only');
    expect(node.querySelector('[data-pipe2-bend-result]').compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps exact same-scale endpoint geometry for every stored opening and all five manual directions, including both acceptance boundaries', async () => {
    await mount();
    for (let flaw = 0; flaw <= 8; flaw++) {
      await input(firstRange(), flaw);
      for (const angle of ANGLES) { await preset(angle); assertGeometry(flaw, angle); }
    }
  });

  it('shows a true zero at coincident endpoints in arbitrary directions without a minimum-length substitute', async () => {
    await mount({ pipe2_flaw: 0 });
    for (const angle of [17, 67, 119, 179]) { await input(angleNumber(), angle); assertGeometry(0, angle); }
  });

  it('synchronizes bounded integer range, numeric and preset controls without changing the opening length', async () => {
    const { latest } = await mount({ pipe2_flaw: 5 });
    for (const [value, expected] of [[22, 22], [45.7, 46], [-30, 0], [300, 180]]) { await input(angleNumber(), value); assertGeometry(5, expected); }
    await input(angleNumber(), 'not-a-number'); assertGeometry(5, 180);
    await input(angleRange(), 73); assertGeometry(5, 73);
    expect(bench().querySelectorAll('[data-qp-opening-angle][aria-pressed="true"]')).toHaveLength(0);
    await preset(90); assertGeometry(5, 90);
    expect(bench().querySelectorAll('[data-qp-opening-angle][aria-pressed="true"]')).toHaveLength(1);
    expect(latest().pipe2_flaw).toBe(5);
    for (const node of bench().querySelectorAll('input')) { expect(node.min).toBe('0'); expect(node.max).toBe('180'); expect(node.step).toBe('1'); }
  });

  it('keeps all exploration local with zero saved writes and no changes to submitted quiz, scenario, type or opening records', async () => {
    const saved = { pipe2_flaw: 5, pipe2_bend: 'side', qp_ans: { 2: 1 }, pipe2_scn: { 0: 0 }, pipe2_qtest: 'pipe6GR' };
    const { latest, writes } = await mount(saved); const snapshot = JSON.stringify(latest()), storage = { ...localStorage };
    const beforeWrites = writes.length;
    for (const angle of ANGLES) await preset(angle);
    await input(angleNumber(), 37); await input(angleRange(), 157);
    expect(JSON.stringify(latest())).toBe(snapshot); expect(writes.length - beforeWrites).toBe(0); expect({ ...localStorage }).toEqual(storage);
    expect(latest().qp_ans).toEqual({ 2: 1 }); expect(latest().pipe2_scn).toEqual({ 0: 0 });
  });

  it('follows the existing stored length and specimen buttons without changing journey stage, outside surface, finished drawing or criterion', async () => {
    const { latest } = await mount({ pipe2_flaw: 4 });
    await preset(135); await click(host.querySelector('[data-pipe2-journey-step="bend"]'));
    for (const type of ['root', 'side', 'face']) {
      await click(named({ root: 'Root bend', side: 'Side bend', face: 'Face bend' }[type]));
      for (const flaw of [0, 3, 4, 5, 8]) {
        await input(firstRange(), flaw); assertGeometry(flaw, 135);
        expect(latest().pipe2_bend).toBe(type); expect(latest().pipe2_flaw).toBe(flaw);
        expect(host.querySelector('[data-pipe2-journey-stage]').dataset.pipe2JourneyStage).toBe('bend');
        expect(host.querySelector('[data-pipe2-selected-surface]').dataset.pipe2SelectedSurface).toBe(type);
        expect(host.querySelector('[data-pipe2-finished-bend]').dataset.pipe2FinishedBend).toBe(type);
      }
    }
  });

  it('keeps the actual quiz first-answer lock, score and reset behavior after local exploration', async () => {
    const { latest } = await mount(); await preset(90);
    await click([...host.querySelectorAll('button')].find(node => node.textContent.includes('Practice Quiz')));
    expect(bench()).toBeNull(); expect(host.textContent).toContain('Question 1 of 37'); expect(latest().qp_ans).toBeUndefined();
    let choices = host.querySelectorAll('button[role="radio"]'); expect(choices).toHaveLength(4);
    await click(choices[0]); choices = host.querySelectorAll('button[role="radio"]');
    expect([...choices].every(node => node.disabled)).toBe(true); await click(choices[1]);
    expect(latest().qp_ans).toEqual({ 0: 0 }); expect(host.textContent).toContain('Score 0/1');
    await click(named('↺ Reset quiz')); expect(latest().qp_ans).toEqual({}); expect(host.textContent).toContain('Score 0/0');
    await click(named('↩ Bend test')); assertGeometry(3, 90);
  });

  it('does not leak scenario evidence before submission and preserves the scenario first-answer lock', async () => {
    const { latest } = await mount(); await preset(45); await click(named('🧩 What a test qualifies'));
    expect(bench()).toBeNull(); expect(host.querySelector('[data-qp-job-inspector]')).toBeNull();
    let choices = host.querySelectorAll('[aria-label="Choose the qualification test"] button'); expect(choices.length).toBeGreaterThan(1);
    await click(choices[0]); choices = host.querySelectorAll('[aria-label="Choose the qualification test"] button');
    expect([...choices].every(node => node.disabled)).toBe(true); await click(choices[1]);
    expect(latest().pipe2_scn).toEqual({ 0: 0 }); expect(host.textContent).toContain('0 right first time');
    await click(named('↩ Bend test')); assertGeometry(3, 45);
  });

  it('uses native 44px controls, full-size HTML labels and strong contrast/focus without shrinking any required diagram text on phones', () => {
    const node = render({}, true), section = bench(node), svg = plot(node);
    expect(section.style.background).toBe('rgb(0, 0, 0)'); expect(section.style.color).toBe('rgb(255, 255, 255)');
    expect(svg.style.background).toBe('rgb(0, 0, 0)'); expect(svg.getAttribute('role')).toBe('img'); expect(svg.classList.contains('w-full')).toBe(true);
    expect(svg.querySelector('text, foreignObject')).toBeNull();
    expect(section.querySelector('figcaption').classList.contains('text-base')).toBe(true);
    expect(section.querySelector('[data-qp-opening-reading]').classList.contains('text-base')).toBe(true);
    expect([...section.querySelectorAll('label')].every(label => label.classList.contains('text-base'))).toBe(true);
    expect(svg.getAttribute('aria-label')).toContain('fixed comparison ruler is 1/8 inch long');
    expect(section.querySelector('[data-qp-opening-endpoint="a"]').getAttribute('stroke')).toBe('#ffff00');
    expect(section.querySelector('[data-qp-opening-endpoint="b"]').getAttribute('fill')).toBe('#ffff00');
    for (const control of section.querySelectorAll('button,input')) { expect(control.style.minHeight).toBe('44px'); expect(['BUTTON', 'INPUT']).toContain(control.tagName); }
    const pressed = section.querySelector('[data-qp-opening-angle][aria-pressed="true"]');
    expect(pressed.style.background).toBe('rgb(255, 255, 0)'); expect(pressed.style.color).toBe('rgb(0, 0, 0)');
    expect(section.querySelector('style').textContent).toContain('outline:3px solid #ffff00');
    expect(section.querySelector('style').textContent).toContain('transition:none!important');
    expect(svg.querySelector('animate,animateTransform')).toBeNull();
    expect(section.querySelector('[role="group"]').classList.contains('flex-wrap')).toBe(true);
  });

  it('restores every original qualification byte after removing only the one local hook, one helper and one render call', () => {
    const source = stripWeldlabWcagFixes(readFileSync(resolve(SRC), 'utf8')).replace(/\r\n/g, '\n');
    let region = source.slice(source.indexOf('function WelderQualPrep('), source.indexOf('function PipeWeldingDeepDive('));
    expect(region.match(/var openingDirectionState = useState\(0\);/g)).toHaveLength(1);
    expect(region.match(/function renderOpeningDirectionBench\(\)/g)).toHaveLength(1);
    const helperStart = region.indexOf('        function renderOpeningDirectionBench() {');
    const helperEnd = region.indexOf('        function renderBendSvg() {', helperStart);
    expect(helperStart).toBeGreaterThan(0); expect(helperEnd).toBeGreaterThan(helperStart);
    const helper = region.slice(helperStart, helperEnd);
    expect(helper).not.toMatch(/usePersisted|\bupd\(|\bsetAns\(|\bsetScnAns\(|\bsetFlaw\(|\bsetBend\(|setTimeout|setInterval|requestAnimationFrame/);
    region = region.slice(0, helperStart) + region.slice(helperEnd);
    region = region.replace('        var openingDirectionState = useState(0);\n', '');
    region = region.replace('            ),\n            renderOpeningDirectionBench()\n', '            )\n');
    expect(createHash('sha256').update(region).digest('hex')).toBe('cbb00d32d98345ff4f63605319f61495736518739f99ca0f71801792be5ab17f');
  });
});
