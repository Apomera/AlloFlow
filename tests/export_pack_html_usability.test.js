import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import { loadAlloModule } from './setup.js';

// Resource pack HTML export, 2026-11-09 pass: fill-in self-check, typable note
// templates, theme re-inking, and the layout hooks for the tools bar and Venn.
// Booleans are asserted (not toContain) so a failure never diffs the whole page.

let pipeline;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  const stub = async () => '{}';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: stub,
    callGeminiVision: stub,
    callImagen: async () => null,
    addToast: () => {},
    t: (key) => key,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });
});

async function runtime(html) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    const message = String(error?.stack || error?.message || error || '');
    if (/SyntaxError|Uncaught/i.test(message)) errors.push(message);
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://example.test/pack.html?nickname=TestLearner',
    virtualConsole,
  });
  await new Promise((resolve) => {
    if (dom.window.document.readyState === 'complete') dom.window.setTimeout(resolve, 0);
    else dom.window.addEventListener('DOMContentLoaded', () => dom.window.setTimeout(resolve, 0), { once: true });
  });
  return { dom, errors };
}

const quiz = (extra = {}) => ({
  type: 'quiz', id: 'quiz-fill', title: 'Check',
  data: {
    questions: [
      { type: 'mcq', question: 'Pick one', options: ['Red', 'Blue'], correctAnswer: 'Blue' },
      { type: 'fill-blank', question: 'Plants lose water by ____.', expectedFill: 'Transpiration', acceptableAlternatives: ['trans-piration'] },
    ],
    ...extra,
  },
});

const cornell = (data = {}) => ({
  id: 'nt-blank', type: 'note-taking', title: 'Cornell notes',
  data: { templateType: 'cornell-notes', cues: [{ text: 'What is erosion?' }], notes: [{ text: '' }], summary: '', ...data },
});

const pack = (items, worksheet = false, config = {}) =>
  pipeline.generateFullPackHTML(items, 'Usability check', worksheet, {}, { annotations: [], ...config });

describe('fill-in-the-blank self-check', () => {
  it('marks a typed answer right or wrong, ignoring case and outer punctuation', async () => {
    const { dom, errors } = await runtime(pack([quiz()]));
    const doc = dom.window.document;
    const question = doc.querySelector('.question[data-item-type="fill-blank"]');
    expect(question.hasAttribute('data-fill-answers')).toBe(true);
    const blank = question.querySelector('.interactive-blank');
    const feedback = question.querySelector('.alloflow-quiz-feedback');
    const check = doc.querySelector('.quiz-check-btn');
    expect(check.textContent.includes('Check my answers')).toBe(true);

    blank.value = '  transpiration. ';
    check.click();
    expect(feedback.hidden).toBe(false);
    expect(feedback.textContent).toBe('Correct');

    blank.value = 'respiration';
    check.click();
    expect(feedback.textContent).toBe('Review needed');
    expect(question.getAttribute('aria-invalid')).toBe('true');

    blank.value = 'Trans-Piration';
    check.click();
    expect(feedback.textContent).toBe('Correct');

    blank.value = '';
    check.click();
    expect(feedback.textContent).toBe('Unanswered');
    expect(doc.querySelector('.quiz-results').textContent.includes('of 2 correct')).toBe(true);
    expect(errors).toEqual([]);
    dom.window.close();
  });

  it('never ships the fill answer in assessment, graded, or worksheet copies', () => {
    const leaks = (html) => /data-fill-answers/.test(html.replace(/<script\b[\s\S]*?<\/script>/gi, ''));
    expect(leaks(pack([quiz()]))).toBe(true);
    expect(leaks(pack([quiz()], false, { assessmentMode: true }))).toBe(false);
    expect(leaks(pack([quiz({ answerKeysWithheld: true })]))).toBe(false);
    expect(leaks(pack([quiz()], true))).toBe(false);
    const assessment = pack([quiz()], false, { assessmentMode: true }).replace(/<script\b[\s\S]*?<\/script>/gi, '');
    expect(/Transpiration|trans-piration/i.test(assessment)).toBe(false);
  });

  it('keeps the multiple-choice label when no fill-in can be checked', () => {
    const mcqOnly = { type: 'quiz', id: 'quiz-mcq', title: 'Check', data: { questions: [quiz().data.questions[0]] } };
    const html = pack([mcqOnly]);
    expect(html.includes('Check multiple-choice answers')).toBe(true);
    expect(html.includes('Check my answers')).toBe(false);
  });
});

