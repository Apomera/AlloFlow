import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const roots = new Set();
const clone = value => JSON.parse(JSON.stringify(value));
const choices = ['chase', 'aerial', 'side', 'study'];
const labels = ['Chase', 'Aerial', 'Side', 'Study'];
let tool;

function fixture(options = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightSpecies: 'canada_goose', flightPaused: true,
    flightMotionReduced: true, flightWind: 6, flightSeason: 'fall', flightFormation: 'natural',
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1.2, flightStudyBird: 2,
    flightWingStep: 13, flightShowAnatomy: true, flightShowSpeedVectors: true,
    flightInvestigation: { prediction: 'Keep this investigation.', evidence: 'Keep these measurements.', trials: [] },
    flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep my draft.' }, records: {} },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep this prediction.', notes: 'Keep this explanation.', attempts: [] } } },
    ...options.seed }, refresh;
  const writes = [], announce = vi.fn();
  function update(patch) { writes.push(clone(patch)); state = { ...state, ...patch }; refresh(n => n + 1); }
  const ctx = makeCtx({ t: options.t || ((_key, fallback) => fallback), announceToSR: announce,
    update: (_bucket, key, value) => update({ [key]: value }), updateMulti: (_bucket, patch) => update(patch) });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  function View() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(View)));
  const ui = { host, writes, announce, get state() { return state; },
    group() { return host.querySelector('[data-migration-camera-guide]'); },
    button(id) { return host.querySelector('[data-flight-camera="' + id + '"]'); },
    stage() { return host.querySelector('.migration-flight-stage'); },
    click(id) { const button = ui.button(id); button.focus(); act(() => button.click()); },
    key(target, key, modifiers = {}) { const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }); act(() => target.dispatchEvent(event)); return event; },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); }
  };
  return ui;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  resetStemLab(); tool = loadTool(process.env.MIGRATION_CAMERA_GUIDE_CANDIDATE || 'stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { roots.forEach(root => root.unmount()); roots.clear(); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Migration camera choice guide', () => {
  it('names the group from its visible local heading and describes each unchanged native button', () => {
    const ui = fixture(), group = ui.group();
    expect(group.getAttribute('role')).toBe('group');
    const heading = document.getElementById(group.getAttribute('aria-labelledby'));
    expect(group.contains(heading)).toBe(true); expect(heading.textContent).toBe('Camera');
    expect(group.querySelectorAll('button')).toHaveLength(4);
    choices.forEach((id, index) => {
      const button = ui.button(id), purpose = document.getElementById(button.getAttribute('aria-describedby'));
      expect(button.type).toBe('button'); expect(button.textContent).toBe(labels[index]);
      expect(button.hasAttribute('aria-label')).toBe(false);
      expect(group.contains(purpose)).toBe(true); expect(purpose.getAttribute('data-camera-purpose')).toBe(id);
      expect(purpose.textContent.length).toBeGreaterThan(12);
    });
    expect(group.querySelector('[data-camera-purpose="side"]').textContent).toBe('See flight from the side.');
    expect(group.querySelector('[role="status"],[aria-live]')).toBeNull();
  });

  it.each(choices)('selects %s natively, preserves authored work and keeps focus on the activated button', id => {
    const ui = fixture(), before = clone(ui.state), button = ui.button(id);
    ui.click(id);
    expect(ui.writes).toEqual([{ flightCamera: id }]); expect(ui.state).toEqual({ ...before, flightCamera: id });
    expect(document.activeElement).toBe(button);
    expect(ui.group().querySelectorAll('[aria-pressed="true"]')).toHaveLength(1);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    const chosen = ui.group().querySelector('[data-camera-selected="true"]');
    expect(chosen.getAttribute('data-camera-choice')).toBe(id);
    const badge = chosen.querySelector('[data-camera-selection]');
    expect(badge.getAttribute('aria-hidden')).toBe('true'); expect(badge.textContent).toBe('Selected view');
    expect(button.contains(badge)).toBe(false);
    expect(ui.host.querySelector('[data-scene-feedback]').textContent).toContain('Camera selected');
  });

  it('keeps card selection synchronized with the existing focused-scene camera shortcuts', () => {
    const ui = fixture(), before = clone(ui.state), stage = ui.stage(); stage.focus();
    choices.forEach((id, index) => {
      const event = ui.key(stage, String(index + 1));
      expect(event.defaultPrevented).toBe(true); expect(ui.state.flightCamera).toBe(id);
      expect(ui.button(id).getAttribute('aria-pressed')).toBe('true');
      expect(ui.group().querySelector('[data-camera-selected="true"]').getAttribute('data-camera-choice')).toBe(id);
      expect(document.activeElement).toBe(stage);
    });
    expect(ui.state).toEqual(before);
  });

  it('does not intercept number keys or modified shortcuts while the learner is writing', () => {
    const ui = fixture(), before = clone(ui.state);
    const field = ui.host.querySelector('[data-migration-id="migration-experiment-evidence"]'); field.focus();
    expect(ui.key(field, '1').defaultPrevented).toBe(false);
    expect(ui.key(ui.stage(), '2', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]); expect(document.activeElement).toBe(field);
  });

  it('keeps relationships, selection and updates inside each of two mounted migration tools', () => {
    const first = fixture(), second = fixture({ seed: { flightCamera: 'aerial', flightWind: -4 } });
    const secondBefore = clone(second.state), allIds = [];
    for (const ui of [first, second]) {
      const group = ui.group(); allIds.push(group.getAttribute('aria-labelledby'));
      choices.forEach(id => { const ref = ui.button(id).getAttribute('aria-describedby'); allIds.push(ref); expect(group.contains(document.getElementById(ref))).toBe(true); });
    }
    expect(new Set(allIds).size).toBe(allIds.length);
    first.click('side'); expect(second.state).toEqual(secondBefore); expect(second.writes).toEqual([]);
    expect(second.button('aerial').getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(first.button('side'));
  });

  it('preserves descriptive relationships through translated labels and camera round trips', () => {
    const ui = fixture({ t: (key, fallback) => key.startsWith('stem.migration.cam_') || key === 'stem.migration.camera_label' || key === 'stem.migration.camera_selected_view' ? 'Translated: ' + fallback : fallback });
    const group = ui.group(), headingId = group.getAttribute('aria-labelledby');
    const ids = choices.map(id => ui.button(id).getAttribute('aria-describedby'));
    expect(document.getElementById(headingId).textContent).toBe('Translated: Camera');
    ui.click('chase'); ui.click('study'); ui.set({ flightWind: 9 });
    expect(ui.group()).toBe(group); expect(group.getAttribute('aria-labelledby')).toBe(headingId);
    choices.forEach((id, index) => {
      const button = ui.button(id);
      expect(button.textContent).toBe('Translated: ' + labels[index]);
      expect(button.getAttribute('aria-describedby')).toBe(ids[index]);
      expect(document.getElementById(ids[index]).textContent).toMatch(/^Translated: /);
    });
    expect(group.querySelector('[data-camera-selected="true"] [data-camera-selection]').textContent).toBe('Translated: Selected view');
  });
});
