import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, tool, latest;

const evidence = () => [
  { airspeed: 130, altitude: 5000, aoa: 8, state: 'normal', lift: 2100 },
  { airspeed: 130, altitude: 5000, aoa: 20, state: 'stall', lift: 2600 },
  { airspeed: 80, altitude: 5000, aoa: 20, state: 'stall', lift: 985 },
];
const completeRecord = (patch = {}) => ({
  phase: 'review', prediction: 'speed', hypothesis: 'I initially expected low speed to cause a stall.',
  observations: evidence(), explanation: 'Trials 1 and 2 changed only angle. Trials 2 and 3 remained stalled at different speeds.',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 1,
  completedAt: '2026-10-10T12:00:00.000Z', ...patch,
});

async function mount(record = {}, extra = {}, contextOverrides = {}) {
  if (root) await act(async () => { root.unmount(); });
  if (host) host.remove();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, updateData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: record, ...extra } });
    latest = data.flightSim;
    return tool.render(makeCtx({
      toolData: data,
      setToolData: updateData,
      update: (toolId, key, value) => updateData(previous => ({ ...previous, [toolId]: { ...previous[toolId], [key]: value } })),
      updateMulti: (toolId, patch) => updateData(previous => ({ ...previous, [toolId]: { ...previous[toolId], ...patch } })),
      ...contextOverrides,
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
}

function button(text) {
  const match = [...host.querySelectorAll('button')].find(element => element.textContent === text);
  expect(match, `Button: ${text}`).toBeTruthy();
  return match;
}
async function click(text) { await act(async () => { button(text).click(); }); }
async function clickContaining(text) {
  const match = [...host.querySelectorAll('button')].find(element => element.textContent.includes(text));
  expect(match, `Button containing: ${text}`).toBeTruthy();
  await act(async () => { match.click(); });
}
async function select(label) {
  const match = [...host.querySelectorAll('label')].find(element => element.textContent.trim() === label);
  expect(match, `Radio label: ${label}`).toBeTruthy();
  const radio = match.querySelector('input[type="radio"]');
  expect(radio).toBeTruthy();
  await act(async () => { radio.click(); });
}
async function change(element, value) {
  expect(element).toBeTruthy();
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const record = () => latest.stallInvestigation;
const currentPhase = () => host.querySelector('[aria-current="step"]')?.textContent;

beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab();
  window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  root = null;
  if (host) host.remove();
  host = null;
  delete window.__testHooks;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SkySchool guided stall investigation', () => {
  it('requires a starting prediction but preserves a learner’s initial misconception for comparison', async () => {
    await mount();
    expect(host.textContent).toContain('Guided stall investigation');
    expect(currentPhase()).toBe('Prediction');
    expect(button('Continue to trials').disabled).toBe(true);
    await select('Airspeed');
    await change(host.querySelector('#stall-hypothesis'), 'I predict speed matters most.');
    await click('Continue to trials');
    expect(currentPhase()).toBe('Controlled trials');
    expect(record().prediction).toBe('speed');
    await click('Back to prediction');
    expect(host.querySelector('input[value="speed"]').checked).toBe(true);
    expect(host.querySelector('#stall-hypothesis').value).toBe('I predict speed matters most.');
    expect(record().completedAt).toBeNull();
  });

  it('collects controlled comparisons and completes without requiring real-time flight controls', async () => {
    await mount();
    await select('Angle of attack');
    await click('Continue to trials');
    expect(button('Continue to explanation').disabled).toBe(true);
    await click('Reference conditions');
    await click('Record observation');
    expect(record().observations[0]).toMatchObject({ airspeed: 130, altitude: 5000, aoa: 8, state: 'normal' });
    await click('Change angle only');
    await click('Record observation');
    expect(record().observations[1]).toMatchObject({ airspeed: 130, altitude: 5000, aoa: 20, state: 'stall' });
    expect(button('Continue to explanation').disabled).toBe(true);
    await click('Change speed only');
    await click('Record observation');
    expect(record().observations[2]).toMatchObject({ airspeed: 80, altitude: 5000, aoa: 20, state: 'stall' });
    expect(host.querySelectorAll('table tbody tr')).toHaveLength(3);
    expect(button('Continue to explanation').disabled).toBe(false);
    await click('Continue to explanation');
    expect(button('Continue to transfer').disabled).toBe(true);
    await change(host.querySelector('#stall-explanation'), 'Trials 1 and 2 changed angle alone. Trials 2 and 3 stalled at both speeds.');
    await click('Continue to transfer');
    expect(button('Check prediction').disabled).toBe(true);
    expect(button('Complete investigation').disabled).toBe(true);
    await select('Stall');
    await click('Check prediction');
    expect(button('Complete investigation').disabled).toBe(false);
    await click('Complete investigation');
    expect(currentPhase()).toBe('Review');
    expect(host.textContent).toContain('Investigation complete:');
    expect(record().completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(record().flight).toBeNull();
    expect(record().transferAttempts).toBe(1);
  });

  it('keeps progression closed when angle and airspeed were changed together', async () => {
    await mount({ phase: 'experiment', prediction: 'angle', observations: [
      evidence()[0], { ...evidence()[1], airspeed: 80 },
      { ...evidence()[2], altitude: 6000 },
    ] });
    expect(button('Continue to explanation').disabled).toBe(true);
    expect(host.textContent).not.toContain('✓ Angle comparison:');
    expect(host.textContent).not.toContain('✓ Speed comparison:');
  });

  it('allows exact numeric trial inputs and keeps changes independent', async () => {
    await mount({ phase: 'experiment', prediction: 'angle' });
    await change(host.querySelector('[aria-label="Airspeed (kts) number"]'), 200);
    await change(host.querySelector('[aria-label="Altitude (ft) number"]'), 10000);
    await change(host.querySelector('[aria-label="Angle of attack (°) number"]'), 20);
    await click('Record observation');
    expect(record().observations[0]).toMatchObject({ airspeed: 200, altitude: 10000, aoa: 20, state: 'stall' });
    await click('Change speed only');
    expect(record()).toMatchObject({ airspeed: 80, altitude: 10000, aoa: 20 });
    expect(host.querySelector('#trial-airspeed').value).toBe('80');
    expect(host.querySelector('#trial-altitude').value).toBe('10000');
  });

  it('requires an explicit retry after incorrect transfer feedback and counts each checked attempt once', async () => {
    await mount(completeRecord({ phase: 'transfer', transferChoice: '', transferAnswer: '', transferAttempts: 0, completedAt: null }));
    await select('Normal flow');
    await click('Check prediction');
    expect(record().transferAttempts).toBe(1);
    expect(record().transferAnswer).toBe('normal');
    expect(button('Complete investigation').disabled).toBe(true);
    expect(host.querySelectorAll('input[type="radio"]:disabled')).toHaveLength(3);
    expect(host.textContent).toContain('Speed alone does not prevent a stall.');
    await click('Back to explanation');
    await click('Continue to transfer');
    expect(record().transferAttempts).toBe(1);
    await click('Try transfer again');
    expect(button('Check prediction').disabled).toBe(true);
    await select('Stall');
    await click('Check prediction');
    expect(record().transferAttempts).toBe(2);
    expect(button('Complete investigation').disabled).toBe(false);
  });

  it('does not credit completion when saved data skips the required evidence stages', async () => {
    await mount({ phase: 'transfer', transferAnswer: 'stall', transferAttempts: 1 });
    expect(button('Complete investigation').disabled).toBe(true);
    await click('Complete investigation');
    expect(currentPhase()).toBe('Transfer');
    expect(record().completedAt).toBeUndefined();
    await mount({ phase: 'review', transferAnswer: 'stall', completedAt: '2026-10-10T12:00:00.000Z' });
    expect(host.textContent).toContain('This record is incomplete.');
    expect(host.textContent).not.toContain('Investigation complete:');
  });

  it('restores a completed record and evidence from host state after a full unmount', async () => {
    await mount(completeRecord());
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved.stallInvestigation);
    expect(currentPhase()).toBe('Review');
    expect(host.textContent).toContain('Investigation complete:');
    expect(host.textContent).toContain('I initially expected low speed to cause a stall.');
    expect(host.textContent).toContain('Trials 1 and 2 changed only angle.');
    expect(host.querySelectorAll('table tbody tr')).toHaveLength(3);
    await click('Review trials');
    expect(button('Continue to explanation').disabled).toBe(false);
  });

  it('starts optional practice airborne in the trainer and preserves an honest unfinished session on return', async () => {
    await mount(completeRecord({ phase: 'transfer', completedAt: null }), { aircraft: 'drone' });
    await click('Try flight practice');
    const hooks = window.__testHooks.flightSim;
    expect(latest.view).toBe('flying');
    expect(latest.aircraft).toBe('cessna172');
    expect(hooks.flightRef.current).toMatchObject({ altitude: 5000, onGround: false, heading: 90 });
    expect(hooks.flightRef.current.speed * 0.5924838).toBeCloseTo(110);
    expect(hooks.controlsRef.current).toMatchObject({ throttle: 0.6, pitch: 0, bank: 0 });
    expect(record().flight).toMatchObject({ status: 'active', sawStall: false, recovered: false });
    expect(host.querySelector('[aria-label="Guided stall flight practice"]')).toBeTruthy();
    await click('Return to investigation');
    expect(latest.view).toBe('stallHunt');
    expect(currentPhase()).toBe('Transfer');
    expect(hooks.flyingRef.current).toBe(false);
    expect(record().flight).toMatchObject({ status: 'ended', sawStall: false, recovered: false, samples: [] });
    expect(record().explanation).toContain('Trials 1 and 2');
    expect(record().observations).toHaveLength(3);
    const saved = JSON.parse(JSON.stringify(record()));
    await mount(saved);
    expect(host.textContent).toContain('no stall recorded yet.');
    expect(host.textContent).not.toContain('Flight evidence: stall observed, then five seconds');
  });

  it('starts fresh sessions when moving from guided practice to a sprint and back', async () => {
    const addToast = vi.fn();
    await mount(completeRecord({ phase: 'transfer', completedAt: null }), { aircraft: 'glider', menuSections: { sprints: true } }, { addToast });
    await click('Try flight practice');
    expect(addToast.mock.calls.some(call => String(call[0]).includes('Aerotow'))).toBe(false);
    await click('Return to investigation');
    await click('← Back to menu');
    await clickContaining('Americas Sprint');
    expect(latest.view).toBe('flying');
    const hooks = window.__testHooks.flightSim;
    expect(hooks.flightRef.current).toMatchObject({ altitude: 35000, speed: 2000, onGround: false });
    expect(hooks.getSprintRef().current.active).toBe(true);
    expect(host.querySelector('[aria-label="Guided stall flight practice"]')).toBeNull();
    await clickContaining('Exit');
    expect(latest.lastDebrief).toMatchObject({ investigation: false, startedAirborne: true, samples: [] });
    await clickContaining('Back to Menu');
    await clickContaining('Guided stall investigation');
    await click('Try flight practice again');
    expect(hooks.getSprintRef().current.active).toBe(false);
    expect(hooks.flightRef.current.altitude).toBe(5000);
    expect(hooks.flightRef.current.speed * 0.5924838).toBeCloseTo(110);
    expect(record().flight).toMatchObject({ status: 'active', sawStall: false, samples: [] });
  });

  it('renders translated labels and composed feedback without changing stored model identifiers', async () => {
    const translations = {
      'stem.flightsim.guided_phase_trials': 'Versuche',
      'stem.flightsim.guided_angle_comparison': 'Winkelvergleich: {first} und {second}',
      'stem.flightsim.guided_table_state_stall': 'Strömungsabriss',
      'stem.flightsim.guided_airspeed_units': 'Geschwindigkeit (kts)',
      'stem.flightsim.guided_numeric_input_label': 'Zahl: {label}',
    };
    await mount(completeRecord({ phase: 'experiment' }), {}, { t: (key, fallback) => translations[key] || fallback || key });
    expect(currentPhase()).toBe('Versuche');
    expect(host.textContent).toContain('Winkelvergleich: 1 und 2');
    expect(host.querySelector('table').textContent).toContain('Strömungsabriss');
    expect(host.querySelector('[aria-label="Zahl: Geschwindigkeit (kts)"]')).toBeTruthy();
    expect(record().observations[1].state).toBe('stall');
  });

  it('bounds the evidence log while preserving the newest actual observation', async () => {
    const observations = Array.from({ length: 24 }, (_, index) => ({ ...evidence()[0], airspeed: 100 + index }));
    await mount({ phase: 'experiment', prediction: 'angle', observations, airspeed: 200, altitude: 5000, aoa: 20 });
    await click('Record observation');
    expect(record().observations).toHaveLength(24);
    expect(record().observations[0].airspeed).toBe(101);
    expect(record().observations[23]).toMatchObject({ airspeed: 200, aoa: 20, state: 'stall' });
    expect(host.querySelectorAll('table tbody tr')).toHaveLength(24);
  });

  it('discards invalid saved conditions and recalculates untrusted result fields', async () => {
    await mount({ phase: 'experiment', prediction: 'angle', observations: [
      null, {}, { ...evidence()[0], lift: null }, { ...evidence()[1], state: 'invented' },
      { ...evidence()[2], airspeed: '80' }, evidence()[0],
    ] });
    expect(host.querySelectorAll('table tbody tr')).toHaveLength(3);
    expect(button('Continue to explanation').disabled).toBe(true);
    await click('Record observation');
    expect(record().observations).toHaveLength(4);
    expect(record().observations[1].state).toBe('stall');
    expect(record().observations.every(row => Number.isFinite(row.airspeed) && Number.isFinite(row.lift))).toBe(true);
  });

  it('archives the completed work and starts a new attempt without carrying earned completion forward', async () => {
    await mount(completeRecord({ attempts: Array.from({ length: 5 }, (_, index) => ({ hypothesis: 'Attempt ' + index })) }));
    await click('Start a new investigation');
    expect(currentPhase()).toBe('Prediction');
    expect(record().attempts).toHaveLength(5);
    expect(record().attempts[0]).toMatchObject({ hypothesis: 'Attempt 1' });
    expect(record().attempts[4]).toMatchObject({ prediction: 'speed', transferAnswer: 'stall', completedAt: '2026-10-10T12:00:00.000Z' });
    expect(record().attempts[4].attempts).toBeUndefined();
    expect(record()).toMatchObject({ prediction: '', explanation: '', transferAnswer: '', transferAttempts: 0, completedAt: null, observations: [] });
    expect(button('Continue to trials').disabled).toBe(true);
  });
});
