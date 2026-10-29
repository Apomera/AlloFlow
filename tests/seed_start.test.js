// Seed start (2026-10-28, experimental, opt-in): Anchor Chart and Concept Sort can
// be made from a teacher-typed topic when there is no source material. The passage
// path is pinned separately by tests/passage_path_baseline.test.js; this file checks
// the topic path itself: prompts, the gate for every other tool, provenance kept
// with the teacher, and the sidebar control that offers it.
// ALLO_DISPATCHER_CANDIDATE / ALLO_LIVE_AAC_CANDIDATE / ALLO_SIDEBAR_CANDIDATE point at
// mutated copies for mutation checks.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const DISPATCHER = readFileSync(process.env.ALLO_DISPATCHER_CANDIDATE || 'generate_dispatcher_source.jsx', 'utf8');
const SIDEBAR = readFileSync(process.env.ALLO_SIDEBAR_CANDIDATE || 'view_sidebar_panels_module.js', 'utf8');
const BASE = './__baselines__/seed_start/';
const TOPIC = 'renewable and non-renewable energy';
const noop = () => {};
// Same rule as the passage baseline: only names the dispatcher CALLS get a no-op.
const CALLED = new Set([...DISPATCHER.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));

let dispatcher;
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-03-02T15:00:00Z') });
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('allo_data_module.js');
  loadAlloModule(process.env.ALLO_LIVE_AAC_CANDIDATE || 'live_aac_module.js');
  new Function(DISPATCHER)();
  dispatcher = window.AlloModules.GenDispatcher;
  window.React = React;
});

function fixture({ answer = '[]', overrides = {} } = {}) {
  const prompts = [];
  const callGemini = vi.fn(async prompt => { prompts.push(String(prompt)); return answer; });
  const saved = [];
  const setHistory = vi.fn(update => { const next = typeof update === 'function' ? update([]) : update; if (Array.isArray(next)) saved.push(...next); });
  const deps = new Proxy({
    gradeLevel: '5th Grade', history: [], inputText: '', activeUnitId: 'lesson', selectedReadingSourceId: '',
    differentiationRange: 'None', leveledTextLanguage: 'English', selectedLanguages: [], studentInterests: [],
    guidedMode: false, guidedStep: 0, standardsInput: '', targetStandards: [], standardsPromptString: '',
    sourceTopic: '', currentUiLanguage: 'English', generatedContent: null, audioRef: { current: null },
    alloBotRef: { current: null }, GUIDED_STEPS: [], checkAccuracyWithSearch: false, callGemini, setHistory,
    extractSourceTextForProcessing: text => ({ text, englishBlock: '', isBilingual: false }),
    cleanJson: String, getGroupDifferentiationContext: () => '', getDefaultTitle: type => type, t: key => key,
    resolveTranslationPolicy: () => ({ enabled: false, target: 'English' }), chunkText: text => [text],
    countWords: text => text.trim().split(/\s+/).length, textFormat: 'Standard Text', selectedConcepts: [],
    formatLessonDNA: () => '', glossaryTier2Count: 2, glossaryTier3Count: 2, quizMcqCount: 3,
    TIMELINE_MODE_DEFINITIONS: window.AlloModules.AlloData.TIMELINE_MODE_DEFINITIONS, timelineMode: 'auto',
    ...overrides,
  }, { get: (target, key) => key in target ? target[key] : (typeof key === 'string' && CALLED.has(key) ? noop : undefined) });
  return { deps, prompts, callGemini, saved };
}
async function generate(type, f, seed, extra = {}) {
  let error = null;
  try { await dispatcher.handleGenerate(type, null, false, null, { rethrowErrors: true, ...(seed !== undefined ? { seed } : {}), ...extra }, true, f.deps); }
  catch (e) { error = e; }
  return error;
}
const topicSeed = text => ({ kind: 'topic', text });

