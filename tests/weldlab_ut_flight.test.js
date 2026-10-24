import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { restoreUtFlight, UT_FLIGHT_BASELINE } from './helpers/weldlab_ut_flight_preservation.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const SPEEDS = { cs: 5.92, ss304: 5.74, al: 6.32 };
const BASE = { view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'choose', insp2_ndtDemo: 'ut', insp2_ndtMat: 'cs', insp2_utDepth: 0.5,
  weldBadges: {}, defectCatalog: {}, speedBest: {} };
let root, host;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); host = null; });
const core = () => window.__WeldLabCore;
const controls = (node = host) => node.querySelector('[data-ut-flight]');
const diagram = (node = host) => node.querySelector('[data-ut-flight-diagram]');
const num = (node, attr) => Number(node.getAttribute(attr));
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() { const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } })); }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host); await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function progress(value) { await React.act(() => Simulate.change(controls().querySelector('input'), { target: { value: String(value) } })); }
async function button(text) { await click([...host.querySelectorAll('button')].find(node => node.textContent.includes(text))); }
async function material(id) {
  const labels = { cs: 'Carbon steel', ss304: '304 stainless', al: 'Aluminum' }, group = host.querySelector('[role="radiogroup"][aria-label="Material"]');
  await click([...group.querySelectorAll('button')].find(node => node.textContent.includes(labels[id])));
}
function expected(depth, mat, percent) {
  const fraction = percent / 100, flawTime = 2 * depth * 25.4 / SPEEDS[mat], backwallTime = 2 * 25.4 / SPEEDS[mat];
  return { progress: percent, depth, material: mat, speed: SPEEDS[mat], time: flawTime * fraction, path: 2 * depth * fraction,
    position: 2 * depth * (fraction <= 0.5 ? fraction : 1 - fraction), flawTime, backwallTime,
    phase: percent === 100 ? 'received' : percent === 50 ? 'reflection' : percent < 50 ? 'outbound' : 'return' };
}
function assertFlight(node, depth, mat, percent) {
  const data = expected(depth, mat, percent), panel = controls(node), svg = diagram(node);
  for (const key of ['progress', 'depth', 'speed', 'time', 'path', 'position']) expect(num(panel, 'data-' + key)).toBeCloseTo(data[key], 12);
  expect(panel.dataset.material).toBe(mat); expect(panel.dataset.phase).toBe(data.phase); expect(num(panel, 'data-flaw-time')).toBeCloseTo(data.flawTime, 12); expect(num(panel, 'data-backwall-time')).toBeCloseTo(data.backwallTime, 12);
  expect(data.speed * num(panel, 'data-time') / 25.4).toBeCloseTo(data.path, 12);
  const marker = svg.querySelector('[data-ut-flight-marker]'), cursor = svg.querySelector('[data-ut-flight-cursor]');
  expect(num(marker, 'cx')).toBe(160); expect(num(marker, 'cy')).toBeCloseTo(30 + data.position * 80, 12); expect(marker.dataset.phase).toBe(data.phase);
  expect(num(cursor, 'x1')).toBeCloseTo(28 + data.time * 22, 12); expect(num(cursor, 'x2')).toBeCloseTo(num(cursor, 'x1'), 12);
  for (const [id, value] of [['time', data.time], ['path', data.path], ['position', data.position], ['roundtrip', depth * 2]]) {
    const reading = panel.querySelector(`[data-ut-flight-reading="${id}"]`); expect(num(reading, 'data-value')).toBeCloseTo(value, 12);
    expect(reading.querySelector('dd').textContent).toBe('≈ ' + value.toFixed(3) + ' ' + (id === 'time' ? 'µs' : 'in'));
  }
  expect(panel.querySelectorAll('[data-ut-flight-reading]')).toHaveLength(4);
  for (const id of ['depth', 'flawTime', 'backwallTime']) expect(panel.querySelector(`[data-ut-flight-reading="${id}"]`)).toBeNull();
  const workspace = node.querySelector('[data-ut-flight-workspace]');
  for (const [label, value, unit] of [['Flaw echo (F)', data.flawTime, 'µs'], ['Back wall (BW)', data.backwallTime, 'µs'], ['Depth = v × t ÷ 2', depth, 'in']]) {
    const heading = [...workspace.querySelectorAll('div')].find(element => element.textContent === label); expect(heading).toBeTruthy();
    const card = heading.parentElement; expect(card.children[1].textContent).toBe(value.toFixed(2)); expect(card.children[2].textContent).toBe(unit);
  }
  expect(Number(panel.querySelector('input').value)).toBe(percent); expect(panel.querySelector('[data-ut-flight-phase]').dataset.utFlightPhase).toBe(data.phase);
  expect(panel.querySelector('[data-ut-flight-identity]').textContent).toContain(`2 × ${depth.toFixed(3)} in = ${(2 * depth).toFixed(3)} in`);
  return data;
}
function fixedDiagram(node = host) {
  return [...diagram(node).children].filter(part => !part.hasAttribute('data-ut-flight-cursor') && !part.hasAttribute('data-ut-flight-marker')).map(part => part.outerHTML);
}

