// Start blank (2026-10-28): a teacher creates an empty Assess, Glossary, Timeline,
// Concept Sort or Anchor Chart and fills it in by hand, with no AI call. Covers the
// dispatcher, the host (AlloFlowANTI.txt) handlers and edit-mode effect, the
// delivery guard (student copies, live sessions), the sidebar "Other ways to start"
// control, and the Concept Sort / Anchor Chart editors that now work from empty.
// ALLO_*_CANDIDATE env vars point at mutated copies for mutation checks.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const read = (env, file) => readFileSync(process.env[env] || file, 'utf8');
const DISPATCHER = read('ALLO_DISPATCHER_CANDIDATE', 'generate_dispatcher_source.jsx');
const ANTI = read('ALLO_ANTI_CANDIDATE', 'AlloFlowANTI.txt');
const SIDEBAR = read('ALLO_SIDEBAR_CANDIDATE', 'view_sidebar_panels_module.js');
const BLANK_TYPES = ['quiz', 'glossary', 'timeline', 'concept-sort', 'anchor-chart'];
const noop = () => {};
const CALLED = new Set([...DISPATCHER.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));

// Slice a declaration by matching its braces from the body brace.
function sliceBlock(text, start) {
  const at = text.indexOf(start);
  expect(at, 'missing ' + start).toBeGreaterThanOrEqual(0);
  const body = /\)\s*\{|=>\s*\{/g; body.lastIndex = at;
  let depth = 0, i = body.exec(text).index;
  for (; i < text.length; i++) { if (text[i] === '{') depth++; else if (text[i] === '}' && --depth === 0) break; }
  return text.slice(at, i + 1);
}

let dispatcher;
beforeAll(() => {
  window.React = React;
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('allo_data_module.js');
  new Function(DISPATCHER)();
  dispatcher = window.AlloModules.GenDispatcher;
  loadAlloModule(process.env.ALLO_LIVE_AAC_CANDIDATE || 'live_aac_module.js');
  loadAlloModule(process.env.ALLO_FIRESTORE_CANDIDATE || 'firestore_sync_module.js');
  loadAlloModule('studio_response_module.js');
  loadAlloModule(process.env.ALLO_ANCHOR_CANDIDATE || 'anchor_charts_module.js');
  loadAlloModule(process.env.ALLO_CONCEPT_SORT_CANDIDATE || 'view_concept_sort_module.js');
});
const mounted = [];
afterEach(() => { mounted.splice(0).forEach(({ root, host }) => { act(() => root.unmount()); host.remove(); }); delete window.__alloResolveAiCapability; });
function render(type, props) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(type, props)));
  mounted.push({ root, host });
  return host;
}

function fixture(overrides = {}) {
  const callGemini = vi.fn(async () => '[]');
  const saved = [];
  const setHistory = vi.fn(update => { const next = typeof update === 'function' ? update([]) : update; if (Array.isArray(next)) saved.push(...next); });
  const deps = new Proxy({
    gradeLevel: '5th Grade', history: [], inputText: '', activeUnitId: 'lesson', selectedReadingSourceId: '',
    differentiationRange: 'None', leveledTextLanguage: 'English', selectedLanguages: [], studentInterests: [],
    guidedMode: false, guidedStep: 0, standardsInput: '', targetStandards: [], standardsPromptString: '', sourceTopic: '',
    currentUiLanguage: 'English', generatedContent: null, audioRef: { current: null }, alloBotRef: { current: null },
    GUIDED_STEPS: [], callGemini, setHistory, callImagen: vi.fn(),
    extractSourceTextForProcessing: text => ({ text, englishBlock: '', isBilingual: false }), cleanJson: String,
    getGroupDifferentiationContext: () => '', getDefaultTitle: type => type, t: key => key,
    resolveTranslationPolicy: () => ({ enabled: false, target: 'English' }), chunkText: text => [text],
    countWords: text => text.trim().split(/\s+/).length, formatLessonDNA: () => '', selectedConcepts: [],
    TIMELINE_MODE_DEFINITIONS: window.AlloModules.AlloData.TIMELINE_MODE_DEFINITIONS, timelineMode: 'auto', faqCount: 3,
    ...overrides,
  }, { get: (target, key) => key in target ? target[key] : (typeof key === 'string' && CALLED.has(key) ? noop : undefined) });
  return { deps, callGemini, saved };
}
async function generate(type, f, seed) {
  let error = null;
  try { await dispatcher.handleGenerate(type, null, false, null, { rethrowErrors: true, ...(seed ? { seed } : {}) }, true, f.deps); }
  catch (e) { error = e; }
  return error;
}
const BLANK = { kind: 'blank' };

