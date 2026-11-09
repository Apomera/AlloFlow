// Word Sounds Present refinements (2026-11-09): the offline file finds phoneme clips under every bank
// name, converts sounds to WAV, keeps only data: pictures, opens on a Begin screen, mixes the order on
// Start again, has number keys, a think timer, full screen, text size and a number picker, and labels its
// buttons in the interface language. In the app: Start again mixes the order, 1-9 and P keys, and a
// "Pick a student" control whose pasted names never leave the screen. In Print materials: "Edit in Page
// Designer" sends the same items as the printed worksheet or review sheet.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadModal, mount, unmountAll, presentButton, presenter, click, settle, key, act, makeHatItem, played, fullscreenGrants, wait } from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';

let blobs;
const BANK = '__ALLO_PHONEME_AUDIO_BANK';
let savedBank;
beforeAll(() => { loadModal(); fullscreenGrants(); });
beforeEach(() => {
  blobs = [];
  savedBank = window[BANK];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { blobs.push(blob); return 'blob:offline'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  unmountAll(); vi.restoreAllMocks();
  window[BANK] = savedBank;
  delete window.AlloWordSoundsTakeHome;
  delete window.__alloOpenWordSoundsWorksheetInStudio;
  document.documentElement.removeAttribute('lang');
  try { window.localStorage.removeItem('allo_ws_present_picker_n'); } catch (_) {}
});

const readBlob = (blob) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsText(blob); });
const dataOf = (html) => JSON.parse(new DOMParser().parseFromString(html, 'text/html').getElementById('ws-data').textContent);
const plain = (word, phonemes, extra = {}) => ({ id: 'w-' + word, term: word, word, targetWord: word, displayWord: word, phonemes, phonemeCount: phonemes.length, ...extra });
const teacher = { isTeacherMode: true };

async function offlineFile(words, extra = {}) {
  const { host } = await mount({ ...teacher, words, ...extra });
  await click(presentButton(host));
  await settle(40);
  const p = presenter(host);
  await click(p.querySelector('[aria-controls="ws-present-drawer"]'));
  await click(p.querySelector('[data-present-offline] button'));
  for (let n = 0; n < 40 && !blobs.length; n++) await settle(20);
  expect(blobs.length, 'a file was made').toBe(1);
  await settle(10);
  const status = p.querySelector('[data-present-offline] [role="status"]');
  return { host, html: await readBlob(blobs[0]), note: status ? status.textContent : '' };
}

// The offline file, run as a page of its own.
function openPlayer(html, setup) {
  const plays = [], spoken = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://offline.test/', pretendToBeVisual: true,
    beforeParse(win) {
      win.Audio = class { constructor(src) { this.src = src || ''; } play() { plays.push(this.src); setTimeout(() => this.onended && this.onended(), 5); return Promise.resolve(); } pause() {} };
      win.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      win.speechSynthesis = { speak: (u) => { spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 5); }, cancel() {} };
      if (setup) setup(win);
    },
  });
  const doc = dom.window.document;
  const press = (init) => doc.body.dispatchEvent(new dom.window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  const pickActivity = (id) => {
    const data = JSON.parse(doc.getElementById('ws-data').textContent);
    const select = doc.getElementById('act');
    select.value = String(data.activities.findIndex((a) => a.id === id));
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  };
  return { dom, win: dom.window, doc, plays, spoken, press, pickActivity, $: (id) => doc.getElementById(id) };
}

