import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const act = React.act, priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
let tool, mounted, outside;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  if (outside) { outside.remove(); outside = null; }
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct;
});

function seed() {
  const evidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'Raw original culture notes.',
    history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };
  const record = { claim: 'bacterium', evidence: ['structure', 'behavior'], reasoning: 'The original wall report.', limitation: 'bounded', metadata: { keep: true } };
  return {
    tab: 'home', earnedXP: 41, rootMetadata: { imported: ['Keep the root'] },
    mysteryLab: { active: 'unresolved', notice: 'saved', metadata: { keep: true }, cases: {
      wall: { claim: 'bacterium', evidence: ['structure', 'behavior'], revealed: ['context', 'size', 'structure', 'behavior'], collapsed: ['context'],
        reasoning: 'A revised wall explanation.', limitation: 'bounded', checked: true, reportView: 'recorded', record,
        previousRecord: { ...record, reasoning: 'An earlier report.', metadata: { previous: true } }, metadata: ['Keep the target'] },
      pond: { revealed: ['context'], reasoning: 'Long untouched draft ' + 'p'.repeat(1800), metadata: ['Keep the other case'] },
      unknown: { note: 'An imported case outside the teaching catalog.' }
    } },
    growthInvestigation: { selectedId: 3, nextId: 20, metadata: { keep: true }, hypothesis: 'Independent next-run question ' + 'h'.repeat(1400),
      conditions: { tempC: 18, imported: 'Keep this condition metadata' }, control: { tempC: 30 }, prediction: 'lower',
      trials: [{ id: 3, conditions: {}, control: {}, explanation: 'An already explained trial ' + 'e'.repeat(1400), metadata: { older: true } },
        { id: 7, conditions: { tempC: 18, imported: 'Keep target conditions' }, control: {}, explanation: '', hypothesis: 'Original target question ' + 'q'.repeat(1400), citedHours: [0, 6, 24], metadata: { target: true } }],
      unrecognizedImport: [null, 'Keep an unknown root field'] },
    growthReviewHour: 6, growthLab: { profile: 'ecoli', tempC: 24, hypothesis: 'Keep legacy notes' },
    resistanceNotebook: { selectedId: 3, nextId: 20, metadata: { keep: true }, records: [
      { id: 3, evidence: { ...evidence, notes: 'Untouched snapshot ' + 's'.repeat(1800) }, reviewNote: 'Earlier reflection ' + 'r'.repeat(1400), metadata: { older: true } },
      { id: 7, evidence: { ...evidence, metadata: { targetEvidence: true } }, reviewNote: '', metadata: { target: true } }
    ], unrecognizedImport: [null, 'Keep an unknown notebook field'] },
    resistanceInvestigation: window.__MicrobiologyCore.normalizeResistanceInvestigation(evidence),
    resistanceComparison: { aId: 3, bId: 7, metadata: { keep: true } }
  };
}

function mount(value = seed(), { strict = false } = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, hold: false, pending: [], awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: value, otherTool: { notes: 'Keep another tool', metadata: [null, 4] } });
    view.state = data; view.change = setData;
    return tool.render(makeCtx({ toolData: data, setToolData: update => {
      if (view.hold) view.pending.push(update); else setData(update);
    }, awardXP: view.awardXP }));
  }
  mounted = view;
  act(() => view.root.render(React.createElement(strict ? React.StrictMode : React.Fragment, null, React.createElement(Host))));
  return view;
}
const node = selector => mounted.container.querySelector(selector);
const flush = () => act(() => vi.advanceTimersByTime(0));
function click(selector) { const target = node(selector); expect(target, selector).toBeTruthy(); act(() => target.click()); return target; }
function queue(activity) {
  mounted.hold = true; click(`[data-work-next="${activity.id}"]`); expect(mounted.pending).toHaveLength(1);
  mounted.homeUpdate = mounted.pending[0];
  // Hold only this Home action. A later imported activity may legitimately
  // persist its culture or observed slides while the older action is waiting.
  mounted.hold = false;
}
function release() {
  const updates = mounted.pending.splice(0); mounted.hold = false;
  expect(updates).toHaveLength(1); expect(typeof updates[0]).toBe('function');
  expect(updates[0]).toBe(mounted.homeUpdate);
  const homeUpdate = mounted.homeUpdate; mounted.homeUpdate = null;
  act(() => mounted.change(previous => homeUpdate(previous)));
}
function externalFocus() {
  outside = document.createElement('input'); outside.setAttribute('aria-label', 'Independent focus target'); document.body.appendChild(outside);
  act(() => outside.focus()); return outside;
}
function microChange(change) { act(() => mounted.change(previous => ({ ...previous, microbiology: change(previous.microbiology) }))); }
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

