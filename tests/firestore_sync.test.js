// Golden master for firestore_sync_module.js sanitizeHistoryForCloud — the
// function that scrubs history items before they are written to Firestore.
// It is a PRIVACY boundary: heavy/identifying payloads (generated images,
// avatars, and — as of 2026-06-08 — a child's raw read-aloud VOICE clip) must
// be stripped so they never reach the cloud, while the rest of the item
// (scores/metrics/structure) round-trips so reload-from-cloud still works.
// This pins that contract; a regression here silently egresses student data.

import { describe, it, beforeAll, expect } from 'vitest';
import { loadAlloModule } from './setup.js';

let sanitize;
let prepareResources;
let estimateBytes;
let hydrate;

beforeAll(() => {
  loadAlloModule('firestore_sync_module.js');
  sanitize = window.sanitizeHistoryForCloud;
  prepareResources = window.prepareSessionResourcesForWrite;
  estimateBytes = window.estimateJsonBytes;
  hydrate = window.hydrateHistory;
});

describe('sanitizeHistoryForCloud — cloud privacy boundary', () => {
  it('is registered', () => {
    expect(typeof sanitize).toBe('function');
  });

  it('strips a fluency-record raw voice clip but keeps the scored result', () => {
    const item = {
      type: 'fluency-record',
      data: { metrics: { wcpm: 92, accuracy: 0.97 }, wordData: [{ w: 'the', ok: true }], feedback: 'nice pacing', audioRecording: 'BBBBBBBBBBBB...veryLongBase64', mimeType: 'audio/webm' },
    };
    const [out] = sanitize([item]);
    expect(out.data.audioRecording).toBeUndefined();
    expect(out.data.mimeType).toBeUndefined();
    // scored result kept so the cloud record is still meaningful
    expect(out.data.metrics).toEqual({ wcpm: 92, accuracy: 0.97 });
    expect(out.data.wordData).toEqual([{ w: 'the', ok: true }]);
    expect(out.data.feedback).toBe('nice pacing');
    // original input is not mutated
    expect(item.data.audioRecording).toBe('BBBBBBBBBBBB...veryLongBase64');
  });

  it('leaves a fluency-record with no audio untouched', () => {
    const item = { type: 'fluency-record', data: { metrics: { wcpm: 100 } } };
    const [out] = sanitize([item]);
    expect(out.data).toEqual({ metrics: { wcpm: 100 } });
  });

  it('nulls an image item imageUrl (existing behavior — regression pin)', () => {
    const [out] = sanitize([{ type: 'image', data: { prompt: 'a cat', imageUrl: 'data:image/png;base64,AAAA' } }]);
    expect(out.data.imageUrl).toBeNull();
    expect(out.data.prompt).toBe('a cat');
  });

  it('strips glossary entry images and persona avatarUrls', () => {
    const [glossary] = sanitize([{ type: 'glossary', data: [{ term: 'cell', image: 'data:...' }] }]);
    expect(glossary.data[0].image).toBeUndefined();
    expect(glossary.data[0].term).toBe('cell');
    const [persona] = sanitize([{ type: 'persona', data: [{ name: 'Ada', avatarUrl: 'data:...' }] }]);
    expect(persona.data[0].avatarUrl).toBeUndefined();
    expect(persona.data[0].name).toBe('Ada');
  });

  it('strips legacy Persona session fields while preserving the reusable character profile', () => {
    const item = {
      type: 'persona',
      data: [{
        id: 'ada',
        name: 'Ada',
        description: 'Computing pioneer',
        avatarUrl: 'data:image/png;base64,AAAA',
        chatHistory: [{ role: 'user', text: 'A private question' }],
        savedDialogue: [{ role: 'model', text: 'A private answer' }],
      }],
    };

    const [out] = sanitize([item]);
    expect(out.data[0]).toEqual({ id: 'ada', name: 'Ada', description: 'Computing pioneer' });
    expect(item.data[0].chatHistory).toHaveLength(1);
    expect(item.data[0].savedDialogue).toHaveLength(1);
  });

  it('excludes private Persona-derived records and nested Persona session artifacts', () => {
    const safe = { id: 'safe', type: 'leveled-text', data: { text: 'Keep me' } };
    const privateItems = [
      { id: 'transcript', type: 'persona-transcript', data: { text: 'private' } },
      { id: 'reflection', type: 'persona-reflection', data: { text: 'private' } },
      { id: 'summary', type: 'persona-summary', data: { text: 'private' } },
      { id: 'read-aloud', type: 'persona-session-read-aloud', data: { messages: [] } },
      { id: 'direct-artifact', artifactType: 'persona-session-read-aloud', messages: [] },
      { id: 'wrapped', type: 'artifact', data: { artifactType: 'persona-session-read-aloud', messages: [] } },
    ];

    expect(sanitize([safe, ...privateItems])).toEqual([safe]);
  });

  it('nulls an adventure sceneImage + inventory images', () => {
    const [out] = sanitize([{ type: 'adventure', data: { sceneImage: 'data:...', inventory: [{ name: 'key', image: 'data:...' }], snapshot: { xp: 5, gold: 2 } } }]);
    expect(out.data.sceneImage).toBeNull();
    expect(out.data.inventory[0].image).toBeUndefined();
    expect(out.data.inventory[0].name).toBe('key');
  });

  it('passes a plain text item through unchanged', () => {
    const item = { type: 'leveled-text', data: { text: 'hello' } };
    const [out] = sanitize([item]);
    expect(out).toEqual(item);
  });

  it('SECURITY: serialized cloud payload contains no raw voice/image data', () => {
    const history = [
      { type: 'fluency-record', data: { metrics: { wcpm: 90 }, audioRecording: 'RAWVOICEAUDIOBASE64', mimeType: 'audio/webm' } },
      { type: 'image', data: { imageUrl: 'RAWIMAGEBASE64' } },
    ];
    const serialized = JSON.stringify(sanitize(history));
    expect(serialized).not.toContain('RAWVOICEAUDIOBASE64');
    expect(serialized).not.toContain('RAWIMAGEBASE64');
  });
});

