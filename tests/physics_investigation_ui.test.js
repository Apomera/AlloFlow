import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const flight = (n, overrides = {}) => ({ n, angle: 45, vel: 25, grav: 9.8, mass: 1, drag: false, range: 10, maxH: 5, time: 2, modelVersion: 'projectile-v2', ...overrides });
const draft = (overrides = {}) => ({ title: 'My experiment', question: 'How does speed change range?', prediction: 'I expect the second flight to go farther.', observation: 'Range increased.', claim: 'Changing speed changed the range.', selectedRunIds: [10, 12], activityId: '', ...overrides });

function render(physics = {}) {
  let state = { physics };
  const updates = vi.fn(update => { state = update(state); });
  const ctx = {
    React: { createElement(type, props, ...children) {
      children.flat(Infinity).forEach(child => {
        if (child && typeof child === 'object' && !child.element) throw new Error('Invalid object child');
      });
      return { element: true, type, props: props || {}, children };
    } },
    icons: {}, props: {}, toolSnapshots: [], gradeLevel: '5th Grade', setToolData: updates,
    t: (_key, fallback) => fallback, addToast: vi.fn(), announceToSR: vi.fn(), awardXP: vi.fn(),
  };
  const draw = () => window.StemLab._registry.physics.render({ ...ctx, toolData: state });
  return { tree: draw(), draw, state: () => state.physics, updates,
    patch: patch => { state = { physics: { ...state.physics, ...patch } }; } };
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (Array.isArray(tree)) {
    for (const child of tree) { const result = find(child, predicate); if (result) return result; }
    return undefined;
  }
  if (predicate(tree)) return tree;
  return find(tree.children, predicate);
}
const control = (tree, suffix) => find(tree, node => node.props['data-physics-investigation-' + suffix]);
const field = (tree, key) => find(tree, node => node.props.id === 'physics-investigation-' + key);
const text = tree => Array.isArray(tree) ? tree.map(text).join(' ') : tree && typeof tree === 'object' ? text(tree.children) : tree == null || tree === false ? '' : String(tree);
const trial = (tree, n) => find(tree, node => node.props['data-physics-investigation-trial'] === String(n));
const check = (tree, n, checked = true) => find(tree, node => node.type === 'input' && node.props['aria-label'] === 'Run ' + n).props.onChange({ target: { checked } });

let clipboard;
beforeAll(() => { new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))(); });
beforeEach(() => {
  document.getElementById('physicsCanvas')?.remove();
  clipboard = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
  window.StemLab.writeClipboard = clipboard;
});

