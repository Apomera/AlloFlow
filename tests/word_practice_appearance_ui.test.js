import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const sources = [
  ['source', ['word_practice_core.js', 'word_practice_ui.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n')],
  ['runtime', fs.readFileSync('word_practice_module.js', 'utf8')],
];
const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const input = { title: 'Plant words', language: 'Spanish', words: [{ word: 'Hoja', definition: 'A plant part.', definitionLanguage: 'English', translations: { Arabic: 'ورقة', Japanese: '葉' } }], options: { mode: 'vocabulary', repetitions: 1, shuffle: false, cardFont: 'georgia', cardTextScale: 1.2, cardTheme: 'cream' } };
const button = (doc, name) => [...doc.querySelectorAll('button')].find(node => node.textContent === name && !node.closest('[hidden]'));
const control = (parent, name) => [...parent.querySelectorAll('label')].find(node => node.querySelector('span')?.textContent === name)?.querySelector('select');
function load(source) { const { window: win } = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example/' }); windows.push(win); win.eval(source); return win; }
function change(win, parent, name, value) { const select = control(parent, name); select.value = String(value); select.dispatchEvent(new win.Event('change', { bubbles: true })); return select; }

describe.each(sources)('Word Sounds card appearance (%s)', (_, source) => {
  it('previews actual multilingual content and preserves appearance through Present, Back, Save and Open', async () => {
    const win = load(source), doc = win.document, blobs = [];
    win.URL.createObjectURL = blob => { blobs.push(blob); return 'blob:appearance'; }; win.URL.revokeObjectURL = () => {}; win.HTMLAnchorElement.prototype.click = () => {};
    win.AlloModules.WordPractice.open(input);
    const setup = doc.querySelector('.awp-appearance');
    expect(control(setup, 'Card font').value).toBe('georgia');
    expect(control(setup, 'Card text size').value).toBe('1.2');
    expect(doc.querySelector('.awp-preview-word').lang).toBe('es');
    expect(doc.querySelector('.awp-preview-definition')).toBeNull();
    button(setup, 'Show meaning').click();
    expect(doc.querySelector('.awp-preview-definition').lang).toBe('en');
    expect([...doc.querySelectorAll('.awp-preview-translation')].map(node => [node.textContent, node.lang, node.dir])).toEqual([['ورقة', 'ar', 'rtl'], ['葉', 'ja', 'ltr']]);
    change(win, setup, 'Card style', 'mist');
    expect(doc.querySelector('.awp-card-preview').style.getPropertyValue('--awp-card-background')).toBe('#' + win.AlloWordPracticeCore.cardAppearance({ cardTheme: 'mist' }).background);
    button(doc, 'Present').click(); await vi.waitFor(() => expect(doc.querySelector('.awp-player')).toBeTruthy());
    button(doc, 'Show meaning').click();
    const player = doc.querySelector('.awp-player'), style = control(player, 'Card font'); style.focus();
    change(win, player, 'Card font', 'verdana'); change(win, player, 'Card text size', '1.4');
    expect(doc.activeElement).toBe(style);
    expect(player.querySelector('.awp-definition').textContent).toBe('A plant part.');
    expect(player.querySelector('.awp-stage').dataset.awpCardFont).toBe('verdana');
    expect(player.querySelector('.awp-progress').textContent).toBe('Card 1 of 1');
    button(doc, 'Back to setup').click();
    expect(control(setup, 'Card font').value).toBe('verdana'); expect(control(setup, 'Card text size').value).toBe('1.4');
    button(doc, 'Save word set').click(); await vi.waitFor(() => expect(blobs.length).toBe(1));
    const saved = JSON.parse(await new Promise(resolve => { const reader = new win.FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blobs[0]); }));
    expect(saved.options).toMatchObject({ cardFont: 'verdana', cardTextScale: 1.4, cardTheme: 'mist' });
    change(win, setup, 'Card font', 'arial');
    const file = doc.querySelector('input[type=file]'); Object.defineProperty(file, 'files', { configurable: true, value: [{ size: 10000, text: async () => JSON.stringify(saved) }] }); file.dispatchEvent(new win.Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(control(setup, 'Card font').value).toBe('verdana'));
    expect(doc.querySelector('.awp-preview-word').textContent).toBe('Hoja');
    expect(doc.querySelector('.awp-preview-definition')).toBeNull();
  });

  it('keeps card controls available offline, localized, and separate from card-navigation shortcuts', () => {
    const seed = load(source);
    const labels = { appearance: 'مظهر البطاقة', card_font: 'خط البطاقة', card_text_size: 'حجم النص', card_style: 'نمط البطاقة', font_default: 'الخط الافتراضي', style_paper: 'عادي', style_cream: 'دافئ', style_mist: 'أزرق' };
    const { window: win } = new JSDOM(seed.AlloModules.WordPractice.buildHtml(input, input.options, undefined, labels, null, 'Arabic'), { runScripts: 'dangerously' }); windows.push(win);
    const doc = win.document, panel = doc.querySelector('.awp-appearance-panel');
    expect(panel.querySelector('summary').textContent).toBe('مظهر البطاقة');
    expect(panel.querySelector('summary').lang).toBe('ar');
    button(doc, 'Show meaning').click();
    const before = doc.querySelector('.awp-card').textContent;
    panel.querySelector('summary').focus(); const space = new win.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }); doc.activeElement.dispatchEvent(space);
    expect(space.defaultPrevented).toBe(false);
    change(win, panel, 'خط البطاقة', 'arial'); change(win, panel, 'نمط البطاقة', 'paper');
    expect(doc.querySelector('.awp-card').textContent).toBe(before);
    expect(doc.querySelector('.awp-stage').dataset.awpCardFont).toBe('arial');
    expect(doc.querySelector('.awp-translation').dir).toBe('rtl');
  });

  it('retains an imported intermediate size without silently snapping it to a preset', () => {
    const win = load(source); win.AlloModules.WordPractice.open({ ...input, options: { ...input.options, cardTextScale: 1.1 } });
    expect(control(win.document, 'Card text size').value).toBe('1.1');
    expect(control(win.document, 'Card text size').selectedOptions[0].textContent).toBe('110%');
  });

  it('keeps a solved sentence and its scheduled timer intact while changing appearance', async () => {
    const win = load(source), doc = win.document;
    win.AlloModules.WordPractice.open({ words: [{ word: 'leaf', sentenceActivity: { prompt: 'The green ___.', choices: ['leaf', 'root'], answer: 'leaf' } }, { word: 'root', sentenceActivity: { prompt: 'The underground ___.', choices: ['root', 'leaf'], answer: 'root' } }], options: { mode: 'sentence', shuffle: false, repetitions: 1, autoAdvance: true, intervalSeconds: 5 } });
    button(doc, 'Present').click(); await vi.waitFor(() => expect(doc.querySelector('.awp-player')).toBeTruthy());
    const scheduled = [], cleared = [];
    win.setTimeout = callback => { scheduled.push(callback); return scheduled.length; };
    win.clearTimeout = id => cleared.push(id);
    button(doc, 'Start timer').click();
    button(doc.querySelector('.awp-choices'), 'leaf').click();
    const player = doc.querySelector('.awp-player'), feedback = player.querySelector('.awp-feedback').textContent;
    expect(scheduled).toHaveLength(1);
    change(win, player, 'Card font', 'georgia'); change(win, player, 'Card text size', '1.2'); change(win, player, 'Card style', 'cream');
    expect(player.querySelector('.awp-feedback').textContent).toBe(feedback);
    expect([...player.querySelectorAll('.awp-choices button')].every(node => node.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(button(player, 'Pause timer').getAttribute('aria-pressed')).toBe('true');
    expect(scheduled).toHaveLength(1); expect(cleared).toEqual([]);
    scheduled[0]();
    expect(player.querySelector('.awp-progress').textContent).toBe('Card 2 of 2');
    expect(player.querySelector('.awp-stage').dataset.awpCardFont).toBe('georgia');
  });
});
