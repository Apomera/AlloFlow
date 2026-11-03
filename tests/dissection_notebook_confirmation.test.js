import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const result = find(child, predicate); if (result) return result; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
const frames = [0, 1].map(id => ({ id, image: 'data:image/png;base64,' + (id ? 'Yg==' : 'YQ=='), layer: 'skin', layerName: 'Skin', view: 'dorsal' }));
const note = { 'frog|dorsal_skin': 'Keep this observation.' };
let config;
function fixture(patch = {}) {
  const store = newStore({ dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin',
    workspaceMode: 'advanced', reducedMotion: true, evidenceNotebookOpen: true,
    visualEvidence: structuredClone(frames), referenceEvidenceId: 0, splitComparison: true, organNotes: { ...note }, ...patch } });
  const token = {}, announce = vi.fn();
  const lab = { store, announce, get state() { return store.toolData.dissection; },
    render() { return config.render(makeCtx({ toolData: store.toolData, pluginInstanceToken: token, announceToSR: announce }, store)); },
    button(id, tree = this.render()) { const node = find(tree, node => node.type === 'button' && node.props.id === id); expect(node, id).not.toBeNull(); return node; },
    cancel(kind, tree = this.render()) {
      const group = find(tree, node => node.props?.id === (kind === 'clear' ? 'diss-evidence-clear-confirmation' : undefined)
        && (kind === 'clear' || node.props?.className === 'diss-evidence__actions')
        && find(node.props.children, item => item.type === 'button' && item.props.children === 'Cancel'));
      expect(group).not.toBeNull(); return find(group, node => node.type === 'button' && node.props.children === 'Cancel');
    },
    open(kind = 'remove') {
      this.button(kind === 'clear' ? 'diss-evidence-clear-all' : 'diss-evidence-remove-0').props.onClick();
      const tree = this.render();
      return { confirm: this.button(kind === 'clear' ? 'diss-evidence-confirm-clear' : 'diss-evidence-confirm-remove-0', tree), cancel: this.cancel(kind, tree) };
    },
  };
  return lab;
}
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); resetStemLab(); config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection'); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); });

describe('notebook confirmation ownership', () => {
  it.each(['remove', 'clear'])('does not execute an old %s confirmation after cancel', kind => {
    const lab = fixture(), before = structuredClone(lab.state.visualEvidence), review = lab.open(kind);
    review.cancel.props.onClick();
    review.confirm.props.onClick();
    expect(lab.state.visualEvidence).toEqual(before);
    expect(lab.state.organNotes).toEqual(note);
    expect(lab.state.procedureFeedback.message).toContain('canceled');
  });

  it.each(['remove', 'clear'])('keeps a reopened %s review usable after its canceled callbacks fire', kind => {
    const lab = fixture(), old = lab.open(kind);
    old.cancel.props.onClick(); const fresh = lab.open(kind);
    const before = structuredClone(lab.state);
    old.confirm.props.onClick(); old.cancel.props.onClick();
    expect(lab.state).toEqual(before);
    fresh.confirm.props.onClick();
    expect(lab.state.visualEvidence.map(frame => frame.id)).toEqual(kind === 'clear' ? [] : [1]);
    expect(lab.state.organNotes).toEqual(note);
  });

  it.each(['remove', 'clear'])('consumes an accepted %s review once', kind => {
    const lab = fixture(), review = lab.open(kind);
    review.confirm.props.onClick(); const after = structuredClone(lab.state);
    vi.advanceTimersByTime(5); review.confirm.props.onClick(); review.cancel.props.onClick();
    expect(lab.state).toEqual(after);
    expect(lab.state.referenceEvidenceId).toBe(kind === 'clear' ? null : 1);
    expect(lab.state.splitComparison).toBe(kind !== 'clear');
  });

  it.each([
    { specimen: 'pig', _dissLoadedSpec: 'pig', visualEvidence: [frames[1]] },
    { activeLayer: 'muscle', revealedLayers: { skin: true } },
    { quizMode: true }, { practicalMode: true, practicalEndsAt: Date.now() + 600000 },
    { referenceEvidenceId: 1 },
    { visualEvidence: frames.concat([{ ...frames[1], id: 2 }]) },
    { visualEvidence: [{ ...frames[0], image: 'data:image/png;base64,Yw==' }, frames[1]] },
  ])('rejects retained confirmation after context changes: %j', patch => {
    const lab = fixture(), review = lab.open();
    Object.assign(lab.state, structuredClone(patch)); lab.render();
    const before = structuredClone(lab.state);
    review.confirm.props.onClick(); review.cancel.props.onClick();
    expect(lab.state).toEqual(before);
  });

  it('does not overwrite a frame added before the next render commits', () => {
    const lab = fixture(), review = lab.open('clear');
    lab.state.visualEvidence.push({ ...frames[1], id: 2 });
    const before = structuredClone(lab.state.visualEvidence), feedback = lab.state.procedureFeedback;
    review.confirm.props.onClick();
    expect(lab.state.visualEvidence).toEqual(before);
    expect(lab.state.procedureFeedback).toEqual(feedback);
  });

  it('keeps confirmations independent for separate lab owners', () => {
    const a = fixture(), b = fixture(), first = a.open(), second = b.open('clear');
    first.cancel.props.onClick(); second.confirm.props.onClick(); first.confirm.props.onClick();
    expect(a.state.visualEvidence).toEqual(frames); expect(b.state.visualEvidence).toEqual([]);
    expect(a.state.organNotes).toEqual(note); expect(b.state.organNotes).toEqual(note);
  });

  it('persists only the explicitly accepted removal', () => {
    const lab = fixture(), review = lab.open(); review.confirm.props.onClick();
    lab.render(); vi.advanceTimersByTime(150);
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved.visualEvidence.map(frame => frame.id)).toEqual([1]); expect(saved.organNotes).toEqual(note);
  });
});