describe('typable note templates', () => {
  const fields = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('#nt-blank textarea[data-allo-response-key], #nt-blank input[data-allo-response-key]'))
      .map((node) => node.getAttribute('data-allo-response-key'));
  };

  it('gives a blank Cornell template a notes field per cue and a summary field', () => {
    expect(fields(pack([cornell()]))).toEqual(['nt-blank:note:notes:0', 'nt-blank:note:summary']);
  });

  it('gives a template with no cues four empty rows to type in', () => {
    const keys = fields(pack([cornell({ cues: [] })]));
    expect(keys.filter((key) => key.includes(':cue:')).length).toBe(4);
    expect(keys.filter((key) => key.includes(':notes:')).length).toBe(4);
  });

  it('leaves written notes read-only and keeps worksheets on ruled lines', () => {
    expect(fields(pack([cornell({ notes: [{ text: 'Rock wears away.' }] })]))).toEqual([]);
    expect(fields(pack([cornell()], true))).toEqual([]);
  });

  it('covers the other templates', () => {
    const count = (data) => fields(pack([{ id: 'nt-blank', type: 'note-taking', title: 'Notes', data }])).length;
    expect(count({ templateType: 'double-entry', entries: [] })).toBe(6);
    expect(count({ templateType: 'double-entry', entries: [{ quote: 'A line', response: '' }] })).toBe(1);
    expect(count({ templateType: 'lab-report', question: 'Does light matter?' })).toBe(6);
    expect(count({ templateType: 'reading-response' })).toBe(4);
    expect(count({ templateType: 'guided-notes', blanks: [{ before: 'Water ', after: ' rock.' }] })).toBe(2);
    expect(count({ templateType: 'q-and-a', pairs: [{ question: 'Why?', answer: '' }] })).toBe(1);
    expect(count({ templateType: 'q-and-a', pairs: [{ question: 'Why?', answer: 'Because.' }] })).toBe(0);
  });

  it('labels the section instead of the grey Resource fallback', () => {
    const doc = new DOMParser().parseFromString(pack([cornell()]), 'text/html');
    expect(doc.querySelector('.alloflow-section-marker').textContent.includes('Notes')).toBe(true);
  });
});

describe('layout and theme hooks', () => {
  it('holds transitions off while the theme contrast check measures', () => {
    const html = pack([cornell()]);
    expect(html.includes('html.alloflow-ink-measuring *')).toBe(true);
    expect(html.includes("root.classList.add('alloflow-ink-measuring')")).toBe(true);
  });

  it('offsets in-page jumps by the tools bar and keeps phone controls on screen', () => {
    const html = pack([cornell()]);
    expect(html.includes('scroll-padding-top: var(--alloflow-tools-h, 0px)')).toBe(true);
    expect(html.includes("setProperty('--alloflow-tools-h'")).toBe(true);
    expect(/\.alloflow-reading-tools-group \{ display: flex; width: 100%; flex-wrap: wrap;/.test(html)).toBe(true);
  });

  it('does not tick the selected quiz option or use aria-selected on sort items', () => {
    const sort = {
      type: 'concept-sort', id: 'cs', title: 'Sort',
      data: { categories: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], items: [{ id: 'x', categoryId: 'a', content: 'X' }] },
    };
    const html = pack([quiz(), sort]);
    expect(/\.mcq-label:has\(input\[type="radio"\]:checked\)::before/.test(html)).toBe(false);
    expect(html.includes('aria-selected')).toBe(false);
  });

  it('fits the Venn diagram to its box and keeps the lists clear of the shared column', () => {
    const venn = {
      type: 'outline', id: 'venn', title: 'Compare',
      data: { main: 'Compare', structureType: 'Venn Diagram', branches: [
        { title: 'Land', items: ['Dry soil'] }, { title: 'Water', items: ['Ponds'] }, { title: 'Both', items: ['Living things'] },
      ] },
    };
    const html = pack([venn]);
    expect(html.includes('zoom: var(--venn-fit, 1)')).toBe(true);
    expect(html.includes("classList.toggle('venn-stacked'")).toBe(true);
    // Circle lists end at x=266 and start at x=454; the shared column spans 270-450.
    expect(html.includes('padding: 60px 174px 40px 44px')).toBe(true);
    expect(html.includes('padding: 60px 44px 40px 174px')).toBe(true);
  });
});

