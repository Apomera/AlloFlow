// Barge-in: cut a reply the moment the user talks over it.
//
// Deference (tests/voice_deference.test.js) stops AlloBot STARTING over you.
// This stops it CONTINUING over you, which is the harder half: the recognizer
// is deliberately closed for the duration of a reply, because leaving it open
// would transcribe our own voice back as a command. So detection reads ENERGY
// from a short-lived echo-cancelled capture stream. Nothing is transcribed.
//
// The decision logic is split out as a pure factory (the same split the file
// already uses for createVadSegmenter) so the thresholds can be tested without
// any audio plumbing at all.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let AC;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (f) => f,
  });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules.AlloCommands;
  if (!AC) throw new Error('AlloCommands failed to register');
});

afterEach(() => { vi.useRealTimers(); });

const LOUD = 0.2;   // speech-level
const ROOM = 0.005; // room tone

describe('the barge decision', () => {
  const make = (o) => AC._voicePure.createBargeDetector(o || {});
  // Feed a constant level for a duration in 50ms slices, as the watcher does.
  const feed = (d, rms, ms) => {
    let fired = false;
    for (let t = 0; t < ms; t += 50) fired = d.push(rms, 50) || fired;
    return fired;
  };

  it('fires on sustained speech over the reply', () => {
    const d = make();
    feed(d, ROOM, 400);                       // clear the grace window quietly
    expect(feed(d, LOUD, 300), 'user talked over it').toBe(true);
  });

  it('ignores the tail of the user\'s own sentence', () => {
    // The words that triggered the reply are often still in the room when it
    // starts. Cutting on those would make the bot look broken.
    const d = make();
    expect(feed(d, LOUD, 300), 'within the grace window').toBe(false);
  });

  it('ignores a cough, a door, or a keyboard clack', () => {
    const d = make();
    feed(d, ROOM, 400);
    expect(feed(d, LOUD, 150), 'too brief to be speech').toBe(false);
  });

  it('needs the energy to be CONTINUOUS, not merely frequent', () => {
    const d = make();
    feed(d, ROOM, 400);
    for (let i = 0; i < 8; i++) { d.push(LOUD, 50); d.push(ROOM, 50); }
    expect(d.push(LOUD, 50), 'stuttering noise never accumulates').toBe(false);
  });

  it('fires only once, so one utterance cuts one reply', () => {
    const d = make();
    feed(d, ROOM, 400);
    expect(feed(d, LOUD, 300)).toBe(true);
    expect(feed(d, LOUD, 300), 'already fired').toBe(false);
  });

  it('stays quiet through a long reply nobody interrupts', () => {
    const d = make();
    expect(feed(d, ROOM, 30000), 'silence never fires').toBe(false);
  });

  it('resets for the next reply', () => {
    const d = make();
    feed(d, ROOM, 400);
    expect(feed(d, LOUD, 300)).toBe(true);
    d.reset();
    feed(d, ROOM, 400);
    expect(feed(d, LOUD, 300), 'armed again').toBe(true);
  });
});

