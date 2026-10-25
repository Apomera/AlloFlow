// Main-24 fix pass, lane E "delivery" (2026-10-25).
// Env vars swap in scratch copies so every case can be mutation-checked
// without touching the live tree: FIX1025E_ANTI, FIX1025E_ANTI_DUP,
// FIX1025E_ST, FIX1025E_FPR, FIX1025E_BANNER.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const ROOT = process.cwd();
const read = (envName, file) => fs.readFileSync(path.resolve(ROOT, process.env[envName] || file), 'utf8');
const ANTIS = [
  ['root ANTI', read('FIX1025E_ANTI', 'AlloFlowANTI.txt')],
  ['desktop ANTI', read('FIX1025E_ANTI_DUP', 'desktop/web-app/src/AlloFlowANTI.txt')],
];
const ST_SOURCE = read('FIX1025E_ST', 'session_transport_module.js');
const FPR_SOURCE = read('FIX1025E_FPR', 'view_full_pack_run_module.js');
const BANNER_SOURCE = read('FIX1025E_BANNER', 'view_guided_mode_banner_module.js');

const slice = (src, start, end) => {
  const a = src.indexOf(start);
  const b = src.indexOf(end, a + 1);
  if (a < 0 || b < 0) throw new Error('region not found: ' + start);
  return src.slice(a, b);
};

let ST;
beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.SessionTransport;
  new Function(ST_SOURCE)();
  ST = window.AlloModules.SessionTransport;
  delete window.AlloModules.FullPackRunView;
  new Function(FPR_SOURCE)();
  delete window.AlloModules.GuidedModeBanner;
  window.Audio = window.Audio || function () { return { play: () => Promise.resolve(), pause() {} }; };
  if (!window.requestAnimationFrame) window.requestAnimationFrame = () => 0;
  if (!window.cancelAnimationFrame) window.cancelAnimationFrame = () => {};
  new Function(BANNER_SOURCE)();
  if (!ST || !window.AlloModules.FullPackRunView || !window.AlloModules.GuidedModeBanner?.GuidedModeBanner) throw new Error('modules missing');
});
const cleanups = [];
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()); vi.restoreAllMocks(); });
beforeEach(() => { try { localStorage.clear(); } catch (_) {} });

function mount(Component, props) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(Component, props)));
  cleanups.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, render: next => act(() => root.render(React.createElement(Component, next))) };
}

// ── Finding 7: SessionTransport drops review copies itself ──
describe('E7: SessionTransport never republishes a student submission copy', () => {
  const reading = { id: 'r1', type: 'simplified', data: 'Plants make sugar.' };
  const review = { id: 'sub-1', type: 'quiz', data: { submissionCopy: true, questions: [{ question: 'Q', correctAnswer: 'A' }] } };
  it('studentSafeResources removes submissionCopy items even when the caller did not', () => {
    const out = ST.studentSafeResources([reading, review], ['lesson-plan'], () => null);
    expect(out.map(item => item.id)).toEqual(['r1']);
  });
  it('a review copy re-added by reading-pair expansion is still dropped', () => {
    window.AlloModules.InstructionalContext = { ensureReadingSourcePairs: items => items.concat([review]) };
    try {
      expect(ST.studentSafeResources([reading], [], () => null).map(item => item.id)).toEqual(['r1']);
    } finally { delete window.AlloModules.InstructionalContext; }
  });
  it('the Firebase adapter publishes no review copy', async () => {
    const write = vi.fn(async () => {});
    const transport = ST.createFirebaseTransport({ uploadAssets: items => items, prepareResources: items => ({ resources: items, keptCount: items.length, droppedCount: 0, byteLength: 1 }), write, teacherOnlyTypes: [] });
    await transport.publishResources([reading, review]);
    expect(write.mock.calls[0][0].resources.map(item => item.id)).toEqual(['r1']);
  });
});

