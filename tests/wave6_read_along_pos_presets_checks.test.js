import { afterAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const RA = require('../packet_read_along_builder.js');
const VERIFY = require('../packets_verify_core.js');
const ZIP = require('../packets_zip.js');
const LOADER_SRC = read('word_sounds_take_home_loader.js');

function loadLoader() {
  const g = { crypto: webcrypto };
  g.window = g;
  new Function('window', LOADER_SRC).call(g, g);
  return g.AlloWordSoundsTakeHome;
}
const loader = loadLoader();

const opened = [];
afterAll(() => {
  opened.forEach((w) => { try { w.close(); } catch (_) {} });
});

const wait = (ms = 10) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, label, tries = 400) => {
  for (let i = 0; i < tries; i++) {
    if (fn()) return;
    await wait(15);
  }
  throw new Error('Timed out waiting for ' + label);
};

async function blobBytes(blob) {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer());
  if (typeof blob.text === 'function') return new TextEncoder().encode(await blob.text());
  return new Uint8Array(0);
}

async function openMakerPage() {
  const dom = new JSDOM(read('packets-read-along.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.test/site/packets-read-along.html',
  });
  const w = dom.window, d = w.document;
  opened.push(w);
  if (!w.TextEncoder) w.TextEncoder = TextEncoder;
  if (!w.TextDecoder) w.TextDecoder = TextDecoder;
  if (!w.crypto || !w.crypto.subtle) Object.defineProperty(w, 'crypto', { value: webcrypto });
  const downloads = [];
  const blobsByUrl = new Map();
  let urlSeq = 0;
  w.URL.createObjectURL = (blob) => {
    const u = 'blob:https://packets.test/ra6-' + (++urlSeq);
    blobsByUrl.set(u, blob);
    return u;
  };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {
    if (this.download) downloads.push({ name: this.download, href: this.href, blob: blobsByUrl.get(this.href) || null });
  };
  const scripts = [
    'word_sounds_take_home_loader.js',
    'packet_read_along_builder.js',
    'syllable_table_en.js',
    'packets_voice_engine.js',
    'packets_verify_core.js',
    'packets_reopen.js',
    'packets_handoff.js',
    'packets_zip.js',
    'packets-read-along.js',
  ];
  for (const src of scripts) w.eval(read(src));
  return {
    w, d, downloads,
    $: (id) => d.getElementById(id),
    type: (id, text) => {
      d.getElementById(id).value = text;
      d.getElementById(id).dispatchEvent(new w.Event('input', { bubbles: true }));
    },
    change: (id, val) => {
      const node = d.getElementById(id);
      if (val !== undefined) node.value = val;
      node.dispatchEvent(new w.Event('change', { bubbles: true }));
    },
    check: (id, checked) => {
      const node = d.getElementById(id);
      node.checked = checked;
      node.dispatchEvent(new w.Event('change', { bubbles: true }));
    },
  };
}

