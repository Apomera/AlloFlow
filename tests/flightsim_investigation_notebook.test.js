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
  const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
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

const notebook = () => host.querySelector('section[aria-label="Investigation notebook"]');
const earlierRows = () => [...notebook().querySelectorAll('tbody tr')];

describe('SkySchool investigation notebook', () => {
  it('explains how to retain an earlier investigation before any archive exists', async () => {
    await mount();
    expect(notebook().textContent).toContain('No earlier investigations are saved yet.');
    expect(notebook().querySelector('select')).toBeNull();
    expect(host.querySelector('#stall-hypothesis')).toBeTruthy();
  });

  it('opens the newest retained attempt with its actual controlled evidence and writing', async () => {
    await mount({ prediction: 'angle', attempts: [completeRecord({ hypothesis: 'Older idea' }), completeRecord({ hypothesis: 'Most recent idea' })] });
    const region = notebook();
    expect(region.querySelector('select').value).toBe('1');
    expect(region.textContent).toContain('Earlier starting prediction: Airspeed. Current starting prediction: Angle of attack.');
    expect(region.textContent).toContain('Most recent idea');
    expect(region.textContent).not.toContain('Older idea');
    expect(region.textContent).toContain('Completion recorded:');
    expect(region.textContent).toContain('✓ Angle comparison: trials 1 and 2');
    expect(region.textContent).toContain('✓ Speed comparison: trials 2 and 3');
    expect(region.textContent).toContain('Checked transfer response: stall. Check attempts: 1.');
    expect(earlierRows()).toHaveLength(3);
    expect(region.querySelector('textarea')).toBeNull();
    expect(region.querySelectorAll('input')).toHaveLength(0);
    expect(region.querySelector('[aria-label="Earlier investigation observations"]').tabIndex).toBe(0);
  });

  it('changes only the notebook selection and retains keyboard focus and current completion', async () => {
    const active = completeRecord({ attempts: [completeRecord({ explanation: 'First earlier explanation' }), completeRecord({ explanation: 'Second earlier explanation' })] });
    await mount(active, { unrelatedSetting: 'keep' });
    const before = JSON.parse(JSON.stringify(latest));
    const select = notebook().querySelector('select');
    select.focus();
    await change(select, 0);
    expect(document.activeElement).toBe(select);
    expect(notebook().textContent).toContain('First earlier explanation');
    expect(latest.stallInvestigation).toEqual(before.stallInvestigation);
    expect(latest.unrelatedSetting).toBe('keep');
    expect(latest.stallHistoryIndex).toBe(0);
    expect(record().completedAt).toBe(active.completedAt);
  });

  it('restores selection after a full remount and keeps it while changing current phases', async () => {
    await mount(completeRecord({ attempts: [completeRecord({ hypothesis: 'Selected earlier idea' }), completeRecord({ hypothesis: 'Other earlier idea' })] }));
    await change(notebook().querySelector('select'), 0);
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved.stallInvestigation, { stallHistoryIndex: saved.stallHistoryIndex });
    expect(notebook().querySelector('select').value).toBe('0');
    expect(notebook().textContent).toContain('Selected earlier idea');
    await click('Review trials');
    expect(currentPhase()).toBe('Controlled trials');
    expect(notebook().querySelector('select').value).toBe('0');
    expect(record().completedAt).toBe(saved.stallInvestigation.completedAt);
  });

  it('never borrows current comparisons to credit a sparse earlier attempt', async () => {
    await mount(completeRecord({ attempts: [completeRecord({ observations: [evidence()[0]] })] }));
    expect(notebook().textContent).toContain('Completion is not recorded or required evidence is missing.');
    expect(notebook().textContent).toContain('No controlled angle comparison is saved');
    expect(notebook().textContent).toContain('No controlled speed comparison is saved');
    expect(notebook().textContent).not.toContain('✓');
    expect(earlierRows()).toHaveLength(1);
    expect(host.querySelector('#stall-phase-title').parentElement.textContent).toContain('Investigation complete:');
  });

  it('recalculates earlier flow states and lift instead of trusting saved result fields', async () => {
    const rows = [
      { ...evidence()[0], state: 'stall', lift: 999999 },
      { ...evidence()[0], aoa: 9, state: 'stall', lift: -1 },
      { ...evidence()[2], aoa: 9, state: 'normal' },
      { ...evidence()[1], airspeed: '130' },
    ];
    await mount({ attempts: [completeRecord({ observations: rows })] });
    expect(earlierRows()).toHaveLength(3);
    expect(earlierRows().every(row => row.textContent.includes('normal'))).toBe(true);
    expect(notebook().textContent).not.toContain('999,999');
    expect(notebook().textContent).toContain('No controlled angle comparison is saved');
    expect(notebook().textContent).not.toContain('Completion recorded:');
  });

  it.each([
    ['missing prediction', { prediction: '' }],
    ['blank writing', { explanation: '   \n\t' }],
    ['unchecked choice', { transferChoice: 'stall', transferAnswer: '' }],
    ['incorrect checked response', { transferAnswer: 'normal' }],
    ['missing completion', { completedAt: null }],
    ['invalid completion', { completedAt: 'finished' }],
    ['nonexistent date', { completedAt: '2026-02-30T12:00:00.000Z' }],
    ['ambiguous date', { completedAt: '1' }],
  ])('keeps an earlier %s record incomplete despite a saved Review phase', async (_, patch) => {
    await mount({ attempts: [completeRecord(patch)] });
    expect(notebook().textContent).not.toContain('Completion recorded:');
    expect(notebook().textContent).toContain('Completion is not recorded or required evidence is missing.');
    if (patch.transferAnswer === '') expect(notebook().textContent).toContain('Checked transfer response: Not recorded.');
  });

  it('uses the same strict completion date validation in current Review', async () => {
    await mount(completeRecord({ completedAt: '2026-02-30T12:00:00.000Z' }));
    expect(host.querySelector('#stall-phase-title').parentElement.textContent).toContain('This record is incomplete.');
    await mount(completeRecord({ completedAt: '2026-10-10T12:00:00Z' }));
    expect(host.querySelector('#stall-phase-title').parentElement.textContent).toContain('Investigation complete:');
  });

  it('archives the current work, selects it by default, and returns focus to Prediction', async () => {
    const history = Array.from({ length: 5 }, (_, index) => completeRecord({ hypothesis: 'Earlier ' + index }));
    await mount(completeRecord({ hypothesis: 'Just completed idea', attempts: history }), { stallHistoryIndex: 0 });
    button('Start a new investigation').focus();
    await click('Start a new investigation');
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(currentPhase()).toBe('Prediction');
    expect(document.activeElement).toBe(host.querySelector('#stall-phase-title'));
    expect(notebook().querySelector('select').value).toBe('4');
    expect(notebook().textContent).toContain('Just completed idea');
    expect(record()).toMatchObject({ prediction: '', explanation: '', completedAt: null, observations: [] });
    expect(record().attempts).toHaveLength(5);
    expect(record().attempts[0].hypothesis).toBe('Earlier 1');
    expect(record().attempts.every(attempt => attempt.attempts === undefined)).toBe(true);
  });

  it.each([-50, 999, '0', NaN])('bounds a stale selected archive index %s without rewriting current work', async index => {
    const active = { attempts: [completeRecord({ hypothesis: 'First saved' }), completeRecord({ hypothesis: 'Last saved' })] };
    await mount(active, { stallHistoryIndex: index });
    const expected = index === -50 ? '0' : '1';
    expect(notebook().querySelector('select').value).toBe(expected);
    expect(record()).toEqual(active);
  });

  it('shows a past flight status as a saved record without offering to resume it', async () => {
    await mount({ attempts: [completeRecord({ flight: { status: 'active', sawStall: true, recoverySeconds: 2, samples: [{ time: 1, aoa: 20, airspeed: 100, altitude: 5000 }] } })] });
    expect(notebook().textContent).toContain('Optional flight status at save: active. Earlier flights cannot be resumed.');
    expect(notebook().querySelector('button')).toBeNull();
    expect(latest.view).toBe('stallHunt');
    expect(window.__testHooks.flightSim.flyingRef.current).toBe(false);
  });

  it('uses translated notebook labels without changing stored prediction identifiers', async () => {
    const active = { prediction: 'angle', attempts: [completeRecord()] };
    await mount(active, {}, { t: (key, fallback) => ({
      'stem.flightsim.guided_notebook_title': 'Versuchsnotizbuch',
      'stem.flightsim.guided_notebook_selector': 'Früherer Versuch',
      'stem.flightsim.guided_angle_label': 'Anstellwinkel',
      'stem.flightsim.guided_airspeed_label': 'Geschwindigkeit',
    })[key] || fallback || key });
    const region = host.querySelector('section[aria-label="Versuchsnotizbuch"]');
    expect(region.querySelector('label').textContent).toBe('Früherer Versuch');
    expect(region.textContent).toContain('Earlier starting prediction: Geschwindigkeit. Current starting prediction: Anstellwinkel.');
    expect(record()).toEqual(active);
  });
});

