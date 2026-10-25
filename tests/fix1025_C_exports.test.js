// 2026-10-25 fix lane C (exports). Behavioural checks against the BUILT modules:
//  1 note-taking worksheets (Q&A model answers, empty-section writing space, teacher-only feedback badge)
//  2 Activities export renders ideas, discussion and jigsaw kits, escaped, with a student copy
//  3 describeActivityItem / PPTX audience switch
//  4 printed cloze resolves the glossary per passage (unit/source scoped)
//  5 Export Builder include toggles for timeline / note-taking / anchor chart / directions / Gemini Bridge,
//    and built-in presets that name every include key
//  6 organizer memory palace prints the learner's palace when responses are included
//  7 student quiz chrome goes through t()
// FIX1025C_DIR points the module loads at another build (mutation runs).
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { parse as babelParse } from '@babel/parser';

const require = createRequire(import.meta.url);
const DIR = process.env.FIX1025C_DIR || process.cwd();
const load = (file) => new Function('window', 'console', readFileSync(join(DIR, file), 'utf8'))(window, console);
const doc = (html) => new DOMParser().parseFromString(html, 'text/html');
const text = (html) => { const d = doc(html); d.querySelectorAll('script,style').forEach(n => n.remove()); return d.body.textContent; };

let factory, dispatcher;
const makePipeline = (t = key => key) => factory({
  callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
  addToast: () => {}, t, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Resource',
  state: { leveledTextLanguage: 'English', exportConfig: {}, currentUiLanguage: 'English' },
});

beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  global.React = window.React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  load('doc_pipeline_module.js');
  factory = window.AlloModules.createDocPipeline;
  load('generate_dispatcher_module.js');
  dispatcher = window.AlloModules.GenDispatcher;
  load('export_handlers_module.js');
  load('export_module.js');
});

const note = (data) => ({ id: 'nt-1', type: 'note-taking', title: 'Notes', meta: '', data });

describe('1 note-taking worksheets', () => {
  it('Q&A worksheet prints each question with writing lines and never the generated model answer', () => {
    const p = makePipeline();
    const item = note({ templateType: 'q-and-a', pairs: [{ question: 'Why does ice float?', answer: 'MODEL ANSWER SECRET' }, { question: 'What is density?', answer: 'MODEL TWO' }] });
    const ws = doc(p.generateResourceHTML(item, false, {}, { isWorksheet: true }));
    expect(ws.body.textContent).toContain('Why does ice float?');
    expect(ws.body.textContent).toContain('What is density?');
    expect(ws.body.textContent).not.toContain('MODEL ANSWER SECRET');
    expect(ws.body.textContent).not.toContain('MODEL TWO');
    expect(ws.querySelectorAll('[data-note-writing-space] .alloflow-ruled-response')).toHaveLength(2);
    // The on-screen (non-worksheet) copy still shows the student's own notes.
    expect(text(p.generateResourceHTML(item, false, {}, { isWorksheet: false }))).toContain('MODEL ANSWER SECRET');
  });

  it('empty Lab Report and Reading Response worksheets get a labelled writing space for every section', () => {
    const p = makePipeline();
    const lab = doc(p.generateResourceHTML(note({ templateType: 'lab-report' }), false, {}, { isWorksheet: true }));
    const labLabels = [...lab.querySelectorAll('[data-note-writing-space]')].map(n => n.firstElementChild.textContent);
    expect(labLabels).toEqual(['Research Question', 'Hypothesis', 'Materials', 'Procedure', 'Data / Observations', 'Analysis (CER)', 'Conclusion']);
    expect([...lab.querySelectorAll('[data-note-writing-space]')].every(n => n.querySelector('.alloflow-ruled-line'))).toBe(true);
    const rr = doc(p.generateResourceHTML(note({ templateType: 'reading-response', connection: { type: '<b>x</b>' } }), false, {}, { isWorksheet: true }));
    expect(rr.querySelectorAll('[data-note-writing-space]')).toHaveLength(4);
    expect(rr.querySelector('b')).toBeNull();
    // A filled section prints its text, not lines; non-worksheet copies stay compact.
    const filled = doc(p.generateResourceHTML(note({ templateType: 'lab-report', question: 'Does salt melt ice?' }), false, {}, { isWorksheet: true }));
    expect(filled.body.textContent).toContain('Does salt melt ice?');
    expect(filled.querySelectorAll('[data-note-writing-space]')).toHaveLength(6);
    expect(doc(p.generateResourceHTML(note({ templateType: 'lab-report' }), false, {}, { isWorksheet: false })).querySelector('[data-note-writing-space]')).toBeNull();
  });

  it('empty double-entry worksheet gets blank writing rows', () => {
    const d = doc(makePipeline().generateResourceHTML(note({ templateType: 'double-entry', entries: [] }), false, {}, { isWorksheet: true }));
    expect(d.querySelectorAll('tbody tr[data-note-writing-space]')).toHaveLength(3);
    expect(d.body.textContent).not.toContain('No entries filled in yet');
  });

  it.each(['cornell-notes', 'lab-report', 'reading-response', 'double-entry', 'guided-notes', 'q-and-a'])('%s: AI feedback badge is teacher-only', (templateType) => {
    const p = makePipeline();
    for (const feedbackCount of [0, 3]) {
      const item = note({ templateType, feedbackCount, prevFeedbackScore: 21, question: 'Q', notes: [{ text: 'n' }], pairs: [{ question: 'Q', answer: 'A' }] });
      for (const isWorksheet of [true, false]) {
        const student = text(p.generateResourceHTML(item, false, {}, { isWorksheet }));
        expect(student).not.toMatch(/AI Feedback|internal rubric|has not requested AI feedback/);
      }
      const teacherWs = text(p.generateResourceHTML(item, true, {}, { isWorksheet: true }));
      expect(teacherWs).not.toMatch(/AI Feedback|internal rubric|has not requested AI feedback/);
      const teacher = text(p.generateResourceHTML(item, true, {}, { isWorksheet: false }));
      expect(teacher).toMatch(feedbackCount ? /best score: 21\/28 internal rubric/ : /has not requested AI feedback/);
    }
  });
});

