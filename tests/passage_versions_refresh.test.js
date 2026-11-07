// Passage versions after an edit (2026-11-04). Editing the checked passage must drop its
// translated versions (they no longer match), but the teacher is told which languages
// were removed and can update them in one click (view: analysis_report_languages).
// - Host: every edit path records the removed languages in passageVersionsToRefresh.
// - Recheck: a fresh check replaces the data, so the list is carried over, minus
//   languages the fresh check already prepared (its automatic Output Language version).
// ALLO_HOST_CANDIDATE points at a mutated copy for mutation checks.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const createHostHandlers = new Function(readFileSync(process.env.ALLO_HOST_CANDIDATE || 'host_handlers_source.jsx', 'utf8') + '\nreturn createHostHandlers;')();
const TEXT = 'The Moon orbits Earth.';

const checked = (data = {}) => ({ id: 'check-1', type: 'analysis', config: { language: 'English' }, data: {
  analysisSourceVersion: 1, originalText: TEXT, rawEnglishText: TEXT, sourceLanguage: 'English', concepts: ['orbit'],
  sourceTranslations: { Spanish: 'La Luna orbita la Tierra.', Vietnamese: 'Mặt Trăng quay quanh Trái Đất.', French: ' ' }, ...data } });

function host(item) {
  const state = { history: [item], generatedContent: item, inputText: '' };
  const deps = {
    get history() { return state.history; }, get generatedContent() { return state.generatedContent; },
    setHistory: setter => { state.history = setter(state.history); },
    setGeneratedContent: setter => { state.generatedContent = typeof setter === 'function' ? setter(state.generatedContent) : setter; },
    setInputText: setter => { state.inputText = typeof setter === 'function' ? setter(state.inputText) : setter; },
    _textUndoLiveRef: { current: state }, textUndoRef: { current: { applyingInput: false } },
    _recordTextChange: vi.fn(), t: () => '', addToast: vi.fn(), warnLog: vi.fn(), gradeLevel: '3', leveledTextLanguage: 'English',
    _resourceMutationStateRef: { current: state }, _applySimplifiedTextMutation: value => value,
    onUpdateResource: (id, updater) => {
      const next = updater(state.history.find(entry => entry.id === id));
      state.history = state.history.map(entry => entry.id === id ? next : entry);
      state.generatedContent = next;
      return true;
    },
  };
  const handlers = createHostHandlers(deps);
  deps._getFreshTextComplexityEvidence = handlers._getFreshTextComplexityEvidence;
  deps._readTextDomain = handlers._readTextDomain;
  return { state, handlers };
}

describe('host: an edit removes passage versions and remembers their languages', () => {
  it('typing in the editor records the removed languages once, across keystrokes', () => {
    const h = host(checked());
    h.handlers.handleAnalysisTextChange('The Moon orbits the Earth.');
    expect(h.state.generatedContent.data).not.toHaveProperty('sourceTranslations');
    expect(h.state.generatedContent.data.passageVersionsToRefresh).toEqual(['Spanish', 'Vietnamese']);
    h.handlers.handleAnalysisTextChange('The Moon orbits the Earth once a month.');
    expect(h.state.generatedContent.data.passageVersionsToRefresh).toEqual(['Spanish', 'Vietnamese']);
  });

  it('an applied fix and an undo record them too, merged without duplicates', () => {
    const h = host(checked({ passageVersionsToRefresh: ['vietnamese', 'Arabic'] }));
    expect(h.handlers.onCorrectAnalysisText('check-1', TEXT, 'The Moon circles Earth.', [])).toBe(true);
    expect(h.state.history[0].data.passageVersionsToRefresh).toEqual(['vietnamese', 'Arabic', 'Spanish']);
    const u = host(checked());
    u.handlers._applyTextDomain({ domain: 'analysis', id: 'check-1', value: 'Restored wording.' });
    expect(u.state.history[0].data.passageVersionsToRefresh).toEqual(['Spanish', 'Vietnamese']);
  });

  it('records nothing when there were no versions', () => {
    const h = host(checked({ sourceTranslations: undefined }));
    h.handlers.handleAnalysisTextChange('Changed.');
    expect(h.state.generatedContent.data).not.toHaveProperty('passageVersionsToRefresh');
  });
});

function recheckHandler() {
  const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
  const start = shell.indexOf('const recheckSourceAnalysis = ') + 'const recheckSourceAnalysis = '.length;
  const end = shell.indexOf(';\n  const handleRestoreView', start);
  expect(end).toBeGreaterThan(start);
  return new Function('isTeacherMode', 'isProcessing', 'gradeLevel', 'dokLevel', 'handleGenerate', '_resourceMutationStateRef', 'onUpdateResource', 'return ' + shell.slice(start, end));
}

describe('Recheck keeps the list of passage versions to update', () => {
  it('carries the languages the fresh check did not prepare', async () => {
    let live = { id: 'check-1', type: 'analysis', config: {}, data: { originalText: TEXT, analysisNeedsRecheck: true, passageVersionsToRefresh: ['Spanish', 'Vietnamese'] } };
    const update = (id, updater) => { live = updater(live); return live; };
    const generate = vi.fn(async () => ({ type: 'analysis', meta: 'Standard', data: { originalText: TEXT, concepts: ['orbit'], sourceTranslations: { spanish: 'La Luna orbita la Tierra.' } } }));
    await recheckHandler()(true, false, '', '', generate, { current: { isTeacherMode: true } }, update)(live);
    expect(generate).toHaveBeenCalledOnce();
    expect(live.data.concepts).toEqual(['orbit']);
    expect(live.data.passageVersionsToRefresh).toEqual(['Vietnamese']);
    let done = { ...live, data: { originalText: TEXT, analysisNeedsRecheck: true, passageVersionsToRefresh: ['Spanish'] } };
    const finish = (id, updater) => { done = updater(done); return done; };
    await recheckHandler()(true, false, '', '', generate, { current: { isTeacherMode: true } }, finish)(done);
    expect(done.data).not.toHaveProperty('passageVersionsToRefresh');
  });
});

