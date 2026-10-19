// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync(resolve(process.env.DINO_SHAPE_STUDY_SOURCE || 'stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
const marker = "window.StemLab.registerTool('dinoLab'", mounted = [], frames = [];
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT, previousRaf = window.requestAnimationFrame;
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; }; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct; window.requestAnimationFrame = previousRaf; });
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) { await React.act(async () => root.unmount()); host.remove(); }
  for (const key of ['__shapeYaw', '__shapeProps', '__shapeCamera', '__shapeProgress', '__shapeReady']) delete window[key];
  frames.splice(0);
});
function load() {
  const captured = {};
  window.StemLab = { ensureThree: () => new Promise(() => {}), registerTool(_id, cfg) { captured.cfg = cfg; } };
  new Function(source
    .replace('function DinoFieldStation3D(props) {', 'function DinoFieldStation3D(props) { window.__shapeProps = props;')
    .replace('var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 });', 'var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 }); window.__shapeYaw = yawRef;')
    .replace('var cameraControlRef = React.useRef(null);', 'var cameraControlRef = React.useRef(null); window.__shapeCamera = cameraControlRef;')
    .replace("var readySpeciesRef = React.useRef('');", "var readySpeciesRef = React.useRef(''); window.__shapeReady = readySpeciesRef;")
    .replace('      var upd = function (key, val) {', '      window.__shapeProgress = { record: fieldProgressRecordFor, valid: fieldProgressIsValid, decorate: decorateFieldProgressPatch }; var upd = function (key, val) {')
    .replace(marker, 'globalThis.__shapeContract = { DINOS, DINO_SHAPE_STUDY_FAMILIES, dinoShapeStudyFor, dinoShapeStudyPairFor, dinoShapeStudyNavigationPatch, dinoShapeStudyPose, comparisonInquiryState, comparisonPairKey, comparisonInquiryText }; ' + marker))();
  const art = globalThis.__shapeContract; delete globalThis.__shapeContract;
  return { art, cfg: captured.cfg, dn: id => art.DINOS.find(entry => entry.id === id) };
}
async function mount(overrides = {}) {
  const api = load(), host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host), patches = [];
  let data = { tab: 'field3d', selected: 'parasaurolophus', field3dSelected: 'parasaurolophus',
    field3dLabelMode: 'anatomy', field3dReconstructionMode: 'evidence', field3dAutoRotate: true,
    field3dShowSkeleton: true, field3dShowBody: true, field3dBodyOpacity: 28,
    field3dWorkflowStarted: true, field3dScanSpecies: 'parasaurolophus', field3dScanLogged: { skull: true },
    field3dAssemblySpecies: 'parasaurolophus', field3dAssemblyPlaced: { skull: true },
    field3dClaimBoneSpecies: 'parasaurolophus', field3dClaimBone: 'skull',
    field3dChallengeIdx: 2, field3dChallengePicked: 'evidence', field3dChallengeScore: 2, field3dChallengeDone: 2,
    ...overrides };
  function render() {
    root.render(api.cfg.render({ React, toolData: { dinoLab: data },
      update(_scope, key, value) { patches.push({ [key]: value }); data = { ...data, [key]: value }; render(); },
      updateMulti(_scope, patch) { patches.push(patch); data = { ...data, ...patch }; render(); }, announceToSR() {} }));
  }
  mounted.push({ root, host }); await React.act(async () => render());
  const camera = vi.fn(); camera.preserveInspectionFrame = vi.fn(); window.__shapeCamera.current = camera;
  async function act(callback) { await React.act(async () => callback()); await React.act(async () => frames.splice(0).forEach(fn => fn(0))); }
  const click = selector => act(() => { const node = host.querySelector(selector); if (!node) throw new Error('Missing shape control ' + selector); node.click(); });
  const change = (selector, value) => act(() => { const node = host.querySelector(selector); if (!node) throw new Error('Missing shape input ' + selector); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); });
  return { ...api, host, camera, patches, click, change, data: () => data, props: () => window.__shapeProps, yaw: () => window.__shapeYaw.current,
    patch: patch => act(() => { data = { ...data, ...patch }; render(); }) };
}

