// Word Sounds "Present to class" looks (2026-11-07): theme presets, custom colours, font,
// optional text transitions, and the counting boards' "N+" choice.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SOURCE_PATH, loadModal, mount, unmountAll, presentButton, presenter, click, settle, key, buttonNamed, wait, fullscreenGrants, makeHatItem, act,
} from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';

const SOURCE = readFileSync(SOURCE_PATH, 'utf8');
const LOOK_KEY = 'allo_ws_present_look';
const words = () => [makePackItem(), makeHatItem()];
const teacher = (extra = {}) => mount({ isTeacherMode: true, words: words(), ...extra });
const drawerToggle = (p) => p.querySelector('[aria-controls="ws-present-drawer"]');
const openDrawer = async (p) => { if (drawerToggle(p).getAttribute('aria-expanded') !== 'true') await click(drawerToggle(p)); return p.querySelector('#ws-present-drawer'); };
const itemLabel = (p) => (p.textContent.match(/Item \d+ of \d+/) || [''])[0];
const varOf = (p, name) => p.style.getPropertyValue(name);
async function present(host) {
  await click(presentButton(host));
  await settle(40);
  return presenter(host);
}
const choose = (select, value) => act(async () => { select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); await wait(5); });
const setColor = (input, value) => act(async () => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(5);
});

// The pure helpers, lifted from the module the way the app evaluates them.
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
const lifted = new Function('WS_CORE', 'React', 'window', 'document',
  SOURCE.slice(SOURCE.indexOf('    const WS_PRESENT_ACTIVITIES ='), SOURCE.indexOf('    const wsPresentKeyAction =')) +
  '\nreturn { wsPresentItems, WS_PRESENT_THEMES, wsPresentCustomTheme, wsPresentContrast };')(core, {}, globalThis.window, globalThis.document);

beforeAll(() => { loadModal(); });
beforeEach(() => { fullscreenGrants(); try { window.localStorage.removeItem(LOOK_KEY); } catch (_) {} delete window.FONT_OPTIONS; delete window.__alloEnsureUIFont; });
afterEach(() => unmountAll());

