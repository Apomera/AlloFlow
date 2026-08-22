import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const HOST_PATHS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
  'desktop/web-app/src/AlloFlowANTI.txt',
];

const FIRST = '[\u207d\u00b9\u207e](https://example.org/one)';
const SECOND = '[\u207d\u00b2\u207e](https://example.org/two)';
let pipeline;
let dispatcher;
let regenerateWithRigor;
const require = createRequire(import.meta.url);

const makeHandler = deps => () => regenerateWithRigor(deps);

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  global.React = window.React = React;
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  loadAlloModule('view_simplified_module.js');
  pipeline = window.AlloModules?.TextPipelineHelpers;
  dispatcher = window.AlloModules?.GenDispatcher;
  regenerateWithRigor = window.AlloModules?.SimplifiedView?.regenerateWithRigor;
  if (!pipeline || !dispatcher || typeof regenerateWithRigor !== 'function') {
    throw new Error('Citation or SimplifiedView rigor modules failed to register');
  }
});

function makeHarness(candidate, options = {}) {
  const references = options.references || [
    '### Source Text References',
    '',
    '*AI-assisted sources; verify before citing.*',
    '',
    '1. [Original source](https://example.org/one)',
  ].join('\n');
  const originalBody = options.originalBody || `First claim. ${FIRST} Second claim. ${SECOND}`;
  const originalData = options.originalData || `${originalBody}\n\n${references}`;
  const generatedContent = {
    id: 'leveled-1',
    type: 'simplified',
    title: 'Leveled Text',
    data: originalData,
    alignmentCheck: { improvement: 'Increase the rigor.' },
    levelCheck: { status: 'checked' },
    config: {
      language: options.language || 'English',
      customSetting: 'preserved',
      citationAudit: {
        version: 1,
        policy: 'exact-marker-order',
        stages: [{ stage: 'initial-adaptation', valid: true }],
      },
    },
  };
  window.AlloModules = options.modules === undefined
    ? { TextPipelineHelpers: pipeline, GenDispatcher: dispatcher }
    : options.modules;
  const setGeneratedContent = vi.fn();
  const setHistory = vi.fn();
  const setIsProcessing = vi.fn();
  const setError = vi.fn();
  const addToast = vi.fn();
  const warnLog = vi.fn();
  const generateBilingualText = vi.fn(async () => candidate);
  const deps = {
    generatedContent,
    setIsProcessing,
    splitReferencesFromBody: pipeline.splitReferencesFromBody,
    extractSourceTextForProcessing: pipeline.extractSourceTextForProcessing,
    gradeLevel: 'Grade 7',
    leveledTextLanguage: options.language || 'English',
    generateBilingualText,
    callGemini: vi.fn(),
    setGeneratedContent,
    setHistory,
    addToast,
    t: (key) => key,
    warnLog,
    setError,
  };
  return {
    run: makeHandler(deps),
    generatedContent,
    references,
    setGeneratedContent,
    setHistory,
    setIsProcessing,
    setError,
    addToast,
    warnLog,
    generateBilingualText,
  };
}

