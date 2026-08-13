// SSR render golden + reading-level integrity for StoryForge (story_forge_module.js,
// built from story_forge_source.jsx).
//
// WHY: StoryForge is a 6-phase scaffolded creative-writing wizard that reports a
// Flesch-Kincaid reading level used to tell students/teachers whether a draft is at
// the target grade. The FK math + grade-label mapping are pure and had no coverage,
// and the component itself had only an indirect e2e tile check. We pin (a) the FK
// computation against hand-computed fixtures, and (b) the component's open/closed SSR
// render contract.
//
// The pure helpers are module-level; exposed via a read-only seam
// (window.AlloModules.StoryForge._meta) added to BOTH the source build template and
// the generated module. Set at load, so the FK tests need no render.

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, ReactDOMServer, StoryForge, FK;

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
  globalThis.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('story_forge_module.js');
  StoryForge = window.AlloModules.StoryForge;
  FK = StoryForge && StoryForge._meta;
  if (!FK || !FK.computeReadingLevel) throw new Error('StoryForge._meta seam not present');
});

describe('computeReadingLevel — Flesch-Kincaid grade', () => {
  it('returns null for empty / too-short text (<20 chars trimmed)', () => {
    expect(FK.computeReadingLevel('')).toBeNull();
    expect(FK.computeReadingLevel('short')).toBeNull();
  });
  it('exact FK on an all-monosyllabic sentence (10 words, 1 sentence)', () => {
    // syllables == words == 10 → avgSPW 1, avgWPS 10 → FK = 0.39*10 + 11.8*1 - 15.59 = 0.11 → 0.1
    const r = FK.computeReadingLevel('the cat sat on the mat and the dog ran.');
    expect(r).toMatchObject({ sentences: 1, words: 10, syllables: 10, avgWordsPerSentence: 10, grade: 0.1 });
  });
  it('clamps grade to [0, 18] and a complex passage reads higher than a simple one', () => {
    const simple = FK.computeReadingLevel('I am a cat. I am a dog. I am a fish.');
    expect(simple.grade).toBeGreaterThanOrEqual(0);
    const complex = FK.computeReadingLevel('Extraordinarily sophisticated multidisciplinary methodologies necessitate comprehensive institutional reorganization throughout interconnected administrative infrastructures simultaneously.');
    expect(complex.grade).toBeLessThanOrEqual(18);
    expect(complex.grade).toBeGreaterThan(simple.grade);
  });
  it('counts sentences and words', () => {
    const r = FK.computeReadingLevel('First sentence here. Second one is a bit longer than that one.');
    expect(r.sentences).toBe(2);
    expect(r.words).toBeGreaterThan(8);
  });
});

describe('gradeLevelToNumber', () => {
  it('maps Pre-K / K to 0 and College to 13', () => {
    expect(FK.gradeLevelToNumber('Pre-K')).toBe(0);
    expect(FK.gradeLevelToNumber('K')).toBe(0);
    expect(FK.gradeLevelToNumber('College')).toBe(13);
  });
  it('non-string → null', () => {
    expect(FK.gradeLevelToNumber(42)).toBeNull();
    expect(FK.gradeLevelToNumber(null)).toBeNull();
  });
});

describe('comic lettering width persistence', () => {
  it('clamps imported bubble widths and keeps valid placement data', () => {
    expect(FK.clampComicLetteringWidth(12)).toBe(28);
    expect(FK.clampComicLetteringWidth(120)).toBe(86);
    expect(FK.clampComicLetteringWidth(54.44)).toBe(54.4);
    expect(FK.clampComicLetteringWidth(null)).toBe(72);

    expect(FK.sanitizePanelThumbnails({
      panelA: { letteringSpace: 'top-right', letteringWidth: 120, letteringX: 4, letteringY: 99 },
      panelB: { letteringWidth: 12 },
      invalid: { letteringWidth: 'wide' },
      empty: { letteringWidth: null },
    })).toEqual({
      panelA: { letteringSpace: 'top-right', letteringWidth: 86, letteringX: 8, letteringY: 92 },
      panelB: { letteringWidth: 28 },
    });
  });
});