describe.each(ANTIS)('ANTI regions (%s)', (_, ANTI) => {
  // ── Finding 8: Gemini Canvas build prompts stay with the teacher ──
  it('E8: gemini-bridge is teacher-only on the inline rule and through SessionTransport', () => {
    const body = slice(ANTI, 'const TEACHER_ONLY_TYPES = [', 'const _alloIsStudentSafeResource =');
    const rule = modules => new Function('window', body + '\nreturn { TEACHER_ONLY_TYPES, _alloStudentSafeResources };')({ AlloModules: modules });
    const bridge = { id: 'b1', type: 'gemini-bridge', data: ['Create a single file React app that...'] };
    const reading = { id: 'r1', type: 'simplified', data: 'text' };
    const inline = rule({});
    expect(inline.TEACHER_ONLY_TYPES).toContain('gemini-bridge');
    expect(inline._alloStudentSafeResources([bridge, reading]).map(item => item.id)).toEqual(['r1']);
    expect(rule({ SessionTransport: ST })._alloStudentSafeResources([bridge, reading]).map(item => item.id)).toEqual(['r1']);
  });

  // ── Finding 5: analysis / alignment-report / math runs are not 'unknown' ──
  it('E5: generation metrics name analysis, alignment-report and math runs', () => {
    const body = "const ALLO_GENERATION_METRICS_KEY = 'fix1025e-metrics';\n" + slice(ANTI, 'const ALLO_GENERATION_METRICS = (() => {', "if (typeof window !== 'undefined') window.AlloGenerationMetrics");
    const metrics = new Function(body + '\nreturn ALLO_GENERATION_METRICS;')();
    metrics.reset();
    ['analysis', 'alignment-report', 'math', 'quiz'].forEach(type => metrics.record('resource-finish', { type, status: 'landed', durationMs: 10 }));
    const resources = metrics.snapshot().resources;
    expect(Object.keys(resources).sort()).toEqual(['alignment-report', 'analysis', 'math', 'quiz']);
    expect(resources.unknown).toBeUndefined();
  });

  // ── Finding 4: no cross-unit glossary ──
  it('E4: a unit-B reading with no unit-B glossary gets no glossary (no highlighting, no cloze)', () => {
    const helper = slice(ANTI, '  const _findRelatedHistoryItem =', '  const latestGlossary = React.useMemo(');
    const memo = slice(ANTI, '  const latestGlossary = React.useMemo(', '  const isClozeComplete');
    const latest = (history, active) => new Function('React', 'history', 'generatedContent', 'warnLog', helper + memo + '\nreturn latestGlossary;')({ useMemo: fn => fn() }, history, active, () => {});
    const glossA = { id: 'g-a', type: 'glossary', unitId: 'unit-a', sourceFamilyId: 'fam-a', data: [{ term: 'Erosion', def: 'Wearing away.' }] };
    const readingB = { id: 't-b', type: 'simplified', unitId: 'unit-b', sourceFamilyId: 'fam-b', data: 'Orbits are paths.' };
    const familyOnly = { id: 't-f', type: 'simplified', sourceFamilyId: 'fam-z', data: 'x' };
    expect(latest([glossA, readingB], readingB)).toEqual([]);
    expect(latest([glossA, familyOnly], familyOnly)).toEqual([]);
    // Its own unit still resolves, and an unlabelled legacy reading keeps the newest.
    expect(latest([glossA, readingB], { ...readingB, unitId: 'unit-a' }).map(item => item.term)).toEqual(['Erosion']);
    expect(latest([glossA], { id: 'legacy', type: 'simplified', data: 'x' }).map(item => item.term)).toEqual(['Erosion']);
  });
});

// ── Finding 2: delivery routes outside Guided Mode ──
const Icon = () => null;
const ICONS = ['AlertTriangle', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'ChevronDown', 'Clock', 'Copy', 'Cpu', 'Download', 'Eye', 'EyeOff', 'ImageIcon', 'Plus', 'RefreshCw', 'Sparkles', 'StopCircle', 'Trash2'];
function fprProps(overrides = {}) {
  const props = {
    GUIDED_DELIVERY_GROUPS: [], aiCapability: { text: true }, t: () => '', guidedMode: false, guidedActiveSteps: [], guidedStep: 0,
    history: [], fullPackRun: null, hasSourceOrAnalysis: true, isProcessing: false, isTeacherMode: true, isParentMode: false, isIndependentMode: false,
    openExportPreview: vi.fn(), createGuidedHomeworkShare: vi.fn(), setShowSessionStartOptions: vi.fn(), openStudentQrPreview: vi.fn(() => true),
    selectToolFromCatalog: vi.fn(), handlePlanFullPack: vi.fn(), handleApproveFullPack: vi.fn(), handleStopFullPack: vi.fn(),
    recentQrShares: [{ url: 'https://example.test/s/1' }], qrShareModal: null, resourceCount: 'Auto', isAutoConfigEnabled: true,
    setIsAutoConfigEnabled: vi.fn(), setResourceCount: vi.fn(), rosterKey: null,
    ...overrides,
  };
  ICONS.forEach(name => { props[name] = Icon; });
  return props;
}
const routes = host => host.querySelector('[data-testid="full-pack-delivery-routes"]');
const routeButton = (host, label) => Array.from(routes(host)?.querySelectorAll('button') || []).find(button => button.textContent.includes(label));

