// 2026-10-25 fix pass, lane G (scaffold views):
//  1. Note-Taking text goes through t() (template views), and the Notebook prints the
//     FULL notes of its entries in their own window (Canvas ignores window.print()).
//  2. Anchor Chart: an empty-state message (+ teacher regenerate hint), student text via t().
//  3. FAQ: expand buttons are named after their question, aria-controls always resolves,
//     and the TTS auto-expand effect runs at the top level of the component.
//  4. Outline: the UDL goal and the curate hint go through t().
//  5. Sentence Frames: Auto-Grade stores only a complete grading reply; the view survives
//     a partial one; the error-boundary text is translated; item numbers have no gaps.
//  6. Submit Work carries Activities (brainstorm) only as the student projection.
// FIX1025_G_<NOTES|ANCHOR|FAQ|OUTLINE|SF|BRAINSTORM>=<module path> and FIX1025_G_HOST=<host source path>
// load candidate copies (mutation checks).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const file = (env, fallback) => resolve(process.env[env] || fallback);
const HOST_SOURCE = readFileSync(file('FIX1025_G_HOST', 'host_handlers_source.jsx'), 'utf8');
const createHostHandlers = new Function(HOST_SOURCE + '\nreturn createHostHandlers;')();
let M, root, host;
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  const Stub = () => null;
  window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
  window.AlloModules = window.AlloModules || {};
  for (const [env, path] of [['FIX1025_G_STUDIO', 'studio_response_module.js'], ['FIX1025_G_NOTES', 'note_taking_templates_module.js'], ['FIX1025_G_ANCHOR', 'anchor_charts_module.js'],
    ['FIX1025_G_FAQ', 'view_faq_module.js'], ['FIX1025_G_OUTLINE', 'view_outline_module.js'], ['FIX1025_G_SF', 'view_sentence_frames_module.js'], ['FIX1025_G_BRAINSTORM', 'view_brainstorm_module.js']]) {
    new Function(readFileSync(file(env, path), 'utf8'))();
  }
  M = window.AlloModules;
});
afterEach(() => { try { if (root) act(() => root.unmount()); } catch (_) {} root = null; host?.remove(); host = null; vi.restoreAllMocks(); });
function mount(Component, props) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); act(() => root.render(React.createElement(Component, props))); return host; }
const rerender = (Component, props) => act(() => root.render(React.createElement(Component, props)));
const keyT = k => k;                     // a host t() that returns the key for a missing string
const markT = k => '[[' + k + ']]';     // every string translated, so leftover English is visible
const mapT = map => k => map[k] || k;
const labels = el => [...el.querySelectorAll('[aria-label],[placeholder],[title]')].flatMap(n => ['aria-label', 'placeholder', 'title'].map(a => n.getAttribute(a)).filter(Boolean));
const textNodes = el => { const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); while (w.nextNode()) out.push(w.currentNode.nodeValue); return out; };

