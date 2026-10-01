import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

// Reader deep improvements (2026-09-28): word help from a tap in Read mode, a
// card that never covers its word, a calmer surface, keyboard reach, a compact
// teacher review, folded student list and inline editing, and questions at the
// end of each section.
const require = createRequire(import.meta.url);
let React, createRoot, act, contract, View, pure, phase, root, host;
const VIEW = process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js';
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule('text_pipeline_helpers_module.js'); loadAlloModule('generation_helpers_module.js');
  contract = window.AlloModules.InstructionalContext; pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
});
const size = { width: window.innerWidth, height: window.innerHeight };
beforeEach(() => {
  localStorage.clear();
  delete window.AlloModules.SimplifiedView;
  new Function(readFileSync(VIEW, 'utf8'))();
  View = window.AlloModules.SimplifiedView;
  let queue = Promise.resolve();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } } });
  Element.prototype.scrollIntoView = () => {};
  if (!Range.prototype.getClientRects) Range.prototype.getClientRects = function () { return []; };
});
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = null; host = null;
  vi.restoreAllMocks(); delete navigator.locks; delete window.__alloGetReadAloudAudioSummary;
  setViewport(size.width, size.height);
});
function setViewport(width, height) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
}

const LONG = '## Herons\n\nThe heron walked slowly in the shallow water.\n\n## Food\n\nIt waited for a fish near the reeds. Then it struck fast.\n\n## Nests\n\nHerons build nests high in trees.\n\nThey return every spring.';
function item({ data = LONG, shown = true, words = ['shallow', 'reeds'] } = {}) {
  const original = contract.createSupportedReading(contract.createSourceSnapshot('The heron waded through the marsh.', { sourceArtifactId: 'src' }), { id: 'orig', sourceFamilyId: 'heron' });
  const base = { id: 'adapted-1', type: 'simplified', data, instructionalText: { form: 'adapted', role: 'supplemental' }, sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'heron', config: { language: 'English' } };
  let help;
  for (const quote of words) { const start = data.indexOf(quote); help = contract.upsertAdaptedReadingSupport(base, help, { id: 'w-' + quote, start, end: start + quote.length, quote, text: 'Meaning of ' + quote }); }
  if (help) base.adaptedReadingSupports = contract.setAdaptedReadingSupportsShown(base, help, shown);
  return base;
}
function mount(content, extra = {}) {
  const noop = () => {};
  let current = content;
  const onUpdateReadingSupports = vi.fn(async (owner, action) => {
    const help = current.adaptedReadingSupports;
    const saved = action.type === 'upsert' ? contract.upsertAdaptedReadingSupport(current, help, action.annotation)
      : action.type === 'remove' ? contract.removeAdaptedReadingSupport(current, help, action.id)
      : action.type === 'show' ? contract.setAdaptedReadingSupportsShown(current, help, action.shown === true) : help;
    current = { ...current, adaptedReadingSupports: saved }; render();
    return saved;
  });
  const props = () => ({ ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, inputText: '', gradeLevel: '5', complexityLevel: 5, leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [current], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: vi.fn(), callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], readingLearnerKey: 'learner|Blue Fox', onUpdateReadingSupports, ...extra, generatedContent: current });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = () => root.render(React.createElement(View, props()));
  act(render);
  return { rerender: next => { current = next; act(render); }, props };
}
const $ = selector => host.querySelector(selector);
const byText = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim().startsWith(text));
const click = async (node, init = {}) => { await act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, ...init })); }); };
const typeInto = async (node, value) => {
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
};
const sentenceWith = word => [...host.querySelectorAll('[data-reading-sentence]')].find(node => node.textContent.includes(word));
// Only the underlined word "shallow" has a box on screen; everything else is elsewhere.
const wordBoxes = () => vi.spyOn(Range.prototype, 'getClientRects').mockImplementation(function () { return this.toString() === 'shallow' ? [{ left: 100, right: 160, top: 50, bottom: 70 }] : []; });

