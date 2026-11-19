// 2026-11-18 (owner: "don't we have ability to create your own phoneme packs? this would complement those
// advanced settings"): the Voice Pack editor (word_sounds_setup_source.jsx) now
//   - lists schwa (Short Vowels, "about", shown as /ə/), the one sound the built-in bank had no recording of;
//   - can make any sound of a TEACHER pack with an AI voice: Gemini TTS through the app (window.callTTSDirect,
//     voice Aoede) with the Phoneme app's four prompts in turn, each result checked by the editor's AI check,
//     the first that passes kept; the sound is marked "AI voice" until it is recorded or cleared;
//   - never offers it for a student-voice pack, or when the app's AI gate refuses TTS.
// The editor is sliced from the source as in tests/word_sounds_copy_print_labels.test.js.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));

let Editor, root = null, host = null;
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const KEY = 'allo_phoneme_voice_packs_v1';
beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const setup = readFileSync('word_sounds_setup_source.jsx', 'utf8');
  const slice = sliceBetween(setup, 'const PHONEME_PACK_STORAGE_KEY =', 'const PACK_COMMON_WORDS', { label: 'voice pack editor' });
  const code = transformSync(slice, { plugins: [require.resolve('@babel/plugin-transform-react-jsx')], configFile: false, babelrc: false }).code;
  Editor = new Function('React', code + '\nreturn PhonemeVoicePackEditor;')(React);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  localStorage.removeItem(KEY);
  delete window.callTTSDirect; delete window.callGeminiAudio; delete window.__alloAiUsable;
  vi.restoreAllMocks();
});
async function open(kind, { tts = true, verdicts = [true] } = {}) {
  localStorage.setItem(KEY, JSON.stringify({ activeId: 'p1', packs: [{ id: 'p1', name: 'Mine', kind, consent: true, clips: {}, history: {}, studentName: '', studentId: null }] }));
  const ttsCalls = [], checkCalls = [];
  let n = 0;
  window.callTTSDirect = vi.fn(async (text, voice) => { ttsCalls.push({ text, voice }); n++; return 'data:audio/wav;base64,' + Buffer.from('tts-' + n).toString('base64'); });
  window.callGeminiAudio = vi.fn(async (prompt, clip) => { checkCalls.push({ prompt, clip }); const ok = verdicts[Math.min(checkCalls.length - 1, verdicts.length - 1)]; return JSON.stringify({ match: ok, clipped: true, note: ok ? '' : 'sounds like a full word' }); });
  window.__alloAiUsable = (want) => (want === 'tts' ? tts : true);
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await act(async () => { root.render(React.createElement(Editor, { onClose: () => {}, t: (key, fallback) => fallback })); await flush(); });
  return { ttsCalls, checkCalls };
}
const click = async (node) => { expect(node, 'control to click').toBeTruthy(); await act(async () => { node.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await flush(); }); };
const aiButton = (key) => host.querySelector('[data-voice-pack-ai="' + key + '"]');
const stored = () => JSON.parse(localStorage.getItem(KEY) || 'null');

describe('Voice Pack: schwa and the AI voice', () => {
  it('lists schwa as /ə/ with "about"', async () => {
    await open('teacher-model');
    expect(host.textContent).toContain('/ə/');
    expect(host.textContent).toMatch(/like about|like\s*a\s*bout/);
    expect(aiButton('schwa')).toBeTruthy();
  });

  it('makes a sound with the AI voice, retrying until the AI check passes, and marks it "AI voice"', async () => {
    const { ttsCalls, checkCalls } = await open('teacher-model', { verdicts: [false, true] });
    await click(aiButton('schwa'));
    expect(ttsCalls).toHaveLength(2);
    expect(ttsCalls.every((c) => c.voice === 'Aoede')).toBe(true);
    expect(ttsCalls[0].text).toContain('/ə/');
    expect(ttsCalls[0].text).toContain("'about'");
    expect(ttsCalls[1].text).toBe('Say the English sound /ə/ as a native speaker would.');
    expect(checkCalls).toHaveLength(2);
    expect(checkCalls[1].clip).toBe('data:audio/wav;base64,' + Buffer.from('tts-2').toString('base64'));
    expect(host.querySelector('[data-voice-pack-ai-badge]').textContent).toBe('AI voice');
    expect(host.textContent).toContain('Made /ə/ with an AI voice. Tap');
    // The pack (once saved) keeps the clip and the AI mark.
    await click([...host.querySelectorAll('button')].find((b) => /Save/.test(b.textContent)));
    const pack = stored().packs[0];
    expect(pack.clips.schwa).toBe('data:audio/wav;base64,' + Buffer.from('tts-2').toString('base64'));
    expect(pack.ai).toEqual({ schwa: true });
  });

  it('keeps the last result but says so when no try passes the check', async () => {
    const { ttsCalls } = await open('teacher-model', { verdicts: [false] });
    await click(aiButton('s'));
    expect(ttsCalls).toHaveLength(4);
    expect(host.textContent).toContain('it was not confirmed as right');
    expect(host.querySelector('[data-voice-pack-ai-badge]')).toBeTruthy();
  });

  it('drops the AI mark when the sound is cleared', async () => {
    await open('teacher-model');
    await click(aiButton('schwa'));
    expect(host.querySelector('[data-voice-pack-ai-badge]')).toBeTruthy();
    await click(host.querySelector('button[aria-label="Clear ə"]'));
    expect(host.querySelector('[data-voice-pack-ai-badge]')).toBeNull();
    // Nothing stale travels in the saved (or exported) pack.
    await click([...host.querySelectorAll('button')].find((b) => /Save/.test(b.textContent)));
    const pack = stored().packs[0];
    expect(pack.clips.schwa).toBeUndefined();
    expect(pack.ai || {}).toEqual({});
  });

  it('is never offered for a student-voice pack, or when the AI gate refuses TTS', async () => {
    await open('student-voice');
    expect(aiButton('schwa')).toBeNull();
    expect(host.textContent).toContain('/ə/');
    await act(async () => root.unmount()); root = null; host.remove(); host = null;
    await open('teacher-model', { tts: false });
    expect(aiButton('schwa')).toBeNull();
  });
});
