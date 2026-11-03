import { createRequire } from 'node:module';
// Host files (ANTI, its mirror, App.jsx) come back with the code moved out of them (host_handlers_source.jsx,
// allo_command_context_source.js, CDN view sources) put back; every other file reads unchanged.
import { readFileSync } from './helpers/host_source.js';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const Evaluator = require('../dev-tools/evaluate_text_complexity_calibration.cjs');
const fixture = require('./fixtures/text_complexity_calibration.json');

const loadHostReadability = () => {
  const hostWindow = { AlloModules: {}, React: require('../desktop/web-app/node_modules/react') };
  new Function('window', readFileSync('host_handlers_module.js', 'utf8'))(hostWindow);
  return hostWindow.AlloModules.createHostHandlers({}).calculateReadability;
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
    const hostReadability = loadHostReadability();
    const englishSamples = fixture.samples.filter((sample) => sample.language === 'English');

    const wrapped = "A teacher’s example wraps\nwithout starting another sentence.";
    expect(Evaluator.calculateReadability(wrapped)).toEqual(hostReadability(wrapped.replace('\n', ' ')));
    for (const [text] of [["The solution contained 3.5 grams of dissolved salt in a small container.",1],["Dr. Rivera carefully observed the plant as it grew toward the sunlight.",1],["Prof. Green and Ms. Rivera measured 0.25 liters. The water was clear.",2],["J. R. Tolkien wrote this story. We read it.",2],["The U.S. government published a report. Read the report.",2],["He moved to the U.S. We wrote to him.",2],["Try vegetables, e.g. carrots, in the soup. Mix them in.",2],["Bring paper, pencils, etc. We will begin soon.",2],["Read Fig. 2 and compare the results.",1]]) expect(Evaluator.calculateReadability(text)).toEqual(hostReadability(text));
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