// ── 1. Note-Taking ───────────────────────────────────────────────────────
const note = (templateType, data) => ({ id: 'n-' + templateType, type: 'note-taking', data: { templateType, title: 'MyTitle', ...data } });
const TEMPLATES = {
  'cornell-notes': { cues: [{ text: 'CueData' }], notes: [{ text: 'NoteData' }], summary: 'SummaryData' },
  'lab-report': { question: 'QData', materials: [{ text: 'MatData' }], procedure: [{ text: 'StepData' }] },
  'reading-response': { author: 'AuthorData', connection: { type: 'text-to-world', text: 'ConnData' } },
  'double-entry': { entries: [{ quote: 'QuoteData', response: 'RespData' }] },
  'guided-notes': { blanks: [{ id: 'b', before: 'BeforeData ', answer: 'KeyData', after: ' AfterData', studentAnswer: 'WrongData' }] },
  'q-and-a': { pairs: [{ question: 'AskData', answer: 'AnsData' }] },
};
describe('1a. Note-Taking template text goes through t()', () => {
  it.each(Object.keys(TEMPLATES))('%s shows no hard-coded English when every key is translated', (type) => {
    const el = mount(M.NoteTakingView, { generatedContent: note(type, TEMPLATES[type]), isTeacherMode: false, handleNoteUpdate: vi.fn(), t: markT });
    const check = el.querySelector('[data-help-key="guided_notes_check_button"]');
    if (check) act(() => check.click());
    const strings = [...textNodes(el), ...labels(el)].map(s => s.trim()).filter(s => /[A-Za-z]{2,}/.test(s));
    const leftovers = strings.filter(s => !s.includes('[[') && !/Data\b|MyTitle/.test(s));
    expect(leftovers, 'untranslated: ' + JSON.stringify(leftovers)).toEqual([]);
  });

  it('Guided Notes uses the translated labels, marks and score line', () => {
    const T = { 'note_taking.blank_n': 'Hueco {n}', 'note_taking.check_answers': 'Comprobar', 'note_taking.correct': 'Correcto', 'note_taking.incorrect': 'Incorrecto',
      'note_taking.fill_blanks': 'Completa los espacios', 'note_taking.guided_score': '{correct} de {total} bien · {filled} de {total} llenos' };
    const el = mount(M.NoteTakingView, { generatedContent: note('guided-notes', { blanks: [
      { id: 'a', before: 'Cells have a ', answer: 'nucleus', after: '.', studentAnswer: 'nucleus' },
      { id: 'b', before: 'Plants have ', answer: 'chloroplasts', after: '.', studentAnswer: 'roots' }] }), isTeacherMode: false, handleNoteUpdate: vi.fn(), t: mapT(T) });
    expect(el.querySelector('input[aria-label="Hueco 2"]')).not.toBeNull();
    expect(el.querySelector('h3').textContent).toBe('Completa los espacios');
    const check = el.querySelector('[data-help-key="guided_notes_check_button"]');
    expect(check.textContent).toBe('Comprobar');
    act(() => check.click());
    expect(el.querySelector('[aria-label="Correcto"]')).not.toBeNull();
    expect(el.querySelector('[aria-label="Incorrecto"]')).not.toBeNull();
    expect(el.textContent).toContain('1 de 2 bien · 2 de 2 llenos');
  });

  it('a key-returning t() falls back to English, never a raw key', () => {
    const el = mount(M.NoteTakingView, { generatedContent: note('q-and-a', TEMPLATES['q-and-a']), isTeacherMode: false, handleNoteUpdate: vi.fn(), t: keyT });
    const quiz = el.querySelector('[data-help-key="qanda_quiz_toggle"]');
    expect(quiz.textContent).toContain('Quiz me');
    act(() => quiz.click());
    expect([...el.querySelectorAll('button')].some(b => b.textContent === 'Show answer')).toBe(true);
    expect(el.textContent).not.toContain('note_taking.');
    expect(labels(el).join('|')).not.toContain('note_taking.');
  });
});

