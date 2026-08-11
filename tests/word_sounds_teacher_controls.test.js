// THE TEACHER SIDE OF THE GATE.
//
// Review Words and Edit were hidden from students because the review panel
// lists every word with its phonemes, rhyme answers and distractors — the
// answers to the activity the child is about to be scored on. That change was
// pinned in source and the golden snapshots (which render without
// isTeacherMode) now bake in their absence, so every test in the suite agreed
// the buttons should NOT be there and nothing checked that a teacher still
// gets them. A control can disappear entirely and stay green.
//
// These mount the real component both ways.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act, WordSoundsModal;
const mounted = [];

function mount(props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(WordSoundsModal, props)); });
  mounted.push({ host, root });
  return host;
}

const byLabel = (host, label) =>
  host.querySelector(`button[aria-label="${label}"]`);
/** The Edit toggle is labelled common.confirm and titled Edit. */
const editButton = (host) =>
  [...host.querySelectorAll('button')].find((b) => (b.getAttribute('title') || '') === 'Edit');
const reviewButton = (host) => byLabel(host, 'common.review_and_edit_word_list');

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  installCanvasStub();
  ({ WordSoundsModal } = setupWordSounds());
});

afterEach(() => {
  while (mounted.length) {
    const { host, root } = mounted.pop();
    try { act(() => { root.unmount(); }); } catch (_) { /* already gone */ }
    host.remove();
  }
});

describe('a student device', () => {
  it('offers neither Review Words nor Edit', () => {
    const host = mount({ ...studentProps('counting', []) });
    expect(reviewButton(host), 'the review panel lists the answers').toBeNull();
    expect(editButton(host), 'a student must not rewrite the word list').toBeUndefined();
  });

  it('still gets the activity itself', () => {
    // The gate must hide the teacher controls, not the game.
    const host = mount({ ...studentProps('counting', []) });
    expect(host.querySelector('[role="button"][aria-label="Number 3"]')).toBeTruthy();
  });
});

describe('a teacher device', () => {
  it('gets Review Words back', () => {
    const host = mount({ ...studentProps('counting', []), isTeacherMode: true });
    expect(reviewButton(host), 'the teacher lost their review control').toBeTruthy();
  });

  it('gets Edit back', () => {
    const host = mount({ ...studentProps('counting', []), isTeacherMode: true });
    expect(editButton(host), 'the teacher lost their edit toggle').toBeTruthy();
  });

  it('but not during a probe', () => {
    // Opening review mid-probe replaces the probe UI, and its Start button
    // wipes the history the probe is collecting. That guard predates the
    // student gate and has to survive it.
    const host = mount({
      ...studentProps('counting', []),
      isTeacherMode: true,
      isProbeMode: true,
      probeGradeLevel: 'K',
    });
    expect(reviewButton(host)).toBeNull();
    expect(editButton(host)).toBeUndefined();
  });
});
