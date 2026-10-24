import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, externalPatch, errors, awardXP, celebrate;
const clone = value => JSON.parse(JSON.stringify(value));
const hooks = () => window.__testHooks.flightSim;
const evidence = start => [
  { trialNumber: start, airspeed: 130, altitude: 5000, aoa: 8 },
  { trialNumber: start + 1, airspeed: 130, altitude: 5000, aoa: 20 },
  { trialNumber: start + 2, airspeed: 80, altitude: 5000, aoa: 20 },
];
const inquiry = (owner = 'A', patch = {}) => api.stallInvestigationRecord({
  phase: 'experiment', prediction: 'angle', hypothesis: owner + ': revised idea.',
  startingIdea: { version: 1, status: 'committed', prediction: 'speed', hypothesis: owner + ': original before the trials.' },
  airspeed: owner === 'A' ? 130 : 185, altitude: owner === 'A' ? 5000 : 9000, aoa: owner === 'A' ? 8 : 12,
  observations: evidence(owner === 'A' ? 41 : 171), explanation: owner + ': evidence-based explanation.',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 2, completedAt: '2026-10-22T12:00:00.000Z', ...patch,
});
const history = (owner = 'A', count = 2) => Array.from({ length: count }, (_, index) => inquiry(owner + '-archive-' + index, { phase: 'review' }));
const record = () => latest.stallInvestigation;
function button(label) {
  const node = [...host.querySelectorAll('button')].find(item => item.textContent === label);
  expect(node, 'Button: ' + label).toBeTruthy(); return node;
}
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy();
  const key = Object.keys(node).find(value => value.startsWith('__reactProps$'));
  expect(key).toBeTruthy(); return node[key][name];
}
const valueEvent = value => ({ target: { value: String(value) } });
async function action(label) { await act(async () => button(label).click()); }
async function input(node, value) {
  expect(node).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function mount(saved = inquiry(), extra = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: saved,
      stallCompareFirst: 0, stallCompareSecond: 2, stallHistoryIndex: 0, unrelatedSetting: 'keep', ...extra } });
    latest = data.flightSim;
    externalPatch = patch => setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP, celebrate,
      update: (id, key, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function replace(patch = {}, extra = {}) {
  const saved = inquiry('B', { phase: record().phase, attempts: history('B'), ...patch });
  // Deliberately commit B before delivering a retained A callback. These tests
  // cover committed ownership replacement, not pending host-update ordering.
  await act(async () => externalPatch({ stallInvestigation: saved, stallCompareFirst: 2, stallCompareSecond: 0,
    stallHistoryIndex: 1, stallHistoryPracticeSampleIndex: 0, stallPreparedComparison: null, ...extra }));
  expect(record()).toEqual(saved);
  return clone(latest);
}
function preserved(before) {
  expect(latest).toEqual(before); expect(record().startingIdea).toEqual(before.stallInvestigation.startingIdea);
  expect(record().attempts).toEqual(before.stallInvestigation.attempts);
  expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn(); celebrate = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School committed investigation edit ownership', () => {
  it('rejects retained prediction and reason changes after another Prediction record commits', async () => {
    await mount(inquiry('A', { phase: 'predict' }));
    const choose = handler(host.querySelector('input[name="stall-prediction"][value="altitude"]'), 'onChange');
    const write = handler(host.querySelector('#stall-hypothesis'), 'onChange');
    const before = await replace({ prediction: 'speed', hypothesis: 'B: saved reasoning belongs here.' });
    await act(async () => { choose(); write(valueEvent('A: stale hypothesis must not replace B.')); });
    preserved(before); expect(host.querySelector('#stall-hypothesis').value).toBe('B: saved reasoning belongs here.');
  });

  it('rejects an earlier textarea callback without overwriting B explanation or completion', async () => {
    await mount(inquiry('A', { phase: 'explain' }));
    const write = handler(host.querySelector('#stall-explanation'), 'onChange');
    const before = await replace(); await act(async () => write(valueEvent('A: stale written explanation.')));
    preserved(before); expect(host.querySelector('#stall-explanation').value).toBe('B: evidence-based explanation.');
  });

  it('does not recreate an A numeric draft through retained change and blur callbacks', async () => {
    await mount();
    const field = host.querySelector('[data-investigation-number="airspeed"]');
    const change = handler(field, 'onChange'), blur = handler(field, 'onBlur');
    const before = await replace();
    await act(async () => { change(valueEvent('80')); blur(); });
    preserved(before); expect(host.querySelector('[data-investigation-number="airspeed"]').value).toBe('185');
    expect(host.querySelector('#trial-airspeed').value).toBe('185');
  });

  it('does not let an A blur commit B own still-pending number entry', async () => {
    await mount(); const staleBlur = handler(host.querySelector('[data-investigation-number="airspeed"]'), 'onBlur');
    const before = await replace();
    const currentField = host.querySelector('[data-investigation-number="airspeed"]'); await input(currentField, '120');
    await act(async () => staleBlur());
    preserved(before); expect(currentField.value).toBe('120'); expect(record().airspeed).toBe(185);
    await action('Record observation'); expect(record().observations.at(-1).airspeed).toBe(120);
    expect(record().observations).toHaveLength(before.stallInvestigation.observations.length + 1);
  });

  it.each(['angle', 'speed'])('rejects an old Prepare %s action without changing B controls or preparation', async kind => {
    await mount(); const prepare = handler(button('Prepare ' + kind + ' trial from A'));
    const before = await replace(); await act(async () => prepare());
    preserved(before); expect(host.querySelector('[data-stall-prepared-comparison]')).toBeNull();
  });

  it('does not append a trial, allocate its number, or invalidate B completion through A Record callback', async () => {
    await mount(); const save = handler(button('Record observation'));
    const before = await replace(); await act(async () => save());
    preserved(before); expect(record().observations.map(row => row.trialNumber)).toEqual([171, 172, 173]);
    expect(record().nextTrialNumber).toBe(174);
  });

  it('rejects A range and trial shortcuts after the replacement controls commit', async () => {
    await mount();
    const range = handler(host.querySelector('#trial-airspeed'), 'onChange');
    const reference = handler(button('Reference conditions')), angle = handler(button('Change angle only')), speed = handler(button('Change speed only'));
    const before = await replace();
    await act(async () => { range(valueEvent(250)); reference(); angle(); speed(); });
    preserved(before); expect(record()).toMatchObject({ airspeed: 185, altitude: 9000, aoa: 12 });
  });

  it.each(['choose', 'check', 'retry'])('does not apply a retained A transfer %s callback to B', async operation => {
    const start = operation === 'retry' ? { transferChoice: 'normal', transferAnswer: 'normal' }
      : { transferChoice: operation === 'check' ? 'stall' : '', transferAnswer: '' };
    await mount(inquiry('A', { phase: 'transfer', ...start }));
    const callback = operation === 'choose' ? handler(host.querySelectorAll('input[name="stall-transfer"]')[2], 'onChange')
      : handler(button(operation === 'check' ? 'Check prediction' : 'Try transfer again'));
    const before = await replace({ transferChoice: operation === 'retry' ? 'boundary' : 'normal',
      transferAnswer: operation === 'retry' ? 'boundary' : '', transferAttempts: 4 });
    await act(async () => callback()); preserved(before);
  });

  it('does not complete a different eligible B record through A Complete callback', async () => {
    await mount(inquiry('A', { phase: 'transfer', completedAt: null }));
    const complete = handler(button('Complete investigation'));
    const before = await replace({ completedAt: null }); await act(async () => complete());
    preserved(before); expect(record().phase).toBe('transfer'); expect(record().completedAt).toBeNull();
  });

  it('does not archive/reset B or evict B oldest retained attempt through A Start new callback', async () => {
    await mount(inquiry('A', { phase: 'review', attempts: history('A') }));
    const reset = handler(button('Start a new investigation'));
    const before = await replace({ attempts: history('B', 5) }); await act(async () => reset());
    preserved(before); expect(record().attempts).toHaveLength(5); expect(record().attempts[0].hypothesis).toBe('B-archive-0: revised idea.');
  });

  it('rejects old Menu navigation while B remains in the same phase', async () => {
    await mount(inquiry('A', { phase: 'explain' })); const menu = handler(button('← Back to menu'));
    const before = await replace(); await act(async () => menu()); preserved(before); expect(latest.view).toBe('stallHunt');
  });

  it('does not launch optional flight from a retained A callback after B transfer commits', async () => {
    await mount(inquiry('A', { phase: 'transfer' })); const launch = handler(button('Try flight practice'));
    const before = await replace(); await act(async () => launch());
    preserved(before); expect(hooks().flyingRef.current).toBe(false); expect(record().flight).toBeNull();
    expect(latest.flightPractice).toBeUndefined(); expect(latest.flightChallenge).toBeUndefined();
  });

  it('does not change B earlier-investigation selection through A notebook selector', async () => {
    await mount(inquiry('A', { phase: 'explain', attempts: history('A') }));
    const choose = handler(host.querySelector('#stall-earlier-attempt'), 'onChange');
    const before = await replace(); await act(async () => choose(valueEvent(0)));
    preserved(before); expect(latest.stallHistoryIndex).toBe(1);
  });

  it('keeps genuine same-turn prediction/reason edits and commits their original once', async () => {
    await mount(api.stallInvestigationRecord({ startingIdea: { version: 1, status: 'pending' } }));
    const choose = handler(host.querySelector('input[name="stall-prediction"][value="altitude"]'), 'onChange');
    const write = handler(host.querySelector('#stall-hypothesis'), 'onChange'), next = handler(button('Continue to trials'));
    await act(async () => { choose(); write(valueEvent('My final native pre-trial reason.')); next(); });
    expect(record()).toMatchObject({ phase: 'experiment', prediction: 'altitude', hypothesis: 'My final native pre-trial reason.',
      startingIdea: { version: 1, status: 'committed', prediction: 'altitude', hypothesis: 'My final native pre-trial reason.' } });
    expect(record().observations).toEqual([]); expect(awardXP).not.toHaveBeenCalled();
  });

  it('keeps genuine same-turn control edits and two changed recordings without duplicate allocation', async () => {
    await mount(); const before = clone(record());
    const speed = handler(host.querySelector('#trial-airspeed'), 'onChange'), altitude = handler(host.querySelector('#trial-altitude'), 'onChange');
    const angle = handler(host.querySelector('#trial-aoa'), 'onChange'), save = handler(button('Record observation'));
    await act(async () => { speed(valueEvent(180)); altitude(valueEvent(8000)); angle(valueEvent(20)); save(); save(); angle(valueEvent(8)); save(); });
    expect(record().observations).toHaveLength(5);
    expect(record().observations.slice(-2)).toMatchObject([
      { trialNumber: 44, airspeed: 180, altitude: 8000, aoa: 20, state: 'stall' },
      { trialNumber: 45, airspeed: 180, altitude: 8000, aoa: 8, state: 'normal' },
    ]);
    expect(record().startingIdea).toEqual(before.startingIdea); expect(record().explanation).toBe(before.explanation);
    expect(record().completedAt).toBeNull(); expect(record().nextTrialNumber).toBe(46);
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it('retires A delayed phase focus when a same-phase B record replaces the new phase', async () => {
    await mount(inquiry('A', { phase: 'predict' })); await action('Continue to trials');
    expect(record().phase).toBe('experiment'); const before = await replace();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    expect(document.activeElement).toBe(document.body);
    await act(async () => vi.advanceTimersByTime(0));
    preserved(before); expect(document.activeElement).toBe(document.body);
  });
});
