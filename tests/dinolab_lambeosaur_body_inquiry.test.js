// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url), React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync(resolve(process.env.DINO_LAMBEOSAUR_INQUIRY_SOURCE || 'stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
const marker = "window.StemLab.registerTool('dinoLab'", mounted = [], frames = [];
const oldAct = globalThis.IS_REACT_ACT_ENVIRONMENT, oldRaf = window.requestAnimationFrame;
const ids = ['parasaurolophus', 'corythosaurus', 'lambeosaurus', 'olorotitan'];
const urls = { parasaurolophus: 'https://doi.org/10.1111/joa.13363', corythosaurus: 'https://hdl.handle.net/2246/1330', lambeosaurus: 'https://doi.org/10.1671/0272-4634(2007)27[373:AAROLM]2.0.CO;2', olorotitan: 'https://doi.org/10.4202/app.2011.0051' };
const fixtures = Object.fromEntries(ids.map(id => [id, { id: id + '-body', claim: 'Preserved skeletal regions constrain this comparative body frame.', uncertainty: 'The complete body remains a representative restoration.', sources: [{ title: 'Primary anatomy of ' + id, url: urls[id] }] }]));
const own = { version: 1, pairs: [{ key: 'corythosaurus|parasaurolophus', a: 'corythosaurus', b: 'parasaurolophus', step: 'explain', prediction: 'I expect the neck and trunk to differ.', evidence: ['traits'], explanation: 'My own first observation of these bodies.', limit: 'Missing parts make complete outlines uncertain.' }] };
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; }; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = oldAct; window.requestAnimationFrame = oldRaf; });
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) { await React.act(async () => root.unmount()); host.remove(); }
  for (const name of ['__lambeosaurProps', '__lambeosaurYaw', '__lambeosaurCamera', '__lambeosaurRegion']) delete window[name];
  frames.splice(0);
});
function load() {
  const captured = { ensures: 0 };
  window.StemLab = { ensureThree() { captured.ensures++; return new Promise(() => {}); }, registerTool(_id, cfg) { captured.cfg = cfg; } };
  // A learning-only candidate deliberately lacks the parallel model patch.
  // Preserve its real profile whenever present; supply scientific test input
  // solely when exercising this immutable learning candidate in isolation.
  const exportCode = 'var dinoLambeosaurBodyProfileFor = typeof dinoLambeosaurBodyProfileFor === "function" ? dinoLambeosaurBodyProfileFor : function(dn){return dn && dn.group === "ornithischian" ? lambeosaurTestProfiles[dn.id] || null : null;};globalThis.__lambeosaurAPI={DINOS,DINO_SHAPE_STUDY_FAMILIES,dinoShapeStudyFor,dinoShapeStudyPairFor,dinoShapeStudyNavigationPatch,dinoShapeStudyPose,dinoShapeStudyLensFor,dinoShapeStudyLandmarkIds,dinoShapeLambeosaurEligible,dinoShapeLambeosaurRegionFor,dinoShapeLambeosaurRegionEvidenceFor,dinoLambeosaurBodyProfileFor,dinoDetailedBodyPartDefinitions,dinoPartInspectionFor,dinoShapeViewCapture,dinoShapeViewCaption,dinoShapeViewNotebookAppend,dinoShapeViewContextKey};';
  new Function('lambeosaurTestProfiles', source
    .replace('function DinoFieldStation3D(props) {', 'function DinoFieldStation3D(props) {window.__lambeosaurProps=props;')
    .replace('var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 });', 'var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 });window.__lambeosaurYaw=yawRef;')
    .replace('var cameraControlRef = React.useRef(null);', 'var cameraControlRef = React.useRef(null);window.__lambeosaurCamera=cameraControlRef;')
    .replace('shapeLambeosaurRef.current = { active: shapeLambeosaurEligible, region: shapeLambeosaurRegion };', 'shapeLambeosaurRef.current = { active: shapeLambeosaurEligible, region: shapeLambeosaurRegion };window.__lambeosaurRegion=shapeLambeosaurRef;')
    .replace(marker, exportCode + marker))(fixtures);
  const api = globalThis.__lambeosaurAPI; delete globalThis.__lambeosaurAPI;
  return { api, cfg: captured.cfg, ensures: () => captured.ensures };
}
const dn = (api, id) => api.DINOS.find(row => row.id === id);
const studyFor = (api, extra = {}) => api.dinoShapeStudyFor({ family: 'lambeosaurs', b: 'corythosaurus', active: 'a', lens: 'allocation', ...extra });
async function mount() {
  const loaded = load(), host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  let data = { tab: 'field3d', selected: 'parasaurolophus', field3dSelected: 'parasaurolophus', field3dStage: 'studio', field3dReconstructionMode: 'evidence', field3dShowSkeleton: true, field3dShowBody: false, field3dBodyOpacity: 28, field3dShapeStudy: { family: 'lambeosaurs', b: 'corythosaurus', active: 'a', lens: 'allocation' }, compareInquiry: structuredClone(own) };
  function render() { root.render(loaded.cfg.render({ React, toolData: { dinoLab: data }, update(_scope, key, value) { data = { ...data, [key]: value }; render(); }, updateMulti(_scope, patch) { data = { ...data, ...patch }; render(); }, announceToSR() {} })); }
  mounted.push({ root, host }); await React.act(async () => render());
  const camera = vi.fn(); camera.preserveInspectionFrame = vi.fn(); window.__lambeosaurCamera.current = camera;
  camera.captureShapeView = () => {
    const props = window.__lambeosaurProps, study = props.shapeStudy, region = window.__lambeosaurRegion.current.region, evidence = loaded.api.dinoShapeLambeosaurRegionEvidenceFor(study.species, region);
    return loaded.api.dinoShapeViewCapture(study, { key: study.key, species: study.species.id, hypothesis: 'evidence', yaw: window.__lambeosaurYaw.current.value, pitch: window.__lambeosaurYaw.current.pitch, zoom: 1, showSkeleton: props.showSkeleton, showBody: props.showBody, visible: ['neck', 'trunk', 'tail'], sources: evidence.sources, lambeosaur: { active: true, state: 'native-ready', species: study.species.id, region } }, loaded.api.dinoDetailedBodyPartDefinitions(study.species, true));
  };
  async function act(fn) { await React.act(async () => fn()); await React.act(async () => frames.splice(0).forEach(callback => callback(0))); }
  return { ...loaded, host, camera, data: () => data, click: selector => act(() => { const node = host.querySelector(selector); if (!node) throw Error('Missing lambeosaur control ' + selector); node.click(); }), change: (selector, value) => act(() => { const node = host.querySelector(selector); if (!node) throw Error('Missing lambeosaur input ' + selector); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); }) };
}