const activities = () => ({ id: 'act-1', type: 'brainstorm', title: 'Activities', meta: '', data: [
  { title: 'Idea <img src=x onerror=alert(1)>', description: 'IDEA DESCRIPTION', connection: 'IDEA CONNECTION' },
  { kind: 'discussion', title: 'Talk it out', protocol: 'think-pair-share', grouping: 'Pairs', openingQuestion: 'OPENING Q',
    questionSets: [{ depth: 'literal', questions: ['LITERAL Q1'] }, { depth: 'evaluative', questions: ['EVAL Q1', ''] }],
    talkStems: { agree: ['I agree because'], disagree: [], clarify: ['Can you say more'], build: [] },
    facilitationNotes: 'FACILITATION SECRET', lookFors: ['LOOKFOR SECRET'] },
  { kind: 'jigsaw', title: 'Expert groups', groupSize: 2,
    chunks: [{ label: 'Group A', expertPacket: 'PACKET A <script>x</script>', teachBack: { keyPoints: ['POINT A'], checkQuestions: ['CHECK A'] } },
      { label: 'Group B', expertPacket: 'PACKET B', teachBack: { keyPoints: [], checkQuestions: [] } }],
    homeGroupTask: 'HOME TASK', synthesisOrganizer: 'SYNTH',
    accountabilityCheck: [{ q: 'ACCOUNT Q1', answer: 'ANSWER SECRET 1' }] },
] });

