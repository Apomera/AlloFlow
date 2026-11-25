import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(process.cwd());
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;
const ZIP = require(path.join(ROOT, 'packets_zip.js'));
const CHOICE = require(path.join(ROOT, 'packet_choice_builder.js'));
const MAZE = require(path.join(ROOT, 'packet_maze_builder.js'));
const MANIP = require(path.join(ROOT, 'packet_manipulative_builder.js'));
const STEM = require(path.join(ROOT, 'packet_stem_lab_builder.js'));
const LIFE = require(path.join(ROOT, 'packet_life_skills_builder.js'));
const AAC = require(path.join(ROOT, 'packet_aac_builder.js'));
const SEL = require(path.join(ROOT, 'packet_sel_builder.js'));
const PL = require(path.join(ROOT, 'packet_playlist_builder.js'));
const MATH = require(path.join(ROOT, 'packet_math_practice_builder.js'));
const SW = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const SP = require(path.join(ROOT, 'packets_starter_packs.js'));
const V = require(path.join(ROOT, 'packets_verify_core.js'));

const BRITISH = /\b(practis\w*|standardis\w*|licences?|colours?|marking|marked|tick(?:ed|s)?|USB stick|whilst|maths|favour\w*|behaviour\w*|centres?)\b/i;

function expectClosedVerified(html) {
  const report = V.verifyPacket(html);
  expect(report.ok).toBe(true);
  expect(report.result).toBe('closed');
  expect(report.counts.look).toBe(0);
  expect(report.counts.notExpected).toBe(0);
  expect(html).toContain("connect-src 'none'");
  return report;
}

function bootPacket(html) {
  let clock = 1000;
  const dom = new JSDOM(html, {
    url: 'https://packets.test/student-packet.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) {
      Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
      Object.defineProperty(w, 'performance', { configurable: true, value: { now: () => clock } });
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    },
  });
  const w = dom.window;
  const d = w.document;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent.trim() === text);
  return {
    dom, w, d, seen, button,
    tick: (ms) => { clock += ms; },
  };
}

