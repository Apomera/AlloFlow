import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';

let createArtifactAudio;
let Contract;

const audioB64 = (text) => validAudioBase64(192, 65 + (String(text).length % 20));
function hostPreparer(callTTS, config, voice, language) {
  const source = readFileSync('AlloFlowANTI.txt', 'utf8');
  const start = source.indexOf('const artifactAudioRecoveryRef = useRef(null);');
  const wrapper = source.slice(start, source.indexOf('  const _getPrivatePersonaArtifactStorage', start));
  return new Function('useRef', 'callTTS', 'storageDB', 'selectedVoice', 'leveledTextLanguage', 'currentUiLanguage', 'voiceSpeed', '_aiConfig', 'GEMINI_MODELS',
    wrapper + '; return prepareReadAloudArtifactAudio;')(() => ({ current: null }), callTTS, {}, voice, language, 'English', 1, config, { tts: 'default-model' });
}

beforeAll(() => {
  loadAlloModule('karaoke_audio_store_module.js');
  loadAlloModule('read_aloud_audio_service_module.js');
  loadAlloModule('read_aloud_artifact_contract_module.js');
  loadAlloModule('read_aloud_artifact_audio_module.js');
  createArtifactAudio = window.AlloModules.createReadAloudArtifactAudio;
  Contract = window.AlloModules.ReadAloudArtifactContract;
  if (!createArtifactAudio || !Contract) throw new Error('Artifact audio modules did not register');
});

