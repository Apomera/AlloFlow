import { beforeAll, afterEach, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let factory;
beforeAll(() => {
  new Function(readFileSync('own_sources_module.js', 'utf8'))();
  new Function(readFileSync(process.env.RESEARCH_ENGINE_SOURCE || 'content_engine_source.jsx', 'utf8'))();
  factory = window.AlloModules.createContentEngine;
});
afterEach(() => { delete window.__contentEngineState; delete window.callGemini; });
const quote = 'Warm air can hold more water vapor. Cooling causes condensation.';
const noop = () => {};
function setup({ selected = ['a'], excerpts = [{ document: 1, quote }], hits = true, documentsOnly = true } = {}) {
  const loadProject = vi.fn(async () => ({ sources: [{ id: 'a', title: 'Climate notes', active: true, version: 2 }] }));
  const retrieve = vi.fn(() => hits ? [{ node: { id: 'n1', sourceId: 'a', locatorLabel: 'page 7', content: quote } }] : []);
  window.AlloOwnSources = { ensureLumen: async () => {}, loadProject, activeSourceCount: () => 1 };
  window.LumenEvidence = { retrieve, createProjectStore: () => ({}) };
  const callGemini = vi.fn(async () => JSON.stringify({ excerpts, extra: 'Invented facts must never reach the reader' }));
  const state = {
    inputText: 'Keep my old source', gradeLevel: '5th Grade', sourceTopic: 'Clouds',
    generatedContent: { id: 'existing', data: 'Keep my adapted reading' }, currentUiLanguage: 'English',
    sourceLevel: '5th Grade', sourceLength: '250', sourceTone: 'Informative', sourceVocabulary: '',
    sourceCustomInstructions: '', studentInterests: [], targetStandards: [], selectedConcepts: [],
    includeSourceCitations: true, useOwnSources: true, documentsOnly, selectedOwnSourceIds: selected,
    setInputText: vi.fn(), setGeneratedContent: vi.fn(), setError: vi.fn(),
    setIsGeneratingSource: vi.fn(), setGenerationStep: vi.fn(), setActiveView: vi.fn(), setShowSourceGen: vi.fn(),
    recordSourceProvenance: vi.fn(), ai: { backend: 'gemini' }, alloBotRef: { current: null }
  };
  window.__contentEngineState = state;
  const engine = factory({ callGemini, t: k => k, addToast: vi.fn(), flyToElement: noop });
  return { state, engine, callGemini, loadProject, retrieve };
}
it('uses selected documents and only exact excerpts, even when web checkbox was previously on', async () => {
  const { state, engine, callGemini, loadProject } = setup();
  await engine.handleGenerateSource();
  expect(loadProject).toHaveBeenCalledWith({ selectedSourceIds: ['a'] });
  expect(callGemini).toHaveBeenCalledTimes(1);
  expect(callGemini.mock.calls[0][2]).toBe(false);
  const result = state.setInputText.mock.calls.at(-1)[0];
  expect(result).toContain(quote);
  expect(result).toContain('[Document 1](#allo-doc-');
  expect(result).not.toContain('Invented facts');
  expect(state.recordSourceProvenance.mock.calls[0][0].importMethod).toBe('documents-only');
  expect(state.recordSourceProvenance.mock.calls[0][0].researchEvidence.citedIds).toHaveLength(1);
});
it('stops on explicit empty selection without letting an older helper broaden it to all documents', async () => {
  const { state, engine, loadProject, callGemini } = setup({ selected: [] });
  await engine.handleGenerateSource();
  expect(loadProject).not.toHaveBeenCalled();
  expect(callGemini).not.toHaveBeenCalled();
  expect(state.setInputText).not.toHaveBeenCalled();
  expect(state.setError.mock.calls.at(-1)[0]).toContain('No usable passages');
});
it('rejects passages outside selected IDs even if a stale retrieval helper returns them', async () => {
  const { state, engine, callGemini } = setup({ selected: ['another-document'] });
  await engine.handleGenerateSource();
  expect(callGemini).not.toHaveBeenCalled();
  expect(state.setInputText).not.toHaveBeenCalled();
});
it('does not ask the model to fill gaps when there are no matching passages', async () => {
  const { state, engine, callGemini } = setup({ hits: false });
  await engine.handleGenerateSource();
  expect(callGemini).not.toHaveBeenCalled();
  expect(state.setInputText).not.toHaveBeenCalled();
  expect(state.setGeneratedContent).not.toHaveBeenCalled();
  expect(state.setError.mock.calls.at(-1)[0]).toContain('No usable passages');
  expect(state.setIsGeneratingSource).toHaveBeenLastCalledWith(false);
});
it('includes the standards goal when documents-only generation has no topic', async () => {
  const { state, engine, callGemini } = setup();
  state.sourceTopic = '';
  state.standardsPromptString = 'Explain condensation in the water cycle';
  await engine.handleGenerateSource();
  expect(callGemini.mock.calls[0][0]).toContain('Explain condensation in the water cycle');
  expect(state.setInputText).toHaveBeenCalled();
});
it.each([{ excerpts: [] }, { excerpts: [{ document: 1, quote: 'This was invented by the model.' }] }, { excerpts: [{ document: 2, quote }] }])('fails closed on unsupported selections %#', async ({ excerpts }) => {
  const { state, engine } = setup({ excerpts });
  await engine.handleGenerateSource();
  expect(state.setInputText).not.toHaveBeenCalled();
  expect(state.setGeneratedContent).not.toHaveBeenCalled();
  expect(state.setError.mock.calls.at(-1)[0]).toContain('No outside information was added');
});
it('preserves a local citation after the final sentence through ordinary article cleanup', async () => {
  const { state, engine, callGemini } = setup({ documentsOnly: false });
  state.includeSourceCitations = false;
  callGemini.mockResolvedValue({ text: '## Cloud formation\n\nClouds form when water vapor cools and condenses on tiny dust particles. [Your document 1]', groundingMetadata: { groundingChunks: [] } });
  await engine.handleGenerateSource();
  const result = state.setInputText.mock.calls.at(-1)?.[0] || '';
  expect(result).toContain('[Document 1](#allo-doc-');
  expect(result).toContain('1 document(s) cited');
  expect(result).not.toContain('[Your document 1]');
  expect(state.recordSourceProvenance.mock.calls.at(-1)[0].researchEvidence.citedIds).toHaveLength(1);
});
