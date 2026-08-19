import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

const store = new Map();
const clone = (value) => structuredClone(value);
const docKey = (...parts) => parts.join('/');

beforeAll(() => {
  class TestComponent {
    constructor(props) {
      this.props = props || {};
      this.state = {};
    }
    setState(next) {
      this.state = { ...this.state, ...(typeof next === 'function' ? next(this.state, this.props) : next) };
    }
  }

  window.React = {
    Component: TestComponent,
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  window.AlloLanguageContext = {};
  window.doc = (_db, ...parts) => docKey(...parts);
  window.db = {};
  window.setDoc = async (ref, data) => {
    store.set(ref, clone(data));
  };
  window.getDoc = async (ref) => ({
    exists: () => store.has(ref),
    data: () => clone(store.get(ref)),
  });
  window.warnLog = () => {};
  // getSessionAssetSecurityMetadata (added with the QR security hardening)
  // requires an authenticated uploader; this suite predates it and had been
  // failing on the throw ever since.
  window.__alloFirebase = { auth: { currentUser: { uid: 'test-teacher' } } };

  loadAlloModule('module_scope_extras_module.js');
});

beforeEach(() => {
  store.clear();
});

describe('session resource asset sync', () => {
  it('externalizes even small live-session resources and hydrates them back', async () => {
    const resources = [
      { id: 'small-text', type: 'leveled-text', title: 'Small Text', data: { text: 'Hello class' } },
    ];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'A4RT');

    expect(manifest).toHaveLength(1);
    expect(manifest[0].__alloResourceRef).toBeTruthy();
    expect(manifest[0].data).toBeUndefined();
    expect(JSON.stringify(manifest).length).toBeLessThan(JSON.stringify(resources).length + 200);
    expect([...store.values()].some((entry) => entry.kind === 'sessionResource')).toBe(true);

    const hydrated = await window.hydrateSessionAssets('app-test', manifest);
    expect(hydrated).toEqual(resources);
  });

  it('chunks a single oversized resource body and hydrates the full resource', async () => {
    const resources = [
      { id: 'big-text', type: 'document', title: 'Big Text', data: { text: 'X'.repeat(450000) } },
    ];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'A4RT');

    expect(manifest).toHaveLength(1);
    expect(manifest[0].__alloResourceRef).toBeTruthy();
    expect([...store.values()].some((entry) => entry.kind === 'sessionResourceChunks')).toBe(true);

    const hydrated = await window.hydrateSessionAssets('app-test', manifest);
    expect(hydrated).toEqual(resources);
  });

  it('chunks large image assets and restores them after resource hydration', async () => {
    const imageUrl = 'data:image/png;base64,' + 'A'.repeat(420000);
    const resources = [
      { id: 'diagram', type: 'image', title: 'Diagram', data: { prompt: 'Show the water cycle', imageUrl } },
    ];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'A4RT');

    expect([...store.values()].some((entry) => entry.kind === 'sessionImageChunks')).toBe(true);
    const hydrated = await window.hydrateSessionAssets('app-test', manifest);
    expect(hydrated).toEqual(resources);
  });

  it('round-trips nested visual-quiz question and option images through session assets', async () => {
    const questionImage = 'data:image/png;base64,' + 'Q'.repeat(90000);
    const optionImages = [
      'data:image/png;base64,' + 'A'.repeat(60000),
      null,
      'https://images.example.edu/option-c.png',
      'data:image/webp;base64,' + 'D'.repeat(60000),
    ];
    const resources = [{
      id: 'visual-quiz',
      type: 'quiz',
      title: 'Visual quiz',
      data: {
        questions: [{
          question: 'Choose the matching model.',
          imageUrl: questionImage,
          options: ['A', 'B', 'C', 'D'],
          optionImageUrls: optionImages,
          correctAnswer: 'A',
        }],
      },
    }];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'A4RT');
    const hydrated = await window.hydrateSessionAssets('app-test', manifest);

    expect(hydrated).toEqual(resources);
    expect(hydrated[0].data.questions[0].imageUrl).toBe(questionImage);
    expect(hydrated[0].data.questions[0].optionImageUrls).toEqual(optionImages);
  });

  it('bounds manifest metadata while preserving full resource bodies in assets', async () => {
    const resources = Array.from({ length: 30 }, (_, index) => ({
      id: `resource-${index}`,
      type: 'resource',
      title: `Long Title ${index} ` + 'T'.repeat(25000),
      data: { text: `resource ${index}` },
    }));

    const manifest = await window.uploadSessionAssets('app-test', resources, 'A4RT');

    expect(manifest).toHaveLength(30);
    expect(manifest.every((item) => item.title.length <= 180)).toBe(true);
    expect(JSON.stringify(manifest).length).toBeLessThan(20000);
    expect([...store.values()].some((entry) => entry.kind === 'sessionResource')).toBe(true)

    const hydrated = await window.hydrateSessionAssets('app-test', manifest);
    expect(hydrated).toEqual(resources);
  });

  it('retries a briefly missing resource document and returns the complete pack', async () => {
    const resources = [{ id: 'retry-me', type: 'document', title: 'Retry', data: { text: 'Ready after retry' } }];
    const manifest = await window.uploadSessionAssets('app-test', resources, 'RETRY');
    const assetId = manifest[0].__alloResourceRef;
    const key = docKey('artifacts', 'app-test', 'public', 'data', 'session_assets', assetId);
    const saved = clone(store.get(key));
    store.delete(key);
    setTimeout(() => store.set(key, saved), 40);

    await expect(window.hydrateSessionAssets('app-test', manifest)).resolves.toEqual(resources);
  });

  it('fails explicitly after bounded retries when a referenced resource stays unavailable', async () => {
    const resources = [{ id: 'missing', type: 'document', title: 'Missing', data: { text: 'Do not silently drop me' } }];
    const manifest = await window.uploadSessionAssets('app-test', resources, 'MISSING');
    const assetId = manifest[0].__alloResourceRef;
    const key = docKey('artifacts', 'app-test', 'public', 'data', 'session_assets', assetId);
    store.delete(key);

    await expect(window.hydrateSessionAssets('app-test', manifest)).rejects.toMatchObject({
      name: 'SessionAssetHydrationError',
      code: 'session-asset-unavailable',
      assetId,
    });
  });

  it('does not sync raw audio recordings as live-session resource assets', async () => {
    const resources = [
      { id: 'voice', type: 'fluency-record', data: { metrics: { wcpm: 91 }, audioRecording: 'data:audio/webm;base64,' + 'B'.repeat(1000), mimeType: 'audio/webm' } },
    ];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'A4RT');
    const hydrated = await window.hydrateSessionAssets('app-test', manifest);

    expect(JSON.stringify([...store.values()])).not.toContain('data:audio/webm;base64');
    expect(hydrated[0].data.metrics).toEqual({ wcpm: 91 });
    expect(hydrated[0].data.audioRecording).toBeUndefined();
    expect(hydrated[0].data.mimeType).toBeUndefined();
  });

  it('round-trips a privacy-minimized AAC board with only portable prepared media', async () => {
    const safeImage = 'data:image/png;base64,' + 'A'.repeat(96);
    const safeSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg><path/></svg>').toString('base64');
    const maliciousSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg><script>alert(1)</script></svg>').toString('base64');
    const preparedAudio = 'data:audio/webm;base64,' + 'B'.repeat(128);
    const customAudio = 'data:audio/webm;base64,' + 'C'.repeat(128);
    const resources = [{
      id: 'aac-portable',
      type: 'aac-board',
      title: 'Class communication board',
      privateStudentId: 'student-42',
      data: {
        format: 'alloflow.aac-board',
        version: 1,
        exportedAt: '2026-08-09T12:00:00.000Z',
        board: {
          id: 'board-1', title: 'Class communication board', locale: 'en-US', direction: 'ltr',
          profileId: 'private-profile',
        },
        pages: [
          {
            id: 'page-1', title: 'Core words', cols: 2, unknownPageField: 'remove me',
            cells: [
              {
                id: 'prepared-cell', index: 0, row: 0, col: 0,
                displayLabel: 'Hello', vocalLabel: 'Hello', originalLabel: 'Hello',
                description: 'A greeting', category: 'social', image: safeImage,
                rawRecording: customAudio, analytics: { selected: 19 },
                audio: {
                  kind: 'prepared', mime: 'audio/webm', data: preparedAudio,
                  profileId: 'private-audio-profile', unknownAudioField: 'remove me',
                  profile: {
                    voice: 'Teacher voice', language: 'en-US', provider: 'local',
                    engine: 'browser', model: 'prepared-v1', synthesisRate: 1.1,
                    voiceResolverVersion: '1', studentId: 'student-42', token: 'secret',
                  },
                },
                unknownCellField: 'remove me',
              },
              {
                id: 'custom-cell', index: 1, row: 0, col: 1,
                displayLabel: 'Help', vocalLabel: 'Help me', originalLabel: 'Help',
                description: 'Request help', category: 'needs',
                image: maliciousSvg,
                audio: {
                  kind: 'custom', mime: 'audio/webm', data: customAudio,
                  profile: { voice: 'Student voice', studentId: 'student-42' },
                },
              },
            ],
          },
          {
            id: 'page-2', title: 'Unsafe media', cols: 1,
            cells: [{
              id: 'unsafe-audio-cell', index: 0, row: 0, col: 0,
              displayLabel: 'Wait', vocalLabel: 'Please wait', originalLabel: 'Wait',
              description: '', category: 'social', image: safeSvg,
              audio: {
                kind: 'prepared', mime: 'audio/svg+xml',
                data: 'data:audio/svg+xml;base64,PHN2Zz48L3N2Zz4=',
              },
            }],
          },
        ],
        metadata: {
          privacy: { customAudioIncluded: true, preparedAudioIncluded: true, studentId: 'student-42' },
          omittedNonportableImages: 0, omittedCustomAudio: 0, omittedPreparedAudio: 0,
          warnings: ['Portable export'], analytics: { usage: 22 },
        },
        logs: [{ studentId: 'student-42', selected: 'Hello' }],
        unknownRootField: 'remove me',
      },
    }];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'AACRT');
    const hydrated = await window.hydrateSessionAssets('app-test', manifest);
    const restored = hydrated[0];

    expect(restored.id).toBe('aac-portable');
    expect(restored.type).toBe('aac-board');
    expect(restored.title).toBe('Class communication board');
    expect(restored.data.pages).toHaveLength(2);
    expect(restored.data.pages[0].cells[0].image).toBe(safeImage);
    expect(restored.data.pages[0].cells[0].audio).toEqual({
      kind: 'prepared', mime: 'audio/webm', data: preparedAudio,
      profile: {
        voice: 'Teacher voice', language: 'en-US', provider: 'local',
        engine: 'browser', model: 'prepared-v1', synthesisRate: 1.1,
        voiceResolverVersion: '1',
      },
    });
    expect(restored.data.pages[0].cells[1].image).toBeNull();
    expect(restored.data.pages[0].cells[1].audio).toBeUndefined();
    expect(restored.data.pages[1].cells[0].image).toBe(safeSvg);
    expect(restored.data.pages[1].cells[0].audio).toBeUndefined();
    expect(restored.data.metadata.privacy).toEqual({
      customAudioIncluded: false,
      preparedAudioIncluded: true,
    });

    const restoredJson = JSON.stringify(restored);
    expect(restoredJson).not.toContain(customAudio);
    expect(restoredJson).not.toContain(maliciousSvg);
    expect(restoredJson).not.toContain('data:audio/svg+xml');
    expect(restoredJson).not.toContain('student-42');
    expect(restoredJson).not.toContain('private-profile');
    expect(restoredJson).not.toContain('secret');
    expect(restoredJson).not.toContain('remove me');
    expect(restoredJson).not.toContain('analytics');
    expect(restoredJson).not.toContain('logs');
    expect(restoredJson).not.toContain('rawRecording');
  });

  it('strips prepared AAC audio unless the portable package explicitly opts in', async () => {
    const preparedAudio = 'data:audio/webm;base64,' + 'P'.repeat(128);
    const resources = [{
      id: 'aac-no-audio-consent',
      type: 'aac-board',
      title: 'No audio consent',
      data: {
        format: 'alloflow.aac-board',
        version: 1,
        exportedAt: '2026-08-09T12:00:00.000Z',
        board: { id: 'board-no-consent', title: 'No audio consent', locale: 'en-US', direction: 'ltr' },
        pages: [{
          id: 'page-1',
          title: 'Core',
          cols: 1,
          cells: [{
            id: 'cell-1', index: 0, row: 0, col: 0,
            displayLabel: 'Hello', vocalLabel: 'Hello', originalLabel: 'Hello',
            description: '', category: 'social', image: null,
            audio: { kind: 'prepared', mime: 'audio/webm', data: preparedAudio },
          }],
        }],
        metadata: {
          privacy: { customAudioIncluded: false, preparedAudioIncluded: false },
          omittedNonportableImages: 0, omittedCustomAudio: 0, omittedPreparedAudio: 0, warnings: [],
        },
      },
    }];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'AACNOAUDIO');
    const hydrated = await window.hydrateSessionAssets('app-test', manifest);

    expect(hydrated[0].data.pages[0].cells[0].audio).toBeUndefined();
    expect(hydrated[0].data.metadata.privacy.preparedAudioIncluded).toBe(false);
    expect(hydrated[0].data.metadata.omittedPreparedAudio).toBe(1);
    expect(JSON.stringify([...store.values()])).not.toContain(preparedAudio);
  });

  it('externalizes word-sounds pack media (jsonref) and hydrates it back intact', async () => {
    const ttsAssets = {};
    for (let i = 0; i < 40; i++) ttsAssets[`word${i}`] = { mime: 'audio/webm', base64: 'Q'.repeat(2000) };
    const packWord = {
      word: 'cat', targetWord: 'cat', phonemes: ['k', 'a', 't'],
      image: 'data:image/png;base64,' + 'C'.repeat(5000),
      _ttsAssets: ttsAssets,
      _decodingAssets: { cat: 'data:image/png;base64,' + 'D'.repeat(5000) },
      activityItems: { blending: { options: ['cat', 'cot'], answer: 'cat' } },
    };
    const resources = [
      { id: 'ws-1', type: 'word-sounds', title: 'Word Sounds (1 word)', data: [packWord] },
    ];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'A4RT');

    // The heavy media must live in session_assets docs, not the resource body.
    const bodyEntry = [...store.values()].find((entry) => entry.kind === 'sessionResource' || entry.kind === 'sessionResourceChunks');
    const bodyJson = bodyEntry && bodyEntry.resource ? JSON.stringify(bodyEntry.resource) : String(bodyEntry && bodyEntry.data);
    expect(bodyJson).toContain('jsonref::');
    expect(bodyJson).not.toContain('Q'.repeat(200));
    expect([...store.values()].some((entry) => String(entry.kind).startsWith('sessionJson'))).toBe(true);

    const hydrated = await window.hydrateSessionAssets('app-test', manifest);
    expect(hydrated[0].data[0]._ttsAssets).toEqual(ttsAssets);
    expect(hydrated[0].data[0]._decodingAssets).toEqual(packWord._decodingAssets);
    expect(hydrated[0].data[0].image).toBe(packWord.image);
    expect(hydrated[0].data[0].activityItems).toEqual(packWord.activityItems);
  });
  it('keeps teacher read-aloud audio while excluding the private student lane', async () => {
    const teacherAudio = 'TEACHER_TTS_BASE64_' + 'T'.repeat(5000);
    const studentAudio = 'PRIVATE_STUDENT_RECORDING_' + 'S'.repeat(5000);
    const resources = [{
      id: 'read-aloud',
      type: 'leveled-text',
      title: 'Read aloud',
      karaokeAudio: {
        format: 'per-entry',
        version: 4,
        entries: {
          hello: { audio: teacherAudio, mime: 'audio/mpeg', source: 'ai' },
        },
      },
      karaokeStudentAudio: {
        format: 'per-entry',
        version: 4,
        entries: {
          hello: { audio: studentAudio, mime: 'audio/webm', source: 'human-student' },
        },
      },
      data: { text: 'Hello class' },
    }];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'AUDIOPRIV');
    expect(JSON.stringify(manifest)).not.toContain(teacherAudio);
    expect(JSON.stringify(manifest)).not.toContain(studentAudio);

    const hydrated = await window.hydrateSessionAssets('app-test', manifest);
    expect(hydrated[0].karaokeAudio.entries.hello.audio).toBe(teacherAudio);
    expect(hydrated[0].karaokeStudentAudio).toBeUndefined();
    expect(JSON.stringify([...store.values()])).toContain(teacherAudio);
    expect(JSON.stringify([...store.values()])).not.toContain(studentAudio);
  });

  it('keeps oversized previews and media out of the session manifest', async () => {
    const preview = 'data:image/png;base64,' + 'P'.repeat(280000);
    const resources = [{
      id: 'meta-heavy',
      type: 'document',
      title: 'A'.repeat(500000),
      meta: { preview, audioMap: { hello: 'AUDIO_' + 'Q'.repeat(10000) } },
      data: { text: 'The resource body remains in session_assets.' },
    }];

    const manifest = await window.uploadSessionAssets('app-test', resources, 'MANIFEST');
    const manifestJson = JSON.stringify(manifest);
    expect(manifestJson).not.toContain(preview);
    expect(manifestJson).not.toContain('AUDIO_');
    expect(manifestJson.length).toBeLessThan(5000);

    await expect(window.hydrateSessionAssets('app-test', manifest)).resolves.toEqual(resources);
  });

});
