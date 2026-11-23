// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const cards = require('../packets-print-cards.js');
const matcher = require('../word_picture_matcher.js');
const SYMBOLS = require('../word_sounds_symbols_en.js');
for (const shard of SYMBOLS.shards) SYMBOLS.add(JSON.parse(read(shard.url)));

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SVG_SAMPLE = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>');

const openedWindows = [];
afterEach(() => {
  while (openedWindows.length) {
    try { openedWindows.pop().close(); } catch (_) {}
  }
});

function createPipeline() {
  loadAlloModule('doc_pipeline_module.js');
  return window.AlloModules.createDocPipeline({
    callGemini: async () => '{}',
    callGeminiVision: async () => '{}',
    callImagen: async () => null,
    addToast: () => {},
    t: (key) => key,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: (type) => (type === 'word-sounds' || type === 'word_sounds' ? 'Word Sounds Studio' : (type || 'Resource')),
    state: {},
  });
}

describe('1. Full Lesson Pack Word Sounds export (doc_pipeline_module.js)', () => {
  it('registers word-sounds capability as export-ready and exports cleanly via WordPractice with teacher-only answer key', () => {
    loadAlloModule('word_practice_module.js');
    const pipeline = createPipeline();

    const profile = pipeline.interactiveObjectProfileFor('word-sounds');
    expect(profile.status).toBe('ready');
    expect(profile.canExportHtml).toBe(true);
    expect(profile.canExportIms).toBe(true);
    expect(pipeline.interactiveObjectProfileFor('word_sounds').canExportHtml).toBe(true);

    const wsItem = {
      id: 'ws-pack-1',
      type: 'word-sounds',
      title: 'Digraphs & Blends Practice',
      data: [
        { word: 'ship', phonemes: ['sh', 'i', 'p'], graphemes: ['sh', 'i', 'p'] },
        { word: 'frog', phonemes: ['f', 'r', 'o', 'g'], graphemes: ['f', 'r', 'o', 'g'] },
      ],
      lessonPlanSequence: ['mapping', 'counting', 'spelling_bee'],
    };

    // Direct generateResourceHTML: student copy strips answer key; no nested <html>/<head>/<body>
    const studentFragment = pipeline.generateResourceHTML(wsItem, false, {}, {});
    expect(studentFragment).toContain('alloflow-word-sounds-ws');
    expect(studentFragment).toContain('data-activity="mapping"');
    expect(studentFragment).toContain('data-activity="counting"');
    expect(studentFragment).toContain('data-activity="spelling_bee"');
    expect(studentFragment).not.toMatch(/<html\b|<head\b|<body\b|<!doctype/i);
    const studentFragDoc = new JSDOM(studentFragment).window.document;
    expect(studentFragDoc.querySelector('.ws-key')).toBeNull();
    expect(studentFragDoc.querySelector('[data-answer-key]')).toBeNull();
    expect(studentFragment).not.toContain('For the teacher');

    // Direct generateResourceHTML: teacher copy includes wrapped teacher-only answer key
    const teacherFragment = pipeline.generateResourceHTML(wsItem, true, {}, {});
    expect(teacherFragment).toContain('data-answer-key="true"');
    expect(teacherFragment).toContain('class="answer-key teacher-only"');
    expect(teacherFragment).toContain('For the teacher');
    expect(teacherFragment).toContain('Read aloud: &quot;ship&quot;');
    expect(teacherFragment).not.toMatch(/<html\b|<head\b|<body\b|<!doctype/i);

    // Full Lesson Pack: student worksheet copy strips answer key
    const studentPackHtml = pipeline.generateFullPackHTML([wsItem], 'Phonics Unit', true, {}, { includeTeacherKey: false });
    const studentDom = new JSDOM(studentPackHtml);
    openedWindows.push(studentDom.window);
    const sDoc = studentDom.window.document;
    expect(sDoc.querySelectorAll('html')).toHaveLength(1);
    expect(sDoc.querySelectorAll('body')).toHaveLength(1);
    expect(sDoc.querySelector('[data-alloflow-resource-id="ws-pack-1"]')).not.toBeNull();
    expect(sDoc.querySelector('.alloflow-word-sounds-ws [data-activity="mapping"]')).not.toBeNull();
    expect(sDoc.querySelector('[data-answer-key]')).toBeNull();
    expect(sDoc.querySelector('.ws-key')).toBeNull();
    expect(sDoc.body.textContent).not.toContain('For the teacher — keep apart from the student copy');

    const manifest = JSON.parse(sDoc.getElementById('alloflow-interactive-object-profile').textContent);
    const wsManifest = manifest.resources.find((r) => r.id === 'ws-pack-1');
    expect(wsManifest.canExportHtml).toBe(true);
    expect(wsManifest.renderedInStudentHtml).toBe(true);

    // Full Lesson Pack: teacher pack preserves answer key inside .teacher-view and strips cleanly via IMS selectors
    const teacherPackHtml = pipeline.generateFullPackHTML([wsItem], 'Phonics Unit', false, {}, { includeTeacherKey: true });
    const teacherDom = new JSDOM(teacherPackHtml);
    openedWindows.push(teacherDom.window);
    const tDoc = teacherDom.window.document;
    const teacherView = tDoc.querySelector('.teacher-view');
    expect(teacherView).not.toBeNull();
    const wrappedKey = teacherView.querySelector('.answer-key.teacher-only[data-answer-key="true"]');
    expect(wrappedKey).not.toBeNull();
    expect(wrappedKey.textContent).toContain('Teacher Answer Key');
    expect(wrappedKey.textContent).toContain('ship');

    // Simulate _stripTeacherForIms selector cleanup
    tDoc.querySelectorAll('.teacher-view,[data-allo-teacher-only],.answer-key,.teacher-only,[data-answer-key]').forEach((n) => n.remove());
    expect(tDoc.querySelector('[data-answer-key]')).toBeNull();
    expect(tDoc.querySelector('.ws-key')).toBeNull();
    expect(tDoc.querySelector('.alloflow-word-sounds-ws [data-activity="mapping"]')).not.toBeNull();
  });

  it('falls back cleanly when WordPractice is not loaded and supports word_sounds alias with item.content', () => {
    const savedWp = window.AlloModules && window.AlloModules.WordPractice;
    if (window.AlloModules) delete window.AlloModules.WordPractice;
    try {
      const pipeline = createPipeline();
      const aliasItem = {
        id: 'ws-fallback-1',
        type: 'word_sounds',
        title: 'Fallback Word List',
        content: 'cat, sun, frog',
      };

      const studentHtml = pipeline.generateResourceHTML(aliasItem, false, {}, {});
      expect(studentHtml).toContain('alloflow-word-sounds-ws');
      expect(studentHtml).toContain('data-sound-boxes=');
      expect(studentHtml).not.toContain('data-answer-key');
      expect(studentHtml).not.toContain('Teacher Answer Key');

      const teacherHtml = pipeline.generateResourceHTML(aliasItem, true, {}, {});
      expect(teacherHtml).toContain('class="answer-key teacher-only"');
      expect(teacherHtml).toContain('data-answer-key="true"');
      expect(teacherHtml).toContain('cat');
      expect(teacherHtml).toContain('frog');
    } finally {
      if (window.AlloModules && savedWp) window.AlloModules.WordPractice = savedWp;
    }
  });
});