describe('prepareSessionResourcesForWrite — live session Firestore size guard', () => {
  it('is registered', () => {
    expect(typeof prepareResources).toBe('function');
    expect(typeof estimateBytes).toBe('function');
  });

  it('strips binary-like payloads before session sync', () => {
    const out = prepareResources([
      {
        id: 'visual-1',
        type: 'image',
        data: {
          title: 'Visual Prompt',
          imageUrl: 'data:image/png;base64,' + 'A'.repeat(4000),
          nested: { audioRecording: 'data:audio/webm;base64,' + 'B'.repeat(4000) },
        },
      },
    ], { maxBytes: 20000 });

    const serialized = JSON.stringify(out.resources);
    expect(serialized).not.toContain('data:image/png;base64');
    expect(serialized).not.toContain('data:audio/webm;base64');
    expect(out.resources[0].data.imageUrl).toBeNull();
    expect(out.resources[0].data.nested.audioRecording).toBeNull();
  });

  it('excludes private Persona-derived records before live session sync', () => {
    const out = prepareResources([
      { id: 'safe', type: 'quiz', data: { title: 'Keep me' } },
      { id: 'transcript', type: 'persona-transcript', data: { text: 'private' } },
      { id: 'reflection', type: 'persona-reflection', data: { text: 'private' } },
      { id: 'summary', type: 'persona-summary', data: { text: 'private' } },
      { id: 'read-aloud', type: 'persona-session-read-aloud', data: { messages: [] } },
    ], { maxBytes: 20000 });

    expect(out.resources.map((item) => item.id)).toEqual(['safe']);
    expect(JSON.stringify(out.resources)).not.toContain('private');
  });

  it('keeps the newest resources when the payload must be trimmed', () => {
    const out = prepareResources([
      { id: 'old', type: 'leveled-text', data: { text: 'A'.repeat(5000) } },
      { id: 'middle', type: 'quiz', data: { text: 'B'.repeat(2000) } },
      { id: 'new', type: 'exit-ticket', data: { text: 'C'.repeat(500) } },
    ], { maxBytes: 3000 });

    expect(out.droppedCount).toBeGreaterThan(0);
    expect(out.resources.at(-1).id).toBe('new');
    expect(estimateBytes(out.resources)).toBeLessThanOrEqual(out.maxBytes);
  });

  it('compacts a single oversized resource instead of returning an over-limit payload', () => {
    const out = prepareResources([
      { id: 'huge', type: 'document', title: 'Huge Document', data: { text: 'X'.repeat(200000) } },
    ], { maxBytes: 2000 });

    expect(out.resources).toHaveLength(1);
    expect(out.resources[0]).toMatchObject({ id: 'huge', type: 'document', title: 'Huge Document', syncTruncated: true });
    expect(estimateBytes(out.resources)).toBeLessThanOrEqual(out.maxBytes);
    expect(out.overLimit).toBe(false);
  });

  it('preserves instructional role and complexity metadata when compacting a large text resource', () => {
    const out = prepareResources([{
      id: 'adapted-large',
      type: 'simplified',
      title: 'Adapted Text',
      data: 'X'.repeat(200000),
      targetGradeLevel: '5th Grade',
      localStats: { gradeLevel: 5.2 },
      instructionalText: {
        role: 'supplemental',
        form: 'adapted',
        sourceArtifactId: 'primary-1',
        replacementAuthorization: { authorized: false, source: 'none' },
        complexity: { requestedGrade: '5th Grade', measuredGrade: 5.2, status: 'within-target', contentFingerprint: 'fp-1' },
      },
    }], { maxBytes: 3000 });

    expect(out.resources[0].syncTruncated).toBe(true);
    expect(out.resources[0].instructionalText).toMatchObject({
      role: 'supplemental', form: 'adapted', sourceArtifactId: 'primary-1',
      replacementAuthorization: { authorized: false, source: 'none' },
      complexity: { requestedGrade: '5th Grade', measuredGrade: 5.2, contentFingerprint: 'fp-1' },
    });
    expect(out.resources[0].targetGradeLevel).toBe('5th Grade');
    expect(out.resources[0].localStats.gradeLevel).toBe(5.2);
  });

  it('hydrates legacy adapted text with an unspecified role and no inferred authorization', () => {
    const [item] = hydrate([{ id: 'legacy', type: 'simplified', data: 'Legacy text', config: { grade: '4th Grade' } }]);
    expect(item.instructionalText).toMatchObject({
      role: 'unspecified',
      form: 'adapted',
      designationSource: 'legacy-inferred',
      replacementAuthorization: { authorized: false, source: 'none' },
      complexity: { requestedGrade: '4th Grade' },
    });
  });
});