describe('comic production snapshots', () => {
  it('sanitizes bounded history state without serializing unrelated project data', () => {
    const paragraphs = Array.from({ length: 10 }, (_, idx) => ({
      id: `p-${idx}`,
      text: idx === 0 ? 'Opening panel' : `Panel ${idx + 1}`,
      scaffoldFrame: null,
      ignored: 'not persisted',
    }));
    const snapshot = FK.createComicProductionSnapshot({
      paragraphs,
      comicPageLayout: 'invalid-layout',
      comicPageComposer: { panelsPerPage: 99, pages: { 1: { layout: 'grid', note: 'Turn reveal' } } },
      comicPrintSafety: { format: 'invalid-format', showGuides: false },
      comicContinuity: { cast: 'Ari and Bo', unexpected: 'drop this' },
      panelDialogue: { 'p-0': { speech: 'Ready?', unsafe: '<script>' }, empty: {} },
      panelDirections: { 'p-0': { shot: 'wide', angle: 'invalid-angle' } },
      panelThumbnails: { 'p-0': { letteringSpace: 'top-right', letteringWidth: 900 } },
      panelLayouts: { 'p-0': { frame: 'wide', colSpan: 9, rowSpan: -2 } },
      panelStickers: { 'p-0': 'STAR', empty: '' },
      illustrations: { 'p-0': { imageUrl: 'data:image/png;base64,large' } },
    });

    expect(snapshot.paragraphs).toHaveLength(8);
    expect(snapshot.paragraphs[0]).toEqual({ id: 'p-0', text: 'Opening panel', scaffoldFrame: '', plotBeat: '' });
    expect(snapshot.comicPageLayout).toBe('grid');
    expect(snapshot.comicPageComposer.panelsPerPage).toBe(4);
    expect(snapshot.comicPrintSafety).toMatchObject({ format: 'letter', gutter: 'standard', showGuides: false, includeBleed: true });
    expect(snapshot.panelDialogue).toEqual({ 'p-0': { speech: 'Ready?' } });
    expect(snapshot.panelDirections).toEqual({ 'p-0': { shot: 'wide' } });
    expect(snapshot.panelThumbnails['p-0']).toMatchObject({ letteringSpace: 'top-right', letteringWidth: 86 });
    expect(snapshot.panelLayouts['p-0']).toMatchObject({ frame: 'wide', colSpan: 2, rowSpan: 1 });
    expect(snapshot.panelStickers).toEqual({ 'p-0': 'STAR' });
    expect(snapshot).not.toHaveProperty('illustrations');
  });
});