describe('rigor regeneration citation guard', () => {
  it('preserves the original trailer after both bilingual bodies and appends a valid audit stage', async () => {
    const references = [
      '### Source Text References',
      '*Verify this bibliography before citing.*',
      '1. [Original source](https://example.org/one)',
    ].join('\n');
    const originalData = [
      `Texto original. ${FIRST}`,
      '',
      references,
      '',
      '--- ENGLISH TRANSLATION ---',
      '',
      `Original English. ${FIRST}`,
    ].join('\n');
    const candidate = [
      `Texto revisado. ${FIRST}`,
      '',
      '--- ENGLISH TRANSLATION ---',
      '',
      `Revised English. ${FIRST}`,
      '',
      '### Sources',
      '9. [Discarded model source](https://discard.example)',
    ].join('\n');
    const h = makeHarness(candidate, { originalData, references });

    await h.run();

    expect(h.setGeneratedContent).toHaveBeenCalledTimes(1);
    const saved = h.setGeneratedContent.mock.calls[0][0];
    expect(saved.data).toContain('Texto revisado.');
    expect(saved.data.indexOf('Revised English.')).toBeLessThan(saved.data.indexOf('Source Text References'));
    expect(saved.data.endsWith(references)).toBe(true);
    expect(saved.data).not.toContain('discard.example');
    expect(saved.config.customSetting).toBe('preserved');
    expect(saved.config.citationAudit.stages).toHaveLength(2);
    expect(saved.config.citationAudit.stages.at(-1)).toMatchObject({
      stage: 'rigor-regeneration', valid: true, beforeCount: 2, afterCount: 2, orderChanged: false,
    });
    expect(saved.alignmentCheck).toBeUndefined();
    expect(saved.levelCheck).toBeUndefined();
    expect(h.generateBilingualText.mock.calls[0][0]).toContain('Preserve every inline Markdown citation exactly as written');
  });

  it.each([
    ['missing', `First claim. ${FIRST}`],
    ['extra', `First claim. ${FIRST} Second claim. ${SECOND} Again. ${FIRST}`],
    ['changed', `First claim. ${FIRST} Second claim. [\u207d\u00b2\u207e](https://changed.example)`],
    ['reordered', `Second claim. ${SECOND} First claim. ${FIRST}`],
  ])('retains the original when a rewrite has %s citations', async (_label, candidate) => {
    const h = makeHarness(candidate);
    await h.run();

    expect(h.setGeneratedContent).not.toHaveBeenCalled();
    expect(h.setHistory).not.toHaveBeenCalled();
    expect(h.setError).not.toHaveBeenCalled();
    expect(h.addToast).toHaveBeenCalledWith(
      'The rigor rewrite could not preserve and verify every source citation, so the original citation-safe version was retained.',
      'warning',
    );
    expect(h.setIsProcessing.mock.calls.map(call => call[0])).toEqual([true, false]);
  });

  it('rejects a changed citation in a newly generated English block', async () => {
    const originalBody = `Texto original. ${FIRST}`;
    const candidate = [
      `Texto revisado. ${FIRST}`,
      '',
      '--- ENGLISH TRANSLATION ---',
      '',
      'Revised text. [\u207d\u00b9\u207e](https://changed.example)',
    ].join('\n');
    const h = makeHarness(candidate, { originalBody, language: 'Spanish' });

    await h.run();

    expect(h.setGeneratedContent).not.toHaveBeenCalled();
    expect(h.setHistory).not.toHaveBeenCalled();
  });

  it('fails closed when citations exist but neither validator contract is available', async () => {
    const h = makeHarness(`First claim. ${FIRST} Second claim. ${SECOND}`, { modules: {} });
    await h.run();
    expect(h.setGeneratedContent).not.toHaveBeenCalled();
    expect(h.warnLog.mock.calls[0][1]).toMatchObject({ reason: 'citation-validator-unavailable' });
  });

  it('uses the TextPipeline ledger to reject reordered citations when dispatcher validation is absent', async () => {
    const occurrenceLedger = (value) => ({
      occurrences: (String(value).match(/\[\u207d[\u2070\u00b9\u00b2\u00b3\u2074-\u2079]+\u207e\]\([^\n)]+\)/g) || [])
        .map(marker => ({ key: marker })),
    });
    const h = makeHarness(`Second claim. ${SECOND} First claim. ${FIRST}`, {
      modules: { TextPipelineHelpers: {
        validateCitationConservation: () => ({ valid: true }),
        extractCitationLedger: occurrenceLedger,
      } },
    });
    await h.run();
    expect(h.setGeneratedContent).not.toHaveBeenCalled();
    expect(h.warnLog.mock.calls[0][1]).toMatchObject({ orderChanged: true });
  });

  it('allows a citation-free rewrite without validator modules and still records the audit', async () => {
    const h = makeHarness('A more rigorous citation-free rewrite.', {
      modules: {},
      originalBody: 'A citation-free original.',
      originalData: 'A citation-free original.',
      references: '',
    });
    await h.run();
    expect(h.setGeneratedContent).toHaveBeenCalledTimes(1);
    const saved = h.setGeneratedContent.mock.calls[0][0];
    expect(saved.data).toBe('A more rigorous citation-free rewrite.');
    expect(saved.config.citationAudit.stages.at(-1)).toMatchObject({
      stage: 'rigor-regeneration', valid: true, beforeCount: 0, afterCount: 0,
      reason: 'citation-validator-unavailable',
    });
  });

  it('keeps the citation guard in the CDN source and only fail-closed wrappers in every host', () => {
    const moduleSource = readFileSync('view_simplified_source.jsx', 'utf8');
    expect(moduleSource).toContain('splitReferencesFromBody(rawText)');
    expect(moduleSource).toContain('validateAdaptationCitationConservation');
    expect(moduleSource).toContain("unavailable('citation-validator-unavailable')");
    expect(moduleSource).toContain("stage: 'rigor-regeneration'");
    expect(moduleSource).toContain("newText = [candidateBody, originalParts.references]");
    expect(moduleSource).toContain("citationError.code = 'citation-conservation-failed'");
    expect(moduleSource).toContain('SimplifiedView.regenerateWithRigor = regenerateSimplifiedWithRigor');
    for (const path of HOST_PATHS) {
      const host = readFileSync(path, 'utf8');
      expect(host, path).toContain('return api.regenerateWithRigor({');
      expect(host, path).toContain("addToast('Leveled-text alignment tools are still loading. Try again in a moment.', 'info')");
      expect(host, path).not.toContain('const validateRigorCitations = (original, candidate) => {');
    }
  });
});
