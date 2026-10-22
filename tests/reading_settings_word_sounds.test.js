// Reading settings in Word Sounds (lane R2, 2026-10-20): the "Aa" button in the
// practice header and the presenter toolbar, the panel opening in the full-screen
// element while presenting, presenter text following the reader's base size (with
// a cap and a fit step-down), and "Use my reading settings" on the printouts.
// Mounts the real modal; the bridge is faked as the host's.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  loadModal, mount, unmountAll, presentButton, presenter, click, settle, key, act, makeHatItem,
  fullscreenGrants, fullscreenRejects, currentFullscreen,
} from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';

const REPO = process.cwd().replace(/\\/g, '/');
const FONTS = [
  { id: 'default', label: 'Default (System)', family: '', cssClass: '' },
  { id: 'opendyslexic', label: 'OpenDyslexic', family: "'OpenDyslexic', sans-serif", cssClass: 'font-opendyslexic' },
  { id: 'lexend', label: 'Lexend', family: "'Lexend', sans-serif", cssClass: 'font-lexend' },
];
let lib;
let reader;
function installBridge(initial = {}) {
  reader = { fontId: 'default', fontFamily: '', fontClass: '', baseFontSize: 16, lineHeight: 1.6, letterSpacing: 0, colorOverlay: 'none', readingRuler: false, fonts: FONTS, ...initial };
  window.__alloReadingSettings = {
    get: () => ({ ...reader }),
    set: vi.fn((p) => { Object.assign(reader, p); window.dispatchEvent(new CustomEvent('alloflow:reading-settings-changed', { detail: { ...reader } })); }),
    subscribe: (fn) => { const h = (e) => fn(e.detail); window.addEventListener('alloflow:reading-settings-changed', h); return () => window.removeEventListener('alloflow:reading-settings-changed', h); },
  };
}
const setReader = (patch) => act(async () => { window.__alloReadingSettings.set(patch); await new Promise((r) => setTimeout(r, 5)); });
const words = () => [makePackItem(), makeHatItem()];
const teacher = (extra = {}) => mount({ isTeacherMode: true, allowRuntimeAi: true, callGemini: async () => '', callTTS: async () => null, callImagen: async () => null, words: words(), ...extra });
const aaIn = (scope) => scope.querySelector('[data-ws-reading-settings]');
const panel = () => document.querySelector('[data-allo-reading-settings]');
const header = (host) => host.querySelector('#word-sounds-dialog-title').closest('.bg-gradient-to-r');
const stageOf = (p) => p.querySelector('.ws-present-stage');
const zoomOf = (el) => Number(el.style.zoom || 1);
async function present(host) {
  await click(presentButton(host));
  await settle(40);
  const p = presenter(host);
  if (!p) throw Error('presenter did not open');
  return p;
}

beforeAll(() => {
  loadModal();
  new Function(readFileSync(REPO + '/ui_font_library_module.js', 'utf8'))();
  lib = window.AlloModules.UIFontLibrary;
  if (typeof lib.openReadingSettings !== 'function') throw Error('font library without the reading-settings panel');
});
beforeEach(() => { installBridge(); fullscreenGrants(); });
afterEach(() => {
  lib.closeReadingSettings();
  unmountAll();
  vi.restoreAllMocks();
  delete window.__alloReadingSettings;
});

