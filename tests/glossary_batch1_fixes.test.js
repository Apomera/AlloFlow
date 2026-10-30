// Glossary review fixes (2026-10-19), checked on the shipped code.
//
// Each block names the defect it pins. The glossary view and the games are
// mounted from their built modules; the host search filter, the export paths and
// the Document Builder run from the files the app loads.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';
import { React, ReactDOMClient, act, mountGame } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const UI = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const realT = (key, params = {}) => {
  let value = String(key).split('.').reduce((o, k) => o && o[k], UI);
  if (typeof value !== 'string') return undefined;
  Object.keys(params || {}).forEach((p) => { value = value.replace('{' + p + '}', params[p]); });
  return value;
};

beforeAll(() => {
  window.React = React;
  // GLOSSARY_VIEW_MODULE lets a reviewer point this file at an older build.
  new Function(readFileSync(process.env.GLOSSARY_VIEW_MODULE || 'view_glossary_module.js', 'utf8'))();
  loadAlloModule('host_handlers_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_module.js');
});

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? React.createElement('p', { 'data-crash': '1' }, String(this.state.error.message)) : this.props.children; }
}
function mountView(element) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  act(() => root.render(React.createElement(Boundary, null, element)));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); quiet.mockRestore(); });
  return container;
}
const view = (props) => React.createElement(window.AlloModules.GlossaryView, props);
const twoTerms = () => {
  const base = glossaryMediaProps().generatedContent.data[0];
  return [base, { entryId: 'root', term: 'Root', def: 'The part of a plant under the ground.', tier: 'Domain-Specific', translations: {} }];
};

describe('a finished screening battery no longer crashes the glossary', () => {
  it('opens normally, without rendering the results dialog it cannot run', () => {
    const container = mountView(view(glossaryMediaProps({
      screenerSession: { status: 'complete', student: 'Ana', grade: '2', form: 'A', subtests: ['lnf'], currentIndex: 1, results: [{ activity: 'lnf', correct: 5, total: 10, accuracy: 50 }] },
      rosterQueue: ['Ben'], setScreenerSession: vi.fn(), setRosterQueue: vi.fn(),
    })));
    expect(container.querySelector('[data-crash]')?.textContent, 'the content-viewer error card').toBeUndefined();
    expect(container.textContent).toContain('Leaf');
    expect(document.querySelector('#glossary-screener-results-title')).toBeNull();
  });
});

describe('health-check labels with the real strings', () => {
  const tools = (container) => {
    act(() => [...container.querySelectorAll('button')].find((b) => b.getAttribute('aria-controls') === 'glossary-teacher-tools').click());
    // [id=...]: two mounts share the id, and jsdom's scoped #id lookup then returns null.
    return [...container.querySelector('[id="glossary-teacher-tools"]').querySelectorAll('button')].map((b) => b.textContent.trim());
  };
  it('names the button for what it does, before and after a check', () => {
    const fresh = tools(mountView(view(glossaryMediaProps({ t: realT }))));
    expect(fresh).toContain('Run health check');
    expect(fresh.join('|')).not.toContain('Check Answer');
    const checked = mountView(view(glossaryMediaProps({ t: realT, glossaryHealthCheck: { overallScore: 4, definitionGradeLevel: 'Grade 5', summary: 'ok' } })));
    expect(tools(checked)).toContain('Re-run health check');
  });
  it('titles the panel "Glossary Health Check", not "Composite Accuracy"', () => {
    const container = mountView(view(glossaryMediaProps({ t: realT, glossaryHealthCheck: { overallScore: 4, definitionGradeLevel: 'Grade 5', summary: 'ok' }, showHealthCheckPanel: true })));
    expect(container.querySelector('#glossary-health-check-title')?.textContent).toBe('Glossary Health Check');
  });
});

