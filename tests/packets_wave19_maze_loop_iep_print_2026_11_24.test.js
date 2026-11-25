// @vitest-environment jsdom
// Wave 19 checks (2026-11-24):
// 1. CBM-Maze missed content words -> closed-loop Vocabulary & Word Cards in packets_followup.js and packets-results.js.
// 2. 1-page printable IEP Progress & UDL Supports Summary: UDL Choice Board pathways, Wave 1B-4C human support labels, and CBM-Maze net score.
// 3. Printable cut-and-laminate desk strip & toolkit sheet in packets-sel.html/css/js.
// 4. Printable paper graphic organizer & writing worksheet (+ toggleable Page 2 Answer Key) in packets-choice.html/css/js.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (f) => readFileSync(f, 'utf8');

function makeMazeProbeJson(learner, sid, date, items, tools = []) {
  const correct = items.filter((it) => it.correct).length;
  return JSON.stringify({
    kind: 'alloflow-take-home-result',
    schemaVersion: 3,
    sessionId: sid,
    learner,
    packet: { id: 'maze-pond-a', version: 'r1', form: 'A', mode: 'probe' },
    lessonId: 'maze-pond-a',
    revision: 'r1',
    lessonTitle: 'The Busy Pond',
    activityTitles: { maze_reading: 'Maze Reading' },
    startedLocal: `${date}T09:00:00-05:00`,
    finishedLocal: `${date}T09:03:00-05:00`,
    durationMs: 180000,
    activeMs: 175000,
    score: {
      measure: 'maze_correct_3m',
      score: correct,
      scoreUnit: 'items_correct',
      itemsCorrect: correct,
      itemsAttempted: items.length,
      timeLimitS: 180,
      elapsedS: 175,
      completion: 'complete',
      tools,
    },
    summary: { items: items.length, done: items.length, firstTry: correct, afterRetry: 0, missed: items.length - correct, practised: 0 },
    items: items.map((it, idx) => ({
      n: idx + 1,
      itemId: `mz-${idx + 1}`,
      activity: 'maze_reading',
      word: it.word,
      target: it.word,
      responses: [it.response || (it.correct ? it.word : 'wrong')],
      attempts: 1,
      correct: !!it.correct,
      firstTry: !!it.correct,
      done: true,
      ms: 4000,
      supports: it.supports || {},
      practice: null,
      flag: '',
    })),
  });
}

