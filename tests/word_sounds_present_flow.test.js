// Word Sounds "Present to class" (2026-11-07): every activity projects, the end of an activity moves on in
// lesson-plan order, and the teacher sets the space between sounds and one speed for every clip.
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SOURCE_PATH, loadModal, mount, unmountAll, presentButton, presenter, click, settle, key, buttonNamed, fullscreenGrants, makeHatItem, act, wait, played,
} from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';

const SOURCE = readFileSync(SOURCE_PATH, 'utf8');
const words = () => [makePackItem(), makeHatItem()];
const drawerToggle = (p) => p.querySelector('[aria-controls="ws-present-drawer"]');
const openDrawer = async (p) => { if (drawerToggle(p).getAttribute('aria-expanded') !== 'true') await click(drawerToggle(p)); return p.querySelector('#ws-present-drawer'); };
const itemLabel = (p) => (p.textContent.match(/Item \d+ of \d+/) || [''])[0];
const prompt = (p) => (p.querySelector('h2') || {}).textContent;
async function present(extra = {}) {
  const { host } = await mount({ isTeacherMode: true, words: words(), ...extra });
  await click(presentButton(host));
  await settle(40);
  return presenter(host);
}
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
const { wsPresentItems } = new Function('WS_CORE', 'React', 'window', 'document',
  SOURCE.slice(SOURCE.indexOf('    const WS_PRESENT_ACTIVITIES ='), SOURCE.indexOf('    const wsPresentKeyAction =')) +
  '\nreturn { wsPresentItems };')(core, {}, globalThis.window, globalThis.document);

beforeAll(() => { loadModal(); });
beforeEach(() => { fullscreenGrants(); try { window.localStorage.removeItem('allo_ws_present_look'); } catch (_) {} });
afterEach(() => unmountAll());

describe('the activities that used to be left out', () => {
  const cat = makePackItem();
  it('Spelling Bee: hear the word, empty letter boxes that fill on reveal', () => {
    const [item] = wsPresentItems('spelling_bee', [cat]);
    expect(item.display).toEqual({ kind: 'letters', count: 3 });
    expect(item.audio).toEqual([{ text: 'cat' }]);
    expect(item.answer.letters).toEqual(['c', 'a', 't']);
  });
  it('Word Scramble: shows the prepared letters, never already solved, and does not say the word first', () => {
    const [item] = wsPresentItems('word_scramble', [cat]);
    expect(item.display.tiles).toEqual(['t', 'c', 'a']);
    expect(item.audio).toEqual([]);
    const solved = { ...cat, activityItems: { word_scramble: { letters: ['c', 'a', 't'], answer: 'cat' } } };
    expect(wsPresentItems('word_scramble', [solved])[0].display.tiles.join('')).not.toBe('cat');
    const wrong = { ...cat, activityItems: { word_scramble: { letters: ['d', 'o', 'g'], answer: 'cat' } } };
    expect(wsPresentItems('word_scramble', [wrong]), 'letters that do not spell the word').toEqual([]);
  });
  it('Missing Letter: the blank is where the board says, and a board that disagrees with the word is skipped', () => {
    const [item] = wsPresentItems('missing_letter', [cat]);
    expect(item.display).toMatchObject({ kind: 'blank_word', letters: ['c', 'a', 't'], hidden: 1 });
    expect(item.correct).toEqual(['a']);
    const stale = { ...cat, activityItems: { missing_letter: { hiddenIndex: 0, correctLetter: 'b', options: ['b', 'c'] } } };
    expect(wsPresentItems('missing_letter', [stale])).toEqual([]);
  });
  it('Sight & Spell: pick the right spelling, no spoken misspellings', () => {
    const [item] = wsPresentItems('orthography', [cat]);
    expect(item.correct).toEqual(['cat']);
    expect(item.choices.map((c) => c.value)).toEqual(['cat', 'kat', 'catt', 'cta']);
    expect(item.choices.every((c) => c.hear === null)).toBe(true);
  });
  it('Sound Mapping: each sound over a box its letters fill on reveal; a spelling that does not match is skipped', () => {
    const [item] = wsPresentItems('mapping', [cat]);
    expect(item.display).toEqual({ kind: 'map', sounds: ['k', 'a', 't'], letters: ['c', 'a', 't'] });
    const off = { ...cat, activityItems: { mapping: { graphemes: ['c', 'a', 'p'] } }, graphemes: ['c', 'a', 'p'] };
    expect(wsPresentItems('mapping', [off])).toEqual([]);
  });
  it('Letter Trace becomes write-it-in-the-air with the big letter, never a letter from another word', () => {
    const [item] = wsPresentItems('letter_tracing', [cat]);
    expect(item.display).toEqual({ kind: 'word', text: 'c' });
    expect(item.prompt.params).toEqual({ letter: 'c' });
    expect(wsPresentItems('letter_tracing', [makeHatItem()]), 'hat carries cat\'s board').toEqual([]);
  });
  it('Picture the Sentence needs every picture, or it is not offered', () => {
    const board = { sentence: 'The cat sat on a mat.', sequence: ['cat', 'mat'], extras: ['dog'] };
    const entry = { ...cat, activityItems: { sentence_match: board } };
    const images = { cat: 'data:image/png;base64,AA', mat: 'data:image/png;base64,AA', dog: 'data:image/png;base64,AA' };
    const [item] = wsPresentItems('sentence_match', [entry], { images });
    expect(item.multi).toBe(true);
    expect(item.correct).toEqual(['cat', 'mat']);
    expect(item.choices.map((c) => c.value).sort()).toEqual(['cat', 'dog', 'mat']);
    expect(wsPresentItems('sentence_match', [entry], { images: { cat: images.cat, mat: images.mat } })).toEqual([]);
  });
});

