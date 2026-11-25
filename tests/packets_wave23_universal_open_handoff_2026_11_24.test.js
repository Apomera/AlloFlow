// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const verify = require('../packets_verify_core.js');
const handoffMod = require('../packets_handoff.js');
const rawLoader = require('../word_sounds_take_home_loader.js');
const loader = (rawLoader && typeof rawLoader.buildHtml === 'function')
  ? rawLoader
  : (typeof window !== 'undefined' ? window.AlloWordSoundsTakeHome : null);
const adapters = require('../packet_sort_write_adapters.js');
const choiceBuilder = require('../packet_choice_builder.js');
const mazeBuilder = require('../packet_maze_builder.js');
const manipBuilder = require('../packet_manipulative_builder.js');
const stemBuilder = require('../packet_stem_lab_builder.js');
const lifeBuilder = require('../packet_life_skills_builder.js');
const aacBuilder = require('../packet_aac_builder.js');
const selBuilder = require('../packet_sel_builder.js');
const playlistBuilder = require('../packet_playlist_builder.js');
const compiler = require('../packets_main_app_compiler.js');

const toAb = (str) => {
  const u8 = new TextEncoder().encode(str);
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
};

async function waitUntil(fn, tries = 80) {
  for (let i = 0; i < tries; i++) {
    if (fn()) return true;
    await new Promise((r) => setTimeout(r, 15));
  }
  return fn();
}

function buildSamplePackets() {
  const choiceTpl = choiceBuilder.templates().find((t) => t.activity === 'concept_sort');
  const choicePkt = choiceBuilder.buildChoicePacket({
    activity: 'concept_sort',
    mode: 'practice',
    title: 'Handed Concept Sort',
    items: [choiceTpl.item],
  }, { loader, adapters });

  const mazePkt = mazeBuilder.buildMazePacket({
    mode: 'probe',
    title: 'Handed Maze Passage',
    passage: mazeBuilder.passages()[0].passage,
    form: 'Form B',
    timeLimitS: 180,
  }, { loader });

  const manipStarter = manipBuilder.STARTER_SETS[0];
  const manipPkt = manipBuilder.buildManipulativePacket({
    activity: manipStarter.activity,
    mode: 'practice',
    title: 'Handed Base-Ten Mat',
    items: manipStarter.items,
  }, { loader });

  const stemStarter = stemBuilder.starters().find((s) => s.activity === 'stem_circuit');
  const stemPkt = stemBuilder.buildStemLabPacket({
    activity: 'stem_circuit',
    mode: 'practice',
    title: 'Handed Circuit Lab',
    items: stemStarter.items,
  }, { loader });

  const lifeStarter = lifeBuilder.STARTER_SETS[0];
  const lifePkt = lifeBuilder.buildLifeSkillsPacket({
    activity: lifeStarter.activity,
    mode: 'practice',
    title: 'Handed Life Skills',
    items: lifeStarter.items,
  }, { loader });

  const aacStarter = aacBuilder.starters()[0];
  const aacPkt = aacBuilder.buildAacPacket({
    title: 'Handed AAC Board',
    gridLayout: '3x4',
    folders: aacStarter.folders,
  }, { loader });

  const selStarter = selBuilder.STARTER_SETS[0];
  const selPkt = selBuilder.buildSelPacket({
    activity: selStarter.activity,
    title: 'Handed SEL Toolkit',
    items: selStarter.items,
  }, { loader });

  const plArc = playlistBuilder.STARTER_ARCS[0];
  const plPkt = playlistBuilder.buildPlaylistPacket({
    title: 'Handed Unit Playlist',
    arcId: plArc.id,
    stages: plArc.stageIds.map((id) => playlistBuilder.stageById(id)),
  }, { loader });

  const compSample = compiler.sampleById('sample_quiz');
  const compPkt = compiler.compileActivityPacket({
    artifact: compSample.artifact,
    title: 'Handed Compiled Quiz',
    mode: 'practice',
  }, { loader, choiceBuilder, choiceAdapters: adapters });

  return { choicePkt, mazePkt, manipPkt, stemPkt, lifePkt, aacPkt, selPkt, plPkt, compPkt };
}

