import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dispatcherSource = readFileSync(resolve(process.cwd(), 'generate_dispatcher_source.jsx'), 'utf8');
const reportSource = readFileSync(resolve(process.cwd(), 'view_alignment_report_source.jsx'), 'utf8');
const helperPrefix = dispatcherSource.slice(0, dispatcherSource.indexOf('const handleGenerate'));
const helpers = new Function(helperPrefix + `
  return {
    harvestExistingAuditSignals,
    computeContentAccuracy,
    computeContentAccessibility,
    computeDifferentiationCoverage,
    computeAudioCoverage,
    computeVocabularyFit,
    computeReadinessScore,
    normalizeStandardsDimension,
    selectCurriculumArtifacts,
    normalizeAuditLanguageTag
  };
`)();

describe('curriculum audit evidence and certification gates', () => {
  it('withholds content-accuracy certification when no analysis evidence exists', () => {
    const result = helpers.computeContentAccuracy({ accuracyRatings: [] });
    expect(result.status).toBe('Not evaluated');
    expect(result.notEvaluated).toBe(true);
  });

  it('does not treat a caption or title as an image text alternative', () => {
    const result = helpers.computeContentAccessibility([
      { type: 'image', data: { caption: 'A useful caption', title: 'Figure 1' } }
    ], {}, '5');
    expect(result.totalImages).toBe(1);
    expect(result.imagesWithAlt).toBe(0);
    expect(result.altCoveragePct).toBe(0);
    expect(result.status).toBe('Not Aligned');
    expect(result.wcagConformanceAssessment).toBe(false);

    const decorative = helpers.computeContentAccessibility([
      { type: 'analysis', data: { originalText: '<img src="decoration.png" alt="">' } }
    ], {}, '5');
    expect(decorative.imagesWithAlt).toBe(1);
    expect(decorative.status).toBe('Aligned');

    const references = helpers.computeContentAccessibility([
      { type: 'analysis', data: { originalText: Array.from({ length: 10 }, () => 'See the image.').join(' ') } }
    ], {}, '5');
    expect(references.implicitImageCount).toBe(10);
  });

  it('returns an incomplete result and only a provisional score when required evidence is missing', () => {
    const aligned = () => ({ status: 'Aligned' });
    const result = helpers.computeReadinessScore({
      standards: aligned(),
      vocabulary: aligned(),
      engagement: aligned(),
      accessibility: aligned(),
      udl: aligned(),
      accuracy: { status: 'Not evaluated', notEvaluated: true, recommendations: ['Run source analysis.'] },
      differentiation: aligned(),
      cognitiveLoad: aligned(),
      culturalResponsiveness: { status: 'Not applicable', notApplicable: true }
    });
    expect(result.status).toBe('Incomplete');
    expect(result.score).toBeNull();
    expect(result.provisionalScore).toBe(100);
    expect(result.dimensionsEvaluated).toBe(7);
    expect(result.dimensionsApplicable).toBe(8);
    expect(result.incompleteIssues).toHaveLength(1);
    expect(result.perDimensionPercent.accuracy).toBeNull();
  });

  it('blocks Pass when any evaluated dimension is Not Aligned', () => {
    const aligned = () => ({ status: 'Aligned' });
    const result = helpers.computeReadinessScore({
      standards: aligned(),
      vocabulary: aligned(),
      engagement: aligned(),
      accessibility: { status: 'Not Aligned', recommendations: ['Add missing alt text.'] },
      udl: aligned(),
      accuracy: aligned(),
      differentiation: aligned(),
      cognitiveLoad: aligned(),
      culturalResponsiveness: aligned()
    });
    expect(result.status).toBe('Revise');
    expect(result.score).toBe(89);
    expect(result.blockingIssues[0].dimension).toBe('Content accessibility');
  });
});

