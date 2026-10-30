// Present & Export on classroom touch screens, and a remembered setup (2026-10-29).
// - Touch/pen on the card: tap reveals, tap again moves on; a sideways swipe moves
//   (mirrored right-to-left). A mouse keeps its buttons and keys.
// - A fresh launch starts from the teacher's last setup on this device; a launch that
//   brings its own options keeps them.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const coreSource = fs.readFileSync('word_practice_core.js', 'utf8');
const uiSource = fs.readFileSync('word_practice_ui.js', 'utf8');
let dom, win, ui;
const button = text => [...win.document.querySelectorAll('button')].find(node => node.textContent === text && !node.parentElement.closest('[hidden]'));
const field = label => [...win.document.querySelectorAll('label')].find(node => node.querySelector('span')?.textContent === label)?.querySelector('input,select,textarea');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const change = node => node.dispatchEvent(new win.Event('change', { bubbles: true }));
const stage = () => win.document.querySelector('.awp-stage');
const progress = () => win.document.querySelector('.awp-progress').textContent;
function pointer(target, type, x, y, pointerType = 'touch') {
  const event = new win.Event(type, { bubbles: true });
  Object.defineProperties(event, { clientX: { value: x }, clientY: { value: y }, pointerType: { value: pointerType }, isPrimary: { value: true } });
  target.dispatchEvent(event);
}
function gesture(target, [x1, y1], [x2, y2], pointerType) { pointer(target, 'pointerdown', x1, y1, pointerType); pointer(target, 'pointerup', x2, y2, pointerType); }
const WORDS = [{ word: 'leaf', definition: 'A flat green part of a plant.' }, { word: 'root', definition: 'The part under the ground.' }];

function boot(coarse = false) {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example' });
  win = dom.window;
  win.matchMedia = query => ({ matches: coarse && /coarse/.test(query), addEventListener() {}, removeEventListener() {} });
  win.eval(coreSource); win.eval(uiSource); ui = win.AlloModules.WordPractice;
}
async function present(context = { words: WORDS }, setup = {}) {
  ui.open(context);
  field('Practice activity').value = setup.mode || 'vocabulary';
  field('Repetitions per word').value = '1';
  field('Shuffle each repetition').checked = false;
  change(field('Practice activity'));
  button('Present').click(); await tick();
}
afterEach(() => { dom.window.close(); });

describe('touch on the presentation card', () => {
  beforeEach(() => boot());

  it('reveals with a tap, then moves on with the next tap', async () => {
    await present();
    expect(stage().textContent).not.toContain('A flat green part of a plant.');
    gesture(stage(), [200, 200], [203, 201]);
    expect(stage().textContent).toContain('A flat green part of a plant.');
    gesture(stage(), [200, 200], [200, 200]);
    expect(progress()).toBe('Card 2 of 2');
  });

  it('moves with a sideways swipe in either direction', async () => {
    await present();
    gesture(stage(), [300, 200], [180, 210]);
    expect(progress()).toBe('Card 2 of 2');
    gesture(stage(), [180, 200], [300, 190]);
    expect(progress()).toBe('Card 1 of 2');
  });

  it('mirrors swipes for a right-to-left interface', async () => {
    await present();
    win.document.querySelector('.awp-player').dir = 'rtl';
    gesture(stage(), [180, 200], [300, 200]);
    expect(progress()).toBe('Card 2 of 2');
  });

  it('ignores scrolling, slight drags, a mouse, and taps on the card\'s own buttons', async () => {
    await present();
    gesture(stage(), [200, 100], [230, 300]);
    gesture(stage(), [230, 200], [200, 205]);
    gesture(stage(), [200, 200], [200, 200], 'mouse');
    gesture(stage(), [300, 200], [100, 200], 'mouse');
    expect(progress()).toBe('Card 1 of 2');
    expect(stage().textContent).not.toContain('A flat green part of a plant.');
    win.document.querySelector('.awp-player').querySelector('.awp-card').appendChild(win.document.createElement('button'));
    gesture(stage().querySelector('button'), [200, 200], [200, 200]);
    expect(stage().textContent).not.toContain('A flat green part of a plant.');
  });

  it('treats a second finger as a pinch, not a tap', async () => {
    await present();
    pointer(stage(), 'pointerdown', 200, 200);
    const second = new win.Event('pointerdown', { bubbles: true });
    Object.defineProperties(second, { clientX: { value: 260 }, clientY: { value: 200 }, pointerType: { value: 'touch' }, isPrimary: { value: false } });
    stage().dispatchEvent(second);
    pointer(stage(), 'pointerup', 200, 200);
    expect(stage().textContent).not.toContain('A flat green part of a plant.');
    expect(progress()).toBe('Card 1 of 2');
  });

  it('keeps vertical scrolling for long cards', () => {
    expect(uiSource).toContain('.awp-stage{touch-action:pan-y}');
  });
});

