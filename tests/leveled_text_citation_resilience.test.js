import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let dispatcher;
let generationHelpers;
let chunkText;
const root = process.cwd();

function loadChunkTextFromHost() {
  const source = readFileSync(resolve(root, 'AlloFlowANTI.txt'), 'utf8');
  const start = source.indexOf('  const chunkText = (value, maxLength) => {');
  const end = source.indexOf('\n  const handleAiUrlSearch', start);
  if (start < 0 || end < 0) throw new Error('Unable to locate chunkText in AlloFlowANTI.txt');
  const declaration = source.slice(start, end).replace('  const chunkText', 'const chunkText');
  return new Function(`${declaration}\nreturn chunkText;`)();
}

beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('generation_helpers_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  generationHelpers = window.AlloModules?.GenerationHelpers;
  dispatcher = window.AlloModules?.GenDispatcher;
  chunkText = loadChunkTextFromHost();
  if (!dispatcher || !generationHelpers) throw new Error('Citation pipeline modules failed to register');
});

describe('Leveled Text reference trailer contract', () => {
  it.each([
    '## Referenced Sources',
    '###### Works Cited:',
    '### Referencias',
  ])('recognizes broad reference header %s', (heading) => {
    const input = [
      'A claim with evidence. [⁽¹⁾](https://example.org/a)',
      '',
      heading,
      '1. [Example](https://example.org/a)',
    ].join('\n');

    const split = dispatcher.splitAdaptationReferences(input);
    expect(split.body).toBe('A claim with evidence. [⁽¹⁾](https://example.org/a)');
    expect(split.references).toContain(heading);
  });

  it('migrates legacy references-before-English without losing the English block', () => {
    const legacy = [
      'Texto adaptado. [⁽¹⁾](https://example.org/a)',
      '',
      '### Source Text References',
      '1. [Example](https://example.org/a)',
      '',
      '--- ENGLISH TRANSLATION ---',
      '',
      'Adapted text. [⁽¹⁾](https://example.org/a)',
    ].join('\n');

    const split = dispatcher.splitAdaptationReferences(legacy);
    expect(split.body).toContain('Texto adaptado.');
    expect(split.body).toContain('--- ENGLISH TRANSLATION ---');
    expect(split.body).toContain('Adapted text.');
    expect(split.references).toContain('1. [Example]');
    expect(split.references).not.toContain('ENGLISH TRANSLATION');
  });

  it('ignores reference headings and English delimiters inside fenced examples', () => {
    const input = [
      'Texto adaptado. [???](https://example.org/a)',
      '```markdown',
      '### References',
      '1. [Fake](https://fake.example)',
      '```',
      '### Source Text References',
      '1. [Real](https://example.org/a)',
      '```text',
      '--- ENGLISH TRANSLATION ---',
      '```',
      '--- ENGLISH TRANSLATION ---',
      'English text. [???](https://example.org/a)',
    ].join('\n');

    const split = dispatcher.splitAdaptationReferences(input);
    expect(split.body).toContain('Texto adaptado.');
    expect(split.body).toContain('English text.');
    expect(split.references).toContain('1. [Real]');
    expect(split.references).not.toContain('1. [Fake]');
  });

  it('always composes references after both language bodies', () => {
    const references = '### Source Text References\n1. [Example](https://example.org/a)';
    const document = dispatcher.composeAdaptedLeveledText(
      'Texto adaptado. [⁽¹⁾](https://example.org/a)',
      'Adapted text. [⁽¹⁾](https://example.org/a)',
      references,
      true,
    );

    expect(document.indexOf('Texto adaptado.')).toBeLessThan(document.indexOf('ENGLISH TRANSLATION'));
    expect(document.indexOf('Adapted text.')).toBeLessThan(document.indexOf('Source Text References'));
    expect(document.endsWith('1. [Example](https://example.org/a)')).toBe(true);
  });
});

