// @vitest-environment jsdom
// Wave 21 checks (2026-11-24):
// 1. Printable Student Unit Passport & Stage Checklist in packets-playlist.html/css/js + Print-Ready badge in packets_starter_packs.js.
// 2. Copy filtered link button in packets-packs.html/css/js round-tripping through URL hash filters.
// 3. Real Wave 2-5 builder support keys in packets_followup.js and packets-results.js Group UDL summary.
// 4. Wave 2-4 missed-item aggregation & maker links in packets-results.html (group and student views).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (f) => readFileSync(f, 'utf8');

describe('Wave 21 Unit Playlist Passport, Shareable Pack Filter Link, and Wave 2-5 Results Bridge', () => {
  it('renders a grade-free printable Unit Passport & Stage Checklist in packets-playlist.html Step 3', async () => {
    const dom = new JSDOM(read('packets-playlist.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-playlist.html',
    });
    const w = dom.window;
    let printCalls = 0;
    w.print = () => { printCalls++; };

    w.eval(read('word_sounds_take_home_loader.js'));
    w.eval(read('packets_station_bilingual.js'));
    w.eval(read('packet_sort_write_adapters.js'));
    w.eval(read('packet_choice_builder.js'));
    w.eval(read('packet_maze_builder.js'));
    w.eval(read('packet_manipulative_builder.js'));
    w.eval(read('packet_stem_lab_builder.js'));
    w.eval(read('packet_life_skills_builder.js'));
    w.eval(read('packet_sel_builder.js'));
    w.eval(read('packet_playlist_builder.js'));
    w.eval(read('packets-playlist.js'));

    const d = w.document;
    if (d.getElementById('step-1').hidden) d.dispatchEvent(new w.Event('DOMContentLoaded'));

    d.getElementById('next-1').click();
    d.getElementById('next-2').click();

    const sheet = d.getElementById('paper-pl-sheet');
    const fold = d.getElementById('paper-pl-fold');
    expect(sheet.getAttribute('data-ready')).toBe('1');
    expect(sheet.hidden).toBe(true);

    fold.open = true;
    fold.dispatchEvent(new w.Event('toggle'));
    expect(sheet.hidden).toBe(false);

    expect(sheet.querySelector('h4.paper-pl-title')).toBeTruthy();
    expect(sheet.textContent).toContain('Unit Passport');
    expect(sheet.querySelectorAll('.paper-pl-stage').length).toBeGreaterThanOrEqual(2);
    expect(sheet.textContent).not.toMatch(/Grades?\s*\d/i);

    d.getElementById('print-paper-pl').click();
    expect(printCalls).toBe(1);

    const sp = require('../packets_starter_packs.js');
    expect(sp.packById('oer_unit_playlist_sci_lit').features).toContain('Print-Ready');

    expect(read('packets-playlist.css').split('@media print')[0]).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(read('packets-playlist.js')).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
    await new Promise((r) => setTimeout(r, 0));
    dom.window.close();
  });

  it('copies a shareable hash filter URL from packets-packs.html that round-trips cleanly', async () => {
    const dom = new JSDOM(read('packets-packs.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-packs.html',
    });
    const w = dom.window;
    const d = w.document;
    let copied = '';
    Object.defineProperty(w.navigator, 'clipboard', {
      value: { writeText: (t) => { copied = t; return Promise.resolve(); } },
      configurable: true,
    });
    w.eval(read('packets_starter_packs.js'));
    w.eval(read('packets-packs.js'));
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    const copyBtn = d.getElementById('btn-copy-filter-link');
    expect(copyBtn).toBeTruthy();
    expect(copyBtn.disabled).toBe(true);

    const gradeSel = d.getElementById('f-grade');
    gradeSel.value = '3-5';
    gradeSel.dispatchEvent(new w.Event('change'));
    d.querySelector('[data-feature="Bilingual Family Kit"]').click();
    expect(copyBtn.disabled).toBe(false);

    copyBtn.click();
    await new Promise((r) => setTimeout(r, 15));
    expect(copied).toContain('#grade=3-5&feature=Bilingual%20Family%20Kit');

    // Open a second DOM at the copied URL and verify filters restore identically
    const dom2 = new JSDOM(read('packets-packs.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: copied,
    });
    dom2.window.eval(read('packets_starter_packs.js'));
    dom2.window.eval(read('packets-packs.js'));
    if (dom2.window.document.readyState === 'loading') dom2.window.document.dispatchEvent(new dom2.window.Event('DOMContentLoaded'));
    expect(dom2.window.document.getElementById('f-grade').value).toBe('3-5');
    expect(dom2.window.document.querySelector('[data-feature="Bilingual Family Kit"]').getAttribute('aria-pressed')).toBe('true');

    dom.window.close();
    dom2.window.close();
  });

  it('maps real Wave 2-5 builder support keys and surfaces missed Wave 2-4 items + maker links in Results', async () => {
    const reader = require('../packets_results_reader.js');
    const followup = require('../packets_followup.js');

    const makeSessionJson = (sid, learner, items) => JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: sid,
      learner,
      packet: { id: 'mix-' + sid, version: 'r1', form: '', mode: 'practice' },
      lessonId: 'mix-' + sid,
      revision: 'r1',
      lessonTitle: 'Wave 2-5 Mixed Session',
      startedLocal: '2026-11-24T10:00:00-05:00',
      finishedLocal: '2026-11-24T10:12:00-05:00',
      durationMs: 720000,
      activeMs: 680000,
      summary: { items: items.length, done: items.length, firstTry: 0, afterRetry: 0, missed: items.length, practised: 0 },
      items: items.map((it, idx) => ({
        n: idx + 1,
        itemId: 'i-' + (idx + 1),
        activity: it.activity,
        word: it.word,
        target: it.word,
        responses: [it.resp || 'wrong'],
        attempts: 2,
        correct: !!it.correct,
        firstTry: !!it.firstTry,
        done: true,
        ms: 12000,
        supports: it.supports || {},
        practice: null,
        flag: '',
      })),
    });

    const sA = makeSessionJson('w21-a', 'MapleJay1', [
      { activity: 'manip_fraction_bars', word: 'Equivalent to 1/2', supports: { regroup: 1, balanceStep: 1 } },
      { activity: 'stem_circuit', word: 'Series Circuit Current', supports: { lab_circuit_toggle: 1, lab_tile_toggle: 1 } },
      { activity: 'life_money', word: 'Change $10 - $6.35', supports: { focusTimer: 1, calmBreath: 1, calmBreak: 1 } },
      { activity: 'concept_sort', word: 'States of Matter', supports: { aac_scan_used: 1, aac_sentence_spoken: 1, playlistRoadmap: 1 } },
    ]);
    const sB = makeSessionJson('w21-b', 'BirchOwl5', [
      { activity: 'manip_fraction_bars', word: 'Equivalent to 1/2', supports: { balanceStep: 1 } },
      { activity: 'stem_circuit', word: 'Series Circuit Current', supports: { lab_circuit_toggle: 1 } },
      { activity: 'life_money', word: 'Change $10 - $6.35', supports: { calmGround: 1, calmStretch: 1 } },
      { activity: 'concept_sort', word: 'States of Matter', supports: { aac_core_tap: 1 } },
    ]);

    const rA = await reader.read(sA, { name: 'a.json' });
    const rB = await reader.read(sB, { name: 'b.json' });
    expect(rA.ok && rB.ok).toBe(true);

    // Check packets_followup.js analyzeUdlSupports human labels for real builder keys
    const supA = followup.analyzeUdlSupports(rA.sessions);
    const labelsA = supA.itemSupports.map((x) => x.label);
    expect(labelsA).toContain('Base-ten regrouping');
    expect(labelsA).toContain('Balance-scale step');
    expect(labelsA).toContain('Circuit switch trial');
    expect(labelsA).toContain('Geometry grid exploration');
    expect(labelsA).toContain('Focus timer');
    expect(labelsA).toContain('Box breathing guide');
    expect(labelsA).toContain('Calm-down break card');
    expect(labelsA).toContain('Switch scanning (AAC)');
    expect(labelsA).toContain('AAC sentence bar voice');
    expect(labelsA).toContain('Unit playlist roadmap');

    // Load into packets-results.html DOM and check Group UDL summary, Group Missed table, and Student links
    const dom = new JSDOM(read('packets-results.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-results.html',
    });
    const w = dom.window;
    w.eval(read('packets_results_reader.js'));
    w.eval(read('packets_followup.js'));
    w.eval(read('packets-results.js'));

    const d = w.document;
    const files = [
      new w.File([sA], 'a.json', { type: 'application/json' }),
      new w.File([sB], 'b.json', { type: 'application/json' }),
    ];
    const ev = new w.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files };
    d.getElementById('main').dispatchEvent(ev);
    for (let i = 0; i < 150 && !/\bread[,.]/.test(d.getElementById('said').textContent); i++) {
      await new Promise((r) => setTimeout(r, 15));
    }
    const showBtn = d.getElementById('show-results');
    if (showBtn && !d.getElementById('state-check').hidden) showBtn.click();

    const groupUdlText = d.getElementById('group-udl').textContent;
    expect(groupUdlText).toContain('Interactive math or STEM lab tools: 2 students');
    expect(groupUdlText).toContain('Focus & self-regulation tools: 2 students');
    expect(groupUdlText).toContain('Switch scanning (AAC): 1 student');
    expect(groupUdlText).toContain('AAC communication board: 2 students');

    const groupMissed = d.getElementById('group-missed');
    expect(groupMissed.hidden).toBe(false);
    expect(groupMissed.textContent).toContain('Equivalent to 1/2');
    expect(groupMissed.textContent).toContain('Series Circuit Current');
    expect(groupMissed.textContent).toContain('Change $10 - $6.35');
    expect(groupMissed.textContent).toContain('States of Matter');
    const gHrefs = [...groupMissed.querySelectorAll('a.nav-new-tab')].map((a) => a.getAttribute('href'));
    expect(gHrefs).toContain('packets-manipulatives.html');
    expect(gHrefs).toContain('packets-stem-lab.html');
    expect(gHrefs).toContain('packets-life-skills.html');
    expect(gHrefs).toContain('packets-choice.html');

    // Switch to student view and verify individual maker links
    d.querySelector('#group-table button.name-link').click();
    const sHrefs = [...d.querySelectorAll('#learner-body .next-practice a.nav-new-tab')].map((a) => a.getAttribute('href'));
    expect(sHrefs).toContain('packets-manipulatives.html');
    expect(sHrefs).toContain('packets-stem-lab.html');
    expect(sHrefs).toContain('packets-life-skills.html');
    expect(sHrefs).toContain('packets-choice.html');

    dom.window.close();
  });
});
