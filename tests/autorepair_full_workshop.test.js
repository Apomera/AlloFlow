import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const file = 'stem_lab/stem_tool_autorepair.js';
const source = readFileSync(file, 'utf8');
const lugModel = source.slice(source.indexOf('  var TIRE_LUG_PATTERN ='), source.indexOf('  function buildWheelCornerScene('));
const model = new Function(lugModel + source.slice(source.indexOf('  var SHOP_STATIONS = ['), source.indexOf('  function buildWorkshopScene(')) + '\nreturn { jobs: SHOP_JOBS, initial: arShopInitial, advance: arShopAdvance, normalize: arShopState, operate: arShopOperate, kind: arShopInstrumentKind, ready: arShopEvidenceReady, alignment: arShopAlignment, direct: arShop3DPick, actions: arShop3DActions, token: arShop3DToken, tools: arShop3DTools, explore: arShopBrakeExplore, brakeAccess: arShopBrakeAccess, brakePose: arShopBrakePose, readiness: arShopReadiness, coach: arShopInstrumentGuide };')();
function step(state, extra = {}) {
  const job = model.jobs.find(j => j.id === state.job), task = job.tasks[state.step];
  let ready = model.normalize({ ...state, station: task.station, tool: task.tool, answer: String(job.answer), ...extra });
  const kind = model.kind(ready);
  if (kind === 'alignment') {
    if (task.id === 'alignment-setup') for (const check of ['tyres', 'targets', 'centered']) if (!ready.alignment[check]) ready = model.operate(ready, { type: 'alignment-check', check });
    if (task.id === 'service') for (const side of ['left', 'right']) {
      ready = model.operate(ready, { type: 'alignment-select', side });
      while (ready.alignment[side] !== 10) ready = model.operate(ready, { type: 'alignment-adjust', delta: ready.alignment[side] > 10 ? -1 : 1 });
    }
  }
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
    expect(host.querySelectorAll('#ar-shop-job option')).toHaveLength(4);
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


describe('Front toe alignment workshop', () => {
  function at(taskId) {
    const job = model.jobs.find(j => j.id === 'alignment');
    let state = model.initial(job.id);
    while (job.tasks[state.step].id !== taskId) state = step(state);
    const task = job.tasks[state.step];
    return model.normalize({ ...state, station: task.station, tool: task.tool, answer: '0.4' });
  }
  it('requires every setup check with the vehicle supported by its tyres', () => {
    let state = at('alignment-setup');
    for (const check of ['tyres', 'targets']) state = model.operate(state, { type: 'alignment-check', check });
    expect(model.advance(state).step).toBe(1);
    expect(model.operate({ ...state, lift: 'locked' }, { type: 'alignment-check', check: 'centered' }).alignment.centered).toBe(false);
    state = model.operate(state, { type: 'alignment-check', check: 'centered' });
    expect(model.advance(state)).toMatchObject({ step: 2, alignmentReady: true });
    expect(model.advance({ ...state, wheelRemoved: true }).step).toBe(1);
  });
  it('captures both baseline angles and prevents adjusting before the baseline', () => {
    let state = at('measure');
    expect(model.operate(state, { type: 'alignment-adjust', delta: -5 }).alignment.left).toBe(30);
    state = model.operate(state, { type: 'read' });
    expect(state.reading).toMatchObject({ left: 0.3, right: 0.1, value: 0.4, valid: true, inSpec: false });
    expect(model.advance(state).history.at(-1).result).toContain('Left 0.30°, right 0.10°, total 0.40°');
  });
  it('rejects a passing total when individual angles and balance are wrong', () => {
    let state = at('service');
    state = { ...state, alignment: { ...state.alignment, left: 30, right: -10 } };
    expect(model.alignment(state)).toMatchObject({ total: 0.2, totalInSpec: true, balanced: false, inSpec: false });
    state = model.operate(state, { type: 'read' });
    expect(state.reading.valid).toBe(false);
    expect(model.advance(state).step).toBe(3);
  });
  it('adjusts the selected wheel, preserves exact hundredths, and invalidates captured evidence', () => {
    let state = at('service');
    for (let i = 0; i < 4; i++) state = model.operate(state, { type: 'alignment-adjust', delta: -5 });
    state = model.operate(state, { type: 'read' });
    expect(state.reading).toMatchObject({ left: 0.1, right: 0.1, value: 0.2, valid: true });
    state = model.operate(state, { type: 'alignment-select', side: 'right' });
    expect(model.ready(state)).toBe(true);
    state = model.operate(state, { type: 'alignment-adjust', delta: -1 });
    expect(state.alignment).toMatchObject({ left: 10, right: 9 });
    expect(state.reading).toBeNull(); expect(model.advance(state).step).toBe(3);
    state = model.operate(state, { type: 'read' });
    expect(model.advance(state)).toMatchObject({ step: 4, serviced: true });
  });
  it('requires a fresh verification and rejects incomplete preparation or changed angles', () => {
    let state = at('verify');
    expect(model.advance(state).step).toBe(4);
    state = model.operate(state, { type: 'read' });
    expect(model.advance(state).verified).toBe(true);
    expect(model.advance({ ...state, alignment: { ...state.alignment, centered: false } }).step).toBe(4);
    expect(model.advance({ ...state, alignment: { ...state.alignment, left: 11 } }).step).toBe(4);
    expect(model.operate(state, { type: 'alignment-adjust', delta: 5 }).alignment.left).toBe(10);
  });
  it('bounds controls and normalizes incomplete persisted alignment state', () => {
    let state = at('service');
    state = { ...state, alignment: { ...state.alignment, left: 40 } };
    expect(model.operate(state, { type: 'alignment-adjust', delta: 5 }).alignment.left).toBe(40);
    expect(model.operate(state, { type: 'alignment-adjust', delta: 2 }).alignment.left).toBe(40);
    expect(model.normalize({ job: 'alignment', alignment: { left: NaN, right: -999, selected: 'rear', tyres: 'true' } }).alignment).toMatchObject({ left: 30, right: -40, selected: 'left', tyres: false });
    expect(model.operate({ ...state, tool: 'lamp' }, { type: 'alignment-adjust', delta: -5 }).alignment.left).toBe(40);
    expect(model.operate({ ...state, station: 'tools' }, { type: 'read' }).reading).toBeNull();
  });
  it.each([{ isDark: false }, { isDark: true }, { isContrast: true }])('keeps alignment controls usable without WebGL in %j', theme => {
    resetStemLab(); loadTool(file, 'autoRepair');
    const html = renderTool('autoRepair', { autoRepair: { view: 'workshop', uh3dStatus: 'failed', shop: at('service') } }, theme);
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.querySelectorAll('[data-ar-alignment-adjust]')).toHaveLength(4);
    expect(host.querySelectorAll('[data-ar-alignment-side]')).toHaveLength(2);
    expect(host.querySelector('[data-ar-alignment-total]').textContent).toContain('+0.40°');
    expect(html).toContain('24×'); expect(html).toContain('3D view unavailable');
  });
});


