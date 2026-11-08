// Word Sounds activity worksheets (2026-11-07): every activity can go on paper, built from the same prepared
// items Present to class projects, with an optional answer key that also says what the teacher reads aloud.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { loadModal, mount, unmountAll, click, settle, act, makeHatItem } from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';

let written;
const lastDoc = () => new DOMParser().parseFromString(written[written.length - 1], 'text/html');
beforeAll(() => { loadModal(); });
beforeEach(() => {
  written = [];
  vi.spyOn(window, 'open').mockImplementation(() => ({ document: { open: vi.fn(), write: (html) => written.push(html), close: vi.fn(), images: [] }, focus: vi.fn(), print: vi.fn() }));
});
afterEach(() => { unmountAll(); vi.restoreAllMocks(); });

async function dialog(extra = {}) {
  const { host } = await mount({ isTeacherMode: true, allowRuntimeAi: true, callGemini: async () => '', callTTS: async () => null, words: [makePackItem(), makeHatItem()], ...extra });
  await click(host.querySelector('[data-ws-share-open]'));
  await click(host.querySelector('[data-ws-print-open]'));
  await settle(10);
  return host.querySelector('[data-ws-print-dialog]');
}
const choose = async (select, value) => act(async () => {
  Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
});
async function printSheet(activity, extra) {
  const d = await dialog(extra);
  await choose(d.querySelector('[data-ws-print-activity]'), activity);
  await click(d.querySelector('[data-ws-print="worksheet"]'));
  return lastDoc();
}

describe('the worksheet option', () => {
  it('lists only activities with ready items, starting on the current one', async () => {
    const d = await dialog({ activity: 'rhyming' });
    const select = d.querySelector('[data-ws-print-activity]');
    expect(select.value).toBe('rhyming');
    const ids = [...select.options].map((o) => o.value);
    expect(ids).toEqual(expect.arrayContaining(['rhyming', 'isolation', 'spelling_bee', 'word_scramble', 'mapping', 'letter_tracing']));
    expect(ids).not.toContain('sentence_match');
    expect(d.querySelector('[data-ws-print-key]').checked).toBe(true);
  });
});

describe('the printed sheet', () => {
  it('Rhyme Time: one numbered item per word, choices to circle, the given word\'s picture, and an answer key', async () => {
    const doc = await printSheet('rhyming');
    expect(doc.querySelector('h1').textContent).toBe('Rhyme Time worksheet');
    const items = doc.querySelectorAll('.ws-ws-item');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('.ws-ws-prompt').textContent).toBe('Which word rhymes with cat?');
    expect([...items[0].querySelectorAll('.ws-ws-choice')].map((c) => c.textContent)).toEqual(['hat', 'dog', 'sun', 'bed']);
    expect(items[0].querySelector('.ws-ws-cue img').getAttribute('alt'), 'the picture is the given word, never the answer').toBe('cat');
    // 2026-11-08: each key line names its word first, so a teacher can read the key aloud.
    expect([...doc.querySelectorAll('.ws-ws-key li')].map((li) => li.textContent)).toEqual(['cat — hat', 'hat — cat']);
    expect(doc.querySelector('[data-ws-edit]')).toBeTruthy();
  });
  it('Blend Sounds: no picture to give the word away, and the key says which sounds to read', async () => {
    const doc = await printSheet('blending');
    const item = doc.querySelector('.ws-ws-item');
    expect(item.querySelector('.ws-ws-cue')).toBeNull();
    expect(item.querySelector('.ws-ws-listen').textContent).toBe('Listen to your teacher.');
    expect(doc.querySelector('.ws-ws-key li').textContent).toBe('cat · Say: /k/ /a/ /t/');
  });
  it('writing activities get boxes, blanks, tiles and lines', async () => {
    expect((await printSheet('spelling_bee')).querySelector('.ws-ws-item').querySelectorAll('.ws-ws-box')).toHaveLength(3);
    expect((await printSheet('segmentation')).querySelector('.ws-ws-boxes').children).toHaveLength(3);
    expect((await printSheet('missing_letter')).querySelector('.ws-ws-big').textContent).toBe('c_t');
    const scramble = await printSheet('word_scramble');
    expect([...scramble.querySelectorAll('.ws-ws-tile')].map((t) => t.textContent).join('')).not.toBe('cat');
    expect(scramble.querySelector('.ws-ws-write')).toBeTruthy();
    const trace = await printSheet('letter_tracing');
    expect(trace.querySelector('.ws-ws-trace').textContent).toBe('c');
    expect(trace.querySelector('.ws-ws-prompt').textContent).toBe('Trace the letter c, then write it on the line.');
    const map = await printSheet('mapping');
    expect(map.querySelector('.ws-ws-item').querySelectorAll('.ws-ws-map > div')).toHaveLength(3);
    expect(map.querySelector('.ws-ws-map').textContent).toBe('/k//a//t/');
  });
  it('the answer key can be left off', async () => {
    const d = await dialog();
    await click(d.querySelector('[data-ws-print-key]'));
    await choose(d.querySelector('[data-ws-print-activity]'), 'isolation');
    await click(d.querySelector('[data-ws-print="worksheet"]'));
    expect(lastDoc().querySelector('.ws-ws-key')).toBeNull();
  });
});
