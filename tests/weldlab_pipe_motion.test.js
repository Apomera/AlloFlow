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
const BASE = { view: 'pipeWelding', pipe_sect: 'positions', pipe2_pos: '5G', pipe2_hour: 6 };
let host, root;
const panel = (node = host) => node.querySelector('[data-pipe13-motion]');
const card = (id, node = host) => panel(node).querySelector('[data-pipe13-card="' + id + '"]');
const n = (node, attribute) => Number(node.getAttribute(attribute));
const cpt = (radius, degrees) => [100 + radius * Math.sin(degrees * Math.PI / 180), 100 - radius * Math.cos(degrees * Math.PI / 180)];
const oldSketches = node => [...node.querySelectorAll('svg')].filter(svg => !svg.closest('[data-pipe13-motion]')).map(svg => svg.outerHTML);

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
      update: (tool, key, value) => { writes.push([key, value]); setData(previous => ({ ...previous, [tool]: { ...previous[tool], [key]: value } })); }
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value } })); }
const hour = value => change(panel().querySelector('[data-pipe13-hour]'), value);
const progress = value => change(panel().querySelector('[data-pipe13-progress]'), value);
const named = text => [...host.querySelectorAll('button')].find(button => button.textContent.trim() === text);

function assertGeometry(startHour, percent, node = host) {
  const section = panel(node), start = startHour % 12 * 30, turn = (360 - start) % 360, rotation = turn * percent / 100;
  expect(n(section, 'data-hour')).toBe(startHour); expect(n(section, 'data-progress')).toBe(percent);
  expect(n(section, 'data-start-angle')).toBe(start); expect(n(section, 'data-turn-to-top')).toBe(turn); expect(n(section, 'data-rotation')).toBe(rotation);
  for (const id of ['1G', '5G']) {
    const scene = card(id, node), rolled = id === '1G', angle = rolled ? start + rotation : start, actualRotation = rolled ? rotation : 0;
    const pipe = scene.querySelector('[data-pipe13-pipe]'), point = scene.querySelector('[data-pipe13-material-point]'), torch = scene.querySelector('[data-pipe13-torch]');
    expect(scene.querySelector('svg').getAttribute('viewBox')).toBe('0 0 200 200');
    expect(pipe.getAttribute('transform')).toBe('rotate(' + actualRotation + ' 100 100)'); expect(n(pipe, 'data-rotation')).toBe(actualRotation);
    const circles = [...pipe.querySelectorAll('circle')]; expect(circles.map(circle => [n(circle, 'cx'), n(circle, 'cy'), n(circle, 'r')])).toEqual([[100, 100, 52], [100, 100, 40]]);
    const expected = cpt(52, angle); expect(n(point, 'data-angle')).toBe(angle);
    expect(n(point, 'cx')).toBeCloseTo(expected[0], 11); expect(n(point, 'cy')).toBeCloseTo(expected[1], 11);
    expect(n(point, 'cx')).toBeGreaterThanOrEqual(48); expect(n(point, 'cx')).toBeLessThanOrEqual(152);
    expect(n(point, 'cy')).toBeGreaterThanOrEqual(48); expect(n(point, 'cy')).toBeLessThanOrEqual(152);
    // The registered material stripe undergoes the same rigid transform as the
    // visible pipe ticks. Its transformed tip exactly meets the direct marker.
    const stripe = pipe.querySelector('[data-pipe13-material-reference]'), radians = actualRotation * Math.PI / 180;
    const dx = n(stripe, 'x2') - 100, dy = n(stripe, 'y2') - 100;
    expect(100 + dx * Math.cos(radians) - dy * Math.sin(radians)).toBeCloseTo(n(point, 'cx'), 11);
    expect(100 + dx * Math.sin(radians) + dy * Math.cos(radians)).toBeCloseTo(n(point, 'cy'), 11);
    expect(pipe.querySelectorAll('[data-pipe13-stock-tick]')).toHaveLength(4);
    const expectedTorchAngle = rolled ? 0 : start; expect(n(torch, 'data-angle')).toBe(expectedTorchAngle);
    const tip = cpt(54, expectedTorchAngle), drawnTip = torch.querySelector('circle');
    expect(n(drawnTip, 'cx')).toBe(Math.round(tip[0] * 10) / 10); expect(n(drawnTip, 'cy')).toBe(Math.round(tip[1] * 10) / 10);
  }
}

