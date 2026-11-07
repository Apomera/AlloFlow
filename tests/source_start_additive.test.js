import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const SOURCE = readFileSync(process.env.ALLO_DISPATCHER_CANDIDATE || 'generate_dispatcher_source.jsx', 'utf8');
const CALLED = new Set([...SOURCE.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
const noop = () => {};
let api;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('allo_data_module.js');
  loadAlloModule('generation_matrix_module.js');
  new Function(SOURCE)();
  api = window.AlloModules.GenDispatcher;
});
afterEach(() => { delete window.__alloActiveAIBackend; delete window.AlloImageGeneration; vi.restoreAllMocks(); });

function fixture(overrides = {}, answer = '[]') {
  const saved = [], prompts = [];
  const callGemini = vi.fn(async prompt => { prompts.push(String(prompt)); return answer; });
  window.AlloImageGeneration = { isEnabled: () => false };
  const deps = new Proxy({
    gradeLevel: '5th Grade', history: [], inputText: '', activeUnitId: 'lesson', selectedReadingSourceId: '',
    differentiationRange: 'None', leveledTextLanguage: 'English', selectedLanguages: [], studentInterests: [],
    guidedMode: false, guidedStep: 0, standardsInput: '', targetStandards: [], standardsPromptString: '',
    sourceTopic: '', currentUiLanguage: 'English', generatedContent: null, audioRef: { current: null },
    alloBotRef: { current: null }, GUIDED_STEPS: [], checkAccuracyWithSearch: false, callGemini,
    setHistory: update => { const next = typeof update === 'function' ? update([]) : update; if (Array.isArray(next)) saved.push(...next); },
    extractSourceTextForProcessing: text => ({ text, englishBlock: '', isBilingual: false }),
    cleanJson: String, getGroupDifferentiationContext: () => '', getDefaultTitle: type => type, t: key => key,
    resolveTranslationPolicy: () => ({ enabled: false, target: 'English' }), chunkText: text => [text],
    countWords: text => text.trim().split(/\s+/).length, textFormat: 'Standard Text', selectedConcepts: [],
    formatLessonDNA: () => '', glossaryTier2Count: 2, glossaryTier3Count: 2, glossaryImageStyle: '', universalImageStyle: '',
    glossaryDefinitionLevel: 'Same as Source Text', TIMELINE_MODE_DEFINITIONS: window.AlloModules.AlloData.TIMELINE_MODE_DEFINITIONS,
    ...overrides,
  }, { get: (target, key) => key in target ? target[key] : typeof key === 'string' && CALLED.has(key) ? noop : undefined });
  return { deps, saved, prompts, callGemini };
}
const run = (type, f, seed, extra = {}) => api.handleGenerate(type, null, false, null, { seed, rethrowErrors: true, ...extra }, true, f.deps);
const words = ['heat transfer', "l'enfant", 'café', '水循環', 'التكاثف'];
const seed = (terms, termLanguage = 'English') => ({ kind: 'word-list', terms, termLanguage });
const answer = terms => JSON.stringify(terms.map((term, id) => ({ id, term, def: `Definition for ${term}.`, tier: 'Academic', contextSentence: 'Invented source quote.' })).reverse());

