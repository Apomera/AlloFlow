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

beforeAll(() => {
  loadAlloModule('firestore_sync_module.js');
  sanitize = window.sanitizeHistoryForCloud;
  prepareResources = window.prepareSessionResourcesForWrite;
  estimateBytes = window.estimateJsonBytes;
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
});
