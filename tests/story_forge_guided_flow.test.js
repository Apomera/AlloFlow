import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const source = readFileSync('story_forge_source.jsx', 'utf8');
const built = readFileSync('story_forge_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/story_forge_module.js', 'utf8');

const readStringArray = (name) => {
  const match = source.match(new RegExp('const ' + name + ' = \\[([^;]+)\\];'));
  if (!match) throw new Error('Missing ' + name);
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
};

let React;
let ReactDOMServer;
let StoryForge;
let META;

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
  globalThis.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('story_forge_module.js');
  StoryForge = window.AlloModules.StoryForge;
  META = StoryForge._meta;
});

describe('StoryForge guided information architecture', () => {
  it('uses one coherent build order in source and deployed output', () => {
    expect(readStringArray('PHASES')).toEqual([
      'configure', 'write', 'review', 'illustrate', 'narrate', 'export',
    ]);
    expect(readStringArray('PHASE_LABELS')).toEqual([
      'Plan', 'Draft', 'Review', 'Design', 'Audio', 'Publish',
    ]);
    expect(deployed).toBe(built);
  });

  it('separates artifact type from the reversible writing view', () => {
    expect(source).toContain('data-sf-artifact-picker');
    expect(source).toContain('data-sf-writing-view-picker');
    expect(source.match(/Object\.entries\(ARTIFACT_TYPES\)\.map/g) || []).toHaveLength(1);
    expect(source).not.toContain('Object.entries(LAYOUT_MODES).map');
    expect(source).not.toContain('onClick={() => setLayoutMode(key)}');
    expect(source).toContain('Comic · Change in Plan');
    expect(source).toContain("optLabel('artifact', artifactType, ARTIFACT_TYPES[artifactType].label");
  });

  it('keeps legacy projects compatible while persisting the new mode model', () => {
    expect(META.normalizeStoryForgeModeSelection({ layoutMode: 'prose' })).toEqual({
      artifactType: 'story', writingView: 'standard', layoutMode: 'prose',
    });
    expect(META.normalizeStoryForgeModeSelection({ layoutMode: 'journal' })).toEqual({
      artifactType: 'story', writingView: 'notebook', layoutMode: 'journal',
    });
    expect(META.normalizeStoryForgeModeSelection({ layoutMode: 'dark' })).toEqual({
      artifactType: 'story', writingView: 'low-light', layoutMode: 'dark',
    });
    expect(META.normalizeStoryForgeModeSelection({ layoutMode: 'comic' })).toEqual({
      artifactType: 'comic', writingView: 'standard', layoutMode: 'comic',
    });
    expect(META.normalizeStoryForgeModeSelection({
      artifactType: 'comic', writingView: 'notebook', layoutMode: 'prose',
    })).toEqual({
      artifactType: 'comic', writingView: 'notebook', layoutMode: 'comic',
    });
  });

  it('persists Review for the exact authored draft and invalidates stale feedback', () => {
    const base = {
      artifactType: 'story',
      writingView: 'standard',
      storyTitle: 'Relay',
      paragraphs: [
        { id: 'p-1', text: 'Mina crossed the bridge.', plotBeat: 'setup' },
        { id: 'p-2', text: 'She found a light.', plotBeat: 'rising' },
      ],
    };
    const signature = META.getStoryForgeReviewSignature(base);

    expect(META.getStoryForgeReviewSignature({
      ...base,
      writingView: 'low-light',
      illustrations: { 'p-1': { imageUrl: 'data:image/png;base64,x' } },
      audioSegments: { 'p-1': { studentAudioUrl: 'blob:audio' } },
    })).toBe(signature);
    expect(META.getStoryForgeReviewSignature({
      ...base,
      paragraphs: [
        { ...base.paragraphs[0], text: 'Mina crossed a new bridge.' },
        base.paragraphs[1],
      ],
    })).not.toBe(signature);
    expect(META.getStoryForgeReviewSignature({
      ...base,
      paragraphs: [base.paragraphs[1], base.paragraphs[0]],
    })).not.toBe(signature);
    expect(META.getStoryForgeReviewSignature({
      ...base,
      rubricText: 'A newly assigned rubric',
    })).not.toBe(signature);
    expect(META.getStoryForgeReviewSignature({
      ...base,
      vocabTerms: [{ term: 'glow', definition: 'shine' }],
    })).not.toBe(signature);

    const comic = {
      ...base,
      artifactType: 'comic',
      panelDialogue: { 'p-1': { speaker: 'Mina', speech: 'Go!' } },
    };
    expect(META.getStoryForgeReviewSignature({
      ...comic,
      panelDialogue: { 'p-1': { speaker: 'Mina', speech: 'Wait!' } },
    })).not.toBe(META.getStoryForgeReviewSignature(comic));

    expect(META.sanitizeStoryForgeDraft({
      ...base,
      reviewedDraftSignature: signature,
    }).reviewedDraftSignature).toBe(signature);
    expect(META.sanitizeStoryForgeDraft({
      ...base,
      reviewedDraftSignature: 42,
    }).reviewedDraftSignature).toBe('');
    expect(source).toContain('const hasCompletedReview = isCurrentDraftReviewed;');
    expect(source).toContain('reviewSignals: {\n      completed: isCurrentDraftReviewed,');
    expect(source).toContain('const isReviewStale = !isCurrentDraftReviewed && Boolean(reviewedDraftSignature || hasPriorReviewOutput);');
    expect(source).toContain('data-sf-review-stale');
    expect(source).toContain('delete next[paragraphId];\n        delete next._overallTip;');
    expect(source).toContain('setGrammarResults(validated.hasReviewData ? (review.grammarResults || {}) : {});');
  });

  it('routes restored work to the earliest unmet step', () => {
    const base = {
      artifactType: 'story',
      writingView: 'standard',
      storyTitle: 'Saved Project',
      paragraphs: [{ id: 'p-1', text: 'Mina crossed the bridge.' }],
    };
    expect(META.getStoryForgeRestoredPhase(META.sanitizeStoryForgeDraft({
      ...base,
      phase: 'export',
    }))).toBe('review');
    expect(META.getStoryForgeRestoredPhase(META.sanitizeStoryForgeDraft({
      ...base,
      phase: 'review',
      paragraphs: [{ id: 'p-1', text: '' }],
    }))).toBe('write');
    expect(META.getStoryForgeRestoredPhase(META.sanitizeStoryForgeDraft({
      ...base,
      phase: 'write',
      storyTitle: '',
    }))).toBe('configure');
    expect(META.getStoryForgeRestoredPhase({
      ...META.sanitizeStoryForgeDraft({ ...base, phase: 'write', storyTitle: '' }),
      sourceTopic: 'A teacher-assigned topic',
    })).toBe('write');

    const signature = META.getStoryForgeReviewSignature({ ...base, phase: 'export' });
    const currentReview = META.sanitizeStoryForgeDraft({
      ...base,
      phase: 'export',
      reviewedDraftSignature: signature,
    });
    expect(META.getStoryForgeRestoredPhase(currentReview)).toBe('export');
    expect(source).toContain('setPhase(restoredPhase);');
    expect(source).toContain("return ta('a11y.storyforge_phase_need_review_forward');");
    expect(source).toContain('return !nextPhase || canEnterPhase(nextPhase);');
  });

  it('distinguishes reviewed projects from working handoffs', () => {
    const base = {
      artifactType: 'story',
      writingView: 'standard',
      storyTitle: 'Relay',
      paragraphs: [{ id: 'p-1', text: 'Mina crossed the bridge.' }],
    };
    const handoff = META.validateStoryForgeImport({
      _storyForgeVersion: 2,
      purpose: 'handoff',
      ...base,
      gradingResult: { totalScore: '20/20' },
      review: { gradingResult: { totalScore: '20/20' } },
    });
    expect(handoff).toMatchObject({ valid: true, hasReviewData: false });

    const emptyProject = META.validateStoryForgeImport({
      _storyForgePackage: 'project',
      _storyForgeVersion: 2,
      snapshot: base,
      review: { gradingResult: null, grammarResults: null, characters: [] },
    });
    expect(emptyProject).toMatchObject({ valid: true, hasReviewData: false });

    const reviewedProject = META.validateStoryForgeImport({
      _storyForgePackage: 'project',
      _storyForgeVersion: 2,
      snapshot: base,
      review: { gradingResult: { totalScore: '20/20' } },
    });
    expect(reviewedProject).toMatchObject({ valid: true, hasReviewData: true });

    const reviewedSignature = META.getStoryForgeReviewSignature(base);
    const staleProject = META.validateStoryForgeImport({
      _storyForgePackage: 'project',
      _storyForgeVersion: 2,
      snapshot: {
        ...base,
        reviewedDraftSignature: reviewedSignature,
        paragraphs: [{ ...base.paragraphs[0], text: 'Edited after review.' }],
      },
      review: { gradingResult: { totalScore: '20/20' } },
    });
    expect(staleProject).toMatchObject({ valid: true, hasReviewData: false });
    expect(source).toContain("setReviewedDraftSignature(validated.hasReviewData ? getStoryForgeReviewSignature(validated.snapshot) : '');");
  });

  it('renders an explicit first-step requirement and named destination CTA', () => {
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(StoryForge, {
      isOpen: true,
      onClose: () => {},
      onCallGemini: async () => '',
      t: (key) => key,
      codename: 'Bright Tiger',
      gradeLevel: '5th Grade',
    }));
    expect(html).toContain('data-sf-phase-requirements');
    // Rendered through the harness ta(), which echoes the key; the English
    // lives in ui_strings.js under this key.
    expect(html).toContain('a11y.storyforge_phase_need_title');
    expect(html).toContain('data-sf-primary-cta');
    expect(html).toContain('Continue to Draft');
  });

  it('keeps requirements adjacent to CTAs and every phase legible on mobile', () => {
    for (const label of [
      'Continue to Draft',
      'Continue to Review',
      'Continue to Design',
      'Continue to Audio',
      'Continue to Publish',
    ]) expect(source).toContain(label);
    expect(source).toContain('aria-describedby="sf-phase-requirements"');
    expect(source).toContain('data-sf-phase-step={p}');
    expect(source).toContain('<span>{phaseLabel(i)}</span>');
    expect(source).not.toContain('hidden sm:inline">{PHASE_LABELS[i]}</span>');
    expect(source).toContain('data-sf-step-summary');
    expect(source).not.toContain('Next <ArrowRight');
  });

  it('keeps optional Plan and Draft tools out of the first-pass path', () => {
    const planStart = source.indexOf("{phase === 'configure'");
    const draftStart = source.indexOf("{phase === 'write'");
    const planSlice = source.slice(planStart, draftStart);
    const optionalStart = planSlice.indexOf('Optional setup &amp; assignment');
    expect(optionalStart).toBeGreaterThan(planSlice.indexOf('Vocabulary Goals'));
    expect(planSlice.indexOf('Story Shape')).toBeGreaterThan(optionalStart);
    expect(planSlice.indexOf('Save as Assignment')).toBeGreaterThan(optionalStart);

    expect(source).toContain('aria-controls="sf-writing-tools-panel"');
    expect(source).toContain('id="sf-writing-tools-panel"');
    expect(source).toContain("aria-label={ta('a11y.storyforge_attr_expanded_writing_tools')}");
    expect(source).toContain('Writing setup');
    expect(source).toContain('Comic helpers');
    expect(source).toContain('Focus &amp; feedback');
  });

  it('separates Audio creation from settings and makes microphone failures recoverable', () => {
    expect(source).toContain('data-sf-narration-settings');
    expect(source).toContain('Narration settings');
    expect(source).toContain("ta('a11y.storyforge_ui_create_narration')");
    expect(source).toContain("ta('a11y.storyforge_ui_practice_or_record_my_voice')");
    expect(source).toContain('data-sf-microphone-error');
    expect(source).toContain('Retry microphone');
    expect(source).toContain('const result = await recorder.startRecording();');
    expect(source).toContain('if (result?.ok) {\n      setRecordingParagraphId(paragraphId);');
    expect(source).toContain('px-3 py-4 sm:p-6');
  });
});