describe('on screen', () => {
  it('Spelling Bee boxes fill with letters on reveal, Missing Letter fills its blank', async () => {
    const p = await present();
    await click((await openDrawer(p)).querySelector('[data-present-activity="spelling_bee"]'));
    await click(drawerToggle(p));
    expect(prompt(p)).toBe('Listen, then spell the word.');
    expect(p.querySelector('.ws-p-item').textContent).not.toContain('cat');
    await key(p, 'r');
    expect([...p.querySelectorAll('.ws-present-box')].slice(0, 3).map((b) => b.textContent)).toEqual(['c', 'a', 't']);
    await click((await openDrawer(p)).querySelector('[data-present-activity="missing_letter"]'));
    await click(drawerToggle(p));
    expect(p.querySelector('.ws-present-word').textContent).toBe('c_t');
    await key(p, 'r');
    expect(p.querySelector('.ws-present-word').textContent).toBe('cat');
  });
});

describe('moving between activities', () => {
  it('after the last item an end screen offers the next activity in lesson-plan order', async () => {
    const p = await present({ activity: 'rhyming', initialActivitySequence: ['rhyming', 'spelling_bee', 'isolation'] });
    await key(p, 'ArrowRight');
    expect(itemLabel(p)).toBe('Item 2 of 2');
    await key(p, 'ArrowRight');
    const done = p.querySelector('[data-present-finished]');
    expect(done.textContent).toContain('Rhyme Time is done.');
    expect(done.querySelector('[data-present-next-activity]').getAttribute('data-present-next-activity')).toBe('spelling_bee');
    expect(p.querySelector('[data-present-reveal]').disabled).toBe(true);
    expect(p.querySelector('[role="status"]').textContent).toContain('Up next:');
    await key(p, 'ArrowLeft');
    expect(p.querySelector('[data-present-finished]'), 'Previous goes back to the last item').toBeNull();
    expect(itemLabel(p)).toBe('Item 2 of 2');
    await key(p, 'ArrowRight');
    await key(p, 'ArrowRight');
    expect(prompt(p), 'Next on the end screen starts the next planned activity').toBe('Listen, then spell the word.');
    // The hat fixture carries cat's Spelling Bee board, so only cat is ready.
    expect(itemLabel(p)).toBe('Item 1 of 1');
  });

  it('Start again goes back to item 1; the last planned activity says the plan is finished', async () => {
    const p = await present({ activity: 'rhyming', initialActivitySequence: ['spelling_bee', 'rhyming'] });
    await key(p, 'ArrowRight');
    await key(p, 'ArrowRight');
    const done = p.querySelector('[data-present-finished]');
    expect(done.textContent).toContain('That was the last activity in the lesson plan.');
    expect(done.querySelector('[data-present-next-activity]')).toBeNull();
    expect(buttonNamed(p, 'Next').getAttribute('aria-disabled')).toBe('true');
    await click(done.querySelector('[data-present-restart]'));
    expect(itemLabel(p)).toBe('Item 1 of 2');
    expect(p.querySelector('[data-present-finished]')).toBeNull();
  });

  it('without a plan it follows the activity list', async () => {
    const p = await present({ activity: 'rhyming' });
    await key(p, 'ArrowRight');
    await key(p, 'ArrowRight');
    expect(p.querySelector('[data-present-next-activity]')).toBeTruthy();
  });
});

