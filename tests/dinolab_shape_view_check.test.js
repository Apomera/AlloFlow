// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url), React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync(resolve(process.env.DINO_VIEW_CHECK_SOURCE || 'stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
const marker = "window.StemLab.registerTool('dinoLab'", mounted = [], frames = [];
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT, previousRaf = window.requestAnimationFrame;
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; }; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct; window.requestAnimationFrame = previousRaf; });
afterEach(async () => { for (const { root, host } of mounted.splice(0)) { await React.act(async () => root.unmount()); host.remove(); } for (const key of ['__viewCheckProps', '__viewCheckYaw', '__viewCheckCamera']) delete window[key]; frames.splice(0); });
function block(start, end) { const a = source.indexOf(start), b = source.indexOf(end, a); if (a < 0 || b <= a) throw new Error('Missing view-check source seam ' + start); return source.slice(a, b); }
function load() {
  const captured = { ensures: 0 };
  window.StemLab = { ensureThree() { captured.ensures++; return new Promise(() => {}); }, registerTool(_id, cfg) { captured.cfg = cfg; } };
  new Function(source.replace('function DinoFieldStation3D(props) {', 'function DinoFieldStation3D(props) { window.__viewCheckProps = props;')
    .replace('var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 });', 'var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 }); window.__viewCheckYaw = yawRef;')
    .replace('var cameraControlRef = React.useRef(null);', 'var cameraControlRef = React.useRef(null); window.__viewCheckCamera = cameraControlRef;')
    .replace(marker, 'globalThis.__viewCheckContract = { DINOS, dinoShapeStudyFor, dinoShapeViewContextKey, dinoShapeViewCapture, dinoShapeViewAngle, dinoShapeViewCaption, dinoShapeViewNotebookAppend, dinoDetailedBodyPartDefinitions, skeletalAnatomyProfileFor, reconstructionHypothesesFor, comparisonPairKey, comparisonInquiryState }; ' + marker))();
  const art = globalThis.__viewCheckContract; delete globalThis.__viewCheckContract;
  const dn = id => art.DINOS.find(entry => entry.id === id);
  function parts(id) { const animal = dn(id), profile = art.skeletalAnatomyProfileFor(animal), active = art.reconstructionHypothesesFor(animal, profile, 'evidence').active; return art.dinoDetailedBodyPartDefinitions(animal, profile.weightBearingForelimbs, active); }
  return { art, dn, parts, cfg: captured.cfg, ensures: () => captured.ensures };
}
const captureCode = block('            activeCameraControl.captureShapeView = function () {', '            cameraControlRef.current = activeCameraControl;');
function productionCapture(api, props, pose, visible, effects, ready = true) {
  const create = new Function('shapeStudyRef', 'props', 'readySpeciesRef', 'updateCameraView', 'layoutBodyPartLabels', 'requestSceneRender', 'dinoShapeViewCapture', 'yaw', 'pitch', 'zoom', 'bodyOpacityRef', 'latestShapeViewLabels', 'model', 'bodyPartDefinitions', 'var activeCameraControl = {};\n' + captureCode + '\nreturn activeCameraControl.captureShapeView;');
  return create({ current: props.shapeStudy }, props, { current: ready ? props.species.id : null }, effects.update, effects.layout, effects.render, api.art.dinoShapeViewCapture,
    pose.value, pose.pitch, pose.zoom, { current: props.bodyOpacity }, visible, { rotation: { y: pose.value }, userData: { dinoFullBodyAnatomy: { sources: [{ title: 'Primary anatomy study', url: 'https://doi.org/10.1371/journal.pone.0036904' }] } } }, api.parts(props.species.id))();
}
async function mount(overrides = {}) {
  const api = load(), host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
  const record = { version: 1, speciesId: 'triceratops', hasProgress: true, workflowStarted: true, scanSpecies: 'triceratops', scanLogged: { skull: true }, assemblySpecies: 'triceratops', assemblyPlaced: {}, claimBoneSpecies: 'triceratops', claimBone: 'skull', autoRotate: true };
  let data = { tab: 'field3d', selected: 'triceratops', field3dSelected: 'triceratops', field3dProgress: record, field3dAutoRotate: true, field3dLabelMode: 'anatomy', field3dReconstructionMode: 'evidence', ...overrides };
  function render() { root.render(api.cfg.render({ React, toolData: { dinoLab: data }, update(_scope, key, value) { data = { ...data, [key]: value }; render(); }, updateMulti(_scope, patch) { data = { ...data, ...patch }; render(); }, announceToSR() {} })); }
  mounted.push({ root, host }); await React.act(async () => render());
  const effects = { update: vi.fn(), layout: vi.fn(), render: vi.fn() }, camera = vi.fn(); camera.preserveInspectionFrame = vi.fn();
  let visible = ['forelimb'], ready = true;
  camera.captureShapeView = () => productionCapture(api, window.__viewCheckProps, window.__viewCheckYaw.current, visible, effects, ready);
  window.__viewCheckCamera.current = camera;
  async function act(fn) { await React.act(async () => fn()); await React.act(async () => frames.splice(0).forEach(callback => callback(0))); }
  const click = selector => act(() => { const node = host.querySelector(selector); if (!node) throw new Error('Missing view-check control ' + selector); node.click(); });
  return { ...api, host, click, camera, effects, record, data: () => data, pose: () => window.__viewCheckYaw.current, props: () => window.__viewCheckProps,
    visible(ids) { visible = ids; }, ready(value) { ready = value; }, patch: patch => act(() => { data = { ...data, ...patch }; render(); }) };
}

