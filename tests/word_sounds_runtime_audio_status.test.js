import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('word_sounds_module.js', 'utf8').replace(/\r\n/g, '\n');
const core = new Function(`${readFileSync('word_sounds_core.js', 'utf8')}\nreturn createWordSoundsCore();`)();
function between(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error(`Missing production boundary: ${start}`);
  return source.slice(from, to);
}
const callbackSource = between('      const reportPreparedRuntimePlayback =', '      const structuralPreparedAudioBlocked =');
const preflightSource = between('      React.useEffect(() => {\n        if (!playbackPreflightEnabled', '      const reportPreparedRuntimePlayback =');
const manifestSource = between('      const portableTtsLibrary = React.useMemo', '      const [preparedAudioRetryEpoch,');
const flush = async () => { for (let i = 0; i < 16; i += 1) await Promise.resolve(); };

function coverageFor(words, language = 'en-US', activities = ['blending']) {
  const helperSource = between('    const syllableCountWordKey =', '    // SyllableCountingView');
  const helpers = new Function('WS_CORE', 'window', helperSource + '\nreturn {syllableCountAudioFor,syllableCountContextKey};')(core, {});
  const env = { React: { useMemo: fn => fn(), useCallback: fn => fn }, preloadedWords: words, WS_CORE: core, wordSoundsLanguage: language,
    ...helpers, activitySequence: activities, wordSoundsActivity: activities[0], selectedVoice: '', currentWordSoundsWord: words[0]?.word,
    wordSoundsPhonemes: words[0], wordSoundsAudioLibrary: {}, syllableCountAudioRef: { current: null }, syllableCountContextRef: { current: null },
    syllableCountAttemptRef: { current: 0 }, syllableCountResponsesRef: { current: [] }, syllableCountDeliveryRef: { current: null }, advanceEpochRef: { current: 0 } };
  return new Function(...Object.keys(env), `${manifestSource}\nreturn { portableTtsLibrary, preparedAudioTargets, preparedAudioStartupTargets, preparedAudioCoverage };`)(...Object.values(env));
}
function runtime(previous, total = 4, enabled = true, code = callbackSource) {
  const progress = { completed: ['blending'], correct: 2, attempts: 3, sequence: ['blending', 'read_sentence'], wordIndex: 1 };
  const state = { report: structuredClone(previous), startup: false, progress, reports: [] };
  const callback = () => new Function('React', 'playbackPreflightEnabled', 'preparedAudioCoverage', 'preparedAudioPlayback', 'setPreparedAudioStartupReady', 'publishPreparedAudioStatus',
    `${code}\nreturn reportPreparedRuntimePlayback;`)(
    { useCallback: fn => fn }, enabled, { total }, state.report,
    value => { state.startup = value; },
    report => { state.report = report; state.reports.push(report); },
  );
  return { state, play: status => callback()(status) };
}

afterEach(() => vi.useRealTimers());