describe('offline file: sounds', () => {
  it('finds phoneme clips under every name the game tries (/igh/ is ie, /c/ is k, /a_e/ is ay, /tch/ is ch)', async () => {
    const clip = (name) => 'data:audio/wav;base64,' + Buffer.from(name).toString('base64');
    window[BANK] = { n: clip('n'), ie: clip('ie'), t: clip('t'), k: clip('k'), ay: clip('ay'), ch: clip('ch'), m: clip('m'), a: clip('a') };
    const { html } = await offlineFile([plain('night', ['n', 'igh', 't']), plain('cake', ['c', 'a_e', 'k']), plain('match', ['m', 'a', 'tch'])]);
    const data = dataOf(html);
    const seg = data.activities.find((a) => a.id === 'segmentation');
    const voiced = seg.items.map((it) => it.answer.audio.map((s) => s.text + '=' + (s.clip ? Buffer.from(data.clips[s.clip].split(',')[1], 'base64').toString() : 'none')).join(' '));
    expect(voiced).toEqual(['/n/=n /igh/=ie /t/=t', '/c/=k /a_e/=ay /k/=k', '/m/=m /a/=a /tch/=ch']);
  });

  it('converts the clips to WAV with the take-home converter, and says when some could not be', async () => {
    const portableAudio = vi.fn(async (lesson) => {
      const ids = Object.keys(lesson.audio);
      ids.forEach((id, i) => { if (i) lesson.audio[id] = 'data:audio/wav;base64,V0FW'; });
      return { converted: ids.length - 1, kept: 0, failed: ids.slice(0, 1) };
    });
    window.AlloWordSoundsTakeHome = { portableAudio };
    // Distinct recordings (the pack fixture's word clips are all one recording).
    window[BANK] = Object.fromEntries(['k', 'a', 't', 'h'].map((p) => [p, 'data:audio/webm;base64,' + Buffer.from(p).toString('base64')]));
    const { html, note } = await offlineFile([makePackItem(), makeHatItem()]);
    expect(portableAudio).toHaveBeenCalledTimes(1);
    const clips = Object.values(dataOf(html).clips);
    expect(clips.length).toBeGreaterThan(3);
    expect(clips.filter((c) => c === 'data:audio/wav;base64,V0FW')).toHaveLength(clips.length - 1);
    expect(note).toMatch(/^Downloaded word-sounds-present-cat-hat\.html .* 1 sound\(s\) could not be converted and may not play on iPads\.$/);
  });

  it('without the converter the clips stay as they are', async () => {
    const { html } = await offlineFile([makePackItem()]);
    expect(Object.values(dataOf(html).clips).every((c) => /^data:audio\/webm/.test(c))).toBe(true);
  });
});

describe('offline file: pictures', () => {
  it('keeps data: pictures, copies a readable blob: picture in, and leaves out web pictures it cannot read', async () => {
    const png = 'data:image/png;base64,QUJD';
    vi.stubGlobal('fetch', vi.fn(async (url) => (String(url).startsWith('blob:')
      ? { ok: true, blob: async () => new Blob([Uint8Array.from([137, 80, 78, 71])], { type: 'image/png' }) }
      : Promise.reject(new Error('offline')))));
    const words = [plain('cat', ['k', 'a', 't'], { image: png }), plain('dog', ['d', 'o', 'g'], { image: 'blob:https://app/1' }), plain('sun', ['s', 'u', 'n'], { image: 'https://example.com/sun.png' })];
    const { html, note } = await offlineFile(words);
    vi.unstubAllGlobals();
    const data = dataOf(html);
    expect(Object.values(data.images).every((v) => /^data:image\//.test(v))).toBe(true);
    expect(html).not.toMatch(/blob:|https?:\/\//);
    const seg = data.activities.find((a) => a.id === 'segmentation').items;
    expect(data.images[seg[0].answer.image]).toBe(png);
    expect(data.images[seg[1].answer.image]).toMatch(/^data:image\/png;base64,/);
    expect(seg[2].answer.image, 'the web picture is left out').toBeNull();
    expect(note).toMatch(/Pictures left out because they could not be added: 1\. Those items show no picture\./);
  });
});

describe('offline file: the font', () => {
  const andika = { id: 'andika', label: 'Andika (SIL)', family: "'Andika', sans-serif", googleFont: 'Andika:ital,wght@0,400;0,700;1,400;1,700' };
  let savedFonts;
  beforeEach(() => { savedFonts = window.FONT_OPTIONS; window.FONT_OPTIONS = [andika]; window.localStorage.setItem('allo_ws_present_look', JSON.stringify({ font: 'andika' })); });
  afterEach(() => { window.FONT_OPTIONS = savedFonts; window.localStorage.removeItem('allo_ws_present_look'); vi.unstubAllGlobals(); });

  it('embeds the chosen font with only the letters the file shows', async () => {
    const fetched = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      fetched.push(String(url));
      if (String(url).startsWith('https://fonts.googleapis.com/')) return { ok: true, text: async () => "@font-face{font-family:'Andika';font-weight:400;src:url(https://fonts.gstatic.com/l/font?kit=abc) format('woff2');}" };
      return { ok: true, headers: { get: () => 'font/woff2' }, arrayBuffer: async () => Uint8Array.from([119, 79, 70, 50]).buffer };
    }));
    const { html, note } = await offlineFile([makePackItem()]);
    expect(fetched[0]).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=Andika:wght@400;700&display=swap&text=/);
    expect(decodeURIComponent(fetched[0].split('&text=')[1])).toContain('c');
    const css = new DOMParser().parseFromString(html, 'text/html').querySelector('style').textContent;
    expect(css).toContain("@font-face{font-family:'Andika';font-weight:400;src:url(data:font/woff2;base64,d09GMg==) format('woff2');}");
    expect(css).toContain("font:600 18px/1.4 'Andika', sans-serif");
    expect(html).not.toMatch(/https?:\/\//);
    expect(note).not.toMatch(/system font/);
  });

  it('says the file uses a system font when the font cannot be fetched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('blocked'))));
    const { html, note } = await offlineFile([makePackItem()]);
    expect(html).not.toContain('@font-face');
    expect(note).toMatch(/The file uses a system font, because Andika \(SIL\) could not be added to it\.$/);
  });
});

