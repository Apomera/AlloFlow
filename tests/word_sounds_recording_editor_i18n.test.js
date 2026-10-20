// The syllable recording editor and its local "Reuse reviewed recordings"
// library speak through the host translator: every heading, button, label,
// aria-label, next-step hint, status and error message. Mounted from the
// runtime module (what ships), with its embedded core and the real library.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const DIR = process.env.LANE_DIR || '.';
const REPO = process.cwd().replace(/\\/g, '/');
const require = createRequire(import.meta.url);
const React = require(resolve(REPO, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const LIB_START = '// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY';
const EDITOR_START = '// BEGIN WORD SOUNDS SYLLABLE RECORDING EDITOR';
const EDITOR_END = '// END WORD SOUNDS SYLLABLE RECORDING EDITOR';
let runtime, setup, api, keys, alloData;

// Marks every lookup so untranslated text stands out: "[leaf] {param} ...".
const marking = (key, _fallback, params = {}) => '[' + key.replace(/^word_sounds\./, '') + ']' + Object.keys(params).map((name) => ' {' + name + '}').join('');
const echo = (key) => key;

beforeAll(() => {
  runtime = readFileSync(DIR + '/word_sounds_module.js', 'utf8');
  setup = readFileSync(DIR + '/word_sounds_setup_source.jsx', 'utf8');
  // The keys this change added, with their English (pinned).
  keys = JSON.parse(readFileSync(REPO + '/tests/fixtures/word_sounds_recording_editor_keys.json', 'utf8'));
  alloData = readFileSync(DIR + '/allo_data_source.jsx', 'utf8');
  const core = sliceBetween(runtime, '// BEGIN GENERATED WORD SOUNDS CORE', '// END GENERATED WORD SOUNDS CORE', { label: 'embedded core' });
  const block = sliceBetween(runtime, LIB_START, EDITOR_END, { label: 'library + editor' });
  // eslint-disable-next-line no-new-func
  api = new Function('React', core + '\n' + block + '\nreturn { WS_CORE, Editor: WordSoundsSyllableRecordingEditor, createLibrary: createWordSoundsReviewedLibrary, processPcm: processWordSoundsSyllablePcm };')(React);
});

let root = null, host = null;
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
  root = null; host = null;
});
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
// File.text() resolves on a timer in jsdom: poll instead of guessing a delay.
const settle = async (done) => { for (let i = 0; i < 200 && !done(); i++) await act(async () => { await new Promise((r) => setTimeout(r, 10)); await flush(); }); };
async function mount(props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(React.createElement(api.Editor, { word: 'banana', language: 'en', board: null, onSave: () => true, ...props })); await flush(); });
  return host;
}
const button = (text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text) || null;
const statuses = () => [...host.querySelectorAll('[role="status"]')].map((n) => n.textContent);
const textNodes = (root) => {
  const out = [];
  const walker = document.createTreeWalker(root, 4);
  while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) out.push(walker.currentNode.nodeValue.trim());
  return out;
};
// Visible text that did not come from the translator: anything with a word in it
// that is not a "[key] values" rendering (option numbers carry no words).
const untranslated = (root) => [
  ...textNodes(root),
  ...[...root.querySelectorAll('[aria-label],[placeholder],[title]')].flatMap((n) => ['aria-label', 'placeholder', 'title'].map((a) => n.getAttribute(a)).filter(Boolean)),
].filter((t) => /[A-Za-z]{2}/.test(t) && !/^\[[a-z0-9_]+\]/.test(t));