const activities = [
  { id: 'mystery', tab: 'mystery', field: 'mysteryLab', selection: 'active', selected: 'wall', anchor: 'micro-mystery-report-heading',
    target: book => book.cases.wall, replace: (book, target) => ({ ...book, cases: { ...book.cases, wall: target } }),
    expected: book => ({ ...book, active: 'wall', notice: '', cases: { ...book.cases, wall: { ...book.cases.wall, reportView: 'working' } } }),
    other: book => ({ ...book, cases: { ...book.cases, pond: { ...book.cases.pond, laterNote: 'A newer other-case note.' } } }),
    mutate: target => { target.reasoning = 'A newer target explanation.'; }, routeChange: book => ({ ...book, cases: { ...book.cases, wall: { ...book.cases.wall, reasoning: book.cases.wall.record.reasoning } } }) },
  { id: 'growth', tab: 'growthLab', field: 'growthInvestigation', selection: 'selectedId', selected: 7, anchor: 'gl-explanation',
    target: book => book.trials[1], replace: (book, target) => ({ ...book, trials: [book.trials[0], target] }), expected: book => ({ ...book, selectedId: 7 }),
    other: book => ({ ...book, trials: [{ ...book.trials[0], laterNote: 'A newer other-trial note.' }, book.trials[1]] }),
    mutate: target => { target.explanation = 'A newer target explanation.'; }, routeChange: book => ({ ...book, trials: [book.trials[0], { ...book.trials[1], explanation: 'The target is now explained.' }] }) },
  { id: 'resistance', tab: 'resistance', field: 'resistanceNotebook', selection: 'selectedId', selected: 7, anchor: 'micro-resistance-reflection-7',
    target: book => book.records[1], replace: (book, target) => ({ ...book, records: [book.records[0], target] }), expected: book => ({ ...book, selectedId: 7 }),
    other: book => ({ ...book, records: [{ ...book.records[0], laterNote: 'A newer other-snapshot note.' }, book.records[1]] }),
    mutate: target => { target.reviewNote = 'A newer target reflection.'; }, routeChange: book => ({ ...book, records: [book.records[0], { ...book.records[1], reviewNote: 'The target is now reflected.' }] }) }
];

function expectAccepted(before, activity) {
  const micro = mounted.state.microbiology;
  expect(micro.tab).toBe(activity.tab);
  expect(micro[activity.field]).toEqual(activity.expected(before.microbiology[activity.field]));
  for (const [key, value] of Object.entries(before.microbiology)) {
    if (key !== 'tab' && key !== activity.field && !(activity.id === 'resistance' && key === 'resistanceInvestigation')) expect(micro[key], key).toEqual(value);
  }
  expect(mounted.state.otherTool).toBe(before.otherTool);
  expect(mounted.awardXP).not.toHaveBeenCalled();
}