beforeEach(() => {
  let blobId = 0;
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => 'blob:artifact-' + (++blobId)),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

describe('explicit-save read-aloud artifact audio', () => {
  it.each([
    ['Kore', 'English', true],
    ['af_heart', 'English', false],
    ['af_heart', 'en-US', false],
    ['af_heart', 'Spanish', true],
  ])('uses the host model only when relevant for %s in %s', async (voice, language, cloudModelApplies) => {
    const callTTS = vi.fn(async text => ({ b64: audioB64(text), mime: 'audio/wav' }));
    const config = { ttsProvider: 'auto', backend: 'gemini', models: { tts: 'model-a' } };
    const prepare = hostPreparer(callTTS, config, voice, language);
    const options = { ownerApproved: true, segments: [{ segmentId: 'one', text: 'Current narration.' }] };
    const first = await prepare(options); config.models.tts = 'model-b'; callTTS.mockClear();
    const next = await prepare({ ...options, checkpoint: first.checkpoint });
    expect(next.available).toBe(1); expect(callTTS).toHaveBeenCalledTimes(cloudModelApplies ? 1 : 0);
    const profile = Object.values(next.checkpoint.payload.entries)[0].synthesisProfile;
    expect(profile.requestedProvider).toBe('auto:gemini');
    expect(profile.requestedModel).toBe(cloudModelApplies ? 'model-b' : undefined);
  });

  it('uses live host provider settings, ignores an irrelevant local model, and detects returning to the default cloud model', async () => {
    const callTTS = vi.fn(async text => ({ b64: audioB64(text), mime: 'audio/wav' }));
    const config = { ttsProvider: 'local', backend: 'gemini', models: { tts: 'model-a' } };
    const prepare = hostPreparer(callTTS, config, 'Kore', 'English');
    const options = { ownerApproved: true, segments: [{ segmentId: 'one', text: 'Current narration.' }] };
    const first = await prepare(options); config.models.tts = 'model-b'; callTTS.mockClear();
    expect(await prepare({ ...options, checkpoint: first.checkpoint })).toMatchObject({ skipped: 1 }); expect(callTTS).not.toHaveBeenCalled();
    config.ttsProvider = 'auto'; config.models.tts = '';
    const next = await prepare({ ...options, checkpoint: first.checkpoint }); expect(callTTS).toHaveBeenCalledOnce();
    expect(Object.values(next.checkpoint.payload.entries)[0].synthesisProfile).toMatchObject({ requestedProvider: 'auto:gemini', requestedModel: 'default-model' });
  });

  it('reuses unchanged settings and replaces only AI clips after a requested provider or model change', async () => {
    const callTTS = vi.fn(async text => ({ b64: audioB64(text), mime: 'audio/wav' }));
    const helper = createArtifactAudio({ callTTS });
    const options = { ownerApproved: true, resourceId: 'settings-story', requestedProvider: 'auto:gemini', requestedModel: 'model-a',
      segments: [{ segmentId: 'ai', text: 'Generated narration.' }, { segmentId: 'teacher', text: 'Teacher narration.' }] };
    const first = await helper.prepare(options);
    const teacher = Object.values(first.checkpoint.payload.entries).find(entry => entry.identity.segmentId === 'teacher');
    teacher.source = 'human-teacher';
    const teacherBytes = teacher.audio;
    callTTS.mockClear();
    const unchanged = await helper.prepare({ ...options, checkpoint: first.checkpoint });
    expect(unchanged).toMatchObject({ skipped: 2, available: 2 }); expect(callTTS).not.toHaveBeenCalled();
    const changedModel = await helper.prepare({ ...options, requestedModel: 'model-b', checkpoint: unchanged.checkpoint });
    expect(callTTS.mock.calls.map(([text]) => text)).toEqual(['Generated narration.']);
    expect(changedModel.audioBySegmentId.teacher.base64).toBe(teacherBytes);
    callTTS.mockClear();
    await helper.prepare({ ...options, requestedProvider: 'local', requestedModel: '', checkpoint: changedModel.checkpoint });
    expect(callTTS.mock.calls.map(([text]) => text)).toEqual(['Generated narration.']);
  });

  it('keeps actual fallback provenance separate from the selected provider and reuses it offline', async () => {
    const callTTS = vi.fn(async (text, _voice, _speed, options) => {
      options.onResolvedProfile?.({ provider: 'local', engine: 'kokoro', model: 'kokoro-v1', resolvedVoice: 'af_heart' });
      return { b64: audioB64(text), mime: 'audio/wav' };
    });
    const helper = createArtifactAudio({ callTTS });
    const options = { ownerApproved: true, requestedProvider: 'auto:gemini', requestedModel: 'cloud-model',
      segments: [{ segmentId: 'one', text: 'Offline fallback.' }] };
    const first = await helper.prepare(options);
    expect(first).toMatchObject({ available: 1, failed: 0 });
    expect(Object.values(first.checkpoint.payload.entries)[0].synthesisProfile).toMatchObject({
      requestedProvider: 'auto:gemini', requestedModel: 'cloud-model', provider: 'local', engine: 'kokoro', model: 'kokoro-v1',
    });
    expect(first.audioBySegmentId.one.synthesisProfile.provider).toBe('local');
    callTTS.mockClear(); callTTS.mockRejectedValue(new Error('offline'));
    const resumed = await helper.prepare({ ...options, checkpoint: first.checkpoint });
    expect(resumed).toMatchObject({ available: 1, skipped: 1 }); expect(callTTS).not.toHaveBeenCalled();
  });

  it('keeps the prior bytes when replacement fails and retries only the remaining current-profile clip', async () => {
    const callTTS = vi.fn(async text => ({ b64: audioB64(text), mime: 'audio/wav' }));
    const helper = createArtifactAudio({ callTTS });
    const options = { ownerApproved: true, requestedProvider: 'auto:gemini', requestedModel: 'model-a',
      segments: [{ segmentId: 'one', text: 'First clip.' }, { segmentId: 'two', text: 'Second clip.' }] };
    const first = await helper.prepare(options);
    const prior = Object.values(first.checkpoint.payload.entries).find(entry => entry.identity.segmentId === 'two');
    callTTS.mockImplementation(async text => { if (text === 'Second clip.') throw new Error('network lost'); return { b64: audioB64(text), mime: 'audio/wav' }; });
    const partial = await helper.prepare({ ...options, requestedModel: 'model-b', checkpoint: first.checkpoint });
    expect(partial).toMatchObject({ available: 1, remaining: 1, failed: 1 });
    expect(partial.audioBySegmentId.two).toBeUndefined();
    expect(Object.values(partial.checkpoint.payload.entries).find(entry => entry.identity.segmentId === 'two')).toEqual(prior);
    callTTS.mockImplementation(async text => ({ b64: audioB64(text), mime: 'audio/wav' })); callTTS.mockClear();
    const resumed = await helper.prepare({ ...options, requestedModel: 'model-b', checkpoint: partial.checkpoint });
    expect(resumed).toMatchObject({ available: 2, skipped: 1 }); expect(callTTS.mock.calls.map(([text]) => text)).toEqual(['Second clip.']);
  });

  it('uses per-segment requested profiles so a cloud model change preserves an independent local voice', async () => {
    let model = 'model-a';
    const getRequestedProfile = vi.fn(({ voice }) => voice === 'af_heart'
      ? { requestedProvider: 'local' } : { requestedProvider: 'auto:gemini', requestedModel: model });
    const callTTS = vi.fn(async text => ({ b64: audioB64(text), mime: 'audio/wav' }));
    const helper = createArtifactAudio({ callTTS, getRequestedProfile });
    const options = { ownerApproved: true, segments: [{ segmentId: 'cloud', text: 'Cloud narration.' }, { segmentId: 'local', text: 'Local narration.', voice: 'af_heart' }] };
    const first = await helper.prepare(options); callTTS.mockClear(); model = 'model-b';
    const second = await helper.prepare({ ...options, checkpoint: first.checkpoint });
    expect(second).toMatchObject({ available: 2, skipped: 1 });
    expect(callTTS.mock.calls.map(([text]) => text)).toEqual(['Cloud narration.']);
    expect(getRequestedProfile).toHaveBeenCalledWith({ voice: 'af_heart', language: 'English' });
  });

  it('preserves URL synthesis provenance while keeping private request fields out of the portable schema', async () => {
    const bytes = Uint8Array.from(atob(audioB64('url')), char => char.charCodeAt(0));
    const fetch = vi.fn(async () => ({ ok: true, blob: async () => ({ type: 'audio/wav', arrayBuffer: async () => bytes.buffer }) }));
    const callTTS = vi.fn(async (_text, _voice, _speed, options) => {
      options.onResolvedProfile({ provider: 'gemini', engine: 'gemini', model: 'model-a', apiKey: 'must-not-persist' });
      return 'blob:provider-audio';
    });
    const result = await createArtifactAudio({ callTTS, fetch }).prepare({ ownerApproved: true, requestedProvider: 'auto:gemini', requestedModel: 'model-a',
      segments: [{ segmentId: 'one', text: 'URL narration.' }] });
    expect(fetch).toHaveBeenCalledWith('blob:provider-audio', undefined);
    const profile = Object.values(result.checkpoint.payload.entries)[0].synthesisProfile;
    expect(profile).toMatchObject({ provider: 'gemini', engine: 'gemini', model: 'model-a', requestedProvider: 'auto:gemini', requestedModel: 'model-a' });
    expect(JSON.stringify(result)).not.toContain('must-not-persist');
    expect(result.audioBySegmentId.one.synthesisProfile).not.toHaveProperty('requestedModel');
    const artifact = Contract.buildAdventureStorybookArtifact({ storyId: 'url-story', title: 'Story', language: 'English',
      scenes: [{ sceneId: 'scene', segments: [{ segmentId: 'one', text: 'URL narration.', audio: result.audioBySegmentId.one }] }] });
    expect(Contract.validateReadAloudArtifact(artifact).ok).toBe(true);
  });

  it('preserves legacy accepted clips with unknown request identity instead of invalidating an offline library', async () => {
    const callTTS = vi.fn(async text => ({ b64: audioB64(text), mime: 'audio/wav' }));
    const helper = createArtifactAudio({ callTTS });
    const options = { ownerApproved: true, segments: [{ segmentId: 'one', text: 'Previously prepared.' }] };
    const first = await helper.prepare(options); callTTS.mockClear(); callTTS.mockRejectedValue(new Error('offline'));
    expect(await helper.prepare({ ...options, requestedProvider: 'auto:gemini', requestedModel: 'model-a', checkpoint: first.checkpoint }))
      .toMatchObject({ available: 1, skipped: 1 });
    expect(callTTS).not.toHaveBeenCalled();
  });

  it('uses Kore by default and preserves an explicitly selected segment voice', async () => {
    const calls = [];
    const callTTS = vi.fn(async (text, voice, speed, options) => {
      calls.push({ text, voice, speed, options });
      return { b64: audioB64(text), mime: 'audio/mpeg' };
    });
    const result = await createArtifactAudio({ callTTS }).prepare({
      ownerApproved: true,
      resourceId: 'story-1',
      resourceType: 'adventure-storybook',
      language: 'English',
      segments: [
        { segmentId: 'scene-1:narration', text: 'The story begins.' },
        { segmentId: 'scene-1:character', text: 'Welcome!', voice: 'Aoede' },
      ],
    });

    expect(calls.map((call) => call.voice)).toEqual(['Kore', 'Aoede']);
    expect(calls.every((call) => call.options.language === 'English')).toBe(true);
    expect(result.prepared).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.audioBySegmentId['scene-1:narration']).toMatchObject({
      source: 'tts-artifact',
      vetted: true,
      vettingMethod: 'owner-approved',
      synthesisProfile: { voice: 'Kore' },
    });
    expect(result.audioBySegmentId['scene-1:character'].synthesisProfile.voice).toBe('Aoede');

    const artifact = Contract.buildAdventureStorybookArtifact({
      storyId: 'story-1',
      title: 'A Story',
      language: 'English',
      scenes: [{
        sceneId: 'scene-1',
        segments: [{
          segmentId: 'scene-1:narration',
          text: 'The story begins.',
          audio: result.audioBySegmentId['scene-1:narration'],
        }],
      }],
    });
    expect(Contract.validateReadAloudArtifact(artifact)).toMatchObject({ ok: true, errors: [] });
  });

  it('does not synthesize unless narration was explicitly approved', async () => {
    const callTTS = vi.fn();
    await expect(createArtifactAudio({ callTTS }).prepare({
      segments: [{ segmentId: 'one', text: 'No implicit audio.' }],
    })).rejects.toMatchObject({ code: 'owner-approval-required' });
    expect(callTTS).not.toHaveBeenCalled();
  });

  it('returns a valid partial result when one clip fails', async () => {
    const callTTS = vi.fn(async (text) => {
      if (text === 'Unavailable clip.') throw new Error('temporary provider failure');
      return { base64: audioB64(text), mime: 'audio/wav' };
    });
    const progress = vi.fn();
    const result = await createArtifactAudio({ callTTS }).prepare({
      ownerApproved: true,
      segments: [
        { segmentId: 'good', text: 'Available clip.' },
        { segmentId: 'bad', text: 'Unavailable clip.' },
      ],
      onProgress: progress,
    });

    expect(result).toMatchObject({ total: 2, prepared: 1, failed: 1 });
    expect(Object.keys(result.audioBySegmentId)).toEqual(['good']);
    expect(result.errors[0]).toMatchObject({ segmentId: 'bad' });
    expect(progress).toHaveBeenCalledWith(expect.objectContaining({ phase: 'complete' }));
  });

  it('contains no hidden Puck fallback', () => {
    expect(String(createArtifactAudio)).not.toMatch(/Puck/i);
  });
});
