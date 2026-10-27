import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const roots = new Set();
let tool, reduced;
const clone = value => JSON.parse(JSON.stringify(value));
const workSeed = () => ({
  flightStudyObservations: { drafts: { 'canada_goose:tail': 'Keep my observation.' }, records: {} },
  flightInvestigation: { prediction: 'Keep my prediction.', trials: [], evidence: 'Keep my evidence.' },
  flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge.', notes: 'Keep my explanation.', attempts: [] } } },
  inquiry: { hypothesis: 'Keep my inquiry.' }
});
function work(state) {
  return Object.fromEntries(Object.keys(workSeed()).map(key => [key, clone(state[key])]));
}
function committedHandler(element) {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  expect(key).toBeTruthy(); return element[key].onClick;
}
function fixture(seed = {}, options = {}) {
  reduced = !!options.reduced;
  let state = { tab: 'flight3d', flightCamera: 'study', flightSpecies: 'canada_goose', flightFormation: 'natural',
    flightSeason: 'fall', flightWind: 7, flightPaused: false, flightStudyBird: 3,
    flightStudyYaw: 55, flightStudyPitch: -20, flightStudyZoom: 1.25, flightWingStep: 14,
    flightShowWingtipPath: true, flightShowAnatomy: true, ...workSeed(), ...seed }, refresh;
  const writes = [], announce = vi.fn();
  const ctx = makeCtx({ announceToSR: options.noHostAnnouncer ? null : announce,
    t: options.t || ((key, fallback) => fallback == null ? key : fallback),
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(n => n + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(Component)));
  return {
    host, writes, announce,
    get state() { return state; },
    get feedback() { return host.querySelector('[data-scene-feedback]'); },
    button(text) { return [...host.querySelectorAll('button')].find(button => button.textContent === text); },
    preset(id) { return host.querySelector('[data-study-viewpoint="' + id + '"]'); },
    click(button) { expect(button).toBeTruthy(); button.focus(); act(() => button.click()); }
  };
}
function expectWorkUnchanged(ui, before) {
  expect(work(ui.state)).toEqual(before);
  expect(ui.writes.every(patch => Object.keys(patch).every(key => key.startsWith('flight') && !Object.keys(workSeed()).includes(key)))).toBe(true);
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; reduced = false;
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(async () => {
  await act(async () => { roots.forEach(root => root.unmount()); roots.clear(); });
  document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Native Study action feedback and wingtip names', () => {
  it('announces a selected manual step locally while retaining the button focus and learner work', () => {
    const ui = fixture(), before = work(ui.state), status = ui.feedback, step = ui.button('Step wingbeat');
    expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true'); expect(status.textContent).toBe('');
    ui.click(step);
    expect(ui.state).toMatchObject({ flightWingStep: 15, flightPaused: true });
    expect(ui.feedback).toBe(status); expect(status.textContent).toBe('Selected manual wing step 15. Playback paused.');
    expect(status.textContent).not.toMatch(/cycle position/i); expect(document.activeElement).toBe(step);
    expect(ui.announce).not.toHaveBeenCalled(); expectWorkUnchanged(ui, before);
  });

  it('retains both manual steps from a captured handler before the next commit and reports the latest serial', () => {
    const ui = fixture({ flightWingStep: 0 }), before = work(ui.state), step = ui.button('Step wingbeat');
    const handler = committedHandler(step); step.focus();
    act(() => { handler(); handler(); });
    expect(ui.state.flightWingStep).toBe(2); expect(ui.writes.map(patch => patch.flightWingStep)).toEqual([1, 2]);
    expect(ui.feedback.textContent).toBe('Selected manual wing step 2. Playback paused.');
    expect(document.activeElement).toBe(step); expectWorkUnchanged(ui, before);
  });

  it('reports the wrapped manual serial without claiming it is a numbered cycle position', () => {
    const ui = fixture({ flightWingStep: 1000000 }); ui.click(ui.button('Step wingbeat'));
    expect(ui.state.flightWingStep).toBe(0);
    expect(ui.feedback.textContent).toContain('manual wing step 0');
    expect(ui.feedback.textContent).not.toMatch(/cycle position|position 1|full cycle/i);
  });

  it('keeps reduced-motion playback guidance truthful after a manual step without a host announcer', () => {
    const ui = fixture({}, { reduced: true, noHostAnnouncer: true }), before = work(ui.state);
    ui.click(ui.button('Step wingbeat'));
    expect(ui.feedback.textContent).toContain('manual wing step 15');
    expect(ui.feedback.textContent).toContain('Playback paused.');
    expect(ui.feedback.textContent).toContain('Reduce motion stays enabled; automatic playback remains still.');
    expect(ui.state.flightPaused).toBe(true); expectWorkUnchanged(ui, before);
  });

  it('reports reset values without changing individual, layers, wing serial, playback, or learner work', () => {
    const ui = fixture(), before = work(ui.state), reset = ui.button('Reset study view');
    ui.click(reset);
    expect(ui.state).toMatchObject({ flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1,
      flightStudyBird: 3, flightWingStep: 14, flightPaused: false, flightShowWingtipPath: true, flightShowAnatomy: true });
    expect(ui.feedback.textContent).toBe('Study view reset. Angle 35 degrees. Elevation 15 degrees. Zoom 100 percent.');
    expect(document.activeElement).toBe(reset); expect(ui.announce).not.toHaveBeenCalled(); expectWorkUnchanged(ui, before);
  });

  it('reannounces an explicit reset request even when the reset values and message are unchanged', () => {
    const ui = fixture({ flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1 }), reset = ui.button('Reset study view');
    ui.click(reset); const status = ui.feedback, child = status.firstChild, message = status.textContent;
    ui.click(reset);
    expect(ui.feedback).toBe(status); expect(status.textContent).toBe(message); expect(status.firstChild).not.toBe(child);
    expect(document.activeElement).toBe(reset);
  });

  it.each([
    ['front', 'Front', 180, 10], ['profile', 'Profile', 90, 10],
    ['above', 'From above', 0, 60], ['below', 'From below', 0, -60]
  ])('describes the %s preset through local feedback without a host announcer', (id, label, yaw, pitch) => {
    const ui = fixture({}, { noHostAnnouncer: true }), before = work(ui.state), button = ui.preset(id);
    ui.click(button);
    expect(ui.state).toMatchObject({ flightStudyYaw: yaw, flightStudyPitch: pitch, flightStudyZoom: 1.25, flightStudyBird: 3, flightPaused: false });
    expect(ui.feedback.textContent).toBe('Study viewpoint: ' + label + '. Angle ' + yaw + ' degrees. Elevation ' + pitch + ' degrees.');
    expect(button.getAttribute('aria-pressed')).toBe('true'); expect(document.activeElement).toBe(button);
    expectWorkUnchanged(ui, before);
  });

  it('uses the persistent local status once when a host announcer is available', () => {
    const ui = fixture(); ui.click(ui.preset('front'));
    expect(ui.feedback.textContent).toContain('Study viewpoint: Front'); expect(ui.announce).not.toHaveBeenCalled();
  });

  it('names conditional wingtip controls with the visible solid and dashed legend labels', () => {
    const ui = fixture();
    for (const [side, label] of [[0, 'Individual’s left: solid path'], [1, 'Individual’s right: dashed path']]) {
      const button = ui.host.querySelector('[data-wingtip-follow-side="' + side + '"]');
      expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.textContent).toBe(label);
      expect(button.hasAttribute('aria-label')).toBe(false); expect(button.hasAttribute('aria-labelledby')).toBe(false);
      expect(button.querySelector('i').getAttribute('aria-hidden')).toBe('true');
      expect(button.getAttribute('aria-describedby')).toBe(ui.host.querySelector('[data-migration-id="migration-wingtip-follow-help"]').id);
    }
  });

  it('translates local action feedback and both native wingtip names through their visible strings', () => {
    const translate = (key, fallback) => 'Traduit: ' + (fallback == null ? key : fallback);
    const ui = fixture({}, { t: translate }), before = work(ui.state);
    ui.click(ui.preset('below'));
    expect(ui.feedback.textContent).toContain('Traduit: Study viewpoint: Traduit: From below.');
    expect(ui.feedback.textContent).toContain('Traduit: Angle 0 degrees.'); expect(ui.feedback.textContent).toContain('Traduit: Elevation -60 degrees.');
    for (const side of [0, 1]) {
      const button = ui.host.querySelector('[data-wingtip-follow-side="' + side + '"]');
      expect(button.textContent).toMatch(/^Traduit: Individual’s /); expect(button.hasAttribute('aria-label')).toBe(false);
    }
    ui.click(ui.button('Traduit: Step wingbeat'));
    expect(ui.feedback.textContent).toContain('Traduit: Selected manual wing step 15. Playback paused.');
    expectWorkUnchanged(ui, before);
  });
});
