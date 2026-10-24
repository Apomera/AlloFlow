// Lane B: prepared glossary audio in the flash-card HTML export. Clips come from
// the resource's karaokeAudio (per-entry v4), validated by the real
// KaraokeAudioStore, embedded once each, capped near 20 MB, never autoplayed.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const DIR = process.env.LANE_DIR || '.';
const REPO = process.cwd().replace(/\\/g, '/');
const { JSDOM } = createRequire(REPO + '/package.json')('jsdom');

beforeAll(() => {
  new Function(readFileSync(REPO + '/karaoke_audio_store_module.js', 'utf8'))();
  new Function(readFileSync(DIR + '/export_module.js', 'utf8'))();
});

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  document.querySelectorAll('.agx-overlay').forEach((node) => node.remove());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// A real (tiny) PCM WAV, so the store's container check passes.
function wav(dataBytes, seed = 1) {
  const buf = new Uint8Array(44 + dataBytes);
  const view = new DataView(buf.buffer);
  const ascii = (offset, text) => [...text].forEach((c, i) => { buf[offset + i] = c.charCodeAt(0); });
  ascii(0, 'RIFF'); view.setUint32(4, 36 + dataBytes, true); ascii(8, 'WAVE');
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, 'data'); view.setUint32(40, dataBytes, true);
  for (let i = 44; i < buf.length; i++) buf[i] = (i * seed) & 0xff;
  return Buffer.from(buf).toString('base64');
}
const entry = (segmentId, spokenText, audio, extra = {}) => ({
  identity: { identityVersion: 4, adapterId: 'alloflow.glossary.read-aloud', scopeId: 'main', segmentId, spokenText, spokenFingerprint: 'txt-x' },
  audio, mime: 'audio/wav', source: 'ai-generated', ...extra,
});
const CLIPS = { term: wav(64, 3), definition: wav(64, 5), spanish: wav(64, 7), stale: wav(64, 11) };
function resource(entries) {
  return {
    id: 'g1', type: 'glossary',
    data: [
      { entryId: 'leaf', term: 'Leaf', def: 'A plant part.', translations: { Spanish: 'hoja: parte de una planta' } },
      { entryId: 'root', term: 'Root', def: 'Under the ground.', translations: { Spanish: 'raíz' } },
    ],
    karaokeAudio: { format: 'per-entry', version: 4, legacy: {}, entries: entries || {
      a: entry('entry/leaf/term', 'Leaf', CLIPS.term),
      b: entry('entry/leaf/definition', 'Leaf: A plant part.', CLIPS.definition),
      c: entry('entry/leaf/translation/spanish', 'hoja: parte de una planta', CLIPS.spanish),
      d: entry('entry/root/term', 'Old root word', CLIPS.stale),
      e: entry('entry/root/definition', 'Root: Under the ground.', CLIPS.stale, { quarantine: { code: 'playback-failed' } }),
      f: entry('entry/root/translation/spanish', 'raíz', 'AAAAAAAA'),
    } },
  };
}
function exportCards(content, mode, options) {
  const files = [];
  const addToast = vi.fn();
  vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cards');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const api = window.AlloModules.createExport({ liveRef: { current: { generatedContent: content, t: (k) => k, addToast } }, escapeXml: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') });
  api.handleExportFlashcards(mode, options);
  return { files, addToast, api, html: () => files.at(-1) && files.at(-1).text };
}
const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
const audioData = (doc) => JSON.parse(doc.getElementById('card-audio-data').textContent);

