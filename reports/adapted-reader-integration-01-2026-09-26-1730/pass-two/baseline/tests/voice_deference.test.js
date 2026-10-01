// AlloBot must not talk over the user.
//
// The voice loop stops the mic for the whole spoken reply, so anything said
// during it is lost. That is tolerable only if the bot never STARTS a reply
// while the user is mid-sentence. Before this, nothing in the loop knew a
// sentence was in progress: the recognizer was configured with
// interimResults = false, so the only signal was a completed transcript.
//
// The distinction that matters here: a FINAL transcript hands the floor back
// and must be answered promptly, while interim speech (or speechstart with no
// transcript yet) means the user is still going and the reply must wait.
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

const finalEvent = (text) => {
  const r = [{ transcript: text }];
  r.isFinal = true;
  return { results: [r] };
};
const interimEvent = (text) => {
  const r = [{ transcript: text }];
  r.isFinal = false;
  return { results: [r] };
};

function installFakes() {
  const instances = [];
  class FakeSpeechRecognition {
    constructor() {
      this.start = vi.fn();
      this.stop = vi.fn();
      instances.push(this);
    }
  }
  const prevSR = window.SpeechRecognition;
  const prevSynth = window.speechSynthesis;
  const prevUtter = window.SpeechSynthesisUtterance;
  const prevKokoro = window._kokoroTTS;
  window.SpeechRecognition = FakeSpeechRecognition;
  const speak = vi.fn();
  window.speechSynthesis = { speak, cancel: vi.fn() };
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  window._kokoroTTS = undefined;   // force the speechSynthesis path, which we can observe
  // Pin the engine. With the default 'auto' pref, start() awaits
  // modelCache.hasWhisper(), whose device-storage loader has no timeout, so in
  // a test environment it never settles and the recognizer is never created.
  try { localStorage.setItem("allo_voice_engine", "webspeech"); } catch (_) {}
  return {
    instances,
    speak,
    restore: () => {
      window.SpeechRecognition = prevSR;
      window.speechSynthesis = prevSynth;
      window.SpeechSynthesisUtterance = prevUtter;
      window._kokoroTTS = prevKokoro;
      try { localStorage.removeItem("allo_voice_engine"); } catch (_) {}
    },
  };
}

const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

afterEach(() => { vi.useRealTimers(); });

describe('AlloBot defers to a talking user', () => {
  it('answers immediately once the user finishes their command', async () => {
    const fake = installFakes();
    try {
      const fontBigger = vi.fn(() => 18);
      const ctx = { fontBigger, addToast: vi.fn(), setVoiceActive: vi.fn() };
      const loop = AC.createVoiceLoop(() => ctx);
      loop.start();
      const rec = fake.instances[0];
      expect(rec, 'recognizer was created').toBeTruthy();

      // A final transcript means the floor is handed back, so the reply to it
      // must NOT sit behind the quiet timer.
      rec.onresult(finalEvent('make the text bigger'));
      await flush();

      expect(fontBigger, 'the command ran').toHaveBeenCalled();
      expect(fake.speak, 'reply was spoken without waiting').toHaveBeenCalled();
      loop.stop();
    } finally { fake.restore(); }
  });

  it('asks the recognizer for the early signal at all', () => {
    const fake = installFakes();
    try {
      const loop = AC.createVoiceLoop(() => ({ addToast: vi.fn(), setVoiceActive: vi.fn() }));
      loop.start();
      const rec = fake.instances[0];
      // Without interim results there is no way to know a sentence is in
      // progress, which is what made the bot talk over people.
      expect(rec.interimResults, 'interim results enabled').toBe(true);
      expect(typeof rec.onspeechstart, 'speechstart observed').toBe('function');
      expect(typeof rec.onspeechend, 'speechend observed').toBe('function');
      loop.stop();
    } finally { fake.restore(); }
  });

  it('holds a reply that lands while the user has started talking again', async () => {
    vi.useFakeTimers();
    const fake = installFakes();
    try {
      let resolveRoute;
      const callGemini = vi.fn(() => new Promise((resolve) => { resolveRoute = resolve; }));
      const fontBigger = vi.fn(() => 18);
      const ctx = { callGemini, fontBigger, addToast: vi.fn(), setVoiceActive: vi.fn() };
      const loop = AC.createVoiceLoop(() => ctx);
      loop.start();
      const rec = fake.instances[0];

      // A phrase with no deterministic match goes to the AI route and parks.
      rec.onresult(finalEvent('could you bump up the words for me'));
      await flush();
      expect(callGemini, 'went to the AI route').toHaveBeenCalled();

      // While it is still thinking, the user starts a NEW sentence.
      rec.onspeechstart();
      rec.onresult(interimEvent('actually wait'));

      resolveRoute(JSON.stringify({ commandId: 'font_bigger', params: {}, confidence: 0.95 }));
      await flush();

      expect(fontBigger, 'the command still ran').toHaveBeenCalled();
      expect(fake.speak, 'but the bot stayed quiet').not.toHaveBeenCalled();

      // Once they stop and the room is quiet, the held reply comes out.
      rec.onspeechend();
      await vi.advanceTimersByTimeAsync(1500);
      expect(fake.speak, 'reply released after the pause').toHaveBeenCalled();
      loop.stop();
    } finally { fake.restore(); }
  });

  it('drops a held reply rather than reading stale narration much later', async () => {
    vi.useFakeTimers();
    const fake = installFakes();
    try {
      let resolveRoute;
      const callGemini = vi.fn(() => new Promise((resolve) => { resolveRoute = resolve; }));
      const ctx = { callGemini, fontBigger: vi.fn(() => 18), addToast: vi.fn(), setVoiceActive: vi.fn() };
      const loop = AC.createVoiceLoop(() => ctx);
      loop.start();
      const rec = fake.instances[0];

      rec.onresult(finalEvent('could you bump up the words for me'));
      await flush();
      rec.onspeechstart();
      resolveRoute(JSON.stringify({ commandId: 'font_bigger', params: {}, confidence: 0.95 }));
      await flush();
      expect(fake.speak).not.toHaveBeenCalled();

      // The user keeps talking well past the hold ceiling. Reading the old
      // narration out now would be worse than dropping it; the toast already
      // carried the same message.
      for (let i = 0; i < 12; i++) {
        rec.onresult(interimEvent('still going'));
        await vi.advanceTimersByTimeAsync(1000);
      }
      rec.onspeechend();
      await vi.advanceTimersByTimeAsync(2000);
      expect(fake.speak, 'stale reply dropped, not spoken').not.toHaveBeenCalled();
      loop.stop();
    } finally { fake.restore(); }
  });
});