describe('2. Word Sounds worksheet differentiation presets (Scaffolded & Independent)', () => {
  it('toggles pictures, hints, and syllable markers live via 1-click presets and reflects them in HTML download', async () => {
    const dom = new JSDOM('<!doctype html><html><body><main><button type="button" id="print-worksheet" hidden>Print activity worksheet</button></main></body></html>', { pretendToBeVisual: true });
    openedWindows.push(dom.window);
    const w = dom.window;
    const d = w.document;
    const blobs = [];
    const names = [];
    w.print = () => {};
    w.scrollTo = () => {};
    w.URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:ws-preset-' + blobs.length; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { names.push(this.download); };

    const mockSyl = { lookup: (word) => (word === 'rabbit' ? { parts: ['rab', 'bit'] } : null) };
    const api = cards.create(d, w);
    const btn = d.getElementById('print-worksheet');
    api.wireWorksheet(btn, () => ({
      title: 'Differentiated Phonics',
      words: ['rabbit', 'cat'],
      activities: ['mapping', 'counting', 'spelling_bee'],
      pictures: false,
      syllables: false,
      symbols: SYMBOLS,
      matcher,
      syllablesTable: mockSyl,
    }));

    btn.click();
    await new Promise((r) => setTimeout(r, 20));

    const scaffBtn = d.querySelector('#print-worksheet-view [data-ws-preset="scaffolded"]');
    const indepBtn = d.querySelector('#print-worksheet-view [data-ws-preset="independent"]');
    expect(scaffBtn).not.toBeNull();
    expect(indepBtn).not.toBeNull();

    // Click Scaffolded -> pictures ON, hints ON, syllables ON
    scaffBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(scaffBtn.getAttribute('aria-pressed')).toBe('true');
    expect(indepBtn.getAttribute('aria-pressed')).toBe('false');
    expect(d.getElementById('pc-ws-pictures').checked).toBe(true);
    expect(d.getElementById('pc-ws-hints').checked).toBe(true);
    expect(d.getElementById('pc-ws-syllables').checked).toBe(true);
    expect(d.querySelectorAll('#print-worksheet-view img.pc-ws-pic').length).toBeGreaterThan(0);
    expect(d.querySelector('#print-worksheet-view section[data-activity="mapping"] .pc-ws-bank')).not.toBeNull();
    expect(d.querySelector('#print-worksheet-view section[data-activity="counting"] .pc-ws-word').textContent).toBe('rab·bit');

    // Download HTML reflects Scaffolded options
    const dlBtn = [...d.querySelectorAll('#print-worksheet-view .pc-actions button')].find((b) => b.textContent === 'Download HTML worksheet');
    dlBtn.click();
    const scaffHtml = await blobs[blobs.length - 1].text();
    expect(scaffHtml).toContain("script-src 'none'");
    expect(scaffHtml).toContain('ws-bank');
    expect(scaffHtml).toContain('ws-pic');
    expect(scaffHtml).toContain('rab<span class="pc-dot" aria-hidden="true">·</span>bit');

    // Click Independent -> hints OFF, syllables OFF, preserves workspace + Teacher Answer Key
    indepBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(indepBtn.getAttribute('aria-pressed')).toBe('true');
    expect(scaffBtn.getAttribute('aria-pressed')).toBe('false');
    expect(d.getElementById('pc-ws-hints').checked).toBe(false);
    expect(d.getElementById('pc-ws-syllables').checked).toBe(false);
    expect(d.querySelector('#print-worksheet-view section[data-activity="mapping"] .pc-ws-bank')).toBeNull();
    expect(d.querySelector('#print-worksheet-view section[data-activity="spelling_bee"] .pc-ws-box')).toBeNull();
    expect(d.querySelector('#print-worksheet-view section[data-activity="counting"] .pc-ws-word').textContent).toBe('rabbit');
    expect(d.querySelectorAll('#print-worksheet-view section.pc-ws-section')).toHaveLength(3);
    expect(d.querySelector('#print-worksheet-view .pc-ws-key-banner').textContent).toBe('For the teacher — keep apart from the student copy');

    // Download HTML reflects Independent options
    dlBtn.click();
    const indepHtml = await blobs[blobs.length - 1].text();
    const indepDomDoc = new JSDOM(indepHtml).window.document;
    expect(indepHtml).toContain("script-src 'none'");
    expect(indepHtml).not.toContain('Letter bank:');
    expect(indepDomDoc.querySelector('.pc-dot')).toBeNull();
    expect(indepDomDoc.querySelector('.ws-bank')).toBeNull();
    expect(indepDomDoc.querySelector('.ws-key')).not.toBeNull();
    expect(indepHtml).toContain('For the teacher — keep apart from the student copy');
    expect(names[names.length - 1]).toMatch(/-activity-worksheet\.html$/);
  });
});