it('accepts a valid brake-gauge capture persisted before alignment was added', () => {
  const state = model.normalize({ job: 'brakes', step: 7, station: 'brakes', tool: 'gauge', lift: 'locked', wheelRemoved: true, answer: '6',
    reading: { key: JSON.stringify(['brakes', 7, false, { mode: 'dcv', contact: 'posts', load: 'off', surface: 'lining', jugMl: 4100 }, [], false, false]),
      kind: 'gauge', value: 2, unit: 'mm', valid: true, detail: 'Friction lining measured separately from the backing plate.' } });
  expect(model.advance(state)).toMatchObject({ step: 8, measured: true });
  expect(model.advance(state).history.at(-1).result).toContain('Captured: 2 mm.');
});


describe('Direct physical workshop controls', () => {
  function direct(state, id) { return model.direct(state, model.token(state, id)); }
  it('offers three distinct tool cases, including the required equipment, at every task', () => {
    for (const job of model.jobs) for (let i = 0; i < job.tasks.length; i++) {
      const state = model.normalize({ job: job.id, step: i });
      const choices = model.tools(state).map(tool => tool[0]);
      expect(new Set(choices).size).toBe(3); expect(choices).toContain(job.tasks[i].tool);
    }
  });
  it('picks up tools without completing a task and rejects stale tray events', () => {
    const state = model.initial('brakes');
    const picked = direct(state, 'equip-job-card');
    expect(picked).toMatchObject({ tool: 'job-card', station: 'tools', step: 0 });
    const next = direct(picked, 'task');
    expect(next.step).toBe(1);
    expect(model.direct(next, model.token(state, 'task')).step).toBe(1);
    expect(model.direct(next, model.token(state, 'equip-job-card')).tool).toBe('job-card');
    expect(direct(state, 'equip-unknown').step).toBe(0);
  });
  it('retains task equipment and lift interlocks on physical controls', () => {
    let state = model.normalize({ job: 'brakes', step: 2, lift: 'prepared', tool: 'lamp' });
    expect(direct(state, 'task').lift).toBe('prepared');
    state = { ...state, tool: 'lift-controls' };
    expect(direct(state, 'task')).toMatchObject({ step: 3, lift: 'low', station: 'lift' });
    expect(direct({ ...state, lift: 'ground' }, 'task').step).toBe(2);
    expect(direct(model.normalize({ job: 'brakes', step: 6, tool: 'socket', lift: 'raised' }), 'task').wheelRemoved).toBe(false);
  });
  it('operates the hood independently and invalidates a previous capture', () => {
    const state = model.normalize({ job: 'electrical', step: 2, tool: 'meter', hood: true, reading: { value: 1.6 } });
    const closed = direct(state, 'hood');
    expect(closed).toMatchObject({ hood: false, reading: null, step: 2, station: 'engine' });
    expect(direct(closed, 'read').reading).toBeNull();
    expect(direct(closed, 'hood').hood).toBe(true);
  });
  it('sets up and captures a loaded connection measurement through the physical dispatcher', () => {
    let state = model.normalize({ job: 'electrical', step: 2, hood: true, tool: 'meter', answer: '1.4' });
    state = direct(state, 'meter-contact'); state = direct(state, 'meter-load');
    state = direct(state, 'read'); expect(state.reading).toMatchObject({ value: 1.6, valid: true });
    state = direct(state, 'meter-mode'); expect(state.reading).toBeNull();
    expect(direct(state, 'read').reading).toBeNull();
    state = direct(state, 'meter-mode'); state = direct(state, 'read');
    expect(direct(state, 'task')).toMatchObject({ step: 3, measured: true });
  });
  it('cannot configure physical equipment with the wrong tool or insufficient access', () => {
    const state = model.normalize({ job: 'brakes', step: 7, lift: 'raised', wheelRemoved: true, tool: 'gauge' });
    expect(direct(state, 'gauge-surface').instrument.surface).toBe('lining');
    expect(direct({ ...state, lift: 'locked', tool: 'socket' }, 'gauge-surface').instrument.surface).toBe('lining');
  });
  it('changes oil quantity but still requires a fresh capture and correct calculation to refill', () => {
    let state = model.normalize({ job: 'oil', step: 9, tool: 'funnel', plugSecured: true, serviced: true });
    state = direct(state, 'jug-add'); expect(state.instrument.jugMl).toBe(4600);
    state = direct(state, 'read'); expect(direct(state, 'task').refilled).toBe(false);
    state = direct({ ...state, answer: '0.5' }, 'task'); expect(state.refilled).toBe(true);
    expect(direct(state, 'jug-add').instrument.jugMl).toBe(4600);
  });
  it('adjusts the selected alignment side and blocks a stale adjustment after completing service', () => {
    let state = model.normalize({ job: 'alignment', step: 3, measured: true, alignmentReady: true, tool: 'tie-rod', alignment: { left: 10, right: 10, selected: 'right', tyres: true, targets: true, centered: true } });
    state = direct(state, 'toe-plus'); expect(state.alignment).toMatchObject({ left: 10, right: 11 });
    const oldToken = model.token(state, 'toe-minus');
    state = direct(state, 'read'); state = direct(state, 'task'); expect(state.step).toBe(4);
    expect(model.direct(state, oldToken).alignment.right).toBe(11);
  });
  it('retains wheel seating, torque sequence and customer handoff gates', () => {
    let state = model.normalize({ job: 'brakes', step: 9, tool: 'torque', lift: 'locked', wheelRemoved: true, serviced: true });
    state = direct(state, 'seat'); expect(state.wheelSeated).toBe(true);
    expect(direct(state, 'task').wheelRemoved).toBe(true);
    state = model.normalize({ job: 'electrical', step: 5, tool: 'job-card', verified: true });
    expect(direct(state, 'task').released).toBe(false);
  });
  it('renders equivalent direct actions and calculation inputs when WebGL is unavailable', () => {
    resetStemLab(); loadTool(file, 'autoRepair');
    const html = renderTool('autoRepair', { autoRepair: { view: 'workshop', uh3dStatus: 'failed', shop: { job: 'electrical', step: 2, tool: 'meter', hood: true } } });
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.querySelectorAll('[data-ar-scene-tool]')).toHaveLength(3);
    expect(host.querySelector('[data-ar-scene-action="meter-load"]')).not.toBeNull();
    expect(host.querySelector('label[for="ar-shop-scene-answer"]')).not.toBeNull();
    expect(html).toContain('3D view unavailable');
  });
});