describe('Manual UT straight-beam round-trip diagram', () => {
  it('starts locally at zero despite lookalike saved progress, without adding another diagram or altering authored readouts', () => {
    const node = render({ insp11_progress: 100 }); assertFlight(node, 0.5, 'cs', 0); const workspace = node.querySelector('[data-ut-flight-workspace]');
    expect(workspace.querySelectorAll('svg')).toHaveLength(1); expect(controls(node).querySelectorAll('button')).toHaveLength(3);
    expect(workspace.textContent).toContain('Sound travels down and back, so the depth is half of speed × time.');
    expect(workspace.textContent).toContain('Blue: probe and beam. Black bar: flaw. Green trace: A-scan');
    expect(workspace.querySelector('[data-ut-flight-diagram]').getAttribute('aria-label')).toContain('before the back-wall echo');
  });

  it.each(['cs', 'ss304', 'al'])('connects five critical cursor landmarks to exact return-time and path identities for%s without moving reference echoes', async mat => {
    await mount({ insp2_ndtMat: mat }); const fixed = fixedDiagram();
    for (const percent of [0, 25, 50, 75, 100]) { await progress(percent); const data = assertFlight(host, 0.5, mat, percent); expect(fixedDiagram()).toEqual(fixed);
      if (percent === 50) { expect(data.position).toBe(0.5); expect(data.path).toBe(0.5); expect(data.time).toBeCloseTo(data.flawTime / 2, 12); }
      if (percent === 100) { expect(data.position).toBe(0); expect(data.path).toBe(1); expect(num(diagram().querySelector('[data-ut-flight-cursor]'), 'x1')).toBeCloseTo(num(diagram().querySelector('[data-ut-flight-echo="flaw"]'), 'x'), 12); }
    }
  });

  it('uses one fixed0–12µs axis and the original initial/flaw/backwall spike heights, with actual material-dependent echo positions', async () => {
    await mount(); const axis = diagram().querySelector('[data-ut-flight-fixed-axis]').outerHTML, observed = [];
    for (const mat of ['cs', 'ss304', 'al']) {
      if (mat !== 'cs') await material(mat); assertFlight(host, 0.5, mat, 0);
      expect(diagram().querySelector('[data-ut-flight-fixed-axis]').outerHTML).toBe(axis);
      const points = diagram().querySelector('[data-ut-flight-ascan]').getAttribute('points').split(' ').map(pair => pair.split(',').map(Number)); expect(points).toHaveLength(11);
      const time = core().insp2UtTof(0.5, mat), wall = core().insp2UtTof(1, mat);
      for (const [index, value, height] of [[2, 0.15, 58], [5, time, 44], [8, wall, 24]]) { expect(points[index][0]).toBeCloseTo(28 + 22 * value, 12); expect(points[index][1]).toBe(196 - height); }
      expect(points[0]).toEqual([28, 196]); expect(points.at(-1)).toEqual([292, 196]); observed.push(points[5][0]);
      for (const [id, value] of [['flaw', time], ['backwall', wall]]) { const echo = diagram().querySelector(`[data-ut-flight-echo="${id}"]`); expect(num(echo, 'data-time')).toBeCloseTo(value, 12); expect(num(echo, 'x')).toBeCloseTo(28 + value * 22, 12); }
    }
    expect(new Set(observed).size).toBe(3); expect(observed[1]).toBeGreaterThan(observed[0]); expect(observed[2]).toBeLessThan(observed[0]);
    const axisNode = diagram().querySelector('[data-ut-flight-fixed-axis]'); expect([num(axisNode, 'data-min'), num(axisNode, 'data-max'), num(axisNode, 'x1'), num(axisNode, 'x2')]).toEqual([0, 12, 28, 292]);
  });

  it('preserves original probe, plate, beam and flaw geometry at shallow/deep endpoints while the round trip remains bounded', () => {
    for (const depth of [0.1, 0.9]) for (const mat of ['cs', 'al']) {
      const node = render({ insp2_utDepth: depth, insp2_ndtMat: mat }); assertFlight(node, depth, mat, 0); const svg = diagram(node);
      expect(svg.getAttribute('viewBox')).toBe('0 0 320 220'); expect(svg.querySelector('polygon').getAttribute('points')).toBe('148,30 172,30 178,110 142,110');
      const plate = [...svg.querySelectorAll('rect')].find(rect => num(rect, 'x') === 20 && num(rect, 'y') === 30); expect(['width', 'height'].map(key => num(plate, key))).toEqual([280, 80]);
      const probe = [...svg.querySelectorAll('rect')].find(rect => num(rect, 'x') === 140); expect(['y', 'width', 'height'].map(key => num(probe, key))).toEqual([14, 40, 16]);
      const flaw = [...svg.querySelectorAll('rect')].find(rect => num(rect, 'x') === 146); expect(num(flaw, 'y')).toBeCloseTo(30 + depth * 80 - 2.5, 12); expect(num(flaw, 'height')).toBe(5);
      expect(num(controls(node), 'data-backwall-time')).toBeLessThan(12); expect(num(controls(node), 'data-flaw-time')).toBeLessThan(num(controls(node), 'data-backwall-time'));
    }
  });

  it('retains the existing depth range and pointer mapping while keeping progress local when depth changes', async () => {
    const app = await mount(); await progress(75); const workspace = host.querySelector('[data-ut-flight-workspace]');
    const depthSlider = workspace.querySelector('input:not([data-ut-flight-progress])'); expect(depthSlider.min).toBe('0.1'); expect(depthSlider.max).toBe('0.9'); expect(depthSlider.step).toBe('0.05');
    await React.act(() => Simulate.change(depthSlider, { target: { value: '0.9' } })); assertFlight(host, 0.9, 'cs', 75); expect(app.latest().insp2_utDepth).toBe(0.9);
    const svg = diagram(); svg.getBoundingClientRect = () => ({ top: 10, left: 0, width: 320, height: 220 });
    await React.act(() => Simulate.pointerDown(svg, { clientY: 10 + 30 + 0.25 * 80, pointerId: 1 })); assertFlight(host, 0.25, 'cs', 75);
    await React.act(() => Simulate.pointerMove(svg, { clientY: 10 + 30 + 0.6 * 80, pointerId: 1 })); assertFlight(host, 0.6, 'cs', 75);
    await React.act(() => Simulate.pointerUp(svg)); await React.act(() => Simulate.pointerMove(svg, { clientY: 110, pointerId: 1 })); assertFlight(host, 0.6, 'cs', 75);
    expect(app.writes.every(([key]) => key === 'insp2_utDepth')).toBe(true);
  });

  it('offers exact landmark presets, rounds/clamps finite cursor input, ignores malformed edits and never persists cursor work', async () => {
    const app = await mount({ insp2_bench: { uc1: { pick: 'accept', recs: [6.5] } }, insp2_ndtQuiz: { 0: 1 }, tech2_code_answers: { 1: 2 } });
    const saved = JSON.stringify(app.latest()), writes = app.writes.length;
    for (const percent of [50, 100, 0]) { await click(controls().querySelector(`[data-ut-flight-preset="${percent}"]`)); assertFlight(host, 0.5, 'cs', percent); }
    for (const [raw, expected] of [['12.6', 13], ['-4', 0], ['107', 100]]) { await progress(raw); assertFlight(host, 0.5, 'cs', expected); }
    for (const invalid of ['', 'junk', 'Infinity', 'NaN']) { await progress(invalid); assertFlight(host, 0.5, 'cs', 100); }
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
  });

  it('changes only the manual overlay and its HTML while chooser assessments, shared specimen and quiz/bench records stay untouched', async () => {
    const app = await mount({ insp2_ndtFlaw: 'lamination', insp2_ndtAccess: 'one' });
    const before = host.querySelector('[data-inspection-specimen]').outerHTML, saved = JSON.stringify(app.latest()), method = host.querySelector('[data-inspection-method-result]').outerHTML;
    for (const percent of [50, 100, 25]) { await progress(percent); expect(host.querySelector('[data-inspection-specimen]').outerHTML).toBe(before); expect(host.querySelector('[data-inspection-method-result]').outerHTML).toBe(method); }
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(0);
    expect(controls().textContent).not.toContain('Best choice'); expect(controls().textContent).toContain('do not estimate flaw size');
  });

  it('stays out of quiz mode and preserves the first-answer-final lock through leaving and revisiting the cursor', async () => {
    const app = await mount(); await progress(100); await button('Quiz: 8 cases'); expect(controls()).toBeNull(); expect(diagram()).toBeNull(); expect(host.querySelector('[data-inspection-specimen]')).toBeNull();
    const group = host.querySelector('[aria-label="Pick the best NDT method"]'); expect(group).toBeTruthy(); await click(group.querySelector('button'));
    expect(app.latest().insp2_ndtQuiz).toEqual({ 0: 0 }); expect([...group.querySelectorAll('button')].every(node => node.disabled)).toBe(true);
    await click(group.querySelectorAll('button')[1]); expect(app.latest().insp2_ndtQuiz).toEqual({ 0: 0 });
    await button('🧭 Chooser'); assertFlight(host, 0.5, 'cs', 100); await progress(25); expect(app.latest().insp2_ndtQuiz).toEqual({ 0: 0 });
    await button('Quiz: 8 cases'); expect([...host.querySelector('[aria-label="Pick the best NDT method"]').querySelectorAll('button')].every(node => node.disabled)).toBe(true);
  });

  it('adds no UT flight controls in other method demos or lesson sections and normalizes malformed legacy model saves', () => {
    for (const extra of [{ insp2_ndtDemo: 'mt' }, { insp2_ndtDemo: 'pt' }, { insp2_ndtDemo: 'rt' }, { insp_sect: 'ut' }, { insp_sect: 'rt' }, { insp_sect: 'et' }, { insp_sect: 'bench' }]) expect(controls(render(extra))).toBeNull();
    const node = render({ insp2_ndtMat: 'junk', insp2_utDepth: 'deep', insp11_progress: 999 }); assertFlight(node, 0.5, 'cs', 0); expect(diagram(node).outerHTML).not.toMatch(/NaN|Infinity/);
  });

  it.each([false, true])('provides native44px focusable controls, explicit contrast, readable fixed-axis labels and full-size HTML (contrast=%s)', contrast => {
    const node = render({}, contrast), panel = controls(node), svg = diagram(node), edge = contrast ? '#ffff00' : '#075985';
    expect(panel.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)'); expect(panel.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    for (const control of panel.querySelectorAll('button,input')) expect(parseFloat(control.style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(panel.querySelector('label').htmlFor).toBe('insp11-progress'); expect(panel.querySelector('input').getAttribute('aria-describedby')).toBe('insp11-flight-help');
    expect(panel.querySelector('dl').classList.contains('text-base')).toBe(true); expect(panel.querySelector('[data-ut-flight-phase]').getAttribute('aria-live')).toBe('polite');
    for (const text of svg.querySelectorAll('text')) expect(Number(text.getAttribute('font-size'))).toBeGreaterThanOrEqual(14);
    expect([...svg.querySelectorAll('text')].filter(node => /^\d+$/.test(node.textContent)).map(node => node.textContent)).toEqual(['0', '2', '4', '6', '8', '10', '12']);
    expect(svg.querySelector('animate,animateTransform,foreignObject')).toBeNull(); expect(panel.querySelector('style').textContent).toContain(`outline:3px solid ${edge}!important`); expect(panel.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
    expect(panel.textContent).toContain('manual diagram position'); expect(panel.textContent).toContain('not a live signal'); expect(panel.querySelector('[data-ut-flight-scope]').textContent).toContain('0–12 µs');
  });

  it('restores every original inspection byte with the durable original renderer fixture and only this round’s additions stripped', () => {
    const source = readFileSync(resolve(SRC), 'utf8').replace(/\r\n/g, '\n'), restored = restoreUtFlight(source);
    const region = restored.slice(restored.indexOf('      function InspectionCWIPrep() {'), restored.indexOf('      function ConsumablesDeepDive() {'));
    expect(createHash('sha256').update(region).digest('hex')).toBe('24958600efbe8f1f8c10202861f18cb60987280d6c907706a0834fb0a1a5006f');
    expect(UT_FLIGHT_BASELINE.originalRegionSha256).toBe('24958600efbe8f1f8c10202861f18cb60987280d6c907706a0834fb0a1a5006f');
    const start = source.indexOf('        function utFlightPoint() {'), end = source.indexOf('        function demoUt() {', start); expect(start).toBeGreaterThan(0); const helpers = source.slice(start, end);
    expect(helpers).not.toMatch(/usePersisted|\bupd\(|utDepthState\[1\]|ndtMatState\[1\]|requestAnimationFrame|setTimeout|setInterval|ndtQState\[1\]|benchState\[1\]/);
    expect(restored).not.toContain('data-ut-flight'); expect(restored).toContain(UT_FLIGHT_BASELINE.originalDemoUt);
  });
});
