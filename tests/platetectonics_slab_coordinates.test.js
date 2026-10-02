import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act, now, frameId = 0;
const frames = new Map(), hosts = [];
beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = { registerTool() {}, ensureThree: () => Promise.reject(new Error('No GPU needed for coordinate tests')), makeBayViewer: () => ({}) };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
beforeEach(() => {
  frames.clear(); now = 0;
  for (const clock of new Set([globalThis.performance, window.performance])) vi.spyOn(clock, 'now').mockImplementation(() => now);
});
afterEach(() => { while (hosts.length) { const host = hosts.pop(); ReactDOM.unmountComponentAtNode(host); host.remove(); } frames.clear(); vi.restoreAllMocks(); });
function mount(savedSlab) {
  const host = document.createElement('div'); document.body.appendChild(host); hosts.push(host);
  const xp = vi.fn(), announce = vi.fn(), record = vi.fn(), beep = vi.fn();
  act(() => ReactDOM.render(React.createElement(window.AlloTectonicsInteractive, { darkMode: true, savedSlab, awardXP: xp, announceToSR: announce, onRecordSlab: record, beep }), host));
  const click = selector => act(() => host.querySelector(selector).click());
  const log = () => host.querySelector('[data-pt-quake-log]');
  const disclosure = () => host.querySelector('[data-pt-slab-coordinates]');
  act(() => { log().open = true; log().dispatchEvent(new window.Event('toggle', { bubbles: true })); });
  let index = 0; const sequence = [0, 0.2, 0.8, 0.9, 0.5, 0.5];
  vi.spyOn(Math, 'random').mockImplementation(() => sequence[index++ % sequence.length]);
  const event = () => { index = 0; now += 1000; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); };
  const play = () => click('[data-pt-model-play]');
  const reveal = open => act(() => { disclosure().open = open; disclosure().dispatchEvent(new window.Event('toggle', { bubbles: true })); });
  const rows = () => [...host.querySelectorAll('[data-pt-slab-coordinate-row]')];
  return { host, click, log, disclosure, event, play, reveal, rows, xp, announce, record, beep };
}
function assertSameCoordinates(app) {
  const points = [...app.host.querySelectorAll('[data-pt-quake-point]')];
  expect(app.rows()).toHaveLength(points.length);
  app.rows().forEach((row, index) => {
    expect(row.dataset.ptSlabCoordinateRow).toBe(points[index].dataset.ptQuakePoint);
    expect(row.dataset.distanceKm).toBe(points[index].dataset.distanceKm);
    expect(row.dataset.depthKm).toBe(points[index].dataset.depthKm);
    expect(row.querySelector('[data-pt-slab-coordinate-distance]').textContent).toBe(points[index].dataset.distanceKm);
    expect(row.querySelector('[data-pt-slab-coordinate-depth]').textContent).toBe(points[index].dataset.depthKm);
    expect(row.querySelector('th[scope="row"]').textContent).toBe(String(index + 1));
  });
}
const restored = { version: 1, angle: 42, points: Array.from({ length: 8 }, (_, index) => ({ x: 100.125 + index * 50, z: 100.625 + index * 45, m: 4 })) };