describe('Leveled Text citation conservation', () => {
  const first = '[⁽¹⁾](https://en.wikipedia.org/wiki/Function_(mathematics))';
  const second = '[⁽²⁾](https://example.org/research?id=2)';

  it('parses balanced parentheses in citation URLs without truncation', () => {
    const ledger = dispatcher.extractAdaptationCitationLedgerLocal(`Claim. ${first}`);
    expect(ledger.entries).toHaveLength(1);
    expect(ledger.entries[0].marker).toBe(first);
    expect(ledger.entries[0].url).toBe('https://en.wikipedia.org/wiki/Function_(mathematics)');
  });

  it('rejects missing, changed, duplicated, and reordered citation occurrences', () => {
    const original = `First claim. ${first} Second claim. ${second}`;
    expect(dispatcher.validateAdaptationCitationConservation(original, original).valid).toBe(true);
    expect(dispatcher.validateAdaptationCitationConservation(original, `First claim. ${first}`).valid).toBe(false);
    expect(dispatcher.validateAdaptationCitationConservation(original, `${original} ${first}`).valid).toBe(false);
    expect(dispatcher.validateAdaptationCitationConservation(
      original,
      `First claim. [⁽¹⁾](https://evil.example/change) Second claim. ${second}`,
    ).valid).toBe(false);
    const reordered = dispatcher.validateAdaptationCitationConservation(
      original,
      `Second claim. ${second} First claim. ${first}`,
    );
    expect(reordered.valid).toBe(false);
    expect(reordered.orderChanged).toBe(true);
  });

  it('restores exact protected markers and rejects a dropped token', () => {
    const original = `First claim. ${first} Second claim. ${second}`;
    const envelope = dispatcher.protectAdaptationCitations(original);
    expect(envelope.text).not.toContain('wikipedia.org');
    expect(envelope.citations).toHaveLength(2);

    const safe = dispatcher.restoreProtectedAdaptationCitations(envelope, envelope.text);
    expect(safe.valid).toBe(true);
    expect(safe.text).toBe(original);

    const dropped = envelope.text.replace(envelope.citations[0].token, '');
    expect(dispatcher.restoreProtectedAdaptationCitations(envelope, dropped).valid).toBe(false);
  });
});

describe('citation-aware chunking', () => {
  it.each([
    ['Markdown citation', '[⁽¹⁾](https://en.wikipedia.org/wiki/Function_(mathematics))'],
    ['bare URL', 'https://example.org/research/a.long.path?source=alloflow&grade=5'],
  ])('never splits an atomic %s', (_label, atomicValue) => {
    const chunks = chunkText(`Opening words before the source ${atomicValue} and a final explanatory sentence.`, 38);
    const containing = chunks.filter(chunk => chunk.includes(atomicValue) || atomicValue.includes(chunk));
    expect(containing).toHaveLength(1);
    expect(containing[0]).toContain(atomicValue);
  });

  it('keeps a fenced code block in one model chunk even when it exceeds the limit', () => {
    const fence = '```js\nconst source = "https://example.org/a.b/c";\nconsole.log(source);\n```';
    const chunks = chunkText(`Intro sentence.\n\n${fence}\n\nClosing explanation.`, 30);
    const fencedChunks = chunks.filter(chunk => chunk.includes('```'));
    expect(fencedChunks).toHaveLength(1);
    expect(fencedChunks[0]).toContain(fence);
  });
});

describe('adaptation flow wiring', () => {
  it('retranslates accepted length repairs and snapshots audits on every final item', () => {
    const source = readFileSync(resolve(root, 'generate_dispatcher_source.jsx'), 'utf8');
    expect(source).toContain("translateCitationSafe(repaired, 'length-repair-translation')");
    expect(source).toContain('config: { ..._itemConfig, citationAudit: citationAuditSnapshot() }');
    expect(source).not.toContain('currentTargetDisplay += `\\n\\n${extractedReferences}`');
  });
});

