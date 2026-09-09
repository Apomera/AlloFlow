import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const file = 'stem_lab/stem_tool_autorepair.js';
const source = readFileSync(file, 'utf8');
const lugModel = source.slice(source.indexOf('  var TIRE_LUG_PATTERN ='), source.indexOf('  function buildWheelCornerScene('));
const model = new Function(lugModel + source.slice(source.indexOf('  var SHOP_STATIONS = ['), source.indexOf('  function buildWorkshopScene(')) + '\nreturn { jobs: SHOP_JOBS, initial: arShopInitial, advance: arShopAdvance, normalize: arShopState, operate: arShopOperate, kind: arShopInstrumentKind, ready: arShopEvidenceReady, alignment: arShopAlignment, direct: arShop3DPick, actions: arShop3DActions, token: arShop3DToken, tools: arShop3DTools, explore: arShopBrakeExplore, brakeAccess: arShopBrakeAccess, brakePose: arShopBrakePose, readiness: arShopReadiness, coach: arShopInstrumentGuide, controls: arShopControlCatalog, preview: arShopControlPreview, currentPreview: arShopCurrentPreview, voltageReview: arShopVoltageReview, chooseEvidence: arShopChooseVoltageEvidence, reviewText: arShopVoltageReviewText, handoffGuide: arShopHandoffGuide, practiceBoard: arShopPracticeBoard, selectJob: arShopSelectJob, wheelSequence: arShopWheelSequence, wheelPoint: arShopWheelPoint, liftStatus: arShopLiftStatus };')();
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


describe('Workshop control inspection', () => {
  it.each(model.jobs)('describes available $id controls without operating or mutating them', job => {
    const state = model.initial(job.id), before = JSON.stringify(state), controls = model.controls(state);
    expect(new Set(controls.map(control => control.id)).size).toBe(controls.length);
    for (const control of controls) {
      const preview = model.preview(state, control.id);
      expect(model.currentPreview(state, preview)).toEqual(control);
      expect(control.label).toBeTruthy(); expect(control.detail).toBeTruthy();
    }
    expect(JSON.stringify(state)).toBe(before); expect(state.history).toHaveLength(0);
  });
  it('expires previews when equipment, access, calculations, job or instrument setup changes', () => {
    const state = model.normalize({ job: 'electrical', step: 2, hood: true, tool: 'meter', station: 'engine' });
    const preview = model.preview(state, model.token(state, 'read'));
    for (const patch of [{ tool: 'lamp' }, { hood: false }, { answer: '1.4' }, { step: 3 }, { job: 'oil' }, { station: 'tools' }, { instrument: { ...state.instrument, load: 'starter' } }]) {
      expect(model.currentPreview({ ...state, ...patch }, preview)).toBeNull();
    }
    expect(model.currentPreview(model.normalize(JSON.parse(JSON.stringify(state))), preview).label).toBe('Capture instrument reading');
  });
  it('rejects unknown and old tokens and derives labels from the current catalogue', () => {
    const state = model.initial('brakes');
    expect(model.preview(state, 'unknown')).toBeNull();
    expect(model.preview(state, model.token({ ...state, step: 99 }, 'task'))).toBeNull();
    const preview = model.preview(state, model.token(state, 'hood'));
    expect(model.currentPreview(state, { ...preview, label: 'Injected label', detail: 'Injected detail' }).label).toBe('Open hood');
    expect(model.currentPreview(state, { ...preview, key: '' })).toBeNull();
  });
  it('describes readings without generating evidence or revealing an uncaptured value', () => {
    const state = model.normalize({ job: 'electrical', step: 2, hood: true, tool: 'meter', station: 'engine', instrument: { contact: 'joint', load: 'starter' } });
    const item = model.currentPreview(state, model.preview(state, model.token(state, 'read')));
    expect(item.detail).not.toContain('1.6'); expect(state.reading).toBeNull();
    expect(model.direct(state, item.id).reading).toMatchObject({ value: 1.6, valid: true });
  });
  it('includes accessible fastener and tie-rod targets only in their relevant context', () => {
    const refit = model.normalize({ job: 'brakes', step: 9, tool: 'torque', lift: 'locked', serviced: true, wheelRemoved: true });
    expect(model.controls(refit).filter(control => control.id.startsWith('shop-lug-'))).toHaveLength(0);
    expect(model.controls({ ...refit, wheelSeated: true }).filter(control => control.id.startsWith('shop-lug-'))).toHaveLength(5);
    expect(model.controls(model.initial('alignment')).filter(control => control.id.startsWith('shop-toe-'))).toHaveLength(2);
  });
});

describe('Control inspector fallback rendering', () => {
  beforeEach(() => { resetStemLab(); loadTool(file, 'autoRepair'); });
  it('offers keyboard inspection and explicit use when WebGL is unavailable', () => {
    const shop = model.initial('brakes'), preview = model.preview(shop, model.token(shop, 'hood'));
    const html = renderTool('autoRepair', { autoRepair: { view: 'workshop', shop, shopInteraction: 'inspect', shopInspectPick: preview, uh3dStatus: 'failed' } });
    const host = document.createElement('div'); host.innerHTML = html;
    expect(host.querySelector('label[for="ar-shop-inspect-target"]')).not.toBeNull();
    expect(host.querySelector('[data-ar-control-preview]').textContent).toContain('Open hood');
    expect(host.querySelector('[data-ar-control-use]').textContent).toBe('Use selected control');
    expect(host.querySelector('[data-ar-control-inspector]').textContent).toContain('emergency stop stays immediate');
  });
});


