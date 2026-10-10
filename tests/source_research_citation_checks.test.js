import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const topic = 'Cloud formation';
const passage = 'Clouds form when water vapor cools and condenses into tiny droplets.';
const secondPassage = 'Cloud droplets can join together and fall as rain when they become heavy.';
let R, createEngine;

beforeEach(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  window.__alloUtils = window.AlloModules.TextPipelineHelpers;
  loadAlloModule('own_sources_module.js');
  new Function(readFileSync('content_engine_source.jsx', 'utf8'))();
  R = window.AlloModules.SourceResearchReview;
  createEngine = window.AlloModules.createContentEngine;
});

afterEach(() => {
  ['callGemini', '__contentEngineState', 'ALLOFLOW_MANAGED_AI_POLICY', 'LumenStudy', 'LumenEvidence', 'AlloOwnSources'].forEach(key => delete window[key]);
  vi.restoreAllMocks();
});

function collection(rows = []) {
  const packet = R.packet(topic);
  R.merge(packet, rows.length ? rows : [{ kind: 'web', url: 'https://science.example.edu/clouds', title: 'Cloud science', passage, evidenceType: 'Page excerpt' }]);
  return packet;
}

function draft(ids, prose = 'Cooling water vapor forms cloud droplets.') {
  return { sections: [{ heading: 'Clouds', paragraphs: [{ text: prose, evidenceIds: ids }] }] };
}

function harness(reply) {
  const state = {
    inputText: 'Original reading', generatedContent: { text: 'Saved adaptation' }, activeView: 'output',
    sourceTopic: topic, sourceLength: '250', sourceTone: 'Informative', sourceLevel: '5th Grade', sourceVocabulary: '', sourceCustomInstructions: '',
    currentUiLanguage: 'English', leveledTextLanguage: 'English', selectedLanguages: [], targetStandards: [], standardsPromptString: '',
    includeSourceCitations: true, useOwnSources: false, documentsOnly: false, ai: { backend: 'gemini' },
    alloBotRef: { current: null }, recordSourceProvenance: vi.fn()
  };
  for (const key of ['inputText', 'generatedContent', 'activeView', 'error', 'generationStep', 'isGeneratingSource', 'showSourceGen']) {
    state['set' + key[0].toUpperCase() + key.slice(1)] = vi.fn(value => { state[key] = value; });
  }
  const callGemini = vi.fn(async () => reply);
  const engine = createEngine({ getState: () => state, callGemini, t: key => key, addToast: vi.fn() });
  return { state, callGemini, run: options => engine.handleGenerateSource(options) };
}

describe('reviewed paragraph citation coverage', () => {
  it('rejects a partially attributed draft and identifies the uncited paragraph', () => {
    const packet = collection();
    const response = draft([packet.items[0].id]);
    response.sections[0].paragraphs.push({ text: 'This unsupported statement must not be published.', evidenceIds: [] });
    expect(() => R.render(response, packet.items)).toThrow(/Paragraph 2 in section 1 did not cite any/);
  });

  it('rejects uncited paragraphs hidden in a multiline prose field', () => {
    const packet = collection();
    expect(() => R.render(draft([packet.items[0].id], 'Clouds consist of droplets.\n\nAn additional paragraph has no separate attribution.'), packet.items)).toThrow(/multiple paragraphs/);
  });

  it.each([
    ['null section', { sections: [null] }],
    ['array section', { sections: [[]] }],
    ['numeric heading', { sections: [{ heading: 7, paragraphs: [{ text: passage, evidenceIds: [] }] }] }],
    ['null paragraph', { sections: [{ paragraphs: [null] }] }],
    ['non-array evidence IDs', { sections: [{ paragraphs: [{ text: passage, evidenceIds: 'invented' }] }] }],
    ['unknown evidence ID', draft(['invented'])],
    ['non-string evidence ID', draft([1])]
  ])('rejects %s instead of dropping invalid response data', (_name, response) => {
    expect(() => R.render(response, collection().items)).toThrow();
  });

  it('bounds evidence ID lists and rejects ambiguous duplicate evidence records', () => {
    const packet = collection();
    expect(() => R.render(draft(Array(25).fill(packet.items[0].id)), packet.items)).toThrow(/outside your selection/);
    expect(() => R.render(draft([packet.items[0].id]), [packet.items[0], packet.items[0]])).toThrow(/selected evidence is invalid/);
  });

  it('keeps the original and adapted readings when coverage fails, without retrying', async () => {
    const packet = collection();
    const response = draft([packet.items[0].id]);
    response.sections[0].paragraphs.push({ text: 'An unsupported extra paragraph.', evidenceIds: [] });
    const h = harness(response);
    const result = await h.run({ reviewedResearch: packet });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Paragraph 2 in section 1');
    expect(h.state.inputText).toBe('Original reading');
    expect(h.state.generatedContent).toEqual({ text: 'Saved adaptation' });
    expect(h.state.recordSourceProvenance).not.toHaveBeenCalled();
    expect(h.callGemini).toHaveBeenCalledTimes(1);
    expect(h.callGemini.mock.calls[0][2]).toBe(false);
    expect(h.callGemini.mock.calls[0][0]).toContain('Every paragraph must have at least one supporting evidence ID');
  });
});

