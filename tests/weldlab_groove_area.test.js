import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { stripPipeMotion } from './helpers/weldlab_pipe_motion_restore.js';
import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'pipeWelding', pipe_sect: 'passes' };
const GAP = 0.125, LAND = 0.0625, TANGENT = Math.tan(37.5 * Math.PI / 180), SCALE = 160;
const WALLS = [0.2, 0.218, 0.24, 0.25, 0.28, 0.432, 0.719, 1];
let host, root;
const core = () => window.__WeldLabCore;
const bench = (node = host) => node.querySelector('[data-pipe-area-comparison]');
const num = (node, name) => Number(node.getAttribute(name));
const plot = (node = host) => bench(node).querySelector('[data-pipe-area-plot]');
const originalWall = () => host.querySelector('input[aria-label="Pipe wall thickness"]');
const peerWall = () => bench().querySelector('[data-pipe-area-range]');
const named = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); host = null; });
function render(extra = {}, contrast = false) {
  const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node;
}
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (tool, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })); }
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value } })); }
const vertices = polygon => polygon.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number));
function physicalArea(polygon) {
  const points = vertices(polygon); let twice = 0;
  for (let i = 0; i < points.length; i++) { const next = points[(i + 1) % points.length]; twice += points[i][0] * next[1] - next[0] * points[i][1]; }
  return Math.abs(twice) / 2 / SCALE ** 2;
}
function assertCase(node, id, wall) {
  const panel = bench(node), section = panel.querySelector(`[data-pipe-area-case="${id}"]`), reading = panel.querySelector(`[data-pipe-area-reading="${id}"]`);
  const model = core().pipe2GroovePlan(wall), rectangle = GAP * model.wall, bevel = (model.wall - LAND) ** 2 * TANGENT;
  expect(num(section, 'data-wall')).toBe(model.wall); expect(num(section, 'data-center')).toBe(id === 'a' ? 180 : 500);
  for (const item of [section, reading]) {
    expect(num(item, 'data-area')).toBeCloseTo(model.area, 13); expect(num(item, 'data-rectangle')).toBeCloseTo(rectangle, 13); expect(num(item, 'data-bevel')).toBeCloseTo(bevel, 13);
  }
  const rect = section.querySelector('[data-pipe-area-rectangle]'), wedges = [...section.querySelectorAll('[data-pipe-area-bevel]')], outline = section.querySelector('[data-pipe-area-outline]');
  expect(physicalArea(rect)).toBeCloseTo(rectangle, 12); expect(wedges).toHaveLength(2);
  expect(physicalArea(wedges[0])).toBeCloseTo(bevel / 2, 12); expect(physicalArea(wedges[1])).toBeCloseTo(bevel / 2, 12);
  expect(physicalArea(rect) + wedges.reduce((sum, part) => sum + physicalArea(part), 0)).toBeCloseTo(model.area, 12);
  expect(physicalArea(outline)).toBeCloseTo(model.area, 12); expect(num(outline, 'data-area')).toBeCloseTo(model.area, 13);
  expect(section.querySelector('[data-pipe-area-rectangle-hatch]').getAttribute('points')).toBe(rect.getAttribute('points'));
  const cx = num(section, 'data-center'), points = vertices(outline), top = 252 - model.wall * SCALE, landY = 252 - LAND * SCALE;
  expect(points).toEqual([[cx - 10, 252], [cx + 10, 252], [cx + 10, landY], [cx + 10 + (model.wall - LAND) * TANGENT * SCALE, top], [cx - 10 - (model.wall - LAND) * TANGENT * SCALE, top], [cx - 10, landY]]);
  expect(points[1][0] - points[0][0]).toBe(GAP * SCALE); expect(252 - points[2][1]).toBe(LAND * SCALE);
  for (const [x, y] of points) { expect(x).toBeGreaterThanOrEqual(cx - 144); expect(x).toBeLessThanOrEqual(cx + 144); expect(y).toBeGreaterThanOrEqual(92); expect(y).toBeLessThanOrEqual(252); }
  expect((points[3][0] - points[2][0]) / (points[2][1] - points[3][1])).toBeCloseTo(TANGENT, 13);
  const dimension = section.querySelector('[data-pipe-area-thickness]'); expect(num(dimension, 'y1') - num(dimension, 'y2')).toBeCloseTo(model.wall * SCALE, 12);
  expect(reading.textContent).toContain(`Opening rectangle: 0.125 × ${model.wall} = ${rectangle.toFixed(5)} sq in.`);
  expect(reading.textContent).toContain(`Two bevel triangles: (${model.wall} − 0.0625)² × tan 37.5° = ${bevel.toFixed(5)} sq in.`);
  expect(reading.textContent).toContain(`Total: ${rectangle.toFixed(5)} + ${bevel.toFixed(5)} ≈ ${model.area.toFixed(5)} sq in.`);
}
function assertRatios(a, b) {
  const node = bench().querySelector('[data-pipe-area-ratios]'), areaA = core().pipe2GroovePlan(a).area, areaB = core().pipe2GroovePlan(b).area;
  expect(num(node, 'data-wall-ratio')).toBeCloseTo(b / a, 13); expect(num(node, 'data-area-ratio')).toBeCloseTo(areaB / areaA, 13);
  expect(node.textContent).toContain(`B ÷ A wall thickness: ${(b / a).toFixed(3)}×`); expect(node.textContent).toContain(`B ÷ A groove area: ${(areaB / areaA).toFixed(3)}×`);
}

