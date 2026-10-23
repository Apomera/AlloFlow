import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, externalPatch, replayResults, errors, awardXP, celebrate;
const hooks = () => window.__testHooks.flightSim;
const clone = value => JSON.parse(JSON.stringify(value));
const evidence = number => [{ trialNumber: number, airspeed: 130, altitude: 5000, aoa: 8 },
  { trialNumber: number + 1, airspeed: 130, altitude: 5000, aoa: 20 }, { trialNumber: number + 2, airspeed: 80, altitude: 5000, aoa: 20 }];
const practice = () => ({ status: 'ended', sawStall: true, recovered: false, recoverySeconds: 0, samples: [
  { time: 0, airspeed: 130, altitude: 5000, aoa: 8 }, { time: 1, airspeed: 125, altitude: 4980, aoa: 20 },
  { time: 2, airspeed: 120, altitude: 4960, aoa: 8 },
] });
const inquiry = (owner = 'A', patch = {}) => api.stallInvestigationRecord({ phase: 'experiment',
  prediction: 'angle', hypothesis: owner + ' revised idea',
  startingIdea: { version: 1, status: 'committed', prediction: 'speed', hypothesis: owner + ' original before trials' },
  airspeed: owner === 'A' ? 130 : 185, altitude: owner === 'A' ? 5000 : 9000, aoa: owner === 'A' ? 8 : 12,
  observations: evidence(owner === 'A' ? 41 : 171), explanation: owner + ' explanation',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 2, completedAt: '2026-10-22T12:00:00.000Z',
  flight: practice(), ...patch });
