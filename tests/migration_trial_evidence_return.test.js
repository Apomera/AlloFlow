import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let tool;
const mounts = [];

function walk(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, matches)); return matches; }
  if (predicate(node)) matches.push(node);
  if (node.props) walk(node.props.children, predicate, matches);
  return matches;
}
function snapshot(values = {}) {
  return { speciesId: 'canada_goose', season: 'fall', formationMode: 'natural', wind: -4, ...values };
}
function trial(values = {}) {
  return { variable: 'wind', prediction: 'The wind will change modeled ground speed.', baseline: snapshot(), snapshot: snapshot({ wind: 10 }), ...values };
}
function notebook(trials = [trial()], values = {}) {
  return { variable: 'wind', prediction: 'My current prediction.', baseline: snapshot({ wind: 0 }), trials, evidence: 'Recorded evidence.', explanation: 'My explanation.', ...values };
}

// Mount the real tool so local viewing status and refs persist across renders.
// The real 3D loader remains pending in this jsdom harness; browser tests cover
// rendering. Every action below is the actual handler supplied by the tool.
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightInvestigation: notebook(), ...seed }, tree, refresh;
  const writes = [], announce = vi.fn(), awardXP = vi.fn(), refs = [];
  // Delegate every hook to React and observe the real RAF values ref. This
  // measures handler behavior before the asynchronous host store can commit.
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ ...options.ctxOverrides, React: tracedReact, announceToSR: announce, awardXP,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(value => value + 1); },
    updateMulti: (_, patch) => {
      writes.push(patch);
      if (options.inspectMulti) options.inspectMulti(patch);
      if (options.delayMulti) return;
      state = { ...state, ...patch }; refresh(value => value + 1);
    }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() {
    refresh = React.useState(0)[1];
    ctx.toolData = { migration: state };
    tree = tool.render(ctx); return tree;
  }
  act(() => { root.render(React.createElement(Component)); });
  const ui = {
    get state() { return state; }, writes, announce, awardXP, host, refs,
    liveValues() { return refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpecies' in ref.current && 'flightSpeedValues' in ref.current)?.current; },
    node: predicate => walk(tree, predicate)[0] || null,
    all: predicate => walk(tree, predicate),
    revisit(index = 1, baseline = false) { return ui.node(node => node.props?.[baseline ? 'data-experiment-revisit-baseline' : 'data-experiment-revisit'] === index); },
    action(name) { return ui.node(node => node.props?.['data-experiment-action'] === name); },
    pair(name) { return ui.node(node => node.props?.['data-pair-review'] === name); },
    review() { return ui.node(node => node.props?.['data-experiment-pair-review'] != null); },
    click(node) { act(() => { node.props.onClick(); }); },
    // Attribute lookup stays scoped when the duplicate-deck case deliberately
    // mounts duplicate IDs; jsdom's fast #id lookup starts at the document.
    field() { return host.querySelector('[id="migration-experiment-evidence"]'); },
    context() { return host.querySelector('[data-trial-evidence-context]'); },
    returnNode() { return ui.action('inspect-saved-comparison'); },
    returnButton() { return host.querySelector('[data-experiment-action="inspect-saved-comparison"]'); },
    inspect() { act(() => { ui.returnButton().click(); }); },
    invoke(node, element = ui.returnButton()) { act(() => { node.props.onClick({ currentTarget: element }); }); },
    status() { return ui.node(node => node.props?.['data-experiment-revisit-status'] != null)?.props.children || ''; },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(value => value + 1); }); }
  };
  return ui;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  tool = loadTool(process.env.MIGRATION_TRIAL_EVIDENCE_RETURN_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  delete document.fullscreenElement; delete document.exitFullscreen;
});

