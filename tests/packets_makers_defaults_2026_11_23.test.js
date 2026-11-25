// Maker pages, two simplifications approved by the owner on 2026-11-23.
//   1. A NEW read-along file starts with the simple toolbar ON (packets-read-along.html: #f-simple-bar is ticked).
//      Only the maker page's starting state changed. Unchanged, and checked here:
//        - the builder's own default when a lesson does not say (off), so old files and other code paths are the same;
//        - a file opened with "Open a file I made" shows the setting it was made with;
//        - a saved preset (the only way this page remembers the box: localStorage "alloflow-ra-presets/1", applied
//          when the teacher picks it) still unticks the box, also a preset saved before the box existed;
//        - a draft handed over from AlloFlow carries no toolbar setting (packets_handoff.js keeps only title, text,
//          language, notes and recordings), so it never touches the box.
//   2. The fold of rare choices has one name on the makers that have one: "More options" (Word Sounds had it;
//      Vocabulary said "More choices", Symbol Runner said "Settings"). The read-along page's three folds keep their
//      own names, which say what is inside.
// Everything is checked by what the real page does in jsdom, and by the file it builds opened as a student opens it.

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const RA = require('../packet_read_along_builder.js');
const LOADER_SRC = read('word_sounds_take_home_loader.js');
const PAGE_HTML = read('packets-read-along.html');
const PRESET_KEY = 'alloflow-ra-presets/1';
const PASSAGE = 'The fox ran to the den. It hid in the tall grass.';

function loadLoader() {
  const g = { crypto: webcrypto };
  g.window = g;
  new Function('window', LOADER_SRC).call(g, g);
  return g.AlloWordSoundsTakeHome;
}
const loader = loadLoader();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (test, what, tries = 1200) => { for (let i = 0; i < tries; i++) { if (test()) return; await sleep(15); } throw new Error('Timed out waiting for ' + what); };

// The maker page as a teacher opens it. o.storage: what this browser kept from an earlier visit.
async function openMaker(o = {}) {
  const dom = new JSDOM(PAGE_HTML, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-read-along.html' });
  const w = dom.window, d = w.document;
  if (o.storage) for (const [k, v] of Object.entries(o.storage)) w.localStorage.setItem(k, v);
  if (!w.TextEncoder) w.TextEncoder = TextEncoder;
  if (!w.TextDecoder) w.TextDecoder = TextDecoder;
  const page = { w, d, dom };
  w.fetch = async (url) => {
    if (String(url) === 'engine_runtime_integrity.json') return { ok: true, json: async () => ({ schemaVersion: 1, assets: {}, graphs: {} }) };
    return { ok: false, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
  w.URL.createObjectURL = () => 'blob:https://packets.test/1';
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {};
  const realAppend = w.HTMLHeadElement.prototype.appendChild;
  d.head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT') {
      const src = node.getAttribute('src');
      if (src === 'packets_audio_kit.js') w.eval(read('packets_audio_kit.js'));
      if (src === 'runtime_graph_host.js') w._alloInstallRuntimeGraphHost = (catalog, target) => { target.__alloCreateVerifiedWorker = () => {}; };
      if (src === 'kokoro_tts_loader.js') w._kokoroTTS = { init: async () => true, speak: async () => null };
      setTimeout(() => node.onload && node.onload(), 0);
      return node;
    }
    return realAppend.call(this, node);
  };
  w.crypto.subtle || Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.eval(LOADER_SRC);
  w.eval(read('packet_read_along_builder.js'));
  w.eval(read('packets_voice_engine.js'));
  w.eval(read('packets_verify_core.js'));
  w.eval(read('packets_reopen.js'));
  w.eval(read('packets_handoff.js'));
  w.eval(read('packets_zip.js'));
  w.eval(read('packets-read-along.js'));
  page.$ = (id) => d.getElementById(id);
  page.state = () => w.AlloPacketReadAlongPage.state;
  page.type = (id, text) => { page.$(id).value = text; page.$(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
  page.tick = (id, on) => { page.$(id).checked = on; page.$(id).dispatchEvent(new w.Event('change', { bubbles: true })); };
  // The file the page would save now, once it has been put together.
  page.file = async () => { await until(() => page.state().built && page.state().built.html, 'the file to be ready'); return page.state().built.html; };
  // What the saved file itself says, read the way "Open a file I made" reads it.
  page.fileSays = async () => { const html = await page.file(); return w.AlloPacketReadAlong.readBack(w.AlloPacketVerify.readParts(html)); };
  page.storage = () => { const out = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); out[k] = w.localStorage.getItem(k); } return out; };
  page.close = () => w.close();
  return page;
}

// The saved file, opened and started as a student does. Says whether "More tools" is there and how many controls show.
async function studentSees(html) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html',
    beforeParse(w) { w.Element.prototype.scrollIntoView = function () {}; } });
  try {
    const d = dom.window.document;
    d.getElementById('learner-name').value = 'Sam';
    Array.from(d.querySelectorAll('.card button.primary')).find((b) => !b.hidden).click();
    await until(() => d.querySelector('[data-read-along-line]'), 'the read-along page');
    const shown = (n) => !n.hidden && !n.closest('[hidden]');
    const more = d.querySelector('[data-read-along-more-tools]');
    return {
      moreTools: !!more && shown(more),
      tucked: d.querySelector('[data-read-along-extra-tools]') ? d.querySelector('[data-read-along-extra-tools]').hidden : null,
      controls: Array.from(d.querySelectorAll('#app button, #app select, #app input')).filter(shown).length,
    };
  } finally { dom.window.close(); }
}