describe('2 Activities export', () => {
  for (const mode of ['grid', 'mindmap']) {
    it(`${mode}: teacher copy renders every item kind, escaped, with no "undefined"`, () => {
      const html = makePipeline().generateResourceHTML(activities(), true, {}, { brainstormDisplayMode: mode });
      const d = doc(html);
      const body = text(html);
      expect(body).not.toContain('undefined');
      for (const s of ['IDEA DESCRIPTION', 'OPENING Q', 'LITERAL Q1', 'EVAL Q1', 'I agree because', 'PACKET A', 'POINT A', 'CHECK A', 'PACKET B', 'HOME TASK', 'SYNTH', 'ACCOUNT Q1', 'FACILITATION SECRET', 'LOOKFOR SECRET', 'ANSWER SECRET 1', 'think-pair-share']) {
        expect(body.includes(s), s).toBe(true);
      }
      expect(d.querySelector('.section img')).toBeNull();
      expect(d.querySelector('.section script')).toBeNull();
    });
  }

  it('student copy keeps questions, stems, packets and checks but drops ideas, facilitation, look-fors and the key', () => {
    const p = makePipeline();
    for (const isWorksheet of [false, true]) {
      const html = p.generateResourceHTML(activities(), false, {}, { isWorksheet, includeBrainstorm: true });
      const body = text(html);
      for (const s of ['OPENING Q', 'LITERAL Q1', 'I agree because', 'PACKET A', 'CHECK A', 'HOME TASK', 'ACCOUNT Q1']) expect(body.includes(s), s).toBe(true);
      for (const s of ['FACILITATION SECRET', 'LOOKFOR SECRET', 'ANSWER SECRET', 'IDEA DESCRIPTION', 'IDEA CONNECTION', 'undefined']) expect(body.includes(s), s).toBe(false);
      expect(doc(html).querySelectorAll('[data-activity-teacher-only]')).toHaveLength(0);
      if (isWorksheet) expect(doc(html).querySelectorAll('.alloflow-ruled-response').length).toBeGreaterThan(0);
    }
    // ideas-only resources have no student copy
    expect(p.generateResourceHTML({ ...activities(), data: [activities().data[0]] }, false, {}, { includeBrainstorm: true })).toBe('');
  });

  it('full pack student file includes the kit when Activities is toggled on, and the key stays out', () => {
    const p = makePipeline();
    const on = text(p.generateFullPackHTML([activities()], 'Lesson', false, {}, { includeBrainstorm: true, includeTeacherKey: false, annotations: [] }));
    expect(on).toContain('ACCOUNT Q1');
    expect(on).not.toContain('ANSWER SECRET');
    const off = text(p.generateFullPackHTML([activities()], 'Lesson', false, {}, { includeBrainstorm: false, includeTeacherKey: false, annotations: [] }));
    expect(off).not.toContain('ACCOUNT Q1');
  });

  it('labels go through t()', () => {
    const p = makePipeline(key => ({ 'brainstorm.talk_stems': 'PISTES DE PAROLE', 'brainstorm.answer_key': 'CORRIGE', 'export.activity_idea_label': 'ACTIVITE', 'export.activity_idea_number': 'IDEE {n}' })[key]);
    const body = text(p.generateResourceHTML(activities(), true, {}, {}));
    for (const s of ['PISTES DE PAROLE', 'CORRIGE', 'ACTIVITE', 'IDEE 1']) expect(body.includes(s), s).toBe(true);
  });
});

describe('3 activity audience for slides', () => {
  const [, discussion, jigsaw] = activities().data;
  it('describeActivityItem keeps the teacher default and drops teacher-only parts for students', () => {
    const teacher = dispatcher.describeActivityItem(jigsaw) + dispatcher.describeActivityItem(discussion);
    for (const s of ['ANSWER SECRET 1', 'FACILITATION SECRET', 'LOOKFOR SECRET']) expect(teacher).toContain(s);
    const student = dispatcher.describeActivityItem(jigsaw, null, { audience: 'student' }) + dispatcher.describeActivityItem(discussion, {}, { audience: 'student' });
    for (const s of ['ACCOUNT Q1', 'LITERAL Q1', 'PACKET A']) expect(student).toContain(s);
    for (const s of ['ANSWER SECRET', 'FACILITATION SECRET', 'LOOKFOR SECRET', 'Answer key']) expect(student).not.toContain(s);
  });

  afterEach(() => { delete window.PptxGenJS; });
  const runSlides = async (options) => {
    const slides = [];
    window.PptxGenJS = class { constructor() { this.ShapeType = { rect: 'rect', ellipse: 'ellipse', line: 'line' }; this.writeFile = vi.fn().mockResolvedValue('ok'); }
      defineSlideMaster() {} addSlide() { const s = { t: [] }; s.addText = (x) => s.t.push(Array.isArray(x) ? x.map(r => r && r.text).join('\n') : String(x)); s.addNotes = (x) => s.t.push(String(x)); s.addShape = () => {}; s.addImage = () => {}; s.addTable = () => {}; slides.push(s); return s; } };
    const api = window.AlloModules.createExport({ liveRef: { current: { history: [activities()], sourceTopic: 'T', gradeLevel: '5', addToast: () => {}, t: key => key } }, warnLog: () => {}, debugLog: () => {}, escapeXml: s => String(s), generateUUID: () => 'u' });
    await api.handleExportSlides(options);
    return slides.map(s => s.t.join('\n')).join('\n');
  };
  it('PPTX export: teacher by default, student audience leaves the key and notes out', async () => {
    // Slide text is chunked at spaces, so match single words.
    const teacher = await runSlides({});
    for (const s of ['ACCOUNT', 'LITERAL', 'brainstorm.answer_key', 'FACILITATION', 'LOOKFOR']) expect(teacher).toContain(s);
    const student = await runSlides({ audience: 'student' });
    for (const s of ['ACCOUNT', 'LITERAL', 'PACKET']) expect(student).toContain(s);
    for (const s of ['SECRET', 'brainstorm.answer_key', 'brainstorm.facilitation_notes', 'brainstorm.look_fors']) expect(student).not.toContain(s);
  });
});

