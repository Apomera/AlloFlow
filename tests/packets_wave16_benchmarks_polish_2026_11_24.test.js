// Wave 16 Tests: Parallel CBM-Maze Benchmark Forms (A/B/C), Grade-Free Student Titles,
// Maze Net Score & Local Quartile Display in Results, Teacher Scope & Sequence Pathways,
// Unified Scrollable Switch Maker Menu, and Standalone Site Docs.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const TH = globalThis.AlloWordSoundsTakeHome;
const MZ = require(path.join(ROOT, 'packet_maze_builder.js'));
const SP = require(path.join(ROOT, 'packets_starter_packs.js'));
const MP = require(path.join(ROOT, 'packet_math_practice_builder.js'));
const SW = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const CH = require(path.join(ROOT, 'packet_choice_builder.js'));
const MN = require(path.join(ROOT, 'packet_manipulative_builder.js'));
const SL = require(path.join(ROOT, 'packet_stem_lab_builder.js'));
const LS = require(path.join(ROOT, 'packet_life_skills_builder.js'));
const AAC = require(path.join(ROOT, 'packet_aac_builder.js'));
const SEL = require(path.join(ROOT, 'packet_sel_builder.js'));
const PL = require(path.join(ROOT, 'packet_playlist_builder.js'));
const SB = require(path.join(ROOT, 'packets_station_bilingual.js'));
const V = require(path.join(ROOT, 'packets_verify_core.js'));
const R = require(path.join(ROOT, 'packets_results_reader.js'));
const SITE = require(path.join(ROOT, 'dev-tools/build_packets_site.cjs'));

const ALL_PACK_DEPS = {
  loader: TH,
  stationBilingual: SB,
  mathPractice: MP,
  sortWrite: SW,
  choice: CH,
  maze: MZ,
  manipulatives: MN,
  stemLab: SL,
  lifeSkills: LS,
  aac: AAC,
  sel: SEL,
  playlist: PL,
};

const GRADE_LABEL_IN_TITLE = /\b(?:grades?\s*\d|kindergarten|k-\d|g\d-\d)\b/i;

function makeMazeCsv({ learner, packetId, form, date, correctCount, wrongCount, sid }) {
  const items = [];
  for (let i = 0; i < correctCount + wrongCount; i++) {
    const right = i < correctCount;
    items.push({
      n: i + 1,
      itemId: 'maze_reading-' + i,
      activity: 'maze_reading',
      word: 'Blank ' + (i + 1),
      target: 'word' + i,
      responses: [right ? 'word' + i : 'wrong' + i],
      attempts: 1,
      firstTry: right,
      correct: right,
      done: true,
      ms: 4000,
      supports: {},
      practice: null,
      flag: '',
    });
  }
  const result = {
    kind: 'alloflow-take-home-result',
    schemaVersion: 3,
    sessionId: sid,
    packet: { id: packetId, version: 'm1', form: form, mode: 'check' },
    lessonId: packetId,
    revision: 'm1',
    lessonTitle: 'Reading Check, version ' + form,
    activityTitles: { maze_reading: 'Maze Reading' },
    learner: learner,
    learnerName: learner,
    startedLocal: date + 'T09:00:00-05:00',
    finishedLocal: date + 'T09:03:00-05:00',
    durationMs: 180000,
    activeMs: 180000,
    score: {
      measure: 'maze_correct_3m',
      score: correctCount,
      scoreUnit: 'items_correct',
      digitsCorrect: null,
      digitsPossible: null,
      itemsCorrect: correctCount,
      itemsAttempted: correctCount + wrongCount,
      timeLimitS: 180,
      elapsedS: 180,
      hiddenS: 0,
      completion: 'time',
      prorated: false,
      noScoreReason: '',
      scoringVersion: 1,
      formVersion: 1,
      attempt: 1,
      flags: [],
      tools: [],
    },
    summary: {
      items: items.length,
      done: items.length,
      firstTry: correctCount,
      afterRetry: 0,
      missed: wrongCount,
      practised: 0,
    },
    items,
  };
  const t = TH.resultsCsv(result);
  const sig = TH.sha256(t.basis).hex;
  return { name: t.stem + '__' + sid + '.csv', text: t.text({ method: 'sha256', value: sig }) };
}

