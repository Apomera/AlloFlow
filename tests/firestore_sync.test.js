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

beforeAll(() => {
  loadAlloModule('firestore_sync_module.js');
  sanitize = window.sanitizeHistoryForCloud;
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