describe('Latched workshop lift stop', () => {
  function use(state, action) { return model.direct(state, model.token(state, action)); }
  it('loads older work orders with a released stop and normalizes the bay check', () => {
    expect(model.normalize({ job: 'oil' })).toMatchObject({ liftStopped: false, liftBayClear: false });
    expect(model.normalize({ liftStopped: false, liftBayClear: true }).liftBayClear).toBe(false);
    expect(model.normalize({ liftStopped: 'false', liftBayClear: 1 })).toMatchObject({ liftStopped: false, liftBayClear: false });
  });
  it.each(['ground', 'prepared', 'low', 'checked', 'raised', 'locked'])('latches at %s without changing the vehicle or work evidence', lift => {
    const before = model.normalize({ ...model.initial('brakes'), lift, tool: 'socket', notes: 'Inspection notes remain available.' });
    const stopped = use(before, 'lift-stop');
    expect(stopped).toMatchObject({ liftStopped: true, liftBayClear: false, lift, tool: 'socket', step: 0, notes: before.notes, history: [] });
    expect(before.liftStopped).toBe(false);
    expect(model.normalize(JSON.parse(JSON.stringify(stopped))).liftStopped).toBe(true);
  });
  it.each(['brakes', 'oil'])('blocks every lift movement through direct and task-card actions in %s', jobId => {
    const job = model.jobs.find(j => j.id === jobId);
    for (const task of job.tasks.filter(t => t.tool === 'lift-controls')) {
      const state = model.normalize({ ...model.initial(jobId), ...task.requires, step: job.tasks.indexOf(task), station: task.station, tool: task.tool, liftStopped: true });
      for (const result of [model.advance(state), use(state, 'task')]) {
        expect(result.step, task.id).toBe(state.step);
        expect(result.lift, task.id).toBe(state.lift);
        expect(result.feedback).toContain('Lift stop is latched');
        expect(result.history).toEqual([]);
      }
    }
  });
  it('requires a fresh bay-clear check, and reset never resumes or advances a command', () => {
    let state = model.normalize({ ...model.initial('brakes'), step: 2, station: 'lift', tool: 'lift-controls', lift: 'prepared' });
    state = use(state, 'lift-stop');
    expect(use(state, 'lift-reset')).toMatchObject({ liftStopped: true, lift: 'prepared', step: 2 });
    state = use(state, 'lift-clear');
    expect(state.liftBayClear).toBe(true);
    state = use(state, 'lift-stop');
    expect(state.liftBayClear).toBe(false);
    state = use(state, 'lift-clear');
    state = use(state, 'lift-clear');
    expect(use(state, 'lift-reset').liftStopped).toBe(true);
    state = use(use(state, 'lift-clear'), 'lift-reset');
    expect(state).toMatchObject({ liftStopped: false, liftBayClear: false, lift: 'prepared', step: 2, history: [] });
    expect(use(state, 'task')).toMatchObject({ lift: 'low', step: 3 });
  });
  it('retains equipment, reassembly and mechanical-lock gates after a reset', () => {
    let state = model.normalize({ ...model.initial('brakes'), step: 10, lift: 'locked', wheelRemoved: true, station: 'lift', tool: 'lift-controls' });
    state = use(use(use(state, 'lift-stop'), 'lift-clear'), 'lift-reset');
    expect(model.advance(state)).toMatchObject({ step: 10, lift: 'locked', wheelRemoved: true });
    expect(model.advance({ ...state, wheelRemoved: false, tool: 'lamp' }).step).toBe(10);
    expect(model.advance({ ...state, wheelRemoved: false, lift: 'raised' }).step).toBe(10);
    expect(model.advance({ ...state, wheelRemoved: false })).toMatchObject({ step: 11, lift: 'ground' });
  });
  it('does not treat the stop as mechanical support or invalidate unrelated instrument evidence', () => {
    const unsafe = model.normalize({ ...model.initial('brakes'), step: 6, lift: 'raised', station: 'brakes', tool: 'socket', liftStopped: true });
    expect(model.advance(unsafe).step).toBe(6);
    let meter = model.normalize({ ...model.initial('electrical'), step: 2, hood: true, station: 'engine', tool: 'meter', answer: '1.4', instrument: { mode: 'dcv', contact: 'joint', load: 'starter' } });
    meter = model.operate(meter, { type: 'read' });
    const stopped = use(meter, 'lift-stop');
    expect(model.ready(stopped)).toBe(true);
    expect(model.advance({ ...stopped, station: 'engine' }).step).toBe(3);
    const completed = model.normalize({ ...model.initial('electrical'), step: 6 });
    expect(use(completed, 'lift-stop').liftStopped).toBe(true);
  });
  it('provides the entire stop and reset workflow without WebGL', () => {
    resetStemLab(); loadTool(file, 'autoRepair');
    const html = renderTool('autoRepair', { autoRepair: { view: 'workshop', uh3dStatus: 'failed', shop: { liftStopped: true, lift: 'locked' } } });
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.querySelector('[data-ar-lift-stop-status]').textContent).toContain('commands blocked');
    for (const id of ['lift-stop', 'lift-clear', 'lift-reset']) expect(host.querySelectorAll('[data-ar-scene-action="' + id + '"]')).toHaveLength(1);
    expect(host.querySelector('[data-ar-scene-action="lift-stop"]').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-ar-scene-action="lift-clear"]').getAttribute('aria-pressed')).toBe('false');
    expect(html).toContain('Resetting does not resume a command');
  });
});


