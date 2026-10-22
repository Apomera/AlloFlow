import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, writes, errors, awardXP, celebrate;
const samples = () => [
  { time: 0, aoa: 8, airspeed: 110, altitude: 5000, state: 'normal' },
  { time: 1.2, aoa: 20, airspeed: 96, altitude: 4912, state: 'normal' },
  { time: 2.25, aoa: 14, airspeed: 99, altitude: 4800, state: 'stall' },
  { time: 3.5, aoa: 8, airspeed: 101, altitude: 4700, state: 'stall' },
];
const flight = (patch = {}) => ({ status: 'ended', sawStall: true, recovered: false, recoverySeconds: 1, samples: samples(), ...patch });
const investigation = (patch = {}) => ({ phase: 'review', prediction: 'angle', hypothesis: 'Current starting idea.',
  observations: [{ airspeed: 130, altitude: 5000, aoa: 8 }, { airspeed: 130, altitude: 5000, aoa: 20 }, { airspeed: 80, altitude: 5000, aoa: 20 }],
  explanation: 'Current explanation stays with this attempt.', transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 1,
  completedAt: '2026-10-21T12:00:00.000Z', flight: flight({ samples: samples().map(item => ({ ...item, altitude: item.altitude + 1000 })) }), ...patch });
const archived = (patch = {}) => investigation({ hypothesis: 'Earlier starting idea.', explanation: 'Earlier explanation uses these flight observations.',
  completedAt: '2026-10-20T12:00:00.000Z', flight: flight(), ...patch });