function unchanged(ui) {
  return { state: ui.state, text: JSON.stringify(ui.state), live: JSON.stringify(ui.liveValues()),
    field: ui.field(), value: ui.field().value,
    selection: [ui.field().selectionStart, ui.field().selectionEnd, ui.field().selectionDirection], scroll: ui.field().scrollTop };
}
function expectUnchanged(ui, before) {
  expect(ui.state).toBe(before.state); expect(JSON.stringify(ui.state)).toBe(before.text);
  expect(JSON.stringify(ui.liveValues())).toBe(before.live); expect(ui.field()).toBe(before.field); expect(ui.field().value).toBe(before.value);
  expect([ui.field().selectionStart, ui.field().selectionEnd, ui.field().selectionDirection]).toEqual(before.selection);
  expect(ui.field().scrollTop).toBe(before.scroll); expect(ui.writes).toEqual([]); expect(ui.awardXP).not.toHaveBeenCalled();
}
function ready(seed = {}, options = {}) {
  const ui = fixture(seed, options); ui.click(ui.revisit()); ui.writes.length = 0; return ui;
}
function baselineButton(ui) { return ui.host.querySelector('[data-experiment-pair-review] button[data-pair-review="baseline"]'); }

describe('Saved trial prediction and evidence return path', () => {
  it('shows the contextual reminder only after explicit review and preserves both textarea nodes when it appears or disappears', () => {
    const ui = fixture(), evidence = ui.field(), explanation = ui.host.querySelector('#migration-experiment-explanation');
    expect(ui.context()).toBeNull(); expect(ui.returnNode()).toBeNull();
    ui.click(ui.revisit()); expect(ui.context().getAttribute('data-trial-evidence-context')).toBe('1');
    expect(ui.field()).toBe(evidence); expect(ui.host.querySelector('#migration-experiment-explanation')).toBe(explanation);
    expect(ui.context().parentElement.classList.contains('migration-experiment-notes')).toBe(true);
    expect(ui.context().textContent).toContain('Selected saved comparison: Trial 1 · Wind');
    const disclosure = ui.context().querySelector('details[data-trial-evidence-prediction]');
    expect(disclosure.open).toBe(false); expect(disclosure.querySelector('summary').textContent).toBe('Prediction when recorded');
    expect(disclosure.querySelector('p').textContent).toBe('The wind will change modeled ground speed.');
    expect(ui.returnButton().type).toBe('button'); expect(ui.returnButton().textContent).toBe('Inspect saved trial comparison');
    expect(ui.returnButton().getAttribute('aria-controls')).toBe('migration-flight-trial-review');
    expect(ui.returnButton().getAttribute('aria-describedby')).toBe('migration-trial-evidence-help');
    expect(getComputedStyle(ui.returnButton()).minHeight).toBe('44px');
    expect(ui.context().textContent).toContain('Your prediction and explanation are ungraded.');
    ui.click(ui.pair('close')); expect(ui.context()).toBeNull(); expect(ui.field()).toBe(evidence);
    expect(ui.host.querySelector('#migration-experiment-explanation')).toBe(explanation);
  });

  it('keeps the historical variable and original prediction separate from the newer editable investigation', () => {
    const work = notebook([trial({ prediction: 'My original wind prediction.' })], { variable: 'formation',
      prediction: 'My new formation prediction.', baseline: snapshot({ speciesId: 'monarch', wind: -15 }) });
    const ui = ready({ flightInvestigation: work });
    expect(ui.context().textContent).toContain('Trial 1 · Wind'); expect(ui.context().textContent).toContain('My original wind prediction.');
    expect(ui.context().textContent).not.toContain('My new formation prediction.');
    expect(ui.host.querySelector('#migration-experiment-prediction').value).toBe('My new formation prediction.');
    expect(ui.state.flightInvestigation).toBe(work); expect(ui.writes).toEqual([]);
    expect(ui.context().querySelectorAll('textarea,input,select')).toHaveLength(0);
  });

  it('retains the selected saved pair when current conditions differ without claiming that the scene matches', () => {
    const ui = ready(); ui.set({ flightWind: 25, flightCamera: 'side', flightPaused: false }); ui.writes.length = 0;
    expect(ui.review().props['data-review-active']).toBe(''); expect(ui.context().textContent).toContain('Selected saved comparison: Trial 1');
    const authoredContext = ui.context().cloneNode(true);
    authoredContext.querySelector('details p').remove();
    expect(authoredContext.textContent).not.toMatch(/Showing saved|Controlled comparison|Ground speed|mph|drafting credit/i);
    expect(ui.context().querySelector('details p').textContent).toBe('The wind will change modeled ground speed.');
    const before = unchanged(ui); ui.inspect(); expect(document.activeElement).toBe(baselineButton(ui)); expectUnchanged(ui, before);
  });

  it('completes evidence → comparison → evidence using focus only while retaining caret, scroll and all learner work', () => {
    const studyNotes = { drafts: { 'canada_goose:inner-wing': 'My unfinished wing note.' }, records: {} };
    const challenges = { work: { wind: { prediction: 'My challenge prediction.', notes: 'My challenge reasoning.' } } };
    const inquiry = { hypothesis: 'My inquiry hypothesis.' };
    const ui = ready({ flightStudyObservations: studyNotes, flightChallenges: challenges, inquiry,
      aiExplorerText: 'Keep research.', deviceReduceMotion: true });
    const field = ui.field(); field.focus(); field.setSelectionRange(2, 11, 'backward'); field.scrollTop = 14;
    const before = unchanged(ui), target = baselineButton(ui), click = vi.spyOn(target, 'click'), focus = vi.spyOn(target, 'focus');
    const scroll = target.scrollIntoView = vi.fn();
    ui.inspect(); expect(document.activeElement).toBe(target); expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'center', inline: 'nearest', behavior: 'auto' }); expect(click).not.toHaveBeenCalled();
    expectUnchanged(ui, before); ui.click(ui.pair('evidence'));
    expect(document.activeElement).toBe(field); expectUnchanged(ui, before);
    expect(ui.state.flightStudyObservations).toBe(studyNotes); expect(ui.state.flightChallenges).toBe(challenges); expect(ui.state.inquiry).toBe(inquiry);
    expect(ui.state.aiExplorerText).toBe('Keep research.'); expect(ui.state.deviceReduceMotion).toBe(true);
  });

  it('does not replay either saved flight, switch active choice or mutate live scene settings during navigation', () => {
    const ui = ready(); ui.click(ui.pair('baseline')); ui.writes.length = 0;
    const before = unchanged(ui), target = baselineButton(ui), trialButton = ui.host.querySelector('[data-pair-review="trial"]');
    const baselineClick = vi.spyOn(target, 'click'), trialClick = vi.spyOn(trialButton, 'click');
    ui.inspect(); expectUnchanged(ui, before); expect(baselineClick).not.toHaveBeenCalled(); expect(trialClick).not.toHaveBeenCalled();
    expect(ui.pair('baseline').props['aria-pressed']).toBe('true'); expect(ui.pair('trial').props['aria-pressed']).toBe('false');
  });

  it.each(['close', 'switch', 'reindex', 'remove', 'prediction', 'snapshot', 'tab'])
  ('rejects a retained navigation callback after %s without changing focus or work', change => {
    const rows = [trial(), trial({ prediction: 'Second saved prediction.', snapshot: snapshot({ wind: 20 }) })];
    const ui = ready({ flightInvestigation: notebook(rows) });
    const old = ui.returnNode(), button = ui.returnButton();
    if (change === 'close') ui.click(ui.pair('close'));
    if (change === 'switch') ui.click(ui.revisit(2));
    if (change === 'tab') ui.set({ tab: 'inquiry' });
    if (change === 'reindex') { ui.click(ui.revisit(2)); ui.set({ flightInvestigation: notebook([rows[1]]) }); }
    if (change === 'remove') ui.set({ flightInvestigation: notebook([rows[1]]) });
    if (change === 'prediction') ui.set({ flightInvestigation: notebook([{ ...rows[0], prediction: 'Changed source prediction.' }, rows[1]]) });
    if (change === 'snapshot') ui.set({ flightInvestigation: notebook([{ ...rows[0], snapshot: snapshot({ wind: 11 }) }, rows[1]]) });
    const sentinel = document.createElement('input'); document.body.append(sentinel); sentinel.focus();
    const state = ui.state, live = JSON.stringify(ui.liveValues()); ui.writes.length = 0; ui.invoke(old, button);
    expect(document.activeElement).toBe(sentinel); expect(ui.state).toBe(state); expect(JSON.stringify(ui.liveValues())).toBe(live);
    expect(ui.writes).toEqual([]); expect(ui.announce).toHaveBeenLastCalledWith('Saved trial comparison is unavailable. Revisit a recorded trial, then try again.');
  });

  it('rejects an old render callback after notes change while the fresh native action remains usable', () => {
    const ui = ready(), old = ui.returnNode(), button = ui.returnButton();
    act(() => { ui.node(node => node.props?.id === 'migration-experiment-evidence').props.onChange({ target: { value: 'My revised evidence.' } }); });
    const field = ui.field(); field.focus(); ui.writes.length = 0; const before = unchanged(ui);
    ui.invoke(old, button); expect(document.activeElement).toBe(field); expectUnchanged(ui, before);
    ui.inspect(); expect(document.activeElement).toBe(baselineButton(ui)); expectUnchanged(ui, before);
  });

  it.each(['missing-panel', 'replacement-panel', 'missing-target', 'disabled-target', 'disconnected-stage'])
  ('fails closed on %s instead of focusing a different element', fault => {
    const ui = ready(), button = ui.returnButton(), panel = ui.host.querySelector('[data-experiment-pair-review]');
    const target = baselineButton(ui), sentinel = ui.field(); sentinel.focus(); const before = unchanged(ui);
    if (fault === 'missing-panel') panel.remove();
    if (fault === 'replacement-panel') panel.replaceWith(panel.cloneNode(true));
    if (fault === 'missing-target') target.remove();
    if (fault === 'disabled-target') target.disabled = true;
    if (fault === 'disconnected-stage') ui.host.querySelector('#migration-flight-stage').remove();
    ui.invoke(ui.returnNode(), button); expect(document.activeElement).toBe(sentinel); expectUnchanged(ui, before);
  });

  it('uses its own deck despite duplicate IDs and refuses a panel borrowed from another tool', () => {
    const first = ready(), second = ready(), secondTarget = baselineButton(second), firstTarget = baselineButton(first);
    const firstFocus = vi.spyOn(firstTarget, 'focus'); second.field().focus(); second.inspect();
    expect(document.activeElement).toBe(secondTarget); expect(firstFocus).not.toHaveBeenCalled(); expect(second.writes).toEqual([]);
    const panel = second.host.querySelector('[data-experiment-pair-review]');
    panel.replaceWith(first.host.querySelector('[data-experiment-pair-review]'));
    second.field().focus(); second.inspect(); expect(document.activeElement).toBe(second.field()); expect(second.writes).toEqual([]);
  });

  it('rejects a foreign action element even when its selected trial has identical content', () => {
    const first = ready(), second = ready(); const before = unchanged(first); first.field().focus();
    first.invoke(first.returnNode(), second.returnButton()); expect(document.activeElement).toBe(first.field()); expectUnchanged(first, before);
  });

  it('keeps native disclosure toggling read-only and keeps learner-authored multiline text intact', () => {
    const prediction = 'My first prediction line.\n\nMy own second line: <do not turn into HTML> & observe.';
    const ui = ready({ flightInvestigation: notebook([trial({ prediction })]) }), before = unchanged(ui);
    const details = ui.context().querySelector('details'), paragraph = details.querySelector('p');
    expect(paragraph.textContent).toBe(prediction); expect(paragraph.querySelector('*')).toBeNull();
    expect(getComputedStyle(paragraph).whiteSpace).toBe('pre-wrap');
    act(() => { details.querySelector('summary').click(); }); expect(details.open).toBe(true); expectUnchanged(ui, before);
    act(() => { details.querySelector('summary').click(); }); expect(details.open).toBe(false); expectUnchanged(ui, before);
  });

  it.each([['empty', ''], ['whitespace', '   '], ['long', 'A'.repeat(1000)]])('renders a %s recorded prediction safely', (_, prediction) => {
    const work = notebook([trial({ prediction })]), ui = ready({ flightInvestigation: work });
    const paragraph = ui.context().querySelector('details p');
    expect(paragraph.textContent).toBe(prediction.trim() ? prediction : 'No prediction was recorded with this trial.');
    expect(getComputedStyle(paragraph).overflowWrap).toBe('anywhere'); expect(ui.state.flightInvestigation).toBe(work);
    expect(ui.context().textContent).not.toContain('My current prediction.'); expect(ui.writes).toEqual([]);
  });

  it('translates the reminder, navigation, fallback and ungraded scope without translating learner text', () => {
    const dictionary = { 'stem.migration.selected_saved_comparison': 'Comparaison enregistrée choisie',
      'stem.migration.experiment_trial_word': 'Essai', 'stem.migration.experiment_formation': 'Formation locale',
      'stem.migration.experiment_prediction_saved': 'Prédiction au moment de l’enregistrement',
      'stem.migration.inspect_saved_comparison': 'Examiner la comparaison enregistrée',
      'stem.migration.trial_evidence_scope': 'Comparez votre prédiction à vos observations. Votre explication n’est pas notée.' };
    const ui = ready({ flightInvestigation: notebook([trial({ variable: 'formation', prediction: 'My own unmodified prediction.' })]) },
      { ctxOverrides: { t: (key, fallback) => dictionary[key] || fallback } });
    expect(ui.context().textContent).toContain('Comparaison enregistrée choisie: Essai 1 · Formation locale');
    expect(ui.context().querySelector('summary').textContent).toBe(dictionary['stem.migration.experiment_prediction_saved']);
    expect(ui.returnButton().textContent).toBe(dictionary['stem.migration.inspect_saved_comparison']);
    expect(ui.context().textContent).toContain(dictionary['stem.migration.trial_evidence_scope']);
    expect(ui.context().querySelector('details p').textContent).toBe('My own unmodified prediction.'); ui.inspect();
    expect(document.activeElement).toBe(baselineButton(ui)); expect(ui.writes).toEqual([]);
  });

  it('does not invent a prediction from the current draft when reviewing readable imported trials', () => {
    const work = notebook([null, trial({ baseline: null }), trial({ prediction: '', snapshot: snapshot({ wind: '8' }) })]);
    const ui = ready({ flightInvestigation: work });
    expect(ui.context().getAttribute('data-trial-evidence-context')).toBe('1');
    expect(ui.context().querySelector('details p').textContent).toBe('No prediction was recorded with this trial.');
    expect(ui.state.flightInvestigation).toBe(work); expect(ui.context().textContent).not.toContain('My current prediction.');
  });

  it('preserves the existing native fullscreen exit before evidence and supports returning afterward without replay', async () => {
    const ui = ready(), before = unchanged(ui), deck = ui.host.querySelector('#migration-flight-deck');
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: deck });
    document.exitFullscreen = vi.fn(() => { delete document.fullscreenElement; return Promise.resolve(); });
    await act(async () => { ui.pair('evidence').props.onClick(); await Promise.resolve(); });
    expect(document.exitFullscreen).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(ui.field());
    ui.inspect(); expect(document.activeElement).toBe(baselineButton(ui)); expectUnchanged(ui, before);
  });

  it('preserves the custom fullscreen exit and all preferences during the evidence return path', () => {
    const ui = ready({ deviceReduceMotion: true }), deck = ui.host.querySelector('#migration-flight-deck'), before = unchanged(ui);
    deck.setAttribute('data-allo-fullscreen-active', 'true');
    vi.stubGlobal('__alloStemFS', vi.fn(node => node.removeAttribute('data-allo-fullscreen-active')));
    ui.click(ui.pair('evidence')); expect(window.__alloStemFS).toHaveBeenCalledWith(deck); expect(document.activeElement).toBe(ui.field());
    ui.inspect(); expect(document.activeElement).toBe(baselineButton(ui)); expectUnchanged(ui, before);
  });
});