describe('Interactive brake parts explorer', () => {
  const exposed = () => model.normalize({ job: 'brakes', step: 7, station: 'brakes', tool: 'gauge', lift: 'locked', wheelRemoved: true, answer: '6' });
  it.each([{ job: 'oil' }, { lift: 'raised' }, { wheelRemoved: false }, { wheelSeated: true }])('requires an exposed brake and mechanical support in %j', patch => {
    const state = model.normalize({ ...exposed(), brakeSpread: 100, ...patch });
    expect(state.brakeSpread).toBe(0);
    expect(model.explore(state, { type: 'spacing', value: 100 }).brakeSpread).toBe(0);
    expect(model.actions(state).some(a => a.explore)).toBe(false);
  });
  it('normalizes older records, invalid selections and bounded spacing', () => {
    expect(model.normalize({ job: 'brakes' })).toMatchObject({ brakeSpread: 0, brakePart: 'rotor' });
    expect(model.normalize({ ...exposed(), brakeSpread: Infinity, brakePart: 'hose' })).toMatchObject({ brakeSpread: 0, brakePart: 'rotor' });
    expect(model.explore(exposed(), { type: 'spacing', value: 999 }).brakeSpread).toBe(100);
    expect(model.explore(exposed(), { type: 'spacing', value: -5 }).brakeSpread).toBe(0);
    expect(model.explore(exposed(), { type: 'spacing', value: NaN }).brakeSpread).toBe(0);
  });
  it('preserves captured evidence, service progress and tool choice while inspecting', () => {
    const measured = model.operate(exposed(), { type: 'read' });
    let state = model.explore(measured, { type: 'spacing', value: 75 });
    for (const id of ['rotor', 'pad', 'caliper']) {
      state = model.explore(state, { type: 'part', id });
      expect(state).toMatchObject({ brakePart: id, brakeSpread: 75, step: 7, tool: 'gauge', serviced: false, answer: '6', history: [] });
      expect(model.ready(state)).toBe(true);
    }
    expect(model.advance(state).step).toBe(8);
    expect(model.explore(state, { type: 'part', id: 'unknown' }).brakePart).toBe('caliper');
    expect(measured.brakeSpread).toBe(0);
  });
  it('shares physical actions, rejects stale picks and restores the assembled view', () => {
    let state = exposed(); const token = model.token(state, 'brake-part-pad');
    state = model.direct(state, model.token(state, 'brake-spread'));
    expect(state.brakeSpread).toBe(100);
    state = model.direct(state, token); expect(state.brakePart).toBe('pad');
    state = model.direct(state, model.token(state, 'brake-join')); expect(state.brakeSpread).toBe(0);
    expect(model.direct({ ...state, step: 8, brakePart: 'rotor' }, token).brakePart).toBe('rotor');
  });
  it('restores assembled geometry when seating the wheel and retains progress after serialization', () => {
    let state = model.normalize({ ...exposed(), step: 9, tool: 'torque', serviced: true, brakeSpread: 100, brakePart: 'pad' });
    expect(model.normalize(JSON.parse(JSON.stringify(state)))).toMatchObject({ brakeSpread: 100, brakePart: 'pad' });
    state = model.normalize(model.operate(state, { type: 'seat-wheel' }));
    expect(state).toMatchObject({ brakeSpread: 0, wheelSeated: true, step: 9 });
    expect(model.actions(state).some(a => a.explore)).toBe(false);
    expect(model.advance(state).step).toBe(9);
  });
  it('keeps the slider, component descriptions and model thickness available without WebGL', () => {
    resetStemLab(); loadTool(file, 'autoRepair');
    const html = renderTool('autoRepair', { autoRepair: { view: 'workshop', uh3dStatus: 'failed', shop: { ...exposed(), brakeSpread: 50, brakePart: 'pad' } } });
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.querySelector('#ar-brake-spacing').getAttribute('aria-valuetext')).toBe('50 percent separated');
    expect(host.querySelector('label[for="ar-brake-spacing"]')).not.toBeNull();
    expect(host.querySelector('[data-ar-brake-part="pad"]').textContent).toContain('Model lining: 2 mm');
    for (const part of ['rotor', 'pad', 'caliper']) expect(host.querySelectorAll('[data-ar-scene-action="brake-part-' + part + '"]')).toHaveLength(1);
  });
});