describe('1. a new read-along file starts with the simple toolbar on', () => {
  it('a fresh page has the box ticked; its file has the simple bar on and a student gets More tools', async () => {
    const page = await openMaker();
    try {
      expect(page.$('f-simple-bar').checked).toBe(true);
      expect(page.$('more-supports-now').textContent).toContain('Simple toolbar');
      page.type('f-text', PASSAGE);
      const html = await page.file();
      expect(page.state().made.simpleBar).toBe(true);
      expect((await page.fileSays()).simpleBar).toBe(true);
      const on = await studentSees(html);
      expect(on.moreTools).toBe(true);
      expect(on.tucked).toBe(true);

      // Unticked: every button is in front, there is no More tools, and the file says so.
      page.tick('f-simple-bar', false);
      await until(() => page.state().made && page.state().made.simpleBar === false, 'the file to be made again');
      const htmlOff = await page.file();
      expect((await page.fileSays()).simpleBar).toBe(false);
      const off = await studentSees(htmlOff);
      expect(off.moreTools).toBe(false);
      expect(off.tucked).toBe(null);
      expect(on.controls).toBeLessThan(off.controls);
      // With nothing ticked, the fold's top line no longer calls that state "Default".
      expect(page.$('more-supports-now').textContent).not.toMatch(/default/i);
      expect(page.$('more-supports-now').textContent).toContain('every button shown');
    } finally { page.close(); }
  });

  it('the hint beside the box says what it does and how to turn it off', () => {
    const d = new JSDOM(PAGE_HTML).window.document;
    const box = d.getElementById('f-simple-bar');
    expect(box.hasAttribute('checked')).toBe(true);
    const hint = box.closest('label').querySelector('small.hint').textContent;
    expect(hint).toBe('Students see the main buttons; the others are behind More tools in the file. Untick to show every button.');
  });

  it('the builder alone is unchanged: a lesson that does not say has no simple bar', () => {
    const sentences = RA.splitPassage(PASSAGE);
    const quiet = RA.lessonFromReadAlong({ loader, title: 'Fox', sentences, clips: {} });
    expect(quiet.simpleBar).toBe(false);
    const built = RA.buildReadAlongPacket({ made: quiet, loader });
    expect(built.manifest.readAlong.simpleBar).toBeUndefined();
    const asked = RA.lessonFromReadAlong({ loader, title: 'Fox', sentences, clips: {}, simpleBar: true });
    expect(asked.simpleBar).toBe(true);
    expect(RA.buildReadAlongPacket({ made: asked, loader }).manifest.readAlong.simpleBar).toBe(true);
  });

  it('a remembered "off" stays off after a reload: a saved preset still unticks the box, and its file has every button', async () => {
    // First visit: the teacher unticks the box and saves the choices as a preset.
    const first = await openMaker();
    let kept;
    try {
      first.tick('f-simple-bar', false);
      first.$('ra-preset-name').value = 'My class';
      first.$('ra-preset-save').click();
      kept = first.storage();
      expect(JSON.parse(kept[PRESET_KEY])[0]).toMatchObject({ name: 'My class', data: { simpleBar: false } });
    } finally { first.close(); }

    // The page is loaded again in the same browser. It keeps no choice by itself (only presets), so the box starts
    // ticked; picking the preset unticks it, as it did before 2026-11-23.
    const again = await openMaker({ storage: kept });
    try {
      expect(again.$('f-simple-bar').checked).toBe(true);
      again.type('f-text', PASSAGE);
      await again.file();
      again.$('ra-preset-select').value = 'My class';
      again.$('ra-preset-select').dispatchEvent(new again.w.Event('change', { bubbles: true }));
      expect(again.$('f-simple-bar').checked).toBe(false);
      await until(() => again.state().made && again.state().made.simpleBar === false, 'the file to follow the preset');
      expect((await again.fileSays()).simpleBar).toBe(false);
    } finally { again.close(); }
  });

  it('a preset saved before the box existed (it does not say) still unticks it; one saved with it on ticks it', async () => {
    const storage = { [PRESET_KEY]: JSON.stringify([
      { name: 'Old preset', data: { pos: false, dict: false } },
      { name: 'Simple on', data: { pos: false, dict: false, simpleBar: true } },
    ]) };
    const page = await openMaker({ storage });
    try {
      const pick = (name) => { page.$('ra-preset-select').value = name; page.$('ra-preset-select').dispatchEvent(new page.w.Event('change', { bubbles: true })); };
      expect(page.$('f-simple-bar').checked).toBe(true);
      pick('Old preset');
      expect(page.$('f-simple-bar').checked).toBe(false);
      pick('Simple on');
      expect(page.$('f-simple-bar').checked).toBe(true);
    } finally { page.close(); }
  });

  it('a reopened file shows the setting it was made with: off stays off (old files too), on stays on', async () => {
    // Made on this page with the box unticked, and with it left ticked.
    const maker = await openMaker();
    let madeOff, madeOn;
    try {
      maker.type('f-text', PASSAGE);
      madeOn = await maker.file();
      maker.tick('f-simple-bar', false);
      await until(() => maker.state().made && maker.state().made.simpleBar === false, 'the file without the simple bar');
      madeOff = await maker.file();
    } finally { maker.close(); }
    // A file made before today, or by other code that calls the builder and does not say.
    const sentences = RA.splitPassage(PASSAGE);
    const older = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, title: 'Fox', sentences, clips: {} }), loader }).html;

    for (const [name, html, want] of [['made off', madeOff, false], ['older file', older, false], ['made on', madeOn, true]]) {
      const page = await openMaker();
      try {
        expect(page.$('f-simple-bar').checked, name).toBe(true);
        expect(page.w.AlloPacketReadAlongPage.reopen(html, 'Fox.html'), name).toBe(true);
        expect(page.$('f-simple-bar').checked, name).toBe(want);
        expect(page.$('f-text').value, name).toContain('The fox ran to the den.');
        // Saved again without touching anything, the file keeps the same toolbar.
        await until(() => page.state().made && page.state().made.simpleBar === want, name + ': the file to be made again');
        expect((await page.fileSays()).simpleBar, name).toBe(want);
      } finally { page.close(); }
    }
  });

  it('a draft handed over from AlloFlow carries no toolbar setting and does not touch the box', async () => {
    const draft = { kind: 'read_along', title: 'Fox', text: PASSAGE, lang: 'en', simpleBar: false };
    const fresh = await openMaker();
    try {
      // The hand-over keeps only what it knows; a toolbar setting is not part of a draft.
      expect(fresh.w.AlloPacketHandoff.sanitizeDraft(draft)).not.toHaveProperty('simpleBar');
      expect(fresh.w.AlloPacketReadAlongPage.importDraft(fresh.w.AlloPacketHandoff.sanitizeDraft(draft))).toBe(true);
      expect(fresh.$('f-text').value).toBe(PASSAGE);
      expect(fresh.$('f-simple-bar').checked).toBe(true);
      expect((await fresh.fileSays()).simpleBar).toBe(true);
    } finally { fresh.close(); }
    // A teacher who unticked the box before the draft arrived keeps it unticked.
    const unticked = await openMaker();
    try {
      unticked.tick('f-simple-bar', false);
      expect(unticked.w.AlloPacketReadAlongPage.importDraft(unticked.w.AlloPacketHandoff.sanitizeDraft(draft))).toBe(true);
      expect(unticked.$('f-simple-bar').checked).toBe(false);
      expect((await unticked.fileSays()).simpleBar).toBe(false);
    } finally { unticked.close(); }
  });
});

