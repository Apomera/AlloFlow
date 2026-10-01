import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';

const require = createRequire(import.meta.url);
const ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
let SymbolStudio;
let root;
let host;
let audios;
let browserSpeech;
const audioOne = 'data:audio/wav;base64,UklGRgAAAAE=';
const audioTwo = 'data:audio/wav;base64,UklGRgAAAAI=';

beforeAll(() => {
  SymbolStudio = setupSymbolStudio().SymbolStudio;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  audios = [];
  vi.stubGlobal('Audio', class {
    constructor(src) { this.src = src; this.play = vi.fn(async () => undefined); this.pause = vi.fn(); audios.push(this); }
  });
  browserSpeech = { cancel: vi.fn(), speak: vi.fn(), getVoices: vi.fn(() => []) };
  vi.stubGlobal('speechSynthesis', browserSpeech);
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text; } });
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Capture unavailable in playback test'); }));
  window.alloDeviceStorage = {
    ready: vi.fn(async () => true), get: vi.fn(async () => null),
    set: vi.fn(async () => true), remove: vi.fn(async () => true),
  };
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove(); host = null;
  localStorage.clear();
  delete window.alloDeviceStorage;
  vi.unstubAllGlobals();
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
async function settle(action = () => {}) {
  await act(async () => { action(); for (let i = 0; i < 35; i++) await Promise.resolve(); });
}
function control(label) {
  const result = host.querySelector('[aria-label="' + label + '"]');
  expect(result, label).toBeTruthy(); return result;
}
async function mount({ recorded = false, composeOnly = false, onCallTTS = async () => null } = {}) {
  localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'speech-profile', name: 'Learner', codename: 'Sky Fox' }]));
  localStorage.setItem('alloActiveProfileId', JSON.stringify('speech-profile'));
  localStorage.setItem('alloAACTapBehavior', JSON.stringify(composeOnly ? 'compose-only' : 'speak-compose'));
  localStorage.setItem('alloSymbolBoards__speech-profile', JSON.stringify([{
    id: 'speech-board', title: 'Speech choices', cols: 2,
    words: [
      { id: 'one', label: 'One', category: 'noun', image: null, ...(recorded ? { audioData: audioOne } : {}) },
      { id: 'two', label: 'Two', category: 'noun', image: null, ...(recorded ? { audioData: audioTwo } : {}) },
    ],
  }]));
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  await settle(() => root.render(React.createElement(SymbolStudio, baseProps({ initialTab: 'board', onCallTTS }))));
  await settle(() => control('Toggle saved boards gallery').click());
  await settle(() => control('Use board in AAC mode').click());
}
function tap(index) { host.querySelectorAll('[role="gridcell"]')[index].click(); }

describe('Symbol Studio AAC playback ownership', () => {
  it('stops the previous recording when another cell is selected and when AAC exits', async () => {
    await mount({ recorded: true });
    await settle(() => tap(0));
    expect(audios).toHaveLength(1);
    await settle(() => tap(1));
    expect(audios).toHaveLength(2);
    expect(audios[0].pause).toHaveBeenCalled();
    expect(audios[1].play).toHaveBeenCalledTimes(1);
    await settle(() => control('Exit AAC mode').click());
    expect(audios[1].pause).toHaveBeenCalled();
  });

  it('plays the latest tap when synthesis responses arrive in reverse order', async () => {
    const first = deferred(); const second = deferred();
    const onCallTTS = vi.fn((text) => text === 'One' ? first.promise : second.promise);
    await mount({ onCallTTS });
    await settle(() => tap(0));
    await settle(() => tap(1));
    expect(onCallTTS).toHaveBeenCalledTimes(2);
    await settle(() => second.resolve(audioTwo));
    await settle(() => first.resolve(audioOne));
    expect(audios.map((audio) => audio.src)).toEqual([audioTwo]);
    expect(browserSpeech.speak).not.toHaveBeenCalled();
  });

  it('ignores synthesis that completes after the user exits AAC', async () => {
    const pending = deferred();
    await mount({ onCallTTS: () => pending.promise });
    await settle(() => tap(0));
    await settle(() => control('Exit AAC mode').click());
    await settle(() => pending.resolve(audioOne));
    expect(audios).toHaveLength(0);
    expect(browserSpeech.speak).not.toHaveBeenCalled();
  });

  it('ignores a support-board phrase that resolves after Symbol Studio closes', async () => {
    const pending = deferred(); const onCallTTS = vi.fn(() => pending.promise);
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await settle(() => root.render(React.createElement(SymbolStudio, baseProps({ initialTab: 'quickboards', onCallTTS }))));
    await settle(() => control('Choice Board Quick Board mode').click());
    const option = control('Choice board option 1');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(option, 'A quiet break');
      option.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await settle(() => control('Choice board option 1').parentElement.parentElement.click());
    expect(onCallTTS).toHaveBeenCalledTimes(1);
    expect(onCallTTS.mock.calls[0][0]).toBe('A quiet break');
    await settle(() => root.render(React.createElement(SymbolStudio, baseProps({ initialTab: 'quickboards', onCallTTS, isOpen: false }))));
    await settle(() => pending.resolve(audioOne));
    expect(audios).toHaveLength(0);
    expect(browserSpeech.speak).not.toHaveBeenCalled();
  });

  it('falls back once on a recording error and cancels owned browser speech on unmount', async () => {
    await mount({ recorded: true });
    await settle(() => tap(0));
    expect(typeof audios[0].onerror).toBe('function');
    const fail = audios[0].onerror;
    await settle(() => { fail(); fail(); });
    expect(browserSpeech.speak).toHaveBeenCalledTimes(1);
    const callsBeforeUnmount = browserSpeech.cancel.mock.calls.length;
    act(() => root.unmount()); root = null;
    expect(browserSpeech.cancel.mock.calls.length).toBeGreaterThan(callsBeforeUnmount);
  });

  it('keeps Speak busy until browser fallback finishes the composed phrase', async () => {
    await mount({ composeOnly: true });
    await settle(() => tap(0));
    const speak = control('Speak constructed sentence');
    await settle(() => speak.click());
    expect(browserSpeech.speak).toHaveBeenCalledTimes(1);
    expect(speak.disabled).toBe(true);
    const utterance = browserSpeech.speak.mock.calls[0][0];
    await settle(() => utterance.onend());
    expect(speak.disabled).toBe(false);
  });
});