function bootMakerWithHandoff({ htmlFile, scripts, packetHtml, fileName, hash = '#open-file' }) {
  const dom = new JSDOM(read(htmlFile), {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: `https://packets.test/${htmlFile}${hash}`,
  });
  const w = dom.window;
  let took = false;
  const redirected = [];
  for (const s of scripts) {
    w.eval(read(s));
    if (s === 'packets_handoff.js') {
      w.AlloPacketHandoff = Object.assign({}, w.AlloPacketHandoff, {
        take: () => {
          took = true;
          return Promise.resolve({ name: fileName, bytes: toAb(packetHtml) });
        },
        redirect: (file, href, h) => {
          redirected.push({ name: file && file.name, byteLength: file && file.bytes && file.bytes.byteLength, href, hash: h });
          return Promise.resolve(true);
        },
      });
    }
  }
  if (w.document.readyState === 'loading') w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return { dom, w, d: w.document, wasTaken: () => took, redirected };
}

describe('Wave 23: universal #open-file handoff and 1-click wrong-maker redirect', () => {
  const pkts = buildSamplePackets();

  it('packets_handoff.ownerPage classifies every Wave 2-5 packet and results files accurately', () => {
    expect(handoffMod.ownerPage(pkts.choicePkt.html, verify)).toMatchObject({ kind: 'choice', href: 'packets-choice.html', hash: '#open-file' });
    expect(handoffMod.ownerPage(pkts.mazePkt.html, verify)).toMatchObject({ kind: 'maze', href: 'packets-maze.html', hash: '#open-file' });
    expect(handoffMod.ownerPage(pkts.manipPkt.html, verify)).toMatchObject({ kind: 'manipulatives', href: 'packets-manipulatives.html', hash: '#open-file' });
    expect(handoffMod.ownerPage(pkts.stemPkt.html, verify)).toMatchObject({ kind: 'stem', href: 'packets-stem-lab.html', hash: '#open-file' });
    expect(handoffMod.ownerPage(pkts.lifePkt.html, verify)).toMatchObject({ kind: 'life', href: 'packets-life-skills.html', hash: '#open-file' });
    expect(handoffMod.ownerPage(pkts.aacPkt.html, verify)).toMatchObject({ kind: 'aac', href: 'packets-aac.html', hash: '#open-file' });
    expect(handoffMod.ownerPage(pkts.selPkt.html, verify)).toMatchObject({ kind: 'sel', href: 'packets-sel.html', hash: '#open-file' });
    expect(handoffMod.ownerPage(pkts.plPkt.html, verify)).toMatchObject({ kind: 'playlist', href: 'packets-playlist.html', hash: '#open-file' });
    expect(handoffMod.ownerPage(pkts.compPkt.html, verify)).toMatchObject({ kind: 'compile', href: 'packets-compile.html', hash: '#open-file' });

    const resJson = JSON.stringify({ kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'S-1', packet: { id: 'x', version: '1', form: 'A', mode: 'practice' }, score: { earned: 1, possible: 1, completion: 'complete' } });
    expect(handoffMod.ownerPage(resJson, verify)).toMatchObject({ kind: 'results', href: 'packets-results.html', hash: '#import-results' });
  });

  it('packets-open.html enables Change this file for all Wave 2-5 makers and hands off bytes on click', async () => {
    const dom = new JSDOM(read('packets-open.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-open.html',
    });
    const w = dom.window;
    w.eval(read('packets_verify_core.js'));
    w.eval(read('packets_handoff.js'));
    const puts = [];
    w.AlloPacketHandoff = Object.assign({}, w.AlloPacketHandoff, {
      put: (file) => { puts.push({ name: file.name, bytes: file.bytes }); return Promise.resolve(true); },
    });
    w.eval(read('packets-open.js'));
    const d = w.document;
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    const cases = [
      { html: pkts.choicePkt.html, name: 'sort.html', kind: 'Choice, Sort & Write practice', href: 'packets-choice.html' },
      { html: pkts.stemPkt.html, name: 'circuit.html', kind: 'STEM Lab practice', href: 'packets-stem-lab.html' },
      { html: pkts.aacPkt.html, name: 'aac.html', kind: 'AAC communication board', href: 'packets-aac.html' },
      { html: pkts.selPkt.html, name: 'sel.html', kind: 'Focus & UDL toolkit', href: 'packets-sel.html' },
      { html: pkts.compPkt.html, name: 'quiz.html', kind: 'Compiled activity', href: 'packets-compile.html' },
    ];

    for (const c of cases) {
      const enc = new TextEncoder().encode(c.html);
      const fakeFile = { name: c.name, size: enc.byteLength, arrayBuffer: async () => enc.buffer.slice(enc.byteOffset, enc.byteOffset + enc.byteLength) };
      const ev = new w.Event('drop', { bubbles: true, cancelable: true });
      ev.dataTransfer = { types: ['Files'], files: [fakeFile] };
      d.getElementById('drop').dispatchEvent(ev);
      await waitUntil(() => !d.getElementById('found').hidden && d.getElementById('found-kind').textContent === c.kind);
      expect(d.getElementById('found-kind').textContent).toBe(c.kind);
      expect(d.getElementById('found-teacher').hidden).toBe(false);
    }

    // Clicking #change on the last loaded file (Compiled activity) puts its bytes into handoff
    d.getElementById('change').click();
    await waitUntil(() => puts.length === 1);
    expect(puts[0].name).toBe('quiz.html');
    expect(puts[0].bytes.byteLength).toBeGreaterThan(1000);
    expect(d.getElementById('change-link').getAttribute('href')).toBe('packets-compile.html');
    dom.window.close();
  });

  it('all 8 Wave 2-4 makers auto-reopen a handed-off #open-file packet straight into Step 2', async () => {
    const common = ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_station_bilingual.js', 'packets_qr_crypto.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets_zip.js'];
    const makers = [
      {
        htmlFile: 'packets-choice.html',
        scripts: ['packets-page.js', 'word_sounds_take_home_loader.js', 'packet_sort_write_adapters.js', 'packet_choice_builder.js', 'packets_station_bilingual.js', 'packets_qr_crypto.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets_zip.js', 'packets-choice.js'],
        packetHtml: pkts.choicePkt.html,
        fileName: 'sort.html',
        expectTitle: 'Handed Concept Sort',
      },
      {
        htmlFile: 'packets-maze.html',
        scripts: [...common, 'packet_maze_builder.js', 'packets-maze.js'],
        packetHtml: pkts.mazePkt.html,
        fileName: 'maze.html',
        expectTitle: 'Handed Maze Passage',
      },
      {
        htmlFile: 'packets-manipulatives.html',
        scripts: [...common, 'packet_manipulative_builder.js', 'packets-manipulatives.js'],
        packetHtml: pkts.manipPkt.html,
        fileName: 'manip.html',
        expectTitle: 'Handed Base-Ten Mat',
      },
      {
        htmlFile: 'packets-stem-lab.html',
        scripts: [...common, 'packet_stem_lab_builder.js', 'packets-stem-lab.js'],
        packetHtml: pkts.stemPkt.html,
        fileName: 'stem.html',
        expectTitle: 'Handed Circuit Lab',
      },
      {
        htmlFile: 'packets-life-skills.html',
        scripts: [...common, 'packet_life_skills_builder.js', 'packets-life-skills.js'],
        packetHtml: pkts.lifePkt.html,
        fileName: 'life.html',
        expectTitle: 'Handed Life Skills',
      },
      {
        htmlFile: 'packets-aac.html',
        scripts: [...common, 'packet_aac_builder.js', 'packets-aac.js'],
        packetHtml: pkts.aacPkt.html,
        fileName: 'aac.html',
        expectTitle: 'Handed AAC Board',
      },
      {
        htmlFile: 'packets-sel.html',
        scripts: [...common, 'packet_sel_builder.js', 'packets-sel.js'],
        packetHtml: pkts.selPkt.html,
        fileName: 'sel.html',
        expectTitle: 'Handed SEL Toolkit',
      },
      {
        htmlFile: 'packets-compile.html',
        scripts: ['packets-page.js', 'word_sounds_take_home_loader.js', 'packet_sort_write_adapters.js', 'packet_choice_builder.js', 'packets_main_app_compiler.js', 'packets_station_bilingual.js', 'packets_qr_crypto.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets_zip.js', 'packets-compile.js'],
        packetHtml: pkts.compPkt.html,
        fileName: 'comp.html',
        expectTitle: 'Handed Compiled Quiz',
      },
    ];

    for (const m of makers) {
      const ctx = bootMakerWithHandoff(m);
      const ok = await waitUntil(() => !ctx.d.getElementById('step-2').hidden && !ctx.d.getElementById('reopen-note').hidden);
      expect(ok, `${m.htmlFile} should open Step 2 from #open-file`).toBe(true);
      expect(ctx.wasTaken()).toBe(true);
      expect(ctx.d.getElementById('reopen-line').textContent).toContain(m.expectTitle);
      expect(ctx.w.location.hash).toBe('');
      ctx.dom.window.close();
    }
  });

  it('wrong-maker drops surface exact owner page and hand off bytes in 1 click via #reopen-page', async () => {
    // 1) Drop a CBM-Maze packet into STEM Labs -> 1-click redirect to packets-maze.html#open-file
    const stemCtx = bootMakerWithHandoff({
      htmlFile: 'packets-stem-lab.html',
      scripts: ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_station_bilingual.js', 'packets_qr_crypto.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets_zip.js', 'packet_stem_lab_builder.js', 'packets-stem-lab.js'],
      packetHtml: pkts.mazePkt.html,
      fileName: 'wrong-maze.html',
      hash: '#open-file',
    });
    await waitUntil(() => !stemCtx.d.getElementById('reopen-note').hidden && !stemCtx.d.getElementById('reopen-page').hidden);
    const stemLink = stemCtx.d.getElementById('reopen-page');
    expect(stemLink.getAttribute('href')).toBe('packets-maze.html');
    expect(stemLink.textContent).toContain('CBM-Maze Reading');
    stemLink.click();
    await waitUntil(() => stemCtx.redirected.length === 1);
    expect(stemCtx.redirected[0]).toMatchObject({ name: 'wrong-maze.html', href: 'packets-maze.html', hash: '#open-file' });
    expect(stemCtx.redirected[0].byteLength).toBeGreaterThan(1000);
    stemCtx.dom.window.close();

    // 2) Drop a results JSON into AAC Boards -> 1-click redirect to packets-results.html#import-results
    const resJson = JSON.stringify({ kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'S-2', packet: { id: 'x', version: '1', form: 'A', mode: 'practice' }, score: { earned: 2, possible: 2, completion: 'complete' } });
    const aacCtx = bootMakerWithHandoff({
      htmlFile: 'packets-aac.html',
      scripts: ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_station_bilingual.js', 'packets_qr_crypto.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets_zip.js', 'packet_aac_builder.js', 'packets-aac.js'],
      packetHtml: resJson,
      fileName: 'student-result.json',
      hash: '#open-file',
    });
    await waitUntil(() => !aacCtx.d.getElementById('reopen-note').hidden && !aacCtx.d.getElementById('reopen-page').hidden);
    const aacLink = aacCtx.d.getElementById('reopen-page');
    expect(aacLink.getAttribute('href')).toBe('packets-results.html');
    expect(aacLink.textContent).toContain('Add up results');
    aacLink.click();
    await waitUntil(() => aacCtx.redirected.length === 1);
    expect(aacCtx.redirected[0]).toMatchObject({ name: 'student-result.json', href: 'packets-results.html', hash: '#import-results' });
    aacCtx.dom.window.close();

    // 3) Drop an AAC board into Unit Playlists -> 1-click redirect to packets-aac.html#open-file
    const plCtx = bootMakerWithHandoff({
      htmlFile: 'packets-playlist.html',
      scripts: ['packets-page.js', 'word_sounds_take_home_loader.js', 'packets_station_bilingual.js', 'packets_qr_crypto.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets_zip.js', 'packet_playlist_builder.js', 'packets-playlist.js'],
      packetHtml: pkts.aacPkt.html,
      fileName: 'wrong-aac.html',
      hash: '#open-file',
    });
    await waitUntil(() => !plCtx.d.getElementById('reopen-note').hidden && !plCtx.d.getElementById('reopen-page').hidden);
    const plLink = plCtx.d.getElementById('reopen-page');
    expect(plLink.getAttribute('href')).toBe('packets-aac.html');
    expect(plLink.textContent).toContain('AAC Boards');
    plLink.click();
    await waitUntil(() => plCtx.redirected.length === 1);
    expect(plCtx.redirected[0]).toMatchObject({ name: 'wrong-aac.html', href: 'packets-aac.html', hash: '#open-file' });
    plCtx.dom.window.close();
  });

  it('modified Wave 23 scripts keep strict CSP / pure-DOM discipline', () => {
    const files = [
      'packets_handoff.js', 'packets-open.js',
      'packets-choice.js', 'packets-maze.js', 'packets-manipulatives.js',
      'packets-stem-lab.js', 'packets-life-skills.js', 'packets-aac.js',
      'packets-sel.js', 'packets-playlist.js', 'packets-compile.js',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} must not use innerHTML/outerHTML`).not.toMatch(/\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/);
    }
  });
});
