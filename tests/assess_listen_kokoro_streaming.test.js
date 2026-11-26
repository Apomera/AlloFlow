import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceTopLevelBlock } from './helpers/host_source.js';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const playerSource = sliceTopLevelBlock(
  readFileSync('AlloFlowANTI.txt', 'utf8'),
  "if (typeof window !== 'undefined' && !window.AlloSpeechPlayer)",
  { file: 'AlloFlowANTI.txt' }
);
const kokoroSource = readFileSync('kokoro_tts_loader.js', 'utf8');

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  delete window.AlloSpeechPlayer;
  delete window._kokoroTTS;
  delete window.__alloSelectedVoice;
  delete window.__alloTextLanguage;
  vi.restoreAllMocks();
});

describe('Assess Listen buttons & Kokoro streaming playback', () => {
  it('kokoro_tts_loader splitSentences keeps list markers (A., B., 1.) attached to their options and normalizes ?.', () => {
    const fnMatch = kokoroSource.match(/function splitSentences\(text\)\s*\{[\s\S]*?\n        \}/);
    expect(fnMatch).not.toBeNull();
    // Unescape the template-literal doubled backslashes as the worker blob sees them
    const workerFnSrc = fnMatch[0].replace(/\\\\/g, '\\');
    const splitSentences = new Function('return ' + workerFnSrc)();
    const chunks = splitSentences(
      'Which planet is closest to the Sun?. A. Mercury. B. Venus. C. Earth. D. Mars.'
    );
    expect(chunks).toEqual([
      'Which planet is closest to the Sun?',
      'A. Mercury.',
      'B. Venus.',
      'C. Earth.',
      'D. Mars.',
    ]);
    expect(chunks.some((c) => /^[A-D0-9]\.$/.test(c))).toBe(false);
  });

  it('AlloSpeechPlayer streams multi-sentence Kokoro audio chunk-by-chunk without falling back to browser speechSynthesis', async () => {
    window.__alloSelectedVoice = 'af_heart';
    window.__alloTextLanguage = 'English';
    window._kokoroTTS = { ready: true };

    const audioInstances = [];
    class FakeAudio {
      constructor(url) {
        this.url = url;
        this.paused = false;
        audioInstances.push(this);
      }
      play() {
        return Promise.resolve().then(() => {
          if (typeof this.onplaying === 'function') this.onplaying();
        });
      }
      pause() { this.paused = true; }
    }

    const callTTS = vi.fn((chunk) => Promise.resolve('blob:kokoro-' + encodeURIComponent(chunk.slice(0, 12))));
    const browserSpeak = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak: browserSpeak, cancel: vi.fn(), getVoices: () => [] });
    class Utterance { constructor(t) { this.text = t; } }

    const player = new Function(
      'window', 'CustomEvent', 'Audio', 'SpeechSynthesisUtterance', 'AbortController', 'isGlobalMuted', 'callTTS',
      playerSource + '\nreturn window.AlloSpeechPlayer;'
    )(window, window.CustomEvent, FakeAudio, Utterance, AbortController, () => false, callTTS);

    const longQuestion =
      'Which process allows green plants to convert sunlight into stored chemical energy?. ' +
      'A. Photosynthesis inside chloroplasts in the leaves. ' +
      'B. Cellular respiration in mitochondria during sleep. ' +
      'C. Osmosis across the root cell membrane.';

    const speakPromise = player.speak(longQuestion);
    // Allow first chunk to start playing and prefetch chunk 2
    await new Promise((r) => setTimeout(r, 20));
    expect(audioInstances.length).toBe(1);
    expect(callTTS.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(callTTS.mock.calls[0][0]).toBe('Which process allows green plants to convert sunlight into stored chemical energy?');
    expect(callTTS.mock.calls[1][0]).toContain('A. Photosynthesis');
    expect(browserSpeak).not.toHaveBeenCalled();

    // Finish chunk 1 -> chunk 2 plays -> finish chunk 2 -> chunk 3 plays -> finish chunk 3
    for (let step = 0; step < 5; step++) {
      const current = audioInstances[audioInstances.length - 1];
      if (current && typeof current.onended === 'function') current.onended();
      await new Promise((r) => setTimeout(r, 15));
    }
    await speakPromise;
    expect(audioInstances.length).toBe(4);
    expect(browserSpeak).not.toHaveBeenCalled();
  });

  it('QuizListenButton shows Loading/Stop state via allo-speech-state and stops playback when clicked again', () => {
    window.React = React;
    if (!window.lucide) {
      const icon = () => React.createElement('span', { 'aria-hidden': 'true' });
      window.lucide = new Proxy({}, { get: () => icon });
    }
    if (!window.AlloModules?.QuizView) {
      new Function(readFileSync('view_quiz_module.js', 'utf8'))();
    }
    const stop = vi.fn();
    const speak = vi.fn((text) => {
      window.dispatchEvent(new CustomEvent('allo-speech-state', {
        detail: { isPlaying: true, status: 'generating', currentText: text, currentId: 1 },
      }));
    });
    window.AlloSpeechPlayer = { speak, stop, getState: () => ({ isPlaying: false, status: 'idle', currentText: null }) };

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    cleanups.push(() => { act(() => root.unmount()); container.remove(); quiet.mockRestore(); });

    act(() => {
      root.render(React.createElement(window.AlloModules.QuizView, {
        generatedContent: {
          id: 'q-listen-test',
          type: 'quiz',
          data: {
            questions: [{ type: 'mcq', question: 'What is H2O?', options: ['Water', 'Oxygen'], correctAnswer: 'Water' }],
          },
        },
        isTeacherMode: false,
        isEditingQuiz: false,
        isPresentationMode: false,
        isFactChecking: {},
        renderFormattedText: (s) => s,
        formatInlineText: (s) => s,
        getRows: () => 2,
        t: (k) => k,
      }));
    });

    const btn = container.querySelector('[data-quiz-listen="0"]');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-pressed')).toBe('false');

    act(() => btn.click());
    expect(speak).toHaveBeenCalledWith('What is H2O?. A. Water. B. Oxygen');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.getAttribute('aria-busy')).toBe('true');

    act(() => {
      window.dispatchEvent(new CustomEvent('allo-speech-state', {
        detail: { isPlaying: true, status: 'playing', currentText: 'What is H2O?. A. Water. B. Oxygen', currentId: 1 },
      }));
    });
    expect(btn.getAttribute('aria-busy')).toBeNull();
    expect(btn.textContent).toContain('Stop');

    act(() => btn.click());
    expect(stop).toHaveBeenCalledTimes(1);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });
});