describe('explicit independent starts', () => {
  it.each(['quiz', 'glossary', 'timeline', 'concept-sort', 'anchor-chart'])('blank %s ignores an unavailable reading', async type => {
    const f = fixture({ inputText: 'Unrelated passage stays exactly here.', selectedReadingSourceId: 'missing', requestGenerationSourceChoice: vi.fn() });
    await run(type, f, { kind: 'blank' });
    expect(f.saved.some(item => item.type === type)).toBe(true);
    expect(f.callGemini).not.toHaveBeenCalled();
    expect(f.deps.requestGenerationSourceChoice).not.toHaveBeenCalled();
    expect(f.deps.inputText).toBe('Unrelated passage stays exactly here.');
  });
  it.each(['anchor-chart', 'concept-sort', 'persona', 'timeline'])('topic %s reaches its own prompt despite stale reading selection', async type => {
    const f = fixture({ inputText: 'UNRELATED READING SECRET', selectedReadingSourceId: 'missing', requestGenerationSourceChoice: vi.fn() });
    try { await run(type, f, { kind: 'topic', text: 'water cycle' }); } catch (_) { /* empty synthetic model response */ }
    expect(f.prompts.length).toBeGreaterThan(0);
    expect(f.prompts.join(' ')).toContain('water cycle');
    expect(f.prompts.join(' ')).not.toContain('UNRELATED READING SECRET');
    expect(f.deps.requestGenerationSourceChoice).not.toHaveBeenCalled();
  });
  it('does not ask for a reading when two readings are available', async () => {
    const context = window.AlloModules.InstructionalContext;
    const history = ['A', 'B'].map(id => ({ id, type: 'analysis', unitId: 'lesson', data: { originalText: 'Unrelated ' + id },
      sourceSnapshot: context.createSourceSnapshot('Unrelated ' + id, { sourceArtifactId: id }) }));
    const f = fixture({ history, requestGenerationSourceChoice: vi.fn() });
    await run('glossary', f, { kind: 'blank' });
    expect(f.saved).toHaveLength(1);
    expect(f.deps.requestGenerationSourceChoice).not.toHaveBeenCalled();
  });
  it('keeps an explicitly selected destination unit for independent starts', async () => {
    const f = fixture({ activeUnitId: 'open-unit' });
    await run('quiz', f, { kind: 'blank' }, { unitId: 'target-unit' });
    expect(f.saved[0].unitId).toBe('target-unit');
    const g = fixture({ activeUnitId: 'open-unit' }, answer(['orbit']));
    await run('glossary', g, seed(['orbit']), { unitId: 'target-unit' });
    expect(g.saved[0].unitId).toBe('target-unit');
  });
  it('drops unrelated reading lineage and supplied reuse identity while retaining lesson and grade', async () => {
    const f = fixture({ inputText: 'OLD PASSAGE', selectedReadingSourceId: 'old', gradeLevel: '7th Grade' });
    await run('quiz', f, { kind: 'blank' }, {
      sourceSnapshot: { text: 'OLD PASSAGE' }, sourceArtifactId: 'old', inputArtifactId: 'old', sourceFamilyId: 'family',
      sourceTransformations: ['old-transform'], generationInputText: 'OLD PASSAGE', sourceFingerprint: 'old-fingerprint',
      generationIdentity: { key: 'old-identity', sourceArtifactId: 'old' }, generationContext: { source: 'OLD PASSAGE' },
    });
    const item = f.saved[0];
    expect(item.unitId).toBe('lesson'); expect(item.config.grade).toBe('7th Grade');
    for (const object of [item, item.config]) {
      expect(object.inputArtifactId).toBeNull(); expect(object.sourceFamilyId).toBeNull(); expect(object.primaryArtifactId).toBeNull();
    }
    expect(item.config.sourceSnapshot).toBeNull(); expect(item.config.sourceArtifactId).toBeNull();
    expect(item.config.sourceTransformations).toEqual([]);
    expect(JSON.stringify(item)).not.toMatch(/OLD PASSAGE|old-fingerprint|old-identity|old-transform/);
  });
  it.each(['faq', 'simplified', 'quiz'])('unsupported topic for %s retains the no-source gate', async type => {
    const f = fixture();
    await expect(run(type, f, { kind: 'topic', text: 'water' })).rejects.toMatchObject({ code: 'allo/source-missing' });
    expect(f.callGemini).not.toHaveBeenCalled();
  });
});

