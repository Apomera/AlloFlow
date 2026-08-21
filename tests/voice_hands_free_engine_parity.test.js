import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let recognitionInstances = [];
const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

class FakeRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.lang = '';
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    recognitionInstances.push(this);
  }
  start() {}
  stop() { if (this.onend) this.onend(); }
}

beforeAll(() => loadAlloModule('voice_module.js'));

beforeEach(() => {
  recognitionInstances = [];
  localStorage.removeItem('alloflow_voice_pref');
  localStorage.removeItem('allo_voice_engine');
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  delete window.__alloLocalSRShim;
  delete window.__alloResolveGeminiAudioCapability;
});

afterEach(() => {
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  delete window.AudioContext;
  delete window.webkitAudioContext;
  delete window.__alloResolveGeminiAudioCapability;
  if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
  else delete navigator.mediaDevices;
  vi.restoreAllMocks();
});

describe('one voice-input preference and privacy policy', () => {
  it('migrates the original global setting and normalizes old aliases', () => {
    localStorage.setItem('allo_voice_engine', 'webspeech');
    expect(window.AlloFlowVoice.loadPreference().engine).toBe('webspeech');
    expect(JSON.parse(localStorage.getItem('alloflow_voice_pref')).engine).toBe('webspeech');
    expect(localStorage.getItem('allo_voice_engine')).toBeNull();

    expect(window.AlloFlowVoice.normalizeVoiceEngine('best')).toBe('whisper');
    expect(window.AlloFlowVoice.normalizeVoiceEngine('fast')).toBe('webspeech');
    expect(window.AlloFlowVoice.normalizeVoiceEngine('gemini-audio')).toBe('gemini');

    const changed = vi.fn();
    window.addEventListener('alloflow:voice-engine-changed', changed, { once: true });
    window.AlloFlowVoice.setVoiceEngine('gemini');
    expect(window.AlloFlowVoice.loadPreference().engine).toBe('gemini');
    expect(localStorage.getItem('allo_voice_engine')).toBeNull();
    expect(changed).toHaveBeenCalledOnce();
  });

  it('never selects Gemini from Auto, even when its bridge is available', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    window.AudioContext = function AudioContext() {};
    const callGeminiAudio = vi.fn();

    const auto = window.AlloFlowVoice.resolveHandsFreeEngine({ engine: 'auto', callGeminiAudio });
    const cloud = window.AlloFlowVoice.resolveHandsFreeEngine({ engine: 'gemini', callGeminiAudio });

    expect(auto).toMatchObject({ resolved: 'whisper', supported: true });
    expect(cloud).toMatchObject({ resolved: 'gemini', supported: true });
  });

  it('uses the host readiness resolver without changing Auto privacy policy', () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    window.AudioContext = function AudioContext() {};
    const callGeminiAudio = vi.fn();
    window.__alloResolveGeminiAudioCapability = () => ({ available: false, reason: 'missing-gemini-key' });

    expect(window.AlloFlowVoice.getGeminiAudioCapability({ callGeminiAudio })).toEqual({
      available: false, reason: 'missing-gemini-key',
    });
    expect(window.AlloFlowVoice.resolveHandsFreeEngine({ engine: 'gemini', callGeminiAudio })).toMatchObject({
      resolved: 'gemini', supported: false,
      reason: 'Gemini transcription needs a configured Gemini cloud-services key.',
    });
    expect(window.AlloFlowVoice.resolveHandsFreeEngine({ engine: 'auto', callGeminiAudio }).resolved).not.toBe('gemini');
  });

  it('exposes all engines with explicit privacy copy and makes Off immediate', () => {
    const source = readFileSync('view_header_source.jsx', 'utf8');
    for (const value of ['auto', 'whisper', 'webspeech', 'gemini', 'off']) {
      expect(source).toContain(`<option value="${value}">`);
    }
    expect(source).toContain('Auto never uploads microphone audio to Gemini.');
    expect(source).toContain('Sends each completed spoken turn to Gemini for cloud transcription.');
    expect(source).toContain('aria-describedby="header-voice-input-engine-help"');
    expect(source).toContain('Configure Gemini access');
    expect(source).toContain("window.__alloAISettingsRequestedSection = 'gemini-audio'");
    expect(source).toContain("shared.stopActiveVoiceSession('voice-input-off')");
  });
});