describe('1b. Notebook Print / PDF prints the full notes in its own window', () => {
  const LONG = 'Mitochondria convert glucose and oxygen into usable energy. '.repeat(6).trim();
  const history = [
    { id: '1800000000000a', type: 'note-taking', data: { templateType: 'cornell-notes', title: 'Cell <b>energy</b>', cues: [{ text: 'What makes ATP?' }], notes: [{ text: LONG }], summary: 'SUMMARY_TEXT' } },
    { id: '1700000000000b', type: 'note-taking', data: { templateType: 'guided-notes', title: 'Organelles', blanks: [{ id: 'x', before: 'Food is made in the ', answer: 'ANSWER_KEY_TEXT', after: '.', studentAnswer: 'ribosome' }] } },
  ];
  function printWith(openImpl, extra = {}) {
    const addToast = vi.fn();
    const print = vi.fn(); const original = window.print; window.print = print;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(window, 'open').mockImplementation(openImpl);
    try {
      mount(M.NotebookOverlay, { isOpen: true, t: keyT, allowRuntimeAi: false, history, addToast, ...extra });
      act(() => host.querySelector('[data-notebook-print="true"]').click());
    } finally { window.print = original; }
    return { addToast, print };
  }
  it('writes every entry\'s full notes (not the 140-character preview) and no answer key', () => {
    const written = [];
    const popup = { document: { open: vi.fn(), write: html => written.push(html), close: vi.fn() } };
    const { addToast, print } = printWith(() => popup);
    const html = written.join('');
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(popup.document.close).toHaveBeenCalled();
    expect(print).not.toHaveBeenCalled();
    expect(html.includes(LONG), 'full long note').toBe(true);
    expect(html).toContain('What makes ATP?');
    expect(html).toContain('SUMMARY_TEXT');
    expect(html).toContain('ribosome');
    expect(html).not.toContain('ANSWER_KEY_TEXT');
    expect(html).toContain('Cell &lt;b&gt;energy&lt;/b&gt;');
    expect(html).toContain('window.print()');
    expect(addToast).not.toHaveBeenCalled();
  });
  it('a blocked pop-up or a failure tells the student instead of failing silently', () => {
    let r = printWith(() => null);
    expect(r.addToast).toHaveBeenCalledWith(expect.stringContaining('blocked'), 'error');
    act(() => root.unmount()); root = null; host.remove();
    r = printWith(() => { throw new Error('denied'); });
    expect(r.addToast).toHaveBeenCalledWith(expect.stringContaining('could not be printed'), 'error');
  });
});

// ── 2. Anchor Chart ──────────────────────────────────────────────────────
const chart = (sections, extra = {}) => ({ id: 'a1', type: 'anchor-chart', data: { title: 'Water', chartType: 'reference', sections, interactive: { armed: false, rubric: '' }, ...extra } });
describe('2. Anchor Chart empty state and translated student text', () => {
  it('shows an empty-state message, with a regenerate hint for the teacher only', () => {
    let el = mount(M.AnchorChartView, { generatedContent: chart([]), isTeacherMode: true, handleNoteUpdate: vi.fn(), t: keyT });
    const box = el.querySelector('[data-anchor-empty="true"]');
    expect(box?.getAttribute('role')).toBe('status');
    expect(box.textContent).toContain('no sections yet');
    expect(box.textContent).toContain('Regenerate');
    rerender(M.AnchorChartView, { generatedContent: chart([]), isTeacherMode: false, handleNoteUpdate: vi.fn(), t: keyT });
    expect(el.querySelector('[data-anchor-empty="true"]').textContent).not.toContain('Regenerate');
    rerender(M.AnchorChartView, { generatedContent: chart([{ id: 's1', label: 'Rain', bullets: ['Falls'] }]), isTeacherMode: false, handleNoteUpdate: vi.fn(), t: keyT });
    expect(el.querySelector('[data-anchor-empty]')).toBeNull();
  });
  it('routes the toolbar, title, date and feedback panel through t()', () => {
    const T = { 'anchor_chart.view_title': 'Cartel', 'anchor_chart.download_png': 'Descargar PNG', 'common.print': 'Imprimir', 'anchor_chart.untitled': '(sin título)',
      'anchor_chart.created_on': 'Creado {date}', 'anchor_chart.submit_for_feedback': 'Pedir comentarios', 'notes_feedback.strength_label': 'Lo que hiciste bien',
      'anchor_chart.growth_label': 'Prueba esto', 'anchor_chart.xp_earned': '+{amount} PX', 'anchor_chart.interactive_title': 'Cartel interactivo' };
    const data = { title: '', lessonRef: { generatedAt: '2026-01-15T12:00:00Z' }, interactive: { armed: true, rubric: 'R' }, studentAnswers: {},
      feedback: { strength: 'Clear', growthNudge: 'Add one', xpAwarded: 7 } };
    const el = mount(M.AnchorChartView, { generatedContent: chart([{ id: 's1', label: 'Rain', bullets: ['Falls'] }], data), isTeacherMode: false, handleNoteUpdate: vi.fn(), callGemini: vi.fn(), t: mapT(T) });
    const text = el.textContent;
    for (const s of ['Cartel', 'Descargar PNG', 'Imprimir', '(sin título)', 'Creado ', 'Pedir comentarios', 'Lo que hiciste bien', 'Prueba esto', '+7 PX', 'Cartel interactivo']) expect(text, s).toContain(s);
    for (const s of ['Download PNG', 'untitled chart', 'Created ', 'Submit for AI feedback', 'What you did well', 'XP earned']) expect(text, s).not.toContain(s);
  });
});