describe('the Aa button in the Word Sounds header', () => {
  it('is a named dialog button for students and teachers alike, by the close button', async () => {
    for (const [who, extra] of [['student', {}], ['teacher', { isTeacherMode: true }]]) {
      const { host } = await mount(extra);
      const aa = aaIn(header(host));
      expect(aa, who).toBeTruthy();
      expect(aa.tagName).toBe('BUTTON');
      expect(aa.getAttribute('type')).toBe('button');
      expect(aa.textContent).toBe('Aa');
      expect(aa.getAttribute('aria-label')).toBe('Reading settings');
      expect(aa.getAttribute('aria-haspopup')).toBe('dialog');
      expect(aa.className).toContain('min-h-11');
      expect(aa.className).toContain('min-w-11');
      expect(aa.className).toContain('focus-visible:ring-2');
      const close = header(host).querySelector('[aria-label="common.close"]');
      expect(aa.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING, 'before minimize and close').toBeTruthy();
      unmountAll();
    }
  });

  it('hands the panel the module translator, which treats a key echo as missing', async () => {
    const spy = vi.spyOn(lib, 'openReadingSettings');
    const { host } = await mount({});
    await settle(50);
    const aa = aaIn(header(host));
    await click(aa);
    expect(spy).toHaveBeenCalledTimes(1);
    const { opener, t } = spy.mock.calls[0][0];
    expect(opener).toBe(aa);
    expect(t('word_sounds.present_button')).toBe('Present to class');
    expect(t('reading_settings.not_a_key'), 'so the panel uses its English').toBe('');
  });

  it('is absent, and nothing crashes, when the host has not published the settings or the panel library is missing', async () => {
    delete window.__alloReadingSettings;
    let { host } = await mount({});
    expect(host.querySelector('[role="dialog"]'), 'Word Sounds still renders').toBeTruthy();
    expect(aaIn(host)).toBeNull();
    unmountAll();
    installBridge();
    const saved = window.AlloModules.UIFontLibrary;
    delete window.AlloModules.UIFontLibrary;
    try {
      ({ host } = await mount({}));
      expect(aaIn(host)).toBeNull();
    } finally { window.AlloModules.UIFontLibrary = saved; }
  });

  it('opens the panel inside the Word Sounds dialog; Escape closes only the panel and returns focus', async () => {
    const { host, spies } = await mount({});
    await settle(50); // the dialog's own first focus lands first
    const aa = aaIn(header(host));
    await click(aa);
    const p = panel();
    expect(p).toBeTruthy();
    expect(p.parentElement).toBe(host.querySelector('.word-sounds-root'));
    expect(aa.getAttribute('aria-expanded')).toBe('true');
    expect(p.contains(document.activeElement)).toBe(true);
    await key(document.activeElement, 'Escape');
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(aa);
    expect(spies.onClose, 'Word Sounds stays open').not.toHaveBeenCalled();
  });
});

