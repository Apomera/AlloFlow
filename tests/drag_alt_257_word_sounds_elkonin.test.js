// WCAG 2.5.7 Dragging Movements: the Elkonin segmentation boxes need a
// single-pointer, non-drag path. Tap a sound chip to pick it up (it still
// plays its sound), then tap a box to put it there, or tap the chip tray to
// send a boxed chip back. Driven with real clicks on a live mount.
//
// WS_MODULE_CANDIDATE=<path> loads that copy of word_sounds_module.js over the
// harness's live one (used to prove the test fails on the pre-fix file).
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
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
  const candidate = process.env.WS_MODULE_CANDIDATE;
  if (candidate) {
    // The module skips registration when one is already loaded.
    delete window.AlloModules.WordSoundsModal;
    // eslint-disable-next-line no-new-func
    new Function(readFileSync(resolve(candidate), 'utf8'))();
    WordSoundsModal = window.AlloModules.WordSoundsModal;
  }
});

afterEach(() => {
  while (mounted.length) {
    const { root, host } = mounted.pop();
    act(() => root.unmount());
    host.remove();
  }
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
const boxes = (host) => {
  const first = poolChips(host)[0];
  expect(first, 'segmentation chip pool rendered').toBeTruthy();
  // The Elkonin row is the box container rendered before the chip pool.
  const all = Array.from(host.querySelectorAll('div.w-20.h-20.rounded-2xl'));
  return all;
};
const filled = (box) => !!box.querySelector('[draggable="true"]');
const click = async (el) => { act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }); await settle(); };

describe('Word Sounds Elkonin boxes: tap-to-place alternative to dragging (2.5.7)', () => {
  it('tap a pool chip, then tap a specific empty box, places it in THAT box', async () => {
    const host = await mountSegmentation();
    const b0 = boxes(host);
    expect(b0).toHaveLength(3);
    expect(b0.map(filled)).toEqual([false, false, false]);
    expect(poolChips(host)).toHaveLength(5);

    await click(poolChips(host)[1]);
    // Picking up does not move it, and the chip shows it is picked.
    expect(boxes(host).map(filled)).toEqual([false, false, false]);
    expect(poolChips(host)[1].getAttribute('aria-pressed')).toBe('true');

    await click(boxes(host)[2]);
    expect(boxes(host).map(filled)).toEqual([false, false, true]);
    expect(poolChips(host)).toHaveLength(4);
  });

  it('tap a boxed chip, then tap the chip tray, sends it back; tap box-to-box moves it', async () => {
    const host = await mountSegmentation();
    await click(poolChips(host)[0]);
    await click(boxes(host)[0]);
    expect(boxes(host).map(filled)).toEqual([true, false, false]);

    // box 0 -> box 1
    await click(boxes(host)[0].querySelector('[draggable="true"]'));
    await click(boxes(host)[1]);
    expect(boxes(host).map(filled)).toEqual([false, true, false]);

    // box 1 -> tray
    await click(boxes(host)[1].querySelector('[draggable="true"]'));
    const tray = poolChips(host)[0].parentElement;
    await click(tray);
    expect(boxes(host).map(filled)).toEqual([false, false, false]);
    expect(poolChips(host)).toHaveLength(5);
  });

  it('drag-and-drop still places a chip (the tap path is an addition)', async () => {
    const host = await mountSegmentation();
    const dt = { setData() {}, getData() { return ''; }, effectAllowed: '', dropEffect: '' };
    const fire = async (el, type) => {
      const ev = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'dataTransfer', { value: dt });
      act(() => { el.dispatchEvent(ev); });
      await settle();
    };
    await fire(poolChips(host)[2], 'dragstart');
    await fire(boxes(host)[1], 'drop');
    expect(boxes(host).map(filled)).toEqual([false, true, false]);
    await fire(boxes(host)[1].querySelector('[draggable="true"]'), 'dragstart');
    await fire(poolChips(host)[0].parentElement, 'drop');
    expect(boxes(host).map(filled)).toEqual([false, false, false]);
  });

  it('tapping the picked chip again puts it down without moving it', async () => {
    const host = await mountSegmentation();
    await click(poolChips(host)[3]);
    expect(poolChips(host)[3].getAttribute('aria-pressed')).toBe('true');
    await click(poolChips(host)[3]);
    expect(poolChips(host)[3].getAttribute('aria-pressed')).toBe('false');
    await click(boxes(host)[0]);
    expect(boxes(host).map(filled)).toEqual([false, false, false]);
  });
});
