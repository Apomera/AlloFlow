import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, Component, root, host;
let originalFetch;
let originalAlloFlowVoice;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  originalAlloFlowVoice = window.AlloFlowVoice;
  window.AlloFlowVoice = {
    acquireVoiceSession: vi.fn(() => {
      let active = true;
      return {
        update: vi.fn(() => active),
        isActive: () => active,
        release: vi.fn(() => {
          active = false;
          return true;
        }),
      };
    }),
  };
  loadAlloModule('test_prep_hub_module.js');
  Component = window.AlloModules.TestPrepHub.TestPrepHub;
  originalFetch = global.fetch;
  const unavailableFetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  global.fetch = window.fetch = unavailableFetch;
});

afterAll(() => {
  global.fetch = originalFetch;
  window.fetch = originalFetch;
  if (originalAlloFlowVoice === undefined) delete window.AlloFlowVoice;
  else window.AlloFlowVoice = originalAlloFlowVoice;
});

afterEach(async () => {
  if (root) {
    await act(async () => { root.unmount(); });
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  localStorage.clear();
  document.body.style.overflow = '';
});

function replaceWindowProperty(name, value) {
  const descriptor = Object.getOwnPropertyDescriptor(window, name);
  Object.defineProperty(window, name, { configurable: true, writable: true, value });
  return () => {
    if (descriptor) Object.defineProperty(window, name, descriptor);
    else delete window[name];
  };
}

async function mount(props = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Component, { isOpen: true, onClose: () => {}, ...props }));
  });
}

function findButton(text) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes(text));
}

async function clickButton(text) {
  const button = findButton(text);
  expect(button, 'Missing button: ' + text).toBeTruthy();
  await act(async () => { button.click(); });
}

async function waitFor(check, label, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (!check() && Date.now() < deadline) {
    await act(async () => { await new Promise((resolveWait) => setTimeout(resolveWait, 20)); });
  }
  expect(check(), label).toBeTruthy();
}

function installVoiceMocks() {
  const audioInstances = [];
  const recognitionInstances = [];
  const AudioMock = vi.fn(function MockAudio(url) {
    const audio = {
      src: url,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      onplay: null,
      onended: null,
      onerror: null,
    };
    audioInstances.push(audio);
    return audio;
  });
  function MockRecognition() {
    this.start = vi.fn(() => { if (this.onstart) this.onstart(); });
    this.abort = vi.fn();
    this.stop = vi.fn();
    recognitionInstances.push(this);
  }
  return {
    audioInstances,
    recognitionInstances,
    restoreAudio: replaceWindowProperty('Audio', AudioMock),
    restoreRecognition: replaceWindowProperty('SpeechRecognition', MockRecognition),
  };
}

async function startHandsFree(callTTS, mocks) {
  await mount({ callTTS });
  await clickButton('Open practice pack');
  await clickButton('Hands-free mode');
  await waitFor(() => mocks.audioInstances.length >= 1, 'initial question narration');
  await act(async () => {
    mocks.audioInstances[0].onended();
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  });
  await waitFor(() => mocks.recognitionInstances.length >= 1, 'initial recognition session');
}