describe('4 printed cloze glossary is unit/source scoped', () => {
  const gloss = (id, unitId, term, extra = {}) => ({ id, type: 'glossary', unitId, data: [{ term, def: 'd' }], ...extra });
  it('relatedClozeGlossary picks the passage unit, prefers the source family, and never borrows another unit', () => {
    const rel = factory.relatedClozeGlossary;
    const hist = [gloss('g1', 'u1', 'photosynthesis'), gloss('g2', 'u2', 'volcano')];
    expect(rel(hist, { type: 'simplified', unitId: 'u1' }).map(g => g.term)).toEqual(['photosynthesis']);
    expect(rel(hist, { type: 'simplified', unitId: 'u3' })).toEqual([]);
    expect(rel(hist, { type: 'simplified', config: { unitId: 'u2' } }).map(g => g.term)).toEqual(['volcano']);
    const fam = [gloss('g1', 'u1', 'alpha', { sourceFamilyId: 'f1' }), gloss('g2', 'u1', 'beta', { sourceFamilyId: 'f2' })];
    expect(rel(fam, { type: 'simplified', unitId: 'u1', sourceFamilyId: 'f1' }).map(g => g.term)).toEqual(['alpha']);
    expect(rel([gloss('g1', null, 'legacy'), gloss('g2', null, 'newest')], { type: 'simplified' }).map(g => g.term)).toEqual(['newest']);
    expect(rel([{ type: 'glossary', unitId: 'u1', data: JSON.stringify([{ term: 'parsed' }]) }], { unitId: 'u1' }).map(g => g.term)).toEqual(['parsed']);
  });

  it('a two-unit pack blanks each passage against its own unit glossary', () => {
    const p = makePipeline(() => undefined);
    const hist = [
      { id: 's1', type: 'simplified', unitId: 'u1', title: 'Plants', data: 'Plants use photosynthesis. A volcano is far away.' },
      gloss('g1', 'u1', 'photosynthesis'),
      { id: 's2', type: 'simplified', unitId: 'u2', title: 'Earth', data: 'A volcano erupts. Not photosynthesis here.' },
      gloss('g2', 'u2', 'volcano'),
    ];
    const html = p.generateFullPackHTML(hist, 'Pack', true, {}, { clozeWorksheet: true, includeTeacherKey: false, includeGlossary: false, annotations: [] });
    const d = doc(html);
    const s1 = d.querySelector('#s1').textContent, s2 = d.querySelector('#s2').textContent;
    expect(s1).not.toContain('use photosynthesis');
    expect(s1).toContain('A volcano is far away');
    expect(s2).not.toContain('A volcano erupts');
    expect(s2).toContain('Not photosynthesis here');
  });
});

