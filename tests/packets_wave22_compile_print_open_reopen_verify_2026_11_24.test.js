// @vitest-environment jsdom
// Wave 22 checks (2026-11-24):
// 1. Printable paper worksheet & toggleable Page 2 Answer Key in packets-compile.html/css/js.
// 2. Full Wave 2-5 classification & routing in packets-open.js and packets_reopen.js.
// 3. Plain-language Home-Language Directions, Station Mode, and non-scored toolkit notes in packets_verify_core.js.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (f) => readFileSync(f, 'utf8');

describe('Wave 22 Compile Print Backup and Full Wave 2-5 Open / Reopen / Verify Coverage', () => {
  it('renders printable paper worksheets and toggleable Page 2 Answer Keys across compiled samples in packets-compile.html', async () => {
    const dom = new JSDOM(read('packets-compile.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-compile.html',
    });
    const w = dom.window;
    let printCalls = 0;
    w.print = () => { printCalls++; };

    w.eval(read('word_sounds_take_home_loader.js'));
    w.eval(read('packets_verify_core.js'));
    w.eval(read('packets_station_bilingual.js'));
    w.eval(read('packet_sort_write_adapters.js'));
    w.eval(read('packet_choice_builder.js'));
    w.eval(read('packets_main_app_compiler.js'));
    w.eval(read('packets-compile.js'));

    const d = w.document;
    if (d.getElementById('step-1').hidden) d.dispatchEvent(new w.Event('DOMContentLoaded'));

    const sheet = d.getElementById('paper-comp-sheet');
    const fold = d.getElementById('paper-comp-fold');

    // 1. Default sample_quiz
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();
    expect(sheet.getAttribute('data-ready')).toBe('1');
    expect(sheet.hidden).toBe(true);
    fold.open = true;
    fold.dispatchEvent(new w.Event('toggle'));
    expect(sheet.hidden).toBe(false);
    expect(sheet.querySelector('h4.paper-comp-title')).toBeTruthy();
    expect(sheet.querySelectorAll('.paper-comp-q').length).toBeGreaterThanOrEqual(2);
    expect(sheet.querySelector('.paper-comp-key')).toBeTruthy();

    // Toggle Page 2 Answer Key off & back on
    const keyCb = d.getElementById('f-paper-comp-key');
    keyCb.checked = false;
    keyCb.dispatchEvent(new w.Event('change'));
    expect(sheet.querySelector('.paper-comp-key')).toBeNull();
    keyCb.checked = true;
    keyCb.dispatchEvent(new w.Event('change'));
    expect(sheet.querySelector('.paper-comp-key')).toBeTruthy();

    // Print triggers window.print
    d.getElementById('print-paper-comp').click();
    expect(printCalls).toBe(1);

    // 2. Concept Sort sample
    d.getElementById('back-3').click();
    d.getElementById('back-2').click();
    d.querySelector('[data-sample-id="sample_concept_sort"]').click();
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();
    expect(sheet.textContent).toContain('Cards to sort');
    expect(sheet.querySelector('.paper-comp-key')).toBeTruthy();

    // 3. DBQ / Sentence Frames Writing sample
    d.getElementById('back-3').click();
    d.getElementById('back-2').click();
    d.querySelector('[data-sample-id="sample_dbq_writing"]').click();
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();
    expect(sheet.textContent).toContain('Optional Sentence Frames');

    // 4. Anchor Chart sample
    d.getElementById('back-3').click();
    d.getElementById('back-2').click();
    d.querySelector('[data-sample-id="sample_anchor_chart"]').click();
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();
    expect(sheet.textContent).toContain('Quick Self-Check');

    expect(read('packets-compile.css').split('@media print')[0]).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(read('packets-compile.js')).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
    await new Promise((r) => setTimeout(r, 0));
    dom.window.close();
  });

  it('routes every Wave 2-5 packet accurately in packets_reopen.js and packets-open.html instead of misclassifying as Word Sounds or Math Check', async () => {
    const rawLoader = require('../word_sounds_take_home_loader.js');
    const loader = rawLoader && typeof rawLoader.buildHtml === 'function' ? rawLoader : window.AlloWordSoundsTakeHome;
    const verify = require('../packets_verify_core.js');
    const reopen = require('../packets_reopen.js');
    const bilingual = require('../packets_station_bilingual.js');
    const maze = require('../packet_maze_builder.js');
    const stem = require('../packet_stem_lab_builder.js');
    const sel = require('../packet_sel_builder.js');
    const manip = require('../packet_manipulative_builder.js');
    const life = require('../packet_life_skills_builder.js');
    const aac = require('../packet_aac_builder.js');
    const choice = require('../packet_choice_builder.js');
    const adapters = require('../packet_sort_write_adapters.js');
    const playlist = require('../packet_playlist_builder.js');
    const compiler = require('../packets_main_app_compiler.js');

    const mazeCheck = maze.buildMazePacket({ loader, passage: maze.passageById('g4_5_monarch_journey').passage, title: 'Monarch Check', mode: 'probe', form: 'A', stationBilingual: bilingual });
    const stemLab = stem.buildStemLabPacket({ loader, activity: 'stem_circuit', title: 'Series Circuit', items: stem.starterById('circuit_series_basics').items, mode: 'probe', stationBilingual: bilingual });
    const selKit = sel.buildSelPacket({ loader, starterId: 'sel_daily_toolkit_mix', homeLanguages: ['es', 'ar'], stationMode: true, stationBilingual: bilingual });
    const manipPkt = manip.buildManipulativePacket({ loader, starterId: 'frac_equiv_g4', stationBilingual: bilingual });
    const lifePkt = life.buildLifeSkillsPacket({ loader, starterId: 'ls_money_change', stationBilingual: bilingual });
    const aacPkt = aac.buildAacPacket({ loader, title: 'Core AAC', gridLayout: '4x4', folders: aac.starterById('bilingual_core_en_es').folders, homeLanguages: ['es'], stationBilingual: bilingual });
    const choicePkt = choice.buildChoicePacket({ loader, adapters, activity: 'choice_board', title: 'Eco Choice', items: [choice.templateById('sci_ecosystems_choice').item], stationBilingual: bilingual });
    const plPkt = playlist.buildPlaylistPacket({ loader, arcId: 'arc_sci_lit_g35', builders: { choice, sortWrite: adapters, maze, manipulatives: manip, stemLab: stem, lifeSkills: life, sel }, stationBilingual: bilingual });
    const compPkt = compiler.compileActivityPacket({ artifact: compiler.sampleById('sample_quiz').artifact, mode: 'probe', loader, choiceBuilder: choice, choiceAdapters: adapters, stationBilingual: bilingual });

    const cases = [
      [mazeCheck.html, 'maze', 'packets-maze.html'],
      [stemLab.html, 'stem', 'packets-stem-lab.html'],
      [selKit.html, 'sel', 'packets-sel.html'],
      [manipPkt.html, 'manipulatives', 'packets-manipulatives.html'],
      [lifePkt.html, 'life', 'packets-life-skills.html'],
      [aacPkt.html, 'aac', 'packets-aac.html'],
      [choicePkt.html, 'choice', 'packets-choice.html'],
      [plPkt.html, 'playlist', 'packets-playlist.html'],
      [compPkt.html, 'compile', 'packets-compile.html'],
    ];

    for (const [html, expectedKind, expectedHref] of cases) {
      const rWs = reopen.read(html, { verify });
      expect(rWs.ok).toBe(false);
      expect(rWs.kind).toBe(expectedKind);
      expect(rWs.page && rWs.page.href).toBe(expectedHref);

      const rChk = reopen.readCheck(html, { verify });
      expect(rChk.ok).toBe(false);
      expect(rChk.kind).toBe(expectedKind);
      expect(rChk.page && rChk.page.href).toBe(expectedHref);
    }

    // Verify packets-open.html classifies CBM-Maze check & Unit Playlist cleanly
    const dom = new JSDOM(read('packets-open.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-open.html',
    });
    const w = dom.window;
    w.eval(read('packets_verify_core.js'));
    w.eval(read('packets_handoff.js'));
    w.eval(read('packets-open.js'));
    const d = w.document;
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    const dropFile = async (html, name, expectKind) => {
      const enc = new TextEncoder().encode(html);
      const fakeFile = { name, size: enc.byteLength, arrayBuffer: async () => enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.byteLength) };
      const ev = new w.Event('drop', { bubbles: true, cancelable: true });
      ev.dataTransfer = { types: ['Files'], files: [fakeFile] };
      d.getElementById('drop').dispatchEvent(ev);
      for (let i = 0; i < 80 && (d.getElementById('found').hidden || (expectKind && d.getElementById('found-kind').textContent !== expectKind)); i++) {
        await new Promise((r) => setTimeout(r, 15));
      }
    };

    await dropFile(mazeCheck.html, 'monarch-check.html', 'CBM-Maze reading check');
    expect(d.getElementById('found-kind').textContent).toBe('CBM-Maze reading check');
    expect(d.getElementById('found-teacher').hidden).toBe(false);

    await dropFile(plPkt.html, 'unit-playlist.html', 'Unit playlist');
    expect(d.getElementById('found-kind').textContent).toBe('Unit playlist');
    expect(d.getElementById('found-teacher').hidden).toBe(false);

    // Verify packets_verify_core.js surfaces Home-language directions, Station Mode, and non-scored toolkit privacy before Inside the file
    const rep = verify.verifyPacket(selKit.html);
    expect(rep.result).toBe('closed');
    expect(rep.plain.about.some((l) => /Home-language directions: es, ar/.test(l))).toBe(true);
    expect(rep.plain.about.some((l) => /Station Mode: on for shared devices/.test(l))).toBe(true);
    expect(rep.plain.about.some((l) => /Non-scored support toolkit:/.test(l))).toBe(true);
    expect(rep.plain.about[rep.plain.about.length - 1]).toMatch(/^Inside the file:/);

    dom.window.close();
  });
});