describe('Wave 27 — Dual-Language Live Action Chrome across all 6 Home Languages', () => {
  it('ships complete curated action labels for all 6 languages with zero storage or unsafe sinks', () => {
    const src = read('packets_station_bilingual.js');
    expect(src).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b|\blocalStorage\b|\bsessionStorage\b/);
    expect(src).not.toMatch(BRITISH);
    expect(SB.BILINGUAL_CSS).toContain('button[data-bi-label]::after');
    expect(SB.BILINGUAL_CSS).toContain('button[data-bi-dir=rtl]::after');

    const requiredKeys = [
      'start', 'continue', 'next', 'finish', 'save_work', 'station_next',
      'check', 'skip', 'reading_tools', 'start_over', 'back', 'clear',
      'reset', 'show_hint', 'done', 'close', 'show_teacher',
    ];
    for (const code of SB.SUPPORTED_LANGUAGES) {
      const lang = SB.LANGUAGES[code];
      expect(lang, `language ${code}`).toBeTruthy();
      for (const k of requiredKeys) {
        expect(typeof lang.strings[k], `${code}.${k}`).toBe('string');
        expect(lang.strings[k].trim().length, `${code}.${k} non-empty`).toBeGreaterThan(0);
      }
    }
  });

  it('stamps live dual-language action chrome (LTR & RTL) while keeping exact English button textContent intact', async () => {
    const lesson = MATH.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'add-doubles', count: 1 });
    lesson.lessonId = 'wave27-bi-chrome-1';
    lesson.revision = '2026-11-24';
    lesson.title = 'Doubles Warm-Up';
    lesson.homeLanguages = ['es', 'ar'];
    lesson.bilingualGlossary = { double: { es: 'doble', ar: 'ضعف' } };
    lesson.blocks[0].items = lesson.blocks[0].items.slice(0, 1);

    const html = TH.buildHtml(lesson, { core: { soundAnswerMatches: () => false } });
    expectClosedVerified(html);

    const t = bootPacket(html);
    try {
      const startBtn = t.button('Start');
      expect(startBtn).toBeTruthy();
      expect(startBtn.hasAttribute('data-bi-label')).toBe(false);

      // Switch to Spanish (LTR)
      const esBtn = t.d.querySelector('[data-bilingual-lang="es"]');
      expect(esBtn).toBeTruthy();
      esBtn.click();

      // Exact English textContent is preserved, while data-bi-label + aria-description provide live Spanish chrome
      expect(t.button('Start')).toBe(startBtn);
      expect(startBtn.textContent.trim()).toBe('Start');
      expect(startBtn.getAttribute('data-bi-label')).toBe('Comenzar');
      expect(startBtn.getAttribute('data-bi-dir')).toBe('ltr');
      expect(startBtn.getAttribute('aria-description')).toBe('Comenzar');

      // Reading tools compact Aa button gets aria-description without expanding visually via data-bi-label
      const aaBtn = t.d.querySelector('[data-tools-open]');
      expect(aaBtn).toBeTruthy();
      expect(aaBtn.hasAttribute('data-bi-label')).toBe(false);
      expect(aaBtn.getAttribute('aria-description')).toBe('Herramientas de lectura');

      // Switch to Arabic (RTL)
      const arBtn = t.d.querySelector('[data-bilingual-lang="ar"]');
      arBtn.click();
      expect(startBtn.textContent.trim()).toBe('Start');
      expect(startBtn.getAttribute('data-bi-label')).toBe(SB.LANGUAGES.ar.strings.start);
      expect(startBtn.getAttribute('data-bi-dir')).toBe('rtl');
      expect(aaBtn.getAttribute('aria-description')).toBe(SB.LANGUAGES.ar.strings.reading_tools);

      // Start the packet -> item screen renders -> cover & answer -> finish screen renders -> verify live chrome updates
      t.d.getElementById('learner-name').value = 'Nadia';
      startBtn.click();
      t.tick(600);
      await new Promise((r) => setTimeout(r, 15));

      const item = lesson.blocks[0].items[0];
      const answer = String(item.answer);
      const coverBtn = t.d.querySelector('[data-cover]');
      expect(coverBtn).toBeTruthy();
      coverBtn.click();
      t.tick(600);
      await new Promise((r) => setTimeout(r, 15));

      for (const ch of answer) {
        const keyBtn = t.d.querySelector('[data-key="' + ch + '"]');
        expect(keyBtn).toBeTruthy();
        keyBtn.click();
      }
      const submitBtn = t.d.querySelector('[data-key="next"]');
      expect(submitBtn).toBeTruthy();
      submitBtn.click();
      t.tick(500);
      await new Promise((r) => setTimeout(r, 15));

      const finishBtn = t.button('See my results') || t.button('Next');
      expect(finishBtn).toBeTruthy();
      expect(finishBtn.getAttribute('data-bi-dir')).toBe('rtl');
      expect([SB.LANGUAGES.ar.strings.finish, SB.LANGUAGES.ar.strings.next]).toContain(finishBtn.getAttribute('data-bi-label'));
      finishBtn.click();
      await new Promise((r) => setTimeout(r, 15));

      const saveBtn = t.button('Save my work');
      expect(saveBtn).toBeTruthy();
      expect(saveBtn.textContent.trim()).toBe('Save my work');
      expect(saveBtn.getAttribute('data-bi-label')).toBe(SB.LANGUAGES.ar.strings.save_work);
      expect(saveBtn.getAttribute('data-bi-dir')).toBe('rtl');

      const teacherSummary = [...t.d.querySelectorAll('summary')].find((s) => s.textContent.trim() === 'Show my teacher');
      expect(teacherSummary).toBeTruthy();
      expect(teacherSummary.getAttribute('data-bi-label')).toBe(SB.LANGUAGES.ar.strings.show_teacher);

      // Switch back to English -> all data-bi-label / data-bi-dir / aria-description attributes are cleanly cleared
      const enBtn = t.d.querySelector('[data-bilingual-lang=""]');
      enBtn.click();
      expect(t.d.querySelectorAll('[data-bi-label]').length).toBe(0);
      expect(aaBtn.hasAttribute('aria-description')).toBe(false);
    } finally {
      t.dom.window.close();
    }
  });
});