describe('StoryForge publish readiness', () => {
  it('blocks empty artifacts but treats optional polish as recommendations', () => {
    const blank = META.getStoryForgeProjectReadiness({
      layoutMode: 'prose',
      paragraphs: [{ id: 'p-1', text: '' }],
    });
    expect(blank.blockers.map((issue) => issue.code)).toContain('missing-story-content');

    const ready = META.getStoryForgeProjectReadiness({
      storyTitle: 'A Complete Draft',
      genre: 'free',
      layoutMode: 'prose',
      paragraphs: [{
        id: 'p-1',
        text: 'Ari crossed the old bridge and discovered a bright garden beyond the hill. The path curved past trees and a clear stream. Ari followed it home with a new idea to share.',
      }],
      reviewSignals: { selfAssessment: true },
    });
    expect(ready.blockers).toEqual([]);
    expect(ready.phases.map((item) => item.key)).toEqual([
      'configure', 'write', 'review', 'illustrate', 'narrate', 'export',
    ]);
    expect(ready.phases.find((item) => item.key === 'export').status).toBe('ready');
  });

  it('routes every final-output handler through the shared guard', () => {
    expect(source).toContain('const ensureReadyToPublish = () =>');
    expect(source).toContain("if (!isCurrentDraftReviewed) {\n      const message = ta('a11y.storyforge_review_before_publishing');");
    expect(source).toContain('const publishBlocked = !isCurrentDraftReviewed || projectReadiness.blockers.length > 0;');
    expect(source).toContain('const exportStorybook = async () => {\n    if (!ensureReadyToPublish()) return;');
    expect(source).toContain('const exportSlideshow = () => {\n    if (!ensureReadyToPublish()) return;');
    expect(source).toContain("const exportComicScript = async () => {\n    if (layoutMode !== 'comic') return;\n    if (!ensureReadyToPublish()) return;");
    expect(source).toContain("const exportComicProductionPack = async () => {\n    if (layoutMode !== 'comic') return;\n    if (!ensureReadyToPublish()) return;");
    expect(source).not.toContain('const shareToSession = async () => {');
    expect(source).not.toContain('data-sf-publish-action="gallery"');
    expect(source).toContain('const saveAsSubmission = () => {\n    if (!onSaveSubmission) return;\n    if (!ensureReadyToPublish()) return;');
    expect(source).toContain('data-sf-publish-action="artifact"');
    expect(source).toContain('data-sf-publish-action="comic-script"');
    expect(source).toContain('data-sf-publish-action="production-pack"');
    expect(source).toContain('data-sf-publish-action="portfolio"');
    expect(source).toContain('data-sf-publish-more');
    expect(source).toContain('data-sf-project-tools');
  });
});