describe('Recorded voltage-drop evidence lesson', () => {
  function completedComparison() { let state = model.initial('electrical'); for (let i = 0; i < 5; i++) state = step(state); return state; }
  it('records comparable before/after snapshots only when the learner completes the tests', () => {
    let state = model.initial('electrical'); state = step(step(state));
    state = model.normalize({ ...state, tool: 'meter', station: 'engine', answer: '1.4', instrument: { contact: 'joint', load: 'starter' } });
    state = model.operate(state, { type: 'read' });
    expect(model.voltageReview(state).before.value).toBeNull();
    state = model.advance(state);
    expect(model.voltageReview(state)).toMatchObject({ before: { value: 1.6 }, after: { value: null }, supported: false });
    state = step(state);
    expect(model.voltageReview(state).after.value).toBeNull();
    state = step(state);
    expect(model.voltageReview(state)).toMatchObject({ before: { value: 1.6 }, after: { value: 0.08 }, paired: true, supported: true });
  });
  it('keeps recorded values and setup independent of live instrument changes', () => {
    const state = completedComparison(), original = JSON.stringify(state);
    const changed = model.normalize({ ...state, instrument: { mode: 'resistance', contact: 'posts', load: 'off' }, reading: { value: 999 } });
    expect(model.voltageReview(changed).before.value).toBe(1.6);
    expect(model.voltageReview(changed).after.value).toBe(0.08);
    expect(JSON.stringify(state)).toBe(original);
    expect(state.history.find(entry => entry.id === 'verify').evidence.setup).not.toBe(state.instrument);
  });
  it('does not invent snapshots from old prose or service-complete flags', () => {
    const state = completedComparison();
    state.history = state.history.map(({ evidence, ...entry }) => entry);
    const review = model.voltageReview(state);
    expect(review.before).toEqual({ value: null, status: 'Older record: no numeric snapshot' });
    expect(review.after.value).toBeNull(); expect(review.supported).toBe(false);
    expect(model.chooseEvidence(state, 'same-test').evidenceChoice).toBe('');
  });
  it.each([{ unit: 'mV' }, { kind: 'gauge' }, { value: Infinity }, { value: -0.08 }, { value: '0.08' }, { setup: { mode: 'dcv', contact: 'posts', load: 'starter' } }, { setup: { mode: 'dcv', contact: 'joint', load: 'off' } }])('rejects incompatible snapshot %j', patch => {
    const state = completedComparison(), verify = state.history.find(entry => entry.id === 'verify');
    verify.evidence = { ...verify.evidence, ...patch };
    expect(model.voltageReview(state).after.value).toBeNull(); expect(model.voltageReview(state).supported).toBe(false);
  });
  it('requires the service between tests and a repeat value strictly below the limit', () => {
    const state = completedComparison();
    state.history.find(entry => entry.id === 'verify').evidence.value = 0.2;
    expect(model.voltageReview(state)).toMatchObject({ paired: true, supported: false });
    state.history.find(entry => entry.id === 'verify').evidence.value = 0.08;
    state.history.reverse(); expect(model.voltageReview(state).paired).toBe(false);
  });
  it('offers specific retry feedback without changing work-order progress or granting completion', () => {
    const state = completedComparison(), original = JSON.stringify(state);
    const wrong = model.chooseEvidence(state, 'looks-clean');
    expect(model.voltageReview(wrong).choice).toMatchObject({ correct: false });
    const right = model.chooseEvidence(wrong, 'same-test');
    expect(model.voltageReview(right).choice.correct).toBe(true);
    expect({ ...right, evidenceChoice: '' }).toEqual(state); expect(JSON.stringify(state)).toBe(original);
    expect(model.chooseEvidence(state, 'unknown').evidenceChoice).toBe('');
    expect(model.voltageReview(model.initial('oil'))).toBeNull();
  });
  it('includes the comparison and chosen reasoning in the downloaded report text', () => {
    const state = model.chooseEvidence(completedComparison(), 'same-test'), text = model.reviewText(state).join(' ');
    expect(text).toContain('Before service: 1.6 V'); expect(text).toContain('After service: 0.08 V'); expect(text).toContain('Optional reasoning check: The same loaded joint test');
    expect(model.reviewText(model.initial('brakes'))).toEqual([]);
  });
});

