// Word Sounds response-method parity (2026-11-07 audit): every activity can be finished without dragging,
// typing on a hardware keyboard, fine pointer control or sight, and focus is not thrown away mid-task.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadModal, mount, unmountAll, click, settle, act, makeHatItem } from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';

const SOURCE = readFileSync('word_sounds_module.js', 'utf8');
beforeAll(() => { loadModal(); });
afterEach(() => unmountAll());
const open = async (activity, extra = {}) => (await mount({ activity, words: [makePackItem(), makeHatItem()], ...extra })).host;

describe('blockers', () => {
  it('Letter Trace offers a skip that is not scored, for students who cannot trace', async () => {
    const host = await open('letter_tracing');
    await settle(30);
    const skip = host.querySelector('[data-ws-skip-trace]');
    expect(skip.textContent).toBe('Skip this letter (not traced)');
    expect(SOURCE).toContain('onClick: skipUnscoredItem,\n                  "data-ws-skip-trace": "true",');
  });

  it('Sight & Spell: tapping a letter adds it, and one letter can be deleted', async () => {
    const host = await open('orthography');
    await settle(30);
    const input = host.querySelector('[data-ws-spell-input]');
    expect(input.getAttribute('aria-label')).toBe('Spell the word');
    const tiles = [...host.querySelectorAll('[draggable="true"]')];
    await click(tiles[0]);
    await click(tiles[1]);
    const expected = (tiles[0].getAttribute('aria-label') + tiles[1].getAttribute('aria-label')).toLowerCase();
    expect(host.querySelector('[data-ws-spell-input]').value).toBe(expected);
    await click(host.querySelector('[data-ws-delete-letter]'));
    expect(host.querySelector('[data-ws-spell-input]').value).toBe(expected.slice(0, -1));
  });

  it('Spelling Bee has on-screen letter keys and delete', async () => {
    const host = await open('spelling_bee');
    await settle(30);
    const keys = host.querySelector('[data-ws-letter-keys]');
    expect(keys.getAttribute('role')).toBe('group');
    const buttons = [...keys.querySelectorAll('button')];
    expect(buttons.slice(0, 26).map((b) => b.textContent).join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(buttons[26].getAttribute('aria-label')).toBe('Delete the last letter');
    expect(SOURCE).toContain('if (now.length < (currentWordSoundsWord?.length || 20)) editConstructionAnswer(now + letter);');
  });
});

describe('keyboard, switch and screen reader', () => {
  it('Sound Boxes: empty boxes are buttons a keyboard can reach', async () => {
    const host = await open('segmentation');
    await settle(30);
    const empty = [...host.querySelectorAll('[role="button"][aria-label^="Empty box"]')];
    expect(empty.length).toBe(3);
    expect(empty.every((b) => b.tabIndex === 0)).toBe(true);
  });

  it('Sound Boxes: Space on a sound is the button\'s own click (hear and pick up); Enter places it', () => {
    expect(SOURCE).toContain('if (e.key === " " || e.key === "Spacebar") return;\n                            const pool = e.currentTarget.parentElement;');
  });

  it('Sound Mapping and Sound Sort say what happened and keep focus in place', () => {
    expect(SOURCE).toContain('ts("word_sounds.sr_placed", { sound: available.text, n: emptyIdx + 1 })');
    expect(SOURCE).toContain('ts("word_sounds.sr_found_n_of_m", { n: foundWordsRef.current.size, total })');
    expect(SOURCE).toContain('const next = bank.querySelector("button[data-ws-bank-pick]"); if (next) next.focus();');
  });

  it('the reading activities can replay their instructions', async () => {
    for (const activity of ['decoding', 'read_sentence', 'read_passage', 'sentence_match']) {
      const host = await open(activity);
      await settle(20);
      expect(host.querySelector('[data-ws-hear-instructions]'), activity).toBeTruthy();
      unmountAll();
    }
  });

  it('Missing Letter exposes the chosen letter, not only by colour', () => {
    expect(SOURCE).toContain('"aria-pressed": userAnswer?.toLowerCase() === letter,');
  });

  it('mic screens keep the word replay, and Rhyme Time can switch back to tapping', () => {
    expect(SOURCE).toContain('{ className: "flex flex-col items-center" },\n                renderPrompt(),\n                renderVoiceInputOverlay(');
    expect(SOURCE).toContain('"data-ws-mic-back": "true"');
  });
});