describe('exact word-list Glossary', () => {
  it('keeps phrases, scripts, spelling and teacher order despite response order', async () => {
    const f = fixture({ inputText: 'OTHER SOURCE', selectedReadingSourceId: 'missing', glossaryTier2Count: 0, glossaryTier3Count: 0 }, answer(words));
    await run('glossary', f, seed(words));
    const item = f.saved[0];
    expect(item.data.map(x => x.term)).toEqual(words);
    expect(item.data.map(x => x.sourceTerm)).toEqual(words);
    expect(item.data.every(x => !('contextSentence' in x))).toBe(true);
    expect(item.lessonPath.seed).toEqual(seed(words));
    expect(f.prompts[0]).toContain('There is no source passage');
    expect(f.prompts[0]).toContain('5th Grade');
    expect(f.prompts[0]).not.toContain('OTHER SOURCE');
  });
  it('keeps selected definition language and requested translation columns', async () => {
    const f = fixture({ nativeLanguageDefaultsVersion: 1, appLanguage: 'French', leveledTextLanguage: 'French',
      resolveTranslationPolicy: () => ({ enabled: true, target: 'English' }) }, JSON.stringify([{ id: 0, term: 'café', def: 'Une boisson.',
        translations: { English: 'Coffee: A drink.', German: 'unrequested' }, sourceLanguage: 'invented' }]));
    await run('glossary', f, seed(['café']));
    expect(f.prompts[0]).toContain('DEFINITION LANGUAGE: Write def in French');
    expect(f.saved[0].data[0]).toMatchObject({ term: 'café', def: 'Une boisson.', translations: { English: 'Coffee: A drink.' } });
    expect(f.saved[0].data[0].translations.German).toBeUndefined();
    expect(f.saved[0].data[0].sourceLanguage).toBe('English');
    expect(f.saved[0].data[0].termLanguage).toBe('English');
    expect(f.saved[0].data[0].definitionLanguage).toBe('French');
    const view = readFileSync('view_glossary_source.jsx', 'utf8');
    const fn = view.slice(view.indexOf('function glossaryFieldLanguage('), view.indexOf('function glossaryHasBaseMetadata('));
    const languageFor = new Function('window', fn + '; return glossaryFieldLanguage;')(window);
    expect(languageFor(f.saved[0], f.saved[0].data[0], 'term')).toBe('English');
    expect(languageFor(f.saved[0], f.saved[0].data[0], 'definition')).toBe('French');
  });
  it('keeps the teacher-selected term language distinct from definition language', async () => {
    const f = fixture({}, answer(['التكاثف']));
    await run('glossary', f, seed(['التكاثف'], 'Arabic'));
    expect(f.saved[0].data[0]).toMatchObject({ termLanguage: 'Arabic', definitionLanguage: 'English', sourceLanguage: 'Arabic' });
  });
  it('uses all requested terms on a local backend', async () => {
    window.__alloActiveAIBackend = { backend: 'ollama' };
    const terms = Array.from({ length: 10 }, (_, i) => 'term ' + i);
    const f = fixture({}, answer(terms));
    await run('glossary', f, seed(terms));
    expect(f.saved[0].data.map(x => x.term)).toEqual(terms);
    expect(f.prompts[0]).toContain('exact teacher-supplied word list');
  });
  it.each([
    [], ['a', 'a'], ['x'.repeat(161)], Array.from({ length: 41 }, (_, i) => '' + i), ['a', null], ['   '],
  ].map(terms => [terms]))('rejects malformed list %# before AI or passage fallback', async terms => {
    const f = fixture({ inputText: 'A valid unrelated source passage.' });
    await expect(run('glossary', f, seed(terms))).rejects.toMatchObject({ code: 'allo/word-list-invalid' });
    expect(f.callGemini).not.toHaveBeenCalled(); expect(f.saved).toHaveLength(0);
  });
  it.each([
    [{ id: 0, term: 'a', def: 'A definition.' }],
    [{ id: 0, term: 'a', def: 'A definition.' }, { id: 0, term: 'b', def: 'B definition.' }],
    [{ id: 0, term: 'a', def: 'A definition.' }, { id: 8, term: 'b', def: 'B definition.' }],
    [{ id: 0, term: 'changed', def: 'A definition.' }, { id: 1, term: 'b', def: 'B definition.' }],
    [{ id: 0, term: 'a', def: '' }, { id: 1, term: 'b', def: 'B definition.' }],
  ].map(rows => [rows]))('rejects incomplete or mismatched model output %# without saving', async rows => {
    const f = fixture({}, JSON.stringify(rows));
    await expect(run('glossary', f, seed(['a', 'b']))).rejects.toThrow();
    expect(f.saved).toHaveLength(0);
  });
  it('assigns different input identities to different lists', async () => {
    const f = fixture({}, answer(['orbit'])), g = fixture({}, answer(['tides']));
    await run('glossary', f, seed(['orbit'])); await run('glossary', g, seed(['tides']));
    expect(f.saved[0].config.sourceFingerprint).not.toBe(g.saved[0].config.sourceFingerprint);
    expect(f.saved[0].config.generationIdentity?.key).not.toBe(g.saved[0].config.generationIdentity?.key);
  });
});

