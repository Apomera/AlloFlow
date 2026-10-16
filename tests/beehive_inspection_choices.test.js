import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.BEEHIVE_TEST_SOURCE || 'stem_lab/stem_tool_beehive.js';
const groups = { brood: ['solid', 'spotty'], cells: ['yes', 'no'] };
const groupNames = { brood: 'Brood pattern', cells: 'Queen cells' };
let host, root, latest, config, writes, awardXP;

beforeEach(() => {
  resetStemLab();
  config = loadTool(TOOL, 'beehive');
  const gradient = { addColorStop: vi.fn() };
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => gradient, createRadialGradient: () => gradient
  }, {
    get: (target, key) => key in target ? target[key] : (target[key] = vi.fn()),
    set: (target, key, value) => ((target[key] = value), true)
  });
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  writes = vi.fn(); awardXP = vi.fn();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  if (host) host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount(changes = {}) {
  const initial = { beehive: {
    viewMode: 'beekeeper', day: 40, tutorialDone: true, motionPaused: true,
    autoAdvance: false, soundOn: false, queenHealth: 100, workers: 8000,
    honey: 60, pollen: 20, brood: 8000, capacity: 80, morale: 80,
    varroaLevel: 5, actionPoints: 3, colonySurvived: true,
    simulationSeed: 2468, randomState: 1357, seededFromDay: 0,
    inspectionDraft: {}, inspectionsDone: 4, hive3dFramesSeen: [0, 1], hive3dFoundQueen: false,
    beekeeperNotebook: { prediction: 'Keep my prediction', evidence: 'Keep my observations', explanation: 'Keep my explanation' },
    ...changes
  } };
  function App() {
    const [data, setData] = React.useState(initial);
    const setToolData = React.useCallback(updater => { writes(updater); setData(updater); }, []);
    latest = data;
    return config.render(makeCtx({ toolData: data, setToolData, awardXP }));
  }
  await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  writes.mockClear(); awardXP.mockClear();
}

function choice(id, value) {
  const button = host.querySelector('[data-inspection-choice="' + id + ':' + value + '"]');
  expect(button).toBeTruthy();
  return button;
}
function recordButton() { return host.querySelector('[data-inspection-record]'); }
function draftStatus() { return host.querySelector('[data-inspection-draft-status="true"]'); }
function expectGroup(id, selected) {
  const radios = groups[id].map(value => choice(id, value));
  const selectedIsValid = groups[id].includes(selected);
  radios.forEach((radio, index) => {
    expect(radio.getAttribute('role')).toBe('radio');
    expect(radio.getAttribute('aria-checked')).toBe(String(groups[id][index] === selected));
    expect(radio.tabIndex).toBe(selectedIsValid ? (groups[id][index] === selected ? 0 : -1) : (index === 0 ? 0 : -1));
  });
  expect(radios.filter(radio => radio.tabIndex === 0)).toHaveLength(1);
}
async function click(button) {
  await act(async () => { button.click(); await Promise.resolve(); });
}
async function press(button, key) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  await act(async () => { button.dispatchEvent(event); await Promise.resolve(); });
  return event;
}
function expectOnlyDraftChange(before, draft) {
  expect(latest).toEqual({ ...before, beehive: { ...before.beehive, inspectionDraft: draft } });
  expect(awardXP).not.toHaveBeenCalled();
}