describe('actual prepared runtime playback callback', () => {
  it('the regression assertion rejects an isolated historical all-targets-ready mutation', () => {
    const marker = 'setPreparedAudioStartupReady(true);\n          return;';
    const mutated = callbackSource.replace(marker, 'setPreparedAudioStartupReady(true);\n          publishPreparedAudioStatus({ status: "ready", ready: preparedAudioCoverage.total, total: preparedAudioCoverage.total, failed: 0 });\n          return;');
    expect(mutated).not.toBe(callbackSource);
    const previous = { status: 'unsupported', ready: 1, total: 4, failed: 2 };
    const h = runtime(previous, 4, true, mutated);
    h.play('ready');
    expect(() => expect(h.state.report).toEqual(previous)).toThrow();
    expect(readFileSync('word_sounds_module.js', 'utf8').replace(/\r\n/g, '\n')).toBe(source);
  });
  it.each(['checking', 'missing', 'damaged', 'unsupported', 'blocked'])('one successful clip preserves the %s result for other clips', status => {
    const previous = { status, ready: 1, total: 4, failed: status === 'checking' ? 0 : 2, deliveryAt: 123 };
    const h = runtime(previous);
    const progress = structuredClone(h.state.progress);
    h.play('ready');
    expect(h.state.startup).toBe(true);
    expect(h.state.report).toEqual(previous);
    expect(h.state.reports).toEqual([]);
    expect(h.state.progress).toEqual(progress);
    h.play('ready');
    expect(h.state.report.ready).toBe(1);
    expect(h.state.reports).toEqual([]);
  });
  it.each(['missing', 'damaged', 'unsupported'])('a blocked clip preserves previous %s evidence and verified counts', status => {
    const h = runtime({ status, ready: 1, total: 4, failed: 2 });
    h.play('blocked');
    expect(h.state.report).toEqual({ status, ready: 1, total: 4, failed: 2 });
    expect(h.state.startup).toBe(false);
  });
  it('a failure never assumes that all other targets were decoded', () => {
    const h = runtime({ status: 'checking', ready: 0, total: 4, failed: 0 });
    h.play('damaged');
    expect(h.state.report).toEqual({ status: 'damaged', ready: 0, total: 4, failed: 1 });
    h.play('ready');
    expect(h.state.report).toEqual({ status: 'damaged', ready: 0, total: 4, failed: 1 });
  });
  it('lowers independent full readiness after playback fails and preserves progress on retry', () => {
    const h = runtime({ status: 'ready', ready: 4, total: 4, failed: 0 });
    const progress = structuredClone(h.state.progress);
    h.play('blocked');
    expect(h.state.report).toEqual({ status: 'blocked', ready: 3, total: 4, failed: 1 });
    h.play('blocked');
    expect(h.state.report).toEqual({ status: 'blocked', ready: 3, total: 4, failed: 1 });
    h.state.report = { status: 'ready', ready: 4, total: 4, failed: 0 };
    h.play('ready');
    expect(h.state.report).toEqual({ status: 'ready', ready: 4, total: 4, failed: 0 });
    expect(h.state.progress).toEqual(progress);
  });
  it.each([[false, 4], [true, 0]])('does not report outside prepared preflight (enabled=%s total=%s)', (enabled, total) => {
    const previous = { status: 'idle', ready: 0, total, failed: 0 };
    const h = runtime(previous, total, enabled);
    h.play('damaged');
    h.play('ready');
    expect(h.state.report).toEqual(previous);
    expect(h.state.reports).toEqual([]);
    expect(h.state.startup).toBe(false);
  });
});

