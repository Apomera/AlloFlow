import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let dispatcher;
const documentOne = '[Document 1](#allo-doc-lesson-passage-1)';
const documentTwo = '[Document 2](#allo-doc-lesson-passage-2)';
const web = '[⁽¹⁾](https://example.org/source_(page))';

beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('ai_backend_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  dispatcher = window.AlloModules.GenDispatcher;
});

describe('local document citations during adaptation', () => {
  it('records local passage anchors and web citations in their exact mixed order', () => {
    const text = `First ${documentOne}. Online ${web}. Second ${documentTwo}.`;
    const ledger = dispatcher.extractAdaptationCitationLedgerLocal(text);
    expect(ledger.entries.map(entry => entry.marker)).toEqual([documentOne, web, documentTwo]);
    expect(ledger.entries[0]).toMatchObject({ label: 'Document 1', url: '#allo-doc-lesson-passage-1' });
    ledger.entries.forEach(entry => expect(text.slice(entry.start, entry.end)).toBe(entry.marker));
  });

  it('protects and restores passage links without assigning web citation numbers', () => {
    const original = `Local ${documentOne}. Online ${web}.`;
    const envelope = dispatcher.protectAdaptationCitations(original);
    expect(envelope.citations).toHaveLength(2);
    expect(envelope.text).not.toContain('#allo-doc-');
    expect(envelope.text).not.toContain('https:');
    const restored = dispatcher.restoreProtectedAdaptationCitations(envelope, envelope.text.replace('Local', 'Document fact'));
    expect(restored.valid).toBe(true);
    expect(restored.text).toBe(`Document fact ${documentOne}. Online ${web}.`);
  });

  it.each([
    ['removed', `Online ${web}.`],
    ['retargeted', `Local [Document 1](#allo-doc-different). Online ${web}.`],
    ['renumbered', `Local [Document 4](#allo-doc-lesson-passage-1). Online ${web}.`],
    ['duplicated', `Local ${documentOne} ${documentOne}. Online ${web}.`],
    ['reordered', `Online ${web}. Local ${documentOne}.`],
    ['changed to a web link', `Local [Document 1](https://example.org/document). Online ${web}.`],
  ])('rejects a %s local citation during conservation checks', (_label, rewritten) => {
    expect(dispatcher.validateAdaptationCitationConservation(`Local ${documentOne}. Online ${web}.`, rewritten).valid).toBe(false);
  });

  it('does not treat ordinary document links or invalid local IDs as passage citations', () => {
    const text = [
      '[Document 1](https://example.org/notes)',
      '[Document 1](#section)',
      '[Document 1](#allo-doc-UPPER)',
      '[Document 1](#allo-doc-id_underscores)',
      '[Document 1](#allo-doc-id?other)',
      '[Document 0](#allo-doc-id)',
      '[Document 1]',
    ].join(' ');
    expect(dispatcher.extractAdaptationCitationLedgerLocal(text).entries).toEqual([]);
  });
});

function adaptationHarness({ keepCitations, model }) {
  const state = { shown: null, history: [] };
  const prompts = [];
  const noop = () => {};
  const values = {
    gradeLevel: '5th Grade', history: [], inputText: '', differentiationRange: 'None',
    leveledTextLanguage: 'English', selectedLanguages: [], studentInterests: [], guidedMode: false, guidedStep: 0,
    standardsInput: '', targetStandards: [], standardsPromptString: '', sourceTopic: 'Plants',
    currentUiLanguage: 'English', generatedContent: null, audioRef: { current: null }, alloBotRef: { current: null },
    GUIDED_STEPS: [], keepCitations, isTeacherMode: false,
    leveledTextLength: 'Same as Source', textFormat: 'Standard Text',
    setGeneratedContent: value => { state.shown = typeof value === 'function' ? value(state.shown) : value; },
    setHistory: value => { state.history = typeof value === 'function' ? value(state.history) : value; },
    callGemini: vi.fn(async prompt => {
      const segment = String(prompt).match(/Text Segment: "([\s\S]*)"\s*$/);
      if (!segment) return '';
      prompts.push(String(prompt));
      return model(segment[1]);
    }),
    cleanJson: value => String(value || '').trim(),
    chunkText: value => [String(value || '')],
    countWords: value => String(value || '').split(/\s+/).filter(Boolean).length,
    calculateReadability: () => ({ score: 5, gradeLevel: 5, words: 40, sentences: 4, syllables: 55 }),
    sanitizeTruncatedCitations: value => value,
    normalizeCitationPlacement: value => value,
    extractSourceTextForProcessing: text => ({ text, englishBlock: text, isBilingual: false }),
    getDefaultTitle: type => type,
    t: key => key, warnLog: noop, debugLog: noop, addToast: noop,
    resolveTranslationPolicy: () => ({ enabled: false, target: 'English', mode: 'auto' }),
    repairGeneratedText: async text => text,
    glossaryImageStyle: '', universalImageStyle: '', imageGenerationStyle: '',
  };
  return { state, prompts, deps: new Proxy(values, { get: (target, key) => key in target ? target[key] : noop }) };
}

