import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let Context;
const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
const handlerStart = shell.indexOf('  const openReadingArtifact = ');
const handlerEnd = shell.indexOf('  const handleCreateAdaptedCompanion = ', handlerStart);
if (handlerStart < 0 || handlerEnd < 0) throw new Error('Original reader handlers could not be found');
const handlerSource = shell.slice(handlerStart, handlerEnd);
const buildHandlers = new Function('deps', `
  const {
    history, inputText, sourceTopic, gradeLevel, leveledTextLanguage, activeUnitId, selectedReadingSourceId,
    stopPlayback, setSelectionMenu, setRevisionData, setPhonicsData,
    setIsEditingLeveledText, setIsFluencyMode, setIsCompareMode, setInteractionMode,
    setGeneratedContent, setActiveView, setHistory, addToast, callGemini, handleGenerate
  } = deps;
  ${handlerSource}
  return { handleReadOriginal, openReadingArtifact };
`);

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  Context = window.AlloModules.InstructionalContext;
});

function readerHarness(options = {}) {
  const state = { history: options.history || [], opened: null, view: '' };
  const deps = {
    inputText: '', sourceTopic: 'Current lesson', gradeLevel: '5th Grade',
    leveledTextLanguage: 'English', activeUnitId: 'all', selectedReadingSourceId: '', ...options,
    stopPlayback: vi.fn(), setSelectionMenu: vi.fn(), setRevisionData: vi.fn(), setPhonicsData: vi.fn(),
    setIsEditingLeveledText: vi.fn(), setIsFluencyMode: vi.fn(), setIsCompareMode: vi.fn(),
    setInteractionMode: vi.fn(), addToast: vi.fn(), callGemini: vi.fn(), handleGenerate: vi.fn(),
    setGeneratedContent: vi.fn(item => { state.opened = item; }),
    setActiveView: vi.fn(view => { state.view = view; }),
    setHistory: vi.fn(update => { state.history = update(state.history); })
  };
  const open = selected => buildHandlers({ ...deps, history: state.history }).handleReadOriginal(selected);
  return { state, deps, open };
}

