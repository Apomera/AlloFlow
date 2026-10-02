import fs from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act, now = 0, frameId = 0, svgWidth = 460;
const frames = new Map(), apps = [];
beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  window.SVGElement.prototype.getBoundingClientRect = function () {
    const vb = (this.getAttribute('viewBox') || '0 0 460 354').split(' ').map(Number);
    return { width: svgWidth, height: svgWidth * vb[3] / vb[2], x: 0, y: 0, left: 0, top: 0, right: svgWidth, bottom: svgWidth * vb[3] / vb[2] };
  };
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = { registerTool() {}, ensureThree: () => new Promise(() => {}), makeBayViewer: () => ({}) };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', process.env.PT_TEST_SOURCE || 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
beforeEach(() => {
  frames.clear(); now = 0; svgWidth = 460;
  for (const clock of new Set([globalThis.performance, window.performance])) vi.spyOn(clock, 'now').mockImplementation(() => now);
});
afterEach(() => { while (apps.length) { const app = apps.pop(); act(() => app.root.unmount()); app.host.remove(); } frames.clear(); vi.restoreAllMocks(); });
const saved = { version: 1, angle: 42, points: Array.from({ length: 8 }, (_, i) => ({ x: 100.12345678901234 + i * 50, z: 100.625 + i * 45, m: 4 })) };
function mount(record) {
  if (!arguments.length) record = saved;
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOM.createRoot(host);
  const effects = Object.fromEntries(['record','depth','inquiry','draft','xp','beep','announce'].map(key => [key, vi.fn()]));
  act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(window.AlloTectonicsInteractive, {
    darkMode: true, savedSlab: record, onRecordSlab: effects.record, onRecordDepths: effects.depth,
    onRecordBoundaryInquiry: effects.inquiry, onRecordBoundaryDraft: effects.draft,
    awardXP: effects.xp, beep: effects.beep, announceToSR: effects.announce
  }))));
  const query = selector => host.querySelector(selector), all = selector => [...host.querySelectorAll(selector)];
  const click = selector => act(() => query(selector).click());
  const open = () => act(() => { const log = query('[data-pt-quake-log]'); log.open = true; log.dispatchEvent(new window.Event('toggle', { bubbles: true })); });
  open();
  let rng = 0; const sequence = [0, 0.2, 0.8, 0.9, 0.5, 0.5];
  vi.spyOn(Math, 'random').mockImplementation(() => sequence[rng++ % sequence.length]);
  const frame = () => { rng = 0; now += 1000; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); };
  const select = value => {
    const node = query('[data-pt-quake-inspect-select]');
    act(() => { Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new window.Event('change', { bubbles: true })); });
  };
  const key = (selector, key) => act(() => query(selector).dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true })));
  const app = { host, root, effects, query, all, click, open, frame, select, key, record };
  apps.push(app); return app;
}
function noEffects(app) { for (const callback of Object.values(app.effects)) expect(callback).not.toHaveBeenCalled(); }
function inspection(app) { return app.query('[data-pt-quake-inspected-values]'); }
function coordinates(app) { return { x: app.query('[data-pt-quake-inspected-distance]')?.textContent, z: app.query('[data-pt-quake-inspected-depth]')?.textContent }; }
function model(app) { return ['time','movement'].map(key => app.query('[data-pt-model-reading="' + key + '"]').textContent).concat(app.query('#pt-ql-dip').value, app.query('[data-pt-model-play]').textContent); }
function input(app, selector, value) {
  const node = app.query(selector);
  act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new window.Event('input', { bubbles: true })); node.dispatchEvent(new window.Event('change', { bubbles: true })); });
}
function lineAngle(app) { const line = app.query('[data-pt-slab-line="guess"]'), n = key => Number(line.getAttribute(key)); return Math.atan2(n('y2') - n('y1'), n('x2') - n('x1')) * 180 / Math.PI; }