describe('Lambeosaur whole-body inquiry', () => {
  it('requires an explicit full-body investigation while preserving the existing default crest pair', () => {
    const { api } = load(), para = dn(api, 'parasaurolophus');
    expect(api.DINO_SHAPE_STUDY_FAMILIES.find(row => row.id === 'lambeosaurs')).toMatchObject({ explicitOnly: true, fullBody: true, reference: 'parasaurolophus', choices: ['corythosaurus', 'lambeosaurus', 'olorotitan'] });
    for (const id of ids.slice(1)) {
      expect(api.dinoShapeStudyPairFor(para, dn(api, id)).family.id).toBe('crests');
      expect(api.dinoShapeStudyPairFor(para, dn(api, id), 'lambeosaurs').family.id).toBe('lambeosaurs');
      expect(api.dinoShapeLambeosaurEligible(studyFor(api, { b: id, active: 'b' }))).toBe(true);
    }
    expect(api.dinoShapeLambeosaurEligible(studyFor(api, { family: 'crests' }))).toBe(false);
    expect(api.dinoShapeStudyFor({ family: 'lambeosaurs', b: 'edmontosaurus', active: 'b' })).toBeNull();
  });
  it('uses the existing actual neck, trunk, tail and supporting-limb landmarks with family-specific questions', () => {
    const { api } = load(), study = studyFor(api), parts = api.dinoDetailedBodyPartDefinitions(study.species, true);
    expect(api.dinoShapeStudyLandmarkIds(study, parts)).toEqual(['neck', 'trunk', 'tail']);
    const limbs = studyFor(api, { lens: 'limbs' }); expect(api.dinoShapeStudyLandmarkIds(limbs, parts)).toEqual(['forelimb', 'thigh']);
    expect(limbs.lens.prompt).toContain('Missing limbs'); expect(limbs.lens.prompt).toContain('not a fossil measurement');
    expect(api.dinoShapeStudyLensFor(study.family, 'outline').prompt).toContain('fitted independently');
    expect(api.dinoShapeStudyLandmarkIds(study, parts.filter(part => part.id !== 'tail'))).toEqual(['neck', 'trunk']);
  });
  it('retains shared settings only within continuing lambeosaur pairs while preserving entry and older-family defaults', () => {
    const { api } = load(), old = studyFor(api), next = studyFor(api, { b: 'lambeosaurus', active: 'b' });
    const state = { field3dShapeStudy: { family: 'lambeosaurs', b: 'corythosaurus', active: 'a', lens: 'allocation' }, field3dShowSkeleton: false, field3dShowBody: true, field3dBodyOpacity: 100, field3dReconstructionMode: 'conservative', compareInquiry: own };
    const patch = api.dinoShapeStudyNavigationPatch(state, { family: 'lambeosaurs', b: 'lambeosaurus', active: 'b' }, null);
    expect({ ...state, ...patch }).toMatchObject({ field3dShowSkeleton: false, field3dShowBody: true, field3dBodyOpacity: 100, field3dReconstructionMode: 'conservative', field3dShapeStudy: { b: 'lambeosaurus', lens: 'allocation' }, compareInquiry: own });
    expect(next.key).not.toBe(old.key); expect(api.dinoShapeViewContextKey(next, 'conservative')).not.toBe(api.dinoShapeViewContextKey(old, 'conservative'));
    const pose = { speciesId: old.species.id, value: 1.1, pitch: .43, zoom: .9, study: 'full' };
    expect(api.dinoShapeStudyPose(pose, next.species.id, next, old.key)).toMatchObject({ speciesId: 'lambeosaurus', value: 1.1, pitch: .43, zoom: .9, study: 'full' });
    expect(api.dinoShapeStudyPose({ ...pose, value: NaN }, next.species.id, next, old.key)).toMatchObject({ value: 0, pitch: .16, zoom: 1 });
    const enter = api.dinoShapeStudyNavigationPatch({ ...state, field3dShapeStudy: null }, { family: 'lambeosaurs', b: 'lambeosaurus', active: 'b' }, null);
    expect(enter).toMatchObject({ field3dShowSkeleton: true, field3dShowBody: false, field3dBodyOpacity: 28, field3dReconstructionMode: 'evidence' });
    const exit = api.dinoShapeStudyNavigationPatch(state, { family: 'crests', b: 'corythosaurus', active: 'a' }, null);
    expect(exit).toMatchObject({ field3dShowSkeleton: true, field3dShowBody: false, field3dReconstructionMode: 'evidence' });
    const older = api.dinoShapeStudyNavigationPatch({ ...state, field3dShapeStudy: { family: 'sauropods', b: 'diplodocus', active: 'a', lens: 'allocation' } }, { family: 'sauropods', b: 'camarasaurus', active: 'b' }, null);
    expect(older).toMatchObject({ field3dShowSkeleton: true, field3dShowBody: false, field3dReconstructionMode: 'evidence' });
  });
  it('names the current species and separates preserved regions from comparative restoration', () => {
    const { api } = load(), evidence = (id, region) => api.dinoShapeLambeosaurRegionEvidenceFor(dn(api, id), region, fixtures[id]);
    expect(evidence('parasaurolophus', 'neck').evidence).toContain('pathological'); expect(evidence('parasaurolophus', 'tail').evidence).toContain('six caudal');
    expect(evidence('corythosaurus', 'trunk').evidence).toContain('laterally compressed'); expect(evidence('corythosaurus', 'limbs').evidence).toContain('Missing forelimb parts');
    expect(evidence('lambeosaurus', 'neck').evidence).toContain('L. magnicristatus'); expect(evidence('lambeosaurus', 'limbs').evidence).toContain('not transferred');
    expect(evidence('olorotitan', 'neck').evidence).toContain('18 cervical'); expect(evidence('olorotitan', 'limbs').evidence).toContain('Both hands and both feet are missing');
    expect(evidence('olorotitan', 'tail').evidence).toContain('age or pathology');
    for (const id of ids) for (const region of ['neck', 'trunk', 'tail', 'limbs']) { const row = evidence(id, region); expect(row).toMatchObject({ species: id, region, state: 'source-guided' }); expect(row.restored).toContain('not every fossil recovered'); expect(row.sources[0].url).toBe(urls[id]); }
  });
  it('keeps unknown evidence honest and bounds source data instead of inventing a scientific profile', () => {
    const { api } = load(), animal = dn(api, 'parasaurolophus'), read = api.dinoShapeLambeosaurRegionEvidenceFor;
    expect(read(dn(api, 'edmontosaurus'), 'neck', fixtures.parasaurolophus).state).toBe('loading');
    expect(read(animal, 'neck', {}).state).toBe('loading'); expect(api.dinoShapeLambeosaurRegionFor('__proto__')).toBe('trunk');
    const supplied = { ...fixtures.parasaurolophus, sources: [{ title: 'Bad', url: 'javascript:bad' }, { title: 'Whitespace', url: 'https://example.org/a b' }, ...fixtures.parasaurolophus.sources, ...fixtures.parasaurolophus.sources] };
    expect(read(animal, 'neck', supplied).sources).toEqual(fixtures.parasaurolophus.sources);
  });
  it('connects ordinary body-part guides to the same per-species source and restoration limits', () => {
    const { api } = load();
    for (const id of ids) for (const part of ['neck', 'trunk', 'ribs', 'tail', 'forelimb', 'thigh']) {
      const guide = api.dinoPartInspectionFor(dn(api, id), { id: part, region: 'body' }); expect(guide.question).toMatch(/Follow|Trace/); expect(guide.bone).not.toBe(''); expect(guide.life).toContain('same shared skeletal frame'); expect(guide.limit).toContain('not every fossil recovered'); expect(guide.source.url).toMatch(/^https:\/\//);
    }
    // The new distal lesson replaces only the former broad limb guide for
    // hands/feet with ray identity and covering-specific scientific limits.
    for (const id of ids) for (const part of ['hand', 'foot']) {
      const guide = api.dinoPartInspectionFor(dn(api, id), { id: part, region: 'body' }); expect(guide.question).toContain('visible tips'); expect(guide.bone).toMatch(/ray|rays/); expect(guide.life).toContain(part === 'hand' ? 'provisional' : 'pedal sheaths'); expect(guide.limit).toContain('not a universal phalangeal formula'); expect(guide.sources).toHaveLength(4);
    }
  });
  it('changes real region handlers and shared-frame highlights without rebuilding the model or changing student writing', async () => {
    const view = await mount(), count = view.ensures(), canvas = view.host.querySelector('.dinolab-3d-canvas');
    Object.assign(window.__lambeosaurYaw.current, { value: .73, pitch: .4, zoom: .9 }); view.camera.mockClear();
    await view.click('[data-dino-lambeosaur-region="neck"]'); expect(window.__lambeosaurRegion.current.region).toBe('neck'); expect(view.host.querySelector('[data-dino-lambeosaur-displayed]').textContent).toContain('Parasaurolophus · Neck');
    await view.click('[data-dino-lambeosaur-region="tail"]'); expect(view.host.querySelector('[data-dino-lambeosaur-evidence="fossil"]').textContent).toContain('six caudal');
    expect(view.ensures()).toBe(count); expect(view.camera).not.toHaveBeenCalled(); expect(view.host.querySelector('.dinolab-3d-canvas')).toBe(canvas); expect(window.__lambeosaurYaw.current).toMatchObject({ value: .73, pitch: .4, zoom: .9, study: 'full' }); expect(view.data().compareInquiry).toEqual(own);
    for (const button of view.host.querySelectorAll('[data-dino-lambeosaur-region]')) { expect(button.type).toBe('button'); expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44); }
  }, 120000);
  it('updates current-animal evidence across A/B and Bone/Life and reuses the existing limb guide', async () => {
    const view = await mount(); await view.click('[data-dino-lambeosaur-region="tail"]'); await view.click('[data-dino-shape-dock-side="b"]');
    expect(window.__lambeosaurRegion.current.region).toBe('tail'); expect(view.host.querySelector('[data-dino-lambeosaur-displayed]').textContent).toContain('Corythosaurus'); expect(view.host.querySelector('[data-dino-lambeosaur-evidence="fossil"]').textContent).toContain('AMNH 5240');
    await view.click('[data-dino-shape-layer="life"]'); expect(window.__lambeosaurRegion.current.region).toBe('tail');
    Object.assign(window.__lambeosaurYaw.current, { value: .73, pitch: .4, zoom: .9 });
    await view.change('#dinolab-shape-study-species', 'lambeosaurus');
    expect(window.__lambeosaurRegion.current.region).toBe('tail'); expect(view.host.querySelector('[data-dino-lambeosaur-displayed]').textContent).toContain('Lambeosaurus');
    expect(view.data()).toMatchObject({ field3dShowSkeleton: false, field3dShowBody: true, field3dBodyOpacity: 100 });
    expect(window.__lambeosaurYaw.current).toMatchObject({ value: .73, pitch: .4, zoom: .9 });
    await view.click('[data-dino-lambeosaur-region="limbs"]'); expect(view.data().field3dShapeStudy.lens).toBe('limbs'); expect(view.host.querySelector('[data-dino-joint-trace-toggle]').getAttribute('aria-pressed')).toBe('true');
    expect(view.host.textContent).toContain('Fossils · mixed evidence'); expect(view.host.textContent).toContain('Pose · reconstructed support'); expect(view.host.textContent).toContain('Catalog estimates · Length'); expect(view.data().compareInquiry).toEqual(own);
    const accessibleSummary = view.host.querySelector('[id^="dino3d-viewer-desc-"]').textContent;
    expect(accessibleSummary).toContain('Authored reconstructed support');
    expect(accessibleSummary).toContain('Mixed specimen evidence and comparative restoration');
    expect(accessibleSummary).toContain('Observation region: Limb support');
    expect(accessibleSummary).toContain(view.host.querySelector('[data-dino-lambeosaur-evidence="fossil"]').textContent.replace('Fossil constraint: ', ''));
    expect(accessibleSummary).toContain('not every fossil recovered');
  }, 120000);
  it('keeps and replays region context with primary sources while preserving and appending to the learner explanation', async () => {
    const view = await mount(); await view.click('[data-dino-lambeosaur-region="neck"]'); await view.click('[data-dino-shape-keep-view="1"]');
    await view.click('[data-dino-lambeosaur-region="tail"]'); window.__lambeosaurYaw.current.value = 1.2; await view.click('[data-dino-shape-keep-view="2"]');
    expect(view.host.querySelector('[data-dino-shape-view-caption="1"]').textContent).toContain('observation region: Neck'); expect(view.host.querySelector('[data-dino-shape-view-caption="2"]').textContent).toContain('observation region: Tail');
    await view.click('[data-dino-shape-replay-view="1"]'); expect(window.__lambeosaurRegion.current.region).toBe('neck'); expect(view.data().compareInquiry).toEqual(own);
    await view.click('[data-dino-shape-append-views]'); const saved = structuredClone(view.data().compareInquiry); expect(saved.pairs[0]).toMatchObject({ prediction: own.pairs[0].prediction, limit: own.pairs[0].limit }); expect(saved.pairs[0].explanation).toMatch(/^My own first observation/); expect(saved.pairs[0].explanation).toContain('observation region: Neck'); expect(saved.pairs[0].explanation).toContain('observation region: Tail'); expect(saved.pairs[0].explanation).toContain(urls.parasaurolophus); expect(saved.pairs[0].explanation.length).toBeLessThanOrEqual(1800);
    await view.click('[data-dino-shape-append-views]'); expect(view.data().compareInquiry).toEqual(saved);
    await view.click('[data-dino-shape-family="crests"]'); expect(view.host.querySelector('.dinolab-lambeosaur-evidence')).toBeNull(); expect(view.data().compareInquiry).toEqual(saved);
    await view.click('[data-dino-shape-family="lambeosaurs"]'); expect(window.__lambeosaurRegion.current.region).toBe('trunk'); expect(view.data()).toMatchObject({ field3dShowSkeleton: true, field3dShowBody: false, field3dReconstructionMode: 'evidence' }); expect(view.data().compareInquiry).toEqual(saved);
  }, 120000);
  it('accepts only loaded, species-matched region context in view captions', () => {
    const { api } = load(), study = studyFor(api), parts = api.dinoDetailedBodyPartDefinitions(study.species, true), raw = { key: study.key, species: study.species.id, hypothesis: 'evidence', yaw: 0, pitch: .16, zoom: 1, showSkeleton: true, visible: ['trunk'], lambeosaur: { active: true, state: 'native-ready', species: study.species.id, region: 'tail', gait: 'proven' } };
    expect(api.dinoShapeViewCapture(study, raw, parts).lambeosaur).toEqual({ active: true, species: 'parasaurolophus', region: 'tail' });
    for (const patch of [{ state: 'loading' }, { species: 'olorotitan' }, { region: 'gait' }]) expect(api.dinoShapeViewCapture(study, { ...raw, lambeosaur: { ...raw.lambeosaur, ...patch } }, parts)).not.toHaveProperty('lambeosaur');
  });
});
