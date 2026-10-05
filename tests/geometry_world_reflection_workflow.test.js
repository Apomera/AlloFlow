import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ENGINE_KEY = '__geoWorldEngine';
let cfg;
let reflectionModel;
let reflectionAutoPromptAllowed;
let mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThreeStub() {
  function vec() {
    const value = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion',
      'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler', 'fromArray'].forEach(name => { value[name] = () => value; });
    value.clone = () => vec(); value.distanceTo = () => 99; value.length = () => 1; value.lengthSq = () => 1;
    value.dot = () => 0; value.toArray = () => [0, 0, 0];
    return value;
  }
  return new Proxy({}, { get: (_target, property) => property === 'SRGBColorSpace' ? 'srgb' : typeof property === 'symbol' ? undefined : function() { return vec(); } });
}

function makeEngine() {
  const engine = {
    clearWorld() {}, scene: { remove() {} }, renderer: { dispose() {}, domElement: document.createElement('canvas') },
    camera: { position: { x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone: () => ({ x: 0, y: 0, z: 0 }) },
      quaternion: { x: 0, y: 0, z: 0, w: 1 }, rotation: { x: 0, y: 0, z: 0 },
      getWorldDirection: value => value || { x: 0, y: 0, z: -1 }, updateProjectionMatrix() {} },
    blocks: {}, npcs: [], blocksPlaced: 0, sessionLog: [], raycaster: null,
    flyMode: false, moveState: {}, velocity: { x: 0, y: 0, z: 0 }, onGround: true,
    _undoStack: [], _redoStack: [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [],
    loadLesson() {}, placeBlock() {}, removeBlock() {}, releaseInput() {},
    setLayerFocus: vi.fn(), clearLayerFocus: vi.fn(), applyRenderQuality: preference => ({ label: preference })
  };
  engine.logEvent = vi.fn((type, data) => engine.sessionLog.push({ type, data }));
  return engine;
}

function measured(overrides) {
  return Object.assign({ L: 2, W: 2, H: 3, count: 12, occupiedVolume: 12, totalVolume: 12,
    boundingVolume: 12, missingVolume: 0, shapeCounts: { cube: 12 }, materialCounts: { stone: 12 },
    blocks: [{ x: 0, y: 1, z: 0 }], isSolidPrism: true, isComplete: true, fillPercent: 100,
    surfaceAreaExact: true, exposedSurfaceArea: 32, surfaceArea: 32, t: 1000 }, overrides);
}

function mountTool(overrides) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({
    _introShownOnce: true, worldActive: true, tutorialDismissed: true, activeLesson: 'volumeExplorer',
    score: 0, totalQ: 3, objectivesOpen: false, hudPanel: '', showGeometryHome: false
  }, overrides) };
  let bump;
  const context = makeCtx({ toolData,
    update(section, key, value) { toolData[section] = Object.assign({}, toolData[section], { [key]: value }); if (bump) bump(); },
    updateMulti(section, patch) { toolData[section] = Object.assign({}, toolData[section], patch); if (bump) bump(); }
  });
  function Host() { const state = React.useState(0); bump = () => state[1](value => value + 1); return cfg.render(context); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, toolData, bucket: () => toolData.geometryWorld,
    patch(value) { React.act(() => context.updateMulti('geometryWorld', value)); } };
  return mounted;
}

function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function write(node, value) {
  React.act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function settleFocus() { await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 1)); }); }
function reflectionEvents() { return window[ENGINE_KEY].sessionLog.filter(event => event.type === 'reflection'); }

beforeAll(() => {
  resetStemLab(); window.THREE = makeThreeStub();
  cfg = loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld');
  reflectionModel = window.StemLab.geometryWorldLessonChecks.reflectionModel;
  reflectionAutoPromptAllowed = window.StemLab.geometryWorldLessonChecks.reflectionAutoPromptAllowed;
});
beforeEach(() => {
  window.localStorage.removeItem('allo.geometryworld.hud.v1');
  window.THREE = makeThreeStub(); window[ENGINE_KEY] = makeEngine();
});
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = '';
});

