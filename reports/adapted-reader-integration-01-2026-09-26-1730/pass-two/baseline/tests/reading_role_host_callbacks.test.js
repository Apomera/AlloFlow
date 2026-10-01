import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let Context;
const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
const start = shell.indexOf('  const handleSelectReadingSource = ');
const end = shell.indexOf('  const handleReadOriginal = ', start);
if (start < 0 || end < 0) throw new Error('Source role host handlers not found');
const source = shell.slice(start, end);
const makeHandlers = new Function('deps', `
  const {
    history, activeUnitId, isTeacherMode, setActiveUnitId, setSelectedReadingSourceId,
    addToast, setHistory, setGeneratedContent, stopPlayback, setSelectionMenu,
    setRevisionData, setPhonicsData, setIsEditingLeveledText, setIsFluencyMode,
    setIsCompareMode, setInteractionMode, setActiveView
  } = deps;
  ${source}
  return { handleSelectReadingSource, handleReadingRoleChange, openReadingArtifact };
`);
const selectionState = shell.indexOf('const [selectedReadingSourceId, setSelectedReadingSourceId]');
const effectStart = shell.indexOf('useEffect(', selectionState);
const effectEnd = shell.indexOf('  const [newUnitName', effectStart);
if (selectionState < 0 || effectStart < 0 || effectEnd < 0) throw new Error('Source selection lesson effect not found');
const makeSelectionEffect = new Function('deps', `
  const { history, activeUnitId, selectedReadingSourceId, setSelectedReadingSourceId, useEffect } = deps;
  ${shell.slice(effectStart, effectEnd)}
`);

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  Context = window.AlloModules.InstructionalContext;
});

function profile(role, form = 'original') {
  return Context.normalizeInstructionalText({
    role, form, designationSource: 'educator',
    replacementAuthorization: { authorized: role === 'primary' && form === 'adapted', source: role === 'primary' && form === 'adapted' ? 'educator' : 'none' }
  });
}
function family(id = 'source', unitId = 'unit-a') {
  const snapshot = Context.createSourceSnapshot('Exact passage\r\nSecond line.', { sourceArtifactId: id });
  const analysis = { id, type: 'analysis', title: 'Saved source', unitId, sourceFamilyId: id, data: { originalText: snapshot.text }, sourceSnapshot: snapshot, instructionalText: profile('primary') };
  const original = Context.createSupportedReading(snapshot, { id: id + '-reader', sourceFamilyId: id, unitId, instructionalText: profile('primary'), config: { grade: '6th Grade' } });
  const adapted = { id: id + '-adapted', type: 'simplified', title: 'Adapted passage', unitId, sourceFamilyId: id, data: 'Easier words.', sourceSnapshot: snapshot, sourceInstructionalText: profile('primary'), instructionalText: profile('supplemental', 'adapted'), config: { grade: '3rd Grade', instructionalText: profile('supplemental', 'adapted') } };
  return { analysis, original, adapted };
}
function harness(items, current, options = {}) {
  const state = { history: items, current, activeUnitId: options.activeUnitId || 'unit-a', selectedReadingSourceId: options.selectedReadingSourceId || '' };
  const deps = {
    isTeacherMode: options.isTeacherMode !== false,
    setActiveUnitId: vi.fn(value => { state.activeUnitId = value; }),
    setSelectedReadingSourceId: vi.fn(value => { state.selectedReadingSourceId = typeof value === 'function' ? value(state.selectedReadingSourceId) : value; }),
    setHistory: vi.fn(update => { state.history = typeof update === 'function' ? update(state.history) : update; }),
    setGeneratedContent: vi.fn(update => { state.current = typeof update === 'function' ? update(state.current) : update; }),
    addToast: vi.fn(), stopPlayback: vi.fn(), setSelectionMenu: vi.fn(), setRevisionData: vi.fn(), setPhonicsData: vi.fn(),
    setIsEditingLeveledText: vi.fn(), setIsFluencyMode: vi.fn(), setIsCompareMode: vi.fn(), setInteractionMode: vi.fn(), setActiveView: vi.fn()
  };
  const handlers = () => makeHandlers({ ...deps, history: state.history, activeUnitId: state.activeUnitId });
  const runEffect = () => makeSelectionEffect({
    ...deps, history: state.history, activeUnitId: state.activeUnitId,
    selectedReadingSourceId: state.selectedReadingSourceId, useEffect: callback => callback()
  });
  return { state, deps, handlers, runEffect };
}

