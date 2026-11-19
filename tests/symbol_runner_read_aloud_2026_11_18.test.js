import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

// 2026-11-18 (owner: local-only mic for Symbol Runner, "read-aloud grid" chosen): the learner reads the
// whole grid aloud; the on-device Whisper already downloaded through Speech setup transcribes after
// the reading (never the browser's cloud recognition), the time comes from when the voice starts and
// stops, and a symbol the device could not confirm is "not sure", never wrong. Offered to a teacher,
// or to students whose teacher saved "Students may read the grid aloud" with the set.
const require = createRequire(import.meta.url);
const md = path.resolve(process.cwd(), 'desktop/web-app/node_modules');
const core = require(path.resolve(process.cwd(), 'symbol_runner_core.js'));
const read = (f) => fs.readFileSync(f, 'utf8');
const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });
const React = require(path.resolve(md, 'react'));
const ReactDOMClient = require(path.resolve(md, 'react-dom/client'));
const { act } = require(path.resolve(md, 'react-dom/test-utils'));

function load(setup) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { runScripts: 'outside-only', url: 'https://alloflow-cdn.pages.dev/app/' });
  const w = dom.window;
  opened.push(w);
  w.matchMedia = () => ({ matches: true });
  w.AlloModules = {};
  w.React = React;
  if (setup) setup(w);
  w.eval(read('math_fluency_module.js'));
  return w;
}
async function mount(extra, setup) {
  const w = load(setup);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  w.IS_REACT_ACT_ENVIRONMENT = true;
  w.AlloSymbolRunnerCore.mountRunner = () => ({ destroy() {} });
  w.fetch = () => Promise.resolve({ ok: false });
  const host = w.document.getElementById('root');
  const root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(w.AlloModules.FluencyMaze, Object.assign({ React, t: (k) => k, addToast: () => {}, handleScoreUpdate: () => {}, initialTab: 'runner' }, extra))); });
  return { w, host, q: (id) => host.querySelector('[data-testid="' + id + '"]'), unmount: () => act(async () => { root.unmount(); }) };
}
// A voice engine stand-in: a recorder whose result arrives on stop(), and a transcriber that reads the
// grid on screen and leaves out the second symbol (as if it were misheard).
function fakeVoice(calls, transcript) {
  return (w) => {
    w.AlloFlowVoice = {
      loadPreference: () => ({ whisperTier: 'tiny' }),
      preparedWhisperTier: () => 'tiny',
      recordAudioBlob: () => { let done; const result = new Promise((r) => { done = r; }); calls.push('record'); return { supported: true, result, stop: () => { calls.push('stop'); done({ blob: { arrayBuffer: async () => new ArrayBuffer(8) } }); }, cancel: () => calls.push('cancel') }; },
      // The same shape as voice_module's transcribeAudio: { transcript, engine, durationMs }.
      transcribeAudio: async (audio, opts) => { calls.push(opts); return { transcript: transcript(w), engine: 'whisper-tiny', durationMs: 1 }; },
    };
    w.AudioContext = class { decodeAudioData(buf, ok) { ok({ duration: 2 }); } close() {} };
    w.OfflineAudioContext = class {
      constructor(channels, length) { this.length = length; this.destination = {}; }
      createBufferSource() { return { connect() {}, start() {} }; }
      startRendering() { const d = new Float32Array(this.length); for (let i = 8000; i < 24000; i++) d[i] = 0.3 * Math.sin(i / 5); return Promise.resolve({ getChannelData: () => d }); }
    };
  };
}
const gridText = (w, skip) => [...w.document.querySelectorAll('[data-sr-aloud-cell]')].map((c, i) => (i === skip ? '' : c.textContent)).filter(Boolean).join(', ');

describe('read-aloud: lining up what was heard and timing the voice', () => {
  it('lines the transcript up with the grid in order, so a missed symbol only affects itself', () => {
    expect(core.alignReadAloud('B, D, P, Q', ['b', 'd', 'p', 'q']).heard).toBe(4);
    expect(core.alignReadAloud('bee dee pee cue', ['b', 'd', 'p', 'q']).heard).toBe(4);
    expect(core.alignReadAloud('BDPQ', ['b', 'd', 'p', 'q']).heard).toBe(4);
    const skipped = core.alignReadAloud('b d q b', ['b', 'd', 'p', 'q', 'b']);
    expect(skipped.items.map((x) => x.heard)).toEqual([true, true, false, true, true]);
    expect(core.alignReadAloud('b, um, d, p, p, q', ['b', 'd', 'p', 'q']).heard).toBe(4);
    expect(core.alignReadAloud('double you, m', ['w', 'm']).items[0].heardAs).toBe('double you');
    expect(core.alignReadAloud('1, 2, three, 4', ['1', '2', '3', '4']).heard).toBe(4);
    expect(core.alignReadAloud('I went two the park', ['i', 'went', 'to', 'the', 'park']).heard).toBe(5);
    expect(core.alignReadAloud('', ['b', 'd'])).toMatchObject({ heard: 0, total: 2 });
  });
  it('times the reading from the first to the last stretch of voice', () => {
    const pcm = new Float32Array(16000 * 3);
    for (let i = 16000; i < 32000; i++) pcm[i] = 0.3 * Math.sin(i / 5);
    expect(core.readAloudSpeechSpan(pcm, 16000)).toEqual({ speech: true, startMs: 1000, endMs: 2000, durationMs: 1000 });
    expect(core.readAloudSpeechSpan(new Float32Array(16000), 16000).speech).toBe(false);
  });
  it('takes part only for sets said as plain names', () => {
    expect(core.readAloudSupported('confusable_letters')).toBe(true);
    expect(core.readAloudSupported('sight_words')).toBe(true);
    expect(core.readAloudSupported('digits_teen_decade')).toBe(true);
    for (const id of ['letter_sounds', 'subitize_dots', 'math_make_10', 'color_word_stroop', 'flanker_letters']) expect(core.readAloudSupported(id), id).toBe(false);
    expect(core.readAloudSupported('custom', [{ answer: 'cat' }, { answer: 'dog' }])).toBe(true);
    expect(core.readAloudSupported('custom', [{ answer: '3+4' }])).toBe(false);
  });
});