describe('StoryForge draft persistence sanitizer', () => {
  it('bounds malformed imported data and restores safe workflow defaults', () => {
    const draft = FK.sanitizeStoryForgeDraft({
      storyTitle: 42,
      genre: 'toString',
      vocabTerms: [
        { term: '  anchor  ', definition: 7 },
        null,
        { term: '   ', definition: 'ignored' },
        { term: 'x'.repeat(140), definition: 'd'.repeat(700) },
      ],
      artStyle: 'constructor',
      paragraphs: [
        { id: ' duplicate ', text: 'a'.repeat(50050), scaffoldFrame: 7 },
        { id: 'duplicate', text: 17, plotBeat: 'rising' },
        ...Array.from({ length: 8 }, (_, index) => ({ id: `extra-${index}`, text: 'bounded' })),
      ],
      draftCount: 120,
      phase: 'unknown-phase',
      language: 'xx',
      customLanguage: 5,
      storyShape: 'valueOf',
      valenceByPara: { high: 9, low: -9, invalid: 'none', decimal: '2.26' },
      layoutMode: 'toString',
      comicPageLayout: 'constructor',
      comicPageComposer: { panelsPerPage: 99, pages: { 1: { layout: 'toString' } } },
      comicPrintSafety: { format: 'toString', gutter: 'constructor' },
      savedAt: 'not-a-date',
    });

    expect(draft).toMatchObject({
      storyTitle: '',
      genre: 'free',
      artStyle: 'storybook',
      draftCount: 99,
      phase: 'configure',
      language: 'en',
      customLanguage: '',
      storyShape: '',
      layoutMode: 'prose',
      comicPageLayout: 'grid',
      savedAt: '',
    });
    expect(draft.vocabTerms).toHaveLength(2);
    expect(draft.vocabTerms[0]).toEqual({ term: 'anchor', definition: '' });
    expect(draft.vocabTerms[1].term).toHaveLength(120);
    expect(draft.vocabTerms[1].definition).toHaveLength(600);
    expect(draft.paragraphs).toHaveLength(8);
    expect(draft.paragraphs[0]).toMatchObject({ id: 'duplicate', scaffoldFrame: '' });
    expect(draft.paragraphs[0].text).toHaveLength(50000);
    expect(draft.paragraphs[1]).toMatchObject({ id: 'p-1', text: '', plotBeat: 'rising' });
    expect(new Set(draft.paragraphs.map(item => item.id)).size).toBe(draft.paragraphs.length);
    expect(draft.valenceByPara).toEqual({ high: 5, low: -5, decimal: 2.3 });
    expect(draft.comicPageComposer).toEqual({ panelsPerPage: 4, pages: {} });
    expect(draft.comicPrintSafety).toEqual({ format: 'letter', gutter: 'standard', showGuides: true, includeBleed: true });
  });

  it('recognizes meaningful work without treating a blank default draft as recoverable', () => {
    expect(FK.isStoryForgeDraftMeaningful({})).toBe(false);
    expect(FK.isStoryForgeDraftMeaningful({ storyTitle: 'A real draft' })).toBe(true);
    expect(FK.isStoryForgeDraftMeaningful({ layoutMode: 'comic' })).toBe(true);
    expect(FK.isStoryForgeDraftMeaningful({ panelDialogue: { 'p-1': { speech: 'Ready?' } } })).toBe(true);
  });

  it('preserves valid comic production settings and canonicalizes save metadata', () => {
    const draft = FK.sanitizeStoryForgeDraft({
      storyTitle: 'Page Turn',
      phase: 'export',
      language: 'other',
      customLanguage: 'Klingon',
      layoutMode: 'comic',
      comicPageLayout: 'manga',
      comicPageComposer: { panelsPerPage: 6, pages: { 1: { layout: 'manga', turn: 'reveal', note: 'Hold the beat' } } },
      comicPrintSafety: { format: 'digital', gutter: 'wide', showGuides: false, includeBleed: true },
      panelDialogue: { 'p-1': { speaker: 'Ari', speech: 'Ready?' } },
      savedAt: '2026-07-28T12:00:00-04:00',
    });

    expect(draft).toMatchObject({
      phase: 'export',
      language: 'other',
      customLanguage: 'Klingon',
      layoutMode: 'comic',
      comicPageLayout: 'manga',
      comicPrintSafety: { format: 'digital', gutter: 'none', showGuides: false, includeBleed: false },
      panelDialogue: { 'p-1': { speaker: 'Ari', speech: 'Ready?' } },
      savedAt: '2026-07-28T16:00:00.000Z',
    });
    expect(draft.comicPageComposer).toEqual({ panelsPerPage: 6, pages: { 1: { layout: 'manga', turn: 'reveal', note: 'Hold the beat' } } });
  });
});
describe('StoryForge project vault data', () => {
  it('preserves bounded artwork, cover, narration, and cast references in project snapshots', () => {
    const project = FK.sanitizeStoryForgeProject({
      storyTitle: 'Vault comic',
      layoutMode: 'comic',
      paragraphs: [{ id: 'p-1', text: 'A full panel caption.' }],
      illustrations: {
        'p-1': { imageUrl: 'data:image/png;base64,art', prompt: 'A stable panel prompt' },
        unsafe: { imageUrl: 'javascript:alert(1)' },
      },
      coverArt: 'data:image/jpeg;base64,cover',
      audioSegments: {
        'p-1': { studentAudioBase64: 'audio-bytes', studentAudioMimeType: 'audio/webm', studentAudioUrl: 'blob:discard-me' },
      },
      comicContinuity: {
        references: [{ name: 'Mina', role: 'Explorer', appearance: 'Round glasses', wardrobe: 'Red jacket', props: 'Compass', imageUrl: 'https://example.com/mina.png' }],
      },
    });

    expect(project._storyForgeProjectVersion).toBe(3);
    expect(project.illustrations).toEqual({ 'p-1': { imageUrl: 'data:image/png;base64,art', prompt: 'A stable panel prompt' } });
    expect(project.coverArt).toBe('data:image/jpeg;base64,cover');
    expect(project.audioSegments['p-1']).toMatchObject({ studentAudioBase64: 'audio-bytes', studentAudioMimeType: 'audio/webm' });
    expect(project.audioSegments['p-1']).not.toHaveProperty('studentAudioUrl');
    expect(project.comicContinuity.references[0]).toMatchObject({ name: 'Mina', role: 'Explorer', appearance: 'Round glasses', imageUrl: 'https://example.com/mina.png' });
    expect(FK.isStoryForgeProjectMeaningful({ illustrations: { 'p-1': { imageUrl: 'data:image/png;base64:art' } } })).toBe(true);
  });
});
describe('StoryForge production readiness', () => {
  it('blocks export when no story content exists', () => {
    const readiness = FK.getStoryForgeProjectReadiness({
      layoutMode: 'prose',
      genre: 'adventure',
      paragraphs: [{ id: 'p-1', text: '' }],
      vocabTerms: [],
    });

    expect(readiness.blockers.map(issue => issue.code)).toContain('missing-story-content');
    expect(readiness.phases.find(item => item.key === 'write')?.status).toBe('blocked');
    expect(readiness.phases.find(item => item.key === 'export')?.status).toBe('blocked');
  });

  it('keeps narration optional while recognizing a production-ready prose story', () => {
    const paragraphText = 'Bright ideas grow when curious writers revise each scene with specific details and meaningful character choices. '.repeat(4);
    const readiness = FK.getStoryForgeProjectReadiness({
      storyTitle: 'The Bright Idea',
      genre: 'adventure',
      layoutMode: 'prose',
      paragraphs: [
        { id: 'p-1', text: paragraphText },
        { id: 'p-2', text: paragraphText },
      ],
      vocabTerms: [{ term: 'bright', definition: 'full of light' }],
      vocabUsedCount: 1,
      illustrations: {
        'p-1': { imageUrl: 'https://example.test/one.png' },
        'p-2': { imageUrl: 'https://example.test/two.png' },
      },
      reviewSignals: { grading: true },
    });

    expect(readiness.blockers).toHaveLength(0);
    expect(readiness.warnings).toHaveLength(0);
    expect(readiness.phases.find(item => item.key === 'narrate')?.status).toBe('optional');
    expect(readiness.percent).toBe(100);
    expect(readiness.summary).toBe('Production-ready');
  });

  it('flags unplaced and gutter-risk comic lettering as recommended layout fixes', () => {
    const paragraphs = [
      { id: 'p-1', text: 'The door opens.' },
      { id: 'p-2', text: 'A bright room appears.' },
    ];
    const comicPages = [{
      page: 1,
      layout: 'grid',
      panels: paragraphs.map((paragraph, idx) => ({ paragraph, idx })),
    }];
    const readiness = FK.getStoryForgeProjectReadiness({
      storyTitle: 'Doorway',
      genre: 'mystery',
      layoutMode: 'comic',
      paragraphs,
      comicPages,
      panelDialogue: {
        'p-1': { speech: 'Ready?' },
        'p-2': { thought: 'What is that light?' },
      },
      panelThumbnails: {
        'p-2': { letteringSpace: 'top-left' },
      },
      comicPrintSafety: { format: 'letter', gutter: 'standard', includeBleed: true },
      vocabTerms: [{ term: 'bright', definition: 'full of light' }],
      vocabUsedCount: 1,
    });

    expect(readiness.blockers).toEqual([]);
    expect(readiness.warnings.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'unplaced-lettering',
      'gutter-lettering-conflict',
    ]));
    expect(readiness.comicStats).toMatchObject({ bubblePanels: 2, placedBubbles: 1, unplacedBubbles: 1, gutterRiskPanels: 1 });
  });
});