describe('E2: Package & Deliver routes outside Guided Mode', () => {
  const reading = { id: 'r1', type: 'simplified', data: 'text' };
  it('stays hidden with nothing to deliver, and appears once a resource exists', () => {
    const view = mount(window.AlloModules.FullPackRunView, fprProps());
    expect(routes(view.host)).toBeNull();
    view.render(fprProps({ history: [reading] }));
    expect(routes(view.host)).not.toBeNull();
    ['Open Document Builder', 'Create Homework QR', 'Teach live', 'Test latest student link'].forEach(label => expect(routeButton(view.host, label), label).toBeTruthy());
  });
  it('appears after a finished run even before history refreshes', () => {
    const view = mount(window.AlloModules.FullPackRunView, fprProps({ fullPackRun: { status: 'completed', runId: 'run-12345678', resources: {} } }));
    expect(routes(view.host)).not.toBeNull();
  });
  it('locks every route while a run is writing', () => {
    const view = mount(window.AlloModules.FullPackRunView, fprProps({ history: [reading], fullPackRun: { status: 'running', runId: 'run-12345678', resources: {} } }));
    const buttons = Array.from(routes(view.host).querySelectorAll('button'));
    expect(buttons.length).toBe(4);
    buttons.forEach(button => expect(button.disabled, button.textContent).toBe(true));
    expect(view.host.querySelector('[data-testid="full-pack-delivery-locked"]').textContent).toContain('Full Pack run finishes');
  });
  it('"Test latest student link" goes through the host preview helper so the evidence is recorded', () => {
    const previewGuidedStudentAssignment = vi.fn(() => true);
    const props = fprProps({ history: [reading], previewGuidedStudentAssignment });
    const view = mount(window.AlloModules.FullPackRunView, props);
    act(() => routeButton(view.host, 'Test latest student link').click());
    expect(previewGuidedStudentAssignment).toHaveBeenCalledTimes(1);
    expect(props.openStudentQrPreview).not.toHaveBeenCalled();
  });
  it('falls back to the plain preview when the helper is not wired, and translates labels', () => {
    const keys = { 'fullpack.delivery_title': 'TITLE-X', 'fullpack.delivery_test_link': 'TEST-X', 'fullpack.delivery_document_builder': 'DOC-X' };
    const props = fprProps({ history: [reading], t: key => keys[key] || '' });
    const view = mount(window.AlloModules.FullPackRunView, props);
    expect(routes(view.host).textContent).toContain('TITLE-X');
    expect(routeButton(view.host, 'DOC-X')).toBeTruthy();
    act(() => routeButton(view.host, 'TEST-X').click());
    expect(props.openStudentQrPreview).toHaveBeenCalledWith('https://example.test/s/1', 'homework link as a student');
  });
  it('Guided Mode still shows the routes only on its delivery step', () => {
    const steps = [{ id: 'analysis' }, { id: 'package-deliver' }];
    const view = mount(window.AlloModules.FullPackRunView, fprProps({ guidedMode: true, guidedActiveSteps: steps, guidedStep: 0, history: [reading] }));
    expect(routes(view.host)).toBeNull();
    view.render(fprProps({ guidedMode: true, guidedActiveSteps: steps, guidedStep: 1, history: [] }));
    expect(routes(view.host)).not.toBeNull();
  });
});

