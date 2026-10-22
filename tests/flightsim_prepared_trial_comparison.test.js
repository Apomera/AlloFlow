import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, errors, awardXP, celebrate, externalPatch;
const row = (patch = {}) => ({ airspeed: 130, altitude: 5000, aoa: 8, ...patch });
const rows = () => [row(), row({ airspeed: 180, altitude: 8000, aoa: 16 }), row({ airspeed: 160, altitude: 6000, aoa: 14 })];
const investigation = (patch = {}) => ({ phase: 'experiment', prediction: 'angle', hypothesis: 'My starting idea.',
  airspeed: 200, altitude: 10000, aoa: 14, observations: rows(),
  explanation: 'My explanation stays with this investigation.', transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 2,
  completedAt: '2026-10-21T12:00:00.000Z', ...patch });
const record = () => latest.stallInvestigation;
const first = () => host.querySelector('#stall-compare-first');
const second = () => host.querySelector('#stall-compare-second');
const notice = () => host.querySelector('[data-stall-prepared-comparison]');
const inspector = () => host.querySelector('section[aria-label="Compare recorded trials"]');
function button(text) {
  const node = [...host.querySelectorAll('button')].find(item => item.textContent === text);
  expect(node, 'Button: ' + text).toBeTruthy(); return node;
}
function handler(node, event) { return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][event]; }
async function click(text) { await act(async () => button(text).click()); }
async function change(node, value) {
  expect(node).toBeTruthy();
  const prototype = node.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLSelectElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node.tagName === 'INPUT' ? 'input' : 'change', { bubbles: true }));
  });
}
async function mount(seed = {}, t) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: investigation(),
      stallCompareFirst: 0, stallCompareSecond: 2, unrelatedSetting: 'keep', ...seed } });
    latest = data.flightSim;
    externalPatch = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...(t ? { t } : {}), awardXP, celebrate,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  awardXP = vi.fn(); celebrate = vi.fn(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School bounded prepared-trial identity', () => {
  it.each(['angle', 'speed'])('identifies actual baseline inputs and a derived %s condition without retaining calculated evidence', variable => {
    const source = investigation(), before = JSON.stringify(source);
    const context = api.prepareStallComparisonContext(source, 0, variable);
    const target = api.prepareStallComparisonTrial(source.observations[0], variable);
    const prepared = { ...source, airspeed: target.airspeed, altitude: target.altitude, aoa: target.aoa };
    expect(context).toMatchObject({ version: 1, firstIndex: 0, variable, baselineKey: '1~130|5000|8' });
    expect(Object.keys(context).sort()).toEqual(['baselineKey', 'firstIndex', 'observationsKey', 'targetKey', 'variable', 'version']);
    expect(context.observationsKey.length).toBeLessThan(2200);
    expect(api.stallPreparedComparisonContext({ ...context, lift: 999, snapshot: { state: 'stall' } }, prepared)).toEqual(context);
    expect(api.stallPreparedComparisonContext(context, source)).toBeNull();
    expect(JSON.stringify(source)).toBe(before);
  });

  it('rejects changed or shifted retained evidence, wrong targets, phases and malformed identity fields', () => {
    const source = investigation(), context = api.prepareStallComparisonContext(source, 0, 'angle');
    const prepared = { ...source, airspeed: 130, altitude: 5000, aoa: 20 };
    expect(api.stallPreparedComparisonContext(context, prepared)).toEqual(context);
    for (const patch of [{ firstIndex: -1 }, { firstIndex: 24 }, { firstIndex: .5 }, { firstIndex: '0' },
      { variable: 'altitude' }, { version: 2 }, { observationsKey: '' }, { baselineKey: '180|8000|16' }, { targetKey: '130|5000|21' }]) {
      expect(api.stallPreparedComparisonContext({ ...context, ...patch }, prepared)).toBeNull();
    }
    const changedRows = source.observations.map((item, index) => index === 1 ? { ...item, altitude: 8500 } : item);
    for (const patch of [{ phase: 'explain' }, { airspeed: 135 }, { observations: changedRows },
      { observations: source.observations.slice(1) }, { observations: [] }]) {
      expect(api.stallPreparedComparisonContext(context, { ...prepared, ...patch })).toBeNull();
    }
    for (const invalid of [null, [], {}, Object.create(context)]) expect(api.stallPreparedComparisonContext(invalid, prepared)).toBeNull();
    expect(api.prepareStallComparisonContext(source, 0, 'altitude')).toBeNull();
    expect(api.prepareStallComparisonContext(source, 20, 'angle')).toBeNull();
    expect(api.prepareStallComparisonContext({ ...source, phase: 'review' }, 0, 'angle')).toBeNull();
  });
});