describe('Geometry World reflection support model', () => {
  it('uses exact exposed faces in square units for a surface investigation', () => {
    const model = reflectionModel({}, 'areaSurface', measured(), { prediction: 10 }, { prediction: 12 });
    expect(model).toMatchObject({ concept: 'surface', evidence: true });
    expect(model.prompt).toContain('32 square units of exposed surface');
    expect(model.prompt).not.toContain('cubic units');
    expect(model.questions).toHaveLength(3); expect(model.starter).toContain('The evidence was');
  });

  it('does not call partial-block or inexact surface numbers exact evidence', () => {
    for (const measurement of [measured({ surfaceAreaExact: false }), measured({ surfaceAreaExact: undefined }), measured({ exposedSurfaceArea: NaN }), measured({ isComplete: false })]) {
      const model = reflectionModel({}, 'areaSurface', measurement);
      expect(model.evidence).toBe(false); expect(model.prompt).not.toContain('You measured');
      expect(model.prompt).toContain('Which faces are exposed');
    }
  });

  it.each(['volumeExplorer', 'compositeVolume', 'fractionVolume', 'fractionBuilder'])('keeps occupied volume evidence for %s', key => {
    const model = reflectionModel({}, key, measured({ occupiedVolume: 1.5 }), { prediction: 2, strategy: 'fractional pieces' }, { prediction: 1.5 });
    expect(model.evidence).toBe(true); expect(model.prompt).toContain('measured 1 1/2');
    expect(model.prompt).toContain('predicted 2 cubic units'); expect(model.prompt).toContain('revised your prediction to 1 1/2');
  });

  it('uses occupied volume for a free-build design without assuming a filled box', () => {
    const model = reflectionModel({ sandbox: true }, 'builderSandbox', measured({ occupiedVolume: 8, boundingVolume: 12, isSolidPrism: false }));
    expect(model).toMatchObject({ concept: 'build', evidence: true });
    expect(model.prompt).toContain('measured 8 cubic units'); expect(model.prompt).not.toContain('measured 12');
  });

  it('does not supply numeric evidence for incomplete or nonfinite volumes', () => {
    for (const measurement of [measured({ isComplete: false }), measured({ occupiedVolume: NaN }), measured({ occupiedVolume: Infinity }), null]) {
      const model = reflectionModel({}, 'volumeExplorer', measurement);
      expect(model.evidence).toBe(false); expect(model.prompt).not.toContain('You measured');
      expect(model.prompt).toContain('Which equal layers or separate parts');
      expect(model.prompt).not.toContain('NaN'); expect(model.prompt).not.toContain('Infinity');
    }
  });

  it.each([
    [{ title: 'Angle investigation', objectives: ['Compare turns'] }, 'saved-angle', 'geometry', 'What quantity are you investigating'],
    [{ title: 'Trace perimeter', objectives: ['Trace the outside boundary'] }, 'saved-boundary', 'perimeter', 'outside boundary'],
    [{}, 'scaleUp', 'scale', 'Which dimensions change']
  ])('uses the lesson question instead of unrelated measurement quantities (%s)', (lesson, key, concept, question) => {
    const model = reflectionModel(lesson, key, measured());
    expect(model).toMatchObject({ concept, evidence: false });
    expect(model.prompt).toContain(question); expect(model.prompt).not.toContain('You measured');
  });

  it('reads complete nested session measurement data without mutating it', () => {
    const record = { data: { isComplete: true, volume: 24 } };
    const before = JSON.stringify(record);
    expect(reflectionModel({}, 'volumeExplorer', record).prompt).toContain('measured 24 cubic units');
    expect(JSON.stringify(record)).toBe(before);
  });
});

