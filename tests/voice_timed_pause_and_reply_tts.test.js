import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { transformSync } = require(resolve(modulesDir, '@babel/core'));
const transformReactJsx = require(resolve(modulesDir, '@babel/plugin-transform-react-jsx'));

let createVoiceLoop;
let previousReact;

beforeAll(() => {
  previousReact = globalThis.React;
  const noop = () => {};
  globalThis.React = {
    createElement: noop,
    Fragment: Symbol('Fragment'),
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (fn) => fn,
  };
  const source = readFileSync('allo_commands_source.jsx', 'utf8')
    + '\nwindow.__alloVoiceLoopFromSource = createVoiceLoop;\n';
  const compiled = transformSync(source, {
    babelrc: false,
    configFile: false,
    sourceType: 'script',
    plugins: [[transformReactJsx, {
      runtime: 'classic',
      pragma: 'React.createElement',
      pragmaFrag: 'React.Fragment',
    }]],
  }).code;
  // Execute the current source directly. The checked-in generated module is
  // intentionally not rebuilt by this focused change.
  new Function(compiled)();
  createVoiceLoop = window.__alloVoiceLoopFromSource;
  if (typeof createVoiceLoop !== 'function') throw new Error('createVoiceLoop did not load from source');
}, 30000);

afterEach(() => {
  vi.useRealTimers();
  try { localStorage.removeItem('allo_voice_engine'); } catch (_) {}
});

afterAll(() => {
  delete window.__alloVoiceLoopFromSource;
  globalThis.React = previousReact;
});

const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

const finalEvent = (text) => {
  const result = [{ transcript: text, confidence: 0.99 }];
  result.isFinal = true;
  return { results: [result] };
};

function restoreWindowProperty(name, value) {
  if (value === undefined) delete window[name];
  else window[name] = value;
}

function installVoiceFakes({ kokoro, autoEndBrowser = true, autoStartBrowser = true, audioPlay } = {}) {
  const previous = {
    SpeechRecognition: window.SpeechRecognition,
    webkitSpeechRecognition: window.webkitSpeechRecognition,
    speechSynthesis: window.speechSynthesis,
    SpeechSynthesisUtterance: window.SpeechSynthesisUtterance,
    kokoro: window._kokoroTTS,
    Audio: window.Audio,
  };
  const recognitionInstances = [];
  const utterances = [];
  const audios = [];

  class FakeRecognition {
    constructor() {
      this.start = vi.fn();
      this.stop = vi.fn();
      recognitionInstances.push(this);
    }
  }
  function FakeUtterance(text) {
    this.text = text;
  }
  class FakeAudio {
    constructor(url) {
      this.url = url;
      this.duration = 1;
      this.pause = vi.fn();
      this.play = vi.fn(() => {
        const result = audioPlay ? audioPlay(this) : Promise.resolve();
        Promise.resolve(result).then(() => {
          if (typeof this.onplaying === 'function') this.onplaying();
        }).catch(() => {});
        return result;
      });
      audios.push(this);
    }
  }

  const speechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn((utterance) => {
      utterances.push(utterance);
      if (autoStartBrowser && typeof utterance.onstart === 'function') utterance.onstart();
      if (autoEndBrowser && typeof utterance.onend === 'function') utterance.onend();
    }),
  };

  window.SpeechRecognition = FakeRecognition;
  delete window.webkitSpeechRecognition;
  window.SpeechSynthesisUtterance = FakeUtterance;
  window.speechSynthesis = speechSynthesis;
  window._kokoroTTS = kokoro;
  window.Audio = FakeAudio;
  localStorage.setItem('allo_voice_engine', 'webspeech');

  return {
    recognitionInstances,
    utterances,
    audios,
    speechSynthesis,
    restore() {
      restoreWindowProperty('SpeechRecognition', previous.SpeechRecognition);
      restoreWindowProperty('webkitSpeechRecognition', previous.webkitSpeechRecognition);
      restoreWindowProperty('speechSynthesis', previous.speechSynthesis);
      restoreWindowProperty('SpeechSynthesisUtterance', previous.SpeechSynthesisUtterance);
      restoreWindowProperty('_kokoroTTS', previous.kokoro);
      restoreWindowProperty('Audio', previous.Audio);
    },
  };
}