describe('Wave 6: Spanish syllabification, Spanish glosses, and 7-class POS tagging', () => {
  it('syllabifies Spanish words deterministically (onsets, diphthongs, hiatuses, silent u) and integrates into syllabifyLine & lessonFromReadAlong', () => {
    expect(RA.syllabifySpanish('mariposa')).toEqual(['ma', 'ri', 'po', 'sa']);
    expect(RA.syllabifySpanish('estrella')).toEqual(['es', 'tre', 'lla']);
    expect(RA.syllabifySpanish('pueblo')).toEqual(['pue', 'blo']);
    expect(RA.syllabifySpanish('poema')).toEqual(['po', 'e', 'ma']);
    expect(RA.syllabifySpanish('río')).toEqual(['rí', 'o']);
    expect(RA.syllabifySpanish('bosque')).toEqual(['bos', 'que']);
    expect(RA.syllabifySpanish('guitarra')).toEqual(['gui', 'ta', 'rra']);
    expect(RA.syllabifySpanish('mochila')).toEqual(['mo', 'chi', 'la']);
    expect(RA.syllabifySpanish('sol')).toBeNull();

    const line = RA.syllabifyLine('El zorro corre por el bosque bajo la estrella.', 'es');
    expect(line).toContain('zo·rro');
    expect(line).toContain('co·rre');
    expect(line).toContain('bos·que');
    expect(line).toContain('es·tre·lla');
    expect(line.split('·').join('')).toBe('El zorro corre por el bosque bajo la estrella.');

    // Offline Spanish K-12 gloss helper (exact, accent-folded, plural)
    expect(RA.SPANISH_GLOSSES.bosque).toBeTruthy();
    expect(RA.esGlossFor('bosque')?.def).toContain('forest');
    expect(RA.esGlossFor('arbol')?.word).toBe('árbol');
    expect(RA.esGlossFor('estrellas')?.word).toBe('estrella');
    expect(RA.esGlossFor('nonexistentwordxyz')).toBeNull();

    const made = RA.lessonFromReadAlong({
      loader,
      title: 'El bosque',
      text: 'El zorro corre por el bosque con su familia.',
      clips: {},
      lang: 'es',
      dictionary: true,
    });
    expect(made.syllables?.sentences).toBe(1);
    expect(made.lesson.blocks[0].items[0].lines[0].syl).toContain('bos·que');
    expect(made.dictionary?.words).toBeGreaterThanOrEqual(3);
  });

  it('supports optional 7-class POS tagging (n, v, j, a, p, r, c) while keeping 4-class default intact', () => {
    const sentence = 'She ran quickly into the tall woods and hid.';
    const fourClass = RA.posText(sentence);
    expect(fourClass).toContain(':v');
    expect(fourClass).toContain(':a');
    expect(fourClass).toContain(':j');
    expect(fourClass).toContain(':n');
    expect(fourClass).not.toMatch(/:[prc](?:,|$)/);

    const sevenClass = RA.posText(sentence, null, { extended: true });
    expect(sevenClass).toContain('0:p'); // She -> Pronoun
    expect(sevenClass).toContain('1:v'); // ran -> Verb
    expect(sevenClass).toContain('2:a'); // quickly -> Adverb
    expect(sevenClass).toContain('3:r'); // into -> Preposition
    expect(sevenClass).toContain('5:j'); // tall -> Adjective
    expect(sevenClass).toContain('6:n'); // woods -> Noun
    expect(sevenClass).toContain('7:c'); // and -> Conjunction
  });
});