describe('host source role callbacks', () => {
  it('updates history and current companion source-role metadata without changing adapted role or source text', () => {
    const a = family(), other = family('other', 'unit-b');
    const app = harness([a.analysis, a.original, a.adapted, other.original], a.adapted);
    expect(app.handlers().handleReadingRoleChange(a.analysis, 'supplemental')).toBe(true);
    expect(app.state.history.slice(0, 2).map(item => item.instructionalText.role)).toEqual(['supplemental', 'supplemental']);
    expect(app.state.history[1].config.instructionalText.role).toBe('supplemental');
    expect(app.state.history[1].data).toBe(a.original.data);
    expect(app.state.history[2].instructionalText.role).toBe('supplemental');
    expect(app.state.history[2].sourceInstructionalText.role).toBe('supplemental');
    expect(app.state.current.sourceInstructionalText.role).toBe('supplemental');
    expect(app.state.current.config.grade).toBe('3rd Grade');
    expect(app.state.current.data).toBe('Easier words.');
    expect(app.state.history[3]).toBe(other.original);
    expect(a.analysis.instructionalText.role).toBe('primary');
  });

  it('keeps an adapted main independent when changing the original/source role', () => {
    const a = family();
    a.adapted.instructionalText = profile('primary', 'adapted');
    const app = harness([a.analysis, a.original, a.adapted], a.adapted);
    app.handlers().handleReadingRoleChange(a.original, 'supplemental');
    expect(app.state.current.instructionalText.role).toBe('primary');
    expect(app.state.current.instructionalText.replacementAuthorization.authorized).toBe(true);
    expect(app.state.current.sourceInstructionalText.role).toBe('supplemental');
    expect(app.state.history[0].instructionalText.role).toBe('supplemental');
  });

  it('changes only the selected adaptation after explicit replacement confirmation', () => {
    const a = family();
    const app = harness([a.analysis, a.original, a.adapted], a.adapted);
    expect(app.handlers().handleReadingRoleChange(a.adapted, 'primary', { authorizeReplacement: true })).toBe(true);
    expect(app.state.history[0]).toBe(a.analysis);
    expect(app.state.history[1]).toBe(a.original);
    expect(app.state.current.instructionalText).toMatchObject({ role: 'primary', form: 'adapted', replacementAuthorization: { authorized: true, source: 'educator' } });
    expect(app.state.current.config.instructionalText.role).toBe('primary');
    expect(app.state.current.sourceInstructionalText.role).toBe('primary');
  });

  it('returns false without updating either state when an adaptation primary request lacks authorization', () => {
    const a = family();
    const app = harness([a.analysis, a.original, a.adapted], a.adapted);
    expect(app.handlers().handleReadingRoleChange(a.adapted, 'primary')).toBe(false);
    expect(app.deps.setHistory).not.toHaveBeenCalled();
    expect(app.deps.setGeneratedContent).not.toHaveBeenCalled();
    expect(app.state.current).toBe(a.adapted);
  });

  it('updates the current original too, and never records replacement authorization on it', () => {
    const a = family();
    const app = harness([a.analysis, a.original, a.adapted], a.original);
    expect(app.handlers().handleReadingRoleChange(a.original, 'primary', { authorizeReplacement: true })).toBe(true);
    expect(app.state.current.instructionalText.form).toBe('same-text-supported');
    expect(app.state.current.instructionalText.replacementAuthorization.authorized).toBe(false);
    expect(app.state.current.data).toBe(a.original.data);
  });

  it('does not allow student mode to change role or source selection', () => {
    const a = family();
    const app = harness([a.analysis, a.original, a.adapted], a.original, { isTeacherMode: false });
    expect(app.handlers().handleReadingRoleChange(a.original, 'supplemental')).toBe(false);
    app.handlers().handleSelectReadingSource(a.analysis);
    expect(app.deps.setHistory).not.toHaveBeenCalled();
    expect(app.deps.setSelectedReadingSourceId).not.toHaveBeenCalled();
  });
});

describe('host activity source selection scope', () => {
  it('moves to an explicitly selected passage lesson and keeps that selection through the lesson effect', () => {
    const a = family(), b = family('other', 'unit-b');
    const app = harness([a.analysis, b.analysis], a.analysis, { activeUnitId: 'unit-a' });
    app.handlers().handleSelectReadingSource(b.analysis);
    expect(app.state.activeUnitId).toBe('unit-b');
    expect(app.state.selectedReadingSourceId).toBe(b.analysis.id);
    app.runEffect();
    expect(app.state.selectedReadingSourceId).toBe(b.analysis.id);
  });

  it('switches to uncategorized when explicitly selecting a passage with no unit', () => {
    const a = family(), b = family('unassigned', null);
    const app = harness([a.analysis, b.analysis], a.analysis);
    app.handlers().handleSelectReadingSource(b.analysis);
    expect(app.state.activeUnitId).toBe('uncategorized');
    app.runEffect();
    expect(app.state.selectedReadingSourceId).toBe(b.analysis.id);
  });

  it('keeps All lessons when selecting an available passage there', () => {
    const a = family(), b = family('other', 'unit-b');
    const app = harness([a.analysis, b.analysis], a.analysis, { activeUnitId: 'all' });
    app.handlers().handleSelectReadingSource(b.analysis);
    expect(app.deps.setActiveUnitId).not.toHaveBeenCalled();
    app.runEffect();
    expect(app.state.selectedReadingSourceId).toBe(b.analysis.id);
  });

  it('clears a stale saved source choice after independently changing to another lesson', () => {
    const a = family(), b = family('other', 'unit-b');
    const app = harness([a.analysis, b.analysis], a.analysis, { activeUnitId: 'unit-a', selectedReadingSourceId: a.analysis.id });
    app.state.activeUnitId = 'unit-b';
    app.runEffect();
    expect(app.state.selectedReadingSourceId).toBe('');
  });
});