// HOST_ORIGIN_GUARD_TESTS
{

// Evaluate the actual patched host callbacks. The dependency proxy supplies
// unrelated host values only; the seed counter, await/finally and autoUse guard
// all come from the source or compiled preview being tested.
const previewRoot = process.env.ALLO_HOST_GUARD_PREVIEW || '';
const dispatcherSource = readFileSync(process.env.ALLO_DISPATCHER_CANDIDATE || 'generate_dispatcher_source.jsx', 'utf8');
const sidebarSource = readFileSync(process.env.ALLO_SIDEBAR_SOURCE_CANDIDATE || 'view_sidebar_panels_source.jsx', 'utf8');
function installedMain(folder) {
    const html = readFileSync(resolve(folder, 'index.html'), 'utf8');
    const match = html.match(/<script[^>]+src="([^"]*static\/js\/main\.[^"]+\.js)"/);
    if (!match) throw new Error('Installed app main is missing: ' + folder);
    // A root-relative src ("/static/...") must stay inside the build folder, not the drive root.
    return resolve(folder, match[1].replace(/^\/+/, ''));
}

function requiredIndex(text, marker, from = 0) {
    const at = text.indexOf(marker, from);
    if (at < 0) throw new Error('Host guard extraction lost anchor: ' + marker);
    return at;
}

const seedHelpersStart = requiredIndex(dispatcherSource, 'function _wordListError(');
const seedHelpersEnd = requiredIndex(dispatcherSource, 'const buildNativeGlossaryPrompt', seedHelpersStart);
const seedConstants = ['SEED_START_TYPES', 'BLANK_START_TYPES'].map(name => {
    const match = dispatcherSource.match(new RegExp('const ' + name + ' = \\[[^\\n]+\\];'));
    if (!match) throw new Error('Seed constant missing: ' + name);
    return match[0];
}).join('\n');
const seedPredicate = new Function(seedConstants + '\n' + dispatcherSource.slice(seedHelpersStart, seedHelpersEnd)
    + '\nreturn isIndependentGenerationSeed;')();
const recordStart = requiredIndex(sidebarSource, 'const SourceRecord = {');
const recordEnd = requiredIndex(sidebarSource, '\n};', recordStart) + 3;
const SourceRecord = new Function(sidebarSource.slice(recordStart, recordEnd) + '\nreturn SourceRecord;')();

function sourceExpressions(text) {
    const startMarker = 'const _alloRunGenerate = ';
    const start = requiredIndex(text, startMarker) + startMarker.length;
    const end = requiredIndex(text, '// Generation reaches these helpers synchronously;', start);
    const shim = text.slice(start, end).trim().replace(/;$/, '');
    const effectMarker = 'const api = window.AlloModules?.SidebarPanels?.SourceRecord; if (!isProcessing';
    const effectBody = requiredIndex(text, effectMarker);
    const effectStart = text.lastIndexOf('useEffect(', effectBody);
    if (effectStart < 0) throw new Error('Source autoUse effect entry missing');
    const callbackStart = requiredIndex(text, '() => {', effectStart);
    const callbackEnd = requiredIndex(text, '}, [isProcessing]);', effectBody) + 1;
    return { shim, effect: text.slice(callbackStart, callbackEnd), processingName: 'isProcessing',
        inputName: 'inputText', recordSetter: 'setSourceRecord', refName: 'sourceStampSeenRef',
        sourceChoiceName: '_alloReadingSourceChoice', typeSetter: 'setAlloGenerationType' };
}

function compiledExpressions(text) {
    const marker = requiredIndex(text, '[VisualDebug] handleGenerate shim called with type=');
    const start = text.lastIndexOf('async function(', marker);
    if (start < 0) throw new Error('Compiled asynchronous dispatcher shim entry missing');
    const stop = 'throw new Error("[handleGenerate] GenDispatcher module not loaded - reload the page")}';
    const end = requiredIndex(text, stop, marker) + stop.length;
    const shim = text.slice(start, end);
    const autoUse = requiredIndex(text, '.autoUse(');
    if (text.indexOf('.autoUse(', autoUse + 1) >= 0) throw new Error('Compiled autoUse effect is no longer unique');
    const effectStart = text.lastIndexOf('()=>{', autoUse);
    const effectEnd = requiredIndex(text, '},[', autoUse) + 1;
    if (effectStart < 0) throw new Error('Compiled autoUse callback entry missing');
    const effect = text.slice(effectStart, effectEnd);
    const guard = effect.match(/if\(!([\w$]+)\|\|!([\w$]+)\|\|([\w$]+)\.seedRuns>0\)return;/);
    const setter = effect.match(/([\w$]+)\(([\w$]+)=>[\w$]+\.autoUse\(\2,([\w$]+),[\w$]+\)\)/);
    const choice = shim.match(/selectedReadingSourceId:([\w$]+)\(\)/);
    const typeSetter = shim.match(/if\(([\w$]+)&&([\w$]+)\(\1\),console\.log/);
    if (!guard || !setter || !choice || !typeSetter) throw new Error('Compiled host guard bindings changed');
    return { shim, effect, processingName: guard[1], refName: guard[3], recordSetter: setter[1],
        inputName: setter[3], sourceChoiceName: choice[1], typeSetter: typeSetter[2] };
}

const variants = [
    ['source host', previewRoot ? resolve(previewRoot, 'AlloFlowANTI.txt') : 'AlloFlowANTI.txt', sourceExpressions],
    ['packaged app main', previewRoot ? resolve(previewRoot, 'desktop-app-main.js') : installedMain('desktop/app-build'), compiledExpressions],
    ['packaged web main', previewRoot ? resolve(previewRoot, 'desktop-web-main.js') : installedMain('desktop/web-app/build'), compiledExpressions],
].map(([label, file, extract]) => ({ label, ...extract(readFileSync(file, 'utf8')) }));

const elements = [];
afterEach(() => { elements.splice(0).forEach(element => element.remove()); });
function deferred() {
    let complete, fail;
    const promise = new Promise((resolve, reject) => { complete = resolve; fail = reject; });
    return { promise, resolve: complete, reject: fail };
}
function evaluate(expression, environment) {
    return new Function('environment', 'with (environment) { return (' + expression + '); }')(environment);
}

function fixture(variant, options = {}) {
    const originalRecord = Object.prototype.hasOwnProperty.call(options, 'record') ? options.record
        : { inUse: { text: 'Old source in use.', version: 4, at: 10 }, versions: [], pending: null };
    const state = { processing: false, record: originalRecord, inputText: options.inputText || 'An edited source draft.',
        requests: [], active: 0 };
    const ref = { current: new Set() };
    const module = {
        isIndependentGenerationSeed: seedPredicate,
        handleGenerate: vi.fn((...args) => {
            if (options.syncError) throw options.syncError;
            const request = { ...deferred(), args };
            state.requests.push(request);
            state.active++;
            state.processing = true;
            return request.promise.finally(() => {
                state.active--;
                state.processing = state.active > 0;
            });
        }),
    };
    const values = { window: { AlloModules: { GenDispatcher: module, SidebarPanels: { SourceRecord } } },
        document, console: { log: vi.fn() }, Object, Math, Error, Promise,
        supportDraftSessionRef: { current: null }, generationViewOwnerRef: { current: null },
        activeUnitId: 'lesson', sourceProvenance: null, requestGenerationSourceChoice: vi.fn() };
    for (const match of variant.shim.matchAll(/([\w$]+)\.current/g)) {
        if (!values[match[1]]) values[match[1]] = { current: null };
    }
    values[variant.refName] = ref;
    values[variant.sourceChoiceName] = () => '__input__';
    values[variant.typeSetter] = vi.fn();
    values[variant.recordSetter] = update => { state.record = typeof update === 'function' ? update(state.record) : update; };
    const environment = new Proxy(values, {
        has: () => true,
        get: (target, key) => {
            if (key === Symbol.unscopables) return undefined;
            if (key === variant.processingName) return state.processing;
            if (key === variant.inputName) return state.inputText;
            return target[key];
        },
    });
    const shim = evaluate(variant.shim, environment);
    const effect = evaluate(variant.effect, environment);
    return { state, ref, originalRecord, module, runEffect: () => effect(),
        start(seed, type = 'glossary') {
            const result = shim(type, null, false, null, seed ? { seed } : {});
            return { result, request: state.requests[state.requests.length - 1] };
        } };
}

describe.each(variants)('$label: independent-start host protection', variant => {
    it.each([['new draft', null], ['edited source', { inUse: { text: 'Previous source.', version: 7, at: 20 }, pending: null }]])(
        'keeps the %s unchanged while a valid list request is pending', async (_label, record) => {
            const f = fixture(variant, { record });
            const running = f.start({ kind: 'word-list', terms: ['heat transfer'], termLanguage: 'English' });
            expect(f.ref.seedRuns).toBe(1);
            expect(f.state.processing).toBe(true);
            f.runEffect();
            expect(f.state.record).toBe(record);
            running.request.resolve('created');
            await expect(running.result).resolves.toBe('created');
            expect(f.ref.seedRuns).toBe(0);
        });

    it('does not set a pending source draft when a teacher is typing during seeded work', async () => {
        const editor = document.createElement('textarea');
        editor.setAttribute('data-allo-textundo', 'input');
        document.body.appendChild(editor); elements.push(editor); editor.focus();
        const f = fixture(variant);
        const running = f.start({ kind: 'topic', text: 'An unrelated topic' }, 'anchor-chart');
        f.runEffect();
        expect(f.state.record).toBe(f.originalRecord);
        expect(f.state.record.pending).toBeNull();
        running.request.resolve('created'); await running.result;
        expect(f.ref.seedRuns).toBe(0);
    });

    it('still adopts an ordinary passage after a seeded request completes', async () => {
        const f = fixture(variant);
        const seeded = f.start({ kind: 'blank' }, 'quiz');
        f.runEffect(); expect(f.state.record).toBe(f.originalRecord);
        seeded.request.resolve('blank'); await seeded.result;
        const ordinary = f.start(null);
        f.runEffect();
        expect(f.state.record.inUse).toMatchObject({ text: f.state.inputText, version: 5 });
        expect(f.ref.seedRuns || 0).toBe(0);
        const stamped = SourceRecord.stamp([{ id: 'ordinary', type: 'glossary' }], f.state.record, new Set());
        expect(stamped[0].sourceVersion).toBe(5);
        ordinary.request.resolve('ordinary'); await ordinary.result;
    });

    it('retains the ordinary typing-to-pending behavior', async () => {
        const editor = document.createElement('textarea');
        editor.setAttribute('data-allo-textundo', 'input');
        document.body.appendChild(editor); elements.push(editor); editor.focus();
        const f = fixture(variant);
        const running = f.start(null);
        f.runEffect();
        expect(f.state.record.inUse).toBe(f.originalRecord.inUse);
        expect(f.state.record.pending).toBe(f.state.inputText);
        running.request.resolve('ordinary'); await running.result;
    });

    it.each(['failure', 'abort'])('restores the count after asynchronous %s', async label => {
        const f = fixture(variant);
        const running = f.start({ kind: 'blank' }, 'quiz');
        const error = Object.assign(new Error(label), label === 'abort' ? { name: 'AbortError' } : {});
        const rejection = expect(running.result).rejects.toBe(error);
        f.runEffect(); expect(f.state.record).toBe(f.originalRecord);
        running.request.reject(error); await rejection;
        expect(f.ref.seedRuns).toBe(0);
        const ordinary = f.start(null);
        f.runEffect(); expect(f.state.record.inUse.text).toBe(f.state.inputText);
        ordinary.request.resolve('ordinary'); await ordinary.result;
    });

    it('restores the count after a synchronous dispatcher exception', async () => {
        const error = new Error('synchronous failure');
        const f = fixture(variant, { syncError: error });
        await expect(f.start({ kind: 'blank' }, 'quiz').result).rejects.toBe(error);
        expect(f.ref.seedRuns).toBe(0);
    });

    it('keeps protection until both overlapping independent requests finish', async () => {
        const f = fixture(variant);
        const first = f.start({ kind: 'blank' }, 'quiz');
        const second = f.start({ kind: 'topic', text: 'Water cycle' }, 'anchor-chart');
        expect(f.ref.seedRuns).toBe(2);
        f.runEffect(); expect(f.state.record).toBe(f.originalRecord);
        first.request.resolve('first'); await first.result;
        expect(f.ref.seedRuns).toBe(1);
        expect(f.state.processing).toBe(true);
        f.runEffect(); expect(f.state.record).toBe(f.originalRecord);
        second.request.resolve('second'); await second.result;
        expect(f.ref.seedRuns).toBe(0);
    });

    it('does not suppress normal adoption for an unsupported seed kind', async () => {
        const f = fixture(variant);
        const running = f.start({ kind: 'topic', text: 'Not supported for this tool' }, 'quiz');
        expect(f.ref.seedRuns || 0).toBe(0);
        f.runEffect(); expect(f.state.record.inUse.text).toBe(f.state.inputText);
        running.request.resolve('ordinary'); await running.result;
    });
});
}