describe('curriculum audit audio, language, scope, and standards', () => {
  it('reports read-aloud capability separately from embedded and prepared audio', () => {
    const artifacts = [{
      id: 's1',
      type: 'simplified',
      data: { text: 'Read this aloud.' },
      karaokeAudio: { sentences: [{ audioUrl: 'blob:prepared' }] }
    }];
    const result = helpers.computeAudioCoverage(artifacts, 'en');
    expect(result.readAloudCapabilityPct).toBe(100);
    expect(result.embeddedAudioPct).toBe(0);
    expect(result.preparedSentenceCoveragePct).toBe(100);
    expect(result.runtimeFallbackAvailable).toBe(false);

    const harvest = helpers.harvestExistingAuditSignals(artifacts);
    expect(harvest.multimodal.audio).toBe(true);
  });

  it('matches production keyed karaoke audio and keeps partial preparation on runtime fallback', () => {
    const result = helpers.computeAudioCoverage([{
      id: 'keyed-audio',
      type: 'simplified',
      data: { text: 'First sentence. Second sentence.' },
      karaokeAudio: {
        format: 'per-entry',
        version: 3,
        sentences: {
          'first sentence.': 'base64-audio',
          'unrelated sentence.': 'base64-other'
        }
      }
    }], 'en');

    expect(result.totalPreparedSentenceEntries).toBe(2);
    expect(result.expectedSentences).toBe(2);
    expect(result.preparedSentences).toBe(1);
    expect(result.preparedSentenceCoveragePct).toBe(50);
    expect(result.preparedAudioArtifacts).toBe(1);
    expect(result.runtimeFallbackArtifacts).toBe(1);
    expect(result.runtimeFallbackAvailable).toBe(true);
  });

  it('counts an unscoped artifact once when it has embedded and prepared audio', () => {
    const result = helpers.computeAudioCoverage([{
      id: 'audio-only-combined',
      type: 'audio',
      data: { audioUrl: 'blob:standalone' },
      karaokeAudio: { sentences: { 'saved sentence.': 'base64-audio' } }
    }], 'en');

    expect(result.unscopedEmbeddedAudioArtifacts).toBe(1);
    expect(result.unscopedPreparedAudioArtifacts).toBe(1);
    expect(result.unscopedPreparedSentences).toBe(1);
    expect(result.unscopedAudioArtifacts).toBe(1);
  });

  it('does not mistake nested persisted audio bytes for readable curriculum text', () => {
    const result = helpers.computeAudioCoverage([{
      id: 'nested-audio-only',
      type: 'audio',
      data: {
        karaokeAudio: {
          format: 'per-entry',
          sentences: { 'saved sentence.': 'A'.repeat(512) }
        }
      }
    }], 'en');

    expect(result.readableArtifacts).toBe(0);
    expect(result.unscopedPreparedAudioArtifacts).toBe(1);
  });

  it('credits the global page reader without letting audio-only artifacts inflate readable coverage', () => {
    const artifacts = [{
      id: 'lesson-1',
      type: 'lesson-plan',
      data: {
        directInstruction: 'Teach evaporation with a short demonstration.',
        karaokeAudio: { sentences: [{ audioUrl: 'blob:prepared-sentence' }] }
      }
    }, {
      id: 'audio-only',
      type: 'audio',
      data: { audioUrl: 'blob:standalone-audio' }
    }];
    const result = helpers.computeAudioCoverage(artifacts, 'en');
    expect(result.readableArtifacts).toBe(1);
    expect(result.readAloudCapableArtifacts).toBe(1);
    expect(result.readAloudCapabilityPct).toBe(100);
    expect(result.pageReaderEligibleArtifacts).toBe(1);
    expect(result.dedicatedReadAloudArtifacts).toBe(0);
    expect(result.dedicatedReadAloudPct).toBe(0);
    expect(result.embeddedAudioArtifacts).toBe(0);
    expect(result.embeddedAudioPct).toBe(0);
    expect(result.totalEmbeddedAudioArtifacts).toBe(1);
    expect(result.unscopedEmbeddedAudioArtifacts).toBe(1);
    expect(result.preparedSentences).toBe(1);
  });

  it('uses Unicode word segmentation but withholds the English-only tier rubric', () => {
    const result = helpers.computeVocabularyFit([
      { type: 'analysis', data: { originalText: 'La fotosíntesis transforma energía para las plantas.' } }
    ], '5', 'es');
    expect(result.auditedTextWords).toBeGreaterThan(0);
    expect(result.status).toBe('Not evaluated');
    expect(result.notEvaluated).toBe(true);
    expect(result.tier2Count).toBeNull();
  });

  it('scopes an unkeyed audit from the latest analysis anchor', () => {
    const result = helpers.selectCurriculumArtifacts([
      { id: 'old-analysis', type: 'analysis', data: { originalText: 'Old unit' } },
      { id: 'old-quiz', type: 'quiz', data: { questions: [] } },
      { id: 'new-analysis', type: 'analysis', data: { originalText: 'New unit' } },
      { id: 'new-text', type: 'simplified', data: { text: 'New unit text' } }
    ], {});
    expect(result.metadata.selectionMode).toBe('latest analysis anchor');
    expect(result.metadata.includedArtifactIds).toEqual(['new-analysis', 'new-text']);
  });

  it('derives standard outcomes from required component statuses and flags missing reports', () => {
    const normalized = helpers.normalizeStandardsDimension([{
      standard: 'AI supplied label',
      analysis: {
        textAlignment: { status: 'Aligned' },
        activityAlignment: { status: 'Partially Aligned' },
        assessmentAlignment: { status: 'Aligned' }
      },
      overallDetermination: 'Pass'
    }], ['STD-1', 'STD-2']);
    expect(normalized.reports[0].standard).toBe('STD-1');
    expect(normalized.reports[0].overallDetermination).toBe('Revise');
    expect(normalized.reports[1].status).toBe('Not evaluated');
    expect(normalized.dimension.status).toBe('Not evaluated');
    expect(normalized.dimension.notEvaluated).toBe(true);
  });

  it('stores valid BCP 47 language tags without treating display names as tags', () => {
    expect(helpers.normalizeAuditLanguageTag('English')).toBe('en');
    expect(helpers.normalizeAuditLanguageTag('Spanish (Latin America)')).toBe('es');
    expect(helpers.normalizeAuditLanguageTag('Brazilian Portuguese')).toBe('pt-BR');
    expect(helpers.normalizeAuditLanguageTag('Chinese (Traditional)')).toBe('zh-Hant');
    expect(helpers.normalizeAuditLanguageTag('fr-CA')).toBe('fr-CA');
    expect(helpers.normalizeAuditLanguageTag('All Selected Languages')).toBe('und');
  });
});