describe('Wave 6: posScheme, posStyle, posPalette, defaultTools, and questions build + readBack round-trip', () => {
  it('builds, sanitizes, and round-trips all Wave 6 fields losslessly through buildReadAlongPacket and readBack', () => {
    const passage = 'She walked slowly across the bridge and smiled.\n---\nHe watched the bright stars.';
    const made = RA.lessonFromReadAlong({
      loader,
      title: 'Bridge Walk',
      text: passage,
      clips: {},
      pageMode: 'custom',
      partsOfSpeech: true,
      posExtended: true,
      posScheme: 'custom',
      posStyle: 'pill',
      posPalette: { n: '#112233', v: '#445566', j: 'not-a-hex', a: '#778899' },
      defaultTools: { focus: 3, font: 1, spacing: 2, colors: 2, rulerTint: 'sky', badKey: 99 },
      questions: [
        { id: 'q1', prompt: 'Where did she walk?', kind: 'mc', choices: ['Across the bridge', 'Into a cave', 'Up a hill'], answer: 0 },
        { id: 'q2', prompt: 'What did he watch?', kind: 'open' },
      ],
    });

    const items = made.lesson.blocks[0].items;
    expect(items).toHaveLength(2);
    expect(items[0].posScheme).toBe('custom');
    expect(items[0].posStyle).toBe('pill');
    expect(items[0].posPalette).toEqual({ n: '#112233', v: '#445566', a: '#778899' });
    expect(items[0].lines[0].pos).toMatch(/:p/);
    expect(items[0].questions).toBeUndefined();
    expect(items[1].questions).toHaveLength(2);
    expect(made.lesson.defaultTools).toEqual({ focus: 3, font: 1, spacing: 2, colors: 2, rulerTint: 'sky' });

    const built = RA.buildReadAlongPacket({ made, loader });
    expect(VERIFY.verifyPacket(built.html).counts.notExpected).toBe(0);

    const back = RA.readBack(VERIFY.readParts(built.html));
    expect(back.ok).toBe(true);
    expect(back.partsOfSpeech).toBe(true);
    expect(back.posExtended).toBe(true);
    expect(back.posScheme).toBe('custom');
    expect(back.posStyle).toBe('pill');
    expect(back.posPalette).toEqual({ n: '#112233', v: '#445566', a: '#778899' });
    expect(back.defaultTools).toEqual({ focus: 3, font: 1, spacing: 2, colors: 2, rulerTint: 'sky' });
    expect(back.questions).toEqual([
      { id: 'q1', prompt: 'Where did she walk?', kind: 'mc', choices: ['Across the bridge', 'Into a cave', 'Up a hill'], answer: 0 },
      { id: 'q2', prompt: 'What did he watch?', kind: 'open' },
    ]);
  });
});

