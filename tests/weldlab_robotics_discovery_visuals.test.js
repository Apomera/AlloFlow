import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'robotic', rob_sect: 'sorter' };
const GOOD = [{ x: 4, y: 6, m: 'J', w: false }, { x: 12, y: 6, m: 'L', w: true }, { x: 12, y: 1, m: 'J', w: false }, { x: 1, y: 1, m: 'J', w: false }];
let root, host;
const studio = (node = host) => node.querySelector('[data-rob-job-discovery]');
const query = (hook, node = host) => node.querySelector(`[data-rob-job-${hook}]`);
const textButton = (text) => [...host.querySelectorAll('button')].find(button => button.textContent.trim() === text);

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
  vi.restoreAllMocks();
});
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}, contrast = false) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      isContrast: contrast, toolData: data, setToolData: setData,
      update: (tool, key, value) => setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })),
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value: String(value) } })); }
async function job(index) { await click(host.querySelector(`[data-rob-job-pick="${index}"]`)); }
async function lens(id) { await click(host.querySelector(`[data-rob-job-lens="${id}"]`)); }
const choices = (index) => host.querySelectorAll(`[data-rob-sort-card="${index}"] button[role="radio"]`);

describe('Robotics job-evidence discovery studio', () => {
  it('places separate fit-up frames over both drawn exhaust gaps rather than the space between the parts', () => {
    const node = render({ rob4_job: 4, rob4_lens: 'fit' }), svg = query('scene', node);
    const regions = [...svg.querySelectorAll('[data-rob-job-focus-region]')].map(rect => ({
      x: Number(rect.getAttribute('x')), y: Number(rect.getAttribute('y')), w: Number(rect.getAttribute('width')), h: Number(rect.getAttribute('height')),
    }));
    const gapMarkers = [...svg.querySelectorAll('path')].map(path => path.getAttribute('d').match(/^M\s+([\d.]+)\s+([\d.]+)\s+H\s+([\d.]+)\s+M/)).filter(Boolean);
    const covers = (rect, x, y) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    expect(regions).toHaveLength(2); expect(gapMarkers).toHaveLength(2);
    for (const marker of gapMarkers) {
      expect(regions.filter(rect => covers(rect, Number(marker[1]), Number(marker[2])) && covers(rect, Number(marker[3]), Number(marker[2])))).toHaveLength(1);
    }
    expect(regions.some(rect => covers(rect, 290, 160))).toBe(false);
  });

  it('illustrates all six supplied workpieces with native selectors and four neutral evidence lenses', () => {
    const scenes = [];
    for (let index = 0; index < 6; index++) {
      const node = render({ rob4_job: index });
      expect(studio(node).getAttribute('data-rob-job-discovery')).toBe(String(index));
      expect(node.querySelectorAll('[data-rob-job-pick]')).toHaveLength(6);
      expect(node.querySelectorAll('[data-rob-job-lens]')).toHaveLength(4);
      expect(node.querySelectorAll('[data-rob-sort-card]')).toHaveLength(6);
      const card = node.querySelector(`[data-rob-sort-card="${index}"]`);
      expect(card.querySelector('p').textContent).toContain(query('given', node).textContent);
      const svg = query('scene', node);
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toContain('does not recommend an assignment');
      expect(svg.style.width).toBe('100%');
      expect(svg.querySelector('animate, animateTransform, image, canvas')).toBeNull();
      expect(svg.innerHTML).not.toMatch(/robot|manual|best|correct/i);
      scenes.push(svg.innerHTML);
      for (const button of studio(node).querySelectorAll('button')) expect(button.style.minHeight).toBe('44px');
    }
    expect(new Set(scenes).size).toBe(6);
  });

  it('keeps every job explanation gated until its own first assignment is committed', () => {
    for (let index = 0; index < 6; index++) {
      const node = render({ rob4_job: index, rob4_lens: 'fit' });
      expect(query('explanation', node)).toBeNull();
      expect(node.querySelector(`[data-rob-sort-card="${index}"]`).textContent).not.toContain('✓ best');
    }
    const otherAnswered = render({ rob4_job: 4, tech2_rob_sort: { 0: 'robot' } });
    expect(query('explanation', otherAnswered)).toBeNull();
    expect(otherAnswered.textContent).toContain('Score 1 / 1');
    const sameAnswered = render({ rob4_job: 0, tech2_rob_sort: { 0: 'manual' } });
    expect(query('explanation', sameAnswered).textContent).toContain('High volume, identical joints and accurate fixturing');
    expect(sameAnswered.textContent).toContain('Score 0 / 1');
  });

  it('records optional evidence locally per job without writing a choice or persisted notes', async () => {
    const latest = await mount();
    await click(query('note'));
    await lens('fit');
    expect(query('scene').dataset.evidenceLens).toBe('fit');
    await click(query('note'));
    expect(studio().querySelectorAll('[data-rob-job-reason]')).toHaveLength(2);
    expect(query('notes-count').dataset.robJobNotesCount).toBe('2');
    await job(4);
    expect(query('notes-count').dataset.robJobNotesCount).toBe('0');
    expect(query('fact').textContent).toContain('about 1 mm');
    await click(query('note'));
    expect(query('notes-count').dataset.robJobNotesCount).toBe('1');
    await job(0);
    expect(query('notes-count').dataset.robJobNotesCount).toBe('2');
    expect(latest().tech2_rob_sort).toBeUndefined();
    expect(latest().rob4_notes).toBeUndefined();
    expect(query('explanation')).toBeNull();
    expect(host.textContent).toContain('Score 0 / 0');
    await click(query('note'));
    expect(query('notes-count').dataset.robJobNotesCount).toBe('1');
    await click(query('clear-notes'));
    expect(query('notes-count').dataset.robJobNotesCount).toBe('0');
    await job(4);
    expect(query('notes-count').dataset.robJobNotesCount).toBe('1');
  });

  it('focuses the actual choice card without choosing or revealing and focuses feedback only after commitment', async () => {
    const latest = await mount({ rob4_job: 2 });
    await lens('repeat');
    await click(query('choice-link'));
    expect(document.activeElement).toBe(choices(2)[0]);
    expect(latest().tech2_rob_sort).toBeUndefined();
    expect(query('explanation')).toBeNull();
    await click(choices(2)[1]);
    expect(latest().tech2_rob_sort).toEqual({ 2: 'manual' });
    expect(query('explanation')).toBeTruthy();
    await click(query('choice-link'));
    expect(document.activeElement.textContent).toContain('One unique part');
    expect(latest().tech2_rob_sort).toEqual({ 2: 'manual' });
  });

  it('preserves first-pick locks and answer ordering while notes and selected jobs change', async () => {
    const latest = await mount();
    expect(choices(0)[0].textContent).toContain('Robot / cobot');
    expect(choices(0)[1].textContent).toContain('Manual welder');
    await click(choices(0)[1]);
    expect(latest().tech2_rob_sort).toEqual({ 0: 'manual' });
    expect([...choices(0)].every(button => button.disabled)).toBe(true);
    expect(query('explanation').textContent).toContain('High volume, identical joints');
    await lens('volume');
    await click(query('note'));
    await job(5);
    await lens('setting');
    await job(0);
    await click(choices(0)[0]);
    expect(latest().tech2_rob_sort).toEqual({ 0: 'manual' });
    expect(host.textContent).toContain('Score 0 / 1');
    expect(query('notes-count').dataset.robJobNotesCount).toBe('1');
  });

  it('keeps unstated fit-up and work-location facts explicit instead of inventing tolerances or locations', async () => {
    await mount({ rob4_job: 3 });
    await lens('fit');
    expect(query('fact').textContent).toBe('No fit-up tolerance is stated in this job.');
    await job(4);
    await lens('setting');
    expect(query('fact').textContent).toContain('no work location is stated');
    await job(5);
    expect(query('fact').textContent).toContain('no work location is stated');
    expect(query('explanation')).toBeNull();
  });

  it('does not disturb the pendant program or paused move inspector across discovery, notes or sorter reset', async () => {
    const latest = await mount({ rob_sect: 'pendant', tech2_rob_prog: GOOD });
    await change(host.querySelector('[data-robot-inspect-select]'), 1);
    await change(host.querySelector('[data-robot-inspect-progress]'), 80);
    expect(host.querySelector('[data-robot-inspector]').dataset.move).toBe('2');
    await click(textButton('⚖ Robot or manual?'));
    await job(4);
    await lens('fit');
    await click(query('note'));
    await click(choices(4)[0]);
    expect(latest().tech2_rob_sort).toEqual({ 4: 'robot' });
    await click(textButton('↺ Reset'));
    expect(latest().tech2_rob_sort).toEqual({});
    expect(studio().dataset.robJobDiscovery).toBe('0');
    expect(studio().dataset.currentLens).toBe('volume');
    expect(query('notes-count').dataset.robJobNotesCount).toBe('0');
    expect(query('explanation')).toBeNull();
    await click(textButton('🕹 Teach-pendant challenge'));
    expect(latest().tech2_rob_prog).toEqual(GOOD);
    expect(host.querySelector('[data-robot-inspector]').dataset.move).toBe('2');
    expect(host.querySelector('[data-robot-inspector]').dataset.progress).toBe('0.8');
    expect(host.querySelector('[data-robot-inspector]').dataset.robotInspector).toBe('active');
  });

  it('normalizes hostile discovery state while ignoring untrusted persisted evidence notes', () => {
    for (const value of ['junk', {}, [], -100]) {
      const node = render({ rob4_job: value, rob4_lens: value, rob4_notes: { 0: ['volume', 'fit'] }, tech2_rob_sort: ['robot'] });
      expect(studio(node).dataset.robJobDiscovery).toBe('0');
      expect(studio(node).dataset.currentLens).toBe('volume');
      expect(query('notes-count', node).dataset.robJobNotesCount).toBe('0');
      expect(query('explanation', node)).toBeNull();
      expect(studio(node).innerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
    }
  });

  it('makes selected job, lens and marked evidence visibly distinct in contrast mode', async () => {
    await mount({}, true);
    expect(studio().style.background).toBe('rgb(0, 0, 0)');
    expect(studio().style.color).toBe('rgb(255, 255, 255)');
    expect(query('scene').style.background).toBe('rgb(0, 0, 0)');
    const selected = host.querySelector('[data-rob-job-pick="0"]');
    const inactive = host.querySelector('[data-rob-job-pick="1"]');
    expect(selected.style.background).toBe('rgb(255, 255, 0)');
    expect(selected.style.color).toBe('rgb(0, 0, 0)');
    expect(inactive.style.background).toBe('rgb(0, 0, 0)');
    expect(inactive.style.color).toBe('rgb(255, 255, 255)');
    await lens('fit');
    const fit = host.querySelector('[data-rob-job-lens="fit"]');
    expect(fit.style.background).toBe('rgb(255, 255, 0)');
    expect(fit.style.color).toBe('rgb(0, 0, 0)');
    await click(query('note'));
    expect(query('note').getAttribute('aria-pressed')).toBe('true');
    expect(query('note').style.background).toBe('rgb(255, 255, 0)');
    expect(query('note').style.color).toBe('rgb(0, 0, 0)');
    await click(query('note'));
    expect(query('note').style.background).toBe('rgb(0, 0, 0)');
    expect(query('note').style.color).toBe('rgb(255, 255, 255)');
    for (const button of studio().querySelectorAll('button')) expect(button.style.minHeight).toBe('44px');
  });
});