describe('Wave 16 — Parallel CBM-Maze Benchmark Forms (A, B, C) & Canonical IDs', () => {
  it('provides 12 balanced original passages (Forms A, B, C across 4 bands) with shared canonical IDs, grade-free student titles, and verifyPacket closed verdict', async () => {
    const bands = MZ.benchmarkBands();
    expect(bands.map((b) => b.bandKey)).toEqual(['2-3', '4-5', '6-8', '9-12']);
    expect(MZ.passages()).toHaveLength(12);

    for (const band of bands) {
      expect(band.forms.map((f) => f.form)).toEqual(['A', 'B', 'C']);
      const blankCounts = [];
      for (const p of band.forms) {
        expect(p.title, `${p.id} student title must be grade-free`).not.toMatch(GRADE_LABEL_IN_TITLE);
        const built = MZ.buildMazePacket({
          title: p.title,
          passage: p.passage,
          everyN: p.everyN,
          mode: 'probe',
          form: p.form,
          loader: TH,
        });
        expect(built.lesson.lessonId).toBe(band.canonicalId);
        expect(built.lesson.form).toBe(p.form);
        expect(built.lesson.check.grade).toBe(band.bandKey);
        expect(built.itemCount).toBeGreaterThanOrEqual(18);
        blankCounts.push(built.itemCount);

        const report = await V.verifyPacket(built.html);
        expect(report.ok, p.id).toBe(true);
        expect(report.result, p.id).toBe('closed');
        expect(report.counts.look, p.id).toBe(0);
        expect(report.counts.notExpected, p.id).toBe(0);

        // Reopen restores canonical passage cleanly without scrambled answers
        const back = MZ.readMazePacket(built.html, V);
        expect(back.ok).toBe(true);
        expect(back.passageId).toBe(p.id);
        expect(back.benchmarkBand).toBe(band.bandKey);
        expect(back.passage).toBe(p.passage);
      }
      // Forms A, B, and C within the same band stay tightly balanced in blank count
      expect(Math.max(...blankCounts) - Math.min(...blankCounts)).toBeLessThanOrEqual(6);
    }

    // Editing a canonical passage switches off canonicalId so custom sets never mix into canonical norms
    const custom = MZ.lessonFromMaze({
      title: 'Custom Pond Story',
      passage: MZ.passageById('g2_3_pond_helpers').passage + ' Extra custom sentence about turtles resting peacefully.',
      mode: 'probe',
      form: 'A',
    });
    expect(custom.lessonId).not.toBe('maze-reading-g2-3');
    expect(custom.check.grade).toBeUndefined();
  });

  it('filters Forms A, B, C cleanly by readability band in packets-maze.html UI', () => {
    const html = read('packets-maze.html');
    const dom = new JSDOM(html, { url: 'https://packets.test/packets-maze.html', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    const d = w.document;
    w.AlloPacketMaze = MZ;
    w.AlloWordSoundsTakeHome = TH;
    w.AlloPacketStationBilingual = SB;
    w.AlloPacketVerify = V;
    w.eval(read('packets-maze.js'));
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    expect(d.querySelectorAll('#passage-list .template-card')).toHaveLength(12);
    d.querySelector('[data-band-filter="4-5"]').click();
    const cards = [...d.querySelectorAll('#passage-list .template-card')];
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.getAttribute('data-passage-id'))).toEqual([
      'g4_5_monarch_journey',
      'g4_5_beaver_wetlands',
      'g4_5_weather_balloons',
    ]);
    cards[1].click();
    expect(d.getElementById('f-form').value).toBe('B');
    w.close();
  });
});