describe('dispatcher: blank resources', () => {
  it.each(BLANK_TYPES)('%s is created empty, with no AI call and no source', async type => {
    const addToast = vi.fn();
    const f = fixture({ addToast, t: (key, params) => key === 'toasts.blank_created' ? `Blank ${params.title} created. Fill it in before sharing.` : key });
    const error = await generate(type, f, BLANK);
    expect(error, String(error)).toBe(null);
    expect(f.callGemini).not.toHaveBeenCalled();
    const messages = addToast.mock.calls.map(call => String(call[0]));
    expect(messages.some(m => /^Blank .* created\. Fill it in before sharing\.$/.test(m)), messages.join(' | ')).toBe(true);
    expect(messages.some(m => /generated!/.test(m)), 'a blank start is not "generated"').toBe(false);
    const item = f.saved.find(entry => entry && entry.type === type);
    expect(item, type + ' saved').toBeTruthy();
    expect(item.data).toEqual(dispatcher.blankResourceContent(type));
    expect(item.lessonPath).toEqual({ seed: { kind: 'blank' } });
    expect(dispatcher.hasMinimumContent(type, item.data), 'blank starts empty').toBe(false);
  });

  it('the empty shapes are the ones each editor accepts', () => {
    expect(dispatcher.blankResourceContent('quiz')).toEqual({ questions: [], reflections: [] });
    expect(dispatcher.blankResourceContent('glossary')).toEqual([]);
    expect(dispatcher.blankResourceContent('concept-sort')).toEqual({ categories: [], items: [] });
    expect(dispatcher.blankResourceContent('anchor-chart')).toEqual({ title: '', chartType: 'reference', sections: [] });
    expect(dispatcher.blankResourceContent('timeline')).toMatchObject({ items: [] });
    expect(dispatcher.BLANK_START_TYPES).toEqual(BLANK_TYPES);
  });

  it('a blank start ignores the passage: still no AI call when a source exists', async () => {
    const f = fixture({ inputText: 'The Moon orbits Earth about once every 27 days and pulls on the oceans.' });
    await generate('quiz', f, BLANK);
    expect(f.callGemini).not.toHaveBeenCalled();
    expect(f.saved.find(entry => entry && entry.type === 'quiz').data.questions).toEqual([]);
  });

  it.each(['faq', 'simplified', 'lesson-plan'])('%s cannot start blank: the gate still stops it without a source', async type => {
    const f = fixture();
    const error = await generate(type, f, BLANK);
    expect(error && error.code).toBe('allo/source-missing');
    expect(f.callGemini).not.toHaveBeenCalled();
  });
});

describe('delivery: an unfilled blank never reaches students', () => {
  const blankQuiz = (questions = []) => ({ id: 'q-blank', type: 'quiz', title: 'Quiz', data: { questions, reflections: [] }, lessonPath: { seed: { kind: 'blank' } } });
  const filled = [{ type: 'mcq', question: 'What orbits Earth?', options: ['The Moon', 'Mars'], correctAnswer: 'The Moon' }];
  const pack = item => window.AlloModules.LiveAac.serializeResourceForStudentPack(item, { sanitizeHistoryForCloud: items => items.map(entry => ({ ...entry })), stripUndefined: v => v });

  it('student copies leave out an unfilled blank and pack it once filled, without lessonPath', () => {
    expect(pack(blankQuiz())).toBe(null);
    const packed = pack(blankQuiz(filled));
    expect(packed).toBeTruthy();
    expect('lessonPath' in packed).toBe(false);
  });

  it('live sessions leave out an unfilled blank and strip lessonPath from everything else', () => {
    const normal = { id: 'g-1', type: 'glossary', title: 'Glossary', data: [{ term: 'orbit', def: 'a path around' }] };
    const result = window.prepareSessionResourcesForWrite([blankQuiz(), blankQuiz(filled), normal], { maxBytes: 200000 });
    const ids = result.resources.map(r => r.id);
    expect(ids.filter(id => id === 'q-blank')).toHaveLength(1);
    expect(ids).toContain('g-1');
    expect(JSON.stringify(result.resources)).not.toContain('lessonPath');
    expect(result.resources.find(r => r.id === 'q-blank').data.questions).toHaveLength(1);
  });
});