describe('source-level web references with passage-level provenance', () => {
  function mixedCollection() {
    return collection([
      { kind: 'web', url: 'https://science.example.edu/clouds#formation', title: 'Cloud science', passage, evidenceType: 'Search snippet' },
      { kind: 'paste', title: 'Local notes', passage },
      { kind: 'web', url: 'https://science.example.edu/clouds#rain', title: 'Rain details', passage: secondPassage, evidenceType: 'Page excerpt' },
      { kind: 'web', url: 'https://weather.example.edu/rain', title: 'Rain science', passage: secondPassage, evidenceType: 'Page excerpt' },
      { kind: 'paste', title: 'Other notes', passage: secondPassage }
    ]);
  }

  it('deduplicates a webpage within a paragraph and reference list, preserving every passage ID', () => {
    const packet = mixedCollection();
    const ids = packet.items.map(item => item.id);
    const rendered = R.render(draft([...ids, ids[0]]), packet.items);
    const [body, references] = rendered.text.split('### Source Text References');
    expect(body.match(/\[\u207d\u00b9\u207e\]/g)).toHaveLength(1);
    expect(body).toContain('[\u207d\u00b2\u207e](https://weather.example.edu/rain)');
    expect(body).toContain('[Your document 1]');
    expect(body).toContain('[Your document 2]');
    expect(references.match(/https:\/\/science\.example\.edu\/clouds/g)).toHaveLength(1);
    expect(references).toContain('Search snippet, Page excerpt');
    expect(references).not.toContain('#formation');
    expect(rendered.citedIds).toEqual(ids);
    expect(rendered).toMatchObject({ paragraphs: 1, citedParagraphs: 1, uncitedParagraphs: 0, webSourceCount: 2 });
  });

  it('reuses a source number in later paragraphs and reports only cited evidence types', () => {
    const packet = mixedCollection();
    const rendered = R.render({ sections: [{ paragraphs: [
      { text: passage, evidenceIds: [packet.items[2].id] },
      { text: secondPassage, evidenceIds: [packet.items[2].id] }
    ] }] }, packet.items);
    expect(rendered.text.match(/\[\u207d\u00b9\u207e\]/g)).toHaveLength(2);
    expect(rendered.text).not.toContain('Search snippet');
    expect(rendered.citedIds).toEqual([packet.items[2].id]);
    expect(rendered.webSourceCount).toBe(1);
  });

  it('retains document anchor numbering and records coverage without claiming verification', async () => {
    const packet = mixedCollection();
    const h = harness(draft(packet.items.map(item => item.id)));
    const result = await h.run({ reviewedResearch: packet });
    expect(result.ok).toBe(true);
    expect(result.report.citationCoverage).toEqual({ paragraphs: 1, citedParagraphs: 1, webSources: 2 });
    expect(result.report.citedIds).toEqual(packet.items.map(item => item.id));
    expect(result.report.documents.citedIds).toHaveLength(2);
    expect(h.state.inputText).toContain('1 of 1 paragraphs include evidence citations; 2 distinct web source(s) cited.');
    expect(h.state.inputText).toContain('They do not independently verify every generated claim.');
    expect(h.state.inputText.match(/#allo-doc-/g).length).toBeGreaterThanOrEqual(2);
    expect(h.callGemini).toHaveBeenCalledTimes(1);
  });
});

describe('exact reviewed quotations', () => {
  const exactConfig = { version: 1, enabled: true, mode: 'sources', urls: [], exactQuotes: true };

  it.each(['null', 'unknown', 'rewritten', 'non-string'])('rejects %s excerpts while preserving existing work', async failure => {
    const packet = collection();
    const excerpt = failure === 'null' ? null : {
      evidenceId: failure === 'unknown' ? 'invented' : packet.items[0].id,
      quote: failure === 'rewritten' ? 'Clouds are made from an invented material not found in this passage.' : failure === 'non-string' ? 10 : passage
    };
    const h = harness({ excerpts: [excerpt] });
    const result = await h.run({ reviewedResearch: packet, researchConfig: exactConfig });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/excerpt/i);
    expect(h.state.inputText).toBe('Original reading');
    expect(h.state.generatedContent).toEqual({ text: 'Saved adaptation' });
    expect(h.callGemini).toHaveBeenCalledTimes(1);
  });

  it('attributes each paragraph of an exact multi-paragraph source quote', async () => {
    const quote = passage + '\n\n' + secondPassage;
    const packet = collection([{ kind: 'web', url: 'https://science.example.edu/clouds', title: 'Cloud science', passage: quote, evidenceType: 'Page excerpt' }]);
    const h = harness({ excerpts: [{ evidenceId: packet.items[0].id, quote }] });
    const result = await h.run({ reviewedResearch: packet, researchConfig: exactConfig });
    expect(result.ok).toBe(true);
    expect(result.report.citationCoverage).toEqual({ paragraphs: 2, citedParagraphs: 2, webSources: 1 });
    expect(result.report.citedIds).toEqual([packet.items[0].id]);
    expect(h.state.inputText).toContain(passage);
    expect(h.state.inputText).toContain(secondPassage);
  });

  it('does not change the legacy documents-only quote contract', async () => {
    const packet = collection([{ kind: 'paste', title: 'Local notes', passage }]);
    const h = harness({ excerpts: [{ document: 1, quote: passage }] });
    const result = await h.run({ reviewedResearch: packet, documentsOnly: true });
    expect(result.ok).toBe(true);
    expect(result.report.citationCoverage).toBeNull();
    expect(result.report.citedIds).toEqual([packet.items[0].id]);
    expect(h.callGemini.mock.calls[0][0]).toContain('"document":1');
    expect(h.callGemini.mock.calls[0][2]).toBe(false);
  });
});