describe('Wave 19 Closed-Loop Maze Vocab, Enriched IEP UDL Summary, and SEL/Choice Print Sheets', () => {
  it('feeds missed CBM-Maze content words (excluding stop words) into followup drafts and Results Vocabulary/Word Cards links', async () => {
    const reader = require('../packets_results_reader.js');
    const followup = require('../packets_followup.js');

    const mazeItemsA = [
      { word: 'that', correct: false, response: 'than' },       // stop word -> excluded
      { word: 'from', correct: false, response: 'form' },       // stop word -> excluded
      { word: 'photosynthesis', correct: false, response: 'photocopy' },
      { word: 'ecosystem', correct: false, response: 'economy' },
      { word: 'habitat', correct: true },
      { word: 'pollinate', correct: true },
    ];
    const mazeItemsB = [
      { word: 'ecosystem', correct: false, response: 'echo' },
      { word: 'chlorophyll', correct: false, response: 'chlorine' },
      { word: 'habitat', correct: true },
    ];

    const r1 = await reader.read(makeMazeProbeJson('BlueHeron7', 'mz-s1', '2026-11-24', mazeItemsA, ['textLarger']), { name: 'a.json' });
    const r2 = await reader.read(makeMazeProbeJson('RedFox4', 'mz-s2', '2026-11-24', mazeItemsB), { name: 'b.json' });
    expect(r1.ok && r2.ok).toBe(true);

    const model = reader.addUp([r1.sessions[0], r2.sessions[0]]);
    const groupAnalysis = followup.analyzeFollowup({ scope: 'group', learners: model.learners }, { reader });
    expect(groupAnalysis.hasAny).toBe(true);
    expect(groupAnalysis.targets.vocab).toBeTruthy();
    expect(groupAnalysis.targets.vocab.fromMaze).toBe(true);
    expect(groupAnalysis.targets.vocab.pattern).toBe('Maze reading words');
    expect(groupAnalysis.targets.vocab.missedItems).toEqual(['ecosystem', 'chlorophyll', 'photosynthesis']);
    expect(groupAnalysis.targets.vocab.missedItems).not.toContain('that');
    expect(groupAnalysis.targets.vocab.missedItems).not.toContain('from');
    expect(groupAnalysis.targets.vocab.reviewItems).toContain('habitat');

    // Verify in live packets-results.html DOM (both Group view and Student view)
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
      new w.File([makeMazeProbeJson('BlueHeron7', 'mz-s1', '2026-11-24', mazeItemsA, ['textLarger'])], 'a.json', { type: 'application/json' }),
      new w.File([makeMazeProbeJson('RedFox4', 'mz-s2', '2026-11-24', mazeItemsB)], 'b.json', { type: 'application/json' }),
    ];
    const ev = new w.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files };
    d.getElementById('main').dispatchEvent(ev);
    for (let i = 0; i < 150 && !/\bread[,.]/.test(d.getElementById('said').textContent); i++) {
      await new Promise((r) => setTimeout(r, 15));
    }
    const showBtn = d.getElementById('show-results');
    if (showBtn && !d.getElementById('state-check').hidden) showBtn.click();

    const groupLinks = [...d.querySelectorAll('#group-missed a.nav-new-tab')];
    const vocabHref = groupLinks.find((a) => a.getAttribute('href').startsWith('packets-vocab.html#rehearse='));
    const cardsHref = groupLinks.find((a) => a.getAttribute('href').startsWith('packets-present-export.html#words='));
    expect(vocabHref).toBeTruthy();
    expect(vocabHref.textContent).toContain('Practice group missed Maze words in Vocabulary');
    expect(decodeURIComponent(vocabHref.getAttribute('href'))).toContain('ecosystem');
    expect(decodeURIComponent(vocabHref.getAttribute('href'))).not.toContain('that');
    expect(cardsHref).toBeTruthy();
    expect(decodeURIComponent(cardsHref.getAttribute('href'))).toContain('photosynthesis');

    // Switch to Student view (BlueHeron7) and verify per-student Maze -> Vocabulary & Word Cards links
    d.querySelector('#group-table button.name-link').click();
    const learnerLinks = [...d.querySelectorAll('#learner-body .next-practice a.nav-new-tab')];
    const studentVocab = learnerLinks.find((a) => a.getAttribute('href').startsWith('packets-vocab.html#rehearse='));
    expect(studentVocab).toBeTruthy();
    expect(studentVocab.textContent).toContain('Practice missed Maze words in Vocabulary');
    expect(decodeURIComponent(studentVocab.getAttribute('href'))).toContain('photosynthesis');

    // Paper score form hint mentions printed CBM-Maze probes
    expect(d.getElementById('learner-body').textContent).toContain('printed CBM-Maze probe');
    await new Promise((r) => setTimeout(r, 0));
    dom.window.close();
  });

  it('enriches the 1-page printable IEP progress summary with UDL Choice Board pathways, Wave 1B-4C support labels, and CBM-Maze net scores', async () => {
    const reader = require('../packets_results_reader.js');
    const followup = require('../packets_followup.js');

    const mazeItems = [
      { word: 'habitat', correct: true },
      { word: 'ecosystem', correct: true },
      { word: 'predator', correct: true },
      { word: 'producer', correct: true },
      { word: 'consumer', correct: false, response: 'customer' },
    ];
    const choiceJson = JSON.stringify({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'cb-iep-1',
      learner: 'CedarOwl2',
      packet: { id: 'choice-eco-1', version: 'r1', form: '', mode: 'practice' },
      lessonId: 'choice-eco-1',
      revision: 'r1',
      lessonTitle: 'Ecosystems Choice Board',
      activityTitles: { choice_board: 'UDL Choice Board', tiered_writing: 'Tiered Writing' },
      startedLocal: '2026-11-23T10:00:00-05:00',
      finishedLocal: '2026-11-23T10:08:00-05:00',
      durationMs: 480000,
      activeMs: 450000,
      summary: { items: 2, done: 2, firstTry: 2, afterRetry: 0, missed: 0, practised: 0 },
      items: [
        {
          n: 1,
          itemId: 'cb-1',
          activity: 'choice_board',
          word: 'Ecosystems',
          target: 'done',
          responses: ['mod:concept_sort'],
          attempts: 1,
          correct: true,
          firstTry: true,
          done: true,
          ms: 32000,
          supports: { modality_concept_sort: 1, modality_switch: 1, efChecklist: 1, bilingual_dir: 1, lab_data_filter: 1 },
          practice: null,
          flag: '',
        },
        {
          n: 2,
          itemId: 'tw-1',
          activity: 'tiered_writing',
          word: 'Claim',
          target: 'done',
          responses: ['Producers make food.'],
          attempts: 1,
          correct: true,
          firstTry: true,
          done: true,
          ms: 40000,
          supports: { tier_frames: 1, stretch_item: 1 },
          practice: null,
          flag: '',
        },
      ],
    });

    const rMaze = await reader.read(makeMazeProbeJson('CedarOwl2', 'mz-iep-1', '2026-11-24', mazeItems, ['spacingWide']), { name: 'mz.json' });
    const rChoice = await reader.read(choiceJson, { name: 'cb.json' });
    expect(rMaze.ok && rChoice.ok).toBe(true);

    const model = reader.addUp([rMaze.sessions[0], rChoice.sessions[0]]);
    const learner = model.learners[0];
    const summary = followup.buildStudentProgressSummary(learner, model, { reader, today: '2026-11-24' });

    // CBM-Maze trend carries Maze net (4 right - 1 wrong = 3)
    const mazeTrend = summary.trends.find((t) => t.key.includes('maze_correct_3m'));
    expect(mazeTrend).toBeTruthy();
    expect(mazeTrend.latestMazeNet).toEqual({ correct: 4, incorrect: 1, net: 3 });

    // UDL Choice Board pathways extracted separately from activity supports
    expect(summary.udlSupports.choicePathways).toEqual([{ label: 'Concept Sort', sessions: 1 }]);
    expect(summary.udlSupports.pathwaySwitchSessions).toBe(1);
    const supLabels = summary.udlSupports.itemSupports.map((s) => s.label);
    expect(supLabels).toContain('First-Then checklist');
    expect(supLabels).toContain('Home-language directions');
    expect(supLabels).toContain('Data Explorer filter');
    expect(supLabels).toContain('Sentence frames (Level 1)');
    expect(supLabels).toContain('Stretch challenge item');
    expect(supLabels.join(' ')).not.toMatch(/modality/i);

    const card = followup.renderProgressSummaryCard(document, summary, {});
    expect(card).toBeTruthy();
    const txt = card.textContent;
    expect(txt).toContain('Maze net 3');
    expect(txt).toContain('UDL Choice Board pathways: Concept Sort (1 session); switched pathway in 1 session.');
    expect(txt).toContain('First-Then checklist');
    expect(txt).toContain('Home-language directions');
    expect(txt).toContain('Data Explorer filter');
    expect(txt).toContain('Sentence frames (Level 1)');
    expect(txt).toContain('Stretch challenge item');
  });

  it('renders a printable cut-and-laminate desk strip & toolkit sheet in packets-sel.html Step 3', async () => {
    const dom = new JSDOM(read('packets-sel.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-sel.html',
    });
    const w = dom.window;
    let printCalls = 0;
    w.print = () => { printCalls++; };
    w.eval(read('word_sounds_take_home_loader.js'));
    w.eval(read('packets_station_bilingual.js'));
    w.eval(read('packet_sel_builder.js'));
    w.eval(read('packets-sel.js'));

    const d = w.document;
    if (d.getElementById('step-1').hidden) d.dispatchEvent(new w.Event('DOMContentLoaded'));

    // Select Combined Daily Toolkit (mixed) so all 4 printable card types render
    const mixRadio = d.querySelector('input[name="activity"][value="mixed"]');
    mixRadio.checked = true;
    mixRadio.dispatchEvent(new w.Event('change'));
    d.getElementById('next-1').click();
    // Ensure all 4 tools are checked
    for (const cb of d.querySelectorAll('#mixed-tools input[type="checkbox"]')) {
      if (!cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new w.Event('change'));
      }
    }
    d.getElementById('next-2').click();

    const sheet = d.getElementById('paper-sel-sheet');
    expect(sheet.getAttribute('data-ready')).toBe('1');
    expect(sheet.hidden).toBe(true);

    const fold = d.getElementById('paper-sel-fold');
    fold.open = true;
    fold.dispatchEvent(new w.Event('toggle'));
    expect(sheet.hidden).toBe(false);

    expect(sheet.querySelector('h4.paper-sel-title')).toBeTruthy();
    expect(sheet.textContent).toContain('Cut along dashed border for a desk First-Then strip');
    expect(sheet.textContent).toContain('Focus Session Plan');
    expect(sheet.textContent).toContain('1. Breathe in (4)');
    expect(sheet.textContent).toContain('My Learning & Supports Check-In');

    d.getElementById('print-paper-sel').click();
    expect(printCalls).toBe(1);

    // Zero raw hex before @media print & zero innerHTML in packets-sel.js
    const selCss = read('packets-sel.css');
    expect(selCss.split('@media print')[0]).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(read('packets-sel.js')).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);

    await new Promise((r) => setTimeout(r, 0));
    dom.window.close();
  });

  it('renders printable paper graphic organizers and toggleable answer keys across all 4 modes in packets-choice.html Step 3', async () => {
    const dom = new JSDOM(read('packets-choice.html'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-choice.html',
    });
    const w = dom.window;
    let printCalls = 0;
    w.print = () => { printCalls++; };
    w.eval(read('word_sounds_take_home_loader.js'));
    w.eval(read('packets_station_bilingual.js'));
    w.eval(read('packet_sort_write_adapters.js'));
    w.eval(read('packet_choice_builder.js'));
    w.eval(read('packets-choice.js'));

    const d = w.document;
    if (d.getElementById('step-1').hidden) d.dispatchEvent(new w.Event('DOMContentLoaded'));

    // Default template is UDL Choice Board -> Step 1 -> Step 2 -> Step 3
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();

    const sheet = d.getElementById('paper-choice-sheet');
    const fold = d.getElementById('paper-choice-fold');
    expect(sheet.getAttribute('data-ready')).toBe('1');
    expect(sheet.hidden).toBe(true);
    fold.open = true;
    fold.dispatchEvent(new w.Event('toggle'));
    expect(sheet.hidden).toBe(false);

    expect(sheet.querySelector('h4.paper-choice-title')).toBeTruthy();
    expect(sheet.textContent).toContain('Learning Goal:');
    expect(sheet.querySelectorAll('.paper-choice-option').length).toBeGreaterThanOrEqual(2);
    expect(sheet.querySelector('.paper-choice-key')).toBeTruthy();
    expect(sheet.textContent).not.toMatch(/Grades?\s*\d/i);

    // Toggle Teacher Answer Key off
    const keyCb = d.getElementById('f-paper-choice-key');
    keyCb.checked = false;
    keyCb.dispatchEvent(new w.Event('change'));
    expect(sheet.querySelector('.paper-choice-key')).toBeNull();
    keyCb.checked = true;
    keyCb.dispatchEvent(new w.Event('change'));
    expect(sheet.querySelector('.paper-choice-key')).toBeTruthy();

    // Print button calls window.print
    d.getElementById('print-paper-choice').click();
    expect(printCalls).toBe(1);

    // Switch to Tiered Writing and verify passage/word bank/frames/rubric render cleanly on paper
    d.getElementById('back-3').click();
    d.getElementById('back-2').click();
    const twRadio = d.querySelector('input[name="activity"][value="tiered_writing"]');
    twRadio.checked = true;
    twRadio.dispatchEvent(new w.Event('change'));
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();

    expect(sheet.textContent).toContain('Academic Word Bank');
    expect(sheet.textContent).toContain('Self-Check Rubric');
    expect(sheet.querySelectorAll('.paper-choice-line').length).toBeGreaterThanOrEqual(8);

    // Switch to Sequence Order and verify shuffled bank + answer key
    d.getElementById('back-3').click();
    d.getElementById('back-2').click();
    const sqRadio = d.querySelector('input[name="activity"][value="sequence_order"]');
    sqRadio.checked = true;
    sqRadio.dispatchEvent(new w.Event('change'));
    d.getElementById('next-1').click();
    d.getElementById('next-2').click();

    expect(sheet.textContent).toContain('Steps to put in order');
    expect(sheet.querySelectorAll('.paper-choice-seq-row').length).toBeGreaterThanOrEqual(3);
    expect(sheet.querySelector('.paper-choice-key')).toBeTruthy();

    // Zero raw hex before @media print & zero innerHTML in packets-choice.js
    const choiceCss = read('packets-choice.css');
    expect(choiceCss.split('@media print')[0]).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(read('packets-choice.js')).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);

    await new Promise((r) => setTimeout(r, 0));
    dom.window.close();
  });
});
