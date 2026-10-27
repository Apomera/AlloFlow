import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, writes, errors;
const row = (t = 0, patch = {}) => ({ t, lat: 43.646, lon: -70.309, alt: 5000,
  spd: 110, hdg: 90, agl: 4924, fpm: -180, aoa: 8, pitch: -3,
  bank: 7, throttle: .42, onGround: false, stalling: false, lowAirspeed: false, ...patch });
const flight = (patch = {}) => ({ attemptId: 'latest-flight', aircraftId: 'cessna172', activityId: 'free_flight',
  startedAirborne: false, investigation: false, endedAt: '2026-10-21T12:00:00.000Z',
  flightTime: 30, airborneSeconds: 30, bestStableSeconds: 12, landings: 0,
  reflection: 'Latest explanation stays with this flight.', samples: [row(0), row(2), row(4)], ...patch });
const earlier = (patch = {}) => flight({ attemptId: 'earlier-flight',
  reflection: 'Earlier explanation stays with that flight.', samples: [
    row(0, { onGround: true, aoa: 0 }),
    row(2, { alt: 5100, spd: 90, aoa: 16, stalling: true, pitch: 10, bank: 12, throttle: .3 }),
    row(4, { alt: 5080, spd: 94, aoa: 13, lowAirspeed: true }),
    row(6, { alt: 5050, spd: 100, aoa: 8, pitch: -4, bank: 0, throttle: .7 }),
    row(8, { onGround: true, aoa: 0 }),
  ], ...patch });