// ── 3. FAQ ───────────────────────────────────────────────────────────────
const faqProps = (extra = {}) => ({ t: keyT, isTeacherMode: false, generatedContent: { id: 'f', type: 'faq', data: [{ question: 'What is a *root*?', answer: 'It holds the plant.' }, { question: 'What is a leaf?', answer: 'It makes food.' }] },
  history: [], isEditingFaq: false, splitTextToSentences: text => [text], formatInteractiveText: text => text, renderFormattedText: text => text, formatInlineText: text => text, ...extra });
const expanders = el => [...el.querySelectorAll('button[aria-expanded]')];
describe('3. FAQ disclosure buttons', () => {
  it('names each expand button after its question and keeps its controlled region in the DOM', () => {
    const el = mount(M.FaqView, faqProps());
    const [first, second] = expanders(el);
    expect(first.getAttribute('aria-label')).toBe('Show answer: What is a root?');
    expect(second.getAttribute('aria-label')).toBe('Show answer: What is a leaf?');
    for (const b of [first, second]) {
      const region = document.getElementById(b.getAttribute('aria-controls'));
      expect(region, 'aria-controls target exists while collapsed').not.toBeNull();
      expect(region.hidden).toBe(true);
      expect(region.textContent).toBe('');
    }
    act(() => first.click());
    expect(first.getAttribute('aria-label')).toBe('Hide answer: What is a root?');
    const region = document.getElementById(first.getAttribute('aria-controls'));
    expect(region.hidden).toBe(false);
    expect(region.textContent).toContain('It holds the plant.');
  });
  it('read-aloud reaching an answer opens it and keeps it open after playback stops', () => {
    const playing = { isPlaying: true, playingContentId: 'faq-active', playbackState: { currentIdx: 2 }, audioRef: { current: null }, playbackSessionRef: { current: null } };
    const el = mount(M.FaqView, faqProps(playing));
    expect(expanders(el)[1].getAttribute('aria-expanded')).toBe('true');
    rerender(M.FaqView, faqProps({ ...playing, isPlaying: false, playbackState: { currentIdx: -1 } }));
    expect(expanders(el)[1].getAttribute('aria-expanded')).toBe('true');
    expect(expanders(el)[0].getAttribute('aria-expanded')).toBe('false');
  });
  it('calls every hook at the top level of FaqView, not inside a render callback', () => {
    const src = readFileSync(file('FIX1025_G_FAQ_SOURCE', 'view_faq_source.jsx'), 'utf8');
    const body = src.slice(src.indexOf('function FaqView('));
    const jsxStart = body.indexOf('return <div data-faq-view');
    expect(jsxStart).toBeGreaterThan(0);
    expect(body.slice(jsxStart).includes('React.useEffect'), 'useEffect inside the returned JSX').toBe(false);
  });
});

// ── 4. Outline ───────────────────────────────────────────────────────────
describe('4. Outline teacher text goes through t()', () => {
  const props = (t, extra = {}) => ({ t, isTeacherMode: true, generatedContent: { id: 'o', type: 'outline', data: { main: 'Plants', structureType: 'Key Concept Map', branches: [{ title: 'Root', items: [] }] } }, history: [],
    isEditingOutline: false, isProcessing: false, gradeLevel: '5', leveledTextLanguage: 'English', renderOutlineContent: () => null, renderInteractiveMap: () => null, mapAddInput: '', setMapAddInput: () => {}, ...extra });
  it('translates the UDL goal, level and curate hint, and falls back to English', () => {
    const T = { 'outline.udl_goal_label': 'Meta DUA:', 'outline.udl_goal_desc': 'Opciones de percepción.', 'outline.level_label': 'Nivel:', 'outline.curate_concepts_hint': 'Revisa los conceptos.' };
    let el = mount(M.OutlineView, props(mapT(T), { isInteractiveMap: true, isConceptMapReady: false, isChallengeActive: false }));
    for (const s of ['Meta DUA:', 'Opciones de percepción.', 'Nivel: 5', 'Revisa los conceptos.']) expect(el.textContent, s).toContain(s);
    expect(el.textContent).not.toContain('Providing options for perception');
    expect(el.textContent).not.toContain('Review and curate');
    rerender(M.OutlineView, props(keyT, { isInteractiveMap: true, isConceptMapReady: false, isChallengeActive: false }));
    expect(el.textContent).toContain('UDL Goal:');
    expect(el.textContent).toContain('Review and curate the concepts');
    expect(el.textContent).not.toContain('outline.udl_goal');
  });
});

