// Own-source RAG + adapted-text citation tokens (2026-09-25).
//
// Two bugs, one chain. The source generator labelled the teacher's imported
// passages "[Source N]", the same marker the section converter turns into a
// link to web result N, and it dropped them entirely when web research came
// back empty. The adaptation step then told the model about protection tokens
// even when none had been created; the model invented ⟦ALLOFLOW_CITATION_####⟧
// tokens from plain citations, and the empty-envelope restore accepted them,
// so they reached the page.
//
// RAG_TEST_DISPATCHER / RAG_TEST_CONTENT_ENGINE point at a scratch copy of a
// module for mutation testing; normal runs load the real built modules.
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let GenDispatcher;
let createContentEngine;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  loadAlloModule(process.env.RAG_TEST_DISPATCHER || 'generate_dispatcher_module.js');
  loadAlloModule(process.env.RAG_TEST_CONTENT_ENGINE || 'content_engine_module.js');
  GenDispatcher = window.AlloModules?.GenDispatcher;
  createContentEngine = window.AlloModules?.createContentEngine;
  if (typeof GenDispatcher?.handleGenerate !== 'function') throw new Error('GenDispatcher failed to register');
  if (typeof createContentEngine !== 'function') throw new Error('createContentEngine failed to register');
});

afterEach(() => {
  delete window.__contentEngineState;
  delete window.AlloOwnSources;
  delete window.LumenEvidence;
  vi.restoreAllMocks();
});

const noop = () => {};
const TOKEN_RE = /⟦ALLOFLOW_CITATION_[^⟧]*⟧/;

// ─── Adaptation ────────────────────────────────────────────────────────────

const PLAIN_CITED_SOURCE = [
  '## The Water Cycle',
  '',
  'Tiny drops stick to dust in the air, and many drops together form clouds [Source 4]. When drops grow heavy, they fall as rain, snow, sleet, or hail [Source 5].',
  '',
  'Over 300 cubic miles of water fall as precipitation every day [Source 6].',
].join('\n');

const LINK_CITED_SOURCE = [
  '## The Water Cycle',
  '',
  'The sun heats water so it evaporates [⁽¹⁾](https://example.org/one). Vapor cools and forms clouds [⁽²⁾](https://example.org/two_(page)).',
].join('\n');

function adaptationDeps(callGemini) {
  const state = { shown: null, history: [] };
  const required = {
    gradeLevel: '5th Grade', history: [], inputText: '', differentiationRange: 'None',
    leveledTextLanguage: 'English', selectedLanguages: [], studentInterests: [], guidedMode: false, guidedStep: 0,
    standardsInput: '', targetStandards: [], standardsPromptString: '', sourceTopic: 'Water cycle',
    currentUiLanguage: 'English', generatedContent: null, audioRef: { current: null }, alloBotRef: { current: null },
    GUIDED_STEPS: [], keepCitations: true, isTeacherMode: false,
    leveledTextLength: 'Same as Source', textFormat: 'Standard Text',
    setGeneratedContent: (v) => { state.shown = typeof v === 'function' ? v(state.shown) : v; },
    setHistory: (v) => { state.history = typeof v === 'function' ? v(state.history) : v; },
    callGemini,
    cleanJson: (value) => String(value || '').trim(),
    chunkText: (s) => [String(s || '')],
    countWords: (s) => String(s || '').split(/\s+/).filter(Boolean).length,
    calculateReadability: () => ({ score: 5, gradeLevel: 5, words: 40, sentences: 4, syllables: 55 }),
    sanitizeTruncatedCitations: (s) => s,
    normalizeCitationPlacement: (s) => s,
    extractSourceTextForProcessing: (text) => ({ text, englishBlock: text, isBilingual: false }),
    getDefaultTitle: (type) => type,
    t: (k) => k, warnLog: noop, debugLog: noop, addToast: noop,
    resolveTranslationPolicy: () => ({ enabled: false, target: 'English', mode: 'auto' }),
    repairGeneratedText: async (text) => text,
    glossaryImageStyle: '', universalImageStyle: '', imageGenerationStyle: '',
  };
  const deps = new Proxy(required, { get(target, prop) { return prop in target ? target[prop] : noop; } });
  return { deps, state };
}

const segmentOf = (prompt) => {
  const m = String(prompt).match(/Text Segment: "([\s\S]*)"\s*$/);
  return m ? m[1] : null;
};

async function adapt(source, model) {
  const prompts = [];
  const callGemini = vi.fn(async (prompt) => {
    prompts.push(String(prompt));
    const seg = segmentOf(prompt);
    return seg === null ? '' : model(seg, String(prompt));
  });
  const { deps, state } = adaptationDeps(callGemini);
  const item = await GenDispatcher.handleGenerate('simplified', null, false, source, {}, true, deps);
  const adaptPrompts = prompts.filter((p) => segmentOf(p) !== null);
  return { item, shown: String(state.shown?.data || ''), adaptPrompts };
}