describe('the Aa button while presenting', () => {
  it('sits in the presenter toolbar and opens the panel in the full-screen element, outside the zoomed parts', async () => {
    const { host } = await teacher();
    const p = await present(host);
    const aa = aaIn(p);
    expect(aa.getAttribute('aria-label')).toBe('Reading settings');
    expect(aa.getAttribute('type')).toBe('button');
    expect(aa.parentElement.textContent).toContain('End presentation');
    const root = host.querySelector('.word-sounds-root');
    expect(currentFullscreen(), 'presenting went full screen').toBe(root);
    await click(aa);
    expect(panel().parentElement).toBe(currentFullscreen());
    expect(p.contains(panel()), 'not inside the presenter, whose parts may be zoomed').toBe(false);
  });

  it('Escape in the panel closes the panel and keeps presenting; Escape again ends presenting', async () => {
    const { host } = await teacher();
    const p = await present(host);
    await click(aaIn(p));
    expect(panel().contains(document.activeElement)).toBe(true);
    await key(document.activeElement, 'Escape');
    expect(panel()).toBeNull();
    expect(presenter(host), 'still presenting').toBeTruthy();
    expect(document.exitFullscreen).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(aaIn(p));
    await key(presenter(host), 'Escape');
    await settle(10);
    expect(presenter(host)).toBeNull();
  });

  it('keys typed in the panel do not move the presentation', async () => {
    const { host } = await teacher();
    const p = await present(host);
    const label = () => (p.textContent.match(/Item \d+ of \d+/) || [''])[0];
    expect(label()).toBe('Item 1 of 2');
    await click(aaIn(p));
    const close = [...panel().querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Close');
    close.focus();
    await key(close, 'ArrowRight');
    await key(close, 'r');
    expect(label()).toBe('Item 1 of 2');
    expect(p.querySelector('[data-present-answer]')).toBeNull();
  });

  it('without full screen, the panel opens in the Word Sounds dialog that holds the presenter', async () => {
    fullscreenRejects();
    const { host } = await teacher();
    const p = await present(host);
    await click(aaIn(p));
    expect(panel().parentElement).toBe(host.querySelector('.word-sounds-root'));
  });

  it('closes the panel when presenting ends', async () => {
    const { host } = await teacher();
    const p = await present(host);
    await click(aaIn(p));
    expect(panel()).toBeTruthy();
    await click([...p.querySelectorAll('button')].find((b) => b.textContent === 'End presentation'));
    await settle(10);
    expect(panel()).toBeNull();
  });
});

describe('presenter text follows the reader base size', () => {
  it('scales the viewport part of every big size with the base (16 px = 1), and the stylesheet uses it', async () => {
    const { host } = await teacher();
    const p = await present(host);
    expect(p.style.getPropertyValue('--ws-ps')).toBe('1');
    const css = document.getElementById('ws-present-css').textContent;
    for (const cls of ['prompt', 'big', 'word', 'answer', 'model']) {
      expect(css, cls).toMatch(new RegExp('\\.ws-present-' + cls + '\\{font-size:clamp\\(\\d+(\\.\\d+)?rem,calc\\([^)]*\\)\\*var\\(--ws-ps,1\\)\\),\\d+(\\.\\d+)?rem\\)'));
    }
    await setReader({ baseFontSize: 20 });
    expect(p.style.getPropertyValue('--ws-ps')).toBe('1.25');
    expect(stageOf(p).getAttribute('data-ws-text-base')).toBe('20');
    expect(zoomOf(stageOf(p)), 'up to the cap the rem sizes grow on their own').toBe(1);
    await setReader({ baseFontSize: 12 });
    expect(p.style.getPropertyValue('--ws-ps'), 'and shrink').toBe('0.75');
    expect(zoomOf(stageOf(p))).toBe(1);
  });

  it('above the cap, zooms the stage to the 24 px look and the toolbars and drawer to the 16 px look (so a larger size never leaves the stage less room)', async () => {
    installBridge({ baseFontSize: 48 });
    const { host } = await teacher();
    const p = await present(host);
    const stage = stageOf(p);
    expect(stage.getAttribute('data-ws-text-base')).toBe('24');
    expect(zoomOf(stage)).toBe(0.5);
    expect(p.style.getPropertyValue('--ws-pv'), 'viewport parts undo the stage zoom').toBe('2');
    expect(p.style.getPropertyValue('--ws-pa'), 'the answer picture gives the text room').toBe(String(16 / 24));
    const toolbar = aaIn(p).closest('.border-b');
    expect(zoomOf(toolbar)).toBeCloseTo(1 / 3, 5);
    const bottom = [...p.querySelectorAll('button')].find((b) => b.textContent === 'Next').parentElement;
    expect(zoomOf(bottom)).toBeCloseTo(1 / 3, 5);
    await click(p.querySelector('[aria-controls="ws-present-drawer"]'));
    expect(zoomOf(p.querySelector('#ws-present-drawer'))).toBeCloseTo(1 / 3, 5);
    await setReader({ baseFontSize: 16 });
    expect(zoomOf(stageOf(p))).toBe(1);
    expect(zoomOf(toolbar)).toBe(1);
  });

  it('reads the html font size when the host has no bridge', async () => {
    delete window.__alloReadingSettings;
    document.documentElement.style.fontSize = '20px';
    try {
      const { host } = await teacher();
      const p = await present(host);
      expect(p.style.getPropertyValue('--ws-ps')).toBe('1.25');
    } finally { document.documentElement.style.fontSize = ''; }
  });

  it('steps an activity down until its revealed item fits, never below 3/4 of the 16 px look, and keeps that size for the next item', async () => {
    installBridge({ baseFontSize: 24 });
    let limit = 20;
    vi.spyOn(window.Element.prototype, 'scrollHeight', 'get').mockImplementation(function () {
      return this.classList && this.classList.contains('ws-present-stage') ? (Number(this.getAttribute('data-ws-text-base')) > limit ? 700 : 500) : 0;
    });
    vi.spyOn(window.Element.prototype, 'clientHeight', 'get').mockImplementation(function () {
      return this.classList && this.classList.contains('ws-present-stage') ? 600 : 0;
    });
    const { host } = await teacher();
    const p = await present(host);
    expect(stageOf(p).getAttribute('data-ws-text-base')).toBe('20');
    expect(zoomOf(stageOf(p))).toBeCloseTo(20 / 24, 5);
    await key(p, 'ArrowRight');
    expect(p.textContent).toContain('Item 2 of 2');
    expect(stageOf(p).getAttribute('data-ws-text-base'), 'same size for the next item').toBe('20');
    limit = 22;
    await act(async () => { window.dispatchEvent(new Event('resize')); await new Promise((r) => setTimeout(r, 5)); });
    expect(stageOf(p).getAttribute('data-ws-text-base'), 'a bigger window (full screen) fits again from the cap').toBe('22');
    limit = 0;
    await setReader({ baseFontSize: 22 });
    expect(stageOf(p).getAttribute('data-ws-text-base'), 'a new size starts over and stops at 3/4 of the 16 px look').toBe('12');
  });
});

describe('Use my reading settings on the printouts', () => {
  let written;
  let fakeWindow;
  const stubOpen = () => {
    written = [];
    fakeWindow = { document: { open: vi.fn(), write: (html) => written.push(html), close: vi.fn(), images: [] }, focus: vi.fn(), print: vi.fn() };
    vi.spyOn(window, 'open').mockImplementation(() => fakeWindow);
  };
  const plain = (word, phonemes) => ({ id: 'w-' + word, term: word, word, targetWord: word, displayWord: word, phonemes, phonemeCount: phonemes.length });
  const printWords = () => [makePackItem(), plain('fish', ['f', 'i', 'sh']), plain('stamp', ['s', 't', 'a', 'm', 'p']), plain('photosynthesis', ['f', 'o', 't', 'o', 's', 'i', 'n', 'th', 'e', 's', 'i', 's'])];
  async function chooser() {
    const m = await teacher({ words: printWords() });
    await click(m.host.querySelector('[data-ws-print-open]'));
    await settle(10);
    return { ...m, dialog: m.host.querySelector('[data-ws-print-dialog]') };
  }
  const doc = () => new DOMParser().parseFromString(written[written.length - 1], 'text/html');
  const sizes = (d, sel) => Object.fromEntries([...d.querySelectorAll(sel)].map((el) => [el.textContent, Number.parseFloat(el.style.fontSize)]));
  beforeEach(stubOpen);

  it('offers the option off by default, labelled and described', async () => {
    const { dialog } = await chooser();
    const box = dialog.querySelector('[data-ws-print-reader]');
    expect(box.type).toBe('checkbox');
    expect(box.checked).toBe(false);
    expect(box.closest('label').textContent).toBe('Use my reading settings');
    expect(dialog.querySelector('[id="' + box.getAttribute('aria-describedby') + '"]').textContent).toBe('Prints with your font, text size and spacing.');
    expect(dialog.querySelector('input[type="checkbox"]').closest('label').textContent, 'Show the word stays the first option').toBe('Show the word');
  });

  it('is not offered when the host has no reading settings', async () => {
    delete window.__alloReadingSettings;
    const { dialog } = await chooser();
    expect(dialog.querySelector('[data-ws-print-reader]')).toBeNull();
  });

  it('prints with the reader CSS and the font only when checked', async () => {
    installBridge({ fontId: 'opendyslexic', fontFamily: "'OpenDyslexic', sans-serif", fontClass: 'font-opendyslexic', baseFontSize: 24, lineHeight: 2, letterSpacing: 0.05 });
    const { dialog, host } = await chooser();
    for (const kind of ['cards', 'boxes', 'home']) {
      await click(dialog.querySelector('[data-ws-print="' + kind + '"]'));
      const html = written[written.length - 1];
      expect(html.includes(lib.readerExportCss(reader)), kind + ' unchecked').toBe(false);
      expect(html.includes('@font-face'), kind + ' unchecked').toBe(false);
      expect(html.includes('body{font-size:1.125rem}'), kind + ' unchecked').toBe(false);
    }
    await click(dialog.querySelector('[data-ws-print-reader]'));
    expect(host.querySelector('[data-ws-print-reader]').checked).toBe(true);
    for (const kind of ['cards', 'boxes', 'home']) {
      await click(host.querySelector('[data-ws-print="' + kind + '"]'));
      const html = written[written.length - 1];
      const css = doc().querySelector('style').textContent;
      expect(css.includes(lib.readerExportCss(reader)), kind + ': reader CSS').toBe(true);
      expect(css.includes("font-family:'OpenDyslexic'") && css.includes('@font-face'), kind + ': the font face').toBe(true);
      expect(css.indexOf('html{font-size:24px}') > css.indexOf('.ws-print-card{'), kind + ': after the print CSS').toBe(true);
      expect(css.includes('body{font-size:1.125rem}'), kind + ': print sizes in rem').toBe(true);
      expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    }
  });

  it('puts a web font link in the head', async () => {
    installBridge({ fontId: 'lexend', fontFamily: "'Lexend', sans-serif", fontClass: 'font-lexend' });
    const { dialog, host } = await chooser();
    await click(dialog.querySelector('[data-ws-print-reader]'));
    await click(host.querySelector('[data-ws-print="home"]'));
    const link = doc().head.querySelector('link[rel="stylesheet"]');
    expect(link.getAttribute('href')).toContain('fonts.googleapis.com/css2?family=Lexend');
  });

  it('grows card and cue words with the base size but keeps them inside their boxes', async () => {
    installBridge({ baseFontSize: 32, letterSpacing: 0.1 });
    const { dialog, host } = await chooser();
    await click(dialog.querySelector('[data-ws-print="cards"]'));
    const before = sizes(doc(), '.ws-print-word');
    await click(dialog.querySelector('[data-ws-print-reader]'));
    await click(host.querySelector('[data-ws-print="cards"]'));
    const cards = [...doc().querySelectorAll('.ws-print-card')];
    const after = sizes(doc(), '.ws-print-word');
    expect(after.fish, 'a short word without a picture grows').toBeGreaterThan(before.fish * 1.3);
    for (const card of cards) {
      const word = card.querySelector('.ws-print-word').textContent;
      const px = after[word];
      expect(px * [...word].length * (0.5 * 1.05 + 0.1), word + ' fits the card width (jsdom has no font metrics: 0.5em a letter)').toBeLessThanOrEqual(323);
      if (card.querySelector('img')) expect(px * 1.1, word + ' fits beside its picture').toBeLessThanOrEqual(276 * 0.42 - 10);
    }
    await click(host.querySelector('[data-ws-print="boxes"]'));
    expect(sizes(doc(), '.ws-print-cue-word').fish, 'a short cue word grows past its 30px default').toBeGreaterThan(40);
    for (const cue of doc().querySelectorAll('.ws-print-cue-word')) {
      expect(Number.parseFloat(cue.style.fontSize) * [...cue.textContent].length * (0.5 * 1.05 + 0.1), cue.textContent + ' fits the 1.5in cue').toBeLessThanOrEqual(144);
    }
    expect(doc().querySelector('style').textContent).toContain('.ws-print-card .ws-print-word,.ws-print-cue .ws-print-cue-word{line-height:1.1 !important}');
  });

  it('waits for the font before printing, and prints at once without it', async () => {
    installBridge({ fontId: 'opendyslexic', fontFamily: "'OpenDyslexic', sans-serif", fontClass: 'font-opendyslexic' });
    let ready;
    fakeWindow.document.fonts = { ready: new Promise((r) => { ready = r; }) };
    const { dialog, host } = await chooser();
    await click(dialog.querySelector('[data-ws-print="cards"]'));
    expect(fakeWindow.print, 'unchecked: no font to wait for').toHaveBeenCalledTimes(1);
    await click(dialog.querySelector('[data-ws-print-reader]'));
    await click(host.querySelector('[data-ws-print="cards"]'));
    expect(fakeWindow.print).toHaveBeenCalledTimes(1);
    await act(async () => { ready(); await new Promise((r) => setTimeout(r, 5)); });
    expect(fakeWindow.print).toHaveBeenCalledTimes(2);
  });
});

describe('the practice screen sizes its text in rem', () => {
  it('has no px font sizes in the header, the activity picker or the activity', async () => {
    const { host } = await teacher({ lessonPlanConfig: { masteryThreshold: 3, activities: [{ id: 'rhyming', count: 5 }] }, initialActivitySequence: ['rhyming', 'counting'] });
    const box = host.querySelector('.word-sounds-root > div');
    const px = [...box.querySelectorAll('*')].filter((el) => /px$/.test(el.style.fontSize || '') || [...el.classList].some((c) => /^text-\[\d+(\.\d+)?px\]$/.test(c)));
    expect(px.map((el) => el.outerHTML.slice(0, 120))).toEqual([]);
    expect([...box.querySelectorAll('*')].some((el) => el.style.fontSize === '0.75rem'), 'the difficulty chip').toBe(true);
  });
});