describe('offline file: the player', () => {
  it('opens on a Begin screen and plays nothing until Begin is pressed', async () => {
    const { html } = await offlineFile([makePackItem(), makeHatItem()]);
    const p = openPlayer(html);
    await wait(30);
    expect(p.$('begin').textContent).toBe('Begin');
    expect(p.doc.querySelector('.begin h1').textContent).toBe('Word Sounds: cat, hat');
    expect(p.doc.body.classList.contains('pre')).toBe(true);
    p.press({ key: 'ArrowRight', code: 'ArrowRight' });
    await wait(30);
    expect(p.plays.concat(p.spoken), 'no sound before Begin').toEqual([]);
    p.$('begin').click();
    await wait(30);
    expect(p.plays[0], 'Begin unlocks the audio element first').toMatch(/^data:audio\/wav;base64,/);
    const data = dataOf(html);
    expect(p.plays[1]).toBe(data.clips[data.activities[0].items[0].audio[0].clip]);
    expect(p.doc.querySelector('main h2').textContent).toBe(data.activities[0].items[0].prompt);
    expect(p.doc.body.classList.contains('pre')).toBe(false);
  });

  it('Start again mixes the items and their choices; the first run keeps the file order; answers are checked by label', async () => {
    const { html } = await offlineFile([makePackItem(), makeHatItem()]);
    const p = openPlayer(html, (win) => { win.Math.random = () => 0; });
    p.pickActivity('rhyming');
    p.$('begin').click();
    await wait(20);
    const shown = () => p.doc.querySelector('main h2').textContent + ' [' + [...p.doc.querySelectorAll('.choice')].map((b) => b.textContent).join(',') + ']';
    const first = shown();
    expect(first).toBe('Which word rhymes with cat? [hat,dog,sun,bed]');
    p.$('next').click(); p.$('next').click();
    await wait(10);
    p.doc.querySelector('[data-again]').click();
    await wait(10);
    expect(shown()).not.toBe(first);
    expect(shown()).toMatch(/^Which word rhymes with hat\?/);
    p.press({ key: 'r', code: 'KeyR' });
    expect(p.doc.querySelector('.choice.right').textContent).toBe('cat ✓');
  });

  it('1-9 pick choices by key position, R reveals, P plays the prompt again; not with a modifier or in a field', async () => {
    const { html } = await offlineFile([makePackItem(), makeHatItem()]);
    const p = openPlayer(html);
    p.pickActivity('rhyming');
    p.$('begin').click();
    await wait(30);
    const pressed = () => [...p.doc.querySelectorAll('.choice')].map((b) => b.getAttribute('aria-pressed')).join(',');
    p.press({ key: 'ب', code: 'Digit2' });
    expect(pressed(), 'a non-Latin layout still picks by key position').toBe('false,true,false,false');
    p.press({ key: '3', code: 'Numpad3' });
    expect(pressed()).toBe('false,false,true,false');
    p.press({ key: '1', code: 'Digit1', ctrlKey: true });
    p.press({ key: '!', code: 'Digit1', shiftKey: true });
    expect(pressed()).toBe('false,false,true,false');
    p.$('pickn').dispatchEvent(new p.win.KeyboardEvent('keydown', { key: '4', code: 'Digit4', bubbles: true }));
    expect(pressed(), 'typing in the picker field picks nothing').toBe('false,false,true,false');
    const before = p.plays.length;
    p.press({ key: 'p', code: 'KeyP' });
    await wait(20);
    expect(p.plays.length).toBeGreaterThan(before);
    p.press({ key: 'PageDown', code: 'PageDown' });
    expect(p.doc.querySelector('main h2').textContent).toBe('Which word rhymes with hat?');
    p.press({ key: 'PageUp', code: 'PageUp' });
    expect(p.doc.querySelector('main h2').textContent).toBe('Which word rhymes with cat?');
  });

  it('think timer counts down after the prompt, with the in-app durations; text size is remembered; full screen only where it exists', async () => {
    const { html } = await offlineFile([makePackItem(), makeHatItem()]);
    const p = openPlayer(html, (win) => { win.localStorage.setItem('allo_ws_offline_ps', '1.5'); });
    expect([...p.$('think').options].map((o) => o.value + '=' + o.textContent)).toEqual(['0=Off', '3=3 sec', '5=5 sec', '8=8 sec']);
    expect(p.$('think').value).toBe('5');
    expect(p.doc.documentElement.style.getPropertyValue('--ws-ps')).toBe('1.5');
    p.$('larger').click();
    expect(p.doc.documentElement.style.getPropertyValue('--ws-ps')).toBe('1.75');
    expect(p.win.localStorage.getItem('allo_ws_offline_ps')).toBe('1.75');
    expect(p.doc.querySelector('style').textContent).toMatch(/calc\(clamp\(2rem,4\.4vw,3\.5rem\) \* var\(--ws-ps,1\)\)/);
    expect(p.$('full').hidden, 'no Fullscreen API here (as on iPhone)').toBe(true);
    p.$('begin').click();
    await wait(80);
    expect(p.$('timer').hidden).toBe(false);
    expect(p.$('timer').getAttribute('role')).toBe('timer');
    expect(p.$('timer').getAttribute('aria-label')).toBe('Think time: 5 seconds left');
    p.$('reveal').click();
    expect(p.$('timer').hidden, 'Reveal stops the timer').toBe(true);
    const q = openPlayer(html, (win) => { win.HTMLElement.prototype.requestFullscreen = vi.fn(() => Promise.resolve()); });
    expect(q.$('full').hidden).toBe(false);
    expect(q.$('full').textContent).toBe('Full screen');
    q.$('full').click();
    expect(q.doc.documentElement.requestFullscreen).toHaveBeenCalled();
  });

  it('the number picker gives everyone a turn before anyone repeats', async () => {
    const { html } = await offlineFile([makePackItem()]);
    const p = openPlayer(html);
    expect(p.$('pickout').getAttribute('aria-live')).toBe('polite');
    p.$('pickbtn').click();
    expect(p.$('picker').hidden).toBe(false);
    p.$('pickn').value = '4';
    p.$('pickn').dispatchEvent(new p.win.Event('change'));
    const got = [];
    for (let n = 0; n < 4; n++) { p.$('pick').click(); got.push(p.$('pickout').textContent); }
    expect([...got].sort()).toEqual(['Number 1', 'Number 2', 'Number 3', 'Number 4']);
    expect(p.$('pickleft').textContent).toBe('Everyone has had a turn. The next pick starts a new round.');
    p.$('pick').click();
    expect(p.$('pickleft').textContent).toBe('3 left this round');
    expect(p.doc.querySelector('#picker textarea'), 'no names in the offline file').toBeNull();
  });

  it('labels its buttons in the interface language while the lesson keeps its own', async () => {
    document.documentElement.lang = 'fr';
    const { html } = await offlineFile([makePackItem()]);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.documentElement.getAttribute('lang')).toMatch(/^en/);
    expect(doc.querySelector('header').getAttribute('lang')).toBe('fr');
    expect(doc.querySelector('footer').getAttribute('lang')).toBe('fr');
    expect(doc.getElementById('picker').getAttribute('lang')).toBe('fr');
    const p = openPlayer(html);
    expect(p.doc.querySelector('.begin').getAttribute('lang')).toBe('fr');
  });
});

