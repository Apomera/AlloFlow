// Assignment Directions fixes (2026-09-27): the view's own i18n keys, goals whose resource is
// not in the pack, packaging a subset with its directions' resources, the delete notice, the
// student's choice kept with goal progress and reported, and translated choice-board defaults.
// DIRECTIONS_FIX_ROOT points every product read at saved copies (mutation checks).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.env.DIRECTIONS_FIX_ROOT || process.cwd();
const read = file => readFileSync(resolve(ROOT, file), 'utf8');
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { renderToStaticMarkup } = require(resolve('desktop/web-app/node_modules/react-dom/server'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));

const host = read('AlloFlowANTI.txt');
const STRINGS = JSON.parse(read('ui_strings.js'));
const PUBLIC_STRINGS = JSON.parse(readFileSync(resolve('desktop/web-app/public/ui_strings.js'), 'utf8'));
// Same lookup rules as the app's t(): a miss is undefined, {name} params are filled in.
const makeT = strings => (key, params) => {
  let value = String(key).split('.').reduce((node, part) => node && node[part], strings);
  if (typeof value !== 'string' || !value) return undefined;
  for (const name of Object.keys(params || {})) value = value.replace('{' + name + '}', params[name]);
  return value;
};
const t = makeT(STRINGS);
const helperSlice = host.slice(host.indexOf('function _alloNormalizeDirectionsData('), host.indexOf('let globalAudioCtx'));
const { normalize, evaluate } = new Function(helperSlice + ';return { normalize: _alloNormalizeDirectionsData, evaluate: _alloEvaluateObjectives };')();
const adapterSlice = host.slice(host.indexOf('function _alloBuildDirectionsResultAdapter('), host.indexOf('let globalMuteEnabled'));
const adapter = new Function('_alloStudentSafeResources', 'sanitizeHtml', helperSlice + adapterSlice + ';return _alloBuildDirectionsResultAdapter;')(items => items.filter(item => item && item.type !== 'lesson-plan'), text => text);
const ctx = { window: { React, AlloModules: {}, sanitizeHtml: text => text } };
vm.runInNewContext(read('view_directions_result_module.js'), ctx);
vm.runInNewContext(read('view_directions_composer_module.js'), ctx);
const View = ctx.window.AlloModules.DirectionsResult.DirectionsResultView;
const Composer = ctx.window.AlloModules.DirectionsComposer.DirectionsComposerView;
const textOf = element => new DOMParser().parseFromString(renderToStaticMarkup(element), 'text/html').body.textContent;
const directions = (data, id = 'dir-1') => ({ id, type: 'directions', title: 'Homework', data });
const board = { enabled: true, title: 'Pick', prompt: 'Pick one.', choices: [{ resourceRef: 'res-a', label: 'Glossary' }, { resourceRef: 'res-b', label: 'Quiz' }] };
const pack = () => [
  directions({ body: 'Do it.', objectives: [{ id: 'g1', kind: 'visited', label: 'Open the notes', resourceRef: 'res-c' }], choiceBoard: board }),
  { id: 'res-a', type: 'glossary', title: 'Glossary' }, { id: 'res-b', type: 'quiz', title: 'Quiz' },
  { id: 'res-c', type: 'note-taking', title: 'Notes' }, { id: 'res-d', type: 'faq', title: 'Unrelated' },
];

