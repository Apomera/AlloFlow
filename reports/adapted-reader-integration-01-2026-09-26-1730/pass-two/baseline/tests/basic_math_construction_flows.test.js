import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let root;
beforeEach(() => { resetStemLab(); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });
async function mount(file, id, initial) {
  const tool = loadTool('stem_lab/stem_tool_' + file + '.js', id);
  let latest, setter;
  function App() {
    const [state, setState] = React.useState(initial);
    latest = state; setter = setState;
    return tool.render(makeCtx({ toolData: state, labToolData: state, setToolData: setState, setLabToolData: setState }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return { state: () => latest, patch: async (fn) => React.act(() => setter(fn)) };
}
async function click(label) {
  const button = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === label || el.getAttribute('aria-label') === label);
  expect(button, label).toBeTruthy(); await React.act(() => button.click());
}
describe('connected partial products', () => {
  it('links equation and table selections to proportional rectangle regions', async () => {
    await mount('areamodel', 'areamodel', { _areamodel: { viewMode: 'multidigit', multiDims: { a: 23, b: 14 } } });
    const regions = [...document.querySelectorAll('[data-partial-region]')];
    const areas = regions.map(el => +el.getAttribute('width') * +el.getAttribute('height'));
    expect(areas[0] / areas[3]).toBeCloseTo(200 / 12);
    await click('Select partial product: 20×4 = 80');
    expect(document.querySelector('[data-partial-region="1"]').getAttribute('data-selected')).toBe('true');
    expect([...document.querySelectorAll('[data-partial-button="1"]')].every(el => el.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect(document.querySelector('[data-partial-explanation]').textContent).toContain('20×4 = 80');
  });
  it('explains zero partial products without drawing false area', async () => {
    await mount('areamodel', 'areamodel', { _areamodel: { viewMode: 'multidigit', multiDims: { a: 20, b: 30 } } });
    expect(document.querySelectorAll('[data-partial-region]').length).toBe(1);
    await click('Select partial product: 0×0 = 0');
    expect(document.querySelector('[data-partial-explanation]').textContent).toContain('adds no area');
  });
  it('withholds partial answers in an unsolved challenge, including selected descriptions', async () => {
    await mount('areamodel', 'areamodel', { _areamodel: { viewMode: 'multidigit', multiDims: { a: 23, b: 14 }, challenge: { a: 23, b: 14, mode: 'multidigit', answer: 322 } } });
    await click('Select partial product: 20×10');
    expect(document.querySelector('[data-partial-explanation]').textContent).toContain('20×10 = ?');
    expect(document.querySelector('#am-partial-desc').textContent).not.toContain('200');
    expect(document.querySelectorAll('[data-partial-button]').length).toBe(4);
  });
});
describe('equal-area construction and boundary reasoning', () => {
  it('saves valid rectangles, rejects wrong areas and treats rotations as duplicates', async () => {
    const app = await mount('areaperimeter', 'areaPerimeter', { _areaPerimeter: { mode: 'investigate', targetArea: 24, buildWidth: 3, buildHeight: 3 } });
    await click('Check and save rectangle');
    expect(document.body.textContent).toContain('Too few squares');
    expect(document.querySelectorAll('[data-saved-rectangles] li')).toHaveLength(0);
    await app.patch(s => ({ _areaPerimeter: { ...s._areaPerimeter, buildWidth: 6, buildHeight: 4 } }));
    expect(document.body.textContent).not.toContain('Too few squares');
    await click('Check and save rectangle');
    expect(document.querySelector('[data-saved-rectangles]').textContent).toContain('2(6 + 4) = 20');
    await app.patch(s => ({ _areaPerimeter: { ...s._areaPerimeter, buildWidth: 4, buildHeight: 6 } }));
    await click('Check and save rectangle');
    expect(document.body.textContent).toContain('Turning it does not change');
    expect(document.querySelectorAll('[data-saved-rectangles] li')).toHaveLength(1);
  });
  it('keeps collections per target and puts complete solutions behind a disclosure', async () => {
    await mount('areaperimeter', 'areaPerimeter', { _areaPerimeter: { mode: 'investigate', targetArea: 24, buildWidth: 6, buildHeight: 4 } });
    await click('Check and save rectangle'); await click('Area 12');
    expect(document.querySelectorAll('[data-saved-rectangles] li')).toHaveLength(0);
    await click('Area 24');
    expect(document.querySelectorAll('[data-saved-rectangles] li')).toHaveLength(1);
    const details = [...document.querySelectorAll('details')].find(el => el.querySelector('summary')?.textContent === 'Compare all rectangles and explanations');
    expect(details.open).toBe(false);
  });
  it('reports each traced side and only calls the full boundary a perimeter', async () => {
    await mount('areaperimeter', 'areaPerimeter', { _areaPerimeter: { mode: 'explore', width: 6, height: 4 } });
    await click('Trace the next edge'); await click('Trace the next edge');
    expect(document.querySelector('[data-boundary-progress]').textContent).toBe('2/4 edges traced: 6 + 4 = 10 units');
    await click('Trace the next edge'); await click('Trace the next edge');
    expect(document.querySelector('[data-boundary-progress]').textContent).toContain('6 + 4 + 6 + 4 = 20 units');
    await click('Restart boundary trace');
    expect(document.querySelector('[data-boundary-progress]').textContent).toBe('0/4 edges traced: 0 units');
  });
});
describe('elapsed-time prediction and jump progression', () => {
  it.each([[495,95,1,'9:50 AM'],[30,90,-1,'11:00 PM'],[1410,90,1,'1:00 AM']])('reveals one jump at a time and completes across day boundaries', async (start,duration,direction,answer) => {
    await mount('timeschedule', 'timeSchedule', { _timeSchedule: { tab: 'elapsed', elapsedStart: start, elapsedDuration: duration, elapsedDirection: direction, elapsedStepMode: true } });
    expect(document.querySelector('[data-elapsed-result]').textContent).toBe('?');
    expect(document.querySelector('#ts-jump-desc').textContent).not.toContain(answer);
    expect(document.querySelectorAll('[aria-labelledby="ts-jump-title ts-jump-desc"] circle')).toHaveLength(1);
    await click('Show next jump');
    expect(document.querySelectorAll('[aria-labelledby="ts-jump-title ts-jump-desc"] circle')).toHaveLength(2);
    for (let i=0;i<15;i++) { const next=[...document.querySelectorAll('button')].find(el => el.textContent==='Show next jump'); if(next.disabled)break; await click('Show next jump'); }
    expect(document.querySelector('[data-elapsed-result]').textContent).toBe(answer);
    await click('Restart jumps');
    expect(document.querySelector('[data-elapsed-result]').textContent).toBe('?');
  });
  it('resets progress when the interval changes and preserves immediate exploration', async () => {
    await mount('timeschedule', 'timeSchedule', { _timeSchedule: { tab:'elapsed', elapsedStepMode:true } });
    await click('Show next jump'); await click('Count backward');
    expect(document.querySelector('[data-jump-progress]').textContent).toMatch(/^0\//);
    await click('Predict, then step through');
    expect(document.querySelector('[data-elapsed-result]').textContent).not.toBe('?');
  });
  it.each([['09:50', 'Your prediction matches'], ['09:30', 'Compare your prediction']])('compares the optional prediction only after the final jump', async (guess, message) => {
    await mount('timeschedule', 'timeSchedule', { _timeSchedule: { tab:'elapsed', elapsedStart:495, elapsedDuration:95, elapsedStepMode:true } });
    const input = document.querySelectorAll('input[type="time"]')[1];
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await React.act(() => { setter.call(input, guess); input.dispatchEvent(new Event('input', { bubbles:true })); });
    await click('Show next jump');
    expect(document.querySelector('[data-jump-progress]').textContent).not.toContain(message);
    await click('Show next jump');
    expect(document.querySelector('[data-jump-progress]').textContent).toContain(message);
  });
  it('uses matching scales for saved rectangles with equal areas', async () => {
    await mount('areaperimeter', 'areaPerimeter', { _areaPerimeter: { mode:'investigate', targetArea:24, constructedRectangles:{24:[{w:12,h:2},{w:6,h:4}]} } });
    const models = [...document.querySelectorAll('[data-saved-model]')];
    expect(models[0].getAttribute('viewBox')).toBe(models[1].getAttribute('viewBox'));
    const areas = models.map(svg => { const rect=svg.lastElementChild; return +rect.getAttribute('width') * +rect.getAttribute('height'); });
    expect(areas[0]).toBe(areas[1]);
  });
  it('explains a zero interval without requiring an impossible jump', async () => {
    await mount('timeschedule', 'timeSchedule', { _timeSchedule: { tab:'elapsed', elapsedStart:495, elapsedDuration:0, elapsedStepMode:true } });
    expect(document.querySelector('[data-elapsed-result]').textContent).toBe('8:15 AM');
    expect(document.body.textContent).toContain('The interval is zero');
  });
});