describe('host (AlloFlowANTI.txt): editors and edit mode', () => {
  const useCallback = fn => fn;
  function conceptSortHandlers(start) {
    let data = start;
    const csUpdateData = mutator => { data = mutator(data); return true; };
    const block = ['const csNewId = ', 'const csAddCategory = useCallback(', 'const csDeleteCategory = useCallback(', 'const csAddItemManual = useCallback(']
      .map(mark => mark === 'const csNewId = ' ? ANTI.slice(ANTI.indexOf(mark), ANTI.indexOf('\n', ANTI.indexOf(mark))) : sliceBlock(ANTI, mark) + ', [csUpdateData]);').join('\n');
    const api = new Function('useCallback', 'csUpdateData', 'csInvalidateAsyncRun', block + '\nreturn { csAddCategory, csDeleteCategory, csAddItemManual };')(useCallback, csUpdateData, noop);
    return { api, get data() { return data; } };
  }

  it('Concept Sort: add categories with distinct colors, add typed cards, delete a category but keep its cards', () => {
    const h = conceptSortHandlers({ categories: [], items: [] });
    h.api.csAddCategory('  Renewable  ');
    h.api.csAddCategory('Non-renewable');
    h.api.csAddCategory('   ');
    expect(h.data.categories.map(c => c.label)).toEqual(['Renewable', 'Non-renewable']);
    expect(new Set(h.data.categories.map(c => c.color)).size).toBe(2);
    expect(new Set(h.data.categories.map(c => c.id)).size).toBe(2);
    const [renewable] = h.data.categories;
    h.api.csAddItemManual(renewable.id, ' Solar power ');
    h.api.csAddItemManual(renewable.id, '');
    expect(h.data.items).toEqual([expect.objectContaining({ content: 'Solar power', categoryId: renewable.id, image: null })]);
    h.api.csDeleteCategory(renewable.id);
    expect(h.data.categories.map(c => c.label)).toEqual(['Non-renewable']);
    expect(h.data.items, 'cards stay, to be re-filed under Uncategorized').toHaveLength(1);
  });

  it('Glossary: "Add as typed" appends an entry with no AI and an id', () => {
    const origin = { id: 'g-blank', type: 'glossary', data: [] };
    let shown = origin, history = [origin];
    const fn = new Function('generatedContent', 'isTeacherMode', 'setGeneratedContent', 'setHistory', 'window',
      sliceBlock(ANTI, 'const handleAddGlossaryTermAsTyped = (') + '\nreturn handleAddGlossaryTermAsTyped;')(
      origin, true, update => { shown = update(shown); }, update => { history = update(history); }, { AlloModules: { createGlossaryEntryId: () => 'entry-1' } });
    expect(fn('  photosynthesis ')).toBe(true);
    expect(fn('   ')).toBe(false);
    expect(shown.data).toEqual([{ term: 'photosynthesis', def: '', tier: 'Academic', entryId: 'entry-1' }]);
    expect(history[0].data).toEqual(shown.data);
  });

  it('opens an unfilled blank Assess / Glossary / Timeline in edit mode, and nothing else', () => {
    const start = ANTI.indexOf('  const isUnfilledBlankDraft = (item) => {');
    const end = ANTI.indexOf('}, [generatedContent?.id, isTeacherMode]);', start) + '}, [generatedContent?.id, isTeacherMode]);'.length;
    expect(start).toBeGreaterThan(0);
    const run = (generatedContent, isTeacherMode = true) => {
      const set = { quiz: vi.fn(), glossary: vi.fn(), timeline: vi.fn() };
      new Function('React', 'window', 'generatedContent', 'isTeacherMode', 'setIsEditingQuiz', 'setIsEditingGlossary', 'setIsEditingTimeline', ANTI.slice(start, end))(
        { useEffect: fn => fn() }, window, generatedContent, isTeacherMode, set.quiz, set.glossary, set.timeline);
      return set;
    };
    const blank = type => ({ id: type + '-b', type, data: dispatcher.blankResourceContent(type), lessonPath: { seed: { kind: 'blank' } } });
    expect(run(blank('quiz')).quiz).toHaveBeenCalledWith(true);
    expect(run(blank('glossary')).glossary).toHaveBeenCalledWith(true);
    expect(run(blank('timeline')).timeline).toHaveBeenCalledWith(true);
    const filledQuiz = { ...blank('quiz'), data: { questions: [{ question: 'Why?' }], reflections: [] } };
    expect(run(filledQuiz).quiz).not.toHaveBeenCalled();
    expect(run({ id: 'q', type: 'quiz', data: { questions: [] } }).quiz, 'not a blank start').not.toHaveBeenCalled();
    expect(run(blank('quiz'), false).quiz, 'students never get edit mode').not.toHaveBeenCalled();
  });

  it('Assess: "Remove reflection" drops exactly one reflection, teachers only', () => {
    const origin = { id: 'q-1', type: 'quiz', data: { questions: [], reflections: ['A', { text: '' }, 'C'] } };
    const make = (teacher) => {
      const state = { shown: origin, history: [origin] };
      const fn = new Function('generatedContent', 'isTeacherMode', 'setGeneratedContent', 'setHistory',
        sliceBlock(ANTI, 'const handleRemoveQuizReflection = (') + '\nreturn handleRemoveQuizReflection;')(
        origin, teacher, update => { state.shown = update(state.shown); }, update => { state.history = update(state.history); });
      return { fn, state };
    };
    const teacher = make(true);
    expect(teacher.fn(1)).toBe(true);
    expect(teacher.state.shown.data.reflections).toEqual(['A', 'C']);
    expect(teacher.state.history[0].data.reflections).toEqual(['A', 'C']);
    expect(make(true).fn(3), 'out of range').toBe(false);
    expect(make(true).fn(-1)).toBe(false);
    expect(make(false).fn(0), 'students cannot edit').toBe(false);
  });

  it('labels an unfilled blank as a draft that students will not see', () => {
    const at = ANTI.indexOf('data-help-key="blank_draft_notice"');
    expect(at, 'draft label present').toBeGreaterThan(0);
    const condition = ANTI.slice(ANTI.lastIndexOf('{isTeacherMode', at), at);
    expect(condition).toContain('activeView === generatedContent.type && isUnfilledBlankDraft(generatedContent)');
    expect(ANTI.slice(at, at + 400)).toContain("t('common.blank_draft_notice')");
  });

  it('notes a topic-made resource for the teacher, naming the topic', () => {
    const at = ANTI.indexOf('data-help-key="topic_seed_notice"');
    expect(at, 'topic note present').toBeGreaterThan(0);
    const condition = ANTI.slice(ANTI.lastIndexOf('{isTeacherMode', at), at);
    expect(condition).toContain("activeView === generatedContent.type && generatedContent.lessonPath?.seed?.kind === 'topic'");
    expect(ANTI.slice(at, at + 400)).toContain("t('common.topic_seed_notice', { topic: generatedContent.lessonPath.seed.text || '' })");
  });

  it('StoryForge receives the lesson glossary (the terms list), not an always-empty lookup', () => {
    expect(ANTI).toContain('glossaryTerms: latestGlossary,');
    expect(ANTI).not.toContain('return g?.data?.terms || [];');
    // latestGlossary is the related glossary's terms array, the shape StoryForge maps (term/def).
    const memo = ANTI.slice(ANTI.indexOf('  const latestGlossary = React.useMemo('), ANTI.indexOf('  const isClozeComplete'));
    expect(memo).toContain("_findRelatedHistoryItem(history, 'glossary', generatedContent)");
    expect(memo).toContain('if (Array.isArray(item.data)) return item.data;');
  });

  it('passes the new editors and startEditing to the views, and lists the blank-capable tools', () => {
    expect(ANTI).toMatch(/csDeleteItem, csAddItem, csAddCategory, csDeleteCategory, csAddItemManual,/);
    expect(ANTI).toMatch(/handleMoveGlossaryItem, handleAddGlossaryTermAsTyped,/);
    expect(ANTI).toContain('startEditing: isTeacherMode && isUnfilledBlankDraft(generatedContent),');
    expect(ANTI).toContain("window.__alloBlankStartTypes = ['quiz', 'glossary', 'timeline', 'concept-sort', 'anchor-chart'];");
    expect(ANTI).toMatch(/delete window\.__alloBlankStartTypes/);
  });
});