describe('flashcards', () => {
  function Deck({ extra = {}, onState }) {
    const [index, setIndex] = React.useState(0);
    const [quiz, setQuiz] = React.useState(!!extra.isFlashcardQuizMode);
    const [lang, setLang] = React.useState(extra.standardDeckLang || 'English Only');
    onState && onState({ setLang, index, quiz });
    const data = twoTerms();
    return view(glossaryMediaProps({
      t: realT, isInteractiveFlashcards: true, generatedContent: { id: 'deck', type: 'glossary', data },
      filteredGlossaryData: data.map((item, i) => ({ ...item, _originalIdx: i })),
      flashcardIndex: index, setFlashcardIndex: (v) => setIndex(typeof v === 'function' ? v : () => v),
      isFlashcardQuizMode: quiz, setIsFlashcardQuizMode: setQuiz, standardDeckLang: lang, setStandardDeckLang: setLang,
      setQuizSelectedOption: () => {}, setFlashcardFeedback: () => {}, setFlashcardScore: () => {}, setFlashcardOptions: () => {},
      setIsFlashcardFlipped: () => {}, ...extra, isFlashcardQuizMode: quiz,
    }));
  }
  const dots = (container) => [...container.querySelectorAll('[role="dialog"] button')].map((b) => b.getAttribute('aria-label') || '').filter((l) => /Known|Needs practice/.test(l));

  it('self-rating buttons use the summary words "Known" / "Needs practice"', () => {
    const container = mountView(React.createElement(Deck));
    const rated = [...container.querySelectorAll('[role="dialog"] button[aria-pressed]')].map((b) => b.textContent.trim());
    expect(rated).toContain('Known');
    expect(rated).toContain('Needs practice');
    expect(rated).not.toContain('Correct');
    expect(rated).not.toContain('Try Again!');
  });

  it('switching to quiz mode keeps the ratings and the focus on the switch', () => {
    vi.useFakeTimers();
    const container = mountView(React.createElement(Deck));
    act(() => [...container.querySelectorAll('[role="dialog"] button[aria-pressed]')].find((b) => b.textContent.trim() === 'Known').click());
    act(() => { vi.runAllTimers(); });
    expect(dots(container).some((l) => l.includes('Known')), 'the rating is recorded').toBe(true);
    const toggle = container.querySelector(`[aria-label="${realT('flashcards.tooltip_toggle_quiz')}"]`);
    toggle.focus();
    act(() => toggle.click());
    act(() => { vi.runAllTimers(); });
    expect(dots(container).some((l) => l.includes('Known')), 'switching modes wiped the rating').toBe(true);
    expect(document.activeElement, 'focus jumped away (it used to land on Close)').toBe(container.querySelector(`[aria-label="${realT('flashcards.tooltip_toggle_quiz')}"]`));
  });

  it('adding a support language to the Standard Deck keeps the ratings', () => {
    vi.useFakeTimers();
    let api;
    const container = mountView(React.createElement(Deck, { onState: (s) => { api = s; } }));
    act(() => [...container.querySelectorAll('[role="dialog"] button[aria-pressed]')].find((b) => b.textContent.trim() === 'Known').click());
    act(() => { vi.runAllTimers(); });
    act(() => api.setLang('French'));
    expect(dots(container).some((l) => l.includes('Known'))).toBe(true);
  });

  describe('quiz answers', () => {
    const right = 'A plant part that captures sunlight.';
    const options = [right, 'The part of a plant under the ground.'];
    function quizProps(extra) {
      return { isFlashcardQuizMode: true, flashcardOptions: options, flashcardCorrectAnswer: (item) => item.def, ...extra };
    }
    it('a miss waits for Next and moves focus there, instead of moving on after 1.5 s', () => {
      vi.useFakeTimers();
      const calls = [];
      let index = 0;
      const container = mountView(React.createElement(Deck, { extra: quizProps({ handleQuizOptionClick: (e, option, onAdvance) => calls.push({ option, onAdvance }) }), onState: (s) => { index = s.index; } }));
      act(() => [...container.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent.startsWith('The part of a plant')).click());
      expect(calls).toHaveLength(1);
      act(() => { calls[0].onAdvance(); vi.runAllTimers(); });
      expect(index, 'the quiz moved on after a wrong answer').toBe(0);
      expect(document.activeElement?.getAttribute('data-help-key')).toBe('flashcard_next');
    });
    it('a correct answer still moves on by itself', () => {
      vi.useFakeTimers();
      const calls = [];
      let index = 0;
      const container = mountView(React.createElement(Deck, { extra: quizProps({ handleQuizOptionClick: (e, option, onAdvance) => calls.push({ option, onAdvance }) }), onState: (s) => { index = s.index; } }));
      act(() => [...container.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent.startsWith(right)).click());
      act(() => { calls[0].onAdvance(); vi.runAllTimers(); });
      expect(index).toBe(1);
    });
    it('says which answer was right, in words a screen reader reads', () => {
      const container = mountView(React.createElement(Deck, { extra: quizProps({ quizSelectedOption: options[1], flashcardFeedback: 'incorrect' }) }));
      expect(container.querySelector('[data-flashcard-quiz-feedback]')?.textContent).toBe('Not quite. The answer is: ' + right);
      const results = [...container.querySelectorAll('[data-quiz-option-result]')].map((s) => s.closest('button').textContent);
      expect(results.some((text) => text.startsWith(right) && text.includes('(correct answer)'))).toBe(true);
      expect(results.some((text) => text.startsWith('The part of a plant') && text.includes('(your answer)'))).toBe(true);
    });
  });

  it('splits a full-width colon in the Standard Deck support language', () => {
    const base = glossaryMediaProps().generatedContent.data[0];
    const data = [{ ...base, translations: { Chinese: '叶子：植物捕捉阳光的部分。' } }];
    const container = mountView(view(glossaryMediaProps({ isInteractiveFlashcards: true, generatedContent: { id: 'zh', type: 'glossary', data }, filteredGlossaryData: data.map((item, i) => ({ ...item, _originalIdx: i })), flashcardMode: 'standard', standardDeckLang: 'Chinese', setQuizSelectedOption: () => {} })));
    const front = container.querySelector('[data-flashcard-face="front"] h3 button');
    expect(front?.textContent).toBe('叶子');
    expect(front?.disabled).toBe(false);
  });
});

