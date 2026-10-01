import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let FaqView;
let root;
let host;

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = window.AlloIcons || {};
  window.AlloIcons.RefreshCw = (props) => React.createElement('svg', props);
  loadAlloModule('view_faq_module.js');
  FaqView = window.AlloModules.FaqView;
  if (!FaqView) throw new Error('FaqView did not register');
});

afterEach(() => {
  if (root) {
    try { act(() => root.unmount()); } catch (_) {}
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  vi.restoreAllMocks();
  if (window.AlloModules) {
    delete window.AlloModules.KaraokeAudioStore;
    delete window.AlloModules.PhaseKHelpers;
  }
});

const splitSentences = (text) =>
  String(text || '').match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) || [];

function baseProps(overrides = {}) {
  const noop = () => {};
  return {
    t: (key) => key,
    generatedContent: {
      id: 'faq-audio-parity',
      type: 'faq',
      data: [{
        question: '## Ready sentence.',
        answer: 'Stale sentence. Missing sentence.',
      }],
    },
    isPlaying: true,
    playingContentId: 'faq-active',
    isGeneratingAudio: false,
    voiceSpeed: 1,
    isTeacherMode: true,
    isEditingFaq: true,
    leveledTextLanguage: 'English',
    selectedVoice: 'Kore',
    effectiveLanguage: 'Spanish',
    playbackState: { currentIdx: -1 },
    audioRef: React.createRef(),
    playbackSessionRef: { current: null },
    setVoiceSpeed: noop,
    setIsPlaying: noop,
    setPlayingContentId: noop,
    handleToggleIsEditingFaq: noop,
    handleFaqChange: noop,
    handleSpeak: noop,
    getRows: () => 1,
    splitTextToSentences: splitSentences,
    formatInteractiveText: (text) => text,
    ...overrides,
  };
}

function mount(props) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const render = (nextProps) => {
    act(() => {
      root.render(React.createElement(FaqView, nextProps));
    });
  };
  render(props);
  return { render };
}

describe('FaqView read-aloud parity', () => {
  it('counts only compatible clips as ready and labels stale and missing clips', () => {
    const toSpokenText = vi.fn((sentence) =>
      String(sentence || '').replace(/^#{1,6}\s+/gm, '').trim());
    const getCompatible = vi.fn((sentence, options) =>
      sentence === 'Ready sentence.' &&
      options.voice === 'Kore' &&
      options.language === 'Spanish'
        ? 'blob:ready'
        : null);
    const stored = new Set(['Ready sentence.', 'Stale sentence.']);

    window.AlloModules.PhaseKHelpers = { toSpokenText };
    window.AlloModules.KaraokeAudioStore = {
      current: {
        has: (sentence) => stored.has(sentence),
        getCompatible,
      },
    };

    const props = baseProps();
    const view = mount(props);

    expect(toSpokenText).toHaveBeenCalledWith('## Ready sentence.');
    expect(getCompatible).toHaveBeenCalledWith('Ready sentence.', {
      voice: 'Kore',
      language: 'Spanish',
    });
    expect(host.textContent).toContain('TTS 1/1 ready');
    expect(host.textContent).toContain('TTS 0/2 ready; 1 stale');
    expect(host.querySelector('button[aria-label^="Ready TTS for FAQ sentence 1."]')).toBeTruthy();
    expect(host.querySelector('button[aria-label^="Stale TTS for FAQ sentence 1."]')).toBeTruthy();
    expect(host.querySelector('button[aria-label^="Missing TTS for FAQ sentence 2."]')).toBeTruthy();

    view.render({ ...props, selectedVoice: 'Puck' });
    expect(host.textContent).toContain('TTS 0/1 ready; 1 stale');
  });

  it('shows an accessible playback-loading spinner independently of Save TTS progress', () => {
    window.AlloModules.PhaseKHelpers = {
      toSpokenText: (sentence) => String(sentence || '').replace(/^#{1,6}\s+/gm, '').trim(),
    };
    window.AlloModules.KaraokeAudioStore = {
      current: {
        has: () => false,
        getCompatible: () => null,
      },
    };

    const props = baseProps({ isGeneratingAudio: true, isEditingFaq: false });
    const view = mount(props);
    const loadingStatus = Array.from(host.querySelectorAll('[role="status"]'))
      .find((node) => node.textContent.includes('Loading FAQ audio...'));

    expect(loadingStatus).toBeTruthy();
    expect(loadingStatus.getAttribute('aria-live')).toBe('polite');
    expect(loadingStatus.getAttribute('aria-atomic')).toBe('true');
    expect(loadingStatus.getAttribute('aria-busy')).toBe('true');
    const spinner = loadingStatus.querySelector('svg');
    expect(spinner).toBeTruthy();
    expect(spinner.getAttribute('aria-hidden')).toBe('true');
    expect(spinner.classList.contains('animate-spin')).toBe(true);
    expect(spinner.classList.contains('motion-reduce:animate-none')).toBe(true);
    expect(Array.from(host.querySelectorAll('button'))
      .some((button) => button.textContent.includes('Save TTS'))).toBe(true);

    view.render({ ...props, isGeneratingAudio: false });
    const readingStatus = Array.from(host.querySelectorAll('[role="status"]'))
      .find((node) => node.textContent.includes('Reading FAQ...'));
    expect(readingStatus).toBeTruthy();
    expect(readingStatus.getAttribute('aria-busy')).toBe('false');
    expect(host.textContent).not.toContain('Loading FAQ audio...');
  });
});