describe('5 include toggles and presets', () => {
  const newTypes = [
    ['includeTimeline', { id: 'tl', type: 'timeline', title: 'UNIQUE TIMELINE', data: [{ date: '1900', event: 'Event one' }, { date: '1950', event: 'Event two' }] }],
    ['includeNoteTaking', note({ templateType: 'cornell-notes', cues: [{ text: 'c' }], notes: [{ text: 'n' }] })],
    ['includeAnchorChart', { id: 'ac', type: 'anchor-chart', title: 'UNIQUE ANCHOR', data: { chartType: 'reference', title: 'UNIQUE ANCHOR', sections: [{ label: 'One', bullets: ['b'] }] } }],
    ['includeDirections', { id: 'dir', type: 'directions', title: 'UNIQUE DIRECTIONS', data: { body: 'Read then write.' } }],
    ['includeGeminiBridge', { id: 'gb', type: 'gemini-bridge', title: 'UNIQUE BRIDGE', meta: 'm', data: 'prompt text' }],
  ];
  newTypes[1][1].title = 'UNIQUE NOTES';
  it.each(newTypes)('%s filters its resource out of the export and the contents list', (key, item) => {
    const p = makePipeline();
    const marker = item.title;
    const filler = { id: 'q', type: 'quiz', title: 'Quiz', data: { questions: [{ question: 'Q?', options: ['a', 'b'], correctAnswer: 'a' }] } };
    // Visible document only: the JSON object-profile manifest deliberately lists every
    // pack resource with renderedInStudentHtml flags.
    for (const isWorksheet of [false, true]) {
      expect(text(p.generateFullPackHTML([item, filler], 'Pack', isWorksheet, {}, { annotations: [] })).includes(marker), key + ' default').toBe(true);
      const off = p.generateFullPackHTML([item, filler], 'Pack', isWorksheet, {}, { [key]: false, annotations: [] });
      expect(text(off).includes(marker), key + ' off').toBe(false);
      expect(doc(off).querySelector(`[data-alloflow-resource-id="${item.id}"]`), key + ' section').toBeNull();
    }
  });

  it('Export Builder offers a toggle for each new type, default on, and bulk select covers it', () => {
    const source = readFileSync(join(DIR, 'view_export_preview_source.jsx'), 'utf8');
    const decls = babelParse(source, { sourceType: 'script', plugins: ['jsx'] }).program.body;
    const names = ['_builderReadingHistory', '_builderIsOriginalReading', '_builderResourceOptions', '_builderResourceIncluded', '_builderBulkResourceUpdate', '_builderReadingAccessReview'];
    const ctx = vm.createContext({});
    vm.runInContext(names.map(n => { const d = decls.find(x => x.type === 'FunctionDeclaration' && x.id.name === n); return source.slice(d.start, d.end); }).join('\n'), ctx);
    const history = newTypes.map(([, item]) => item);
    expect(ctx._builderResourceOptions(history, () => '').map(([key]) => key)).toEqual(newTypes.map(([key]) => key));
    expect(newTypes.every(([key]) => ctx._builderResourceIncluded({}, key))).toBe(true);
    expect({ ...ctx._builderBulkResourceUpdate(history, {}) }).toEqual(Object.fromEntries(newTypes.map(([key]) => [key, false])));
    expect(newTypes.every(([key]) => !ctx._builderResourceIncluded({ [key]: false }, key))).toBe(true);
  });

  for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
    it(`${file}: every built-in preset names every include key, and Quiz Only exports only the quiz`, () => {
      const anti = readFileSync(join(DIR, file), 'utf8');
      const grab = (name) => { const start = anti.indexOf(`const ${name} = {`); const end = anti.indexOf('\n  };', start); return new Function('return ' + anti.slice(anti.indexOf('{', start), end + 4))(); };
      const defaults = grab('DEFAULT_EXPORT_CONFIG');
      const presets = grab('BUILT_IN_PRESETS');
      const includeKeys = Object.keys(defaults).filter(k => /^include/.test(k));
      for (const k of ['includeConceptSort', 'includeMemoryAid', 'includeAppliedChallenge', 'includeTimeline', 'includeNoteTaking', 'includeAnchorChart', 'includeDirections', 'includeGeminiBridge']) {
        expect(defaults[k], k).toBe(true);
      }
      for (const [name, preset] of Object.entries(presets)) {
        expect(includeKeys.filter(k => typeof preset.config[k] !== 'boolean'), name).toEqual([]);
      }
      const quizOnly = { ...defaults, ...presets.quizOnly.config, annotations: [] };
      expect(includeKeys.filter(k => quizOnly[k] && !['includeQuiz', 'includeStudentResponses', 'includeTeacherKey'].includes(k))).toEqual([]);
      const p = makePipeline();
      const pack = [
        { id: 'q', type: 'quiz', title: 'ONLY QUIZ', data: { questions: [{ question: 'Q?', options: ['a', 'b'], correctAnswer: 'a' }] } },
        { id: 'cs', type: 'concept-sort', title: 'UNIQUE SORT', data: { categories: [{ id: 'c', label: 'Cat' }], items: [{ id: 'i', content: 'thing', categoryId: 'c' }] } },
        ...newTypes.map(([, item]) => item),
      ];
      const html = text(p.generateFullPackHTML(pack, 'Pack', false, {}, quizOnly));
      expect(html.includes('ONLY QUIZ')).toBe(true);
      for (const marker of ['UNIQUE SORT', ...newTypes.map(([, item]) => item.title)]) expect(html.includes(marker), marker).toBe(false);
    });
  }
});