describe('topic prompts (no source material)', () => {
  it('Anchor Chart uses the topic and says there is no source', async () => {
    const f = fixture();
    await generate('anchor-chart', f, topicSeed(TOPIC));
    expect(f.prompts).toHaveLength(1);
    expect(f.prompts[0]).toContain(`Topic: "${TOPIC}"`);
    expect(f.prompts[0]).toContain('No source text was provided');
    await expect(f.prompts[0]).toMatchFileSnapshot(BASE + 'anchor-chart.txt');
  });

  it('Concept Sort is written about the topic, not "the provided source text"', async () => {
    const f = fixture();
    await generate('concept-sort', f, topicSeed(TOPIC));
    expect(f.prompts).toHaveLength(1);
    const prompt = f.prompts[0];
    expect(prompt).toContain(`Create a "Concept Sort" activity about the topic "${TOPIC}"`);
    expect(prompt).toContain(`Topic: "${TOPIC}"`);
    expect(prompt).toContain('central to the topic');
    expect(prompt).toContain('Generate 10-14 items');
    expect(prompt).not.toContain('Analyze the provided source text');
    expect(prompt).not.toContain('as the source text can clearly support');
    await expect(prompt).toMatchFileSnapshot(BASE + 'concept-sort.txt');
  });

  it('normalizes the topic: whitespace collapsed, capped at 300 characters', async () => {
    const f = fixture();
    await generate('concept-sort', f, topicSeed('  plate\n\ntectonics   ' + 'x'.repeat(400)));
    const quoted = f.prompts[0].match(/Topic: "([^"]*)"/)[1];
    expect(quoted.startsWith('plate tectonics ')).toBe(true);
    expect(quoted.length).toBe(300);
  });
});

describe('persona interviews from a topic', () => {
  it('chooses figures for the topic instead of analysing a source text', async () => {
    const f = fixture();
    await generate('persona', f, topicSeed('the American Revolution'));
    expect(f.prompts).toHaveLength(1);
    const prompt = f.prompts[0];
    expect(prompt).toContain('Choose figures for the topic "the American Revolution"');
    expect(prompt).toContain('"Topic only: the American Revolution"');
    expect(prompt).not.toContain('Analyze the following text about');
    await expect(prompt).toMatchFileSnapshot(BASE + 'persona.txt');
  });
});

describe('the gate still holds', () => {
  it.each(['glossary', 'simplified', 'quiz', 'faq', 'timeline', 'outline', 'lesson-plan'])('%s ignores a topic seed and stops without a source', async type => {
    const f = fixture();
    const error = await generate(type, f, topicSeed(TOPIC));
    expect(error && error.code).toBe('allo/source-missing');
    expect(f.callGemini).not.toHaveBeenCalled();
  });

  it.each([['empty', ''], ['spaces', '   '], ['wrong kind', null]])('a %s seed does not open the gate', async (_label, text) => {
    const f = fixture();
    const seed = text === null ? { kind: 'resource', text: TOPIC } : topicSeed(text);
    const error = await generate('anchor-chart', f, seed);
    expect(error && error.code).toBe('allo/source-missing');
    expect(f.callGemini).not.toHaveBeenCalled();
  });
});

describe('provenance stays with the teacher', () => {
  const SORT = JSON.stringify({ categories: [{ id: 'c1', label: 'Renewable', color: 'bg-indigo-500' }, { id: 'c2', label: 'Non-renewable', color: 'bg-pink-500' }],
    items: ['Solar', 'Wind', 'Hydro', 'Geothermal', 'Coal', 'Oil', 'Natural gas', 'Uranium'].map((content, i) => ({ id: 'i' + i, content, categoryId: i < 4 ? 'c1' : 'c2' })) });

  it('a topic-made resource records its seed under lessonPath; a passage-made one does not', async () => {
    const seeded = fixture({ answer: SORT });
    await generate('concept-sort', seeded, topicSeed(TOPIC));
    const item = seeded.saved.find(entry => entry && entry.type === 'concept-sort');
    expect(item, 'concept sort saved').toBeTruthy();
    expect(item.lessonPath).toEqual({ seed: { kind: 'topic', text: TOPIC } });

    const passage = fixture({ answer: SORT, overrides: { inputText: 'Solar and wind are renewable. Coal and oil are not. Hydro and geothermal renew; gas and uranium do not.' } });
    await generate('concept-sort', passage);
    const plain = passage.saved.find(entry => entry && entry.type === 'concept-sort');
    expect(plain, 'passage concept sort saved').toBeTruthy();
    expect('lessonPath' in plain).toBe(false);
  });

  it('student copies drop lessonPath and leave the teacher item untouched', () => {
    const item = { id: 'cs-1', type: 'concept-sort', title: 'Energy sort', data: { categories: [], items: [] }, lessonPath: { seed: { kind: 'topic', text: TOPIC } } };
    const packed = window.AlloModules.LiveAac.serializeResourceForStudentPack(item, {
      sanitizeHistoryForCloud: items => items.map(entry => ({ ...entry })), stripUndefined: value => value });
    expect(packed).toBeTruthy();
    expect('lessonPath' in packed).toBe(false);
    expect(JSON.stringify(packed)).not.toContain(TOPIC);
    expect(item.lessonPath.seed.text).toBe(TOPIC);
  });
});

