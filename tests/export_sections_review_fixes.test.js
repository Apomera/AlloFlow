// Fixes from the 2026-11-11 review of the quiz, DBQ and note sections of the pack export.
//   1. Printing the interactive copy showed only a textarea's visible rows (typed answers cut
//      off) and printed the quiz's Check/Reset buttons.
//   2. "Reset responses" erased every written answer with no warning.
//   3. The DBQ thesis starter never reached the export.
//   5. Every textarea stopped at 1,500 characters, including the DBQ synthesis essay.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { loadAlloModule } from './setup.js';

let pipeline;
const pack = JSON.parse(readFileSync('allopacks/current/source_media_literacy_grade7_8.allopack.json', 'utf8')).history;
// A self-checkable quiz (Check/Reset) with written answers; the SML quiz is short-answer only.
const quiz = JSON.parse(readFileSync('allopacks/current/american_revolution_causes_grade5.allopack.json', 'utf8')).history.find((item) => item.type === 'quiz');
const dbq = pack.find((item) => item.type === 'dbq' && item.data && item.data.thesisStarter);

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('export_runtime_copy_module.js');
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
    t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: (type) => type, state: {},
  });
}, 60000);

const open = async (items) => {
  const dom = new JSDOM(pipeline.generateFullPackHTML(items, 'Review', false, {}, { annotations: [] }), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/review.html', virtualConsole: new VirtualConsole() });
  const win = dom.window, doc = win.document;
  await new Promise((done) => (doc.readyState === 'complete' ? done() : win.addEventListener('load', done, { once: true })));
  await new Promise((done) => win.setTimeout(done, 100));
  const once = [...doc.querySelectorAll('.alloflow-export-prompt-overlay button')].find((button) => /once/i.test(button.textContent));
  if (once) { once.click(); await new Promise((done) => win.setTimeout(done, 150)); }
  return { win, doc };
};
const type = (win, field, text) => { field.value = text; field.dispatchEvent(new win.Event('input', { bubbles: true })); field.dispatchEvent(new win.Event('change', { bubbles: true })); };

describe('pack export fixes from the sections review', () => {
  it('fixture packs contain what the fixes need', () => {
    expect(quiz).toBeTruthy();
    expect(dbq).toBeTruthy();
  });

  it('prints every line of a typed answer and hides the quiz buttons on paper', async () => {
    const { win, doc } = await open([quiz]);
    const field = doc.querySelector('.quiz-box textarea');
    const long = Array.from({ length: 12 }, (_, i) => 'Line ' + (i + 1) + ' of my answer').join('\n');
    type(win, field, long);
    win.dispatchEvent(new win.Event('beforeprint'));
    const copy = field.nextElementSibling;
    expect(copy.className).toBe('alloflow-print-answer');
    expect(copy.textContent).toBe(long);
    expect(field.classList.contains('alloflow-print-mirrored')).toBe(true);
    win.dispatchEvent(new win.Event('afterprint'));
    expect(doc.querySelectorAll('.alloflow-print-answer')).toHaveLength(0);
    expect(field.classList.contains('alloflow-print-mirrored')).toBe(false);
    const css = [...doc.querySelectorAll('style')].map((node) => node.textContent).join('\n');
    expect(css).toMatch(/\.quiz-check-btn, \.quiz-reset-btn \{ display: none !important; \}/);
    expect(css).toMatch(/textarea\.alloflow-print-mirrored \{ display: none !important; \}/);
    win.close();
  });

  it('asks before Reset erases written answers, and clears on the second press', async () => {
    const { win, doc } = await open([quiz]);
    const box = doc.querySelector('.quiz-box');
    const field = box.querySelector('textarea');
    type(win, field, 'My careful answer');
    const reset = box.querySelector('.quiz-reset-btn');
    const results = box.querySelector('.quiz-results');
    reset.click();
    expect(field.value).toBe('My careful answer');
    expect(results.textContent).toMatch(/clears all your answers/);
    expect(results.textContent).not.toContain('{button}');
    reset.click();
    expect(field.value).toBe('');
    win.close();
  });

  it('shows the DBQ thesis starter on screen and on paper', () => {
    for (const worksheet of [false, true]) {
      const doc = new JSDOM(pipeline.generateFullPackHTML([dbq], 'Review', worksheet, {}, { annotations: [] })).window.document;
      const starter = doc.querySelector('.alloflow-dbq-thesis-starter');
      expect(starter, worksheet ? 'worksheet' : 'screen').not.toBeNull();
      expect(starter.textContent).toContain(dbq.data.thesisStarter.trim().slice(0, 30));
    }
  });

  it('sizes paper answer space to the question instead of a fixed 3 lines', () => {
    const shortQ = (question, extra = {}) => ({ id: 'q', type: 'quiz', title: 'Q', data: { questions: [{ type: 'short-answer', question, ...extra }] } });
    const lines = (item) => new JSDOM(pipeline.generateFullPackHTML([item], 'Review', true, {}, { annotations: [] })).window.document.querySelectorAll('.question[data-item-type="short-answer"] .alloflow-ruled-line').length;
    const plain = lines(shortQ('Name the organ.'));
    const multi = lines(shortQ('What changed? Why did it change? What would you check next?'));
    const criteria = lines(shortQ('Name the organ.', { studentCriteria: ['Names it', 'Says where it is'] }));
    expect(plain).toBe(3);
    expect(multi).toBeGreaterThan(plain + 3);
    expect(criteria).toBeGreaterThan(plain);
    expect(lines(shortQ('Why? '.repeat(30)))).toBeLessThanOrEqual(10);
  });

  it('keeps DBQ print headings with their questions and rubric text at 12px or more', () => {
    const html = pipeline.generateFullPackHTML([dbq], 'Review', true, {}, { annotations: [] });
    const doc = new JSDOM(html).window.document;
    const heading = [...doc.querySelectorAll('strong')].find((node) => /Sourcing Questions/.test(node.textContent));
    expect(heading.getAttribute('style')).toMatch(/display:block;break-after:avoid/);
    const table = doc.querySelector('.alloflow-dbq-rubric-wrap table');
    if (table) expect(table.getAttribute('style')).toContain('font-size:max(12px, 0.85em)');
    expect(html).toContain('.alloflow-section-terminator { display: none !important; }');
  });

  it('keeps subtitles (teacher design notes) off the student copy only', () => {
    // 2026-11-11, option A: subtitles carry hints such as "the soil card is the trap".
    const item = { id: 'r', type: 'simplified', title: 'The claim', meta: '3 buckets • 9 cards • the soil card is the trap · Educator review draft', data: 'Text.' };
    const student = new JSDOM(pipeline.generateResourceHTML(item, false, {}, { annotations: [] })).window.document.querySelector('h2').textContent;
    expect(student).toContain('The claim');
    expect(student).not.toMatch(/soil card|Educator|buckets/);
    const teacherHtml = pipeline.generateFullPackHTML([item], 'Review', false, {}, { annotations: [], audience: 'teacher' });
    expect(teacherHtml).toContain('Educator review draft');
  });

  it('does not repeat the template name already in a notes title', () => {
    const heading = (title) => new JSDOM(pipeline.generateResourceHTML({ id: 'n', type: 'note-taking', title, data: { templateType: 'cornell-notes' } }, false, {}, { annotations: [] })).window.document.querySelector('h2').textContent.replace(/\s+/g, ' ').trim();
    expect(heading('Body Systems Cornell Notes')).not.toMatch(/\(.*Cornell.*\)/);
    expect(heading('Body Systems')).toMatch(/\(.+\)$/);
  });

  it('uses the double-entry title as column headings and keeps every planned row', () => {
    const journal = { id: 'de', type: 'note-taking', title: 'Journal', data: { templateType: 'double-entry', title: 'Card detail → What it supports, its limit, my next check', entries: [1, 2, 3, 4].map((n) => ({ id: 'e' + n, quote: '', response: '' })) } };
    for (const worksheet of [false, true]) {
      const doc = new JSDOM(pipeline.generateFullPackHTML([journal], 'Review', worksheet, {}, { annotations: [] })).window.document;
      const table = [...doc.querySelectorAll('#de table')].pop();
      expect([...table.querySelectorAll('thead th')].map((th) => th.textContent.trim())).toEqual(['Card detail', 'What it supports, its limit, my next check']);
      expect(table.querySelectorAll('tbody tr').length, worksheet ? 'worksheet' : 'screen').toBe(4);
    }
  });

  it('gives Cornell notes 32px lines, more of them beside long guidance, and stacks them on phones', () => {
    const cornell = (guidance) => ({ id: 'c', type: 'note-taking', title: 'Notes', data: { templateType: 'cornell-notes', cues: [{ text: 'Cue', guidance }], notes: [] } });
    const space = (guidance) => {
      const html = pipeline.generateFullPackHTML([cornell(guidance)], 'Review', true, {}, { annotations: [] });
      const cell = new JSDOM(html).window.document.querySelector('[data-cornell-writing-space="notes"]');
      return { html, lines: cell.children.length, line: cell.children[0].getAttribute('style') };
    };
    const short = space('Look for one cause.');
    const long = space('Write the move you tried, the reply you got, and what you would change next time. '.repeat(5));
    expect(short.lines).toBe(4);
    expect(short.line).toContain('height:32px');
    expect(long.lines).toBeGreaterThan(short.lines);
    expect(long.lines).toBeLessThanOrEqual(10);
    expect(short.html).toContain('@media screen and (max-width:600px){.alloflow-cornell-table');
  });

  it('loads glossary pictures eagerly on paper copies', () => {
    const glossary = { id: 'g', type: 'glossary', title: 'Words', data: [{ term: 'delta', def: 'river mouth', image: 'data:image/png;base64,iVBORw0KGgo=' }] };
    const paper = pipeline.generateFullPackHTML([glossary], 'Review', true, {}, { annotations: [] });
    const screen = pipeline.generateFullPackHTML([glossary], 'Review', false, {}, { annotations: [] });
    expect(paper).toContain('src="data:image/png;base64,iVBORw0KGgo="');
    expect(paper).not.toMatch(/<img loading="lazy" src="data:image\/png/);
    expect(screen).toMatch(/<img loading="lazy" src="data:image\/png/);
  });

  it('gives every empty KWL column its prompt and writing space on the student copy', () => {
    const kwl = { id: 'k', type: 'outline', title: 'Volcanoes', data: { structureType: 'KWL Chart', main: 'Volcanoes', branches: [{ title: 'Know', items: ['Hot rock'] }, { title: 'Want to know', items: [] }, { title: 'Learned', items: [] }] } };
    const screen = new JSDOM(pipeline.generateFullPackHTML([kwl], 'Review', false, {}, { annotations: [] })).window.document.getElementById('k');
    const boxes = [...screen.querySelectorAll('textarea[data-allo-response-key]')];
    expect(boxes.map((box) => box.getAttribute('data-allo-response-key'))).toEqual(['k:kwl:1', 'k:kwl:2']);
    expect(boxes.map((box) => box.getAttribute('aria-label'))).toEqual(['What do you want to know?', 'What did you learn?']);
    expect(screen.textContent).toContain('Hot rock');
    const paper = new JSDOM(pipeline.generateFullPackHTML([kwl], 'Review', true, {}, { annotations: [] })).window.document.getElementById('k');
    expect(paper.querySelectorAll('textarea')).toHaveLength(0);
    expect(paper.querySelectorAll('div[aria-hidden="true"][style*="repeating-linear-gradient"]')).toHaveLength(2);
    const teacher = pipeline.generateResourceHTML(kwl, true, {}, { annotations: [] });
    expect(teacher).not.toContain('k:kwl:');
  });

  it('labels a fictional DBQ case "Context" and keeps "Historical Context" for history', () => {
    const label = (extra) => {
      const item = { ...dbq, ...extra, data: { ...dbq.data, historicalContext: 'Set-up text.', ...(extra.data || {}) } };
      const doc = new JSDOM(pipeline.generateResourceHTML(item, false, {}, { annotations: [] })).window.document;
      const strong = [...doc.querySelectorAll('strong')].find((node) => node.parentElement && node.parentElement.textContent.includes('Set-up text.'));
      return strong && strong.textContent;
    };
    expect(label({ meta: 'Grades 7–8 · Original fictional teaching case' })).toBe('Context:');
    expect(label({ meta: 'Grade 8 · The road to 1776', data: { isFictional: false } })).toBe('Historical Context:');
    expect(label({ meta: 'Grade 8', data: { contextLabel: 'The situation' } })).toBe('The situation:');
  });

  it('prints FAQ answers from the interactive copy and closes them again afterwards', async () => {
    const faq = { id: 'f', type: 'faq', title: 'Questions', data: [{ question: 'Why?', answer: 'Because of the sun.' }, { question: 'How?', answer: 'Slowly.' }] };
    const { win, doc } = await open([faq]);
    const items = [...doc.querySelectorAll('details.alloflow-faq-item')];
    items[1].open = true;
    win.dispatchEvent(new win.Event('beforeprint'));
    expect(items.every((item) => item.open)).toBe(true);
    win.dispatchEvent(new win.Event('afterprint'));
    expect(items.map((item) => item.open)).toEqual([false, true]);
    win.close();
  });

  it('loads every picture up front on a worksheet copy', () => {
    const visual = { id: 'v', type: 'image', title: 'Picture', data: { imageUrl: 'data:image/png;base64,iVBORw0KGgo=', altText: 'A leaf' } };
    const glossary = { id: 'g', type: 'glossary', title: 'Words', data: [{ term: 'leaf', def: 'part of a plant', image: 'data:image/png;base64,iVBORw0KGgo=' }] };
    const paper = pipeline.generateFullPackHTML([visual, glossary], 'Review', true, {}, { annotations: [] });
    expect(paper).toContain('base64,iVBORw0KGgo=');
    expect(paper).not.toMatch(/<img[^>]*loading="lazy"/);
  });

  it('does not claim "Saved" inside a frame, where a download can be blocked silently', async () => {
    const html = pipeline.generateFullPackHTML([quiz], 'Review', false, {}, { annotations: [] });
    const host = new JSDOM('<!DOCTYPE html><body><iframe id="lms"></iframe></body>', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://lms.example/course/', virtualConsole: new VirtualConsole() });
    const frame = host.window.document.getElementById('lms');
    const fwin = frame.contentWindow;
    fwin.URL.createObjectURL = () => 'blob:answers';
    fwin.URL.revokeObjectURL = () => {};
    fwin.HTMLAnchorElement.prototype.click = function () {};
    const doc = frame.contentDocument;
    doc.open(); doc.write(html); doc.close();
    await new Promise((done) => (doc.readyState === 'complete' ? done() : fwin.addEventListener('load', done, { once: true })));
    await new Promise((done) => host.window.setTimeout(done, 150));
    const once = [...doc.querySelectorAll('.alloflow-export-prompt-overlay button')].find((button) => /once/i.test(button.textContent));
    if (once) { once.click(); await new Promise((done) => host.window.setTimeout(done, 100)); }
    doc.getElementById('alloflow-savejson-btn').click();
    await new Promise((done) => host.window.setTimeout(done, 100));
    const input = doc.querySelector('.alloflow-export-prompt-overlay input');
    input.value = 'Sam';
    input.closest('form').dispatchEvent(new fwin.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((done) => host.window.setTimeout(done, 150));
    const button = doc.getElementById('alloflow-savejson-btn');
    expect(button.textContent).toMatch(/Download requested/);
    expect(button.textContent).not.toMatch(/Saved!/);
    const help = doc.getElementById('alloflow-download-help');
    expect(help.textContent).toMatch(/blocks downloads/);
    // The "open in its own tab" link needs a real address; this test frame is about:blank.
    expect(help.querySelector('a')).toBeNull();
    host.window.close();
  });

  it('does not offer autosave when the browser refuses storage, and says how to keep the work', async () => {
    const html = pipeline.generateFullPackHTML([quiz], 'Review', false, {}, { annotations: [] });
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/private.html', virtualConsole: new VirtualConsole(),
      beforeParse(win) { const proto = Object.getPrototypeOf(win.localStorage); proto.setItem = () => { throw new Error('QuotaExceededError'); }; } });
    const win = dom.window, doc = win.document;
    await new Promise((done) => (doc.readyState === 'complete' ? done() : win.addEventListener('load', done, { once: true })));
    await new Promise((done) => win.setTimeout(done, 150));
    expect(doc.querySelector('.alloflow-export-prompt-overlay')).toBeNull();
    expect(doc.querySelector('.alloflow-storage-note').textContent).toMatch(/will not keep your work/);
    expect(win.__alloflowLearnerWorkspace.persist).toBe(false);
    win.close();
  });

  it('gives each math problem a work box and an answer field on screen', () => {
    const math = { id: 'm', type: 'math', title: 'Fractions', data: { problems: [{ question: 'What is 1/2 + 1/4?', answer: '3/4', steps: [] }] } };
    const doc = new JSDOM(pipeline.generateFullPackHTML([math], 'Review', false, {}, { annotations: [] })).window.document;
    const work = doc.querySelector('textarea[data-allo-response-key="m:math:0:work"]');
    const answer = doc.querySelector('input[data-allo-response-key="m:math:0:answer"]');
    expect(work).not.toBeNull();
    expect(answer).not.toBeNull();
    expect(doc.querySelector('label[for="' + work.id + '"]').textContent.trim()).toBe('Show your work');
    const paper = new JSDOM(pipeline.generateFullPackHTML([math], 'Review', true, {}, { annotations: [] })).window.document;
    expect(paper.body.textContent).not.toContain('work :');
  });

  it('lists only goals a student can meet from the file, and folds the accessibility statement', () => {
    const directions = { id: 'd', type: 'directions', title: 'Start here', data: { body: 'Read.', objectives: [
      { id: 'a', kind: 'manual', label: 'Read the passage' }, { id: 'b', kind: 'game', label: 'Win the Word Scramble' }, { id: 'c', kind: 'xp', label: 'Earn 40 XP today' }] } };
    const student = new JSDOM(pipeline.generateFullPackHTML([directions], 'Review', false, {}, { annotations: [] })).window.document;
    expect(student.getElementById('d').textContent).toContain('Read the passage');
    expect(student.getElementById('d').textContent).not.toMatch(/Word Scramble|40 XP/);
    const teacher = pipeline.generateFullPackHTML([directions], 'Review', false, {}, { annotations: [], audience: 'teacher' });
    expect(teacher).toContain('Win the Word Scramble');
    const badge = student.querySelector('.a11y-badge');
    expect(badge.querySelector('details')).not.toBeNull();
    expect(badge.querySelector('details').open).toBe(false);
    expect(badge.querySelector('summary strong')).not.toBeNull();
  });

  it('describes character counts instead of announcing every keystroke', async () => {
    const notes = { id: 'n', type: 'note-taking', title: 'Notes', data: { templateType: 'cornell-notes', cues: [], notes: [] } };
    const { doc } = await open([notes]);
    const counters = [...doc.querySelectorAll('.allo-ta-counter')];
    expect(counters.length).toBeGreaterThan(0);
    expect(counters.every((counter) => !counter.hasAttribute('aria-live'))).toBe(true);
    const field = counters[0].previousElementSibling;
    expect((field.getAttribute('aria-describedby') || '').split(/\s+/)).toContain(counters[0].id);
  });

  it('keeps keyboard focus in the concept sort after placing a card', async () => {
    const sort = { id: 'cs', type: 'concept-sort', title: 'Sort', data: { categories: [{ id: 'a', label: 'Plants' }, { id: 'b', label: 'Animals' }], items: [{ content: 'Fern', categoryId: 'a' }, { content: 'Fox', categoryId: 'b' }] } };
    const { win, doc } = await open([sort]);
    const [first, second] = doc.querySelectorAll('.alloflow-cs-strip');
    first.click();
    doc.querySelector('.alloflow-cs-place-btn[data-place-for="a"]').click();
    expect(doc.activeElement).toBe(second);
    second.click();
    doc.querySelector('.alloflow-cs-place-btn[data-place-for="b"]').click();
    expect(doc.activeElement).toBe(second);
    win.close();
  });

  it('shows a reading title once, numbers printed pages and prints concept maps without drawn lines', () => {
    const reading = { id: 'r', type: 'simplified', title: 'The Sugar Factory in Every Leaf', data: '## The Sugar Factory in Every Leaf\n\nLeaves make sugar.' };
    const html = pipeline.generateFullPackHTML([reading], 'Review', true, {}, { annotations: [] });
    const section = new JSDOM(html).window.document.getElementById('r');
    expect([...section.querySelectorAll('h1,h2,h3')].filter((h) => /Sugar Factory/.test(h.textContent))).toHaveLength(1);
    expect(section.textContent).toContain('Leaves make sugar.');
    expect(html).toMatch(/@bottom-right \{ content: counter\(page\) " \/ " counter\(pages\)/);
    expect(html).toContain('.allo-hub-lines { display: none !important; }');
  });

  it('lets the DBQ essay hold a real essay while short answers keep their limit', async () => {
    const { doc } = await open([dbq, quiz]);
    const essay = doc.querySelector('.alloflow-dbq-synthesis textarea');
    expect(Number(essay.getAttribute('maxlength'))).toBe(12000);
    const short = doc.querySelector('.quiz-box textarea');
    expect(Number(short.getAttribute('maxlength'))).toBe(1500);
  });
});
