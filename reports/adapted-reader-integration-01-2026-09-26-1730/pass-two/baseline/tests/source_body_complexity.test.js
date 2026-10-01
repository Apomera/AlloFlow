import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const Evaluator = require('../dev-tools/evaluate_text_complexity_calibration.cjs');
let Context;

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  Context = window.AlloModules.InstructionalContext;
  if (!Context) throw new Error('InstructionalContext failed to register');
});

describe('canonical generated-source body extraction', () => {
  it('removes generated chrome and headings while preserving prose and inline anchors', () => {
    const artifact = [
      '# The Water Cycle',
      '',
      '## Sunlight Starts the Trip',
      '',
      'Water rises when sunlight warms it. [NASA explains evaporation](https://science.nasa.gov/water/).',
      'References in a paragraph remain ordinary prose.',
      '',
      '## Sources of Energy',
      '',
      'Sunlight is one source of energy for the cycle.',
      '',
      '### Source Text References',
      '',
      '*These links were surfaced by AI-assisted search.*',
      '',
      '1. [NASA](https://science.nasa.gov/water/)',
      '',
      '*Source-support check (automated, from the grounding engine\'s own map): 100%.*',
    ].join('\n');

    const body = Context.extractMeasurableSourceBody(artifact);

    expect(body).toBe([
      'Water rises when sunlight warms it. [NASA explains evaporation](https://science.nasa.gov/water/).',
      'References in a paragraph remain ordinary prose.',
      '',
      'Sunlight is one source of energy for the cycle.',
    ].join('\n'));
    expect(body).toContain('[NASA explains evaporation](https://science.nasa.gov/water/)');
    expect(body).not.toContain('Source Text References');
    expect(Context.extractMeasurableSourceBody(body)).toBe(body);
  });

  it('recognizes the legacy title wrapper and standalone AI/support footers without overmatching prose', () => {
    const artifact = [
      'Title: Clouds',
      '',
      '## Clouds and Rain',
      '',
      'About this document, the class has two questions. Sources can help answer them.',
      '',
      '---',
      '',
      '*About this document: drafted with AI assistance without source citations enabled. Facts have not been verified.*',
    ].join('\n');
    expect(Context.extractMeasurableSourceBody(artifact)).toBe([
      'About this document, the class has two questions. Sources can help answer them.',
    ].join('\n'));

    const supportOnly = '# Clouds\n\nClouds hold tiny drops.\n\n*Source-support check (automated, from the grounding engine\'s own map): 80%.*';
    expect(Context.extractMeasurableSourceBody(supportOnly)).toBe('Clouds hold tiny drops.');
  });
});