describe('in the app', () => {
  const rhyming = async () => {
    const { host } = await mount({ ...teacher, words: [makePackItem(), makeHatItem()], activity: 'rhyming' });
    await click(presentButton(host));
    await settle(40);
    return { host, p: presenter(host) };
  };
  const shown = (p) => p.querySelector('h2').textContent + ' [' + [...p.querySelectorAll('[data-present-choice]')].map((b) => b.getAttribute('data-present-choice')).join(',') + ']';

  it('Start again mixes the items and their choices; the first run is the list order; the right answer is found by its label', async () => {
    const { p } = await rhyming();
    expect(shown(p)).toBe('Which word rhymes with cat? [hat,dog,sun,bed]');
    await key(p, 'ArrowRight'); await key(p, 'ArrowRight');
    expect(p.querySelector('[data-present-finished]')).toBeTruthy();
    vi.spyOn(Math, 'random').mockReturnValue(0.37);
    await click(p.querySelector('[data-present-restart]'));
    await settle(10);
    const again = [shown(p)];
    await key(p, 'ArrowRight');
    again.push(shown(p));
    expect(again).not.toEqual(['Which word rhymes with cat? [hat,dog,sun,bed]', 'Which word rhymes with hat? [cat,dog,sun,bed]']);
    expect(again.map((s) => s.split(' [')[0]).sort()).toEqual(['Which word rhymes with cat?', 'Which word rhymes with hat?']);
    await key(p, 'r');
    const right = p.querySelector('.ws-p-right');
    expect(right.getAttribute('data-present-choice')).toBe(p.querySelector('h2').textContent.includes('hat?') ? 'cat' : 'hat');
  });

  it('1-9 pick a choice by key position, P plays the prompt; not with a modifier or while typing', async () => {
    const { p } = await rhyming();
    const pressed = () => [...p.querySelectorAll('[data-present-choice]')].map((b) => b.getAttribute('aria-pressed')).join(',');
    await key(p, 'ب', { code: 'Digit2' });
    expect(pressed()).toBe('false,true,false,false');
    await key(p, '4', { code: 'Numpad4' });
    expect(pressed()).toBe('false,false,false,true');
    await key(p, '1', { code: 'Digit1', altKey: true });
    expect(pressed()).toBe('false,false,false,true');
    await key(p, '9', { code: 'Digit9' });
    expect(pressed(), 'no ninth choice: nothing changes').toBe('false,false,false,true');
    const before = played.length;
    await key(p, 'p', { code: 'KeyP' });
    await settle(30);
    expect(played.length).toBeGreaterThan(before);
    expect(p.textContent).toContain('1–9: pick a choice · P: play again');
  });

  it('Pick a student: numbers with no repeats until everyone is picked; pasted names are never saved or put in the offline file', async () => {
    const { p } = await rhyming();
    await click(p.querySelector('[data-present-picker-open]'));
    const picker = p.querySelector('[data-present-picker]');
    expect(picker.hidden).toBe(false);
    expect(picker.querySelector('[data-present-picked]').getAttribute('aria-live')).toBe('polite');
    const setValue = (el, value) => act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await setValue(picker.querySelector('[data-present-picker-count]'), '3');
    expect(window.localStorage.getItem('allo_ws_present_picker_n')).toBe('3');
    const got = [];
    for (let n = 0; n < 3; n++) { await click(picker.querySelector('[data-present-pick]')); got.push(picker.querySelector('[data-present-picked]').textContent); }
    expect([...got].sort()).toEqual(['Number 1', 'Number 2', 'Number 3']);
    expect(picker.querySelector('[data-present-picker-left]').textContent).toBe('Everyone has had a turn. The next pick starts a new round.');
    await click(picker.querySelector('[data-present-picker-mode="names"]'));
    await setValue(picker.querySelector('[data-present-picker-names]'), 'Ada Lovelace\nBo\nCy');
    const names = [];
    for (let n = 0; n < 3; n++) { await click(picker.querySelector('[data-present-pick]')); names.push(picker.querySelector('[data-present-picked]').textContent); }
    expect([...names].sort()).toEqual(['Ada Lovelace', 'Bo', 'Cy']);
    // Esc closes the picker, not the presentation; the names stay while presenting.
    await key(picker.querySelector('[data-present-pick]'), 'Escape');
    expect(presenter(document.body)).toBeTruthy();
    expect(picker.hidden).toBe(true);
    for (let k = 0; k < window.localStorage.length; k++) expect(window.localStorage.getItem(window.localStorage.key(k))).not.toContain('Lovelace');
    await click(p.querySelector('[aria-controls="ws-present-drawer"]'));
    await click(p.querySelector('[data-present-offline] button'));
    for (let n = 0; n < 40 && !blobs.length; n++) await settle(20);
    const html = await readBlob(blobs[0]);
    expect(html).not.toContain('Lovelace');
    expect(html).not.toContain('Ada');
    await click(p.querySelector('[data-present-picker-open]'));
    expect(p.querySelector('[data-present-picker-names]').value, 'names last while presenting').toBe('Ada Lovelace\nBo\nCy');
  });
});

