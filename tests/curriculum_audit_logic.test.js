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
    selectCurriculumArtifacts
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
});

describe('curriculum audit report WCAG regressions', () => {
  it('exposes keyboard focus, exact scores, chart labels, and honest scope language', () => {
    expect(reportSource).toContain('tabIndex={-1}');
    expect(reportSource).toContain('el.focus({ preventScroll: true })');
    expect(reportSource).toContain("prefers-reduced-motion: reduce");
    expect(reportSource).toContain('Provisional curriculum readiness score:');
    expect(reportSource).toContain('role="img" aria-label={\'Quiz DOK distribution:');
    expect(reportSource).toContain('not a WCAG conformance assessment');
    expect(reportSource).toContain('Read-aloud capable');
    expect(reportSource).not.toContain('of 5 comprehensive');
    expect(reportSource).not.toMatch(/opacity:\s*0\.(?:65|7|8)/);
  });

  it('keeps source and generated report localization plumbing aligned', () => {
    expect(reportSource).toContain('<ExecutiveSummary t={t}');
    expect(reportSource).toContain('lang={comprehensive && comprehensive.auditLanguage');
    expect(reportSource).toContain('role="region" aria-label="Curriculum audit report"');
  });
});