describe('comic production statistics', () => {
  it('does not require a lettering anchor for an SFX-only panel', () => {
    const paragraph = { id: 'p-1', text: 'The engine starts.' };
    const stats = FK.getComicPageProductionStats({
      page: 1,
      layout: 'grid',
      panels: [{ paragraph, idx: 0 }],
    }, {
      panelDialogue: { 'p-1': { sfx: 'VROOM' } },
      comicPrintSafety: { format: 'letter', gutter: 'standard', includeBleed: true },
    });

    expect(stats).toMatchObject({ bubblePanels: 0, placedBubbles: 0, unplacedBubbles: 0, attention: 0 });
  });

  it('tracks a thought-only panel as a movable lettering bubble', () => {
    const paragraph = { id: 'p-1', text: 'The answer becomes clear.' };
    const stats = FK.getComicPageProductionStats({
      page: 1,
      layout: 'grid',
      panels: [{ paragraph, idx: 0 }],
    }, {
      panelDialogue: { 'p-1': { thought: 'I finally understand.' } },
      panelThumbnails: { 'p-1': { letteringSpace: 'top-right' } },
      comicPrintSafety: { format: 'digital', gutter: 'none' },
    });

    expect(stats).toMatchObject({ bubblePanels: 1, placedBubbles: 1, unplacedBubbles: 0, gutterRiskPanels: 0 });
  });
});
describe('StoryForge — SSR render contract', () => {
  const render = (props) => ReactDOMServer.renderToStaticMarkup(React.createElement(StoryForge, props));
  const base = { isOpen: true, onClose: () => {}, onCallGemini: async () => '', t: (k) => k, codename: 'Bright Tiger', gradeLevel: '5th Grade' };
  it('renders no dialog when closed', () => {
    expect(render({ ...base, isOpen: false })).not.toContain('role="dialog"');
  });
  it('open: renders the modal dialog (default configure phase) without crashing', () => {
    const html = render(base);
    expect(html).toContain('role="dialog"');
    expect(html.length).toBeGreaterThan(1000);
  });
});