describe('open original reader source selection', () => {
  it('opens the selected analysis current saved text after an edit, keeping old companion snapshots intact', () => {
    const oldSnapshot = Context.createSourceSnapshot('Earlier source\r\nKeep the line break.', {
      sourceArtifactId: 'analysis-1', capturedAt: '2026-09-18T12:00:00.000Z', selection: 'input'
    });
    const analysis = {
      id: 'analysis-1', type: 'analysis', title: 'Saved lesson', unitId: 'unit-source',
      data: { originalText: 'Revised source\r\n[Stage direction.]' },
      config: { language: 'English', grade: '7th Grade' }, sourceSnapshot: oldSnapshot
    };
    const companion = {
      id: 'adapted-1', type: 'simplified', data: 'Earlier accessible version.',
      sourceSnapshot: oldSnapshot, instructionalText: { role: 'supplemental', form: 'adapted' }
    };
    const harness = readerHarness({ history: [analysis, companion], inputText: 'Unrelated input', activeUnitId: 'different-unit' });
    harness.open(analysis);
    expect(harness.state.opened.data).toBe(analysis.data.originalText);
    expect(harness.state.opened.sourceSnapshot).toMatchObject({
      text: analysis.data.originalText, sourceArtifactId: 'analysis-1', provenance: { selection: 'saved-analysis' }
    });
    expect(harness.state.opened.sourceSnapshot.fingerprint).not.toBe(oldSnapshot.fingerprint);
    expect(harness.state.opened.unitId).toBe('unit-source');
    expect(harness.state.opened.config.grade).toBe('7th Grade');
    expect(Context.isSupportedOriginal(harness.state.opened)).toBe(true);
    expect(companion.sourceSnapshot).toBe(oldSnapshot);
    expect(analysis.sourceSnapshot).toBe(oldSnapshot);
    expect(oldSnapshot.text).toBe('Earlier source\r\nKeep the line break.');
    expect(harness.deps.callGemini).not.toHaveBeenCalled();
    expect(harness.deps.handleGenerate).not.toHaveBeenCalled();
  });

  it('retains an unchanged selected analysis snapshot without recapturing its timestamp', () => {
    const snapshot = Context.createSourceSnapshot('Saved exact source', {
      sourceArtifactId: 'analysis', capturedAt: '2026-09-17T12:00:00.000Z', selection: 'input'
    });
    const analysis = { id: 'analysis', type: 'analysis', data: { originalText: snapshot.text }, sourceSnapshot: snapshot };
    const harness = readerHarness({ history: [analysis] });
    harness.open(analysis);
    expect(harness.state.opened.sourceSnapshot).toEqual(snapshot);
  });

  it('uses explicitly selected current input ahead of unrelated analysis history and opens without AI', () => {
    const analysis = { id: 'unrelated', type: 'analysis', data: { originalText: 'Unrelated saved source' } };
    const text = '42\r\n  Macbeth\r\n[Thunder.]  ';
    const harness = readerHarness({ history: [analysis], inputText: text, activeUnitId: 'unit-current', selectedReadingSourceId: '__input__' });
    harness.open();
    expect(harness.state.opened.data).toBe(text);
    expect(harness.state.opened.sourceSnapshot.sourceArtifactId).toBeNull();
    expect(harness.state.opened.sourceSnapshot.provenance.selection).toBe('explicit-input');
    expect(harness.state.opened.unitId).toBe('unit-current');
    expect(harness.state.opened.timestamp).toBeInstanceOf(Date);
    expect(harness.state.view).toBe('simplified');
    expect(harness.deps.callGemini).not.toHaveBeenCalled();
    expect(harness.deps.handleGenerate).not.toHaveBeenCalled();
    expect(harness.deps.addToast).not.toHaveBeenCalled();
  });

  it('uses the explicitly selected saved analysis current text when multiple readings exist', () => {
    const older = { id: 'old', type: 'analysis', data: { originalText: 'Older source' } };
    const latest = {
      id: 'latest', type: 'analysis', data: { originalText: 'Latest revised source' },
      sourceSnapshot: Context.createSourceSnapshot('Previous version', { sourceArtifactId: 'latest' })
    };
    const harness = readerHarness({ history: [older, latest], inputText: '  ', selectedReadingSourceId: 'latest' });
    harness.open();
    expect(harness.state.opened.data).toBe('Latest revised source');
    expect(harness.state.opened.sourceSnapshot.sourceArtifactId).toBe('latest');
    expect(harness.state.opened.sourceSnapshot.provenance.selection).toBe('saved-analysis');
  });

  it('opens an adaptation captured source even after its linked analysis has changed', () => {
    const snapshot = Context.createSourceSnapshot('Original at adaptation time', { sourceArtifactId: 'analysis' });
    const savedOriginal = Context.createSupportedReading(snapshot, { id: 'saved-original' });
    const analysis = { id: 'analysis', type: 'analysis', data: { originalText: 'Much newer revision' } };
    const companion = { id: 'adapted', type: 'simplified', data: 'Easier words', sourceSnapshot: snapshot, instructionalText: { form: 'adapted' } };
    const harness = readerHarness({ history: [savedOriginal, analysis, companion], inputText: 'Different current input' });
    harness.open(companion);
    expect(harness.state.opened).toBe(savedOriginal);
    expect(harness.state.opened.data).toBe('Original at adaptation time');
    expect(harness.state.history).toHaveLength(3);
    expect(harness.deps.setHistory).not.toHaveBeenCalled();
  });

  it('rejects a legacy adaptation without a captured source rather than using ambient input/history', () => {
    const legacy = { id: 'legacy', type: 'simplified', data: 'Legacy adaptation' };
    const analysis = { id: 'unrelated', type: 'analysis', data: { originalText: 'Wrong source' } };
    const harness = readerHarness({ history: [analysis, legacy], inputText: 'Also wrong' });
    harness.open(legacy);
    expect(harness.state.opened).toBeNull();
    expect(harness.deps.addToast).toHaveBeenCalledWith(expect.stringContaining('Original not captured'), 'info');
    expect(harness.deps.setHistory).not.toHaveBeenCalled();
  });

  it('does not resurrect a prior snapshot when the selected analysis saved text has been cleared', () => {
    const analysis = {
      id: 'analysis', type: 'analysis', data: { originalText: '' },
      sourceSnapshot: Context.createSourceSnapshot('Before deletion', { sourceArtifactId: 'analysis' })
    };
    const harness = readerHarness({ history: [analysis], inputText: 'Unrelated input' });
    harness.open(analysis);
    expect(harness.state.opened).toBeNull();
    expect(harness.deps.addToast).toHaveBeenCalledWith('Add a source passage first.', 'info');
    expect(harness.state.history).toHaveLength(1);
  });

  it.each(['all', 'uncategorized'])('keeps a new input reading uncategorized from %s and resets conflicting modes', activeUnitId => {
    const harness = readerHarness({ inputText: 'Source', activeUnitId });
    harness.open();
    expect(harness.state.opened.unitId).toBeNull();
    expect(harness.deps.stopPlayback).toHaveBeenCalledOnce();
    expect(harness.deps.setIsEditingLeveledText).toHaveBeenCalledWith(false);
    expect(harness.deps.setIsFluencyMode).toHaveBeenCalledWith(false);
    expect(harness.deps.setIsCompareMode).toHaveBeenCalledWith(false);
    expect(harness.deps.setInteractionMode).toHaveBeenCalledWith('read');
    expect(harness.deps.setSelectionMenu).toHaveBeenCalledWith(null);
    expect(harness.deps.setRevisionData).toHaveBeenCalledWith(null);
    expect(harness.deps.setPhonicsData).toHaveBeenCalledWith(null);
  });

  it('reopening the same exact input uses its existing supported original', () => {
    const harness = readerHarness({ inputText: 'Same exact text' });
    harness.open();
    const original = harness.state.opened;
    harness.open();
    expect(harness.state.opened).toBe(original);
    expect(harness.state.history).toHaveLength(1);
  });
});


