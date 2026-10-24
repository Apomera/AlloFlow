import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, tool, latest;

const evidence = () => [
  { airspeed: 130, altitude: 5000, aoa: 8 },
  { airspeed: 130, altitude: 5000, aoa: 20 },
  { airspeed: 80, altitude: 5000, aoa: 20 },
];
const completeRecord = (patch = {}) => ({
  phase: 'review', prediction: 'angle', hypothesis: 'The angle determines the flow state.',
  observations: evidence(), explanation: 'Trials 1 and 2 change only angle. Trials 2 and 3 stay stalled at different speeds.',
  transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 1,
  completedAt: '2026-10-10T12:00:00.000Z', ...patch,
});

async function mount(record = {}, extra = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'stallHunt', stallInvestigation: record, ...extra } });
    latest = data.flightSim;
    return tool.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (id, key, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
}

function button(text) {
  const result = [...host.querySelectorAll('button')].find(node => node.textContent === text);
  expect(result, `Button: ${text}`).toBeTruthy();
  return result;
}
function handler(node, name) {
  expect(node).toBeTruthy();
  // Capture already-delivered React handlers so several queued events can run
  // before a commit, rather than relying on discrete native-event flush timing.
  const key = Object.keys(node).find(value => value.startsWith('__reactProps$'));
  expect(key).toBeTruthy();
  return node[key][name];
}
const onClick = text => handler(button(text), 'onClick');
const onChange = selector => handler(host.querySelector(selector), 'onChange');
const valueEvent = value => ({ target: { value: String(value) } });
const record = () => latest.stallInvestigation;
async function click(text) { await act(async () => { button(text).click(); }); }

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