describe('3. Packets Vocabulary Practice Worksheets (buildVocabWorksheetHtml + packets-vocab.html)', () => {
  it('generates monochrome standalone HTML with Part 1 matching, Part 2 cloze + fallback, Part 3 pictures, and separate Teacher Answer Key', () => {
    const entries = [
      { word: 'habitat', meaning: 'The natural home of a plant or animal', example: 'A pond is a frog habitat.', picture: SVG_SAMPLE },
      { word: 'predator', meaning: 'An animal that hunts other animals for food', example: 'The hawk is a fast predator.', picture: PNG_1X1 },
      { word: 'camouflage', meaning: 'Colors or patterns that help an animal hide', example: '' },
      { word: 'prey', meaning: 'An animal that is hunted for food', example: 'A mouse is prey for an owl.' },
    ];

    const html = cards.buildVocabWorksheetHtml({ title: 'Ecosystems Vocabulary', entries }, { preset: 'scaffolded', symbols: null, matcher: null });
    const doc = new JSDOM(html).window.document;

    // Strict CSP, zero scripts, zero handlers, monochrome colors only
    const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'none'");
    expect(doc.querySelectorAll('script')).toHaveLength(0);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).toContain('.ws-key{break-before:page;page-break-before:always');

    // Header + Word Bank
    expect(doc.querySelector('.ws-title').textContent).toBe('Ecosystems Vocabulary');
    expect(doc.querySelector('.ws-meta').textContent).toContain('Name:');
    expect(doc.querySelector('.ws-meta').textContent).toContain('Date:');
    expect(doc.querySelector('[data-vocab-word-bank="true"]')).not.toBeNull();

    // Part 1 — Match the Word to Its Meaning
    const p1 = doc.querySelector('section[data-vocab-part="matching"]');
    expect(p1).not.toBeNull();
    expect(p1.querySelectorAll('.vocab-match-word')).toHaveLength(4);
    expect([...p1.querySelectorAll('.vocab-match-letter')].map((n) => n.textContent)).toEqual(['A.', 'B.', 'C.', 'D.']);
    const origOrder = entries.map((e) => e.meaning);
    const shownOrder = [...p1.querySelectorAll('.vocab-match-def span:last-child')].map((n) => n.textContent);
    expect(shownOrder).not.toEqual(origOrder);

    // Part 2 — Fill in the Blank (3 cloze blanks + 1 graceful sentence-writing fallback for camouflage)
    const p2 = doc.querySelector('section[data-vocab-part="cloze"]');
    expect(p2).not.toBeNull();
    expect(p2.querySelectorAll('.vocab-cloze-blank')).toHaveLength(3);
    expect(p2.textContent).toContain('Write your own sentence using the word "camouflage"');

    // Part 3 — Name the Picture (2 entries with pictures)
    const p3 = doc.querySelector('section[data-vocab-part="pictures"]');
    expect(p3).not.toBeNull();
    expect(p3.querySelectorAll('.vocab-pic-tile')).toHaveLength(2);
    expect(p3.querySelectorAll('.vocab-pic-line')).toHaveLength(2);
    expect([...p3.querySelectorAll('.vocab-pic-img')].map((img) => img.alt)).toEqual(['Picture 1', 'Picture 2']);

    // Separate Teacher Answer Key page mapping all 3 parts
    const key = doc.querySelector('.ws-key');
    expect(key).not.toBeNull();
    expect(key.querySelector('.ws-key-banner').textContent).toBe('For the teacher — keep apart from the student copy');
    expect(key.textContent).toContain('Part 1 — Match the Word to Its Meaning');
    expect(key.textContent).toContain('Part 2 — Fill in the Blank');
    expect(key.textContent).toContain('Part 3 — Name the Picture');

    // Independent preset hides Word Bank while preserving workspace & Teacher Answer Key
    const indepHtml = cards.buildVocabWorksheetHtml({ title: 'Ecosystems Vocabulary', entries }, { preset: 'independent' });
    const indepDoc = new JSDOM(indepHtml).window.document;
    expect(indepDoc.querySelector('[data-vocab-word-bank="true"]')).toBeNull();
    expect(indepDoc.querySelector('section[data-vocab-part="matching"]')).not.toBeNull();
    expect(indepDoc.querySelector('.ws-key')).not.toBeNull();
  });

  it('wires #print-worksheet in packets-vocab.html after #print-cards and renders all 3 parts + Teacher Answer Key live', async () => {
    const html = read('packets-vocab.html');
    const dom = new JSDOM(html, {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-vocab.html',
    });
    const w = dom.window;
    const d = w.document;
    openedWindows.push(w);

    const printCardsBtn = d.getElementById('print-cards');
    const printWsBtn = d.getElementById('print-worksheet');
    expect(printWsBtn).not.toBeNull();
    expect(printWsBtn.closest('#paper .paper-row')).not.toBeNull();
    expect(printCardsBtn.nextElementSibling).toBe(printWsBtn);
    expect(printWsBtn.hidden).toBe(true);
    expect(printWsBtn.textContent.trim()).toBe('Print vocabulary worksheet');

    const downloads = [];
    const downloadNames = [];
    let printCalls = 0;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.print = () => { printCalls += 1; };
    w.scrollTo = () => {};
    w.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:vocab-ws-' + downloads.length; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { downloadNames.push(this.getAttribute('download') || this.download); };

    const scripts = [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    for (const src of scripts) {
      if (src === 'packets_vocab_bank_en.js') {
        w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
      } else {
        w.eval(read(src));
      }
    }
    await new Promise((r) => setTimeout(r, 20));

    // Exported on both window.AlloPacketPrintCards and window.AlloPacketsPrintCards
    expect(typeof w.AlloPacketsPrintCards.buildVocabWorksheetHtml).toBe('function');
    expect(typeof w.AlloPacketsPrintCards.openVocabWorksheet).toBe('function');
    expect(typeof w.AlloPacketsPrintCards.wireVocabWorksheet).toBe('function');

    // Shown alongside #print-cards once wired
    expect(printCardsBtn.hidden).toBe(false);
    expect(printWsBtn.hidden).toBe(false);

    // Populate vocab deck including a custom picture via AlloWordPictureMatcher / diagrams toggle
    const wordsBox = d.getElementById('f-words');
    wordsBox.value = 'habitat\npredator\nprey\ncell\nbat';
    wordsBox.dispatchEvent(new w.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    d.getElementById('next-1').click();
    await new Promise((r) => setTimeout(r, 20));
    d.getElementById('next-2').click();
    await new Promise((r) => setTimeout(r, 60));

    // Enable school concept diagrams so Part 3 has built-in SVG pictures offline
    const diagBox = d.getElementById('f-diagrams');
    diagBox.checked = true;
    diagBox.dispatchEvent(new w.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));

    // Open vocabulary worksheet preview
    printWsBtn.focus();
    printWsBtn.click();
    await new Promise((r) => setTimeout(r, 30));

    const view = d.getElementById('print-vocab-worksheet-view');
    expect(view).not.toBeNull();
    expect(view.hidden).toBe(false);
    expect(d.body.classList.contains('pc-on')).toBe(true);
    expect(view.querySelector('section[data-vocab-part="matching"]')).not.toBeNull();
    expect(view.querySelectorAll('section[data-vocab-part="matching"] .pc-vocab-match-word')).toHaveLength(5);
    expect(view.querySelector('section[data-vocab-part="cloze"]')).not.toBeNull();
    expect(view.querySelector('section[data-vocab-part="pictures"]')).not.toBeNull();
    expect(view.querySelectorAll('section[data-vocab-part="pictures"] .pc-vocab-pic-tile').length).toBeGreaterThan(0);
    expect(view.querySelector('.pc-ws-key-banner').textContent).toBe('For the teacher — keep apart from the student copy');

    // Toggle Independent preset & Word Bank checkbox
    const indepBtn = view.querySelector('[data-ws-preset="independent"]');
    const scaffBtn = view.querySelector('[data-ws-preset="scaffolded"]');
    indepBtn.click();
    expect(indepBtn.getAttribute('aria-pressed')).toBe('true');
    expect(view.querySelector('[data-vocab-word-bank="true"]')).toBeNull();
    expect(d.getElementById('pc-vocab-word-bank').checked).toBe(false);

    scaffBtn.click();
    expect(scaffBtn.getAttribute('aria-pressed')).toBe('true');
    expect(view.querySelector('[data-vocab-word-bank="true"]')).not.toBeNull();
    expect(d.getElementById('pc-vocab-word-bank').checked).toBe(true);

    // Print + Download HTML worksheet
    const btns = [...view.querySelectorAll('.pc-actions button')];
    btns.find((b) => b.textContent === 'Print').click();
    expect(printCalls).toBe(1);

    const beforeDl = downloads.length;
    btns.find((b) => b.textContent === 'Download HTML worksheet').click();
    expect(downloads.length).toBe(beforeDl + 1);
    expect(downloadNames[downloadNames.length - 1]).toMatch(/-vocabulary-worksheet\.html$/);
    const dlHtml = await downloads[downloads.length - 1].text();
    expect(dlHtml).toContain("script-src 'none'");
    expect(dlHtml).toContain('Part 1 — Match the Word to Its Meaning');
    expect(dlHtml).toContain('Part 2 — Fill in the Blank');
    expect(dlHtml).toContain('Part 3 — Name the Picture');
    expect(dlHtml).toContain('For the teacher — keep apart from the student copy');

    // Escape closes and restores focus to #print-worksheet
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(view.hidden).toBe(true);
    expect(d.body.classList.contains('pc-on')).toBe(false);
    expect(d.activeElement).toBe(printWsBtn);
  });
});