describe('Two-direction full-body model checks', () => {
  it('captures real displayed context and only actual projected label IDs through the production camera method', () => {
    const api = load(), study = api.art.dinoShapeStudyFor({ family: 'ceratopsids', b: 'centrosaurus', active: 'a', lens: 'limbs' });
    expect(study.a.id).toBe('triceratops'); expect(study.b.id).toBe('centrosaurus');
    const props = { shapeStudy: study, species: study.species, reconstructionMode: 'evidence', showSkeleton: true, showBody: false, bodyOpacity: 28 };
    const effects = { update: vi.fn(), layout: vi.fn(), render: vi.fn() }, pose = { value: 4 * Math.PI + 0.2, pitch: 0.4, zoom: 0.8 };
    const pin = productionCapture(api, props, pose, ['forelimb', 'fake-anchor'], effects);
    expect(pin).toMatchObject({ species: 'triceratops', lens: 'limbs', layer: 'Bone structure', hypothesis: 'evidence', visible: ['forelimb'], sources: ['https://doi.org/10.1371/journal.pone.0036904'] });
    expect(pin.yaw).toBeCloseTo(0.2); expect(effects.update).toHaveBeenCalledWith(false); expect(effects.layout).toHaveBeenCalledOnce(); expect(effects.render).toHaveBeenCalledOnce();
    expect(productionCapture(api, props, pose, ['forelimb'], effects, false)).toBeNull();
    expect(api.art.dinoShapeViewCapture(study, { key: study.key, species: 'chasmosaurus', yaw: 0, pitch: 0.4, zoom: 1, hypothesis: 'evidence' }, api.parts('triceratops'))).toBeNull();
    expect(api.art.dinoShapeViewCapture(study, { key: study.key, species: 'triceratops', yaw: NaN, pitch: 0.4, zoom: 1, hypothesis: 'evidence' }, api.parts('triceratops'))).toBeNull();
    const bounded = api.art.dinoShapeViewCapture(study, { key: study.key, species: 'triceratops', yaw: 0, pitch: 0.4, zoom: 1, hypothesis: 'evidence', showSkeleton: true, sources: ['https://example.org/primary', { url: 'https://example.org/primary' }, 'javascript:bad', 'https://example.org/secondary'] }, api.parts('triceratops'));
    expect(bounded.sources).toEqual(['https://example.org/primary', 'https://example.org/secondary']);
    expect(api.art.dinoShapeViewNotebookAppend({}, study, [pin, { ...pin, key: 'wrong-pair' }], api.parts('triceratops'), 'evidence').reason).toBe('views');
  });

  it('uses normalized viewing directions, including yaw wrap and overhead foreshortening, without grading exploration', () => {
    const { art } = load(), angle = art.dinoShapeViewAngle;
    expect(angle({ yaw: Math.PI - 0.01, pitch: 0.16 }, { yaw: -Math.PI + 0.01, pitch: 0.16 })).toBeLessThan(2);
    expect(angle({ yaw: 0, pitch: 1.49 }, { yaw: Math.PI, pitch: 1.49 })).toBeLessThan(10);
    expect(angle({ yaw: 0, pitch: 0.16 }, { yaw: Math.PI / 2, pitch: 0.16 })).toBeGreaterThan(85);
  });

  it('runs native keep/replay handlers across A/B and layers while retaining camera, canvas, pins and original progress', async () => {
    const view = await mount(); await view.click('[data-dino-shape-family="ceratopsids"]'); await view.click('[data-dino-shape-lens="limbs"]');
    const canvas = view.host.querySelector('.dinolab-3d-canvas'), count = view.ensures(); view.camera.mockClear();
    Object.assign(view.pose(), { value: 0.2, pitch: 0.4, zoom: 0.9 }); await view.click('[data-dino-shape-keep-view="1"]');
    expect(view.camera).not.toHaveBeenCalled(); expect(view.ensures()).toBe(count); expect(view.host.querySelector('[data-dino-shape-view-caption="1"]').textContent).toContain('Triceratops · Bone structure');
    view.camera.preserveInspectionFrame.mockClear(); await view.click('[data-dino-shape-layer="life"]'); expect(view.camera.preserveInspectionFrame).toHaveBeenCalledOnce();
    await view.click('[data-dino-shape-dock-side="b"]'); Object.assign(view.pose(), { value: 1.4, pitch: 0.4, zoom: 1.1 }); view.visible(['forelimb', 'thigh']); await view.click('[data-dino-shape-keep-view="2"]');
    expect(view.host.querySelector('[data-dino-shape-view-caption="1"]').textContent).toContain('Triceratops · Bone structure'); expect(view.host.querySelector('[data-dino-shape-view-caption="2"]').textContent).toContain('Styracosaurus · Life surface');
    expect(view.host.querySelector('[data-dino-shape-view-angle]').textContent).toContain('at least 25°');
    view.camera.mockClear(); await view.click('[data-dino-shape-replay-view="1"]'); expect(view.camera).toHaveBeenCalledOnce(); expect(view.camera.mock.calls[0][0]).toBeCloseTo(0.2); expect(view.camera.mock.calls[0].slice(1)).toEqual([0.4, 0.9, expect.stringContaining('Current species and layers'), 'full']);
    expect(view.data()).toMatchObject({ field3dSelected: 'styracosaurus', field3dShowBody: true, field3dShowSkeleton: false, field3dProgress: view.record, field3dAutoRotate: true });
    expect(view.host.querySelector('.dinolab-3d-canvas')).toBe(canvas); expect(view.host.querySelector('#dinolab-shape-view-check-status').textContent).toContain('saved caption describes the original capture');
    for (const button of view.host.querySelectorAll('.dinolab-view-check button')) { expect(button.type).toBe('button'); expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44); }
  }, 120000);

  it('clears pins for pair, lens, hypothesis and exit changes but never for a layer change', async () => {
    const view = await mount(); await view.click('[data-dino-shape-family="ceratopsids"]'); await view.click('[data-dino-shape-keep-view="1"]');
    await view.click('[data-dino-shape-layer="life"]'); expect(view.host.querySelector('[data-dino-shape-view-caption="1"]')).toBeTruthy();
    await view.click('[data-dino-shape-lens="limbs"]'); expect(view.host.querySelector('[data-dino-shape-view-caption]')).toBeNull();
    await view.click('[data-dino-shape-keep-view="1"]'); await view.patch({ field3dReconstructionMode: 'conservative' }); expect(view.host.querySelector('[data-dino-shape-view-caption]')).toBeNull();
    await view.click('[data-dino-shape-keep-view="1"]'); await view.click('[data-dino-shape-family="sauropods"]'); expect(view.host.querySelector('[data-dino-shape-view-caption]')).toBeNull();
    await view.click('[data-dino-shape-keep-view="1"]'); await view.click('[data-dino-shape-exit]'); await view.click('[data-dino-shape-family="sauropods"]'); expect(view.host.querySelector('[data-dino-shape-view-caption]')).toBeNull();
    view.ready(false); await view.click('[data-dino-shape-keep-view="1"]'); expect(view.host.querySelector('[data-dino-shape-view-caption]')).toBeNull(); expect(view.host.querySelector('#dinolab-shape-view-check-status').textContent).toContain('not ready');
  }, 120000);

  it('explicitly appends context once to the same notebook while preserving student writing and the explanation bound', async () => {
    const api = load(), key = api.art.comparisonPairKey(api.dn('triceratops'), api.dn('styracosaurus'));
    const inquiry = { version: 1, pairs: [{ key, a: 'triceratops', b: 'styracosaurus', step: 'explain', prediction: 'The forequarters may look different.', evidence: ['traits'], explanation: 'My own explanation.', limit: 'Soft tissue is uncertain.' }] };
    const view = await mount({ compareInquiry: inquiry }); await view.click('[data-dino-shape-family="ceratopsids"]'); await view.click('[data-dino-shape-keep-view="1"]'); Object.assign(view.pose(), { value: 1.2 }); await view.click('[data-dino-shape-keep-view="2"]');
    expect(view.data().compareInquiry).toEqual(inquiry); await view.click('[data-dino-shape-append-views]');
    const first = structuredClone(view.data().compareInquiry), entry = first.pairs[0]; expect(entry).toMatchObject({ prediction: inquiry.pairs[0].prediction, limit: inquiry.pairs[0].limit, evidence: ['traits', 'model'] });
    expect(entry.explanation).toMatch(/^My own explanation\.\n\n3D view context/); expect(entry.explanation).toContain('not fossil proof'); expect(entry.explanation).toContain('https://doi.org/10.1371/journal.pone.0036904'); expect(entry.explanation.length).toBeLessThanOrEqual(1800);
    await view.click('[data-dino-shape-append-views]'); expect(view.data().compareInquiry).toEqual(first); expect(view.host.querySelector('#dinolab-shape-view-check-status').textContent).toContain('already');
    await view.patch({ compareInquiry: { version: 1, pairs: [{ ...entry, explanation: 'x'.repeat(1800) }] } }); await view.click('[data-dino-shape-append-views]'); expect(view.data().compareInquiry.pairs[0].explanation).toBe('x'.repeat(1800)); expect(view.host.querySelector('#dinolab-shape-view-check-status').textContent).toContain('unchanged');
    expect(view.data().field3dProgress).toEqual(view.record); expect(view.host.querySelectorAll('.dinolab-view-check textarea')).toHaveLength(0);
  }, 120000);
});