const journal = () => host.querySelector('[aria-label="Flight practice journal"]');
const detail = () => journal().querySelector('[data-earlier-observation-details]');
const eventSelect = () => journal().querySelector('#debrief-earlier-recorded-event');
const step = direction => journal().querySelector('[data-earlier-observation-step="' + direction + '"]');
const field = name => [...detail().querySelectorAll('div')].find(item => item.querySelector('dt')?.textContent === name)?.querySelector('dd');
async function change(control, value) {
  expect(control).toBeTruthy();
  const prototype = control.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLSelectElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(control, String(value));
    control.dispatchEvent(new Event(control.tagName === 'INPUT' ? 'input' : 'change', { bubbles: true }));
  });
}
async function click(control) { expect(control).toBeTruthy(); await act(async () => control.click()); }
async function jump(label) {
  const option = [...eventSelect().options].find(item => item.textContent.startsWith(label));
  expect(option).toBeTruthy(); await change(eventSelect(), option.value);
}
async function mount(seed = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'debrief', lastDebrief: flight(),
      flightPracticeHistory: [earlier()], debriefSampleIndex: 2, debriefCompareIndex: 1, ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => { writes.push({ [key]: value }); setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); setData(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
  { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  writes = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Sky School earlier observation review', () => {
  it('shows the selected earlier altitude, height, airflow state and recorded inputs instead of current-flight values', async () => {
    await mount({ debriefHistorySampleIndex: 1 });
    expect(field('Altitude · ft MSL').textContent).toBe('5,100 ft');
    expect(field('Height above field').textContent).toBe('4,924 ft');
    expect(field('True airspeed · kts').textContent).toBe('90 kts');
    expect(field('Vertical speed').textContent).toBe('-180 fpm');
    expect(field('Angle of attack').textContent).toBe('16°');
    expect(field('Pitch input').textContent).toBe('10°');
    expect(field('Bank input').textContent).toBe('12°');
    expect(field('Throttle input').textContent).toBe('30%');
    expect(field('Recorded state').textContent).toBe('Stall');
    expect(journal().querySelector('table thead').textContent).toContain('Recorded state');
    expect(journal().querySelector('table tbody').textContent).toContain('Stall');
  });
  it('jumps to saved stall, advisory and normal-flow moments and compares normal flow with its earlier recorded stall', async () => {
    await mount(); const original = JSON.stringify(latest.flightPracticeHistory), current = JSON.stringify(latest.lastDebrief);
    await jump('Recorded stall'); expect(latest.debriefHistorySampleIndex).toBe(1);
    expect(field('Recorded state').textContent).toBe('Stall');
    await jump('Recorded low-airspeed advisory'); expect(latest.debriefHistorySampleIndex).toBe(2);
    expect(field('Recorded state').textContent).toBe('Low airspeed advisory');
    await jump('Normal-flow observation after stall'); expect(latest.debriefHistorySampleIndex).toBe(3);
    const comparison = journal().querySelector('[data-earlier-evidence-comparison]');
    expect(comparison.textContent).toContain('Compared with 0:02.0: altitude -50 ft; true airspeed +10 kts; angle of attack -8°');
    expect(field('Recorded state').textContent).toBe('Airborne; no stall or low-airspeed advisory');
    expect(journal().textContent).toContain('does not establish sustained recovery');
    expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(1);
    expect(JSON.stringify(latest.flightPracticeHistory)).toBe(original); expect(JSON.stringify(latest.lastDebrief)).toBe(current);
    expect(writes.every(patch => Object.keys(patch).every(key => key === 'debriefHistorySampleIndex'))).toBe(true);
  });
  it('browses the actual next and previous samples across a missing interval without inventing a linked normal-flow event', async () => {
    await mount({ flightPracticeHistory: [earlier({ samples: [row(0, { aoa: 16, stalling: true }), row(20)] })] });
    expect(step('previous').disabled).toBe(false); expect(step('previous').getAttribute('aria-disabled')).toBe('true'); expect(step('next').disabled).toBe(false); expect(step('next').getAttribute('aria-disabled')).toBe('false');
    expect([...eventSelect().options].some(option => option.textContent.startsWith('Normal-flow observation'))).toBe(false);
    await click(step('next'));
    expect(latest.debriefHistorySampleIndex).toBe(1);
    expect(journal().querySelector('#debrief-earlier-time').getAttribute('aria-valuetext')).toBe('0:20.0');
    expect(step('next').disabled).toBe(false); expect(step('next').getAttribute('aria-disabled')).toBe('true'); expect(journal().querySelector('[data-earlier-evidence-comparison]')).toBeNull();
    await click(step('previous')); expect(latest.debriefHistorySampleIndex).toBe(0);
    expect(field('Recorded state').textContent).toBe('Stall');
  });
  it('preserves an earlier event choice and every attempt explanation through a serialized remount', async () => {
    await mount(); await jump('Normal-flow observation after stall');
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved);
    expect(latest.debriefHistorySampleIndex).toBe(3); expect(eventSelect().selectedOptions[0].textContent).toContain('Normal-flow observation');
    expect(field('Throttle input').textContent).toBe('70%');
    expect(journal().querySelector('[data-earlier-evidence-comparison]').textContent).toContain('0:02.0');
    expect(latest.lastDebrief).toEqual(saved.lastDebrief); expect(latest.flightPracticeHistory).toEqual(saved.flightPracticeHistory);
    expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(1);
    expect(journal().textContent).toContain('Earlier explanation stays with that flight.');
    expect(host.querySelector('#debrief-evidence-explanation').value).toBe('Latest explanation stays with this flight.');
  });
  it('keeps each earlier attempt’s own event list and resets its observation when the history selection changes', async () => {
    const second = earlier({ attemptId: 'second-earlier', reflection: 'Second explanation.', samples: [row(12, { alt: 1234, onGround: true })] });
    await mount({ flightPracticeHistory: [earlier(), second], debriefHistoryIndex: 0 });
    await jump('Recorded stall');
    await change(journal().querySelector('#debrief-earlier-flight'), 1);
    expect(latest.debriefHistorySampleIndex).toBe(0); expect(field('Altitude · ft MSL').textContent).toBe('1,234 ft');
    expect(field('Recorded state').textContent).toBe('On ground'); expect(eventSelect().disabled).toBe(true);
    expect(step('previous').disabled).toBe(false); expect(step('previous').getAttribute('aria-disabled')).toBe('true'); expect(step('next').disabled).toBe(false); expect(step('next').getAttribute('aria-disabled')).toBe('true');
    expect(journal().textContent).toContain('Second explanation.');
    expect(latest.flightPracticeHistory[0].reflection).toBe('Earlier explanation stays with that flight.');
    expect(latest.debriefSampleIndex).toBe(2); expect(latest.debriefCompareIndex).toBe(1);
  });
  it('marks rounded earlier angles and their event difference while preserving raw saved values', async () => {
    await mount({ flightPracticeHistory: [earlier({ samples: [row(0, { aoa: 15.04, stalling: true }), row(2, { aoa: 11.96 })] })] });
    expect(field('Angle of attack').textContent).toBe('≈15°');
    expect(field('Angle of attack').querySelector('span').title).toBe('15.04°');
    expect(journal().querySelector('table tbody [title="15.04°"]')).toBeTruthy();
    expect(field('Recorded state').textContent).toBe('Stall');
    await jump('Normal-flow observation after stall');
    const comparison = journal().querySelector('[data-earlier-evidence-comparison]');
    expect(comparison.textContent).toContain('angle of attack ≈-3.1°');
    expect(Number.parseFloat(comparison.title)).toBeCloseTo(-3.08, 8);
    expect(latest.flightPracticeHistory[0].samples[0].aoa).toBe(15.04);
  });
  it('keeps missing older telemetry and rotor angles unrecorded rather than reconstructing them', async () => {
    const legacy = { t: 0, lat: 43.646, lon: -70.309, alt: 1000, spd: 90, hdg: 90 };
    await mount({ flightPracticeHistory: [earlier({ aircraftId: 'drone', samples: [legacy] })] });
    for (const name of ['Height above field', 'Vertical speed', 'Angle of attack', 'Pitch input', 'Bank input', 'Throttle input', 'Recorded state']) {
      expect(field(name).textContent).toBe('Not recorded');
    }
    expect(eventSelect().disabled).toBe(true); expect(eventSelect().options[0].textContent).toContain('No identifiable events');
    expect(journal().querySelector('[data-earlier-evidence-comparison]')).toBeNull();
  });
  it.each([
    ['ground', { onGround: true, stalling: true, lowAirspeed: true }, 'On ground'],
    ['stall', { stalling: true, lowAirspeed: true }, 'Stall'],
    ['advisory', { stalling: false, lowAirspeed: true }, 'Low airspeed advisory'],
    ['unknown', { onGround: null, stalling: null, lowAirspeed: null }, 'Not recorded'],
  ])('uses the saved %s state without inferring it from angle or airspeed', async (_name, patch, expected) => {
    await mount({ flightPracticeHistory: [earlier({ samples: [row(0, { aoa: 8, spd: 130, ...patch })] })] });
    expect(field('Recorded state').textContent).toBe(expected);
    expect(journal().querySelector('table tbody').textContent).toContain(expected);
  });
  it('leaves an earlier geography or mission review available when there are no aircraft observations', async () => {
    const route = api.SPRINT_ROUTES.find(item => item.id === 'americas');
    await mount({ flightPracticeHistory: [earlier({ aircraftId: 'sr71', activityId: 'geography_sprint', startedAirborne: true,
      sprintRouteId: route.id, samples: [], sprint: { routeId: route.id, status: 'ended', elapsedSeconds: 20,
        results: [{ place: route.places[1], answer: route.places[1], expected: route.places[1] }] } })] });
    expect(journal().querySelector('[data-flight-sprint-summary="earlier"]')).toBeTruthy();
    expect(journal().textContent).toContain('No recorded observations are available for this earlier attempt.');
    expect(detail()).toBeNull(); expect(eventSelect()).toBeNull(); expect(step('next')).toBeNull();
  });
  it('uses labelled native controls that can receive keyboard focus without moving the current flight explorer', async () => {
    await mount();
    const details = journal().querySelector('details'); details.open = true;
    const label = journal().querySelector('label[for="debrief-earlier-recorded-event"]');
    expect(label.textContent).toBe('Jump to a recorded event');
    eventSelect().focus(); expect(document.activeElement).toBe(eventSelect());
    step('next').focus(); expect(document.activeElement).toBe(step('next'));
    await click(step('next'));
    expect(latest.debriefHistorySampleIndex).toBe(1); expect(latest.debriefSampleIndex).toBe(2);
    expect(latest.lastDebrief.reflection).toBe('Latest explanation stays with this flight.');
  });
  it('exports the same complete earlier evidence after browsing and keeps exact saved inputs', async () => {
    const savedEarlier = earlier(); await mount({ flightPracticeHistory: [savedEarlier] }); await jump('Normal-flow observation after stall');
    let csv;
    vi.stubGlobal('Blob', class { constructor(parts) { csv = parts[0]; } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:earlier-review'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await click([...journal().querySelectorAll('button')].find(button => button.textContent === 'Download earlier observations (CSV)'));
    expect(csv).toBe(api.flightEvidenceCsv(savedEarlier.samples));
    expect(latest.flightPracticeHistory[0]).toEqual(savedEarlier);
  });
});
