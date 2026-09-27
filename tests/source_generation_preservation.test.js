// Exercise the real engine source in memory. RESEARCH_ENGINE_SOURCE may select
// a saved source for baseline/mutation checks; ordinary runs use current source.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const TOPIC = 'Water cycle';
const OLD_INPUT = 'The teacher has already prepared this original reading.';
const BRIEF = 'Water evaporates when heated. It condenses when cooled and forms clouds. Droplets fall as rain and collect in rivers and lakes, completing the water cycle.';
const BODY = 'The sun warms water in lakes. Water evaporates into the air, cools into clouds, and falls as rain. Rivers carry the water back to lakes.';
const ARTICLE = '# Water cycle\n\n' + BODY;
const QUOTE = 'Warm air can hold more water vapor. Cooling causes condensation.';
const METADATA = { groundingChunks: [{ web: { uri: 'https://science.example.edu/water', title: 'Water cycle reference' } }] };
const noop = () => {};
let createContentEngine;

beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('own_sources_module.js');
  window.__alloUtils = {
    ...window.AlloModules.TextPipelineHelpers,
    cleanJson: value => String(value || '').trim(),
    safeJsonParse: value => { try { return JSON.parse(value); } catch (_) { return null; } },
  };
  new Function(readFileSync(process.env.RESEARCH_ENGINE_SOURCE || 'content_engine_source.jsx', 'utf8'))();
  createContentEngine = window.AlloModules.createContentEngine;
});

