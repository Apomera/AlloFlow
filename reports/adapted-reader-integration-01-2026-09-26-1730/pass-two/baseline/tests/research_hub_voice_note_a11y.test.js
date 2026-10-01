import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import fs from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = fs.readFileSync('research_hub_source.jsx', 'utf8');

let React;
let ReactDOMClient;
let act;
let VoiceNoteBlock;
let originalMediaRecorder;
let originalMediaDevices;
let lastRecorder;

class FakeMediaRecorder {
  constructor() {
    this.state = 'inactive';
    this.mimeType = 'audio/webm';
    lastRecorder = this;
  }

  start() { this.state = 'recording'; }
  pause() { this.state = 'paused'; }
  resume() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; }
}

function mountVoiceNote(props = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => {
    root.render(React.createElement(VoiceNoteBlock, {
      t: () => '',
      label: 'Research reflection',
      onChange: vi.fn(),
      ...props,
    }));
  });
  return {
    host,
    button(label) {
      return Array.from(host.querySelectorAll('button')).find((button) => (button.textContent || '').trim() === label);
    },
    cleanup() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;

  originalMediaRecorder = global.MediaRecorder;
  originalMediaDevices = navigator.mediaDevices;
  global.MediaRecorder = window.MediaRecorder = FakeMediaRecorder;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] })) },
  });

  loadAlloModule('research_hub_module.js');
  VoiceNoteBlock = window.ResearchHub && window.ResearchHub.primitives && window.ResearchHub.primitives.VoiceNoteBlock;
  if (!VoiceNoteBlock) throw new Error('Research Hub VoiceNoteBlock did not load');
});

afterAll(() => {
  global.MediaRecorder = window.MediaRecorder = originalMediaRecorder;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: originalMediaDevices });
});

describe('Research Hub voice-note timing accessibility', () => {
  it('pauses and resumes recording with exposed toggle state', async () => {
    const view = mountVoiceNote();
    await act(async () => {
      view.button('Record').click();
      await Promise.resolve();
    });

    const pause = view.button('Pause');
    expect(pause).toBeTruthy();
    expect(pause.getAttribute('aria-pressed')).toBe('false');
    expect(view.host.querySelector('[role="timer"]').textContent).toContain('Recording');

    act(() => pause.click());
    expect(lastRecorder.state).toBe('paused');
    const resume = view.button('Resume');
    expect(resume.getAttribute('aria-pressed')).toBe('true');
    expect(view.host.querySelector('[role="timer"]').textContent).toContain('Paused');

    act(() => resume.click());
    expect(lastRecorder.state).toBe('recording');
    expect(view.button('Pause').getAttribute('aria-pressed')).toBe('false');
    view.cleanup();
  });

  it('gives saved audio playback an accessible name', () => {
    const view = mountVoiceNote({ initialBase64: 'data:audio/webm;base64,AA==', initialDuration: 4 });
    expect(view.host.querySelector('audio').getAttribute('aria-label')).toBe('Research reflection playback');
    view.cleanup();
  });

  it('excludes paused wall-clock time from the active limit and saved duration', () => {
    expect(source).toContain('var getActiveElapsedSeconds = function (now)');
    expect(source).toContain('pausedTotalRef.current += Math.max(0, Date.now() - pauseStartedRef.current)');
    expect(source).toContain('Math.min(VOICE_NOTE_MAX_SECONDS, getActiveElapsedSeconds(Date.now()))');
    expect(source).toContain('<p role="alert"');
  });
});
