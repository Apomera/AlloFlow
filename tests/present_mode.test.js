// Word Sounds "Present to class" (lane C, 2026-10-20). Mounts the real modal
// from this lane's copy and drives it the way a teacher at a projector would.
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DIR, SOURCE_PATH, DI_PATH, loadModal, mount, unmountAll, presentButton, presenter, click, settle, key, buttonNamed, wait,
  fullscreenGrants, fullscreenRejects, currentFullscreen, makeHatItem, SCORING, resetSpies, act, played,
} from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';

const words = () => [makePackItem(), makeHatItem()];
const teacher = (extra = {}) => mount({ isTeacherMode: true, words: words(), ...extra });
const normalBox = (host) => host.querySelector('.word-sounds-root > div');
const itemLabel = (p) => (p.textContent.match(/Item \d+ of \d+/) || [''])[0];
const prompt = (p) => p.querySelector('h2').textContent;
const drawerToggle = (p) => p.querySelector('[aria-controls="ws-present-drawer"]');
const openDrawer = async (p) => { if (drawerToggle(p).getAttribute('aria-expanded') !== 'true') await click(drawerToggle(p)); return p.querySelector('#ws-present-drawer'); };
const focusable = (root) => [...root.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
  .filter((el) => !el.closest('[hidden], [aria-hidden="true"], .hidden'));
async function present(host) {
  await click(presentButton(host));
  await settle(40);
  const p = presenter(host);
  if (!p) throw Error('presenter did not open');
  return p;
}

beforeAll(() => { loadModal(); });
beforeEach(() => { fullscreenGrants(); document.exitFullscreen.mockClear(); delete window.AlloWordSoundsDI; });
afterEach(() => unmountAll());

describe('who can present', () => {
  it('shows Present to class to teachers and parents, never to students, probes or fixed forms', async () => {
    expect(presentButton((await mount({ words: words() })).host), 'student device').toBeNull();
    expect(presentButton((await mount({ isTeacherMode: true, words: words(), isProbeMode: true })).host), 'probe').toBeNull();
    expect(presentButton((await mount({ isTeacherMode: true, words: words(), sessionConfig: { fixedForm: true } })).host), 'fixed form').toBeNull();
    const teacherButton = presentButton((await teacher()).host);
    expect(teacherButton.textContent).toContain('Present to class');
    expect(teacherButton.getAttribute('type')).toBe('button');
    expect(presentButton((await mount({ isParentMode: true, words: words() })).host), 'parent').toBeTruthy();
  });
});

describe('entering', () => {
  it('hides the score chips and teacher controls behind a closed Teacher controls drawer', async () => {
    const { host } = await teacher();
    const box = normalBox(host);
    expect(box.textContent).toContain('Review Words');
    const p = await present(host);
    expect(box.hidden, 'the practice view is hidden, not just covered').toBe(true);
    expect(box.style.display).toBe('none');
    for (const text of ['Review Words', 'Lesson script', 'Streak', 'Accuracy', '2/5']) {
      expect(p.textContent.includes(text), text + ' is on the projected screen').toBe(false);
    }
    expect(drawerToggle(p).getAttribute('aria-expanded')).toBe('false');
    expect(p.querySelector('#ws-present-drawer')).toBeNull();
    // Keyboard and screen readers reach only the presenter.
    const reachable = focusable(host.querySelector('.word-sounds-root'));
    expect(reachable.length).toBeGreaterThan(3);
    expect(reachable.every((el) => p.contains(el))).toBe(true);
    const drawer = await openDrawer(p);
    for (const text of ['Score: 2/5', 'Streak: 1', 'Accuracy: 40%', 'Microphone: not available while presenting', 'Language:', 'Difficulty:', 'Speed']) {
      expect(drawer.textContent.includes(text), text + ' moved into the drawer').toBe(true);
    }
    expect(buttonNamed(drawer, 'Edit')).toBeTruthy();
    expect(buttonNamed(drawer, '\u{1F4C4} Lesson script') || buttonNamed(drawer, 'Lesson script')).toBeTruthy();
  });

  it('starts on the current activity and word with a large prompt, and plays it', async () => {
    const { host } = await teacher();
    const heard = played.length;
    const p = await present(host);
    expect(played.length, 'the prompt audio plays').toBeGreaterThan(heard);
    expect(itemLabel(p)).toBe('Item 1 of 2');
    expect(prompt(p)).toBe('Which word rhymes with cat?');
    expect(p.querySelector('h2').classList.contains('ws-present-prompt')).toBe(true);
    expect(document.getElementById('ws-present-css').textContent).toContain('.ws-present-prompt{font-size:clamp(2rem,');
    expect(p.style.position).toBe('fixed');
  });
});

describe('keys', () => {
  it('move next and previous, reveal with R, and are ignored inside fields', async () => {
    const { host } = await teacher();
    const p = await present(host);
    await key(p, 'ArrowRight');
    expect(itemLabel(p)).toBe('Item 2 of 2');
    expect(prompt(p)).toBe('Which word rhymes with hat?');
    await key(p, 'ArrowLeft');
    expect(itemLabel(p)).toBe('Item 1 of 2');
    await key(p, 'PageDown');
    expect(itemLabel(p)).toBe('Item 2 of 2');
    await key(p, 'PageUp');
    expect(itemLabel(p)).toBe('Item 1 of 2');
    await key(p, ' ');
    expect(itemLabel(p), 'Space moves on').toBe('Item 2 of 2');
    await key(p, 'ArrowLeft');
    expect(p.querySelector('[data-present-answer]')).toBeNull();
    await key(p, 'r');
    const answer = p.querySelector('[data-present-answer]');
    expect(answer.textContent).toContain('hat');
    // A field keeps its own keys.
    await key(p, 'ArrowLeft');
    const drawer = await openDrawer(p);
    const range = drawer.querySelector('input[type="range"]');
    await key(p, 'ArrowRight');
    expect(itemLabel(p)).toBe('Item 2 of 2');
    await key(range, 'ArrowLeft');
    await key(range, 'PageUp');
    expect(itemLabel(p), 'arrow keys inside the speed slider').toBe('Item 2 of 2');
    // Space on a focused button presses that button, it does not also navigate.
    await key(p, 'ArrowLeft');
    await key(drawerToggle(p), ' ');
    expect(itemLabel(p)).toBe('Item 1 of 2');
  });

  it('has on-screen Previous, Reveal and Next buttons', async () => {
    const { host } = await teacher();
    const p = await present(host);
    await click(buttonNamed(p, 'Next'));
    expect(itemLabel(p)).toBe('Item 2 of 2');
    await click(buttonNamed(p, 'Previous'));
    expect(itemLabel(p)).toBe('Item 1 of 2');
    await settle(100);
    const heard = played.length;
    await click(buttonNamed(p, 'Reveal'));
    const answer = p.querySelector('[data-present-answer]');
    expect(answer.textContent).toContain('hat');
    expect(answer.querySelector('img').getAttribute('alt')).toBe('Picture of hat');
    expect(p.querySelector('[role="status"]').textContent).toBe('Answer: hat');
    await settle(400);
    expect(played.length, 'the answer is played aloud').toBeGreaterThan(heard);
  });
});

describe('nothing is recorded or automatic while presenting', () => {
  it('a tap only highlights, and no score, progress, XP or difficulty call is made', async () => {
    const { host, spies } = await teacher();
    const p = await present(host);
    resetSpies(spies);
    const hat = p.querySelector('[data-present-choice="hat"]');
    await click(hat);
    expect(hat.getAttribute('aria-pressed')).toBe('true');
    await click(p.querySelector('[data-present-choice="dog"]'));
    expect(hat.getAttribute('aria-pressed'), 'one highlight at a time').toBe('false');
    expect(p.querySelector('[data-present-answer]'), 'a tap shows no answer').toBeNull();
    expect(p.textContent).not.toMatch(/Nice try|Correct|Try again/);
    await click(buttonNamed(p, 'Play'));
    await click(p.querySelector('[aria-label="Hear sun"]'));
    await key(p, 'r');
    await key(p, 'ArrowRight');
    await click(p.querySelector('[data-present-choice="cat"]'));
    const drawer = await openDrawer(p);
    await click(drawer.querySelector('[data-present-activity="counting"]'));
    await click(p.querySelector('[data-present-choice="3"]'));
    await key(p, 'r');
    await settle(400);
    for (const name of SCORING) expect(spies[name], name).not.toHaveBeenCalled();
    for (const name of ['setCurrentWordSoundsWord', 'setWordSoundsActivity', 'setWordSoundsFeedback', 'onClose']) expect(spies[name], name).not.toHaveBeenCalled();
  });

  it('holds an answer\'s pending auto-advance until presenting ends', async () => {
    const { host, spies } = await teacher({ activity: 'counting' });
    await click(host.querySelector('[role="button"][aria-label="Number 3"]'));
    expect(spies.setWordSoundsScore, 'the practice answer was graded').toHaveBeenCalled();
    resetSpies(spies);
    await present(host);
    await act(async () => { await wait(2600); });
    expect(spies.setCurrentWordSoundsWord, 'advanced to the next word mid-presentation').not.toHaveBeenCalled();
    expect(spies.setWordSoundsPhonemes).not.toHaveBeenCalled();
    await key(presenter(host), 'Escape');
    await settle(60);
    expect(spies.setCurrentWordSoundsWord, 'the held advance runs once presenting ends').toHaveBeenCalled();
  }, 15000);
});

describe('leaving', () => {
  it('Escape ends presenting, exits full screen and does not close Word Sounds', async () => {
    const { host, spies } = await teacher();
    const p = await present(host);
    expect(currentFullscreen()).toBe(host.querySelector('.word-sounds-root'));
    await key(p.querySelector('[data-present-choice="hat"]'), 'Escape');
    expect(presenter(host)).toBeNull();
    expect(spies.onClose).not.toHaveBeenCalled();
    expect(document.exitFullscreen).toHaveBeenCalled();
    expect(currentFullscreen()).toBeNull();
    expect(document.activeElement).toBe(presentButton(host));
    // Outside presenting, Escape keeps closing the tool as before.
    await key(presentButton(host), 'Escape');
    expect(spies.onClose).toHaveBeenCalledTimes(1);
  });

  it('End presentation restores the practice view exactly and returns focus to Present', async () => {
    const { host, spies } = await teacher();
    const box = normalBox(host);
    // Presenting stops audio, so a "playing" highlight is not compared.
    const before = { text: box.textContent, controls: box.querySelectorAll('button, select, input').length };
    expect(before.text).toContain('2/5');
    const p = await present(host);
    await click(p.querySelector('[data-present-choice="hat"]'));
    await key(p, 'ArrowRight');
    await key(p, 'r');
    resetSpies(spies);
    await click(buttonNamed(p, 'End presentation'));
    await settle(20);
    expect(presenter(host)).toBeNull();
    expect(box.hidden).toBe(false);
    expect(box.style.display).toBe('');
    expect(box.textContent, 'same word, activity and score as before').toBe(before.text);
    expect(box.querySelectorAll('button, select, input').length).toBe(before.controls);
    expect(document.activeElement).toBe(presentButton(host));
    for (const name of [...SCORING, 'setCurrentWordSoundsWord', 'setWordSoundsActivity', 'onClose']) expect(spies[name], name).not.toHaveBeenCalled();
  });

  it('leaves presenting when the browser leaves full screen', async () => {
    const { host } = await teacher();
    await present(host);
    await act(async () => { await document.exitFullscreen(); await wait(10); });
    expect(presenter(host)).toBeNull();
  });
});

describe('activities', () => {
  it('offers only whole-class activities; the rest are marked unavailable', async () => {
    const { host } = await teacher();
    const drawer = await openDrawer(await present(host));
    const offered = [...drawer.querySelectorAll('[data-present-activity]')].map((b) => b.getAttribute('data-present-activity'));
    for (const id of ['letter_tracing', 'spelling_bee', 'word_scramble', 'missing_letter', 'orthography', 'mapping', 'sentence_match']) {
      expect(offered, id).not.toContain(id);
      const row = drawer.querySelector(`[data-present-unavailable="${id}"]`);
      expect(row.textContent, id).toContain('Not available while presenting');
      expect(row.querySelector('button')).toBeNull();
    }
    for (const id of ['rhyming', 'counting', 'segmentation', 'blending', 'isolation', 'word_families', 'sound_sort', 'decoding']) expect(offered, id).toContain(id);
  });

  it('switching activity starts at item 1 and shows that activity\'s prompt', async () => {
    const { host } = await teacher();
    const p = await present(host);
    await key(p, 'ArrowRight');
    await click((await openDrawer(p)).querySelector('[data-present-activity="isolation"]'));
    expect(itemLabel(p)).toBe('Item 1 of 2');
    expect(prompt(p)).toBe('What is the first sound in cat?');
    await key(p, 'ArrowRight');
    expect(prompt(p)).toBe('What is the last sound in hat?');
    await key(p, 'r');
    expect(p.querySelector('[data-present-answer]').textContent).toContain('/t/');
  });

  it('segmentation shows empty boxes that fill on reveal', async () => {
    const { host } = await teacher();
    const p = await present(host);
    await click((await openDrawer(p)).querySelector('[data-present-activity="segmentation"]'));
    await click(drawerToggle(p));
    expect(prompt(p)).toBe('Say each sound in cat.');
    expect(p.textContent).not.toContain('/k/');
    await key(p, 'r');
    expect(p.textContent).toContain('/k//a//t/');
  });
});

describe('full screen', () => {
  it('falls back to a full-window layout when requestFullscreen is refused', async () => {
    fullscreenRejects();
    const { host } = await teacher();
    const p = await present(host);
    await settle(20);
    expect(presenter(host).getAttribute('data-present-fullscreen')).toBe('fallback');
    expect(p.style.position).toBe('fixed');
    expect([p.style.top, p.style.right, p.style.bottom, p.style.left].every((v) => v === '0px')).toBe(true);
    expect(p.querySelector('[role="status"]').textContent).toContain('Full screen is not available here');
    expect(normalBox(host).hidden).toBe(true);
    await click(buttonNamed(p, 'End presentation'));
    expect(document.exitFullscreen).not.toHaveBeenCalled();
  });

  it('asks for full screen on the Word Sounds container', async () => {
    const { host } = await teacher();
    await present(host);
    expect(window.HTMLElement.prototype.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(window.HTMLElement.prototype.requestFullscreen.mock.contexts[0]).toBe(host.querySelector('.word-sounds-root'));
    expect(presenter(host).getAttribute('data-present-fullscreen')).toBe('screen');
  });
});

describe('think time', () => {
  it('counts down as a number under reduced motion, as a ring otherwise, and can be turned off', async () => {
    const reduced = await teacher();
    const p = await present(reduced.host);
    await settle(80);
    const number = p.querySelector('[role="timer"]');
    expect(number.getAttribute('data-think')).toBe('number');
    expect(number.textContent).toBe('5');
    await act(async () => { await wait(1100); });
    expect(p.querySelector('[role="timer"]').textContent).toBe('4');
    const drawer = await openDrawer(p);
    await click(buttonNamed(drawer, 'Off'));
    expect(p.querySelector('[role="timer"]')).toBeNull();
    unmountAll();
    const moving = await teacher({ disableAnimations: false });
    const q = await present(moving.host);
    await settle(80);
    expect(q.querySelector('[role="timer"]').getAttribute('data-think')).toBe('ring');
  }, 10000);
});

describe('strings', () => {
  it('every present_* key in the module is registered in ui_strings.js with the same English', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds || {};
    const keys = Object.fromEntries(Object.entries(section).filter(([k]) => k.startsWith('present_')).map(([k, v]) => ['word_sounds.' + k, v]));
    const used = new Set([...source.matchAll(/word_sounds\.present_[a-z_]+/g)].map((m) => m[0]));
    expect(used.size).toBe(Object.keys(keys).length);
    for (const name of used) {
      expect(keys[name], name).toBeTruthy();
      const english = keys[name];
      expect(source.includes(`"${name}", ${JSON.stringify(english)}`) || source.includes(`"${name}") || ${JSON.stringify(english)}`), name + ' fallback').toBe(true);
    }
  });
});

describe('lesson script lines', () => {
  it('uses the DI loader\'s Your turn prompt and shows its My turn model on reveal', async () => {
    new Function(readFileSync(DI_PATH, 'utf8'))();
    expect(typeof window.AlloWordSoundsDI.presenterLines).toBe('function');
    const { host } = await teacher();
    const p = await present(host);
    expect(prompt(p)).toBe('Your turn. Which word rhymes with cat?');
    expect(p.querySelector('h2').getAttribute('lang')).toBe('en');
    await key(p, 'r');
    expect(p.querySelector('[data-present-answer]').textContent).toContain('My turn. Cat and hat rhyme.');
  });

  it('presenterLines refuses non-English sets and boards a pack omitted', () => {
    new Function(readFileSync(DI_PATH, 'utf8'))();
    const DI = window.AlloWordSoundsDI;
    const cat = makePackItem();
    expect(DI.presenterLines('rhyming', cat, { language: 'en', words: [cat] })).toEqual({
      model: 'My turn. Cat and hat rhyme.', prompt: 'Your turn. Which word rhymes with cat?' });
    expect(DI.presenterLines('rhyming', cat, { language: 'es', words: [cat] })).toBeNull();
    const omitted = { ...cat, activityItems: { ...cat.activityItems } };
    delete omitted.activityItems.rhyming;
    expect(DI.presenterLines('rhyming', omitted, { language: 'en', words: [omitted] })).toBeNull();
  });
});