describe('Wave 6: Maker UI (POS Customizer, Default Tools, Local Presets, Check-In Questions & Worksheet)', () => {
  it('wires POS customizer, starting tools, local teacher presets, comprehension check-ins, worksheet Part 4 + Answer Key, and bundle', async () => {
    const page = await openMakerPage();
    page.type('f-title', 'Forest Trail');
    page.type('f-text', 'She walked quickly through the green forest and smiled. The tall trees swayed in the wind.');
    await until(() => !page.$('save').hidden, 'initial build');

    // 1. POS Customizer visibility & controls
    expect(page.$('pos-customizer').hidden).toBe(true);
    page.check('f-pos', true);
    expect(page.$('pos-customizer').hidden).toBe(false);
    expect(page.$('pos-custom-colors').hidden).toBe(true);
    page.change('f-pos-scheme', 'custom');
    expect(page.$('pos-custom-colors').hidden).toBe(false);
    page.$('f-pos-c-n').value = '#123456';
    page.change('f-pos-c-n');
    page.change('f-pos-style', 'tags');
    page.check('f-pos-extended', true);

    // 2. Recommended Starting Reading Tools
    page.change('f-def-focus', '3');
    page.change('f-def-font', '1');
    page.change('f-def-spacing', '2');
    page.change('f-def-colors', '2');
    page.check('f-simple-bar', true);

    // 3. Save, clear, apply, and delete Local Teacher Presets (alloflow-ra-presets/1)
    page.$('ra-preset-name').value = 'Grade 4 Dyslexia Support';
    page.$('ra-preset-save').click();
    const rawSaved = page.w.localStorage.getItem('alloflow-ra-presets/1');
    expect(rawSaved).toContain('Grade 4 Dyslexia Support');
    expect(page.$('ra-preset-select').value).toBe('Grade 4 Dyslexia Support');
    expect(page.$('ra-preset-delete').disabled).toBe(false);

    // Reset controls then re-apply preset
    page.check('f-pos', false);
    page.change('f-def-focus', '');
    page.change('f-def-spacing', '');
    page.check('f-simple-bar', false);
    expect(page.$('f-pos').checked).toBe(false);
    expect(page.$('f-def-focus').value).toBe('');

    page.change('ra-preset-select', 'Grade 4 Dyslexia Support');
    expect(page.$('f-pos').checked).toBe(true);
    expect(page.$('f-pos-scheme').value).toBe('custom');
    expect(page.$('f-pos-style').value).toBe('tags');
    expect(page.$('f-pos-extended').checked).toBe(true);
    expect(page.$('f-pos-c-n').value).toBe('#123456');
    expect(page.$('f-def-focus').value).toBe('3');
    expect(page.$('f-def-font').value).toBe('1');
    expect(page.$('f-def-spacing').value).toBe('2');
    expect(page.$('f-def-colors').value).toBe('2');
    expect(page.$('f-simple-bar').checked).toBe(true);

    // Delete preset
    page.$('ra-preset-delete').click();
    expect(JSON.parse(page.w.localStorage.getItem('alloflow-ra-presets/1'))).toEqual([]);
    expect(page.$('ra-preset-delete').disabled).toBe(true);

    // 4. Add Comprehension Check-In Questions (1 MC + 1 Open)
    page.$('chk-prompt').value = 'Where did she walk?';
    page.change('chk-kind', 'mc');
    page.$('chk-choices').value = 'Through the green forest\nAcross the desert\nAlong the beach';
    page.change('chk-answer', '0');
    page.$('chk-add').click();

    page.$('chk-prompt').value = 'What made the trees sway?';
    page.change('chk-kind', 'open');
    expect(page.$('chk-mc-fields').hidden).toBe(true);
    page.$('chk-add').click();

    expect(page.$('chk-list').querySelectorAll('li').length).toBe(2);
    expect(page.$('check-questions-now').textContent).toBe('2 questions');

    // Verify built packet includes questions, defaultTools, and POS customizer settings
    const builtHtml = page.w.AlloPacketReadAlongPage.state.built.html;
    const back = RA.readBack(VERIFY.readParts(builtHtml));
    expect(back.posScheme).toBe('custom');
    expect(back.posStyle).toBe('tags');
    expect(back.posExtended).toBe(true);
    expect(back.defaultTools).toEqual({ focus: 3, font: 1, spacing: 2, colors: 2 });
    expect(back.questions).toHaveLength(2);

    // 5. Worksheet & Classroom Bundle render Part 4 check-in questions + Teacher Answer Key
    page.$('download-worksheet').click();
    expect(page.downloads).toHaveLength(1);
    const wsHtml = new TextDecoder('utf-8').decode(await blobBytes(page.downloads[0].blob));
    const wsDoc = new JSDOM(wsHtml).window.document;
    expect(wsDoc.querySelector('[data-ra-part="writing"]').textContent).toContain('Where did she walk?');
    expect(wsDoc.querySelector('[data-ra-part="writing"]').textContent).toContain('Through the green forest');
    expect(wsDoc.querySelector('[data-ra-part="writing"]').textContent).toContain('What made the trees sway?');
    const keySec = wsDoc.querySelector('[data-answer-key="true"]');
    expect(keySec).toBeTruthy();
    expect(keySec.textContent).toContain('A. Through the green forest');
    expect(keySec.textContent).toContain('Open response');

    // Bundle contains Student Worksheet (no answer key) + Teacher Answer Key
    page.$('download-bundle').click();
    expect(page.downloads).toHaveLength(2);
    const zEntries = ZIP.readZip(await blobBytes(page.downloads[1].blob));
    const dec = new TextDecoder('utf-8');
    const studentWs = dec.decode(zEntries.find((e) => e.name === '02-Student-Worksheet.html').bytes);
    const teacherWs = dec.decode(zEntries.find((e) => e.name === '03-Teacher-Answer-Key.html').bytes);
    expect(studentWs).toContain('Where did she walk?');
    expect(studentWs).not.toContain('data-answer-key="true"');
    expect(teacherWs).toContain('data-answer-key="true"');
    expect(teacherWs).toContain('A. Through the green forest');

    // 6. Contract guard: zero innerHTML on live DOM in packets-read-along.js
    expect(read('packets-read-along.js')).not.toMatch(/\.innerHTML\s*=/);
  });
});