describe('Home contextual resume preserves raw notebooks', { timeout: 60000 }, () => {
  it.each(activities)('changes only the intended $id destination fields and keeps raw evidence and long notes', activity => {
    mount(); const before = mounted.state, random = vi.spyOn(Math, 'random');
    click(`[data-work-next="${activity.id}"]`); expectAccepted(before, activity); flush();
    expect(document.activeElement).toBe(node('#' + activity.anchor));
    if (activity.id === 'resistance') expect(document.activeElement.closest('details').open).toBe(true);
    expect(random).not.toHaveBeenCalled();
  });

  it.each(activities)('keeps frozen imports through $id resume and JSON reload', activity => {
    mount(freeze(seed())); const before = mounted.state;
    click(`[data-work-next="${activity.id}"]`); expectAccepted(before, activity);
    const restored = JSON.parse(JSON.stringify(mounted.state.microbiology));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; mount(restored);
    expect(mounted.state.microbiology[activity.field]).toEqual(restored[activity.field]);
    expect(mounted.state.microbiology.rootMetadata).toEqual(restored.rootMetadata);
  });

  it.each(activities)('keeps latest unrelated notebook, other-record, tool and root edits for queued $id resume', activity => {
    mount(); queue(activity);
    act(() => mounted.change(previous => ({ ...previous, otherTool: { ...previous.otherTool, later: true }, microbiology: {
      ...previous.microbiology, rootMetadata: { later: true }, microscopeMeasurements: { newerOtherActivity: true },
      [activity.field]: { ...activity.other(previous.microbiology[activity.field]), newerNotebookMetadata: ['Keep latest metadata'] }
    } })));
    const latest = mounted.state; release(); expectAccepted(latest, activity);
  });

  it.each(activities)('keeps new metadata on the original $id target owner', activity => {
    mount(); queue(activity);
    microChange(micro => {
      activity.target(micro[activity.field]).laterMetadata = { preserved: ['The original owner'] };
      return { ...micro, newerRootNote: 'Keep this note' };
    });
    const latest = mounted.state; release(); expectAccepted(latest, activity);
    expect(activity.target(mounted.state.microbiology[activity.field]).laterMetadata).toBe(activity.target(latest.microbiology[activity.field]).laterMetadata);
  });

  it.each(activities)('handles $id resume and accepted focus when StrictMode repeats the functional updater', activity => {
    mount(seed(), { strict: true }); const before = mounted.state;
    click(`[data-work-next="${activity.id}"]`); expectAccepted(before, activity); flush();
    expect(document.activeElement).toBe(node('#' + activity.anchor));
  });

  it.each(['growth', 'resistance'])('repairs only the explicitly resumed raw %s target ID', id => {
    const value = seed(), growth = id === 'growth', field = growth ? 'growthInvestigation' : 'resistanceNotebook', records = growth ? 'trials' : 'records';
    const book = value[field], target = { ...book[records][1], id: 'broken' }, other = { ...book[records][0], id: 1 };
    book[records] = [target, null, { malformedImport: ['Keep this unsupported entry'] }, other]; book.selectedId = 2;
    if (!growth) value.resistanceComparison = { aId: 2, bId: 1, metadata: { preserve: true } };
    mount(value); const before = mounted.state, prior = before.microbiology[field];
    expect(node(`[data-work-next="${id}"]`).textContent).toContain('2');
    click(`[data-work-next="${id}"]`); flush();
    expect(mounted.state.microbiology[field]).toEqual({ ...prior, selectedId: 2, [records]: [{ ...target, id: 2 }, null, prior[records][2], other] });
    expect(mounted.state.microbiology[field][records][3]).toBe(other);
    expect(mounted.state.microbiology[field][records][0].metadata).toBe(target.metadata);
    if (!growth) expect(mounted.state.microbiology.resistanceComparison).toEqual({ ...before.microbiology.resistanceComparison, aId: null, bId: 1 });
    const restored = JSON.parse(JSON.stringify(mounted.state.microbiology[field]));
    const api = growth ? window.__MicrobiologyCore.growth : window.__MicrobiologyCore.resistance;
    expect(api.normalizeNotebook(restored).selectedId).toBe(2);
    expect(document.activeElement.id).toBe(growth ? 'gl-explanation' : 'micro-resistance-reflection-2');
  });

  it.each(['growth', 'resistance'])('repairs a resumed duplicate %s ID without changing its first valid owner or any notes', id => {
    const value = seed(), growth = id === 'growth', field = growth ? 'growthInvestigation' : 'resistanceNotebook', records = growth ? 'trials' : 'records';
    const book = value[field], first = { ...book[records][0], id: 1 }, target = { ...book[records][1], id: 1 };
    book[records] = [first, target]; book.selectedId = 1;
    if (!growth) value.resistanceComparison = { aId: 1, bId: 2, metadata: { keep: true } };
    mount(value); const before = mounted.state;
    expect(node(`[data-work-next="${id}"]`).textContent).toContain('2');
    click(`[data-work-next="${id}"]`); flush();
    expect(mounted.state.microbiology[field]).toEqual({ ...before.microbiology[field], selectedId: 2, [records]: [first, { ...target, id: 2 }] });
    expect(mounted.state.microbiology[field][records][0]).toBe(first);
    if (!growth) expect(mounted.state.microbiology.resistanceComparison).toEqual({ ...before.microbiology.resistanceComparison, aId: 1, bId: null });
    expect(document.activeElement.id).toBe(growth ? 'gl-explanation' : 'micro-resistance-reflection-2');
  });
});