describe('sidebar: "Other ways to start"', () => {
  let Ways, Notice;
  beforeAll(() => {
    const code = [sliceBlock(SIDEBAR, 'function useAiTextAvailable('), sliceBlock(SIDEBAR, 'function OtherWaysToStart('), sliceBlock(SIDEBAR, 'function SourceNeededNotice(')].join('\n');
    ({ Ways, Notice } = new Function('React', code + '\nreturn { Ways: OtherWaysToStart, Notice: SourceNeededNotice };')(React));
  });
  const t = () => '';
  const q = (host, key) => host.querySelector(`[data-help-key="${key}"]`);

  it('is one collapsed line that lists only what the tool supports', () => {
    const onStartBlank = vi.fn();
    const host = render(Ways, { t, onStartBlank, framed: true });
    expect(q(host, 'sidebar_start_blank'), 'collapsed').toBe(null);
    expect(q(host, 'sidebar_other_ways_toggle').getAttribute('aria-expanded')).toBe('false');
    act(() => q(host, 'sidebar_other_ways_toggle').click());
    expect(q(host, 'sidebar_source_needed_topic_toggle'), 'no topic handler, no topic option').toBe(null);
    act(() => q(host, 'sidebar_start_blank').click());
    expect(onStartBlank).toHaveBeenCalledTimes(1);
  });

  it('with no AI connected, shows Blank directly and hides the topic start', () => {
    window.__alloResolveAiCapability = () => ({ text: false });
    const host = render(Ways, { t, onStartBlank: () => {}, onStartFromTopic: () => {} });
    expect(q(host, 'sidebar_other_ways_toggle')).toBe(null);
    expect(q(host, 'sidebar_start_blank')).not.toBe(null);
    expect(q(host, 'sidebar_source_needed_topic_toggle')).toBe(null);
  });

  it('renders nothing when the tool supports neither, and disables Blank while busy', () => {
    expect(render(Ways, { t }).innerHTML).toBe('');
    window.__alloResolveAiCapability = () => ({ text: false });
    expect(q(render(Ways, { t, onStartBlank: () => {}, busy: true }), 'sidebar_start_blank').disabled).toBe(true);
  });

  it('the Source Needed notice carries it', () => {
    window.__alloResolveAiCapability = () => ({ text: false });
    const host = render(Notice, { t, onAddSource: () => {}, onStartBlank: () => {} });
    expect(q(host, 'sidebar_source_needed_notice')).not.toBe(null);
    expect(q(host, 'sidebar_start_blank')).not.toBe(null);
  });

  it('wires Blank only for the five tools, only when the host lists them, with or without a source', () => {
    const noticeBlank = [...SIDEBAR.matchAll(/expandedTools\.includes\("([\w-]+)"\) && !hasSourceOrAnalysis && \/\* @__PURE__ \*\/ React\.createElement\(SourceNeededNotice, \{[^\n]*onStartBlank: canStartBlank\("([\w-]+)"\) \? \(\) => startBlank\("([\w-]+)"\) : void 0/g)];
    expect(noticeBlank.map(m => m[1]).sort()).toEqual([...BLANK_TYPES].sort());
    for (const m of noticeBlank) expect(m[2] === m[1] && m[3] === m[1], m[1]).toBe(true);
    const strips = [...SIDEBAR.matchAll(/expandedTools\.includes\("([\w-]+)"\) && hasSourceOrAnalysis && canStartBlank\("([\w-]+)"\) && \/\* @__PURE__ \*\/ React\.createElement\(OtherWaysToStart, \{ t, framed: true, busy: isProcessing, onStartBlank: \(\) => startBlank\("([\w-]+)"\) \}\)/g)];
    expect(strips.map(m => m[1]).sort()).toEqual([...BLANK_TYPES].sort());
    for (const m of strips) expect(m[2] === m[1] && m[3] === m[1], m[1]).toBe(true);
    expect(SIDEBAR).toContain('const canStartBlank = (id) => Array.isArray(window.__alloBlankStartTypes) && window.__alloBlankStartTypes.includes(id);');
    expect(SIDEBAR).toContain('const startBlank = (id) => handleGenerate(id, null, false, null, { seed: { kind: "blank" } });');
  });
});

describe('editors that now work from empty', () => {
  function conceptSortProps(extra = {}) {
    return {
      t: () => '', generatedContent: { id: 'cs-blank', type: 'concept-sort', data: { categories: [], items: [] } },
      isTeacherMode: true, isIndependentMode: false, csEdit: null, csAddingCatId: null, csAddingText: '', csBusyId: null,
      setCsEdit: vi.fn(), setCsAddingCatId: vi.fn(), setCsAddingText: vi.fn(), csAddItem: vi.fn(), csAddCategory: vi.fn(),
      csDeleteCategory: vi.fn(), csAddItemManual: vi.fn(), csUpdateCategoryLabel: vi.fn(), csUpdateItemText: vi.fn(), csMoveItem: vi.fn(),
      csRegenerateItem: vi.fn(), csRegenerateItemImage: vi.fn(), csUploadItemImage: vi.fn(), csClearItemImage: vi.fn(), csDeleteItem: vi.fn(),
      csRefineItemImage: vi.fn(), ...extra,
    };
  }
  const q = (host, key) => host.querySelector(`[data-help-key="${key}"]`);

  it('Concept Sort: an empty sort offers "Add category"; the row adds the typed name', () => {
    const props = conceptSortProps();
    let host = render(window.AlloModules.ConceptSortView, props);
    act(() => q(host, 'concept_sort_add_category').click());
    expect(props.setCsAddingCatId).toHaveBeenCalledWith('__new_category__');
    const open = conceptSortProps({ csAddingCatId: '__new_category__', csAddingText: 'Renewable' });
    host = render(window.AlloModules.ConceptSortView, open);
    act(() => q(host, 'concept_sort_add_category_row').querySelector('button').click());
    expect(open.csAddCategory).toHaveBeenCalledWith('Renewable');
  });

  it('Concept Sort: delete a category; typed cards skip the AI when none is connected', () => {
    const data = { categories: [{ id: 'c1', label: 'Renewable', color: 'bg-indigo-500' }], items: [] };
    const props = conceptSortProps({ generatedContent: { id: 'cs', type: 'concept-sort', data }, csAddingCatId: 'c1', csAddingText: 'Solar' });
    window.__alloResolveAiCapability = () => ({ text: false });
    const host = render(window.AlloModules.ConceptSortView, props);
    act(() => q(host, 'concept_sort_delete_category').click());
    expect(props.csDeleteCategory).toHaveBeenCalledWith('c1');
    const addButton = [...host.querySelectorAll('button')].find(b => b.className.includes('bg-emerald-700'));
    act(() => addButton.click());
    expect(props.csAddItemManual).toHaveBeenCalledWith('c1', 'Solar');
    expect(props.csAddItem).not.toHaveBeenCalled();
  });

  it('Concept Sort: with AI connected the existing AI add is kept; an older host shows no new controls', () => {
    const data = { categories: [{ id: 'c1', label: 'Renewable', color: 'bg-indigo-500' }], items: [] };
    const props = conceptSortProps({ generatedContent: { id: 'cs', type: 'concept-sort', data }, csAddingCatId: 'c1', csAddingText: 'Solar' });
    const host = render(window.AlloModules.ConceptSortView, props);
    act(() => [...host.querySelectorAll('button')].find(b => b.className.includes('bg-emerald-700')).click());
    expect(props.csAddItem).toHaveBeenCalledWith('c1', 'Solar', data.categories);
    const old = render(window.AlloModules.ConceptSortView, conceptSortProps({ csAddCategory: undefined, csDeleteCategory: undefined, csAddItemManual: undefined,
      generatedContent: { id: 'cs2', type: 'concept-sort', data } }));
    expect(q(old, 'concept_sort_add_category')).toBe(null);
    expect(q(old, 'concept_sort_delete_category')).toBe(null);
  });

  it('Anchor Chart: startEditing opens an empty chart in editing with a layout picker', () => {
    const handleNoteUpdate = vi.fn();
    const content = { id: 'ac-blank', type: 'anchor-chart', data: { title: '', chartType: 'reference', sections: [] } };
    let host = render(window.AlloModules.AnchorChartView, { generatedContent: content, isTeacherMode: true, startEditing: true, handleNoteUpdate, t: (k, d) => d || k });
    expect(q(host, 'anchor_chart_edit_toggle').getAttribute('aria-pressed')).toBe('true');
    const select = q(host, 'anchor_chart_layout_picker').querySelector('select');
    expect([...select.options].map(o => o.value)).toEqual(Object.keys(window.AlloModules.AnchorChartTypeMeta));
    act(() => { select.value = 'process'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(handleNoteUpdate).toHaveBeenCalledWith('chartType', 'process');
    host = render(window.AlloModules.AnchorChartView, { generatedContent: { ...content, id: 'ac-2' }, isTeacherMode: true, handleNoteUpdate, t: (k, d) => d || k });
    expect(q(host, 'anchor_chart_edit_toggle').getAttribute('aria-pressed')).toBe('false');
    expect(q(host, 'anchor_chart_layout_picker'), 'picker only while editing').toBe(null);
  });
});
