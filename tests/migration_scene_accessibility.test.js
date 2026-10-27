import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const roots = new Set();
let tool, media;
const clone = value => JSON.parse(JSON.stringify(value));
const learnerWork = () => ({
  inquiry: { hypothesis: 'Keep my migration prediction.' },
  flightStudyObservations: { drafts: { 'canada_goose:tail': 'Keep my shape observation.' }, records: {} },
  flightInvestigation: { variable: 'wind', prediction: 'Keep my wind prediction.', trials: [] },
  flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge.', notes: 'Keep my reasoning.', attempts: [] } } }
});
function savedWork(state) {
  return Object.fromEntries(Object.keys(learnerWork()).map(key => [key, clone(state[key])]));
}
function props(element) {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  expect(key, 'Expected a committed React control').toBeTruthy();
  return element[key];
}
function fixture(seed = {}, options = {}) {
  media.matches = !!options.reduced;
  let state = { tab: 'flight3d', flightSpecies: 'canada_goose', flightCamera: 'study',
    flightFormation: 'natural', flightSeason: 'fall', flightWind: 0, flightPaused: true,
    flightStudyBird: 2, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1.2,
    flightStudyRegion: 'tail', flightStudyObservationOpen: false, ...learnerWork(), ...seed }, refresh;
  const writes = [], announce = vi.fn();
  const ctx = makeCtx({ announceToSR: announce, ...options.ctx,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(n => n + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(Component)));
  const ui = {
    host, writes, announce,
    get state() { return state; },
    get stage() { return host.querySelector("[data-migration-id=\"migration-flight-stage\"]"); },
    get guide() { return host.querySelector('[data-scene-guide]'); },
    get summary() { return host.querySelector('[data-scene-summary]'); },
    get route() { return host.querySelector('[data-scene-route]'); },
    get help() { return host.querySelector('[data-scene-help]'); },
    get feedback() { return host.querySelector('[data-scene-feedback]'); },
    get announceButton() { return host.querySelector('[data-scene-announce]'); },
    key(key, options = {}, target = ui.stage) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
      act(() => target.dispatchEvent(event)); return event;
    },
    click(element) { expect(element).not.toBeNull(); element.focus(); act(() => element.click()); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    control(label) { return host.querySelector('[aria-label="' + label + '"]'); },
    change(label, value) { const control = ui.control(label); expect(control).not.toBeNull(); act(() => props(control).onChange({ target: { value } })); }
  };
  return ui;
}
function references(ui, attribute) {
  return (ui.stage.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)
    .map(id => ui.host.querySelector('[id="' + id + '"]'));
}
function expectSummary(ui, expressions) {
  for (const expression of expressions) expect(ui.summary.textContent).toMatch(expression);
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const listeners = new Set();
  media = { matches: false, media: '(prefers-reduced-motion: reduce)',
    addEventListener: (name, callback) => { if (name === 'change') listeners.add(callback); },
    removeEventListener: (name, callback) => { if (name === 'change') listeners.delete(callback); },
    change(matches) { media.matches = matches; listeners.forEach(callback => callback({ matches })); }
  };
  vi.stubGlobal('matchMedia', () => media);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(620);
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(async () => {
  await act(async () => { roots.forEach(root => root.unmount()); roots.clear(); });
  document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Migration 3D scene orientation and feedback', () => {
  it('associates visible summary, keyboard help and honest scope with the focused scene', () => {
    const ui = fixture();
    expect(ui.guide?.tagName).toBe('SECTION'); expect(ui.guide.querySelector('h3').textContent).toBe('3D scene guide');
    expect(ui.summary.tagName).toBe('P'); expect(ui.route.tagName).toBe('P'); expect(ui.help.tagName).toBe('P');
    expect(ui.stage.getAttribute('role')).toBe('group'); expect(ui.stage.tabIndex).toBe(0);
    const described = references(ui, 'aria-describedby');
    expect(described.length).toBeGreaterThanOrEqual(3); expect(described.every(Boolean)).toBe(true);
    expect(described).toContain(ui.summary); expect(described).toContain(ui.help);
    expect(described.map(node => node.textContent).join(' ')).toMatch(/selected.*settings|settings.*selected/i);
    expect(described.map(node => node.textContent).join(' ')).toMatch(/render|pose|prepar|load|illustrat/i);
    expect(ui.stage.getAttribute('data-flight-ready')).not.toBe('true');
    expect(ui.stage.querySelector('.migration-flight-stage-status').textContent).toContain('Preparing');
    expect(ui.help.textContent).toMatch(/arrow/i); expect(ui.help.textContent).toMatch(/zoom/i);
    expect(ui.help.textContent).toMatch(/Space/); expect(ui.help.textContent).toMatch(/focus/i);
    expect(ui.writes).toEqual([]);
  });

  it('uses per-instance description references without sharing another scene guide', () => {
    const first = fixture(), second = fixture({ flightSpecies: 'monarch' });
    expect(first.summary.id).toBeTruthy(); expect(first.summary.id).not.toBe(second.summary.id);
    expect(first.help.id).not.toBe(second.help.id);
    expect(references(first, 'aria-describedby')).toContain(first.summary);
    expect(references(first, 'aria-describedby')).not.toContain(second.summary);
    expect(references(second, 'aria-describedby')).toContain(second.summary);
  });

  it('describes the chosen Study individual and camera settings while preserving route and speed context', () => {
    const ui = fixture({ flightShowSpeedVectors: true });
    const count = ui.control('Study individual').options.length;
    expectSummary(ui, [/Study/i, new RegExp('Individual\\s+3\\s+of\\s+' + count, 'i'), /Angle[^.]*35\s*degrees/i,
      /Elevation[^.]*15\s*degrees/i, /Zoom[^.]*120\s*percent/i, /Tail/i]);
    expect(ui.route.textContent).toContain('Northern Canada'); expect(ui.route.textContent).toContain('Southern US');
    const label = ui.stage.getAttribute('aria-label');
    expect(label).toContain('V formation'); expect(label).toMatch(/miles per hour ground speed/);
    expect(label).toMatch(/selected route/i); expect(label).not.toMatch(/traveling/i);
    expect(references(ui, 'aria-describedby').map(node => node.textContent).join(' ')).toMatch(/Selected camera:\s*Study/i);
    ui.set({ flightCamera: 'side', flightWind: 10 });
    expect(ui.stage.getAttribute('aria-label')).toContain('Along-route wind: +22.4 mph');
    expectSummary(ui, [/Side/]);
  });

  it.each([
    [false, false, /running/i],
    [true, false, /paused/i],
    [false, true, /reduc.*motion|motion.*reduc/i],
    [true, true, /reduc.*motion|motion.*reduc/i]
  ])('describes effective playback for saved pause=%s and device reduce motion=%s', (paused, reduced, expected) => {
    const ui = fixture({ flightPaused: paused }, { reduced });
    expectSummary(ui, [expected]);
    if (reduced) expect(ui.summary.textContent).not.toMatch(/\brunning\b/i);
    expect(ui.writes).toEqual([]);
  });

  it('updates reduced-motion description when device preferences change without saving learner data', () => {
    const ui = fixture({ flightPaused: false }), work = savedWork(ui.state);
    expectSummary(ui, [/running/i]);
    act(() => media.change(true)); expectSummary(ui, [/reduc.*motion|motion.*reduc/i]);
    act(() => media.change(false)); expectSummary(ui, [/running/i]);
    expect(ui.writes).toEqual([]); expect(savedWork(ui.state)).toEqual(work);
  });

  it('explains Monarch Study and reverses the selected route for spring without bird anatomy claims', () => {
    const ui = fixture({ flightSpecies: 'monarch', flightSeason: 'spring', flightStudyRegion: 'primaries' });
    expectSummary(ui, [/Study/i, /individual/i, /whole.*wing|whole.*insect/i]);
    expect(ui.summary.textContent).not.toMatch(/primary feathers|tail/i);
    const places = [...ui.host.querySelectorAll('.migration-flight-route-places span')].map(node => node.textContent);
    expect(places).toHaveLength(2);
    expect(ui.route.textContent.indexOf(places[0])).toBeGreaterThanOrEqual(0);
    expect(ui.route.textContent.indexOf(places[1])).toBeGreaterThan(ui.route.textContent.indexOf(places[0]));
  });

  it('announces on request with a persistent polite status, retaining focus and saved work', () => {
    const ui = fixture(), work = clone(ui.state), feedback = ui.feedback;
    expect(feedback.getAttribute('role')).toBe('status'); expect(feedback.getAttribute('aria-live')).toBe('polite');
    expect(feedback.getAttribute('aria-atomic')).toBe('true'); expect(feedback.textContent).toBe('');
    expect(ui.announceButton.type).toBe('button'); expect(ui.announceButton.textContent).toBe('Announce view settings');
    ui.click(ui.announceButton);
    expect(ui.feedback).toBe(feedback); expect(document.activeElement).toBe(ui.announceButton);
    expect(feedback.textContent).toContain(ui.summary.textContent);
    const firstChild = feedback.firstChild, firstMessage = feedback.textContent;
    expect(firstChild).not.toBeNull(); ui.click(ui.announceButton);
    expect(feedback.firstChild).not.toBe(firstChild); expect(feedback.textContent).toBe(firstMessage);
    expect(ui.writes).toEqual([]); expect(ui.state).toEqual(work);
  });

  it('reports the resulting angle, elevation and zoom after direct keys, including repeated orbit keys', () => {
    const ui = fixture(), work = savedWork(ui.state); ui.stage.focus();
    expect(ui.key('ArrowRight').defaultPrevented).toBe(true);
    expect(ui.state.flightStudyYaw).toBe(45); expect(ui.feedback.textContent).toMatch(/45/);
    expect(ui.key('ArrowRight', { repeat: true }).defaultPrevented).toBe(true);
    expect(ui.state.flightStudyYaw).toBe(55); expect(ui.feedback.textContent).toMatch(/55/);
    ui.key('ArrowDown'); expect(ui.state.flightStudyPitch).toBe(10); expect(ui.feedback.textContent).toMatch(/10/);
    ui.key('+'); expect(ui.state.flightStudyZoom).toBe(1.3); expect(ui.feedback.textContent).toMatch(/130/);
    ui.key('-', { repeat: true }); expect(ui.state.flightStudyZoom).toBe(1.2); expect(ui.feedback.textContent).toMatch(/120/);
    expectSummary(ui, [/Angle[^.]*55\s*degrees/i, /Elevation[^.]*10\s*degrees/i, /Zoom[^.]*120\s*percent/i]);
    expect(document.activeElement).toBe(ui.stage); expect(savedWork(ui.state)).toEqual(work);
  });

  it('describes clamped keyboard settings rather than an unavailable elevation or zoom', () => {
    const ui = fixture({ flightStudyYaw: 175, flightStudyPitch: 60, flightStudyZoom: 1.6 }); ui.stage.focus();
    ui.key('ArrowRight'); expect(ui.state.flightStudyYaw).toBe(-175); expect(ui.feedback.textContent).toMatch(/-175/);
    ui.key('ArrowUp'); expect(ui.state.flightStudyPitch).toBe(60); expect(ui.feedback.textContent).not.toMatch(/65\s*(degrees|°)/i);
    ui.key('+'); expect(ui.state.flightStudyZoom).toBe(1.6); expect(ui.feedback.textContent).not.toMatch(/170\s*(percent|%)/i);
    expectSummary(ui, [/Elevation[^.]*60\s*degrees/i, /Zoom[^.]*160\s*percent/i]);
  });

  it.each([' ', '1', '2', '3', '4'])('ignores repeated %j toggle keydown after its initial activation', key => {
    const ui = fixture(), work = savedWork(ui.state); ui.stage.focus();
    expect(ui.key(key).defaultPrevented).toBe(true);
    const state = clone(ui.state), writes = ui.writes.length, announcements = ui.announce.mock.calls.length;
    const feedback = ui.feedback.textContent, child = ui.feedback.firstChild;
    expect(ui.key(key, { repeat: true }).defaultPrevented).toBe(true);
    expect(ui.key(key, { repeat: true }).defaultPrevented).toBe(true);
    expect(ui.state).toEqual(state); expect(ui.writes).toHaveLength(writes); expect(ui.announce).toHaveBeenCalledTimes(announcements);
    expect(ui.feedback.textContent).toBe(feedback); expect(ui.feedback.firstChild).toBe(child);
    expect(document.activeElement).toBe(ui.stage); expect(savedWork(ui.state)).toEqual(work);
  });

  it('leaves browser shortcuts and descendant controls alone', () => {
    const ui = fixture(), state = clone(ui.state), quick = ui.stage.querySelector('button');
    expect(quick).not.toBeNull(); quick.focus();
    for (const key of [' ', '1', '4', 'ArrowRight', '+']) {
      for (const modifier of ['altKey', 'ctrlKey', 'metaKey']) expect(ui.key(key, { [modifier]: true }).defaultPrevented).toBe(false);
      expect(ui.key(key, {}, quick).defaultPrevented).toBe(false);
    }
    expect(ui.state).toEqual(state); expect(ui.writes).toEqual([]); expect(ui.feedback.textContent).toBe('');
    expect(document.activeElement).toBe(quick);
  });

  it('reflects native Study settings and a manual wing step without rewriting observation work', () => {
    const ui = fixture({ flightPaused: false }), work = savedWork(ui.state);
    ui.change('Study angle in degrees', '-35'); ui.change('Study elevation in degrees', '-20'); ui.change('Study zoom percent', '105');
    expectSummary(ui, [/Angle[^.]*-35\s*degrees/i, /Elevation[^.]*-20\s*degrees/i, /Zoom[^.]*105\s*percent/i]);
    const step = [...ui.host.querySelectorAll('button')].find(button => button.textContent === 'Step wingbeat');
    ui.click(step); expect(ui.state.flightPaused).toBe(true); expectSummary(ui, [/paused/i]);
    ui.click(ui.announceButton); expect(ui.feedback.textContent).toContain(ui.summary.textContent);
    expect(savedWork(ui.state)).toEqual(work);
  });
});