describe('Edit in Page Designer', () => {
  let written;
  beforeEach(() => {
    written = [];
    vi.spyOn(window, 'open').mockImplementation(() => ({ document: { open: vi.fn(), write: (html) => written.push(html), close: vi.fn(), images: [] }, focus: vi.fn(), print: vi.fn() }));
  });
  const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
  const choose = (select, value) => act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  async function dialog(words = [makePackItem(), makeHatItem()]) {
    const { host } = await mount({ ...teacher, words });
    await click(host.querySelector('[data-ws-share-open]'));
    await click(host.querySelector('[data-ws-print-open]'));
    await settle(10);
    return host.querySelector('[data-ws-print-dialog]');
  }
  const printedItems = (doc) => [...doc.querySelectorAll('.ws-ws-item')].map((li) => li.querySelector('.ws-ws-prompt').textContent + ' [' + [...li.querySelectorAll('.ws-ws-choice')].map((c) => c.textContent).join(',') + ']');
  const sentItems = (resource) => resource.sections.flatMap((s) => s.items).map((it) => it.prompt + ' [' + (it.choices || []).map((c) => c.label).join(',') + ']');

  it('is hidden when the host has no Page Designer', async () => {
    const d = await dialog();
    expect(d.querySelector('[data-ws-studio]')).toBeNull();
  });

  it('sends the same items, order, choices and key as the printed worksheet (Version B, How many, Easier)', async () => {
    const open = vi.fn(() => true);
    window.__alloOpenWordSoundsWorksheetInStudio = open;
    const words = ['cat', 'fish', 'stamp', 'ship', 'cup', 'hat', 'map', 'dog'].map((w, i) => ({ ...makePackItem(), id: 10 + i, term: w, word: w, targetWord: w, displayWord: w,
      activityItems: { rhyming: { options: [w === 'cat' ? 'hat' : 'cat', 'dog', 'sun', 'bed'].filter((o, k, a) => a.indexOf(o) === k && o !== w).concat(w === 'dog' ? ['log'] : []), answer: w === 'cat' ? 'hat' : 'cat' } } }));
    const d = await dialog(words);
    await choose(d.querySelector('[data-ws-print-activity]'), 'rhyming');
    await choose(d.querySelector('[data-ws-print-version]'), 'B');
    await choose(d.querySelector('[data-ws-print-count]'), '5');
    await click(d.querySelector('[data-ws-print-easier]'));
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    await click(d.querySelector('[data-ws-studio="worksheet"]'));
    expect(open).toHaveBeenCalledTimes(1);
    const resource = open.mock.calls[0][0];
    const doc = parse(written[written.length - 1]);
    expect(sentItems(resource)).toEqual(printedItems(doc));
    expect(sentItems(resource)).toHaveLength(5);
    expect(resource.sections[0].items.every((it) => it.choices.length === 2)).toBe(true);
    expect(resource.key.map((k) => k.n + '. ' + k.text)).toEqual([...doc.querySelectorAll('.ws-ws-key li')].map((li, i) => (i + 1) + '. ' + li.textContent));
    expect(resource.title).toMatch(/ worksheet · Form B$/);
    expect(resource.keyTitle).toMatch(/: Answer key · Form B$/);
    expect(resource.pageSize).toMatch(/^(a4|letter)-portrait$/);
    expect(resource.lang).toMatch(/^en/);
    expect(JSON.parse(JSON.stringify(resource)), 'plain JSON').toEqual(resource);
    expect(d.querySelector('[role="status"]').textContent).toMatch(/opened in Page Designer\.$/);
  });

  it('sends only data: pictures, with the neutral alt where the printout uses one, and words to say when the sheet has that page', async () => {
    const open = vi.fn(() => true);
    window.__alloOpenWordSoundsWorksheetInStudio = open;
    const cat = makePackItem();
    const hat = { ...makeHatItem(), image: 'https://example.com/hat.png' };
    const d = await dialog([cat, hat]);
    await choose(d.querySelector('[data-ws-print-activity]'), 'isolation');
    await choose(d.querySelector('[data-ws-print-key]'), 'separate');
    await click(d.querySelector('[data-ws-studio="worksheet"]'));
    const resource = open.mock.calls[0][0];
    const [first, second] = resource.sections[0].items;
    expect(first.image).toMatch(/^data:image\/png;base64,/);
    expect(first.imageAlt).toBe('Picture 1');
    expect(first.word, 'no alt fallback that spells the answer').toBeUndefined();
    expect(second.image).toBeUndefined();
    expect(resource.wordsToSay).toEqual(['1. cat', '2. hat']);
    await choose(d.querySelector('[data-ws-print-key]'), 'last');
    await click(d.querySelector('[data-ws-studio="worksheet"]'));
    expect(open.mock.calls[1][0].wordsToSay, 'the key on the last page has no separate words-to-say page').toBeUndefined();
    await choose(d.querySelector('[data-ws-print-key]'), 'none');
    await click(d.querySelector('[data-ws-studio="worksheet"]'));
    expect(open.mock.calls[2][0].key).toEqual([]);
  });

  it('review sheet: the same sections as the printout; a busy Page Designer gets a short note', async () => {
    const open = vi.fn(() => true);
    window.__alloOpenWordSoundsWorksheetInStudio = open;
    const d = await dialog();
    for (const id of ['rhyming', 'spelling_bee']) await click(d.querySelector('[data-ws-print-review="' + id + '"]'));
    await click(d.querySelector('[data-ws-print="review"]'));
    await click(d.querySelector('[data-ws-studio="review"]'));
    const resource = open.mock.calls[0][0];
    const doc = parse(written[written.length - 1]);
    expect(resource.sections.map((s) => s.heading)).toEqual([...doc.querySelectorAll('.ws-ws-section h2')].map((h) => h.textContent));
    expect(resource.sections.map((s) => s.directions)).toEqual([...doc.querySelectorAll('.ws-ws-section > p')].map((p) => p.textContent));
    expect(sentItems(resource)).toEqual(printedItems(doc));
    expect(resource.sections.flatMap((s) => s.items).filter((it) => it.display && it.display.kind === 'letters').map((it) => it.display.count), 'hat has no spelling board of its own').toEqual([3]);
    open.mockReturnValue(false);
    await click(d.querySelector('[data-ws-studio="review"]'));
    expect(d.querySelector('[role="status"]').textContent).toBe('Close Page Designer first, then try again.');
  });
});
