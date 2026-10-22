import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'pipeWelding', pipe_sect: 'orbital' };
const STAGES = ['head', 'program', 'observe', 'record'];
const CAPTIONS = [
  '1. Torch is mounted in a "weld head" — small machine that clamps around the pipe + has a track that the torch travels along.',
  '2. Operator (not technically a welder — different certification) programs the weld parameters per pipe size + material.',
  '3. Machine welds the joint while operator observes (sometimes a screen showing weld pool). Operator can intervene if needed.',
  '4. Data logged for every weld — current, voltage, travel speed, time, position. Critical for traceability in regulated industries.',
];
let root, host;
const explorer = (node = host) => node.querySelector('[data-pipe-orbital]');
const num = (node, name) => Number(node.getAttribute(name));
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null; host?.remove();
});
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })); },
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function stage(id) { await click(host.querySelector('[data-pipe-orbital-stage="' + id + '"]')); }
async function angle(value) { await React.act(() => Simulate.change(host.querySelector('[data-pipe-orbital-angle]'), { target: { value: String(value) } })); }
async function buttonText(text) { await click([...host.querySelectorAll('button')].find(node => node.textContent.trim() === text)); }

describe('Orbital weld-head explorer', () => {
  it('replaces the static how-works card only in the orbital reading while retaining surrounding material', () => {
    const node = render(), section = explorer(node);
    expect(section.dataset).toMatchObject({ pipeOrbital: 'head', angle: '0' });
    expect(section.querySelectorAll('[data-pipe-orbital-stage]')).toHaveLength(4);
    expect(node.textContent).toContain('semiconductor fab pipe');
    expect(node.textContent).toContain('Comprehensive data logging for quality audit');
    expect(node.textContent).toContain('Limited to specific pipe sizes + joint configurations');
    expect(node.textContent).toContain('Arc Machines + Liburdi + Magnatech');
    for (const sect of ['overview', 'positions', 'passes', 'updown', 'pipeline', 'specialty', 'invalid']) expect(explorer(render({ pipe_sect: sect }))).toBeNull();
  });

  it('links each manual stage to its original caption and corresponding schematic focus', async () => {
    await mount();
    for (const [i, id] of STAGES.entries()) {
      await stage(id);
      const section = explorer();
      expect(section.dataset.pipeOrbital).toBe(id);
      expect(section.querySelector('[data-pipe-orbital-diagram]').dataset.pipeOrbitalDiagram).toBe(id);
      expect(section.querySelector('[data-pipe-orbital-focus]').dataset.pipeOrbitalFocus).toBe(id);
      expect(section.querySelectorAll('[data-pipe-orbital-stage][aria-pressed="true"]')).toHaveLength(1);
      expect(section.querySelector('[data-pipe-orbital-stage="' + id + '"]').getAttribute('aria-pressed')).toBe('true');
      expect(section.querySelector('[data-pipe-orbital-caption] > p').textContent).toBe(CAPTIONS[i]);
      expect(section.querySelector('[data-pipe-orbital-caption]').dataset.pipeOrbitalCaption).toBe(id);
      expect(section.querySelector('[data-pipe-orbital-caption]').getAttribute('aria-live')).toBe('polite');
      expect(section.querySelector('[data-pipe-orbital-probe]') !== null).toBe(id === 'observe');
    }
  });

  it('positions the torch around the same head using the existing clock geometry without rotating the pipe', async () => {
    await mount(); await stage('observe');
    const pipe = explorer().querySelector('[data-pipe-orbital-pipe]').outerHTML;
    const joint = explorer().querySelector('[data-pipe-orbital-joint]').outerHTML;
    for (const deg of [0, 37, 90, 180, 270, 359, 360]) {
      await angle(deg);
      const torch = explorer().querySelector('[data-pipe-orbital-torch]');
      const x = 185 + 112 * Math.sin(deg * Math.PI / 180), y = 165 - 112 * Math.cos(deg * Math.PI / 180);
      expect(num(torch, 'data-x')).toBeCloseTo(x, 10);
      expect(num(torch, 'data-y')).toBeCloseTo(y, 10);
      expect(num(torch, 'data-angle')).toBe(deg);
      expect(torch.getAttribute('transform')).toBe('translate(' + num(torch, 'data-x') + ' ' + num(torch, 'data-y') + ') rotate(' + deg + ')');
      expect(explorer().dataset.angle).toBe(String(deg));
      expect(explorer().querySelector('[data-pipe-orbital-angle-reading]').textContent).toBe(deg + '°');
      expect(explorer().querySelector('[data-pipe-orbital-pipe]').outerHTML).toBe(pipe);
      expect(explorer().querySelector('[data-pipe-orbital-joint]').outerHTML).toBe(joint);
      const focus = explorer().querySelector('[data-pipe-orbital-focus]');
      expect(num(focus, 'cx')).toBeCloseTo(x, 10); expect(num(focus, 'cy')).toBeCloseTo(y, 10);
      const marker = explorer().querySelector('[data-pipe-orbital-marker="3"] circle');
      expect(num(marker, 'cx')).toBeCloseTo(185 + 138 * Math.sin(deg * Math.PI / 180), 10);
      expect(num(marker, 'cy')).toBeCloseTo(165 - 138 * Math.cos(deg * Math.PI / 180), 10);
    }
    expect(explorer().querySelector('progress,[data-complete],[data-progress]')).toBeNull();
    expect(explorer().textContent).not.toMatch(/weld complete|accepted|passed|failed|temperature/i);
  });

  it('keeps the head label clear of the torch label throughout its circular orbit', () => {
    const section = explorer(render()), pipe = section.querySelector('[data-pipe-orbital-pipe]');
    const head = section.querySelector('[data-pipe-orbital-marker="1"] circle');
    const moving = section.querySelector('[data-pipe-orbital-marker="3"] circle');
    const fromCenter = node => Math.hypot(num(node, 'cx') - num(pipe, 'cx'), num(node, 'cy') - num(pipe, 'cy'));
    const closestDistance = Math.abs(fromCenter(head) - fromCenter(moving));
    expect(closestDistance).toBeGreaterThan(num(head, 'r') + num(moving, 'r'));
    expect(num(head, 'cx') - num(head, 'r')).toBeGreaterThan(0);
    expect(num(head, 'cy') - num(head, 'r')).toBeGreaterThan(0);
  });

  it('provides quarter-turn checkpoints, retains its angle across stages and bounds manual probe events', async () => {
    await mount(); await stage('observe');
    for (const stop of [0, 90, 180, 270, 360]) {
      await click(explorer().querySelector('[data-pipe-orbital-stop="' + stop + '"]'));
      expect(explorer().dataset.angle).toBe(String(stop));
      expect(explorer().querySelectorAll('[data-pipe-orbital-stop][aria-pressed="true"]')).toHaveLength(1);
      expect(explorer().querySelector('[data-pipe-orbital-stop="' + stop + '"]').getAttribute('aria-pressed')).toBe('true');
    }
    await angle(91.7); expect(explorer().dataset.angle).toBe('92');
    await angle('bad'); await angle(''); await angle('Infinity'); expect(explorer().dataset.angle).toBe('92');
    await angle(-9); expect(explorer().dataset.angle).toBe('0');
    await angle(999); expect(explorer().dataset.angle).toBe('360');
    await angle(125); await stage('record'); expect(explorer().querySelector('[data-pipe-orbital-angle]')).toBeNull();
    await stage('observe'); expect(explorer().dataset.angle).toBe('125');
    expect(explorer().querySelector('[data-pipe-orbital-angle]').value).toBe('125');
  });

  it('shows field names without inventing programmed values, logged readings or a welding-time model', async () => {
    await mount();
    expect(explorer().querySelector('[data-pipe-orbital-fields]')).toBeNull();
    await stage('program');
    const program = explorer().querySelector('[data-pipe-orbital-fields]');
    expect([...program.querySelectorAll('li')].map(n => n.textContent)).toEqual(['Current', 'Travel speed', 'Gas flow', 'Electrode position']);
    expect(program.textContent).not.toMatch(/\d/);
    expect(program.querySelector('input,select,output')).toBeNull();
    await stage('record');
    const record = explorer().querySelector('[data-pipe-orbital-fields]');
    expect([...record.querySelectorAll('li')].map(n => n.textContent)).toEqual(['Current', 'Voltage', 'Travel speed', 'Time', 'Position']);
    expect(record.textContent).not.toMatch(/\d/);
    expect(record.querySelector('input,select,output')).toBeNull();
    expect(explorer().querySelector('[data-pipe-orbital-model-note]').textContent).toContain('not programmed values or measured results');
    expect(explorer().textContent).toContain('does not calculate welding time, settings or weld quality');
  });

  it('keeps geometry exploration local and preserves pipe position, travel, pass stack and pay inputs', async () => {
    const app = await mount({ pipe2_pos: '6G', pipe2_hour: 3, pipe2_chal: 2, pipe2_dir: 'downhill', pipe2_stack: ['root', 'hot'], pipe2_rate: 57, pipe2_hrs: 64, pipe2_pd: 135, pipe2_pddays: 6, pipe2_weeks: 20, pipe2_costs: 400 });
    const before = JSON.stringify(app.latest()), writes = app.writes.length;
    for (const id of STAGES) await stage(id);
    await stage('observe'); await angle(217); await stage('record');
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
    await buttonText('⭐ Specialty pipe work + pay');
    expect(explorer()).toBeNull();
    await buttonText('⚙ Orbital + automated pipe');
    expect(explorer().dataset).toMatchObject({ pipeOrbital: 'record', angle: '217' });
    expect(JSON.stringify(app.latest())).toBe(before);
  });

  it('uses labeled native controls, wrapping HTML labels and distinct contrast states without autoplay', async () => {
    await mount({}, true); const section = explorer();
    expect(section.style.background).toBe('rgb(0, 0, 0)'); expect(section.style.color).toBe('rgb(255, 255, 255)');
    expect(section.querySelector('h4').style.color).toBe('rgb(255, 255, 0)');
    expect(section.querySelector('[role="group"]').className).toContain('flex-wrap');
    expect(section.querySelector('figcaption').className).toContain('flex-wrap');
    expect(section.querySelector('svg').style.width).toBe('100%');
    expect(section.querySelector('svg').getAttribute('role')).toBe('img');
    await React.act(() => section.querySelector('[data-pipe-orbital-stage="record"]').focus());
    expect(section.dataset.pipeOrbital).toBe('head');
    await stage('observe');
    const slider = section.querySelector('[data-pipe-orbital-angle]');
    expect(slider.type).toBe('range'); expect(slider.min).toBe('0'); expect(slider.max).toBe('360'); expect(slider.step).toBe('1');
    expect(slider.style.minHeight).toBe('44px');
    expect(section.querySelector('label[for="' + slider.id + '"]')).toBeTruthy();
    for (const button of section.querySelectorAll('button')) {
      expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px'); expect(button.className).toContain('focus:ring-4');
      const on = button.getAttribute('aria-pressed') === 'true';
      expect(button.style.background).toBe(on ? 'rgb(255, 255, 0)' : 'rgb(0, 0, 0)');
      expect(button.style.color).toBe(on ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 0)');
    }
    expect(section.querySelector('animate,animateTransform,canvas,[style*="animation"]')).toBeNull();
  });
});