function startLoop(fake, ctxOverrides = {}, opts = {}) {
  const ctx = {
    addToast: vi.fn(),
    setVoiceActive: vi.fn(),
    voiceSpeakReplies: true,
    voiceSpeed: 1,
    voiceVolume: 1,
    ...ctxOverrides,
  };
  const loop = createVoiceLoop(() => ctx, {
    // A truthy legacy coordinator avoids inheriting another test's global
    // voice coordinator while still exercising the same loop implementation.
    voiceCoordinator: {},
    ...opts,
  });
  expect(loop.start()).toBe(true);
  expect(fake.recognitionInstances).toHaveLength(1);
  return { loop, ctx, rec: fake.recognitionInstances[0] };
}

describe('spoken confirmation timing', () => {
  it('does not let slow reply speech consume the learner response window', () => {
    const source = readFileSync('allo_commands_source.jsx', 'utf8');
    const match = source.match(/const CONFIRMATION_TIMEOUT_MS = (\d+);/);
    expect(Number(match && match[1])).toBeGreaterThanOrEqual(45000);
  });
});
describe('voice-only pause recovery', () => {
  it('auto-resumes a bare spoken pause after the announced 30 seconds', async () => {
    vi.useFakeTimers();
    const fake = installVoiceFakes();
    try {
      const { loop, ctx, rec } = startLoop(fake);
      rec.start.mockClear();

      rec.onresult(finalEvent('pause voice'));
      await flush();

      expect(loop.isPaused()).toBe(true);
      expect(ctx.addToast).toHaveBeenCalledWith(
        expect.stringContaining('Paused for 30 seconds'),
        'info',
      );

      await vi.advanceTimersByTimeAsync(29999);
      expect(loop.isPaused()).toBe(true);
      await vi.advanceTimersByTimeAsync(1);
      await flush();

      expect(loop.isPaused()).toBe(false);
      expect(rec.start).toHaveBeenCalled();
      loop.stop();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });

  it('supports requested units and clamps spoken pauses to safe bounds', async () => {
    vi.useFakeTimers();
    const fake = installVoiceFakes();
    try {
      const { loop, ctx, rec } = startLoop(fake);

      rec.onresult(finalEvent('pause listening for 999 minutes'));
      await flush();

      expect(loop.isPaused()).toBe(true);
      expect(ctx.addToast).toHaveBeenCalledWith(
        expect.stringContaining('Paused for 10 minutes'),
        'info',
      );
      await vi.advanceTimersByTimeAsync(599999);
      expect(loop.isPaused()).toBe(true);
      await vi.advanceTimersByTimeAsync(1);
      await flush();
      expect(loop.isPaused()).toBe(false);

      rec.onresult(finalEvent('hold on for 1 second'));
      await flush();
      expect(ctx.addToast).toHaveBeenCalledWith(
        expect.stringContaining('Paused for 5 seconds'),
        'info',
      );
      await vi.advanceTimersByTimeAsync(4999);
      expect(loop.isPaused()).toBe(true);
      await vi.advanceTimersByTimeAsync(1);
      await flush();
      expect(loop.isPaused()).toBe(false);
      loop.stop();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });

  it('keeps the public pause indefinite and cancels a timed pause on resume', async () => {
    vi.useFakeTimers();
    const fake = installVoiceFakes();
    try {
      const { loop, ctx, rec } = startLoop(fake);

      expect(loop.pause()).toBe(true);
      expect(ctx.addToast).toHaveBeenCalledWith(
        expect.stringContaining("Resume when you're ready"),
        'info',
      );
      await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
      expect(loop.isPaused()).toBe(true);
      expect(await loop.resume()).toBe(true);
      expect(loop.isPaused()).toBe(false);

      expect(loop.pause({ autoResumeMs: 30000 })).toBe(true);
      expect(await loop.resume()).toBe(true);
      rec.start.mockClear();
      await vi.advanceTimersByTimeAsync(30000);
      expect(loop.isPaused()).toBe(false);
      expect(rec.start).not.toHaveBeenCalled();
      loop.stop();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });

  it('clears the pending auto-resume when another voice owner replaces the loop', async () => {
    vi.useFakeTimers();
    const fake = installVoiceFakes();
    let replace;
    const coordinator = {
      acquireVoiceSession: vi.fn((_owner, leaseOpts) => {
        replace = leaseOpts.onStop;
        return {
          isActive: () => true,
          update: vi.fn(() => true),
          release: vi.fn(),
        };
      }),
    };
    try {
      const { loop, rec } = startLoop(fake, {}, { voiceCoordinator: coordinator });
      rec.onresult(finalEvent('hold on'));
      await flush();
      expect(loop.isPaused()).toBe(true);

      replace('replaced');
      expect(loop.isActive()).toBe(false);
      rec.start.mockClear();
      await vi.advanceTimersByTimeAsync(30000);
      expect(rec.start).not.toHaveBeenCalled();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });
});

describe('voice reply speech preferences and fallback', () => {
  it('narrates a long lesson workflow in order without the old 300-character truncation', async () => {
    vi.useFakeTimers();
    const fake = installVoiceFakes();
    const longReply = Array.from({ length: 12 }, (_, index) =>
      `Step ${index + 1} prepares a distinct lesson resource for the reviewed instructional sequence.`
    ).join(' ');
    try {
      const { loop, rec } = startLoop(fake, { converse: vi.fn(async () => longReply) });
      rec.onresult(finalEvent('tell me the complete lesson workflow'));
      await flush();

      expect(fake.utterances.length).toBeGreaterThan(1);
      expect(fake.utterances.map((utterance) => utterance.text).join(' ')).toBe(longReply);
      expect(fake.utterances.at(-1).text).toContain('Step 12');
      loop.stop();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });

  it('does not claim to be speaking when reply volume is zero', () => {
    vi.useFakeTimers();
    const statuses = [];
    const coordinator = {
      acquireVoiceSession: vi.fn(() => ({
        isActive: () => true,
        update: (detail) => { statuses.push(detail); return true; },
        release: vi.fn(),
      })),
    };
    const fake = installVoiceFakes();
    try {
      const { loop, ctx } = startLoop(fake, { voiceVolume: 0 }, { voiceCoordinator: coordinator });
      loop.pause();

      expect(fake.speechSynthesis.speak).not.toHaveBeenCalled();
      expect(statuses.some((status) => status.state === 'speaking')).toBe(false);
      expect(ctx.addToast).toHaveBeenCalledWith(expect.stringContaining('volume is set to zero'), 'warning');
      loop.stop();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });

  it('warns and resumes when browser speech accepts a reply but never starts it', async () => {
    vi.useFakeTimers();
    const fake = installVoiceFakes({ autoEndBrowser: false, autoStartBrowser: false });
    try {
      const { loop, ctx, rec } = startLoop(fake);
      rec.start.mockClear();
      loop.pause();
      expect(fake.speechSynthesis.speak).toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(8000);
      expect(ctx.addToast).toHaveBeenCalledWith(expect.stringContaining("couldn't play"), 'warning');
      expect(loop.getState().speaking).toBe(false);
      loop.stop();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });

  it('reports preparing until Kokoro audio actually starts playing', async () => {
    vi.useFakeTimers();
    let resolveKokoro;
    const kokoro = {
      ready: true,
      speak: vi.fn(() => new Promise((resolve) => { resolveKokoro = resolve; })),
    };
    const statuses = [];
    const coordinator = {
      acquireVoiceSession: vi.fn((_owner, leaseOpts) => ({
        isActive: () => true,
        update: (detail) => { statuses.push(detail); return true; },
        release: vi.fn(),
      })),
    };
    const fake = installVoiceFakes({ kokoro });
    try {
      const { loop } = startLoop(fake, {}, { voiceCoordinator: coordinator });
      loop.pause();

      expect(statuses.at(-1)).toMatchObject({ state: 'processing', message: 'Preparing the spoken response.' });
      expect(statuses.some((status) => status.state === 'speaking')).toBe(false);

      resolveKokoro('blob:delayed-voice-reply');
      await flush();
      expect(statuses.at(-1)).toMatchObject({ state: 'speaking', message: 'Speaking a response.' });
      loop.stop();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });

  it('falls back to browser speech when generated neural audio cannot play', async () => {
    vi.useFakeTimers();
    const kokoro = { ready: true, speak: vi.fn(() => Promise.resolve('blob:blocked-voice-reply')) };
    const fake = installVoiceFakes({
      kokoro,
      audioPlay: () => Promise.reject(new Error('playback blocked')),
    });
    try {
      const { loop } = startLoop(fake);
      loop.pause();
      await flush();

      expect(fake.audios[0].play).toHaveBeenCalled();
      expect(fake.speechSynthesis.speak).toHaveBeenCalled();
      loop.stop();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });

  it('falls back to browser speech when neural synthesis stalls', async () => {
    vi.useFakeTimers();
    const kokoro = { ready: true, speak: vi.fn(() => new Promise(() => {})) };
    const fake = installVoiceFakes({ kokoro });
    try {
      const { loop } = startLoop(fake);
      loop.pause();
      expect(fake.speechSynthesis.speak).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(8000);
      await flush();
      expect(fake.speechSynthesis.speak).toHaveBeenCalled();
      loop.stop();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });

  it('applies configured rate and volume to browser speech', () => {
    vi.useFakeTimers();
    const fake = installVoiceFakes();
    try {
      const { loop } = startLoop(fake, { voiceSpeed: 1.65, voiceVolume: 0.35 });
      loop.pause();

      expect(fake.utterances.at(-1)).toMatchObject({
        rate: 1.65,
        volume: 0.35,
      });
      loop.stop();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });

  it('passes rate to Kokoro and volume to its audio playback', async () => {
    vi.useFakeTimers();
    const kokoro = {
      ready: true,
      speak: vi.fn(() => Promise.resolve('blob:voice-reply')),
    };
    const fake = installVoiceFakes({ kokoro });
    try {
      const { loop } = startLoop(fake, {
        selectedVoice: 'af_bella',
        voiceSpeed: 1.4,
        voiceVolume: 0.2,
      });
      loop.pause();
      await flush();

      expect(kokoro.speak).toHaveBeenCalledWith(
        expect.stringContaining('Paused'),
        'af_bella',
        1.4,
      );
      expect(fake.audios).toHaveLength(1);
      expect(fake.audios[0].volume).toBe(0.2);
      fake.audios[0].onended();
      window.dispatchEvent(new Event('pagehide'));
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });

  it.each([
    ['returns no audio', () => Promise.resolve(null)],
    ['rejects', () => Promise.reject(new Error('kokoro unavailable'))],
  ])('falls back to browser speech when Kokoro %s', async (_label, response) => {
    vi.useFakeTimers();
    const kokoro = { ready: true, speak: vi.fn(response) };
    const fake = installVoiceFakes({ kokoro });
    try {
      const { loop } = startLoop(fake, { voiceSpeed: 1.75, voiceVolume: 0.3 });
      loop.pause();
      await flush();

      expect(kokoro.speak).toHaveBeenCalled();
      expect(fake.speechSynthesis.speak).toHaveBeenCalled();
      expect(fake.utterances.at(-1)).toMatchObject({
        rate: 1.75,
        volume: 0.3,
      });
      loop.stop();
    } finally {
      vi.clearAllTimers();
      fake.restore();
    }
  });
});