describe('Sky School investigation continuity', () => {
  it('retains independent prediction edits and the final writing when continuing before a commit', async () => {
    await mount();
    const choose = onChange('input[name="stall-prediction"][value="angle"]');
    const write = onChange('#stall-hypothesis');
    const next = onClick('Continue to trials');
    await act(async () => {
      choose();
      write(valueEvent('My final starting explanation.'));
      next();
      write(valueEvent('A queued event from the old phase.'));
    });
    expect(record()).toMatchObject({ phase: 'experiment', prediction: 'angle', hypothesis: 'My final starting explanation.' });
  });

  it('retains independent control edits before a commit and preserves completion while browsing conditions', async () => {
    await mount(completeRecord({ phase: 'experiment' }));
    const speed = onChange('#trial-airspeed'), altitude = onChange('#trial-altitude'), angle = onChange('#trial-aoa');
    await act(async () => { speed(valueEvent(180)); altitude(valueEvent(8000)); angle(valueEvent(20)); });
    expect(record()).toMatchObject({ airspeed: 180, altitude: 8000, aoa: 20, completedAt: '2026-10-10T12:00:00.000Z' });
  });

  it('saves the final explanation before phase navigation and ignores writing from the old phase', async () => {
    await mount(completeRecord({ phase: 'explain' }));
    const write = onChange('#stall-explanation'), next = onClick('Continue to transfer');
    await act(async () => { write(valueEvent('Final evidence-based explanation.')); next(); write(valueEvent('Stale writing.')); });
    expect(record()).toMatchObject({ phase: 'transfer', explanation: 'Final evidence-based explanation.', completedAt: null });
  });

  it('revalidates the current writing before advancing through an old enabled button', async () => {
    await mount(completeRecord({ phase: 'explain' }));
    const write = onChange('#stall-explanation'), next = onClick('Continue to transfer');
    await act(async () => { write(valueEvent(' \n\t')); next(); });
    expect(record().phase).toBe('explain');
    expect(record().completedAt).toBeNull();
    expect(button('Continue to transfer').disabled).toBe(true);
  });

  it('records the live condition once per queued recording and appends subsequent changed conditions', async () => {
    const original = evidence();
    await mount({ phase: 'experiment', prediction: 'angle', observations: original });
    const speed = onChange('#trial-airspeed'), angle = onChange('#trial-aoa'), save = onClick('Record observation');
    await act(async () => {
      speed(valueEvent(180)); angle(valueEvent(20)); save(); save();
      angle(valueEvent(8)); save();
    });
    expect(record().observations).toHaveLength(5);
    expect(record().observations[3]).toMatchObject({ airspeed: 180, altitude: 5000, aoa: 20, state: 'stall' });
    expect(record().observations[4]).toMatchObject({ airspeed: 180, altitude: 5000, aoa: 8, state: 'normal' });
    expect(original).toEqual(evidence());
    expect(latest).toMatchObject({ stallCompareFirst: 3, stallCompareSecond: 4 });
  });

  it('allows a deliberate repeated observation after the previous recording renders', async () => {
    await mount({ phase: 'experiment', prediction: 'angle' });
    await click('Record observation');
    await click('Record observation');
    expect(record().observations).toHaveLength(2);
    const { trialNumber: firstNumber, ...firstCondition } = record().observations[0];
    const { trialNumber: secondNumber, ...secondCondition } = record().observations[1];
    expect(firstCondition).toEqual(secondCondition);
    expect([firstNumber, secondNumber]).toEqual([1, 2]);
  });

  it('applies single-variable trial shortcuts to the latest queued control values', async () => {
    await mount({ phase: 'experiment', prediction: 'angle' });
    const speed = onChange('#trial-airspeed'), angle = onChange('#trial-aoa');
    const changeSpeed = onClick('Change speed only'), changeAngle = onClick('Change angle only');
    await act(async () => { speed(valueEvent(80)); angle(valueEvent(20)); changeSpeed(); changeAngle(); });
    expect(record()).toMatchObject({ airspeed: 130, altitude: 5000, aoa: 8 });
    expect(record().observations).toEqual([]);
  });

  it('prepares the currently selected trial when selection and preparation are queued together', async () => {
    await mount({ phase: 'experiment', prediction: 'angle', observations: evidence() }, { stallCompareFirst: 0 });
    const select = onChange('#stall-compare-first'), prepare = onClick('Prepare angle trial from A');
    await act(async () => { select(valueEvent(2)); prepare(); });
    expect(record()).toMatchObject({ airspeed: 80, altitude: 5000, aoa: 8 });
    expect(latest.stallCompareFirst).toBe(2);
    expect(record().observations).toHaveLength(3);
  });

  it('uses the current transfer choice once and ignores a queued choice after checking', async () => {
    await mount(completeRecord({ phase: 'transfer', transferChoice: 'normal', transferAnswer: '', transferAttempts: 4 }));
    const radios = host.querySelectorAll('input[name="stall-transfer"]');
    const normal = handler(radios[0], 'onChange'), stall = handler(radios[2], 'onChange'), check = onClick('Check prediction');
    await act(async () => { stall(); check(); check(); normal(); });
    expect(record()).toMatchObject({ transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 5 });
    expect(host.textContent).toContain('Correct: 20° exceeds');
  });

  it('counts a retried transfer once and a stale retry cannot clear a correct response', async () => {
    await mount(completeRecord({ phase: 'transfer', transferChoice: 'normal', transferAnswer: 'normal', transferAttempts: 2 }));
    const retry = onClick('Try transfer again');
    await act(async () => { retry(); retry(); });
    const stall = handler(host.querySelectorAll('input[name="stall-transfer"]')[2], 'onChange'), check = onClick('Check prediction');
    await act(async () => { stall(); check(); check(); retry(); });
    expect(record()).toMatchObject({ transferChoice: 'stall', transferAnswer: 'stall', transferAttempts: 3 });
  });

  it('archives and resets once while blocking old phase, comparison, and notebook callbacks', async () => {
    await mount(completeRecord({ attempts: [completeRecord({ hypothesis: 'Earlier work' })] }), { stallCompareFirst: 1, stallCompareSecond: 2, stallHistoryIndex: 0 });
    const reset = onClick('Start a new investigation'), review = onClick('Review trials');
    const comparison = onChange('#stall-compare-first'), history = onChange('#stall-earlier-attempt');
    await act(async () => { reset(); reset(); comparison(valueEvent(2)); history(valueEvent(1)); review(); });
    expect(record()).toMatchObject({ phase: 'predict', prediction: '', hypothesis: '', observations: [] });
    expect(record().attempts).toHaveLength(2);
    expect(record().attempts[1]).toMatchObject({ hypothesis: 'The angle determines the flow state.', completedAt: '2026-10-10T12:00:00.000Z' });
    expect(latest).toMatchObject({ stallCompareFirst: null, stallCompareSecond: null, stallHistoryIndex: null });
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(document.activeElement).toBe(host.querySelector('#stall-phase-title'));
  });

  it('retains the last edit on leaving and ignores queued controls after the menu action', async () => {
    await mount({ prediction: 'angle' });
    const write = onChange('#stall-hypothesis'), leave = onClick('← Back to menu'), next = onClick('Continue to trials');
    await act(async () => { write(valueEvent('Saved before leaving.')); leave(); write(valueEvent('Stale event.')); next(); });
    expect(latest.view).toBe('menu');
    expect(record()).toMatchObject({ phase: 'predict', hypothesis: 'Saved before leaving.' });
  });

  it('retains legacy investigation work on flight launch and ignores queued transfer checks', async () => {
    const legacy = completeRecord({ phase: 'transfer', transferChoice: 'normal', transferAnswer: '', transferAttempts: 2 });
    await mount({}, { stallInvestigation: undefined, stallHunt: legacy });
    const boundary = handler(host.querySelectorAll('input[name="stall-transfer"]')[1], 'onChange');
    const launch = onClick('Try flight practice'), check = onClick('Check prediction');
    await act(async () => { boundary(); launch(); check(); launch(); });
    expect(latest.view).toBe('flying');
    expect(record()).toMatchObject({ hypothesis: legacy.hypothesis, explanation: legacy.explanation, transferChoice: 'boundary', transferAnswer: '', transferAttempts: 2, flight: { status: 'active' } });
    expect(record().observations).toHaveLength(3);
  });

  it('does not take focus away from a control chosen after phase navigation', async () => {
    await mount({ prediction: 'angle' });
    await click('Continue to trials');
    const speed = host.querySelector('#trial-airspeed');
    speed.focus();
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(document.activeElement).toBe(speed);
  });

  it('retires delayed phase focus when the learner leaves before it runs', async () => {
    await mount({ prediction: 'angle' });
    await click('Continue to trials');
    await click('← Back to menu');
    const target = host.querySelector('button');
    target.focus();
    await act(async () => { vi.advanceTimersByTime(0); });
    expect(latest.view).toBe('menu');
    expect(document.activeElement).toBe(target);
  });
});