const history = owner => [inquiry(owner + ' earlier one', { phase: 'review' }), inquiry(owner + ' earlier two', { phase: 'review' })];
const current = () => latest.stallInvestigation;
function button(label) {
  const node = [...host.querySelectorAll('button')].find(item => item.textContent === label);
  expect(node, 'Button: ' + label).toBeTruthy(); return node;
}
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy();
  const key = Object.keys(node).find(value => value.startsWith('__reactProps$'));
  expect(key).toBeTruthy(); return node[key][name];
}
const event = value => ({ target: { value: String(value) } });
const change = selector => handler(host.querySelector(selector), 'onChange');
const click = label => handler(button(label));
const practiceNode = (scope, selector) => host.querySelector('[data-stall-practice-evidence="' + scope + '"] ' + selector);
async function action(label) { await act(async () => button(label).click()); }
async function mount(saved = inquiry(), options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: saved,
      stallCompareFirst: 0, stallCompareSecond: 2, stallHistoryIndex: 0, stallHistoryPracticeSampleIndex: 0,
      stallPracticeSampleIndex: 0, stallPreparedComparison: null, hostMarker: 'A host', unrelatedSetting: 'keep' },
      otherTool: { learnerWriting: 'Unrelated tool writing' } });
    latest = data.flightSim;
    const apply = update => setData(previous => {
      if (!options.replay || typeof update !== 'function') return typeof update === 'function' ? update(previous) : update;
      // Explicitly replay a functional host updater against the same input.
      // Record semantic output equality and input immutability; commit only the
      // second result. This supplements StrictMode's own updater replay.
      const before = JSON.stringify(previous), first = update(previous), second = update(previous);
      replayResults.push({ equivalent: JSON.stringify(first) === JSON.stringify(second), immutable: before === JSON.stringify(previous) });
      return second;
    });
    externalPatch = patch => apply(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: apply, awardXP, celebrate,
      update: (id, key, value) => apply(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => apply(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  const app = React.createElement(App);
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, app) : app));
}
function hostReplacement(patch = {}) {
  return { stallInvestigation: inquiry('B', { phase: current().phase, attempts: history('B'), ...patch }),
    stallCompareFirst: 2, stallCompareSecond: 0, stallHistoryIndex: 1, stallHistoryPracticeSampleIndex: 1,
    stallPracticeSampleIndex: 1, stallPreparedComparison: null, hostMarker: 'B authoritative host' };
}
async function queued(patch, callback) {
  const expected = clone({ ...latest, ...patch });
  // B is queued first. Retained A events are delivered in the same React batch,
  // before the host can commit B or refresh the rendered owner token.
  await act(async () => { externalPatch(patch); callback(); });
  expect(latest).toEqual(expected);
  expect(current().startingIdea).toEqual(expected.stallInvestigation.startingIdea);
  expect(current().attempts).toEqual(expected.stallInvestigation.attempts);
  expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  expect(hooks().flyingRef.current).toBe(false); expect(requestAnimationFrame).not.toHaveBeenCalled();
  if (replayResults.length) expect(replayResults.every(value => value.equivalent && value.immutable)).toBe(true);
}
const cases = [
  { name: 'prediction radio', phase: 'predict', capture: () => { const cb = change('input[name="stall-prediction"][value="altitude"]'); return () => cb(); } },
  { name: 'prediction reason', phase: 'predict', capture: () => { const cb = change('#stall-hypothesis'); return () => cb(event('A queued reason')); } },
  { name: 'explanation writing', phase: 'explain', capture: () => { const cb = change('#stall-explanation'); return () => cb(event('A queued explanation')); } },
  { name: 'number entry and blur', phase: 'experiment', capture: () => { const node = host.querySelector('[data-investigation-number="airspeed"]'), edit = handler(node, 'onChange'), blur = handler(node, 'onBlur'); return () => { edit(event('80')); blur(); }; } },
  ...['angle', 'speed'].map(kind => ({ name: 'prepare ' + kind, phase: 'experiment', capture: () => click('Prepare ' + kind + ' trial from A') })),
  { name: 'record observation', phase: 'experiment', capture: () => click('Record observation') },
  { name: 'transfer choice', phase: 'transfer', seed: { transferChoice: '', transferAnswer: '' }, replacement: { transferChoice: 'normal', transferAnswer: '' }, capture: () => handler(host.querySelectorAll('input[name="stall-transfer"]')[2], 'onChange') },
  { name: 'transfer check', phase: 'transfer', seed: { transferChoice: 'stall', transferAnswer: '' }, replacement: { transferChoice: 'normal', transferAnswer: '' }, capture: () => click('Check prediction') },
  { name: 'transfer retry', phase: 'transfer', seed: { transferChoice: 'normal', transferAnswer: 'normal' }, replacement: { transferChoice: 'boundary', transferAnswer: 'boundary', transferAttempts: 4 }, capture: () => click('Try transfer again') },
  { name: 'complete investigation', phase: 'transfer', seed: { completedAt: null }, replacement: { completedAt: null }, capture: () => click('Complete investigation') },
  { name: 'start new investigation', phase: 'review', capture: () => click('Start a new investigation') },
  { name: 'history selector', phase: 'review', capture: () => { const cb = change('#stall-earlier-attempt'); return () => cb(event(0)); } },
  { name: 'current practice selector', phase: 'review', capture: () => { const cb = handler(practiceNode('current', 'input[type="range"]'), 'onChange'); return () => cb(event(2)); } },
  { name: 'earlier practice selector', phase: 'review', capture: () => { const cb = handler(practiceNode('earlier', 'input[type="range"]'), 'onChange'); return () => cb(event(2)); } },
  { name: 'current practice jump', phase: 'review', capture: () => handler(practiceNode('current', '[data-stall-practice-jump="normal"]')) },
  { name: 'earlier practice jump', phase: 'review', capture: () => handler(practiceNode('earlier', '[data-stall-practice-jump="normal"]')) },
  { name: 'comparison selector', phase: 'experiment', capture: () => { const cb = change('#stall-compare-first'); return () => cb(event(1)); } },
  { name: 'back to menu', phase: 'explain', capture: () => click('← Back to menu') },
  { name: 'back to prediction', phase: 'experiment', capture: () => click('Back to prediction') },
  { name: 'continue to transfer', phase: 'explain', capture: () => click('Continue to transfer') },
  { name: 'optional flight launch', phase: 'transfer', capture: () => click('Try flight practice again') },
];
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-22T12:00:00.000Z'));
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn(); celebrate = vi.fn(); replayResults = [];
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School pending host investigation transactions', () => {
  it.each(cases)('preserves authoritative B through queued A $name', async spec => {
    await mount(inquiry('A', { phase: spec.phase, attempts: history('A'), ...(spec.seed || {}) }));
    const callback = spec.capture(); await queued(hostReplacement(spec.replacement), callback);
    // Also check the rendered number against B, rather than only the saved
    // record: a rejected numeric edit cannot leak as a local draft over B.
    if (spec.phase === 'experiment') expect(host.querySelector('[data-investigation-number="airspeed"]').value).toBe('185');
  });

  it.each(cases.filter(spec => ['record observation', 'complete investigation', 'start new investigation', 'back to menu', 'optional flight launch'].includes(spec.name)))(
    'keeps queued B intact under StrictMode and replayed updater for A $name', async spec => {
      await mount(inquiry('A', { phase: spec.phase, attempts: history('A'), ...(spec.seed || {}) }), { strict: true, replay: true });
      const callback = spec.capture(); await queued(hostReplacement(spec.replacement), callback);
      expect(replayResults.length).toBeGreaterThan(0);
    });

  it('does not prepare from A selection when a host comparison selection is already queued', async () => {
    await mount(inquiry('A', { attempts: history('A') })); const prepare = click('Prepare angle trial from A');
    await queued({ stallCompareFirst: 2, stallCompareSecond: 0, hostMarker: 'New comparison selection' }, prepare);
  });

  it('does not move the former earlier practice when a different earlier attempt is queued', async () => {
    await mount(inquiry('A', { phase: 'review', attempts: history('A') }));
    const choose = handler(practiceNode('earlier', 'input[type="range"]'), 'onChange');
    await queued({ stallHistoryIndex: 1, stallHistoryPracticeSampleIndex: 1, hostMarker: 'New earlier practice selection' }, () => choose(event(2)));
  });

  it('keeps same-turn native prediction/reason edits before a valid first departure', async () => {
    await mount(api.stallInvestigationRecord({ startingIdea: { version: 1, status: 'pending' } }), { strict: true, replay: true });
    const choose = change('input[name="stall-prediction"][value="altitude"]'), write = change('#stall-hypothesis'), next = click('Continue to trials');
    await act(async () => { choose(); write(event('The final native pre-trial idea.')); next(); });
    expect(current()).toMatchObject({ phase: 'experiment', prediction: 'altitude', hypothesis: 'The final native pre-trial idea.',
      startingIdea: { version: 1, status: 'committed', prediction: 'altitude', hypothesis: 'The final native pre-trial idea.' } });
    expect(replayResults.every(value => value.equivalent && value.immutable)).toBe(true); expect(awardXP).not.toHaveBeenCalled();
  });

  it('keeps native draft/control/record chains with exactly two newly recorded identities', async () => {
    await mount(inquiry('A', { attempts: history('A') }), { strict: true, replay: true }); const original = clone(current());
    const numeric = change('[data-investigation-number="airspeed"]'), altitude = change('#trial-altitude'), angle = change('#trial-aoa'), save = click('Record observation');
    await act(async () => { numeric(event(80)); altitude(event(6500)); angle(event(20)); save(); save(); angle(event(8)); save(); });
    expect(current().observations).toHaveLength(5);
    expect(current().observations.slice(-2)).toMatchObject([
      { trialNumber: 44, airspeed: 80, altitude: 6500, aoa: 20, state: 'stall' },
      { trialNumber: 45, airspeed: 80, altitude: 6500, aoa: 8, state: 'normal' },
    ]);
    expect(current().startingIdea).toEqual(original.startingIdea); expect(current().attempts).toEqual(original.attempts);
    expect(current().completedAt).toBeNull(); expect(current().nextTrialNumber).toBe(46);
    expect(replayResults.every(value => value.equivalent && value.immutable)).toBe(true);
  });

  it('accepts native writing while an unrelated host field changes, preserving both updates', async () => {
    await mount(inquiry('A', { phase: 'explain' }), { replay: true }); const write = change('#stall-explanation');
    await act(async () => { externalPatch({ hostMarker: 'Unrelated metadata from host' }); write(event('My valid current-owner explanation.')); });
    expect(current().explanation).toBe('My valid current-owner explanation.'); expect(latest.hostMarker).toBe('Unrelated metadata from host');
    expect(current().startingIdea.hypothesis).toBe('A original before trials');
    expect(replayResults.every(value => value.equivalent && value.immutable)).toBe(true); expect(awardXP).not.toHaveBeenCalled();
  });

  it('archives an accepted native new attempt once with replayed host updaters and one phase focus', async () => {
    await mount(inquiry('A', { phase: 'review', attempts: history('A') }), { strict: true, replay: true });
    const before = clone(current()), focus = vi.spyOn(HTMLElement.prototype, 'focus');
    await action('Start a new investigation'); await act(async () => vi.advanceTimersByTime(0));
    expect(current()).toMatchObject({ phase: 'predict', observations: [], prediction: '', completedAt: null, startingIdea: { version: 1, status: 'pending' } });
    expect(current().attempts).toHaveLength(3); expect(current().attempts[2].startingIdea).toEqual(before.startingIdea);
    expect(current().attempts[2].hypothesis).toBe(before.hypothesis);
    expect(focus.mock.instances.filter(node => node.id === 'stall-phase-title')).toHaveLength(1);
    expect(replayResults.every(value => value.equivalent && value.immutable)).toBe(true); expect(awardXP).not.toHaveBeenCalled();
  });

  it('does not replay accepted flight-launch side effects when functional host updaters are replayed', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.125);
    const observed = [];
    for (const replay of [false, true]) {
      await mount(inquiry('A', { phase: 'transfer', flight: null }), { strict: true, replay });
      random.mockClear(); vi.mocked(requestAnimationFrame).mockClear();
      await action('Try flight practice');
      expect(latest.view).toBe('flying'); expect(hooks().flyingRef.current).toBe(true);
      expect(current().flight.status).toBe('active'); expect(latest.selectedChallenge).toBe('stall_investigation');
      observed.push({ randomCalls: random.mock.calls.length, frameRequests: requestAnimationFrame.mock.calls.length });
    }
    expect(observed[1]).toEqual(observed[0]); expect(observed[0].frameRequests).toBeGreaterThan(0);
    expect(replayResults.every(value => value.equivalent && value.immutable)).toBe(true);
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });
});