describe('the host search filter while editing', () => {
  const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  const filterSource = sliceBetween(anti, 'const glossarySearchKeepRef = useRef(null);', 'const getReadableContent = useCallback(', { file: 'AlloFlowANTI.txt', label: 'glossary search filter' });
  const makeFilter = () => {
    const ref = { current: null };
    const run = new Function('useRef', 'useMemo', 'generatedContent', 'glossarySearchTerm', 'glossaryFilter', 'isEditingGlossary', 'glossarySort', filterSource + '\nreturn filteredGlossaryData;');
    return (data, term, editing, filter = 'all', sort = 'lesson') => run(() => ref, (fn) => fn(), { type: 'glossary', data }, term, filter, editing, sort);
  };
  const words = (first) => [{ entryId: 'p', term: first, def: 'How plants make food.' }, { entryId: 'q', term: 'Leaf', def: 'A plant part.' }];

  it('keeps the row being corrected while its search term no longer matches', () => {
    const filter = makeFilter();
    expect(filter(words('Photosythesis'), 'Photosythesis', true).map((r) => r.entryId)).toEqual(['p']);
    expect(filter(words('Photosynthesis'), 'Photosythesis', true).map((r) => r.entryId), 'the edited row vanished mid-edit').toEqual(['p']);
  });
  it('filters normally once editing ends, and for a new search', () => {
    const filter = makeFilter();
    filter(words('Photosythesis'), 'Photosythesis', true);
    expect(filter(words('Photosynthesis'), 'Photosythesis', false)).toEqual([]);
    expect(filter(words('Photosynthesis'), 'leaf', true).map((r) => r.entryId)).toEqual(['q']);
  });
  it('survives entries without a term or a definition', () => {
    expect(makeFilter()([{ entryId: 'x' }, null, { term: 'Leaf' }], 'leaf', false).map((r) => r.term)).toEqual(['Leaf']);
  });
});