describe('Brake inspection camera coordinates', () => {
  const state = () => model.normalize({ job: 'brakes', lift: 'locked', wheelRemoved: true });
  it('tracks each selected component across assembled, partial and exploded views', () => {
    for (const spread of [0, 50, 100]) {
      const base = state(), pose = model.brakePose({ ...base, brakeSpread: spread }, 'pad');
      expect(pose.x).toBeCloseTo(-1.15 - 0.7 * spread / 100);
      expect(pose.y).toBeCloseTo(0.44 + 0.2 * spread / 100);
      expect(pose.z).toBeCloseTo(0.815 + 0.62 * spread / 100);
    }
    expect(model.brakePose({ ...state(), brakeSpread: 100 }, 'rotor').z).toBeCloseTo(0.99);
    expect(model.brakePose({ ...state(), brakeSpread: 100 }, 'caliper').z).toBeCloseTo(1.87);
  });
  it('does not point a closed explorer at stale separated coordinates', () => {
    expect(model.brakePose({ ...state(), wheelSeated: true, brakeSpread: 100 }, 'rotor')).toEqual({ x: -1.3, y: 0.4, z: 0.79 });
    expect(model.brakePose({ ...state(), brakeSpread: Infinity }, 'unknown')).toEqual({ x: -1.3, y: 0.4, z: 0.79 });
  });
  it('exposes the selected-part close-up and explains enlarged lining without WebGL', () => {
    resetStemLab(); loadTool(file, 'autoRepair');
    const html = renderTool('autoRepair', { autoRepair: { view: 'workshop', uh3dStatus: 'failed', shop: { ...state(), brakePart: 'pad' } } });
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.querySelector('[data-ar-brake-closeup="pad"]').textContent).toContain('Friction pad');
    expect(host.querySelector('[data-ar-brake-part="pad"]').textContent).toContain('6×');
  });
});