// ── Finding 3: computed answer-key readiness ──
describe('E3: readiness computes whether answer keys reach students', () => {
  const finalSteps = [{ id: '_final', phase: 'finish', label: 'Review & Finish', action: 'Review the lesson.', success: 'All set.' }];
  const quiz = timing => ({ id: 'q-' + timing, type: 'quiz', data: { questions: [{ question: 'Q', options: ['a', 'b'], correctAnswer: 'a' }], deliverySettings: { feedbackTiming: timing } } });
  const reading = { id: 'r1', type: 'simplified', data: 'Plants use light.' };
  const props = (history, setting) => {
    if (setting) localStorage.setItem('allo_guided_delivery_preferences', JSON.stringify({ setting, priority: 'accessible' }));
    return {
      GUIDED_STEPS: finalSteps, allGuidedSteps: finalSteps, guidedSelectedIds: null, toggleGuidedStepId: null, GUIDED_TOUR_MAP: {}, guidedStep: 0,
      guidedRect: null, guidedEngaged: false, wizardOpen: false, handleExitGuidedMode: () => {}, handleGuidedSkip: () => {}, setGuidedStep: () => {},
      setShowGuidedTip: () => {}, showGuidedTip: false, t: () => '', tourSteps: [], history, getDefaultTitle: type => type,
      inputText: 'A source passage that is long enough to count.', setInputText: () => {}, guidedCompletedIds: [], guidedSkippedIds: [],
      guidedCreatedHistoryIds: history.map(item => item.id), wordSoundsHistory: [], markGuidedStepDone: () => {}, guidedDeliveryEvidence: {},
    };
  };
  const item = host => host.querySelector('[data-readiness-item="answer-keys"]');
  const box = host => item(host).querySelector('input[type="checkbox"]');
  const Banner = () => window.AlloModules.GuidedModeBanner.GuidedModeBanner;

  it('a graded quiz on the homework route is verified automatically', () => {
    const view = mount(Banner(), props([reading, quiz('teacher-graded')], 'take-home'));
    expect(item(view.host).getAttribute('data-readiness-state')).toBe('hidden');
    expect(box(view.host).checked).toBe(true);
    expect(box(view.host).disabled).toBe(true);
  });
  it('a teacher-release quiz on a live route keeps its key off devices (fix1025 A2)', () => {
    const view = mount(Banner(), props([reading, quiz('teacher-release')], 'live'));
    expect(item(view.host).getAttribute('data-readiness-state')).toBe('hidden');
    expect(box(view.host).checked).toBe(true);
  });
  it.each(['immediate', 'after-submit'])('a %s quiz sends its key: shown, unchecked, and not overridable', timing => {
    const view = mount(Banner(), props([reading, quiz(timing), quiz('teacher-graded')], 'live'));
    expect(item(view.host).getAttribute('data-readiness-state')).toBe('shared');
    expect(item(view.host).textContent).toContain('with 1 quiz(zes)');
    expect(box(view.host).checked).toBe(false);
    expect(box(view.host).disabled).toBe(true);
    expect(view.host.textContent).toContain('0/6');
  });
  it('a stale manual tick cannot mark shared keys as hidden', () => {
    const history = [quiz('immediate')];
    const view = mount(Banner(), props(history, 'live'));
    const saved = JSON.parse(localStorage.getItem('allo_guided_readiness_checks') || '{}');
    localStorage.setItem('allo_guided_readiness_checks', JSON.stringify({ ...saved, version: 2, checks: { 'answer-keys': true } }));
    cleanups.splice(0).reverse().forEach(fn => fn());
    const again = mount(Banner(), props(history, 'live'));
    expect(box(again.host).checked).toBe(false);
    expect(again.host.textContent).toContain('0/6');
  });
  it('printed or LMS exports stay a manual confirmation', () => {
    const view = mount(Banner(), props([reading, quiz('teacher-graded')], 'print'));
    expect(item(view.host).getAttribute('data-readiness-state')).toBe('confirm');
    expect(box(view.host).disabled).toBe(false);
    act(() => box(view.host).click());
    expect(box(view.host).checked).toBe(true);
  });
  it('a resource type the code cannot vouch for stays manual', () => {
    const view = mount(Banner(), props([{ id: 'c1', type: 'concept-sort', data: {} }], 'take-home'));
    expect(item(view.host).getAttribute('data-readiness-state')).toBe('confirm');
  });
});
