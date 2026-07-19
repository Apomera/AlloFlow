import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let createArtifactAudio;
let Contract;

const audioB64 = (text) => Buffer.from('audio:' + text).toString('base64');

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