describe('Home contextual resume rejects stale requests', { timeout: 60000 }, () => {
  const changes = ['tab change', 'JSON import', 'selection change', 'target replacement', 'target field change', 'changed next action'];
  it.each(activities.flatMap(activity => changes.map(change => ({ activity, change }))))('rejects queued $activity.id resume after $change', ({ activity, change }) => {
    mount(); queue(activity);
    if (change === 'JSON import') act(() => mounted.change(previous => JSON.parse(JSON.stringify(previous))));
    else microChange(micro => {
      if (change === 'tab change') return { ...micro, tab: 'quiz' };
      const book = micro[activity.field];
      if (change === 'selection change') return { ...micro, [activity.field]: { ...book, [activity.selection]: activity.id === 'mystery' ? 'pond' : 7 } };
      if (change === 'changed next action') return { ...micro, [activity.field]: activity.routeChange(book) };
      if (change === 'target replacement') return { ...micro, [activity.field]: activity.replace(book, { ...activity.target(book), importedReplacement: true }) };
      activity.mutate(activity.target(book)); return { ...micro };
    });
    const latest = mounted.state; release(); expect(mounted.state).toBe(latest); flush();
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(activities)('rejects a queued $id resume before focusing a newer imported destination', activity => {
    mount(); externalFocus(); queue(activity);
    act(() => mounted.change(previous => ({ ...JSON.parse(JSON.stringify(previous)), microbiology: {
      ...JSON.parse(JSON.stringify(previous.microbiology)), tab: activity.tab
    } })));
    const latest = mounted.state; release(); flush();
    expect(mounted.state).toBe(latest); expect(document.activeElement).toBe(outside);
  });

  it.each(activities)('keeps external focus after an accepted $id resume is followed by a same-route JSON import', activity => {
    mount(); click(`[data-work-next="${activity.id}"]`);
    act(() => mounted.change(previous => JSON.parse(JSON.stringify(previous))));
    externalFocus(); flush(); expect(document.activeElement).toBe(outside);
  });

  it.each(activities)('keeps external focus when the $id target changes after an accepted resume', activity => {
    mount(); click(`[data-work-next="${activity.id}"]`);
    microChange(micro => ({ ...micro, [activity.field]: activity.replace(micro[activity.field], { ...activity.target(micro[activity.field]), newerTarget: true }) }));
    externalFocus(); flush(); expect(document.activeElement).toBe(outside);
  });

  it.each(activities)('keeps accepted $id focus through an unrelated root edit', activity => {
    mount(); click(`[data-work-next="${activity.id}"]`);
    microChange(micro => ({ ...micro, rootMetadata: { newer: true } }));
    externalFocus(); flush(); expect(document.activeElement).toBe(node('#' + activity.anchor));
    expect(mounted.state.microbiology.rootMetadata).toEqual({ newer: true });
  });
});

function readOnlySeed(id) {
  const value = seed();
  if (id === 'microscope') {
    value.scopeOrganism = 'strep';
    value.microscopeMeasurements = { ecoli: { draft: { value: '3', unit: 'um', context: { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 } }, metadata: { keep: true } } };
  } else if (id === 'gram') value.gramInvestigation = { step: 4, maxStep: 4, prediction: 'thin', interpretation: 'wall', explanation: '', metadata: { keep: true } };
  else value.quizAnswers = [0];
  return value;
}
const readOnlyRoutes = [
  { id: 'microscope', tab: 'microscope', anchor: 'micro-measurement-notebook-ecoli', mutate: micro => { micro.microscopeMeasurements.ecoli.draft.value = '4'; } },
  { id: 'gram', tab: 'bacteria', anchor: 'micro-gram-explanation', mutate: micro => { micro.gramInvestigation.explanation = 'A newer completed Gram explanation.'; } },
  { id: 'quiz', tab: 'quiz', anchor: 'micro-quiz-question-1', mutate: micro => { micro.quizAnswers[1] = 0; } }
];

describe('Home routes without notebook selection still belong to current work', { timeout: 60000 }, () => {
  it.each(readOnlyRoutes)('opens $id contextual focus without changing retained raw work', route => {
    mount(readOnlySeed(route.id)); const before = mounted.state;
    click(`[data-work-next="${route.id}"]`); flush();
    expect(mounted.state.microbiology.tab).toBe(route.tab);
    expect(document.activeElement).toBe(node('#' + route.anchor));
    for (const key of ['mysteryLab', 'growthInvestigation', 'resistanceNotebook', 'gramInvestigation', 'quizAnswers', 'microscopeMeasurements']) {
      if (Object.hasOwn(before.microbiology, key)) expect(mounted.state.microbiology[key], key).toEqual(before.microbiology[key]);
    }
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(readOnlyRoutes.flatMap(route => ['JSON import', 'target update', 'tab change'].map(change => ({ route, change }))))
  ('rejects queued $route.id focus after $change', ({ route, change }) => {
    mount(readOnlySeed(route.id)); queue(route);
    if (change === 'JSON import') act(() => mounted.change(previous => JSON.parse(JSON.stringify(previous))));
    else microChange(micro => {
      if (change === 'tab change') return { ...micro, tab: route.tab };
      route.mutate(micro); return { ...micro };
    });
    const latest = mounted.state; release(); expect(mounted.state).toBe(latest);
  });

  it.each(readOnlyRoutes)('keeps external focus after a newer imported $id destination', route => {
    mount(readOnlySeed(route.id)); click(`[data-work-next="${route.id}"]`);
    act(() => mounted.change(previous => JSON.parse(JSON.stringify(previous))));
    externalFocus(); flush(); expect(document.activeElement).toBe(outside);
  });
});

function recoverySeed(id) {
  const value = seed(), growth = id === 'growth', field = growth ? 'growthInvestigation' : 'resistanceNotebook', records = growth ? 'trials' : 'records';
  const source = value[field][records][1];
  value[field].removed = { [growth ? 'trial' : 'record']: { ...source, id: 9, importedRecovery: { keep: true } }, index: 1, metadata: ['Keep recovery metadata'] };
  return value;
}
const recoveryRoutes = ['growth', 'resistance'].map(id => ({ id, field: id === 'growth' ? 'growthInvestigation' : 'resistanceNotebook',
  raw: id === 'growth' ? 'trial' : 'record', anchor: id === 'growth' ? 'gl-restore-removed' : 'micro-resistance-restore-removed' }));

describe('Home recovery routes preserve the current removed evidence', { timeout: 60000 }, () => {
  it.each(recoveryRoutes)('reviews $id recovery without replacing any raw record, notes, or recovery metadata', route => {
    mount(recoverySeed(route.id)); const before = mounted.state;
    click(`[data-work-next="${route.id}"]`); flush();
    expect(mounted.state.microbiology[route.field]).toBe(before.microbiology[route.field]);
    expect(mounted.state.microbiology.resistanceComparison).toBe(before.microbiology.resistanceComparison);
    expect(document.activeElement).toBe(node('#' + route.anchor)); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(recoveryRoutes.flatMap(route => ['replacement removed owner', 'in-place removed evidence'].map(change => ({ route, change }))))
  ('rejects queued $route.id recovery after $change', ({ route, change }) => {
    mount(recoverySeed(route.id)); queue(route);
    microChange(micro => {
      const book = micro[route.field], removed = book.removed;
      if (change === 'replacement removed owner') return { ...micro, [route.field]: { ...book, removed: {
        ...removed, [route.raw]: { ...removed[route.raw], newerImportedOwner: true }
      } } };
      if (route.id === 'growth') removed.trial.hypothesis = 'A newer removed-trial question.';
      else removed.record.evidence.history[1].sensitive = 20;
      return { ...micro };
    });
    const latest = mounted.state; release(); expect(mounted.state).toBe(latest);
  });

  it.each(recoveryRoutes)('keeps newer unrelated $id notebook metadata when accepting recovery', route => {
    mount(recoverySeed(route.id)); queue(route);
    microChange(micro => ({ ...micro, [route.field]: { ...micro[route.field], laterNotebookMetadata: ['Keep this later import metadata'] } }));
    const latest = mounted.state; release(); flush();
    expect(mounted.state.microbiology[route.field]).toBe(latest.microbiology[route.field]);
    expect(document.activeElement).toBe(node('#' + route.anchor));
  });

  it.each(recoveryRoutes)('keeps external focus after a newer same-id $id recovery import', route => {
    mount(recoverySeed(route.id)); click(`[data-work-next="${route.id}"]`);
    act(() => mounted.change(previous => JSON.parse(JSON.stringify(previous))));
    externalFocus(); flush(); expect(document.activeElement).toBe(outside);
  });

  it.each(recoveryRoutes)('focuses accepted $id recovery under StrictMode', route => {
    mount(recoverySeed(route.id), { strict: true }); const before = mounted.state;
    click(`[data-work-next="${route.id}"]`); flush();
    expect(mounted.state.microbiology[route.field]).toBe(before.microbiology[route.field]);
    expect(document.activeElement).toBe(node('#' + route.anchor));
  });
});
