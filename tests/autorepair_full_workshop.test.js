import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const file = 'stem_lab/stem_tool_autorepair.js';
const source = readFileSync(file, 'utf8');
const lugModel = source.slice(source.indexOf('  var TIRE_LUG_PATTERN ='), source.indexOf('  function buildWheelCornerScene('));
const model = new Function(lugModel + source.slice(source.indexOf('  var SHOP_STATIONS = ['), source.indexOf('  function buildWorkshopScene(')) + '\nreturn { jobs: SHOP_JOBS, initial: arShopInitial, advance: arShopAdvance, normalize: arShopState, operate: arShopOperate, kind: arShopInstrumentKind, ready: arShopEvidenceReady };')();
function step(state, extra = {}) {
  const job = model.jobs.find(j => j.id === state.job), task = job.tasks[state.step];
  let ready = model.normalize({ ...state, station: task.station, tool: task.tool, answer: String(job.answer), ...extra });
  const kind = model.kind(ready);
  if (kind === 'meter') {
    ready = model.operate(ready, { type: 'configure', field: 'contact', value: 'joint' });
    ready = model.operate(ready, { type: 'configure', field: 'load', value: 'starter' });
  }
  if (kind === 'jug') ready = model.operate(ready, { type: 'quantity', delta: 500 });
  if (kind === 'torque') {
    ready = model.operate(ready, { type: 'seat-wheel' });
    for (const index of [0, 2, 4, 1, 3]) ready = model.operate(ready, { type: 'lug', index });
  } else if (kind) ready = model.operate(ready, { type: 'read' });
  return model.advance(ready);
}
describe('Full mechanic workshop state machine', () => {
  it.each(model.jobs)('completes $id through actual service, verification and a handoff', job => {
    let state = model.initial(job.id);
    for (let i = 0; i < job.tasks.length; i++) {
      state = step(state, { notes: 'Found the fault, completed the specified service and verified the result.' });
      expect(state.step, job.tasks[i].id).toBe(i + 1);
      expect(state.history).toHaveLength(i + 1);
    }
    expect(state).toMatchObject({ serviced: true, verified: true, released: true, lift: 'ground', wheelRemoved: false });
    expect(model.advance(state).step).toBe(job.tasks.length);
  });
  it('blocks wrong stations and tools without mutating the vehicle', () => {
    const initial = model.initial('brakes');
    expect(model.advance({ ...initial, station: 'engine' })).toMatchObject({ step: 0, lift: 'ground', wheelRemoved: false });
    const wrongTool = model.advance({ ...initial, tool: 'socket' });
    expect(wrongTool.step).toBe(0); expect(wrongTool.feedback).toContain('Work order');
    expect(initial.history).toEqual([]);
  });
  it('requires a stable lift and mechanical locks before removing a wheel', () => {
    let state = model.initial('brakes');
    for (let i = 0; i < 6; i++) state = step(state);
    expect(state.lift).toBe('locked');
    for (const lift of ['ground', 'prepared', 'low', 'checked', 'raised']) {
      expect(step({ ...state, lift }).step).toBe(6);
    }
    expect(step(state).wheelRemoved).toBe(true);
  });
  it.each(model.jobs)('requires a finite correct measurement in $id', job => {
    let state = model.initial(job.id);
    while (!['measure', 'refill'].includes(job.tasks[state.step].id)) state = step(state);
    for (const answer of ['', ' ', 'Infinity', 'NaN', '99']) expect(step(state, { answer }).step).toBe(state.step);
    expect(step(state).step).toBe(state.step + 1);
  });
  it('cannot lower with a removed wheel or release an unverified repair', () => {
    const job = model.jobs[0], lower = job.tasks.findIndex(t => t.id === 'lower');
    expect(step({ ...model.initial(job.id), step: lower, lift: 'locked', wheelRemoved: true }).step).toBe(lower);
    const release = job.tasks.length - 1;
    expect(step({ ...model.initial(job.id), step: release, notes: 'The customer handoff is present but checks are missing.' }).step).toBe(release);
    expect(step({ ...model.initial(job.id), step: release, verified: true, notes: '' }).step).toBe(release);
  });
  it('normalizes unknown jobs, invalid step and lift values', () => {
    expect(model.normalize({ job: 'unknown', step: Infinity, lift: 'flying', history: 'bad' })).toMatchObject({ job: 'brakes', step: 0, lift: 'ground', history: [] });
  });
});
describe('Workshop accessible rendering', () => {
  beforeEach(() => { resetStemLab(); loadTool(file, 'autoRepair'); });
  it('is reachable from the automobile menu', () => { expect(renderTool('autoRepair', {})).toContain('Full mechanic workshop (3D)'); });
  it.each([{ isDark: false }, { isDark: true }, { isContrast: true }])('retains every station and work order without WebGL in %j', theme => {
    const html = renderTool('autoRepair', { autoRepair: { view: 'workshop', uh3dStatus: 'failed' } }, theme);
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.querySelectorAll('[data-ar-shop-station]')).toHaveLength(7);
    expect(host.querySelectorAll('#ar-shop-job option')).toHaveLength(3);
    expect(html).toContain('3D view unavailable');
    expect(host.querySelector('[data-ar-shop-perform]').textContent).toContain('Perform simulated task');
    expect(host.querySelector('label[for="ar-shop-tool"]')).not.toBeNull();
  });
  it('keeps the public mirror byte-identical', () => {
    expect(readFileSync('desktop/web-app/public/' + file, 'utf8')).toBe(source);
  });
});


