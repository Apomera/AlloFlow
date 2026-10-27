import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, root, host, latest, writes;
const sample = (t, aoa, patch = {}) => ({ t, lat: 43.646, lon: -70.309, alt: 3000, spd: 100, hdg: 90,
  agl: 2924, fpm: 0, aoa, pitch: 0, bank: 0, throttle: .5,
  onGround: false, stalling: false, lowAirspeed: false, ...patch });
const flight = (attemptId, samples) => ({ attemptId, aircraftId: 'cessna172', aircraft: 'Cessna 172 Skyhawk',
  activityId: 'free_flight', investigation: false, startedAirborne: true, flightTime: 30,
  airborneSeconds: 30, endedAt: '2026-10-26T12:00:00.000Z', samples });
const panel = (scope = 'current') => host.querySelector('[data-flight-exact-angles="' + scope + '"]');
const field = (key, scope = 'current') => panel(scope)?.querySelector('[data-exact-angle="' + key + '"]');
async function change(element, value) {
  await act(async () => {
    const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function mount(patch = {}) {
  function App() {
    const [data, update] = React.useState({ flightSim: { view: 'debrief',
      lastDebrief: flight('current-precision', [sample(0, 14.996), sample(2, 15.004)]),
      debriefSampleIndex: 1, debriefCompareIndex: 0, ...patch } });
    latest = data.flightSim;
    const save = fn => { writes.push(true); update(fn); };
    return tool.render(makeCtx({ toolData: data, setToolData: save,
      update: (id, key, value) => save(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, values) => save(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  new Function(readFileSync(resolve('stem_lab/stem_data_skyschool_geo.js'), 'utf8'))();
  new Function(readFileSync(resolve(process.env.SKYSCHOOL_EVIDENCE_PRECISION_SOURCE || 'stem_lab/stem_tool_flightsim.js'), 'utf8'))();
  tool = window.StemLab._registry.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host); writes = [];
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); root = null;
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('saved flight angles available without hover', () => {
  it('offers one native disclosure with exact selected, reference, and change values', async () => {
    await mount();
    expect(panel()?.tagName).toBe('DETAILS');
    expect(panel().querySelector(':scope > summary').textContent).toBe('Exact saved angles');
    expect(panel().querySelector(':scope > summary').style.minHeight).toBe('44px');
    expect(field('selected').textContent).toBe('15.004 degrees');
    expect(field('reference').textContent).toBe('14.996 degrees');
    expect(field('change').textContent).toBe('+' + String(15.004 - 14.996) + ' degrees');
    expect(panel().textContent).toContain('0:02.0'); expect(panel().textContent).toContain('0:00.0');
    expect(panel().querySelectorAll('summary')).toHaveLength(1);
  });
  it('keeps compact rounded values, while opening precision never rewrites flight evidence', async () => {
    await mount(); const before = JSON.stringify(latest.lastDebrief), initialWrites = writes.length;
    expect(host.querySelector('[aria-label="Flight evidence explorer"]').textContent).toContain('≈15°');
    expect(panel()).toBeTruthy();
    await act(async () => panel().querySelector('summary').click());
    expect(JSON.stringify(latest.lastDebrief)).toBe(before);
    expect(writes.length).toBe(initialWrites);
    expect(panel().querySelector('[role="status"],[aria-live],output')).toBeNull();
  });
  it('updates exact values when navigating observations and preserves the chosen comparison', async () => {
    await mount(); expect(panel()).toBeTruthy();
    panel().open = true;
    await change(host.querySelector('#debrief-observation-time'), 0);
    expect(field('selected').textContent).toBe('14.996 degrees');
    expect(field('reference').textContent).toBe('14.996 degrees');
    expect(field('change').textContent).toBe('0 degrees');
    expect(panel().open).toBe(true);
  });
  it('keeps missing angles distinct from a saved zero', async () => {
    await mount({ lastDebrief: flight('missing-precision', [sample(0, null), sample(2, 0)]) });
    expect(field('selected')?.textContent).toBe('0 degrees');
    expect(field('reference').textContent).toBe('Not recorded');
    expect(field('change').textContent).toBe('Not recorded');
  });
  it('provides exact earlier angles and the stall reference after a normal-flow event jump', async () => {
    const earlier = flight('earlier-precision', [sample(0, 16.125, { stalling: true }), sample(2, 11.9375)]);
    await mount({ flightPracticeHistory: [earlier], debriefHistoryIndex: 0, debriefHistorySampleIndex: 1 });
    expect(panel('earlier')?.tagName).toBe('DETAILS');
    expect(field('selected', 'earlier').textContent).toBe('11.9375 degrees');
    expect(field('reference', 'earlier').textContent).toBe('16.125 degrees');
    expect(field('change', 'earlier').textContent).toBe('-4.1875 degrees');
    expect(panel('earlier').textContent).not.toContain('Hover');
  });
  it('does not invent a comparison for earlier observations without a reference event', async () => {
    await mount({ flightPracticeHistory: [flight('earlier-plain', [sample(0, 7.9375), sample(2, 8.0625)])],
      debriefHistoryIndex: 0, debriefHistorySampleIndex: 0 });
    expect(field('selected', 'earlier')?.textContent).toBe('7.9375 degrees');
    expect(field('reference', 'earlier')).toBeNull(); expect(field('change', 'earlier')).toBeNull();
  });
  it('uses native disclosure focus styling without adding a focus stop for every table cell', async () => {
    await mount(); expect(panel()).toBeTruthy();
    expect([...host.querySelectorAll('style')].map(node => node.textContent).join('\n'))
      .toContain('[data-flight-exact-angles]>summary:focus-visible');
    expect(panel().querySelector('input,button,[tabindex]')).toBeNull();
    expect(host.querySelector('table').querySelector('button,[tabindex]')).toBeNull();
  });
});