describe('Live workshop task readiness', () => {
  function at(jobId, taskId) {
    let state = model.initial(jobId), job = model.jobs.find(j => j.id === jobId);
    while (job.tasks[state.step].id !== taskId) state = step(state);
    const task = job.tasks[state.step];
    return model.normalize({ ...state, station: task.station, tool: task.tool });
  }
  it.each(model.jobs)('matches completion gates throughout $id without advancing or mutating state', job => {
    let state = model.initial(job.id);
    for (const task of job.tasks) {
      const variants = [state, { ...state, station: 'tools' }, { ...state, tool: 'not-a-tool' },
        { ...state, answer: 'NaN' }, { ...state, liftStopped: true }, { ...state, notes: '' }];
      for (const candidate of variants) {
        const before = JSON.stringify(candidate), guide = model.readiness(candidate), result = model.advance(candidate);
        expect(guide.ready, task.id).toBe(result.step === state.step + 1);
        if (!guide.ready) expect(result.feedback).toBe(guide.message);
        expect(JSON.stringify(candidate)).toBe(before);
      }
      state = step(state, { notes: 'Service completed and the repair verified for the customer.' });
    }
    expect(model.readiness(state)).toMatchObject({ complete: true, ready: false, next: null, checks: [] });
  });
  it('guides equipment before travel and evidence before calculation', () => {
    let state = { ...at('brakes', 'measure'), station: 'tools', tool: 'lamp', answer: '' };
    expect(model.readiness(state).next.id).toBe('tool');
    state.tool = 'gauge'; expect(model.readiness(state).next.id).toBe('station');
    state.station = 'brakes'; expect(model.readiness(state).next.id).toBe('evidence');
    state = model.operate(state, { type: 'read' });
    expect(model.readiness(state).next.id).toBe('calculation');
    state.answer = '6'; expect(model.readiness(state).ready).toBe(true);
    state = model.operate(state, { type: 'configure', field: 'surface', value: 'backing' });
    expect(model.readiness(state).next.id).toBe('evidence');
  });
  it('keeps an emergency stop and unsafe access ahead of equipment guidance', () => {
    const state = { ...at('brakes', 'low-lift'), liftStopped: true, tool: 'lamp' };
    expect(model.readiness(state).next.id).toBe('lift-stop');
    expect(model.readiness({ ...at('brakes', 'wheel-off'), lift: 'raised', tool: 'lamp' }).next.id).toBe('prerequisites');
    // A latched lift does not prohibit a non-movement inspection.
    expect(model.readiness({ ...at('brakes', 'stability'), liftStopped: true }).ready).toBe(true);
  });
  it('reports partial preparation and reassembly while keeping evidence incomplete', () => {
    let setup = at('alignment', 'alignment-setup');
    setup = model.operate(setup, { type: 'alignment-check', check: 'tyres' });
    expect(model.readiness(setup).next).toMatchObject({ id: 'evidence', label: 'Bay preparation · 1/3 checks' });
    let refit = at('brakes', 'refit');
    refit = model.operate(refit, { type: 'seat-wheel' });
    refit = model.operate(refit, { type: 'lug', index: 0 });
    expect(model.readiness(refit).next).toMatchObject({ id: 'evidence', label: 'Wheel seated · 1/5 fasteners checked' });
    for (const index of [2, 4, 1, 3]) refit = model.operate(refit, { type: 'lug', index });
    expect(model.readiness(refit).ready).toBe(true);
  });
  it('distinguishes a missing customer handoff from a completed work order', () => {
    const state = at('electrical', 'release');
    expect(model.readiness(state).next.id).toBe('handoff');
    expect(model.readiness({ ...state, notes: 'Repaired the connection and verified loaded voltage drop.' }).ready).toBe(true);
  });
});

