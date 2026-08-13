import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';

let KaraokeAudioStore;
let createReadAloudLegacyBridge;
let normalizeGlossaryEntries;
let enumerateGlossaryReadAloudSegments;

beforeAll(() => {
  loadAlloModule('karaoke_audio_store_module.js');
  loadAlloModule('read_aloud_audio_service_source.jsx');
  KaraokeAudioStore = window.AlloModules.KaraokeAudioStore;
  createReadAloudLegacyBridge = window.AlloModules.createReadAloudLegacyBridge;
  normalizeGlossaryEntries = window.AlloModules.normalizeGlossaryEntries;
  enumerateGlossaryReadAloudSegments = window.AlloModules.enumerateGlossaryReadAloudSegments;
  if (!KaraokeAudioStore || !createReadAloudLegacyBridge ||
      !normalizeGlossaryEntries || !enumerateGlossaryReadAloudSegments) {
    throw new Error('Glossary read-aloud dependencies did not register');
  }
});

beforeEach(() => {
  let blobId = 0;
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => 'blob:glossary-stored-' + (++blobId)),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

describe('glossary read-aloud identity and persistence', () => {
  it('assigns durable unique entry IDs once and preserves them through reordering', () => {
    let sequence = 0;
    const createId = () => 'generated-' + (++sequence);
    const first = normalizeGlossaryEntries([
      { term: 'Bank' },
      { term: 'Bank', entryId: 'kept' },
      { term: 'Bank', entryId: 'kept' },
    ], { createId });

    expect(first.changed).toBe(true);
    expect(first.entries.map((entry) => entry.entryId)).toEqual([
      'generated-1', 'kept', 'generated-2',
    ]);
    expect(new Set(first.entries.map((entry) => entry.entryId)).size).toBe(3);

    const reordered = [first.entries[2], first.entries[0], first.entries[1]];
    const second = normalizeGlossaryEntries(reordered, { createId });
    expect(second.changed).toBe(false);
    expect(second.entries).toBe(reordered);
    expect(second.entries.map((entry) => entry.entryId)).toEqual([
      'generated-2', 'generated-1', 'kept',
    ]);
  });

  it('enumerates duplicate terms and translations with stable language-aware locators', () => {
    const resource = {
      id: 'glossary-identities',
      type: 'glossary',
      language: 'English',
      data: [
        {
          entryId: 'entry-a',
          term: 'Lead',
          def: 'A metal.',
          translations: { Spanish: 'plomo', French: { term: 'plomb', def: 'un métal' } },
        },
        { entryId: 'entry-b', term: 'Lead', def: 'To guide.' },
      ],
    };

    const segments = enumerateGlossaryReadAloudSegments(resource);
    expect(segments.filter((segment) => segment.field === 'term').map((segment) => segment.segmentId)).toEqual([
      'entry/entry-a/term',
      'entry/entry-b/term',
    ]);
    expect(segments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entryId: 'entry-a',
        field: 'translation',
        language: 'French',
        spokenText: 'plomb: un métal',
        segmentId: 'entry/entry-a/translation/french',
      }),
      expect.objectContaining({
        entryId: 'entry-a',
        field: 'translation',
        language: 'Spanish',
        spokenText: 'plomo',
        segmentId: 'entry/entry-a/translation/spanish',
      }),
    ]));
  });

  it('prepares duplicate terms by explicit segment identity and replays saved audio without synthesis', async () => {
    const resource = {
      id: 'glossary-saved-replay',
      type: 'glossary',
      language: 'English',
      data: [
        { entryId: 'first', term: 'Bank', def: 'A financial institution.' },
        { entryId: 'second', term: 'Bank', def: 'The side of a river.' },
      ],
    };
    const store = KaraokeAudioStore.createStore();
    const synthesize = vi.fn(async ({ text, segment }) => ({
      url: 'blob:live-' + segment.segmentId,
      b64: validAudioBase64(192, 65 + (text.length % 20)),
      mime: 'audio/mpeg',
    }));
    const persist = vi.fn(async () => {});
    const bridge = createReadAloudLegacyBridge({
      getResource: () => resource,
      getStore: () => store,
      getProfile: () => ({
        voice: 'Kore',
        language: 'English',
        synthesisRate: 1,
        provider: 'gemini',
        voiceResolverVersion: 2,
      }),
      synthesize,
      encode: async (audio) => audio,
      persist,
      normalize: (text) => String(text || '').replace(/\s+/g, ' ').trim(),
    });
    const termSegments = enumerateGlossaryReadAloudSegments(resource)
      .filter((segment) => segment.field === 'term');

    const prepared = await bridge.prepare(undefined, vi.fn(), {
      entries: [termSegments[1], termSegments[0]],
    });
    expect(prepared).toMatchObject({ ok: true, generated: 2, remaining: 0, total: 2 });
    expect(synthesize.mock.calls.map(([request]) => request.segment.segmentId)).toEqual([
      'entry/second/term',
      'entry/first/term',
    ]);
    const storedEntries = Object.values(store.serialize().entries);
    expect(storedEntries.map((entry) => entry.identity.segmentId).sort()).toEqual([
      'entry/first/term',
      'entry/second/term',
    ]);

    const persistenceCallsAfterPrepare = persist.mock.calls.length;
    synthesize.mockClear();
    const replayUrl = await bridge.resolve(termSegments[1]);
    expect(replayUrl).toMatch(/^blob:glossary-stored-/);
    expect(synthesize).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledTimes(persistenceCallsAfterPrepare);

    const definition = enumerateGlossaryReadAloudSegments(resource)
      .find((segment) => segment.entryId === 'second' && segment.field === 'definition');
    const transientUrl = await bridge.resolve(definition);
    expect(transientUrl).toBe('blob:live-' + definition.segmentId);
    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(persistenceCallsAfterPrepare);
    expect(bridge.inspect(definition)).toMatchObject({ status: 'missing' });
  });
});

describe('glossary audio host contract', () => {
  const hosts = [
    readFileSync('AlloFlowANTI.txt', 'utf8'),
    readFileSync('desktop/web-app/src/AlloFlowANTI.txt', 'utf8'),
  ];

  it.each(hosts)('exposes stable-ID, inspect, resolve, and explicit Prepare APIs', (host) => {
    expect(host).toContain('window.__alloEnsureGlossaryEntryIds = _ensureGlossaryReadAloudEntryIds');
    expect(host).toContain('window.__alloResolveGlossaryAudio = async (request, options)');
    expect(host).toContain('window.__alloInspectGlossaryAudio = (request, options)');
    expect(host).toContain('window.__alloPrepareGlossaryAudio = async (config, onProgress, prepareOptions)');
    expect(host).toContain('return bridge.resolve(segment, _glossaryReadAloudOptions(segment, options))');
    expect(host).toContain('window.__alloPrepareReadAloud(undefined, onProgress');
    expect(host).toContain('Object.assign({}, prepareOptions || {}, { entries })');
  });

  it('keeps the built and deployed audio-service artifacts synchronized', () => {
    const built = readFileSync('read_aloud_audio_service_module.js', 'utf8');
    const deployed = readFileSync('desktop/web-app/public/read_aloud_audio_service_module.js', 'utf8');
    expect(deployed).toBe(built);
    expect(built).toContain('window.AlloModules.normalizeGlossaryEntries = normalizeGlossaryEntries');
    expect(built).toContain("const SUPPORTED_TYPES = new Set(['simplified', 'faq', 'glossary'])");
  });
});
