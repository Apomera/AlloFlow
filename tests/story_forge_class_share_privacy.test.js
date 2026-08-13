import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const source = readFileSync(resolve(process.cwd(), 'story_forge_source.jsx'), 'utf8');
const startMarker = '// ── Class-share privacy allowlist (pure) ──';
const endMarker = '// ── End class-share privacy allowlist ──';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) throw new Error('StoryForge class-share helper block was not found');

const helperBlock = source.slice(start, end + endMarker.length);
const context = {};
vm.runInNewContext(`${helperBlock}
globalThis.__storyForgeClassShareHelpers = {
  buildStoryForgeClassSharePayload,
  getStoryForgeClassSharePreview,
};`, context);

const {
  buildStoryForgeClassSharePayload,
  getStoryForgeClassSharePreview,
} = context.__storyForgeClassShareHelpers;
const plain = value => JSON.parse(JSON.stringify(value));
const collectKeys = (value, output = new Set()) => {
  if (Array.isArray(value)) {
    value.forEach(item => collectKeys(item, output));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      output.add(key);
      collectKeys(item, output);
    });
  }
  return output;
};

const sensitiveProject = {
  storyTitle: '  The Clockwork Garden  ',
  authorName: 'Real Student Name',
  penName: 'Blue Fox',
  artifactType: 'comic',
  layoutMode: 'comic',
  genre: 'fantasy',
  storyPrompt: 'private prompt',
  rubricText: 'private rubric',
  vocabTerms: [{ term: 'private vocabulary' }],
  paragraphs: [{
    id: 'private-panel-id',
    text: 'Clockwork flowers opened at dawn.',
    scaffoldFrame: 'private scaffold',
    plotBeat: 'climax',
  }],
  illustrations: {
    'private-panel-id': {
      imageUrl: 'data:image/png;base64,cHVibGljLWltYWdl',
      prompt: 'private generation prompt',
    },
  },
  coverArt: 'data:image/png;base64,Y292ZXI=',
  gradingResult: { totalScore: '20/20', feedback: 'private review' },
  gradingScore: '20/20',
  readingGrade: 8,
  readingLevel: { grade: 8 },
  draftCount: 7,
  reviewedDraftSignature: 'private-review-signature',
  comicContinuity: { cast: 'private cast notes' },
  comicFlowReport: { score: 99, summary: 'private production review' },
  panelDialogue: { 'private-panel-id': { speech: 'private raw dialogue' } },
  panelDirections: { 'private-panel-id': { shot: 'private shot' } },
  panelThumbnails: { 'private-panel-id': { sketchNote: 'private rough' } },
  panelLayouts: { 'private-panel-id': { frame: 'private frame' } },
  panelStickers: { 'private-panel-id': ['private sticker'] },
  comicPageComposer: { pages: { 1: { note: 'private page note' } } },
  comicPrintSafety: { gutter: 'private gutter' },
  audioSegments: { 'private-panel-id': { aiAudioUrl: 'data:audio/mp3;base64,cHJpdmF0ZQ==' } },
  revisionHistory: [{ label: 'private checkpoint' }],
  analytics: { draftCount: 7, readingLevel: { grade: 8 } },
  achievements: ['private achievement'],
  xp: { totalXP: 999 },
};

