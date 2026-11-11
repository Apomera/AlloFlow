// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// The review screen's one line about sounds prepared without AI: shown only
// when the lesson has an activity that uses sounds, and never for sounds a
// teacher set.
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let Panel, root, container;
beforeAll(() => {
  window.React = React;
  window.AlloModules ||= {};
  globalThis.Volume2 = () => null;
  delete window.AlloModules.MiscComponentsModule;
  new Function(readFileSync('misc_components_module.js', 'utf8'))();
  Panel = window.WordSoundsReviewPanel;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  container?.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
});

const item = (word, phonemes, extra = {}) => ({ word, targetWord: word, phonemes, ttsReady: true, phonemeSource: 'dictionary',
  activityItems: { blending: { options: [word, 'sun'], answer: word }, spelling_bee: { answer: word } }, ...extra });
const words = () => [
  item('cat', ['k', 'a', 't']),
  item('use', ['y', 'oo', 's'], { phonemeAlternates: [['y', 'oo', 'z']], _soundsGlance: ['alternate'] }),
  item('about', ['schwa', 'b', 'ow', 't'], { _soundsGlance: ['schwa'] }),
  item('blorf', ['b', 'l', 'or', 'f'], { phonemeSource: 'espeak', _soundsGlance: ['not_dictionary'] }),
];
async function mount(props = {}) {
  vi.useFakeTimers();
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Panel, { preloadedWords: words(), t: () => '', onClose: () => {}, onStartActivity: () => {}, ...props })));
  await act(async () => vi.advanceTimersByTime(0));
}
const gap = name => container.querySelector('[data-review-gap="' + name + '"]');

describe('sounds worth a glance on the review screen', () => {
  it('names the words and the reasons in one line with no button', async () => {
    await mount({ activitySequence: ['blending'] });
    const line = gap('sound_glance');
    expect(line.textContent).toBe('Sounds worth a quick look (said more than one way, has a schwa, not in the sound dictionary): 3. Words: use, about, blorf.');
    expect(line.querySelector('button')).toBeNull();
    // A plain dictionary word raises nothing, and the "estimated" warning is a different line.
    expect(line.textContent).not.toContain('cat');
    expect(gap('phonemes')).toBeNull();
  });

  it('is not shown when no activity in the lesson uses sounds', async () => {
    await mount({ activitySequence: ['spelling_bee'] });
    expect(gap('sound_glance')).toBeNull();
    await act(async () => root.render(React.createElement(Panel, { preloadedWords: words(), t: () => '', onClose: () => {}, onStartActivity: () => {}, activitySequence: ['spelling_bee', 'mapping'] })));
    expect(gap('sound_glance')).not.toBeNull();
  });

  it('leaves out sounds a teacher set and words already flagged as estimated', async () => {
    const list = words();
    list[1] = { ...list[1], phonemeSource: 'teacher' };
    list[3] = { ...list[3], _fallbackUsed: true, _soundsGlance: ['estimate'] };
    await mount({ preloadedWords: list, activitySequence: ['blending'] });
    expect(gap('sound_glance').textContent).toBe('Sounds worth a quick look (has a schwa): 1. Words: about.');
    expect(gap('phonemes').textContent).toContain('With sounds estimated from spelling: 1');
  });

  it('a teacher edit of the sounds marks them as the teacher\'s and clears the flags', () => {
    const source = readFileSync('misc_components_source.jsx', 'utf8');
    const helper = source.match(/const teacherSounds = [^\n]+/)[0];
    const teacherSounds = new Function(helper + '; return teacherSounds;')();
    expect(teacherSounds(words()[1], ['y', 'oo', 'z'])).toMatchObject({ word: 'use', phonemes: ['y', 'oo', 'z'], phonemeSource: 'teacher', _soundsGlance: undefined, phonemeAlternates: undefined });
    // Every sound edit in the panel goes through it.
    expect(source.match(/onUpdateWord\(wordIdx, \{ \.\.\.word, phonemes:/g)).toBeNull();
    expect(source.match(/onUpdateWord\(wordIdx, teacherSounds\(word, /g)).toHaveLength(3);
  });
});