describe('game worksheets print from their own window', () => {
  const words = ['Leaf:A plant part', 'Root:Under the ground', 'Stem:Holds the plant up', 'Seed:Grows into a plant', 'Flower:Makes seeds'].map((pair) => { const [term, def] = pair.split(':'); return { term, def }; });
  function printWindow() {
    const written = [];
    const win = { document: { open() {}, write: (html) => written.push(html), close() {}, readyState: 'complete' }, focus: vi.fn(), print: vi.fn(), addEventListener: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(win);
    const appPrint = vi.spyOn(window, 'print').mockImplementation(() => {});
    return { html: () => written.join(''), win, appPrint };
  }
  function mount(name, props) {
    const game = mountGame(name, props);
    cleanups.push(() => game.unmount());
    return game.container;
  }

  it('Matching: the worksheet and its styles, never window.print() on the app', () => {
    vi.useFakeTimers();
    const io = printWindow();
    const container = mount('MatchingGame', { data: words, onClose: vi.fn() });
    act(() => container.querySelector('[data-help-key="matching_print_btn"]').click());
    act(() => { vi.runAllTimers(); });
    expect(io.html().includes('glossary-matching-sheet'), 'the printable sheet').toBe(true);
    expect(io.html().includes('allo-glossary-print-dialog'), 'the print rules it relies on').toBe(true);
    expect(io.win.print).toHaveBeenCalledOnce();
    expect(io.appPrint, 'Canvas ignores this').not.toHaveBeenCalled();
  });

  it('Crossword: students print the puzzle only; the answer key is a teacher-only button', () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 0));
    const io = printWindow();
    const student = mount('CrosswordGame', { data: words, onClose: vi.fn() });
    expect(student.querySelector('[data-crossword-print-key]'), 'students get no answer-key print').toBeNull();
    act(() => student.querySelector('[aria-label="glossary.print_puzzle"]').click());
    act(() => { vi.runAllTimers(); });
    expect(io.html().includes('data-crossword-answer-key'), 'the answer key page went to a student copy').toBe(false);
    const teacher = mount('CrosswordGame', { data: words, onClose: vi.fn(), isTeacherMode: true });
    act(() => teacher.querySelector('[data-crossword-print-key]').click());
    act(() => { vi.runAllTimers(); });
    expect(io.html().includes('data-crossword-answer-key'), 'the teacher asked for the key').toBe(true);
    expect(io.appPrint).not.toHaveBeenCalled();
  });

  it('says so when pop-ups are blocked and the app cannot print', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(window, 'print').mockImplementation(() => {});
    const toast = vi.fn();
    window.AlloFlowUX = { toast };
    cleanups.push(() => { delete window.AlloFlowUX; });
    const container = mount('MatchingGame', { data: words, onClose: vi.fn() });
    act(() => container.querySelector('[data-help-key="matching_print_btn"]').click());
    expect(toast).toHaveBeenCalledWith('toasts.pop_up_blocked_allow_pop', 'error');
  });
});