describe('the watcher only runs while a reply is playing', () => {
  function harness() {
    const instances = [];
    class FakeRec {
      constructor() { this.start = vi.fn(); this.stop = vi.fn(); instances.push(this); }
    }
    const tracks = [{ stop: vi.fn() }];
    const getUserMedia = vi.fn(() => Promise.resolve({ getTracks: () => tracks }));
    const prev = {
      SR: window.SpeechRecognition,
      synth: window.speechSynthesis,
      utter: window.SpeechSynthesisUtterance,
      md: navigator.mediaDevices,
      ctx: window.AudioContext,
    };
    window.SpeechRecognition = FakeRec;
    const speak = vi.fn();
    window.speechSynthesis = { speak, cancel: vi.fn() };
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    window._kokoroTTS = undefined;
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    const level = { rms: 0 };   // what the room 'sounds like' during a reply
    window.AudioContext = function () {
      return {
        createAnalyser: () => ({ fftSize: 1024, getFloatTimeDomainData: (b) => b.fill(level.rms) }),
        createMediaStreamSource: () => ({ connect: () => {} }),
        close: vi.fn(),
      };
    };
    try { localStorage.setItem('allo_voice_engine', 'webspeech'); } catch (_) {}
    return {
      instances, getUserMedia, tracks, speak, level,
      restore: () => {
        window.SpeechRecognition = prev.SR;
        window.speechSynthesis = prev.synth;
        window.SpeechSynthesisUtterance = prev.utter;
        window.AudioContext = prev.ctx;
        Object.defineProperty(navigator, 'mediaDevices', { value: prev.md, configurable: true });
        try { localStorage.removeItem('allo_voice_engine'); } catch (_) {}
      },
    };
  }

  const finalEvent = (text) => {
    const r = [{ transcript: text }];
    r.isFinal = true;
    return { results: [r] };
  };
  const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

  it('opens a capture stream when a reply starts, and closes it after', async () => {
    const h = harness();
    try {
      const loop = AC.createVoiceLoop(() => ({ t: (k, fb) => fb, fontBigger: vi.fn(() => 18), addToast: vi.fn(), setVoiceActive: vi.fn() }));
      loop.start();
      const rec = h.instances[0];
      rec.onresult(finalEvent('make the text bigger'));
      await flush();

      expect(h.speak, 'the reply is playing').toHaveBeenCalled();
      expect(h.getUserMedia, 'watching for a barge-in').toHaveBeenCalled();
      // Echo cancellation is what keeps our own speaker output from reading as
      // the user; without it this whole approach self-triggers.
      expect(h.getUserMedia.mock.calls[0][0]).toMatchObject({ audio: { echoCancellation: true } });
      await flush();

      loop.stop();
      await flush();
      expect(h.tracks[0].stop, 'no capture outlives the reply').toHaveBeenCalled();
    } finally { h.restore(); }
  });

it('cuts the reply when the user actually talks over it', async () => {
    vi.useFakeTimers();
    const h = harness();
    try {
      const loop = AC.createVoiceLoop(() => ({ t: (k, fb) => fb, fontBigger: vi.fn(() => 18), addToast: vi.fn(), setVoiceActive: vi.fn() }));
      loop.start();
      const rec = h.instances[0];
      rec.start.mockClear();
      rec.onresult(finalEvent('make the text bigger'));
      await flush();
      expect(h.speak, 'a reply is playing').toHaveBeenCalled();
      // cancel() fires on EVERY reply (the queue is cleared before speaking),
      // so the cut signal is the mic coming back: the stubbed utterance never
      // ends, so nothing else would restart the recognizer mid-reply.
      expect(rec.start, 'mic still closed for the reply').not.toHaveBeenCalled();

      // The room goes quiet through the grace window, then the user speaks.
      h.level.rms = 0.005;
      await vi.advanceTimersByTimeAsync(500);
      h.level.rms = 0.2;
      await vi.advanceTimersByTimeAsync(600);

      expect(window.speechSynthesis.cancel, 'the audio was stopped').toHaveBeenCalled();
      // Cutting is only useful if the floor comes straight back: the words the
      // user is mid-way through saying have to be heard.
      expect(rec.start, 'the mic was handed back').toHaveBeenCalled();
      expect(h.tracks[0].stop, 'the watch stream was released').toHaveBeenCalled();
      loop.stop();
    } finally { h.restore(); }
  });

  it('does NOT cut for room tone across a long reply', async () => {
    vi.useFakeTimers();
    const h = harness();
    try {
      const loop = AC.createVoiceLoop(() => ({ t: (k, fb) => fb, fontBigger: vi.fn(() => 18), addToast: vi.fn(), setVoiceActive: vi.fn() }));
      loop.start();
      h.instances[0].start.mockClear();
      h.instances[0].onresult(finalEvent('make the text bigger'));
      await flush();
      h.level.rms = 0.005;
      await vi.advanceTimersByTimeAsync(8000);
      // Same signal, inverted: a quiet room must never hand the mic back
      // mid-reply, which is exactly what cutting does.
      expect(h.instances[0].start, 'a quiet room never interrupts').not.toHaveBeenCalled();
      loop.stop();
    } finally { h.restore(); }
  });

  it('defers recognition while an external narration lease is active', async () => {
    const h = harness();
    try {
      const loop = AC.createVoiceLoop(() => ({ addToast: vi.fn(), setVoiceActive: vi.fn() }));
      loop.start();
      const rec = h.instances[0];
      rec.start.mockClear();
      rec.stop.mockClear();
      const stopExternal = vi.fn();

      const lease = loop.beginExternalSpeech(stopExternal, { source: 'read-this-page' });
      await flush();

      expect(lease, 'external speech acquired deference').toBeTruthy();
      expect(rec.stop, 'command recognition stopped during narration').toHaveBeenCalled();
      expect(h.getUserMedia, 'barge-in remains available').toHaveBeenCalled();
      expect(loop.getState().speaking).toBe(true);

      expect(lease.end()).toBe(true);
      expect(rec.start, 'command recognition resumed after narration').toHaveBeenCalled();
      expect(h.tracks[0].stop, 'barge watcher released with narration').toHaveBeenCalled();
      expect(stopExternal, 'normal completion does not stop the surface').not.toHaveBeenCalled();
      expect(loop.getState().speaking).toBe(false);
      loop.stop();
    } finally { h.restore(); }
  });

  it('uses learner speech to interrupt an external narration surface', async () => {
    vi.useFakeTimers();
    const h = harness();
    try {
      const loop = AC.createVoiceLoop(() => ({ addToast: vi.fn(), setVoiceActive: vi.fn() }));
      loop.start();
      const rec = h.instances[0];
      rec.start.mockClear();
      const stopExternal = vi.fn();
      loop.beginExternalSpeech(stopExternal, { source: 'read-this-page' });
      await flush();

      h.level.rms = 0.005;
      await vi.advanceTimersByTimeAsync(500);
      h.level.rms = 0.2;
      await vi.advanceTimersByTimeAsync(600);

      expect(stopExternal).toHaveBeenCalledWith('barge-in');
      expect(rec.start, 'the learner immediately gets the microphone back').toHaveBeenCalled();
      expect(h.tracks[0].stop).toHaveBeenCalled();
      expect(loop.getState().speaking).toBe(false);
      loop.stop();
    } finally { h.restore(); }
  });

  it('degrades silently where there is no mic or AudioContext', async () => {
    const h = harness();
    try {
      Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
      window.AudioContext = undefined;
      const loop = AC.createVoiceLoop(() => ({ t: (k, fb) => fb, fontBigger: vi.fn(() => 18), addToast: vi.fn(), setVoiceActive: vi.fn() }));
      loop.start();
      h.instances[0].onresult(finalEvent('make the text bigger'));
      await flush();
      expect(h.speak, 'the reply still happens, just uninterruptible').toHaveBeenCalled();
      loop.stop();
    } finally { h.restore(); }
  });
});