const notebook = () => host.querySelector('[aria-label="Investigation notebook"]');
const viewer = (scope = 'earlier') => host.querySelector('[data-stall-practice-evidence="' + scope + '"]');
const selector = (scope = 'earlier') => host.querySelector(scope === 'earlier' ? '#stall-earlier-practice-observation' : '#stall-practice-observation');
const jump = (kind, scope = 'earlier') => viewer(scope).querySelector('[data-stall-practice-jump="' + kind + '"]');
const fields = (scope = 'earlier') => Object.fromEntries([...viewer(scope).querySelectorAll('dl > div')].map(item => [item.querySelector('dt').textContent, item.querySelector('dd').textContent]));
function button(text) {
  const node = [...host.querySelectorAll('button')].find(item => item.textContent === text);
  expect(node, 'Button: ' + text).toBeTruthy(); return node;
}
function handler(node, event) { return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][event]; }
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function change(node, value) {
  expect(node).toBeTruthy();
  const prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function mount(seed = {}, t) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: investigation({ attempts: [archived()] }),
      stallPracticeSampleIndex: 2, stallHistoryPracticeSampleIndex: 0, unrelatedSetting: 'keep', ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...(t ? { t } : {}), awardXP, celebrate,
      update: (id, key, value) => { writes.push({ [key]: value }); setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })); },
      updateMulti: (id, patch) => { writes.push(patch); setData(old => ({ ...old, [id]: { ...old[id], ...patch } })); },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  writes = []; awardXP = vi.fn(); celebrate = vi.fn(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School archived optional guided-flight evidence', () => {
  it('keeps actual optional flight points reviewable after starting a new investigation', async () => {
    const completed = investigation();
    await mount({ stallInvestigation: completed, stallHistoryPracticeSampleIndex: 3 });
    await click(button('Start a new investigation'));
    expect(latest.stallInvestigation).toMatchObject({ phase: 'predict', explanation: '', observations: [] });
    expect(latest.stallInvestigation.attempts[0].flight).toEqual(api.stallInvestigationRecord(completed).flight);
    expect(selector().value).toBe('0'); expect(latest.stallHistoryPracticeSampleIndex).toBe(0);
    expect(notebook().textContent).toContain(completed.explanation);
    expect(viewer().getAttribute('aria-label')).toBe('Earlier: Recorded flight practice');
    expect(fields()['Altitude MSL (ft)']).toBe('6000');
    expect(viewer('current')).toBeNull();
    expect(notebook().textContent).toContain('Earlier flights cannot be resumed.');
    expect([...notebook().querySelectorAll('button')].some(item => /resume|replay|try flight|start flight/i.test(item.textContent))).toBe(false);
    expect(window.__testHooks.flightSim.flyingRef.current).toBe(false);
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it('gives current and earlier evidence unique labels, controls and independent displayed values', async () => {
    await mount();
    expect(host.querySelectorAll('#stall-practice-observation')).toHaveLength(1);
    expect(host.querySelectorAll('#stall-earlier-practice-observation')).toHaveLength(1);
    expect(viewer('current').querySelector('label').htmlFor).toBe('stall-practice-observation');
    expect(viewer().querySelector('label').htmlFor).toBe('stall-earlier-practice-observation');
    expect(viewer().querySelector('label').textContent).toBe('Earlier: Flight practice observation time');
    expect(fields()['Altitude MSL (ft)']).toBe('5000'); expect(fields('current')['Altitude MSL (ft)']).toBe('5800');
    expect(viewer().querySelector('[data-stall-practice-region]').getAttribute('aria-label')).toBe('Earlier: Flight practice observations table');
    expect(viewer().querySelector('[data-stall-practice-region]').tabIndex).toBe(0);
    expect(viewer().closest('[aria-live]')).toBeNull();
  });

  it('jumps to the earlier flight’s own stall and normal-flow points using recorded angles', async () => {
    await mount(); const saved = JSON.stringify(latest.stallInvestigation);
    await click(jump('stall'));
    expect(selector().value).toBe('1'); expect(fields()).toMatchObject({ 'Time (s)': '1.2', 'AoA (°)': '20', 'True airspeed (kts)': '96', 'Altitude MSL (ft)': '4912', 'Flow state': 'stall' });
    await click(jump('normal'));
    expect(selector().value).toBe('3'); expect(fields()).toMatchObject({ 'Time (s)': '3.5', 'Flow state': 'normal' });
    expect(viewer().textContent).toContain('One normal-flow point does not establish sustained recovery');
    expect(viewer().textContent).toContain('gaps between points do not show continuous flight conditions');
    expect(latest.stallPracticeSampleIndex).toBe(2); expect(JSON.stringify(latest.stallInvestigation)).toBe(saved);
    expect(writes.every(patch => Object.keys(patch).every(key => key === 'stallHistoryPracticeSampleIndex'))).toBe(true);
  });

  it('preserves typing, completion and selector focus while browsing an earlier observation', async () => {
    await mount({ stallInvestigation: investigation({ phase: 'transfer', attempts: [archived()] }) });
    const saved = JSON.stringify(latest.stallInvestigation), range = selector(); range.focus();
    await change(range, 2);
    expect(document.activeElement).toBe(range); expect(latest.stallHistoryPracticeSampleIndex).toBe(2);
    expect(fields()['Flow state']).toBe('boundary'); expect(latest.stallPracticeSampleIndex).toBe(2);
    expect(JSON.stringify(latest.stallInvestigation)).toBe(saved); expect(latest.unrelatedSetting).toBe('keep');
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it('restores both independent sample selections and all writing through a serialized remount', async () => {
    await mount(); await change(selector('current'), 1); await click(jump('normal'));
    const saved = JSON.parse(JSON.stringify(latest)); await mount(saved);
    expect(selector('current').value).toBe('1'); expect(selector().value).toBe('3');
    expect(fields('current')['Altitude MSL (ft)']).toBe('5912'); expect(fields()['Altitude MSL (ft)']).toBe('4700');
    expect(latest.stallInvestigation).toEqual(saved.stallInvestigation);
    expect(notebook().textContent).toContain(saved.stallInvestigation.attempts[0].explanation);
    expect(host.textContent).toContain(saved.stallInvestigation.explanation);
  });

  it('resets only earlier sample navigation when choosing another archived investigation', async () => {
    const second = archived({ explanation: 'Second earlier explanation.', flight: flight({ samples: [{ time: 17, aoa: 8, airspeed: 130, altitude: 1234 }] }) });
    await mount({ stallInvestigation: investigation({ attempts: [archived(), second] }), stallHistoryIndex: 0 });
    await click(jump('normal')); const saved = JSON.stringify(latest.stallInvestigation);
    const select = host.querySelector('#stall-earlier-attempt'); select.focus(); await change(select, 1);
    expect(document.activeElement).toBe(select); expect(selector().value).toBe('0'); expect(selector().disabled).toBe(true);
    expect(latest.stallHistoryPracticeSampleIndex).toBe(0); expect(latest.stallPracticeSampleIndex).toBe(2);
    expect(fields()['Altitude MSL (ft)']).toBe('1234'); expect(notebook().textContent).toContain(second.explanation);
    expect(JSON.stringify(latest.stallInvestigation)).toBe(saved);
  });

  it('ignores a stale earlier event callback after a different archive is selected', async () => {
    const second = archived({ flight: flight({ samples: samples().map(item => ({ ...item, altitude: 2222 })) }) });
    await mount({ stallInvestigation: investigation({ attempts: [archived(), second] }), stallHistoryIndex: 0 });
    const staleNormal = handler(jump('normal'), 'onClick');
    await change(host.querySelector('#stall-earlier-attempt'), 1);
    await act(async () => staleNormal());
    expect(latest.stallHistoryPracticeSampleIndex).toBe(0); expect(selector().value).toBe('0');
    expect(fields()['Altitude MSL (ft)']).toBe('2222'); expect(latest.stallPracticeSampleIndex).toBe(2);
  });

  it('ignores queued earlier sample navigation after leaving the investigation', async () => {
    await mount(); const staleNormal = handler(jump('normal'), 'onClick'), saved = JSON.stringify(latest.stallInvestigation);
    await act(async () => { button('← Back to menu').click(); staleNormal(); });
    expect(latest.view).toBe('menu'); expect(latest.stallHistoryPracticeSampleIndex).toBe(0);
    expect(JSON.stringify(latest.stallInvestigation)).toBe(saved);
  });

  it('makes late retained evidence visible without changing the archive’s raw sample record', async () => {
    const recorded = Array.from({ length: 94 }, (_, index) => ({ time: index, aoa: index === 60 ? 20 : 8, airspeed: 110, altitude: 5000 - index }));
    await mount({ stallInvestigation: investigation({ attempts: [archived({ flight: flight({ samples: recorded }) })] }) });
    const saved = JSON.stringify(latest.stallInvestigation);
    expect(selector().max).toBe('89'); expect(viewer().textContent).toContain('The first retained observation is at 4 s');
    await change(selector(), 89);
    expect(fields()).toMatchObject({ 'Time (s)': '93', 'Altitude MSL (ft)': '4907' });
    expect(viewer().querySelector('caption').textContent).toContain('Recorded observations 81–90 of 90');
    expect(viewer().querySelectorAll('tbody tr')).toHaveLength(10); expect(JSON.stringify(latest.stallInvestigation)).toBe(saved);
  });

  it('keeps unusable archived samples unknown without borrowing the active flight’s evidence', async () => {
    await mount({ stallInvestigation: investigation({ attempts: [archived({ flight: flight({ samples: [null, {}, { time: -1, aoa: 20, airspeed: 100, altitude: 5000 }] }) })] }) });
    expect(viewer().textContent).toContain('This practice has no usable saved observations');
    expect(selector()).toBeNull(); expect(viewer().querySelector('dl')).toBeNull(); expect(viewer().querySelector('button')).toBeNull();
    expect(selector('current')).toBeTruthy(); expect(viewer().textContent).not.toMatch(/recovery complete|NaN|undefined|Infinity/);
  });

  it('does not create a flight browser or evidence for an archive with no saved optional flight', async () => {
    await mount({ stallInvestigation: investigation({ attempts: [archived({ flight: null })] }) });
    expect(viewer()).toBeNull(); expect(selector()).toBeNull(); expect(viewer('current')).toBeTruthy();
    expect(notebook().textContent).toContain('Earlier explanation uses these flight observations.');
  });

  it('keeps absent earlier events disabled even when the current flight contains a stall', async () => {
    const normalOnly = samples().map(item => ({ ...item, aoa: 8 }));
    await mount({ stallInvestigation: investigation({ attempts: [archived({ flight: flight({ samples: normalOnly }) })] }) });
    expect(jump('stall').disabled).toBe(true); expect(jump('normal').disabled).toBe(true);
    expect(jump('stall', 'current').disabled).toBe(false); expect(jump('normal', 'current').disabled).toBe(false);
    expect(fields()['Flow state']).toBe('normal');
  });

  it.each([[-20, '0'], [2.8, '2'], [999, '3'], [Infinity, '0']])('bounds saved earlier sample selection %s to an actual recorded point', async (savedIndex, expected) => {
    await mount({ stallHistoryPracticeSampleIndex: savedIndex });
    expect(selector().value).toBe(expected); expect(selector('current').value).toBe('2');
    expect(viewer().textContent).not.toMatch(/NaN|undefined|Infinity/);
    await click(jump('stall')); expect(latest.stallHistoryPracticeSampleIndex).toBe(1);
  });

  it('shows rounded archived angles with exact saved precision and preserves the interrupted-session caveat', async () => {
    const precise = { time: 20, aoa: 15.004, airspeed: 100, altitude: 4000, state: 'normal' };
    await mount({ stallInvestigation: investigation({ attempts: [archived({ flight: flight({ status: 'interrupted', samples: [precise] }) })] }) });
    expect(fields()['AoA (°)']).toBe('≈15'); expect(fields()['Flow state']).toBe('stall');
    expect(viewer().querySelector('dd[title="15.004°"]')).toBeTruthy();
    expect(viewer().textContent).toContain('This practice was interrupted. Its saved observations remain available');
    expect(latest.stallInvestigation.attempts[0].flight.samples[0].aoa).toBe(15.004);
    expect(viewer().textContent).toContain('One normal-flow point does not establish sustained recovery');
  });

  it('reuses localized earlier context and control labels without changing saved sample values', async () => {
    const labels = { 'stem.flightsim.journal_earlier_value': 'Früher: {value}',
      'stem.flightsim.guided_practice_observations_title': 'Flugbeobachtungen',
      'stem.flightsim.guided_practice_observation_label': 'Beobachtungszeit',
      'stem.flightsim.guided_practice_first_stall': 'Erster Strömungsabriss' };
    await mount({}, (key, fallback) => labels[key] || fallback);
    expect(viewer().getAttribute('aria-label')).toBe('Früher: Flugbeobachtungen');
    expect(viewer('current').getAttribute('aria-label')).toBe('Flugbeobachtungen');
    expect(viewer().querySelector('label').textContent).toBe('Früher: Beobachtungszeit');
    expect(jump('stall').textContent).toBe('Früher: Erster Strömungsabriss');
    await click(jump('stall')); expect(latest.stallHistoryPracticeSampleIndex).toBe(1);
    expect(latest.stallInvestigation.attempts[0].flight.samples[1].aoa).toBe(20);
  });
});