afterEach(() => {
  delete window.callGemini;
  delete window.__contentEngineState;
  delete window.AlloOwnSources;
  delete window.LumenEvidence;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function provider({ research = () => ({ text: BRIEF, groundingMetadata: METADATA }), article = () => ARTICLE, excerpts = [{ document: 1, quote: QUOTE }], outline = ['Evaporation', 'Condensation'] } = {}) {
  const researchCalls = [], articleCalls = [], unexpected = [];
  const callGemini = vi.fn(async (prompt, jsonMode, useSearch) => {
    const call = { prompt: String(prompt), jsonMode, useSearch };
    if (/Research the following topic/.test(call.prompt)) {
      researchCalls.push(call);
      return research(call, researchCalls.length);
    }
    if (/Select up to 6 exact excerpts/.test(call.prompt)) return JSON.stringify({ excerpts });
    if (/Plan a comprehensive educational article/.test(call.prompt)) return JSON.stringify(outline);
    if (/You are designing an educational dialogue scene/.test(call.prompt)) return 'A learner and guide investigate where rain comes from.';
    if (/Write a self-contained educational article|Write the section|You are generating an EDUCATIONAL DIALOGUE/.test(call.prompt)) {
      articleCalls.push(call);
      return article(call, articleCalls.length);
    }
    unexpected.push(call);
    throw new Error('Unexpected provider request: ' + call.prompt.slice(0, 100));
  });
  return { callGemini, researchCalls, articleCalls, unexpected };
}

function harness(ai = provider(), overrides = {}) {
  vi.useFakeTimers();
  const priorReading = { id: 'existing-reading', type: 'simplified', data: { adaptedText: 'A carefully reviewed adapted reading.' } };
  const state = {
    inputText: OLD_INPUT, generatedContent: priorReading, activeView: 'output', error: null,
    gradeLevel: '5th Grade', sourceTopic: TOPIC, currentUiLanguage: 'English', leveledTextLanguage: 'English',
    selectedLanguages: [], studentInterests: [], selectedConcepts: [], sourceCustomInstructions: '',
    sourceLength: '250', sourceLevel: '5th Grade', sourceTone: 'Informative', sourceVocabulary: '',
    resourceCount: 1, targetStandards: [], dokLevel: '', selectedFont: 'Default', includeSourceCitations: false,
    useOwnSources: false, documentsOnly: false, standardsPromptString: '', ai: { backend: 'gemini' }, alloBotRef: { current: null },
    showSourceGen: true, isGeneratingSource: false, generationStep: '', recordSourceProvenance: vi.fn(), ...overrides,
  };
  const transitions = [];
  for (const key of ['activeView', 'error', 'generatedContent', 'generationStep', 'inputText', 'isGeneratingSource', 'showSourceGen']) {
    state['set' + key[0].toUpperCase() + key.slice(1)] = vi.fn(value => {
      state[key] = typeof value === 'function' ? value(state[key]) : value;
      transitions.push({ key, value: state[key], inputText: state.inputText, reading: state.generatedContent, view: state.activeView });
    });
  }
  const addToast = vi.fn();
  const engine = createContentEngine({ callGemini: ai.callGemini, addToast, t: key => key, getState: () => state, flyToElement: noop });
  return { state, priorReading, transitions, engine, ai, addToast };
}

async function finish(operation) {
  await vi.runAllTimersAsync();
  await operation;
}

function expectPreserved(h, { input = OLD_INPUT, reading = h.priorReading, view = 'output' } = {}) {
  expect(h.state.inputText).toBe(input);
  expect(h.state.generatedContent).toBe(reading);
  expect(h.state.activeView).toBe(view);
}

function expectFailedWithoutPublication(h, expected) {
  expectPreserved(h, expected);
  expect(h.state.error).toEqual(expect.any(String));
  expect(h.state.error.trim()).not.toBe('');
  expect(h.state.isGeneratingSource).toBe(false);
  expect(h.state.showSourceGen).toBe(true);
  expect(h.state.recordSourceProvenance).not.toHaveBeenCalled();
  expect(h.addToast.mock.calls.filter(([, level]) => level === 'success')).toEqual([]);
  expect(h.ai.unexpected).toEqual([]);
}

function expectPublished(h, body = BODY, switchView = true) {
  expect(h.state.inputText).toContain(body);
  expect(h.state.inputText).not.toContain(OLD_INPUT);
  expect(h.state.generatedContent).toBe(switchView ? null : h.priorReading);
  expect(h.state.activeView).toBe(switchView ? 'input' : 'output');
  expect(h.state.showSourceGen).toBe(false);
  expect(h.state.error).toBeNull();
  expect(h.state.isGeneratingSource).toBe(false);
  expect(h.state.recordSourceProvenance).toHaveBeenCalledTimes(1);
  expect(h.state.recordSourceProvenance.mock.calls[0][1]).toBe(h.state.inputText.trim());
  // Publication is one coherent replacement, with no canonical title/draft writes.
  expect(h.transitions.filter(({ key }) => key === 'inputText')).toHaveLength(1);
  expect(h.transitions.filter(({ key }) => key === 'generatedContent')).toHaveLength(switchView ? 1 : 0);
  expect(h.transitions.filter(({ key }) => key === 'activeView')).toHaveLength(switchView ? 1 : 0);
  expect(h.ai.unexpected).toEqual([]);
}

function ownDocuments() {
  window.AlloOwnSources = {
    ensureLumen: async () => {}, activeSourceCount: () => 1,
    loadProject: async () => ({ sources: [{ id: 'notes', title: 'Climate notes', active: true, version: 1 }] }),
  };
  window.LumenEvidence = {
    createProjectStore: () => ({}),
    retrieve: () => [{ node: { id: 'water', sourceId: 'notes', locatorLabel: 'page 1', content: QUOTE } }],
  };
}

describe('source generation preserves the current reading until usable publication', () => {
  it.each(['empty', 'insufficient', 'ungrounded', 'throw'])('preserves existing work after %s web research', async outcome => {
    const ai = provider({ research: () => {
      if (outcome === 'throw') throw new Error('Research provider unavailable');
      if (outcome === 'ungrounded') return { text: BRIEF, groundingMetadata: null };
      return outcome === 'empty' ? '' : { text: 'Too short.', groundingMetadata: METADATA };
    } });
    const h = harness(ai, { includeSourceCitations: true });
    await finish(h.engine.handleGenerateSource());
    expect(ai.researchCalls.length).toBeGreaterThan(1);
    expect(ai.articleCalls).toHaveLength(0);
    expectFailedWithoutPublication(h);
  });

  it('preserves existing work after local search returns no usable sources', async () => {
    const generateText = vi.fn();
    const h = harness(provider(), { includeSourceCitations: true, ai: { backend: 'localai', generateText }, webSearchProvider: { search: vi.fn(async () => ({ results: [] })) } });
    await finish(h.engine.handleGenerateSource());
    expect(generateText).not.toHaveBeenCalled();
    expect(h.ai.articleCalls).toHaveLength(0);
    expectFailedWithoutPublication(h);
  });

  it('does not roll back a newer teacher selection when pending research fails', async () => {
    const pending = deferred();
    const h = harness(provider({ research: () => pending.promise }), { includeSourceCitations: true });
    const operation = h.engine.handleGenerateSource();
    const replacement = { id: 'newer-reading', data: 'Another saved reading selected during research.' };
    h.state.setInputText('The teacher selected a newer source.');
    h.state.setGeneratedContent(replacement);
    h.state.setActiveView('library');
    pending.reject(new Error('Research failed after selection changed'));
    await finish(operation);
    expectFailedWithoutPublication(h, { input: 'The teacher selected a newer source.', reading: replacement, view: 'library' });
  });

  it('keeps prior work while the first article request is pending, then publishes once', async () => {
    const pending = deferred();
    const h = harness(provider({ article: () => pending.promise }));
    const operation = h.engine.handleGenerateSource();
    await vi.runAllTimersAsync();
    try {
      expect(h.ai.articleCalls).toHaveLength(1);
      expect(h.state.isGeneratingSource).toBe(true);
      expectPreserved(h);
      expect(h.state.recordSourceProvenance).not.toHaveBeenCalled();
      expect(h.state.showSourceGen).toBe(true);
    } finally {
      pending.resolve(ARTICLE);
      await finish(operation);
    }
    expectPublished(h);
  });

  it.each([
    ['throw', null], ['empty', ''], ['whitespace', '   \n'],
    ['boolean', true], ['number', 42], ['object-valued text', { text: { message: 'Not article text' } }],
    ['title only', '# Water cycle'], ['title prefix only', 'Title: Water cycle'],
    ['headings only', '# Water cycle\n\n## Evaporation\n\n## Condensation'],
    ['title-only JSON string', JSON.stringify({ title: TOPIC })],
    ['metadata-only JSON', JSON.stringify({ status: 'completed', usage: { tokens: 12 } })],
    ['fenced metadata under a title', '# Water cycle\n\n```json\n' + JSON.stringify({ status: 'completed', sources: [] }) + '\n```'],
  ])('does not publish when all article attempts return %s', async (_label, output) => {
    const h = harness(provider({ article: () => { if (output === null) throw new Error('Writing unavailable'); return output; } }));
    await finish(h.engine.handleGenerateSource());
    expect(h.ai.articleCalls.length).toBeGreaterThan(0);
    expectFailedWithoutPublication(h);
  });

  it('keeps the old reading while later sections are pending, then publishes useful partial success', async () => {
    const pending = deferred();
    const h = harness(provider({ article: (_call, number) => number === 1 ? ARTICLE : pending.promise }), { sourceLength: '1000' });
    const operation = h.engine.handleGenerateSource();
    await vi.runAllTimersAsync();
    try {
      expect(h.ai.articleCalls).toHaveLength(2);
      expectPreserved(h);
      expect(h.state.recordSourceProvenance).not.toHaveBeenCalled();
    } finally {
      pending.reject(new Error('Later section unavailable'));
      await finish(operation);
    }
    expectPublished(h);
    expect(h.addToast.mock.calls.some(([, level]) => level === 'warning')).toBe(true);
  });

  it('publishes useful prose headed Sources of energy without treating the heading as a references trailer', async () => {
    const body = 'Sunlight warms the ground and water. Wind can turn a turbine, while moving water can turn a wheel. These are different sources of energy.';
    const h = harness(provider({ article: () => '## Sources of energy\n\n' + body }));
    await finish(h.engine.handleGenerateSource());
    expectPublished(h, body);
    expect(h.state.inputText).toContain('## Sources of energy');
  });

  it('publishes a short Chinese sentence without imposing an English word minimum', async () => {
    const body = '水会蒸发。';
    const h = harness(provider({ article: () => body }), { currentUiLanguage: 'Chinese', sourceTopic: '水循环' });
    await finish(h.engine.handleGenerateSource());
    expectPublished(h, body);
  });

  it.each([
    ['empty', ''],
    ['citation scaffolding only', '## Evaporation\n\n[Source 1]'],
  ])('keeps original section identities and excludes unused evidence when the first section is %s', async (_label, firstText) => {
    const outline = ['Evaporation', 'Condensation', 'Precipitation'];
    const missingUrl = 'https://science.example.edu/unused-evaporation';
    const condensationUrl = 'https://science.example.edu/condensation';
    const precipitationUrl = 'https://science.example.edu/precipitation';
    const condensation = 'Water vapor cools around tiny particles. Small drops gather to form clouds.';
    const precipitation = 'Drops in clouds grow heavier. They fall to the ground as rain, returning water to rivers and lakes.';
    const texts = [firstText, '## Condensation\n\n' + condensation + ' [Source 1]', '## Precipitation\n\n' + precipitation + ' [Source 1]'];
    const urls = [missingUrl, condensationUrl, precipitationUrl];
    const h = harness(provider({ outline, article: (_call, number) => ({
      text: texts[number - 1],
      groundingMetadata: { groundingChunks: [{ web: { uri: urls[number - 1], title: number === 1 ? 'UNUSED EVIDENCE' : outline[number - 1] + ' reference' } }] },
    }) }), { includeSourceCitations: true, sourceLength: '1500' });
    await finish(h.engine.handleGenerateSource());
    expectPublished(h, condensation);
    expect(h.ai.articleCalls).toHaveLength(3);
    const thirdPrompt = h.ai.articleCalls[2].prompt;
    expect(thirdPrompt).toContain('Write the section "Precipitation"');
    expect(thirdPrompt).toMatch(/1\. Evaporation\s+← SKIPPED/);
    expect(thirdPrompt).toMatch(/2\. Condensation\s+← DONE/);
    expect(thirdPrompt).toMatch(/3\. Precipitation\s+← WRITING NOW/);
    expect(thirdPrompt).toContain('===== SECTION 2: Condensation =====');
    expect(thirdPrompt).toContain(condensation);
    expect(thirdPrompt).not.toContain('===== SECTION 1:');
    expect(h.state.inputText).toContain(precipitation);
    expect(h.state.inputText).not.toContain('## Evaporation');
    expect(h.state.inputText).not.toContain(missingUrl);
    expect(h.state.inputText).not.toContain('UNUSED EVIDENCE');
    expect(h.state.inputText).toContain('[⁽¹⁾](' + condensationUrl + ')');
    expect(h.state.inputText).toContain('[⁽²⁾](' + precipitationUrl + ')');
    const references = h.state.inputText.slice(h.state.inputText.indexOf('Source Text References'));
    expect(references.match(/^\d+\.\s+\[/gm)).toHaveLength(2);
    expect(h.addToast.mock.calls.some(([message, level]) => level === 'warning' && /1 of 3/.test(message))).toBe(true);
  });

  it('preserves newer work when a pending article and its fallback both fail', async () => {
    const pending = deferred();
    const h = harness(provider({ article: () => pending.promise }));
    const operation = h.engine.handleGenerateSource();
    await vi.runAllTimersAsync();
    const replacement = { id: 'newer-draft', data: 'A newly opened adapted draft.' };
    h.state.setInputText('New source entered during the request.');
    h.state.setGeneratedContent(replacement);
    h.state.setActiveView('library');
    pending.reject(new Error('No article available'));
    await finish(operation);
    expectFailedWithoutPublication(h, { input: 'New source entered during the request.', reading: replacement, view: 'library' });
  });

  it.each([
    ['throw', null], ['empty', ''], ['title only', '# Water cycle'],
    ['title-only JSON', JSON.stringify({ title: TOPIC, dialogue: [] })],
    ['malformed JSON without dialogue', '{"title":"Water cycle","dialogue": ['],
    ['empty spoken lines', JSON.stringify({ title: TOPIC, dialogue: [{ speaker: 'guide', line: '' }] })],
  ])('keeps existing work for dialogue %s', async (_label, output) => {
    const h = harness(provider({ article: () => { if (output === null) throw new Error('Dialogue unavailable'); return output; } }), { sourceTone: 'Dialogue' });
    await finish(h.engine.handleGenerateSource());
    expect(h.ai.articleCalls.length).toBeGreaterThan(0);
    expectFailedWithoutPublication(h);
  });

  it('still publishes valid dialogue', async () => {
    const spoken = 'Warm water evaporates into the air. It cools and condenses to make clouds.';
    const h = harness(provider({ article: () => JSON.stringify({ title: TOPIC, characters: { guide: { name: 'Sam' } }, dialogue: [{ speaker: 'guide', line: spoken }] }) }), { sourceTone: 'Dialogue' });
    await finish(h.engine.handleGenerateSource());
    expectPublished(h, spoken);
  });

  it('keeps real dialogue readable when optional fields contain invalid types', async () => {
    const spoken = 'Warm water evaporates into the air. It cools and condenses to make clouds.';
    const invalid = { value: 'INVALID_FIELD_SENTINEL' };
    const dialogue = {
      title: invalid, setting: invalid,
      characters: { learner: { name: invalid }, guide: { name: 42 } },
      dialogue: [
        { speaker: 'guide', action: invalid, line: spoken },
        { speaker: 'learner', action: true, line: 'So cooling water vapor makes the cloud drops.' },
        { speaker: 'guide', action: invalid, line: invalid },
      ],
    };
    const h = harness(provider({ article: () => JSON.stringify(dialogue) }), { sourceTone: 'Dialogue' });
    await finish(h.engine.handleGenerateSource());
    expectPublished(h, spoken);
    expect(h.state.inputText).toContain('**GUIDE:**');
    expect(h.state.inputText).toContain('**LEARNER:**');
    expect(h.state.inputText).toContain('So cooling water vapor makes the cloud drops.');
    expect(h.state.inputText).not.toMatch(/\[object Object\]|undefined|INVALID_FIELD_SENTINEL/);
    expect(h.state.inputText).not.toContain('42');
    expect(h.state.inputText).not.toContain('true');
  });

  it('publishes readable raw dialogue that starts with a bracketed stage direction', async () => {
    const spoken = 'Warm water evaporates into the air. It cools and condenses to make clouds.';
    const raw = '[At a classroom window]\n\nLEARNER: Where does rain come from?\n\nGUIDE: ' + spoken;
    const h = harness(provider({ article: () => raw }), { sourceTone: 'Dialogue' });
    await finish(h.engine.handleGenerateSource());
    expectPublished(h, spoken);
    expect(h.state.inputText).toContain('At a classroom window');
    expect(h.state.inputText).toContain('LEARNER: Where does rain come from?');
  });

  it('keeps documents-only generation limited to exact excerpts and publishes on success', async () => {
    ownDocuments();
    const h = harness(provider(), { documentsOnly: true, selectedOwnSourceIds: ['notes'], includeSourceCitations: true });
    await finish(h.engine.handleGenerateSource());
    expectPublished(h, QUOTE);
    expect(h.state.inputText).toContain('[Document 1](#allo-doc-');
    expect(h.state.recordSourceProvenance.mock.calls[0][0].importMethod).toBe('documents-only');
    expect(h.ai.researchCalls).toHaveLength(0);
    expect(h.ai.articleCalls).toHaveLength(0);
    expect(h.ai.callGemini.mock.calls.every(([, , useSearch]) => useSearch === false)).toBe(true);
  });

  it.each([
    ['own-document marker', '[Your document 1]'],
    ['own-document link', '[Document 1](#allo-doc-notes-water)'],
  ])('keeps existing work when own-files generation returns only an %s', async (_label, marker) => {
    ownDocuments();
    const h = harness(provider({ article: () => marker }), { useOwnSources: true, selectedOwnSourceIds: ['notes'] });
    await finish(h.engine.handleGenerateSource());
    expect(h.ai.articleCalls.length).toBeGreaterThan(0);
    expect(h.ai.articleCalls[0].prompt).toContain(QUOTE);
    expectFailedWithoutPublication(h);
  });

  it('does not count an own-document marker in a skipped section as evidence for later uncited prose', async () => {
    ownDocuments();
    const h = harness(provider({ article: (_call, number) => number === 1 ? '[Your document 1]' : ARTICLE }), {
      useOwnSources: true, selectedOwnSourceIds: ['notes'], sourceLength: '1000',
    });
    await finish(h.engine.handleGenerateSource());
    expectPublished(h);
    expect(h.ai.articleCalls).toHaveLength(2);
    expect(h.ai.articleCalls[1].prompt).toMatch(/1\. Evaporation\s+← SKIPPED/);
    const evidence = h.state.recordSourceProvenance.mock.calls[0][0].researchEvidence;
    expect(evidence.version).toBe(1);
    expect(evidence.supplied).toHaveLength(1);
    expect(evidence.supplied[0]).toMatchObject({ sourceId: 'notes', passage: QUOTE });
    expect(evidence.citedIds).toEqual([]);
    expect(h.state.inputText).toContain('1 document(s) supplied (1 passages); 0 document(s) cited (0 passages).');
    expect(h.state.inputText).not.toContain('[Your document 1]');
    expect(h.state.inputText).not.toContain('](#allo-doc-');
    expect(h.addToast.mock.calls.some(([message, level]) => level === 'warning' && /1 of 2/.test(message))).toBe(true);
  });

  it('preserves work when documents-only selection contains no supported excerpts', async () => {
    ownDocuments();
    const h = harness(provider({ excerpts: [] }), { documentsOnly: true, selectedOwnSourceIds: ['notes'], includeSourceCitations: true });
    await finish(h.engine.handleGenerateSource());
    expectFailedWithoutPublication(h);
    expect(h.ai.articleCalls).toHaveLength(0);
  });

  it('honors switchView=false on successful publication without clearing the current adapted reading', async () => {
    const h = harness();
    await finish(h.engine.handleGenerateSource({}, false));
    expectPublished(h, BODY, false);
  });
});