describe('6 memory palace handout uses learner work', () => {
  const palace = () => ({ id: 'org-1', type: 'outline', title: 'Palace', data: { main: 'Cells', structureType: 'Memory Palace',
    branches: [{ title: 'Room A', items: ['Nucleus'] }], memoryPalace: { myMnemonics: { b0_i0: 'TEACHER IMAGE' } } } });
  it('prints the learner palace when responses are included, the teacher palace otherwise', () => {
    const p = makePipeline();
    const responses = { 'org-1': { organizerWork: { memoryPalace: { myMnemonics: { b0_i0: 'LEARNER IMAGE' }, extraRooms: [{ id: 'xr1', title: 'LEARNER ROOM' }] } } } };
    const mine = text(p.generateResourceHTML(palace(), false, responses, {}));
    expect(mine).toContain('LEARNER IMAGE');
    expect(mine).toContain('LEARNER ROOM');
    expect(mine).not.toContain('TEACHER IMAGE');
    expect(text(p.generateResourceHTML(palace(), false, responses, { includeStudentResponses: false }))).toContain('TEACHER IMAGE');
    expect(text(p.generateResourceHTML(palace(), false, {}, {}))).toContain('TEACHER IMAGE');
  });
});

describe('7 student quiz chrome is translated', () => {
  const quiz = { id: 'qz', type: 'quiz', title: 'Quiz', data: { questions: [
    { type: 'sequence-sense', question: 'Order?', items: ['a', 'b', 'c'], presentedOrder: [1, 0, 2], principleOptions: ['chronological'] },
    { type: 'relation-mismatch', question: 'Pairs?', pairs: [{ left: 'A', right: '1' }], candidatePartners: ['2'] },
    { type: 'numeric-response', question: 'How far?', unit: 'cm' },
    { question: 'MCQ?', options: ['x', 'y'], correctAnswer: 'x' },
  ], reflections: [] } };
  it('routes the visible labels through t() with English fallbacks', () => {
    const fr = makePipeline(key => (/^export\.quiz_|^common\.unit$/.test(key) ? 'FR[' + key + ']' : undefined));
    const html = fr.generateResourceHTML(quiz, false, {}, { isWorksheet: false });
    for (const k of ['export.quiz_sequence_correct', 'export.quiz_yes', 'export.quiz_correct_partner', 'export.quiz_wrong_pair', 'export.quiz_value', 'common.unit', 'export.quiz_check_mcq', 'export.quiz_reset', 'export.quiz_pairs_to_review']) {
      expect(html.includes('FR[' + k + ']'), k).toBe(true);
    }
    expect(html.includes('aria-label="FR[export.quiz_choices_for]"')).toBe(true);
    const en = text(makePipeline().generateResourceHTML(quiz, false, {}, { isWorksheet: false }));
    for (const s of ['1. Is this order correct?', 'Correct partner', 'Value', 'Check multiple-choice answers', 'Reset responses']) expect(en.includes(s), s).toBe(true);
    expect(en).not.toMatch(/export\.quiz_/);
  });
});
