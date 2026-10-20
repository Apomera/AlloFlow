// Word Sounds printables (lane D, 2026-10-20): the teacher's Print materials
// chooser in the real modal, and the three printouts it writes into a window
// of its own (window.open is stubbed; what is written is parsed and counted).
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// The shared harness reads LANE_DIR when it loads; set it only for that import.
const LANE = vi.hoisted(() => {
  const dir = process.env.LANE_DIR || '.';
  const owned = !process.env.LANE_DIR;
  process.env.LANE_DIR = dir;
  return { dir, owned };
});
import { loadModal, mount, unmountAll, click, key, settle, act, makeHatItem } from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';
if (LANE.owned) delete process.env.LANE_DIR;

const DIR = LANE.dir;
const REPO = process.cwd().replace(/\\/g, '/');

const plain = (word, phonemes, extra = {}) => ({ id: 'w-' + word, term: word, word, targetWord: word, displayWord: word, phonemes, phonemeCount: phonemes.length, ...extra });
// cat and hat have pictures; fish has none; frog has no phoneme data;
// ship uses prepared pronunciation objects.
const words = () => [
  makePackItem(), makeHatItem(),
  plain('fish', ['f', 'i', 'sh']),
  plain('frog', []),
  plain('stamp', ['s', 't', 'a', 'm', 'p']),
  plain('ship', [{ phoneme: 'sh' }, { phoneme: 'i' }, { grapheme: 'p' }]),
];
const nineWords = () => [...words(), plain('pig', ['p', 'i', 'g']), plain('nest', ['n', 'e', 's', 't']), plain('ox', ['o', 'x'])];

const openButton = (host) => host.querySelector('[data-ws-print-open]');
const dialogOf = (host) => host.querySelector('[data-ws-print-dialog]');
const printButton = (dialog, kind) => dialog.querySelector('[data-ws-print="' + kind + '"]');
const focusables = (root) => [...root.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];

let written;
let fakeWindow;
let appPrint;
function stubWindowOpen(result) {
  written = [];
  fakeWindow = {
    document: { open: vi.fn(), write: (html) => written.push(html), close: vi.fn(), images: [] },
    focus: vi.fn(),
    print: vi.fn(),
  };
  return vi.spyOn(window, 'open').mockImplementation(() => (result === undefined ? fakeWindow : result));
}
const lastDoc = () => new DOMParser().parseFromString(written[written.length - 1], 'text/html');

