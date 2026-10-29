import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const result = find(child, predicate); if (result) return result; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

describe('dissection saved-progress load ownership', () => {
  let config;
  beforeEach(() => {
    vi.useFakeTimers(); localStorage.clear(); resetStemLab();
    config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  });
  afterEach(() => { vi.restoreAllMocks(); vi.clearAllTimers(); vi.useRealTimers(); localStorage.clear(); });
  function fixture() {
    const store = newStore({ dissection: { specimen: 'frog', activeLayer: 'skin', workspaceMode: 'advanced', toolbarToolsOpen: true, reducedMotion: true } });
    return { store, render: () => config.render(makeCtx({ toolData: store.toolData }, store)) };
  }

  it('coalesces parent renders into one specimen load', () => {
    localStorage.setItem('dissection_progress_frog', JSON.stringify({ organNotes: { 'frog|dorsal_skin': 'Stored observation' } }));
    const reads = vi.spyOn(Storage.prototype, 'getItem');
    const lab = fixture();
    lab.render(); lab.render(); lab.render();
    reads.mockClear();
    vi.advanceTimersByTime(0);
    expect(reads.mock.calls.filter(([key]) => key === 'dissection_progress_frog')).toHaveLength(1);
    expect(lab.store.toolData.dissection.organNotes['frog|dorsal_skin']).toBe('Stored observation');
  });

  it('does not overwrite newer same-specimen work after it is already loaded', () => {
    localStorage.setItem('dissection_progress_frog', JSON.stringify({ organNotes: { 'frog|dorsal_skin': 'Old stored observation' } }));
    const lab = fixture(); lab.render();
    Object.assign(lab.store.toolData.dissection, { _dissLoadedSpec: 'frog', organNotes: { 'frog|dorsal_skin': 'New observation' } });
    lab.render();
    vi.advanceTimersByTime(0);
    expect(lab.store.toolData.dissection.organNotes['frog|dorsal_skin']).toBe('New observation');
  });

  it('cancels initial hydration when reset is confirmed and retains work entered after reset', () => {
    localStorage.setItem('dissection_progress_frog', JSON.stringify({ organNotes: { 'frog|dorsal_skin': 'Before reset' } }));
    const lab = fixture();
    const tree = lab.render();
    find(tree, node => node.props?.id === 'diss-reset-specimen').props.onClick();
    const pendingTree = lab.render();
    find(pendingTree, node => node.props?.id === 'diss-reset-confirm').props.onClick();
    expect(lab.store.toolData.dissection._dissLoadedSpec).toBe('frog');
    lab.store.toolData.dissection.organNotes = { 'frog|dorsal_skin': 'After reset' };
    lab.render();
    vi.advanceTimersByTime(150);
    expect(lab.store.toolData.dissection.organNotes['frog|dorsal_skin']).toBe('After reset');
    expect(JSON.parse(localStorage.getItem('dissection_progress_frog')).organNotes['frog|dorsal_skin']).toBe('After reset');
  });

  it('releases an unmounted lab load without canceling a sibling lab', async () => {
    const a = fixture(), b = fixture();
    const treeA = a.render(); b.render();
    const rootA = find(treeA, node => node.props?.['data-dissection-root']);
    const host = document.createElement('div');
    host.setAttribute('data-dissection-save-owner', rootA.props['data-dissection-save-owner']);
    document.body.appendChild(host);
    rootA.ref(host);
    host.remove(); rootA.ref(null);
    await Promise.resolve();
    vi.advanceTimersByTime(0);
    expect(a.store.toolData.dissection._dissLoadedSpec).toBeUndefined();
    expect(b.store.toolData.dissection._dissLoadedSpec).toBe('frog');
  });
});
