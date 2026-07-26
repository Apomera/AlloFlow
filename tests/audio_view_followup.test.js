import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let AudioHelpers;
let SimplifiedView;

beforeAll(() => {
  window.React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  loadAlloModule('audio_helpers_module.js');
  loadAlloModule('view_simplified_module.js');
  AudioHelpers = window.AlloModules.AudioHelpers;
  SimplifiedView = window.AlloModules.SimplifiedView;
});

const makeAudioDeps = (fetchTTSBytes, overrides = {}) => {
  const toasts = [];
  const downloadingStates = [];
  const deps = {
    AVAILABLE_VOICES: ['Kore', 'Puck'],
    fetchTTSBytes,
    downloadingContentId: null,
    selectedVoice: 'Kore',
    textFormat: 'Standard Text',
    setDownloadingContentId: (value) => downloadingStates.push(value),
    persistentVoiceMapRef: { current: null },
    addToast: (message, type) => toasts.push({ message, type }),
    t: (key) => key,
    warnLog: vi.fn(),
    pcmToMp3: vi.fn(() => new Blob([new Uint8Array([1])], { type: 'audio/mp3' })),
    pcmToWav: vi.fn(() => new ArrayBuffer(48)),
    ...overrides,
  };
  return { deps, toasts, downloadingStates };
};

describe('download-audio completeness', () => {
  let createObjectURL;
  let clickSpy;

  beforeEach(() => {
    window.lamejs = undefined;
    createObjectURL = vi.fn(() => 'blob:audio-test');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  it('fails closed when the TTS service returns no bytes', async () => {
    const fetchTTSBytes = vi.fn(async () => null);
    const { deps, toasts, downloadingStates } = makeAudioDeps(fetchTTSBytes);

    await AudioHelpers.handleDownloadAudio('A sentence to export.', 'lesson', 'download-1', deps);

    expect(fetchTTSBytes).toHaveBeenCalledTimes(1);
    expect(deps.pcmToWav).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(toasts).toContainEqual({ message: 'common.audio_failed', type: 'error' });
    expect(toasts.some((toast) => toast.type === 'success')).toBe(false);
    expect(downloadingStates).toEqual(['download-1', null]);
  });

  it('discards earlier PCM when any later dialogue segment is empty', async () => {
    const fetchTTSBytes = vi.fn()
      .mockResolvedValueOnce({ bytes: new Uint8Array([1, 2, 3, 4]) })
      .mockResolvedValueOnce({ bytes: new Uint8Array(0) });
    const { deps, toasts } = makeAudioDeps(fetchTTSBytes, { textFormat: 'Dialogue Script' });

    await AudioHelpers.handleDownloadAudio(
      'Narrator: First sentence.\nStudent: Second sentence.',
      'dialogue',
      'download-2',
      deps,
    );

    expect(fetchTTSBytes).toHaveBeenCalledTimes(2);
    expect(deps.pcmToWav).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(toasts.some((toast) => toast.type === 'success')).toBe(false);
  });

  it('never downloads a header-only WAV', async () => {
    const fetchTTSBytes = vi.fn(async () => ({ bytes: new Uint8Array([1, 2, 3, 4]) }));
    const { deps, toasts } = makeAudioDeps(fetchTTSBytes, {
      pcmToWav: vi.fn(() => new ArrayBuffer(44)),
    });

    await AudioHelpers.handleDownloadAudio('A sentence to export.', 'lesson', 'download-3', deps);

    expect(deps.pcmToWav).toHaveBeenCalledTimes(1);
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(toasts).toContainEqual({ message: 'common.audio_failed', type: 'error' });
    expect(toasts.some((toast) => toast.type === 'success')).toBe(false);
  });
});

describe('ordinary Leveled Text reference ownership', () => {
  const sourceReferences = '### Source Text References\n\n1. [Source](https://source.test)';
  const adaptedReferences = '### References\n\n1. [Adapted](https://adapted.test)';
  const marker = '[\u207d\u00b9\u207e](https://source.test)';

  it('does not inherit source references when adapted prose has no citation markers', () => {
    expect(SimplifiedView.resolveReferences('Adapted prose without citations.', '', sourceReferences, null)).toBe('');
  });

  it('does not inherit references when the adapted citation audit explicitly disables citations', () => {
    const audit = { enabled: false, sourceCitationCount: 1 };
    expect(SimplifiedView.resolveReferences(`Adapted prose. ${marker}`, '', sourceReferences, audit)).toBe('');
  });

  it('inherits source references only for citation-bearing adapted prose and ignores code examples', () => {
    expect(SimplifiedView.resolveReferences(`Adapted fact. ${marker}`, '', sourceReferences, null)).toBe(sourceReferences);
    expect(SimplifiedView.resolveReferences(`\u0060\u0060\u0060md\n${marker}\n\u0060\u0060\u0060`, '', sourceReferences, null)).toBe('');
  });

  it('always prefers a reference trailer owned by the adapted document', () => {
    const audit = { enabled: false, sourceCitationCount: 0 };
    expect(SimplifiedView.resolveReferences('Adapted prose.', adaptedReferences, sourceReferences, audit)).toBe(adaptedReferences);
  });
});
