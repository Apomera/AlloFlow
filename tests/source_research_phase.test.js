// Exercise the real source panel and engine together, without stale generated
// modules or a network/AI provider. Compilation stays in memory: no build files.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const noop = () => {};
const BRIEF = 'RESEARCH_SENTINEL: Water vapor cools and condenses on tiny particles. Many small droplets gather to form visible clouds, and heavier drops can fall as rain.';
const ARTICLE = '## Clouds\n\nWater vapor cools and condenses. Small droplets form clouds, and heavy drops fall as rain [Source 1].';
const metadata = { groundingChunks: [{ web: { uri: 'https://science.example.edu/clouds', title: 'Cloud science' } }] };
const groundedBrief = (text = BRIEF) => ({ text, groundingMetadata: metadata });
const t = key => ({ 'status_steps.researching_topic': 'Researching the topic', 'input.writing': 'Writing the reading', 'input.generate': 'Generate source' })[key] || key;
let createContentEngine, SourceGenPanel, mountedRoot, host;

beforeAll(() => {
  window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('text_pipeline_helpers_module.js');
  window.__alloUtils = { ...window.AlloModules.TextPipelineHelpers, cleanJson: value => String(value || '').trim(), safeJsonParse: value => { try { return JSON.parse(value); } catch (_) { return null; } } };
  loadAlloModule('ai_backend_module.js');
  new Function(readFileSync('content_engine_source.jsx', 'utf8'))();
  createContentEngine = window.AlloModules.createContentEngine;
  const icons = ['ArrowRight', 'Brain', 'Check', 'CheckCircle', 'CheckCircle2', 'Clock', 'Download', 'FileText', 'Globe', 'GripVertical', 'Layers', 'Layout', 'Lightbulb', 'Mic', 'Pencil', 'Plus', 'RefreshCw', 'Search', 'Settings', 'Sparkles', 'StopCircle', 'Upload', 'UserCheck', 'Users', 'X'];
  const compiled = transformSync(readFileSync('view_misc_panels_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  SourceGenPanel = new Function('React', ...icons,
    'var {useState,useEffect,useRef,useMemo,useCallback,useContext,Fragment}=React;\n' + compiled + '\nreturn SourceGenPanel;')
    (React, ...icons.map(() => () => null));
});

afterEach(() => {
  if (mountedRoot) act(() => mountedRoot.unmount());
  mountedRoot = null;
  host?.remove(); host = null;
  delete window.AlloOwnSources;
  delete window.LumenEvidence;
  delete window.callGemini;
  delete window.__contentEngineState;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function deferred() {
  let resolvePromise;
  return { promise: new Promise(resolve => { resolvePromise = resolve; }), resolve: value => resolvePromise(value) };
}

function ownDocuments(count, content = 'Imported notes describe small cloud droplets.') {
  const sources = count ? [{ id: 'notes', title: 'Cloud field notes', active: true }] : [];
  window.LumenEvidence = {
    createProjectStore: () => ({}),
    retrieve: vi.fn(() => count ? [{ node: { id: 'clouds', sourceId: 'notes', locatorLabel: 'page 1', content } }] : []),
  };
  window.AlloOwnSources = {
    available: () => true, acceptAttribute: () => '.txt', ensureLumen: async () => true,
    loadProject: async () => ({ sources }), countSources: async () => count,
    listSources: async () => sources, activeSourceCount: () => count,
  };
}

function provider(research) {
  const researchCalls = [], articleCalls = [];
  const callGemini = vi.fn(async (prompt, jsonMode, useSearch) => {
    if (/Research the following topic/.test(String(prompt))) {
      researchCalls.push({ prompt, useSearch });
      return research(researchCalls.length);
    }
    if (/Write a self-contained educational article|Write the section/.test(String(prompt))) {
      articleCalls.push({ prompt, useSearch });
      return { text: ARTICLE, groundingMetadata: metadata };
    }
    throw new Error('Unexpected AI request in research-phase fixture: ' + String(prompt).slice(0, 120));
  });
  return { callGemini, researchCalls, articleCalls };
}

// Keep the real public-query policy and result/grounding construction. Only the
// outbound search transport is replaced; a missing explicit query therefore
// hits the same policy rejection as the Canvas search bridge in production.
function publicSearchChain() {
  const web = Object.create(window.WebSearchProvider);
  const transport = vi.fn(async () => [{
    title: 'Photosynthesis reference', url: 'https://science.example.edu/photosynthesis',
    snippet: 'Plants convert light energy into chemical energy through photosynthesis.',
  }]);
  Object.defineProperties(web, {
    _isCanvas: { value: true },
    _serperProxyUrl: { value: '/mock-public-search' },
    _serperAvailable: { value: true },
    _initSearchProxy: { value: noop },
    _serperDirectKey: { value: () => '' },
    _fetchSerper: { value: transport },
  });
  const search = vi.spyOn(web, 'search');
  const calls = [];
  const callGemini = vi.fn(async (prompt, jsonMode, useSearch, temperature, searchQuery) => {
    const phase = /Research the following topic/.test(prompt) ? 'research'
      : /Write a self-contained educational article|Write the section/.test(prompt) ? 'article' : 'unexpected';
    calls.push({ phase, prompt, useSearch, searchQuery });
    if (phase === 'unexpected') throw new Error('Unexpected provider call in public-search fixture');
    const result = useSearch ? await web.search(prompt, 10, searchQuery) : null;
    if (useSearch && !result?.groundingMetadata?.groundingChunks?.length) throw new Error('Canvas search returned no attributable sources');
    return { text: phase === 'research' ? BRIEF : ARTICLE, groundingMetadata: result?.groundingMetadata || null };
  });
  return { web, search, transport, calls, callGemini };
}

function harness(aiProvider, overrides = {}) {
  vi.useFakeTimers();
  const state = {
    inputText: '', gradeLevel: '5th Grade', sourceTopic: 'How clouds form', generatedContent: null,
    currentUiLanguage: 'English', leveledTextLanguage: 'English', selectedLanguages: [], studentInterests: [], selectedConcepts: [],
    sourceCustomInstructions: '', sourceLength: '250', sourceLevel: '5th Grade', sourceTone: 'Informative', sourceVocabulary: '',
    resourceCount: 1, targetStandards: [], dokLevel: '', selectedFont: 'Default', includeSourceCitations: true,
    useOwnSources: false, standardsPromptString: '', ai: { backend: 'gemini' }, alloBotRef: { current: null },
    showSourceGen: true, isGeneratingSource: false, generationStep: '', ...overrides,
  };
  let onChange = noop;
  for (const key of ['activeView', 'error', 'generatedContent', 'generationStep', 'inputText', 'isGeneratingSource', 'showSourceGen']) {
    state['set' + key[0].toUpperCase() + key.slice(1)] = vi.fn(value => {
      state[key] = typeof value === 'function' ? value(state[key]) : value;
      onChange();
    });
  }
  const engine = createContentEngine({ callGemini: aiProvider.callGemini, addToast: vi.fn(), t, getState: () => state, flyToElement: noop });
  return { state, engine, subscribe: callback => { onChange = callback; } };
}

async function finish(operation) {
  await vi.runAllTimersAsync();
  await operation;
}

async function mountPanel(h) {
  ownDocuments(0);
  host = document.createElement('div'); document.body.appendChild(host);
  mountedRoot = createRoot(host);
  let operation;
  function App() {
    const [, refresh] = React.useReducer(value => value + 1, 0);
    h.subscribe(refresh);
    return React.createElement(SourceGenPanel, {
      ...h.state, t, addToast: noop, aiStandardQuery: '', aiStandardRegion: '', standardMode: 'manual',
      standardInputValue: '', suggestedStandards: [], isFindingStandards: false, isIndependentMode: false,
      handleAddStandard: noop, handleFindStandards: noop, handleRemoveStandard: noop,
      handleSetStandardModeToAi: noop, handleSetStandardModeToManual: noop,
      setAiStandardQuery: noop, setAiStandardRegion: noop, setIncludeSourceCitations: noop,
      setSourceCustomInstructions: noop, setSourceLength: noop, setSourceLevel: noop, setSourceTone: noop,
      setSourceTopic: h.state.setSourceTopic || noop, setSourceVocabulary: noop, setStandardInputValue: noop, setTargetStandards: noop, setUseOwnSources: noop,
      handleGenerateSource: () => { operation = h.engine.handleGenerateSource({}, false); },
    });
  }
  await act(async () => { mountedRoot.render(React.createElement(App)); });
  return () => operation;
}

describe('Generate Source preserves the research phase', () => {
  it.each(['gemini', 'localai', 'ollama', 'openai', 'claude', 'custom'])('explains rejected public topics before %s search or generation starts', async backend => {
    const ai = publicSearchChain();
    const generateText = vi.fn();
    const h = harness(ai, {
      sourceTopic: 'How clouds form', inputText: 'Existing source',
      generatedContent: { text: 'Existing adaptation' }, activeView: 'output',
      ai: { backend, generateText }, webSearchProvider: ai.web,
    });
    await finish(h.engine.handleGenerateSource());
    expect(h.state.error).toMatch(/supported public topic/i);
    expect(h.state.error).toContain('Supported web-search topics');
    expect(ai.callGemini).not.toHaveBeenCalled();
    expect(ai.transport).not.toHaveBeenCalled();
    expect(generateText).not.toHaveBeenCalled();
    expect(h.state.inputText).toBe('Existing source');
    expect(h.state.generatedContent).toEqual({ text: 'Existing adaptation' });
    expect(h.state.activeView).toBe('output');
    expect(h.state.isGeneratingSource).toBe(false);
  });

  it('leaves native Gemini research available for topics outside the bridge list', async () => {
    const ai = provider(() => groundedBrief());
    const h = harness(ai, { sourceTopic: 'How clouds form', webSearchProvider: window.WebSearchProvider });
    await finish(h.engine.handleGenerateSource());
    expect(h.state.error).toBeNull();
    expect(ai.researchCalls).toHaveLength(1);
    expect(ai.articleCalls.length).toBeGreaterThan(0);
  });

  it('offers the real supported topics and changes only the selected topic', async () => {
    const ai = provider(() => groundedBrief());
    const h = harness(ai);
    h.state.setSourceTopic = vi.fn();
    await mountPanel(h);
    const select = host.querySelector('#sourceWebTopic');
    expect(select).not.toBeNull();
    expect([...select.options].slice(1).map(option => option.value)).toEqual(window.WebSearchProvider.publicSearchQuery.topics);
    await act(async () => {
      select.value = 'water cycle';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(h.state.setSourceTopic).toHaveBeenCalledWith('water cycle');
    expect(ai.callGemini).not.toHaveBeenCalled();
  });

  it('shows real research progress in the panel and waits before writing', async () => {
    const research = deferred();
    const ai = provider(() => research.promise);
    const h = harness(ai);
    const operation = await mountPanel(h);
    const button = host.querySelector('[data-help-key="source_generate_button"]');
    await act(async () => { button.click(); });
    try {
      expect(ai.researchCalls).toHaveLength(1);
      expect(ai.researchCalls[0].useSearch).toBe(true);
      expect(ai.articleCalls).toHaveLength(0);
      expect(h.state.generationStep).toBe('Researching the topic');
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(host.textContent).toContain('Researching the topic');
      expect(button.textContent).not.toContain('Writing the reading');
    } finally {
      await act(async () => { research.resolve(groundedBrief()); await finish(operation()); });
    }
    expect(ai.articleCalls.length).toBeGreaterThan(0);
    expect(ai.articleCalls[0].prompt).toContain('RESEARCH_SENTINEL');
  });

  it.each([
    ['own sources off', false, 1], ['own sources on', true, 1], ['no imported documents', true, 0],
  ])('still performs web research with %s', async (_label, useOwnSources, count) => {
    ownDocuments(count);
    const research = deferred();
    const ai = provider(() => research.promise);
    const h = harness(ai, { useOwnSources });
    const operation = h.engine.handleGenerateSource({}, false);
    expect(ai.researchCalls).toHaveLength(1);
    expect(ai.researchCalls[0].useSearch).toBe(true);
    expect(ai.articleCalls).toHaveLength(0);
    research.resolve(groundedBrief());
    await finish(operation);
    expect(ai.articleCalls[0].prompt).toContain('RESEARCH_SENTINEL');
    expect(h.state.error).toBeNull();
  });

  it.each([['empty', ''], ['insufficient', groundedBrief('Too short.')], ['ungrounded', { text: BRIEF, groundingMetadata: null }]])('retries an %s brief before starting the article', async (_label, invalid) => {
    const ai = provider(attempt => attempt === 1 ? invalid : groundedBrief());
    const h = harness(ai);
    await finish(h.engine.handleGenerateSource({}, false));
    expect(ai.researchCalls).toHaveLength(2);
    expect(ai.articleCalls[0].prompt).toContain('RESEARCH_SENTINEL');
    expect(h.state.error).toBeNull();
  });

  it.each(['empty', 'insufficient', 'ungrounded response', 'provider failure'])('does not write an article after all research attempts return %s', async outcome => {
    const ai = provider(() => {
      if (outcome === 'provider failure') throw new Error('Web grounding unavailable');
      if (outcome === 'ungrounded response') return { text: BRIEF, groundingMetadata: null };
      return outcome === 'empty' ? '' : groundedBrief('Too short.');
    });
    const h = harness(ai);
    await finish(h.engine.handleGenerateSource({}, false));
    expect(ai.researchCalls.length).toBeGreaterThan(1);
    expect(ai.articleCalls).toHaveLength(0);
    expect(h.state.setError).toHaveBeenLastCalledWith(expect.stringMatching(/research|web search|grounding/i));
    expect(h.state.isGeneratingSource).toBe(false);
    expect(h.state.inputText).not.toContain('Small droplets form clouds');
  });

  it('does not write from an empty local-backend web search', async () => {
    const ai = provider(() => { throw new Error('Cloud research should not run for local backend'); });
    const generateText = vi.fn(async () => BRIEF);
    const search = vi.fn(async () => ({ results: [] }));
    const h = harness(ai, { ai: { backend: 'localai', generateText }, webSearchProvider: { search } });
    await finish(h.engine.handleGenerateSource({}, false));
    expect(search).toHaveBeenCalled();
    expect(generateText).not.toHaveBeenCalled();
    expect(ai.articleCalls).toHaveLength(0);
    expect(h.state.error).toMatch(/research|web search|grounding/i);
  });

  it('retains useful research headed Sources and facts', async () => {
    const ai = provider(() => groundedBrief('## Sources and facts\n\n- ' + BRIEF));
    const h = harness(ai);
    await finish(h.engine.handleGenerateSource({}, false));
    expect(ai.articleCalls[0].prompt).toContain('RESEARCH_SENTINEL');
    expect(h.state.error).toBeNull();
  });

  it('still allows explicitly citations-off generation without web research', async () => {
    const ai = provider(() => { throw new Error('Research must not run when explicitly disabled'); });
    const h = harness(ai, { includeSourceCitations: false });
    await finish(h.engine.handleGenerateSource({}, false));
    expect(ai.researchCalls).toHaveLength(0);
    expect(ai.articleCalls.length).toBeGreaterThan(0);
    expect(h.state.error).toBeNull();
    expect(h.state.inputText).toContain('Small droplets form clouds');
  });

  it.each(['photosynthesis', 'water cycle'])('passes only the approved topic %s through the real public-search policy for Canvas research and writing', async topic => {
    const documentText = 'PRIVATE_DOCUMENT_SENTINEL: A teacher-provided passage used only as model context.';
    ownDocuments(1, documentText);
    const ai = publicSearchChain();
    // This remains rejected. The regression must fix routing, never relax the policy.
    const blocked = await ai.web.search('PRIVATE_INSTRUCTION_SENTINEL: photosynthesis with a private classroom note');
    expect(blocked.privacyBlocked).toBe(true);
    expect(ai.transport).not.toHaveBeenCalled();
    ai.search.mockClear();
    const h = harness(ai, {
      sourceTopic: topic, useOwnSources: true,
      sourceCustomInstructions: 'PRIVATE_INSTRUCTION_SENTINEL: Explain in short paragraphs.',
    });
    await finish(h.engine.handleGenerateSource({}, false));
    expect(h.state.error).toBeNull();
    expect(ai.calls.some(call => call.phase === 'research')).toBe(true);
    const articles = ai.calls.filter(call => call.phase === 'article');
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].prompt).toContain('PRIVATE_DOCUMENT_SENTINEL');
    expect(articles[0].prompt).toContain('PRIVATE_INSTRUCTION_SENTINEL');
    expect(ai.calls.filter(call => call.useSearch).every(call => call.searchQuery === topic)).toBe(true);
    expect(ai.search.mock.calls.every(([, , override]) => override === topic)).toBe(true);
    expect(ai.transport.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(ai.transport.mock.calls.map(([query]) => query)).toEqual(ai.transport.mock.calls.map(() => topic));
  });

  it('uses the approved topic without grade or prompt suffixes in local research and subsequent grounded writing', async () => {
    ownDocuments(1, 'PRIVATE_DOCUMENT_SENTINEL: Local teacher notes remain model context, not search text.');
    const ai = publicSearchChain();
    const generateText = vi.fn(async () => BRIEF);
    const h = harness(ai, {
      sourceTopic: 'photosynthesis', useOwnSources: true,
      sourceCustomInstructions: 'PRIVATE_INSTRUCTION_SENTINEL: Use simple sentences.',
      ai: { backend: 'localai', generateText }, webSearchProvider: ai.web,
    });
    await finish(h.engine.handleGenerateSource({}, false));
    expect(h.state.error).toBeNull();
    expect(ai.search.mock.calls[0][0]).toBe('photosynthesis');
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText.mock.calls[0][0]).toContain('Photosynthesis reference');
    expect(ai.calls.some(call => call.phase === 'research')).toBe(false);
    const articles = ai.calls.filter(call => call.phase === 'article');
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].prompt).toContain('PRIVATE_DOCUMENT_SENTINEL');
    expect(articles.every(call => call.useSearch && call.searchQuery === 'photosynthesis')).toBe(true);
    expect(ai.transport.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(ai.transport.mock.calls.map(([query]) => query)).toEqual(ai.transport.mock.calls.map(() => 'photosynthesis'));
  });
});