describe('Wave 27 — Offline Filtered Starter Pack Bundle (.zip) on packets-packs.html', () => {
  it('bundles currently filtered direct-download starter packs plus README-starter-packs.txt into a valid STORE .zip', async () => {
    const html = read('packets-packs.html');
    const js = read('packets-packs.js');
    expect(js).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b/);
    expect(js).not.toMatch(BRITISH);
    expect(html).toContain('<script src="packets_zip.js" defer></script>');
    expect(html).toContain('<span id="file-count">twenty-two</span>');

    const dom = new JSDOM(html, {
      url: 'https://packets.test/packets-packs.html',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    const d = w.document;
    if (d.readyState === 'loading') {
      await new Promise((resolve) => d.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }
    const downloads = [];
    w.AlloWordSoundsTakeHome = TH;
    w.AlloPacketMathPractice = MATH;
    w.AlloPacketSortWrite = SW;
    w.AlloPacketChoice = CHOICE;
    w.AlloPacketMaze = MAZE;
    w.AlloPacketManipulatives = MANIP;
    w.AlloPacketStemLab = STEM;
    w.AlloPacketLifeSkills = LIFE;
    w.AlloPacketAac = AAC;
    w.AlloPacketSel = SEL;
    w.AlloPacketPlaylist = PL;
    w.AlloPacketStationBilingual = SB;
    w.AlloPacketZip = ZIP;
    w.AlloPacketStarterPacks = SP;
    w.URL.createObjectURL = (blob) => {
      downloads.push({ blob });
      return 'blob:packs-zip-' + downloads.length;
    };
    w.URL.revokeObjectURL = () => {};
    const origClick = w.HTMLAnchorElement.prototype.click;
    w.HTMLAnchorElement.prototype.click = function () {
      if (downloads.length) downloads[downloads.length - 1].download = this.download;
      if (origClick) {
        try { origClick.call(this); } catch (_) {}
      }
    };

    try {
      w.eval(js);
      const zipBtn = d.getElementById('btn-download-zip');
      expect(zipBtn).toBeTruthy();
      const allDirect = SP.PACKS.filter((p) => p.directDownload).length;
      expect(zipBtn.disabled).toBe(false);
      expect(zipBtn.textContent).toBe(`Download ${allDirect} packs (.zip)`);

      // Filter to STEM + Grades 6-8 (clean 2-pack slice)
      const subj = d.getElementById('f-subject');
      const grade = d.getElementById('f-grade');
      subj.value = 'STEM';
      subj.dispatchEvent(new w.Event('change', { bubbles: true }));
      grade.value = '6-8';
      grade.dispatchEvent(new w.Event('change', { bubbles: true }));

      const expectedStem68 = SP.filterPacks({ subject: 'STEM', gradeBand: '6-8', features: [], query: '' }).filter((p) => p.directDownload);
      expect(expectedStem68.length).toBeGreaterThanOrEqual(2);
      expect(zipBtn.disabled).toBe(false);
      expect(zipBtn.textContent).toBe(`Download ${expectedStem68.length} packs (.zip)`);

      // Trigger ZIP build
      zipBtn.click();
      expect(downloads).toHaveLength(1);
      expect(downloads[0].download).toBe('alloflow-starter-packs__stem__6-8.zip');
      expect(d.getElementById('pack-action-status').textContent).toContain('README-starter-packs.txt');

      // Inspect generated .zip entries with AlloPacketZip.readZip
      const ab = await downloads[0].blob.arrayBuffer();
      const entries = ZIP.readZip(new Uint8Array(ab));
      expect(entries.length).toBe(expectedStem68.length + 1);
      entries.forEach((entry) => expect(entry.crcOk, `${entry.name} crcOk`).toBe(true));

      const names = entries.map((e) => e.name);
      expect(names).toContain('README-starter-packs.txt');
      const htmlEntries = entries.filter((e) => e.name.endsWith('.html'));
      expect(htmlEntries).toHaveLength(expectedStem68.length);

      // Verify first bundled .html file passes full offline verifier
      const firstHtml = new TextDecoder('utf-8').decode(htmlEntries[0].bytes);
      expectClosedVerified(firstHtml);

      // Verify README summarizes filters and included packs
      const readmeText = new TextDecoder('utf-8').decode(entries.find((e) => e.name === 'README-starter-packs.txt').bytes);
      expect(readmeText).toContain('Subject: STEM');
      expect(readmeText).toContain('Suggested grade band: 6-8');
      expect(readmeText).not.toContain('!');

      // Filter to a query matching ONLY a draft-only pack (Word Sounds CVC draft) -> ZIP button disables cleanly
      d.getElementById('btn-clear-filters').click();
      const search = d.getElementById('f-search');
      search.value = 'CVC Short-Vowel';
      search.dispatchEvent(new w.Event('input', { bubbles: true }));
      expect(zipBtn.disabled).toBe(true);
      expect(zipBtn.textContent).toBe('No direct packs to zip');
    } finally {
      w.close();
    }
  });
});
