// Shared mount harness for the lane C present-mode tests (not a test file).
import { vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { setupWordSounds } from './word_sounds_harness.js';
import { studentProps, installCanvasStub, makePackItem } from './word_sounds_pack_fixture.js';

export const DIR = process.env.LANE_DIR || '.';
export const SOURCE_PATH = DIR + '/word_sounds_module.js';
export const DI_PATH = DIR + '/word_sounds_di_loader.js';
const REPO = process.cwd().replace(/\\/g, '/');
const english = JSON.parse(readFileSync(REPO + '/ui_strings.js', 'utf8')).word_sounds;
const require = createRequire(import.meta.url);
const modules = resolve(REPO, 'desktop/web-app/node_modules');

export let React, client, act, Modal;
export const mounted = [];
export const played = [];
let fullscreenElement = null;

export function loadModal() {
  React = require(resolve(modules, 'react'));
  client = require(resolve(modules, 'react-dom/client'));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  installCanvasStub();
  setupWordSounds();
  delete window.AlloModules.WordSoundsModal; // the module skips a duplicate load
  new Function(readFileSync(SOURCE_PATH, 'utf8'))();
  Modal = window.AlloModules.WordSoundsModal;
  if (typeof Modal !== 'function') throw Error('lane source did not register WordSoundsModal');
  // jsdom has no media playback or Fullscreen API.
  window.HTMLMediaElement.prototype.play = function play() {
    played.push(this.src);
    const element = this;
    setTimeout(() => element.dispatchEvent(new Event('ended')), 5);
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function pause() {};
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
  document.exitFullscreen = vi.fn(() => {
    fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  });
  return Modal;
}

export function fullscreenGrants() {
  window.HTMLElement.prototype.requestFullscreen = vi.fn(function requestFullscreen() {
    fullscreenElement = this;
    document.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  });
}
export function fullscreenRejects() {
  fullscreenElement = null;
  window.HTMLElement.prototype.requestFullscreen = vi.fn(() => Promise.reject(new Error('Permissions check failed')));
}
export const currentFullscreen = () => fullscreenElement;

// A second pack word so every activity has two items to move between.
export function makeHatItem() {
  const cat = makePackItem();
  return {
    ...cat, id: 2, term: 'hat', word: 'hat', targetWord: 'hat', displayWord: 'hat',
    phonemes: ['h', 'a', 't'], graphemes: ['h', 'a', 't'], syllables: ['hat'],
    rhymes: ['cat'], rhymeWord: 'cat', firstSound: 'h',
    _ttsAssets: undefined,
    activityItems: {
      ...cat.activityItems,
      isolation: { position: 2, correctSound: 't', options: ['t', 'h', 'a', 'm'] },
      rhyming: { options: ['cat', 'dog', 'sun', 'bed'], answer: 'cat' },
      blending: { options: ['hat', 'cot', 'cut', 'bat'], answer: 'hat' },
      decoding: { choices: ['hat', 'dog', 'sun', 'map'] },
    },
  };
}

export const SCORING = ['setWordSoundsScore', 'onScoreUpdate', 'setWordSoundsHistory', 'setWordSoundsStreak', 'setWordSoundsBadges',
  'setWordSoundsDailyProgress', 'setPhonemeMastery', 'setWordSoundsSessionProgress', 'setWordSoundsDifficulty',
  'setWordSoundsAccuracyHistory', 'setWordSoundsLevel', 'setWordSoundsConfusionPatterns'];
const OTHER_SPIES = ['setCurrentWordSoundsWord', 'setWordSoundsActivity', 'setWordSoundsFeedback', 'setWordSoundsPhonemes', 'onClose'];

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const settle = (ms = 30) => act(async () => { await wait(ms); });

export async function mount({ activity = 'rhyming', words, ...extra } = {}) {
  const calls = [];
  const props = { ...studentProps(activity, calls), ...extra };
  if (words) props.wsPreloadedWords = words;
  props.getWordSoundsString = (_t, key) => english[key.replace('word_sounds.', '')] || key;
  props.t = (key) => key;
  const spies = {};
  for (const name of [...SCORING, ...OTHER_SPIES]) props[name] = spies[name] = vi.fn();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = client.createRoot(host);
  mounted.push({ host, root });
  await act(async () => { root.render(React.createElement(Modal, props)); await wait(30); });
  return { host, root, props, spies, calls };
}

export function unmountAll() {
  for (const { host, root } of mounted.splice(0)) {
    try { act(() => root.unmount()); } catch (_) { /* already gone */ }
    host.remove();
  }
}

export const buttonNamed = (scope, name) => [...scope.querySelectorAll('button')].find((b) => b.textContent.trim() === name);
export const presentButton = (host) => host.querySelector('[data-ws-present-open]');
export const presenter = (host) => host.querySelector('[data-ws-presenter]');
export const key = (target, keyName, init = {}) => act(async () => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true, ...init }));
  await wait(5);
});
export const click = (element) => act(async () => { element.click(); await wait(5); });
export const resetSpies = (spies) => Object.values(spies).forEach((spy) => spy.mockClear());