describe('guided physics investigation notebook', () => {
  it.each([
    ['speed_squared', { angle: 45, velocity: 15, gravity: 9.8, mass: 1, airResist: false }, { angle: 45, velocity: 30, gravity: 9.8, mass: 1, airResist: false }],
    ['inverse_gravity', { angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: false }, { angle: 45, velocity: 25, gravity: 4.9, mass: 1, airResist: false }],
    ['mass_drag', { angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: true }, { angle: 45, velocity: 25, gravity: 9.8, mass: 5, airResist: true }],
  ])('applies each %s trial atomically without launching or discarding writing', (activityId, first, second) => {
    const cv = document.createElement('canvas');
    cv.id = 'physicsCanvas';
    cv._cancelFlight = vi.fn();
    cv._launch = vi.fn();
    document.body.appendChild(cv);
    const app = render({ investigationDraft: draft(), velocity: 40, mass: 9, airResist: true });
    control(app.tree, 'activity').props.onChange({ target: { value: activityId } });
    expect(app.state().investigationDraft).toMatchObject({ title: 'My experiment', prediction: draft().prediction, observation: draft().observation, claim: draft().claim });
    const before = app.updates.mock.calls.length;
    trial(app.draw(), 1).props.onClick();
    expect(app.updates.mock.calls.length).toBe(before + 1);
    expect(app.state()).toMatchObject({ ...first, showGraphs: true, showOverlay: true });
    expect(cv._cancelFlight).toHaveBeenCalledTimes(1);
    expect(cv._launch).not.toHaveBeenCalled();
    trial(app.draw(), 2).props.onClick();
    expect(app.state()).toMatchObject(second);
    expect(app.state().investigationDraft.prediction).toBe(draft().prediction);
    expect(cv._cancelFlight).toHaveBeenCalledTimes(2);
  });

  it.each(['targetMode', 'challengeActive', 'battleMode'])('keeps trial settings locked during %s', mode => {
    const app = render({ [mode]: true, angle: 60, investigationDraft: draft({ activityId: 'speed_squared' }) });
    const apply = trial(app.tree, 1);
    expect(apply.props.disabled).toBe(true);
    apply.props.onClick();
    expect(app.state().angle).toBe(60);
    expect(app.updates).not.toHaveBeenCalled();
  });

  it('uses stable selected IDs and measured comparisons even when current controls change', () => {
    const app = render({ runLog: [flight(10), flight(12, { vel: 50, range: 40 }), flight(20)], investigationDraft: draft({ selectedRunIds: [] }), airResist: true });
    check(app.tree, 10);
    check(app.draw(), 12);
    expect(app.state().investigationDraft.selectedRunIds).toEqual([10, 12]);
    const comparison = control(app.draw(), 'comparison');
    expect(text(comparison)).toContain('Run 10 → Run 12');
    expect(text(comparison)).toContain('One launch setting changed: velocity');
    expect(text(comparison)).toContain('+30.00 m (+300.0%)');
    expect(text(comparison)).toContain('Both runs assume no air drag');
    check(app.draw(), 10, false);
    expect(app.state().investigationDraft.selectedRunIds).toEqual([12]);
    expect(control(app.draw(), 'comparison')).toBeUndefined();
  });

  it('selects recovered legacy run IDs, keeps selections while editing, and saves the evidence', () => {
    const legacy = [flight(1), flight(2, { vel: 50, range: 40 })].map(({ n, ...row }) => row);
    const app = render({ runLog: legacy, investigationDraft: draft({ selectedRunIds: [] }), unrelatedSavedWork: 'keep this' });
    check(app.tree, 1);
    check(app.draw(), 2);
    field(app.draw(), 'observation').props.onChange({ target: { value: 'The recovered trials still show four times the range.' } });
    expect(app.state().investigationDraft.selectedRunIds).toEqual([1, 2]);
    expect(control(app.draw(), 'save').props.disabled).toBe(false);
    control(app.draw(), 'save').props.onClick();
    expect(app.state().investigations).toHaveLength(1);
    expect(app.state().investigations[0].runs.map(run => run.n)).toEqual([1, 2]);
    expect(app.state().investigations[0].runs.map(run => run.range)).toEqual([10, 40]);
    expect(app.state().investigations[0].observation).toContain('four times the range');
    expect(app.state().unrelatedSavedWork).toBe('keep this');
    app.patch({ runLog: [] });
    expect(text(control(app.draw(), 'report'))).toContain('Run 1');
    expect(text(control(app.draw(), 'report'))).toContain('Run 2');
  });

  it.each([
    [undefined, undefined, 25],
    ['projectile-v1', 'projectile-v2', 25],
    [undefined, 'projectile-v2', 50],
  ])('warns for model provenance %s → %s without claiming a repeat or multiple setting changes', (firstModel, secondModel, speed) => {
    const app = render({ runLog: [flight(10, { modelVersion: firstModel }), flight(12, { modelVersion: secondModel, vel: speed })], investigationDraft: draft() });
    const comparison = control(app.tree, 'comparison');
    expect(text(control(app.tree, 'model-warning'))).toContain('Recorded model versions are missing or different');
    expect(text(comparison)).not.toContain('Repeated trial');
    expect(text(comparison)).not.toContain('Multiple launch settings changed');
    expect(text(comparison)).toContain(speed === 25 ? 'The recorded launch settings match.' : 'One launch setting changed: velocity');
  });

  it('copies complete immutable reports that remain available after clear, edits and restored state', async () => {
    const app = render({ runLog: [flight(10), flight(12, { range: 40, vel: 50 })], investigationDraft: draft(), investigationOpen: true });
    control(app.tree, 'save').props.onClick();
    expect(app.state().investigations).toHaveLength(1);
    const report = text(control(app.draw(), 'report'));
    expect(report).toContain('My experiment');
    expect(report).toContain(draft().prediction);
    expect(report).toContain('Run 10');
    expect(report).toContain('Run 12');
    field(app.draw(), 'claim').props.onChange({ target: { value: 'A new draft claim.' } });
    find(app.draw(), node => node.props['aria-label'] === 'Clear the experiment log').props.onClick();
    expect(app.state().runLog).toEqual([]);
    expect(text(control(app.draw(), 'report'))).toBe(report);
    expect(app.state().investigations[0].claim).toBe(draft().claim);
    const restored = render(JSON.parse(JSON.stringify(app.state())));
    expect(text(control(restored.tree, 'report'))).toBe(report);
    control(restored.tree, 'copy').props.onClick();
    await Promise.resolve();
    expect(clipboard).toHaveBeenCalledWith(report);
  });

  it('reads current draft and archives when a previously rendered save callback runs', () => {
    const log = [flight(10), flight(12)];
    const app = render({ runLog: log, investigationDraft: draft() });
    const oldSave = control(app.tree, 'save');
    const earlier = window.StemLab._physics.createInvestigation(draft({ title: 'Already saved' }), log, 'already-saved', '2026-09-27T12:00:00.000Z');
    app.patch({ investigations: [earlier], investigationDraft: draft({ title: 'Fresh title' }) });
    oldSave.props.onClick();
    expect(app.state().investigations.map(item => item.title)).toEqual(['Already saved', 'Fresh title']);
  });

  it('requires a title and two completed runs, preserves 12 reports, and deletes only the selected report', () => {
    const log = [flight(10), flight(12)];
    const incomplete = render({ runLog: log, investigationDraft: draft({ title: '', selectedRunIds: [10] }) });
    expect(control(incomplete.tree, 'save').props.disabled).toBe(true);
    control(incomplete.tree, 'save').props.onClick();
    expect(incomplete.state().investigations).toEqual([]);
    const saved = Array.from({ length: 12 }, (_, i) => window.StemLab._physics.createInvestigation(draft({ title: 'Report ' + i }), log, 'saved-' + i, '2026-09-27T12:00:00.000Z'));
    const app = render({ runLog: log, investigationDraft: draft(), investigations: saved, selectedInvestigationId: 'saved-5' });
    expect(control(app.tree, 'save').props.disabled).toBe(true);
    expect(text(app.tree)).toContain('All 12 saved slots are in use');
    control(app.tree, 'save').props.onClick();
    expect(app.state().investigations.map(item => item.id)).toEqual(saved.map(item => item.id));
    control(app.draw(), 'delete').props.onClick();
    expect(app.state().investigations).toHaveLength(11);
    expect(app.state().investigations.some(item => item.id === 'saved-5')).toBe(false);
    expect(control(app.draw(), 'save').props.disabled).toBe(false);
    control(app.draw(), 'save').props.onClick();
    expect(app.state().investigations).toHaveLength(12);
  });

  it('opens chosen saved reports without relying on current run selection', () => {
    const log = [flight(10), flight(12)];
    const saved = ['first', 'second'].map(id => window.StemLab._physics.createInvestigation(draft({ title: id }), log, id, '2026-09-27T12:00:00.000Z'));
    const app = render({ runLog: [], investigations: saved });
    control(app.tree, 'select').props.onChange({ target: { value: 'second' } });
    expect(text(control(app.draw(), 'report'))).toContain('second');
    expect(text(control(app.draw(), 'report'))).toContain('Run 12');
  });

  it('falls back to selectable report copying when browser clipboard access is rejected', async () => {
    const log = [flight(10), flight(12)];
    const saved = window.StemLab._physics.createInvestigation(draft(), log, 'fallback-report', '2026-09-27T12:00:00.000Z');
    const app = render({ investigations: [saved], selectedInvestigationId: saved.id });
    clipboard.mockRejectedValueOnce(new Error('Clipboard denied'));
    let fallbackText;
    Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => {
      fallbackText = document.querySelector('textarea[readonly]')?.value;
      return true;
    }) });
    control(app.tree, 'copy').props.onClick();
    await vi.waitFor(() => expect(fallbackText).toContain('My experiment'));
    expect(document.querySelector('textarea[readonly]')).toBeNull();
    expect(app.state().investigationNotice).toBe('Investigation report copied as plain text.');
  });
});
