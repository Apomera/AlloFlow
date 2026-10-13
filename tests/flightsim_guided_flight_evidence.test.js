import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, tool, latest;

const samples = () => [
  { time: 0, aoa: 8, airspeed: 110, altitude: 5000, state: 'normal' },
  { time: 1.2, aoa: 20, airspeed: 96, altitude: 4912, state: 'stall' },
  { time: 2.25, aoa: 14, airspeed: 99, altitude: 4800, state: 'boundary' },
  { time: 3.5, aoa: 8, airspeed: 101, altitude: 4700, state: 'normal' },
];
const record = (patch = {}) => ({
  phase: 'transfer', prediction: 'speed', hypothesis: 'I expected speed to control a stall.',
  observations: [
    { airspeed: 130, altitude: 5000, aoa: 8 },
    { airspeed: 130, altitude: 5000, aoa: 20 },
    { airspeed: 80, altitude: 5000, aoa: 20 },
  ],
  explanation: 'The controlled trials changed angle alone, then airspeed alone.',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 1,
  completedAt: '2026-10-10T12:00:00.000Z',
  flight: { status: 'ended', sawStall: true, recovered: false, recoverySeconds: 1, samples: samples() },
  ...patch,
});

async function mount(saved = record(), extra = {}, context = {}) {
  if (root) await act(async () => root.unmount());
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: saved, ...extra } });
    latest = data.flightSim;
    return tool.render(makeCtx({
      toolData: data, setToolData: updateData,
      update: (id, key, value) => updateData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => updateData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
      ...context,
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}

const viewer = () => host.querySelector('section[aria-label="Recorded flight practice"]');
const selector = () => host.querySelector('#stall-practice-observation');
function button(text) {
  const result = [...host.querySelectorAll('button')].find(element => element.textContent === text);
  expect(result, `Button: ${text}`).toBeTruthy();
  return result;
}
async function click(text) { await act(async () => button(text).click()); }
async function choose(index) {
  const element = selector();
  expect(element).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(index));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function readout() {
  return Object.fromEntries([...viewer().querySelectorAll('dl > div')].map(element => [element.querySelector('dt').textContent, element.querySelector('dd').textContent]));
}

beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab();
  window.__testHooks = {};
  window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  delete window.__testHooks;
  delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SkySchool optional flight practice evidence', () => {
  it('keeps optional practice honest when no flight was started', async () => {
    await mount(record({ flight: null }));
    expect(viewer().textContent).toContain('No flight practice has been recorded.');
    expect(viewer().textContent).toContain('without a flight');
    expect(selector()).toBeNull();
    expect(viewer().querySelector('table')).toBeNull();
    expect(button('Complete investigation').disabled).toBe(false);
  });

  it('does not manufacture points or a recovery from malformed legacy flight evidence', async () => {
    await mount(record({ flight: { status: 'complete', sawStall: true, recovered: true, recoverySeconds: 1,
      samples: [null, {}, { time: '1', aoa: 20, airspeed: 80, altitude: 4900 }, { time: 181, aoa: 8, airspeed: 110, altitude: 4800 }] } }));
    expect(viewer().textContent).toContain('no usable saved observations');
    expect(selector()).toBeNull();
    expect(host.textContent).toContain('Session: interrupted');
    expect(host.textContent).not.toContain('Flight evidence: stall observed, then five seconds');
  });

  it('shows exact recorded values and recomputes flow state from the saved angle', async () => {
    await mount(record({ flight: { status: 'ended', sawStall: true, samples: [
      { ...samples()[2], state: 'stall' },
      { time: 4.125, aoa: -20, airspeed: 103.75, altitude: 4700.5, state: 'normal' },
      { time: NaN, aoa: 8, airspeed: 100, altitude: 4600 },
    ] } }));
    expect(selector().max).toBe('1');
    expect(readout()).toEqual({ 'Time (s)': '2.25', 'AoA (°)': '14', 'True airspeed (kts)': '99', 'Altitude MSL (ft)': '4800', 'Flow state': 'boundary' });
    await choose(1);
    expect(readout()).toEqual({ 'Time (s)': '4.125', 'AoA (°)': '-20', 'True airspeed (kts)': '103.75', 'Altitude MSL (ft)': '4700.5', 'Flow state': 'stall' });
    expect(selector().getAttribute('aria-valuetext')).toContain('4.125 s');
    expect(viewer().querySelector('tbody tr[aria-current="true"]').textContent).toContain('4.125');
  });

  it('marks rounded angle displays without rounding the saved value or changing its flow state', async () => {
    const angles = [14.999, 0.450636344759292];
    await mount(record({ flight: { status: 'ended', sawStall: false, samples: [
      { time: 0, aoa: angles[0], airspeed: 100, altitude: 5000 },
      { time: 1, aoa: angles[1], airspeed: 101, altitude: 4900 },
    ] } }));
    expect(readout()['AoA (°)']).toBe('≈15');
    expect(readout()['Flow state']).toBe('boundary');
    expect(viewer().querySelectorAll('dd')[1].title).toBe('14.999°');
    expect(viewer().querySelector('tbody td').textContent).toBe('≈15');
    expect(viewer().querySelector('tbody td').title).toBe('14.999°');
    expect(button('First recorded stall point').disabled).toBe(true);
    expect(button('Normal flow after stall').disabled).toBe(true);
    await choose(1);
    expect(readout()['AoA (°)']).toBe('≈0.45');
    expect(readout()['Flow state']).toBe('normal');
    expect(viewer().querySelectorAll('dd')[1].title).toBe(angles[1] + '°');
    expect(latest.stallInvestigation.flight.samples.map(row => row.aoa)).toEqual(angles);
    expect(viewer().textContent).toContain('flow states use the saved angle before rounding');
  });

  it('uses the native selector without changing the investigation or stealing keyboard focus', async () => {
    await mount();
    const saved = JSON.parse(JSON.stringify(latest.stallInvestigation));
    selector().focus();
    await choose(2);
    expect(selector().value).toBe('2');
    expect(selector().getAttribute('aria-valuetext')).toBe('Observation 3 of 4 at 2.25 s · boundary flow.');
    expect(latest.stallPracticeSampleIndex).toBe(2);
    expect(latest.stallInvestigation).toEqual(saved);
    expect(document.activeElement).toBe(selector());
    const region = viewer().querySelector('[role="region"]');
    expect(region.tabIndex).toBe(0);
    expect(region.style.overflowX).toBe('auto');
    expect(region.getAttribute('aria-label')).toBe('Flight practice observations table');
    expect(viewer().querySelectorAll('thead th[scope="col"]')).toHaveLength(5);
    expect(viewer().querySelectorAll('tbody th[scope="row"]')).toHaveLength(4);
  });

  it('jumps to the first recorded stall and then a recorded normal-flow point after it', async () => {
    await mount();
    await click('First recorded stall point');
    expect(latest.stallPracticeSampleIndex).toBe(1);
    expect(readout()['Flow state']).toBe('stall');
    await click('Normal flow after stall');
    expect(latest.stallPracticeSampleIndex).toBe(3);
    expect(readout()['Time (s)']).toBe('3.5');
    expect(readout()['Flow state']).toBe('normal');
    expect(viewer().textContent).toContain('One normal-flow point does not establish sustained recovery.');
    expect(latest.stallInvestigation.flight).toMatchObject({ status: 'ended', recovered: false, recoverySeconds: 1 });
    expect(host.textContent).toContain('sustained recovery not yet recorded');
  });

  it('orders saved observations by time before looking for normal flow after a stall', async () => {
    await mount(record({ flight: { status: 'ended', sawStall: true, samples: [
      { ...samples()[1], time: 20 }, { ...samples()[0], time: 10 },
    ] } }));
    expect(readout()['Time (s)']).toBe('10');
    expect([...viewer().querySelectorAll('tbody th[scope="row"]')].map(element => element.textContent)).toEqual(['10', '20']);
    await click('First recorded stall point');
    expect(readout()['Time (s)']).toBe('20');
    expect(button('Normal flow after stall').disabled).toBe(true);
    expect(host.textContent).toContain('sustained recovery not yet recorded');
  });

  it('keeps only the last valid observation at a repeated timestamp', async () => {
    await mount(record({ flight: { status: 'ended', sawStall: true, samples: [
      { ...samples()[1], time: 20 }, { ...samples()[0], time: 10 },
      { ...samples()[3], time: 20, airspeed: 105 },
      { ...samples()[1], time: 20, airspeed: null },
    ] } }));
    expect(selector().max).toBe('1');
    await choose(1);
    expect(readout()).toMatchObject({ 'Time (s)': '20', 'True airspeed (kts)': '105', 'Flow state': 'normal' });
    expect(viewer().querySelectorAll('tbody tr')).toHaveLength(2);
    expect(button('First recorded stall point').disabled).toBe(true);
    expect(button('Normal flow after stall').disabled).toBe(true);
  });

  it.each([[14.96, 'boundary'], [-14.96, 'boundary'], [11.96, 'normal'], [15.04, 'stall']])('preserves captured AoA %s and its %s state across save and reopen', async (aoa, expectedState) => {
    const FS = window.__RR_TEST_EXPORTS__.flightSim;
    const captured = FS.advanceStallFlight({ status: 'active' }, {
      aoa, speed: 100 / 0.5924838, altitude: 4900, onGround: false, stalling: expectedState === 'stall',
    }, 0.1, 1);
    expect(captured.samples[0]).toMatchObject({ aoa, state: expectedState });
    const saved = JSON.parse(JSON.stringify(captured));
    const normalized = FS.stallInvestigationRecord({ flight: saved }).flight;
    expect(normalized.samples[0]).toMatchObject({ aoa, state: expectedState });
    await mount(record({ flight: saved }));
    expect(readout()['AoA (°)']).toBe(String(aoa));
    expect(readout()['Flow state']).toBe(expectedState);
    expect(button('First recorded stall point').disabled).toBe(expectedState !== 'stall');
  });

  it.each([
    { rows: [samples()[0]], stall: false, normal: false },
    { rows: [samples()[0], samples()[1], samples()[2]], stall: true, normal: false },
  ])('disables shortcuts when the needed observation was not retained: %j', async ({ rows, stall, normal }) => {
    await mount(record({ flight: { status: 'ended', sawStall: stall, samples: rows } }));
    expect(button('First recorded stall point').disabled).toBe(!stall);
    expect(button('Normal flow after stall').disabled).toBe(!normal);
    if (rows.length === 1) expect(selector().disabled).toBe(true);
  });

  it.each([[999, '3'], [-10, '0'], ['broken', '0']])('bounds a persisted observation index %s to %s', async (index, expected) => {
    await mount(record(), { stallPracticeSampleIndex: index });
    expect(selector().value).toBe(expected);
    expect(viewer().querySelectorAll('tbody tr[aria-current="true"]')).toHaveLength(1);
  });

  it('limits the retained record and shows the selected group rather than hiding late observations', async () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({ time: index, aoa: index % 2 ? 20 : 8, airspeed: 100 + index / 10, altitude: 5000 - index }));
    await mount(record({ flight: { status: 'time-limit', sawStall: true, samples: rows.reverse() } }));
    expect(selector().max).toBe('89');
    expect(readout()['Time (s)']).toBe('10');
    expect(viewer().textContent).toContain('latest 90 observations');
    expect(viewer().textContent).toContain('first retained observation is at 10 s');
    expect(viewer().querySelector('caption').textContent).toContain('1–10 of 90');
    expect(viewer().querySelectorAll('tbody tr')).toHaveLength(10);
    await choose(89);
    expect(readout()['Time (s)']).toBe('99');
    expect(viewer().querySelector('caption').textContent).toContain('81–90 of 90');
    expect(viewer().querySelector('tbody tr[aria-current="true"] th').textContent).toBe('99');
  });

  it('preserves the selected observation through completion, review, and a full remount', async () => {
    await mount();
    await choose(2);
    await click('Complete investigation');
    expect(host.querySelector('[aria-current="step"]').textContent).toBe('Review');
    expect(selector().value).toBe('2');
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved.stallInvestigation, saved);
    expect(selector().value).toBe('2');
    expect(readout()['Time (s)']).toBe('2.25');
    expect(host.textContent).toContain('Investigation complete:');
    expect(host.textContent).toContain('sustained recovery not yet observed');
  });

  it('resets observation navigation on retry and shows the new empty session after return', async () => {
    await mount(record(), { stallPracticeSampleIndex: 3 });
    await click('Try flight practice again');
    expect(latest.view).toBe('flying');
    expect(latest.stallPracticeSampleIndex).toBe(0);
    expect(latest.stallInvestigation.flight).toMatchObject({ status: 'active', sawStall: false, samples: [] });
    await click('Return to investigation');
    expect(latest.view).toBe('stallHunt');
    expect(viewer().textContent).toContain('no usable saved observations');
    expect(selector()).toBeNull();
    expect(latest.stallInvestigation.observations).toHaveLength(3);
  });

  it('keeps interrupted samples readable without interpreting one normal point as recovery', async () => {
    await mount(record({ flight: { status: 'interrupted', sawStall: true, recovered: false, recoverySeconds: 0, samples: samples() } }));
    expect(viewer().textContent).toContain('This practice was interrupted.');
    await click('Normal flow after stall');
    expect(readout()['Flow state']).toBe('normal');
    expect(host.textContent).not.toContain('Flight evidence: stall observed, then five seconds');
    expect(host.textContent).toContain('Session: interrupted');
  });

  it('keeps the overall completed session result separate from whichever point is selected', async () => {
    await mount(record({ flight: { status: 'complete', sawStall: true, recovered: true, recoverySeconds: 5, samples: samples() } }));
    await click('First recorded stall point');
    expect(readout()['Flow state']).toBe('stall');
    expect(host.textContent).toContain('Flight evidence: stall observed, then five seconds of normal flow.');
    expect(latest.stallInvestigation.flight.recovered).toBe(true);
  });
});