describe('sound controls', () => {
  it('space between sounds is chosen in Teacher controls and remembered', async () => {
    const p = await present({ activity: 'blending' });
    const drawer = await openDrawer(p);
    expect(drawer.querySelector('[data-present-gap="0.25"]').getAttribute('aria-pressed')).toBe('true');
    await click(drawer.querySelector('[data-present-gap="1.5"]'));
    expect(drawer.querySelector('[data-present-gap="1.5"]').getAttribute('aria-pressed')).toBe('true');
    expect(JSON.parse(window.localStorage.getItem('allo_ws_present_look')).gap).toBe(1.5);
  });

  // Recorded phoneme clips for every sound, and a log of when each clip starts and at what rate.
  let clips, restore;
  const listenToClips = () => {
    clips = [];
    window.__ALLO_PHONEME_AUDIO_BANK = new Proxy({}, { get: (_, name) => (typeof name === 'string' ? 'data:audio/mpeg;base64,SUQzBAAAAAAAAA==' : undefined) });
    const play = window.HTMLMediaElement.prototype.play;
    window.HTMLMediaElement.prototype.play = function logged() { clips.push({ at: performance.now(), rate: this.playbackRate }); return play.call(this); };
    restore = () => { window.HTMLMediaElement.prototype.play = play; delete window.__ALLO_PHONEME_AUDIO_BANK; };
  };
  afterEach(() => { if (restore) restore(); restore = null; });

  it('the sounds of a blend are spaced by the chosen gap', async () => {
    listenToClips();
    const p = await present({ activity: 'blending' });
    await click((await openDrawer(p)).querySelector('[data-present-gap="1"]'));
    await click(drawerToggle(p));
    await act(async () => { await wait(2600); });
    clips.length = 0;
    await click(buttonNamed(p, 'Play'));
    await act(async () => { await wait(2600); });
    expect(clips.length, 'the three sounds of cat').toBeGreaterThanOrEqual(3);
    const gaps = clips.slice(1, 3).map((c, i) => c.at - clips[i].at);
    for (const gap of gaps) expect(gap, 'about a second between sounds').toBeGreaterThanOrEqual(950);
  }, 15000);

  it('one speed control lives in Sound, and every clip plays at it while presenting', async () => {
    listenToClips();
    const p = await present({ activity: 'blending', ttsSpeed: 0.75 });
    const drawer = await openDrawer(p);
    const speed = drawer.querySelector('[data-present-speed]');
    expect(speed.closest('[data-present-sound]')).toBeTruthy();
    expect(drawer.querySelectorAll('input[type="range"]'), 'no second speed slider').toHaveLength(1);
    await click(drawerToggle(p));
    await act(async () => { await wait(1500); });
    expect(clips.length).toBeGreaterThan(0);
    expect(clips.every((c) => c.rate === Number(speed.value)), JSON.stringify(clips.map((c) => c.rate)) + ' vs ' + speed.value).toBe(true);
  }, 15000);
});

describe('strings', () => {
  it('registers the new prompts and flow strings', () => {
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
    for (const name of ['present_prompt_spelling_bee', 'present_prompt_letter_tracing', 'present_activity_done', 'present_next_activity', 'present_gap']) expect(section[name], name).toBeTruthy();
  });
});

describe('switching activity from the top bar', () => {
  const switcher = (p) => p.querySelector('[data-present-activity-switch]');
  const pick = async (select, value) => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); await settle(10); };
  it('lists every activity, ready ones first, and the ones without items cannot be chosen', async () => {
    const p = await present({ activity: 'rhyming' });
    const select = switcher(p);
    expect(select.value).toBe('rhyming');
    expect(p.querySelector('label[for="ws-present-activity-switch"]').textContent).toBe('Activity');
    const options = [...select.options];
    // The same activities Teacher controls lists (those the lesson language allows).
    const drawer = await openDrawer(p);
    const listed = [...drawer.querySelectorAll('[data-present-activity], [data-present-unavailable]')].map((el) => el.getAttribute('data-present-activity') || el.getAttribute('data-present-unavailable'));
    expect(options.map((o) => o.value).sort()).toEqual(listed.sort());
    await click(drawerToggle(p));
    const ready = options.filter((o) => !o.disabled).map((o) => o.value);
    expect(ready).toEqual(expect.arrayContaining(['rhyming', 'isolation', 'spelling_bee', 'letter_tracing']));
    const firstDisabled = options.findIndex((o) => o.disabled);
    expect(options.slice(firstDisabled).every((o) => o.disabled), 'ready activities come first').toBe(true);
    expect(options.find((o) => o.value === 'sentence_match').disabled).toBe(true);
    expect(options.find((o) => o.value === 'sentence_match').textContent).toContain('No ready items');
  });
  it('one choice jumps to item 1 of that activity without opening Teacher controls', async () => {
    const p = await present({ activity: 'rhyming' });
    await key(p, 'ArrowRight');
    await pick(switcher(p), 'isolation');
    expect(itemLabel(p)).toBe('Item 1 of 2');
    expect(prompt(p)).toBe('What is the first sound in cat?');
    expect(p.querySelector('#ws-present-drawer')).toBeNull();
  });
  it('arrow keys on the menu stay with the menu', async () => {
    const p = await present({ activity: 'rhyming' });
    await key(switcher(p), 'ArrowRight');
    expect(itemLabel(p)).toBe('Item 1 of 2');
  });
  it('switching from the end screen starts the chosen activity', async () => {
    const p = await present({ activity: 'rhyming' });
    await key(p, 'ArrowRight');
    await key(p, 'ArrowRight');
    expect(p.querySelector('[data-present-finished]')).toBeTruthy();
    await pick(switcher(p), 'spelling_bee');
    expect(p.querySelector('[data-present-finished]')).toBeNull();
    expect(prompt(p)).toBe('Listen, then spell the word.');
  });
});