describe('Task guide fallback presentation', () => {
  beforeEach(() => { resetStemLab(); loadTool(file, 'autoRepair'); });
  it.each([{ isDark: false }, { isDark: true }, { isContrast: true }])('offers a labelled checklist without WebGL in %j', theme => {
    const html = renderTool('autoRepair', { autoRepair: { view: 'workshop', uh3dStatus: 'failed', shop: { job: 'brakes', tool: 'lamp' } } }, theme);
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.querySelector('[data-ar-task-guide]').getAttribute('aria-label')).toBe('Live task guide');
    expect(host.querySelector('[data-ar-task-guide-go]').textContent).toBe('Show tool choices');
    expect(host.querySelector('[data-ar-task-check="tool"]').getAttribute('data-ar-check-ready')).toBe('false');
    expect(host.querySelector('[data-ar-task-guide-status]').getAttribute('role')).toBe('status');
  });
});


describe('Workshop instrument coaching', () => {
  function at(job, task) {
    const definition = model.jobs.find(j => j.id === job); let state = model.initial(job);
    while (definition.tasks[state.step].id !== task) state = step(state);
    return model.normalize({ ...state, station: definition.tasks[state.step].station, tool: definition.tasks[state.step].tool });
  }
  it('identifies meter setup in order without operating the instrument', () => {
    let state = at('electrical', 'measure');
    state = model.operate(state, { type: 'configure', field: 'mode', value: 'resistance' });
    const before = JSON.stringify(state);
    expect(model.coach(state)).toMatchObject({ status: 'setup', action: 'meter-mode', capture: 'No current capture' });
    expect(JSON.stringify(state)).toBe(before);
    for (const [field, value, action] of [['mode', 'dcv', 'meter-contact'], ['contact', 'joint', 'meter-load'], ['load', 'starter', 'read']]) {
      state = model.operate(state, { type: 'configure', field, value }); expect(model.coach(state).action).toBe(action);
    }
    state = model.operate(state, { type: 'read' });
    expect(model.coach(state)).toMatchObject({ status: 'captured', capture: '1.6 V', captured: true, action: null });
    expect(state.step).toBe(2); expect(state.measured).toBe(false);
  });
  it('explains an invalid captured value and clears the displayed capture when setup changes', () => {
    let state = at('electrical', 'measure'); state = model.operate(state, { type: 'read' });
    expect(model.coach(state)).toMatchObject({ capture: '12.6 V', captured: false, action: 'meter-contact' });
    state = model.operate(state, { type: 'configure', field: 'contact', value: 'joint' });
    expect(model.coach(state)).toMatchObject({ capture: 'No current capture', action: 'meter-load' });
  });
  it('directs the learner from backing plate to lining and preserves captures during exploration', () => {
    let state = at('brakes', 'measure');
    state = model.operate(state, { type: 'configure', field: 'surface', value: 'backing' });
    state = model.operate(state, { type: 'read' });
    expect(model.coach(state)).toMatchObject({ action: 'gauge-surface', captured: false, capture: '5 mm' });
    state = model.operate(state, { type: 'configure', field: 'surface', value: 'lining' });
    state = model.operate(state, { type: 'read' });
    expect(model.coach(model.explore(state, { type: 'spacing', value: 100 }))).toMatchObject({ captured: true, capture: '2 mm' });
  });
  it.each([[4100, 'jug-add'], [4200, 'jug-fine'], [4500, 'jug-fine'], [4600, 'read'], [4700, 'jug-remove']])('chooses a usable jug control at %i mL', (jugMl, action) => {
    const state = at('oil', 'refill'); state.instrument.jugMl = jugMl;
    expect(model.coach(state).action).toBe(action); expect(state.instrument.jugMl).toBe(jugMl);
  });
  it('fine-fill changes exactly 100 mL, invalidates capture and respects capacity/access gates', () => {
    let state = at('oil', 'refill'); state.instrument.jugMl = 4500;
    const use = s => model.direct(s, model.token(s, 'jug-fine'));
    state = use(state); expect(state.instrument.jugMl).toBe(4600);
    state = model.operate(state, { type: 'read' }); expect(model.coach(state).captured).toBe(true);
    state = use(state); expect(state.instrument.jugMl).toBe(4700); expect(state.reading).toBeNull();
    expect(state.refilled).toBe(false); expect(state.step).toBe(9);
    expect(use({ ...state, instrument: { ...state.instrument, jugMl: 5000 } }).instrument.jugMl).toBe(5000);
    expect(use({ ...state, tool: 'lamp' }).instrument.jugMl).toBe(4700);
    expect(use({ ...state, plugSecured: false }).instrument.jugMl).toBe(4700);
  });
  it('distinguishes alignment preparation, adjustment, capture and blocked verification', () => {
    let setup = at('alignment', 'alignment-setup');
    expect(model.coach(setup)).toMatchObject({ action: 'check-tyres', capture: '' });
    for (const check of ['tyres', 'targets', 'centered']) setup = model.operate(setup, { type: 'alignment-check', check });
    expect(model.coach(setup)).toMatchObject({ status: 'complete', action: null });
    const service = at('alignment', 'service');
    expect(model.coach(service)).toMatchObject({ status: 'adjust', panel: true, action: null });
    const verify = at('alignment', 'verify'); verify.alignment.left = 30;
    expect(model.coach(verify)).toMatchObject({ status: 'blocked', panel: true, action: null });
  });
  it('guides each fastener in the authored sequence and requires the learner to operate it', () => {
    let state = at('brakes', 'refit'); expect(model.coach(state).action).toBe('seat');
    state = model.operate(state, { type: 'seat-wheel' });
    for (const index of [0, 2, 4, 1, 3]) {
      expect(model.coach(state).lug).toBe(index);
      state = model.operate(state, { type: 'lug', index });
    }
    expect(model.coach(state)).toMatchObject({ status: 'complete', action: null, lug: null });
    expect(state.wheelRemoved).toBe(true);
  });
  it('withholds suggested equipment actions until station, tool and access are ready', () => {
    const state = at('electrical', 'measure');
    for (const patch of [{ station: 'tools' }, { tool: 'lamp' }, { hood: false }]) expect(model.coach({ ...state, ...patch })).toMatchObject({ status: 'blocked', action: null });
    expect(model.coach(model.initial('brakes'))).toBeNull();
  });
});


