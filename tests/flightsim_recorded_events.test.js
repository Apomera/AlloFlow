import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let FS, tool, root, host, latest;
const row = (t, patch = {}) => ({ t, lat: 43, lon: -70, alt: 5000, spd: 110, hdg: 90,
  aoa: 8, pitch: 0, onGround: false, stalling: false, lowAirspeed: false, ...patch });
const samples = () => [
  row(0), row(2, { lowAirspeed: true }), row(4, { lowAirspeed: true }),
  row(6, { aoa: 20, pitch: 10, stalling: true, lowAirspeed: true }),
  row(8, { aoa: 19, pitch: 5, stalling: true }),
  row(10, { aoa: 14.8 }), row(12, { aoa: 8, pitch: -2, alt: 4900 }),
];
async function mount(log = samples(), data = {}) {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [state, update] = React.useState({ flightSim: { view: 'debrief',
      lastDebrief: { aircraftId: 'cessna172', aircraft: 'Cessna 172 Skyhawk', samples: log, airborneSeconds: 12, landings: 0 }, ...data } });
    latest = state.flightSim;
    return tool.render(makeCtx({ toolData: state, setToolData: update,
      update: (id, key, value) => update(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => update(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function choose(value) {
  const select = host.querySelector('#debrief-recorded-event');
  await act(async () => {
    select.focus();
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); FS = window.__RR_TEST_EXPORTS__.flightSim;
  const context = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (object, key) => key in object ? object[key] : () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('SkySchool recorded event identification', () => {
  it('identifies advisory and stall runs once, then normal flow beyond the critical-angle boundary', () => {
    expect(FS.flightEvidenceEvents(samples())).toEqual([
      { kind: 'low_airspeed', index: 1, referenceIndex: null },
      { kind: 'stall', index: 3, referenceIndex: null },
      { kind: 'normal_after_stall', index: 6, referenceIndex: 3 },
    ]);
  });
  it('finds repeated stall episodes with their own comparison observations', () => {
    expect(FS.flightEvidenceEvents([row(0, { stalling: true, aoa: 20 }), row(2), row(4, { stalling: true, aoa: 20 }), row(6)]))
      .toEqual([
        { kind: 'stall', index: 0, referenceIndex: null }, { kind: 'normal_after_stall', index: 1, referenceIndex: 0 },
        { kind: 'stall', index: 2, referenceIndex: null }, { kind: 'normal_after_stall', index: 3, referenceIndex: 2 },
      ]);
  });
  it('does not treat ground readings or a new airborne session as recovery from the prior stall', () => {
    const found = FS.flightEvidenceEvents([row(0, { stalling: true, aoa: 20 }), row(2, { onGround: true, stalling: true, lowAirspeed: true }), row(4)]);
    expect(found).toEqual([{ kind: 'stall', index: 0, referenceIndex: null }]);
  });
  it('does not bridge unknown contact or airflow flags to invent recovery', () => {
    for (const unknown of [{ onGround: null }, { stalling: null }]) {
      expect(FS.flightEvidenceEvents([row(0, { stalling: true, aoa: 20 }), row(2, unknown), row(4)]))
        .toEqual([{ kind: 'stall', index: 0, referenceIndex: null }]);
    }
  });
  it('requires recorded angle and no low-airspeed advisory for normal-flow shortcuts', () => {
    const found = FS.flightEvidenceEvents([row(0, { stalling: true, aoa: 20 }), row(2, { aoa: null }), row(4, { lowAirspeed: true }), row(6)]);
    expect(found).toEqual([
      { kind: 'stall', index: 0, referenceIndex: null }, { kind: 'low_airspeed', index: 2, referenceIndex: null },
      { kind: 'normal_after_stall', index: 3, referenceIndex: 0 },
    ]);
  });
  it('indexes normalized chronological observations without mutating saved rows', () => {
    const log = [row(4), row(0, { stalling: true, aoa: 20 }), { t: 2, alt: NaN }];
    expect(FS.flightEvidenceEvents(log)).toEqual([
      { kind: 'stall', index: 0, referenceIndex: null }, { kind: 'normal_after_stall', index: 1, referenceIndex: 0 },
    ]);
    expect(log[0].t).toBe(4);
  });
  it('leaves legacy logs with unrecorded flags without invented events', () => {
    expect(FS.flightEvidenceEvents([{ t: 0, lat: 43, lon: -70, alt: 5000, spd: 110, hdg: 90 }])).toEqual([]);
    expect(FS.flightEvidenceEvents(null)).toEqual([]);
  });
});

describe('SkySchool event navigation', () => {
  it('jumps to measured stall and normal-flow samples and sets the relevant stall comparison', async () => {
    await mount();
    const select = host.querySelector('#debrief-recorded-event');
    expect(select.labels[0].textContent).toBe('Jump to a recorded event');
    expect([...select.options].map(option => option.textContent)).toEqual([
      'Choose a recorded event', 'Recorded low-airspeed advisory · 0:02.0', 'Recorded stall · 0:06.0', 'Normal-flow observation after stall · 0:12.0',
    ]);
    await choose('1');
    expect(latest.debriefSampleIndex).toBe(3);
    expect(host.querySelector('#debrief-observation-time').value).toBe('3');
    await choose('2');
    expect(latest).toMatchObject({ debriefSampleIndex: 6, debriefCompareIndex: 3 });
    expect(host.querySelector('[data-evidence-comparison]').textContent).toContain('Compared with 0:06.0: altitude -100 ft');
    expect(host.textContent).toContain('does not establish sustained recovery');
    expect(document.activeElement).toBe(select);
  });
  it('retains selected evidence moments across remount', async () => {
    await mount(); await choose('2');
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved.lastDebrief.samples, saved);
    expect(host.querySelector('#debrief-recorded-event').value).toBe('2');
    expect(host.querySelector('#debrief-observation-time').value).toBe('6');
    expect(latest.debriefCompareIndex).toBe(3);
  });
  it('disables event navigation for quiet or legacy observations without claiming no stall occurred', async () => {
    await mount([row(0), row(2)]);
    expect(host.querySelector('#debrief-recorded-event').disabled).toBe(true);
    expect(host.textContent).toContain('No identifiable events in these observations');
    await mount([{ t: 0, lat: 43, lon: -70, alt: 5000, spd: 110, hdg: 90 }]);
    expect(host.querySelector('#debrief-recorded-event').disabled).toBe(true);
    expect(host.textContent).not.toContain('No stall occurred');
  });
});
