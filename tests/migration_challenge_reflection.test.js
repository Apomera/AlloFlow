import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let tool;
const mounts = [];
const clone = value => JSON.parse(JSON.stringify(value));
const windStart = { speciesId: 'monarch', season: 'fall', wind: -15, formationMode: 'natural', formation: 'swarm', groundSpeed: 0, benefit: 0 };
function attempt(wind = 4, values = {}) {
  return { baseline: { ...windStart }, snapshot: { ...windStart, wind, groundSpeed: Math.max(0, Math.round(12 + wind * 2.237)) }, prediction: 'Prediction when checked', notes: '', ...values };
}
function challenges(rows = [attempt()], values = {}) {
  return { selectedId: 'wind', work: { wind: { prediction: 'Current prediction', notes: 'Current explanation', setup: { ...windStart }, attempts: rows }, ...values } };
}
function walk(node, predicate, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, found)); return found; }
  if (predicate(node)) found.push(node);
  if (node.props) walk(node.props.children, predicate, found);
  return found;
}
// Read the handler React actually attached at commit. A render can be abandoned,
// so its captured element tree is not an event authority for stale-action tests.
function committedProps(element) {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  if (!key) throw new Error('Expected React DOM committed event props');
  return element[key];
}
function enterText(element, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightChallenges: challenges(), ...seed }, tree, refresh;
  let readRefs = [], readStates = [], readIds = [];
  const writes = [], announce = vi.fn(), awardXP = vi.fn();
  const tracedReact = { ...React,
    useRef(value) { const ref = React.useRef(value); readRefs.push(ref); return ref; },
    useState(value) { const pair = React.useState(value); readStates.push(pair); return pair; },
    useId() { const id = React.useId(); readIds.push(id); return id; }
  };
  const ctx = makeCtx({ ...options, React: tracedReact, announceToSR: announce, awardXP,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(n => n + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() {
    refresh = React.useState(0)[1]; readRefs = []; readStates = []; readIds = [];
    ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree;
  }
  act(() => { root.render(React.createElement(Component)); });
  const ui = {
    host, writes, announce, awardXP, get state() { return state; },
    node: predicate => walk(tree, predicate)[0],
    panel: () => host.querySelector('[data-migration-flight-challenges]'),
    row: (number = 1) => host.querySelector('[data-flight-challenge-attempt="' + number + '"]'),
    details: (number = 1) => host.querySelector('[data-flight-challenge-reflection="' + number + '"]'),
    button: (name, number = 1) => (number < 0 ? host : ui.row(number))?.querySelector('[data-flight-reflection-action="' + name + '"]'),
    input: () => host.querySelector('[data-flight-reflection-input]'),
    saved: (number = 1) => host.querySelector('[data-flight-reflection-saved="' + number + '"]'),
    handler(name, number = 1) { return { props: committedProps(ui.button(name, number)) }; },
    click(name, number = 1) { act(() => { ui.button(name, number).click(); }); },
    open(number = 1) { ui.panel().open = true; host.querySelector('[data-flight-challenge-history]').open = true; ui.details(number).open = true; ui.click('edit', number); },
    type(value) { act(() => { enterText(ui.input(), value); }); },
    invoke(node, element) { act(() => { node.props.onClick({ currentTarget: element }); }); },
    control(label, value) { const element = [...host.querySelectorAll('textarea')].find(node => (node.getAttribute('data-migration-id') === label || node.getAttribute('aria-label') === label)); act(() => { enterText(element, value); }); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    select(goal) { act(() => { host.querySelector('[data-flight-challenge="' + goal + '"]').click(); }); },
    remove(number) { act(() => { ui.row(number).querySelector('.migration-mission-remove').click(); }); },
    step(name) { return host.querySelector('[data-mission-progress-step="' + name + '"]').dataset.recorded; },
    owner() { return readRefs.find(ref => ref.current?.panel && ref.current?.goalId && ref.current?.challenges)?.current; },
    abandon(patch) {
      const refs = readRefs.slice(), states = readStates.slice(); let r = 0, s = 0;
      const savedIds = readIds.slice(); let idIndex = 0;
      const replay = { ...React, useId: () => savedIds[idIndex++], useRef: () => refs[r++], useState: () => states[s++], useEffect: () => {}, useCallback: fn => fn };
      return tool.render({ ...ctx, React: replay, toolData: { migration: { ...state, ...patch } } });
    }
  };
  return ui;
}
function originals(row) { const { reflection, ...record } = row; return record; }
function assertOnlyReflection(ui, before, index, value) {
  const after = clone(ui.state); const expected = clone(before);
  if (value == null) delete expected.flightChallenges.work.wind.attempts[index].reflection;
  else expected.flightChallenges.work.wind.attempts[index].reflection = value;
  expect(after).toEqual(expected);
  expect(ui.writes).toHaveLength(1);
  expect(Object.keys(ui.writes[0])).toEqual(['flightChallenges']);
  expect(ui.awardXP).not.toHaveBeenCalled();
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Later reflections for saved flight challenge attempts', () => {
  it('offers a collapsed native disclosure without creating optional data or grading work', () => {
    const raw = challenges(); const before = clone(raw);
    const ui = fixture({ flightChallenges: raw });
    expect(ui.details().tagName).toBe('DETAILS');
    expect(ui.details().open).toBe(false);
    expect(ui.details().querySelector('summary').textContent).toBe('Later reflection');
    expect(ui.button('edit').textContent).toBe('Add reflection');
    expect(ui.input()).toBeNull(); expect(ui.writes).toEqual([]);
    expect(ui.state.flightChallenges).toBe(raw); expect(raw).toEqual(before);
    expect(raw.work.wind.attempts[0]).not.toHaveProperty('reflection');
    expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('preserves the legacy attempt shape when an unrelated draft is saved', () => {
    const ui = fixture(); const before = clone(ui.state.flightChallenges.work.wind.attempts[0]);
    ui.control('migration-mission-prediction', 'Updated current prediction');
    expect(ui.state.flightChallenges.work.wind.attempts[0]).toEqual(before);
    expect(ui.state.flightChallenges.work.wind.attempts[0]).not.toHaveProperty('reflection');
  });

  it.each([
    ['missing', undefined, ''], ['object', { text: 'wrong shape' }, ''], ['array', ['not prose'], ''],
    ['nonfinite', Infinity, ''], ['number', 42, '42'], ['oversized', 'r'.repeat(2100), 'r'.repeat(2000)], ['whitespace', ' \n ', '']
  ])('normalizes a %s optional reflection without changing the original explanation', (_, reflection, expected) => {
    const ui = fixture({ flightChallenges: challenges([attempt(4, { reflection, notes: 'Original explanation' })]) });
    ui.open(); expect(ui.input().value).toBe(expected);
    expect(ui.row().querySelector('.migration-mission-explanation').textContent).toContain('Original explanation');
    expect(ui.writes).toEqual([]);
  });

  it('starts with only that attempt’s own reflection and never fills a learner answer from other work', () => {
    const ui = fixture({ flightChallenges: challenges([attempt(4, { notes: 'Original reasoning' }), attempt(5, { reflection: 'Other reflection' })]) });
    ui.open(); expect(ui.input().value).toBe('');
    expect(ui.input().placeholder).toContain('What does this saved flight support');
    expect(ui.button('save').disabled).toBe(true); expect(ui.writes).toEqual([]);
  });

  it('keeps typed reasoning local until explicit save and uses an accessible labeled 2000-character field', () => {
    const ui = fixture(); const before = ui.state; ui.open();
    const field = ui.input();
    expect(field.maxLength).toBe(2000);
    expect(field.getAttribute('aria-label')).toBe('My later reflection · Attempt 1');
    expect(ui.host.querySelector('label[for="' + field.id + '"]')).not.toBeNull();
    expect(ui.host.querySelector('[id="' + field.getAttribute('aria-describedby') + '"]').textContent).toContain('saved measurements');
    ui.type('My own evidence');
    expect(ui.state).toBe(before); expect(ui.writes).toEqual([]);
    expect(ui.step('evidence')).toBe('false'); expect(ui.button('save').disabled).toBe(false);
    expect(ui.input()).toBe(field); expect(document.activeElement).toBe(field);
  });

  it('completes evidence at the four-attempt limit while preserving every captured flight and current draft', () => {
    const ui = fixture({ flightChallenges: challenges([attempt(-10), attempt(0), attempt(2), attempt(4)], { formation: { prediction: 'Other goal', notes: 'Other notes', setup: null, attempts: [] } }),
      flightInvestigation: { prediction: 'Investigation prediction', trials: [], evidence: 'Other evidence', explanation: 'Other explanation' }, flightStudyNotes: { prediction: 'Study work' }, flightWind: 9, flightSeason: 'spring' });
    // Normalize other empty goals before measuring the exact additive write.
    ui.control('migration-mission-prediction', 'Current prediction retained after reflection'); ui.writes.length = 0;
    const before = clone(ui.state); ui.open(4); ui.type('Wind alone raised this saved model speed from 0 to 21 mph.'); ui.click('save', 4);
    assertOnlyReflection(ui, before, 3, 'Wind alone raised this saved model speed from 0 to 21 mph.');
    expect(ui.state.flightChallenges.work.wind.attempts).toHaveLength(4);
    expect(ui.panel().querySelector('[data-flight-challenge-action="check"]').disabled).toBe(true);
    expect(ui.step('evidence')).toBe('true'); expect(ui.step('model')).toBe('true');
    expect(ui.host.querySelector('[data-flight-challenge-review="4"]').textContent).toContain('Reflection recorded · ungraded');
    expect(ui.row(4).querySelector('.migration-mission-explanation').textContent).toContain('No explanation was recorded when checked');
    expect(ui.saved(4).textContent).toBe('Wind alone raised this saved model speed from 0 to 21 mph.');
    expect(ui.panel().textContent).toContain('You can still add a later reflection');
    expect(ui.panel().querySelector('[data-learning-feedback="challenge"]').textContent).toContain('Your reflection is ungraded');
    expect(ui.announce).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(ui.button('edit', 4));
  });

  it('merges into the latest current drafts and other goal work while keeping the editor DOM and caret', () => {
    const ui = fixture(); ui.open(); ui.type('A reflection with an unchanged caret.');
    const field = ui.input(); field.setSelectionRange(3, 13, 'backward'); field.scrollTop = 12;
    ui.control('migration-mission-prediction', 'Newer prediction'); ui.control('migration-mission-notes', 'Newer explanation');
    const next = clone(ui.state.flightChallenges); next.work.season = { prediction: 'Newer season prediction', notes: 'Newer season notes', setup: null, attempts: [] };
    ui.set({ flightChallenges: next, flightWind: 11 });
    expect(ui.input()).toBe(field); expect(field.value).toBe('A reflection with an unchanged caret.');
    expect([field.selectionStart, field.selectionEnd, field.selectionDirection]).toEqual([3, 13, 'backward']); expect(field.scrollTop).toBe(12);
    ui.writes.length = 0; const before = clone(ui.state); ui.click('save');
    assertOnlyReflection(ui, before, 0, 'A reflection with an unchanged caret.');
  });

  it('edits only the retained later reflection and returns keyboard focus to its own action', () => {
    const ui = fixture({ flightChallenges: challenges([attempt(4, { reflection: 'Earlier reflection', notes: 'Original explanation' })]) });
    ui.control('migration-mission-prediction', 'Current prediction retained after reflection'); ui.writes.length = 0; const before = clone(ui.state);
    ui.open(); expect(ui.input().value).toBe('Earlier reflection'); expect(ui.button('save').disabled).toBe(true);
    ui.type('A revised later reflection'); ui.click('save');
    assertOnlyReflection(ui, before, 0, 'A revised later reflection');
    expect(ui.row().querySelector('.migration-mission-explanation').textContent).toContain('Original explanation');
    expect(ui.button('edit').textContent).toBe('Edit reflection'); expect(document.activeElement).toBe(ui.button('edit'));
  });

  it.each(['', '  \n  '])('explicitly clears an existing reflection with %j and recomputes evidence', value => {
    const ui = fixture({ flightChallenges: challenges([attempt(4, { reflection: 'Only saved evidence' })]) });
    ui.control('migration-mission-prediction', 'Current prediction retained after reflection'); ui.writes.length = 0; const before = clone(ui.state);
    expect(ui.step('evidence')).toBe('true'); ui.open(); ui.type(value); expect(ui.button('save').disabled).toBe(false); ui.click('save');
    assertOnlyReflection(ui, before, 0, null); expect(ui.step('evidence')).toBe('false'); expect(ui.step('model')).toBe('true');
    expect(ui.button('edit').textContent).toBe('Add reflection'); expect(ui.saved().textContent).toBe('No later reflection is saved yet.');
    expect(ui.panel().querySelector('[data-learning-feedback="challenge"]').textContent).toContain('Later reflection cleared');
    expect(ui.announce).not.toHaveBeenCalled();
  });

  it('retains evidence from the original explanation after a later reflection is cleared', () => {
    const ui = fixture({ flightChallenges: challenges([attempt(4, { notes: 'Original evidence', reflection: 'Later words' })]) });
    ui.open(); ui.type(''); ui.click('save');
    expect(ui.step('evidence')).toBe('true'); expect(ui.state.flightChallenges.work.wind.attempts[0].notes).toBe('Original evidence');
    expect(ui.host.querySelector('[data-flight-challenge-review="1"]').textContent).toContain('Explanation recorded · ungraded');
  });

  it.each([
    ['target not met', attempt(-10)], ['unchanged', attempt(-15)],
    ['confounded', attempt(4, { snapshot: { speciesId: 'peregrine', season: 'fall', wind: 4, formationMode: 'natural', formation: 'solo', groundSpeed: 71, benefit: 0 } })]
  ])('saves a reflection for a %s attempt without claiming model evidence', (_, row) => {
    const ui = fixture({ flightChallenges: challenges([row]) }); ui.open(); ui.type('I can discuss why this attempt did not isolate or meet the target.'); ui.click('save');
    expect(ui.state.flightChallenges.work.wind.attempts[0].reflection).toContain('did not isolate');
    expect(ui.step('evidence')).toBe('false'); expect(ui.step('model')).toBe('false'); expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('cancels unsaved edits without changing the existing reflection, original notes, or learner drafts', () => {
    const ui = fixture({ flightChallenges: challenges([attempt(4, { reflection: 'Retained reflection', notes: 'Original notes' })]) });
    const before = ui.state; ui.open(); ui.type('Do not save'); ui.click('cancel');
    expect(ui.state).toBe(before); expect(ui.writes).toEqual([]); expect(ui.saved().textContent).toBe('Retained reflection');
    expect(ui.input()).toBeNull(); expect(document.activeElement).toBe(ui.button('edit'));
    ui.open(); expect(ui.input().value).toBe('Retained reflection');
  });

  it('bounds input before persistence and escapes saved learner prose', () => {
    const ui = fixture(); ui.open(); ui.type('<script>unsafe()</script>' + 'x'.repeat(2200));
    expect(ui.input().value).toHaveLength(2000); ui.click('save');
    expect(ui.state.flightChallenges.work.wind.attempts[0].reflection).toHaveLength(2000);
    expect(ui.saved().textContent).toContain('<script>unsafe()</script>'); expect(ui.details().querySelector('script')).toBeNull();
  });

  it('rejects unchanged and empty new saves even when their disabled handlers are invoked directly', () => {
    const ui = fixture(); ui.open(); const before = ui.state;
    ui.invoke(ui.handler('save'), ui.button('save')); ui.type('   '); ui.invoke(ui.handler('save'), ui.button('save'));
    expect(ui.state).toBe(before); expect(ui.writes).toEqual([]);
  });

  it('prevents another attempt from silently replacing an open unsaved draft', () => {
    const ui = fixture({ flightChallenges: challenges([attempt(4), attempt(5)]) }); ui.open(); ui.type('Draft for attempt one');
    expect(ui.button('edit', 2).disabled).toBe(true); ui.invoke(ui.handler('edit', 2), ui.button('edit', 2));
    expect(ui.input().dataset.flightReflectionInput).toBe('1'); expect(ui.input().value).toBe('Draft for attempt one'); expect(ui.writes).toEqual([]);
  });

  it('preserves an unsaved draft across goal changes and resumes only with its original saved context', () => {
    const ui = fixture(); ui.open(); ui.type('Unsaved wind reflection'); ui.select('formation');
    expect(ui.input()).toBeNull(); expect(ui.host.querySelector('[data-flight-reflection-stale] textarea').value).toBe('Unsaved wind reflection');
    expect(ui.host.querySelector('[data-flight-reflection-stale] textarea').readOnly).toBe(true);
    ui.select('wind'); expect(ui.input().value).toBe('Unsaved wind reflection');
    ui.writes.length = 0; ui.click('save'); expect(ui.state.flightChallenges.work.wind.attempts[0].reflection).toBe('Unsaved wind reflection');
    expect(ui.state.flightChallenges.work.formation.attempts).toHaveLength(0);
  });

  it('retains the transient draft across a tab round-trip while detached actions cannot save', () => {
    const ui = fixture(); ui.open(); ui.type('Draft before tab change'); const handler = ui.handler('save'), button = ui.button('save');
    ui.set({ tab: 'inquiry' }); ui.invoke(handler, button); expect(ui.writes).toEqual([]);
    ui.set({ tab: 'flight3d' }); expect(ui.input().value).toBe('Draft before tab change'); ui.click('save');
    expect(ui.state.flightChallenges.work.wind.attempts[0].reflection).toBe('Draft before tab change');
  });

  it.each(['remove preceding', 'remove target', 'reorder', 'replace target', 'external reflection'])('keeps a %s source change from reusing the draft at the wrong index', change => {
    const ui = fixture({ flightChallenges: challenges([attempt(4), attempt(5)]) }); ui.open(2); ui.type('Draft belongs to second original attempt');
    const handler = ui.handler('save', 2), button = ui.button('save', 2);
    const next = clone(ui.state.flightChallenges);
    if (change === 'remove preceding') next.work.wind.attempts.splice(0, 1);
    if (change === 'remove target') next.work.wind.attempts.splice(1, 1);
    if (change === 'reorder') next.work.wind.attempts.reverse();
    if (change === 'replace target') next.work.wind.attempts[1] = attempt(8);
    if (change === 'external reflection') next.work.wind.attempts[1].reflection = 'Saved elsewhere';
    ui.set({ flightChallenges: next }); ui.invoke(handler, button);
    expect(ui.writes).toEqual([]); expect(ui.input()).toBeNull();
    expect(ui.host.querySelector('[data-flight-reflection-stale] textarea').value).toBe('Draft belongs to second original attempt');
    expect(ui.state.flightChallenges).toBe(next);
    ui.click('cancel-stale', -1); expect(ui.host.querySelector('[data-flight-reflection-stale]')).toBeNull(); expect(ui.writes).toEqual([]);
  });

  it('rejects a stale save callback after the same editor has received newer text', () => {
    const ui = fixture(); ui.open(); ui.type('Earlier text'); const old = ui.handler('save'), button = ui.button('save');
    ui.type('Newer text'); ui.invoke(old, button); expect(ui.writes).toEqual([]); expect(ui.input().value).toBe('Newer text');
    ui.click('save'); expect(ui.state.flightChallenges.work.wind.attempts[0].reflection).toBe('Newer text');
  });

  it('rejects a previous editor’s save after cancel and reopen on the same attempt', () => {
    const ui = fixture(); ui.open(); ui.type('Old draft'); const old = ui.handler('save'); ui.click('cancel'); ui.open(); ui.type('New draft');
    ui.invoke(old, ui.button('save')); expect(ui.writes).toEqual([]); ui.click('save');
    expect(ui.state.flightChallenges.work.wind.attempts[0].reflection).toBe('New draft');
  });

  it('requires a connected action from its own panel and cannot write through another mounted tool', () => {
    const first = fixture(), second = fixture(); first.open(); first.type('First tool reflection'); second.open(); second.type('Second tool reflection');
    first.invoke(first.handler('save'), second.button('save'));
    const detached = document.createElement('button'); first.invoke(first.handler('save'), detached);
    expect(first.writes).toEqual([]); expect(second.writes).toEqual([]);
    first.button('save').focus();
    first.click('save'); expect(first.state.flightChallenges.work.wind.attempts[0].reflection).toBe('First tool reflection');
    expect(second.input().value).toBe('Second tool reflection'); expect(document.activeElement).toBe(first.button('edit'));
  });

  it('does not let an abandoned render publish ownership or save through a committed action', () => {
    const ui = fixture(); ui.open(); ui.type('Committed reflection'); const owner = ui.owner();
    const next = clone(ui.state.flightChallenges); next.work.wind.notes = 'Uncommitted current notes';
    const abandoned = ui.abandon({ flightChallenges: next });
    expect(ui.owner()).toBe(owner);
    const abandonedSave = walk(abandoned, node => node.props?.['data-flight-reflection-action'] === 'save')[0];
    ui.invoke(abandonedSave, ui.button('save')); expect(ui.writes).toEqual([]);
    ui.click('save'); expect(ui.state.flightChallenges.work.wind.notes).toBe('Current explanation');
    expect(ui.state.flightChallenges.work.wind.attempts[0].reflection).toBe('Committed reflection');
  });

  it('retains later reflections after a fresh mount without retaining an unsaved editor', () => {
    const ui = fixture(); ui.open(); ui.type('Persisted later reflection'); ui.click('save');
    const restored = fixture(clone(ui.state)); expect(restored.details().open).toBe(false); expect(restored.input()).toBeNull();
    expect(restored.saved().textContent).toBe('Persisted later reflection'); expect(restored.step('evidence')).toBe('true'); expect(restored.writes).toEqual([]);
  });

  it.each(['formation', 'season'])('keeps the %s goal’s historical model pair intact while adding later evidence', id => {
    const baseline = { speciesId: 'canada_goose', season: 'fall', wind: id === 'formation' ? 0 : 8,
      formationMode: id === 'formation' ? 'solo' : 'natural', formation: id === 'formation' ? 'solo' : 'v',
      groundSpeed: id === 'formation' ? 40 : 58, benefit: id === 'formation' ? 0 : 22 };
    const snapshot = id === 'formation' ? { ...baseline, formationMode: 'v', formation: 'v', benefit: 22 } : { ...baseline, season: 'spring' };
    const record = { baseline, snapshot, prediction: 'Original goal prediction', notes: '' };
    const raw = { selectedId: id, work: { [id]: { prediction: 'Current goal prediction', notes: 'Current goal notes', setup: baseline, attempts: [record] } } };
    const ui = fixture({ flightChallenges: raw }); ui.open(); ui.type('My reflection on this saved model comparison.'); ui.click('save');
    expect(originals(ui.state.flightChallenges.work[id].attempts[0])).toEqual(record);
    expect(ui.state.flightChallenges.work[id]).toMatchObject({ prediction: 'Current goal prediction', notes: 'Current goal notes', setup: baseline });
    expect(ui.step('model')).toBe('true'); expect(ui.step('evidence')).toBe('true');
    expect(ui.host.querySelector('[data-flight-challenge-review="1"]').textContent).toContain('Reflection recorded · ungraded');
    expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('uses translation hooks for reflection controls and keeps storage independent of translated prose', () => {
    const ui = fixture({}, { t: (key, fallback) => /mission_reflection/.test(key) ? 'Translated ' + key : fallback || key });
    expect(ui.details().querySelector('summary').textContent).toBe('Translated stem.migration.mission_reflection_title');
    ui.open(); expect(ui.input().getAttribute('aria-label')).toBe('Translated stem.migration.mission_reflection_label · Attempt 1');
    expect(ui.button('save').textContent).toBe('Translated stem.migration.mission_reflection_save');
    ui.type('Learner language'); ui.click('save'); expect(ui.state.flightChallenges.work.wind.attempts[0].reflection).toBe('Learner language');
  });
});