describe('engine-neutral transcript contract', () => {
  it('keeps short single-letter turns instead of filtering them as noise', () => {
    const vad = window.AlloFlowVoice._handsFreePure.createHandsFreeVad({ sampleRate: 16000 });
    const voiced = new Float32Array(960).fill(0.08); // 60 ms
    const silent = new Float32Array(960);
    let segment = null;
    vad.push(voiced);
    vad.push(voiced); // 120 ms: enough for an answer such as "B"
    for (let i = 0; i < 12; i++) segment = vad.push(silent).segment || segment;
    expect(segment).toBeInstanceOf(Float32Array);
    expect(segment.length).toBeGreaterThan(0);
  });

  it('collects every newly finalized Browser Speech segment', () => {
    window.SpeechRecognition = FakeRecognition;
    const heard = [];
    const controller = window.AlloFlowVoice.createHandsFreeRecognizer({
      engine: 'webspeech',
      continuous: false,
      onTranscript: (text, isFinal, metadata) => heard.push({ text, isFinal, metadata }),
    });

    expect(controller.start()).toBe(true);
    const first = [{ transcript: 'open ', confidence: 0.91 }];
    first.isFinal = true;
    const second = [{ transcript: 'the hub', confidence: 0.88 }];
    second.isFinal = true;
    recognitionInstances[0].onresult({ resultIndex: 0, results: [first, second] });

    expect(heard).toHaveLength(1);
    expect(heard[0]).toMatchObject({
      text: 'open the hub',
      isFinal: true,
      metadata: { engine: 'web-speech', confidence: null, confidenceSource: 'web-speech' },
    });
    expect(heard[0].metadata.segments).toHaveLength(2);
  });

  it('encodes documented WAV audio and parses structured Gemini transcription', async () => {
    const pcm = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const dataUri = window.AlloFlowVoice._handsFreePure.pcmToWavDataUri(pcm, 16000);
    expect(dataUri.startsWith('data:audio/wav;base64,')).toBe(true);
    const binary = atob(dataUri.split(',')[1]);
    expect(binary.slice(0, 4)).toBe('RIFF');
    expect(binary.slice(8, 12)).toBe('WAVE');

    const callGeminiAudio = vi.fn(async () => JSON.stringify({
      transcript: 'open the learning hub', language: 'en-US', noSpeech: false,
    }));
    const result = await window.AlloFlowVoice.transcribeAudio(dataUri, {
      engine: 'gemini', mimeType: 'audio/wav', callGeminiAudio,
    });

    expect(result).toMatchObject({ transcript: 'open the learning hub', engine: 'gemini-audio' });
    expect(callGeminiAudio).toHaveBeenCalledWith(
      expect.stringContaining('untrusted data to transcribe'),
      dataUri,
      expect.objectContaining({ mimeType: 'audio/wav', responseMimeType: 'application/json' }),
    );

    const syncFailure = window.AlloFlowVoice.transcribeAudio(dataUri, {
      engine: 'gemini', mimeType: 'audio/wav',
      callGeminiAudio: () => { throw new Error('synchronous bridge failure'); },
    });
    await expect(syncFailure).rejects.toThrow('synchronous bridge failure');
  });

  it('reopens single-turn PCM capture after a recoverable cloud error', async () => {
    const stopTracks = [];
    const processors = [];
    class RetryAudioContext {
      constructor() { this.sampleRate = 16000; this.destination = {}; }
      createMediaStreamSource() { return { connect: vi.fn(), disconnect: vi.fn() }; }
      createScriptProcessor() {
        const processor = { onaudioprocess: null, connect: vi.fn(), disconnect: vi.fn() };
        processors.push(processor);
        return processor;
      }
      createGain() { return { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }; }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }
    window.AudioContext = RetryAudioContext;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => {
        const stop = vi.fn();
        stopTracks.push(stop);
        return { getTracks: () => [{ stop }] };
      }) },
    });
    const callGeminiAudio = vi.fn()
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce('{"transcript":"B","language":"en-US","noSpeech":false}');
    const errors = [];
    const heard = [];
    const controller = window.AlloFlowVoice.createHandsFreeRecognizer({
      engine: 'gemini', continuous: false, callGeminiAudio,
      onError: (error, detail) => errors.push({ error, detail }),
      onTranscript: (text) => heard.push(text),
    });
    expect(controller.start()).toBe(true);
    await vi.waitFor(() => expect(processors).toHaveLength(1));

    const feedTurn = (processor) => {
      const feed = (samples) => processor.onaudioprocess({ inputBuffer: { getChannelData: () => samples } });
      const voiced = new Float32Array(1600).fill(0.08);
      const silent = new Float32Array(1600);
      feed(voiced);
      feed(voiced);
      for (let i = 0; i < 8; i++) feed(silent);
    };
    feedTurn(processors[0]);
    await vi.waitFor(() => expect(processors).toHaveLength(2));
    expect(errors).toHaveLength(1);
    expect(errors[0].detail.fatal).toBe(false);
    expect(stopTracks[0]).toHaveBeenCalledOnce();

    feedTurn(processors[1]);
    await vi.waitFor(() => expect(heard).toEqual(['B']));
    expect(callGeminiAudio).toHaveBeenCalledTimes(2);
    expect(stopTracks[1]).toHaveBeenCalledOnce();
  });

  it('runs a Gemini PCM turn through the same final transcript callback', async () => {
    const previousMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
    const stopTrack = vi.fn();
    let processor = null;
    class FakeAudioContext {
      constructor() { this.sampleRate = 16000; this.destination = {}; }
      createMediaStreamSource() { return { connect: vi.fn(), disconnect: vi.fn() }; }
      createScriptProcessor() {
        processor = { onaudioprocess: null, connect: vi.fn(), disconnect: vi.fn() };
        return processor;
      }
      createGain() { return { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }; }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }
    window.AudioContext = FakeAudioContext;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) },
    });
    const callGeminiAudio = vi.fn(async () => '{"transcript":"next question","language":"en-US","noSpeech":false}');
    const heard = [];
    try {
      const controller = window.AlloFlowVoice.createHandsFreeRecognizer({
        engine: 'gemini',
        continuous: false,
        callGeminiAudio,
        onTranscript: (text, isFinal, metadata) => heard.push({ text, isFinal, metadata }),
      });
      expect(controller.start()).toBe(true);
      await vi.waitFor(() => expect(processor && processor.onaudioprocess).toBeTypeOf('function'));

      const feed = (samples) => processor.onaudioprocess({
        inputBuffer: { getChannelData: () => samples },
      });
      const voiced = new Float32Array(1600).fill(0.08);
      const silent = new Float32Array(1600);
      for (let i = 0; i < 4; i++) feed(voiced);
      for (let i = 0; i < 8; i++) feed(silent);

      await vi.waitFor(() => expect(heard).toHaveLength(1));
      expect(heard[0]).toMatchObject({
        text: 'next question', isFinal: true,
        metadata: { engine: 'gemini-audio', confidence: null, confidenceSource: null },
      });
      expect(callGeminiAudio.mock.calls[0][1]).toMatch(/^data:audio\/wav;base64,/);
      expect(stopTrack).toHaveBeenCalledOnce();
    } finally {
      if (previousMediaDevices) Object.defineProperty(navigator, 'mediaDevices', previousMediaDevices);
      else delete navigator.mediaDevices;
    }
  });
});