// 2026-11-10 pass: organizers, image labels, lesson plan, DBQ and the name prompt.
describe('organizers, images and remaining sections', () => {
  const branches = [
    { title: 'Light', items: ['Leaves capture light'] }, { title: 'Water', items: ['Roots draw water'] },
    { title: 'Air', items: ['Stomata take in gas'] },
  ];
  const organizer = (structureType) => ({
    type: 'outline', id: 'org', title: structureType,
    data: { main: 'How photosynthesis really works', structureType, branches },
  });
  const section = (html, id = 'org') => new DOMParser().parseFromString(html, 'text/html').getElementById(id);

  it.each(['Key Concept Map', 'Mind Map', 'Memory Palace', '3D Concept Space', 'Structured Outline'])(
    'keeps the %s title in the hub colour instead of the page heading colour', (structureType) => {
      const hub = Array.from(section(pack([organizer(structureType)])).querySelectorAll('h3'))
        .find((node) => node.textContent.includes('How photosynthesis really works'));
      expect(hub.style.color).toBe('inherit');
    });

  it.each(['Key Concept Map', 'Mind Map'])('lets the %s stack into one column on a narrow screen', (structureType) => {
    const html = pack([organizer(structureType)]);
    const map = section(html).querySelector('.allo-hub-map');
    expect(map.querySelectorAll('.allo-hub-col').length).toBe(2);
    expect(map.querySelectorAll('.allo-hub-card').length).toBe(3);
    expect(map.querySelectorAll('.allo-hub-link').length).toBe(3);
    expect(map.querySelector('.allo-hub-center')).not.toBeNull();
    expect(Array.from(map.querySelectorAll('.allo-hub-card')).every((card) => card.style.minWidth === '0px')).toBe(true);
    expect(/@media screen and \(max-width: 820px\) \{\s*\.allo-hub-lines \{ display: none; \}\s*\.allo-hub-map \{ flex-direction: column !important;/.test(html)).toBe(true);
  });

  it('shows the whole fishbone title in the head box', () => {
    const head = section(pack([organizer('Fishbone')])).querySelector('svg text[fill="white"]');
    expect(Array.from(head.querySelectorAll('tspan')).map((node) => node.textContent).join(' ')).toBe('How photosynthesis really works');
  });

  it('does not hyphenate organizer list items automatically', () => {
    const html = pack([organizer('Structured Outline')]);
    expect(/\.outline-print-wrapper li \{\s*overflow-wrap: break-word;\s*hyphens: manual;/.test(html)).toBe(true);
  });

  const image = (planTitle) => ({
    type: 'image', id: 'img', title: 'Four links',
    data: { visualPlan: { title: planTitle, panels: [
      { imageUrl: 'data:image/png;base64,iVBORw0KGgo=', alt: 'A field', caption: 'A field.', labels: [{ text: 'Ground the flood never covered', position: 'bottom-right' }] },
      { imageUrl: 'data:image/png;base64,iVBORw0KGgo=', alt: 'A river', caption: 'A river.', labels: [] },
    ] } },
  });

  it('keeps image labels on the page and does not repeat the section title', () => {
    const same = pack([image('Four links')]);
    expect(section(same, 'img').textContent.split('Four links').length - 1).toBe(1);
    expect(section(pack([image('The chain')]), 'img').textContent.includes('The chain')).toBe(true);
    expect(same.includes('translate(calc(-50% + var(--vp-dx, 0px)),-50%)')).toBe(true);
    expect(same.includes("setProperty('--vp-dx'")).toBe(true);
    expect(same.includes('@media screen and (max-width: 560px) { .vp-grid { grid-template-columns:minmax(0,1fr) !important; } }')).toBe(true);
  });

  it('moves a label that hangs over the section edge back inside it', async () => {
    const { dom, errors } = await runtime(pack([image('Four links')]));
    const doc = dom.window.document;
    const label = doc.querySelector('.vp-label');
    const box = (left, right) => () => ({ left, right, width: right - left, top: 0, bottom: 20, height: 20 });
    label.closest('.section').getBoundingClientRect = box(0, 300);
    label.getBoundingClientRect = box(180, 340);
    dom.window.dispatchEvent(new dom.window.Event('load'));
    expect(label.style.getPropertyValue('--vp-dx')).toBe('-48px');
    expect(errors).toEqual([]);
    dom.window.close();
  });

  it('drops lesson plan headings that have no learner text', () => {
    const plan = (data) => ({ type: 'lesson-plan', id: 'plan', title: 'Plan', data: { essentialQuestion: 'Why?', objectives: ['Explain it'], ...data } });
    const headings = (html) => Array.from(section(html, 'plan').querySelectorAll('h3')).map((node) => node.textContent.trim());
    const learner = headings(pack([plan({ hook: 'Teacher narrative', closure: 'Teacher narrative' })]));
    expect(learner.some((text) => text.includes('lesson_headers.teacher.hook'))).toBe(false);
    expect(learner.some((text) => text.includes('lesson_headers.teacher.closure'))).toBe(false);
    expect(section(pack([plan({})]), 'plan').querySelector('.alloflow-plan-practice-grid').style.display).toBe('none');
    const teacher = headings(pipeline.generateResourceHTML(plan({ hook: 'Teacher narrative', guidedPractice: 'Work together' }), true, {}, { isWorksheet: false }));
    expect(teacher.some((text) => text.includes('lesson_headers.teacher.hook'))).toBe(true);
    expect(teacher.some((text) => text.includes('lesson_headers.teacher.guidedPractice'))).toBe(true);
    expect(teacher.some((text) => text.includes('lesson_headers.teacher.closure'))).toBe(false);
  });

  it('gives the on-screen DBQ a field per question and one for the essay', () => {
    const dbq = { type: 'dbq', id: 'dbq', title: 'Sources', data: {
      documents: [{ id: 'A', title: 'Card A', excerpt: 'Text', sourcingQuestions: ['Who wrote it?'], analysisQuestions: ['What does it claim?', 'What is missing?'] }],
      synthesisPrompt: 'Write your conclusion.',
    } };
    const keys = (html) => Array.from(section(html, 'dbq').querySelectorAll('textarea[data-allo-response-key]')).map((node) => node.getAttribute('data-allo-response-key'));
    expect(keys(pack([dbq]))).toEqual(['dbq:dbq:0:sourcing:0:free-response', 'dbq:dbq:0:analysis:0:free-response', 'dbq:dbq:0:analysis:1:free-response', 'dbq:dbq:essay:free-response']);
    expect(keys(pack([dbq], true))).toEqual([]);
    expect(keys(pipeline.generateResourceHTML(dbq, true, {}, { isWorksheet: false }))).toEqual([]);
  });

  it('sizes the name prompt to fit a phone screen', () => {
    expect(pack([cornell()]).includes("dialog.style.cssText = 'box-sizing:border-box;width:min(32rem,100%);")).toBe(true);
  });
});

describe('organizer connectors, repeated pictures and the rubric on a phone', () => {
  const section = (html, id) => new DOMParser().parseFromString(html, 'text/html').getElementById(id);
  const organizer = (structureType, branches) => ({
    type: 'outline', id: 'org', title: structureType, data: { main: 'How photosynthesis really works', structureType, branches },
  });

  it('joins flow chart details to their step without boxes that overflow', () => {
    const html = pack([organizer('Flow Chart', [
      { title: 'Light', items: ['Leaves capture light', 'Chlorophyll absorbs it', 'Energy is stored'] },
      { title: 'Water', items: ['Roots draw water'] },
    ])]);
    const kids = Array.from(section(html, 'org').querySelectorAll('.flow-kids > .flow-kid'));
    expect(kids.length).toBe(3);
    expect(kids.every((kid) => kid.firstElementChild.style.boxSizing === 'border-box')).toBe(true);
    expect(html.includes('.flow-kid:first-child { --flow-x: right; --flow-w: calc(50% + 1px); }')).toBe(true);
  });

  it('keeps 3D concept space chips level', () => {
    const chips = Array.from(section(pack([organizer('3D Concept Space', [{ title: 'Light', items: ['One', 'Two', 'Three'] }])]), 'org').querySelectorAll('.cspace-plane li'));
    expect(chips.length).toBe(3);
    expect(chips.every((chip) => chip.style.margin === '0px')).toBe(true);
  });

  it.each(['Key Concept Map', 'Mind Map'])('draws each %s branch line to the hub', async (structureType) => {
    const branches = [{ title: 'Light', items: ['A'] }, { title: 'Water', items: ['B'] }, { title: 'Air', items: ['C'] }];
    const { dom, errors } = await runtime(pack([organizer(structureType, branches)]));
    const doc = dom.window.document;
    const map = doc.querySelector('.allo-hub-map');
    const box = (left, top, width, height) => () => ({ left, top, width, height, right: left + width, bottom: top + height });
    map.getBoundingClientRect = box(100, 50, 800, 400);
    map.querySelector('.allo-hub-center').getBoundingClientRect = box(400, 150, 200, 200);
    const cards = Array.from(map.querySelectorAll('.allo-hub-card'));
    cards[0].getBoundingClientRect = box(120, 60, 200, 100);
    cards[1].getBoundingClientRect = box(120, 300, 200, 100);
    cards[2].getBoundingClientRect = box(680, 200, 200, 100);
    dom.window.dispatchEvent(new dom.window.Event('load'));
    const lines = Array.from(map.querySelectorAll('svg.allo-hub-lines line')).map((line) => ['x1', 'y1', 'x2', 'y2'].map((name) => Number(line.getAttribute(name))));
    expect(lines).toEqual([[220, 60, 400, 200], [220, 300, 400, 200], [580, 200, 400, 200]]);
    expect(map.classList.contains('allo-hub-drawn')).toBe(true);
    expect(map.querySelector('svg.allo-hub-lines').getAttribute('viewBox')).toBe('0 0 800 400');
    expect(errors).toEqual([]);
    dom.window.close();
  });

  it('shows a picture reused by every panel once, with each caption', () => {
    const panel = (caption, imageUrl = 'data:image/png;base64,iVBORw0KGgo=') => ({ imageUrl, alt: 'A desk', caption, labels: [] });
    const image = (panels) => ({ type: 'image', id: 'img', title: 'Companion', data: { visualPlan: { title: 'Companion', panels } } });
    const same = section(pack([image([panel('For question 1.'), panel('For question 2.'), panel('For question 2.')])]), 'img');
    expect(same.querySelectorAll('img').length).toBe(1);
    expect(same.querySelectorAll('figure').length).toBe(1);
    expect(same.querySelectorAll('figcaption').length).toBe(1);
    expect(same.textContent.includes('For question 1.')).toBe(true);
    expect(same.textContent.split('For question 2.').length - 1).toBe(1);
    expect(same.querySelector('.vp-grid').style.gridTemplateColumns).toBe('repeat(1,minmax(0,1fr))');
    const different = section(pack([image([panel('One.'), panel('Two.', 'data:image/png;base64,iVBORw0KGgoAAAA=')])]), 'img');
    expect(different.querySelectorAll('figure').length).toBe(2);
  });

  it('stacks the DBQ rubric by level on a phone and keeps its table roles', () => {
    const dbq = { type: 'dbq', id: 'dbq', title: 'Sources', data: { documents: [], rubric: [{ criteria: 'Evidence', 1: 'None', 2: 'Some', 3: 'Clear', 4: 'Precise' }] } };
    const html = pack([dbq]);
    const table = section(html, 'dbq').querySelector('.alloflow-dbq-rubric-wrap table');
    expect(table.getAttribute('role')).toBe('table');
    expect(table.querySelectorAll('tr[role="row"]').length).toBe(2);
    expect(table.querySelectorAll('th[role="columnheader"]').length).toBe(5);
    expect(Array.from(table.querySelectorAll('td[data-level]')).map((cell) => cell.getAttribute('data-level') + ': ' + cell.textContent)).toEqual(['Level 1: None', 'Level 2: Some', 'Level 3: Clear', 'Level 4: Precise']);
    expect(html.includes('.alloflow-dbq-rubric-wrap td[data-level]::before{content:attr(data-level);')).toBe(true);
    expect(html.includes('.alloflow-dbq-rubric-wrap table{font-size:0.7em;}')).toBe(false);
  });
});

describe('worksheet copy and reader font', () => {
  const section = (html, id) => new DOMParser().parseFromString(html, 'text/html').getElementById(id);
  const sort = { type: 'concept-sort', id: 'cs', title: 'Sort', data: {
    categories: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }],
    items: [{ id: 'i1', content: 'First item', categoryId: 'a' }, { id: 'i2', content: 'Second item', categoryId: 'b' }],
  } };

  it('gives each worksheet concept sort strip a line to write the category', () => {
    expect(section(pack([sort], true), 'cs').querySelectorAll('.alloflow-cs-strip .alloflow-cs-write').length).toBe(2);
    expect(section(pack([sort]), 'cs').querySelectorAll('.alloflow-cs-write').length).toBe(0);
    expect(section(pipeline.generateResourceHTML(sort, true, {}, { isWorksheet: true }), 'cs').querySelectorAll('.alloflow-cs-write').length).toBe(0);
  });

  it('keeps long answer choices beside their circle', () => {
    expect(pack([quiz()], true).includes('.quiz-box .mcq-label > span:not(.alloflow-print-bubble) { flex: 1 1 12rem; }')).toBe(true);
  });

  it('does not print a closed "View as text" box', () => {
    const html = pack([{ type: 'outline', id: 'org', title: 'Map', data: { main: 'Topic', structureType: 'Flow Chart', branches: [{ title: 'Step', items: ['Detail'] }] } }], true);
    expect(html.includes('@media print { details.diagram-text-fallback:not([open]) { display:none !important; } }')).toBe(true);
  });

  it('lets the reading passage and math follow a font the reader picks', async () => {
    const reading = { type: 'simplified', id: 'read', title: 'Reading', data: 'A short passage about rivers.' };
    const html = pack([reading]);
    expect(section(html, 'read').querySelector('.alloflow-own-font')).not.toBeNull();
    expect(html.includes('html[data-rt-font-set] .math-symbol, html[data-rt-font-set] .alloflow-own-font { font-family: inherit !important; }')).toBe(true);
    const { dom, errors } = await runtime(html);
    const select = dom.window.document.querySelector('[data-rt-font]');
    expect(select).not.toBeNull();
    select.value = 'readable';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(dom.window.document.documentElement.hasAttribute('data-rt-font-set')).toBe(true);
    select.value = 'original';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(dom.window.document.documentElement.hasAttribute('data-rt-font-set')).toBe(false);
    expect(errors).toEqual([]);
    dom.window.close();
  });
});