describe('StoryForge class-share privacy allowlist', () => {
  it('defaults to aggregate gallery metadata and excludes sensitive project state', () => {
    const payload = plain(buildStoryForgeClassSharePayload(sensitiveProject));

    expect(Object.keys(payload)).toEqual([
      'schema',
      'schemaVersion',
      'type',
      'visibility',
      'title',
      'penName',
      'artifactType',
      'genre',
      'counts',
      'idempotencyKey',
      'approximateBytes',
    ]);
    expect(payload).toMatchObject({
      schema: 'storyforge.class-share',
      schemaVersion: 1,
      type: 'storyforge',
      visibility: 'class',
      title: 'The Clockwork Garden',
      penName: 'Blue Fox',
      artifactType: 'comic',
      genre: 'fantasy',
      counts: { scenes: 1, words: 5, media: 0 },
    });
    expect(payload).not.toHaveProperty('coverArt');
    expect(payload).not.toHaveProperty('scenes');
    expect(JSON.stringify(payload)).not.toContain('Real Student Name');

    const forbiddenKeys = [
      'gradingResult', 'gradingScore', 'readingGrade', 'readingLevel', 'draftCount',
      'reviewedDraftSignature', 'comicContinuity', 'comicFlowReport', 'panelDialogue',
      'panelDirections', 'panelThumbnails', 'panelLayouts', 'panelStickers',
      'comicPageComposer', 'comicPrintSafety', 'scaffoldFrame', 'plotBeat', 'id',
      'storyPrompt', 'rubricText', 'vocabTerms', 'audioSegments', 'revisionHistory',
      'analytics', 'achievements', 'xp', 'prompt',
    ];
    const keys = collectKeys(payload);
    forbiddenKeys.forEach(key => expect(keys.has(key), `forbidden key leaked: ${key}`).toBe(false));
  });

  it('shares only explicitly enabled cover, scene text, and safe illustrations', () => {
    const project = {
      ...sensitiveProject,
      paragraphs: [
        { id: 'p-0', text: 'First scene text that will be shortened.', illustration: 'javascript:alert(1)' },
        { id: 'p-1', text: 'Second scene.', illustration: 'https://school.example/panel-two.png' },
      ],
      illustrations: {
        'p-0': { imageUrl: 'data:image/png;base64,cGFuZWwtb25l', prompt: 'must not leak' },
      },
    };
    const payload = plain(buildStoryForgeClassSharePayload(project, {
      penName: '  Night Owl  ',
      includeCoverArt: true,
      includeSceneText: true,
      includeIllustrations: true,
      maxSceneTextLength: 16,
      idempotencyScope: 'classroom-42',
    }));

    expect(payload.coverArt).toBe('data:image/png;base64,Y292ZXI=');
    expect(payload.scenes).toEqual([
      { text: 'First scene text', illustration: 'data:image/png;base64,cGFuZWwtb25l' },
      { text: 'Second scene.', illustration: 'https://school.example/panel-two.png' },
    ]);
    expect(payload.counts).toEqual({ scenes: 2, words: 9, media: 3 });
    expect(payload.penName).toBe('Night Owl');
    expect(JSON.stringify(payload)).not.toContain('must not leak');
    expect(payload.approximateBytes).toBe(Buffer.byteLength(JSON.stringify(payload), 'utf8'));

    const preview = plain(getStoryForgeClassSharePreview(payload));
    expect(preview).toMatchObject({
      title: 'The Clockwork Garden',
      penName: 'Night Owl',
      artifactType: 'comic',
      genre: 'fantasy',
      sceneCount: 2,
      wordCount: 9,
      mediaCount: 3,
      scenesWithText: 2,
      scenesWithIllustration: 2,
      includesCoverArt: true,
      approximateBytes: payload.approximateBytes,
    });
    expect(preview.approximateKilobytes).toBeGreaterThanOrEqual(1);
    expect(preview).not.toHaveProperty('scenes');
  });

  it('derives a deterministic, scope-aware idempotency key from public content only', () => {
    const options = {
      includeSceneText: true,
      includeIllustrations: true,
      idempotencyScope: 'classroom-42',
    };
    const first = plain(buildStoryForgeClassSharePayload(sensitiveProject, options));
    const samePublicContent = plain(buildStoryForgeClassSharePayload({
      ...sensitiveProject,
      gradingResult: { totalScore: '1/20', feedback: 'changed private review' },
      readingLevel: { grade: 2 },
      draftCount: 99,
      comicContinuity: { cast: 'changed private notes' },
    }, options));
    const changedScope = plain(buildStoryForgeClassSharePayload(sensitiveProject, {
      ...options,
      idempotencyScope: 'classroom-43',
    }));
    const changedPublicContent = plain(buildStoryForgeClassSharePayload({
      ...sensitiveProject,
      paragraphs: [{ ...sensitiveProject.paragraphs[0], text: 'A different public scene.' }],
    }, options));

    expect(first.idempotencyKey).toMatch(/^storyforge-class-v1-[0-9a-f]{16}$/);
    expect(samePublicContent.idempotencyKey).toBe(first.idempotencyKey);
    expect(changedScope.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(changedPublicContent.idempotencyKey).not.toBe(first.idempotencyKey);
  });
});
