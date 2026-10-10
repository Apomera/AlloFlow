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
  const frame = (depth = 0.9, shallow = false) => { sequence[2] = shallow ? 0 : 0.8; sequence[3] = depth; rng = 0; now += 1000; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); };
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
function plotPosition(app, index) {
  const plot=app.query('[data-pt-quake-plot]'),circle=app.query('[data-pt-quake-point="'+index+'"]'),x=Number(circle.getAttribute('cx')),z=Number(circle.getAttribute('cy'));
  const matrix=plot.getScreenCTM?.();
  if(matrix)return {x:matrix.a*x+matrix.c*z+matrix.e,y:matrix.b*x+matrix.d*z+matrix.f};
  const bounds=plot.getBoundingClientRect(),vb=plot.getAttribute('viewBox').split(' ').map(Number);
  return {x:bounds.left+x*bounds.width/vb[2],y:bounds.top+z*bounds.height/vb[3]};
}
function clickPlot(app, x, y) { act(()=>app.query('[data-pt-quake-plot]').dispatchEvent(new window.MouseEvent('click',{bubbles:true,clientX:x,clientY:y}))); }

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
    clickPlot(app,10,10);expect(inspection(app)).toBeNull(); noEffects(app);
  });
  it.each([206,320,620])('selects the nearest plotted observation within its screen-pixel hit area at width %i',width=>{
    const app=mount();svgWidth=width;act(()=>window.dispatchEvent(new window.Event('resize')));
    const before=model(app),point=plotPosition(app,7);clickPlot(app,point.x+12,point.y+4);
    expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('7');
    expect(coordinates(app)).toEqual({x:String(saved.points[7].x),z:String(saved.points[7].z)});
    expect(app.query('[data-pt-slab-coordinate-inspected="true"]').dataset.ptSlabCoordinateRow).toBe('7');
    expect(model(app)).toEqual(before);noEffects(app);
  });
  it('uses the actual translated and rotated SVG transform for pointer inspection',()=>{
    const app=mount(),plot=app.query('[data-pt-quake-plot]'),before=model(app);
    plot.getScreenCTM=()=>({a:0.85,b:0.15,c:-0.1,d:0.85,e:120,f:240});
    const point=plotPosition(app,5);clickPlot(app,point.x,point.y);
    expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('5');
    expect(coordinates(app)).toEqual({x:String(saved.points[5].x),z:String(saved.points[5].z)});
    expect(model(app)).toEqual(before);noEffects(app);
  });
  it('keeps a selection when a distant empty part of the plot is clicked',()=>{
    const app=mount();app.select('1');const selected=coordinates(app),point=plotPosition(app,7);
    clickPlot(app,point.x+30,point.y+20);
    expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('1');expect(coordinates(app)).toEqual(selected);noEffects(app);
  });
  it('resolves coincident pointer positions consistently while the keyboard list retains individual events',()=>{
    const app=mount({version:1,angle:42,points:Array.from({length:8},()=>({x:100.125,z:200.25,m:4}))}),point=plotPosition(app,0);
    clickPlot(app,point.x,point.y);expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('0');
    app.select('1');expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('1');
    expect(app.query('[data-pt-quake-plot-selection-help]').textContent).toContain('overlapping points');noEffects(app);
  });
  it('groups angle controls with the graph and places the keyboard event list next in document order',()=>{
    const app=mount(),angle=app.query('#pt-ql-dip'),list=app.query('[data-pt-quake-inspect-select]');
    expect(app.query('[data-pt-quake-chart-column]').contains(angle)).toBe(true);
    expect(app.query('[data-pt-quake-readout-column]').contains(list)).toBe(true);
    expect(angle.compareDocumentPosition(list)&window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(app.query('[data-pt-quake-boundary-reference]').dataset.km).toBe('0');
    expect(app.query('[data-pt-quake-origin-help]').textContent).toContain('0 km');noEffects(app);
  });
  it('retains angle entry and local inspection through closing and reopening the evidence panel',()=>{
    const app=mount();app.select('2');const selected=coordinates(app),before=model(app),log=app.query('[data-pt-quake-log]');
    act(()=>{log.open=false;log.dispatchEvent(new window.Event('toggle',{bubbles:true}));});
    expect(app.query('#pt-ql-dip')).not.toBeNull();expect(app.query('[data-pt-quake-plot]')).toBeNull();
    app.open();expect(coordinates(app)).toEqual(selected);expect(model(app)).toEqual(before);noEffects(app);
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
    const point=plotPosition(app,7),live=model(app),noticeCount=app.effects.announce.mock.calls.length;clickPlot(app,point.x,point.y);
    expect(coordinates(app)).toEqual({x:String(saved.points[7].x),z:String(saved.points[7].z)});
    expect(model(app)).toEqual(live);expect(app.effects.announce).toHaveBeenCalledTimes(noticeCount);
    app.click('[data-pt-slab-revise]'); expect(inspection(app)).toBeNull();
    expect(app.all('[data-pt-quake-point]')).toHaveLength(5); expect(app.query('[data-pt-slab-line="fit"]')).toBeNull();
    expect(app.effects.record).not.toHaveBeenCalled(); expect(app.effects.xp).not.toHaveBeenCalled(); expect(app.effects.beep).not.toHaveBeenCalled();
  });
  it('keeps the same live observation selected as the log grows', () => {
    const app = mount(undefined); app.click('[data-pt-model-play]'); expect(app.effects.announce).toHaveBeenCalledTimes(1); expect(app.effects.announce).toHaveBeenLastCalledWith('Simulation playing'); app.effects.announce.mockClear(); for (let i=0;i<8;i++) app.frame();
    // The seeded live events coincide: the plot chooses the first, while the
    // event list can still choose the third observation independently.
    const point=plotPosition(app,2);clickPlot(app,point.x,point.y);
    expect(inspection(app).dataset.ptQuakeInspectedValues).toBe('0');
    expect(app.query('[data-pt-quake-inspected-source]').dataset.ptQuakeInspectedSource).toBe('live');
    expect(app.query('[data-pt-slab-line="fit"]')).toBeNull();app.select('2');
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

  it('explains an empty paused sample with a stable check label and quiet collection target', () => {
    const app=mount(undefined),overview=app.query('[data-pt-quake-overview]'),progress=app.query('[data-pt-quake-readiness-progress]');
    expect(overview.dataset.ptQuakeOverview).toBe('live');expect(overview.getAttribute('aria-live')).toBe('off');
    expect(app.query('[data-pt-quake-overview-total]').dataset.ptQuakeOverviewTotal).toBe('0');
    expect(app.all('[data-pt-quake-band-count]').map(node=>node.textContent)).toEqual(['0','0','0']);
    expect(progress.getAttribute('aria-valuenow')).toBe('0');expect(progress.getAttribute('aria-valuemax')).toBe('8');
    expect(progress.getAttribute('aria-valuetext')).toContain('Minimum for this activity: 8');
    expect(app.query('[data-pt-quake-readiness-help]').textContent).toContain('Advance 60,000 years');
    expect(app.query('[data-pt-quake-lock]').textContent).toBe('Check my angle against this sample');
    expect(app.query('[data-pt-quake-lock]').disabled).toBe(true);
    expect(app.query('[data-pt-slab-line="fit"]')).toBeNull();noEffects(app);
  });
  it('counts the exact depth boundaries in the displayed sample without double counting', () => {
    const points=[0,69.999,70,299.999,300,700,...Array(8).fill(150)].map((z,i)=>({x:50+i*25,z}));
    const app=mount({version:1,angle:42,points});
    expect(app.query('[data-pt-quake-overview-total]').dataset.ptQuakeOverviewTotal).toBe('14');
    expect(app.all('[data-pt-quake-band-count]').map(node=>node.textContent)).toEqual(['2','10','2']);
    expect(app.query('[data-pt-quake-readiness]').dataset.ptQuakeReadiness).toBe('checked');
    expect(app.query('[data-pt-quake-readiness-progress]')).toBeNull();noEffects(app);
  });
  it('requires eight qualifying events, caps only the progress bar and waits for an explicit check', () => {
    const app=mount(undefined);app.click('[data-pt-model-play]');app.effects.announce.mockClear();
    for(let i=0;i<4;i++)app.frame(0.2,true);
    for(let i=0;i<7;i++)app.frame(0.3);
    expect(app.all('[data-pt-quake-band-count]').map(node=>node.textContent)).toEqual(['4','7','0']);
    expect(app.query('[data-pt-quake-overview-total]').dataset.ptQuakeOverviewTotal).toBe('11');
    expect(app.query('[data-pt-quake-lock]').disabled).toBe(true);
    expect(app.query('[data-pt-quake-readiness-progress]').getAttribute('aria-valuenow')).toBe('7');
    expect(app.query('[data-pt-quake-readiness]').dataset.ptQuakeReadiness).toBe('collect');
    app.frame(0.3);expect(app.query('[data-pt-quake-lock]').disabled).toBe(false);
    expect(app.query('[data-pt-quake-readiness]').dataset.ptQuakeReadiness).toBe('ready');
    for(let i=0;i<3;i++)app.frame();
    expect(app.all('[data-pt-quake-band-count]').map(node=>node.textContent)).toEqual(['4','8','3']);
    const progress=app.query('[data-pt-quake-readiness-progress]');
    expect(progress.getAttribute('aria-valuenow')).toBe('8');expect(progress.getAttribute('aria-valuetext')).toContain('deeper: 11.');
    expect(app.query('[data-pt-slab-line="fit"]')).toBeNull();noEffects(app);
    app.click('[data-pt-quake-lock]');expect(app.effects.record).toHaveBeenCalledTimes(1);
    expect(app.query('[data-pt-quake-readiness]').dataset.ptQuakeReadiness).toBe('checked');
    expect(app.query('[data-pt-quake-readiness-progress]')).toBeNull();expect(app.query('[data-pt-slab-line="fit"]')).not.toBeNull();
    expect(app.effects.xp).not.toHaveBeenCalled();expect(app.effects.beep).not.toHaveBeenCalled();
  });
  it('keeps the checked summary fixed while a new live log grows and updates it only on Revise', () => {
    const app=mount(),overview=app.query('[data-pt-quake-overview]').innerHTML;
    app.click('[data-pt-model-play]');for(let i=0;i<2;i++)app.frame(0.2,true);for(let i=0;i<3;i++)app.frame(0.3);
    expect(app.query('[data-pt-quake-overview]').innerHTML).toBe(overview);
    expect(app.query('[data-pt-quake-log]').dataset.ptQuakeLiveCount).toBe('5');
    app.click('[data-pt-slab-revise]');
    expect(app.query('[data-pt-quake-overview]').dataset.ptQuakeOverview).toBe('live');
    expect(app.all('[data-pt-quake-band-count]').map(node=>node.textContent)).toEqual(['2','3','0']);
    expect(app.query('[data-pt-quake-overview-total]').dataset.ptQuakeOverviewTotal).toBe('5');
    expect(app.query('[data-pt-quake-lock]').disabled).toBe(true);expect(app.query('[data-pt-slab-line="fit"]')).toBeNull();
    expect(app.effects.record).not.toHaveBeenCalled();expect(app.effects.xp).not.toHaveBeenCalled();expect(app.effects.beep).not.toHaveBeenCalled();
  });
  it.each(['divergent','transform'])('shows depth counts without a misleading slab target for %s',mode=>{
    const app=mount(undefined);app.click('[data-tect-mode="'+mode+'"]');app.click('[data-pt-model-play]');
    app.effects.announce.mockClear();for(let i=0;i<9;i++)app.frame();
    expect(app.all('[data-pt-quake-band-count]').map(node=>node.textContent)).toEqual(['9','0','0']);
    expect(app.query('[data-pt-quake-readiness]')).toBeNull();expect(app.query('[data-pt-quake-lock]')).toBeNull();
    expect(app.query('[data-pt-slab-line="fit"]')).toBeNull();noEffects(app);
  });
});


describe('Recorded earthquake projections remain explicit, local and quiet', () => {
  beforeEach(() => {
    if (!window.HTMLElement.prototype.scrollIntoView) Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value() {} });
  });
  function captureProjection() {
    const engine = window.__alloTectGL, original = engine.submit;
    let latest;
    vi.spyOn(engine, 'submit').mockImplementation(function (value) { latest = value; return original.call(engine, value); });
    return () => latest?.observationProjection ?? null;
  }
  function noWritesOrRewards(app) { for (const [key, callback] of Object.entries(app.effects)) if (key !== 'announce') expect(callback).not.toHaveBeenCalled(); }
  function clearEffects(app) { for (const callback of Object.values(app.effects)) callback.mockClear(); }
  function expectControlledFrame(app) {
    const action = app.query('[data-pt-quake-project]');
    expect(action.getAttribute('aria-controls')).toBe('pt-quake-model-frame');
    expect(app.query('#' + action.getAttribute('aria-controls'))).toBe(app.query('.pt-tect-frame'));
  }
  function expectSource(app, captured) {
    const source = app.query('[data-pt-quake-projection-source]');
    expect(source.dataset.ptQuakeProjectionSource).toBe(captured ? 'captured' : 'live');
    expect(source.textContent).toBe(captured ? 'From your fixed checked sample.' : 'From the current observation log.');
  }
  function project(app) { app.click('[data-pt-quake-project]'); }
  async function flushProjectionEffects() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
  function camera(app) { return { view: app.query('[data-tect-gl]')?.dataset.tectView, cut: app.query('#tect-cut')?.value }; }

  it('selects exact recorded coordinates without opening 3D, changing focus or scrolling during 1200 quiet frames', () => {
    const getProjection = captureProjection(), loader = vi.spyOn(window.StemLab, 'ensureThree'), app = mount();
    const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView'), before = model(app), focus = document.activeElement;
    app.select('2');
    const action = app.query('[data-pt-quake-project]');
    expect(action).not.toBeNull(); expect(action.type).toBe('button'); expect(action.style.minHeight).toBe('44px'); expectControlledFrame(app);
    expect(coordinates(app)).toEqual({ x: String(saved.points[2].x), z: String(saved.points[2].z) });
    for (let i = 0; i < 1200; i++) app.frame();
    expect(app.query('[data-tect-gl]')).toBeNull(); expect(getProjection()).toBeNull();
    expect(loader).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focus);
    expect(model(app)).toEqual(before); noEffects(app);
  });

  it('projects the exact displayed event only after the explicit action and focuses the quiet nearby explanation', async () => {
    const getProjection = captureProjection(), app = mount(); app.select('2');
    const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView'), focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), before = model(app), frozen = JSON.stringify(saved);
    const action = app.query('[data-pt-quake-project]'); action.focus(); focus.mockClear(); project(app); await flushProjectionEffects();
    expect(getProjection()).toEqual({ x: saved.points[2].x, z: saved.points[2].z, index: 2, captured: true });
    expect(camera(app)).toEqual({ view: '0,0,1.00', cut: '0' });
    const status = app.query('#pt-quake-projection-status');
    expect(app.query('[data-pt-quake-projection-panel]').contains(status)).toBe(true); expectSource(app, true); expectControlledFrame(app);
    expect(status.getAttribute('aria-live')).toBe('off'); expect(status.tabIndex).toBe(-1); expect(document.activeElement).toBe(status);
    expect(focus).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(scroll).toHaveBeenCalledTimes(1); expect(scroll.mock.instances[0]).toBe(app.query('.pt-tect-frame'));
    expect(app.query('[data-tect-section]').getAttribute('aria-hidden')).toBe('false');
    expect(model(app)).toEqual(before); expect(JSON.stringify(saved)).toBe(frozen); noWritesOrRewards(app);
    clearEffects(app); scroll.mockClear(); focus.mockClear(); for (let i = 0; i < 1200; i++) app.frame();
    expect(getProjection()).toEqual({ x: saved.points[2].x, z: saved.points[2].z, index: 2, captured: true });
    expect(scroll).not.toHaveBeenCalled(); expect(focus).not.toHaveBeenCalled(); noEffects(app);
  });

  it('follows deliberate point and Previous/Next choices in the checked sample while new live earthquakes stay separate', async () => {
    const getProjection = captureProjection(), app = mount(); app.select('2'); project(app); await flushProjectionEffects();
    clearEffects(app); const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView'), beforeCamera = camera(app), status = app.query('#pt-quake-projection-status');
    app.click('[data-pt-quake-inspect-next]');
    expect(getProjection()).toEqual({ x: saved.points[3].x, z: saved.points[3].z, index: 3, captured: true });
    app.click('[data-pt-quake-inspect-prev]');
    expect(getProjection()).toEqual({ x: saved.points[2].x, z: saved.points[2].z, index: 2, captured: true });
    const point = plotPosition(app, 7); clickPlot(app, point.x, point.y);
    const checked = { x: saved.points[7].x, z: saved.points[7].z, index: 7, captured: true };
    expect(getProjection()).toEqual(checked); expect(camera(app)).toEqual(beforeCamera); expect(document.activeElement).toBe(status);
    expect(scroll).not.toHaveBeenCalled(); noEffects(app);
    app.click('[data-pt-model-play]'); app.effects.announce.mockClear(); for (let i = 0; i < 8; i++) app.frame();
    expect(getProjection()).toEqual(checked); expect(app.query('[data-pt-quake-log]').dataset.ptQuakeLiveCount).toBe('8');
    expect(app.all('[data-pt-quake-point]')).toHaveLength(8); expect(camera(app)).toEqual(beforeCamera); noEffects(app);
  });

  it('removes a live projection when its specific observation leaves the rolling log without selecting its replacement', async () => {
    const getProjection = captureProjection(), app = mount(undefined); app.click('[data-pt-model-play]');
    for (let i = 0; i < 200; i++) app.frame(); app.select('0'); project(app); await flushProjectionEffects();
    expect(getProjection()?.captured).toBe(false); expectSource(app, false); const beforeCamera = camera(app); clearEffects(app);
    app.frame();
    expect(getProjection()).toBeNull(); expect(inspection(app)).toBeNull(); expect(app.query('[data-pt-quake-project]')).toBeNull();
    expect(app.all('[data-pt-quake-point]')).toHaveLength(200); expect(camera(app)).toEqual(beforeCamera); noEffects(app);
  });

  it('clears projection requests across Check, Revise, reset and a boundary change without changing assessment behavior', async () => {
    const getProjection = captureProjection(), app = mount(undefined); app.click('[data-pt-model-play]'); for (let i = 0; i < 8; i++) app.frame();
    app.click('[data-pt-model-play]'); app.select('1'); project(app); await flushProjectionEffects(); clearEffects(app);
    expect(getProjection()?.captured).toBe(false); expectSource(app, false); app.click('[data-pt-quake-lock]');
    expect(getProjection()).toBeNull(); expect(inspection(app)).toBeNull(); expect(app.effects.record).toHaveBeenCalledTimes(1);
    app.select('1'); expect(getProjection()).toBeNull(); project(app); await flushProjectionEffects(); expect(getProjection()?.captured).toBe(true); expectSource(app, true);
    clearEffects(app); app.click('[data-pt-slab-revise]'); expect(getProjection()).toBeNull(); expect(inspection(app)).toBeNull();
    app.select('1'); expect(getProjection()).toBeNull(); project(app); await flushProjectionEffects();
    clearEffects(app); app.click('[data-pt-model-reset]'); expect(getProjection()).toBeNull(); expect(inspection(app)).toBeNull();
    app.click('[data-pt-model-step]'); app.select('0'); project(app); await flushProjectionEffects(); expect(getProjection()).not.toBeNull();
    clearEffects(app); app.click('[data-tect-mode="transform"]'); expect(getProjection()).toBeNull(); expect(inspection(app)).toBeNull();
    expect(app.effects.xp).not.toHaveBeenCalled(); expect(app.effects.beep).not.toHaveBeenCalled();
  });

  it('closing the log clears the projection request while keeping the chosen observation available on reopening', async () => {
    const getProjection = captureProjection(), app = mount(); app.select('3'); project(app); await flushProjectionEffects();
    const selected = coordinates(app), beforeCamera = camera(app); clearEffects(app); const log = app.query('[data-pt-quake-log]');
    act(() => { log.open = false; log.dispatchEvent(new window.Event('toggle', { bubbles: true })); });
    expect(getProjection()).toBeNull(); app.open(); expect(coordinates(app)).toEqual(selected); expect(getProjection()).toBeNull();
    expect(app.query('[data-pt-quake-project]')).not.toBeNull(); expect(camera(app)).toEqual(beforeCamera); noEffects(app);
  });

  it('preserves out-of-picture coordinates and never clamps them onto the finite block', async () => {
    const record = { version: 1, angle: 42, points: saved.points.map((point, index) => ({ ...point, x: index === 7 ? 800 : point.x })) };
    const getProjection = captureProjection(), app = mount(record); app.select('7');
    expect(coordinates(app).x).toBe('800'); expect(app.query('[data-pt-quake-project]')).toBeNull(); expect(app.query('[data-pt-quake-projection-limit]')).not.toBeNull(); noEffects(app);
    app.select('2'); project(app); await flushProjectionEffects(); expect(getProjection()?.x).toBe(record.points[2].x);
    clearEffects(app); const beforeCamera = camera(app); app.select('7');
    expect(getProjection()).toEqual({ x: 800, z: record.points[7].z, index: 7, captured: true }); expect(coordinates(app).x).toBe('800'); expect(app.query('[data-pt-quake-project]')).toBeNull();
    expect(app.query('[data-pt-quake-projection-limit]')).not.toBeNull(); expect(camera(app)).toEqual(beforeCamera); noEffects(app);
  });

  it('hides only the projection and explicitly reactivates the same cut-face preset with fresh focus and frame reveal', async () => {
    const getProjection = captureProjection(), app = mount(); app.select('4');
    const originalDescription = app.query('#tect-gl-description').textContent;
    expect(originalDescription).toContain('The labeled focus and dashed guide');
    project(app); await flushProjectionEffects();
    const projectedDescription = app.query('#tect-gl-description').textContent;
    expect(projectedDescription).not.toContain('The labeled focus and dashed guide');
    expect(projectedDescription).toContain('arrow keys turn it');
    expect(app.query('[data-pt-model-focus-guide]')).toBeNull();
    const before = model(app), beforeCamera = camera(app), status = app.query('#pt-quake-projection-status');
    clearEffects(app); app.click('[data-pt-quake-projection-hide]'); await flushProjectionEffects();
    expect(getProjection()).toBeNull(); expect(inspection(app)).not.toBeNull(); expect(model(app)).toEqual(before); expect(camera(app)).toEqual(beforeCamera);
    expect(app.query('#tect-gl-description').textContent).toBe(originalDescription);
    expect(app.query('[data-pt-model-focus-guide]').textContent).toContain('the labeled focus is the newest event retained by the slice');
    expect(document.activeElement).toBe(app.query('[data-tect-section]')); noEffects(app);
    const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView'), focus = vi.spyOn(window.HTMLElement.prototype, 'focus');
    project(app); await flushProjectionEffects();
    expect(getProjection()).toEqual({ x: saved.points[4].x, z: saved.points[4].z, index: 4, captured: true });
    expect(camera(app)).toEqual(beforeCamera); expect(model(app)).toEqual(before); expect(document.activeElement).toBe(app.query('#pt-quake-projection-status'));
    expect(app.query('[data-pt-model-focus-guide]')).toBeNull();
    expect(app.query('#tect-gl-description').textContent).toBe(projectedDescription);
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true }); expect(scroll).toHaveBeenCalledTimes(1); expect(scroll.mock.instances[0]).toBe(app.query('.pt-tect-frame')); noWritesOrRewards(app);
  });

  it('keeps the selected evidence and nearby status focus when explicit 3D loading fails and stays quiet afterward', async () => {
    let rejectEngine; const deferred = new Promise((resolve, reject) => { rejectEngine = reject; });
    const loader = vi.spyOn(window.StemLab, 'ensureThree').mockReturnValue(deferred), getProjection = captureProjection(), app = mount();
    app.select('2'); const before = model(app), selected = coordinates(app); expectControlledFrame(app); project(app); await flushProjectionEffects();
    const status = app.query('#pt-quake-projection-status'); expect(document.activeElement).toBe(status); expect(getProjection()).not.toBeNull(); expectControlledFrame(app); expectSource(app, true);
    expect(app.query('[data-tect-section]').getAttribute('aria-hidden')).toBe('false');
    await act(async () => { rejectEngine(new Error('simulated projection engine unavailable')); await Promise.resolve(); await Promise.resolve(); });
    expect(app.query('[data-tect-gl]')).toBeNull(); expect(app.query('[data-tect-section]').getAttribute('aria-hidden')).toBe('false'); expectControlledFrame(app); expectSource(app, true);
    expect(document.activeElement).toBe(app.query('#pt-quake-projection-status')); expect(model(app)).toEqual(before); expect(coordinates(app)).toEqual(selected); noWritesOrRewards(app);
    clearEffects(app); const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView'); for (let i = 0; i < 1200; i++) app.frame();
    expect(loader).toHaveBeenCalledTimes(1); expect(scroll).not.toHaveBeenCalled(); expect(model(app)).toEqual(before); expect(coordinates(app)).toEqual(selected); noEffects(app);
  });
});

