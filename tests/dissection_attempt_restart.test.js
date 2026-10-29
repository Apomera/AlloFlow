import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const result = find(child, predicate); if (result) return result; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
const saved = { id: 100, savedAt: 100, layer: 'skin', score: 50, history: ['inspect'], actionLog: [{ action: 'inspect', at: 90 }] };
const attempted = {
  inspected: true, incisionStarted: true, history: ['inspect', 'scalpel'],
  actionLog: [{ action: 'inspect', at: 200 }, { action: 'scalpel', at: 201 }],
  incisionPath: [{ x: 0.3, y: 0.3 }, { x: 0.4, y: 0.4 }],
  incisionMetrics: { precision: 70, coverage: 80, control: 60, angleControl: 75 },
  learningChecks: { scalpel: { predictionChoice: 'shallow', predictionCorrect: true } },
  lastSavedAttemptId: 100,
};

describe('dissection unsaved technique restart protection', () => {
  let config;
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); resetStemLab(); config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection'); });
  afterEach(() => { vi.restoreAllMocks(); vi.clearAllTimers(); vi.useRealTimers(); localStorage.clear(); });
  function fixture(patch = {}) {
    const store = newStore({ dissection: { specimen: 'frog', activeLayer: 'skin', _dissLoadedSpec: 'frog', workspaceMode: 'advanced', reducedMotion: true, techniquePanelOpen: true,
      procedureByLayer: { skin: structuredClone(attempted) }, attemptArchive: { skin: [structuredClone(saved)] },
      organNotes: { 'frog|dorsal_skin': 'Keep my observations.' }, ...patch } });
    function render() { return config.render(makeCtx({ toolData: store.toolData }, store)); }
    function button(id, tree = render()) { const node = find(tree, item => item.type === 'button' && item.props.id === id); expect(node, id).not.toBeNull(); return node; }
    return { store, render, button, get state() { return store.toolData.dissection; } };
  }

  it('reviews unsaved changes even when an older saved attempt ID remains and cancellation preserves all work', () => {
    const lab = fixture(); const before = structuredClone(lab.state);
    lab.button('diss-new-attempt').props.onClick();
    const tree = lab.render();
    expect(find(tree, node => node.props?.id === 'diss-attempt-restart-review')).not.toBeNull();
    expect(lab.state.procedureByLayer).toEqual(before.procedureByLayer);
    expect(lab.state.attemptArchive).toEqual(before.attemptArchive);
    lab.button('diss-attempt-restart-cancel', tree).props.onClick();
    expect(find(lab.render(), node => node.props?.id === 'diss-attempt-restart-review')).toBeNull();
    expect(lab.state.procedureByLayer).toEqual(before.procedureByLayer);
    expect(lab.state.organNotes).toEqual(before.organNotes);
  });

  it('saves the latest stroke before resetting and consumes the review only once', () => {
    const lab = fixture(); lab.button('diss-new-attempt').props.onClick();
    const confirm = lab.button('diss-attempt-restart-save');
    confirm.props.onClick(); confirm.props.onClick();
    expect(lab.state.attemptArchive.skin).toHaveLength(2);
    const latest = lab.state.attemptArchive.skin.at(-1);
    expect(latest.incisionPath).toEqual(attempted.incisionPath);
    expect(latest.history).toEqual(['inspect', 'scalpel']);
    expect(latest.procedureSignature).toEqual(expect.any(String));
    expect(lab.state.procedureByLayer.skin.history).toEqual([]);
    expect(lab.state.procedureByLayer.skin.incisionStarted).toBe(false);
    expect(lab.state.organNotes['frog|dorsal_skin']).toBe('Keep my observations.');
  });

  it('requires explicit oldest-replacement approval when saving into a full archive', () => {
    const archive = Array.from({ length: 6 }, (_, index) => ({ ...saved, id: 100 + index, savedAt: 100 + index }));
    const lab = fixture({ attemptArchive: { skin: archive } });
    lab.button('diss-new-attempt').props.onClick(); const tree = lab.render();
    expect(ReactDOMServer.renderToStaticMarkup(tree)).toContain('oldest saved attempt');
    expect(lab.button('diss-attempt-restart-save', tree).props.children).toBe('Save, replace oldest, and restart');
    expect(lab.state.attemptArchive.skin).toEqual(archive);
    lab.button('diss-attempt-restart-save', tree).props.onClick();
    expect(lab.state.attemptArchive.skin).toHaveLength(6);
    expect(lab.state.attemptArchive.skin.slice(0, 5)).toEqual(archive.slice(1));
    expect(lab.state.attemptArchive.skin.at(-1).history).toEqual(attempted.history);
  });

  it.each([6, 8])('labels direct replacement before saving into an archive of %i entries and preserves unchanged saves', count => {
    const archive = Array.from({ length: count }, (_, index) => ({ ...saved, id: 100 + index, savedAt: 100 + index }));
    const lab = fixture({ attemptArchive: { skin: archive } });
    const tree = lab.render(), save = lab.button('diss-save-attempt', tree);
    expect(save.props.children).toContain('Save attempt and replace oldest' + (count > 6 ? ' ' + (count - 5) : ''));
    expect(save.props.title).toContain('replace oldest');
    expect(save.props['aria-describedby']).toBe('diss-attempt-archive-capacity');
    expect(ReactDOMServer.renderToStaticMarkup(tree)).toContain('Saving a changed attempt will replace the oldest saved attempt');
    expect(lab.state.attemptArchive.skin).toEqual(archive);
    save.props.onClick();
    expect(lab.state.attemptArchive.skin).toHaveLength(6);
    expect(lab.state.attemptArchive.skin.slice(0, 5)).toEqual(archive.slice(-5));
    expect(lab.state.procedureByLayer.skin.history).toEqual(attempted.history);
    const unchanged = structuredClone(lab.state.attemptArchive);
    lab.button('diss-save-attempt').props.onClick();
    expect(lab.state.attemptArchive).toEqual(unchanged);
    expect(lab.state.procedureFeedback.message).toContain('No duplicate baseline');
  });

  it('discards only the active attempt after explicit approval', () => {
    const lab = fixture(); const archive = structuredClone(lab.state.attemptArchive);
    lab.button('diss-new-attempt').props.onClick(); lab.button('diss-attempt-restart-discard').props.onClick();
    expect(lab.state.attemptArchive).toEqual(archive);
    expect(lab.state.procedureByLayer.skin.history).toEqual([]);
    expect(lab.state.organNotes['frog|dorsal_skin']).toBe('Keep my observations.');
  });

  it('does not append duplicate snapshots for an unchanged save and can restart a fully saved attempt directly', () => {
    const lab = fixture(); lab.button('diss-save-attempt').props.onClick();
    const count = lab.state.attemptArchive.skin.length;
    lab.button('diss-save-attempt').props.onClick();
    expect(lab.state.attemptArchive.skin).toHaveLength(count);
    lab.button('diss-new-attempt').props.onClick();
    expect(lab.state.procedureByLayer.skin.history).toEqual([]);
    expect(find(lab.render(), node => node.props?.id === 'diss-attempt-restart-review')).toBeNull();
  });

  it('detects changed explanation records even when technique metrics are unchanged and avoids timestamp ID collisions', () => {
    vi.setSystemTime(new Date(1800000000000));
    const lab = fixture(); lab.button('diss-save-attempt').props.onClick();
    const first = lab.state.attemptArchive.skin.at(-1).id;
    lab.state.procedureByLayer.skin.learningChecks.scalpel.reflectionChoice = 'stress';
    lab.button('diss-new-attempt').props.onClick();
    lab.button('diss-attempt-restart-save').props.onClick();
    const second = lab.state.attemptArchive.skin.at(-1).id;
    expect(second).not.toBe(first);
    expect(lab.state.attemptArchive.skin.at(-1).procedureSignature).toContain('stress');
  });

  it.each([
    { quizMode: true }, { practicalMode: true }, { activeLayer: 'organs' }, { specimen: 'pig' },
    { _layerTransition: { active: true } }, { _viewTransition: { active: true } }, { _incisionAnim: { active: true } },
  ])('rejects stale review actions after context changes: %j', patch => {
    const lab = fixture(); lab.button('diss-new-attempt').props.onClick();
    const stale = lab.button('diss-attempt-restart-discard');
    Object.assign(lab.state, patch); lab.render();
    const before = structuredClone(lab.state.procedureByLayer);
    stale.props.onClick();
    expect(lab.state.procedureByLayer).toEqual(before);
  });

  it('keeps restart reviews isolated between mounted lab owners', () => {
    const a = fixture(), b = fixture();
    a.button('diss-new-attempt').props.onClick(); b.button('diss-new-attempt').props.onClick();
    a.button('diss-attempt-restart-cancel').props.onClick();
    expect(find(a.render(), node => node.props?.id === 'diss-attempt-restart-review')).toBeNull();
    expect(find(b.render(), node => node.props?.id === 'diss-attempt-restart-review')).not.toBeNull();
    b.button('diss-attempt-restart-discard').props.onClick();
    expect(a.state.procedureByLayer.skin.history).toEqual(attempted.history);
    expect(b.state.procedureByLayer.skin.history).toEqual([]);
  });

  it('cancels with plain Escape while modified Escape leaves the review and work intact', () => {
    const lab = fixture(); lab.button('diss-new-attempt').props.onClick();
    const review = find(lab.render(), node => node.props?.id === 'diss-attempt-restart-review');
    const preventDefault = vi.fn(), stopPropagation = vi.fn();
    review.props.onKeyDown({ key: 'Escape', ctrlKey: true, preventDefault, stopPropagation });
    expect(find(lab.render(), node => node.props?.id === 'diss-attempt-restart-review')).not.toBeNull();
    expect(preventDefault).not.toHaveBeenCalled();
    review.props.onKeyDown({ key: 'Escape', preventDefault, stopPropagation });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(find(lab.render(), node => node.props?.id === 'diss-attempt-restart-review')).toBeNull();
    expect(lab.state.procedureByLayer.skin.history).toEqual(attempted.history);
  });
});