// A teacher session may use runtime AI; without it, the test words (which carry
// no recorded audio) would stop at the students' audio check.
const teacherSession = { isTeacherMode: true, allowRuntimeAi: true, callGemini: async () => '', callTTS: async () => null, callImagen: async () => null };
async function openChooser(extra = {}) {
  const mounted = await mount({ ...teacherSession, words: words(), ...extra });
  const opener = openButton(mounted.host);
  if (!opener) throw Error('Print materials button missing');
  opener.focus();
  await click(opener);
  await settle(10);
  return { ...mounted, opener, dialog: dialogOf(mounted.host) };
}
async function choose(host, value) {
  const select = dialogOf(host).querySelector('select');
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

beforeAll(() => { loadModal(); });
beforeEach(() => {
  stubWindowOpen();
  appPrint = vi.spyOn(window, 'print').mockImplementation(() => {});
});
afterEach(() => {
  unmountAll();
  vi.restoreAllMocks();
  delete window.AlloModules.ModuleScopeExtras;
  document.documentElement.removeAttribute('lang');
});

describe('who sees Print materials', () => {
  it('shows a teacher the button and hides it from students, parents and probes', async () => {
    const others = { ...teacherSession, isTeacherMode: false };
    for (const [who, extra] of [['student', {}], ['parent', { isParentMode: true }]]) {
      const { host } = await mount({ ...others, ...extra, words: words() });
      expect(host.querySelector('[aria-label="common.voice_input"]'), who + ' header rendered').toBeTruthy();
      expect(openButton(host), who).toBeNull();
    }
    expect(openButton((await mount({ ...teacherSession, isProbeMode: true, words: words() })).host), 'probe').toBeNull();
    const button = openButton((await mount({ ...teacherSession, words: words() })).host);
    expect(button.textContent).toContain('Print materials');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-haspopup')).toBe('dialog');
    expect(button.className).toContain('min-h-11');
  });
});

describe('the chooser dialog', () => {
  it('opens as a labelled modal dialog with focus inside', async () => {
    const { dialog, host } = await openChooser();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const title = host.querySelector('[id="' + dialog.getAttribute('aria-labelledby') + '"]');
    expect(title.textContent).toBe('Print materials');
    expect(dialog.contains(document.activeElement), 'focus moved into the dialog').toBe(true);
    for (const kind of ['cards', 'boxes', 'home']) expect(printButton(dialog, kind).getAttribute('type')).toBe('button');
    expect(dialog.querySelector('[role="status"]')).toBeTruthy();
  });

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    const { dialog } = await openChooser();
    const items = focusables(dialog);
    expect(items.length).toBeGreaterThan(4);
    items[items.length - 1].focus();
    await key(items[items.length - 1], 'Tab');
    expect(document.activeElement).toBe(items[0]);
    await key(items[0], 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('closes on Escape without closing Word Sounds, and returns focus to the button', async () => {
    const { host, opener, spies } = await openChooser();
    await key(document.activeElement, 'Escape');
    await settle(10);
    expect(dialogOf(host)).toBeNull();
    expect(spies.onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
  });

  it('closes from its Close button and returns focus to the button', async () => {
    const { host, opener, dialog } = await openChooser();
    const close = [...dialog.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Close');
    await click(close);
    await settle(10);
    expect(dialogOf(host)).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

describe('word cards', () => {
  it('prints one card per word, 6 or 8 to a page, without printing the app', async () => {
    const { host, dialog } = await openChooser({ words: nineWords() });
    await click(printButton(dialog, 'cards'));
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(fakeWindow.print).toHaveBeenCalledTimes(1);
    expect(appPrint).not.toHaveBeenCalled();
    let doc = lastDoc();
    expect(doc.title).toBe('Word cards');
    const cardWords = [...doc.querySelectorAll('.ws-print-card .ws-print-word')].map((p) => p.textContent);
    expect(cardWords).toEqual(['cat', 'hat', 'fish', 'frog', 'stamp', 'ship', 'pig', 'nest', 'ox']);
    expect([...doc.querySelectorAll('.ws-print-page')].map((page) => page.querySelectorAll('.ws-print-card').length)).toEqual([6, 3]);
    expect(dialogOf(host).querySelector('[role="status"]').textContent).toBe('Word cards opened in a new window.');

    await choose(host, '8');
    await click(printButton(dialogOf(host), 'cards'));
    doc = lastDoc();
    expect([...doc.querySelectorAll('.ws-print-page')].map((page) => page.querySelectorAll('.ws-print-card').length)).toEqual([8, 1]);
    expect(doc.querySelector('.ws-print-page').className).toContain('ws-print-8');
    expect(appPrint).not.toHaveBeenCalled();
  });

  it('gives every picture the word as its alt text, and leaves a card without a picture text-only', async () => {
    const { dialog } = await openChooser();
    await click(printButton(dialog, 'cards'));
    const doc = lastDoc();
    const withPictures = [...doc.querySelectorAll('.ws-print-card')].filter((card) => card.querySelector('img'));
    expect(withPictures.map((card) => card.querySelector('img').getAttribute('alt'))).toEqual(['cat', 'hat']);
    for (const card of withPictures) expect(card.querySelector('img').getAttribute('src')).toMatch(/^data:image\//);
    const fish = [...doc.querySelectorAll('.ws-print-card')].find((card) => card.textContent === 'fish');
    expect(fish.querySelector('img')).toBeNull();
  });

  it('prints black on white, keeps cards whole across pages, and has a Print button of its own', async () => {
    const { dialog } = await openChooser();
    await click(printButton(dialog, 'cards'));
    const html = written[0];
    const css = lastDoc().querySelector('style').textContent;
    expect(css).toMatch(/body\{[^}]*color:#000;background:#fff/);
    expect(css).toMatch(/\.ws-print-card\{[^}]*break-inside:avoid;page-break-inside:avoid/);
    expect(css).toMatch(/\.ws-print-card\{[^}]*border-bottom:2px dashed #000/);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    const bar = lastDoc().querySelector('.print-bar button');
    expect(bar.textContent).toBe('Print');
    expect(bar.getAttribute('onclick')).toBe('window.print()');
  });
});

describe('sound boxes', () => {
  it('draws one empty box per phoneme and leaves out words without phoneme data, saying how many', async () => {
    const { dialog } = await openChooser();
    const note = dialog.querySelector('[id="ws-print-boxes-note"]');
    expect(note.textContent).toBe('1 word has no sound data and is left out.');
    expect(printButton(dialog, 'boxes').getAttribute('aria-describedby')).toBe('ws-print-boxes-note');
    await click(printButton(dialog, 'boxes'));
    const doc = lastDoc();
    expect(doc.title).toBe('Sound boxes');
    const rows = [...doc.querySelectorAll('.ws-print-row')];
    expect(rows.length).toBe(5);
    expect(rows.map((row) => row.querySelectorAll('.ws-print-box').length)).toEqual([3, 3, 3, 5, 3]);
    expect(doc.querySelector('.print-bar').textContent).toContain('1 word has no sound data and is left out.');
    expect(doc.body.textContent.includes('frog'), 'frog has no sounds and is left out').toBe(false);
    expect(appPrint).not.toHaveBeenCalled();
  });

  it('shows the picture alone by default, the word when there is no picture, and every word with Show the word on', async () => {
    const { host, dialog } = await openChooser();
    await click(printButton(dialog, 'boxes'));
    let rows = [...lastDoc().querySelectorAll('.ws-print-row')];
    expect(rows[0].querySelector('img').getAttribute('alt')).toBe('cat');
    expect(rows.map((row) => row.querySelector('.ws-print-cue-word')?.textContent || '')).toEqual(['', '', 'fish', 'stamp', 'ship']);
    const toggle = dialogOf(host).querySelector('input[type="checkbox"]');
    expect(toggle.closest('label').textContent).toBe('Show the word');
    await click(toggle);
    await click(printButton(dialogOf(host), 'boxes'));
    rows = [...lastDoc().querySelectorAll('.ws-print-row')];
    expect(rows.map((row) => row.querySelector('.ws-print-cue-word')?.textContent || '')).toEqual(['cat', 'hat', 'fish', 'stamp', 'ship']);
  });

  // Checked in Chromium at the 7.5in print width: nothing overflows the page.
  it('shrinks the type for a long word and the boxes for more than six sounds', async () => {
    const long = plain('photosynthesis', ['f', 'o', 't', 'o', 's', 'i', 'n', 'th', 'e', 's', 'i', 's']);
    const { dialog } = await openChooser({ words: [long, plain('elephant', ['e', 'l', 'e', 'f', 'a', 'n', 't']), plain('cot', ['k', 'o', 't'])] });
    await click(printButton(dialog, 'boxes'));
    const [big, seven, short] = [...lastDoc().querySelectorAll('.ws-print-row')];
    expect(big.querySelectorAll('.ws-print-box').length).toBe(12);
    expect(big.querySelector('.ws-print-box').style.width).toBe('0.45in');
    expect(seven.querySelector('.ws-print-box').style.height).toBe('0.77in');
    expect(short.querySelector('.ws-print-box').getAttribute('style')).toBeNull();
    expect(Number.parseInt(big.querySelector('.ws-print-cue-word').style.fontSize, 10)).toBeLessThan(20);
    expect(short.querySelector('.ws-print-cue-word').style.fontSize).toBe('30px');
  });

  it('disables the printout when no word has phoneme data', async () => {
    const { dialog } = await openChooser({ words: [plain('frog', []), plain('toad', [])] });
    expect(printButton(dialog, 'boxes').disabled).toBe(true);
    expect(dialog.querySelector('[id="ws-print-boxes-note"]').textContent).toContain('No word in this list has sound data yet');
  });

  it('counts two skipped words in the plural', async () => {
    const { dialog } = await openChooser({ words: [...words(), plain('toad', [])] });
    expect(dialog.querySelector('[id="ws-print-boxes-note"]').textContent).toBe('2 words have no sound data and are left out.');
  });
});

describe('take-home sheet', () => {
  it('is one letter with the words, three activities and a name line, and no scores or learner IDs', async () => {
    const { dialog } = await openChooser({ learnerId: 'learner-7731', wordSoundsScore: { correct: 3, total: 7, streak: 2 } });
    await click(printButton(dialog, 'home'));
    const doc = lastDoc();
    expect(doc.title).toBe('Word Sounds practice at home');
    expect(doc.querySelectorAll('.ws-print-letter').length).toBe(1);
    expect([...doc.querySelectorAll('.ws-print-words li')].map((li) => li.textContent)).toEqual(['cat', 'hat', 'fish', 'frog', 'stamp', 'ship']);
    expect(doc.querySelectorAll('.ws-print-letter ol li').length).toBe(3);
    expect(doc.querySelector('.ws-print-name').textContent.trim()).toBe('Student name:');
    expect(doc.querySelector('.ws-print-name .ws-print-line')).toBeTruthy();
    const html = written[0];
    for (const leak of ['learner-7731', '3/7', '43%', 'Score', 'Accuracy']) expect(html.includes(leak), leak).toBe(false);
    expect(appPrint).not.toHaveBeenCalled();
  });

  // Measured in Chromium: 24 words fit one Letter/A4 page at full size, 50 when dense.
  it('switches to a denser word list past 24 words so the letter stays on one page', async () => {
    const many = (n) => Array.from({ length: n }, (_, i) => plain('word' + i, ['w']));
    let { dialog } = await openChooser({ words: many(24) });
    await click(printButton(dialog, 'home'));
    expect(lastDoc().querySelector('.ws-print-words').className).toBe('ws-print-words');
    unmountAll();
    ({ dialog } = await openChooser({ words: many(25) }));
    await click(printButton(dialog, 'home'));
    expect(lastDoc().querySelectorAll('.ws-print-words li').length).toBe(25);
    expect(lastDoc().querySelector('.ws-print-words').classList.contains('ws-print-words-dense')).toBe(true);
    expect(lastDoc().querySelector('style').textContent).toContain('.ws-print-words-dense{grid-template-columns:repeat(4,');
  });
});

describe('language and direction', () => {
  it('marks Arabic words right-to-left (no ModuleScopeExtras: the built-in code list)', async () => {
    const { dialog } = await openChooser({ wordSoundsLanguage: 'ar' });
    await click(printButton(dialog, 'cards'));
    for (const card of lastDoc().querySelectorAll('.ws-print-card')) {
      expect(card.getAttribute('dir')).toBe('rtl');
      expect(card.getAttribute('lang')).toBe('ar');
    }
    expect(lastDoc().documentElement.getAttribute('lang')).toBe('en');
    expect(lastDoc().documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('uses the ModuleScopeExtras helpers for a language name, and dir="auto" with no lang for an unknown one', async () => {
    window.AlloModules.ModuleScopeExtras = {
      getSpeechLangCode: (name) => ({ arabic: 'ar-SA' })[String(name).toLowerCase()] || 'en-US',
      isRtlLang: (value) => /^ar\b|arabic/i.test(String(value)),
    };
    let { dialog, host } = await openChooser({ wordSoundsLanguage: 'Arabic' });
    await click(printButton(dialog, 'boxes'));
    for (const row of lastDoc().querySelectorAll('.ws-print-row')) {
      expect(row.getAttribute('dir')).toBe('rtl');
      expect(row.getAttribute('lang')).toBe('ar-SA');
    }
    await click(printButton(dialogOf(host), 'home'));
    expect(lastDoc().querySelector('.ws-print-words').getAttribute('dir')).toBe('rtl');
    unmountAll();
    ({ dialog } = await openChooser({ wordSoundsLanguage: 'Klingon' }));
    await click(printButton(dialog, 'cards'));
    const card = lastDoc().querySelector('.ws-print-card');
    expect(card.getAttribute('dir')).toBe('auto');
    expect(card.hasAttribute('lang')).toBe(false);
  });

  it('gives the page itself the app language and direction', async () => {
    document.documentElement.setAttribute('lang', 'he');
    const { dialog } = await openChooser();
    await click(printButton(dialog, 'home'));
    expect(lastDoc().documentElement.getAttribute('lang')).toBe('he');
    expect(lastDoc().documentElement.getAttribute('dir')).toBe('rtl');
    expect(lastDoc().querySelector('.ws-print-words').getAttribute('dir')).toBe('ltr');
  });
});

describe('when pop-ups are blocked', () => {
  it('says so in the dialog and a toast, and never prints the app', async () => {
    stubWindowOpen(null);
    const addToast = vi.fn();
    const { dialog } = await openChooser({ addToast });
    await click(printButton(dialog, 'cards'));
    const message = 'Printing is blocked here. Allow pop-ups for this page, then press Print again.';
    expect(addToast).toHaveBeenCalledWith(message, 'error');
    expect(dialog.querySelector('[role="status"]').textContent).toBe(message);
    expect(appPrint).not.toHaveBeenCalled();
    expect(dialog.isConnected, 'the chooser stays open').toBe(true);
  });

  it('waits for pictures to load before printing the new window', async () => {
    const img = new EventTarget();
    img.complete = false;
    fakeWindow.document.images = [img];
    const { dialog } = await openChooser();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      act(() => printButton(dialog, 'cards').click());
      expect(fakeWindow.print).not.toHaveBeenCalled();
      img.dispatchEvent(new Event('load'));
      expect(fakeWindow.print).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(3000);
      expect(fakeWindow.print).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('string registration', () => {
  it('registers every print key in allo_data (single quotes, double-brace params) and in ui_strings.js', () => {
    const src = readFileSync(DIR + '/word_sounds_module.js', 'utf8');
    const alloData = readFileSync(DIR + '/allo_data_source.jsx', 'utf8');
    const section = JSON.parse(readFileSync(DIR + '/ui_strings.js', 'utf8')).word_sounds || {};
    const keys = Object.fromEntries(Object.entries(section).map(([k, v]) => ['word_sounds.' + k, v]));
    const used = [...new Set(src.match(/word_sounds\.print_[a-z0-9_]+/g))];
    expect(used.length).toBeGreaterThan(20);
    for (const k of used) {
      const entry = alloData.match(new RegExp("'" + k.replace('.', '\\.') + "': '((?:[^'\\\\]|\\\\.)*)',"));
      expect(entry, k + ' in allo_data').toBeTruthy();
      expect(keys[k], k + ' in ui_strings.js').toBe(entry[1].replace(/\{\{(\w+)\}\}/g, '{$1}'));
    }
    const english = JSON.parse(readFileSync(REPO + '/ui_strings.js', 'utf8')).word_sounds;
    for (const reused of ['di_script_print_button', 'di_script_print_hint', 'di_script_print_blocked']) expect(english[reused], reused).toBeTruthy();
  });
});