describe('Geometry World delayed reflection guard', () => {
  const complete = { activeLesson: 'volumeExplorer', worldActive: true, score: 3, totalQuestions: 3 };

  it('allows only a still-active completed lesson with a finite positive question count', () => {
    expect(reflectionAutoPromptAllowed(complete, 'volumeExplorer')).toBe(true);
    expect(reflectionAutoPromptAllowed({ ...complete, score: 4 }, 'volumeExplorer')).toBe(true);
    expect(reflectionAutoPromptAllowed(null, 'volumeExplorer')).toBe(false);
    expect(reflectionAutoPromptAllowed({}, 'volumeExplorer')).toBe(false);
  });

  it('does not follow the learner into a changed lesson, replay, or inactive world', () => {
    expect(reflectionAutoPromptAllowed({ ...complete, activeLesson: 'areaSurface' }, 'volumeExplorer')).toBe(false);
    expect(reflectionAutoPromptAllowed({ ...complete, score: 0 }, 'volumeExplorer')).toBe(false);
    expect(reflectionAutoPromptAllowed({ ...complete, worldActive: false }, 'volumeExplorer')).toBe(false);
  });

  it('does not open over Home, an NPC interaction, reflection, or another dialog', () => {
    for (const flag of ['showReflection', 'showGeometryHome', 'showLessonIntro', 'showNpcDialog', 'showGameSettings',
      'showMyLessons', 'showTeacherView', 'showPeerWorlds', 'showLessonEditor', 'showHelp', 'showCreatorPanel', 'showGrowthNudge',
      'creatorMode', 'showActivityGuide', 'objectivesOpen', 'showPredictionPanel']) {
      expect(reflectionAutoPromptAllowed({ ...complete, [flag]: true }, 'volumeExplorer'), flag).toBe(false);
    }
  });

  it('rejects nonfinite scores and nonpositive or nonnumeric question totals', () => {
    for (const score of [NaN, Infinity, -Infinity, '3']) {
      expect(reflectionAutoPromptAllowed({ ...complete, score }, 'volumeExplorer')).toBe(false);
    }
    for (const totalQuestions of [0, -1, NaN, Infinity, '3', null]) {
      expect(reflectionAutoPromptAllowed({ ...complete, totalQuestions }, 'volumeExplorer')).toBe(false);
    }
  });
});