describe('read-aloud in the Symbol Runner panel', () => {
  it('is not offered to a student whose teacher did not allow it', async () => {
    const p = await mount({ runnerSettings: { mode: 'confusable_letters', count: 10 } });
    expect(p.q('symbol-runner-read-aloud')).toBe(null);
    await p.unmount();
  });

  it('lets a teacher allow it for students, saved with the set', async () => {
    const saved = [];
    const p = await mount({ onSaveRunnerSettings: (s) => saved.push(s) });
    expect(p.q('symbol-runner-read-aloud')).toBeTruthy();
    await act(async () => { p.q('symbol-runner-allow-aloud').querySelector('input').click(); });
    await act(async () => { p.q('symbol-runner-save-set').click(); });
    expect(saved[0]).toMatchObject({ mode: 'confusable_letters', readAloud: true });
    await p.unmount();
  });

  it('asks for the on-device model first and never offers the cloud recognizer', async () => {
    const events = [];
    const p = await mount({ runnerSettings: { mode: 'confusable_letters', count: 10, readAloud: true } }, (w) => { w.addEventListener('alloflow:open-speech-setup', (e) => events.push(e.detail)); });
    expect(p.q('symbol-runner-read-aloud-setup')).toBeTruthy();
    expect(p.q('symbol-runner-read-aloud-start')).toBe(null);
    await act(async () => { p.q('symbol-runner-read-aloud-open-setup').click(); });
    expect(events).toEqual([{ source: 'symbol-runner' }]);
    await p.unmount();
  });

  it('records, transcribes with on-device Whisper only, and marks what it could not confirm as not sure', async () => {
    const calls = [];
    const p = await mount({ runnerSettings: { mode: 'confusable_letters', count: 10, readAloud: true } }, fakeVoice(calls, (w) => gridText(w, 1)));
    await act(async () => { p.q('symbol-runner-read-aloud-start').click(); });
    expect(calls).toEqual(['record']);
    expect(p.host.querySelectorAll('[data-sr-aloud-cell]').length).toBe(10);
    expect(p.q('symbol-runner-read-aloud-status').textContent).toContain('Name every symbol');
    await act(async () => { p.q('symbol-runner-read-aloud-done').click(); await new Promise((r) => setTimeout(r, 20)); });
    const opts = calls.find((c) => typeof c === 'object');
    expect(opts).toMatchObject({ engine: 'whisper', tier: 'tiny', lang: 'en-US' });
    expect(Object.prototype.toString.call(opts.pcm)).toBe('[object Float32Array]');
    expect(p.q('symbol-runner-read-aloud-status').textContent).toBe('Reading time: 1.0 seconds. Heard 9 of 10 symbols.');
    const cells = [...p.host.querySelectorAll('[data-sr-aloud-cell]')];
    expect(cells[1].getAttribute('data-heard')).toBe('false');
    expect(cells[1].textContent).toContain('?');
    expect(cells.filter((c) => c.getAttribute('data-heard') === 'true').length).toBe(9);
    expect(p.host.textContent).toContain('may be right');
    expect(p.host.textContent).not.toMatch(/wrong|incorrect/i);
    await p.unmount();
  });

  it('stops listening when the panel closes mid-reading', async () => {
    const calls = [];
    const p = await mount({ runnerSettings: { mode: 'confusable_letters', count: 10, readAloud: true } }, fakeVoice(calls, () => ''));
    await act(async () => { p.q('symbol-runner-read-aloud-start').click(); });
    await p.unmount();
    expect(calls).toContain('cancel');
  });

  it('is not shown for a set said as sounds', async () => {
    const p = await mount({ runnerSettings: { mode: 'letter_sounds', count: 10, readAloud: true } }, fakeVoice([], () => ''));
    expect(p.q('symbol-runner-read-aloud')).toBe(null);
    await p.unmount();
  });
});