describe('Test Prep hands-free runtime safeguards', () => {
  it('confirms a low-confidence answer with yes while preserving other confidence safeguards', async () => {
    const mocks = installVoiceMocks();
    const callTTS = vi.fn(async (text) => 'blob:' + text.slice(0, 28));
    try {
      await startHandsFree(callTTS, mocks);
      await act(async () => {
        mocks.recognitionInstances[0].onresult({ results: [[{ transcript: 'B', confidence: 0.4 }]] });
        await new Promise((resolveWait) => setTimeout(resolveWait, 30));
      });
      expect(Array.from(host.querySelectorAll('input[type="radio"]')).some((input) => input.checked)).toBe(false);
      expect(host.textContent).toContain('Waiting for confirmation: option B.');
      expect(host.querySelector('[role="alert"]')).toBeNull();
      expect(host.textContent).toContain('Say yes to accept it');
      expect(callTTS.mock.calls.at(-1)[0]).toContain('Is that your answer? Say yes to confirm');

      const confirmationAudio = mocks.audioInstances.at(-1);
      await act(async () => {
        confirmationAudio.onended();
        await new Promise((resolveWait) => setTimeout(resolveWait, 150));
      });
      const yesRecognition = mocks.recognitionInstances.at(-1);
      await act(async () => {
        yesRecognition.onresult({ results: [[{ transcript: 'yes', confidence: 0.2 }]] });
        await new Promise((resolveWait) => setTimeout(resolveWait, 30));
      });
      expect(host.querySelectorAll('input[type="radio"]')[1].checked).toBe(true);
      expect(callTTS.mock.calls.at(-1)[0]).toContain('Confirmed. Selected B');

      const selectedAudio = mocks.audioInstances.at(-1);
      await act(async () => {
        selectedAudio.onended();
        await new Promise((resolveWait) => setTimeout(resolveWait, 150));
      });
      const readRecognition = mocks.recognitionInstances.at(-1);
      await act(async () => {
        readRecognition.onresult({ results: [[{ transcript: 'read choices', confidence: 0.2 }]] });
        await new Promise((resolveWait) => setTimeout(resolveWait, 30));
      });
      expect(callTTS.mock.calls.at(-1)[0]).toContain('Answer choices.');

      const choicesAudio = mocks.audioInstances.at(-1);
      await act(async () => {
        choicesAudio.onended();
        await new Promise((resolveWait) => setTimeout(resolveWait, 150));
      });
      const unavailableConfidenceRecognition = mocks.recognitionInstances.at(-1);
      await act(async () => {
        unavailableConfidenceRecognition.onresult({ results: [[{ transcript: '3', confidence: 0 }]] });
        await new Promise((resolveWait) => setTimeout(resolveWait, 30));
      });
      expect(host.querySelectorAll('input[type="radio"]')[2].checked).toBe(true);
    } finally {
      mocks.restoreRecognition();
      mocks.restoreAudio();
    }
  });

  it('persists Quick Prompts and accepts a bare number without repeated command coaching', async () => {
    const mocks = installVoiceMocks();
    const callTTS = vi.fn(async (text) => 'blob:' + text.slice(0, 28));
    try {
      await mount({ callTTS });
      await clickButton('Open practice pack');
      await clickButton('Quick prompts');
      expect(localStorage.getItem('alloflow_test_prep_hands_free_prompt_mode_v1')).toBe('quick');
      await clickButton('Hands-free mode');
      await waitFor(() => mocks.audioInstances.length >= 1, 'quick initial narration');
      const initialPlayback = callTTS.mock.calls.find((call) => call[3] && call[3].reason === 'test-prep-playback');
      expect(initialPlayback[0]).toContain('Answer choices.');
      expect(initialPlayback[0]).not.toContain('Say A');

      await act(async () => {
        mocks.audioInstances[0].onended();
        await new Promise((resolveWait) => setTimeout(resolveWait, 150));
      });
      await waitFor(() => mocks.recognitionInstances.length >= 1, 'quick recognition session');
      await act(async () => {
        mocks.recognitionInstances[0].onresult({ results: [[{ transcript: '2', confidence: 0.9 }]] });
        await new Promise((resolveWait) => setTimeout(resolveWait, 30));
      });
      expect(host.querySelectorAll('input[type="radio"]')[1].checked).toBe(true);
      expect(callTTS.mock.calls.at(-1)[0]).toBe('Selected B.');
    } finally {
      mocks.restoreRecognition();
      mocks.restoreAudio();
    }
  });
  it('stops safely and clears speculative audio after microphone permission denial', async () => {
    const mocks = installVoiceMocks();
    const callTTS = vi.fn(async (text) => 'blob:' + text.slice(0, 28));
    try {
      await startHandsFree(callTTS, mocks);
      const prewarmSignals = callTTS.mock.calls
        .filter((call) => call[3] && call[3].reason === 'test-prep-prewarm')
        .map((call) => call[3].signal)
        .filter(Boolean);
      expect(prewarmSignals).toHaveLength(3);
      await act(async () => {
        mocks.recognitionInstances[0].onerror({ error: 'not-allowed' });
      });
      expect(host.textContent).toContain('Microphone permission is required for hands-free commands.');
      expect(findButton('Hands-free mode')).toBeTruthy();
      expect(prewarmSignals.every((signal) => signal.aborted)).toBe(true);
    } finally {
      mocks.restoreRecognition();
      mocks.restoreAudio();
    }
  });

  it('retries two recoverable recognition failures and shuts down on the third', async () => {
    const mocks = installVoiceMocks();
    const callTTS = vi.fn(async (text) => 'blob:' + text.slice(0, 28));
    try {
      await startHandsFree(callTTS, mocks);
      await act(async () => {
        mocks.recognitionInstances[0].onerror({ error: 'network' });
        mocks.recognitionInstances[0].onend();
      });
      await waitFor(() => mocks.recognitionInstances.length >= 2, 'first automatic recognition retry', 2_000);
      expect(host.textContent).toContain('Retry 1 of 2');

      await act(async () => {
        mocks.recognitionInstances[1].onerror({ error: 'network' });
        mocks.recognitionInstances[1].onend();
      });
      await waitFor(() => mocks.recognitionInstances.length >= 3, 'second automatic recognition retry', 2_500);
      expect(host.textContent).toContain('Retry 2 of 2');

      await act(async () => {
        mocks.recognitionInstances[2].onerror({ error: 'network' });
        mocks.recognitionInstances[2].onend();
      });
      expect(host.textContent).toContain('Hands-free mode stopped after repeated microphone errors.');
      expect(findButton('Hands-free mode')).toBeTruthy();
      await act(async () => { await new Promise((resolveWait) => setTimeout(resolveWait, 1_100)); });
      expect(mocks.recognitionInstances).toHaveLength(3);
    } finally {
      mocks.restoreRecognition();
      mocks.restoreAudio();
    }
  }, 12_000);

  it('manual disable aborts recognition and all cached prewarm requests', async () => {
    const mocks = installVoiceMocks();
    const callTTS = vi.fn(async (text) => 'blob:' + text.slice(0, 28));
    try {
      await startHandsFree(callTTS, mocks);
      const prewarmSignals = callTTS.mock.calls
        .filter((call) => call[3] && call[3].reason === 'test-prep-prewarm')
        .map((call) => call[3].signal)
        .filter(Boolean);
      await clickButton('Stop hands-free');
      expect(mocks.recognitionInstances[0].abort).toHaveBeenCalledTimes(1);
      expect(prewarmSignals.every((signal) => signal.aborted)).toBe(true);
    } finally {
      mocks.restoreRecognition();
      mocks.restoreAudio();
    }
  });

  it('unmount stops active narration and aborts foreground plus speculative audio requests', async () => {
    const mocks = installVoiceMocks();
    const callTTS = vi.fn(async (text) => 'blob:' + text.slice(0, 28));
    try {
      await mount({ callTTS });
      await clickButton('Open practice pack');
      await clickButton('Hands-free mode');
      await waitFor(() => mocks.audioInstances.length >= 1 && callTTS.mock.calls.length >= 4, 'active narration and prewarm');
      const signals = callTTS.mock.calls.map((call) => call[3] && call[3].signal).filter(Boolean);
      await act(async () => { root.unmount(); });
      root = null;
      expect(mocks.audioInstances[0].pause).toHaveBeenCalledTimes(1);
      expect(signals.every((signal) => signal.aborted)).toBe(true);
    } finally {
      mocks.restoreRecognition();
      mocks.restoreAudio();
    }
  });
});