describe('Wave 16 — Grade-Free Student Starter Titles & Teacher Scope-and-Sequence Pathways', () => {
  it('ensures zero grade labels appear inside student-visible titles across all OER starter packs', async () => {
    expect(SP.SCOPE_PATHWAYS.length).toBeGreaterThanOrEqual(4);
    for (const pack of SP.PACKS) {
      expect(pack.title, `${pack.id} pack.title`).not.toMatch(GRADE_LABEL_IN_TITLE);
      if (pack.draft && pack.draft.title) {
        expect(pack.draft.title, `${pack.id} draft.title`).not.toMatch(GRADE_LABEL_IN_TITLE);
      }
      if (!pack.directDownload) continue;
      const built = SP.buildPackFile(pack, ALL_PACK_DEPS);
      const parts = V.readParts(built.html);
      expect(parts.ok, pack.id).toBe(true);
      expect(parts.lesson.title, `${pack.id} student lesson.title`).not.toMatch(GRADE_LABEL_IN_TITLE);
    }

    // Verify canonical Forms A, B, C direct downloads share maze-reading-g4-5
    const a = V.readParts(SP.buildPackFile('oer_maze_bench_g45_a', ALL_PACK_DEPS).html);
    const b = V.readParts(SP.buildPackFile('oer_maze_bench_g45_b', ALL_PACK_DEPS).html);
    const c = V.readParts(SP.buildPackFile('oer_maze_bench_g45_c', ALL_PACK_DEPS).html);
    expect([a.lesson.lessonId, b.lesson.lessonId, c.lesson.lessonId]).toEqual(['maze-reading-g4-5', 'maze-reading-g4-5', 'maze-reading-g4-5']);
    expect([a.lesson.form, b.lesson.form, c.lesson.form]).toEqual(['A', 'B', 'C']);
  });

  it('renders teacher-facing Suggested Scope & Sequence pathways in packets-packs.html with clean heading hierarchy and filter wiring', () => {
    const html = read('packets-packs.html');
    const dom = new JSDOM(html, { url: 'https://packets.test/packets-packs.html', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    const d = w.document;
    w.AlloPacketStarterPacks = SP;
    w.AlloWordSoundsTakeHome = TH;
    w.eval(read('packets-page.js'));
    w.eval(read('packets-packs.js'));
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    // Verify no skipped heading levels even with pathways rendered
    const levels = [...d.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName.slice(1)));
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `Heading jump ${levels[i - 1]} -> ${levels[i]}`).toBeLessThanOrEqual(1);
    }

    const pwBtn = d.querySelector('[data-apply-pathway="3-5"]');
    expect(pwBtn).toBeTruthy();
    pwBtn.click();
    expect(d.getElementById('f-grade').value).toBe('3-5');
    expect(d.getElementById('pack-action-status').textContent).toContain('grade-label free');
    w.close();
  });
});