describe('Displayed earthquake sample projections preserve observation evidence', () => {
  beforeEach(() => {
    if (!window.HTMLElement.prototype.scrollIntoView) Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value() {} });
  });
  function captureSampleModel() {
    const engine = window.__alloTectGL, original = engine.submit;
    let latest;
    vi.spyOn(engine, 'submit').mockImplementation(function (value) { latest = value; return original.call(engine, value); });
    return () => latest;
  }
  function clearSampleEffects(app) { for (const callback of Object.values(app.effects)) callback.mockClear(); }
  function noSampleWrites(app) { for (const [key, callback] of Object.entries(app.effects)) if (key !== 'announce') expect(callback).not.toHaveBeenCalled(); }
  function sampleCamera(app) { return { view: app.query('[data-tect-gl]')?.dataset.tectView, cut: app.query('#tect-cut')?.value }; }
  async function flushSampleEffects() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
  async function showSample(app) { app.click('[data-pt-quake-sample-project]'); await flushSampleEffects(); }
  function expectSampleCounts(app, total, inbounds, outside) {
    const count = app.query('[data-pt-quake-sample-counts]');
    expect(count).not.toBeNull();
    expect(Number(count.getAttribute('data-total'))).toBe(total);
    expect(Number(count.getAttribute('data-inbounds'))).toBe(inbounds);
    expect(Number(count.getAttribute('data-outside'))).toBe(outside);
  }
  function expectSampleSource(app, captured) {
    expect(app.query('[data-pt-quake-projection-source]').dataset.ptQuakeProjectionSource).toBe(captured ? 'captured' : 'live');
  }
  function sampleCoordinates(value) { return value?.observationSample?.points?.map(point => ({ x: point.x, z: point.z, ...(point.m == null ? {} : { m: point.m }) })) ?? null; }

  it('requires a nonempty displayed sample and leaves empty evidence, model and view quiet', () => {
    const getModel = captureSampleModel(), loader = vi.spyOn(window.StemLab, 'ensureThree'), app = mount(undefined);
    const action = app.query('[data-pt-quake-sample-project]'), before = model(app), focus = document.activeElement;
    const scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    expect(action == null || action.disabled).toBe(true); if (action) app.click('[data-pt-quake-sample-project]');
    for (let i = 0; i < 30; i++) app.frame();
    expect(getModel()?.observationSample ?? null).toBeNull(); expect(getModel()?.observationProjection ?? null).toBeNull();
    expect(app.query('[data-pt-quake-projection-panel]')).toBeNull(); expect(app.query('[data-tect-gl]')).toBeNull();
    expect(loader).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); expect(document.activeElement).toBe(focus);
    expect(model(app)).toEqual(before); noEffects(app);
  });

  it('explicitly projects a checked sample without selecting an event and visits its stable quiet explanation', async () => {
    const getModel = captureSampleModel(), app = mount(), before = model(app), frozen = JSON.stringify(saved);
    const action = app.query('[data-pt-quake-sample-project]');
    expect(action).not.toBeNull(); expect(action.type).toBe('button'); expect(action.disabled).toBe(false);
    expect(action.getAttribute('aria-controls')).toBe('pt-quake-model-frame');
    expect(app.query('#' + action.getAttribute('aria-controls'))).toBe(app.query('.pt-tect-frame'));
    action.focus(); const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    await showSample(app);
    expect(sampleCoordinates(getModel())).toEqual(saved.points); expect(getModel().observationSample.captured).toBe(true);
    expect(getModel().observationProjection).toBeNull(); expect(inspection(app)).toBeNull();
    expect(sampleCamera(app)).toEqual({ view: '0,0,1.00', cut: '0' }); expectSampleCounts(app, 8, 8, 0); expectSampleSource(app, true);
    const status = app.query('#pt-quake-projection-status');
    expect(app.all('[data-pt-quake-projection-panel]')).toHaveLength(1); expect(status.tabIndex).toBe(-1); expect(status.getAttribute('aria-live')).toBe('off');
    expect(document.activeElement).toBe(status); expect(focus).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(scroll).toHaveBeenCalledTimes(1); expect(scroll.mock.instances[0]).toBe(app.query('.pt-tect-frame'));
    expect(app.query('[data-pt-quake-sample-toggle]').getAttribute('aria-pressed')).toBe('true');
    const depthKey = app.query('[data-pt-quake-sample-depth-key]'); expect(depthKey).not.toBeNull();
    for (const range of ['0–<70 km', '70–<300 km', '300–700 km']) expect(depthKey.textContent).toContain(range);
    expect(app.query('#pt-quake-projection-explanation').textContent).toContain('Position along the boundary was not recorded');
    expect(model(app)).toEqual(before); expect(JSON.stringify(saved)).toBe(frozen); noSampleWrites(app);
  });

  it('updates only the selected diamond and keeps the whole requested sample through deselection without revisiting the model', async () => {
    const getModel = captureSampleModel(), app = mount(); await showSample(app); clearSampleEffects(app);
    const before = model(app), camera = sampleCamera(app), sample = sampleCoordinates(getModel()), status = app.query('#pt-quake-projection-status');
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    app.select('2'); expect(getModel().observationProjection).toEqual({ x: saved.points[2].x, z: saved.points[2].z, index: 2, captured: true });
    app.click('[data-pt-quake-inspect-next]'); expect(getModel().observationProjection.index).toBe(3);
    app.click('[data-pt-quake-inspect-clear]'); await flushSampleEffects();
    expect(getModel().observationProjection).toBeNull(); expect(sampleCoordinates(getModel())).toEqual(sample); expect(inspection(app)).toBeNull();
    expectSampleCounts(app, 8, 8, 0); expect(app.query('[data-pt-quake-projection-panel]')).not.toBeNull();
    expect(document.activeElement).toBe(status); expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled();
    expect(sampleCamera(app)).toEqual(camera); expect(model(app)).toEqual(before); noEffects(app);
  });

  it('keeps checked projected coordinates and counts fixed as a separate live log grows', async () => {
    const getModel = captureSampleModel(), app = mount(); await showSample(app); app.select('3');
    const sample = sampleCoordinates(getModel()), camera = sampleCamera(app), status = app.query('#pt-quake-projection-status');
    app.click('[data-pt-model-play]'); clearSampleEffects(app);
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    for (let i = 0; i < 12; i++) app.frame();
    expect(sampleCoordinates(getModel())).toEqual(sample); expect(getModel().observationSample.captured).toBe(true);
    expect(getModel().observationProjection).toEqual({ x: saved.points[3].x, z: saved.points[3].z, index: 3, captured: true });
    expect(app.query('[data-pt-quake-log]').dataset.ptQuakeLiveCount).toBe('12'); expectSampleCounts(app, 8, 8, 0); expectSampleSource(app, true);
    expect(app.all('[data-pt-quake-point]')).toHaveLength(8); expect(sampleCamera(app)).toEqual(camera); expect(document.activeElement).toBe(status);
    expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });

  it('follows the latest 200 live observations while an expired selection clears only its highlight and no fit is revealed', async () => {
    const getModel = captureSampleModel(), app = mount(undefined); app.click('[data-pt-model-play]'); clearSampleEffects(app);
    for (let i = 0; i < 200; i++) app.frame(); await showSample(app); app.select('0'); clearSampleEffects(app);
    const originalFirst = getModel().observationSample.points[0], camera = sampleCamera(app), status = app.query('#pt-quake-projection-status');
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView'); app.frame(0.2);
    expect(getModel().observationProjection).toBeNull(); expect(inspection(app)).toBeNull();
    expect(getModel().observationSample.captured).toBe(false); expect(getModel().observationSample.points).toHaveLength(200);
    expect(getModel().observationSample.points[0]).not.toBe(originalFirst);
    const last = app.query('[data-pt-quake-point="199"]');
    expect(getModel().observationSample.points[199].x).toBe(Number(last.getAttribute('data-distance-km')));
    expect(getModel().observationSample.points[199].z).toBe(Number(last.getAttribute('data-depth-km')));
    expectSampleCounts(app, 200, 200, 0); expectSampleSource(app, false);
    expect(app.query('[data-pt-slab-line="fit"]')).toBeNull(); expect(app.query('[data-pt-quake-fit]')).toBeNull();
    expect(sampleCamera(app)).toEqual(camera); expect(document.activeElement).toBe(status); expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled(); noEffects(app);
  });

  it('clears sample requests through Check, Revise, log closure, reset and boundary change while preserving explicit assessment behavior', async () => {
    const getModel = captureSampleModel(), app = mount(undefined); app.click('[data-pt-model-play]'); for (let i = 0; i < 8; i++) app.frame();
    app.click('[data-pt-model-play]'); await showSample(app); clearSampleEffects(app); app.click('[data-pt-quake-lock]');
    expect(getModel().observationSample).toBeNull(); expect(app.query('[data-pt-quake-projection-panel]')).toBeNull(); expect(app.effects.record).toHaveBeenCalledTimes(1);
    await showSample(app); expect(getModel().observationSample.captured).toBe(true); clearSampleEffects(app); app.click('[data-pt-slab-revise]');
    expect(getModel().observationSample).toBeNull(); await showSample(app); expect(getModel().observationSample.captured).toBe(false); clearSampleEffects(app);
    const log = app.query('[data-pt-quake-log]'); act(() => { log.open = false; log.dispatchEvent(new window.Event('toggle', { bubbles: true })); });
    expect(getModel().observationSample).toBeNull(); app.open(); expect(getModel().observationSample).toBeNull(); noEffects(app);
    await showSample(app); clearSampleEffects(app); app.click('[data-pt-model-reset]'); expect(getModel().observationSample).toBeNull();
    app.click('[data-pt-model-step]'); await showSample(app); expect(getModel().observationSample).not.toBeNull(); clearSampleEffects(app);
    app.click('[data-tect-mode="transform"]'); expect(getModel().observationSample).toBeNull(); expect(app.query('[data-pt-quake-projection-panel]')).toBeNull();
    expect(app.effects.record).not.toHaveBeenCalled(); expect(app.effects.xp).not.toHaveBeenCalled(); expect(app.effects.beep).not.toHaveBeenCalled();
  });

  it('toggles only the sample pattern beside a selected event without changing camera, focus or page position', async () => {
    const getModel = captureSampleModel(), app = mount(); app.select('2'); app.click('[data-pt-quake-project]'); await flushSampleEffects(); clearSampleEffects(app);
    const toggle = app.query('[data-pt-quake-sample-toggle]'), selected = getModel().observationProjection, before = model(app), camera = sampleCamera(app);
    expect(toggle.getAttribute('aria-pressed')).toBe('false'); toggle.focus();
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    app.click('[data-pt-quake-sample-toggle]'); await flushSampleEffects();
    expect(getModel().observationSample.points).toHaveLength(8); expect(getModel().observationProjection).toEqual(selected);
    expect(app.query('[data-pt-quake-sample-toggle]').getAttribute('aria-pressed')).toBe('true');
    app.click('[data-pt-quake-sample-toggle]'); await flushSampleEffects();
    expect(getModel().observationSample).toBeNull(); expect(getModel().observationProjection).toEqual(selected);
    expect(app.query('[data-pt-quake-sample-toggle]').getAttribute('aria-pressed')).toBe('false'); expect(app.query('[data-pt-quake-projection-panel]')).not.toBeNull();
    expect(document.activeElement).toBe(toggle); expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled();
    expect(sampleCamera(app)).toEqual(camera); expect(model(app)).toEqual(before); noEffects(app);
  });

  it('hides a sample without selection to the visible canvas and explicitly revisits the same preset with a fresh local focus action', async () => {
    const getModel = captureSampleModel(), app = mount(); await showSample(app); clearSampleEffects(app);
    const before = model(app), camera = sampleCamera(app); app.click('[data-pt-quake-sample-toggle]'); await flushSampleEffects();
    expect(getModel().observationSample).toBeNull(); expect(getModel().observationProjection).toBeNull(); expect(app.query('[data-pt-quake-projection-panel]')).toBeNull();
    expect(document.activeElement).toBe(app.query('[data-tect-section]')); expect(sampleCamera(app)).toEqual(camera); expect(model(app)).toEqual(before); noEffects(app);
    const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    await showSample(app); expect(getModel().observationSample.points).toHaveLength(8); expect(document.activeElement).toBe(app.query('#pt-quake-projection-status'));
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true }); expect(scroll).toHaveBeenCalledTimes(1); expect(sampleCamera(app)).toEqual(camera);
    app.select('2'); clearSampleEffects(app); app.click('[data-pt-quake-projection-hide]'); await flushSampleEffects();
    expect(getModel().observationSample).toBeNull(); expect(getModel().observationProjection).toBeNull(); expect(inspection(app)).not.toBeNull();
    expect(document.activeElement).toBe(app.query('[data-tect-section]')); expect(model(app)).toEqual(before); noEffects(app);
  });

  it('retains signed decimal coordinates, duplicate records and exact outside-block omissions without clamping a selected event', async () => {
    const points = [...Array.from({ length: 8 }, () => ({ x: 100.125, z: 300.625, m: 4 })), { x: -149.875, z: 0, m: 2 }, { x: 760, z: 70, m: 3 }, { x: 800, z: 299.999, m: 4 }, { x: 800, z: 700, m: 4 }];
    const record = { version: 1, angle: 42, points }, getModel = captureSampleModel(), app = mount(record); await showSample(app); clearSampleEffects(app);
    expect(sampleCoordinates(getModel())).toEqual(points); expectSampleCounts(app, 12, 10, 2); expect(app.all('[data-pt-quake-point]')).toHaveLength(12);
    app.select('10'); expect(getModel().observationProjection).toEqual({ x: 800, z: 299.999, index: 10, captured: true });
    expect(coordinates(app)).toEqual({ x: '800', z: '299.999' }); expect(app.query('[data-pt-quake-project]')).toBeNull();
    expectSampleCounts(app, 12, 10, 2); expect(sampleCoordinates(getModel())).toEqual(points); noEffects(app);
    const allOutside = mount({ version: 1, angle: 42, points: Array.from({ length: 8 }, () => ({ x: 800, z: 415.625, m: 4 })) });
    await showSample(allOutside); expectSampleCounts(allOutside, 8, 0, 8);
    expect(app.query('[data-pt-quake-sample-status]')).not.toBeNull(); expect(allOutside.query('[data-pt-quake-sample-status]')).not.toBeNull();
    expect(sampleCoordinates(getModel())).toEqual(Array.from({ length: 8 }, () => ({ x: 800, z: 415.625, m: 4 }))); noSampleWrites(allOutside);
  });

  it('retains the full sample, counts and nearby focus during 3D loading failure and stays quiet through 1200 settled frames', async () => {
    let rejectEngine; const deferred = new Promise((resolve, reject) => { rejectEngine = reject; });
    const loader = vi.spyOn(window.StemLab, 'ensureThree').mockReturnValue(deferred), getModel = captureSampleModel(), app = mount();
    const before = model(app); await showSample(app); expect(sampleCoordinates(getModel())).toEqual(saved.points); expectSampleCounts(app, 8, 8, 0);
    expect(document.activeElement).toBe(app.query('#pt-quake-projection-status')); expect(app.query('[data-pt-quake-sample-status]')).not.toBeNull();
    await act(async () => { rejectEngine(new Error('simulated sample projection engine unavailable')); await Promise.resolve(); await Promise.resolve(); });
    expect(app.query('[data-tect-gl]')).toBeNull(); expect(app.query('[data-tect-section]').getAttribute('aria-hidden')).toBe('false');
    expect(sampleCoordinates(getModel())).toEqual(saved.points); expectSampleCounts(app, 8, 8, 0); expectSampleSource(app, true);
    expect(document.activeElement).toBe(app.query('#pt-quake-projection-status')); expect(model(app)).toEqual(before); noSampleWrites(app);
    clearSampleEffects(app); const focus = vi.spyOn(window.HTMLElement.prototype, 'focus'), scroll = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    for (let i = 0; i < 1200; i++) app.frame();
    expect(loader).toHaveBeenCalledTimes(1); expect(focus).not.toHaveBeenCalled(); expect(scroll).not.toHaveBeenCalled();
    expect(sampleCoordinates(getModel())).toEqual(saved.points); expectSampleCounts(app, 8, 8, 0); expect(model(app)).toEqual(before); noEffects(app);
  });
});