// The sidebar notice: slice the shipped component by its braces and render it.
function sliceBlock(text, start) {
  const at = text.indexOf(start);
  expect(at, 'missing ' + start).toBeGreaterThanOrEqual(0);
  const body = /\)\s*\{|=>\s*\{/g; body.lastIndex = at;
  let depth = 0, i = body.exec(text).index;
  for (; i < text.length; i++) { if (text[i] === '{') depth++; else if (text[i] === '}' && --depth === 0) break; }
  return text.slice(at, i + 1);
}
describe('the sidebar offers it only where it works', () => {
  let Notice;
  const mounted = [];
  beforeAll(() => {
    Notice = new Function('React', sliceBlock(SIDEBAR, 'function useAiTextAvailable(') + '\n' + sliceBlock(SIDEBAR, 'function OtherWaysToStart(') + '\n'
      + sliceBlock(SIDEBAR, 'function SourceNeededNotice(') + '\nreturn SourceNeededNotice;')(React);
  });
  afterEach(() => { mounted.splice(0).forEach(({ root, host }) => { act(() => root.unmount()); host.remove(); }); delete window.__alloResolveAiCapability; });
  const render = props => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    act(() => root.render(React.createElement(Notice, { t: () => '', onAddSource: () => {}, ...props })));
    mounted.push({ root, host });
    return host;
  };
  const q = (host, key) => host.querySelector(`[data-help-key="sidebar_source_needed_${key}"]`);
  // The topic start sits inside the "Other ways to start" disclosure.
  const openTopic = host => { act(() => host.querySelector('[data-help-key="sidebar_other_ways_toggle"]').click()); act(() => q(host, 'topic_toggle').click()); };

  it('only Anchor Chart, Concept Sort and Persona pass a topic handler, each for its own type', () => {
    const uses = [...SIDEBAR.matchAll(/expandedTools\.includes\("([\w-]+)"\) && !hasSourceOrAnalysis && \/\* @__PURE__ \*\/ React\.createElement\(SourceNeededNotice, \{([^}]*\}[^}]*\}[^}]*)\}/g)];
    const withTopic = uses.filter(m => m[2].includes('onStartFromTopic'));
    expect(withTopic.map(m => m[1]).sort()).toEqual(['anchor-chart', 'concept-sort', 'persona']);
    for (const m of withTopic) expect(m[2]).toContain(`handleGenerate("${m[1]}", null, false, null, { seed: { kind: "topic", text: topic } })`);
  });

  it('opens on request, submits the trimmed topic, and stays disabled while empty or busy', () => {
    const onStartFromTopic = vi.fn();
    let host = render({ onStartFromTopic });
    expect(q(host, 'topic_create'), 'collapsed until asked').toBe(null);
    openTopic(host);
    const type = (el, value) => act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
    const create = q(host, 'topic_create');
    expect(create.disabled).toBe(true);
    type(host.querySelector('input[type="text"]'), `  ${TOPIC}  `);
    expect(create.disabled).toBe(false);
    act(() => create.click());
    expect(onStartFromTopic).toHaveBeenCalledWith(TOPIC);
    expect(host.textContent).toContain('not checked against a source');
    // While a generation is running, a typed topic still cannot start another.
    host = render({ onStartFromTopic, busy: true });
    openTopic(host);
    type(host.querySelector('input[type="text"]'), TOPIC);
    expect(q(host, 'topic_create').disabled).toBe(true);
    act(() => q(host, 'topic_create').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(onStartFromTopic).toHaveBeenCalledTimes(1);
  });

  it('is hidden without a topic handler or without AI', () => {
    expect(q(render({}), 'topic_toggle')).toBe(null);
    window.__alloResolveAiCapability = () => ({ text: false });
    const noAi = render({ onStartFromTopic: () => {} });
    expect(q(noAi, 'topic_toggle')).toBe(null);
    // With only a topic start and no AI, the whole "Other ways to start" control is absent.
    expect(noAi.querySelector('[data-help-key="sidebar_other_ways_to_start"]')).toBe(null);
  });
});
