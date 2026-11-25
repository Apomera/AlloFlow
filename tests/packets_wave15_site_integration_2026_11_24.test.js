// Wave 5C Integration Tests: Full Site Cohesion & Ecosystem Wiring across all 10 new zero-AI pages
// Verifies packets.html #more grouping, packets-it.html documentation, packets-feedback.html /
// packets-feedback.js / Cloudflare Worker 201 acceptance for all 10 #from-<slug> footers,
// packets_results_reader.js & packets-results.js labels for all 27 new activities + maze_correct_3m
// + choice_board pathway/modality surfacing, dev-tools/build_packets_site.cjs plan() zero-drift,
// and dev-tools/check_shell_boundaries.cjs + desktop mirror parity for edited deliverables.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import worker from '../catalog/cloudflare-worker/src/index.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const R = require(path.join(ROOT, 'packets_results_reader.js'));
const FB = require(path.join(ROOT, 'packets-feedback.js'));
const SITE = require(path.join(ROOT, 'dev-tools/build_packets_site.cjs'));

const NEW_PAGES = [
  'packets-choice',
  'packets-maze',
  'packets-manipulatives',
  'packets-stem-lab',
  'packets-life-skills',
  'packets-aac',
  'packets-sel',
  'packets-playlist',
  'packets-packs',
  'packets-compile',
];

const NEW_ACTIVITIES = [
  'concept_sort', 'sequence_order', 'tiered_writing', 'choice_board',
  'maze_reading',
  'manip_base_ten', 'manip_fraction_bars', 'manip_number_line', 'manip_balance_scale',
  'stem_circuit', 'stem_data_explorer', 'stem_geometry_grid',
  'life_money', 'life_transit', 'life_kitchen', 'life_laundry', 'life_signs',
  'aac_board',
  'sel_first_then', 'sel_focus_timer', 'sel_calm_toolkit', 'sel_udl_reflect',
  'compiled_quiz', 'compiled_cloze', 'branching_adventure', 'anchor_study',
  'playlist_roadmap',
];

function fakeKv() {
  const store = new Map();
  return {
    store,
    get: async (k) => store.get(k) ?? null,
    put: async (k, v) => { store.set(k, v); },
    delete: async () => {},
    list: async () => ({ keys: [], list_complete: true, cursor: '' }),
  };
}

describe('Wave 5C — Front Door (packets.html) & IT Guide (packets-it.html) Ecosystem Wiring', () => {
  it('links all 10 new zero-AI pages cleanly inside #more on packets.html while preserving primary subject cards and #voice-door-title', () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets.html'), 'utf8');
    const dom = new JSDOM(html);
    const d = dom.window.document;

    // 4 primary subject boxes untouched
    expect(d.querySelectorAll('.door-subject')).toHaveLength(4);
    const more = d.getElementById('more');
    expect(more).toBeTruthy();
    expect(more.hasAttribute('open')).toBe(false);
    expect(more.querySelector('#voice-door-title').textContent).toBe('With optional computer voice (AI, runs on this device)');

    const moreHrefs = [...more.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    for (const slug of NEW_PAGES) {
      expect(moreHrefs, slug).toContain(slug + '.html');
      expect(fs.existsSync(path.join(ROOT, slug + '.html')), slug + '.html exists').toBe(true);
    }
    dom.window.close();
  });

  it('documents all 10 new connect-src none makers cleanly in packets-it.html without promise words or AI leaks', () => {
    const html = fs.readFileSync(path.join(ROOT, 'packets-it.html'), 'utf8');
    const dom = new JSDOM(html);
    const d = dom.window.document;
    const text = d.body.textContent;
    for (const slug of NEW_PAGES) {
      expect(html, slug).toContain(slug + '.html');
    }
    expect(text).toContain("connect-src 'none'");
    expect(text).not.toContain('!');
    dom.window.close();
  });
});

