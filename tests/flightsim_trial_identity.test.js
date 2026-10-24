import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, errors, awardXP, celebrate;
const row = (patch = {}) => ({ airspeed: 130, altitude: 5000, aoa: 8, ...patch });
const evidence = () => [row(), row({ aoa: 20 }), row({ airspeed: 80, aoa: 20 })];
const record = (patch = {}) => ({ phase: 'experiment', prediction: 'angle', hypothesis: 'My starting prediction.',
  airspeed: 130, altitude: 5000, aoa: 8, observations: evidence(),
  explanation: 'Trials 1 and 2 show the angle change. Trials 2 and 3 show the speed change.',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 1, completedAt: '2026-10-21T12:00:00.000Z', ...patch });
const current = () => latest.stallInvestigation;
const table = (scope = 'current') => host.querySelector('[data-stall-trial-table="' + scope + '"]');
const labels = (scope = 'current') => [...table(scope).querySelectorAll('[data-stall-trial-number]')].map(item => Number(item.getAttribute('data-stall-trial-number')));
const first = () => host.querySelector('#stall-compare-first');
const second = () => host.querySelector('#stall-compare-second');
const prepared = () => host.querySelector('[data-stall-prepared-comparison]');
const numbers = saved => saved.observations.map(item => item.trialNumber);
function button(text) {
  const node = [...host.querySelectorAll('button')].find(item => item.textContent === text);
  expect(node, 'Button: ' + text).toBeTruthy(); return node;
}
function handler(node, event) { return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][event]; }
async function click(text) { await act(async () => button(text).click()); }
async function choose(node, value) {
  expect(node).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function mount(seed = {}, t) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: record(), ...seed } });
    latest = data.flightSim;
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
  errors = vi.spyOn(console, 'error').mockImplementation(() => {}); awardXP = vi.fn(); celebrate = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School canonical investigation trial identities', () => {
  it('migrates legacy evidence deterministically without changing conditions or trusting claimed output fields', () => {
    const source = record({ nextTrialNumber: 9999, observations: [row({ state: 'stall', lift: 999 }), ...evidence().slice(1)] });
    const before = JSON.stringify(source), normalized = api.stallInvestigationRecord(source);
    expect(numbers(normalized)).toEqual([1, 2, 3]); expect(normalized.nextTrialNumber).toBe(4);
    expect(normalized.observations[0]).toEqual({ ...api.sampleStallInvestigation(130, 5000, 8), trialNumber: 1 });
    expect(normalized.observations[0].state).toBe('normal'); expect(JSON.stringify(source)).toBe(before);
    expect(api.stallInvestigationRecord(normalized)).toEqual(normalized);
  });

  it('numbers a retained legacy suffix by all valid historical positions, excluding malformed discarded rows', () => {
    const valid = Array.from({ length: 30 }, (_, index) => row({ airspeed: 100 + index }));
    const source = record({ observations: [null, ...valid.slice(0, 4), row({ airspeed: NaN }), ...valid.slice(4)] });
    const normalized = api.stallInvestigationRecord(source);
    expect(numbers(normalized)).toEqual(Array.from({ length: 24 }, (_, index) => index + 7));
    expect(normalized.observations[0].airspeed).toBe(106); expect(normalized.observations.at(-1).airspeed).toBe(129);
    expect(normalized.nextTrialNumber).toBe(31);
  });

  it('preserves valid increasing identifiers, gaps from invalid conditions, and independent archive numbering', () => {
    const source = record({ observations: [row({ trialNumber: 70 }), row({ trialNumber: 71, altitude: -1 }), row({ trialNumber: 72, aoa: 20 })],
      nextTrialNumber: 1, attempts: [record({ observations: evidence().map((item, index) => ({ ...item, trialNumber: index + 21 })), nextTrialNumber: Infinity })] });
    const normalized = api.stallInvestigationRecord(source);
    expect(numbers(normalized)).toEqual([70, 72]); expect(normalized.nextTrialNumber).toBe(73);
    expect(numbers(normalized.attempts[0])).toEqual([21, 22, 23]); expect(normalized.attempts[0].nextTrialNumber).toBe(24);
  });

  it.each([
    ['duplicate', [20, 20, 21]], ['descending', [21, 20, 19]], ['partial', [20, undefined, 22]],
    ['noninteger', [20, 21.5, 22]], ['string', [20, '21', 22]], ['zero', [0, 1, 2]],
    ['nonfinite', [20, Infinity, 22]], ['unsafe', [20, Number.MAX_SAFE_INTEGER + 1, 22]],
  ])('canonically migrates %s IDs without dropping the actual observations', (_, ids) => {
    const source = record({ observations: evidence().map((item, index) => ({ ...item, trialNumber: ids[index] })) });
    const normalized = api.stallInvestigationRecord(source);
    expect(numbers(normalized)).toEqual([1, 2, 3]); expect(normalized.nextTrialNumber).toBe(4);
    normalized.observations.forEach((item, index) => expect(item).toMatchObject(evidence()[index]));
    expect(api.stallInvestigationRecord(normalized)).toEqual(normalized);
  });

  it('derives the counter only from valid evidence and prevents unsafe growth at safe-integer exhaustion', () => {
    expect(api.stallInvestigationRecord(record({ observations: [], nextTrialNumber: Number.MAX_SAFE_INTEGER })).nextTrialNumber).toBe(1);
    expect(api.stallInvestigationRecord(record({ nextTrialNumber: Infinity })).nextTrialNumber).toBe(4);
    const last = Number.MAX_SAFE_INTEGER, normalized = api.stallInvestigationRecord(record({ observations: [row({ trialNumber: last })] }));
    expect(numbers(normalized)).toEqual([last]); expect(normalized.nextTrialNumber).toBeNull();
    expect(api.stallInvestigationRecord(normalized)).toEqual(normalized);
  });

  it('binds preparation to identities as well as conditions and rejects swapped equal-condition evidence', () => {
    const source = api.stallInvestigationRecord(record({ observations: [row({ trialNumber: 1 }), row({ trialNumber: 2 }), row({ trialNumber: 3, aoa: 20 })] }));
    const context = api.prepareStallComparisonContext(source, 0, 'angle');
    const target = { ...source, airspeed: 130, altitude: 5000, aoa: 20 };
    expect(context.baselineKey).toBe('1~130|5000|8');
    expect(api.stallPreparedComparisonContext(context, target)).toEqual(context);
    const swapped = [source.observations[1], source.observations[0], source.observations[2]];
    expect(api.stallPreparedComparisonContext(context, { ...target, observations: swapped })).toBeNull();
    expect(api.stallPreparedComparisonContext(context, { ...target, observations: source.observations.map(item => ({ ...item, trialNumber: item.trialNumber + 10 })) })).toBeNull();
  });
});