describe('Accessible coordinates for the slab-angle observations', () => {
  it('starts closed, provides a native summary and truthfully handles an empty log', () => {
    const app = mount();
    expect(app.disclosure().open).toBe(false);
    expect(app.disclosure().firstElementChild.tagName).toBe('SUMMARY');
    expect(app.disclosure().querySelector('summary').style.minHeight).toBe('44px');
    expect(app.host.querySelector('[data-pt-slab-coordinates-empty]').textContent).toContain('No earthquake coordinates');
    expect(app.rows()).toHaveLength(0);
    expect(app.host.querySelector('[data-pt-slab-coordinates-table]')).toBeNull();
    app.reveal(true);
    expect(app.log().open).toBe(true);
  });
  it('shows every live plotted observation with exactly the same coordinates', () => {
    const app = mount(); app.play(); for (let i = 0; i < 12; i++) app.event(); app.reveal(true);
    assertSameCoordinates(app);
    expect(app.rows()).toHaveLength(12);
    expect(app.disclosure().dataset.ptSlabCoordinates).toBe('live');
    expect(app.disclosure().textContent).toContain('list changes');
    expect(app.host.querySelector('[data-pt-quake-fit]')).toBeNull();
    expect(app.host.querySelector('[data-pt-slab-line="fit"]')).toBeNull();
    expect(app.disclosure().textContent).not.toMatch(/residual|fitted|degrees|°/i);
  });
  it('uses semantic row/column headers and a caption explaining sample numbering', () => {
    const app = mount(restored); app.reveal(true);
    const table = app.host.querySelector('[data-pt-slab-coordinates-table]');
    expect(table.querySelector('caption').textContent).toContain('positions in this displayed sample');
    expect([...table.querySelectorAll('thead th')].map(node => node.getAttribute('scope'))).toEqual(['col', 'col', 'col']);
    expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(8);
    expect(table.querySelector('thead').textContent).toContain('Distance from trench (km)');
    expect(table.style.fontSize).toBe('14px');
    expect(table.style.tableLayout).toBe('fixed');
  });
  it('preserves decimal coordinates in a restored checked sample without rounding or recomputing', () => {
    const app = mount(restored); app.reveal(true); assertSameCoordinates(app);
    expect(app.rows()[0].querySelector('[data-pt-slab-coordinate-distance]').textContent).toBe('100.125');
    expect(app.rows()[0].querySelector('[data-pt-slab-coordinate-depth]').textContent).toBe('100.625');
    expect(app.disclosure().dataset.ptSlabCoordinates).toBe('captured');
    expect(app.disclosure().textContent).toContain('stay fixed');
    expect(app.record).not.toHaveBeenCalled();
  });
  it('keeps checked coordinates fixed while fresh live observations accumulate', () => {
    const app = mount(); app.play(); for (let i = 0; i < 8; i++) app.event(); app.click('[data-pt-quake-lock]'); app.reveal(true);
    const captured = app.rows().map(row => row.textContent);
    expect(app.record).toHaveBeenCalledTimes(1);
    app.play(); for (let i = 0; i < 3; i++) app.event();
    expect(Number(app.log().dataset.ptQuakeLiveCount)).toBe(11);
    expect(app.rows().map(row => row.textContent)).toEqual(captured);
    assertSameCoordinates(app);
    expect(app.disclosure().dataset.ptSlabCoordinates).toBe('captured');
    expect(app.record).toHaveBeenCalledTimes(1);
  });
  it('uses current observations after Revise and gives neutral boundary headings in other modes', () => {
    const app = mount(); app.play(); for (let i = 0; i < 8; i++) app.event(); app.click('[data-pt-quake-lock]'); app.play(); app.event(); app.click('[data-pt-slab-revise]');
    expect(app.disclosure().dataset.ptSlabCoordinates).toBe('live');
    expect(app.rows()).toHaveLength(9); assertSameCoordinates(app);
    app.click('[data-tect-mode="transform"]'); app.event();
    expect(app.disclosure().textContent).toContain('Distance from boundary (km)');
    expect(app.disclosure().textContent).not.toContain('Distance from trench (km)');
    assertSameCoordinates(app);
  });
  it('does not announce, save, award or ping when expanding, collapsing or idling', () => {
    const app = mount(restored); app.xp.mockClear(); app.announce.mockClear(); app.record.mockClear(); app.beep.mockClear();
    const original = app.rows().map(row => row.textContent), time = app.host.querySelector('[data-pt-model-reading="time"]').textContent;
    for (let i = 0; i < 4; i++) { app.reveal(true); app.reveal(false); }
    for (let i = 0; i < 60; i++) app.event();
    expect(app.log().open).toBe(true);
    expect(app.rows().map(row => row.textContent)).toEqual(original);
    expect(app.host.querySelector('[data-pt-model-reading="time"]').textContent).toBe(time);
    for (const callback of [app.xp, app.announce, app.record, app.beep]) expect(callback).not.toHaveBeenCalled();
  });
  it('keeps the latest capped 200 observations aligned with the plotted points', () => {
    const app = mount(); app.play(); for (let i = 0; i < 205; i++) app.event(); app.reveal(true);
    expect(app.rows()).toHaveLength(200); assertSameCoordinates(app);
    expect(app.disclosure().querySelector('summary').textContent).toContain('200 events');
  });
});