describe('Operational workshop instruments', () => {
  function atTask(jobId, taskId) {
    let state = model.initial(jobId), job = model.jobs.find(j => j.id === jobId);
    while (job.tasks[state.step].id !== taskId) state = step(state);
    const task = job.tasks[state.step];
    return model.normalize({ ...state, tool: task.tool, station: task.station, answer: String(job.answer) });
  }
  it('does not accept the arithmetic answer without a physical instrument reading', () => {
    const state = atTask('brakes', 'measure');
    expect(model.advance(state).step).toBe(state.step);
    expect(model.advance(state).feedback).toContain('Operate the equipment');
  });
  it('distinguishes lining from backing plate and invalidates changed gauge placement', () => {
    let state = atTask('brakes', 'measure');
    state = model.operate(state, { type: 'configure', field: 'surface', value: 'backing' });
    state = model.operate(state, { type: 'read' });
    expect(state.reading).toMatchObject({ value: 5, unit: 'mm', valid: false });
    expect(model.advance(state).step).toBe(state.step);
    state = model.operate(state, { type: 'configure', field: 'surface', value: 'lining' });
    expect(state.reading).toBeNull();
    state = model.operate(state, { type: 'read' });
    expect(state.reading).toMatchObject({ value: 2, valid: true });
    expect(model.advance(state).history.at(-1).result).toContain('Captured: 2 mm.');
  });
  it('requires an under-load connection measurement rather than a resting battery voltage', () => {
    let state = atTask('electrical', 'measure');
    state = model.operate(state, { type: 'read' });
    expect(state.reading).toMatchObject({ value: 12.6, valid: false });
    state = model.operate(state, { type: 'configure', field: 'contact', value: 'joint' });
    state = model.operate(state, { type: 'read' });
    expect(state.reading).toMatchObject({ value: 0, valid: false });
    state = model.operate(state, { type: 'configure', field: 'load', value: 'starter' });
    state = model.operate(state, { type: 'read' });
    expect(state.reading).toMatchObject({ value: 1.6, valid: true });
    expect(model.ready(state)).toBe(true);
    expect(model.ready({ ...state, serviced: true })).toBe(false);
    state = model.operate(state, { type: 'configure', field: 'mode', value: 'resistance' });
    state = model.operate(state, { type: 'read' });
    expect(state.reading).toBeNull(); expect(state.feedback).toContain('DC volts');
  });
  it('requires a fresh post-service measurement and an open hood for electrical verification', () => {
    let state = atTask('electrical', 'verify');
    expect(model.advance(state).step).toBe(state.step);
    expect(model.operate({ ...state, hood: false }, { type: 'read' }).reading).toBeNull();
    state = model.operate(state, { type: 'read' });
    expect(state.reading).toMatchObject({ value: 0.08, valid: true });
    expect(model.advance(state).verified).toBe(true);
  });
  it('measures oil in integer milliliters and prevents stale fill evidence', () => {
    let state = atTask('oil', 'refill');
    state = model.operate(state, { type: 'read' });
    expect(state.reading).toMatchObject({ value: 4.1, valid: false });
    state = model.operate(state, { type: 'quantity', delta: 500 });
    state = model.operate(state, { type: 'read' });
    expect(state.reading).toMatchObject({ value: 4.6, valid: true });
    state = model.operate(state, { type: 'quantity', delta: 100 });
    expect(state.instrument.jugMl).toBe(4700); expect(state.reading).toBeNull();
    expect(model.advance(state).step).toBe(state.step);
    state = model.operate(state, { type: 'quantity', delta: 500 });
    expect(state.instrument.jugMl).toBe(4700);
  });
  it('seats the wheel, rejects adjacent or repeated lugs, and retains the lowering interlock', () => {
    let state = atTask('brakes', 'refit');
    expect(model.operate(state, { type: 'lug', index: 0 }).lugs).toEqual([]);
    state = model.operate(state, { type: 'seat-wheel' });
    state = model.operate(state, { type: 'lug', index: 0 });
    expect(model.operate(state, { type: 'lug', index: 1 }).lugs).toEqual([0]);
    expect(model.operate(state, { type: 'lug', index: 0 }).lugs).toEqual([0]);
    expect(model.advance(state).wheelRemoved).toBe(true);
    for (const index of [2, 4, 1, 3]) state = model.operate(state, { type: 'lug', index });
    state = model.advance(state);
    expect(state).toMatchObject({ wheelRemoved: false, torqued: true });
    expect(state.history.at(-1).result).toContain('1 → 3 → 5 → 2 → 4');
  });
  it('cannot operate instruments at the wrong station or without lift support', () => {
    const state = atTask('brakes', 'measure');
    expect(model.operate({ ...state, lift: 'raised' }, { type: 'read' }).reading).toBeNull();
    expect(model.operate({ ...state, station: 'intake' }, { type: 'read' }).reading).toBeNull();
    expect(model.operate({ ...state, tool: 'lamp' }, { type: 'read' }).reading).toBeNull();
  });
});
