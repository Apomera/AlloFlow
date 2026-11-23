import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { auditPack, runAudit } = require('../dev-tools/audit_allopack_image_coverage.cjs');
const media = require('../agent_core_pack_media_module.js');

// Valid 1x1 PNG raster that passes media.inspectDataImage.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const PNG_HASH = media.hashImage(PNG);

function makeValidBasePack(extraItems = []) {
  return {
    allopack: {
      spec: '0.1',
      title: 'Audit Regression Pack',
      author: 'AlloFlow Test; educator review pending',
      license: 'Teacher review required',
      reviewStatus: 'Educator review pending',
      language: 'en',
      gradeLevel: '5th Grade',
      createdAt: '2026-11-22T00:00:00.000Z',
    },
    sourceTopic: 'Audit test topic',
    history: [
      {
        id: 't-dir',
        type: 'directions',
        title: 'Start Here',
        meta: 'Unit guide',
        timestamp: '2026-11-22T00:00:00.000Z',
        data: {
          body: 'Read the resource and check your understanding.',
          objectives: [{ id: 't-obj', label: 'Review the key concept.', kind: 'manual' }],
        },
      },
      ...extraItems,
    ],
  };
}

describe('dev-tools/audit_allopack_image_coverage.cjs', () => {
  it('validates all 67 current AlloPacks cleanly under native profile with zero missing alt, zero stale hashes, and zero unknown image fields', () => {
    const report = runAudit({ write: false, date: '2026-11-22' });
    expect(report.files).toBe(67);
    expect(report.embeddedImagePlacements).toBe(2530);
    expect(report.missingAlt).toBe(0);
    expect(report.staleAltHash).toBe(0);
    expect(report.unknownImageFields).toBe(0);
    expect(report.draftValidatorPassed).toBe(67);
    expect(report.draftValidatorFailed).toBe(0);
    expect(report.mediaValidatorPassed).toBe(67);
    expect(report.mediaValidatorFailed).toBe(0);
    // Honest educator review remains pending and is surfaced transparently.
    expect(report.educatorReviewPendingPacks).toBeGreaterThanOrEqual(10);
    expect(report.educatorVisualReviewPendingPacks).toBe(63);
    // Saved 2026-11-22 audit report matches current run.
    const saved = JSON.parse(fs.readFileSync('docs/allopack-quality-2026-11-22/image-and-draft-coverage.json', 'utf8'));
    expect(saved.files).toBe(report.files);
    expect(saved.missingAlt).toBe(0);
    expect(saved.unknownImageFields).toBe(0);
    expect(saved.draftValidatorPassed).toBe(67);
  }, 60000);

  it('recognizes canonical memory-aid visualImage+visualAlt, timeline image+alt, and applied-challenge visual.image+alt', () => {
    const pack = makeValidBasePack([
      {
        id: 't-memory',
        type: 'memory-aid',
        title: 'Memory Cue',
        meta: 'Memory aid',
        timestamp: '2026-11-22T00:00:00.000Z',
        data: {
          title: 'Memory Cue',
          instructions: 'Use the cue to remember the key fact.',
          cards: [{
            id: 'c1',
            type: 'visual-association',
            target: 'Water cycle',
            essentialFacts: ['Heat turns liquid water into vapor.'],
            aiExample: 'Sun lifts invisible water vapor from a warm lake.',
            mapping: 'Picture sunbeams pulling rising arrows above a lake.',
            studentPrompt: 'Sketch your own reminder.',
            reasoningPrompt: 'Explain how your picture shows evaporation.',
            visualImage: PNG,
            visualAlt: 'Warm yellow arrows rise from a calm blue lake beneath a bright sun.',
            visualAltSource: 'vision',
            visualNeedsReview: true,
          }],
        },
      },
      {
        id: 't-timeline',
        type: 'timeline',
        title: 'Steps',
        meta: 'Timeline',
        timestamp: '2026-11-22T00:00:00.000Z',
        data: {
          progressionLabel: 'First -> Last',
          items: [{
            date: 'Step 1',
            event: 'Water warms in sunlight.',
            image: PNG,
            alt: 'Sunlight warms the surface of a shallow pond.',
            altHash: PNG_HASH,
            altSource: 'vision',
            decorative: false,
          }],
        },
      },
      {
        id: 't-challenge',
        type: 'applied-challenge',
        title: 'Design Check',
        meta: 'Challenge',
        timestamp: '2026-11-22T00:00:00.000Z',
        data: {
          title: 'Design Check',
          instructions: 'Compare two designs using the evidence.',
          family: 'decide',
          brief: {
            family: 'decide',
            context: 'Two puddles sit in different parts of the schoolyard.',
            role: 'Student observer',
            audience: 'Classmates',
            drivingQuestion: 'Which puddle will dry faster?',
            deliverable: 'A short evidence-based explanation.',
            lockedLessonFacts: ['Sunlight warms liquid water and speeds evaporation.'],
            criteria: ['Use the observation data.'],
            constraints: ['Do not guess beyond the observations.'],
          },
          supports: { vocabulary: [], sentenceFrames: [], checkpoints: [] },
          visual: {
            image: PNG,
            alt: 'Two puddles lie side by side, one in bright sun and one in deep shade.',
            reviewed: false,
          },
        },
      },
    ]);
    const row = auditPack(pack, 'synthetic/valid.allopack.json');
    expect(row.missingAlt).toEqual([]);
    expect(row.staleAltHash).toEqual([]);
    expect(row.unknownImageFields).toEqual([]);
    expect(row.draftValidator.ok).toBe(true);
    expect(row.mediaValidator.ok).toBe(true);
    expect(row.draftValidator.warningCodes).toContain('native-visual-review-pending');
  });

  it('fails closed when visualAlt, timeline alt, or applied-challenge visual.alt is missing', () => {
    const pack = makeValidBasePack([
      {
        id: 't-memory',
        type: 'memory-aid',
        title: 'Memory Cue',
        meta: '',
        timestamp: '2026-11-22T00:00:00.000Z',
        data: {
          title: 'Memory Cue',
          instructions: 'Use the cue.',
          cards: [{
            id: 'c1',
            type: 'visual-association',
            target: 'Target',
            essentialFacts: ['Fact one.'],
            aiExample: 'Example cue.',
            mapping: 'Mapping note.',
            studentPrompt: 'Prompt.',
            reasoningPrompt: 'Reason.',
            visualImage: PNG,
            visualAlt: '   ',
            visualNeedsReview: true,
          }],
        },
      },
      {
        id: 't-timeline',
        type: 'timeline',
        title: 'Steps',
        meta: '',
        timestamp: '2026-11-22T00:00:00.000Z',
        data: {
          progressionLabel: 'First -> Last',
          items: [{ date: '1', event: 'First step.', image: PNG, alt: '', altHash: PNG_HASH }],
        },
      },
      {
        id: 't-challenge',
        type: 'applied-challenge',
        title: 'Check',
        meta: '',
        timestamp: '2026-11-22T00:00:00.000Z',
        data: {
          title: 'Check',
          instructions: 'Compare.',
          family: 'decide',
          brief: {
            family: 'decide',
            context: 'Context.',
            role: 'Role.',
            audience: 'Audience.',
            drivingQuestion: 'Question?',
            deliverable: 'Deliverable.',
            lockedLessonFacts: ['Fact.'],
            criteria: ['Criterion.'],
            constraints: ['Constraint.'],
          },
          supports: {},
          visual: { image: PNG, alt: '', reviewed: false },
        },
      },
    ]);
    const row = auditPack(pack, 'synthetic/missing-alt.allopack.json');
    expect(row.missingAlt).toEqual([
      'history[1].data.cards[0].visualAlt',
      'history[2].data.items[0].alt',
      'history[3].data.visual.alt',
    ]);
    expect(row.draftValidator.ok).toBe(false);
    expect(row.draftValidator.errorCodes).toContain('invalid-image-alt');
  });

  it('fails closed on unrecognized data:image fields and stale alt hashes', () => {
    const pack = makeValidBasePack([
      {
        id: 't-sort',
        type: 'concept-sort',
        title: 'Sort',
        meta: '',
        timestamp: '2026-11-22T00:00:00.000Z',
        data: {
          categories: [
            { id: 'a', label: 'A', color: 'bg-blue-500' },
            { id: 'b', label: 'B', color: 'bg-green-500' },
          ],
          items: [
            { id: 's1', content: 'Item 1', categoryId: 'a', image: PNG, imageAlt: 'Valid alt description for item 1.', imageAltHash: 'img-stale-00000000', bogusField: PNG },
            { id: 's2', content: 'Item 2', categoryId: 'a' },
            { id: 's3', content: 'Item 3', categoryId: 'b' },
            { id: 's4', content: 'Item 4', categoryId: 'b' },
          ],
        },
      },
    ]);
    const row = auditPack(pack, 'synthetic/bad-slot.allopack.json');
    expect(row.unknownImageFields).toEqual(['history[1].data.items[0].bogusField']);
    expect(row.staleAltHash).toEqual(['history[1].data.items[0].imageAltHash']);
    expect(row.draftValidator.ok).toBe(false);
    expect(row.draftValidator.errorCodes).toContain('unsupported-image-placement');
    expect(row.draftValidator.errorCodes).toContain('stale-image-alt');
  });
});