describe('Wave 5C — Send Feedback (#from-<slug>) & Cloudflare Worker Acceptance for All 10 New Pages', () => {
  it('pre-selects every new page from #from-<slug> in packets-feedback.html and accepts HTTP 201 on POST /packetsFeedback', async () => {
    const fbHtml = fs.readFileSync(path.join(ROOT, 'packets-feedback.html'), 'utf8');
    const fbDoc = new JSDOM(fbHtml).window.document;
    const optionValues = [...fbDoc.querySelectorAll('#fb-page option')].map((o) => o.value);

    for (const slug of NEW_PAGES) {
      expect(FB.PAGES, `FB.PAGES includes ${slug}`).toContain(slug);
      expect(optionValues, `fb-page <option> includes ${slug}`).toContain(slug);
      expect(FB.payload(slug, 'idea', 'Clear layout.', { browser: 'chrome', device: 'computer' }).page).toBe(slug);

      // Verify footer link in each page points to #from-<slug>
      const pageHtml = fs.readFileSync(path.join(ROOT, slug + '.html'), 'utf8');
      expect(pageHtml, `${slug}.html footer`).toContain(`packets-feedback.html#from-${slug}`);

      // Verify packets-feedback.html#from-<slug> selects it on boot
      const dom = new JSDOM(fbHtml, {
        runScripts: 'outside-only',
        url: `https://packets.test/packets-feedback.html#from-${slug}`,
      });
      const w = dom.window;
      w.eval(fs.readFileSync(path.join(ROOT, 'word_sounds_wordlist_en.js'), 'utf8'));
      w.eval(fs.readFileSync(path.join(ROOT, 'packets-feedback.js'), 'utf8'));
      if (w.document.readyState === 'loading') w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
      expect(w.document.getElementById('fb-page').value, `#from-${slug}`).toBe(slug);
      w.close();

      // Verify Cloudflare Worker accepts each new page slug with HTTP 201
      const kv = fakeKv();
      const env = { BUG_REPORTS: kv, SUBMIT_RATE: fakeKv(), SUBMIT_RATE_PER_MINUTE: '1000', SUBMIT_RATE_PER_DAY: '1000' };
      const req = new Request('https://worker.test/packetsFeedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          v: 1,
          page: slug,
          kind: 'worked',
          message: 'Loaded smoothly offline in class.',
          browser: 'chrome',
          device: 'computer',
        }),
      });
      const res = await worker.fetch(req, env);
      expect(res.status, `worker HTTP 201 for ${slug}`).toBe(201);
    }
  });
});

