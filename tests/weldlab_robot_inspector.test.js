import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const GOOD = [
  { x: 4, y: 6, m: 'J', w: false },
  { x: 12, y: 6, m: 'L', w: true },
  { x: 12, y: 1, m: 'J', w: false },
  { x: 1, y: 1, m: 'J', w: false },
];
const seed = (extra = {}) => ({ view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: GOOD, ...extra });
let root, host, realMatchMedia, reduced;
const query = (hook) => host.querySelector(`[data-robot-${hook}]`);
const attr = (node, name) => Number(node.getAttribute(name));

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  reduced = true;
  realMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: reduced, addEventListener() {}, addListener() {}, removeEventListener() {}, removeListener() {} }));
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
  window.matchMedia = realMatchMedia;
  vi.restoreAllMocks();
});

async function mount(extra = {}, contrast = false) {
  loadTool(SRC, 'weldLab');
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: seed(extra) });
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
const button = (name) => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === name || el.getAttribute('aria-label') === name);
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value: String(value) } })); }

describe('Robot move inspector', () => {
  it('keeps empty or malformed programs usable without fabricated path metrics', () => {
    loadTool(SRC, 'weldLab');
    for (const raw of [[], 'junk', [null, { x: Infinity, y: 4 }]]) {
      const holder = document.createElement('div');
      holder.innerHTML = renderTool('weldLab', { weldLab: seed({ tech2_rob_prog: raw }) });
      expect(holder.querySelector('[data-robot-inspector]').dataset.robotInspector).toBe('empty');
      expect(holder.querySelector('[data-robot-inspect-progress]')).toBeNull();
      expect(holder.querySelector('[data-robot-torch]')).toBeNull();
      expect(holder.querySelector('[data-robot-inspector]').textContent).toContain('Teach a point');
    }
  });

  it('scrubs a linear welding move by distance with matching arc, position and cycle-time values', async () => {
    const current = await mount();
    expect(query('inspector').dataset.robotInspector).toBe('paused');
    await change(query('inspect-select'), 1);
    expect(query('inspector').dataset.robotInspector).toBe('active');
    expect(query('path-highlight').getAttribute('data-robot-path-highlight')).toBe('2');
    expect(query('torch').dataset.source).toBe('inspection');
    expect(query('torch').dataset.arc).toBe('on');
    expect(attr(query('torch'), 'data-x')).toBe(8);
    expect(attr(query('torch'), 'data-y')).toBe(6);
    expect(attr(query('inspect-position'), 'data-x-mm')).toBe(40);
    expect(attr(query('inspect-distance'), 'data-robot-inspect-distance')).toBe(40);
    expect(attr(query('inspect-time'), 'data-robot-inspect-time')).toBeCloseTo(40 / 6, 12);
    expect(attr(query('inspect-time'), 'data-speed')).toBe(6);
    expect(attr(query('inspect-elapsed'), 'data-robot-inspect-elapsed')).toBeCloseTo(20 / 6, 12);
    await change(query('inspect-progress'), 0);
    expect(attr(query('torch'), 'data-x')).toBe(4);
    await change(query('inspect-progress'), 100);
    expect(attr(query('torch'), 'data-x')).toBe(12);
    expect(query('inspect-progress').getAttribute('aria-valuetext')).toContain('100 percent');
    expect(current().tech2_rob_prog).toEqual(GOOD);
  });

  it('measures the curved joint path and gives it the same air-move speed as the cycle model', async () => {
    await mount();
    await click(query('inspect-open'));
    const path = window.__WeldLabCore.tech2.movePath({ x: 1, y: 1 }, { x: 4, y: 6 }, 'J');
    const mm = path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - path[i].x, p.y - path[i].y) * 5, 0);
    expect(mm).toBeGreaterThan(Math.hypot(3, 5) * 5);
    expect(attr(query('inspect-distance'), 'data-robot-inspect-distance')).toBeCloseTo(mm, 12);
    expect(attr(query('inspect-time'), 'data-robot-inspect-time')).toBeCloseTo(mm / 200, 12);
    expect(attr(query('inspect-time'), 'data-speed')).toBe(200);
    expect(query('inspect-mode').dataset.robotInspectMode).toBe('J');
    expect(query('inspect-arc').dataset.robotInspectArc).toBe('off');
    expect(query('torch').dataset.arc).toBe('off');
    expect(query('inspect-issues')).toBeNull();
    expect(host.textContent).not.toContain('The program needs work.');
  });

  it('allows table, previous and next navigation without accidentally teaching points', async () => {
    const current = await mount();
    expect(query('inspect-prev').disabled).toBe(true);
    await click(query('inspect-next'));
    expect(query('inspector').dataset.move).toBe('2');
    await click(host.querySelector('[data-robot-inspect-row="4"]'));
    expect(query('inspector').dataset.move).toBe('4');
    expect(query('inspect-next').disabled).toBe(true);
    expect(host.querySelector('[data-robot-inspect-row="4"]').getAttribute('aria-pressed')).toBe('true');
    await click(query('inspect-prev'));
    expect(query('inspector').dataset.move).toBe('3');
    await click(query('inspect-open'));
    expect(query('inspector').dataset.robotInspector).toBe('paused');
    expect(query('path-highlight')).toBeNull();
    expect(current().tech2_rob_prog).toEqual(GOOD);
  });

  it('keeps move faults hidden until Run and invalidates the verdict after a program edit', async () => {
    await mount({ tech2_rob_prog: [{ x: 12, y: 6, m: 'J', w: true }] });
    await click(query('inspect-open'));
    expect(query('inspect-issues')).toBeNull();
    expect(host.textContent).not.toContain('Move 1 hits the clamp.');
    await click(button('▶ Run program'));
    expect(host.textContent).toContain('The program needs work.');
    await click(query('inspect-open'));
    expect(query('inspect-issues')).toBeTruthy();
    expect(query('inspect-issues').textContent).toContain('Move 1');
    await click(button('Point 1: arc on or off'));
    expect(query('inspect-issues')).toBeNull();
    expect(host.textContent).not.toContain('The program needs work.');
    expect(query('inspector').dataset.robotInspector).toBe('paused');
    expect(query('path-highlight')).toBeNull();
  });

  it('uses corrected seam-tracking paths and clears stale grading after cell changes', async () => {
    await mount();
    await click(button('▶ Run program'));
    expect(host.textContent).toContain('Weld complete: seam fully covered, no faults.');
    await click(button('Load the next part 5 mm off (off)'));
    expect(host.textContent).not.toContain('Weld complete: seam fully covered, no faults.');
    await change(query('inspect-select'), 1);
    expect(attr(query('inspect-position'), 'data-y-mm')).toBe(30);
    await click(button('Seam tracking (off)'));
    expect(attr(query('inspect-position'), 'data-y-mm')).toBe(35);
    expect(attr(query('torch'), 'data-y')).toBe(7);
    expect(query('inspect-issues')).toBeNull();
    await click(button('▶ Run program'));
    expect(host.textContent).toContain('Weld complete: seam fully covered, no faults.');
    await click(button('📡 Seam tracking: touch sense + laser (on)'));
    expect(host.textContent).not.toContain('Weld complete: seam fully covered, no faults.');
    expect(query('inspect-issues')).toBeNull();
  });

  it('resets inspection after deleting or clearing points, including zero-length moves', async () => {
    const current = await mount({ tech2_rob_prog: [{ x: 1, y: 1, m: 'J', w: false }, ...GOOD] });
    await click(query('inspect-open'));
    await change(query('inspect-progress'), 100);
    expect(attr(query('inspect-distance'), 'data-robot-inspect-distance')).toBe(0);
    expect(attr(query('inspect-time'), 'data-robot-inspect-time')).toBe(0);
    expect(attr(query('torch'), 'data-x')).toBe(1);
    await click(host.querySelector('[data-robot-inspect-row="5"]'));
    await click(button('Delete point 5'));
    expect(current().tech2_rob_prog).toHaveLength(4);
    expect(query('inspector').dataset.move).toBe('1');
    expect(query('inspector').dataset.robotInspector).toBe('paused');
    await click(button('✕ Clear'));
    expect(query('inspector').dataset.robotInspector).toBe('empty');
    expect(query('torch')).toBeNull();
    expect(host.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('keeps inspection separate from animation and gives contrast mode explicit readable colours', async () => {
    reduced = false;
    await mount({}, true);
    await click(query('inspect-open'));
    expect(query('inspector').style.background).toBe('rgb(0, 0, 0)');
    expect(query('inspector').style.color).toBe('rgb(255, 255, 255)');
    expect(query('path-highlight').getAttribute('stroke')).toBe('#ffffff');
    await click(button('▶ Run program'));
    expect(query('inspector').dataset.robotInspector).toBe('paused');
    expect(query('path-highlight')).toBeNull();
    expect(query('inspect-open').disabled).toBe(true);
    expect(query('inspect-select').disabled).toBe(true);
    expect(query('inspect-progress').disabled).toBe(true);
    expect(host.textContent).toContain('Inspection is paused until it finishes.');
    expect(host.textContent).not.toContain('Weld complete: seam fully covered, no faults.');
  });
});
