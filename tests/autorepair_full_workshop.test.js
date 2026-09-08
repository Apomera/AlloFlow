import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const file = 'stem_lab/stem_tool_autorepair.js';
const source = readFileSync(file, 'utf8');
const lugModel = source.slice(source.indexOf('  var TIRE_LUG_PATTERN ='), source.indexOf('  function buildWheelCornerScene('));
const model = new Function(lugModel + source.slice(source.indexOf('  var SHOP_STATIONS = ['), source.indexOf('  function buildWorkshopScene(')) + '\nreturn { jobs: SHOP_JOBS, initial: arShopInitial, advance: arShopAdvance, normalize: arShopState, operate: arShopOperate, kind: arShopInstrumentKind, ready: arShopEvidenceReady, alignment: arShopAlignment, direct: arShop3DPick, actions: arShop3DActions, token: arShop3DToken, tools: arShop3DTools, explore: arShopBrakeExplore, brakeAccess: arShopBrakeAccess, brakePose: arShopBrakePose };')();
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