describe('Sky School persistent trial references in the investigation', () => {
  it('retains labels and literal writing when repeated recordings shift the latest-24 window', async () => {
    const observations = [...evidence(), ...Array.from({ length: 21 }, () => row())];
    const source = record({ observations }); await mount({ stallInvestigation: source });
    expect(labels()).toEqual(Array.from({ length: 24 }, (_, index) => index + 1));
    await click('Record observation');
    expect(labels()).toEqual(Array.from({ length: 24 }, (_, index) => index + 2));
    expect(table().querySelector('caption').textContent).toContain('Trial 2–25');
    expect(table().querySelector('[data-stall-trial-number="1"]')).toBeNull();
    expect(current().explanation).toBe(source.explanation); expect(current().hypothesis).toBe(source.hypothesis);
    expect(current().nextTrialNumber).toBe(26); expect(current().completedAt).toBeNull();
    await click('Record observation');
    expect(labels()).toEqual(Array.from({ length: 24 }, (_, index) => index + 3));
    expect(current().nextTrialNumber).toBe(27); expect(current().explanation).toBe(source.explanation);
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it('uses stable numbers in pair summaries, comparison options and conditions while option values stay indices', async () => {
    const source = record({ observations: evidence().map((item, index) => ({ ...item, trialNumber: index + 71 })) });
    await mount({ stallInvestigation: source });
    expect(labels()).toEqual([71, 72, 73]); expect(first().options[0].textContent).toBe('Trial 71'); expect(first().options[0].value).toBe('0');
    expect(host.textContent).toContain('Angle comparison: trials 71 and 72');
    expect(host.textContent).toContain('Speed comparison: trials 72 and 73');
    expect(host.textContent).toContain('Trial A (71):'); expect(host.textContent).toContain('Trial B (72):');
    const select = first(); select.focus(); await choose(select, 1); await choose(second(), 2);
    expect(first().value).toBe('1'); expect(second().value).toBe('2');
    expect(host.textContent).toContain('Trial A (72):'); expect(host.textContent).toContain('Trial B (73):');
    expect(document.activeElement).toBe(select); expect(current()).toEqual(source);
  });

  it('keeps a retained prepared baseline’s identity while its array index shifts', async () => {
    const observations = Array.from({ length: 24 }, (_, index) => row({ trialNumber: index + 31, airspeed: 60 + index * 5 }));
    await mount({ stallInvestigation: record({ observations }), stallCompareFirst: 1, stallCompareSecond: 23 });
    await click('Prepare angle trial from A');
    expect(prepared().getAttribute('data-stall-prepared-first')).toBe('1');
    expect(prepared().getAttribute('data-stall-prepared-trial-number')).toBe('32'); expect(prepared().textContent).toContain('Trial 32');
    await click('Record observation');
    expect(first().value).toBe('0'); expect(second().value).toBe('23');
    expect(labels()[0]).toBe(32); expect(labels().at(-1)).toBe(55);
    expect(host.textContent).toContain('Trial A (32):'); expect(host.textContent).toContain('Trial B (55):');
    expect(api.stallTrialComparison(current().observations, 0, 23)).toMatchObject({ kind: 'angle', qualifies: 'angle' });
  });

  it('does not point an evicted prepared baseline at the next row with another identity', async () => {
    const observations = Array.from({ length: 24 }, (_, index) => row({ trialNumber: index + 31, airspeed: 60 + index * 5 }));
    await mount({ stallInvestigation: record({ observations }), stallCompareFirst: 0, stallCompareSecond: 23 });
    await click('Prepare angle trial from A'); await click('Record observation');
    expect(labels()[0]).toBe(32); expect(first().value).toBe('22'); expect(second().value).toBe('23');
    expect(host.textContent).toContain('Trial A (54):'); expect(host.textContent).toContain('Trial B (55):');
    expect(table().querySelector('[data-stall-trial-number="31"]')).toBeNull(); expect(prepared()).toBeNull();
  });

  it('preserves numbering through reload, Explanation, Review and archive, then starts the next attempt at Trial 1', async () => {
    const source = record({ observations: evidence().map((item, index) => ({ ...item, trialNumber: index + 51 })) });
    await mount({ stallInvestigation: source, stallCompareFirst: 1, stallCompareSecond: 2 });
    const saved = JSON.parse(JSON.stringify(latest)); await mount(saved);
    expect(labels()).toEqual([51, 52, 53]); expect(first().value).toBe('1'); expect(second().value).toBe('2');
    await click('Continue to explanation'); expect(labels()).toEqual([51, 52, 53]);
    expect(host.querySelector('#stall-explanation').value).toBe(source.explanation);
    await click('Continue to transfer'); await click('Complete investigation');
    expect(labels()).toEqual([51, 52, 53]); expect(current().nextTrialNumber).toBe(54);
    await click('Start a new investigation');
    expect(numbers(current())).toEqual([]); expect(current().nextTrialNumber).toBe(1);
    expect(labels('earlier')).toEqual([51, 52, 53]); expect(table('earlier').querySelector('caption').textContent).toContain('Trial 51–53');
    expect(host.querySelector('[aria-label="Investigation notebook"]').textContent).toContain('Angle comparison: trials 51 and 52');
    expect(current().attempts[0].nextTrialNumber).toBe(54); expect(current().attempts[0].explanation).toBe(source.explanation);
    await act(async () => host.querySelector('input[name="stall-prediction"][value="angle"]').click());
    await click('Continue to trials'); await click('Record observation');
    expect(labels()).toEqual([1]); expect(current().nextTrialNumber).toBe(2); expect(labels('earlier')).toEqual([51, 52, 53]);
  });

  it('does not allocate multiple identities when one recording action is activated twice before repaint', async () => {
    await mount(); const save = handler(button('Record observation'), 'onClick');
    await act(async () => { save(); save(); });
    expect(numbers(current())).toEqual([1, 2, 3, 4]); expect(current().nextTrialNumber).toBe(5);
  });

  it('guards exhausted IDs without changing the evidence or creating an unsafe next number', async () => {
    const source = record({ observations: [row({ trialNumber: Number.MAX_SAFE_INTEGER })] });
    await mount({ stallInvestigation: source });
    expect(button('Record observation').disabled).toBe(true);
    const save = handler(button('Record observation'), 'onClick'); await act(async () => save());
    expect(current()).toEqual(source); expect(labels()).toEqual([Number.MAX_SAFE_INTEGER]);
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it('reuses localized Trial labels for stable IDs without changing the stored identifiers', async () => {
    const source = record({ observations: evidence().map((item, index) => ({ ...item, trialNumber: index + 41 })) });
    await mount({ stallInvestigation: source, stallCompareFirst: 0 }, (key, fallback) => key === 'stem.flightsim.guided_compare_trial_option' ? 'Essai {number}' : fallback);
    expect(first().options[0].textContent).toBe('Essai 41'); expect(table().querySelector('caption').textContent).toContain('Essai 41–43');
    await click('Prepare angle trial from A'); expect(prepared().textContent).toContain('Essai 41');
    expect(numbers(current())).toEqual([41, 42, 43]); expect(current().nextTrialNumber).toBe(44);
  });
});
