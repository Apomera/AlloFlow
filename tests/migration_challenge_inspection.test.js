import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let tool;
const mounts = [];
const clone = value => JSON.parse(JSON.stringify(value));
const starts = {
  wind: { speciesId: 'monarch', season: 'fall', wind: -15, formationMode: 'natural' },
  formation: { speciesId: 'canada_goose', season: 'fall', wind: 0, formationMode: 'solo' },
  season: { speciesId: 'canada_goose', season: 'fall', wind: 8, formationMode: 'natural' }
};
const changes = { wind: { wind: 4 }, formation: { formationMode: 'v' }, season: { season: 'spring' } };
function attempt(goal = 'wind', patch = {}) {
  return { baseline: { ...starts[goal] }, snapshot: { ...starts[goal], ...changes[goal] }, prediction: 'Recorded prediction', notes: 'Recorded explanation', ...patch };
}
function challenges(goal = 'wind', rows = [attempt(goal)]) {
  return { selectedId: goal, work: Object.fromEntries(Object.keys(starts).map(id => [id,
    { prediction: 'Current ' + id + ' prediction', notes: 'Current ' + id + ' explanation', setup: { ...starts[id] }, attempts: id === goal ? rows : [attempt(id)] }])) };
}
function committedProps(element) {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  if (!key) throw new Error('Expected committed React DOM props');
  return element[key];
}
function type(element, value) {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: false,
    flightSpecies: 'arctic_tern', flightWind: 11, flightSeason: 'spring', flightFormation: 'loose',
    flightChallenges: challenges(), flightInvestigation: { variable: 'wind', prediction: 'Other prediction',
      baseline: { ...starts.wind }, trials: [], evidence: 'Other evidence', explanation: 'Other reasoning' },
    flightStudyObservations: { drafts: { 'canada_goose:tail': 'Study draft' }, records: {} },
    inquiry: { hypothesis: 'Independent question' }, ...seed }, refresh;
  let readRefs = [], readStates = [], readIds = [];
  const refs = [], writes = [], queued = [], announce = vi.fn(), awardXP = vi.fn();
  const tracedReact = { ...React,
    useRef(value) { const ref = React.useRef(value); readRefs.push(ref); if (!refs.includes(ref)) refs.push(ref); return ref; },
    useState(value) { const pair = React.useState(value); readStates.push(pair); return pair; },
    useId() { const id = React.useId(); readIds.push(id); return id; }
  };
  const ctx = makeCtx({ ...options.ctx, React: tracedReact, announceToSR: announce, awardXP,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_, patch) => {
      writes.push(patch); if (options.inspectMulti) options.inspectMulti(patch, refs);
      if (options.delayMulti) { queued.push(patch); return; }
      state = { ...state, ...patch }; refresh(n => n + 1);
    }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() {
    refresh = React.useState(0)[1]; readRefs = []; readStates = []; readIds = [];
    ctx.toolData = { migration: state }; return tool.render(ctx);
  }
  act(() => { root.render(React.createElement(Component)); });
  const stage = host.querySelector('[id="migration-flight-stage"]');
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const ui = {
    host, stage, engineRef, refs, writes, queued, announce, awardXP,
    get state() { return state; },
    owner() { return refs.find(ref => ref.current?.panel && ref.current?.challenges)?.current; },
    live() { return refs.find(ref => ref.current?.flightSpeedValues)?.current; },
    panel() { return host.querySelector('[data-migration-flight-challenges]'); },
    row(index = 1) { return host.querySelector('[data-flight-challenge-attempt="' + index + '"]'); },
    button(source = 'snapshot', index = 1) { return ui.row(index)?.querySelector('[data-flight-challenge-inspect="' + source + '"]'); },
    strip() { return host.querySelector('[data-flight-challenge-inspection]'); },
    back() { return host.querySelector('[data-flight-challenge-return]'); },
    field() { return host.querySelector('[data-flight-reflection-input]'); },
    inspect(source = 'snapshot', index = 1) { act(() => { ui.button(source, index).click(); }); },
    return() { act(() => { ui.back().click(); }); },
    invoke(props, node) { act(() => { props.onClick({ currentTarget: node }); }); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    choose(goal) { act(() => { host.querySelector('[data-flight-challenge="' + goal + '"]').click(); }); },
    openReflection(index = 1) {
      ui.panel().open = true; host.querySelector('[data-flight-challenge-history]').open = true;
      ui.row(index).querySelector('[data-flight-challenge-reflection]').open = true;
      act(() => { ui.row(index).querySelector('[data-flight-reflection-action="edit"]').click(); });
    },
    type(value) { act(() => { type(ui.field(), value); }); },
    editCurrent(value) { act(() => { type(host.querySelector('[id="migration-mission-prediction"]'), value); }); },
    remove(index = 1) { act(() => { ui.row(index).querySelector('.migration-mission-remove').click(); }); },
    flush() { act(() => { state = { ...state, ...queued.shift() }; refresh(n => n + 1); }); },
    async frame(patch = {}) {
      const request = ui.owner().inspection;
      // The real renderer supplies this acknowledgment after render. Unit
      // tests isolate its consumer; the browser journey verifies actual WebGL.
      const engine = { host: stage, speciesId: ui.state.flightSpecies, formationMode: ui.state.flightFormation,
        season: ui.state.flightSeason, challengeInspectionFrame: request, ...patch };
      engineRef.current = engine;
      await act(async () => { stage.setAttribute('data-flight-ready', 'true'); stage.setAttribute('data-flight-challenge-frame', String(request?.serial || 0)); await Promise.resolve(); });
      return engine;
    },
    abandon(patch) {
      const savedRefs = readRefs.slice(), savedStates = readStates.slice(); let r = 0, s = 0;
      const savedIds = readIds.slice(); let idIndex = 0;
      const replay = { ...React, useId: () => savedIds[idIndex++], useRef: () => savedRefs[r++], useState: () => savedStates[s++], useEffect: () => {}, useCallback: fn => fn };
      return tool.render({ ...ctx, React: replay, toolData: { migration: { ...state, ...patch } } });
    }
  };
  return ui;
}
const keys = ['flightCamera', 'flightFormation', 'flightPaused', 'flightSeason', 'flightShowSpeedVectors', 'flightSpecies', 'flightWind'];
function expectOnlyView(ui, before, snapshot) {
  const values = { flightSpecies: snapshot.speciesId, flightSeason: snapshot.season, flightWind: snapshot.wind,
    flightFormation: snapshot.formationMode, flightCamera: 'chase', flightPaused: true, flightShowSpeedVectors: true };
  expect(ui.state).toEqual({ ...before, ...values }); expect(ui.writes).toEqual([values]);
  expect(Object.keys(ui.writes[0]).sort()).toEqual(keys); expect(ui.awardXP).not.toHaveBeenCalled();
}

beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration'); });
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); }); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  delete document.fullscreenElement; delete document.exitFullscreen;
});

