// The app's Break it Down (Elkonin boxes), 2026-11-18 (owner: a first-time player got stuck; the practice files'
// Break it Down was redone the same day, tests/packets_break_it_down_2026_11_18.test.js):
// - what the last move did is shown under the boxes ([data-seg-say], role=status), in the practice files' translated words;
// - a tapped empty box with nothing picked up, and Check with empty boxes, say why instead of doing nothing;
// - with letters off each sound has its own name ("Pick up Sound 3", not "Mystery Sound" for all), and neither a boxed
//   sound's name nor a tile's hover text names the sound (that gave the answer away);
// - a finger or a pen can drag a sound (pointer events); a mouse keeps the browser's own drag (drag_alt_257 test).
// Driven on a live mount, as tests/drag_alt_257_word_sounds_elkonin.test.js is.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, WordSoundsModal;
const mounted = [];

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  installCanvasStub();
  ({ WordSoundsModal } = setupWordSounds());
});
afterEach(() => {
  while (mounted.length) { const { root, host } = mounted.pop(); act(() => root.unmount()); host.remove(); }
});
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });
async function mountSegmentation() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(WordSoundsModal, studentProps('segmentation', []))); });
  mounted.push({ root, host });
  await settle();
  return host;
}
const poolChips = (host) => Array.from(host.querySelectorAll('button[data-help-key="wordsounds_pool_item"]'));
const boxes = (host) => Array.from(host.querySelectorAll('div.w-20.h-20.rounded-2xl'));
const filled = (box) => !!box.querySelector('[draggable="true"]');
const said = (host) => host.querySelector('[data-seg-say]').textContent;
const click = async (el) => { act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })); }); await settle(); };
const checkButton = (host) => Array.from(host.querySelectorAll('button')).find((b) => b.hasAttribute('aria-disabled') || /bg-violet-600/.test(b.className)) || null;

describe('the app\'s Break it Down says what happened, names each sound, and drags by touch', () => {
  it('each sound has its own name, and no name or hover text gives the sound away', async () => {
    const host = await mountSegmentation();
    const chips = poolChips(host);
    expect(chips.length).toBeGreaterThan(2);
    const names = chips.map((c) => c.getAttribute('aria-label'));
    expect(names.every((n) => /^Pick up Sound \d+$/.test(n)), names.join(' | ')).toBe(true);
    expect(new Set(names).size).toBe(names.length);
    for (const c of chips) expect(c.getAttribute('title') || '').not.toMatch(/:/);
    // A boxed sound is named the same way, not by its phoneme.
    await click(chips[0]);
    await click(boxes(host)[0]);
    const boxed = boxes(host)[0].querySelector('[draggable="true"]');
    expect(boxed.getAttribute('aria-label')).toMatch(/^Sound \d+\. Press Space to hear, Enter to remove\.$/);
  });

  it('every move is said on screen: pick up, put back, place, take out; an empty box and Check say why', async () => {
    const host = await mountSegmentation();
    expect(host.querySelector('[data-seg-say]').getAttribute('role')).toBe('status');
    // Check with empty boxes: it looks unavailable, and says why.
    const check = checkButton(host);
    expect(check, 'Check button').toBeTruthy();
    expect(check.getAttribute('aria-disabled')).toBe('true');
    await click(check);
    expect(said(host)).toBe('Put a sound in every box first.');
    await click(boxes(host)[1]);
    expect(said(host)).toBe('Tap a sound to pick it up, then tap a box to put it there. Tap a filled box to take its sound out.');
    const first = poolChips(host)[0];
    const name = first.getAttribute('aria-label').replace(/^Pick up /, '');
    await click(first);
    expect(said(host)).toBe(name + ' picked up. Now choose a box.');
    await click(poolChips(host)[0]);
    expect(said(host)).toBe(name + ' put back.');
    await click(poolChips(host)[0]);
    await click(boxes(host)[2]);
    expect(said(host)).toBe(name + ' is in box 3.');
    await click(boxes(host)[2].querySelector('[draggable="true"]'));
    await click(poolChips(host)[0].parentElement);
    expect(said(host)).toBe(name + ' taken out of box 3.');
  });

  it('a finger drags a sound into a box, from box to box, and back to the tray; a short move is a tap', async () => {
    const host = await mountSegmentation();
    const pointer = (el, type, x, y) => {
      const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
      Object.defineProperty(ev, 'pointerType', { value: 'touch' });
      Object.defineProperty(ev, 'isPrimary', { value: true });
      Object.defineProperty(ev, 'pointerId', { value: 1 });
      act(() => { el.dispatchEvent(ev); });
    };
    const drag = async (el, onto) => {
      document.elementFromPoint = () => onto;
      pointer(el, 'pointerdown', 10, 10); pointer(el, 'pointermove', 50, 50); pointer(el, 'pointerup', 50, 50);
      await settle();
      // The click a drag ends with does nothing.
      await click(el);
      await new Promise((r) => setTimeout(r, 420));
    };
    await drag(poolChips(host)[1], boxes(host)[0]);
    expect(boxes(host).map(filled)).toEqual([true, false, false]);
    expect(said(host)).toMatch(/ is in box 1\.$/);
    expect(document.querySelectorAll('body > [aria-hidden="true"][style*="fixed"]').length).toBe(0);
    await drag(boxes(host)[0].querySelector('[draggable="true"]'), boxes(host)[2]);
    expect(boxes(host).map(filled)).toEqual([false, false, true]);
    await drag(boxes(host)[2].querySelector('[draggable="true"]'), poolChips(host)[0].parentElement);
    expect(boxes(host).map(filled)).toEqual([false, false, false]);
    expect(said(host)).toMatch(/ taken out of box 3\.$/);
    // A short move: still a tap (picks it up).
    const chip = poolChips(host)[2];
    pointer(chip, 'pointerdown', 10, 10); pointer(chip, 'pointermove', 13, 12); pointer(chip, 'pointerup', 13, 12);
    await click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
  });
});