describe('Wave 16 — CBM-Maze Net Score & Local Group Quartiles in Results', () => {
  it('groups Forms A/B/C onto one longitudinal series, computes local medians/quartiles + mazeNet without score_differs, and displays them in packets-results.html', async () => {
    const csvs = [];
    // 10 students take Form A of maze-reading-g4-5 (enough for median + Q1-Q3 middle half)
    const scores = [
      ['Ana', 10, 4],
      ['Ben', 12, 2],
      ['Cam', 14, 3],
      ['Dev', 15, 1],
      ['Eli', 16, 2],
      ['Fay', 18, 2],
      ['Gus', 19, 1],
      ['Hana', 20, 3],
      ['Ian', 22, 1],
      ['Jae', 24, 0],
    ];
    scores.forEach(([name, ok, bad], i) => {
      csvs.push(makeMazeCsv({ learner: name, packetId: 'maze-reading-g4-5', form: 'A', date: '2026-09-15', correctCount: ok, wrongCount: bad, sid: 'mz-a-' + i }));
    });
    // Ana also takes Form B in Oct and Form C in Nov -> all on ONE series!
    csvs.push(makeMazeCsv({ learner: 'Ana', packetId: 'maze-reading-g4-5', form: 'B', date: '2026-10-15', correctCount: 15, wrongCount: 2, sid: 'mz-ana-b' }));
    csvs.push(makeMazeCsv({ learner: 'Ana', packetId: 'maze-reading-g4-5', form: 'C', date: '2026-11-15', correctCount: 19, wrongCount: 1, sid: 'mz-ana-c' }));

    const sessions = [];
    for (const c of csvs) {
      const got = await R.read(c.text, { name: c.name });
      expect(got.ok).toBe(true);
      expect(got.sessions[0].flags).not.toContain('score_differs');
      expect(got.sessions[0].mazeNet).toBeTruthy();
      sessions.push(got.sessions[0]);
    }

    const model = R.addUp(sessions);
    expect(model.checks).toHaveLength(1);
    expect(model.checks[0].label).toBe('CBM-Maze (3 min) (grades 4-5)');
    expect(model.checks[0].forms).toEqual(['A', 'B', 'C']);

    // Local group median & quartiles (n = 10 on Form A) including Maze net median
    expect(model.middles).toHaveLength(1);
    expect(model.middles[0].n).toBe(10);
    expect(model.middles[0].q1).not.toBeNull();
    expect(model.middles[0].q3).not.toBeNull();
    expect(model.middles[0].mazeNet).toBeTruthy();
    expect(model.middles[0].mazeNet.n).toBe(10);
    expect(model.middles[0].mazeNet.q1).not.toBeNull();

    // Bundle save & restore preserves mazeNet
    const bundleBack = R.readBundle(JSON.parse(JSON.stringify(R.makeBundle({ sessions }))));
    expect(bundleBack.ok).toBe(true);
    expect(bundleBack.sessions[0].mazeNet).toEqual(sessions[0].mazeNet);

    // Ana's longitudinal series has all 3 points (Form A -> B -> C)
    const ana = model.learners.find((l) => l.label === 'Ana');
    const anaSeries = R.learnerSeries(ana, model);
    expect(anaSeries).toHaveLength(1);
    expect(anaSeries[0].points.map((p) => p.form)).toEqual(['A', 'B', 'C']);

    // Render inside real packets-results.html DOM
    const dom = new JSDOM(read('packets-results.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-results.html' });
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: globalThis.crypto.subtle });
    w.HTMLElement.prototype.scrollIntoView = function () {};
    for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));

    const dropEv = new w.Event('drop', { bubbles: true, cancelable: true });
    dropEv.dataTransfer = {
      types: ['Files'],
      files: csvs.map((c) => new w.File([c.text], c.name, { type: 'text/csv', lastModified: Date.now() })),
    };
    d.getElementById('main').dispatchEvent(dropEv);
    for (let i = 0; i < 400 && d.getElementById('state-results').hidden; i++) {
      await new Promise((r) => setTimeout(r, 10));
      const showBtn = d.getElementById('show-results');
      if (showBtn && !d.getElementById('state-check').hidden) showBtn.click();
    }

    const middlesText = d.getElementById('middles').textContent;
    expect(middlesText).toContain('CBM-Maze (3 min) (grades 4-5), version A');
    expect(middlesText).toContain('Maze net median:');
    expect(middlesText).toContain('middle half:');

    const radio = d.querySelector('input[name="view"][value="learner"]');
    radio.checked = true;
    radio.dispatchEvent(new w.Event('change', { bubbles: true }));
    const sel = d.getElementById('pick-learner');
    sel.value = [...sel.options].find((o) => o.textContent.startsWith('Ana (')).value;
    sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    const learnerText = d.getElementById('learner-body').textContent;
    expect(learnerText).toContain('Maze net: 6 (10 right, 4 wrong)');
    expect(learnerText).toContain('Maze net: 18 (19 right, 1 wrong)');
    w.close();
  });
});

describe('Wave 16 — Unified Switch Maker Menu, Scrollable CSS, Docs & Site Build Drift', () => {
  it('ensures every page with Switch maker exposes all 18+ tools, packets.css scrolls cleanly, docs mention wrangler >1,000 files, and SITE.plan() passes', () => {
    const htmlFiles = fs.readdirSync(ROOT).filter((f) => /^packets.*\.html$/.test(f));
    let checkedMenus = 0;
    for (const f of htmlFiles) {
      const txt = read(f);
      if (!txt.includes('details class="top-menu"')) continue;
      checkedMenus++;
      const d = new JSDOM(txt).window.document;
      const links = [...d.querySelectorAll('details.top-menu nav a[href]')];
      expect(links.length, f).toBeGreaterThanOrEqual(18);
    }
    expect(checkedMenus).toBeGreaterThanOrEqual(22);

    const css = read('packets.css');
    expect(css).toContain('max-height: min(75vh, 34rem); overflow-y: auto;');

    const ownDoc = read('docs/packets-own-site.md');
    expect(ownDoc).toContain('1,035');
    expect(ownDoc).toContain('wrangler pages deploy');

    const planned = SITE.plan();
    expect(planned.pages.length).toBeGreaterThanOrEqual(29);
  });
});
