import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const roots = new Set();
let tool, reduced = false;
const clone = value => JSON.parse(JSON.stringify(value));
const waitMessage = 'Choose a numbered cycle position in a ready Study view first.';
function walk(node, predicate, result = []) {
  if (!node || typeof node !== 'object') return result;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, result)); return result; }
  if (predicate(node)) result.push(node);
  walk(node.props?.children, predicate, result); return result;
}
function authored() {
  return {
    flightStudyObservations: { drafts: { 'canada_goose:inner-wing': 'Keep my shape prediction.' }, records: {}, comparison: { draft: 'Keep my comparison.' } },
    flightInvestigation: { prediction: 'Keep my wind prediction.', trials: [], evidence: 'Keep my evidence.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge.', notes: 'Keep my explanation.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep my inquiry.' }
  };
}
function work(state) { return Object.fromEntries(Object.keys(authored()).map(key => [key, clone(state[key])])); }
function handler(element) {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  expect(key).toBeTruthy(); return element[key].onClick;
}
async function fixture(seed = {}, options = {}) {
  reduced = !!options.reduced;
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightSpecies: 'canada_goose', flightFormation: 'natural', flightSeason: 'fall',
    flightStudyBird: 2, flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1.5,
    flightWingStep: 19, flightShowWingtipPath: true, flightShowAnatomy: true,
    flightStudyRegion: 'inner-wing', ...authored(), ...seed }, refresh, tree, renderCount = 0;
  const refs = [], writes = [], queued = [], announce = vi.fn();
  const tracedReact = { ...React, useRef(value) {
    const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref;
  } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: options.hostAnnouncer ? announce : null,
    t: options.t || ((key, fallback) => fallback == null ? key : fallback),
    update: (_, key, value) => {
      writes.push({ [key]: value });
      if (options.delayZoom && key === 'flightStudyZoom') { queued.push({ [key]: value }); return; }
      state = { ...state, [key]: value }; refresh(n => n + 1);
    },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(n => n + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  function Component() { renderCount++; refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => root.render(React.createElement(Component)));
  const stage = host.querySelector('[id="migration-flight-stage"]');
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const liveRef = refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current);
  const engine = { host: stage, speciesId: state.flightSpecies, formationMode: state.flightFormation, season: state.flightSeason,
    contextLost: false, time: 1.3, wingStepSerial: 19, wingStepPhase: .7,
    flyers: Array.from({ length: 11 }, (_, index) => ({ uuid: 'feedback-bird-' + index, visible: true,
      position: { y: 0 }, rotation: { z: 0 }, userData: { phase: .2 + index * .1, flapRate: 4.2, baseY: 1, applyWingPhase: vi.fn() } })),
    markedWingPose: { userData: { captured: false, captureVersion: 0 }, clearPose: vi.fn() },
    wingtipPath: { invalidate: vi.fn() }
  };
  await act(async () => {
    engineRef.current = options.preparing ? null : engine;
    stage.setAttribute('data-flight-ready', options.preparing ? 'false' : 'true');
    state = { ...state }; refresh(n => n + 1); await Promise.resolve();
  });
  const ui = {
    host, stage, engine, engineRef, liveRef, writes, queued, announce,
    get state() { return state; }, get live() { return liveRef.current; },
    get feedback() { return host.querySelector('[data-scene-feedback]'); },
    get renderCount() { return renderCount; },
    feedbackOwner() { return refs.find(ref => ref.current && ref.current.node === ui.feedback && typeof ref.current.report === 'function'); },
    feedbackElement() { return walk(tree, node => typeof node.type === 'function' && node.type.name === 'MigrationSceneFeedback')[0]; },
    flush() { act(() => { state = { ...state, ...queued.shift() }; refresh(n => n + 1); }); },
    action(name) { return host.querySelector('[data-scene-study-action="' + name + '"]'); },
    originalOpposite() { return host.querySelector('[data-study-cycle-action="opposite"]'); },
    follow(side = 0) { return host.querySelector('[data-wingtip-follow-side="' + side + '"]'); },
    click(button) { expect(button).not.toBeNull(); button.focus(); act(() => button.click()); },
    choose(index) { ui.click(host.querySelector('[data-study-cycle-position="' + index + '"]')); },
    textButton(text) { return [...host.querySelectorAll('button')].find(button => button.textContent === text); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); }
  };
  return ui;
}
function expectWork(ui, before) {
  expect(work(ui.state)).toEqual(before);
  expect(ui.state.flightWingStep).toBe(19);
  expect(ui.writes.every(patch => Object.keys(patch).every(key => !Object.keys(authored()).includes(key)))).toBe(true);
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(async () => {
  await act(async () => { roots.forEach(root => root.unmount()); roots.clear(); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Persistent local feedback for Study comparison actions', () => {
  it('announces fitted zoom without a host announcer or a focus change', async () => {
    const ui = await fixture(), before = work(ui.state), button = ui.action('fit'), status = ui.feedback;
    expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true'); expect(status.textContent).toBe('');
    ui.click(button);
    expect(ui.feedback).toBe(status);
    expect(status.textContent).toBe('Whole model fitted. Study angle and wing pose are unchanged.');
    expect(ui.state).toMatchObject({ flightStudyZoom: 1, flightStudyYaw: 90, flightStudyPitch: 10, flightStudyBird: 2 });
    expect(document.activeElement).toBe(button); expectWork(ui, before);
  });

  it('reannounces an already fitted request while avoiding redundant host writes', async () => {
    const ui = await fixture({ flightStudyZoom: 1 }), before = work(ui.state), button = ui.action('fit');
    ui.click(button); const status = ui.feedback, child = status.firstChild, text = status.textContent;
    ui.click(button);
    expect(ui.feedback).toBe(status); expect(status.textContent).toBe(text); expect(status.firstChild).not.toBe(child);
    expect(ui.writes).toEqual([]); expect(document.activeElement).toBe(button); expectWork(ui, before);
  });

  it('keeps repeated local messages inside the status component without rerendering the tool', async () => {
    const ui = await fixture({ flightStudyZoom: 1 }), before = work(ui.state), button = ui.action('fit');
    const renders = ui.renderCount; ui.click(button);
    const status = ui.feedback, child = status.firstChild; ui.click(button);
    expect(ui.renderCount).toBe(renders); expect(status.firstChild).not.toBe(child);
    expect(status.textContent).toBe('Whole model fitted. Study angle and wing pose are unchanged.');
    expect(ui.writes).toEqual([]); expectWork(ui, before);
  });

  it('retains fitted live zoom through a delayed host save and avoids duplicate writes', async () => {
    const ui = await fixture({}, { delayZoom: true }), before = work(ui.state), button = ui.action('fit');
    const renders = ui.renderCount; ui.click(button);
    expect(ui.state.flightStudyZoom).toBe(1.5); expect(ui.live.flightStudyZoom).toBe(1);
    expect(ui.renderCount).toBe(renders); expect(ui.feedback.textContent).toContain('Whole model fitted.');
    ui.click(button); expect(ui.queued).toHaveLength(1); expect(ui.writes).toEqual([{ flightStudyZoom: 1 }]);
    expect(ui.live.flightStudyZoom).toBe(1); expect(ui.renderCount).toBe(renders);
    ui.flush(); expect(ui.state.flightStudyZoom).toBe(1); expectWork(ui, before);
  });

  it.each([
    ['manual wing serial', ui => { ui.live.flightWingStep++; }],
    ['hidden paths', ui => { ui.live.flightShowWingtipPath = false; }],
    ['other camera', ui => { ui.live.flightCamera = 'chase'; }],
    ['invalid region', ui => { ui.live.flightStudyRegion = 'whole-wing'; }]
  ])('reports a readiness warning without replacing transient %s values', async (_, invalidate) => {
    const ui = await fixture(); ui.choose(2); const retained = handler(ui.action('opposite'));
    invalidate(ui); const before = JSON.stringify({ state: ui.state, live: ui.live, time: ui.engine.time, phase: ui.engine.wingStepPhase });
    const renders = ui.renderCount, writes = ui.writes.length;
    act(() => retained());
    expect(ui.feedback.textContent).toBe(waitMessage); expect(ui.renderCount).toBe(renders); expect(ui.writes).toHaveLength(writes);
    expect(JSON.stringify({ state: ui.state, live: ui.live, time: ui.engine.time, phase: ui.engine.wingStepPhase })).toBe(before);
  });

  it('ignores a retained writer after its status node is disconnected', async () => {
    const ui = await fixture(), owner = ui.feedbackOwner(), writer = owner.current, status = ui.feedback;
    const renders = ui.renderCount, before = clone(ui.state); status.remove();
    act(() => writer.report('Disconnected status must not announce.'));
    expect(status.textContent).toBe(''); expect(ui.renderCount).toBe(renders); expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]);
  });

  it('publishes writers only on commit and rejects cleanup from an abandoned render', async () => {
    const ui = await fixture(), element = ui.feedbackElement(), owner = element.props.owner, committed = owner.current;
    const speculative = element.type({ ...element.props, React: { ...React, useState: value => [value, vi.fn()] } });
    expect(owner.current).toBe(committed);
    ui.click(ui.action('fit')); const newer = owner.current;
    expect(newer).not.toBe(committed); expect(ui.feedback.textContent).toContain('Whole model fitted.');
    speculative.ref(null); expect(owner.current).toBe(newer);
    act(() => committed.report('Old writer must not replace the newer message.'));
    expect(ui.feedback.textContent).toContain('Whole model fitted.');
  });

  it('clears the scene writer on navigation and mounts an empty status when returning', async () => {
    const ui = await fixture(); ui.click(ui.action('fit'));
    const owner = ui.feedbackOwner(), writer = owner.current, oldStatus = ui.feedback;
    ui.set({ tab: 'world' }); expect(owner.current).toBeNull(); expect(ui.feedback).toBeNull();
    const renders = ui.renderCount; act(() => writer.report('Late message from the departed scene.'));
    expect(ui.renderCount).toBe(renders); ui.set({ tab: 'flight3d' });
    expect(ui.feedback).not.toBe(oldStatus); expect(ui.feedback.textContent).toBe('');
  });

  it('announces a half turn and leaves elevation, zoom, manual steps, and work intact', async () => {
    const ui = await fixture(), before = work(ui.state), button = ui.action('half-turn');
    ui.click(button);
    expect(ui.state.flightStudyYaw).toBe(-90); expect(ui.state.flightStudyPitch).toBe(10); expect(ui.state.flightStudyZoom).toBe(1.5);
    expect(ui.feedback.textContent).toBe('View turned 180 degrees. Elevation and zoom are unchanged. Study angle: -90°.');
    expect(document.activeElement).toBe(button); expectWork(ui, before);
  });

  it('reports the latest of rapid explicit turns before a new parent commit', async () => {
    const ui = await fixture(), before = work(ui.state), button = ui.action('half-turn'), retained = handler(button);
    button.focus(); act(() => { retained({ currentTarget: button }); retained({ currentTarget: button }); });
    expect(ui.state.flightStudyYaw).toBe(90);
    expect(ui.feedback.textContent).toContain('Study angle: 90°.');
    expect(document.activeElement).toBe(button); expectWork(ui, before);
  });

  it.each([['previous', 0, 7], ['next', 7, 0]])('announces %s across the cycle boundary without claiming manual-step changes', async (action, start, target) => {
    const ui = await fixture(), before = work(ui.state); ui.choose(start); ui.writes.length = 0;
    const button = ui.action(action); expect(button.disabled).toBe(false); ui.click(button);
    expect(ui.feedback.textContent).toBe('Selected cycle position ' + (target + 1) + '/8. Flight paused. Keep the view fixed and describe what you see.');
    expect(ui.host.querySelector('[data-study-cycle-position="' + target + '"]').getAttribute('aria-pressed')).toBe('true');
    expect(ui.state.flightPaused).toBe(true); expect(document.activeElement).toBe(button); expectWork(ui, before);
  });

  it.each(['scene', 'original'])('announces the %s opposite-position control through the local status', async variant => {
    const ui = await fixture(), before = work(ui.state); ui.choose(2); ui.writes.length = 0;
    const button = variant === 'scene' ? ui.action('opposite') : ui.originalOpposite(); ui.click(button);
    expect(ui.feedback.textContent).toBe('Selected opposite cycle position 7. Flight paused. Keep the view fixed and describe what you see.');
    expect(ui.host.querySelector('[data-study-cycle-position="6"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(button); expectWork(ui, before);
  });

  it('explains a cleared cycle selection for a retained adjacent action without writing work', async () => {
    const ui = await fixture(); ui.choose(2);
    const button = ui.action('next'), retained = handler(button);
    ui.click(ui.textButton('Resume flight')); const before = clone(ui.state), writes = ui.writes.length;
    ui.stage.focus(); act(() => retained({ currentTarget: button }));
    expect(ui.feedback.textContent).toBe(waitMessage); expect(ui.state).toEqual(before); expect(ui.writes).toHaveLength(writes);
    expect(document.activeElement).toBe(ui.stage);
  });

  it.each(['scene', 'original'])('explains an unavailable opposite comparison locally for the %s control', async variant => {
    const ui = await fixture(); ui.choose(2);
    const button = variant === 'scene' ? ui.action('opposite') : ui.originalOpposite(), retained = handler(button);
    ui.engine.contextLost = true; const before = clone(ui.state), writes = ui.writes.length;
    ui.stage.focus(); act(() => retained({ currentTarget: button }));
    expect(ui.feedback.textContent).toBe(waitMessage); expect(ui.state).toEqual(before); expect(ui.writes).toHaveLength(writes);
    expect(document.activeElement).toBe(ui.stage);
  });

  it('explains unavailable wingtip selection without a host announcer or learner-data writes', async () => {
    const ui = await fixture({}, { preparing: true }), before = clone(ui.state), button = ui.follow();
    ui.click(button);
    expect(ui.feedback.textContent).toBe('Wait for a ready Study view with Show wingtip path on, then choose a guide again.');
    expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]); expect(document.activeElement).toBe(button);
  });

  it.each(['fit', 'half-turn'])('leaves stale %s ownership rejections quiet', async action => {
    const ui = await fixture(), button = ui.action(action), retained = handler(button), before = clone(ui.state);
    ui.host.querySelector('[data-scene-study-actions]').remove();
    act(() => retained({ currentTarget: button }));
    expect(ui.feedback.textContent).toBe(''); expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]);
  });

  it('keeps the local channel independent when a host announcer is present', async () => {
    const ui = await fixture({}, { hostAnnouncer: true }); ui.click(ui.action('fit'));
    expect(ui.feedback.textContent).toContain('Whole model fitted'); expect(ui.announce).not.toHaveBeenCalled();
  });

  it('translates success and readiness instructions without inserting learner prose', async () => {
    const translate = (key, fallback) => 'Traduit: ' + (fallback == null ? key : fallback);
    const ui = await fixture({}, { t: translate }), before = work(ui.state);
    ui.click(ui.action('fit')); expect(ui.feedback.textContent).toBe('Traduit: Whole model fitted. Study angle and wing pose are unchanged.');
    ui.choose(2); ui.click(ui.action('previous'));
    expect(ui.feedback.textContent).toContain('Traduit: Selected cycle position 2/8.');
    expect(ui.feedback.textContent).toContain('Traduit: Flight paused. Keep the view fixed and describe what you see.');
    expectWork(ui, before);
  });
});