describe('syllable recording editor strings come from the translator', () => {
  it('renders every heading, control, label and hint through translate', async () => {
    await mount({ translate: marking });
    expect(untranslated(host)).toEqual([]);
    expect(host.querySelector('summary').textContent).toBe('[syllable_rec_summary_not_saved] banana');
    expect(button('[syllable_rec_preview_all]')).toBeTruthy();
    expect(button('[syllable_rec_save]')).toBeTruthy();
    expect(button('[syllable_library_find]')).toBeTruthy();
    expect(host.querySelector('[aria-label="[syllable_rec_move_later_n] 1"]'), 'move button aria-label').toBeTruthy();
    expect(host.querySelector('[placeholder="[written_hint_placeholder]"]')).toBeTruthy();
    expect([...host.querySelectorAll('label')].some((l) => l.textContent.startsWith('[syllable_rec_label_n] 1')), 'label text').toBe(true);
    expect([...host.querySelectorAll('p')].some((p) => /^\[syllable_rec_next_(label_one|labels|clip_one|clips)\]/.test(p.textContent)), 'next-step hint').toBe(true);
  });

  it('keeps the English, with values filled in, when the pack has no entry', async () => {
    await mount({ translate: echo });
    expect(host.querySelector('summary').textContent).toBe('Syllable recordings for “banana” — not saved');
    expect(button('Preview syllables in order')).toBeTruthy();
    expect(host.querySelector('[aria-label="Move syllable 1 later"]')).toBeTruthy();
    expect(host.textContent.includes('Number of syllables')).toBe(true);
  });

  it('translates status messages for count changes and moves', async () => {
    await mount({ translate: marking });
    const select = host.querySelector('select');
    await act(async () => { Simulate.change(select, { target: { value: '4' } }); await flush(); });
    expect(statuses()).toContain('[syllable_rec_count_changed]');
    await act(async () => { host.querySelector('[aria-label="[syllable_rec_move_later_n] 1"]').click(); await flush(); });
    expect(statuses()).toContain('[syllable_rec_moved] 1 2');
    expect(untranslated(host)).toEqual([]);
  });

  it('translates the audio check errors thrown by the clip reader', async () => {
    await mount({ translate: marking });
    const upload = host.querySelector('input[type="file"][accept="audio/*"]');
    const tiny = new File(['x'], 'clip.wav', { type: 'audio/wav' });
    await act(async () => { Simulate.change(upload, { target: { files: [tiny], value: '' } }); await flush(); });
    expect(statuses()).toContain('[syllable_rec_err_file_size]');
  });

  it('translates the local library screen and its storage errors', async () => {
    await mount({ translate: marking });
    // jsdom has no IndexedDB: the real library reports it cannot open.
    await act(async () => { button('[syllable_library_find]').click(); await flush(); });
    expect(statuses().some((s) => /^\[syllable_library_(no_browser|none)\]$/.test(s)), statuses().join(' | ')).toBe(true);
    const importInput = host.querySelector('input[type="file"][accept=".json,application/json"]');
    const wrongFormat = new File([JSON.stringify({ format: 'something-else', version: 1 })], 'set.json', { type: 'application/json' });
    await act(async () => { Simulate.change(importInput, { target: { files: [wrongFormat], value: '' } }); await flush(); });
    await settle(() => statuses().some((s) => s.startsWith('[syllable_library_import_failed]')));
    expect(statuses()).toContain('[syllable_library_import_failed] [syllable_library_set_format]');
    const empty = new File([], 'empty.json', { type: 'application/json' });
    await act(async () => { Simulate.change(importInput, { target: { files: [empty], value: '' } }); await flush(); });
    expect(statuses()).toContain('[syllable_library_import_failed] [syllable_library_set_too_large]');
    expect(untranslated(host)).toEqual([]);
  });

  it('library and audio helpers keep English messages and carry their keys', () => {
    const library = api.createLibrary(api.WS_CORE, null);
    const quota = Object.assign(new Error('x'), { name: 'QuotaExceededError' });
    expect(library.message(quota)).toMatch(/^Device storage is full\./);
    expect(library.message(quota, marking)).toBe('[syllable_library_storage_full]');
    let thrown;
    try { library.parseSet('not json', 'banana', 'en'); } catch (error) { thrown = error; }
    expect(thrown.code).toBe('invalid');
    expect(thrown.messageKey).toBe('word_sounds.syllable_library_set_invalid');
    expect(library.message(thrown)).toBe(thrown.message);
    expect(library.message(thrown, marking)).toBe('[syllable_library_set_invalid]');
    let silent;
    try { api.processPcm([new Float32Array(16000)], 16000, {}); } catch (error) { silent = error; }
    expect(silent.message).toBe('This recording is silent. Record the syllable again.');
    expect(silent.messageKey).toBe('word_sounds.syllable_rec_err_silent');
  });
});

describe('keys, fallbacks and copies stay in step', () => {
  const literalKeys = (text) => [...new Set([...text.matchAll(/'(word_sounds\.[a-z0-9_]+)'/g)].map((m) => m[1]))];
  const LIT = "'((?:[^'\\\\]|\\\\.)*)'";
  const pairs = (text) => [
    ...[...text.matchAll(new RegExp("\\b(?:tr\\(|errorText\\(error, )'(word_sounds\\.[a-z0-9_]+)', " + LIT, 'g'))].map((m) => [m[1], m[2]]),
    ...[...text.matchAll(new RegExp("fail\\('[a-z]+', " + LIT + ", '(word_sounds\\.[a-z0-9_]+)'\\)", 'g'))].map((m) => [m[2], m[1]]),
    ...[...text.matchAll(new RegExp('new Error\\(' + LIT + "\\), \\{ messageKey: '(word_sounds\\.[a-z0-9_]+)' \\}", 'g'))].map((m) => [m[2], m[1]]),
  ];

  it('every key in the library, editor and lesson-script code is listed and registered with the same English', () => {
    const block = sliceBetween(runtime, LIB_START, EDITOR_END);
    const di = readFileSync(DIR + '/word_sounds_di_loader.js', 'utf8');
    const used = [...literalKeys(block), ...literalKeys(di), 'word_sounds.missing_letter_say', 'word_sounds.syllable_recordings_heading'];
    const registered = (k) => alloData.includes(`'${k}':`) || alloData.includes(`"${k}":`);
    expect(used.filter((k) => !registered(k)), 'missing from WORD_SOUNDS_STRINGS').toEqual([]);
    for (const [key, english] of pairs(block)) {
      if (!(key in keys)) continue; // pre-existing keys (exit guard, notices)
      expect(english.replace(/\\(.)/g, '$1'), key).toBe(keys[key]);
    }
    for (const [key, english] of Object.entries(keys)) {
      const stored = `'${key}': '${english.replace(/'/g, "\\'").replace(/\{([a-zA-Z0-9_]+)\}/g, '{{$1}}')}',`;
      expect(alloData.includes(stored), `allo_data entry for ${key}`).toBe(true);
    }
  });

  it('the runtime module carries the canonical library and editor blocks', () => {
    for (const [start, end] of [[LIB_START, '// END WORD SOUNDS REVIEWED RECORDING LIBRARY'], [EDITOR_START, EDITOR_END]]) {
      expect(sliceBetween(runtime, start, end) === sliceBetween(setup, start, end), start).toBe(true);
    }
  });

  it('the setup source still compiles', () => {
    const { transformSync } = require(resolve(REPO, 'node_modules/@babel/core'));
    expect(() => transformSync(setup, { plugins: [require.resolve(resolve(REPO, 'node_modules/@babel/plugin-transform-react-jsx'))], configFile: false, babelrc: false, compact: true })).not.toThrow();
    expect(setup.includes("{tf('word_sounds.syllable_recordings_heading', 'Word-specific syllable recordings')}")).toBe(true);
  }, 30000); // compiling the ~475 KB setup source takes several seconds under load
});