describe('Sky School prepare from A then record', () => {
  it.each(['angle', 'speed'])('compares a prepared %s trial with its older selected baseline instead of the newest unrelated row', async variable => {
    await mount(); const before = api.stallInvestigationRecord(record());
    await click('Prepare ' + variable + ' trial from A');
    expect(notice().getAttribute('data-stall-prepared-first')).toBe('0');
    expect(notice().textContent).toContain('Trial 1');
    expect(record().observations).toEqual(before.observations); expect(record().completedAt).toBe(before.completedAt);
    expect(record().explanation).toBe(before.explanation); expect(record().transferAttempts).toBe(before.transferAttempts);
    const target = api.prepareStallComparisonTrial(before.observations[0], variable);
    await click('Record observation');
    expect(record().observations).toHaveLength(4); expect(record().observations[3]).toEqual({ ...target, trialNumber: 4 });
    expect(first().value).toBe('0'); expect(second().value).toBe('3');
    expect(api.stallTrialComparison(record().observations, latest.stallCompareFirst, latest.stallCompareSecond)).toMatchObject({ kind: variable, qualifies: variable });
    expect(inspector().textContent).not.toContain('More than one variable changed');
    expect(record().completedAt).toBeNull(); expect(record().explanation).toBe(before.explanation);
    expect(latest.stallPreparedComparison).toBeNull(); expect(notice()).toBeNull();
    expect(latest.unrelatedSetting).toBe('keep'); expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it('preserves a valid preparation across a serialized reload, then consumes it once', async () => {
    await mount(); await click('Prepare angle trial from A');
    const saved = JSON.parse(JSON.stringify(latest)); await mount(saved);
    expect(notice()).toBeTruthy(); expect(latest.stallPreparedComparison).toEqual(saved.stallPreparedComparison);
    expect(record()).toEqual(saved.stallInvestigation);
    await click('Record observation'); expect(first().value).toBe('0'); expect(second().value).toBe('3');
    await click('Record observation'); expect(first().value).toBe('3'); expect(second().value).toBe('4');
    expect(record().observations).toHaveLength(5); expect(latest.stallPreparedComparison).toBeNull();
  });

  it('keeps ordinary recording on the newest two trials without an active preparation', async () => {
    await mount(); await click('Record observation');
    expect(first().value).toBe('2'); expect(second().value).toBe('3');
    expect(api.stallTrialComparison(record().observations, 2, 3).kind).toBe('mixed');
  });

  it.each([['airspeed', 140], ['altitude', 5500], ['aoa', 18]])('retires preparation when the %s range is manually edited', async (key, value) => {
    await mount(); await click('Prepare angle trial from A');
    await change(host.querySelector('#trial-' + key), value);
    expect(latest.stallPreparedComparison).toBeNull(); expect(notice()).toBeNull();
    await click('Record observation'); expect(first().value).toBe('2'); expect(second().value).toBe('3');
    expect(record().observations[3][key]).toBe(value);
  });

  it('retires preparation as soon as numeric entry begins and records the committed visible condition', async () => {
    await mount(); await click('Prepare angle trial from A');
    const numeric = host.querySelector('[data-investigation-number="aoa"]');
    await change(numeric, '19');
    expect(latest.stallPreparedComparison).toBeNull(); expect(notice()).toBeNull();
    await click('Record observation');
    expect(record().observations[3].aoa).toBe(19); expect(first().value).toBe('2'); expect(second().value).toBe('3');
  });

  it.each(['Reference conditions', 'Change angle only', 'Change speed only'])('retires preparation when activating %s', async action => {
    await mount(); await click('Prepare angle trial from A'); await click(action);
    expect(latest.stallPreparedComparison).toBeNull(); expect(notice()).toBeNull();
    await click('Record observation'); expect(first().value).toBe('2'); expect(second().value).toBe('3');
  });

  it('honors a later deliberate comparison selection and keeps the selector focused', async () => {
    await mount(); await click('Prepare angle trial from A');
    const select = second(); select.focus(); await change(select, 0);
    expect(document.activeElement).toBe(select); expect(latest.stallPreparedComparison).toBeNull();
    await click('Record observation'); expect(first().value).toBe('2'); expect(second().value).toBe('3');
  });

  it('retires preparation through a phase round trip while preserving normal phase focus', async () => {
    await mount(); await click('Prepare angle trial from A'); await click('Back to prediction');
    expect(latest.stallPreparedComparison).toBeNull();
    await act(async () => vi.advanceTimersByTime(1)); expect(document.activeElement.id).toBe('stall-phase-title');
    await click('Continue to trials'); await click('Record observation');
    expect(first().value).toBe('2'); expect(second().value).toBe('3');
  });

  it.each(['native', 'external'])('retires a %s departure so returning cannot revive the prepared pairing', async method => {
    await mount(); await click('Prepare angle trial from A');
    if (method === 'native') await click('← Back to menu');
    else await act(async () => externalPatch({ view: 'menu' }));
    expect(latest.stallPreparedComparison).toBeNull();
    await act(async () => externalPatch({ view: 'stallHunt' }));
    expect(notice()).toBeNull(); await click('Record observation');
    expect(first().value).toBe('2'); expect(second().value).toBe('3');
  });

  it('remaps a retained baseline after dropping the oldest of 24 observations', async () => {
    const observations = Array.from({ length: 24 }, (_, index) => row({ airspeed: 60 + index * 5, altitude: 3000 + index * 100 }));
    await mount({ stallInvestigation: investigation({ observations }), stallCompareFirst: 10 });
    await click('Prepare angle trial from A'); const baseline = { ...record().observations[10] };
    await click('Record observation');
    expect(record().observations).toHaveLength(24); expect(first().value).toBe('9'); expect(second().value).toBe('23');
    expect(record().observations[9]).toEqual(baseline);
    expect(api.stallTrialComparison(record().observations, 9, 23)).toMatchObject({ kind: 'angle', qualifies: 'angle' });
  });

  it('falls back to the actual newest pair when preparation’s oldest baseline is evicted', async () => {
    const observations = Array.from({ length: 24 }, (_, index) => row({ airspeed: 60 + index * 5, altitude: 3000 + index * 100 }));
    await mount({ stallInvestigation: investigation({ observations }), stallCompareFirst: 0 });
    await click('Prepare angle trial from A'); await click('Record observation');
    expect(first().value).toBe('22'); expect(second().value).toBe('23');
    expect(record().observations[0]).toMatchObject(observations[1]);
    expect(api.stallTrialComparison(record().observations, 22, 23).kind).toBe('mixed');
    expect(latest.stallPreparedComparison).toBeNull();
  });

  it('uses the last queued preparation and records its actual target exactly once', async () => {
    await mount(); const angle = handler(button('Prepare angle trial from A'), 'onClick');
    const speed = handler(button('Prepare speed trial from A'), 'onClick');
    const save = handler(button('Record observation'), 'onClick');
    await act(async () => { angle(); speed(); save(); save(); });
    expect(record().observations).toHaveLength(4); expect(record().observations[3]).toEqual({ ...api.sampleStallInvestigation(80, 5000, 8), trialNumber: 4 });
    expect(first().value).toBe('0'); expect(second().value).toBe('3'); expect(latest.stallPreparedComparison).toBeNull();
  });

  it('discards invalid reloaded context while keeping the actual investigation and ordinary record behavior', async () => {
    const source = investigation(), context = api.prepareStallComparisonContext(source, 0, 'angle');
    await mount({ stallInvestigation: { ...source, airspeed: 130, altitude: 5000, aoa: 20 },
      stallPreparedComparison: { ...context, targetKey: '130|5000|21' } });
    expect(latest.stallPreparedComparison).toBeNull(); expect(notice()).toBeNull();
    expect(record().observations).toEqual(source.observations);
    await click('Record observation'); expect(first().value).toBe('2'); expect(second().value).toBe('3');
    expect(record().observations.slice(0, 3)).toEqual(api.stallInvestigationRecord(source).observations);
    expect(record().observations[3]).toEqual({ ...api.sampleStallInvestigation(130, 5000, 20), trialNumber: 4 });
  });

  it('keeps a new investigation free of the archived attempt’s prepared comparison', async () => {
    const source = investigation(), context = api.prepareStallComparisonContext(source, 0, 'angle');
    await mount({ stallInvestigation: { ...source, phase: 'review', airspeed: 130, altitude: 5000, aoa: 20 },
      stallPreparedComparison: context });
    expect(latest.stallPreparedComparison).toBeNull();
    await click('Start a new investigation');
    expect(record()).toMatchObject({ phase: 'predict', observations: [], completedAt: null });
    expect(record().attempts).toHaveLength(1); expect(record().attempts[0].explanation).toBe(source.explanation);
    expect(latest.stallPreparedComparison).toBeNull(); expect(latest.stallCompareFirst).toBeNull();
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });
});
