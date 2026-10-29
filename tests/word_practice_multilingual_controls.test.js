import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const lanes = [
  ['source', ['word_practice_core.js', 'word_practice_ui.js'].map(file => readFileSync(file, 'utf8')).join('\n')],
  ['runtime', readFileSync('word_practice_module.js', 'utf8')],
];
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const button = (scope, name) => [...scope.querySelectorAll('button')].find(node => node.textContent === name && !node.parentElement.closest('[hidden]'));
function load(source) {
  const win = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' }).window;
  windows.push(win); win.eval(source); return win;
}
function offline(win, pack, uiLanguage, beforeParse) {
  const html = win.AlloModules.WordPractice.buildHtml(pack, undefined, undefined, undefined, null, uiLanguage);
  const player = new JSDOM(html, { runScripts: 'dangerously', beforeParse }).window; windows.push(player); return player;
}

describe.each(lanes)('multilingual practice controls (%s)', (_, source) => {
  it.each([
    ['Arabic', 'English', 'cat', ['c', 'a', 't'], 'en', 'ltr'],
    ['English', 'Arabic', 'كتب', ['ك', 'ت', 'ب'], 'ar', 'rtl'],
    ['Arabic', 'ar-Latn', 'katab', ['ka', 'ta', 'b'], 'ar-Latn', 'ltr'],
  ])('uses the term direction for sound order in %s UI and %s content', async (uiLanguage, termLanguage, word, sounds, tag, dir) => {
    const win = load(source), pack = { words: [{ word, termLanguage, phonemes: sounds.map(label => ({ label })) }], options: { mode: 'blend', shuffle: false, repetitions: 1 } };
    win.AlloModules.WordPractice.open({ ...pack, currentUiLanguage: uiLanguage });
    const preview = win.document.querySelector('.awp-preview-sounds'); expect(preview.lang).toBe(tag); expect(preview.dir).toBe(dir);
    expect([...preview.children].map(node => node.textContent)).toEqual(sounds);
    button(win.document, 'Present').click(); await vi.waitFor(() => expect(win.document.querySelector('.awp-phonemes')).toBeTruthy());
    const live = win.document.querySelector('.awp-phonemes'); expect(live.lang).toBe(tag); expect(live.dir).toBe(dir);
    const downloaded = offline(win, pack, uiLanguage).document.querySelector('.awp-phonemes'); expect(downloaded.lang).toBe(tag); expect(downloaded.dir).toBe(dir);
  });

  it('localizes translation labels separately from their contents in preview, presenter and offline announcements', async () => {
    const win = load(source), names = ['ar-Latn', 'zh-Hant', 'A classroom language'];
    const pack = { language: 'English', words: [{ word: 'leaf', translations: names.map((language, index) => ({ language, text: ['waraqa', '葉', 'local word'][index] })) }], options: { mode: 'vocabulary', repetitions: 1, shuffle: false } };
    win.AlloModules.WordPractice.open({ ...pack, currentUiLanguage: 'French' });
    button(win.document.querySelector('.awp-appearance'), 'Show meaning').click();
    const expected = [new Intl.DisplayNames(['fr'], { type: 'language', languageDisplay: 'standard' }).of('ar-Latn'), new Intl.DisplayNames(['fr'], { type: 'language', languageDisplay: 'standard' }).of('zh-Hant'), 'A classroom language'];
    const check = (scope, selector) => {
      const labels = [...scope.querySelectorAll(selector)];
      expect(labels.map(node => node.textContent)).toEqual(expected.map(text => text + ': '));
      expect(labels.map(node => [node.lang, node.dir])).toEqual([['fr', 'ltr'], ['fr', 'ltr'], ['und', 'auto']]);
    };
    check(win.document, '.awp-preview-language-name');
    button(win.document, 'Present').click(); await vi.waitFor(() => expect(win.document.querySelector('.awp-player')).toBeTruthy());
    button(win.document, 'Show meaning').click();
    check(win.document.querySelector('.awp-card'), '.awp-language-name'); check(win.document.querySelector('.awp-sr'), '.awp-language-name');
    const doc = offline(win, pack, 'French').document; button(doc, 'Show meaning').click(); check(doc.querySelector('.awp-card'), '.awp-language-name'); check(doc.querySelector('.awp-sr'), '.awp-language-name');
    expect([...doc.querySelectorAll('.awp-card .awp-translation')].map(node => [node.lang, node.textContent])).toEqual([['ar-Latn', 'waraqa'], ['zh-Hant', '葉'], ['und', 'local word']]);
    expect(pack.words[0].translations.map(item => item.language)).toEqual(names);
  });

  it('retains readable original language labels when offline display names are unavailable', () => {
    const win = load(source), doc = offline(win, { words: [{ word: 'leaf', translations: [{ language: 'zh-Hant', text: '葉' }] }], options: { mode: 'vocabulary' } }, 'French', win => { win.Intl.DisplayNames = undefined; }).document;
    button(doc, 'Show meaning').click();
    expect(doc.querySelector('.awp-language-name').textContent).toBe('zh-Hant: '); expect(doc.querySelector('.awp-language-name').lang).toBe('und'); expect(doc.querySelector('.awp-language-name').dir).toBe('auto');
  });

  it.each(['presenter', 'offline'])('keeps %s toolbar focus through reveal and navigation boundaries', async surface => {
    const win = load(source), pack = { words: ['leaf', 'root', 'stem'], options: { mode: 'vocabulary', repetitions: 1, shuffle: false } };
    let doc;
    if (surface === 'offline') doc = offline(win, pack, 'English').document;
    else { win.AlloModules.WordPractice.open(pack); button(win.document, 'Present').click(); await vi.waitFor(() => expect(win.document.querySelector('.awp-player')).toBeTruthy()); doc = win.document; }
    const next = button(doc, 'Next'), previous = button(doc, 'Previous'), stage = doc.querySelector('.awp-stage');
    next.focus(); next.click(); expect(doc.activeElement).toBe(next);
    next.click(); expect(next.disabled).toBe(true); expect(doc.activeElement).toBe(stage);
    previous.focus(); previous.click(); expect(doc.activeElement).toBe(previous);
    previous.click(); expect(previous.disabled).toBe(true); expect(doc.activeElement).toBe(stage);
    const reveal = button(doc, 'Show meaning'); reveal.focus(); reveal.click(); expect(reveal.disabled).toBe(true); expect(doc.activeElement).toBe(stage);
  });
});
