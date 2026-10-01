import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const Evaluator = require('../dev-tools/evaluate_text_complexity_calibration.cjs');
const fixture = require('./fixtures/text_complexity_calibration.json');

const extractHostReadability = () => {
  const hostPaths = ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
  let source = '';
  let start = -1;
  let end = -1;
  for (const hostPath of hostPaths) {
    source = readFileSync(hostPath, 'utf8');
    start = source.indexOf('const calculateReadability = (text) => {');
    end = source.indexOf('\n  const getStructureForLength =', start);
    if (start >= 0 && end > start) break;
  }
  if (start < 0 || end <= start) throw new Error('Unable to extract calculateReadability from an application host');
  // eslint-disable-next-line no-new-func
  return new Function(`${source.slice(start, end)}\nreturn calculateReadability;`)();
};

describe('offline text-complexity calibration evaluator', () => {
  it('locks aliases and every internal calibration band while preserving the requested grade', () => {
    const report = Evaluator.evaluateCalibrationFixtures(fixture);

    expect(report.aliases).toHaveLength(16);
    expect(report.aliases.every((entry) => entry.pass)).toBe(true);
    expect(report.bands).toHaveLength(12);
    expect(report.bands.every((entry) => entry.pass)).toBe(true);
    expect(report.bands).toEqual(expect.arrayContaining([
      expect.objectContaining({ requestedGrade: '5th Grade', promptGrade: '3rd Grade' }),
      expect.objectContaining({ requestedGrade: '8th Grade', promptGrade: '5th Grade' }),
      expect.objectContaining({ requestedGrade: '12th Grade', promptGrade: '8th Grade' }),
    ]));
  });

  it('derives measured status through the shared contract and fingerprints the exact fixture text', () => {
    const report = Evaluator.evaluateCalibrationFixtures(fixture);

    expect(report.summary.passed).toBe(true);
    expect(report.samples).toHaveLength(6);
    for (const sample of report.samples) {
      expect(sample.checks.statusConsistency, sample.id).toBe(true);
      expect(sample.checks.contentFingerprint, sample.id).toBe(true);
      expect(sample.evidence.contentFingerprint).toMatch(/^txt-[0-9a-f]{8}-\d+$/);
    }
    const spanish = report.samples.find((sample) => sample.id === 'non-english-no-fk-claim');
    expect(spanish.readability).toBeNull();
    expect(spanish.evidence).toMatchObject({
      measuredGrade: null,
      method: '',
      status: 'unavailable',
    });
  });

  it('stays in parity with the production offline readability implementation', () => {
    const hostReadability = extractHostReadability();
    const englishSamples = fixture.samples.filter((sample) => sample.language === 'English');

    for (const sample of englishSamples) {
      expect(Evaluator.calculateReadability(sample.text), sample.id).toEqual(hostReadability(sample.text));
    }
  });

  it('groups provider/model dimensions from supported provenance shapes', () => {
    const report = Evaluator.evaluateCalibrationFixtures(fixture);

    expect(report.summary.missingProviderModel).toEqual([]);
    expect(report.summary.byProviderModel).toMatchObject({
      'offline-fixture/synthetic-text-v1': 2,
      'offline-fixture/synthetic-text-v2': 1,
      'offline-local/fixture-8b': 2,
      'offline-fixture/synthetic-multilingual-v1': 1,
    });
  });

  it('captures bounded provider/model dimensions on both generated-source paths', () => {
    const contentEngine = readFileSync('content_engine_source.jsx', 'utf8');
    const host = readFileSync('AlloFlowANTI.txt', 'utf8');

    expect(contentEngine).toContain('provider: String(aiProviderProfile');
    expect(contentEngine).toContain('model: String(aiProviderProfile');
    expect(contentEngine).toContain('.slice(0, 120)');
    expect(contentEngine).toContain('.slice(0, 160)');
    expect(host).toContain("provider: String(_aiConfig?.backend || 'gemini').toLowerCase()");
    expect(host).toContain("model: String(_aiConfig?.models?.default || _aiConfig?.models?.text || _aiConfig?.models?.flash || '')");
  });

  it('accepts a provider/model resolver hook and fails strict samples when metadata is absent', () => {
    const hook = vi.fn(() => ({ providerId: 'captured-provider', modelId: 'captured-model' }));
    const sample = {
      id: 'hooked-sample',
      requestedGrade: 'Grade 4',
      language: 'English',
      text: 'A river carries small pieces of rock toward the ocean.',
      expected: { requireProviderModel: true },
    };
    const hooked = Evaluator.evaluateSample(sample, { resolveGenerationMetadata: hook });
    const missing = Evaluator.evaluateSample(sample);

    expect(hook).toHaveBeenCalledWith(sample);
    expect(hooked.generation).toEqual({
      provider: 'captured-provider',
      model: 'captured-model',
      complete: true,
    });
    expect(hooked.pass).toBe(true);
    expect(missing.checks.providerModel).toBe(false);
    expect(missing.pass).toBe(false);
  });

  it('runs the checked-in fixture through the read-only CLI API', () => {
    const report = Evaluator.evaluateFixtureFile(Evaluator.DEFAULT_FIXTURE_PATH);
    const human = Evaluator.formatHumanReport(report);

    expect(report.summary.passed).toBe(true);
    expect(human).toContain('Text complexity calibration: PASS');
    expect(human).toContain('empirical-undershoot/v1');
    expect(human).toContain('offline-local/fixture-8b=2');
  });
});
