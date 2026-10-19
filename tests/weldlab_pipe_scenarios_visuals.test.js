import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'pipeWelding', pipe_sect: 'updown' };
let root, host;
const bench = (node = host) => node.querySelector('[data-pipe-travel-bench]');
const reading = () => host.querySelector('[data-pipe-travel-reading]');
const track = i => host.querySelector(`[data-pipe-travel-track="${i}"]`);
const clockPoint = () => host.querySelector('[data-pipe-travel-clock-point]');
const num = (node, attr) => Number(node.getAttribute(attr));
const time = () => num(bench(), 'data-time');
const textButton = text => [...host.querySelectorAll('button')].find(button => button.textContent.trim() === text);

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
async function half(i) { await click(host.querySelector(`[data-pipe-travel-half="${i}"]`)); }
async function seek(k) { await click(host.querySelector(`[data-pipe-travel-seek="${k}"]`)); }
async function scrub(value) {
  await React.act(() => Simulate.change(host.querySelector('#pipe-travel-progress'), { target: { value: String(value) } }));
}
async function direction(id) {
  await click([...host.querySelectorAll('[role="radiogroup"][aria-label="Travel direction"] button')].find(button => button.textContent.includes(id === 'uphill' ? 'Uphill' : 'Downhill')));
}

describe('Pipe fixed-joint travel station bench', () => {
  it('starts manually with the first half active and second half waiting on the unchanged 5G model', () => {
    const node = render(), b = bench(node);
    expect(b.dataset.pipeTravelBench).toBe('uphill');
    expect(b.dataset.time).toBe('0');
    expect(b.dataset.playing).toBe('false');
    const tracks = [...b.querySelectorAll('[data-pipe-travel-track]')];
    expect(tracks.map(t => t.dataset.state)).toEqual(['active', 'waiting']);
    expect(tracks.map(t => num(t, 'data-degrees'))).toEqual([180, 180]);
    expect(node.querySelectorAll('[data-pipe-travel-rod]')).toHaveLength(1);
    expect(node.querySelector('[data-pipe-travel-reading]').dataset.zone).toBe('overhead');
    expect(node.querySelector('animate, animateTransform')).toBeNull();
    expect(b.textContent).toContain('pipe stays fixed');
    expect(b.textContent).toContain('not pipe length');
  });

  it('seeks the first uphill vertical station on the track and exact original electrode geometry', async () => {
    const latest = await mount({ pipe2_hour: 2, pipe2_chal: 1, pipe2_stack: ['root'] });
    await seek(3);
    expect(time()).toBe(0.25);
    expect(num(track(0), 'data-progress')).toBe(0.5);
    expect(num(track(1), 'data-progress')).toBe(0);
    expect(reading().dataset.nearestHour).toBe('9');
    expect(reading().dataset.zone).toBe('vertical');
    const rod = host.querySelector('[data-pipe-travel-rod="0"]');
    expect(num(rod, 'data-degrees')).toBe(270);
    expect(num(rod, 'data-tilt')).toBe(10);
    expect(num(clockPoint(), 'data-degrees')).toBe(270);
    expect(num(clockPoint(), 'cx')).toBe(46);
    expect(num(clockPoint(), 'cy')).toBe(100);
    expect(host.querySelector('[data-pipe-travel-clock]').getAttribute('aria-label')).toContain('50% done');
    expect(latest().pipe2_hour).toBe(2);
    expect(latest().pipe2_chal).toBe(1);
    expect(latest().pipe2_stack).toEqual(['root']);
    expect(latest()).not.toHaveProperty('pipe4_half');
  });

  it('inspects waiting and completed halves independently of the active electrode', async () => {
    await mount();
    await scrub(25);
    await half(1);
    expect(time()).toBe(0.25);
    expect(reading().dataset.state).toBe('waiting');
    expect(clockPoint().dataset.pipeTravelClockPoint).toBe('1');
    expect(num(clockPoint(), 'data-degrees')).toBe(180);
    expect(host.querySelector('[data-pipe-travel-rod]').dataset.pipeTravelRod).toBe('0');
    await seek(3);
    expect(time()).toBe(0.75);
    expect(reading().dataset.nearestHour).toBe('3');
    expect(num(clockPoint(), 'data-degrees')).toBe(90);
    expect(num(host.querySelector('[data-pipe-travel-rod="1"]'), 'data-tilt')).toBe(-10);
    await half(0);
    expect(time()).toBe(0.75);
    expect(reading().dataset.state).toBe('complete');
    expect(num(clockPoint(), 'data-degrees')).toBe(360);
    expect(num(clockPoint(), 'cx')).toBe(100);
    expect(num(clockPoint(), 'cy')).toBe(46);
    expect(host.querySelector('[data-pipe-travel-rod]').dataset.pipeTravelRod).toBe('1');
  });

  it.each(['uphill', 'downhill'])('maps every authored clock checkpoint exactly through the %s plan', async dir => {
    await mount({ pipe2_dir: dir });
    const plan = window.__WeldLabCore.pipe2TravelPlan(dir);
    for (let i = 0; i < 2; i++) {
      await half(i);
      for (let k = 0; k < plan.halves[i].hours.length; k++) {
        await seek(k);
        const fraction = k / 6, expectedTime = plan.together ? fraction : (i + fraction) / 2;
        const degrees = plan.halves[i].degs[0] + (plan.halves[i].degs[1] - plan.halves[i].degs[0]) * fraction;
        expect(time()).toBeCloseTo(expectedTime, 12);
        expect(num(track(i), 'data-progress')).toBeCloseTo(fraction, 12);
        expect(num(reading(), 'data-degrees')).toBeCloseTo(degrees, 12);
        expect(num(clockPoint(), 'data-degrees')).toBeCloseTo(degrees, 12);
        expect(num(reading(), 'data-nearest-hour')).toBe(plan.halves[i].hours[k]);
        expect(host.querySelectorAll('[data-pipe-travel-seek][aria-pressed="true"]')).toHaveLength(1);
      }
    }
  });

  it('scrubs both downhill halves together with opposite drag cues and one unchanged global clock', async () => {
    await mount({ pipe2_dir: 'downhill' });
    await scrub(25);
    expect([num(track(0), 'data-progress'), num(track(1), 'data-progress')]).toEqual([0.25, 0.25]);
    expect([num(track(0), 'data-degrees'), num(track(1), 'data-degrees')]).toEqual([45, 315]);
    expect([...host.querySelectorAll('[data-pipe-travel-rod]')].map(rod => num(rod, 'data-tilt'))).toEqual([-15, 15]);
    expect(host.querySelectorAll('[data-pipe-travel-rod]')).toHaveLength(2);
    await half(1);
    expect(time()).toBe(0.25);
    expect(num(clockPoint(), 'data-degrees')).toBe(315);
    await scrub(100);
    expect(host.querySelectorAll('[data-pipe-travel-rod]')).toHaveLength(0);
    expect([track(0).dataset.state, track(1).dataset.state]).toEqual(['complete', 'complete']);
    expect(num(clockPoint(), 'data-degrees')).toBe(180);
  });

  it('pauses playback when seeking, keeps Step anchored to the scrubber and resets on direction changes', async () => {
    const latest = await mount();
    await click(textButton('▶ Play'));
    expect(bench().dataset.playing).toBe('true');
    await scrub(25);
    expect(bench().dataset.playing).toBe('false');
    await click(textButton('Step ⏭'));
    expect(time()).toBe(0.375);
    await half(1);
    await direction('downhill');
    expect(time()).toBe(0);
    expect(bench().dataset.playing).toBe('false');
    expect(reading().dataset.pipeTravelReading).toBe('1');
    expect(latest().pipe2_dir).toBe('downhill');
    await scrub(64);
    await click(textButton('↺ Reset'));
    expect(time()).toBe(0);
    expect(num(host.querySelector('#pipe-travel-progress'), 'value')).toBe(0);
  });

  it('bounds manual probes and rejects malformed progress without drawing invalid points', async () => {
    await mount({ pipe2_dir: { invalid: true } });
    expect(bench().dataset.pipeTravelBench).toBe('uphill');
    await scrub(200);
    expect(time()).toBe(1);
    await scrub(-12);
    expect(time()).toBe(0);
    await scrub(37);
    await scrub('not a number');
    expect(time()).toBe(0.37);
    for (const point of host.querySelectorAll('[data-pipe-travel-point]')) {
      expect(num(point, 'cx')).toBeGreaterThanOrEqual(50);
      expect(num(point, 'cx')).toBeLessThanOrEqual(550);
    }
    expect(bench().outerHTML).not.toMatch(/(?:NaN|Infinity|undefined)/);
  });

  it('leaves the position challenge and its first-answer progression untouched by travel inspection', async () => {
    const latest = await mount({ pipe_sect: 'positions', pipe2_chal: 0, pipe2_hour: 1, pipe2_rate: 61, pipe2_stack: ['root'] });
    expect(bench()).toBeNull();
    expect(host.textContent).toContain('where are you welding OVERHEAD?');
    await click(textButton('Watch the two uphill halves →'));
    await half(1);
    await seek(3);
    expect(latest().pipe2_chal).toBe(0);
    expect(latest().pipe2_hour).toBe(1);
    expect(latest().pipe2_rate).toBe(61);
    expect(latest().pipe2_stack).toEqual(['root']);
    await click([...host.querySelectorAll('button')].find(button => button.textContent.trim() === '🪈 Pipe positions (1G/2G/5G/6G/6GR)'));
    expect(bench()).toBeNull();
    const hours = host.querySelector('[role="radiogroup"][aria-label="Pick an o’clock"]')
      || [...host.querySelectorAll('[role="radiogroup"]')].find(group => group.querySelectorAll('button').length === 12);
    await click([...hours.querySelectorAll('button')].find(button => button.textContent.trim() === '6'));
    expect(latest().pipe2_chal).toBe(1);
    expect(latest().pipe2_hour).toBe(6);
  });

  it('provides readable local scrolling and native 44px controls with distinct contrast selection', async () => {
    await mount({}, true);
    const b = bench(), scroll = b.querySelector('[data-pipe-travel-scroll]');
    expect(b.style.background).toBe('rgb(0, 0, 0)');
    expect(b.style.color).toBe('rgb(255, 255, 255)');
    expect(b.querySelector('h4').style.color).toBe('rgb(255, 255, 0)');
    expect(scroll.getAttribute('role')).toBe('region');
    expect(scroll.tabIndex).toBe(0);
    expect(scroll.style.maxWidth).toBe('100%');
    expect(scroll.style.overflowX).toBe('auto');
    expect(scroll.querySelector('svg').style.minWidth).toBe('600px');
    expect(document.getElementById(scroll.getAttribute('aria-describedby')).textContent).toContain('arrow keys');
    for (const button of b.querySelectorAll('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.style.minHeight).toBe('44px');
      expect(button.className).toContain('focus:ring-4');
      const active = button.getAttribute('aria-pressed') === 'true';
      expect(button.style.background).toBe(active ? 'rgb(255, 255, 0)' : 'rgb(0, 0, 0)');
      expect(button.style.color).toBe(active ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 0)');
    }
    const slider = b.querySelector('input[type="range"]');
    expect(slider.style.minHeight).toBe('44px');
    expect(slider.getAttribute('aria-label')).toBe('Joint travel progress');
    expect(b.querySelector('label').htmlFor).toBe(slider.id);
    const before = time();
    await React.act(() => host.querySelector('[data-pipe-travel-half="1"]').focus());
    expect(time()).toBe(before);
    expect(reading().dataset.pipeTravelReading).toBe('0');
    await half(1);
    expect(host.querySelector('[data-pipe-travel-half="1"]').style.background).toBe('rgb(255, 255, 0)');
    expect(host.querySelector('[data-pipe-travel-half="0"]').style.background).toBe('rgb(0, 0, 0)');
    expect(clockPoint().getAttribute('stroke')).toBe('#ffff00');
  });
});