describe('flashcard HTML export', () => {
  const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
  function exportCards(data, mode = 'standard') {
    const blobs = [];
    vi.stubGlobal('Blob', class { constructor(parts) { this.parts = parts; blobs.push(this); } });
    const revoked = [];
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cards');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((u) => revoked.push(u));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    window.AlloModules.ModuleScopeExtras = { getSpeechLangCode: (n) => ({ Arabic: 'ar-SA', Chinese: 'zh-CN' })[n] || 'en-US', isRtlLang: (n) => n === 'Arabic' };
    cleanups.push(() => { delete window.AlloModules.ModuleScopeExtras; });
    const escapeXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    window.AlloModules.createExport({ liveRef: { current: { generatedContent: { type: 'glossary', data }, t: (k) => realT(k) || k, addToast: vi.fn() } }, escapeXml }).handleExportFlashcards(mode);
    return { html: blobs.at(-1).parts.join(''), revoked };
  }
  const data = [
    { term: 'Leaf', def: 'A plant part.', image, imageAlt: 'A leaf', translations: { Chinese: '叶子：植物的部分', Arabic: 'ورقة: جزء من النبات', Karen: 'lah: plant part' } },
    { term: 'Root', def: 'Under the ground.', translations: { Chinese: '根：地下的部分', Arabic: 'جذر: تحت الأرض', Karen: 'thaw: under' } },
  ];

  it('splits the full-width colon and marks each side with its language and direction', () => {
    vi.useFakeTimers();
    // Karen became a known language (kar) on 2026-10-29, so a made-up name now stands in
    // for "a language the export cannot identify".
    const withUnknown = data.map(item => ({ ...item, translations: { ...item.translations, 'Unlisted Language': item.term === 'Leaf' ? 'zib: plant part' : 'zab: under' } }));
    const { html } = exportCards(withUnknown);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const zh = [...doc.querySelectorAll('.secondary-text')].find((el) => el.textContent === '叶子');
    expect(zh, 'the Chinese term lost its card front').toBeTruthy();
    expect(zh.getAttribute('lang')).toBe('zh');
    const ar = [...doc.querySelectorAll('span[dir="rtl"]')].find((el) => el.textContent === 'جزء من النبات');
    expect(ar?.getAttribute('lang')).toBe('ar');
    const karen = [...doc.querySelectorAll('.secondary-text')].find((el) => el.textContent === 'lah');
    expect(karen.getAttribute('lang')).toBe('kar');
    expect(karen.getAttribute('dir')).toBe('ltr');
    const unknown = [...doc.querySelectorAll('.secondary-text')].find((el) => el.textContent === 'zib');
    expect(unknown.getAttribute('dir')).toBe('auto');
    expect(unknown.hasAttribute('lang'), 'an unknown language must not be labelled English').toBe(false);
  });

  it('writes each picture once, however many language sets repeat it', () => {
    vi.useFakeTimers();
    const { html } = exportCards(data);
    expect(html.split(image.replace(/"/g, '&quot;')).length - 1, 'copies of the picture data').toBe(1);
    expect(html.split('data-ci-src=').length - 1).toBe(2);
    expect(html.includes("querySelectorAll('img[data-ci-src]')")).toBe(true);
  });

  it('keeps the download link alive past the click, and names the page', () => {
    vi.useFakeTimers();
    const { html, revoked } = exportCards(data, 'language');
    expect(revoked).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(revoked).toEqual(['blob:cards']);
    expect(html.includes('<title>Flashcards -'), 'the English-only title').toBe(false);
  });
});

describe('Document Builder glossary section', () => {
  function pack(items, options = {}) {
    const pipeline = window.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Vocabulary', state: {} });
    return pipeline.generateFullPackHTML(items, 'Pack', true, {}, { includeGlossary: true, includeTeacherKey: false, annotations: [], ...options });
  }
  const glossary = (data) => ({ type: 'glossary', id: 'g1', title: 'Vocabulary', data });
  const tricky = [
    { term: 'Less than', def: 'When x<y the value x is smaller', translations: { Spanish: '<img src=x onerror="window.__glossaryXss=1">' } },
    { term: 'Leaf', def: 'A plant part' },
    { term: 'Root', def: 'Under the ground' },
  ];

  it.each(['table', 'flash-cards', 'language-cards'])('escapes definitions and translations (%s)', (mode) => {
    const doc = new DOMParser().parseFromString(pack([glossary(tricky)], { glossaryDisplayMode: mode }), 'text/html');
    expect(doc.querySelector('img[onerror]'), 'markup from a translation became an element').toBeNull();
    // Every mode shows both the definition and the translations somewhere.
    expect(doc.body.textContent.includes('When x<y the value x is smaller'), 'the definition was cut at "<"').toBe(true);
    expect(doc.body.textContent.includes('<img src=x onerror='), 'the translation text was lost').toBe(true);
    if (mode === 'flash-cards') expect(doc.querySelectorAll('.alloflow-glossary-card')).toHaveLength(3);
  });

  it('exports a glossary saved as a JSON string, or with empty entries, instead of failing the whole pack', () => {
    for (const data of [JSON.stringify([{ term: 'Leaf', def: 'A plant part' }]), [null, { term: 'Leaf', def: 'A plant part' }], undefined, [{ term: 'Leaf', def: 'A plant part', translations: 'oops' }]]) {
      let html;
      expect(() => { html = pack([glossary(data)]); }, JSON.stringify(data)).not.toThrow();
      if (data !== undefined) expect(html.includes('Leaf'), JSON.stringify(data)).toBe(true);
    }
  });
});

describe('export file names and dates', () => {
  const preview = readFileSync('view_export_preview_source.jsx', 'utf8');
  const exporter = readFileSync('export_source.jsx', 'utf8');
  it('keeps letters in any script in Document Builder and H5P file names', () => {
    const builderLine = sliceBetween(preview, "const safeTitle = String(clean?.title || 'document')", '\n', { includeEnd: false });
    const builder = new Function('clean', builderLine + '; return safeTitle;');
    expect(builder({ title: 'Фотосинтез: урок' })).toBe('Фотосинтез-урок');
    expect(builder({ title: 'Fotosíntesis' })).toBe('Fotosíntesis');
    expect(builder({ title: '光合作用' })).toBe('光合作用');
    const h5pLine = sliceBetween(exporter, "const safeTitle = String(title || '')", '\n');
    expect(new Function('title', h5pLine + '; return safeTitle;')('مفردات')).toBe('مفردات');
  });
  it('dates the NotebookLM export by the local day, not UTC', () => {
    vi.useFakeTimers();
    const offset = new Date(2026, 9, 19, 12).getTimezoneOffset();
    const local = offset > 0 ? new Date(2026, 9, 19, 23, 30) : new Date(2026, 9, 19, 0, 30);
    vi.setSystemTime(local);
    const dateCode = sliceBetween(preview, '// The local date: toISOString() is UTC', 'const title = (exportConfig', { label: 'NotebookLM date' });
    expect(new Function(dateCode + 'return today;')()).toBe('2026-10-19');
  });
});