describe('Saved flight challenge inspection', () => {
  it('adds only explicit native paired actions and creates no saved work on mount', () => {
    const ui = fixture(); expect(ui.strip()).toBeNull(); expect(ui.writes).toEqual([]);
    for (const source of ['baseline', 'snapshot']) {
      expect(ui.button(source).type).toBe('button'); expect(ui.button(source).getAttribute('aria-label')).toContain('Attempt 1');
      expect(getComputedStyle(ui.button(source)).minHeight).toBe('44px');
    }
    expect(ui.button('baseline').textContent).toBe('Inspect starting flight');
    expect(ui.button().textContent).toBe('Inspect saved attempt'); expect(ui.awardXP).not.toHaveBeenCalled();
  });
  it.each(Object.keys(starts).flatMap(goal => ['baseline', 'snapshot'].map(source => [goal, source])))('restores %s %s and preserves all learner records', (goal, source) => {
    const rows = [attempt(goal)]; const ui = fixture({ flightChallenges: challenges(goal, rows) }); const before = clone(ui.state);
    ui.inspect(source); expectOnlyView(ui, before, rows[0][source]);
    expect(document.activeElement).toBe(ui.stage); expect(ui.strip().dataset.inspectionSource).toBe(source);
    expect(ui.strip().dataset.inspectionGoal).toBe(goal); expect(ui.strip().dataset.inspectionState).toBe('pending');
    expect(ui.strip().textContent).not.toContain('Recorded conditions restored');
  });
  it('synchronizes the animation values before submitting the single atomic view update', () => {
    let observed;
    const ui = fixture({}, { inspectMulti(patch, refs) { const live = refs.find(ref => ref.current?.flightSpeedValues).current; observed = { ...live }; } });
    ui.inspect(); expect(observed).toMatchObject(ui.writes[0]); expect(observed.flightSpeedValues.groundSpeed).toBe(21);
  });
  it('allows an unchanged pair without confusing which source the learner selected', async () => {
    const row = attempt('wind', { snapshot: { ...starts.wind } }); const ui = fixture({ flightChallenges: challenges('wind', [row]) });
    ui.inspect('baseline'); await ui.frame(); expect(ui.strip().dataset.inspectionSource).toBe('baseline');
    ui.inspect('snapshot'); expect(ui.strip().dataset.inspectionState).toBe('pending'); await ui.frame();
    expect(ui.strip().dataset.inspectionSource).toBe('snapshot'); expect(ui.strip().dataset.inspectionState).toBe('ready');
    expect(ui.state.flightChallenges.work.wind.attempts[0]).toEqual(row);
  });
  it('restores the recorded confounded flight without correcting its conditions or grading it', () => {
    const row = attempt('wind', { snapshot: { speciesId: 'canada_goose', season: 'spring', formationMode: 'v', wind: 17 } });
    const ui = fixture({ flightChallenges: challenges('wind', [row]) }); const before = clone(ui.state);
    ui.inspect(); expectOnlyView(ui, before, row.snapshot); expect(ui.strip().textContent).not.toMatch(/condition met|graded|correct/i);
  });
  it('works at the four-attempt cap without adding an attempt or evidence', () => {
    const ui = fixture({ flightChallenges: challenges('wind', [attempt(), attempt(), attempt(), attempt('wind', { notes: '' })]) }); const before = clone(ui.state);
    ui.inspect('snapshot', 4); expectOnlyView(ui, before, before.flightChallenges.work.wind.attempts[3].snapshot);
    expect(ui.strip().dataset.inspectionAttempt).toBe('4'); expect(ui.panel().querySelector('[data-flight-challenge-action="check"]').disabled).toBe(true);
  });
  it('preserves unsaved reflection DOM, text, caret, scroll and current drafts across inspection and return', async () => {
    const ui = fixture(); ui.openReflection(); ui.type('My own unfinished explanation');
    const field = ui.field(); field.setSelectionRange(3, 12, 'backward'); field.scrollTop = 14;
    ui.editCurrent('A newer current prediction'); ui.writes.length = 0; const before = clone(ui.state);
    ui.inspect(); await ui.frame(); expectOnlyView(ui, before, before.flightChallenges.work.wind.attempts[0].snapshot);
    expect(ui.field()).toBe(field); expect(field.value).toBe('My own unfinished explanation');
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection, field.scrollTop]).toEqual([3, 12, 'backward', 14]);
    ui.writes.length = 0; const inspected = ui.state; ui.return(); expect(document.activeElement).toBe(field);
    expect(ui.state).toBe(inspected); expect(ui.writes).toEqual([]); expect(field.value).toBe('My own unfinished explanation');
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection, field.scrollTop]).toEqual([3, 12, 'backward', 14]);
  });
  it('opens the existing disclosures and returns to Add reflection without inserting an answer', async () => {
    const ui = fixture(); ui.inspect(); await ui.frame(); ui.panel().open = false; ui.writes.length = 0;
    ui.return(); expect(ui.panel().open).toBe(true); expect(ui.panel().querySelector('[data-flight-challenge-history]').open).toBe(true);
    expect(ui.row().querySelector('[data-flight-challenge-reflection]').open).toBe(true);
    expect(document.activeElement).toBe(ui.row().querySelector('[data-flight-reflection-action="edit"]'));
    expect(ui.field()).toBeNull(); expect(ui.writes).toEqual([]); expect(getComputedStyle(ui.back()).minHeight).toBe('44px');
  });
  it('returns to the requested disclosure without stealing another attempt’s active editor', async () => {
    const ui = fixture({ flightChallenges: challenges('wind', [attempt(), attempt()]) }); ui.openReflection(2); ui.type('Other row draft');
    const field = ui.field(); ui.inspect('snapshot', 1); await ui.frame(); ui.return();
    expect(ui.field()).toBe(field); expect(field.value).toBe('Other row draft');
    expect(document.activeElement).toBe(ui.row().querySelector('[data-flight-challenge-reflection] summary'));
  });
  it('waits for an acknowledged actual frame before claiming recorded conditions are restored', async () => {
    const ui = fixture(); ui.inspect(); await ui.frame({ challengeInspectionFrame: null });
    expect(ui.strip().dataset.inspectionState).toBe('pending'); await ui.frame();
    expect(ui.strip().dataset.inspectionState).toBe('ready'); expect(ui.strip().textContent).toContain('The original animation frame was not recorded.');
  });
  it('does not claim restoration before the host accepts the view write', async () => {
    const ui = fixture({}, { delayMulti: true }); ui.inspect(); await ui.frame();
    expect(ui.strip().dataset.inspectionState).toBe('changed'); expect(ui.strip().textContent).not.toContain('Recorded conditions restored');
    ui.flush(); await ui.frame(); expect(ui.strip().dataset.inspectionState).toBe('ready');
  });
  it.each([
    ['species', { flightSpecies: 'arctic_tern' }], ['wind', { flightWind: 6 }], ['season', { flightSeason: 'spring' }],
    ['formation', { flightFormation: 'solo' }], ['camera', { flightCamera: 'side' }], ['resume', { flightPaused: false }], ['vectors', { flightShowSpeedVectors: false }]
  ])('withdraws the restored-source claim when %s changes', async (_, patch) => {
    const ui = fixture(); ui.inspect(); await ui.frame(); ui.set(patch);
    expect(ui.strip().dataset.inspectionState).toBe('changed'); expect(ui.strip().textContent).not.toContain('Recorded conditions restored');
    expect(ui.state.flightChallenges.work.wind.attempts).toHaveLength(1);
  });
  it.each([
    ['lost context', { contextLost: true }], ['disposed engine', { disposed: true }], ['different species', { speciesId: 'arctic_tern' }],
    ['different formation', { formationMode: 'solo' }], ['different season', { season: 'spring' }]
  ])('withholds a restored-source claim for %s', async (_, patch) => {
    const ui = fixture(); ui.inspect(); await ui.frame(patch); expect(ui.strip().dataset.inspectionState).toBe('pending');
  });
  it('invalidates inspection across a changed goal even if the learner returns to the original goal', async () => {
    const ui = fixture(); ui.inspect(); await ui.frame(); ui.choose('season'); expect(ui.strip()).toBeNull();
    ui.choose('wind'); expect(ui.strip()).toBeNull();
  });
  it('invalidates a source when an earlier attempt is removed rather than following its new row index', async () => {
    const ui = fixture({ flightChallenges: challenges('wind', [attempt(), attempt('wind', { prediction: 'Second source' })]) });
    ui.inspect('snapshot', 2); await ui.frame(); ui.remove(1); expect(ui.strip()).toBeNull();
    expect(ui.state.flightChallenges.work.wind.attempts[0].prediction).toBe('Second source');
  });
  it('rejects retained inspect callbacks after a newer commit, replacement, reorder or goal change', () => {
    const ui = fixture({ flightChallenges: challenges('wind', [attempt(), attempt('wind', { prediction: 'Second' })]) });
    const node = ui.button(), props = committedProps(node); ui.set({ flightWind: 12 }); ui.writes.length = 0;
    const before = ui.state; ui.invoke(props, node); expect(ui.state).toBe(before); expect(ui.writes).toEqual([]);
    const latest = committedProps(ui.button()); const raw = clone(ui.state.flightChallenges); raw.work.wind.attempts.reverse(); ui.set({ flightChallenges: raw });
    ui.invoke(latest, ui.button()); expect(ui.writes).toEqual([]); ui.choose('season'); ui.writes.length = 0;
    ui.invoke(latest, ui.button()); expect(ui.writes).toEqual([]);
  });
  it('rejects detached actions and actions belonging to another mounted instance', () => {
    const first = fixture(), second = fixture(); const node = first.button(), props = committedProps(node);
    first.invoke(props, second.button()); expect(first.writes).toEqual([]); expect(second.writes).toEqual([]);
    node.remove(); first.invoke(props, node); expect(first.writes).toEqual([]);
  });
  it('keeps duplicate-instance return focus and inspection controls in their own workspace', async () => {
    const first = fixture(), second = fixture(); first.inspect(); await first.frame(); second.inspect(); await second.frame();
    const back = first.back(), props = committedProps(back); first.invoke(props, second.back());
    expect(document.activeElement).toBe(second.stage);
    first.back().focus(); first.return();
    expect(document.activeElement).toBe(first.row().querySelector('[data-flight-reflection-action="edit"]'));
    expect(second.panel().open).toBe(false);
  });
  it('rejects a stale return callback after source replacement and after leaving the flight workspace', async () => {
    const ui = fixture({ flightChallenges: challenges('wind', [attempt(), attempt()]) }); ui.inspect(); await ui.frame();
    const node = ui.back(), props = committedProps(node); ui.inspect('snapshot', 2); await ui.frame();
    const focus = document.activeElement; ui.invoke(props, ui.back()); expect(document.activeElement).toBe(focus);
    ui.set({ tab: 'inquiry' }); ui.writes.length = 0; ui.invoke(props, node); expect(ui.writes).toEqual([]); expect(ui.strip()).toBeNull();
  });
  it('does not publish an abandoned render as challenge action authority', () => {
    const ui = fixture(); const owner = ui.owner(), node = ui.button(), props = committedProps(node);
    ui.abandon({ flightChallenges: challenges('season') }); expect(ui.owner()).toBe(owner);
    ui.invoke(props, node); expect(ui.writes).toHaveLength(1); expect(ui.state.flightSpecies).toBe('monarch');
  });
  it('clears a competing trial review without rewriting its investigation', () => {
    const baseline = { ...starts.wind }, trial = { baseline, snapshot: { ...baseline, wind: 3 }, variable: 'wind', prediction: 'Trial prediction' };
    const ui = fixture({ flightInvestigation: { variable: 'wind', prediction: 'Notebook prediction', baseline, trials: [trial], evidence: 'Evidence', explanation: 'Reasoning' } });
    act(() => { ui.host.querySelector('[data-experiment-revisit="1"]').click(); });
    expect(ui.host.querySelector('[data-experiment-pair-review]')).not.toBeNull(); const investigation = ui.state.flightInvestigation;
    ui.inspect(); expect(ui.host.querySelector('[data-experiment-pair-review]')).toBeNull(); expect(ui.state.flightInvestigation).toBe(investigation);
    act(() => { ui.host.querySelector('[data-experiment-revisit="1"]').click(); }); expect(ui.strip()).toBeNull();
  });
  it('revalidates asynchronous fullscreen return after its selected goal changed', async () => {
    const ui = fixture(); ui.inspect(); await ui.frame(); let resolveExit;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: ui.stage.closest('.migration-flight-deck') });
    document.exitFullscreen = vi.fn(() => new Promise(resolve => { resolveExit = resolve; })); ui.return(); ui.choose('season');
    const focus = document.activeElement; await act(async () => { resolveExit(); await Promise.resolve(); }); expect(document.activeElement).toBe(focus);
  });
  it('routes action, state, and explanation labels through the translation function', async () => {
    const ui = fixture({}, { ctx: { t: (key, fallback) => 'translated ' + fallback } });
    expect(ui.button().textContent).toBe('translated Inspect saved attempt'); ui.inspect(); await ui.frame();
    expect(ui.back().textContent).toBe('translated Return to this reflection'); expect(ui.strip().textContent).toContain('translated Recorded conditions restored');
  });
});