describe('adaptation Keep citations setting for uploaded documents', () => {
  const source = `Plants use light to grow ${documentOne}. Researchers study leaves ${web}.`;

  it('keeps local passage links in the saved adaptation and citation audit', async () => {
    const h = adaptationHarness({ keepCitations: true, model: segment => segment.replace('use light', 'need light') });
    const saved = await dispatcher.handleGenerate('simplified', null, false, source, {}, true, h.deps);
    expect(h.prompts[0]).toContain('⟦ALLOFLOW_CITATION_0001⟧');
    expect(h.prompts[0]).not.toContain('#allo-doc-lesson-passage-1');
    expect(saved.data).toContain('need light');
    expect(saved.data).toContain(documentOne);
    expect(saved.data).toContain(web);
    expect(saved.data).not.toContain('⟦ALLOFLOW_CITATION_');
    expect(saved.config.citationAudit.sourceCitationCount).toBe(2);
  });

  it('strips local and web citations before the request and if a model reintroduces them', async () => {
    const h = adaptationHarness({ keepCitations: false, model: segment => `${segment} ${documentTwo} ${web}` });
    const saved = await dispatcher.handleGenerate('simplified', null, false, source, {}, true, h.deps);
    expect(h.prompts[0]).not.toContain('#allo-doc-');
    expect(h.prompts[0]).not.toContain('https://example.org');
    expect(saved.data).toContain('Plants use light to grow');
    expect(saved.data).not.toContain('[Document');
    expect(saved.data).not.toContain('#allo-doc-');
    expect(saved.data).not.toContain('[⁽');
    expect(saved.config.citationAudit.enabled).toBe(false);
  });

  it('retains the source if a model repeatedly drops the protected local citation', async () => {
    const h = adaptationHarness({ keepCitations: true, model: segment => segment.replace('⟦ALLOFLOW_CITATION_0001⟧', '') });
    const saved = await dispatcher.handleGenerate('simplified', null, false, source, {}, true, h.deps);
    expect(h.prompts).toHaveLength(2);
    expect(saved.data).toContain(documentOne);
    expect(saved.config.citationAudit.status).toBe('fallback-used');
  });
});

describe('uploaded document reference appendices during adaptation', () => {
  const reading = `Plants need light to grow ${documentOne}.`;
  const appendix = [
    '### Your Document References',
    '',
    '1 document cited; 2 passages supplied.',
    '',
    `${documentOne} — Plant notes, page 4`,
    '',
    '> This exact supporting passage belongs only in the document references.',
    '> Keep the quoted wording and its line break unchanged.',
  ].join('\n');

  it('separates the document-only appendix from reading prose', () => {
    expect(dispatcher.splitAdaptationReferences(`${reading}\n\n${appendix}`)).toEqual({
      body: reading, references: appendix, header: '### Your Document References',
    });
  });

  it('retains combined web and document reference sections as one verbatim trailer', () => {
    const combined = `### Source Text References\n\n1. [Web source](https://example.org)\n\n${appendix}`;
    const result = dispatcher.splitAdaptationReferences(`${reading}\n\n${combined}`);
    expect(result.body).toBe(reading);
    expect(result.references).toBe(combined);
  });

  it('ignores a document-reference heading used inside a fenced example', () => {
    const example = '```markdown\n### Your Document References\nExample prose.\n```';
    const result = dispatcher.splitAdaptationReferences(`${example}\n\n${reading}\n\n${appendix}`);
    expect(result.body).toBe(`${example}\n\n${reading}`);
    expect(result.references).toBe(appendix);
  });

  it.each([true, false])('never sends appendix passages for adaptation when Keep citations is %s', async keepCitations => {
    const h = adaptationHarness({ keepCitations, model: segment => segment.replace('need light', 'use sunlight') });
    const saved = await dispatcher.handleGenerate('simplified', null, false, `${reading}\n\n${appendix}`, {}, true, h.deps);
    expect(h.prompts.length).toBeGreaterThan(0);
    for (const prompt of h.prompts) {
      expect(prompt).not.toContain('This exact supporting passage');
      expect(prompt).not.toContain('1 document cited; 2 passages supplied.');
      expect(prompt).not.toContain('### Your Document References');
    }
    expect(saved.data).toContain('Plants use sunlight to grow');
    expect(saved.config.citationAudit.sourceCitationCount).toBe(1);
    if (keepCitations) {
      expect(saved.data.endsWith(appendix)).toBe(true);
      expect(saved.data.split('### Your Document References')).toHaveLength(2);
      expect(saved.data.split('This exact supporting passage')).toHaveLength(2);
      expect(saved.data).toContain(documentOne);
    } else {
      expect(saved.data).not.toContain('### Your Document References');
      expect(saved.data).not.toContain('This exact supporting passage');
      expect(saved.data).not.toContain(documentOne);
    }
  });
});
