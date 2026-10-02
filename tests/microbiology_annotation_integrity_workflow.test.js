import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const act = React.act, previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
const conditions = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const specs = [
  { kind: 'growth', tab: 'growthLab', book: 'growthInvestigation', rows: 'trials', note: 'explanation', selector: '#gl-explanation', maximum: 12 },
  { kind: 'resistance', tab: 'resistance', book: 'resistanceNotebook', rows: 'records', note: 'reviewNote', selector: '#micro-resistance-reflection-4', maximum: 8 }
];
let config, mounted;
function growthTrial(id, label) {
  return { id, control: { ...conditions, imported: 'Keep raw control metadata' }, conditions: { ...conditions, oxygen: 0, imported: label },
    prediction: 'lower', hypothesis: 'Long original reasoning ' + 'h'.repeat(1500), explanation: label + ' ' + 'e'.repeat(1500),
    citedHours: [6, 12], metadata: { label, retained: [null, 4] } };
}
function resistanceRecord(id, label) {
  return { id, evidence: { dose: 30, duration: 8, initRes: 15, prediction: 'increase', explanation: 'selection', explanationSubmitted: false,
    notes: label + ' original ' + 'n'.repeat(1500), history: [{ day: 0, sensitive: 68, resistant: 12, extra: true }, { day: 1, sensitive: 20, resistant: 12 }],
    imported: { label, unchanged: true } }, reviewNote: label + ' reflection ' + 'r'.repeat(1500), metadata: [label, { keep: true }] };
}
function rawBook(spec) {
  const create = spec.kind === 'growth' ? growthTrial : resistanceRecord;
  const valid = Array.from({ length: spec.maximum + 1 }, (_, i) => create(i + 1, 'Raw ' + (i + 1)));
  valid.push(create(4, 'Duplicate original ID'), create('invalid-id', 'Repaired-ID record'));
  valid.splice(1, 0, null, { invalid: 'Untouched incomplete row' }, ['Untouched array row']);
  const book = { selectedId: 4, nextId: 'Do not coerce the stored counter', [spec.rows]: valid,
    unknown: { importVersion: 'old', notes: 'Untouched notebook metadata' }, hypothesis: 'Next hypothesis ' + 'x'.repeat(1500),
    prediction: 'higher', explanation: 'Next explanation ' + 'y'.repeat(1500) };
  if (spec.kind === 'growth') {
    book.control = { ...conditions, extra: 'Keep current control' };
    book.sweepVariable = 'tempC';
    book.sweep = { variable: 'tempC', conditions: { ...conditions }, extra: 'Current sweep metadata' };
    book.previousSweep = { variable: 'pH', conditions: { ...conditions }, extra: 'Previous sweep metadata' };
    book.removed = { index: 1, trial: create(99, 'Recover this trial'), extra: 'Recovery metadata' };
  } else book.removed = { index: 1, record: create(99, 'Recover this snapshot'), extra: 'Recovery metadata' };
  return book;
}
function seed(spec) {
  return {
    tab: spec.tab, showMicroLibrary: false, selectedBacterium: 'ecoli', selectedVirus: 'covid', selectedScope: 'lightbright',
    selectedMicrobiome: 'gut', selectedFerment: 'sourdough', selectedCase: 'snow', scopeOrganism: 'ecoli', magnification: 400,
    microscopeFocus: 10, microscopeTargetFocus: 50, gramStep: 0, quizIdx: 0, quizAnswers: [], quizSubmitted: false, quizCorrect: 0,
    growthLab: { ...conditions, hypothesis: 'Legacy draft', explanation: 'Legacy explanation', understood: true, stuckRevealed: true, log: [{ imported: true }], extra: 'Preserve current Growth settings' },
    growthReviewHour: 12, growthInvestigation: rawBook(specs[0]), resistanceNotebook: rawBook(specs[1]),
    resistanceComparison: { aId: 4, bId: 5, untouched: 'Keep raw comparison metadata' },
    resistanceInvestigation: { dose: 30, duration: 8, initRes: 15, prediction: 'increase', notes: 'Live run notes',
      history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 20, resistant: 12 }] },
    mysteryLab: { unrevisedRawData: { keep: true } }, microscopeMeasurements: { importedRawData: 'Do not normalize' },
    earnedXP: 41, rootMetadata: { original: ['keep all fields'] }
  };
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); config = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
});
function mount(value, otherTool = { draft: 'Another tool remains intact', extra: ['raw', 7] }) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, hold: false, pending: [], awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: value, otherTool });
    view.state = data; view.change = setData;
    return config.render(makeCtx({ toolData: data, setToolData: update => {
      if (view.hold) view.pending.push(update); else setData(update);
    }, awardXP: view.awardXP }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}
function node(selector) { return mounted.container.querySelector(selector); }
function open(spec) {
  if (spec.kind === 'resistance') act(() => { node('.micro-resistance-saved').open = true; });
  expect(node(spec.selector)).not.toBeNull();
}
function write(spec, value, caret = value.length) {
  const target = node(spec.selector);
  expect(target).not.toBeNull();
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(target, value);
    target.setSelectionRange(caret, caret);
    target.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function targetIndex(spec, state = mounted.state) { return state.microbiology[spec.book][spec.rows].findIndex(row => row && row.id === 4); }
function updateExpected(spec, before, value) {
  const result = JSON.parse(JSON.stringify(before));
  result.microbiology[spec.book][spec.rows][targetIndex(spec, result)][spec.note] = value;
  return result;
}
function release() {
  const pending = mounted.pending.splice(0); mounted.hold = false;
  expect(pending).toHaveLength(1); expect(typeof pending[0]).toBe('function');
  act(() => mounted.change(previous => pending.reduce((value, update) => typeof update === 'function' ? update(value) : update, previous)));
}

const selectionPaths = [
  { label: 'Growth trial list', spec: specs[0], selector: '#gl-trial-5' },
  { label: 'Growth comparison table', spec: specs[0], selector: '[data-review-trial="5"] button' },
  { label: 'Growth next unexplained trial', spec: specs[0], selector: '[data-next-unexplained-trial="5"]' },
  { label: 'Resistance saved snapshot', spec: specs[1], selector: '#micro-resistance-evidence-5' }
];
function selectionSeed(path) {
  const value = seed(path.spec), book = value[path.spec.book];
  book[path.spec.rows].find(item => item && item.id === 5)[path.spec.note] = '';
  if (path.label === 'Growth next unexplained trial') {
    book.selectedId = 13;
    book.trials[book.trials.length - 1].explanation = '';
    book.trials[book.trials.length - 2].explanation = '';
  }
  return value;
}
function chooseSaved(path) {
  const button = node(path.selector); expect(button).toBeTruthy(); expect(button.disabled).toBe(false);
  act(() => { button.focus(); button.click(); }); return button;
}

describe('Raw notebook selection before annotation', { timeout: 60000 }, () => {
  it.each(selectionPaths)('changes only selectedId through $label, then only that original record’s note', path => {
    const spec = path.spec; mount(selectionSeed(path)); if (spec.kind === 'resistance') open(spec);
    const before = mounted.state, random = vi.spyOn(Math, 'random'), button = chooseSaved(path);
    const selected = { ...before, microbiology: { ...before.microbiology, [spec.book]: { ...before.microbiology[spec.book], selectedId: 5 } } };
    expect(mounted.state).toEqual(selected);
    expect(mounted.state.microbiology[spec.book][spec.rows]).toBe(before.microbiology[spec.book][spec.rows]);
    if (path.label === 'Growth next unexplained trial') {
      act(() => vi.advanceTimersByTime(0)); expect(document.activeElement).toBe(node('#gl-explanation'));
    } else expect(document.activeElement).toBe(button);
    write({ ...spec, selector: spec.kind === 'growth' ? '#gl-explanation' : '#micro-resistance-reflection-5' }, 'Annotation on the selected original record');
    const expected = JSON.parse(JSON.stringify(selected));
    expected.microbiology[spec.book][spec.rows].find(item => item && item.id === 5)[spec.note] = 'Annotation on the selected original record';
    expect(mounted.state).toEqual(expected);
    expect(random).not.toHaveBeenCalled(); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(specs)('disables generated $kind repair-ID controls with readable help and no raw rewrite', spec => {
    mount(seed(spec)); if (spec.kind === 'resistance') open(spec);
    const before = mounted.state;
    for (const selector of spec.kind === 'growth' ? ['#gl-trial-1', '[data-review-trial="1"] button'] : ['#micro-resistance-evidence-1']) {
      const button = node(selector); expect(button).toBeTruthy(); expect(button.disabled).toBe(true);
      expect(node('#' + button.getAttribute('aria-describedby')).textContent).toContain('missing or duplicate IDs');
      act(() => button.click()); expect(mounted.state).toBe(before);
    }
    const valid = node(spec.kind === 'growth' ? '#gl-trial-5' : '#micro-resistance-evidence-5');
    expect(valid.disabled).toBe(false); act(() => valid.click());
    expect(mounted.state.microbiology[spec.book]).toEqual({ ...before.microbiology[spec.book], selectedId: 5 });
    expect(mounted.state.microbiology[spec.book][spec.rows]).toBe(before.microbiology[spec.book][spec.rows]);
  });

  it.each(selectionPaths)('uses latest raw state for $label and preserves intervening unrelated edits', path => {
    const spec = path.spec; mount(selectionSeed(path)); if (spec.kind === 'resistance') open(spec);
    mounted.hold = true; chooseSaved(path);
    act(() => mounted.change(previous => ({ ...previous, otherTool: { ...previous.otherTool, newer: true }, microbiology: {
      ...previous.microbiology, [spec.book]: { ...previous.microbiology[spec.book], newerNotebookMetadata: 'Keep this' }
    } })));
    const latest = mounted.state; release();
    expect(mounted.state).toEqual({ ...latest, microbiology: { ...latest.microbiology, [spec.book]: { ...latest.microbiology[spec.book], selectedId: 5 } } });
    expect(mounted.state.microbiology[spec.book][spec.rows]).toBe(latest.microbiology[spec.book][spec.rows]);
  });

  it.each([selectionPaths[0], selectionPaths[3]].flatMap(path => ['replacement owner', 'removed target', 'inactive tab'].map(change => [path, change])))
  ('rejects stale %j selection after %s', (path, change) => {
    const spec = path.spec; mount(selectionSeed(path)); if (spec.kind === 'resistance') open(spec);
    mounted.hold = true; chooseSaved(path);
    act(() => mounted.change(previous => {
      const current = previous.microbiology, book = current[spec.book];
      if (change === 'inactive tab') return { ...previous, microbiology: { ...current, tab: 'home' } };
      const rows = book[spec.rows].slice(), at = rows.findIndex(item => item && item.id === 5);
      if (change === 'removed target') rows.splice(at, 1); else rows[at] = { ...rows[at], replacementOwner: true };
      return { ...previous, microbiology: { ...current, [spec.book]: { ...book, [spec.rows]: rows } } };
    }));
    const latest = mounted.state; release(); expect(mounted.state).toBe(latest);
  });

  it.each(['later focus', 'same-ID replacement'])('does not redirect queued next-explanation focus after %s', action => {
    const path = selectionPaths[2]; mount(selectionSeed(path)); chooseSaved(path);
    if (action === 'later focus') act(() => node('#gl-hypothesis').focus());
    else act(() => mounted.change(previous => {
      const book = previous.microbiology.growthInvestigation;
      return { ...previous, microbiology: { ...previous.microbiology, growthInvestigation: { ...book,
        trials: book.trials.map(item => item && item.id === 5 ? { ...item, replacedOwner: true } : item) } } };
    }));
    const currentFocus = document.activeElement; act(() => vi.advanceTimersByTime(0));
    expect(document.activeElement).toBe(currentFocus); expect(document.activeElement).not.toBe(node('#gl-explanation'));
  });
});

describe('Raw notebook annotation integrity', { timeout: 60000 }, () => {
  it.each(specs)('changes only the retained original target $kind note through real input events', spec => {
    mount(seed(spec)); open(spec);
    const before = mounted.state, serialized = JSON.stringify(before), target = node(spec.selector);
    const raw = before.microbiology[spec.book], index = targetIndex(spec), random = vi.spyOn(Math, 'random');
    expect(raw[spec.rows].length).toBeGreaterThan(spec.maximum);
    act(() => target.focus()); write(spec, 'Literal <b>annotation</b>\nfor this evidence', 8);
    expect(mounted.state).toEqual(updateExpected(spec, before, 'Literal <b>annotation</b>\nfor this evidence'));
    expect(JSON.stringify(before)).toBe(serialized);
    expect(node(spec.selector)).toBe(target); expect(document.activeElement).toBe(target);
    expect(target.selectionStart).toBe(8); expect(target.selectionEnd).toBe(8);
    expect(mounted.state.otherTool).toBe(before.otherTool);
    expect(mounted.state.microbiology[spec.book].removed).toBe(raw.removed);
    raw[spec.rows].forEach((row, at) => { if (at !== index) expect(mounted.state.microbiology[spec.book][spec.rows][at]).toBe(row); });
    expect(mounted.state.microbiology[spec.book][spec.rows][index].metadata).toBe(raw[spec.rows][index].metadata);
    expect(mounted.awardXP).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });

  it.each(specs)('keeps $kind edits stable across repeated typing, length limits, and a JSON remount', spec => {
    mount(seed(spec)); open(spec);
    const target = node(spec.selector); act(() => target.focus());
    const before = mounted.state;
    for (const text of ['M', 'My revised explanation', 'My revised explanation of the saved evidence']) {
      write(spec, text, Math.min(4, text.length));
      expect(node(spec.selector)).toBe(target); expect(document.activeElement).toBe(target);
      expect(target.value).toBe(text); expect(mounted.state).toEqual(updateExpected(spec, before, text));
    }
    write(spec, 'z'.repeat(1300));
    expect(mounted.state).toEqual(updateExpected(spec, before, 'z'.repeat(1200)));
    const saved = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
    mount(saved.microbiology, saved.otherTool); open(spec);
    expect(mounted.state).toEqual(saved); expect(node(spec.selector).value).toBe('z'.repeat(1200));
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(specs)('does not rewrite a raw overlong $kind note when its displayed text is unchanged, and permits explicit clearing', spec => {
    mount(seed(spec)); open(spec);
    const before = mounted.state, displayed = node(spec.selector).value;
    expect(displayed).toHaveLength(1200);
    write(spec, displayed + 'Ignored beyond the annotation limit');
    expect(mounted.state).toBe(before);
    expect(mounted.state.microbiology[spec.book][spec.rows][targetIndex(spec)][spec.note].length).toBeGreaterThan(1200);
    write(spec, '');
    expect(mounted.state).toEqual(updateExpected(spec, before, ''));
    expect(node(spec.selector).value).toBe('');
  });

  it.each(specs)('applies a queued $kind annotation to the actual latest state while preserving intervening unrelated changes', spec => {
    mount(seed(spec)); open(spec);
    mounted.hold = true; write(spec, 'Latest target annotation');
    act(() => mounted.change(previous => {
      const book = previous.microbiology[spec.book];
      const rows = book[spec.rows].map(row => row && row.id === 5 ? { ...row, unrelatedEdit: 'Written after the input event' } : row);
      return { ...previous, otherTool: { ...previous.otherTool, addedLater: true }, microbiology: {
        ...previous.microbiology, latestMetadata: 'Must survive the queued annotation',
        [spec.book]: { ...book, [spec.rows]: rows, lateNotebookMetadata: { retained: true } }
      } };
    }));
    const latest = mounted.state;
    release();
    expect(mounted.state).toEqual(updateExpected(spec, latest, 'Latest target annotation'));
    expect(mounted.state.otherTool).toBe(latest.otherTool);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(specs.flatMap(spec => ['replacement owner', 'owner removed', 'different selection', 'inactive tab', 'JSON replacement'].map(change => [spec, change])))
  ('rejects a queued %j annotation after %s instead of writing to stale or reassigned evidence', (spec, change) => {
    mount(seed(spec)); open(spec);
    mounted.hold = true; write(spec, 'Obsolete input must not attach elsewhere');
    act(() => mounted.change(previous => {
      if (change === 'JSON replacement') return JSON.parse(JSON.stringify(previous));
      const current = previous.microbiology, book = current[spec.book], index = targetIndex(spec, previous);
      if (change === 'inactive tab') return { ...previous, microbiology: { ...current, tab: 'home' } };
      let nextBook;
      if (change === 'different selection') nextBook = { ...book, selectedId: 5 };
      else {
        const rows = book[spec.rows].slice();
        if (change === 'replacement owner') rows[index] = { ...rows[index], replacedOwner: true, [spec.note]: 'Replacement owner note' };
        else rows.splice(index, 1);
        nextBook = { ...book, [spec.rows]: rows };
      }
      return { ...previous, microbiology: { ...current, [spec.book]: nextBook } };
    }));
    const latest = mounted.state;
    release();
    expect(mounted.state).toBe(latest);
    expect(JSON.stringify(mounted.state)).not.toContain('Obsolete input must not attach elsewhere');
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(specs)('does not expose $kind annotation controls for a stale selected ID repaired onto a different record', spec => {
    const value = seed(spec), create = spec.kind === 'growth' ? growthTrial : resistanceRecord;
    value[spec.book] = { [spec.rows]: [create('invalid', 'Unowned repaired row'), create(9, 'Original valid row')], selectedId: 1 };
    mount(value);
    expect(node(spec.selector)).toBeNull();
    expect(node(spec.kind === 'growth' ? '#gl-explanation' : '[data-resistance-reflection]')).toBeNull();
    expect(mounted.state.microbiology[spec.book]).toEqual(value[spec.book]);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('keeps active Resistance playback, current cells, counts, comparison preferences, RNG and XP unchanged while reflecting', () => {
    const spec = specs[1]; mount(seed(spec)); open(spec);
    const schedule = vi.spyOn(globalThis, 'setTimeout'), cancel = vi.spyOn(globalThis, 'clearTimeout');
    const play = [...mounted.container.querySelectorAll('button')].find(button => button.textContent.trim() === '▶ Play');
    expect(play).toBeTruthy(); act(() => play.click());
    const scheduledRounds = () => schedule.mock.calls.filter(([, delay]) => delay === 600);
    expect(scheduledRounds()).toHaveLength(1);
    const roundTimerIndex = schedule.mock.calls.findIndex(([, delay]) => delay === 600);
    const roundTimer = schedule.mock.results[roundTimerIndex].value;
    const before = mounted.state, random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const selectEvent = vi.fn(); node(spec.selector).addEventListener('select', selectEvent);
    write(spec, 'Reflect while the run is playing');
    expect([...mounted.container.querySelectorAll('button')].some(button => button.textContent.trim() === '⏸ Pause')).toBe(true);
    expect(mounted.state).toEqual(updateExpected(spec, before, 'Reflect while the run is playing'));
    expect(mounted.state.microbiology.resistanceInvestigation).toBe(before.microbiology.resistanceInvestigation);
    expect(mounted.state.microbiology.resistanceComparison).toBe(before.microbiology.resistanceComparison);
    expect(scheduledRounds()).toHaveLength(1);
    expect(cancel.mock.calls.some(([timer]) => timer === roundTimer)).toBe(false);
    expect(random).not.toHaveBeenCalled(); expect(mounted.awardXP).not.toHaveBeenCalled();
    // JSDOM's setSelectionRange queues a zero-delay select event; it is not a simulation round.
    act(() => vi.advanceTimersByTime(0)); expect(selectEvent).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(599));
    expect(mounted.state.microbiology.resistanceInvestigation.day).toBe(before.microbiology.resistanceInvestigation.day);
    expect(random).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    const advanced = mounted.state.microbiology.resistanceInvestigation;
    expect(advanced.day).toBe(before.microbiology.resistanceInvestigation.day + 1);
    expect(advanced.history).toEqual(before.microbiology.resistanceInvestigation.history.concat([{ day: 2, sensitive: 20, resistant: 12 }]));
    // With random=0.99: 32 survival draws, 31 shuffle draws, and 32 unsuccessful reproduction draws.
    expect(random).toHaveBeenCalledTimes(95);
    expect(scheduledRounds()).toHaveLength(2);
    expect(mounted.state.microbiology.resistanceNotebook).toEqual(updateExpected(spec, before, 'Reflect while the run is playing').microbiology.resistanceNotebook);
    const pause = [...mounted.container.querySelectorAll('button')].find(button => button.textContent.trim() === '⏸ Pause');
    expect(pause).toBeTruthy(); act(() => pause.click());
    act(() => vi.advanceTimersByTime(1200));
    expect(mounted.state.microbiology.resistanceInvestigation).toBe(advanced);
    expect(random).toHaveBeenCalledTimes(95); expect(mounted.awardXP).not.toHaveBeenCalled();
  });
});
