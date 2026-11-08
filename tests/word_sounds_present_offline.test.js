// Word Sounds "Present offline" (2026-11-07): one HTML file with every ready activity, the lesson's own clips
// and pictures, the teacher's look, and the presenter controls. No network, no AlloFlow.
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { loadModal, mount, unmountAll, presentButton, presenter, click, settle, fullscreenGrants, makeHatItem } from './helpers/word_sounds_present_harness.js';
import { makePackItem } from './helpers/word_sounds_pack_fixture.js';

let blobs;
beforeAll(() => { loadModal(); fullscreenGrants(); });
beforeEach(() => {
  blobs = [];
  try { window.localStorage.setItem('allo_ws_present_look', JSON.stringify({ theme: 'chalkboard', gap: 1 })); } catch (_) {}
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { blobs.push(blob); return 'blob:offline'; });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { unmountAll(); vi.restoreAllMocks(); try { window.localStorage.removeItem('allo_ws_present_look'); } catch (_) {} });

const readBlob = (blob) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsText(blob); });
const parse = (html) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return { doc, data: JSON.parse(doc.getElementById('ws-data').textContent) };
};

describe('Present offline', () => {
  it('Teacher controls download one file with every ready activity in lesson-plan order', async () => {
    const { host } = await mount({ isTeacherMode: true, words: [makePackItem(), makeHatItem()], activity: 'rhyming', initialActivitySequence: ['spelling_bee', 'rhyming'] });
    await click(presentButton(host));
    await settle(40);
    const p = presenter(host);
    await click(p.querySelector('[aria-controls="ws-present-drawer"]'));
    await click(p.querySelector('[data-present-offline] button'));
    expect(blobs).toHaveLength(1);
    expect(p.querySelector('[data-present-offline] [role="status"]').textContent).toMatch(/^Downloaded word-sounds-present-cat-hat\.html \(\d+\.\d MB\)/);
    const html = await readBlob(blobs[0]);
    mkdirSync('C:/tmp/release_2026-11-07/ws_present/offline', { recursive: true });
    writeFileSync('C:/tmp/release_2026-11-07/ws_present/offline/lesson.html', html);
    const { doc, data } = parse(html);
    expect(data.activities.slice(0, 2).map((a) => a.id), 'the plan comes first').toEqual(['spelling_bee', 'rhyming']);
    expect(data.activities.length).toBeGreaterThan(8);
    expect(data.gap).toBe(1);
    expect(doc.querySelector('style').textContent, 'the chosen look travels').toContain('--bg:#23392b');
    expect(doc.querySelectorAll('script:not([type])')).toHaveLength(1);
    expect(html).not.toMatch(/https?:\/\//);
    // The lesson's own word clip is embedded and referenced by the item that plays it.
    const rhyme = data.activities.find((a) => a.id === 'rhyming').items[0];
    expect(rhyme.prompt).toBe('Which word rhymes with cat?');
    expect(rhyme.audio[0].text).toBe('cat');
    expect(data.clips[rhyme.audio[0].clip]).toMatch(/^data:audio\//);
    expect(Object.values(data.clips).length, 'each clip is stored once').toBe(new Set(Object.values(data.clips)).size);
  });

  it('Print & share offers the same download', async () => {
    const { host } = await mount({ isTeacherMode: true, words: [makePackItem(), makeHatItem()] });
    await click(host.querySelector('[data-ws-share-open]'));
    await click(host.querySelector('[data-ws-present-offline]'));
    expect(blobs).toHaveLength(1);
    expect(parse(await readBlob(blobs[0])).data.activities.length).toBeGreaterThan(8);
  });

  it('is not offered to students', async () => {
    const { host } = await mount({ words: [makePackItem()] });
    expect(host.querySelector('[data-ws-present-offline]')).toBeNull();
  });
});