describe('original reader instructional role and lesson scope', () => {
  it('inherits an explicitly supporting analysis role', () => {
    const source = { id: 'supporting-source', type: 'analysis', unitId: 'lesson-a', data: { originalText: 'A supporting reference.' }, instructionalText: { role: 'supplemental', form: 'original', designationSource: 'educator' } };
    const harness = readerHarness({ history: [source], activeUnitId: 'lesson-a' });
    harness.open(source);
    expect(harness.state.opened.instructionalText).toMatchObject({ role: 'supplemental', form: 'same-text-supported', designationSource: 'educator' });
    expect(harness.state.opened.sourceInstructionalText.role).toBe('supplemental');
  });
  it('does not reuse the same excerpt from a different lesson', () => {
    const snapshot = Context.createSourceSnapshot('The same excerpt.', { sourceArtifactId: 'source-a' });
    const existing = Context.createSupportedReading(snapshot, { id: 'reader-a', unitId: 'lesson-a' });
    const source = { id: 'source-b', type: 'analysis', unitId: 'lesson-b', data: { originalText: snapshot.text }, instructionalText: { role: 'supplemental', form: 'original', designationSource: 'educator' } };
    const harness = readerHarness({ history: [existing, source], activeUnitId: 'lesson-b' });
    harness.open(source);
    expect(harness.state.opened.id).not.toBe(existing.id);
    expect(harness.state.opened.unitId).toBe('lesson-b');
    expect(harness.state.opened.instructionalText.role).toBe('supplemental');
    expect(existing.instructionalText.role).toBe('primary');
  });
  it('asks for a source choice rather than selecting the latest of several main readings', () => {
    const sources = ['first', 'second'].map(id => ({ id, type: 'analysis', data: { originalText: id + ' text' } }));
    const harness = readerHarness({ history: sources });
    harness.open();
    expect(harness.state.opened).toBeNull();
    expect(harness.deps.addToast).toHaveBeenCalledWith(expect.stringContaining('Choose a passage'), 'info');
  });
  it('analyzing an adaptation does not relabel its rewritten text as the original', () => {
    const snapshot = Context.createSourceSnapshot('The actual original.', { sourceArtifactId: 'root-source' });
    const analysis = { id: 'adapted-analysis', type: 'analysis', data: { originalText: 'The rewritten text that was analyzed.' }, sourceSnapshot: snapshot, instructionalText: { form: 'adapted', role: 'supplemental' } };
    const harness = readerHarness({ history: [analysis] });
    harness.open(analysis);
    expect(harness.state.opened.data).toBe(snapshot.text);
    expect(harness.state.opened.data).not.toBe(analysis.data.originalText);
  });
});
