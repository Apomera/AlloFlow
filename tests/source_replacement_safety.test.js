// A teacher pasted her own text, clicked the Source Material card's "Generate"
// (which writes a NEW passage from the Topic field, not resources from her
// text) and her text was replaced, with no warning and no visible way back.
// Since 2026-10-30 the engine never silently replaces source text:
// - a box with text is replaced only when the caller confirmed it first;
// - if the box changed while AI was writing, the result is offered for review;
// - an unconfirmed result is also offered for review, never put in;
// - every replacement keeps the previous text for Undo;
// - a request with no topic and no standard says so instead of doing nothing.
// The real engine source runs here; RESEARCH_ENGINE_SOURCE selects a saved copy
// for mutation checks.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const PASTED = 'Our town garden opened this spring. Volunteers built raised beds, and students now track how much rain falls each week.';
const PASSAGE = 'Plants use sunlight, water, and carbon dioxide to make sugar. This process is called photosynthesis, and it releases oxygen.';
let createContentEngine;

beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('own_sources_module.js');
  window.__alloUtils = {
    ...window.AlloModules.TextPipelineHelpers,
    cleanJson: (value) => String(value || '').trim(),
    safeJsonParse: (value) => { try { return JSON.parse(value); } catch (_) { return null; } },
  };
  new Function(readFileSync(process.env.RESEARCH_ENGINE_SOURCE || 'content_engine_source.jsx', 'utf8'))();
  createContentEngine = window.AlloModules.createContentEngine;
});

afterEach(() => {
  delete window.__contentEngineState;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// The provider answers every writing request with PASSAGE, optionally after `gate`.
function harness(overrides = {}, gate = null) {
  vi.useFakeTimers();
  const callGemini = vi.fn(async () => { if (gate) await gate; return PASSAGE; });
  const state = {
    inputText: PASTED, generatedContent: null, activeView: 'input', error: null,
    gradeLevel: '5th Grade', sourceTopic: 'Photosynthesis', currentUiLanguage: 'English', leveledTextLanguage: 'English',
    selectedLanguages: [], studentInterests: [], selectedConcepts: [], sourceCustomInstructions: '',
    sourceLength: '250', sourceLevel: '5th Grade', sourceTone: 'Informative', sourceVocabulary: '',
    resourceCount: 1, targetStandards: [], dokLevel: '', selectedFont: 'Default', includeSourceCitations: false,
    useOwnSources: false, documentsOnly: false, standardsPromptString: '', ai: { backend: 'gemini' }, alloBotRef: { current: null },
    showSourceGen: true, isGeneratingSource: false, generationStep: '', recordSourceProvenance: vi.fn(), sourceReplacement: null, ...overrides,
  };
  for (const key of ['activeView', 'error', 'generatedContent', 'generationStep', 'inputText', 'isGeneratingSource', 'showSourceGen', 'sourceReplacement']) {
    state['set' + key[0].toUpperCase() + key.slice(1)] = vi.fn((value) => { state[key] = typeof value === 'function' ? value(state[key]) : value; });
  }
  const addToast = vi.fn();
  const engine = createContentEngine({ callGemini, addToast, t: (key) => key, getState: () => state, flyToElement: () => {} });
  return { state, engine, callGemini, addToast };
}
async function finish(operation) { await vi.runAllTimersAsync(); await operation; }

describe('writing a new source passage never silently replaces the teacher\'s text', () => {
  it('offers the passage for review when the replacement was not confirmed', async () => {
    const h = harness();
    await finish(h.engine.handleGenerateSource({}));
    expect(h.state.inputText, 'the pasted text stays').toBe(PASTED);
    expect(h.state.sourceReplacement).toMatchObject({ status: 'review', reason: 'unconfirmed', previous: PASTED, topic: 'Photosynthesis' });
    expect(h.state.sourceReplacement.text).toContain('photosynthesis');
    expect(h.state.showSourceGen).toBe(false);
  });

  it('replaces confirmed text and keeps the previous text for Undo', async () => {
    const h = harness();
    await finish(h.engine.handleGenerateSource({ replaceConfirmed: true }));
    expect(h.state.inputText).toContain('photosynthesis');
    expect(h.state.sourceReplacement).toMatchObject({ status: 'replaced', previous: PASTED, topic: 'Photosynthesis' });
    expect(h.state.sourceReplacement.text).toBe(h.state.inputText);
  });

  it('does not overwrite edits made while AI was writing, even after confirmation', async () => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    const h = harness({}, gate);
    const pending = h.engine.handleGenerateSource({ replaceConfirmed: true });
    await vi.advanceTimersByTimeAsync(10);
    h.state.inputText = PASTED + ' Next week we will measure the soil.';
    release();
    await finish(pending);
    expect(h.state.inputText).toBe(PASTED + ' Next week we will measure the soil.');
    expect(h.state.sourceReplacement).toMatchObject({ status: 'review', reason: 'edited', previous: PASTED + ' Next week we will measure the soil.' });
  });

  it('puts a passage straight into an empty box, with nothing to undo', async () => {
    const h = harness({ inputText: '' });
    await finish(h.engine.handleGenerateSource({}));
    expect(h.state.inputText).toContain('photosynthesis');
    expect(h.state.sourceReplacement).toBeNull();
  });

  it('says what is missing instead of silently doing nothing', async () => {
    const h = harness({ sourceTopic: '' });
    await finish(h.engine.handleGenerateSource({}));
    expect(h.callGemini).not.toHaveBeenCalled();
    expect(h.state.inputText).toBe(PASTED);
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('Add a topic'), 'info');
  });

  it('keeps the text and records nothing when writing fails', async () => {
    const h = harness();
    h.callGemini.mockImplementation(async () => { throw new Error('provider down'); });
    await finish(h.engine.handleGenerateSource({ replaceConfirmed: true }));
    expect(h.state.inputText).toBe(PASTED);
    expect(h.state.sourceReplacement).toBeNull();
  });

  it('keeps the old behavior for a host that does not track replacements', async () => {
    const h = harness();
    delete h.state.setSourceReplacement;
    await finish(h.engine.handleGenerateSource({}));
    expect(h.state.inputText).toContain('photosynthesis');
  });
});