describe('source-body Flesch-Kincaid evidence', () => {
  it('keeps the app-authored disclosure from contaminating the canonical score', () => {
    const body = 'Water evaporates when sunlight warms a lake. The vapor rises, cools, and forms tiny droplets in clouds. Gravity eventually pulls the water back to Earth as rain or snow.';
    const artifact = '# The Water Cycle\n\n' + body
      + '\n\n---\n\n*About this document: drafted with AI assistance without source citations enabled. Facts, figures, and quotations have not been verified against cited sources — review for accuracy before classroom use.*\n';

    const metrics = Context.measureSourceComplexity(artifact, Evaluator.calculateReadability);

    expect(metrics.score).toBe('5.7');
    expect(metrics.bodyFingerprint).toBe(Context.fingerprintText(body));
    expect(metrics.legacyArtifactMetrics.score).toBe('7.4');
    expect(metrics.legacyArtifactMetrics.score).not.toBe(metrics.score);
  });

  it('keeps unclamped body math, clamped display grade, body counts, and both fingerprints', () => {
    const artifact = '# Tiny Text\n\n## Main Idea\n\nBirds fly. Fish swim.\n\n---\n\n*About this document: drafted with AI assistance.*';
    const expectedBody = 'Birds fly. Fish swim.';
    const calculateReadability = vi.fn((text) => text === artifact
      ? { score: '18.0', words: 40, sentences: 1, syllables: 80 }
      : { score: '0.0', words: 4, sentences: 2, syllables: 4 });

    const metrics = Context.measureSourceComplexity(artifact, calculateReadability);

    expect(calculateReadability).toHaveBeenNthCalledWith(1, artifact);
    expect(calculateReadability).toHaveBeenNthCalledWith(2, expectedBody);
    expect(metrics).toMatchObject({
      measurementVersion: Context.SOURCE_COMPLEXITY_MEASUREMENT_VERSION,
      extractionVersion: Context.SOURCE_BODY_EXTRACTION_VERSION,
      measurementScope: 'source-body',
      method: 'flesch-kincaid-en',
      score: '0.0',
      displayFleschKincaidGrade: 0,
      averageSentenceLength: 2,
      averageSyllablesPerWord: 1,
      words: 4,
      sentences: 2,
      syllables: 4,
      bodyCounts: { characters: expectedBody.length, words: 4, sentences: 2, syllables: 4 },
      artifactFingerprint: Context.fingerprintText(artifact),
      bodyFingerprint: Context.fingerprintText(expectedBody),
      legacyArtifactMetrics: { score: '18.0', words: 40, sentences: 1, syllables: 80 },
    });
    expect(metrics.rawFleschKincaidGrade).toBeCloseTo(-3.01, 8);
    expect(metrics.bodyCharacterCount).toBe(expectedBody.length);
    expect(metrics.artifactCharacterCount).toBe(artifact.length);
    expect(JSON.stringify(metrics)).not.toContain('Birds fly');
  });

  it('keeps body metrics and fingerprint invariant when standalone headings change', () => {
    const prose = 'Water warms in sunlight. [NASA describes evaporation](https://science.nasa.gov/water/).\n\nWater vapor cools and forms clouds.';
    const headed = '# The Water Cycle\n\n## Rising Water\n\n' + prose.split('\n\n')[0]
      + '\n\n### New Clouds\n\n' + prose.split('\n\n')[1];
    const count = (text) => {
      const words = text.match(/[A-Za-z]+/g) || [];
      const sentences = text.match(/[.!?]+/g) || [];
      return { score: '1.0', words: words.length, sentences: sentences.length, syllables: words.length };
    };

    expect(Context.extractMeasurableSourceBody(headed)).toBe(prose);
    expect(Context.extractMeasurableSourceBody(prose)).toBe(prose);
    const headedMetrics = Context.measureSourceComplexity(headed, count);
    const plainMetrics = Context.measureSourceComplexity(prose, count);

    expect(headedMetrics.bodyFingerprint).toBe(plainMetrics.bodyFingerprint);
    expect(headedMetrics.bodyCounts).toEqual(plainMetrics.bodyCounts);
    expect(headedMetrics.rawFleschKincaidGrade).toBe(plainMetrics.rawFleschKincaidGrade);
    expect(headedMetrics.score).toBe(plainMetrics.score);
    expect(headedMetrics.artifactFingerprint).not.toBe(plainMetrics.artifactFingerprint);
  });

  it('retains an above-ceiling raw grade while clamping only the display score', () => {
    const calculateReadability = vi.fn(() => ({ score: '18.0', words: 40, sentences: 1, syllables: 80 }));
    const metrics = Context.measureSourceComplexity('Dense prose remains measurable.', calculateReadability);

    expect(calculateReadability).toHaveBeenCalledTimes(1);
    expect(metrics.rawFleschKincaidGrade).toBeCloseTo(23.61, 8);
    expect(metrics.displayFleschKincaidGrade).toBe(18);
    expect(metrics.score).toBe('18.0');
  });

  it('persists rich evidence on the instructional-text record and clears it when stale', () => {
    const artifact = '# Plants\n\nPlants need light. They also need water.';
    const metrics = Context.measureSourceComplexity(
      artifact,
      () => ({ score: '0.0', words: 8, sentences: 2, syllables: 9 }),
    );
    const base = Context.normalizeInstructionalText({
      role: 'primary',
      form: 'original',
      designationSource: 'workflow-default',
      complexity: { requestedGrade: '5th Grade', language: 'English' },
    });
    const measured = Context.withComplexityEvidence(base, {
      ...metrics,
      requestedGrade: '5th Grade',
      measuredGrade: metrics.score,
      language: 'English',
    }, artifact);

    expect(measured.complexity).toMatchObject({
      measuredGrade: 0,
      status: 'below-target',
      measurementScope: 'source-body',
      rawFleschKincaidGrade: metrics.rawFleschKincaidGrade,
      bodyCounts: metrics.bodyCounts,
      contentFingerprint: Context.fingerprintText(artifact),
      artifactFingerprint: metrics.artifactFingerprint,
      bodyFingerprint: metrics.bodyFingerprint,
      legacyArtifactMetrics: metrics.legacyArtifactMetrics,
    });

    const stale = Context.invalidateComplexityEvidence(measured, artifact + ' Edited.', 'stale');
    expect(stale.complexity).toMatchObject({
      measuredGrade: null,
      status: 'stale',
      measurementScope: '',
      rawFleschKincaidGrade: null,
      bodyCounts: null,
      artifactFingerprint: '',
      bodyFingerprint: '',
      legacyArtifactMetrics: null,
    });
  });

  it('does not coerce explicitly unmeasured body metrics to zero', () => {
    const complexity = Context.normalizeComplexity({
      requestedGrade: '5th Grade',
      language: 'English',
      measurementVersion: Context.SOURCE_COMPLEXITY_MEASUREMENT_VERSION,
      rawFleschKincaidGrade: null,
      displayFleschKincaidGrade: '',
      bodyCounts: { characters: null, words: '', sentences: undefined, syllables: null },
    });

    expect(complexity.rawFleschKincaidGrade).toBeNull();
    expect(complexity.displayFleschKincaidGrade).toBeNull();
    expect(complexity.bodyCounts).toEqual({
      characters: null,
      words: null,
      sentences: null,
      syllables: null,
    });
  });

  it('routes generated sources through the shared body measurement contract', () => {
    const source = readFileSync('content_engine_source.jsx', 'utf8');

    expect(source).toContain('instructionalContextModule.measureSourceComplexity(finalText, calculateReadability)');
    expect(source).toContain('measurementScope: measured && measured.measurementScope');
    expect(source).toContain('bodyFingerprint: measured && measured.bodyFingerprint');
    expect(source).toContain('legacyArtifactComplexity: measured && measured.legacyArtifactMetrics || null');
  });
});
