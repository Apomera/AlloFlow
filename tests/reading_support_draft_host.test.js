import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const { createSession } = require('../reader_support_drafts.js');
const host = readFileSync('AlloFlowANTI.txt', 'utf8');
function extract(start, end, name, deps) {
  const from = host.indexOf(start), to = host.indexOf(end, from);
  expect(from).toBeGreaterThan(-1); expect(to).toBeGreaterThan(from);
  return new Function('deps', 'with (deps) { ' + host.slice(from, to) + '\n; return ' + name + '; }')(deps);
}
function fixture(queued = false) {
  const session = createSession(); let dirty = true, pending;
  const defer = vi.fn(action => { pending = action; });
  const detach = session.register({ hasChanges: () => dirty, defer });
  const initial = { id: 'a', _artifactInstanceId: 'a-instance', type: 'simplified', data: 'A bird.' };
  const owner = {}, ownerRef = { current: owner };
  const display = { current: { resource: initial, view: 'simplified' } };
  const state = { resource: initial, view: 'simplified' };
  const updates = [];
  const applyContent = update => { state.resource = update(state.resource); display.current.resource = state.resource; };
  const deps = {
    useCallback: fn => fn, supportDraftSessionRef: { current: session }, requestReadingSupportTransition: run => session.request(run),
    generationViewOwnerRef: ownerRef, generationDisplayStateRef: display, ensureArtifactInstanceId: value => value,
    _setGeneratedContent: update => queued ? updates.push(update) : applyContent(update),
    _setActiveView: update => { state.view = update(state.view); display.current.view = state.view; }
  };
  deps.setGeneratedContent = extract('  const setGeneratedContent = useCallback(', '\n  //', 'setGeneratedContent', deps);
  deps.setActiveView = extract('  const setActiveView = useCallback(', '\n  const [showReadThisPage', 'setActiveView', deps);
  return { session, deps, state, initial, owner, ownerRef, defer, detach,
    discard() { dirty = false; pending.run(); }, keep() { pending.cancel(); }, clean() { dirty = false; }, flush() { updates.splice(0).forEach(applyContent); } };
}
describe('reader draft protection in real host adapters', () => {
  it('defers a generation completion as one transition and retains its display ownership', () => {
    const h = fixture(), next = { ...h.initial, id: 'generated' };
    expect(h.deps.setGeneratedContent(next, h.owner)).toBe(false);
    expect(h.deps.setActiveView('image', h.owner)).toBe(false);
    expect(h.defer).toHaveBeenCalledTimes(1); expect(h.state.resource).toBe(h.initial);
    expect(h.state.view).toBe('simplified'); expect(h.ownerRef.current).toBe(h.owner);
    h.discard(); expect(h.state).toEqual({ resource: next, view: 'image' });
  });
  it('Keep editing cancels the entire deferred host transition', () => {
    const h = fixture(); h.deps.setGeneratedContent({ ...h.initial, id: 'next' }); h.deps.setActiveView('history');
    h.keep(); expect(h.state).toEqual({ resource: h.initial, view: 'simplified' });
    h.deps.setActiveView('input'); expect(h.defer).toHaveBeenCalledTimes(2);
    h.discard(); expect(h.state.view).toBe('input');
  });
  it('rejects an obsolete generation without a draft prompt', () => {
    const h = fixture(); h.ownerRef.current = {};
    h.deps.setGeneratedContent({ ...h.initial, id: 'obsolete' }, h.owner); h.deps.setActiveView('image', h.owner);
    expect(h.defer).not.toHaveBeenCalled(); expect(h.state.resource).toBe(h.initial); expect(h.state.view).toBe('simplified');
  });
  it('rechecks generation ownership when a deferred result is released', () => {
    const h = fixture(); h.deps.setGeneratedContent({ ...h.initial, id: 'obsolete' }, h.owner); h.deps.setActiveView('image', h.owner);
    h.ownerRef.current = {}; h.discard(); expect(h.state.resource).toBe(h.initial); expect(h.state.view).toBe('simplified');
  });
  it('allows support refreshes and unrelated functional updates without confirmation', () => {
    const h = fixture(); const saved = { ...h.initial, readingSupports: { annotations: [] } };
    h.deps.setGeneratedContent(saved); h.deps.setGeneratedContent(previous => ({ ...previous, title: 'A title' }));
    h.deps.setActiveView('simplified'); expect(h.defer).not.toHaveBeenCalled(); expect(h.state.resource.title).toBe('A title');
  });
  it('guards a new instance that reuses the same artifact ID', () => {
    const h = fixture(); h.deps.setGeneratedContent({ ...h.initial, _artifactInstanceId: 'new-instance' });
    expect(h.defer).toHaveBeenCalledTimes(1); expect(h.state.resource).toBe(h.initial);
  });
  it('defers resource restoration before its side effects and preserves explicit rejection', () => {
    const h = fixture(), restore = vi.fn(() => false), clearAssignment = vi.fn();
    const prior = window.AlloModules.MiscHandlers;
    window.AlloModules.MiscHandlers = { handleRestoreView: restore };
    try {
      Object.assign(h.deps, { _alloMiscHandlersDeps: () => ({}), pendingQrAssignmentOpenGenerationRef: { current: 0 }, setPendingQrAssignmentResource: clearAssignment });
      const run = extract('  const handleRestoreView = (', '\n  learningWebRestoreViewRef', 'handleRestoreView', h.deps);
      expect(run({ id: 'new' })).toBe(false); expect(restore).not.toHaveBeenCalled(); h.keep(); expect(clearAssignment).not.toHaveBeenCalled();
      run({ id: 'new' }); h.discard(); expect(restore).toHaveBeenCalledTimes(1); expect(clearAssignment).not.toHaveBeenCalled();
    } finally { window.AlloModules.MiscHandlers = prior; }
  });
  it('opens the newly saved artifact after a deferred reader switch', () => {
    const h = fixture(), stop = vi.fn(), noop = () => {};
    const live = { current: { generatedContent: h.initial, history: [h.initial] } };
    Object.assign(h.deps, { _resourceMutationStateRef: live, stopPlayback: stop, setSelectionMenu: noop, setRevisionData: noop, setPhonicsData: noop, setIsEditingLeveledText: noop, setIsFluencyMode: noop, setIsCompareMode: noop, setInteractionMode: noop });
    const open = extract('  const openReadingArtifact = (', '\n  const handleReadOriginal', 'openReadingArtifact', h.deps);
    open(h.initial, true); expect(stop).not.toHaveBeenCalled();
    const saved = { ...h.initial, adaptedReadingSupports: { annotations: [{ text: 'Saved explanation.' }] } };
    live.current.generatedContent = saved; live.current.history = [saved]; h.deps.setGeneratedContent(saved); h.discard();
    expect(h.state.resource).toBe(saved); expect(stop).toHaveBeenCalledTimes(1);
  });
  it('does not overwrite a support save still queued in the same React batch', () => {
    const h = fixture(true), noop = () => {};
    Object.assign(h.deps, { _resourceMutationStateRef: { current: { generatedContent: h.initial, history: [h.initial] } }, stopPlayback: noop, setSelectionMenu: noop, setRevisionData: noop, setPhonicsData: noop, setIsEditingLeveledText: noop, setIsFluencyMode: noop, setIsCompareMode: noop, setInteractionMode: noop });
    const open = extract('  const openReadingArtifact = (', '\n  const handleReadOriginal', 'openReadingArtifact', h.deps);
    open(h.initial, true);
    const supports = { annotations: [{ text: 'Queued saved explanation.' }] };
    h.deps.setGeneratedContent(previous => ({ ...previous, adaptedReadingSupports: supports }));
    h.discard(); expect(h.state.resource).toBe(h.initial); h.flush();
    expect(h.state.resource.adaptedReadingSupports).toBe(supports);
  });
  it('defers the real teacher role setter and passes through when clean', () => {
    const h = fixture(), apply = vi.fn();
    Object.assign(h.deps, { teacherModeRef: { current: true }, _setIsTeacherMode: apply });
    const setRole = extract('  const setIsTeacherMode = useCallback(', '\n  const [studentAiConfigRevision', 'setIsTeacherMode', h.deps);
    setRole(false); expect(apply).not.toHaveBeenCalled(); h.keep(); expect(apply).not.toHaveBeenCalled();
    h.clean(); setRole(false); expect(apply).toHaveBeenCalledExactlyOnceWith(false);
  });
  it('retained drafts protect unload even after their controller unmounts', () => {
    const h = fixture(); h.session.records.set('a', { dirty: true }); h.detach();
    const event = { preventDefault: vi.fn(), returnValue: undefined }; h.session.protectUnload(event);
    expect(event.preventDefault).toHaveBeenCalledOnce(); expect(event.returnValue).toBe('');
    h.session.records.clear(); event.preventDefault.mockClear(); h.session.protectUnload(event); expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
