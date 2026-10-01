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
    normalizeAuditLanguageTag,
    collectAuditText,
    extractAuditArtifactText,
    stripAuditCitationMarkup,
    summarizeAuditCitations,
    capMissingPacingEvidence,
    computeCognitiveLoad,
    _auditTextAccessEvidence,
    _auditFingerprint,
    _auditContentFingerprint
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
    expect(result.metadata.includedArtifacts).toEqual([
      expect.objectContaining({ id: 'new-analysis', title: 'Analysis', type: 'analysis' }),
      expect.objectContaining({ id: 'new-text', title: 'Simplified', type: 'simplified' })
    ]);
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

  it('keeps only explicit evidence artifact IDs that are in the audit scope', () => {
    const normalized = helpers.normalizeStandardsDimension([{
      standard: 'AI supplied label',
      analysis: {
        textAlignment: { status: 'Aligned', evidence: 'The lesson explains the target.', artifactIds: ['lesson-1', 'not-audited'], attributionSource: 'invented-source' },
      },
      gaps: [{ text: 'The quiz needs a stronger check.', artifactIds: ['quiz-1', 'not-audited'], attributionSource: 'teacher' }],
      overallDetermination: 'Pass',
    }], ['STD-1'], { artifactIds: ['lesson-1', 'quiz-1'] });

    expect(normalized.dimension.perStandard[0].analysis.textAlignment.artifactIds).toEqual(['lesson-1']);
    expect(normalized.dimension.perStandard[0].analysis.textAlignment.attributionSource).toBe('audit-model');
    expect(normalized.dimension.perStandard[0].gaps).toEqual(['The quiz needs a stronger check.']);
    expect(normalized.dimension.perStandard[0].findingAttributions).toEqual([{ text: 'The quiz needs a stronger check.', artifactIds: ['quiz-1'], attributionSource: 'teacher' }]);
  });
  it('stores valid BCP 47 language tags without treating display names as tags', () => {
    expect(helpers.normalizeAuditLanguageTag('English')).toBe('en');
    expect(helpers.normalizeAuditLanguageTag('Spanish (Latin America)')).toBe('es');
    expect(helpers.normalizeAuditLanguageTag('Brazilian Portuguese')).toBe('pt-BR');
    expect(helpers.normalizeAuditLanguageTag('Chinese (Traditional)')).toBe('zh-Hant');
    expect(helpers.normalizeAuditLanguageTag('fr-CA')).toBe('fr-CA');
    expect(helpers.normalizeAuditLanguageTag('All Selected Languages')).toBe('und');
  });

  it('prefers a designated primary over a supplemental adaptation for audit source evidence', () => {
    const artifacts = [
      {
        id: 'primary-1', type: 'analysis', data: { originalText: 'Primary grade-level source.' },
        instructionalText: { role: 'primary', form: 'original', replacementAuthorization: { authorized: false, source: 'none' } },
      },
      {
        id: 'adapted-1', type: 'simplified', data: 'Short adapted companion.',
        instructionalText: { role: 'supplemental', form: 'adapted', sourceArtifactId: 'primary-1', replacementAuthorization: { authorized: false, source: 'none' } },
      },
    ];
    const collected = helpers.collectAuditText(artifacts);
    expect(collected.sourceText).toBe('Primary grade-level source.');
    expect(collected.sourceArtifactId).toBe('primary-1');
    expect(collected.sourceSelection).toBe('designated-primary');
    const access = helpers._auditTextAccessEvidence(artifacts);
    expect(access.hasPrimary).toBe(true);
    expect(access.supplementalArtifactIds).toEqual(['adapted-1']);
  });

  it('flags a supplemental adapted text without a primary and never infers authorization', () => {
    const artifacts = [{
      id: 'adapted-only', type: 'simplified', data: 'Adapted text.',
      instructionalText: { role: 'supplemental', form: 'adapted', replacementAuthorization: { authorized: true, source: 'model' } },
    }];
    const access = helpers._auditTextAccessEvidence(artifacts);
    expect(access.status).toBe('Not Aligned');
    expect(access.hasSupplementalWithoutPrimary).toBe(true);
    expect(access.authorizedModifiedArtifactIds).toEqual([]);
    expect(helpers.collectAuditText(artifacts).sourceSelection).toBe('adapted-fallback-not-primary');
  });

  it('changes the audit fingerprint when instructional role changes', () => {
    const base = { id: 'text-1', type: 'simplified', data: 'Same bytes.' };
    const supplemental = { ...base, instructionalText: { role: 'supplemental', form: 'adapted' } };
    const primary = { ...base, instructionalText: { role: 'primary', form: 'adapted', replacementAuthorization: { authorized: true, source: 'educator' } } };
    expect(helpers._auditFingerprint([supplemental], '5th Grade')).not.toBe(helpers._auditFingerprint([primary], '5th Grade'));
  });

  it('accepts grade evidence only when its fingerprint matches the current primary text', () => {
    const text = 'Current designated primary text.';
    const base = {
      id: 'primary-freshness', type: 'analysis', data: { originalText: text },
      instructionalText: {
        role: 'primary', form: 'original',
        complexity: { status: 'within-target', contentFingerprint: helpers._auditContentFingerprint(text) },
      },
    };
    const fresh = helpers._auditTextAccessEvidence([base]);
    expect(fresh.primaryWithCurrentComplexityEvidenceIds).toEqual(['primary-freshness']);
    expect(fresh.stalePrimaryComplexityEvidenceIds).toEqual([]);
    expect(fresh.status).toBe('Aligned');

    const stale = helpers._auditTextAccessEvidence([{
      ...base,
      instructionalText: { ...base.instructionalText, complexity: { status: 'within-target', contentFingerprint: 'txt-stale' } },
    }]);
    expect(stale.primaryWithCurrentComplexityEvidenceIds).toEqual([]);
    expect(stale.stalePrimaryComplexityEvidenceIds).toEqual(['primary-freshness']);
    expect(stale.status).toBe('Partially Aligned');
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
    expect(dispatcherSource).toContain('schemaVersion: 5');
    expect(dispatcherSource).toContain('auditLanguageTag = normalizeAuditLanguageTag');
    expect(reportSource).toContain('function NotEvaluatedCard');
    expect(reportSource).toContain('function MissingDimensionCard');
    expect(reportSource).toContain('saved audit. Regenerate the audit');
    expect(reportSource).toContain('c.vocabulary.notEvaluated');
    expect(reportSource).toContain('c.accuracy.notEvaluated');
    expect(reportSource).toContain('Primary-text access evidence');
    expect(reportSource).toContain('Adapted text available (reported only)');
    expect(reportSource).toContain('Scored access paths');
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

describe('curriculum audit text measurement is fair to structured artifacts and intentional citations', () => {
  const seventy = Array.from({ length: 70 }, (_, i) => 'word' + i).join(' ');
  const lessonPlan = {
    id: 'lp1',
    type: 'lesson-plan',
    timestamp: '2026-09-02T23:44:00.000Z',
    data: {
      materialsNeeded: ['Projector', 'Paper'],
      objectives: ['SWBAT explain REM sleep'],
      hook: seventy,
      directInstruction: seventy,
      guidedPractice: seventy,
      independentPractice: seventy,
      closure: seventy,
    },
  };

  it('does not measure a lesson plan as one unbroken passage', () => {
    const result = helpers.computeContentAccessibility([lessonPlan], {}, '5th Grade');
    expect(result.longestUnbrokenPassage).toBe(70);
    expect(result.recommendations.some(r => /Longest unbroken passage/.test(r))).toBe(false);
  });

  it('still flags a genuinely unbroken prose passage', () => {
    const longProse = Array.from({ length: 260 }, (_, i) => 'w' + i).join(' ');
    const result = helpers.computeContentAccessibility([{ type: 'simplified', data: longProse }], {}, '5th Grade');
    expect(result.longestUnbrokenPassage).toBe(260);
    expect(result.recommendations.some(r => /Longest unbroken passage/.test(r))).toBe(true);
  });

  const cited = 'Dreams happen during REM sleep. [⁽¹⁾](https://en.wikipedia.org/wiki/Dream_(disambiguation)) They are involuntary. [⁽²⁾](https://example.org/a)\n\n## Source Text References\n\n1. [Dream](https://en.wikipedia.org/wiki/Dream)\n\n2. [Other](https://example.org/a)';

  it('strips inline citation markers and the references trailer from audited text', () => {
    const stripped = helpers.stripAuditCitationMarkup(cited);
    expect(stripped).toBe('Dreams happen during REM sleep. They are involuntary.');
    const text = helpers.extractAuditArtifactText({ type: 'simplified', data: cited });
    expect(text).not.toMatch(/⁽|Source Text References|wikipedia/);
  });

  it('reports the citation markers it removed so reviewers know they are intentional', () => {
    const summary = helpers.summarizeAuditCitations([{ id: 'a1', title: 'Adapted Text', type: 'simplified', data: cited }, lessonPlan]);
    expect(summary.markers).toBe(2);
    expect(summary.artifactsWithMarkers).toBe(1);
    expect(summary.artifactsWithReferences).toBe(1);
    const a11y = helpers.computeContentAccessibility([{ id: 'a1', type: 'simplified', data: cited }], {}, '5th Grade');
    expect(a11y.inlineCitations.markers).toBe(2);
  });

  it('does not count citation markers as vocabulary words', () => {
    const vocab = helpers.computeVocabularyFit([{ id: 'a1', type: 'simplified', data: cited }], '5th Grade', 'English');
    expect(vocab.totalWords).toBe(8);
  });
});

describe('generators and report view carry the audit expectations', () => {
  it('lesson plan prompt requires parseable per-segment durations', () => {
    const promptsSource = readFileSync(resolve(process.cwd(), 'prompts_library_source.jsx'), 'utf8');
    expect(promptsSource).toMatch(/PACING \(REQUIRED\)[\s\S]*"\(10 min\)/);
  });

  it('accessibility reviewer is told inline citations are intentional', () => {
    expect(dispatcherSource).toMatch(/INTENTIONAL, educator-enabled feature \(Keep Citations\)/);
    expect(dispatcherSource).not.toMatch(/e\.g\., "add a Visual Organizer/);
  });

  it('report view exposes a freshness notice with a re-run action', () => {
    expect(reportSource).toMatch(/function computeAuditFreshness/);
    expect(reportSource).toMatch(/onRerunAudit/);
  });
});

describe('vocabulary fit measures student-facing text fairly', () => {
  const studentText = 'Dreams happen during REM sleep. The brain organizes memories and emotions while you rest.';
  const teacherScript = Array.from({ length: 40 }, (_, i) => 'instructional scaffolded pedagogical' + i).join(' ');

  it('ignores teacher-facing lesson plan and activity guide text', () => {
    const base = helpers.computeVocabularyFit([{ id: 's1', type: 'simplified', data: studentText }], '5th Grade', 'English');
    const withTeacher = helpers.computeVocabularyFit([
      { id: 's1', type: 'simplified', data: studentText },
      { id: 'lp', type: 'lesson-plan', data: { directInstruction: teacherScript, guidedPractice: teacherScript } },
      { id: 'b', type: 'brainstorm', data: { activities: [{ title: 'Diorama', description: teacherScript }] } },
    ], '5th Grade', 'English');
    expect(withTeacher.auditedTextWords).toBe(base.auditedTextWords);
    expect(withTeacher.tier2Count).toBe(base.tier2Count);
  });

  it('drops artifact ids, timestamps, and domains from the vocabulary stream', () => {
    const result = helpers.computeVocabularyFit([
      { id: 's1', type: 'simplified', data: studentText },
      { id: 'n1', type: 'note-taking', data: { resourceId: '1788392599103tzfwn0evh', generatedAt: '2026-09-02T23:04:08.284Z', host: 'www.sleepfoundation.org' } },
    ], '5th Grade', 'English');
    expect(result.auditedTextWords).toBe(14);
    expect(result.tier2Examples.join(' ')).not.toMatch(/1788|sleepfoundation|2026/);
  });

  it('counts inflected forms of one word once', () => {
    const inflected = 'Students student student\u2019s dreaming dreams dreamed dream organize organized organizes organizing.';
    const result = helpers.computeVocabularyFit([{ id: 's1', type: 'simplified', data: inflected }], '5th Grade', 'English');
    expect(result.uniqueWords).toBe(3);
    expect(result.tier2Count).toBe(1);
  });

  it('does not count an adapted-text fallback source twice', () => {
    const result = helpers.computeVocabularyFit([{ id: 's1', type: 'simplified', data: studentText }], '5th Grade', 'English');
    expect(result.sourceSelection).toBe('adapted-fallback-not-primary');
    expect(result.auditedTextWords).toBe(result.sourceWords);
  });

  it('scales tier expectations from the stated 500-word norm', () => {
    const result = helpers.computeVocabularyFit([{ id: 's1', type: 'simplified', data: Array.from({ length: 1000 }, () => 'sleep').join(' ') }], '5th Grade', 'English');
    expect(result.expected.scale).toBe(2);
    expect(result.expected.tier2).toBe(16);
  });
});

describe('pacing evidence and metadata hygiene', () => {
  it('keeps missing segment durations at Partially Aligned even after an LLM downgrade', () => {
    const dim = { status: 'Not Aligned', claimedTotalMinutes: 0, estimatedTotalMinutes: 38, notes: 'x' };
    const capped = helpers.capMissingPacingEvidence(dim);
    expect(capped.status).toBe('Partially Aligned');
    expect(capped.pacingEvidence).toBe('missing');
  });

  it('does not soften a real pacing contradiction', () => {
    const dim = { status: 'Not Aligned', claimedTotalMinutes: 20, estimatedTotalMinutes: 60 };
    expect(helpers.capMissingPacingEvidence(dim).status).toBe('Not Aligned');
  });

  it('parses "(10 min)" prefixes the lesson-plan prompt now requires', () => {
    const plan = { type: 'lesson-plan', data: { hook: '(5 min) Show the image.', directInstruction: '(15 min) Teacher says...', guidedPractice: '(10 min) Groups sort.', independentPractice: '(10 min) Solo notes.', closure: '(5 min) Exit ticket.' } };
    const result = helpers.computeCognitiveLoad([plan], 1000, '5th Grade');
    expect(result.claimedTotalMinutes).toBe(45);
    expect(result.recommendations.some(r => /does not specify segment durations/.test(r))).toBe(false);
  });

  it('keeps quiz scoring metadata out of the audited text', () => {
    const quiz = { type: 'quiz', data: { mode: 'pre-check', modeLabel: 'Pre-Check (Readiness Check)', scoringPolicy: 'ai-provisional', itemCountMismatch: 'relation-mismatch', questions: [{ type: 'mcq', question: 'Which stage has vivid dreams?', options: ['REM', 'Deep'], correctAnswer: 'REM', factCheck: 'Verified against source.', distractorQuality: ['ok'] }] } };
    const text = helpers.extractAuditArtifactText(quiz);
    expect(text).toMatch(/vivid dreams/);
    expect(text).not.toMatch(/provisional|Readiness|mismatch|Verified against/);
  });
});