describe('comic continuity audit', () => {
  it('flags untracked speakers and repeated camera setups with page-aware panel targets', () => {
    const paragraphs = [
      { id: 'p-1', text: 'Mina enters.' },
      { id: 'p-2', text: 'A stranger answers.' },
      { id: 'p-3', text: 'Mina looks closer.' },
      { id: 'p-4', text: 'The clue remains hidden.' },
    ];
    const comicPages = [{
      page: 1,
      panels: paragraphs.map((paragraph, idx) => ({ paragraph, idx })),
    }];
    const directions = Object.fromEntries(paragraphs.map((paragraph) => [
      paragraph.id,
      { shot: 'wide', angle: 'eye-level', mood: 'tense' },
    ]));
    const audit = FK.getComicContinuityAudit(paragraphs, {
      comicPages,
      comicContinuity: {
        references: [
          { id: 'cast-1', name: 'Mina' },
          { id: 'cast-2', name: 'Bo' },
        ],
      },
      panelDialogue: {
        'p-1': { speaker: 'Mina' },
        'p-2': { speaker: 'Rook' },
        'p-3': { speaker: 'Mina' },
      },
      panelDirections: directions,
    });

    expect(audit.status).toBe('Review');
    expect(audit.rows.map(row => row.key)).toEqual(expect.arrayContaining([
      'untracked-speakers',
      'unused-cast-references',
      'repeated-camera-setup-1',
    ]));
    expect(audit.rows.find(row => row.key === 'untracked-speakers')?.panelTargets[0]).toMatchObject({
      id: 'p-2',
      number: 2,
      page: 1,
    });
  });
});

describe('comic cast aliases', () => {
  it('matches configured aliases and persists them through comic snapshots', () => {
    const paragraphs = [
      { id: 'p-1', text: 'Mina raises the compass.' },
      { id: 'p-2', text: 'Captain M calls from the doorway.' },
    ];
    const continuity = {
      references: [
        { id: 'cast-1', name: 'Mina', aliases: 'Min, Captain M', role: 'Explorer' },
      ],
    };
    const audit = FK.getComicContinuityAudit(paragraphs, {
      comicContinuity: continuity,
      panelDialogue: {
        'p-1': { speaker: 'Mina', speech: 'I found it.' },
        'p-2': { speaker: 'Captain M', speech: 'Keep moving.' },
      },
    });

    expect(audit.status).toBe('Clear');
    expect(audit.usedReferenceCount).toBe(1);
    expect(audit.referenceNames).toEqual(['Mina']);

    const snapshot = FK.createComicProductionSnapshot({
      paragraphs,
      comicContinuity: continuity,
    });
    expect(snapshot.comicContinuity.references[0]).toMatchObject({
      name: 'Mina',
      aliases: 'Min, Captain M',
    });
  });
});
describe('comic reference art payloads', () => {
  it('extracts only local image data for the generation consistency hook', () => {
    expect(FK.getImageBase64Payload('data:image/png;base64,abc123')).toBe('abc123');
    expect(FK.getImageBase64Payload('https://example.com/reference.png')).toBe('');
    expect(FK.getImageBase64Payload('data:text/plain;base64,not-image')).toBe('');
    expect(FK.getImageBase64Payload('')).toBe('');
  });
});