describe('flash-card export with prepared audio', () => {
  it('embeds each current clip once, with a named play button per side and no autoplay', () => {
    const { html } = exportCards(resource(), 'standard', { includeAudio: true });
    const doc = parse(html());
    const buttons = [...doc.querySelectorAll('button[data-card-audio]')];
    // The deck repeats once per language (one here): Leaf has both sides, Root none (stale and damaged clips).
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Play Leaf', 'Play the definition of Leaf']);
    expect(buttons.every((b) => b.getAttribute('type') === 'button' && b.classList.contains('no-print'))).toBe(true);
    expect(buttons[0].closest('.front'), 'term clip on the front').not.toBeNull();
    expect(buttons[1].closest('.back'), 'definition clip on the back').not.toBeNull();
    const data = audioData(doc);
    expect(Object.values(data)).toEqual(['data:audio/wav;base64,' + CLIPS.term, 'data:audio/wav;base64,' + CLIPS.definition]);
    expect(html().includes(CLIPS.stale), 'a clip for old text never ships').toBe(false);
    expect(doc.querySelector('[autoplay], audio')).toBeNull();
  });
  it('the deck repeats per language, but each clip is written once', () => {
    const content = resource();
    content.data[0].translations.French = 'feuille';
    const { html } = exportCards(content, 'standard', { includeAudio: true });
    const doc = parse(html());
    const buttons = [...doc.querySelectorAll('button[data-card-audio]')];
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Play Leaf', 'Play the definition of Leaf', 'Play Leaf', 'Play the definition of Leaf']);
    expect(Object.keys(audioData(doc))).toHaveLength(2);
    expect(buttons[0].getAttribute('data-card-audio')).toBe(buttons[2].getAttribute('data-card-audio'));
    expect(html().split(CLIPS.term).length - 1, 'the term clip bytes appear once').toBe(1);
  });
  it('the Language Deck plays the translation on the back', () => {
    const { html } = exportCards(resource(), 'language', { includeAudio: true });
    const doc = parse(html());
    expect([...doc.querySelectorAll('button[data-card-audio]')].map((b) => b.getAttribute('aria-label'))).toEqual(['Play Leaf', 'Play Leaf in Spanish']);
    expect(Object.values(audioData(doc))).toEqual(['data:audio/wav;base64,' + CLIPS.term, 'data:audio/wav;base64,' + CLIPS.spanish]);
  });
  it('in the saved file nothing plays on load; a button plays its own clip', () => {
    const { html } = exportCards(resource(), 'standard', { includeAudio: true });
    const played = [];
    const dom = new JSDOM(html(), { runScripts: 'dangerously', beforeParse(win) { win.Audio = class { constructor(src) { this.src = src; played.push({ src, playing: false }); } play() { played.at(-1).playing = true; return Promise.resolve(); } pause() {} }; } });
    cleanups.push(() => dom.window.close());
    expect(played, 'no autoplay').toEqual([]);
    dom.window.document.querySelector('[aria-label="Play the definition of Leaf"]').click();
    expect(played).toEqual([{ src: 'data:audio/wav;base64,' + CLIPS.definition, playing: true }]);
  });
  it('with audio present, an in-page option comes first: on by default, and off leaves the audio out', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    cleanups.push(() => opener.remove());
    opener.focus();
    const run = exportCards(resource(), 'standard');
    expect(run.files, 'nothing downloads until the teacher chooses').toHaveLength(0);
    const box = document.querySelector('.agx-overlay [role="dialog"]');
    const check = box.querySelector('input[type="checkbox"]');
    expect(check.closest('label').textContent).toBe('Include prepared audio');
    expect(check.checked).toBe(true);
    expect(box.textContent.includes('2 prepared recordings')).toBe(true);
    check.click();
    [...box.querySelectorAll('button')].find((b) => b.textContent === 'Download').click();
    expect(document.querySelector('.agx-overlay')).toBeNull();
    expect(document.activeElement, 'focus back on the export button').toBe(opener);
    const doc = parse(run.html());
    expect(doc.querySelector('button[data-card-audio]')).toBeNull();
    expect(doc.getElementById('card-audio-data')).toBeNull();
  });
  it('the default choice keeps the audio', () => {
    const run = exportCards(resource(), 'standard');
    [...document.querySelectorAll('.agx-overlay button')].find((b) => b.textContent === 'Download').click();
    expect(parse(run.html()).querySelectorAll('button[data-card-audio]')).toHaveLength(2);
  });
  it('no prepared audio: no option, the file downloads at once as before', () => {
    const content = resource();
    delete content.karaokeAudio;
    const run = exportCards(content, 'standard');
    expect(document.querySelector('.agx-overlay')).toBeNull();
    expect(run.files).toHaveLength(1);
    expect(run.html().includes('data-card-audio')).toBe(false);
  });
  it('caps the file near 20 MB: the extra clips are left out and the teacher is told how many', () => {
    const big = (seed) => wav(7 * 1024 * 1024, seed);
    const content = resource({
      a: entry('entry/leaf/term', 'Leaf', big(3)),
      b: entry('entry/leaf/definition', 'Leaf: A plant part.', big(5)),
      c: entry('entry/root/term', 'Root', big(7)),
    });
    const run = exportCards(content, 'standard', { includeAudio: true });
    const html = run.html();
    expect((html.match(/data-card-audio="/g) || []).length, 'two clips fit').toBe(2);
    expect(html.length).toBeLessThan(20 * 1024 * 1024 + 200000);
    expect(run.addToast).toHaveBeenCalledWith('1 recording was left out to keep the file under 20 MB.', 'info');
    exportCards(content, 'standard');
    expect(document.querySelector('.agx-overlay').textContent.includes('under 20 MB'), 'the option warns before export').toBe(true);
  }, 60000);
});