describe('Curated anatomical shape comparisons', () => {
  it('accepts only real fixed-reference relatives and distinguishes model shape from size, growth and function', () => {
    const { art, dn } = load();
    expect(art.DINO_SHAPE_STUDY_FAMILIES.map(f => f.id)).toEqual(['crests', 'armor', 'sauropods', 'ornithopods', 'ceratopsids']);
    for (const family of art.DINO_SHAPE_STUDY_FAMILIES) for (const id of family.choices) {
      const study = art.dinoShapeStudyFor({ family: family.id, b: id, active: 'b' });
      expect(study.a.id).toBe(family.reference); expect(study.species.id).toBe(id); expect(study.region).toBe(family.region);
      expect(art.dinoShapeStudyPairFor(dn(id), dn(family.reference)).key).toBe(study.key);
    }
    for (const raw of [{ family: 'crests', b: 'tyrannosaurus', active: 'b' }, { family: 'crests', b: 'parasaurolophus', active: 'a' }, { family: 'armor', b: 'kentrosaurus', active: 'x' }, { family: 'invented', b: 'edmontosaurus', active: 'b' }]) expect(art.dinoShapeStudyFor(raw)).toBeNull();
    expect(art.dinoShapeStudyNavigationPatch({}, { family: { id: 'crests' }, b: { id: 'tyrannosaurus' }, active: 'b', species: dn('tyrannosaurus') }, null)).toBeNull();
    expect(art.dinoShapeStudyPairFor(dn('corythosaurus'), dn('lambeosaurus'))).toBeNull();
    const control = art.dinoShapeStudyFor({ family: 'crests', b: 'edmontosaurus', active: 'b' });
    expect(control.partId).toBe('skull'); expect(control.family.limit).toContain('no tall bony crest in this model'); expect(control.family.limit).toContain('not growth stages'); expect(control.family.limit).toContain('does not rule out soft-tissue ornaments');
  });

  it('restores only target-provenance scan, assembly and claims while resetting unkeyed challenges', async () => {
    const view = await mount(), record = window.__shapeProgress.record(view.data()), saved = JSON.stringify(record);
    const b = view.art.dinoShapeStudyNavigationPatch(view.data(), { family: 'crests', b: 'corythosaurus', active: 'b' }, record);
    expect(b.field3dScanLogged).toEqual({}); expect(b.field3dAssemblyPlaced).toEqual({}); expect(b.field3dClaimBone).toBeNull(); expect(b.field3dWorkflowStarted).toBe(false);
    expect([b.field3dChallengeIdx, b.field3dChallengeScore, b.field3dChallengeDone]).toEqual([0, 0, 0]); expect(b.field3dChallengePicked).toBeNull();
    const a = view.art.dinoShapeStudyNavigationPatch({ ...view.data(), ...b }, { family: 'crests', b: 'corythosaurus', active: 'a' }, record);
    expect(a.field3dScanLogged).toEqual({ skull: true }); expect(a.field3dAssemblyPlaced).toEqual({ skull: true }); expect(a.field3dClaimBone).toBe('skull'); expect(a.field3dProgress).toBe(record); expect(JSON.stringify(record)).toBe(saved);
    const bad = view.art.dinoShapeStudyNavigationPatch({ field3dScanLogged: { skull: true }, field3dClaimBone: 'skull' }, { family: 'crests', b: 'corythosaurus', active: 'b' }, { ...record, speciesId: 'corythosaurus' });
    expect(bad.field3dScanLogged).toEqual({}); expect(bad.field3dClaimBone).toBeNull();
  }, 120000);

  it('runs actual A/B handlers in one canvas, preserving shared orbit, pitch, zoom and layers', async () => {
    const view = await mount(), canvas = view.host.querySelector('.dinolab-3d-canvas');
    await view.click('[data-dino-shape-family="crests"]');
    expect(view.yaw()).toMatchObject({ speciesId: 'parasaurolophus', value: 0, pitch: 0.16, zoom: 1, study: 'head' });
    Object.assign(view.yaw(), { value: 1.12, pitch: 0.46, zoom: 0.83 });
    await view.click('[data-dino-shape-side="b"]');
    expect(view.data().field3dSelected).toBe('corythosaurus'); expect(view.yaw()).toMatchObject({ speciesId: 'corythosaurus', value: 1.12, pitch: 0.46, zoom: 0.83, study: 'head' });
    expect(view.host.querySelector('.dinolab-3d-canvas')).toBe(canvas); expect(view.host.querySelector('#dinolab-part-picker').value).toBe('crest');
    await view.click('[data-dino-shape-layer="life"]'); await view.click('[data-dino-shape-side="a"]');
    expect(view.yaw()).toMatchObject({ value: 1.12, pitch: 0.46, zoom: 0.83 }); expect(view.data()).toMatchObject({ field3dShowSkeleton: false, field3dShowBody: true, field3dBodyOpacity: 100, field3dReconstructionMode: 'evidence' });
    await view.change('#dinolab-shape-study-species', 'edmontosaurus'); expect(view.yaw()).toMatchObject({ value: 0, pitch: 0.16, zoom: 1 }); expect(view.host.querySelector('#dinolab-part-picker').value).toBe('skull');
    await view.click('[data-dino-shape-family="armor"]'); expect(view.yaw()).toMatchObject({ speciesId: 'stegosaurus', study: 'full', value: 0, pitch: 0.16, zoom: 1 });
    for (const button of view.host.querySelectorAll('.dinolab-shape-study button')) { expect(button.type).toBe('button'); expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44); }
    expect(view.host.querySelector('#dinolab-shape-study-status').getAttribute('aria-live')).toBe('polite');
    expect(view.host.querySelector('.dinolab-shape-study').textContent).toContain('Each model is fitted independently');
  }, 120000);

  it('keeps the original one-slot progress through A/B, layer and label changes and suppresses guide highlights', async () => {
    const notes = { 'parasaurolophus|crest|evidence': { bone: 'bone note', life: 'surface note', question: 'uncertain covering' } };
    const view = await mount({ field3dPartComparisons: notes }), original = structuredClone(window.__shapeProgress.record(view.data()));
    await view.click('[data-dino-shape-family="crests"]'); expect(view.data().field3dProgress).toEqual(original);
    for (const action of [() => view.click('[data-dino-shape-side="b"]'), () => view.click('[data-dino-shape-layer="life"]'), () => view.change('#dino-scene-labels', 'key'), () => view.click('[data-dino-shape-side="a"]')]) {
      await action(); expect(view.data().field3dProgress).toEqual(original);
      expect(view.props()).toMatchObject({ scanActive: false, loggedAnchors: {}, assemblyPlaced: {}, claimEvidenceFocus: null, claimEvidenceAnchor: null });
    }
    expect(view.data().field3dPartComparisons).toEqual(notes); expect(view.data().field3dChallengeDone).toBe(0);
    await view.click('[data-dino-shape-exit]'); expect(view.data().field3dShapeStudy).toBeNull(); expect(view.data().field3dProgress).toEqual(original);
  }, 120000);

  it('exits through ordinary species and anatomical study selection without stale resurrection or progress loss', async () => {
    const view = await mount(); await view.click('[data-dino-shape-family="crests"]'); const saved = structuredClone(view.data().field3dProgress);
    await view.change('select[aria-label="Choose species for 3D field station"]', 'tyrannosaurus');
    expect(view.data().field3dShapeStudy).toBeNull(); expect(view.data().field3dProgress).toEqual(saved); expect(view.data()).toMatchObject({ field3dWorkflowStarted: false, field3dScanLogged: {}, field3dAssemblyPlaced: {}, field3dClaimBone: null, field3dChallengeDone: 0 });
    await view.change('select[aria-label="Choose species for 3D field station"]', 'parasaurolophus'); expect(view.data().field3dShapeStudy).toBeNull();
    await view.click('[data-dino-shape-family="crests"]'); await view.change('#dinolab-part-picker', 'knee'); expect(view.data().field3dShapeStudy).toBeNull();
    await view.click('[data-dino-shape-family="armor"]'); await view.click('.dinolab-fit-model'); expect(view.data().field3dShapeStudy).toBeNull();
  }, 120000);

  it('pauses actual renderer idle motion gates without changing the saved user preference', () => {
    function lineContaining(text) { const lines = source.split('\n').filter(line => line.includes(text)); expect(lines).toHaveLength(1); return lines[0].trim(); }
    const motionLine = lineContaining('var motionRunning =');
    const motion = new Function('props', 'motionPausedRef', 'reducedMotionRef', motionLine + ';return motionRunning;');
    const scheduler = lineContaining('isAnimating: function () { return !motionPausedRef.current');
    const isAnimating = new Function('props', 'motionPausedRef', 'reducedMotionRef', 'return ({' + scheduler + '}).isAnimating();');
    for (const run of [motion, isAnimating]) { const paused = { current: false }, reduced = { current: false }; expect(run({ shapeStudy: {} }, paused, reduced)).toBe(false); expect(run({ shapeStudy: null }, paused, reduced)).toBe(true); expect(paused.current).toBe(false); paused.current = true; expect(run({ shapeStudy: null }, paused, reduced)).toBe(false); }
    const cameraLine = lineContaining('yawRef.current.value = yaw; yawRef.current.pitch = pitch;');
    const ref = { current: {} }; new Function('yawRef', 'yaw', 'pitch', 'zoom', cameraLine)(ref, 1.1, 0.3, 0.8); expect(ref.current).toEqual({ value: 1.1, pitch: 0.3, zoom: 0.8 });
  });

  it('reuses the existing pair prediction, evidence record and export when returning between notebook and 3D', async () => {
    const api = load(), key = api.art.comparisonPairKey(api.dn('parasaurolophus'), api.dn('corythosaurus'));
    const inquiry = { version: 1, pairs: [{ key, a: 'parasaurolophus', b: 'corythosaurus', step: 'inspect', prediction: 'The helmet outline will be taller near the skull roof.', evidence: [], explanation: 'My first explanation', limit: 'Covering is inferred.' }] };
    const view = await mount({ compareInquiry: inquiry }); await view.click('[data-dino-shape-family="crests"]');
    expect(view.host.querySelector('.dinolab-shape-study blockquote').textContent).toContain(inquiry.pairs[0].prediction);
    await view.click('[data-dino-shape-notebook]'); expect(view.data()).toMatchObject({ tab: 'compare', compareA: 'parasaurolophus', compareB: 'corythosaurus', field3dShapeStudy: null }); expect(view.data().compareInquiry).toEqual(inquiry);
    const modelCheck = [...view.host.querySelectorAll('input[type="checkbox"]')].find(node => node.parentElement.textContent.includes('3D model observation (reconstruction)'));
    expect(modelCheck).toBeTruthy(); await React.act(async () => modelCheck.click());
    expect(view.data().compareInquiry.pairs).toHaveLength(1); expect(view.data().compareInquiry.pairs[0]).toMatchObject({ prediction: inquiry.pairs[0].prediction, explanation: 'My first explanation', evidence: ['model'] });
    const text = view.art.comparisonInquiryText(view.data().compareInquiry); expect(text).toContain('Cited observations and evidence:'); expect(text).toContain('3D model observation (reconstruction)'); expect(text).toContain('not new fossil evidence');
    await view.click('[data-dino-shape-resume="crests"]'); expect(view.data()).toMatchObject({ tab: 'field3d', field3dSelected: 'parasaurolophus' }); expect(view.data().compareInquiry.pairs[0].prediction).toBe(inquiry.pairs[0].prediction);
    expect(view.host.querySelectorAll('.dinolab-shape-study textarea')).toHaveLength(0);
  }, 120000);
});
