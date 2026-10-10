import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const modules = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act } = require(resolve(modules, 'react-dom/test-utils'));
let Modal, root, container, originalAudio, originalInstructionBank;
const INST = 'data:audio/wav;base64,SYLLABLE_INSTRUCTION';
const SUN = 'data:audio/wav;base64,SUN_UNIT';
const SET = 'data:audio/wav;base64,SET_UNIT';
const TARGET = 'data:audio/wav;base64,SUNSET_ANSWER';
beforeAll(() => { Modal = setupWordSounds().WordSoundsModal; });
afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove(); root = null;
  window.Audio = originalAudio; globalThis.Audio = originalAudio;
  window.__ALLO_INSTRUCTION_AUDIO = originalInstructionBank;
  vi.useRealTimers();
});
describe('first-item syllable blending in the actual modal', () => {
  it('plays instruction, then sun, then set, without announcing sunset before a response', async () => {
    vi.useFakeTimers();
    const played = []; const clips = [];
    originalAudio = window.Audio;
    originalInstructionBank = window.__ALLO_INSTRUCTION_AUDIO;
    window.__ALLO_INSTRUCTION_AUDIO = { inst_syllable_blending: INST };
    class ControlledAudio {
      constructor(src) { this.src = src; this.currentTime = 0; this.playbackRate = 1; this.paused = true; this.events = {}; clips.push(this); setTimeout(() => this.oncanplaythrough?.(), 0); }
      play() { this.paused = false; this.ended = false; played.push(this.src); return Promise.resolve(); }
      pause() { this.paused = true; this.onpause?.(); this.events.pause?.forEach(fn => fn()); }
      // Chromium queues pause before ended when a clip reaches its natural end.
      finish() { this.paused = true; this.ended = true; this.onpause?.(); this.events.pause?.forEach(fn => fn()); this.onended?.(); this.events.ended?.forEach(fn => fn()); }
      addEventListener(name, fn) { (this.events[name] ||= new Set()).add(fn); }
      removeEventListener(name, fn) { this.events[name]?.delete(fn); }
      load() {}
    }
    window.Audio = ControlledAudio; globalThis.Audio = ControlledAudio;
    const data = { word: 'sunset', targetWord: 'sunset', phonemes: ['s', 'u', 'n', 's', 'e', 't'] };
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(React.createElement(Modal, {
      ...baseProps('syllable_blending'), isTeacherMode: false, isProbeMode: false,
      playInstructions: true, isMinimized: false, currentWordSoundsWord: 'sunset',
      wordSoundsPhonemes: data, wsPreloadedWords: [data], wordSoundsLanguage: 'en',
      wordSoundsAudioLibrary: { sun: SUN, set: SET, sunset: TARGET },
    })));
    const advance = ms => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
    await advance(1000);
    expect(played).toEqual([INST]);
    await act(async () => clips.find(clip => clip.src === INST).finish());
    await advance(2000);
    expect(played).toEqual([INST, SUN]);
    expect(container.querySelector('button[aria-label="sunset"]')?.disabled).toBe(true);
    await advance(3000);
    expect(played).toEqual([INST, SUN]);
    await act(async () => clips.find(clip => clip.src === SUN).finish());
    await advance(500);
    expect(played).toEqual([INST, SUN, SET]);
    await act(async () => clips.find(clip => clip.src === SET).finish());
    expect(container.querySelector('button[aria-label="sunset"]')?.disabled).toBe(false);
    expect(played).not.toContain(TARGET);
  });
});
