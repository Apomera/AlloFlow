import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let api;
beforeAll(() => {
  globalThis.React = window.React = require(resolve('desktop/web-app/node_modules/react'));
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('story_forge_module.js');
  api = window.AlloModules.StoryForge._meta;
});

describe('Story Forge authored-work preservation', () => {
  it('keeps every authored section when an AI plan is shorter', () => {
    const original = [{ id: 'one', text: 'My opening', scaffoldFrame: 'Old prompt', plotBeat: 'setup' }, { id: 'two', text: 'My ending', scaffoldFrame: '', plotBeat: 'resolution' }];
    const result = api.mergeStoryForgePlan(original, api.normalizeStoryForgePlan({ frames: ['New prompt'] }), ['one', 'two']);
    expect(result.map(p => p.text)).toEqual(['My opening', 'My ending']);
    expect(result[0].scaffoldFrame).toBe('New prompt');
    expect(original[0].scaffoldFrame).toBe('Old prompt');
  });
  it('rejects malformed and oversized plans before they reach state', () => {
    for (const frames of [[], [''], [null], [{}], [17], Array(9).fill('A scene'), ['x'.repeat(5001)]]) {
      expect(() => api.normalizeStoryForgePlan({ frames })).toThrow();
    }
    expect(() => api.normalizeStoryForgePlan({ panels: [null] }, true)).toThrow();
  });
  it('keeps dialogue out of the replacement plan and preserves an authored beat', () => {
    const plan = api.normalizeStoryForgePlan({ panels: [{ caption: 'New prompt', beat: 'climax', speech: 'AI replacement' }] }, true);
    const result = api.mergeStoryForgePlan([{ id: 'one', text: 'My caption', plotBeat: 'setup' }], plan, ['one']);
    expect(result[0]).toMatchObject({ text: 'My caption', plotBeat: 'setup' });
    expect(plan[0]).not.toHaveProperty('speech');
  });
  it('matches by ID after reordering and never resurrects a removed section', () => {
    const result = api.mergeStoryForgePlan([{ id: 'two', text: 'Latest writing' }], [{ scaffoldFrame: 'One' }, { scaffoldFrame: 'Two' }], ['one', 'two']);
    expect(result).toEqual([{ id: 'two', text: 'Latest writing', scaffoldFrame: 'Two', plotBeat: undefined }]);
  });
});

describe('Story Forge coherent content and readiness', () => {
  it('counts authored comic speech, thoughts and sound effects but not scaffolds', () => {
    expect(api.getStoryForgeSectionText({ text: 'Caption', scaffoldFrame: 'AI prompt' }, { speaker: 'Mira', speech: 'We can cooperate.', thought: 'I hope so.', sfx: 'Splash!' }, true))
      .toBe('Caption\nWe can cooperate.\nI hope so.\nSplash!');
    expect(api.getStoryForgeSectionText({ text: '', scaffoldFrame: 'AI prompt' }, {}, true)).toBe('');
    expect(api.getStoryForgeSectionText({ text: 'Story' }, { speech: 'Comic' }, false)).toBe('Story');
  });
  it('treats review as required everywhere until a review is recorded', () => {
    const draft = { storyTitle: 'Bridge', layoutMode: 'prose', paragraphs: [{ id: 'one', text: 'Mira crossed the bridge and helped her friends.' }] };
    const pending = api.getStoryForgeProjectReadiness(draft);
    expect(pending.blockers.some(x => x.code === 'review-not-run')).toBe(true);
    expect(pending.summary).not.toContain('Ready to export');
    expect(pending.phases.find(x => x.key === 'export').status).toBe('blocked');
    const reviewed = api.getStoryForgeProjectReadiness({ ...draft, reviewSignals: { completed: true } });
    expect(reviewed.blockers).toEqual([]);
  });
  it('recognizes dialogue-only comic content', () => {
    const ready = api.getStoryForgeProjectReadiness({ storyTitle: 'Bridge', layoutMode: 'comic', paragraphs: [{ id: 'one', text: '' }], panelDialogue: { one: { speech: 'We can cooperate.' } }, reviewSignals: { completed: true } });
    expect(ready.metrics.contentSections).toBe(1);
    expect(ready.blockers.some(x => x.code === 'missing-story-content')).toBe(false);
  });
});

describe('comic export proof and recovery', () => {
  it('calculates gutter targets without crashing when a speech bubble is entered', () => {
    const paragraph = { id: 'one', text: '' };
    const context = { panelDialogue: { one: { speech: 'We can cooperate.' } }, panelThumbnails: { one: { letteringSpace: 'top-left' } }, comicPrintSafety: { format: 'letter', gutter: 'standard', includeBleed: true } };
    const proof = api.getComicExportProof([{ page: 1, layout: 'grid', panels: [{ paragraph, idx: 0 }] }], context);
    expect(proof.rows).toHaveLength(1);
    expect(proof.rows[0].issues.some(x => x.key === 'empty-panels')).toBe(false);
  });
  it('restores a reviewed dialogue-only comic without sending it back to an empty draft', () => {
    const draft = { phase: 'export', storyTitle: 'Bridge', artifactType: 'comic', paragraphs: [{ id: 'one', text: '' }], panelDialogue: { one: { speech: 'We can cooperate.' } } };
    draft.reviewedDraftSignature = api.getStoryForgeReviewSignature(draft);
    expect(api.getStoryForgeRestoredPhase(draft)).toBe('export');
  });
});