describe('Equal-scale earthquake evidence and event inspection', () => {
  it.each([5,20,45,85])('draws the estimate at its actual %i-degree angle without revealing the fitted result', angle => {
    const app = mount(undefined); input(app, '#pt-ql-dip', String(angle));
    expect(lineAngle(app)).toBeCloseTo(angle, 8);
    expect(app.query('[data-pt-slab-line="fit"]')).toBeNull();
    expect(app.query('[data-pt-quake-fit]')).toBeNull();
    expect(app.query('#pt-ql-angle-help').textContent).toContain('same kilometre scale'); noEffects(app);
  });
  it.each([206,244,620])('preserves equal kilometre scales and 14-pixel axis labels at a %i-pixel plot width', width => {
    const app = mount(); svgWidth = width; act(() => window.dispatchEvent(new window.Event('resize')));
    const plot = app.query('[data-pt-quake-plot]'), vb = plot.getAttribute('viewBox').split(' ').map(Number), scale = width / vb[2];
    const x = n => Number(app.query('[data-pt-quake-grid="distance"][data-km="' + n + '"]').getAttribute('x1'));
    const z = n => Number(app.query('[data-pt-quake-grid="depth"][data-km="' + n + '"]').getAttribute('y1'));
    expect(x(400) - x(200)).toBeCloseTo(z(400) - z(200), 10);
    for (const label of app.all('[data-pt-quake-axis-label]')) expect(Number(label.getAttribute('font-size')) * scale).toBeCloseTo(14, 8);
    expect(plot.style.height).toBe('auto'); noEffects(app);
  });
  it('starts unselected and disables inspection truthfully for an empty sample', () => {
    const app = mount(undefined);
    expect(app.query('[data-pt-quake-inspect-select]').disabled).toBe(true);
    expect(app.query('[data-pt-quake-inspect-select]').value).toBe('');
    for (const name of ['prev','next','clear']) expect(app.query('[data-pt-quake-inspect-' + name + ']').disabled).toBe(true);
    expect(inspection(app)).toBeNull(); noEffects(app);
  });
  it('connects exact restored decimal values, one ring and the matching coordinate row', () => {
    const app = mount(), before = model(app), frozen = JSON.stringify(saved); app.select('2');
    expect(coordinates(app)).toEqual({ x: String(saved.points[2].x), z: String(saved.points[2].z) });
    expect(app.all('[data-pt-quake-point][data-pt-quake-inspected="true"]')).toHaveLength(1);
    expect(app.query('[data-pt-quake-inspection-ring]').dataset.ptQuakeInspectionRing).toBe('2');
    expect(app.all('[data-pt-slab-coordinate-inspected="true"]')).toHaveLength(1);
    expect(app.query('[data-pt-quake-inspect-row="2"]').getAttribute('aria-pressed')).toBe('true');
    expect(app.query('[data-pt-quake-inspect-row="2"]').tabIndex).toBe(0);
    expect(app.query('[data-pt-quake-inspect-row="0"]').tabIndex).toBe(-1);
    const circle = app.query('[data-pt-quake-point="2"]'), guides = app.all('[data-pt-quake-guide]');
    expect(Number(guides[0].getAttribute('y1'))).toBe(Number(circle.getAttribute('cy')));
    expect(Number(guides[1].getAttribute('x1'))).toBe(Number(circle.getAttribute('cx')));
    expect(model(app)).toEqual(before); expect(JSON.stringify(saved)).toBe(frozen); noEffects(app);
  });
  it('treats coincident events as distinct observations rather than selecting by rounded coordinates', () => {
    const app = mount({ version: 1, angle: 42, points: Array.from({ length: 8 }, () => ({ x: 100.125, z: 200.25, m: 4 })) });
    app.select('1'); expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('1');
    expect(app.query('[data-pt-quake-point="0"]').dataset.ptQuakeInspected).toBe('false');
    expect(app.query('[data-pt-quake-point="1"]').dataset.ptQuakeInspected).toBe('true');
    app.click('[data-pt-quake-inspect-next]'); expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('2'); noEffects(app);
  });
  it('offers bounded Previous/Next and clears only the local selection', () => {
    const app = mount(); app.select('0'); expect(app.query('[data-pt-quake-inspect-prev]').disabled).toBe(true);
    app.click('[data-pt-quake-inspect-next]'); expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('1');
    app.click('[data-pt-quake-inspect-prev]'); expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('0');
    app.select('7'); expect(app.query('[data-pt-quake-inspect-next]').disabled).toBe(true);
    app.click('[data-pt-quake-inspect-clear]'); expect(inspection(app)).toBeNull();
    expect(app.query('[data-pt-quake-inspection-ring]')).toBeNull(); expect(app.all('[data-pt-quake-point]')).toHaveLength(8); noEffects(app);
  });
  it('supports row buttons with Up/Down and Home/End while keeping a single table tab stop', () => {
    const app = mount(); app.click('[data-pt-quake-inspect-row="1"]');
    app.key('[data-pt-quake-inspect-row="1"]','ArrowDown'); expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('2');
    expect(document.activeElement).toBe(app.query('[data-pt-quake-inspect-row="2"]'));
    app.key('[data-pt-quake-inspect-row="2"]','End'); expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('7');
    app.key('[data-pt-quake-inspect-row="7"]','Home'); expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('0');
    app.key('[data-pt-quake-inspect-row="0"]','ArrowUp'); expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('0');
    expect(app.all('[data-pt-quake-inspect-row]').filter(button => button.tabIndex === 0)).toHaveLength(1); noEffects(app);
  });
  it('keeps inspected checked evidence fixed through new live observations and clears inspection on Revise', () => {
    const app = mount(); app.select('3'); const selected = coordinates(app);
    app.click('[data-pt-model-play]'); for (let i=0;i<5;i++) app.frame();
    expect(coordinates(app)).toEqual(selected); expect(app.query('[data-pt-quake-inspected-source]').dataset.ptQuakeInspectedSource).toBe('captured');
    app.click('[data-pt-slab-revise]'); expect(inspection(app)).toBeNull();
    expect(app.all('[data-pt-quake-point]')).toHaveLength(5); expect(app.query('[data-pt-slab-line="fit"]')).toBeNull();
    expect(app.effects.record).not.toHaveBeenCalled(); expect(app.effects.xp).not.toHaveBeenCalled(); expect(app.effects.beep).not.toHaveBeenCalled();
  });
  it('keeps the same live observation selected as the log grows', () => {
    const app = mount(undefined); app.click('[data-pt-model-play]'); expect(app.effects.announce).toHaveBeenCalledTimes(1); expect(app.effects.announce).toHaveBeenLastCalledWith('Simulation playing'); app.effects.announce.mockClear(); for (let i=0;i<8;i++) app.frame(); app.select('2');
    const selected = coordinates(app); for (let i=0;i<6;i++) app.frame();
    expect(coordinates(app)).toEqual(selected); expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('2'); noEffects(app);
  });
  it('clears an inspection when its observation leaves the rolling 200-event log, without selecting the replacement', () => {
    const app = mount(undefined); app.click('[data-pt-model-play]'); expect(app.effects.announce).toHaveBeenCalledTimes(1); expect(app.effects.announce).toHaveBeenLastCalledWith('Simulation playing'); app.effects.announce.mockClear(); for (let i=0;i<200;i++) app.frame(); app.select('0');
    expect(inspection(app)).not.toBeNull(); app.frame();
    expect(app.all('[data-pt-quake-point]')).toHaveLength(200); expect(inspection(app)).toBeNull();
    expect(app.all('[data-pt-quake-point][data-pt-quake-inspected="true"]')).toHaveLength(0); noEffects(app);
  });
  it('clears inspection on Check, boundary changes and explicit reset while preserving original assessment behavior', () => {
    const app = mount(undefined); app.click('[data-pt-model-play]'); for(let i=0;i<8;i++)app.frame(); app.select('1');
    app.click('[data-pt-quake-lock]'); expect(inspection(app)).toBeNull(); expect(app.effects.record).toHaveBeenCalledTimes(1);
    app.select('1'); app.click('[data-tect-mode="transform"]'); expect(inspection(app)).toBeNull();
    app.click('[data-pt-model-step]'); app.select('0'); expect(inspection(app)).not.toBeNull();
    app.click('[data-pt-model-reset]'); expect(inspection(app)).toBeNull();
    expect(app.effects.xp).not.toHaveBeenCalled(); expect(app.effects.beep).not.toHaveBeenCalled();
  });
  it('classifies exact depth boundaries without calculating or disclosing a new angle', () => {
    const points=[0,69.999,70,299.999,300,700,...Array(8).fill(150)].map((z,index)=>({x:50+index*25,z}));
    const app=mount({version:1,angle:42,points});
    for(const [index,band] of [[0,'shallow'],[1,'shallow'],[2,'intermediate'],[3,'intermediate'],[4,'deep'],[5,'deep']]){
      app.select(String(index));expect(app.query('[data-pt-quake-inspected-band]').dataset.ptQuakeInspectedBand).toBe(band);
      expect(inspection(app).textContent).not.toMatch(/\d+\s*°|fitted|residual/i);
    }
    expect(app.all('[data-pt-quake-depth-band]')).toHaveLength(3);noEffects(app);
  });
  it('leaves paused inspected evidence, local controls and all external effects unchanged for 1200 idle frames', () => {
    const app=mount();app.select('4');const before=app.query('[data-pt-quake-log]').innerHTML,physical=model(app);
    for(let i=0;i<1200;i++)app.frame();
    expect(app.query('[data-pt-quake-log]').innerHTML).toBe(before);expect(model(app)).toEqual(physical);noEffects(app);
  });
});