// ── 5. Sentence Frames ───────────────────────────────────────────────────
const sfProps = (extra = {}) => ({ t: keyT, isTeacherMode: false, gradingSession: { isOpen: false }, studentResponses: {},
  generatedContent: { id: 'sf', type: 'sentence-frames', data: { mode: 'list', items: [{ text: 'First prompt' }, { text: '   ' }, { text: 'Third prompt' }] } },
  setGradingSession: vi.fn(), setStudentWorkInput: vi.fn(), handleResetScaffolds: vi.fn(), launchGradingSession: vi.fn(), handleToggleIsEditingScaffolds: vi.fn(),
  submitGradingSession: vi.fn(), handleScaffoldChange: vi.fn(), handleStudentInput: vi.fn(), handleScaffoldTextChange: vi.fn(), handleGenerateRubric: vi.fn(),
  handleToggleRubricZoom: vi.fn(), handleAutoGrade: vi.fn(), handleSetGradingResultToNull: vi.fn(), getRows: () => 3, renderFormattedText: text => text, copyToClipboard: vi.fn(),
  DraftFeedbackInterface: () => null, ErrorBoundary: p => p.children, ...extra });
describe('5a. Sentence Frames view', () => {
  it('numbers the items it shows without gaps', () => {
    const el = mount(M.SentenceFramesView, sfProps());
    const badges = [...el.querySelectorAll('[data-help-key="scaffolds_item"]')].map(item => item.querySelector('.bg-rose-100').textContent);
    expect(badges).toEqual(['1', '2']);
    expect(el.querySelector('textarea[aria-label="Student response 2"]')?.getAttribute('aria-describedby')).toBe('scaffold-prompt-sf-2');
  });
  it('translates the draft-feedback error boundary message', () => {
    let seen = null;
    const ErrorBoundary = p => { seen = p.fallbackMessage; return p.children; };
    mount(M.SentenceFramesView, sfProps({ ErrorBoundary, gradingSession: { isOpen: true, resourceId: 'sf' }, t: mapT({ 'scaffolds.draft_feedback_error': 'Error en los comentarios.' }) }));
    expect(seen).toBe('Error en los comentarios.');
    rerender(M.SentenceFramesView, sfProps({ ErrorBoundary, gradingSession: { isOpen: true, resourceId: 'sf' } }));
    expect(seen).toBe('Draft feedback encountered an error. Please try again.');
  });
  it.each([[{ totalScore: '3/5' }], [{ scores: 'none', feedback: null }], [{ scores: [null, { criteria: { x: 1 }, score: 2 }], feedback: 'x' }]])('a partial grading result %j does not crash the teacher view', (gradingResult) => {
    const teacher = { isTeacherMode: true, generatedContent: { id: 'sf', type: 'sentence-frames', data: { mode: 'list', items: [{ text: 'A' }], rubric: 'R' } } };
    expect(() => mount(M.SentenceFramesView, sfProps({ ...teacher, gradingResult }))).not.toThrow();
    expect(host.textContent).toContain('dashboard.grading.grade_another');
  });
});