describe('touch help', () => {
  it('appears only on a touch device', async () => {
    boot(true);
    await present();
    expect(win.document.querySelector('.awp-touch-help').textContent).toContain('tap the card to reveal');
    dom.window.close();
    boot(false);
    await present();
    expect(win.document.querySelector('.awp-touch-help')).toBeNull();
  });
});

describe('remembered setup', () => {
  beforeEach(() => boot());
  function reopen(context = { words: WORDS }) {
    win.document.querySelector('.awp-overlay')?.remove();
    ui.open(context);
  }

  it('starts a fresh launch from the teacher\'s last choices', () => {
    ui.open({ words: WORDS });
    field('Practice activity').value = 'vocabulary'; change(field('Practice activity'));
    field('Repetitions per word').value = '2'; change(field('Repetitions per word'));
    field('Card style').value = 'cream'; change(field('Card style'));
    field('Shuffle each repetition').checked = false; change(field('Shuffle each repetition'));
    reopen();
    expect(field('Practice activity').value).toBe('vocabulary');
    expect(field('Repetitions per word').value).toBe('2');
    expect(field('Card style').value).toBe('cream');
    expect(field('Shuffle each repetition').checked).toBe(false);
  });

  it('keeps the settings a launch brings with it', () => {
    ui.open({ words: WORDS });
    field('Practice activity').value = 'vocabulary'; change(field('Practice activity'));
    reopen({ words: WORDS, options: { mode: 'blend', repetitions: 4 } });
    expect(field('Practice activity').value).toBe('blend');
    expect(field('Repetitions per word').value).toBe('4');
  });

  it('never reopens a list onto Finish the Sentence without prepared sentences', () => {
    const boards = [{ word: 'ship', sentenceActivity: { prompt: 'The ____ sails.', choices: ['ship', 'rain'], answer: 'ship' } }, 'rain'];
    ui.open({ words: boards });
    field('Practice activity').value = 'sentence'; change(field('Practice activity'));
    field('Repetitions per word').value = '2'; change(field('Repetitions per word'));
    reopen({ words: WORDS });
    expect(field('Practice activity').value).toBe('popup');
    expect(field('Repetitions per word').value).toBe('2');
    reopen({ words: boards });
    expect(field('Practice activity').value).toBe('sentence');
  });

  it('falls back to the defaults when the saved setup is damaged', () => {
    win.localStorage.setItem('alloflow_word_practice_setup', '{not json');
    ui.open({ words: WORDS });
    expect(field('Practice activity').value).toBe('popup');
    win.localStorage.setItem('alloflow_word_practice_setup', JSON.stringify({ mode: 'nonsense', repetitions: 99, cardTheme: 'neon' }));
    reopen();
    expect(field('Practice activity').value).toBe('popup');
    expect(field('Repetitions per word').value).toBe('10');
    expect(field('Card style').value).toBe('paper');
  });
});
