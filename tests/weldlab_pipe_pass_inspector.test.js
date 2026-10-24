import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'pipeWelding', pipe_sect: 'passes' };
let root, host;
const core = () => window.__WeldLabCore;
const plan = wall => core().pipe2GroovePlan(wall);
const sequence = wall => core().pipe2PassSequence(plan(wall));

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
});
function render(extra = {}, contrast = false) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return el;
}
async function mount(extra = {}) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function inspect(index) {
  const button = host.querySelector(`[data-pipe-pass-node="${index}"]`);
  expect(button).toBeTruthy();
  await React.act(() => button.click());
}
async function clickText(text) {
  const button = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text);
  expect(button, text).toBeTruthy();
  await React.act(() => button.click());
}
const n = (el, attr) => Number(el.getAttribute(attr));

describe('Pipe groove pass inspector', () => {
  it.each([0.2, 0.218, 0.24, 0.25, 0.28, 0.432, 0.719, 1])('conserves actual allocated groove area at %s inch wall', wall => {
    const p = plan(wall), seq = sequence(wall), el = render({ pipe2_wall: wall, pipe2_stack: seq });
    const beads = [...el.querySelectorAll('[data-pipe-groove-bead]')];
    expect(beads.map(b => b.dataset.passType)).toEqual(seq);
    expect(beads).toHaveLength(p.total);
    expect(beads.reduce((sum, b) => sum + n(b, 'data-groove-area'), 0)).toBeCloseTo(p.area, 12);
    const typeArea = type => beads.filter(b => b.dataset.passType === type).reduce((sum, b) => sum + n(b, 'data-groove-area'), 0);
    expect(typeArea('root')).toBeCloseTo(core().pipe2BandArea(0, p.rootTop), 12);
    expect(typeArea('hot')).toBeCloseTo(core().pipe2BandArea(p.rootTop, p.hotTop), 12);
    expect(typeArea('fill')).toBeCloseTo(p.fill > 0 ? p.fillArea : 0, 12);
    expect(typeArea('cap')).toBeCloseTo(core().pipe2BandArea(p.fill > 0 ? p.capLine : p.hotTop, wall), 12);
    const inspector = el.querySelector('[data-pipe-pass-inspector]');
    expect(n(inspector, 'data-occupied-area')).toBeCloseTo(p.area, 12);
    expect(el.querySelector('[data-pipe-pass-detail]').dataset.pipePassDetail).toBe(String(seq.length - 1));
    expect(n(el.querySelector('[data-pipe-remaining-area]'), 'data-pipe-remaining-area')).toBeCloseTo(0, 12);
    expect(inspector.textContent).toContain('100%');
  });

  it('inspects each laid pass in the same groove without changing the built stack', async () => {
    const wall = 0.719, p = plan(wall), seq = sequence(wall), latest = await mount({ pipe2_wall: wall, pipe2_stack: seq });
    const allAreas = [...host.querySelectorAll('[data-pipe-groove-bead]')].map(b => n(b, 'data-groove-area'));
    let occupied = 0;
    for (let i = 0; i < seq.length; i++) {
      await inspect(i);
      occupied += allAreas[i];
      expect(latest().pipe2_stack).toEqual(seq);
      expect(host.querySelectorAll('[data-pipe-pass-node][aria-pressed="true"]')).toHaveLength(1);
      expect(host.querySelector('[data-pipe-groove-bead][data-selected="true"]').dataset.pipeGrooveBead).toBe(String(i));
      const detail = host.querySelector('[data-pipe-pass-detail]');
      expect(detail.dataset.passType).toBe(seq[i]);
      expect(n(host.querySelector('[data-pipe-pass-area]'), 'data-pipe-pass-area')).toBeCloseTo(allAreas[i], 12);
      expect(n(host.querySelector('[data-pipe-cumulative-area]'), 'data-pipe-cumulative-area')).toBeCloseTo(occupied, 12);
      expect(n(host.querySelector('[data-pipe-remaining-area]'), 'data-pipe-remaining-area')).toBeCloseTo(Math.max(0, p.area - occupied), 12);
      expect(Number(host.querySelector('progress').value)).toBeCloseTo(occupied, 12);
      expect(host.querySelector('[data-pipe-groove]').getAttribute('aria-label')).toContain(`Pass ${i + 1}`);
      const later = host.querySelector(`[data-pipe-groove-bead="${i + 1}"]`);
      if (later) expect(later.getAttribute('opacity')).toBe('0.3');
    }
    await inspect(0);
    expect(host.querySelector('[data-pipe-pass-detail]').textContent).toContain('Closes the root opening');
  });

  it('opens inspection points only for correctly placed passes and keeps wrong-order feedback', async () => {
    const latest = await mount();
    expect(host.querySelector('[data-pipe-pass-inspector]').dataset.pipePassInspector).toBe('-1');
    expect(host.querySelectorAll('[data-pipe-pass-node]')).toHaveLength(0);
    await clickText('＋ Hot pass');
    expect(host.textContent).toContain('Nothing to burn into yet');
    expect(latest().pipe2_stack).toBeUndefined();
    expect(host.querySelectorAll('[data-pipe-pass-node]')).toHaveLength(0);
    await clickText('＋ Root');
    expect(latest().pipe2_stack).toEqual(['root']);
    expect(host.querySelector('[data-pipe-pass-detail]').dataset.passType).toBe('root');
    await clickText('＋ Hot pass');
    expect(latest().pipe2_stack).toEqual(['root', 'hot']);
    expect(host.querySelector('[data-pipe-pass-detail]').dataset.pipePassDetail).toBe('1');
    await clickText('＋ Cap');
    expect(latest().pipe2_stack).toEqual(['root', 'hot']);
    expect(host.textContent).toContain('Not full yet');
  });

  it('zooms the groove without changing its paths, selected pass or built stack', async () => {
    const latest = await mount({ pipe2_wall: 0.432, pipe2_stack: ['root', 'hot', 'fill', 'fill'] });
    await inspect(2);
    const groove = () => host.querySelector('[data-pipe-groove]');
    const wallFrame = groove().getAttribute('viewBox').split(' ').map(Number);
    const paths = [...groove().querySelectorAll('[data-pipe-groove-bead] path')].map(p => p.getAttribute('d'));
    await React.act(() => host.querySelector('[data-pipe-zoom="close"]').click());
    const closeFrame = groove().getAttribute('viewBox').split(' ').map(Number);
    expect(closeFrame[2]).toBeLessThan(wallFrame[2]);
    expect(closeFrame[1]).toBe(wallFrame[1]);
    expect(closeFrame[3]).toBe(wallFrame[3]);
    expect([...groove().querySelectorAll('[data-pipe-groove-bead] path')].map(p => p.getAttribute('d'))).toEqual(paths);
    expect(host.querySelector('[data-pipe-pass-detail]').dataset.pipePassDetail).toBe('2');
    expect(latest().pipe2_stack).toEqual(['root', 'hot', 'fill', 'fill']);
    await React.act(() => host.querySelector('[data-pipe-zoom="wall"]').click());
    expect(groove().getAttribute('viewBox').split(' ').map(Number)).toEqual(wallFrame);
  });

  it('undo, wall changes and reset clamp inspection to the normalized stack', async () => {
    const wall = 1, latest = await mount({ pipe2_wall: wall, pipe2_stack: sequence(wall) });
    await inspect(sequence(wall).length - 1);
    await clickText('↶ Undo');
    expect(host.querySelectorAll('[data-pipe-pass-node]')).toHaveLength(sequence(wall).length - 1);
    const slider = [...host.querySelectorAll('input[type="range"]')].find(el => el.getAttribute('aria-label') === 'Pipe wall thickness');
    expect(slider).toBeTruthy();
    await React.act(() => Simulate.change(slider, { target: { value: '0.2' } }));
    expect(host.querySelectorAll('[data-pipe-pass-node]')).toHaveLength(2);
    expect(host.querySelector('[data-pipe-pass-detail]').dataset.pipePassDetail).toBe('1');
    expect(host.querySelectorAll('[data-pipe-pass-node][aria-pressed="true"]')).toHaveLength(1);
    expect(latest().pipe2_wall).toBe(0.2);
    await clickText('↺ Reset');
    expect(latest().pipe2_stack).toEqual([]);
    expect(host.querySelector('[data-pipe-pass-detail]')).toBeNull();
    expect(host.querySelectorAll('[data-pipe-groove-bead]')).toHaveLength(0);
    expect(Number(host.querySelector('progress').value)).toBe(0);
  });

  it('normalizes untrusted stack/wall state rather than drawing impossible pass selections', () => {
    for (const raw of [null, {}, 'root', ['cap'], ['root', 'evil', 'hot'], ['root', 'hot', 'fill', 'cap', 'constructor']]) {
      const wall = 0.432, expected = core().pipe2NormStack(raw, plan(wall));
      const el = render({ pipe2_wall: 'not a wall', pipe2_stack: raw });
      expect(el.querySelectorAll('[data-pipe-pass-node]')).toHaveLength(expected.length);
      expect(el.querySelectorAll('[data-pipe-groove-bead]')).toHaveLength(expected.length);
      expect(n(el.querySelector('[data-pipe-pass-inspector]'), 'data-occupied-area')).toBeGreaterThanOrEqual(0);
      expect(el.innerHTML).not.toMatch(/(?:NaN|Infinity|undefined)/);
    }
  });

  it('uses native manual controls, named progress and explicit contrast colors with no animation', () => {
    const el = render({ pipe2_stack: ['root', 'hot'] }, true), inspector = el.querySelector('[data-pipe-pass-inspector]');
    expect(inspector.style.background).toBe('rgb(0, 0, 0)');
    expect(inspector.style.color).toBe('rgb(255, 255, 255)');
    expect(inspector.querySelector('h4').style.color).toBe('rgb(255, 255, 0)');
    expect(inspector.querySelector('label').htmlFor).toBe(inspector.querySelector('progress').id);
    expect(inspector.querySelector('[role="group"]').style.flexWrap).toBe('wrap');
    const active = inspector.querySelector('[aria-pressed="true"]');
    expect(active.tagName).toBe('BUTTON');
    expect(active.style.background).toBe('rgb(255, 255, 0)');
    expect(active.style.color).toBe('rgb(0, 0, 0)');
    for (const button of inspector.querySelectorAll('button')) {
      expect(button.style.minHeight).toBe('44px');
      expect(button.className).toContain('focus:ring-4');
    }
    expect(el.querySelector('[data-pipe-groove-bead][data-selected="true"] path[stroke="#ffff00"]')).toBeTruthy();
    expect(el.querySelector('animate,animateTransform')).toBeNull();
    expect(inspector.textContent).toContain('not deposited-metal measurements or a quality score');
  });
});