describe('5c. Sentence Frames tiers and word bank (optional generator extras)', () => {
  const starters = (items, extra = {}) => ({ id: 'sf', type: 'sentence-frames', data: { mode: 'list', frameType: 'Sentence Starters', items, ...extra } });
  const OLD = [{ text: 'I think that...' }, { text: 'The evidence shows...' }];
  const NEW = [{ text: 'I think that...', tier: 'emerging' }, { text: 'The evidence shows...', tier: 'bridging' }];
  const BANK = ['evaporation', 'condensation', 'precipitation'];
  it.each([[false], [true]])('badges each starter by tier and lists the word bank (teacher view: %s)', (isTeacherMode) => {
    const T = { 'scaffolds.tier_emerging': 'Emergente', 'scaffolds.word_bank': 'Banco de palabras' };
    const el = mount(M.SentenceFramesView, sfProps({ isTeacherMode, generatedContent: starters(NEW, { wordBank: BANK }), t: mapT(T) }));
    const tiers = [...el.querySelectorAll('[data-help-key="scaffolds_item"] [data-scaffold-tier]')];
    expect(tiers.map(n => [n.getAttribute('data-scaffold-tier'), n.textContent])).toEqual([['emerging', 'Emergente'], ['bridging', 'Bridging']]);
    const bank = el.querySelector('[data-scaffold-word-bank]');
    expect(document.getElementById(bank.getAttribute('aria-labelledby')).textContent).toBe('Banco de palabras');
    expect([...bank.querySelectorAll('li')].map(li => li.textContent)).toEqual(BANK);
  });
  it('shows the word bank on paragraph frames too, with English fallbacks', () => {
    const el = mount(M.SentenceFramesView, sfProps({ generatedContent: { id: 'p', type: 'sentence-frames', data: { mode: 'paragraph', text: 'Water [verb] when heated.', wordBank: ['evaporates', 42, ''] } } }));
    const bank = el.querySelector('[data-scaffold-word-bank]');
    expect(bank.querySelector('h4').textContent).toBe('Word bank');
    expect([...bank.querySelectorAll('li')].map(li => li.textContent)).toEqual(['evaporates']);
  });
  it('an older scaffold without extras renders exactly as before (extras are purely additive)', () => {
    const oldHtml = mount(M.SentenceFramesView, sfProps({ generatedContent: starters(OLD) })).innerHTML;
    expect(host.querySelector('[data-scaffold-word-bank],[data-scaffold-tier]')).toBeNull();
    rerender(M.SentenceFramesView, sfProps({ generatedContent: starters(NEW, { wordBank: BANK }) }));
    const stripped = host.cloneNode(true);
    stripped.querySelectorAll('[data-scaffold-word-bank],[data-scaffold-tier]').forEach(n => n.remove());
    expect(stripped.innerHTML).toBe(oldHtml);
    rerender(M.SentenceFramesView, sfProps({ generatedContent: starters(OLD.map(i => ({ ...i, tier: 'advanced-ish' })), { wordBank: [] }) }));
    expect(host.innerHTML).toBe(oldHtml);
  });
});

const autoGradeDeps = reply => ({
  studentWorkInput: 'The water cycle moves water between the ocean, the air and the land.', generatedContent: { data: { rubric: 'Explains evaporation' } },
  validateDraftQuality: () => ({ isValid: true }), setIsGrading: vi.fn(), setGenerationStep: vi.fn(), setGradingResult: vi.fn(), setError: vi.fn(),
  callGemini: vi.fn(async () => typeof reply === 'string' ? reply : JSON.stringify(reply)), cleanJson: s => s, addToast: vi.fn(), t: keyT, warnLog: vi.fn(),
  isBotVisible: false, alloBotRef: { current: null }, gradeLevel: '5th Grade', sourceTopic: 'Water',
});
describe('5b. Auto-Grade stores only a complete grading reply', () => {
  const VALID = { scores: [{ criteria: 'Accuracy', score: '4/5', comment: 'Good' }], totalScore: '4/5', feedback: { glow: 'Clear', grow: 'Add detail' } };
  it.each([
    ['no scores', { totalScore: '3/5', feedback: { glow: 'a', grow: 'b' } }],
    ['empty scores', { ...VALID, scores: [] }],
    ['no feedback', { scores: VALID.scores, totalScore: '4/5' }],
    ['feedback without grow', { ...VALID, feedback: { glow: 'a' } }],
    ['score rows without criteria', { ...VALID, scores: [{ score: '1' }] }],
    ['no total', { scores: VALID.scores, feedback: VALID.feedback }],
    ['not JSON', 'Sorry, I cannot grade this.'],
  ])('%s: shows an error toast and stores nothing', async (_, reply) => {
    const d = autoGradeDeps(reply);
    await createHostHandlers(d).handleAutoGrade();
    expect(d.setGradingResult.mock.calls.every(([v]) => v === null), 'only the reset to null').toBe(true);
    expect(d.addToast).toHaveBeenCalledWith('scaffolds.grading_failed', 'error');
    expect(d.setIsGrading).toHaveBeenLastCalledWith(false);
  });
  it('a complete reply is stored and announced', async () => {
    const d = autoGradeDeps(VALID);
    await createHostHandlers(d).handleAutoGrade();
    expect(d.setGradingResult).toHaveBeenLastCalledWith(VALID);
    expect(d.addToast).toHaveBeenCalledWith('scaffolds.grading_complete', 'success');
  });
});

