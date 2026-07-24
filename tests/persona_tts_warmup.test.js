import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import fs from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
let PhaseKHelpers;

const splitTextToSentences = (text) => String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
const makeDeps = (overrides = {}) => ({
  callTTS: vi.fn().mockResolvedValue('blob:warmed'),
  splitTextToSentences,
  getSideBySideContent: () => null,
  selectedVoice: 'Leda',
  voiceSpeed: 1.25,
  currentUiLanguage: 'Spanish',
  leveledTextLanguage: 'English',
  AVAILABLE_VOICES: ['Leda', 'Puck', 'Aoede'],
  personaState: {
    selectedCharacter: {
      name: 'Ada',
      role: 'Mathematician',
      year: '1843',
      voice: 'Puck',
      voiceProfile: 'Warm British cadence with steady pacing',
    },
    selectedCharacters: [],
    chatHistory: [{ role: 'model', text: 'First sentence. Second sentence.' }],
  },
  _isCanvasEnv: false,
  _ttsState: { rateLimitedUntil: 0 },
  ...overrides,
});

beforeAll(() => {
  globalThis.React = React;
  window.React = React;
  loadAlloModule('phase_k_helpers_module.js');
  PhaseKHelpers = window.AlloModules.PhaseKHelpers;
});

describe('Persona auto-read TTS warming', () => {
  it('warms the first merged chunk with the character voice and direction', () => {
    const deps = makeDeps();
    const warmed = PhaseKHelpers.prewarmPersonaMessageAudio(
      'First sentence. Second sentence.',
      0,
      { count: 1, shouldContinue: () => true, deps },
    );

    expect(warmed).toBe(1);
    expect(deps.callTTS).toHaveBeenCalledTimes(1);
    const [preparedText, voice] = deps.callTTS.mock.calls[0];
    expect(voice).toBe('Puck');
    expect(preparedText).toContain('Warm British cadence with steady pacing');
    expect(preparedText).toContain('First sentence. Second sentence.');
  });

  it('keeps the character voice profile when it uses the global voice', () => {
    const deps = makeDeps({
      personaState: {
        selectedCharacter: { name: 'Ada', role: 'Mathematician', voice: 'Leda', voiceProfile: 'Calm, precise cadence' },
        selectedCharacters: [],
        chatHistory: [{ role: 'model', text: 'Same voice reply.' }],
      },
    });
    PhaseKHelpers.prewarmPersonaMessageAudio('Same voice reply.', 0, { shouldContinue: () => true, deps });
    const [preparedText, voice] = deps.callTTS.mock.calls[0];
    expect(preparedText).toContain('Calm, precise cadence');
    expect(voice).toBe('Leda');
  });

  it('resolves the actual panel speaker instead of warming with character A', () => {
    const panelState = {
      selectedCharacter: { name: 'A', voice: 'Leda' },
      selectedCharacters: [
        { name: 'A', voice: 'Leda' },
        { name: 'B', voice: 'Aoede', voiceProfile: 'Measured French cadence' },
      ],
      chatHistory: [{ role: 'model', speakerName: 'B', text: 'Panel reply.' }],
    };
    const deps = makeDeps({ personaState: panelState });

    PhaseKHelpers.prewarmPersonaMessageAudio('Panel reply.', 0, {
      shouldContinue: () => true,
      deps,
    });

    const [preparedText, voice] = deps.callTTS.mock.calls[0];
    expect(preparedText).toContain('Measured French cadence');
    expect(voice).toBe('Aoede');
  });

  it('normalizes panel speaker identity and warms the same language/speed cache entry as live playback', () => {
    const deps = makeDeps({
      personaState: {
        selectedCharacter: null,
        selectedCharacters: [
          { name: 'Ada Lovelace', voice: 'Leda' },
          { name: 'Charles Babbage', voice: 'Aoede', voiceProfile: 'Measured cadence' },
        ],
        chatHistory: [{ role: 'model', speakerName: '  CHARLES BABBAGE ', text: 'A panel response.' }],
      },
      currentUiLanguage: 'French',
      voiceSpeed: 1.4,
    });
    PhaseKHelpers.prewarmPersonaMessageAudio('A panel response.', 0, { shouldContinue: () => true, deps });
    const [, voice, speed, options] = deps.callTTS.mock.calls[0];
    expect(voice).toBe('Aoede');
    expect(speed).toBe(1.4);
    expect(options).toEqual({ language: 'French' });
  });

  it('does not spend TTS work after auto-read is off or for uncached Kokoro voices', () => {
    const offDeps = makeDeps();
    expect(PhaseKHelpers.prewarmPersonaMessageAudio('Reply.', 0, {
      shouldContinue: () => false,
      deps: offDeps,
    })).toBe(0);
    expect(offDeps.callTTS).not.toHaveBeenCalled();

    const kokoroDeps = makeDeps({
      personaState: {
        selectedCharacter: { name: 'Ada', voice: 'af_heart' },
        selectedCharacters: [],
        chatHistory: [{ role: 'model', text: 'Reply.' }],
      },
    });
    expect(PhaseKHelpers.prewarmPersonaMessageAudio('Reply.', 0, {
      shouldContinue: () => true,
      deps: kokoroDeps,
    })).toBe(0);
    expect(kokoroDeps.callTTS).not.toHaveBeenCalled();
  });

  it('shares preparation helpers with live playback and uses a persistent generation-scoped queue', () => {
    const phaseSource = fs.readFileSync('phase_k_helpers_source.jsx', 'utf8');
    const appSource = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    expect((phaseSource.match(/chunkPersonaSentences\(/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((phaseSource.match(/preparePersonaTtsText\(/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(phaseSource).toContain('const resolvePersonaTtsLanguage =');
    expect(phaseSource).toContain('const resolvePersonaTtsSpeed =');
    expect(phaseSource).toContain('personaSynthesisIdentity');
    expect(phaseSource).toContain("stopPlayback('ended', contentId, sessionId)");
    expect(phaseSource).toContain("stopPlayback('superseded')");
    expect(appSource).toContain("typeof phaseKPersonaTts.prewarmPersonaMessageAudio !== 'function'");
    expect(appSource).toContain('const personaTtsQueueRef = useRef([])');
    expect(appSource).toContain('const personaTtsQueueGenerationRef = useRef(0)');
    expect(appSource).toContain('const processPersonaTtsQueue = async () =>');
    expect(appSource).toContain('entry.generation === personaTtsQueueGenerationRef.current');
    expect(appSource).toContain('entry.generation !== personaTtsQueueGenerationRef.current');
    expect(appSource).toContain('personaTtsQueueGenerationRef.current += 1');
    expect(appSource).toContain('personaTtsQueueRef.current = []');
    expect(appSource).toContain('const setPersonaAutoReadSafely = (nextValue) =>');
    expect(appSource).toContain('personaAutoReadRef.current = enabled');
    expect(appSource).toContain('setPersonaAutoRead: setPersonaAutoReadSafely');
    expect(appSource).toContain('const wasEnabled = personaAutoReadRef.current');
    expect(appSource).toContain('setPersonaAutoReadEpoch(value => value + 1)');
    expect(appSource).toContain('const personaTtsVoiceSignature = JSON.stringify({');
    expect(appSource).toContain('personaAutoReadEpoch, personaTtsVoiceSignature');
    expect(appSource).toContain('voiceSpeed: Number.isFinite(Number(voiceSpeed))');
    expect(appSource).toContain("language: String(currentUiLanguage || leveledTextLanguage || 'English')");
    expect(appSource).toContain('event?.detail?.playbackSessionId === expectedPlaybackSessionId');
    expect(appSource).toContain('const createPersonaTtsMessageKey =');
    expect(appSource).toContain('const personaTtsHistoryKeysRef = useRef([])');
    expect(appSource).toContain("window.addEventListener('alloflow-mute-changed', handlePersonaMuteChange)");
    expect(appSource).toContain("window.removeEventListener('alloflow-mute-changed', handlePersonaMuteChange)");
    expect(appSource).toContain("(typeof isGlobalMuted === 'function' && isGlobalMuted())");
    expect(appSource).toContain('selectedCharacter: prev.selectedCharacter?.name === currentPersona.name');

    const enqueueStart = appSource.indexOf('const enqueuePersonaTtsMessages =');
    const enqueueEnd = appSource.indexOf('useEffect(() => {', enqueueStart);
    const enqueueContract = appSource.slice(enqueueStart, enqueueEnd);
    expect(enqueueContract).toContain('personaTtsQueueRef.current.push(entry)');
    expect(enqueueContract).toContain('prewarmQueuedPersonaMessage(entry)');
    expect(enqueueContract).toContain('personaTtsProcessorRef.current?.()');
    expect(enqueueContract.indexOf('personaTtsQueueRef.current.push(entry)')).toBeLessThan(enqueueContract.indexOf('prewarmQueuedPersonaMessage(entry)'));
  });
});