describe('guided inspection answer controls', () => {
  it('exposes two required groups with one initial Tab stop each and explains what is missing', async () => {
    await mount();
    for (const id of Object.keys(groups)) {
      const group = host.querySelector('[role="radiogroup"][aria-label="' + groupNames[id] + '"]');
      expect(group).toBeTruthy();
      expect(group.getAttribute('aria-required')).toBe('true');
      expect(group.getAttribute('aria-describedby')).toBe('beehive-inspection-choice-help' + (id === 'cells' ? ' beehive-inspection-bottom-bar-help' : ' beehive-inspection-brood-guide-help'));
      expectGroup(id);
    }
    expect(host.querySelector('#beehive-inspection-choice-help').textContent.trim().length).toBeGreaterThan(0);
    expect(draftStatus().id).toBe('beehive-inspection-draft-status');
    expect(draftStatus().textContent).toContain('Answers chosen: 0 of 2.');
    expect(draftStatus().textContent.toLowerCase()).toContain('brood');
    expect(draftStatus().textContent.toLowerCase()).toContain('queen');
    expect(recordButton().getAttribute('aria-describedby')).toBe('beehive-inspection-draft-status');
    expect(recordButton().disabled).toBe(true);
  });

  it('restores only the valid chosen answers as Tab stops and reports that the draft is ready', async () => {
    await mount({ inspectionDraft: { brood: 'spotty', cells: 'no', note: 'Retain this draft metadata' } });
    expectGroup('brood', 'spotty'); expectGroup('cells', 'no');
    expect(draftStatus().textContent).toContain('Answers chosen: 2 of 2.');
    expect(recordButton().disabled).toBe(false);
    expect(writes).not.toHaveBeenCalled();
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('does not choose an answer on focus or consume Tab navigation', async () => {
    await mount();
    const before = structuredClone(latest);
    for (const id of Object.keys(groups)) {
      const first = choice(id, groups[id][0]);
      await act(async () => { first.focus(); });
      expect(document.activeElement).toBe(first);
      expectGroup(id);
      const tab = await press(first, 'Tab');
      expect(tab.defaultPrevented).toBe(false);
    }
    expect(latest).toEqual(before);
    expect(writes).not.toHaveBeenCalled();
    expect(awardXP).not.toHaveBeenCalled();
    expect(draftStatus().textContent).toContain('Answers chosen: 0 of 2.');
  });

  it.each(['brood', 'cells'])('moves, selects, wraps, and preserves other work using every navigation key in %s', async id => {
    const other = id === 'brood' ? 'cells' : 'brood';
    const otherValue = groups[other][1];
    const previous = { day: 40, brood: 'solid', cells: 'no', broodCorrect: true, cellsCorrect: true, framesRead: 2, queenFound: false };
    await mount({ lastInspection: previous, inspectionDraft: { [other]: otherValue, note: 'Keep draft metadata', nested: { value: 8 } } });
    const baseline = structuredClone(latest);
    const savedFeedback = host.querySelector('[data-inspection-feedback]').textContent;
    const [first, second] = groups[id];
    await act(async () => { choice(id, first).focus(); });
    // Both directions wrap; Home and End choose their endpoints.
    const moves = [['ArrowRight', second], ['ArrowDown', first], ['ArrowLeft', second], ['ArrowUp', first], ['End', second], ['Home', first]];
    for (const [key, expected] of moves) {
      const beforeWrites = writes.mock.calls.length;
      const event = await press(document.activeElement, key);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(choice(id, expected));
      expectGroup(id, expected); expectGroup(other, otherValue);
      expectOnlyDraftChange(baseline, { ...baseline.beehive.inspectionDraft, [id]: expected });
      expect(writes.mock.calls.length - beforeWrites).toBe(1);
      expect(host.querySelector('[data-inspection-feedback]').textContent).toBe(savedFeedback);
      expect(draftStatus().textContent).toContain('Answers chosen: 2 of 2.');
    }
  });

  it.each([
    [{ brood: 'unexpected', cells: 'no' }, 1, 'brood'],
    [{ brood: 'solid', cells: 'unexpected' }, 1, 'queen'],
    [{ brood: 'unexpected', cells: 'unexpected' }, 0, 'brood']
  ])('does not count or submit unsupported truthy draft answers %j', async (draft, count, missingText) => {
    await mount({ inspectionDraft: { ...draft, note: 'Keep me' } });
    const before = structuredClone(latest);
    expectGroup('brood', draft.brood); expectGroup('cells', draft.cells);
    expect(draftStatus().textContent).toContain('Answers chosen: ' + count + ' of 2.');
    expect(draftStatus().textContent.toLowerCase()).toContain(missingText);
    expect(recordButton().disabled).toBe(true);
    await click(recordButton());
    expect(latest).toEqual(before);
    expect(writes).not.toHaveBeenCalled();
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('keeps click selection local to the draft and records the same grades, state fields, and XP', async () => {
    await mount({ inspectionDraft: { note: 'Keep until recording' } });
    const before = structuredClone(latest);
    await click(choice('brood', 'solid'));
    expectOnlyDraftChange(before, { note: 'Keep until recording', brood: 'solid' });
    expect(draftStatus().textContent).toContain('Answers chosen: 1 of 2.');
    expect(recordButton().disabled).toBe(true);
    await click(choice('cells', 'yes'));
    expectOnlyDraftChange(before, { note: 'Keep until recording', brood: 'solid', cells: 'yes' });
    expectGroup('brood', 'solid'); expectGroup('cells', 'yes');
    expect(recordButton().disabled).toBe(false);
    expect(writes).toHaveBeenCalledTimes(2);
    await click(recordButton());
    expect(latest).toEqual({ ...before, beehive: { ...before.beehive,
      inspectionDraft: {}, inspectionsDone: 5,
      lastInspection: { day: 40, framesRead: 2, queenFound: false, brood: 'solid', cells: 'yes', broodCorrect: true, cellsCorrect: false }
    } });
    expect(writes).toHaveBeenCalledTimes(3);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('beehive', 10, 'Guided hive inspection');
    expectGroup('brood'); expectGroup('cells');
    expect(draftStatus().textContent).toContain('Answers chosen: 0 of 2.');
    expect(recordButton().disabled).toBe(true);
  });

  it('keeps an earlier same-day review visible while the next unanswered draft starts at its first options', async () => {
    const record = { day: 40, brood: 'spotty', cells: 'yes', broodCorrect: false, cellsCorrect: false, framesRead: 6, queenFound: true };
    await mount({ lastInspection: record, inspectionDraft: {} });
    expectGroup('brood'); expectGroup('cells');
    expect(recordButton().disabled).toBe(true);
    const feedback = host.querySelector('[data-inspection-feedback]');
    expect(feedback).toBeTruthy();
    expect(feedback.querySelector('[data-inspection-result="brood"] [data-inspection-answer]').textContent).toBe('Spotty, with gaps');
    expect(feedback.querySelector('[data-inspection-result="cells"] [data-inspection-answer]').textContent).toBe('Yes');
    expect(latest.beehive.lastInspection).toEqual(record);
    expect(writes).not.toHaveBeenCalled();
    expect(awardXP).not.toHaveBeenCalled();
  });
});