describe('Recheck replaces its report instead of adding another', () => {
  const EDITED = 'The Moon orbits the Earth.';
  const report = () => ({ ...checked(), levelCheck: { ok: true }, alignmentCheck: { ok: true } });
  const fresh = (text, translations) => ({ type: 'analysis', meta: 'Fresh', data: { originalText: text, concepts: ['new finding'], ...(translations ? { sourceTranslations: translations } : {}) } });
  function run(start, generate) {
    let live = start;
    const update = vi.fn((id, updater) => { const next = updater(live); if (next === live) return false; live = next; return live; });
    const h = host(start);
    globalThis._alloHostHandlers = () => h.handlers;
    const go = recheckHandler()(true, false, '', '', generate, { current: { isTeacherMode: true } }, update);
    return { go, update, get live() { return live; }, set live(value) { live = value; } };
  }

  it('moves the same report to the edited wording and lists the versions it lost', async () => {
    const start = report();
    const generate = vi.fn(async () => fresh(EDITED, { Spanish: 'La Luna orbita la Tierra otra vez.' }));
    const r = run(start, generate);
    const result = await r.go(start, { replace: true, text: EDITED, inlineFailure: true });
    expect(generate.mock.calls[0][3]).toBe(EDITED);
    expect(generate.mock.calls[0][4]).toMatchObject({ inlineFailure: true, sourceArtifactId: start.id, stayOnView: true });
    expect(generate.mock.calls[0][6]).not.toHaveProperty('resumeAnalysis');
    expect(result).toBe(r.live);
    expect(r.live.id).toBe(start.id);
    expect(r.live.data).toMatchObject({ originalText: EDITED, concepts: ['new finding'], sourceTranslations: { Spanish: 'La Luna orbita la Tierra otra vez.' }, passageVersionsToRefresh: ['Spanish', 'Vietnamese'].filter(language => language !== 'Spanish') });
    expect(r.live.data.sourceTranslations).not.toHaveProperty('Vietnamese');
    expect(r.live.data.analysisNeedsRecheck).toBeUndefined();
    expect(r.live).not.toHaveProperty('levelCheck');
    expect(r.live).not.toHaveProperty('alignmentCheck');
  });

  it('keeps passage versions when the wording did not change', async () => {
    const start = report();
    const r = run(start, vi.fn(async () => fresh(TEXT, { Spanish: 'Una traducción nueva.' })));
    await r.go(start, { replace: true, text: TEXT, inlineFailure: true });
    expect(r.live.data.concepts).toEqual(['new finding']);
    expect(r.live.data.sourceTranslations).toEqual({ ...start.data.sourceTranslations, Spanish: 'Una traducción nueva.' });
    expect(r.live.data).not.toHaveProperty('passageVersionsToRefresh');
  });

  it('leaves the old report alone and hands back the reason when the check fails', async () => {
    const start = report();
    const r = run(start, vi.fn(async () => ({ failureMessage: 'Authorization failed.' })));
    const result = await r.go(start, { replace: true, text: EDITED, inlineFailure: true });
    expect(result).toEqual({ failureMessage: 'Authorization failed.' });
    expect(r.update).not.toHaveBeenCalled();
    expect(r.live).toBe(start);
  });

  it('never overwrites a report that was edited while the check ran', async () => {
    const start = report();
    let r;
    const generate = vi.fn(async () => { r.live = { ...start, data: { ...start.data, originalText: 'A newer edit.' } }; return fresh(EDITED); });
    r = run(start, generate);
    await r.go(start, { replace: true, text: EDITED });
    expect(r.live.data.originalText).toBe('A newer edit.');
    expect(r.live.data.concepts).toEqual(['orbit']);
  });

  it('only rechecks a complete report when replacing is asked for', async () => {
    const start = report();
    const generate = vi.fn(async () => fresh(TEXT));
    await run(start, generate).go(start);
    expect(generate).not.toHaveBeenCalled();
  });

  it('a section saved partway does not block the finished report', async () => {
    const start = report();
    window.AlloModules = window.AlloModules || {};
    const before = window.AlloModules.GenerationMatrix;
    window.AlloModules.GenerationMatrix = { getSourceAnalysisCoverage: item => item?.data?.coverage || null, isIncompleteSourceAnalysis: item => item?.data?.coverage?.complete === false };
    try {
      let r;
      const generate = vi.fn(async (type, lang, loading, text, config, switchView, extra) => {
        extra.onAnalysisSectionChecked({ originalText: EDITED, concepts: ['part'], coverage: { complete: false, through: 5 } });
        expect(r.live.data.concepts).toEqual(['part']);
        return fresh(EDITED);
      });
      r = run(start, generate);
      await r.go(start, { replace: true, text: EDITED });
      expect(r.live.data.concepts).toEqual(['new finding']);
    } finally { window.AlloModules.GenerationMatrix = before; }
  });
});