describe('adapted text never shows citation protection tokens', () => {
  it('does not describe protection tokens when the text has none to protect', async () => {
    // A model that does what the prompt says: when told citations are tokens,
    // it turns "[Source N]" into ⟦ALLOFLOW_CITATION_000N⟧ (the observed leak).
    const obedient = (seg, prompt) => /⟦ALLOFLOW_CITATION_####⟧/.test(prompt)
      ? seg.replace(/\[Source (\d+)\]/g, (m, n) => `⟦ALLOFLOW_CITATION_${String(n).padStart(4, '0')}⟧`)
      : seg;
    const { shown, adaptPrompts } = await adapt(PLAIN_CITED_SOURCE, obedient);
    expect(adaptPrompts.length).toBeGreaterThan(0);
    expect(adaptPrompts[0]).not.toMatch(/⟦ALLOFLOW_CITATION_####⟧/);
    expect(shown).toContain('clouds [Source 4]');
    expect(shown).not.toMatch(TOKEN_RE);
  });

  it('rejects tokens a model invents when nothing was protected, and keeps them off the page', async () => {
    const inventor = (seg) => seg.replace(/\[Source (\d+)\]/g, (m, n) => `⟦ALLOFLOW_CITATION_${String(n).padStart(4, '0')}⟧`);
    const { shown, adaptPrompts } = await adapt(PLAIN_CITED_SOURCE, inventor);
    expect(adaptPrompts.length).toBe(2); // first reply rejected, one retry, then the safe fallback
    expect(shown).not.toMatch(TOKEN_RE);
    expect(shown).toContain('[Source 4]');
  });

  it('still protects and restores real citation links through the rewrite', async () => {
    const faithful = (seg) => seg.replace('heats water', 'warms water');
    const { shown, adaptPrompts } = await adapt(LINK_CITED_SOURCE, faithful);
    expect(adaptPrompts[0]).toMatch(/⟦ALLOFLOW_CITATION_####⟧/);
    expect(adaptPrompts[0]).toContain('⟦ALLOFLOW_CITATION_0001⟧');
    expect(shown).toContain('warms water');
    expect(shown).toContain('[⁽²⁾](https://example.org/two_(page))');
    expect(shown).not.toMatch(TOKEN_RE);
  });

  it('marks an empty-envelope restore invalid when the output carries a token', () => {
    const restore = GenDispatcher.restoreProtectedAdaptationCitations;
    const envelope = { text: 'Plain text [Source 4].', citations: [], original: 'Plain text [Source 4].' };
    expect(restore(envelope, 'Plain text ⟦ALLOFLOW_CITATION_0004⟧.').valid).toBe(false);
    expect(restore(envelope, 'Plain text [Source 4].').valid).toBe(true);
  });
});

// ─── Source generation with the teacher's own documents ────────────────────

function installOwnSources({ active = 1 } = {}) {
  const project = {
    sources: active ? [{ id: 's1', title: 'Rain Unit Notes', active: true }] : [],
  };
  const lumen = {
    createProjectStore: () => ({}),
    retrieve: vi.fn(() => [{
      node: { id: 'n1', sourceId: 's1', locatorLabel: 'page 2', content: 'Clouds form when water vapor cools and condenses on tiny dust particles.' },
    }]),
  };
  const api = {
    ensureLumen: vi.fn(async () => { window.LumenEvidence = lumen; return true; }),
    loadProject: vi.fn(async () => project),
    activeSourceCount: (p) => (p && p.sources ? p.sources.filter((s) => s.active !== false).length : 0),
  };
  window.AlloOwnSources = api;
  return { api, lumen };
}

async function generateSource({ includeCitations = true, useOwnSources = true, calls = [], grounded = false } = {}) {
  const setInputText = vi.fn();
  const addToast = vi.fn();
  const callGemini = vi.fn(async (prompt, jsonMode, useSearch) => {
    const p = String(prompt);
    calls.push({ prompt: p, useSearch });
    if (/Research the following topic/.test(p)) return { text: 'too short' }; // web research found nothing usable
    if (/Write a self-contained educational article|Write the section/.test(p)) {
      return {
        text: '## How Clouds Form\n\nClouds form when vapor condenses [Your document 1]. "Clouds form when water vapor cools and condenses on tiny dust particles."' + (grounded ? ' Water vapor cools [Source 1].' : ''),
        groundingMetadata: { groundingChunks: grounded ? [{ web: { uri: 'https://weather.example.org/clouds', title: 'Cloud science' } }] : [] },
      };
    }
    return '';
  });
  window.__contentEngineState = {
    inputText: '', gradeLevel: '5th Grade', sourceTopic: 'How clouds form', generatedContent: null,
    leveledTextLanguage: 'English', selectedLanguages: [], studentInterests: [], selectedConcepts: [],
    sourceCustomInstructions: '', sourceLength: '250', sourceLevel: '5th Grade', sourceTone: 'Informative',
    sourceVocabulary: '', resourceCount: 1, targetStandards: [], dokLevel: '', selectedFont: 'Default',
    includeSourceCitations: includeCitations, useOwnSources, standardsPromptString: '',
    ai: { backend: 'gemini' }, alloBotRef: { current: null },
    setActiveView: noop, setError: noop, setGeneratedContent: noop, setGenerationStep: noop,
    setInputText, setIsGeneratingSource: noop, setShowSourceGen: noop,
  };
  const engine = createContentEngine({ callGemini, addToast, t: (k) => k, getBilingualPromptInstruction: () => '', flyToElement: noop });
  await engine.handleGenerateSource({}, true);
  const sectionCall = calls.find((c) => /Write a self-contained educational article|Write the section/.test(c.prompt));
  return { calls, addToast, sectionPrompt: sectionCall ? sectionCall.prompt : '', finalDocument: String(setInputText.mock.calls.at(-1)?.[0] || '') };
}

describe('own-source RAG in source generation', () => {
  it('loads the document engine, uses the passages even when web research comes back empty, and never labels them [Source N]', async () => {
    const { api } = installOwnSources();
    const { calls, sectionPrompt, finalDocument } = await generateSource();
    expect(api.ensureLumen).toHaveBeenCalled();
    // Web research still runs, with search on.
    expect(calls.some((c) => /Research the following topic/.test(c.prompt) && c.useSearch === true)).toBe(true);
    expect(sectionPrompt).toContain('Your document 1');
    expect(sectionPrompt).toContain('TEACHER DOCUMENTS');
    expect(sectionPrompt).not.toMatch(/\[Source 1\] Rain Unit Notes/);
    expect(finalDocument).toContain('(Rain Unit Notes, page 2)');
    expect(finalDocument).not.toContain('[Your document 1]');
    expect(finalDocument).toContain('Your sources: 1 of 1 quotation(s)');
  });

  it('adds nothing about own sources when the teacher has no active imported documents', async () => {
    installOwnSources({ active: 0 });
    const { sectionPrompt } = await generateSource();
    expect(sectionPrompt.length).toBeGreaterThan(200); // a real section prompt was built
    expect(sectionPrompt).not.toContain('TEACHER DOCUMENTS');
    expect(sectionPrompt).not.toContain('teacherSources');
  });

  it('uses own sources with web citations turned off, without demanding Google Search', async () => {
    installOwnSources();
    const { calls, sectionPrompt, finalDocument } = await generateSource({ includeCitations: false });
    expect(calls.some((c) => /Research the following topic/.test(c.prompt))).toBe(false);
    expect(sectionPrompt).toContain('Your document 1');
    expect(sectionPrompt).not.toContain('You MUST still use Google Search');
    expect(finalDocument).toContain('Your sources: 1 of 1 quotation(s)');
  });

  it('keeps document references separate from web citation numbers', async () => {
    installOwnSources();
    const { calls, finalDocument } = await generateSource({ grounded: true });
    const webPrompt = calls.find((call) => /Research the following topic/.test(call.prompt));
    expect(webPrompt.prompt).not.toContain('Rain Unit Notes');
    expect(finalDocument).toContain('(Rain Unit Notes, page 2)');
    expect(finalDocument).toContain('[⁽¹⁾](https://weather.example.org/clouds)');
    expect(finalDocument).not.toContain('[Your document');
  });

  it('does not touch the document engine when only web search is selected', async () => {
    const { api } = installOwnSources();
    const { calls, sectionPrompt } = await generateSource({ useOwnSources: false });
    expect(api.ensureLumen).not.toHaveBeenCalled();
    expect(api.loadProject).not.toHaveBeenCalled();
    expect(sectionPrompt).not.toContain('teacherSources');
    expect(calls.some((call) => /Research the following topic/.test(call.prompt) && call.useSearch)).toBe(true);
  });

  it('starts web search while documents are loading and finishes if the device store stalls', async () => {
    const { api } = installOwnSources();
    api.loadProject.mockImplementation(() => new Promise(() => {}));
    const calls = [];
    vi.useFakeTimers();
    try {
      const pending = generateSource({ calls });
      await vi.advanceTimersByTimeAsync(1);
      expect(calls.some((call) => /Research the following topic/.test(call.prompt) && call.useSearch)).toBe(true);
      await vi.advanceTimersByTimeAsync(6600);
      const result = await pending;
      expect(result.sectionPrompt).not.toContain('teacherSources');
      expect(result.finalDocument).toContain('How Clouds Form');
      expect(result.addToast).toHaveBeenCalledWith('input.my_sources_not_used', 'info');
    } finally { vi.useRealTimers(); }
  });
});