// ── 6. Submit Work carries Activities as the student projection ──────────
describe('6. brainstorm (Activities) in the submission payload', () => {
  const activity = { id: 'act-1', type: 'brainstorm', title: 'Talk it out', data: [{ kind: 'discussion', title: 'Seminar', protocol: 'Socratic', grouping: 'pairs', openingQuestion: 'Why does water move?',
    questionSets: [{ depth: 'surface', questions: ['What is evaporation?'] }], talkStems: { agree: ['I agree because'] },
    facilitationNotes: 'TEACHER_FACILITATION_SECRET', lookFors: ['LOOKFOR_SECRET'], answerKey: 'ANSWER_KEY_SECRET', modelAnswer: 'MODEL_ANSWER_SECRET' }] };
  async function submit() {
    const downloadSubmissionBackup = vi.fn();
    const deps = { history: [activity], studentResponses: { 'act-1': { q0: 'Because the sun heats it' } }, sanitizeSubmissionData: items => items, studentNickname: 'Blue Fox', studentProjectSettings: {},
      sourceTopic: 'Water', generatedContent: activity, alloStableAssignmentId: () => 'assignment-1', t: keyT, pasteEvents: [], adventureState: { level: 1 }, globalPoints: 0, gameCompletions: {},
      _alloCheckpointRecordsRef: { current: [] }, _alloLedgerRef: { current: null }, downloadSubmissionBackup, addToast: vi.fn(), setIsSaveActionPulsing: vi.fn(), activeSessionCode: null };
    const result = await createHostHandlers(deps).handleSubmitAssignment('Blue Fox', {});
    expect(result).toMatchObject({ ok: true });
    return downloadSubmissionBackup.mock.calls[0][0];
  }
  it('sends the projected activity beside the student\'s answers, without teacher-only fields', async () => {
    const payload = await submit();
    const sent = payload.content.find(item => item.id === 'act-1');
    expect(sent).toMatchObject({ type: 'brainstorm', studentProjection: true });
    expect(sent.data[0].openingQuestion).toBe('Why does water move?');
    expect(payload.answers['act-1']).toEqual({ q0: 'Because the sun heats it' });
    const json = JSON.stringify(payload.content);
    for (const s of ['TEACHER_FACILITATION_SECRET', 'LOOKFOR_SECRET', 'ANSWER_KEY_SECRET', 'MODEL_ANSWER_SECRET', 'facilitationNotes', 'lookFors', 'answerKey']) expect(json.includes(s), s).toBe(false);
  });
  it('omits the activity when the projection is not available', async () => {
    const saved = window.AlloModules.BrainstormView;
    delete window.AlloModules.BrainstormView;
    try {
      const payload = await submit();
      expect(payload.content.some(item => item.type === 'brainstorm')).toBe(false);
      expect(JSON.stringify(payload.content)).not.toContain('SECRET');
    } finally { window.AlloModules.BrainstormView = saved; }
  });
});