describe('actual per-clip preflight effect', () => {
  it('omits only intentional teacher-spoken count targets and keeps mixed-activity requirements', () => {
    const audioContext = core.createSyllableCountAudioContext({ language: 'en-US' });
    const prepared = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en-US', count: 1, revision: 1, reviewed: true, audioContext });
    const words = [{ word: 'fire', _ttsRequiredKeys: ['fire', 'instruction'], activityItems: { syllable_counting: prepared } }];
    expect(coverageFor(words, 'en-US', ['syllable_counting']).preparedAudioTargets).toEqual(['instruction']);
    expect(coverageFor(words, 'en-US', ['syllable_counting', 'blending']).preparedAudioTargets).toEqual(['fire', 'instruction']);
    words[0]._ttsAssets = { fire: 'data:audio/wav;base64,' + Buffer.from('RIFFWAVEnewclip').toString('base64') };
    expect(coverageFor(words, 'en-US', ['syllable_counting']).preparedAudioTargets).toContain('fire');
  });
  it('requires both legacy words when a sparse manifest declares only one word and a prompt', () => {
    const words = [{ targetWord: ' Cat ', _ttsRequiredKeys: ['cat', 'which word?'],
      _ttsAssets: { cat: { mime: 'audio/wav', base64: 'GOOD' }, 'which word?': { mime: 'audio/wav', base64: 'GOOD' } } },
      { targetWord: 'Dog', _ttsAssets: {} }];
    const derived = coverageFor(words);
    expect(derived.preparedAudioTargets).toEqual(['cat', 'dog', 'which word?']);
    expect(derived.preparedAudioCoverage).toEqual({ ready: 2, total: 3, missing: 1 });
    const reports = [];
    const Audio = vi.fn();
    const env = { React: { useEffect: fn => fn() }, playbackPreflightEnabled: true, ...derived, preparedAudioRetryEpoch: 0,
      setPreparedAudioStartupReady: vi.fn(), publishPreparedAudioStatus: report => reports.push(report), Audio };
    new Function(...Object.keys(env), preflightSource)(...Object.values(env));
    expect(Audio).not.toHaveBeenCalled();
    expect(reports).toEqual([{ status: 'missing', ready: 2, total: 3, failed: 1 }]);
    const h = runtime(reports[0], 3);
    h.play('ready');
    expect(h.state.report).toEqual({ status: 'missing', ready: 2, total: 3, failed: 1 });
  });
  it('keeps own prototype-special clips in a null-prototype runtime dictionary and excludes inherited clips', () => {
    const own = Object.fromEntries([['constructor', { mime: 'audio/wav', base64: 'GOOD' }], ['__proto__', { mime: 'audio/wav', base64: 'GOOD' }]]);
    const inherited = Object.create({ missing: { mime: 'audio/wav', base64: 'GOOD' } });
    const derived = coverageFor([{ targetWord: 'constructor', _ttsRequiredKeys: ['constructor', '__proto__', 'missing'], _ttsAssets: own },
      { targetWord: 'missing', _ttsAssets: inherited }]);
    expect(Object.getPrototypeOf(derived.portableTtsLibrary)).toBeNull();
    expect(Object.keys(derived.portableTtsLibrary)).toEqual(['constructor', '__proto__']);
    expect(Object.hasOwn(derived.portableTtsLibrary, '__proto__')).toBe(true);
    expect(derived.portableTtsLibrary.missing).toBeUndefined();
    expect(derived.portableTtsLibrary.base64).toBeUndefined();
    expect(derived.preparedAudioCoverage).toEqual({ ready: 2, total: 3, missing: 1 });
  });
  it('decodes every declared clip independently, retaining damaged and unsupported results after one plays', async () => {
    vi.useFakeTimers();
    const words = [{ targetWord: 'cat', _ttsRequiredKeys: ['cat', 'sentence', 'other'], _ttsAssets: {
      cat: { mime: 'audio/wav', base64: 'GOOD' },
      sentence: { mime: 'audio/wav', base64: 'FAIL' },
      other: { mime: 'audio/x-unsupported', base64: 'GOOD' },
    } }];
    const derived = coverageFor(words);
    const reports = [];
    const probed = [];
    const state = { startup: false };
    class AudioProbe {
      canPlayType(mime) { return mime === 'audio/x-unsupported' ? '' : 'probably'; }
      load() {
        if (!this.src) return;
        probed.push(this.src);
        queueMicrotask(() => this.src.endsWith('FAIL') ? this.onerror?.() : this.onloadedmetadata?.());
      }
      removeAttribute() { this.src = ''; }
    }
    const env = {
      React: { useEffect: fn => { state.cleanup = fn(); } }, playbackPreflightEnabled: true,
      ...derived, preparedAudioRetryEpoch: 0,
      setPreparedAudioStartupReady: value => { state.startup = value; },
      publishPreparedAudioStatus: report => { reports.push(report); }, Audio: AudioProbe,
    };
    new Function(...Object.keys(env), preflightSource)(...Object.values(env));
    await vi.runAllTimersAsync();
    await flush();
    expect(derived.preparedAudioTargets).toEqual(['cat', 'sentence', 'other']);
    expect(probed).toEqual(['data:audio/wav;base64,GOOD', 'data:audio/wav;base64,FAIL']);
    expect(reports.at(-1)).toEqual({ status: 'unsupported', ready: 1, total: 3, failed: 2 });
    expect(state.startup).toBe(true);
    const h = runtime(reports.at(-1), 3);
    h.play('ready');
    expect(h.state.report).toEqual(reports.at(-1));
    state.cleanup();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not probe or certify a pack whose required clip is absent', () => {
    const derived = coverageFor([{ targetWord: 'cat', _ttsRequiredKeys: ['cat', 'sentence'], _ttsAssets: { cat: 'data:audio/wav;base64,GOOD' } }]);
    const reports = [];
    const Audio = vi.fn();
    const env = { React: { useEffect: fn => fn() }, playbackPreflightEnabled: true, ...derived, preparedAudioRetryEpoch: 0,
      setPreparedAudioStartupReady: vi.fn(), publishPreparedAudioStatus: report => reports.push(report), Audio };
    new Function(...Object.keys(env), preflightSource)(...Object.values(env));
    expect(Audio).not.toHaveBeenCalled();
    expect(reports).toEqual([{ status: 'missing', ready: 1, total: 2, failed: 1 }]);
    const h = runtime(reports[0], 2);
    h.play('ready');
    expect(h.state.report.status).toBe('missing');
    expect(h.state.report.ready).toBe(1);
  });
});
