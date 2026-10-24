import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const row = (t, patch = {}) => ({ t, lat: 43.646, lon: -70.309, alt: 5000, spd: 100, hdg: 90,
  agl: 4924, fpm: 0, aoa: 8, pitch: 0, bank: 0, throttle: 0, onGround: false, stalling: false, lowAirspeed: false, ...patch });
const samples = () => [row(0, { pitch: 8, bank: -4, throttle: .3 }),
  row(2, { pitch: -3, bank: 0, throttle: .7, fpm: -300, lowAirspeed: true }),
  row(4, { pitch: 0, bank: 2, throttle: 0, fpm: 200 })];
const stallSamples = () => [row(0, { pitch: 4, throttle: .4 }),
  row(2, { pitch: 10, bank: 5, throttle: .2, fpm: -500, aoa: 18, stalling: true }),
  row(4, { pitch: -3, bank: 0, throttle: .7, fpm: -100 }), row(6, { pitch: 1, throttle: .6 })];
const flight = (patch = {}) => ({ attemptId: 'latest-control-evidence', aircraftId: 'cessna172',
  activityId: 'free_flight', investigation: false, startedAirborne: true,
  endedAt: '2026-10-21T12:00:00.000Z', samples: samples(), reflection: 'Use both moments to explain a control decision.', ...patch });