describe('directions i18n: the view has its own keys', () => {
  it('shows "Your goals" and the device note, never the command palette strings', () => {
    const text = textOf(React.createElement(View, { t, title: 'Homework', bodyHtml: '',
      goalViews: [{ id: 'g1', label: 'Read', kind: 'manual', done: true }, { id: 'g2', label: 'Write', kind: 'manual', done: false }] }));
    expect(text).toContain('Your goals · 1/2');
    expect(text).not.toContain('Check assignment progress');
    expect(text).not.toContain('Hear how many assignment goals');
    expect(text).toContain(String(STRINGS.directions.goals_device_note));
    expect(t('directions.your_goals')).toBe('Check assignment progress');
  });
  it('registers every key the result view asks for, and every quest-map station type, in both string files', () => {
    const viewSource = read('view_directions_result_source.jsx');
    const alias = Object.fromEntries([...viewSource.matchAll(/(\w+): '(directions\.[a-z_]+)'/g)].map(match => [match[1], match[2]]));
    const keys = new Set([...viewSource.matchAll(/text\('([\w.]+)'/g)].map(match => alias[match[1]] || match[1]));
    expect(keys.size).toBeGreaterThan(25);
    for (const key of keys) {
      expect(t(key), key).toBeTruthy();
      expect(makeT(PUBLIC_STRINGS)(key), key).toBe(t(key));
      expect(t(key), key).not.toMatch(/[–—]/);
    }
    const registry = host.slice(host.indexOf('const _ALLO_STATION_STYLES = {'), host.indexOf('const _ALLO_STATION_FALLBACK'));
    const stations = [...registry.matchAll(/^ +'([\w-]+)': +\{[^\n]*label: '([^']+)'/gm)];
    expect(stations.length).toBeGreaterThan(25);
    for (const [, type, label] of stations) expect(t('directions.station_' + type.replace(/-/g, '_')), type).toBe(label);
  });
  it('the HTML export heads the goal list "Your goals"', () => {
    const doc = read('doc_pipeline_source.jsx');
    const shared = readFileSync(resolve('directions_markdown_source.js'), 'utf8').trim();
    const start = doc.indexOf('const generateResourceHTML =');
    const generate = new Function('exportConfig', 'isRtlLang', 'leveledTextLanguage', 'getDefaultTitle', 't', shared + doc.slice(start, doc.indexOf('\n  };', start) + 6) + ';return generateResourceHTML;')({}, () => false, 'English', () => 'Assignment Directions', t);
    const html = generate(directions({ body: 'Read.', objectives: [{ id: 'g', kind: 'manual', label: 'Read it' }] }), false);
    expect(html).toContain('<h3>Your goals</h3>');
  });
});

describe('directions whose resources are not in the pack', () => {
  it('marks a goal whose resource is missing and leaves it out of the count', () => {
    const model = adapter({ item: directions({ body: 'x', objectives: [
      { id: 'g1', kind: 'visited', label: 'Open the glossary', resourceRef: 'gone' },
      { id: 'g2', kind: 'visited', label: 'Open the quiz', resourceRef: 'quiz-1' }] }),
    history: [{ id: 'quiz-1', type: 'quiz', title: 'Quiz' }], progress: {}, signals: { visited: { 'quiz-1': true } }, parseMarkdownToHTML: text => text, t });
    expect(model.viewProps.goalViews.map(goal => goal.missing)).toEqual([true, false]);
    const text = textOf(React.createElement(View, model.viewProps));
    expect(text).toContain('Not in this pack');
    expect(text).toContain('Your goals · 1/1');
  });
  it('packaging just the directions brings the resources its goals and choice cards use', () => {
    const source = host.slice(host.indexOf('  const resolveAssignmentResources = useCallback('), host.indexOf('  // Shared packet builder'));
    const resolver = new Function('useCallback', 'history', 'generatedContent', '_alloStudentSafeResources', 'window', '_alloNormalizeDirectionsData', source + '\nreturn resolveAssignmentResources;')(
      fn => fn, pack(), null, items => items.filter(item => item && item.type !== 'lesson-plan'), { AlloModules: {} }, normalize);
    const ids = resolver(['dir-1']).map(item => item.id);
    expect(ids[0]).toBe('dir-1');
    expect(ids.slice(1).sort()).toEqual(['res-a', 'res-b', 'res-c']);
    expect(resolver(['dir-1', 'res-b']).map(item => item.id).filter(id => id === 'res-b')).toHaveLength(1);
    expect(resolver(['res-d']).map(item => item.id)).toEqual(['res-d']);
  });
  it('deleting a resource that directions use shows a notice and still deletes it', () => {
    const handlers = read('host_handlers_source.jsx');
    const start = handlers.indexOf('const handleDeleteHistoryItem = (e, id, itemRef = null) => {');
    const toasts = [];
    const d = { history: pack(), generatedContent: null, t, addToast: (message, kind) => toasts.push([message, kind]), _alloNormalizeDirectionsData: normalize,
      _alloSafeArtifactPublicIdValue: value => value == null ? '' : String(value), getArtifactInstanceId: () => '',
      findArtifactInstanceIndex: (list, instance, id) => list.findIndex(item => item && String(item.id) === id), _alloSafeArtifactField: (item, field) => item ? item[field] : undefined,
      getMathResourceStateKey: item => item ? item.id : '', sameArtifactInstance: (a, b) => a === b, getArtifactPublicId: item => item && item.id,
      clearMathResourceState: () => {}, getMathStoredProblemKeys: () => [], setHistory: update => { d.history = update(d.history); },
      removeArtifactInstanceFromList: list => list, _alloArtifactListLength: list => list.length };
    const remove = new Function('__d', handlers.slice(start, handlers.indexOf('const handleGenerateExtensionGuide', start)) + ';return handleDeleteHistoryItem;')(d);
    remove(null, 'res-b');
    expect(d.history.map(item => item.id)).not.toContain('res-b');
    expect(toasts).toEqual([['Heads up: Homework still uses this resource for a goal or activity choice. Edit the directions to update them.', 'warning']]);
    remove(null, 'res-d');
    expect(toasts).toHaveLength(1);
  });
});

describe("the student's choice is kept and reported", () => {
  const reportSource = host.slice(host.indexOf('  // Phase 2 return path (student side)'), host.indexOf('  const mbChunkStoreRef = useRef(null);'));
  async function report(item, prog) {
    const sent = []; let pending; let progress = { [item.id]: prog };
    new Function('useEffect', 'mbStudent', 'isTeacherMode', 'history', 'homeworkShelf', 'directionsProgress', '_alloNormalizeDirectionsData', '_alloEvaluateObjectives',
      '_alloObjectiveSignals', 'mbNicknameRef', 'globalPoints', 'mbRtcRef', '_alloMailboxCallWithRetry', 'setDirectionsProgress', 'warnLog', 'setTimeout', 'clearTimeout', 'gameCompletions', reportSource)(
      fn => fn(), { code: 'C1', uid: 'u1' }, false, [item], null, progress, normalize, evaluate, {}, { current: 'Ada' }, 0,
      { current: { dc: { readyState: 'open', send: text => sent.push(JSON.parse(text)) } } }, async () => {}, update => { progress = update(progress); }, () => {}, fn => { pending = fn(); return 1; }, () => {}, {});
    await pending;
    return { sent, progress: progress[item.id] };
  }
  it('reports the chosen activity, also for directions that have no goals', async () => {
    const item = directions({ body: 'Pick one.', choiceBoard: board });
    const first = await report(item, { startedAt: '2026-09-27T10:00:00Z', choice: 'res-b' });
    expect(first.sent).toHaveLength(1);
    expect(first.sent[0]).toMatchObject({ kind: 'hw-evidence', directionsId: 'dir-1', total: 0, choice: { resourceId: 'res-b', label: 'Quiz' } });
    expect((await report(item, first.progress)).sent).toHaveLength(0);
    expect((await report(item, { ...first.progress, choice: 'res-a' })).sent[0].choice).toEqual({ resourceId: 'res-a', label: 'Glossary' });
  });
  it('the teacher side keeps the reported choice', () => {
    const source = host.slice(host.indexOf('      const applyHwEvidence = (v) => {'), host.indexOf('      const answerRtcOffer = async'));
    let state = {};
    new Function('setMbHwEvidence', source + ';return applyHwEvidence;')(update => { state = update(state); })(
      { kind: 'hw-evidence', uid: 'u1', directionsId: 'dir-1', doneCount: 0, total: 0, objectives: [], choice: { resourceId: 'res-b', label: 'Quiz' } });
    expect(state['u1|dir-1'].choice).toEqual({ resourceId: 'res-b', label: 'Quiz' });
  });
  it('the selection lives in the persisted goal progress, and the return banner is translated', () => {
    expect(host).not.toContain('directionsChoiceSelection');
    expect(host).toContain("selectedChoiceRef: (directionsProgress[generatedContent.id] && directionsProgress[generatedContent.id].choice) || ''");
    expect(host).toContain('setDirectionsProgress(previous => ({ ...previous, [generatedContent.id]: { ...(previous[generatedContent.id] || {}), choice: resourceId } }));');
    expect(host).toContain("try { storageDB.set('allo_directions_progress_v1', directionsProgress); } catch (_) {}");
    expect(host).toContain("{t('directions.you_chose', { label: directionsChoiceOrigin.label }) || ('You chose ' + directionsChoiceOrigin.label + '.')}");
    expect(host).toContain(">{t('directions.back_to_directions') || 'Back to directions'}</button>");
    expect(t('directions.you_chose', { label: 'Quiz' })).toBe('You chose Quiz.');
    expect(t('directions.back_to_directions')).toBe('Back to directions');
  });
});

describe('choice-board defaults are seeded in the teacher language', () => {
  let root, node;
  afterEach(() => { if (root) act(() => root.unmount()); node?.remove(); root = node = null; });
  it('turning the board on stores the translated title and prompt', () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    let draft = { title: 'Tarea', body: 'Lee.', objectives: [] };
    const spanish = { 'directions.choice_board_title': 'Elige una actividad', 'directions.choice_board_prompt': 'Elige una actividad para empezar.' };
    const Icon = () => React.createElement('span', { 'aria-hidden': true });
    const props = { ArrowRight: Icon, ClipboardList: Icon, Sparkles: Icon, X: Icon, _alloDirectionsGoalResources: [], _alloGoalOptionsForResource: () => [],
      _alloStationStyle: () => ({}), _mbDirectionsChoiceDraftChoices: [], _mbDirectionsChoicePreviewItems: [], _mbDirectionsChoiceReady: false,
      _mbDirectionsChoiceStaleCount: 0, addDirectionsToPack: vi.fn(), deriveDirectionsDraft: vi.fn(), directionsDeriving: false, generateUUID: () => 'id',
      mbDirectionsDraft: draft, setMbDirectionsDraft: update => { draft = update(draft); }, setShowDirectionsChoicePreview: vi.fn(),
      setShowDirectionsComposer: vi.fn(), showDirectionsChoicePreview: false, t: key => spanish[key] };
    node = document.createElement('div'); document.body.appendChild(node); root = createRoot(node);
    act(() => root.render(React.createElement(Composer, props)));
    act(() => Simulate.change(node.querySelector('input[aria-label="Offer an activity choice board"]'), { target: { checked: true } }));
    expect(draft.choiceBoard).toMatchObject({ enabled: true, title: 'Elige una actividad', prompt: 'Elige una actividad para empezar.' });
  });
});
