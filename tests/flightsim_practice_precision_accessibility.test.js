import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, host, root, latest, errors;
const sample = (time, aoa) => ({ time, aoa, airspeed: 100, altitude: 5000 });
const flight = rows => ({ status: 'ended', sawStall: true, recovered: false, recoverySeconds: 0, samples: rows });
const investigation = extra => ({ phase: 'review', prediction: 'angle', hypothesis: 'Saved idea.',
  observations: [{ airspeed: 130, altitude: 5000, aoa: 8 }, { airspeed: 130, altitude: 5000, aoa: 20 }, { airspeed: 80, altitude: 5000, aoa: 20 }],
  explanation: 'The observations changed one variable at a time.', transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 1,
  completedAt: '2026-10-26T12:00:00.000Z', ...extra });
const viewer = scope => host.querySelector('[data-stall-practice-evidence="' + scope + '"]');
const details = scope => viewer(scope)?.querySelector('[data-flight-exact-angles="practice-' + scope + '"]');
const exact = scope => details(scope)?.querySelector('[data-exact-angle="selected"]');
const range = scope => host.querySelector(scope === 'earlier' ? '#stall-earlier-practice-observation' : '#stall-practice-observation');
const fields = scope => Object.fromEntries([...viewer(scope).querySelectorAll('dl > div')].map(node => [node.querySelector('dt').textContent, node.querySelector('dd').textContent]));
function load() {
  if (!process.env.SKYSCHOOL_PRACTICE_PRECISION_SOURCE) return loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  new Function(readFileSync(resolve('stem_lab/stem_data_skyschool_geo.js'), 'utf8'))();
  new Function(readFileSync(resolve(process.env.SKYSCHOOL_PRACTICE_PRECISION_SOURCE), 'utf8'))();
  return window.StemLab._registry.flightSim;
}
async function mount({ current = [sample(0, 14.999), sample(1, 0.450636344759292)], earlier = [sample(0, 15.004), sample(2, -14.999)], t } = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: investigation({
      flight: flight(current), attempts: [investigation({ flight: flight(earlier) })]
    }), stallPracticeSampleIndex: 0, stallHistoryPracticeSampleIndex: 0 } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...(t ? { t } : {}),
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function choose(scope, index) {
  const node = range(scope);
  await act(async () => {
    node.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(index));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = load();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove();
  expect(errors).not.toHaveBeenCalled(); delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('guided practice exact angle access', () => {
  it.each([['current', '14.999', 'boundary'], ['earlier', '15.004', 'stall']])('exposes saved precision through a quiet native %s disclosure', async (scope, angle, flow) => {
    await mount();
    expect(details(scope)?.tagName).toBe('DETAILS');
    const summary = details(scope).querySelector('summary');
    expect(summary.textContent).toBe((scope === 'earlier' ? 'Earlier: ' : '') + 'Exact saved angles');
    expect(parseFloat(summary.style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(exact(scope).textContent).toBe('Angle of attack: ' + angle + ' degrees');
    expect(details(scope).textContent).toContain('rounded to two decimal places');
    expect(exact(scope).closest('[role="status"],[aria-live="polite"],[aria-live="assertive"]')).toBeNull();
    expect(fields(scope)['AoA (°)']).toBe('≈15');
    expect(fields(scope)['Flow state']).toBe(flow);
  });

  it.each(['current', 'earlier'])('preserves open precision and records when browsing %s observations', async scope => {
    await mount();
    expect(details(scope)).toBeTruthy();
    const node = details(scope), before = structuredClone(latest.stallInvestigation);
    await act(async () => { node.open = true; node.dispatchEvent(new Event('toggle')); });
    await choose(scope, 1);
    expect(details(scope)).toBe(node); expect(node.open).toBe(true);
    const expected = scope === 'current' ? '0.450636344759292' : '-14.999';
    expect(exact(scope).textContent).toBe('Angle of attack: ' + expected + ' degrees');
    expect(document.activeElement).toBe(range(scope));
    expect(latest.stallInvestigation).toEqual(before);
    expect(exact(scope === 'current' ? 'earlier' : 'current').textContent).toContain(scope === 'current' ? '15.004' : '14.999');
  });

  it('uses the same accessible precision for event jumps without marking sustained recovery', async () => {
    await mount({ current: [sample(0, 15.004), sample(2, 8.123456)] });
    expect(details('current')).toBeTruthy();
    await act(async () => viewer('current').querySelector('[data-stall-practice-jump="normal"]').click());
    expect(exact('current').textContent).toBe('Angle of attack: 8.123456 degrees');
    expect(viewer('current').textContent).toContain('One normal-flow point does not establish sustained recovery.');
    expect(latest.stallInvestigation.flight.recovered).toBe(false);
  });

  it('does not invent precise values for missing or rejected observations', async () => {
    await mount({ current: [], earlier: [{ time: 0, aoa: NaN, airspeed: 100, altitude: 5000 }] });
    expect(viewer('current')).toBeTruthy(); expect(viewer('earlier')).toBeTruthy();
    expect(details('current')).toBeNull(); expect(details('earlier')).toBeNull();
    expect(host.textContent).not.toContain('NaN degrees');
  });

  it('reuses localized names and degree text without changing saved precision', async () => {
    const labels = { 'stem.flightsim.evidence_exact_angles': 'Genaue gespeicherte Winkel',
      'stem.flightsim.journal_earlier_value': 'Früher: {value}', 'stem.flightsim.guided_angle_label': 'Anstellwinkel',
      'stem.flightsim.tap_degrees_value': '{value} Grad' };
    await mount({ t: (key, fallback) => labels[key] || fallback });
    expect(details('earlier')?.querySelector('summary').textContent).toBe('Früher: Genaue gespeicherte Winkel');
    expect(exact('current').textContent).toBe('Anstellwinkel: 14.999 Grad');
    expect(latest.stallInvestigation.flight.samples[0].aoa).toBe(14.999);
  });
});