let tool, root, host, latest, writes, xp, errors;
const explorer = () => host.querySelector('[aria-label="Flight evidence explorer"]');
const panel = (scope = 'current') => host.querySelector('[data-flight-control-comparison="' + scope + '"]');
const side = (name, scope = 'current') => panel(scope).querySelector('[data-control-comparison-side="' + name + '"]');
const field = (name, key, scope = 'current') => side(name, scope).querySelector('[data-control-field="' + key + '"] dd');
async function click(text, within = explorer()) {
  const button = [...within.querySelectorAll('button')].find(element => element.textContent.trim() === text);
  expect(button, text).toBeTruthy();
  await act(async () => button.click());
}
async function change(element, value) {
  const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function mount(seed = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'debrief', lastDebrief: flight(),
      debriefSampleIndex: 1, debriefCompareIndex: 0, totalFlightTime: 900, ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: update, awardXP: (...args) => xp.push(args),
      update: (id, key, value) => { writes.push({ [key]: value }); update(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); update(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  writes = []; xp = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Sky School paired recorded control evidence', () => {
  it('keeps actual reference and selected controls, vertical speed, state and sample times visible together', async () => {
    await mount();
    expect(side('reference').querySelector('h4').textContent).toBe('Reference conditions');
    expect(side('selected').querySelector('h4').textContent).toBe('Selected');
    expect(side('reference').querySelector('[data-control-observation-time]').textContent).toBe('Observation 1 of 3 · 0:00.0');
    expect(side('selected').querySelector('[data-control-observation-time]').textContent).toBe('Observation 2 of 3 · 0:02.0');
    expect(field('reference', 'pitch').textContent).toBe('8°'); expect(field('selected', 'pitch').textContent).toBe('-3°');
    expect(field('reference', 'bank').textContent).toBe('-4°'); expect(field('selected', 'bank').textContent).toBe('0°');
    expect(field('reference', 'throttle').textContent).toBe('30%'); expect(field('selected', 'throttle').textContent).toBe('70%');
    expect(field('reference', 'verticalSpeed').textContent).toBe('0 fpm'); expect(field('selected', 'verticalSpeed').textContent).toBe('-300 fpm');
    expect(field('reference', 'state').textContent).toBe('Airborne; no stall or low-airspeed advisory');
    expect(field('selected', 'state').textContent).toBe('Low airspeed advisory');
    expect(panel().querySelector('button, input, select, textarea')).toBeNull();
    expect(writes).toHaveLength(0); expect(xp).toHaveLength(0);
  });
  it('updates the selected side through native navigation while retaining the deliberately chosen reference', async () => {
    await mount({ debriefSampleIndex: 0 });
    await click('Use this moment for comparison'); await click('Next observation');
    expect(side('reference').dataset.controlObservationIndex).toBe('0');
    expect(side('selected').dataset.controlObservationIndex).toBe('1');
    await change(host.querySelector('#debrief-observation-time'), 2);
    expect(field('reference', 'throttle').textContent).toBe('30%'); expect(field('selected', 'throttle').textContent).toBe('0%');
    await click('Use this moment for comparison'); await click('Previous observation');
    expect(side('reference').dataset.controlObservationIndex).toBe('2');
    expect(side('selected').dataset.controlObservationIndex).toBe('1');
    expect(side('reference').getAttribute('aria-label')).toContain('0:04.0');
    expect(side('selected').getAttribute('aria-label')).toContain('0:02.0');
  });
  it('uses the recorded stall as the reference after a native normal-flow event jump', async () => {
    await mount({ lastDebrief: flight({ samples: stallSamples() }), debriefSampleIndex: 0, debriefCompareIndex: 0 });
    await change(host.querySelector('#debrief-recorded-event'), 1);
    expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(1);
    expect(field('reference', 'state').textContent).toBe('Stall');
    expect(field('selected', 'state').textContent).toBe('Airborne; no stall or low-airspeed advisory');
    expect(field('reference', 'pitch').textContent).toBe('10°'); expect(field('selected', 'pitch').textContent).toBe('-3°');
    expect(field('reference', 'throttle').textContent).toBe('20%'); expect(field('selected', 'throttle').textContent).toBe('70%');
    expect(side('reference').textContent).toContain('0:02.0'); expect(side('selected').textContent).toContain('0:04.0');
  });
  it('keeps unknown and invalid optional measurements distinct from recorded zero controls', async () => {
    const saved = [row(0, { pitch: null, bank: '0', throttle: 5, fpm: null, onGround: null, stalling: null, lowAirspeed: null }), row(2)];
    await mount({ lastDebrief: flight({ samples: saved }) });
    for (const key of ['pitch', 'bank', 'throttle', 'verticalSpeed', 'state']) expect(field('reference', key).textContent).toBe('Not recorded');
    expect(field('selected', 'pitch').textContent).toBe('0°'); expect(field('selected', 'bank').textContent).toBe('0°');
    expect(field('selected', 'throttle').textContent).toBe('0%'); expect(field('selected', 'verticalSpeed').textContent).toBe('0 fpm');
    expect(panel().textContent).not.toMatch(/Not recorded[%°]|Not recorded fpm|NaN|Infinity/);
  });
  it('marks rounded control values while retaining the exact saved value for inspection', async () => {
    await mount({ lastDebrief: flight({ samples: [row(0, { pitch: 8.126, bank: -4.256, throttle: .73456 }), row(2)] }) });
    expect(field('reference', 'pitch').textContent).toBe('≈8.1°');
    expect(field('reference', 'pitch').querySelector('span').title).toBe('8.126°');
    expect(field('reference', 'bank').textContent).toBe('≈-4.3°');
    expect(field('reference', 'throttle').textContent).toBe('≈73.5%');
  });
  it('shows a single recorded point on both sides without inventing a change or recording gap', async () => {
    await mount({ lastDebrief: flight({ samples: [row(12, { pitch: -2, throttle: .5 })] }), debriefSampleIndex: 99, debriefCompareIndex: -5 });
    expect(panel().dataset.controlComparisonSamePoint).toBe('true');
    expect(side('reference').querySelector('[data-control-observation-time]').textContent).toBe('Observation 1 of 1 · 0:12.0');
    expect(side('selected').querySelector('[data-control-observation-time]').textContent).toBe('Observation 1 of 1 · 0:12.0');
    expect(field('reference', 'pitch').textContent).toBe(field('selected', 'pitch').textContent);
    expect(panel().querySelector('[data-control-comparison-gap]')).toBeNull();
  });
  it('identifies only recording gaps crossed by the two moments without claiming a control effect through missing evidence', async () => {
    const saved = [row(0), row(2), row(10, { pitch: -3, throttle: .7 }), row(12)];
    await mount({ lastDebrief: flight({ samples: saved }), debriefSampleIndex: 1, debriefCompareIndex: 0 });
    expect(panel().querySelector('[data-control-comparison-gap]')).toBeNull();
    await change(host.querySelector('#debrief-observation-time'), 2);
    expect(panel().querySelector('[data-control-comparison-gap]').textContent).toContain('conditions between those points were not recorded');
    expect(field('selected', 'pitch').textContent).toBe('-3°');
    expect(panel().textContent).not.toMatch(/caused|improved|sustained recovery/i);
    await click('Use this moment for comparison'); await click('Next observation');
    expect(panel().querySelector('[data-control-comparison-gap]')).toBeNull();
  });
  it('follows canonical sorted observations and the last valid duplicate while excluding malformed rows', async () => {
    const saved = [row(4, { pitch: 5 }), { t: 1, pitch: 99 }, row(0, { pitch: 1 }), row(4, { pitch: -6, throttle: .9 }), row(2, { alt: NaN })];
    await mount({ lastDebrief: flight({ samples: saved }), debriefSampleIndex: 99, debriefCompareIndex: 0 });
    expect(side('reference').textContent).toContain('Observation 1 of 2 · 0:00.0');
    expect(side('selected').textContent).toContain('Observation 2 of 2 · 0:04.0');
    expect(field('reference', 'pitch').textContent).toBe('1°'); expect(field('selected', 'pitch').textContent).toBe('-6°');
    expect(field('selected', 'throttle').textContent).toBe('90%');
    expect(panel().textContent).not.toContain('99°');
  });
  it('leaves an invalid or empty log in its existing empty state without creating a comparison', async () => {
    await mount({ lastDebrief: flight({ samples: [{ t: 0, alt: NaN }] }) });
    expect(panel()).toBeNull(); expect(explorer().textContent).toContain('No recorded observations');
    expect(writes).toHaveLength(0); expect(xp).toHaveLength(0);
  });
  it('pairs earlier normal-flow event controls and preserves current selection, reference, explanation and history on reload', async () => {
    const earlier = flight({ attemptId: 'earlier-controls', samples: stallSamples(), reflection: 'Earlier explanation.' });
    await mount({ flightPracticeHistory: [earlier], debriefHistoryIndex: 0, debriefHistorySampleIndex: 0, debriefSampleIndex: 2, debriefCompareIndex: 0 });
    expect(panel('earlier')).toBeNull();
    await act(async () => host.querySelector('#debrief-earlier-recorded-event').closest('details').querySelector('summary').click());
    await change(host.querySelector('#debrief-earlier-recorded-event'), 1);
    expect(side('reference', 'earlier').textContent).toContain('0:02.0'); expect(side('selected', 'earlier').textContent).toContain('0:04.0');
    expect(field('reference', 'pitch', 'earlier').textContent).toBe('10°'); expect(field('selected', 'pitch', 'earlier').textContent).toBe('-3°');
    expect(field('reference', 'state', 'earlier').textContent).toBe('Stall');
    expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(0);
    await change(host.querySelector('#debrief-evidence-explanation'), 'Compare the recorded pitch and power before a fresh attempt.');
    const saved = JSON.parse(JSON.stringify(latest)), originalHistory = JSON.stringify(latest.flightPracticeHistory), originalLatest = JSON.stringify(latest.lastDebrief);
    await mount(saved);
    expect(panel('earlier')).toBeTruthy(); expect(field('selected', 'pitch', 'earlier').textContent).toBe('-3°');
    expect(side('selected').dataset.controlObservationIndex).toBe('2'); expect(side('reference').dataset.controlObservationIndex).toBe('0');
    expect(host.querySelector('#debrief-evidence-explanation').value).toBe(saved.lastDebrief.reflection);
    expect(JSON.stringify(latest.flightPracticeHistory)).toBe(originalHistory); expect(JSON.stringify(latest.lastDebrief)).toBe(originalLatest);
    expect(latest.totalFlightTime).toBe(900); expect(xp).toHaveLength(0);
    await act(async () => host.querySelector('[data-earlier-observation-step="previous"]').click());
    expect(panel('earlier')).toBeNull();
    expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(0);
  });
  it('does not create an earlier event pair across a recording gap or unknown airflow evidence', async () => {
    const earlier = flight({ attemptId: 'earlier-gap', samples: [row(0, { stalling: true, aoa: 18 }), row(10), row(12, { stalling: null })] });
    await mount({ flightPracticeHistory: [earlier], debriefHistoryIndex: 0, debriefHistorySampleIndex: 1 });
    expect(panel('earlier')).toBeNull();
    expect([...host.querySelector('#debrief-earlier-recorded-event').options].some(option => option.textContent.includes('Normal-flow'))).toBe(false);
    expect(writes).toHaveLength(0); expect(xp).toHaveLength(0);
  });
});