describe('word help from a tap in Read mode', () => {
  it('a tap on an underlined word opens its help instead of reading aloud', async () => {
    const handleSpeak = vi.fn();
    mount(item(), { handleSpeak });
    wordBoxes();
    await click(sentenceWith('shallow'), { clientX: 120, clientY: 60 });
    expect($('[data-word-help-card]')?.textContent).toContain('Meaning of shallow');
    expect(handleSpeak).not.toHaveBeenCalled();
  });

  it('anywhere else in the sentence, and from the keyboard, Read mode still reads aloud', async () => {
    const handleSpeak = vi.fn();
    mount(item(), { handleSpeak });
    wordBoxes();
    await click(sentenceWith('shallow'), { clientX: 400, clientY: 60 });
    expect($('[data-word-help-card]')).toBeNull();
    expect(handleSpeak).toHaveBeenCalledTimes(1);
    await click(sentenceWith('shallow'), { clientX: 120, clientY: 60, detail: 0 }); // Enter/Space activation
    expect($('[data-word-help-card]')).toBeNull();
    expect(handleSpeak).toHaveBeenCalledTimes(2);
  });

  it('the Read banner says underlined words open word help', () => {
    mount(item());
    const banner = $('[data-reading-mode-status]').textContent;
    if (typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function') expect(banner).toContain('Underlined words open your teacher’s word help.');
    else expect(banner).not.toContain('Underlined words'); // no marks can be drawn, so no promise
  });
});

describe('the card never covers its word', () => {
  function geometry() {
    $('[data-reading-passage]').getBoundingClientRect = () => ({ left: 100, right: 700, top: 0, bottom: 900, width: 600, height: 900 });
    const word = $('[data-prepared-word-help]');
    word.getBoundingClientRect = () => ({ left: 300, right: 360, top: 200, bottom: 220, width: 60, height: 20 });
    return word;
  }
  it('sits in the margin beside the passage on a wide screen', async () => {
    setViewport(1280, 900);
    mount(item(), { interactionMode: 'define' });
    await click(geometry());
    const card = $('[data-word-help-card]');
    expect(card.style.left).toBe('712px'); // passage right edge + 12
    expect(card.style.top).toBe('192px'); // level with the word
  });

  it('is a bottom sheet on a phone, with the word lifted above it', async () => {
    setViewport(390, 844);
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    mount(item(), { interactionMode: 'define' });
    const word = geometry();
    word.getBoundingClientRect = () => ({ left: 40, right: 100, top: 680, bottom: 700, width: 60, height: 20 });
    await click(word);
    const card = $('[data-word-help-card]');
    expect([card.style.left, card.style.width, card.style.bottom]).toEqual(['8px', '374px', '8px']);
    expect(scrollBy).toHaveBeenCalledWith(0, 680 - 844 * 0.25);
  });

  it('closes and returns to the word when Tab leaves either end of the card', async () => {
    setViewport(1280, 900);
    mount(item(), { interactionMode: 'define' });
    const word = geometry();
    await act(async () => { word.focus(); });
    await click(word);
    const card = $('[data-word-help-card]');
    const stops = [...card.querySelectorAll('button:not([disabled])')];
    await act(async () => { stops[stops.length - 1].focus(); stops[stops.length - 1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); });
    expect($('[data-word-help-card]')).toBeNull();
    expect(document.activeElement).toBe(word);
  });
});

describe('a calmer reading surface', () => {
  it('shows no save line above the passage until there is work, and never for a place alone', async () => {
    mount(item());
    expect($('[data-reading-persistence]')).toBeNull(); // nothing to know yet
    await click($('[data-section-prompts-toggle]'));
    expect($('[data-section-prompts] [data-reading-persistence="ready"]')).not.toBeNull(); // where answers go is said here
  });

  it('keeps one banner box in every mode, so switching modes does not move the passage', () => {
    const view = mount(item());
    const box = cls => cls.split(/\s+/).filter(name => /^(border-2|px-3|py-2|rounded-xl)$/.test(name)).sort().join(' ');
    const read = box($('[data-reading-mode-status]').className);
    view.rerender(item()); act(() => root.render(React.createElement(View, { ...view.props(), interactionMode: 'define' })));
    expect(box($('[data-reading-mode-status]').className)).toBe(read);
    expect(read).toBe('border-2 px-3 py-2 rounded-xl');
    for (const file of ['app_styles_source.jsx', 'app_styles_module.js']) {
      const css = readFileSync(file, 'utf8');
      expect(css).toContain('[data-adapted-reader] [data-reading-mode-status] { min-height: 3.75rem;');
      expect(css).toContain('@media (max-width: 639px) { [data-adapted-reader] [data-reading-mode-status] { min-height: 7rem; } }');
    }
  });

  it('does not tell touch-only readers to use arrow keys', () => {
    const media = query => ({ matches: query === '(pointer: coarse)', media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    const original = window.matchMedia; window.matchMedia = media; // jsdom has none to spy on
    try {
      mount(item(), { interactionMode: 'phonics' });
      expect($('[data-reading-mode-status]').textContent).not.toContain('arrows');
    } finally { window.matchMedia = original; }
  });

  it('keeps arrow-key advice for keyboard and mouse readers', () => {
    mount(item(), { interactionMode: 'phonics' });
    expect($('[data-reading-mode-status]').textContent).toContain('Left and Right arrows');
  });
});

describe('keyboard reach', () => {
  it('in Word meaning, Tab reaches a paragraph at its first underlined word', () => {
    mount(item(), { interactionMode: 'define' });
    const paragraph = $('[data-reading-passage] [data-reading-paragraph="1"]');
    const words = [...paragraph.querySelectorAll('[data-reading-word]')];
    const shallow = words.find(node => node.textContent === 'shallow');
    expect(shallow.getAttribute('data-prepared-word-help')).toBe('w-shallow');
    expect(shallow.tabIndex).toBe(0);
    expect(words.filter(node => node.tabIndex === 0)).toEqual([shallow]); // still one stop per paragraph
  });
});

describe('teacher review', () => {
  const teacher = { isTeacherMode: true, isZenMode: false, readingLearnerKey: 'teacher|default' };
  it('is one line of chips while everything is fine', () => {
    window.__alloGetReadAloudAudioSummary = texts => ({ ready: texts.length, stale: 0 });
    mount(item(), teacher);
    const details = $('[data-teacher-review-summary] [data-review-details]');
    expect(details.open).toBe(false);
    expect([...host.querySelectorAll('[data-review-chip]')].map(chip => chip.getAttribute('data-review-chip'))).toEqual(expect.arrayContaining(['text', 'help']));
    expect($('[data-review-chip="text"]').textContent).toContain('Text unchanged');
  });

  it('"Text changed" lasts until the teacher marks it reviewed, across reloads', async () => {
    window.__alloGetReadAloudAudioSummary = texts => ({ ready: texts.length, stale: 0 });
    // A real reload: the module (and anything it kept in memory) starts again.
    const reload = () => { act(() => root.unmount()); host.remove(); root = null; delete window.AlloModules.SimplifiedView; new Function(readFileSync(VIEW, 'utf8'))(); View = window.AlloModules.SimplifiedView; };
    mount(item(), teacher);
    reload();
    const edited = item({ data: LONG.replace('slowly', 'carefully') });
    mount(edited, teacher);
    expect($('[data-review-state="text"]').textContent).toContain('Text changed');
    expect($('[data-review-details]').open).toBe(true); // needs attention, so it opens itself
    reload();
    mount(edited, teacher); // a reload does not reset it
    expect($('[data-review-state="text"]').textContent).toContain('Text changed');
    await click($('[data-review-action="mark-reviewed"]'));
    expect($('[data-review-state="text"]').textContent).toContain('Text unchanged');
    reload();
    mount(edited, teacher);
    expect($('[data-review-state="text"]').textContent).toContain('Text unchanged');
  });

  it('the adaptation preview warns that word help will be hidden, and counts the changes', async () => {
    const changed = LONG.replace('in the shallow water', 'in the water');
    const handleComplexityAdjustment = vi.fn(async () => ({ status: 'preview', resourceId: 'adapted-1', baseData: LONG, data: changed, config: { language: 'English' } }));
    mount(item(), { ...teacher, isTeacherToolbarExpanded: true, handleComplexityAdjustment });
    await click($('[data-adapt-option="shorterSentences"]'));
    await click($('[data-apply-complexity]'));
    expect($('[data-adaptation-help-impact]').textContent).toContain('students will not see word help until you review it. 1 of 2 explanations still match');
    expect($('[data-adaptation-change-count]').textContent).toBe('One change.');
  });

  it('folds the student word list for teachers, and edits a word where it is listed', async () => {
    mount(item(), teacher);
    const folded = $('[data-adapted-word-help-student-view]');
    expect(folded.open).toBe(false);
    expect(folded.querySelector('[data-adapted-word-help]')).not.toBeNull();
    const toggle = byText('Review word supports'); if (toggle && toggle.getAttribute('aria-expanded') === 'false') await click(toggle);
    const panel = $('[data-adapted-word-help-teacher]'); if (panel && !panel.open) act(() => { panel.open = true; });
    await click(host.querySelector('button[aria-label^="Edit word help: reeds"]'));
    const row = [...host.querySelectorAll('[data-gloss-entry]')].find(node => node.textContent.includes('reeds'));
    expect(row.querySelector('[data-gloss-draft]')).not.toBeNull(); // the form opens in that entry
  });

  it('students still get the list unfolded', () => {
    mount(item());
    expect($('[data-adapted-word-help-student-view]')).toBeNull();
    expect($('[data-adapted-word-help]')).not.toBeNull();
  });

  it('keeps the narration strip to one row until it is opened', () => {
    const src = readFileSync(process.env.ALLO_VIEW_SOURCE_CANDIDATE || 'view_simplified_source.jsx', 'utf8');
    const strip = src.slice(src.indexOf('var renderEditAudioSentenceTools = function () {'), src.indexOf('var instructionalTextProfile = getSimplifiedInstructionalText(generatedContent);'));
    expect(strip).toContain("className={editAudioOpen ? 'px-3 pt-3 text-sm font-semibold text-slate-800' : 'sr-only'}");
    expect(strip).toContain('{editAudioOpen && <><button type="button" onClick={copyTtsDiagnostics}');
  });
});

describe('unnamed learners sharing one page', () => {
  const remount = extra => { act(() => root.unmount()); host.remove(); root = null; return mount(item(), extra); };
  const answer = () => $('[data-section-prompts-area] [data-section-prompt="mainIdea"]').value;
  it('the same learner coming back keeps their work; the next learner starts fresh', async () => {
    mount(item(), { readingLearnerKey: '', readingLearnerSession: 'A' });
    await click($('[data-section-prompts-toggle]'));
    await typeInto($('[data-section-prompt="mainIdea"]'), 'Student A answer');
    remount({ readingLearnerKey: '', readingLearnerSession: 'A' });
    await click($('[data-section-prompts-toggle]'));
    expect(answer()).toBe('Student A answer');
    remount({ readingLearnerKey: '', readingLearnerSession: 'B' });
    await click($('[data-section-prompts-toggle]'));
    expect(answer()).toBe('');
    expect($('[data-reading-continue]')).toBeNull();
  });

  it('an unnamed reader can clear their own work, after confirming', async () => {
    mount(item(), { readingLearnerKey: '' });
    await click($('[data-section-prompts-toggle]'));
    await typeInto($('[data-section-prompt="mainIdea"]'), 'Mine');
    await click($('[data-section-prompts] [data-reading-clear]'));
    expect($('[data-reading-clear-confirm]').textContent).toContain('The next reader starts fresh.');
    await click($('[data-reading-clear-yes]'));
    expect(answer()).toBe('');
    expect($('[data-reading-place-notice]').textContent).toBe('Your reading work was cleared from this page.');
    remount({ readingLearnerKey: '' });
    await click($('[data-section-prompts-toggle]'));
    expect(answer()).toBe('');
  });

  it('named learners never see the clear button, and keep their saved work', async () => {
    mount(item());
    await click($('[data-section-prompts-toggle]'));
    await typeInto($('[data-section-prompt="mainIdea"]'), 'Saved answer');
    expect($('[data-reading-clear]')).toBeNull();
  });

  it('the store forgets only unnamed page work', async () => {
    const createStore = new Function(readFileSync('reader_place_store.js', 'utf8') + '; return createReadingPlaceStore;')();
    let raw = null, queue = Promise.resolve();
    const store = createStore({ getStorage: () => ({ getItem: () => raw, setItem: (_k, v) => { raw = v; } }), getLocks: () => ({ request: (_k, cb) => (queue = queue.then(cb)) }) });
    const scope = learner => ({ learner, itemId: 'r', fingerprint: 'f', text: 'Text.' });
    await store.save(scope(''), { responses: { 0: { mainIdea: 'anon' } } });
    await store.save(scope('learner|Blue'), { responses: { 0: { mainIdea: 'named' } } });
    store.forgetAnonymous();
    expect(store.peek(scope('')).place.responses[0]).toBeUndefined();
    expect(store.peek(scope('learner|Blue')).place.responses[0].mainIdea).toBe('named');
  });
});

describe('questions at the end of each section', () => {
  it('each section ends with its own button, the questions open there, and answered sections are marked', async () => {
    mount(item());
    const buttons = [...host.querySelectorAll('[data-section-think-toggle]')];
    expect(buttons).toHaveLength(3);
    // after the last paragraph of "Food" (paragraph 3), before "Nests"
    const food = $('[data-section-think="1"]');
    expect(food.previousElementSibling.getAttribute('data-reading-paragraph')).toBe('3');
    await click(food.querySelector('[data-section-think-toggle]'));
    expect(food.querySelector('[data-section-prompts]')).not.toBeNull();
    expect(food.querySelector('[data-section-prompts-section]').value).toBe('1');
    expect($('[data-section-prompts-area] [data-section-prompts]')).toBeNull(); // not twice
    await typeInto(food.querySelector('[data-section-prompt="mainIdea"]'), 'Herons wait, then strike.');
    expect(food.querySelector('[data-section-think-toggle]').textContent).toContain('✓');
    expect(food.querySelector('[data-section-think-toggle]').textContent).toContain('answered');
    expect($('[data-section-think="0"] [data-section-think-toggle]').textContent).not.toContain('✓');
  });
});