describe('Voltage lesson accessible rendering', () => {
  beforeEach(() => { resetStemLab(); loadTool(file, 'autoRepair'); });
  it('keeps uncaptured results and reasoning answers hidden', () => {
    const html = renderTool('autoRepair', { autoRepair: { view: 'workshop', shop: model.initial('electrical') } });
    const host = document.createElement('div'); host.innerHTML = html;
    const panel = host.querySelector('[data-ar-voltage-evidence]');
    expect(panel.querySelector('[data-ar-evidence-value="before"]').textContent).toBe('Not recorded yet');
    expect(panel.querySelector('[data-ar-evidence-value="after"]').textContent).toBe('Not recorded yet');
    expect(panel.querySelector('[data-ar-evidence-choice]')).toBeNull();
  });
  it.each([{ isDark: false }, { isDark: true }, { isContrast: true }])('provides text equivalents and labeled choices in %j', theme => {
    let state = model.initial('electrical'); for (let i=0; i<5; i++) state=step(state);
    const host = document.createElement('div'); host.innerHTML = renderTool('autoRepair', { autoRepair: { view: 'workshop', shop: state } }, theme);
    const panel = host.querySelector('[data-ar-voltage-evidence]');
    expect(panel.getAttribute('data-ar-voltage-evidence')).toBe('compared'); expect(panel.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    expect(panel.querySelector('[data-ar-evidence-value="after"]').textContent).toContain('0.08 V');
    expect(panel.querySelectorAll('button[aria-pressed]')).toHaveLength(3); expect(panel.querySelector('legend').textContent).toContain('Optional');
  });
});


describe('Voltage chart numeric robustness', () => {
  beforeEach(() => { resetStemLab(); loadTool(file, 'autoRepair'); });
  it('keeps chart geometry finite when a saved numeric snapshot is exceptionally large', () => {
    let state = model.initial('electrical'); for (let i=0; i<5; i++) state=step(state);
    state.history.find(entry => entry.id === 'verify').evidence.value = 1e308;
    const host = document.createElement('div'); host.innerHTML = renderTool('autoRepair', { autoRepair: { view: 'workshop', shop: state } });
    const panel = host.querySelector('[data-ar-voltage-evidence]');
    expect(panel.getAttribute('data-ar-voltage-evidence')).toBe('pending');
    for (const rect of panel.querySelectorAll('svg rect')) {
      const width = Number(rect.getAttribute('width')); expect(Number.isFinite(width)).toBe(true); expect(width).toBeGreaterThanOrEqual(0); expect(width).toBeLessThanOrEqual(340);
    }
  });
});


describe('Live alignment geometry explanation', () => {
  beforeEach(() => { resetStemLab(); loadTool(file, 'autoRepair'); });
  function render(left, right, options = {}, theme = {}) {
    const host = document.createElement('div');
    host.innerHTML = renderTool('autoRepair', { autoRepair: { view: 'workshop', shop: { job: 'alignment', step: 3, station: 'brakes', tool: 'tie-rod', alignment: { left, right } }, ...options } }, theme);
    return host.querySelector('[data-ar-toe-diagram]');
  }
  it.each([[30,-10,false,true,false], [8,12,true,true,false], [8,8,true,false,true], [10,10,true,true,true], [-40,40,false,false,false]])('explains the three independent checks for %s / %s', (left,right,individual,total,balance) => {
    const panel=render(left,right);
    for(const [id, pass] of [['individual',individual],['total',total],['balance',balance]]) expect(panel.querySelector('[data-ar-toe-check="'+id+'"]').getAttribute('data-ar-toe-pass')).toBe(String(pass));
    expect(panel.querySelector('[data-ar-toe-explanation]').getAttribute('data-ar-toe-explanation')).toBe(individual&&total&&balance?'ready':total?'misleading-total':'outside-total');
  });
  it('shows opposite-signed cancellation and a numeric absolute difference', () => {
    const panel=render(30,-10);
    expect(panel.querySelector('[data-ar-toe-check="total"]').textContent).toContain('+0.30° + (-0.10°) = +0.20°');
    expect(panel.querySelector('[data-ar-toe-check="balance"]').textContent).toContain('= 0.40°');
    expect(panel.querySelector('[data-ar-toe-explanation]').textContent).toContain('total passes, but the pair does not');
  });
  it.each([{isDark:false},{isDark:true},{isContrast:true}])('renders labeled geometry and an optional target without WebGL in %j', theme => {
    const panel=render(30,-10,{shopToeTargets:true,uh3dStatus:'failed'},theme);
    expect(panel.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    expect(panel.querySelector('[data-ar-toe-overlay]').getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelectorAll('[data-ar-toe-target]')).toHaveLength(2);
    expect(Number(panel.querySelector('[data-ar-toe-wheel="left"]').getAttribute('transform').match(/rotate\(([^ ]+)/)[1])).toBeCloseTo(7.2);
    expect(Number(panel.querySelector('[data-ar-toe-wheel="right"]').getAttribute('transform').match(/rotate\(([^ ]+)/)[1])).toBeCloseTo(2.4);
    expect(panel.textContent).toContain('24×'); expect(panel.textContent).toContain('+0.10° target on each side');
    for(const line of panel.querySelectorAll('svg line')) expect(line.getAttribute('stroke')).toMatch(/^#/);
  });
  it('starts with the overlay hidden and never labels live angles as recorded evidence', () => {
    const panel=render(10,10);
    expect(panel.querySelector('[data-ar-toe-overlay]').getAttribute('aria-pressed')).toBe('false');
    expect(panel.querySelectorAll('[data-ar-toe-target]')).toHaveLength(0);
    expect(panel.querySelector('[data-ar-toe-explanation]').textContent).toContain('Capture a fresh measurement');
  });
});


describe('Graduated oil jug lesson', () => {
  beforeEach(() => { resetStemLab(); loadTool(file, 'autoRepair'); });
  function render(ml, prefs = {}, theme = {}) {
    const host=document.createElement('div');
    host.innerHTML=renderTool('autoRepair',{autoRepair:{view:'workshop',shop:{job:'oil',step:9,station:'engine',tool:'funnel',instrument:{jugMl:ml}},...prefs}},theme);
    return host.querySelector('[data-ar-jug-lesson]');
  }
  it.each([[0,'under',0],[4100,'under',164],[4600,'ready',184],[4700,'over',188],[5000,'over',200]])('shows honest volume and target status at %s mL', (ml,status,height) => {
    const panel=render(ml); expect(panel.getAttribute('data-ar-jug-lesson')).toBe(status);
    const fluid=panel.querySelector('[data-ar-jug-fluid]');expect(Number(fluid.getAttribute('height'))).toBe(height);
    expect(Number(fluid.getAttribute('y'))+height).toBe(250);
    expect(panel.querySelector('[data-ar-jug-target]').getAttribute('y1')).toBe('66');
  });
  it.each([{isDark:false},{isDark:true},{isContrast:true}])('keeps units and text equivalents readable without WebGL in %j',theme=>{
    const panel=render(4100,{shopJugUnits:'mL',uh3dStatus:'failed'},theme);
    expect(panel.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    expect(panel.querySelector('[data-ar-jug-units="mL"]').getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('[data-ar-jug-scale]').textContent).toContain('Each small division = 100 mL');
    expect(panel.textContent).toContain('4600 mL target');expect(panel.textContent).toContain('5000 mL');
  });
  it('starts with working hidden and provides decimal conversion when requested',()=>{
    expect(render(4100).querySelector('[data-ar-jug-working]')).toBeNull();
    const panel=render(4100,{shopJugWorking:true});
    expect(panel.querySelector('[data-ar-jug-working]').textContent).toContain('4600 − 4100 = 500 mL (0.5 L)');
    expect(panel.querySelector('[data-ar-jug-working]').textContent).toContain('5 changes of 100 mL');
    expect(panel.querySelector('[data-ar-jug-scale]').textContent).toContain('0.1 L');
  });
  it('explains overfill as removal and distinguishes prepared oil from transferred oil',()=>{
    expect(render(4700,{shopJugWorking:true}).textContent).toContain('Remove 100 mL = 0.1 L');
    const panel=render(4600,{shopJugWorking:true});expect(panel.textContent).toContain('has not yet been transferred');
    expect(panel.querySelector('[data-ar-jug-status]').textContent).toContain('Capture a fresh reading');
  });
  it.each([-900, Infinity, 9000])('keeps normalized diagram geometry bounded for saved quantity %s',ml=>{
    const fluid=render(ml).querySelector('[data-ar-jug-fluid]');
    expect(Number(fluid.getAttribute('height'))).toBeGreaterThanOrEqual(0);expect(Number(fluid.getAttribute('height'))).toBeLessThanOrEqual(200);
  });
});


describe('Explicit brake-layer measurement', () => {
  const ready=()=>model.normalize({job:'brakes',step:7,station:'brakes',tool:'gauge',lift:'locked',wheelRemoved:true});
  const place=(state,surface)=>model.direct(state,model.token(state,'gauge-'+surface));
  it('places each layer deliberately, preserves same-layer capture and clears a changed setup',()=>{
    let state=model.operate(ready(),{type:'read'});const reading=state.reading;
    state=place(state,'lining');expect(state.reading).toEqual(reading);expect(state.step).toBe(7);
    state=place({...state,brakePart:'rotor'},'backing');expect(state.instrument.surface).toBe('backing');expect(state.reading).toBeNull();expect(state.brakePart).toBe('pad');
    state=model.operate(state,{type:'read'});expect(state.reading).toMatchObject({value:5,valid:false});
    const wrong=state.reading;expect(place(state,'backing').reading).toEqual(wrong);
    expect(model.advance({...state,answer:'6'}).step).toBe(7);
    state=place(state,'lining');state=model.operate(state,{type:'read'});expect(model.advance({...state,answer:'6'}).step).toBe(8);
  });
  it.each([{tool:'lamp'},{lift:'raised'},{wheelRemoved:false}])('keeps direct placement behind equipment and access gates for %j',patch=>{
    const state=model.normalize({...ready(),...patch});expect(place(state,'backing').instrument.surface).toBe('lining');
  });
  it('rejects stale layer picks after a task change and keeps inspection non-operating',()=>{
    const state=ready(),token=model.token(state,'gauge-backing');
    expect(model.preview(state,token)).not.toBeNull();expect(state.instrument.surface).toBe('lining');
    const after=step(state);expect(model.direct(after,token).instrument.surface).toBe('lining');
  });
});

describe('Brake layer cross-section and recorded limit comparison',()=>{
  beforeEach(()=>{resetStemLab();loadTool(file,'autoRepair');});
  function render({surface='lining',capture=false,serviced=false,theme={},patch={}}={}){
    let state=model.normalize({job:'brakes',step:7,station:'brakes',tool:'gauge',lift:'locked',wheelRemoved:true,serviced,instrument:{surface}});
    if(capture)state=model.operate(state,{type:'read'});state={...state,...patch};
    const host=document.createElement('div');host.innerHTML=renderTool('autoRepair',{autoRepair:{view:'workshop',uh3dStatus:'failed',shop:state}},theme);return host.querySelector('[data-ar-brake-measurement]');
  }
  it('withholds the numeric limit chart before a current capture',()=>{
    const panel=render();expect(panel.getAttribute('data-ar-brake-measurement')).toBe('pending');expect(panel.querySelector('[data-ar-brake-limit-review]')).toBeNull();
    expect(panel.textContent).toContain('not a recorded measurement');
  });
  it('does not treat a thick steel reading as passing wear evidence',()=>{
    const panel=render({surface:'backing',capture:true});expect(panel.getAttribute('data-ar-brake-measurement')).toBe('wrong-layer');
    expect(panel.textContent).toContain('5 mm reading measures steel support');expect(panel.querySelector('[data-ar-brake-limit-review]')).toBeNull();
  });
  it.each([{isDark:false},{isDark:true},{isContrast:true}])('explains captured lining and keeps labeled fallbacks in %j',theme=>{
    const panel=render({capture:true,theme});expect(panel.getAttribute('data-ar-brake-measurement')).toBe('lining');
    expect(panel.textContent).toContain('below this job’s 3 mm replacement limit');expect(panel.textContent).toContain('Captured lining: 2 mm');
    expect(panel.querySelector('[data-ar-gauge-span]').getAttribute('data-ar-gauge-span')).toBe('lining');
    expect(panel.querySelectorAll('button[data-ar-gauge-layer]')).toHaveLength(2);
    for(const svg of panel.querySelectorAll('svg'))expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
  it('does not claim complete repair verification from an above-limit lining measurement',()=>{
    const panel=render({capture:true,serviced:true,theme:{isContrast:true}});expect(panel.textContent).toContain('Captured lining: 8 mm');expect(panel.textContent).toContain('Thickness alone does not verify');
  });
  it('hides a capture whose setup key is stale',()=>{
    const state=model.normalize({job:'brakes',step:7,station:'brakes',tool:'gauge',lift:'locked',wheelRemoved:true});
    const capture=model.operate(state,{type:'read'}).reading;
    expect(render({surface:'backing',patch:{reading:capture}}).getAttribute('data-ar-brake-measurement')).toBe('pending');
  });
});


describe('Evidence-based handoff writing guide',()=>{
  it.each(model.jobs)('uses only completed records for $id and never changes the draft',job=>{
    let state=model.initial(job.id);state.notes='My own unfinished draft';
    expect(model.handoffGuide(state).every(group=>group.status==='pending')).toBe(true);
    while(job.tasks[state.step].id!=='release')state=step(state);
    const original=JSON.stringify(state),guide=model.handoffGuide(state);
    expect(guide.map(group=>group.id)).toEqual(['finding','service','verification']);
    expect(guide.every(group=>group.status==='recorded')).toBe(true);
    expect(guide.every(group=>group.prompt.length>20)).toBe(true);
    expect(JSON.stringify(state)).toBe(original);expect(state.notes).toBe('My own unfinished draft');
  });
  it('does not infer evidence from flags, a live capture or an ahead-of-step record',()=>{
    let state=model.normalize({job:'electrical',step:2,station:'engine',tool:'meter',hood:true,serviced:true,verified:true,instrument:{contact:'joint',load:'starter'}});
    state=model.operate(state,{type:'read'});
    state.history=[{id:'measure',result:'An ahead-of-step entry'},{id:'verify',result:'Not completed'}];
    expect(model.handoffGuide(state).every(group=>group.status==='pending')).toBe(true);
  });
  it('shows partial oil service and retains exact older record text without numeric invention',()=>{
    let state=model.initial('oil');for(let i=0;i<7;i++)state=step(state);
    const service=model.handoffGuide(state)[1];expect(service).toMatchObject({recorded:1,total:3,status:'partial'});
    state.history=state.history.map(({evidence,...entry})=>entry);
    const guide=model.handoffGuide(state);expect(guide[1].entries[0].result).toBe(state.history.find(e=>e.id==='drain').result);
    expect(guide[2].entries[0]).toMatchObject({recorded:false,result:''});
  });
  it('ignores unknown, empty and malformed records and uses canonical task labels',()=>{
    const state=model.normalize({job:'electrical',step:5,history:[null,{id:'unknown',result:'unrelated'},{id:'measure',label:'misleading label',result:'Recorded baseline'},{id:'service',result:5},{id:'verify',result:'   '}]});
    const guide=model.handoffGuide(state);expect(guide[0].entries[0]).toMatchObject({recorded:true,label:'Compare voltage-drop evidence',result:'Recorded baseline'});
    expect(guide[1].status).toBe('pending');expect(guide[2].status).toBe('pending');
  });
});

describe('Handoff guide accessible rendering',()=>{
  beforeEach(()=>{resetStemLab();loadTool(file,'autoRepair');});
  function render(prefs={},theme={}){const host=document.createElement('div');host.innerHTML=renderTool('autoRepair',{autoRepair:{view:'workshop',shop:model.initial('electrical'),...prefs}},theme);return host;}
  it('starts collapsed and keeps the original notes field available',()=>{
    const host=render();expect(host.querySelector('[data-ar-handoff-guide]').getAttribute('data-ar-handoff-guide')).toBe('closed');
    expect(host.querySelectorAll('[data-ar-handoff-group]')).toHaveLength(0);expect(host.querySelector('#ar-shop-notes')).not.toBeNull();
    expect(host.querySelector('#ar-shop-notes').hasAttribute('aria-describedby')).toBe(false);
  });
  it.each([{isDark:false},{isDark:true},{isContrast:true}])('shows missing records and linked writing prompts in %j',theme=>{
    const host=render({shopHandoffHelp:true,shopHandoffFocus:'verification'},theme);
    expect(host.querySelectorAll('[data-ar-handoff-group]')).toHaveLength(3);expect(host.querySelectorAll('[data-ar-handoff-write]')).toHaveLength(3);
    expect(host.querySelector('#ar-handoff-writing-prompt').textContent).toContain('repeat test compare under the same conditions');
    expect(host.querySelector('#ar-shop-notes').getAttribute('aria-describedby')).toBe('ar-handoff-writing-prompt');
    expect(host.querySelector('[data-ar-handoff-group="verification"]').textContent).toContain('Not recorded yet');
  });
  it('escapes record markup and does not replace the saved customer explanation',()=>{
    const shop=model.normalize({job:'electrical',step:3,notes:'Keep my words',history:[{id:'measure',label:'Baseline',result:'<img src=x onerror=alert(1)>'}]});
    const host=render({shop,shopHandoffHelp:true});const panel=host.querySelector('[data-ar-handoff-guide]');
    expect(panel.querySelector('img')).toBeNull();expect(panel.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(host.querySelector('#ar-shop-notes').value).toBe('Keep my words');
  });
});


describe('Workshop practice overview and resume',()=>{
  it('shows all four skills without claiming proficiency or completion for a fresh learner',()=>{
    const cards=model.practiceBoard(model.initial('brakes'),{});
    expect(cards.map(c=>c.id)).toEqual(['brakes','oil','electrical','alignment']);
    expect(cards.every(c=>c.status==='not-started'&&c.completed===0&&c.skills.length>20&&c.next.length>10)).toBe(true);
    expect(cards.filter(c=>c.current).map(c=>c.id)).toEqual(['brakes']);
  });
  it.each(model.jobs)('shows truthful completion and next-step progress for $id',job=>{
    let state=model.initial(job.id);state=step(state);
    expect(model.practiceBoard(state,{})[model.jobs.indexOf(job)]).toMatchObject({status:'in-progress',completed:1,next:job.tasks[1].label});
    while(state.step<job.tasks.length)state=step(state,{notes:'Found the condition, completed service and verified the authored checks.'});
    expect(model.practiceBoard(state,{})[model.jobs.indexOf(job)]).toMatchObject({status:'complete',completed:job.tasks.length});
    expect(model.practiceBoard({...state,verified:false},{})[model.jobs.indexOf(job)].status).toBe('review');
    expect(model.practiceBoard({...state,released:'true'},{})[model.jobs.indexOf(job)].status).toBe('review');
  });
  it('prefers the active state over a stale saved copy and does not mutate either input',()=>{
    const current=model.normalize({job:'brakes',step:7,notes:'Keep this draft'}),records={brakes:model.initial('brakes'),oil:{...model.initial('oil'),step:3}};
    const original=JSON.stringify({current,records});const cards=model.practiceBoard(current,records);
    expect(cards[0].completed).toBe(7);expect(cards[1].completed).toBe(3);expect(JSON.stringify({current,records})).toBe(original);
  });
  it('round-trips captured measurement, tool, position, answer and notes through another job',()=>{
    let brake=model.normalize({job:'brakes',step:7,station:'brakes',tool:'gauge',lift:'locked',wheelRemoved:true,answer:'6',notes:'My brake draft'});
    brake=model.operate(brake,{type:'read'});const oil=model.normalize({job:'oil',step:9,notes:'Oil draft',instrument:{jugMl:4500}}),records={oil};
    const next=model.selectJob(brake,records,'oil');expect(next.shop).toEqual(oil);expect(next.shopRecords.brakes).toEqual(brake);
    const back=model.selectJob(next.shop,next.shopRecords,'brakes');expect(back.shop).toEqual(brake);expect(model.ready(back.shop)).toBe(true);
    expect(records).toEqual({oil});
  });
  it('keeps same-job selection intact and rejects unknown targets',()=>{
    const state=model.normalize({job:'alignment',step:3,alignment:{left:11,right:10},notes:'My alignment draft'});
    expect(model.selectJob(state,{},'alignment').shop).toEqual(state);expect(model.selectJob(state,{},'unknown')).toBeNull();
  });
  it('does not open a mismatched job stored under another key, but accepts legacy records without a job ID',()=>{
    const state=model.initial('brakes'),wrong={oil:{...model.initial('electrical'),step:5,notes:'Electrical only'}};
    expect(model.selectJob(state,wrong,'oil').shop).toEqual(model.initial('oil'));expect(wrong.oil.notes).toBe('Electrical only');
    expect(model.selectJob(state,{oil:{step:3,notes:'Older oil draft'}},'oil').shop).toMatchObject({job:'oil',step:3,notes:'Older oil draft'});
    expect(model.selectJob(state,{oil:[]},'oil').shop).toEqual(model.initial('oil'));
  });
});

describe('Practice board accessible rendering',()=>{
  beforeEach(()=>{resetStemLab();loadTool(file,'autoRepair');});
  it('starts compact and leaves the normal job chooser available',()=>{
    const host=document.createElement('div');host.innerHTML=renderTool('autoRepair',{autoRepair:{view:'workshop'}});
    expect(host.querySelector('[data-ar-practice-board]').getAttribute('data-ar-practice-board')).toBe('closed');
    expect(host.querySelectorAll('[data-ar-practice-job]')).toHaveLength(0);expect(host.querySelector('#ar-shop-job')).not.toBeNull();
  });
  it.each([{isDark:false},{isDark:true},{isContrast:true}])('shows labels, progress and keyboard resume controls in %j',theme=>{
    const host=document.createElement('div');host.innerHTML=renderTool('autoRepair',{autoRepair:{view:'workshop',shopPracticeBoard:true,shop:{job:'oil',step:9}}},theme);
    const board=host.querySelector('[data-ar-practice-board]');expect(board.querySelectorAll('[data-ar-practice-job]')).toHaveLength(4);
    expect(board.querySelectorAll('progress[aria-label]')).toHaveLength(4);expect(board.querySelectorAll('button[data-ar-practice-open][aria-label]')).toHaveLength(4);
    expect(board.querySelector('[data-ar-practice-job="oil"]').textContent).toContain('Current job');
    expect(board.querySelector('[data-ar-practice-job="oil"]').textContent).toContain('9/12');expect(board.textContent).toContain('not a proficiency score');
  });
});


describe('Live wheel sequence guidance',()=>{
  const initial=()=>model.normalize({job:'brakes',step:9,station:'brakes',tool:'torque',lift:'locked',wheelRemoved:true,serviced:true});
  it('does not propose a fastener before the wheel is seated',()=>{
    expect(model.wheelSequence(initial())).toMatchObject({seated:false,count:0,last:null,next:null});
    expect(model.wheelSequence(initial()).steps.every(step=>step.status==='pending')).toBe(true);
  });
  it('follows each accepted check and never adds a final return-to-first move',()=>{
    let state=model.operate(initial(),{type:'seat-wheel'});const order=[0,2,4,1,3];
    for(let i=0;i<5;i++){
      const guide=model.wheelSequence(state),original=JSON.stringify(state);
      expect(guide).toMatchObject({count:i,last:i?order[i-1]:null,next:order[i]});expect(guide.steps.filter(s=>s.status==='next').map(s=>s.index)).toEqual([order[i]]);
      expect(JSON.stringify(state)).toBe(original);state=model.operate(state,{type:'lug',index:order[i]});
    }
    expect(model.wheelSequence(state)).toMatchObject({count:5,last:3,next:null});expect(model.wheelSequence(state).steps.every(s=>s.status==='checked')).toBe(true);
    expect(state.step).toBe(9);
  });
  it('keeps the route unchanged for repeated and out-of-order clicks',()=>{
    let state=model.operate(initial(),{type:'seat-wheel'});state=model.operate(state,{type:'lug',index:0});const guide=model.wheelSequence(state);
    for(const index of [0,1,3,4])expect(model.wheelSequence(model.operate(state,{type:'lug',index}))).toEqual(guide);
  });
  it.each([{lugs:[0,0]},{lugs:[2]},{lugs:[0,2,1]},{lugs:[0,2,4,1,1]}])('does not invent guidance for invalid saved order %j',({lugs})=>{
    expect(model.wheelSequence({...initial(),wheelSeated:true,lugs})).toMatchObject({valid:false,count:0,next:null,last:null});
  });
  it('lays out five clockwise fasteners on the same radius',()=>{
    for(let i=0;i<5;i++){const p=model.wheelPoint(i);expect(Math.hypot(p.x-115,p.y-115)).toBeCloseTo(86);}
    expect(model.wheelPoint(0)).toEqual({x:115,y:29});expect(model.wheelPoint(1).x).toBeGreaterThan(115);expect(model.wheelPoint(4).x).toBeLessThan(115);
  });
});

describe('Responsive wheel path rendering',()=>{
  beforeEach(()=>{resetStemLab();loadTool(file,'autoRepair');});
  function render(lugs=[],wheelSeated=true,theme={}){const host=document.createElement('div');host.innerHTML=renderTool('autoRepair',{autoRepair:{view:'workshop',shop:{job:'brakes',step:9,station:'brakes',tool:'torque',lift:'locked',wheelRemoved:true,serviced:true,wheelSeated,lugs}}},theme);return host;}
  it.each([{isDark:false},{isDark:true},{isContrast:true}])('provides next-move and text sequence equivalents in %j',theme=>{
    const host=render([0,2],true,theme);expect(host.querySelectorAll('[data-ar-wheel-path="checked"]')).toHaveLength(1);expect(host.querySelectorAll('[data-ar-wheel-path="next"]')).toHaveLength(1);
    expect(host.querySelector('[data-ar-wheel-move]').textContent).toContain('3 → 5');expect(host.querySelector('[data-ar-wheel-step="4"]').getAttribute('aria-current')).toBe('step');
    expect(host.querySelectorAll('[data-ar-wheel-step]')).toHaveLength(5);expect(['1','1 / 1']).toContain(host.querySelector('[data-ar-wheel-diagram]').style.aspectRatio);
  });
  it('withholds paths before seating and shows no next arrow after five checks',()=>{
    expect(render([],false).querySelectorAll('[data-ar-wheel-path]')).toHaveLength(0);
    const host=render([0,2,4,1,3]);expect(host.querySelectorAll('[data-ar-wheel-path="next"]')).toHaveLength(0);expect(host.querySelectorAll('[data-ar-wheel-path="checked"]')).toHaveLength(4);
    expect(host.querySelector('[data-ar-wheel-move]').textContent).toContain('Complete the reassembly task');
  });
});


describe('Live lift support state',()=>{
  it.each([['ground',0,false],['prepared',0,false],['low',0.18,false],['checked',0.18,false],['raised',1.68,false],['locked',1.58,true]])('describes %s without changing the lift', (lift,height,locked)=>{
    const state=model.normalize({job:'brakes',lift}),before=JSON.stringify(state);
    expect(model.liftStatus(state)).toMatchObject({state:lift,height,locked,motionStopped:false,applicable:true});expect(JSON.stringify(state)).toBe(before);
  });
  it('distinguishes equal-height preparation states and raised-versus-supported states',()=>{
    expect(model.liftStatus({job:'brakes',lift:'low'}).label).toContain('needed');
    expect(model.liftStatus({job:'brakes',lift:'checked'}).label).toContain('checked');
    expect(model.liftStatus({job:'brakes',lift:'raised'}).explanation).toContain('Height alone');
    expect(model.liftStatus({job:'brakes',lift:'locked'}).height).toBeLessThan(model.liftStatus({job:'brakes',lift:'raised'}).height);
  });
  it.each(['raised','locked'])('keeps the %s support state independent of the latched stop',lift=>{
    const status=model.liftStatus({job:'oil',lift,liftStopped:true});expect(status.motionStopped).toBe(true);expect(status.locked).toBe(lift==='locked');
    expect(model.liftStatus({job:'oil',lift,liftStopped:false}).height).toBe(status.height);
  });
  it('limits lift teaching to lift jobs and normalizes unknown positions',()=>{
    expect(model.liftStatus({job:'electrical'}).applicable).toBe(false);expect(model.liftStatus({job:'alignment'}).applicable).toBe(false);
    expect(model.liftStatus({job:'oil',lift:'flying'})).toMatchObject({state:'ground',height:0});
  });
});

describe('Lift support lesson rendering',()=>{
  beforeEach(()=>{resetStemLab();loadTool(file,'autoRepair');});
  function render(lift='raised',prefs={},theme={}){const host=document.createElement('div');host.innerHTML=renderTool('autoRepair',{autoRepair:{view:'workshop',shop:{job:'brakes',step:5,station:'lift',tool:'lift-controls',lift},...prefs}},theme);return host;}
  it('shows current state and starts with comparison examples hidden',()=>{
    const panel=render().querySelector('[data-ar-lift-support]');expect(panel.getAttribute('data-ar-lift-support')).toBe('raised');
    expect(panel.querySelector('[data-ar-lift-support-label]').textContent).toContain('locks not set');expect(panel.querySelectorAll('[data-ar-lift-example]')).toHaveLength(0);
  });
  it.each([{isDark:false},{isDark:true},{isContrast:true}])('labels comparison examples without presenting them as the live state in %j',theme=>{
    const panel=render('low',{shopLiftCompare:true},theme).querySelector('[data-ar-lift-support]');
    expect(panel.getAttribute('data-ar-lift-support')).toBe('low');expect(panel.querySelectorAll('[data-ar-lift-example]')).toHaveLength(2);
    expect(panel.textContent).toContain('Examples only');expect(panel.textContent).toContain('does not move the lift');
    expect(panel.querySelector('[data-ar-lift-compare]').getAttribute('aria-expanded')).toBe('true');
    for(const svg of panel.querySelectorAll('svg'))expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
  it('explains a stopped but locked vehicle without claiming that resetting moves it',()=>{
    const host=render('locked',{shop:{job:'brakes',step:6,lift:'locked',liftStopped:true}}),panel=host.querySelector('[data-ar-lift-support]');
    expect(panel.textContent).toContain('Current: Supported on mechanical locks');expect(panel.querySelector('[data-ar-lift-motion]').textContent).toContain('support state shown above has not changed');
  });
});


describe('Workshop section shortcuts',()=>{
  beforeEach(()=>{resetStemLab();loadTool(file,'autoRepair');});
  it.each([{isDark:false},{isDark:true},{isContrast:true}])('offers named navigation and programmatic focus targets in %j',theme=>{
    const host=document.createElement('div');host.innerHTML=renderTool('autoRepair',{autoRepair:{view:'workshop',shop:{job:'oil',step:9}}},theme);
    const nav=host.querySelector('[data-ar-workshop-shortcuts]');expect(nav.getAttribute('aria-label')).toBe('Workshop section shortcuts');
    expect([...nav.querySelectorAll('button')].map(b=>b.getAttribute('data-ar-workshop-jump'))).toEqual(['bay','equipment','order','notes']);
    expect(nav.querySelectorAll('button[aria-label]')).toHaveLength(4);
    expect(host.querySelector('#ar-shop-bay').getAttribute('tabindex')).toBe('-1');expect(host.querySelector('[data-ar-shop-instrument]').getAttribute('tabindex')).toBe('-1');
    expect(host.querySelector('#ar-shop-work-order').getAttribute('tabindex')).toBe('-1');expect(host.querySelector('#ar-shop-notes')).not.toBeNull();
  });
  it.each([{job:'brakes',step:0},{job:'electrical',step:6,released:true,verified:true}])('retains section links when no instrument exists in %j',shop=>{
    const host=document.createElement('div');host.innerHTML=renderTool('autoRepair',{autoRepair:{view:'workshop',shop}});
    expect(host.querySelector('[data-ar-shop-instrument]')).toBeNull();expect(host.querySelector('[data-ar-workshop-jump="equipment"]')).not.toBeNull();
    expect(host.querySelector('#ar-shop-work-order')).not.toBeNull();
  });
});
