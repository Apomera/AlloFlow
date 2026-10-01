import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, Lingua, root, host, previousVoice;

const lesson = {
  title: 'At school',
  goal: 'Ask for help.',
  scenario: 'You need help during class.',
  vocabulary: [{ term: 'ayuda', meaning: 'help', example: 'Necesito ayuda.', translation: 'I need help.' }],
  phrases: [{ target: 'Necesito ayuda.', pronunciation: 'neh-seh-SEE-toh ah-YOO-dah', translation: 'I need help.' }],
  conversation: [{ coach: '\u00bfQu\u00e9 necesitas?', translation: 'What do you need?', sample: 'Necesito ayuda.' }],
};

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('lingua_practice_module.js');
  Lingua = window.AlloModules.LinguaPractice;
});

beforeEach(() => {
  previousVoice = window.AlloFlowVoice;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  if (previousVoice === undefined) delete window.AlloFlowVoice;
  else window.AlloFlowVoice = previousVoice;
});

function installSpeechCapture() {
  const sessions = [];
  window.AlloFlowVoice = {
    initWebSpeechCapture(options) {
      const session = { options, active: false };
      session.controller = {
        supported: true,
        start() { session.active = true; return true; },
        stop() { session.active = false; },
        isActive() { return session.active; },
      };
      sessions.push(session);
      return session.controller;
    },
  };
  return sessions;
}

function findButton(label) {
  return Array.from(host.querySelectorAll('button')).find((node) => node.textContent.includes(label));
}

async function click(label) {
  const target = findButton(label);
  expect(target, `Missing button: ${label}`).toBeTruthy();
  await act(async () => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
  return target;
}

async function mountSpeakingPractice() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Lingua, {
      isOpen: true,
      onClose: () => {},
      callGemini: async () => JSON.stringify(lesson),
    }));
  });
  await click('Build practice set');
  await click('Practice speaking');
}

function readProgress() {
  return JSON.parse(localStorage.getItem('allo_lingua_progress_v1') || '{}');
}

async function finish(session, transcript, confidence = 0.52) {
  session.active = false;
  await act(async () => {
    session.options.onTranscript(transcript, true, {
      engine: 'web-speech',
      locale: 'es-ES',
      confidence,
      privateAudioHandle: 'PRIVATE AUDIO HANDLE',
    });
    await Promise.resolve();
  });
}

describe('Lingua verified transcript-attempt render lifecycle', () => {
  it('stages final evidence until Keep, discards cleanly, and commits duplicate Keep only once', async () => {
    const sessions = installSpeechCapture();
    await mountSpeakingPractice();

    await click('\u25cf Speak');
    expect(sessions).toHaveLength(1);
    const firstPrivateTranscript = 'PRIVATE FIRST RECOGNIZER TRANSCRIPT';
    await finish(sessions[0], firstPrivateTranscript, 0.31);

    let progress = readProgress();
    expect(progress.spokenAttempts || 0).toBe(0);
    expect(progress.languageStats?.Spanish?.spokenAttempts || 0).toBe(0);
    expect(progress.pronunciationEvidence || []).toHaveLength(0);
    expect(JSON.stringify(progress)).not.toContain(firstPrivateTranscript);
    expect(findButton('Keep this attempt')).toBeTruthy();
    expect(findButton('Discard and try again')).toBeTruthy();

    await click('Discard and try again');
    progress = readProgress();
    expect(progress.spokenAttempts || 0).toBe(0);
    expect(progress.pronunciationEvidence || []).toHaveLength(0);
    expect(host.querySelector('#lingua-speak-response').value).toBe('');
    expect(findButton('Keep this attempt')).toBeFalsy();

    await click('\u25cf Speak');
    expect(sessions).toHaveLength(2);
    const secondPrivateTranscript = 'PRIVATE SECOND RECOGNIZER TRANSCRIPT';
    await finish(sessions[1], secondPrivateTranscript, 0.64);
    progress = readProgress();
    expect(progress.spokenAttempts || 0).toBe(0);
    expect(progress.pronunciationEvidence || []).toHaveLength(0);

    const keep = findButton('Keep this attempt');
    expect(keep).toBeTruthy();
    await act(async () => {
      keep.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      keep.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    progress = readProgress();
    expect(progress.spokenAttempts).toBe(1);
    expect(progress.languageStats.Spanish.spokenAttempts).toBe(1);
    expect(progress.activityLog.filter((item) => item.kind === 'spokenAttempts')).toHaveLength(1);
    expect(progress.pronunciationEvidence).toHaveLength(1);
    const serialized = JSON.stringify(progress);
    expect(serialized).not.toContain(firstPrivateTranscript);
    expect(serialized).not.toContain(secondPrivateTranscript);
    expect(serialized).not.toContain('PRIVATE AUDIO HANDLE');
    expect(serialized).not.toContain('rawTranscript');
    expect(serialized).not.toContain('recognizer');
  });

  it('ignores a finalized prior attempt\u2019s late end and error callbacks while a new attempt owns the mic', async () => {
    const sessions = installSpeechCapture();
    await mountSpeakingPractice();

    await click('\u25cf Speak');
    await finish(sessions[0], 'Necesito ayuda.', 0.75);
    await click('Discard and try again');
    await click('\u25cf Speak');
    expect(sessions).toHaveLength(2);
    expect(sessions[1].active).toBe(true);

    await act(async () => {
      sessions[0].options.onEnd();
      sessions[0].options.onError({ error: 'no-speech' });
      await Promise.resolve();
    });

    const activeSpeakButton = findButton('\u25a0 Stop');
    expect(activeSpeakButton).toBeTruthy();
    expect(activeSpeakButton.getAttribute('aria-pressed')).toBe('true');
    expect(sessions[1].active).toBe(true);
    expect(host.textContent).not.toContain('The recognizer did not detect speech');
    expect(readProgress().spokenAttempts || 0).toBe(0);
    expect(readProgress().pronunciationEvidence || []).toHaveLength(0);
  });
});