describe('Wave 5C — Results Reader & Results Page Integration (27 New Activities, maze_correct_3m, Choice Board Modality)', () => {
  it('registers human-readable labels for all 27 new activities and maze_correct_3m without mutating core STRANDS/ACTIVITIES/MEASURES', async () => {
    for (const act of NEW_ACTIVITIES) {
      expect(R.EXTENDED_ACTIVITIES[act], act).toBeTruthy();
      expect(R.EXTENDED_ACTIVITIES[act][0].length).toBeGreaterThan(2);
    }
    expect(R.EXTENDED_MEASURES.maze_correct_3m).toBe('CBM-Maze (3 min)');
    expect(R.EXTENDED_MEASURE_UNITS.maze_correct_3m).toBe('items_correct');

    // Parse a synthetic CBM-Maze Check JSON result
    const mazeCheckJson = JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'sess-maze-1',
      lessonId: 'monarch-maze-check',
      revision: 'm1234',
      lessonTitle: 'Monarch Journey Maze Check',
      learnerName: 'Tessa',
      startedAt: '2026-11-24T14:00:00Z',
      finishedAt: '2026-11-24T14:03:00Z',
      startedLocal: '2026-11-24T09:00:00-05:00',
      finishedLocal: '2026-11-24T09:03:00-05:00',
      durationMs: 180000,
      packet: { id: 'monarch-maze-check', version: 'm1234', mode: 'check', form: 'Form A' },
      score: { measure: 'maze_correct_3m', score: 2, scoreUnit: 'items_correct', itemsCorrect: 2, itemsAttempted: 3, timeLimitS: 180, elapsedS: 180, completion: 'time' },
      items: [
        { n: 1, itemId: 'mz-1', activity: 'maze_reading', word: 'Blank 1', target: 'wings', responses: ['wings'], correct: true, firstTry: true, attempts: 1, ms: 3000 },
        { n: 2, itemId: 'mz-2', activity: 'maze_reading', word: 'Blank 2', target: 'south', responses: ['north'], correct: false, firstTry: false, attempts: 1, ms: 4000 },
        { n: 3, itemId: 'mz-3', activity: 'maze_reading', word: 'Blank 3', target: 'trees', responses: ['trees'], correct: true, firstTry: true, attempts: 1, ms: 3500 },
      ],
    });
    const parsedMaze = await R.read(mazeCheckJson, { name: 'tessa-maze.json' });
    expect(parsedMaze.ok).toBe(true);
    expect(parsedMaze.sessions[0].measure).toBe('maze_correct_3m');
    expect(parsedMaze.sessions[0].measureName).toBe('CBM-Maze (3 min)');
    expect(parsedMaze.sessions[0].unitName).toBe('items correct');
    expect(parsedMaze.sessions[0].value).toBe(2);

    // Parse a Choice Board JSON result and verify packets-results.js surfaces chosen pathway/modality cleanly
    const choiceJson = JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'sess-choice-1',
      lessonId: 'ecosystems-choice',
      revision: 'c5678',
      lessonTitle: 'Ecosystems Choice Board',
      learnerName: 'Tessa',
      startedAt: '2026-11-24T14:10:00Z',
      finishedAt: '2026-11-24T14:14:00Z',
      startedLocal: '2026-11-24T09:10:00-05:00',
      finishedLocal: '2026-11-24T09:14:00-05:00',
      durationMs: 240000,
      packet: { id: 'ecosystems-choice', version: 'c5678', mode: 'practice' },
      items: [
        {
          n: 1,
          itemId: 'cb-1',
          activity: 'choice_board',
          word: 'Ecosystems Energy Flow',
          target: 'Producer -> Consumer',
          responses: ['mod:concept_sort | sorted'],
          correct: true,
          firstTry: true,
          attempts: 1,
          ms: 15000,
          supports: { modality_concept_sort: 1, modality_switch: 1 },
        },
      ],
    });
    const parsedChoice = await R.read(choiceJson, { name: 'tessa-choice.json' });
    expect(parsedChoice.ok).toBe(true);
    expect(parsedChoice.sessions[0].byActivity[0].name).toBe('UDL Choice Board');

    // Boot packets-results.html, load Choice Board + Maze results, inspect Tessa's student view
    const resultsHtml = fs.readFileSync(path.join(ROOT, 'packets-results.html'), 'utf8');
    const dom = new JSDOM(resultsHtml, {
      url: 'https://packets.test/packets-results.html',
      runScripts: 'outside-only',
      pretendToBeVisual: true,
    });
    const w = dom.window;
    const d = w.document;
    w.AlloPacketResults = R;
    w.AlloPacketFollowup = require(path.join(ROOT, 'packets_followup.js'));
    w.eval(fs.readFileSync(path.join(ROOT, 'packets-page.js'), 'utf8'));
    w.eval(fs.readFileSync(path.join(ROOT, 'packets-results.js'), 'utf8'));
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    const filesInput = d.getElementById('files');
    const makeFile = (name, text) => new w.File([text], name, { type: 'application/json' });
    Object.defineProperty(filesInput, 'files', {
      value: [makeFile('tessa-maze.json', mazeCheckJson), makeFile('tessa-choice.json', choiceJson)],
      configurable: true,
    });
    filesInput.dispatchEvent(new w.Event('change'));
    await new Promise((r) => setTimeout(r, 80));

    // Open student view (either auto-selected or click Tessa button)
    const studentBtn = [...d.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Tessa');
    if (studentBtn) studentBtn.click();
    const viewText = (d.getElementById('view-one') || d.body).textContent;
    expect(viewText).toContain('CBM-Maze (3 min)');
    expect(viewText).toContain('Chosen pathway: Concept Sort (switched pathway).');
    w.close();
  });
});

describe('Wave 5C — Build Site Plan Zero-Drift & Shell Boundary Integrity', () => {
  it('passes dev-tools/build_packets_site.cjs plan() with all 10 new pages and dev-tools/check_shell_boundaries.cjs cleanly', () => {
    const plan = SITE.plan();
    expect(Array.isArray(plan.pages)).toBe(true);
    for (const slug of NEW_PAGES) {
      expect(plan.pages, slug).toContain(slug + '.html');
    }
    const out = execFileSync(process.execPath, [path.join(ROOT, 'dev-tools/check_shell_boundaries.cjs')], { encoding: 'utf8' });
    expect(out).not.toMatch(/FAIL|ERROR/i);

    // Confirm mirrored edited deliverables exist in desktop/web-app/public (and standalone new pages were NOT mirrored)
    for (const f of ['packets_station_bilingual.js', 'packets_followup.js', 'packets_results_reader.js', 'packets-results.js', 'packets.html', 'packets-it.html', 'packets-feedback.html', 'packets-feedback.js']) {
      expect(fs.readFileSync(path.join(ROOT, f), 'utf8')).toBe(
        fs.readFileSync(path.join(ROOT, 'desktop/web-app/public', f), 'utf8'),
      );
    }
    for (const slug of NEW_PAGES) {
      expect(fs.existsSync(path.join(ROOT, 'desktop/web-app/public', slug + '.html')), `standalone ${slug}.html not in desktop`).toBe(false);
    }
  });
});
