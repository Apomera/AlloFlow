import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const sources = [
  ['source', ['word_practice_core.js', 'word_practice_ui.js'].map(file => readFileSync(file, 'utf8')).join('\n')],
  ['runtime', readFileSync('word_practice_module.js', 'utf8')],
];
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const button = (scope, name) => [...scope.querySelectorAll('button')].find(node => node.textContent === name && !node.parentElement.closest('[hidden]'));
const field = (scope, name) => [...scope.querySelectorAll('label')].find(node => node.querySelector('span')?.textContent === name)?.querySelector('select');
function load(source) { const win = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' }).window; windows.push(win); win.eval(source); return win; }
function change(win, node, value) { node.value = value; node.dispatchEvent(new win.Event('change', { bubbles: true })); }
const translations = [{ language: 'Arabic', text: 'تحتاج الأشجار إلى الماء.\nوتحتاج إلى ضوء الشمس.' }, { language: 'Japanese', text: '木は水を必要とします。\n日光も必要です。' }];

describe.each(sources)('translation layout and card instruction sizes (%s)', (_, source) => {
  it('groups every complete passage below its smaller language caption in preview, live and offline cards', async () => {
    const win = load(source), pack = { words: [{ word: 'tree', translations }], options: { mode: 'vocabulary', repetitions: 1, shuffle: false, cardTextScale: 1.4, cardTheme: 'cream' } };
    win.AlloModules.WordPractice.open(pack);
    const check = (view, parent, captionSelector, passageSelector) => {
      const captions = [...parent.querySelectorAll(captionSelector)], passages = [...parent.querySelectorAll(passageSelector)];
      expect(passages.map(node => node.textContent)).toEqual(translations.map(item => item.text));
      expect(passages.map(node => node.dir)).toEqual(['rtl', 'ltr']);
      captions.forEach((caption, index) => { expect(caption.nextElementSibling).toBe(passages[index]); expect(view.getComputedStyle(caption).display).toBe('block'); expect(parseFloat(caption.style.fontSize)).toBeCloseTo(1.225); });
      passages.forEach(node => { expect(view.getComputedStyle(node).display).toBe('block'); expect(view.getComputedStyle(node).textAlign).toBe('start'); });
    };
    const setup = win.document.querySelector('.awp-appearance'); button(setup, 'Show meaning').click(); check(win, setup, '.awp-preview-language-name', '.awp-preview-translation');
    button(win.document, 'Present').click(); await vi.waitFor(() => expect(win.document.querySelector('.awp-player')).toBeTruthy()); button(win.document, 'Show meaning').click(); check(win, win.document.querySelector('.awp-stage'), '.awp-language-name', '.awp-translation');
    const html = win.AlloModules.WordPractice.buildHtml(pack), offline = new JSDOM(html, { runScripts: 'dangerously' }).window; windows.push(offline); button(offline.document, 'Show meaning').click(); check(offline, offline.document.querySelector('.awp-stage'), '.awp-language-name', '.awp-translation');
  });

  it('scales blend instructions with appearance without resizing setup controls or resetting the card', async () => {
    const win = load(source); win.AlloModules.WordPractice.open({ words: [{ word: 'leaf', phonemes: [{ label: 'l' }, { label: 'ea' }, { label: 'f' }] }], options: { mode: 'blend', repetitions: 1 } });
    const doc = win.document, setup = doc.querySelector('.awp-appearance'), preview = doc.querySelector('.awp-card-preview'), note = preview.querySelector('.awp-note');
    expect(note.style.fontSize).toBe('0.875rem'); change(win, field(setup, 'Card text size'), '1.4'); expect(preview.querySelector('.awp-note')).toBe(note); expect(parseFloat(note.style.fontSize)).toBeCloseTo(1.225);
    expect(field(setup, 'Card text size').style.fontSize).toBe('');
    button(doc, 'Present').click(); await vi.waitFor(() => expect(doc.querySelector('.awp-player')).toBeTruthy());
    const player = doc.querySelector('.awp-player'), sounds = player.querySelector('.awp-phonemes'), instruction = player.querySelector('.awp-stage .awp-note');
    expect(parseFloat(instruction.style.fontSize)).toBeCloseTo(1.225); change(win, field(player, 'Card text size'), '0.85');
    expect(parseFloat(instruction.style.fontSize)).toBeCloseTo(0.74375); expect(player.querySelector('.awp-phonemes')).toBe(sounds); expect(player.querySelector('.awp-progress').textContent).toBe('Card 1 of 1');
  });
});