describe('Direct battery probe contacts', () => {
  const use = (state, action) => model.direct(state, model.token(state, action));
  const initial = () => model.normalize({ job: 'electrical', step: 2, station: 'engine', tool: 'meter', hood: true });
  it('places the black probe on a named contact and requires fresh evidence after moving it', () => {
    let state = use(initial(), 'read'); expect(state.reading).toMatchObject({ value: 12.6, valid: false });
    state = use(state, 'meter-joint'); expect(state.instrument.contact).toBe('joint'); expect(state.reading).toBeNull();
    state = use(state, 'meter-load'); state = use(state, 'read'); expect(state.reading).toMatchObject({ value: 1.6, valid: true });
    const captured = state.reading;
    state = use(state, 'meter-joint'); expect(state.reading).toEqual(captured); expect(state.step).toBe(2);
    state = use(state, 'meter-posts'); expect(state.instrument.contact).toBe('posts'); expect(state.reading).toBeNull();
    state = use(state, 'read'); expect(state.reading).toMatchObject({ value: 10.4, valid: false });
  });
  it('preserves both valid and invalid captures when selecting an unchanged contact', () => {
    let state = use(initial(), 'read'); const before = JSON.stringify(state);
    const next = use(state, 'meter-posts'); expect(next.reading).toEqual(state.reading); expect(next.feedback).toContain('unchanged');
    expect(JSON.stringify(state)).toBe(before);
    state = use(use(state, 'meter-joint'), 'read');
    expect(use(state, 'meter-joint').reading).toEqual(state.reading);
  });
  it('keeps contact selection behind equipment, hood and current-task gates', () => {
    const state = initial();
    for (const patch of [{ tool: 'lamp' }, { hood: false }]) expect(use({ ...state, ...patch }, 'meter-joint').instrument.contact).toBe('posts');
    expect(use({ ...state, step: 3, measured: true, tool: 'terminal-kit' }, 'meter-joint').instrument.contact).toBe('posts');
    const current = use(state, 'meter-joint');
    expect(model.direct(current, model.token({ ...state, step: 1 }, 'meter-posts')).instrument.contact).toBe('joint');
    expect(use(state, 'meter-unknown').instrument.contact).toBe('posts');
  });
});