describe('curriculum audit report WCAG regressions', () => {
  it('exposes keyboard focus, exact scores, chart labels, and honest scope language', () => {
    expect(reportSource).toContain('tabIndex={-1}');
    expect(reportSource).toContain('el.focus({ preventScroll: true })');
    expect(reportSource).toContain("prefers-reduced-motion: reduce");
    expect(reportSource).toContain('Provisional curriculum readiness score:');
    expect(reportSource).toContain('role="img" aria-label={\'Quiz DOK distribution:');
    expect(reportSource).toContain('not a WCAG conformance assessment');
    expect(reportSource).toContain('function AudioCoverageSummary');
    expect(reportSource).toContain('App-wide read aloud');
    expect(reportSource).toContain('Dedicated read-aloud controls');
    expect(reportSource).toContain('How scoring works');
    expect(reportSource).toContain('aria-label={label + \': \' + status');
    expect(reportSource).toContain('Selection: ');
    expect(reportSource).toContain('print:h-auto');
    expect(reportSource).toContain('var seenRecommendations = new Set()');
    expect(dispatcherSource).toContain('schemaVersion: 4');
    expect(dispatcherSource).toContain('auditLanguageTag = normalizeAuditLanguageTag');
    expect(reportSource).toContain('function NotEvaluatedCard');
    expect(reportSource).toContain('function MissingDimensionCard');
    expect(reportSource).toContain('saved audit. Regenerate the audit');
    expect(reportSource).toContain('c.vocabulary.notEvaluated');
    expect(reportSource).toContain('c.accuracy.notEvaluated');
    expect(reportSource).not.toContain('of 5 comprehensive');
    expect(reportSource).not.toMatch(/opacity:\s*0\.(?:65|7|8)/);
  });

  it('keeps source and generated report localization plumbing aligned', () => {
    expect(reportSource).toContain('<ExecutiveSummary t={t}');
    expect(reportSource).toContain('lang={resolveAuditLanguageTag(comprehensive)}');
    expect(reportSource).toContain('comprehensive.auditLanguageTag || comprehensive.auditLanguage');
    expect(reportSource).toContain('role="region" aria-labelledby="curriculum-audit-report-heading"');
    expect(reportSource).toContain('<h1 id="curriculum-audit-report-heading"');
    expect(reportSource).toContain('<time dateTime={generatedAt}>');
  });
});
