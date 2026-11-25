// Wave 40 (2026-11-25):
// 1. Printable CTOPP-style Teacher Record & Scoring Sheet for Word Sounds (live overlay print,
//    standalone HTML builder, and embedded print record inside offline Audio Companion HTML).
// 2. Live & offline Worksheet Audio Companion for Vocabulary (packets-vocab.html) matching Parts 1,
//    1B Meanings (A-Z), Word Bank, Part 2 Fill in the Blank (no answer leak), and Part 3 Pictures.
// 3. Live & offline Worksheet Audio Companion for Read-Along (packets-read-along.html) matching
//    Part 1 Passage Sentences, Part 2 Reading Notes, and Part 3 Check Your Understanding.
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
const wait = (ms = 15) => new Promise((r) => setTimeout(r, ms));

function wavB64(tag = 'clip') {
  const buf = Buffer.alloc(96);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(88, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(24000, 24);
  buf.writeUInt32LE(48000, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(52, 40);
  buf.write(String(tag).slice(0, 12), 44);
  return buf.toString('base64');
}
const wavUri = (tag) => 'data:audio/wav;base64,' + wavB64(tag);

function loadPrintCards(win) {
  win.eval(read('packets-print-cards.js'));
  return win.AlloPacketPrintCards;
}

async function buildWordSoundsLesson() {
  const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
  const shrink = (val, p) => typeof val === 'string'
    ? (val.startsWith('data:audio') ? wavUri(p) : val)
    : (val && typeof val === 'object' ? Object.fromEntries(Object.entries(val).map(([k, v]) => [k, shrink(v, p + '/' + k)])) : val);
  const banks = shrink(tool.loadBanks({ shards: false }), 'b');
  const res = await builder.buildPacket({
    words: ['top', 'cat', 'sun'],
    activities: ['letter_tracing', 'isolation', 'blending', 'orthography'],
    seed: 7,
    title: 'Short Vowel Check',
    core,
    dictionary,
    banks,
    loader,
    wordlist,
    allowUnconverted: true,
  });
  return res.lesson;
}

function makeVocabState() {
  return {
    title: 'Ecosystem Words',
    entries: [
      { word: 'habitat', meaning: 'the natural home of a plant or animal', example: 'A pond is a frog habitat.', blank: 'A pond is a frog ___.', blankAnswer: 'habitat', picture: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22/%3E' },
      { word: 'predator', meaning: 'an animal that hunts other animals for food', example: 'An owl is a quiet predator.', blank: 'An owl is a quiet ___.', blankAnswer: 'predator', picture: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22/%3E' },
      { word: 'prey', meaning: 'an animal that is hunted by another animal', example: 'Rabbits are prey for foxes.', blank: 'Rabbits are ___ for foxes.', blankAnswer: 'prey' },
    ],
    wordClips: {
      habitat: wavUri('w_habitat'),
      predator: wavUri('w_predator'),
      prey: wavUri('w_prey'),
    },
    meaningClips: {
      'the natural home of a plant or animal': wavUri('m_habitat'),
      'an animal that hunts other animals for food': wavUri('m_predator'),
      'an animal that is hunted by another animal': wavUri('m_prey'),
    },
    wordBank: true,
    pictures: true,
  };
}

function makeReadAlongState() {
  return {
    title: 'The Fox in the Grass',
    sentences: [
      { text: 'The fox ran to the den.', key: 'the fox ran to the den.' },
      { text: 'It hid in the tall grass.', key: 'it hid in the tall grass.' },
      { text: 'Then the sun went down.', key: 'then the sun went down.', para: true },
    ],
    clips: {
      'the fox ran to the den.': { uri: wavUri('s1'), ms: 900, source: 'computer' },
      'it hid in the tall grass.': { uri: wavUri('s2'), ms: 950, source: 'computer' },
      'then the sun went down.': { uri: wavUri('s3'), ms: 850, source: 'teacher' },
    },
    customSupports: [
      { line: 0, quote: 'den', text: 'A safe home where a fox rests.', audioUri: wavUri('sup1') },
    ],
    questions: [
      { kind: 'mc', prompt: 'Where did the fox hide?', choices: ['In the tall grass', 'On the roof', 'In the pond'], answer: 0 },
      { kind: 'open', prompt: 'Why did the fox come out after sunset?' },
    ],
  };
}

describe('Wave 40A: CTOPP-style Printable Teacher Record & Scoring Sheet', () => {
  it('builds a strict monochrome offline scoring sheet with 1/0 scored rows, unscored practice rows, and audio conditions', async () => {
    const lesson = await buildWordSoundsLesson();
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://packets.test/packets-make.html' });
    opened.push(dom.window);
    const PC = loadPrintCards(dom.window);

    const html = PC.buildWordSoundsScoringSheetHtml(
      { title: 'Short Vowel Check', lesson, audio: lesson.audio },
      { slow: true, autoSec: 5, gapMs: 1000, dirMode: 'section' }
    );
    expect(html).toContain("script-src 'none'");
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).toContain('Teacher Record &amp; Scoring Sheet');
    expect(html).toContain('Slow (0.8x)');
    expect(html).toContain('5s auto-advance');
    expect(html).toContain('Sound gap: 1.0s');
    // Scored activities get 1 / 0 bubbles and subtotals; Letter Trace is unscored practice only!
    expect(html).toContain('<span class="sc-bub">1</span> <span class="sc-bub">0</span>');
    expect(html).toContain('Practice / listening only (not scored).');
    expect(html).toContain('Total scored:');
  }, 30000);

  it('wires #pc-audio-print-score in live overlay and #print-scoring inside offline Audio Companion HTML', async () => {
    const lesson = await buildWordSoundsLesson();
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-make.html' });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    w.scrollTo = () => {};
    let printCount = 0;
    w.print = () => { printCount++; };

    const PC = loadPrintCards(w);
    PC.openWorksheetAudio({ title: 'Short Vowel Check', lesson, audio: lesson.audio });
    const slowBox = d.getElementById('pc-audio-slow');
    slowBox.checked = true;
    slowBox.dispatchEvent(new w.Event('change', { bubbles: true }));

    const printBtn = d.getElementById('pc-audio-print-score');
    expect(printBtn).toBeTruthy();
    printBtn.click();
    expect(printCount).toBe(1);
    const sheet = d.getElementById('pc-audio-score-sheet');
    expect(sheet.textContent).toContain('Short Vowel Check — Teacher Record & Scoring Sheet');
    expect(sheet.textContent).toContain('Slow (0.8x)');
    expect(sheet.querySelectorAll('.pc-score-bub').length).toBeGreaterThanOrEqual(6);

    // Offline Audio Companion HTML also has #print-scoring + embedded #print-record!
    const offHtml = PC.buildWordSoundsAudioCompanionHtml({ title: 'Short Vowel Check', lesson, audio: lesson.audio });
    const offDom = new JSDOM(offHtml, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/audio.html' });
    const ow = offDom.window;
    const od = ow.document;
    opened.push(ow);
    let offPrints = 0;
    ow.print = () => { offPrints++; };
    for (const s of [...od.querySelectorAll('script')]) if (s.textContent.trim()) ow.eval(s.textContent);
    const offPrintBtn = od.getElementById('print-scoring');
    expect(offPrintBtn).toBeTruthy();
    offPrintBtn.click();
    expect(offPrints).toBe(1);
    expect(od.getElementById('print-record').textContent).toContain('Teacher Record & Scoring Sheet');
    expect(od.getElementById('print-record').querySelectorAll('.pr-b').length).toBeGreaterThanOrEqual(6);
  }, 30000);
});

describe('Wave 40B: Vocabulary Worksheet Audio Companion', () => {
  it('builds a 1-to-1 vocab audio plan (Words, A-Z Meanings, Word Bank, non-leaking Cloze, Pictures) and offline player', async () => {
    const dom = new JSDOM(read('packets-vocab.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-vocab.html' });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    w.scrollTo = () => {};

    // CSP includes media-src data: and #worksheet-audio button exists in #paper.
    const csp = d.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain('media-src data:');
    expect(d.getElementById('worksheet-audio')).toBeTruthy();

    const PC = loadPrintCards(w);
    const vState = makeVocabState();
    const plan = PC.buildVocabAudioPlan(vState);
    expect(plan.kind).toBe('vocab');
    expect(plan.clipCount).toBe(6); // 3 words + 3 meanings
    expect(plan.sections.map((s) => s.activity)).toEqual([
      'vocab_matching',
      'vocab_meanings',
      'vocab_bank',
      'vocab_cloze',
      'vocab_pictures',
    ]);
    // Part 1B uses letter labels A, B, C...
    const meaningsSec = plan.sections.find((s) => s.activity === 'vocab_meanings');
    expect(meaningsSec.items.map((i) => i.numLabel)).toEqual(['A', 'B', 'C']);
    expect(meaningsSec.scored).toBe(false);
    // Part 2 Fill in the Blank never leaks the blanked word in script!
    const clozeSec = plan.sections.find((s) => s.activity === 'vocab_cloze');
    expect(clozeSec.items[0].script).toContain('_____');
    expect(clozeSec.items[0].script.toLowerCase()).not.toContain('habitat');
    expect(clozeSec.items[0].answer.toLowerCase()).toContain('habitat');

    // Open live Vocabulary Audio overlay and verify Spoken directions is hidden while Sound gap is visible.
    PC.openVocabAudio(vState);
    const view = d.getElementById('worksheet-audio-view');
    expect(view && !view.hidden).toBe(true);
    expect(d.getElementById('pc-audio-dir').closest('.pc-audio-ctrl').hidden).toBe(true);
    expect(d.getElementById('pc-audio-gap').closest('.pc-audio-ctrl').hidden).toBe(false);

    // Offline standalone Vocab Audio Companion mounts and plays clips cleanly!
    const offHtml = PC.buildVocabAudioCompanionHtml(vState);
    expect(offHtml).toContain("connect-src 'none'");
    expect(offHtml).not.toMatch(/innerHTML|document\.write|https?:\/\//i);
    const pDom = new JSDOM(offHtml, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/vocab-audio.html' });
    const pw = pDom.window;
    const pd = pw.document;
    opened.push(pw);
    const played = [];
    pw.Audio = class {
      constructor(src) { this.src = src; }
      play() { played.push(this.src); setTimeout(() => { if (typeof this.onended === 'function') this.onended(); }, 0); return Promise.resolve(); }
      pause() {}
    };
    for (const s of [...pd.querySelectorAll('script')]) if (s.textContent.trim()) pw.eval(s.textContent);
    expect(pd.getElementById('dir')).toBeNull();
    expect(pd.getElementById('gap')).toBeTruthy();
    pd.querySelector('.stage button.primary').click();
    await wait(25);
    expect(played.length).toBeGreaterThan(0);
    expect(played[0].startsWith('data:audio/wav;base64,')).toBe(true);
  });
});

describe('Wave 40C: Read-Along Worksheet Audio Companion', () => {
  it('builds a 1-to-1 read-along audio plan (Sentences, Notes, Questions), keeps 15 initial head assets, and mounts offline', async () => {
    const html = read('packets-read-along.html');
    const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-read-along.html' });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    w.scrollTo = () => {};

    // Keeps exact 15 initial head stylesheets+scripts and documents lazy-loaded print-cards in proof!
    const headAssets = [...d.querySelectorAll('link[rel="stylesheet"][href], script[src]')];
    expect(headAssets).toHaveLength(15);
    expect(d.querySelector('details.proof').textContent).toContain('packets-print-cards.js');
    expect(d.getElementById('worksheet-audio')).toBeTruthy();

    const PC = loadPrintCards(w);
    const raState = makeReadAlongState();
    const plan = PC.buildReadAlongAudioPlan(raState);
    expect(plan.kind).toBe('read-along');
    expect(plan.clipCount).toBe(4); // 3 sentences + 1 support clip
    expect(plan.sections.map((s) => s.activity)).toEqual([
      'read_along_passage',
      'read_along_supports',
      'read_along_questions',
    ]);
    expect(plan.sections[0].scored).toBe(false);
    expect(plan.sections[2].scored).toBe(true);
    expect(plan.sections[2].items[0].answer).toContain('A — In the tall grass');

    // Scoring sheet marks passage/notes as unscored and questions as scored (1 / 0).
    const scoreHtml = PC.buildReadAlongScoringSheetHtml(raState);
    expect(scoreHtml).toContain('Practice / listening only (not scored).');
    expect(scoreHtml).toContain('Total scored:</strong> <span class="sc-blank-md"></span> / 2');

    // Open live Read-Along Audio overlay: both Sound gap and Spoken directions controls hide cleanly.
    PC.openReadAlongAudio(raState);
    expect(d.getElementById('pc-audio-gap').closest('.pc-audio-ctrl').hidden).toBe(true);
    expect(d.getElementById('pc-audio-dir').closest('.pc-audio-ctrl').hidden).toBe(true);

    // Offline standalone Read-Along Audio Companion mounts and plays sentence #1.
    const offHtml = PC.buildReadAlongAudioCompanionHtml(raState);
    expect(offHtml).toContain("connect-src 'none'");
    expect(offHtml).not.toMatch(/innerHTML|document\.write|https?:\/\//i);
    const pDom = new JSDOM(offHtml, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/ra-audio.html' });
    const pw = pDom.window;
    const pd = pw.document;
    opened.push(pw);
    const played = [];
    pw.Audio = class {
      constructor(src) { this.src = src; }
      play() { played.push(this.src); setTimeout(() => { if (typeof this.onended === 'function') this.onended(); }, 0); return Promise.resolve(); }
      pause() {}
    };
    for (const s of [...pd.querySelectorAll('script')]) if (s.textContent.trim()) pw.eval(s.textContent);
    expect(pd.getElementById('gap')).toBeNull();
    expect(pd.getElementById('dir')).toBeNull();
    pd.querySelector('.stage button.primary').click();
    await wait(25);
    expect(played.length).toBe(1);
    expect(played[0].startsWith('data:audio/wav;base64,')).toBe(true);
  });
});
