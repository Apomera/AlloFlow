import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const file = 'stem_lab/stem_tool_autorepair.js';
const source = readFileSync(file, 'utf8');
const model = new Function(source.slice(source.indexOf('  var SHOP_STATIONS = ['), source.indexOf('  function buildWorkshopScene(')) + '\nreturn { jobs: SHOP_JOBS, initial: arShopInitial, advance: arShopAdvance, normalize: arShopState };')();
function step(state, extra = {}) {
  const job = model.jobs.find(j => j.id === state.job), task = job.tasks[state.step];
  return model.advance({ ...state, station: task.station, tool: task.tool, answer: String(job.answer), ...extra });
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