describe('Geometry World optional reflection workflow', () => {
  it('opens from the learning path before any question is complete and retains the draft', () => {
    const view = mountTool({ objectivesOpen: true, reflectionText: 'I noticed equal layers.' });
    click(view.container.querySelector('[data-geometry-reflect-trigger="learning-path"]'));
    expect(view.bucket()).toMatchObject({ showReflection: true, objectivesOpen: false, score: 0, totalQ: 3 });
    const dialog = view.container.querySelector('.gw-reflection-backdrop .gw-reflection-dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.querySelector('#gw-reflection-text').value).toBe('I noticed equal layers.');
    expect(dialog.querySelector('#gw-reflection-text').maxLength).toBe(600);
    expect(dialog.querySelector('.gw-reflection-support summary').textContent).toBe('Thinking prompts');
    expect(reflectionEvents()).toHaveLength(0);
  });

  it('keeps reflection visible when the learner has hidden the HUD controls', () => {
    const view = mountTool();
    click(view.container.querySelector('[data-gw-utility="hide"]'));
    expect(view.bucket().hudHidden).toBe(true);
    view.patch({ showReflection: true });
    const backdrop = view.container.querySelector('.gw-reflection-backdrop');
    expect(backdrop).toBeTruthy();
    expect(view.container.querySelector('#geoworld-fs-workspace').dataset.hudHidden).toBe('true');
    expect(window.getComputedStyle(backdrop).display).not.toBe('none');
    expect(backdrop.querySelector('.gw-reflection-dialog')).toBeTruthy();
  });

  it('opens for a zero-question build and keeps edited text when continuing without saving', async () => {
    const view = mountTool({ activeLesson: 'builderSandbox', totalQ: 0, measureResult: measured(), measureHistory: [measured()] });
    click(view.container.querySelector('[data-geometry-reflect-trigger="measurement"]'));
    write(view.container.querySelector('#gw-reflection-text'), 'My two shapes have equal occupied space.');
    click(view.container.querySelector('.gw-reflection-skip')); await settleFocus();
    expect(view.bucket().showReflection).toBe(false); expect(view.bucket().score).toBe(0);
    expect(reflectionEvents()).toHaveLength(0);
    click(view.container.querySelector('[data-geometry-reflect-trigger="measurement"]'));
    expect(view.container.querySelector('#gw-reflection-text').value).toBe('My two shapes have equal occupied space.');
  });

  it('blocks blank saves and logs only an explicitly saved trimmed reflection', async () => {
    const view = mountTool({ activeLesson: 'builderSandbox', totalQ: 0, measureResult: measured(), measureHistory: [measured()] });
    click(view.container.querySelector('[data-geometry-reflect-trigger="measurement"]'));
    const text = view.container.querySelector('#gw-reflection-text');
    write(text, '   '); expect(view.container.querySelector('.gw-reflection-save').disabled).toBe(true);
    click(view.container.querySelector('.gw-reflection-save')); expect(reflectionEvents()).toHaveLength(0);
    write(text, '  I tested another way to count all the layers.  ');
    click(view.container.querySelector('.gw-reflection-save')); await settleFocus();
    expect(reflectionEvents()).toHaveLength(1);
    expect(reflectionEvents()[0].data).toMatchObject({ text: 'I tested another way to count all the layers.', measuredVolume: 12 });
    expect(view.bucket().showReflection).toBe(false); expect(view.bucket().score).toBe(0);
  });

  it('does not substitute prior complete evidence for the current incomplete structure', async () => {
    const prior = measured({ occupiedVolume: 24, t: 1000 });
    const current = measured({ occupiedVolume: 999, count: 999, isComplete: false, t: 2000 });
    const view = mountTool({ measureResult: current, measureHistory: [prior, current] });
    click(view.container.querySelector('[data-geometry-reflect-trigger="measurement"]'));
    const prompt = view.container.querySelector('#gw-reflection-prompt');
    expect(prompt.dataset.geometryReflectionEvidence).toBe('general');
    expect(prompt.textContent).not.toContain('You measured');
    expect(prompt.textContent).not.toContain('24'); expect(prompt.textContent).not.toContain('999');
    expect(prompt.textContent).toContain('Which equal layers or separate parts');
    write(view.container.querySelector('#gw-reflection-text'), 'I need more complete evidence before comparing this structure.');
    click(view.container.querySelector('.gw-reflection-save')); await settleFocus();
    expect(reflectionEvents()).toHaveLength(1);
    expect(reflectionEvents()[0].data).toMatchObject({ concept: 'volume', measuredVolume: null });
  });

  it('loops dialog focus through Thinking prompts without hidden or closed-details controls', () => {
    const view = mountTool({ showReflection: true });
    const dialog = view.container.querySelector('.gw-reflection-dialog');
    const details = dialog.querySelector('.gw-reflection-support');
    const summary = details.querySelector('summary');
    const last = dialog.querySelector('.gw-reflection-skip');
    const hidden = document.createElement('button'); hidden.hidden = true; dialog.prepend(hidden);
    const inert = document.createElement('div'); inert.setAttribute('inert', ''); inert.append(document.createElement('button')); dialog.append(inert);
    const cssHidden = document.createElement('button'); cssHidden.style.display = 'none'; dialog.append(cssHidden);
    const closedControl = document.createElement('button'); details.append(closedControl);
    expect(details.open).toBe(false);
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    React.act(() => { last.focus(); last.dispatchEvent(forward); });
    expect(forward.defaultPrevented).toBe(true); expect(document.activeElement).toBe(summary);
    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    React.act(() => summary.dispatchEvent(backward));
    expect(backward.defaultPrevented).toBe(true); expect(document.activeElement).toBe(last);
  });

  it('returns focus to a still-visible measurement opener when reflection closes', async () => {
    const view = mountTool({ activeLesson: 'builderSandbox', totalQ: 0, measureResult: measured(), measureHistory: [measured()] });
    const opener = view.container.querySelector('[data-geometry-reflect-trigger="measurement"]');
    vi.spyOn(opener, 'getClientRects').mockReturnValue([{ width: 100, height: 44 }]);
    opener.focus(); click(opener); click(view.container.querySelector('.gw-reflection-skip')); await settleFocus();
    expect(document.activeElement).toBe(opener);
  });

  it('returns focus to the world when a learning-path opener has been removed', async () => {
    const view = mountTool({ objectivesOpen: true });
    const opener = view.container.querySelector('[data-geometry-reflect-trigger="learning-path"]');
    opener.focus(); click(opener); expect(opener.isConnected).toBe(false);
    click(view.container.querySelector('.gw-reflection-skip')); await settleFocus();
    expect(document.activeElement).toBe(view.container.querySelector('#geoworld-fs-wrap'));
  });

  it('returns focus to the completion dialog when one becomes visible after reflection', async () => {
    const view = mountTool({ score: 3, totalQ: 3, showReflection: true });
    expect(view.container.querySelector('.gw-completion-dialog')).toBeNull();
    click(view.container.querySelector('.gw-reflection-skip')); await settleFocus();
    const completion = view.container.querySelector('.gw-completion-dialog');
    expect(completion).toBeTruthy(); expect(document.activeElement).toBe(completion);
  });

  it('opens reflection explicitly from completion when a delayed prompt was not eligible', async () => {
    const view = mountTool({ score: 3, totalQ: 3, showGeometryHome: true, reflectionText: 'I checked every layer.' });
    expect(reflectionAutoPromptAllowed({ activeLesson: 'volumeExplorer', worldActive: true, score: 3, totalQuestions: 3, showGeometryHome: true }, 'volumeExplorer')).toBe(false);
    view.patch({ showGeometryHome: false });
    const opener = view.container.querySelector('.gw-completion-reflect');
    opener.focus(); click(opener);
    expect(view.container.querySelector('.gw-completion-dialog')).toBeNull();
    expect(view.container.querySelector('.gw-reflection-dialog')).toBeTruthy();
    expect(view.container.querySelector('#gw-reflection-text').value).toBe('I checked every layer.');
    expect(view.bucket()).toMatchObject({ showReflection: true, score: 3, totalQ: 3 });
    click(view.container.querySelector('.gw-reflection-skip')); await settleFocus();
    expect(document.activeElement).toBe(view.container.querySelector('.gw-completion-dialog'));
    expect(reflectionEvents()).toHaveLength(0);
  });

  it('returns focus to the world after closing the measurement inspector', async () => {
    const view = mountTool({ activeLesson: 'builderSandbox', totalQ: 0, measureResult: measured(), measureHistory: [measured()] });
    click(view.container.querySelector('[aria-label="Close measurement inspector"]')); await settleFocus();
    expect(view.bucket().measureResult).toBeNull();
    expect(document.activeElement).toBe(view.container.querySelector('#geoworld-fs-wrap'));
  });

  it('shows explanation prerequisites and identifies self-check evidence as ungraded', () => {
    const view = mountTool({ activeLesson: 'builderSandbox', totalQ: 0, measureResult: measured(), measureHistory: [measured()],
      volumeRepresentationKey: 'rotated_layers', volumeRepresentationFromKey: 'layers' });
    const readiness = () => view.container.querySelector('#gw-connection-readiness');
    const save = () => view.container.querySelector('.gw-measure-save-connection');
    expect(readiness().dataset.ready).toBe('false'); expect(readiness().textContent).toContain('fuller explanation');
    click(save()); expect(window[ENGINE_KEY].sessionLog.filter(event => event.type === 'representation_connection')).toHaveLength(0);
    write(view.container.querySelector('#gw-representation-reason'), 'The same cubes are grouped into differently oriented layers.');
    for (const checkbox of view.container.querySelectorAll('[aria-label="Explanation self-check"] input')) click(checkbox);
    expect(readiness().dataset.ready).toBe('true'); expect(readiness().textContent).toContain('your own review');
    click(save()); expect(readiness().textContent).toContain('not automatically graded');
    expect(save().disabled).toBe(true);
    const events = window[ENGINE_KEY].sessionLog.filter(event => event.type === 'representation_connection');
    expect(events).toHaveLength(1); expect(events[0].data.selfCheck).toEqual({ invariant: true, evidence: true });
  });
});