// ── Generated artwork vs the Firestore 1 MiB document cap ─────────────────
// Measured through the real optimizeImage path (400px, q0.7 JPEG), a furnished
// 16-locus Memory Palace is ~425 KB, or ~850 KB with Relief depth maps. Two or
// three saved palaces used to push the whole history document past Firestore's
// hard 1 MiB limit, and the write failed — taking the mnemonics, the review
// schedule and the student-built loci down with the regenerable pictures.
// The rule now: drop the art, keep the palace, oldest first.
describe('sanitizeHistoryForCloud — artwork budget', () => {
  const BUDGET = 850 * 1024;
  const art = 'data:image/jpeg;base64,' + 'A'.repeat(26_000);   // ~1 measured image

  const palace = (id) => ({
    id,
    type: 'outline',
    title: 'Palace ' + id,
    data: {
      main: 'The Water Cycle',
      branches: [{ title: 'Sky', items: ['Evaporation'], mnemonics: ['a kettle'] }],
      memoryPalace: {
        images: Object.fromEntries(Array.from({ length: 16 }, (_, i) => ['b0_i' + i, art])),
        depths: Object.fromEntries(Array.from({ length: 16 }, (_, i) => ['b0_i' + i, art])),
        myMnemonics: { b0_i0: 'An image the student wrote themselves' },
        mastery: { b0_i0: { reps: 3, strength: 0.8, dueAt: '2026-08-01T00:00:00.000Z' } },
        extraRooms: [{ id: 'xr1', title: 'My Attic' }],
        extraLoci: [{ id: 'xl1', room: 'b0', label: 'My own fact', lx: 12, lz: -30 }],
        theme: 'gallery',
      },
    },
  });

  it('leaves a payload that already fits completely untouched', () => {
    const items = [palace('p1')];
    const out = sanitize(items);
    expect(estimateBytes(out)).toBeLessThanOrEqual(BUDGET);
    expect(Object.keys(out[0].data.memoryPalace.images)).toHaveLength(16);
    expect(Object.keys(out[0].data.memoryPalace.depths)).toHaveLength(16);
  });

  it('brings an oversized history back under the cap', () => {
    const items = [palace('p1'), palace('p2'), palace('p3'), palace('p4')];
    expect(estimateBytes(items)).toBeGreaterThan(1024 * 1024);   // would be rejected by Firestore
    const out = sanitize(items);
    expect(estimateBytes(out)).toBeLessThanOrEqual(BUDGET);
  });

  it('sacrifices the OLDEST artwork first and keeps what is being worked on', () => {
    const out = sanitize([palace('p1'), palace('p2'), palace('p3'), palace('p4')]);
    const hasArt = (item) => Object.keys(item.data.memoryPalace.images || {}).length > 0;
    expect(hasArt(out[0])).toBe(false);                 // oldest gave its pictures up
    expect(hasArt(out[out.length - 1])).toBe(true);     // newest still has them
  });

  it('NEVER drops the parts that cannot be regenerated', () => {
    const out = sanitize([palace('p1'), palace('p2'), palace('p3'), palace('p4')]);
    out.forEach((item) => {
      const mp = item.data.memoryPalace;
      expect(mp.myMnemonics.b0_i0).toBe('An image the student wrote themselves');
      expect(mp.mastery.b0_i0.reps).toBe(3);
      expect(mp.extraLoci).toHaveLength(1);
      expect(mp.extraLoci[0].label).toBe('My own fact');
      expect(mp.extraRooms).toHaveLength(1);
      expect(mp.theme).toBe('gallery');
      expect(item.data.branches[0].items).toEqual(['Evaporation']);
    });
  });

  it('drops per-node concept art under the same rule', () => {
    const withArt = [palace('p1'), palace('p2'), palace('p3'), palace('p4')];
    withArt[0].data.conceptArt = { n1: art };
    const out = sanitize(withArt);
    expect(out[0].data.conceptArt).toBeUndefined();
    expect(estimateBytes(out)).toBeLessThanOrEqual(BUDGET);
  });

  it('does not invent a memoryPalace on items that never had one', () => {
    const plain = { id: 'x', type: 'outline', data: { main: 'no palace here', branches: [] } };
    const out = sanitize([plain, palace('p1'), palace('p2'), palace('p3'), palace('p4')]);
    expect(out[0].data.memoryPalace).toBeUndefined();
    expect(out[0].data.main).toBe('no palace here');
  });
});