describe('complexity adjustment citation contract', () => {
  const citation = '[⁽¹⁾](https://example.org/research_(verified))';
  const references = '### Source Text References\n1. [Verified research](https://example.org/research_(verified))';
  const originalData = [
    `Texto original. ${citation}`,
    '',
    '--- ENGLISH TRANSLATION ---',
    '',
    `Original text. ${citation}`,
    '',
    references,
  ].join('\n');

  function makeDeps(candidate, overrides = {}) {
    const setGeneratedContent = vi.fn();
    const setHistory = vi.fn();
    const addToast = vi.fn();
    const generatedContent = {
      id: 'resource-1',
      type: 'simplified',
      title: 'Leveled Text',
      data: originalData,
      config: {
        language: 'Spanish',
        customSetting: 'preserved',
        citationAudit: {
          version: 1,
          policy: 'exact-marker-sequence-with-protected-tokens',
          stages: [{ stage: 'initial-adaptation', valid: true }],
        },
      },
    };
    return {
      deps: {
        complexityLevel: 4,
        generatedContent,
        gradeLevel: 'Grade 5',
        leveledTextLanguage: 'Spanish',
        saveOriginalOnAdjust: true,
        generatedTerms: [],
        setIsProcessing: vi.fn(),
        setGeneratedContent,
        setHistory,
        setError: vi.fn(),
        setComplexityLevel: vi.fn(),
        setWordSoundsCustomTerms: vi.fn(),
        setWsPreloadedWords: vi.fn(),
        callGemini: vi.fn(),
        cleanJson: value => value,
        addToast,
        t: key => key,
        warnLog: vi.fn(),
        extractSourceTextForProcessing: window.AlloModules.TextPipelineHelpers.extractSourceTextForProcessing,
        generateBilingualText: vi.fn(async () => candidate),
        getDefaultTitle: () => 'Leveled Text',
        ...overrides,
      },
      setGeneratedContent,
      setHistory,
      addToast,
    };
  }

  it('keeps references after both languages and retains prior config/audit on a saved version', async () => {
    const candidate = [
      `Texto revisado. ${citation}`,
      '',
      '--- ENGLISH TRANSLATION ---',
      '',
      `Revised text. ${citation}`,
      '',
      '## Bibliography',
      '1. [Model-added list](https://discard.example)',
    ].join('\n');
    const harness = makeDeps(candidate);

    await generationHelpers.handleComplexityAdjustment(harness.deps);

    expect(harness.setGeneratedContent).toHaveBeenCalledTimes(1);
    const saved = harness.setGeneratedContent.mock.calls[0][0];
    expect(saved.data).toContain('Texto revisado.');
    expect(saved.data.indexOf('Revised text.')).toBeLessThan(saved.data.indexOf('Source Text References'));
    expect(saved.data).toContain(references);
    expect(saved.data).not.toContain('discard.example');
    expect(saved.config.customSetting).toBe('preserved');
    expect(saved.config.citationAudit.stages).toHaveLength(2);
    expect(saved.config.citationAudit.stages.at(-1)).toMatchObject({ stage: 'complexity-adjustment', valid: true });
  });

  it('rejects a complexity rewrite that changes a citation URL', async () => {
    const candidate = `Texto revisado. [⁽¹⁾](https://changed.example)\n\n--- ENGLISH TRANSLATION ---\n\nRevised. ${citation}`;
    const harness = makeDeps(candidate, { saveOriginalOnAdjust: false });
    await generationHelpers.handleComplexityAdjustment(harness.deps);
    expect(harness.setGeneratedContent).not.toHaveBeenCalled();
    expect(harness.addToast).toHaveBeenCalledWith(
      'The adjustment changed a source citation, so the original citation-safe version was retained.',
      'warning',
    );
  });

  it('rejects a changed citation in a newly generated English block', async () => {
    const monolingualOriginal = `Texto original. ${citation}\n\n${references}`;
    const candidate = [
      `Texto revisado. ${citation}`,
      '',
      '--- ENGLISH TRANSLATION ---',
      '',
      'Revised text. [????????](https://changed.example)',
    ].join('\n');
    const harness = makeDeps(candidate, {
      saveOriginalOnAdjust: false,
      generatedContent: {
        id: 'resource-monolingual',
        type: 'simplified',
        title: 'Monolingual cited text',
        data: monolingualOriginal,
        config: { language: 'Spanish', citationAudit: { version: 1, stages: [] } },
      },
    });

    await generationHelpers.handleComplexityAdjustment(harness.deps);

    expect(harness.setGeneratedContent).not.toHaveBeenCalled();
    expect(harness.setHistory).not.toHaveBeenCalled();
  });

  it('fails closed when complexity adjustment reorders distinct citations', async () => {
    const second = '[⁽²⁾](https://example.org/second)';
    const orderedOriginal = [
      `Primero. ${citation} Segundo. ${second}`,
      '',
      '--- ENGLISH TRANSLATION ---',
      '',
      `First. ${citation} Second. ${second}`,
      '',
      references,
    ].join('\n');
    const reorderedCandidate = [
      `Segundo. ${second} Primero. ${citation}`,
      '',
      '--- ENGLISH TRANSLATION ---',
      '',
      `Second. ${second} First. ${citation}`,
    ].join('\n');
    const harness = makeDeps(reorderedCandidate, {
      saveOriginalOnAdjust: false,
      generatedContent: {
        id: 'resource-ordered',
        type: 'simplified',
        title: 'Ordered citations',
        data: orderedOriginal,
        config: { language: 'Spanish', citationAudit: { version: 1, stages: [] } },
      },
    });
    await generationHelpers.handleComplexityAdjustment(harness.deps);
    expect(harness.setGeneratedContent).not.toHaveBeenCalled();
  });

  it('fails closed for cited text when citation validators are unavailable during module skew', async () => {
    const savedDispatcher = window.AlloModules.GenDispatcher;
    const pipeline = window.AlloModules.TextPipelineHelpers;
    const savedValidate = pipeline.validateCitationConservation;
    const savedLedger = pipeline.extractCitationLedger;
    try {
      window.AlloModules.GenDispatcher = {
        ...savedDispatcher,
        validateAdaptationCitationConservation: undefined,
      };
      pipeline.validateCitationConservation = undefined;
      pipeline.extractCitationLedger = undefined;
      const harness = makeDeps(originalData, { saveOriginalOnAdjust: false });

      await generationHelpers.handleComplexityAdjustment(harness.deps);

      expect(harness.setGeneratedContent).not.toHaveBeenCalled();
      expect(harness.addToast).toHaveBeenCalledWith(
        'The adjustment changed a source citation, so the original citation-safe version was retained.',
        'warning',
      );
    } finally {
      window.AlloModules.GenDispatcher = savedDispatcher;
      pipeline.validateCitationConservation = savedValidate;
      pipeline.extractCitationLedger = savedLedger;
    }
  });
});
