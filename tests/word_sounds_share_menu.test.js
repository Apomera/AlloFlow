// Word Sounds "Print & share" (2026-11-07): one menu for Print materials, the take-home file and Word Practice.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadModal, mount, unmountAll, click, settle, key, makeHatItem, fullscreenGrants } from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';

const teacher = (extra = {}) => mount({ isTeacherMode: true, allowRuntimeAi: true, words: [makePackItem(), makeHatItem()], ...extra });
const menuButton = (host) => host.querySelector('[data-ws-share-open]');
const menu = (host) => host.querySelector('#ws-share-menu');
const items = (host) => [...menu(host).querySelectorAll('[role="menuitem"]')];

beforeAll(() => { loadModal(); fullscreenGrants(); });
afterEach(() => { unmountAll(); delete window.__alloOpenWordPractice; });

describe('Print & share', () => {
  it('is one menu button for teachers, and never shown to students or probes', async () => {
    const { host } = await teacher();
    const button = menuButton(host);
    expect(button.textContent).toContain('Print & share');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(menu(host).hidden).toBe(true);
    expect(host.querySelector('[data-ws-present-open]'), 'Present to class stays its own button').toBeTruthy();
    expect(host.querySelector('#word-sounds-di-script-open'), 'Lesson script stays its own button').toBeTruthy();
    unmountAll();
    expect(menuButton((await mount({ words: [makePackItem()] })).host), 'student').toBeNull();
    expect(menuButton((await mount({ isTeacherMode: true, isProbeMode: true, words: [makePackItem()] })).host), 'probe').toBeNull();
  });

  it('opens with focus on the first item, moves with arrows, and Escape closes back to the button', async () => {
    const { host } = await teacher();
    await click(menuButton(host));
    expect(menuButton(host).getAttribute('aria-expanded')).toBe('true');
    expect(menu(host).hidden).toBe(false);
    const list = items(host);
    expect(list.map((b) => b.querySelector('.font-bold').textContent)).toEqual(['Print materials', 'Take-home file', 'Present offline']);
    expect(document.activeElement).toBe(list[0]);
    await key(document.activeElement, 'ArrowDown');
    expect(document.activeElement).toBe(list[1]);
    await key(document.activeElement, 'ArrowDown');
    expect(document.activeElement).toBe(list[2]);
    await key(document.activeElement, 'ArrowDown');
    expect(document.activeElement, 'wraps around').toBe(list[0]);
    await key(document.activeElement, 'End');
    expect(document.activeElement).toBe(list[2]);
    await key(document.activeElement, 'Escape');
    expect(menu(host).hidden).toBe(true);
    expect(document.activeElement).toBe(menuButton(host));
    expect(host.querySelector('.word-sounds-root'), 'Escape closed only the menu').toBeTruthy();
  });

  it('each item opens its dialog and closes the menu', async () => {
    const { host } = await teacher();
    await click(menuButton(host));
    await click(host.querySelector('[data-ws-take-home-open]'));
    await settle(20);
    expect(menu(host).hidden).toBe(true);
    expect(host.querySelector('[data-ws-take-home-dialog]')).toBeTruthy();
  });

  it('Word Practice opens with the lesson words and the clips already made for its language', async () => {
    window.__alloOpenWordPractice = vi.fn(async () => null);
    const { host } = await teacher();
    await click(menuButton(host));
    const item = host.querySelector('[data-ws-word-practice-open]');
    expect(item).toBeTruthy();
    await click(item);
    await settle(10);
    expect(window.__alloOpenWordPractice).toHaveBeenCalledTimes(1);
    const options = window.__alloOpenWordPractice.mock.calls[0][0];
    expect(options.words.map((w) => w.word)).toEqual(['cat', 'hat']);
    expect(options.words.some((w) => '_ttsAssets' in w), 'clips travel once, not per word').toBe(false);
    expect(Object.keys(options.ttsAssets)).toContain('cat');
    expect(options.source).toBe('word-sounds');
  });
});

describe('Word Practice clips come back to the lesson', () => {
  it('merges the word clips Word Practice prepared, only for words the lesson needs', async () => {
    window.__alloOpenWordPractice = vi.fn(async () => null);
    const setWsPreloadedWords = vi.fn();
    const hat = makeHatItem();
    const { host } = await teacher({ setWsPreloadedWords, words: [makePackItem(), hat] });
    await click(menuButton(host));
    await click(host.querySelector('[data-ws-word-practice-open]'));
    await settle(10);
    const { onSaveAudio } = window.__alloOpenWordPractice.mock.calls[0][0];
    expect(typeof onSaveAudio).toBe('function');
    const mp3 = 'data:audio/mpeg;base64,' + Buffer.from('ID3\x03\x00' + 'h'.repeat(19), 'binary').toString('base64');
    onSaveAudio({ hat: mp3, 'not in this lesson': mp3, cat: 'data:text/plain;base64,AAAA' });
    expect(setWsPreloadedWords).toHaveBeenCalledTimes(1);
    const update = setWsPreloadedWords.mock.calls[0][0];
    const prev = [{ ...makePackItem(), _ttsRequiredKeys: ['cat', 'hat'] }, hat];
    const next = update(prev);
    expect(next[0]._ttsAssets.hat.base64).toBe(mp3.split(',')[1]);
    expect(next[0]._ttsAssets.hat.provenance).toMatchObject({ source: 'synthesized' });
    expect(next[0]._ttsAssets['not in this lesson'], 'a word the lesson does not need is ignored').toBeUndefined();
  });

  it('Word Practice calls back after preparing audio', () => {
    const ui = readFileSync('word_practice_ui.js', 'utf8');
    expect(ui).toContain("if (typeof context.onSaveAudio === 'function') {");
    expect(ui).toContain("pack.items.forEach(item => { if (item && item.word && core.safeAudio(item.wordAudio)) clips[item.word] = item.wordAudio; });");
    expect(readFileSync('word_practice_module.js', 'utf8')).toContain('context.onSaveAudio(clips)');
  });
});