describe('2. the fold of rare choices is called "More options" on every maker that has one', () => {
  const pageDoc = (file) => new JSDOM(read(file)).window.document;
  const folds = (d) => Array.from(d.querySelectorAll('details.more')).map((box) => ({
    id: box.id,
    name: box.querySelector(':scope > summary .more-name').textContent.replace(/\s+/g, ' ').trim(),
    now: box.querySelector(':scope > summary .more-now').id,
  }));

  it('Word Sounds: three folds, as before', () => {
    expect(folds(pageDoc('packets-make.html'))).toEqual([
      { id: 'more-1', name: 'More options', now: 'more-1-now' },
      { id: 'more-2', name: 'More options', now: 'more-2-now' },
      { id: 'more-3', name: 'More options', now: 'more-3-now' },
    ]);
  });

  it('Vocabulary: the fold that said "More choices"', () => {
    const d = pageDoc('packets-vocab.html');
    expect(folds(d)).toEqual([{ id: 'more', name: 'More options', now: 'more-now' }]);
    expect(d.body.textContent).not.toContain('More choices');
  });

  it('Symbol Runner: the fold that said "Settings", and the sentence that points to it', () => {
    const d = pageDoc('packets-symbol-runner.html');
    expect(folds(d)).toEqual([{ id: 'sr-more-2', name: 'More options', now: 'sr-more-2-now' }]);
    const intro = d.querySelector('#step-2 .sheet-intro').textContent;
    expect(intro).toContain('Open More options to change how the student answers');
    expect(d.body.textContent).not.toMatch(/Open Settings|\bSettings\b/);
  });

  it('the read-along page keeps its three named folds', () => {
    expect(folds(pageDoc('packets-read-along.html'))).toEqual([
      { id: 'custom-supports-panel', name: 'Custom notes & supports (optional)', now: 'custom-supports-now' },
      { id: 'check-questions-panel', name: 'Comprehension check-in questions (optional)', now: 'check-questions-now' },
      { id: 'more-supports', name: 'Reading supports and print options', now: 'more-supports-now' },
    ]);
  });
});
