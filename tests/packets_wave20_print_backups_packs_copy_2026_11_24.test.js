// @vitest-environment jsdom
// Wave 20 checks (2026-11-24):
// 1. Plain-text Copy summary parity in packets-results.js (Choice Board pathways, Wave 1B-4C support labels, Maze net).
// 2. Printable transition worksheet & Page 2 Answer Key in packets-life-skills.html/css/js.
// 3. Printable STEM lab recording sheet & Page 2 Answer Key in packets-stem-lab.html/css/js.
// 4. Printable paper math mats & Page 2 Answer Key in packets-manipulatives.html/css/js.
// 5. Support-need filter pills, live match counts, standards search, and URL hash deep-linking in packets-packs.html/css/js.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const read = (f) => readFileSync(f, 'utf8');

describe('Wave 20 Copy Summary Parity, Printable Backups (Life Skills, STEM, Manipulatives), and Starter Pack Filters', () => {
  it('includes UDL Choice Board pathways, Wave 1B-4C support labels, and CBM-Maze net scores in Copy summary text', async () => {
    const dom = new JSDOM(read('packets-results.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-results.html',
    });
    const w = dom.window;
    let copiedText = '';
    Object.defineProperty(w.navigator, 'clipboard', {
      value: { writeText: (t) => { copiedText = t; return Promise.resolve(); } },
      configurable: true,
    });
    w.eval(read('packets_results_reader.js'));
    w.eval(read('packets_followup.js'));
    w.eval(read('packets-results.js'));

    const d = w.document;
    const mazeJson = JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'w20-mz-1',
      learner: 'RiverPine3',
      packet: { id: 'maze-pond-a', version: 'r1', form: 'A', mode: 'probe' },
      lessonId: 'maze-pond-a',
      revision: 'r1',
      lessonTitle: 'The Busy Pond',
      activityTitles: { maze_reading: 'Maze Reading' },
      startedLocal: '2026-11-24T09:00:00-05:00',
      finishedLocal: '2026-11-24T09:03:00-05:00',
      durationMs: 180000,
      activeMs: 175000,
      score: {
        measure: 'maze_correct_3m',
        score: 4,
        scoreUnit: 'items_correct',
        itemsCorrect: 4,
        itemsAttempted: 5,
        timeLimitS: 180,
        elapsedS: 175,
        completion: 'complete',
        tools: ['textLarger'],
      },
      summary: { items: 5, done: 5, firstTry: 4, afterRetry: 0, missed: 1, practised: 0 },
      items: [
        { n: 1, itemId: 'm1', activity: 'maze_reading', word: 'habitat', target: 'habitat', responses: ['habitat'], attempts: 1, correct: true, firstTry: true, done: true, ms: 4000, supports: {}, practice: null, flag: '' },
        { n: 2, itemId: 'm2', activity: 'maze_reading', word: 'ecosystem', target: 'ecosystem', responses: ['ecosystem'], attempts: 1, correct: true, firstTry: true, done: true, ms: 4000, supports: {}, practice: null, flag: '' },
        { n: 3, itemId: 'm3', activity: 'maze_reading', word: 'predator', target: 'predator', responses: ['predator'], attempts: 1, correct: true, firstTry: true, done: true, ms: 4000, supports: {}, practice: null, flag: '' },
        { n: 4, itemId: 'm4', activity: 'maze_reading', word: 'producer', target: 'producer', responses: ['producer'], attempts: 1, correct: true, firstTry: true, done: true, ms: 4000, supports: {}, practice: null, flag: '' },
        { n: 5, itemId: 'm5', activity: 'maze_reading', word: 'consumer', target: 'consumer', responses: ['customer'], attempts: 1, correct: false, firstTry: false, done: true, ms: 4000, supports: {}, practice: null, flag: '' },
      ],
    });
    const choiceJson = JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'w20-cb-1',
      learner: 'RiverPine3',
      packet: { id: 'choice-eco-1', version: 'r1', form: '', mode: 'practice' },
      lessonId: 'choice-eco-1',
      revision: 'r1',
      lessonTitle: 'Ecosystems Choice Board',
      activityTitles: { choice_board: 'UDL Choice Board' },
      startedLocal: '2026-11-23T10:00:00-05:00',
      finishedLocal: '2026-11-23T10:08:00-05:00',
      durationMs: 480000,
      activeMs: 450000,
      summary: { items: 1, done: 1, firstTry: 1, afterRetry: 0, missed: 0, practised: 0 },
      items: [{
        n: 1,
        itemId: 'cb-1',
        activity: 'choice_board',
        word: 'Ecosystems',
        target: 'done',
        responses: ['mod:tiered_writing'],
        attempts: 1,
        correct: true,
        firstTry: true,
        done: true,
        ms: 30000,
        supports: { modality_tiered_writing: 1, modality_switch: 1, efChecklist: 1, bilingual_dir: 1 },
        practice: null,
        flag: '',
      }],
    });

    const files = [
      new w.File([mazeJson], 'maze.json', { type: 'application/json' }),
      new w.File([choiceJson], 'choice.json', { type: 'application/json' }),
    ];
    const ev = new w.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files };
    d.getElementById('main').dispatchEvent(ev);
    for (let i = 0; i < 150 && !/\bread[,.]/.test(d.getElementById('said').textContent); i++) {
      await new Promise((r) => setTimeout(r, 15));
    }
    const showBtn = d.getElementById('show-results');
    if (showBtn && !d.getElementById('state-check').hidden) showBtn.click();

    // Open student view (auto-selected when 1 learner, or click tab)
    const learnerRadio = d.querySelector('input[name="view"][value="learner"]');
    if (learnerRadio && !learnerRadio.checked) {
      learnerRadio.checked = true;
      learnerRadio.dispatchEvent(new w.Event('change'));
    }

    const copyBtn = d.getElementById('copy-summary');
    expect(copyBtn).toBeTruthy();
    copyBtn.click();
    await new Promise((r) => setTimeout(r, 20));

    expect(copiedText).toContain('Maze net 3');
    expect(copiedText).toContain('UDL Choice Board pathways: Tiered Writing (1 session); switched pathway in 1 session.');
    expect(copiedText).toContain('Reading tools used: larger text.');
    expect(copiedText).toContain('Activity supports used:');
    expect(copiedText).toContain('First-Then checklist');
    expect(copiedText).toContain('Home-language directions');
    dom.window.close();
  });

  it('renders printable transition worksheets across all 5 Life Skills domains with toggleable Page 2 Answer Key', async () => {
    const dom = new JSDOM(read('packets-life-skills.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-life-skills.html',
    });
    const w = dom.window;
    let printCalls = 0;
    w.print = () => { printCalls++; };
    w.eval(read('word_sounds_take_home_loader.js'));
    w.eval(read('packets_station_bilingual.js'));
    w.eval(read('packet_life_skills_builder.js'));
    w.eval(read('packets-life-skills.js'));

    const d = w.document;
    if (d.getElementById('step-1').hidden) d.dispatchEvent(new w.Event('DOMContentLoaded'));

    // Select Community Transition Mix (all 5 domains)
    const mixRadio = d.querySelector('input[name="activity"][value="mixed"]');
    mixRadio.checked = true;
    mixRadio.dispatchEvent(new w.Event('change'));
    d.getElementById('next-1').click();
    for (const cb of d.querySelectorAll('#mixed-domains input[type="checkbox"]')) {
      if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new w.Event('change')); }
    }
    d.getElementById('next-2').click();

    const sheet = d.getElementById('paper-ls-sheet');
    const fold = d.getElementById('paper-ls-fold');
    expect(sheet.getAttribute('data-ready')).toBe('1');
    expect(sheet.hidden).toBe(true);
    fold.open = true;
    fold.dispatchEvent(new w.Event('toggle'));
    expect(sheet.hidden).toBe(false);

    expect(sheet.querySelector('h4.paper-ls-title')).toBeTruthy();
    expect(sheet.querySelectorAll('.paper-ls-card').length).toBeGreaterThanOrEqual(5);
    expect(sheet.textContent).toContain('Making Change & Budgeting');
    expect(sheet.textContent).toContain('Transit & Schedule Reading');
    expect(sheet.textContent).toContain('Kitchen & Home Safety');
    expect(sheet.textContent).toContain('Laundry & Care Sorting');
    expect(sheet.textContent).toContain('Community & Emergency Signs');
    expect(sheet.textContent).not.toMatch(/Grades?\s*\d/i);
    expect(sheet.querySelector('.paper-ls-key')).toBeTruthy();

    const keyCb = d.getElementById('f-paper-ls-key');
    keyCb.checked = false;
    keyCb.dispatchEvent(new w.Event('change'));
    expect(sheet.querySelector('.paper-ls-key')).toBeNull();
    keyCb.checked = true;
    keyCb.dispatchEvent(new w.Event('change'));
    expect(sheet.querySelector('.paper-ls-key')).toBeTruthy();

    d.getElementById('print-paper-ls').click();
    expect(printCalls).toBe(1);

    expect(read('packets-life-skills.css').split('@media print')[0]).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(read('packets-life-skills.js')).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
    await new Promise((r) => setTimeout(r, 0));
    dom.window.close();
  });

  it('renders printable STEM lab recording sheets across Circuit, Data Explorer, and Geometry workbenches', async () => {
    const dom = new JSDOM(read('packets-stem-lab.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-stem-lab.html',
    });
    const w = dom.window;
    let printCalls = 0;
    w.print = () => { printCalls++; };
    w.eval(read('word_sounds_take_home_loader.js'));
    w.eval(read('packets_station_bilingual.js'));
    w.eval(read('packet_stem_lab_builder.js'));
    w.eval(read('packets-stem-lab.js'));

    const d = w.document;
    if (d.getElementById('step-1').hidden) d.dispatchEvent(new w.Event('DOMContentLoaded'));

    // 1. Default Circuit Lab
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();
    const sheet = d.getElementById('paper-stem-sheet');
    const fold = d.getElementById('paper-stem-fold');
    expect(sheet.getAttribute('data-ready')).toBe('1');
    fold.open = true;
    fold.dispatchEvent(new w.Event('toggle'));
    expect(sheet.hidden).toBe(false);
    expect(sheet.querySelector('h4.paper-stem-title')).toBeTruthy();
    expect(sheet.textContent).toContain('Circuit Trial Observation Log');
    expect(sheet.textContent).toContain('All switches closed reference:');
    expect(sheet.textContent).not.toMatch(/Grades?\s*\d/i);

    // 2. Data Explorer
    d.getElementById('back-3').click();
    d.getElementById('back-2').click();
    const datRadio = d.querySelector('input[name="activity"][value="stem_data_explorer"]');
    datRadio.checked = true;
    datRadio.dispatchEvent(new w.Event('change'));
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();
    expect(sheet.textContent).toContain('Summary Statistics Workspace');
    expect(sheet.textContent).toContain('Dataset stats (all rows):');

    // 3. Geometry Grid
    d.getElementById('back-3').click();
    d.getElementById('back-2').click();
    const geoRadio = d.querySelector('input[name="activity"][value="stem_geometry_grid"]');
    geoRadio.checked = true;
    geoRadio.dispatchEvent(new w.Event('change'));
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();
    expect(sheet.querySelectorAll('.paper-stem-cell').length).toBe(30);
    expect(sheet.querySelector('.paper-stem-key')).toBeTruthy();

    d.getElementById('print-paper-stem').click();
    expect(printCalls).toBe(1);

    expect(read('packets-stem-lab.css').split('@media print')[0]).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(read('packets-stem-lab.js')).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
    await new Promise((r) => setTimeout(r, 0));
    dom.window.close();
  });

  it('renders printable paper math mats across Base-Ten, Fraction Bars, Number Line, and Balance Scale', async () => {
    const dom = new JSDOM(read('packets-manipulatives.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-manipulatives.html',
    });
    const w = dom.window;
    let printCalls = 0;
    w.print = () => { printCalls++; };
    w.eval(read('word_sounds_take_home_loader.js'));
    w.eval(read('packets_station_bilingual.js'));
    w.eval(read('packet_manipulative_builder.js'));
    w.eval(read('packets-manipulatives.js'));

    const d = w.document;
    if (d.getElementById('step-1').hidden) d.dispatchEvent(new w.Event('DOMContentLoaded'));

    const sheet = d.getElementById('paper-manip-sheet');
    const fold = d.getElementById('paper-manip-fold');

    const cases = [
      ['manip_base_ten', 'Hundreds (100)'],
      ['manip_fraction_bars', 'Shade your fraction'],
      ['manip_number_line', 'Draw hops above the line'],
      ['manip_balance_scale', 'Left Pan:'],
    ];
    for (const [act, expectedText] of cases) {
      const radio = d.querySelector(`input[name="activity"][value="${act}"]`);
      radio.checked = true;
      radio.dispatchEvent(new w.Event('change'));
      d.getElementById('next-1').click();
      d.getElementById('next-2').click();
      fold.open = true;
      fold.dispatchEvent(new w.Event('toggle'));
      expect(sheet.getAttribute('data-ready')).toBe('1');
      expect(sheet.hidden).toBe(false);
      expect(sheet.querySelector('h4.paper-manip-title')).toBeTruthy();
      expect(sheet.textContent).toContain(expectedText);
      expect(sheet.textContent).not.toMatch(/Grades?\s*\d/i);
      expect(sheet.querySelector('.paper-manip-key')).toBeTruthy();
      d.getElementById('back-3').click();
      d.getElementById('back-2').click();
    }

    // Re-enter step 3 and test key toggle + print
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();
    const keyCb = d.getElementById('f-paper-manip-key');
    keyCb.checked = false;
    keyCb.dispatchEvent(new w.Event('change'));
    expect(sheet.querySelector('.paper-manip-key')).toBeNull();
    d.getElementById('print-paper-manip').click();
    expect(printCalls).toBe(1);

    expect(read('packets-manipulatives.css').split('@media print')[0]).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(read('packets-manipulatives.js')).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
    await new Promise((r) => setTimeout(r, 0));
    dom.window.close();
  });

  it('supports UDL Choice and Non-Scored Support pills, live counts, standards search, and URL hash filters in packets-packs.html', () => {
    const dom = new JSDOM(read('packets-packs.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-packs.html#grade=3-5&feature=UDL+Choice',
    });
    const w = dom.window;
    const d = w.document;
    w.eval(read('packets_starter_packs.js'));
    w.eval(read('packets-packs.js'));
    if (d.readyState === 'loading') d.dispatchEvent(new w.Event('DOMContentLoaded'));

    // URL hash pre-filtered to grade 3-5 + UDL Choice
    expect(d.getElementById('f-grade').value).toBe('3-5');
    const udlPill = d.querySelector('[data-feature="UDL Choice"]');
    expect(udlPill).toBeTruthy();
    expect(udlPill.getAttribute('aria-pressed')).toBe('true');
    const cards = [...d.querySelectorAll('#packs-grid .pack-card')];
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards.map((c) => c.getAttribute('data-pack-id'))).toContain('oer_choice_ecosystems_g35');

    // Clear filters and test Non-Scored Support pill + live count + standards search
    d.getElementById('btn-clear-filters').click();
    const nsPill = d.querySelector('[data-feature="Non-Scored Support"]');
    expect(nsPill).toBeTruthy();
    expect(nsPill.querySelector('.pill-count').textContent).toBe('(2)');
    nsPill.click();
    expect(nsPill.getAttribute('aria-pressed')).toBe('true');
    const nsIds = [...d.querySelectorAll('#packs-grid .pack-card')].map((c) => c.getAttribute('data-pack-id')).sort();
    expect(nsIds).toEqual(['oer_aac_core_16', 'oer_sel_ef_toolkit']);

    // Print-Ready pill now covers all makers with printable paper backups
    d.getElementById('btn-clear-filters').click();
    const prPill = d.querySelector('[data-feature="Print-Ready"]');
    expect(Number(prPill.querySelector('.pill-count').textContent.replace(/\D/g, ''))).toBeGreaterThanOrEqual(15);

    // Search by standards code (NGSS)
    const search = d.getElementById('f-search');
    search.value = 'NGSS';
    search.dispatchEvent(new w.Event('input'));
    expect([...d.querySelectorAll('#packs-grid .pack-card')].map((c) => c.getAttribute('data-pack-id'))).toContain('oer_unit_playlist_sci_lit');

    expect(read('packets-packs.css').split('@media print')[0]).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(read('packets-packs.js')).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
    dom.window.close();
  });
});