describe('Pipe groove area and wall thickness comparison', () => {
  it('stays inside the existing closed model disclosure after all three exact original explanatory paragraphs', () => {
    const node = render(), panel = bench(node), details = panel.closest('details');
    expect(details).toBeTruthy(); expect(details.open).toBe(false); expect(details.querySelector('summary').textContent).toBe('How the pass count is estimated');
    expect(panel.previousElementSibling.textContent).toContain('Representative classroom numbers; the WPS governs a real joint.');
    expect(details.textContent).toContain('Groove area A = g × t + (t − f)² × tan 37.5°');
    expect(details.textContent).toContain('Fill passes = the area left ÷ one fill bead, rounded up.');
    expect(panel.querySelector('details')).toBeNull(); expect(num(panel, 'data-wall-a')).toBe(0.432); expect(num(panel, 'data-wall-b')).toBe(0.719);
    expect(node.querySelector('[data-pipe-pass-inspector]')).toBeTruthy(); expect(node.querySelector('[data-pipe-groove]')).toBeTruthy();
  });

  it('draws actual rectangle/triangle/outline areas equal to the existing groove integral for every endpoint and authored wall preset', async () => {
    await mount();
    for (const wallA of WALLS) {
      await change(originalWall(), String(wallA));
      for (const wallB of WALLS) {
        await change(peerWall(), String(wallB)); assertCase(host, 'a', wallA); assertCase(host, 'b', wallB); assertRatios(wallA, wallB);
        expect(num(bench(), 'data-scale')).toBe(160); expect(plot().getAttribute('viewBox')).toBe('0 0 680 340');
      }
    }
  }, 30000);

  it('keeps fixed shared inch axes, root opening, land and bevel slopes while only B changes', async () => {
    await mount({ pipe2_wall: 0.432, pipe2_stack: ['root', 'hot', 'fill'] });
    const a = bench().querySelector('[data-pipe-area-case="a"]').outerHTML, fixed = [...plot().querySelectorAll('[data-pipe-area-depth-grid]')].map(node => node.outerHTML);
    for (const wall of WALLS) {
      await change(peerWall(), String(wall)); expect(bench().querySelector('[data-pipe-area-case="a"]').outerHTML).toBe(a);
      expect([...plot().querySelectorAll('[data-pipe-area-depth-grid]')].map(node => node.outerHTML)).toEqual(fixed);
      for (const section of plot().querySelectorAll('[data-pipe-area-case]')) expect([...section.querySelectorAll('[data-pipe-area-depth-grid]')].map(node => [num(node, 'data-pipe-area-depth-grid'), num(node, 'y1')])).toEqual([[0, 252], [0.25, 212], [0.5, 172], [0.75, 132], [1, 92]]);
    }
  });

  it('uses exact existing presets and a match action that gives equal geometry and ratio1 even for an unrounded saved wall', async () => {
    await mount({ pipe2_wall: 0.432567 });
    for (const value of [0.218, 0.432, 0.719]) {
      await click(bench().querySelector(`[data-pipe-area-preset="${value}"]`)); expect(num(bench(), 'data-wall-b')).toBe(value);
      expect(bench().querySelectorAll('[data-pipe-area-preset][aria-pressed="true"]')).toHaveLength(1); assertCase(host, 'b', value);
    }
    await click(bench().querySelector('[data-pipe-area-match]')); assertRatios(0.432567, 0.432567);
    const a = vertices(bench().querySelector('[data-pipe-area-case="a"] [data-pipe-area-outline]'));
    const b = vertices(bench().querySelector('[data-pipe-area-case="b"] [data-pipe-area-outline]'));
    a.forEach(([x, y], i) => { expect(b[i][0] - x).toBeCloseTo(320, 12); expect(b[i][1]).toBe(y); });
    expect(num(bench().querySelector('[data-pipe-area-ratios]'), 'data-wall-ratio')).toBe(1); expect(num(bench().querySelector('[data-pipe-area-ratios]'), 'data-area-ratio')).toBe(1);
  });

  it('shows reciprocal ratios when the two wall values are exchanged and accounts for superlinear area without changing the model', async () => {
    await mount({ pipe2_wall: 0.432 }); assertRatios(0.432, 0.719);
    const first = bench().querySelector('[data-pipe-area-ratios]'), rWall = num(first, 'data-wall-ratio'), rArea = num(first, 'data-area-ratio'); expect(rArea).toBeGreaterThan(rWall);
    await change(originalWall(), '0.719'); await change(peerWall(), '0.432'); assertRatios(0.719, 0.432);
    const next = bench().querySelector('[data-pipe-area-ratios]'); expect(num(next, 'data-wall-ratio') * rWall).toBeCloseTo(1, 13); expect(num(next, 'data-area-ratio') * rArea).toBeCloseTo(1, 13);
  });

  it('normalizes range events locally and keeps malformed saved comparison fields outside the model', async () => {
    const app = await mount({ pipe10_wall: 100, pipe10_compare: 'bad', pipe2_wall: 'not-a-wall' });
    expect(num(bench(), 'data-wall-a')).toBe(0.432); expect(num(bench(), 'data-wall-b')).toBe(0.719);
    for (const value of ['', ' ', null, undefined, {}, [], 'Infinity', 'NaN', 'bad']) { await change(peerWall(), value); expect(num(bench(), 'data-wall-b')).toBe(0.719); }
    for (const [value, expected] of [['-1', 0.2], ['2', 1], ['0.218', 0.218]]) { await change(peerWall(), value); assertCase(host, 'b', expected); }
    expect(app.writes).toHaveLength(0); expect(app.latest()).toMatchObject({ pipe10_wall: 100, pipe10_compare: 'bad', pipe2_wall: 'not-a-wall' });
    expect(bench().outerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
  });

  it('changes no saved wall, stack, pass inspection, travel, pay or qualification state while exploring B', async () => {
    const saved = { pipe2_wall: 0.432, pipe2_stack: ['root', 'hot', 'fill'], pipe2_pos: '6G', pipe2_hour: 3, pipe2_dir: 'downhill', pipe2_rate: 55, pipe2_weeks: 12, qp_ans: { 0: 2 }, pipe2_scn: { 1: 0 } };
    const app = await mount(saved); await click(host.querySelector('[data-pipe-pass-node="1"]'));
    const before = JSON.stringify(app.latest()), count = app.writes.length, groove = host.querySelector('[data-pipe-groove]').outerHTML, inspector = host.querySelector('[data-pipe-pass-inspector]').outerHTML;
    for (const value of WALLS) await change(peerWall(), String(value)); await click(bench().querySelector('[data-pipe-area-match]'));
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes.length - count).toBe(0);
    expect(host.querySelector('[data-pipe-groove]').outerHTML).toBe(groove); expect(host.querySelector('[data-pipe-pass-inspector]').outerHTML).toBe(inspector);
    expect(host.querySelectorAll('[data-pipe-groove-bead]')).toHaveLength(3);
  });

  it('preserves the actual pass-order feedback gate, normalization, placed-pass inspector, undo and reset', async () => {
    const app = await mount(); await change(peerWall(), '1');
    expect(host.querySelectorAll('[data-pipe-pass-node]')).toHaveLength(0); await click(named('＋ Hot pass'));
    expect(host.textContent).toContain('Nothing to burn into yet'); expect(app.latest().pipe2_stack).toBeUndefined(); expect(host.querySelectorAll('[data-pipe-pass-node]')).toHaveLength(0);
    await click(named('＋ Root')); await click(named('＋ Hot pass')); expect(app.latest().pipe2_stack).toEqual(['root', 'hot']);
    await click(named('＋ Cap')); expect(host.textContent).toContain('Not full yet'); expect(app.latest().pipe2_stack).toEqual(['root', 'hot']);
    await click(host.querySelector('[data-pipe-pass-node="0"]')); expect(host.querySelector('[data-pipe-pass-detail]').dataset.passType).toBe('root');
    await click(named('↶ Undo')); expect(app.latest().pipe2_stack).toEqual(['root']);
    await change(originalWall(), '0.2'); expect(core().pipe2GroovePlan(0.2).fill).toBe(0); expect(host.querySelectorAll('[data-pipe-pass-node]')).toHaveLength(1); assertCase(host, 'a', 0.2);
    await click(named('↺ Reset')); expect(app.latest().pipe2_stack).toEqual([]); expect(host.querySelectorAll('[data-pipe-groove-bead]')).toHaveLength(0); expect(num(bench(), 'data-wall-b')).toBe(1);
  });

  it('remains absent from every other pipe topic and retains B through real topic navigation without mutating its saved choices', async () => {
    for (const section of ['overview', 'positions', 'updown', 'pipeline', 'orbital', 'specialty', 'bad']) expect(bench(render({ pipe_sect: section }))).toBeNull();
    const app = await mount(); await change(peerWall(), '0.218'); await click(named('📋 Why pipe is its own world')); expect(bench()).toBeNull();
    await click(named('🥞 Root + hot + fill + cap')); expect(num(bench(), 'data-wall-b')).toBe(0.218); expect(app.writes.every(([key]) => key === 'pipe_sect')).toBe(true);
  });

  it.each([false, true])('uses spatial and hatched distinctions, native44px controls, full-size HTML labels and high-contrast focus (contrast=%s)', contrast => {
    const node = render({}, contrast), section = bench(node), svg = plot(node);
    expect(section.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'); expect(section.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    for (const control of section.querySelectorAll('button,input')) expect(parseInt(control.style.minHeight)).toBeGreaterThanOrEqual(44);
    const range = section.querySelector('[data-pipe-area-range]'); expect(range.type).toBe('range'); expect(range.min).toBe('0.2'); expect(range.max).toBe('1'); expect(range.step).toBe('0.001'); expect(range.closest('label').textContent).toContain('Compare wall B');
    expect(svg.querySelector('text,foreignObject,animate,animateTransform')).toBeNull(); expect(svg.style.width).toBe('100%'); expect(svg.getAttribute('role')).toBe('img');
    expect(section.querySelector('figcaption').classList.contains('text-base')).toBe(true); expect(section.querySelector('[data-pipe-area-reading]').classList.contains('text-base')).toBe(true);
    expect(section.textContent).toContain('hatched center rectangle'); expect(section.textContent).toContain('two plain side triangles');
    const hatch = svg.querySelector('#pipe10-opening-hatch'); expect(hatch).toBeTruthy(); expect(svg.querySelectorAll('[id]')).toHaveLength(1);
    for (const overlay of svg.querySelectorAll('[data-pipe-area-rectangle-hatch]')) expect(overlay.getAttribute('fill')).toBe('url(#pipe10-opening-hatch)');
    expect(svg.querySelector('[data-pipe-area-rectangle]').getAttribute('fill')).toBe(contrast ? '#ffff00' : '#67e8f9'); expect(svg.querySelector('[data-pipe-area-bevel]').getAttribute('fill')).toBe(contrast ? '#ffffff' : '#fdba74');
    expect(section.querySelector('style').textContent).toContain(`outline:3px solid ${contrast ? '#ffff00' : '#075985'}!important`); expect(section.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
    expect(section.querySelector('[data-pipe-area-ratios]').getAttribute('aria-live')).toBe('polite'); expect(section.querySelector('[role="group"]').classList.contains('flex-wrap')).toBe(true);
  });

  it('restores every original pipe lesson byte after removing only the local hook, helper and additive call', () => {
    let source = stripWeldlabWcagFixes(readFileSync(resolve(SRC), 'utf8'));
    if (source.includes('// ⟦pipe13 local material-point motion⟧')) source = stripPipeMotion(source);
    let region = source.slice(source.indexOf('function PipeWeldingDeepDive('), source.indexOf('function RoboticAutomated('));
    const hook = '        var grooveCompareState = useState(0.719);\n'; expect(region.split(hook)).toHaveLength(2);
    const start = region.indexOf('        function renderGrooveAreaComparison() {'), end = region.indexOf('        function renderPasses() {', start); expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
    const helper = region.slice(start, end); expect(helper).not.toMatch(/usePersisted|\bupd\(|\bsetWall\(|\bsetStack\(|\bsetInspectPass\(|\bplacePass\(|requestAnimationFrame|setTimeout|setInterval/);
    region = region.slice(0, start) + region.slice(end); region = region.replace(hook, '');
    const call = '})),\n                renderGrooveAreaComparison()\n'; expect(region.split(call)).toHaveLength(2); region = region.replace(call, '}))\n');
    expect(createHash('sha256').update(region).digest('hex')).toBe('da1dcc950f4a7a0f3fe72565d5fb442e2ee10333149dc9792c038088f3ef4e3b');
  });
});
