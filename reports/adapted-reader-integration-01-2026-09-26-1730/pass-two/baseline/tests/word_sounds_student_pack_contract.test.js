// STUDENT-PACK CONTRACT: on a student device (runtime AI disallowed), every
// Word Sounds activity must mount, run its effects, and build its board from
// the teacher-prepared pack WITHOUT a single AI call. The golden harness is
// SSR-only (effects skipped), so this test mounts with the real client
// renderer + act so board-building/generation effects actually execute, and
// pins the boundary with callGemini/callTTS/callImagen stubs that THROW.
//
// Covers all 17 activities (the golden list omits word_scramble and
// missing_letter — they are included here).

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, ACTIVITIES } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act, WordSoundsModal;

const ALL_ACTIVITIES = [...ACTIVITIES, 'word_scramble', 'missing_letter'];

const mounted = [];
function mount(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ host, root });
  return { host, root };
}

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  installCanvasStub();
  const api = setupWordSounds();
  WordSoundsModal = api.WordSoundsModal;
});

afterEach(() => {
  while (mounted.length) {
    const { host, root } = mounted.pop();
    try { act(() => { root.unmount(); }); } catch (_) { /* already gone */ }
    host.remove();
  }
  delete window.__alloStudentAiDisabled;
});

describe('student pack contract: zero AI calls, board renders from pack', () => {
  for (const activity of ALL_ACTIVITIES) {
    it(`${activity}: mounts with effects, no AI, non-empty board`, async () => {
      const calls = [];
      const { host } = mount(React.createElement(WordSoundsModal, studentProps(activity, calls)));
      // Let mount effects + first async continuations run (board building,
      // any would-be generation kicks off in this window).
      await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
      expect(calls).toEqual([]);
      expect(host.innerHTML.length).toBeGreaterThan(200);
    });
  }

  it('window.__alloStudentAiDisabled gates AI when the host omits the prop', async () => {
    window.__alloStudentAiDisabled = true;
    const calls = [];
    const props = studentProps('blending', calls);
    delete props.allowRuntimeAi; // simulate an older host
    const { host } = mount(React.createElement(WordSoundsModal, props));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(calls).toEqual([]);
    expect(host.innerHTML.length).toBeGreaterThan(200);
  });

  it('prepared decoding board renders the packed choices + pack images (no Imagen)', async () => {
    // Decoding is the strictest pack consumer: the grid only reveals when
    // EVERY choice has a picture, and on student devices those pictures can
    // only come from the pack. The choice words surface as aria-labels
    // ("Picture of dog"), which pins the packed board verbatim.
    // (Blending/rhyming hide option text in sound-only mode, and the live
    // orthography view is a letter-tile constructor, so neither can pin
    // verbatim options from markup.)
    const calls = [];
    const { host } = mount(React.createElement(WordSoundsModal, studentProps('decoding', calls)));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    for (const choice of ['dog', 'sun', 'map']) {
      expect(host.innerHTML.toLowerCase()).toContain(choice);
    }
    expect(host.innerHTML).not.toContain('Preparing pictures');
    expect(calls).toEqual([]);
  });
});
