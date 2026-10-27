import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = [];
let tool;

function walk(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, matches)); return matches; }
  if (predicate(node)) matches.push(node);
  walk(node.props?.children, predicate, matches);
  return matches;
}

// Real mounts retain refs and deliver effects after DOM commits. The shared 3D
// loader stays pending; this suite verifies actual note and focus handlers.
function fixture(seed = {}, options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', ...seed }, tree, refresh;
  const writes = [], queued = [], refs = [], announce = vi.fn(), awardXP = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: announce, awardXP,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(value => value + 1); },
    updateMulti: (_, patch) => {
      writes.push(patch);
      if (options.delayMulti) { queued.push(patch); return; }
      state = { ...state, ...patch }; refresh(value => value + 1);
    }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() {
    refresh = React.useState(0)[1]; ctx.toolData = { migration: state };
    tree = tool.render(ctx); return tree;
  }
  act(() => { root.render(React.createElement(Component)); });
  const ui = {
    host, refs, writes, announce, awardXP,
    get state() { return state; },
    node(predicate) { return walk(tree, predicate)[0] || null; },
    action() { return ui.node(node => node.props?.['data-study-action'] === 'describe-wing-motion'); },
    field() { return host.querySelector("[data-migration-id=\"migration-study-observation-note\"]"); },
    prompt() { return host.querySelector("[data-migration-id=\"migration-study-motion-evidence-prompt\"]"); },
    click(node = ui.action()) { act(() => { node.props.onClick(); }); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(value => value + 1); }); },
    flush() { act(() => { for (const patch of queued.splice(0)) state = { ...state, ...patch }; refresh(value => value + 1); }); },
    mark() {
      const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]"); stage.setAttribute('data-flight-ready', 'true');
      const hostIndex = refs.findIndex(ref => ref.current === stage);
      if (hostIndex < 0) throw new Error('Missing mounted flight host ref');
      refs[hostIndex + 1].current = { host: stage, flyers: [{ visible: true }], speciesId: state.flightSpecies || 'canada_goose',
        formationMode: state.flightFormation || 'natural', season: state.flightSeason || 'fall', wingStepSerial: state.flightWingStep || 0,
        markedWingPose: { capturePose: () => true, clearPose: vi.fn() } };
      ui.click(ui.node(node => node.props?.['data-marked-pose-action'] === 'mark'));
    }
  };
  return ui;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  tool = loadTool(process.env.MIGRATION_MOTION_NOTES_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { mounts.splice(0).forEach(root => root.unmount()); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Migration direct wing-motion observation notes', () => {
  it('offers one native action throughout Study, including when wingtip paths are off', () => {
    const ui = fixture();
    expect(ui.action().type).toBe('button'); expect(ui.action().props.type).toBe('button');
    expect(ui.action().props.children).toBe('Describe wing motion');
    expect(ui.action().props['aria-controls']).toBe(ui.host.querySelector('[data-migration-id="migration-study-observation-note"]').id);
    expect(ui.action().props['aria-describedby']).toBe(ui.host.querySelector('[data-migration-id="migration-wing-motion-note-help"]').id);
    expect(ui.host.querySelector("[data-migration-id=\"migration-wing-motion-note-help\"]").textContent).toContain('Opens Primary feathers notes');
    expect(ui.host.textContent).toContain('does not record an observation or change playback');
    ui.set({ flightCamera: 'chase' }); expect(ui.action()).toBeNull(); expect(ui.field()).toBeNull();
  });

  it('opens Primary feathers notes and focuses the matching committed textarea without changing playback or evidence', () => {
    const observations = { drafts: { 'canada_goose:head': 'Bill draft.', 'canada_goose:primaries': 'Outer feather draft.' }, records: {} };
    const investigation = { prediction: 'Keep prediction.' }, challenges = { work: { wind: { notes: 'Keep evidence.' } } };
    const ui = fixture({ flightStudyObservations: observations, flightInvestigation: investigation, flightChallenges: challenges,
      flightPaused: false, flightWingStep: 13, flightWind: -4, flightStudyYaw: 90, flightStudyPitch: 10,
      flightShowWingtipPath: false, flightShowAnatomy: false });
    const field = ui.field(), keysAtFocus = [];
    const originalFocus = field.focus.bind(field);
    vi.spyOn(field, 'focus').mockImplementation(options => { keysAtFocus.push(field.getAttribute('data-study-observation-key')); originalFocus(options); });
    field.scrollIntoView = vi.fn();
    ui.click();
    expect(ui.writes).toEqual([{ flightStudyObservationOpen: true, flightStudyRegion: 'primaries' }]);
    expect(keysAtFocus).toEqual(['canada_goose:primaries']); expect(document.activeElement).toBe(field);
    expect(field.value).toBe('Outer feather draft.'); expect(field.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(ui.state).toMatchObject({ flightCamera: 'study', flightPaused: false, flightWingStep: 13, flightWind: -4, flightStudyYaw: 90, flightStudyPitch: 10, flightShowWingtipPath: false, flightShowAnatomy: false });
    expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightInvestigation).toBe(investigation);
    expect(ui.state.flightChallenges).toBe(challenges); expect(ui.awardXP).not.toHaveBeenCalled();
  });

  it('opens Monarch whole-wing notes without changing the latent bird-region selection', () => {
    const observations = { drafts: { 'monarch:whole-wing': 'Butterfly motion.', 'canada_goose:tail': 'Keep tail note.' }, records: {} };
    const ui = fixture({ flightSpecies: 'monarch', flightStudyRegion: 'tail', flightStudyObservations: observations });
    expect(ui.host.querySelector("[data-migration-id=\"migration-wing-motion-note-help\"]").textContent).toContain('Opens whole-wing notes');
    ui.click();
    expect(ui.writes).toEqual([{ flightStudyObservationOpen: true }]); expect(ui.state.flightStudyRegion).toBe('tail');
    expect(ui.field().getAttribute('data-study-observation-key')).toBe('monarch:whole-wing');
    expect(document.activeElement).toBe(ui.field()); expect(ui.field().value).toBe('Butterfly motion.');
    expect(ui.state.flightStudyObservations).toBe(observations);
  });

  it('falls back to the existing saved note without creating or replacing a draft', () => {
    const observations = { drafts: { 'canada_goose:head': 'Unfinished bill thought.' }, records: {
      'canada_goose:primaries': { speciesId: 'canada_goose', region: 'primaries', note: 'Saved outer feather note.' }
    } };
    const ui = fixture({ flightStudyObservations: observations }); ui.click();
    expect(ui.field().value).toBe('Saved outer feather note.'); expect(ui.state.flightStudyObservations).toBe(observations);
    expect(Object.keys(observations.drafts)).toEqual(['canada_goose:head']);
    expect(ui.host.querySelector('[data-study-evidence-count]').getAttribute('data-study-evidence-count')).toBe('1');
  });

  it('can refocus an already open matching note and consumes the request after focusing once', () => {
    const ui = fixture({ flightStudyRegion: 'primaries', flightStudyObservationOpen: true });
    const field = ui.field(), focus = vi.spyOn(field, 'focus');
    ui.click(); expect(document.activeElement).toBe(field); expect(focus).toHaveBeenCalledTimes(1);
    const other = document.createElement('button'); document.body.append(other); other.focus();
    ui.set({ flightWind: 12 }); expect(document.activeElement).toBe(other); expect(focus).toHaveBeenCalledTimes(1);
    ui.click(); expect(document.activeElement).toBe(field); expect(focus).toHaveBeenCalledTimes(2);
  });

  it('waits for an asynchronous host commit instead of focusing the previous region', () => {
    const ui = fixture({ flightStudyRegion: 'head' }, { delayMulti: true });
    const field = ui.field(), seen = [], focus = field.focus.bind(field);
    vi.spyOn(field, 'focus').mockImplementation(options => { seen.push(field.getAttribute('data-study-observation-key')); focus(options); });
    ui.click(); expect(seen).toEqual([]); expect(ui.state.flightStudyObservationOpen).toBeUndefined();
    ui.flush(); expect(seen).toEqual(['canada_goose:primaries']); expect(document.activeElement).toBe(field);
  });

  it.each([
    ['species', { flightSpecies: 'monarch' }], ['camera', { flightCamera: 'chase' }],
    ['tab', { tab: 'inquiry' }], ['region', { flightStudyRegion: 'tail' }]
  ])('cancels pending focus when the %s changes before the queued host commit', (_, changed) => {
    const ui = fixture({ flightStudyRegion: 'head' }, { delayMulti: true });
    const field = ui.field(), focus = vi.spyOn(field, 'focus');
    const other = document.createElement('button'); document.body.append(other); other.focus();
    ui.click(); ui.set(changed); ui.flush();
    expect(focus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(other);
  });

  it('cancels delayed note navigation when the learner focuses another control', () => {
    const ui = fixture({}, { delayMulti: true });
    const field = ui.field(), focus = vi.spyOn(field, 'focus');
    const action = ui.host.querySelector('[data-study-action="describe-wing-motion"]'); action.focus();
    ui.click();
    const other = ui.host.querySelector('select'); other.focus();
    ui.flush(); expect(document.activeElement).toBe(other); expect(focus).not.toHaveBeenCalled();
  });

  it.each(['native', 'custom'])('focuses the existing note inside %s fullscreen without exiting it', mode => {
    const ui = fixture(), deck = ui.host.querySelector("[data-migration-id=\"migration-flight-deck\"]");
    const exitFullscreen = vi.fn(); Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen });
    const shellFullscreen = vi.fn(); window.__alloStemFS = shellFullscreen;
    if (mode === 'native') Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => deck });
    else deck.setAttribute('data-allo-fullscreen-active', 'true');
    try {
      ui.click(); expect(deck.contains(document.activeElement)).toBe(true); expect(document.activeElement).toBe(ui.field());
      expect(exitFullscreen).not.toHaveBeenCalled(); expect(shellFullscreen).not.toHaveBeenCalled();
    } finally { delete document.fullscreenElement; delete document.exitFullscreen; delete window.__alloStemFS; }
  });

  it('links one contextual path prompt only to relevant wing notes and keeps the learner text unchanged', () => {
    const observations = { drafts: { 'canada_goose:primaries': 'My own description.' }, records: {} };
    const ui = fixture({ flightShowWingtipPath: true, flightStudyObservations: observations });
    expect(ui.prompt()).toBeNull(); expect(ui.field().getAttribute('aria-describedby')).not.toContain('migration-study-motion-evidence-prompt');
    ui.click(); expect(ui.prompt().getAttribute('data-study-motion-evidence')).toBe('path');
    expect(ui.prompt().textContent).toContain('Predict'); expect(ui.prompt().textContent).toContain('Front with From above');
    expect(ui.prompt().textContent).toContain('illustrative paths are not measurements');
    expect(ui.field().getAttribute('aria-describedby')).toContain('migration-study-motion-evidence-prompt');
    expect(ui.field().value).toBe('My own description.'); expect(ui.prompt().hasAttribute('aria-live')).toBe(false);
    ui.set({ flightStudyRegion: 'inner-wing' }); expect(ui.prompt()).not.toBeNull();
    ui.set({ flightStudyRegion: 'tail' }); expect(ui.prompt()).toBeNull();
    ui.set({ flightStudyRegion: 'primaries', flightShowWingtipPath: false }); expect(ui.prompt()).toBeNull();
    expect(ui.state.flightStudyObservations).toBe(observations);
  });

  it('uses whole-wing motion guidance for Monarch without feather or drafting claims', () => {
    const ui = fixture({ flightSpecies: 'monarch', flightShowWingtipPath: true });
    ui.click(); expect(ui.prompt().getAttribute('data-study-motion-evidence')).toBe('path');
    expect(ui.prompt().textContent).not.toMatch(/feather|drafting/i);
    expect(ui.host.querySelector("[data-migration-id=\"migration-study-observation-prompt\"]").textContent).toContain('These are butterfly wings');
  });

  it('describes a matching marked pose and both aids, then removes stale context on individual or formation changes', () => {
    const ui = fixture({ flightStudyRegion: 'primaries' }); ui.mark();
    expect(ui.prompt().getAttribute('data-study-motion-evidence')).toBe('pose');
    expect(ui.prompt().textContent).toContain('dashed reference'); expect(ui.prompt().textContent).not.toContain('live dots');
    ui.set({ flightShowWingtipPath: true }); expect(ui.prompt().getAttribute('data-study-motion-evidence')).toBe('path-and-pose');
    expect(ui.prompt().textContent).toContain('live dots and marked outline');
    ui.set({ flightStudyBird: 1 }); expect(ui.prompt().getAttribute('data-study-motion-evidence')).toBe('path');
    ui.set({ flightShowWingtipPath: false }); expect(ui.prompt()).toBeNull();
    ui.set({ flightStudyBird: 0 }); ui.mark(); expect(ui.prompt().getAttribute('data-study-motion-evidence')).toBe('pose');
    ui.set({ flightFormation: 'solo' }); expect(ui.prompt()).toBeNull();
  });
});