describe('Rolled and fixed pipe material-point comparison', () => {
  it('starts closed with separate local native controls and two matching end views', () => {
    const node = render({ pipe2_pos: '6GR', pipe2_hour: 9 }), section = panel(node);
    expect(section.tagName).toBe('DETAILS'); expect(section.open).toBe(false);
    expect(section.querySelector('summary').textContent).toBe('Follow a point: rolled 1G and fixed 5G'); expect(section.querySelector('summary').style.minHeight).toBe('44px');
    const select = section.querySelector('[data-pipe13-hour]'), range = section.querySelector('[data-pipe13-progress]');
    expect(select.tagName).toBe('SELECT'); expect(select.closest('label').textContent).toContain('Marked point before turning');
    expect([...select.options].map(option => Number(option.value))).toEqual([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]); expect(select.value).toBe('6');
    expect(range.type).toBe('range'); expect(range.closest('label').textContent).toContain('Turn the 1G drawing toward the top'); expect([range.min, range.max, range.step, range.value]).toEqual(['0', '100', '1', '0']);
    expect(section.querySelectorAll('svg[role="img"][aria-label]')).toHaveLength(2); expect(oldSketches(node)).toHaveLength(2);
    expect(section.querySelector('[data-pipe13-scope]').textContent).toBe('The slider shows progress through an illustrated turn. No timing or rotation speed is assigned.');
    assertGeometry(6, 0, node);
  });

  it('follows the same material point through exact clockwise turns for every clock start', async () => {
    await mount();
    for (const start of [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      await hour(start); assertGeometry(start, 0);
      for (const percent of [13, 50, 100]) { await progress(percent); assertGeometry(start, percent); }
      const point = card('1G').querySelector('[data-pipe13-material-point]');
      expect(n(point, 'cx')).toBeCloseTo(100, 11); expect(n(point, 'cy')).toBeCloseTo(48, 11);
      expect(card('1G').querySelector('[data-pipe13-card-reading]').textContent).toContain('Marked point: 0° clockwise from the top.');
    }
  });

  it('keeps the 1G torch stationary and the 5G point, pipe and torch unchanged by turning', async () => {
    await mount(); await hour(3);
    const rolledTorch = card('1G').querySelector('[data-pipe13-torch]').outerHTML, fixedScene = card('5G').outerHTML;
    for (const value of [1, 37, 50, 99, 100, 0]) {
      await progress(value);
      expect(card('1G').querySelector('[data-pipe13-torch]').outerHTML).toBe(rolledTorch); expect(card('5G').outerHTML).toBe(fixedScene);
    }
    await progress(100); await hour(9); assertGeometry(9, 0);
    expect(card('5G').querySelector('[data-pipe13-torch-reading]').textContent).toContain('9 o’clock');
  });

  it('handles the already-top point without inventing a full turn and bounds manual input', async () => {
    await mount(); await hour(12); await progress(100); assertGeometry(12, 100);
    expect(panel().querySelector('[data-pipe13-turn-note]').textContent).toContain('required turn is 0°');
    await hour(999); assertGeometry(12, 0); await hour(-2); assertGeometry(1, 0); await hour(3.4); assertGeometry(3, 0);
    await progress(999); assertGeometry(3, 100); await progress(-2); assertGeometry(3, 0); await progress(37.2); assertGeometry(3, 37);
    await progress('not a number'); await hour('not a number'); assertGeometry(3, 37);
    expect(panel().outerHTML).not.toMatch(/(?:NaN|Infinity|undefined)/);
  });

  it('retains native disclosure state while all exploration leaves saved work and original drawings untouched', async () => {
    const saved = { pipe2_pos: '6GR', pipe2_hour: 9, pipe2_chal: -1, pipe2_stack: ['root', 'hot'], pipe2_wall: .719, pipe2_dir: 'downhill', pipe2_rate: 57, qp_ans: { 0: 1 }, pipe2_scn: { 1: 0 } };
    const app = await mount(saved), before = structuredClone(app.latest()), originals = oldSketches(host), section = panel();
    await click(section.querySelector('summary')); expect(section.open).toBe(true);
    for (const start of [3, 6, 9, 12]) { await hour(start); await progress(100); expect(panel()).toBe(section); expect(section.open).toBe(true); }
    await click(section.querySelector('summary')); expect(section.open).toBe(false);
    expect(oldSketches(host)).toEqual(originals); expect(app.latest()).toEqual(before); expect(app.writes).toHaveLength(0);
    expect(host.textContent).toContain('the ring beside the joint blocks your rod');
  });

  it('stays absent for every active clock challenge and preserves its existing answer progression', async () => {
    for (const index of [0, 1, 2]) expect(panel(render({ pipe2_chal: index }))).toBeNull();
    expect(panel(render({ pipe2_chal: -1 }))).toBeTruthy(); expect(panel(render({ pipe2_chal: 3 }))).toBeTruthy();
    const app = await mount({ pipe2_chal: 0, pipe2_hour: 1, pipe2_pos: '6G' });
    expect(panel()).toBeNull(); expect(host.textContent).toContain('where are you welding OVERHEAD?');
    const hours = [...host.querySelectorAll('[role="radiogroup"]')].find(group => group.querySelectorAll('button').length === 12);
    await click([...hours.querySelectorAll('button')].find(button => button.textContent.trim() === '6'));
    expect(app.latest().pipe2_chal).toBe(1); expect(app.latest().pipe2_hour).toBe(6); expect(app.latest().pipe2_pos).toBe('6G'); expect(panel()).toBeNull();
    await click(named('Stop the check')); expect(app.latest().pipe2_chal).toBe(-1); expect(panel()).toBeTruthy(); assertGeometry(6, 0);
  });

  it.each([false, true])('keeps native focus, readable responsive cards and rigid static drawing in contrast=%s', contrast => {
    const node = render({}, contrast), section = panel(node), accent = contrast ? '#ffff00' : '#075985';
    expect(section.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(240, 249, 255)'); expect(section.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    expect(section.querySelector('[data-pipe13-cards]').className).toContain('grid-cols-1 sm:grid-cols-2');
    expect(section.querySelector('style').textContent).toContain('outline:3px solid ' + accent + '!important'); expect(section.querySelector('style').textContent).toContain('transition:none!important;animation:none!important');
    for (const control of section.querySelectorAll('summary,select,input')) expect(control.style.minHeight).toBe('44px');
    for (const point of section.querySelectorAll('[data-pipe13-material-point]')) expect(point.getAttribute('stroke')).toBe(contrast ? '#ffff00' : '#67e8f9');
    expect(section.querySelector('input').getAttribute('aria-valuetext')).toContain('pipe rotation 0.0 degrees');
    const ids = [...node.querySelectorAll('[id]')].map(element => element.id); expect(new Set(ids).size).toBe(ids.length);
  });

  it('restores the complete previous pipe module after stripping only its local hook, helper and gated call', () => {
    const source = readFileSync(resolve(SRC), 'utf8'), restored = stripPipeMotion(source), normalized = stripPipeMotion(stripWeldlabWcagFixes(source));
    const begin = normalized.indexOf('function PipeWeldingDeepDive('), end = normalized.indexOf('function RoboticAutomated(', begin);
    expect(createHash('sha256').update(normalized.slice(begin, end)).digest('hex')).toBe('3ed845098b864bf9594c44384c3905758413febbe4450bbb831811f7266f6ecb');
    expect(restored).not.toContain('pipe13_'); expect(restored).not.toContain('data-pipe13-');
    const originalBegin = source.indexOf('      function PipeWeldingDeepDive() {'), originalEnd = source.indexOf('      function RoboticAutomated() {', originalBegin);
    const restoredBegin = restored.indexOf('      function PipeWeldingDeepDive() {'), restoredEnd = restored.indexOf('      function RoboticAutomated() {', restoredBegin);
    expect(source.slice(0, originalBegin)).toBe(restored.slice(0, restoredBegin)); expect(source.slice(originalEnd)).toBe(restored.slice(restoredEnd));
    expect(source.startsWith('\uFEFF')).toBe(restored.startsWith('\uFEFF')); expect((source.match(/\n/g) || []).length - (restored.match(/\n/g) || []).length).toBeGreaterThan(0);
    expect(source.replace(/\r\n/g, '\n')).not.toContain('\r'); expect(restored.replace(/\r\n/g, '\n')).not.toContain('\r');
    const helper = source.slice(source.indexOf('        function renderPipeMotionComparison() {'), source.indexOf('        // ⟦/pipe13 rolled and fixed material comparison⟧'));
    expect(helper).not.toMatch(/usePersisted|\bupd\(|\bsetHour\(|\bpickHour\(|\bsetPos\(|\bsetChal\(|\bsetStack\(|requestAnimationFrame|setTimeout|setInterval/);
  });
});