describe('counting boards past the top number', () => {
  const long = (count) => ({ targetWord: 'w' + count, phonemes: Array.from({ length: count }, (_, i) => 'p' + i) });
  it('offers 11+ when a word has 11 or more sounds, and marks it as the answer', () => {
    const [item] = lifted.wsPresentItems('counting', [long(12)]);
    expect(item.choices.map((c) => c.value)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11+']);
    expect(item.correct).toEqual(['11+']);
    expect(item.answer.label, 'the revealed answer still says the real count').toBe('12');
  });
  it('keeps 10 as the answer for a 10-sound word, with 11+ as a choice', () => {
    const [item] = lifted.wsPresentItems('counting', [long(10)]);
    expect(item.correct).toEqual(['10']);
    expect(item.choices.at(-1).value).toBe('11+');
  });
  it('short words keep their small number line', () => {
    const [item] = lifted.wsPresentItems('counting', [long(3)]);
    expect(item.choices.map((c) => c.value)).toEqual(['1', '2', '3', '4', '5']);
    expect(item.correct).toEqual(['3']);
  });
  it('syllable counting offers 9+ past eight syllables', () => {
    const opts = { countFor: () => ({ supported: true, count: 12, syllables: [] }) };
    const [item] = lifted.wsPresentItems('syllable_counting', [{ targetWord: 'antidisestablishmentarianism' }], opts);
    expect(item.choices.at(-1).value).toBe('9+');
    expect(item.correct).toEqual(['9+']);
  });
});

describe('theme palettes', () => {
  it('every preset keeps text readable and controls visible', () => {
    const { WS_PRESENT_THEMES, wsPresentContrast: c } = lifted;
    for (const [id, p] of Object.entries(WS_PRESENT_THEMES)) {
      for (const [a, b] of [['text', 'bg'], ['text', 'panel'], ['muted', 'bg'], ['muted', 'panel'], ['onStrong', 'strong'], ['onAccent', 'accent'], ['onGood', 'good'],
        ['goodText', 'bg'], ['goodText', 'goodSoft'], ['softText', 'soft'], ['text', 'card'], ['text', 'pickBg']]) {
        expect(c(p[a], p[b]), `${id}: ${a} on ${b}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const [a, b] of [['focus', 'bg'], ['focus', 'panel'], ['accent', 'panel'], ['good', 'panel'], ['pick', 'bg']]) {
        expect(c(p[a], p[b]), `${id}: ${a} against ${b}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
  it('a custom theme derives readable ink for buttons and answers', () => {
    const { wsPresentCustomTheme, wsPresentContrast: c } = lifted;
    for (const colors of [{ bg: '#1d3557', text: '#f1faee', accent: '#e63946' }, { bg: '#fff1e6', text: '#22223b', accent: '#ffb703' }]) {
      const p = wsPresentCustomTheme(colors);
      expect(c(p.onAccent, p.accent)).toBeGreaterThanOrEqual(4.5);
      expect(c(p.onGood, p.good)).toBeGreaterThanOrEqual(4.5);
      expect(c(p.goodText, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(c(p.muted, p.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('Look controls', () => {
  it('a preset recolours the projected screen, is remembered, and leaves the teacher drawer light', async () => {
    const first = await teacher();
    const p = await present(first.host);
    expect(p.getAttribute('data-ws-theme')).toBe('classic');
    const drawer = await openDrawer(p);
    await click(drawer.querySelector('[data-present-theme="chalkboard"]'));
    expect(p.getAttribute('data-ws-theme')).toBe('chalkboard');
    expect(varOf(p, '--wsp-bg')).toBe('#23392b');
    expect(drawer.querySelector('[data-present-theme="chalkboard"]').getAttribute('aria-pressed')).toBe('true');
    expect(drawer.className).toContain('bg-white');
    expect(JSON.parse(window.localStorage.getItem(LOOK_KEY)).theme).toBe('chalkboard');
    unmountAll();
    const again = await present((await teacher()).host);
    expect(again.getAttribute('data-ws-theme'), 'the next presentation starts with the saved look').toBe('chalkboard');
    await click((await openDrawer(again)).querySelector('[data-present-look-reset]'));
    expect(again.getAttribute('data-ws-theme')).toBe('classic');
  });

  it('Match app follows a dark app theme', async () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'theme-dark';
    document.body.appendChild(wrapper);
    const mounted = await teacher();
    wrapper.appendChild(mounted.host);
    const p = await present(mounted.host);
    await settle(10);
    expect(p.getAttribute('data-ws-theme')).toBe('night');
    wrapper.remove();
  });

  it('custom colours apply, and a hard-to-read pair is called out', async () => {
    const p = await present((await teacher()).host);
    const drawer = await openDrawer(p);
    expect(drawer.querySelector('[data-present-color]')).toBeNull();
    await click(drawer.querySelector('[data-present-theme="custom"]'));
    const bg = drawer.querySelector('[data-present-color="bg"]');
    expect(bg.value).toBe('#f8fafc');
    await setColor(bg, '#203040');
    expect(varOf(p, '--wsp-bg')).toBe('#203040');
    expect(drawer.querySelector('[data-present-contrast="text"]'), 'dark text on a dark background').toBeTruthy();
    await setColor(drawer.querySelector('[data-present-color="text"]'), '#ffffff');
    expect(drawer.querySelector('[data-present-contrast="text"]')).toBeNull();
  });

  it('offers classroom fonts from the app font library and loads the one chosen', async () => {
    window.FONT_OPTIONS = [{ id: 'andika', label: 'Andika (SIL)', family: "'Andika', sans-serif" }, { id: 'roboto', label: 'Roboto', family: "'Roboto'" }];
    window.__alloEnsureUIFont = vi.fn(() => Promise.resolve(true));
    const p = await present((await teacher()).host);
    const select = (await openDrawer(p)).querySelector('[data-present-font]');
    expect([...select.options].map((o) => o.value)).toEqual(['', 'andika']);
    await choose(select, 'andika');
    expect(p.getAttribute('data-ws-font')).toBe('andika');
    expect(varOf(p, '--wsp-font')).toBe("'Andika', sans-serif");
    expect(window.__alloEnsureUIFont).toHaveBeenCalledWith('andika');
  });
});

describe('text transitions', () => {
  it('are off by default and stay off under reduced motion', async () => {
    const p = await present((await teacher()).host);
    expect(p.getAttribute('data-ws-motion')).toBe('off');
    const select = (await openDrawer(p)).querySelector('[data-present-motion]');
    expect(select.disabled, 'reduced motion locks transitions off').toBe(true);
    expect(p.querySelector('.ws-p-in, .ws-p-out')).toBeNull();
  });

  it('fade the item out and the next one in when turned on', async () => {
    const p = await present((await teacher({ disableAnimations: false })).host);
    await choose((await openDrawer(p)).querySelector('[data-present-motion]'), 'fade');
    expect(p.getAttribute('data-ws-motion')).toBe('fade');
    await click(drawerToggle(p));
    expect(itemLabel(p)).toBe('Item 1 of 2');
    await key(document.body, 'ArrowRight');
    expect(p.querySelector('.ws-p-item').className).toContain('ws-p-out');
    expect(itemLabel(p), 'the item stays while it fades out').toBe('Item 1 of 2');
    await settle(220);
    expect(itemLabel(p)).toBe('Item 2 of 2');
    expect(p.querySelector('.ws-p-item').className).toContain('ws-p-in');
    await click(p.querySelector('[data-present-reveal]'));
    expect(p.querySelector('[data-present-answer]').className).toContain('ws-p-in');
  });

  it('a second press during the fade moves on from where the first was going', async () => {
    const three = [makePackItem(), makeHatItem(), { ...makeHatItem(), id: 3, term: 'bat', word: 'bat', targetWord: 'bat', displayWord: 'bat' }];
    const p = await present((await mount({ isTeacherMode: true, words: three, disableAnimations: false })).host);
    await choose((await openDrawer(p)).querySelector('[data-present-motion]'), 'slide');
    await click(drawerToggle(p));
    const total = Number((itemLabel(p).match(/of (\d+)/) || [])[1]);
    await key(document.body, 'ArrowRight');
    await key(document.body, 'ArrowRight');
    await settle(220);
    expect(itemLabel(p)).toBe('Item ' + Math.min(3, total) + ' of ' + total);
  });
});

describe('strings', () => {
  it('registers every new Look string', () => {
    const section = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
    for (const name of ['present_look', 'present_theme_chalkboard', 'present_motion_slide', 'present_contrast_low', 'present_font_reader']) expect(section[name], name).toBeTruthy();
  });
});
