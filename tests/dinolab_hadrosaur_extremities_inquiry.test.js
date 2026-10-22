// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url), THREE = require(resolve('vendor/three-r128/three.min.js'));
const React = require(resolve('desktop/web-app/node_modules/react')), { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync(resolve(process.env.DINO_HADROSAUR_EXTREMITIES_INQUIRY_SOURCE || 'stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
const marker = "window.StemLab.registerTool('dinoLab'", mounted = [], frames = [], oldAct = globalThis.IS_REACT_ACT_ENVIRONMENT, oldRaf = window.requestAnimationFrame;
const ids = ['parasaurolophus', 'corythosaurus', 'lambeosaurus', 'olorotitan', 'edmontosaurus'];
const own = { version: 1, pairs: [{ key: 'corythosaurus|parasaurolophus', a: 'corythosaurus', b: 'parasaurolophus', step: 'explain', prediction: 'A covering may conceal separate finger bones.', evidence: ['traits'], explanation: 'My own observation of the hand.', limit: 'Complete soft tissue is reconstructed.' }] };
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; }; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = oldAct; window.requestAnimationFrame = oldRaf; });
afterEach(async () => { for (const { root, host } of mounted.splice(0)) { await React.act(async () => root.unmount()); host.remove(); } for (const key of ['__hadProps', '__hadCamera', '__hadYaw', '__hadChoice']) delete window[key]; frames.splice(0); });
function load() {
  const captured = { ensures: 0 };
  window.StemLab = { ensureThree() { captured.ensures++; return new Promise(() => {}); }, registerTool(_id, cfg) { captured.cfg = cfg; } };
  new Function(source
    .replace('function DinoFieldStation3D(props) {', 'function DinoFieldStation3D(props) {window.__hadProps=props;')
    .replace('var cameraControlRef = React.useRef(null);', 'var cameraControlRef = React.useRef(null);window.__hadCamera=cameraControlRef;')
    .replace('var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 });', 'var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 });window.__hadYaw=yawRef;')
    .replace('shapeHadrosaurDistalRef.current = { active: shapeHadrosaurDistalEligible, kind: shapeHadrosaurDistalKind, ray: shapeHadrosaurDistalRay };', 'shapeHadrosaurDistalRef.current = { active: shapeHadrosaurDistalEligible, kind: shapeHadrosaurDistalKind, ray: shapeHadrosaurDistalRay };window.__hadChoice=shapeHadrosaurDistalRef;')
    .replace(marker, 'globalThis.__hadAPI={DINOS,DINO_FULL_BODY_STUDY_LENSES,dinoShapeStudyFor,dinoShapeStudyLensFor,dinoShapeStudyPose,dinoShapeStudyLandmarkIds,dinoShapeHadrosaurDistalEligible,dinoShapeHadrosaurDistalEvidenceFor,dinoShapeHadrosaurDistalNativeReady,dinoShapeHadrosaurDistalRayView,dinoShapeHadrosaurDistalCapture,dinoShapeViewCapture,dinoShapeViewCaption,dinoShapeViewContextKey,dinoShapeViewNotebookAppend,dinoDetailedBodyPartDefinitions,dinoPartInspectionFor};' + marker))();
  const api = globalThis.__hadAPI; delete globalThis.__hadAPI;
  return { api, cfg: captured.cfg, ensures: () => captured.ensures };
}
const dn = (api, id) => api.DINOS.find(value => value.id === id);
const studyFor = (api, extra = {}) => api.dinoShapeStudyFor({ family: 'lambeosaurs', b: 'corythosaurus', active: 'a', lens: 'hands-feet', ...extra });
function fixtureRecords(species = 'parasaurolophus') {
  const group = new THREE.Group(), limbs = [], records = [];
  for (const front of [true, false]) for (const side of [-1, 1]) {
    const rays = (front ? [2, 3, 4, 5] : [2, 3, 4]).map(ray => ({ ray })); limbs.push({ front, side, rays });
    for (const { ray } of rays) for (const layer of ['bone', 'life']) {
      if (front && layer === 'life' && ray === 4) continue;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(.1, .2, .1)); mesh.position.set((ray - 3) * .18, front ? .3 : -.3, side * .2); group.add(mesh);
      records.push({ mesh, tag: { species, front, side, ray, element: 'test-native-element', layer } });
    }
    if (front) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(.5, .2, .2)); group.add(mesh); records.push({ mesh, tag: { species, front, side, ray: 0, element: 'bundled-envelope', layer: 'life' } }); }
  }
  group.updateMatrixWorld(true); return { group, records, metadata: { species, limbs } };
}
async function mount() {
  const loaded = load(), host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  let data = { tab: 'field3d', selected: 'parasaurolophus', field3dSelected: 'parasaurolophus', field3dStage: 'studio', field3dReconstructionMode: 'evidence', field3dShowSkeleton: true, field3dShowBody: false, field3dBodyOpacity: 28, field3dShapeStudy: { family: 'lambeosaurs', b: 'corythosaurus', active: 'a', lens: 'hands-feet' }, compareInquiry: structuredClone(own) };
  function render() { root.render(loaded.cfg.render({ React, toolData: { dinoLab: data }, update(_scope, key, value) { data = { ...data, [key]: value }; render(); }, updateMulti(_scope, patch) { data = { ...data, ...patch }; render(); }, announceToSR() {} })); }
  mounted.push({ root, host }); await React.act(async () => render());
  const camera = vi.fn(); camera.preserveInspectionFrame = vi.fn(); camera.focusHadrosaurDistal = vi.fn(); window.__hadCamera.current = camera;
  camera.captureShapeView = () => {
    const props = window.__hadProps, study = props.shapeStudy, choice = window.__hadChoice.current, evidence = loaded.api.dinoShapeHadrosaurDistalEvidenceFor(study.species, choice.kind);
    return loaded.api.dinoShapeViewCapture(study, { key: study.key, species: study.species.id, hypothesis: 'evidence', yaw: window.__hadYaw.current.value, pitch: window.__hadYaw.current.pitch, zoom: window.__hadYaw.current.zoom, showSkeleton: props.showSkeleton, showBody: props.showBody, visible: [choice.kind === 'manus' ? 'hand' : 'foot'], sources: evidence.sources, hadrosaur: { ...choice, state: 'native-ready', species: study.species.id, focused: !!choice.kind, inFrameRays: choice.kind === 'pes' ? [2, 3, 4] : [2, 3, 4, 5] }, lambeosaur: { active: true, state: 'native-ready', species: study.species.id, region: 'trunk' } }, loaded.api.dinoDetailedBodyPartDefinitions(study.species, true));
  };
  async function act(fn) { await React.act(async () => fn()); await React.act(async () => frames.splice(0).forEach(callback => callback(0))); }
  return { ...loaded, host, camera, data: () => data, click: selector => act(() => { const node = host.querySelector(selector); if (!node) throw Error('Missing hadrosaur control ' + selector); node.click(); }), change: (selector, value) => act(() => { const node = host.querySelector(selector); if (!node) throw Error('Missing hadrosaur input ' + selector); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); }) };
}

describe('Hadrosaur hands and feet evidence inquiry', () => {
  it('adds a deliberate lens only to the existing exact-four family while retaining older regional lenses', () => {
    const { api } = load(), study = studyFor(api), parts = api.dinoDetailedBodyPartDefinitions(study.species, true);
    expect(api.dinoShapeHadrosaurDistalEligible(study)).toBe(true); expect(study.lens.label).toBe('Hands and feet'); expect(study.lens.prompt).toContain('visible tips');
    expect(api.dinoShapeStudyLandmarkIds(study, parts)).toEqual(['hand', 'foot']);
    for (const lens of ['outline', 'limbs', 'allocation']) { const other = studyFor(api, { lens }); expect(other.lens.id).toBe(lens); expect(api.dinoShapeHadrosaurDistalEligible(other)).toBe(false); }
    for (const family of ['sauropods', 'theropods', 'ornithopods']) expect(api.dinoShapeStudyLensFor({ id: family, fullBody: true }, 'hands-feet').id).toBe('outline');
    expect(studyFor(api, { b: 'edmontosaurus' })).toBeNull();
    for (const id of ids) { const definitions = api.dinoDetailedBodyPartDefinitions(dn(api, id), true); expect(definitions.some(part => part.id === 'claws')).toBe(false); expect(definitions.map(part => part.id)).toEqual(expect.arrayContaining(['hand', 'fingers', 'wrist', 'foot', 'toes', 'ankle'])); }
    expect(api.dinoDetailedBodyPartDefinitions(dn(api, 'velociraptor'), false).some(part => part.id === 'claws')).toBe(true);
  });
  it('distinguishes bony rays, unguals and provisional covering margins with species-specific preservation limits', () => {
    const { api } = load(), read = (id, kind) => api.dinoShapeHadrosaurDistalEvidenceFor(dn(api, id), kind);
    for (const id of ids) {
      const hand = read(id, 'manus'), foot = read(id, 'pes');
      expect(hand.evidence).toContain('no ray I'); expect(hand.evidence).toContain('II and III'); expect(hand.evidence).toContain('V is reduced');
      expect(foot.evidence).toContain('II–IV'); expect(foot.evidence).toContain('flat-bottomed'); expect(hand.covering).toContain('provisional'); expect(hand.covering).toContain('exact II exposure');
      expect(foot.covering).toContain('pedal sheaths'); expect(foot.covering).toContain('does not measure every toe'); expect(foot.covering).not.toContain('manual III');
      expect(hand.limit).toContain('not a universal phalangeal formula'); expect(hand.sources).toHaveLength(4); expect(new Set(hand.sources.map(row => row.url)).size).toBe(4);
    }
    expect(read('parasaurolophus', 'pes').limit).toContain('no distal hindlimbs'); expect(read('corythosaurus', 'manus').limit).toContain('Corythosaurus sp.'); expect(read('lambeosaurus', 'manus').limit).toContain('different species'); expect(read('olorotitan', 'pes').limit).toContain('lacks all hands and feet'); expect(read('edmontosaurus', 'manus').limit).toContain('deflated skin');
    const safe = api.dinoShapeHadrosaurDistalEvidenceFor(dn(api, ids[0]), 'manus', { sources: [{ title: 'Invalid', url: 'javascript:bad' }, { title: 'Valid', url: 'https://example.org/primary' }, { title: 'Duplicate', url: 'https://example.org/primary' }] }); expect(safe.sources).toEqual([{ title: 'Valid', url: 'https://example.org/primary' }]);
    expect(api.dinoShapeHadrosaurDistalEvidenceFor(dn(api, 'iguanodon'), 'manus').state).toBe('loading');
  });
  it('gives ordinary hand and foot inspection the same exact-five evidence instead of a generic claw guide', () => {
    const { api } = load();
    for (const id of ids) for (const part of ['hand', 'wrist', 'fingers', 'foot', 'toes', 'ankle']) { const guide = api.dinoPartInspectionFor(dn(api, id), { id: part, region: 'body' }); expect(guide.question).toContain('visible tips'); expect(guide.life).toContain('Bony unguals and exposed keratin'); expect(guide.limit).toContain('Close study isolates one restored foot'); expect(guide.sources).toHaveLength(4); }
    expect(api.dinoPartInspectionFor(dn(api, 'iguanodon'), { id: 'hand', region: 'body' }).question).not.toContain('visible tips');
  });
  it('requires the actual four limbs and anatomical ray identities before reporting native readiness', () => {
    const { api } = load(), fixture = fixtureRecords(), valid = (metadata, records = fixture.records) => api.dinoShapeHadrosaurDistalNativeReady(metadata, records, ids[0]);
    expect(valid(fixture.metadata)).toBe(true); expect(valid({ ...fixture.metadata, species: ids[1] })).toBe(false); expect(valid({ ...fixture.metadata, limbs: fixture.metadata.limbs.slice(1) })).toBe(false);
    const bad = structuredClone(fixture.metadata); bad.limbs[2].rays[0].ray = 1; expect(valid(bad)).toBe(false);
    expect(valid(fixture.metadata, fixture.records.filter(record => !(record.tag.front && record.tag.side === 1 && record.tag.ray === 5)))).toBe(false);
    expect(valid(fixture.metadata, fixture.records.map(record => ({ ...record, mesh: null })))).toBe(false);
    const life = fixture.records.filter(record => record.tag.layer === 'life');
    expect(api.dinoShapeHadrosaurDistalNativeReady(fixture.metadata, life, ids[0], 'life')).toBe(true);
    expect(api.dinoShapeHadrosaurDistalNativeReady(fixture.metadata, life, ids[0], 'bone')).toBe(false);
    expect(api.dinoShapeHadrosaurDistalNativeReady(fixture.metadata, life.filter(record => record.tag.ray !== 0), ids[0], 'life')).toBe(false);
  });
  it('projects real native ray vertices with layer, side, viewport and ancestor visibility checks', () => {
    const { api } = load(), fixture = fixtureRecords(), camera = new THREE.PerspectiveCamera(45, 1, .01, 20); camera.position.set(0, 0, 3); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
    const view = (kind = 'manus', layer = 'bone') => api.dinoShapeHadrosaurDistalRayView(THREE, fixture.records, camera, kind, layer, ids[0]);
    expect(view().rays).toEqual([2, 3, 4, 5]); expect(view('pes').rays).toEqual([2, 3, 4]); expect(view().vertices).toBeGreaterThan(0); expect(view().inFrame).toBe(view().vertices);
    const selected = fixture.records.filter(record => record.tag.front && record.tag.side === 1 && record.tag.layer === 'bone' && record.tag.ray === 5); selected[0].mesh.position.x = 20; fixture.group.updateMatrixWorld(true); expect(view().rays).toEqual([2, 3, 4]); expect(view().inFrame).toBeLessThan(view().vertices);
    expect(view('manus', 'life').rays).toEqual([2, 3, 5]); fixture.group.visible = false; expect(view().rays).toEqual([]); expect(view().vertices).toBe(0); fixture.group.visible = true;
    expect(api.dinoShapeHadrosaurDistalRayView(THREE, fixture.records, camera, 'manus', 'bone', ids[1]).rays).toEqual([]);
  });
  it('uses intentional controls without camera or layer resets and retains focus intention across A/B and new B', async () => {
    const view = await mount(), before = view.ensures(); expect(window.__hadChoice.current).toMatchObject({ kind: null, ray: 3 }); expect(view.camera.focusHadrosaurDistal).not.toHaveBeenCalled();
    await view.click('[data-dino-hadrosaur-distal="manus"]'); expect(view.camera.focusHadrosaurDistal).toHaveBeenLastCalledWith('manus'); expect(view.ensures()).toBe(before);
    await view.change('[data-dino-hadrosaur-ray]', '5'); expect(window.__hadChoice.current.ray).toBe(5); await view.click('[data-dino-hadrosaur-distal="pes"]'); expect(window.__hadChoice.current).toMatchObject({ kind: 'pes', ray: 3 });
    Object.assign(window.__hadYaw.current, { value: .73, pitch: .43, zoom: .9 }); const intentional = view.camera.focusHadrosaurDistal.mock.calls.length;
    await view.click('[data-dino-shape-layer="life"]'); await view.click('[data-dino-shape-dock-side="b"]'); await view.change('#dinolab-shape-study-species', 'lambeosaurus');
    expect(window.__hadChoice.current).toMatchObject({ kind: 'pes', ray: 3 }); expect(window.__hadYaw.current).toMatchObject({ value: .73, pitch: .43, zoom: .9, study: 'body' }); expect(view.camera.focusHadrosaurDistal).toHaveBeenCalledTimes(intentional); expect(view.data()).toMatchObject({ field3dShowSkeleton: false, field3dShowBody: true }); expect(view.data().compareInquiry).toEqual(own);
    for (const button of view.host.querySelectorAll('[data-dino-hadrosaur-distal]')) { expect(button.type).toBe('button'); expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44); }
    const sr = view.host.querySelector('[id^="dino3d-viewer-desc-"]').textContent; expect(sr).toContain('Hands and feet observation'); expect(sr).toContain('pedal sheaths'); expect(sr).toContain('boundaries here are restored'); expect(sr).toContain('different species'); expect(sr).not.toContain('manual III cover');
    await view.click('[data-dino-shape-lens="allocation"]'); expect(view.host.querySelector('.dinolab-hadrosaur-distal-control')).toBeNull(); expect(view.host.querySelector('.dinolab-lambeosaur-evidence')).not.toBeNull(); expect(window.__hadChoice.current).toMatchObject({ active: false, kind: null }); expect(window.__hadYaw.current.study).toBe('full');
  }, 120000);
  it('captures only loaded matching extremity context and rejects absent rays and stale body-region captions', () => {
    const { api } = load(), study = studyFor(api), parts = api.dinoDetailedBodyPartDefinitions(study.species, true), raw = { key: study.key, species: ids[0], hypothesis: 'evidence', yaw: 0, pitch: .16, zoom: 1, showSkeleton: true, visible: ['hand'], hadrosaur: { active: true, state: 'native-ready', species: ids[0], kind: 'manus', ray: 5, focused: true, inFrameRays: [1, 2, 2, 5, 9] }, lambeosaur: { active: true, state: 'native-ready', species: ids[0], region: 'trunk' } };
    const pin = api.dinoShapeViewCapture(study, raw, parts); expect(pin.hadrosaur).toMatchObject({ kind: 'manus', ray: 5, side: 1, inFrameRays: [2, 5] }); expect(pin).not.toHaveProperty('lambeosaur'); expect(api.dinoShapeViewCaption(pin, parts)).toContain('covering may conceal elements');
    for (const patch of [{ state: 'loading' }, { species: ids[1] }, { kind: 'gait' }, { ray: 1 }, { kind: 'pes', ray: 5 }]) expect(api.dinoShapeViewCapture(study, { ...raw, hadrosaur: { ...raw.hadrosaur, ...patch } }, parts)).not.toHaveProperty('hadrosaur');
  });
  it('keeps distinct hand/foot contexts, restores them for current layers, and appends without replacing learner writing', async () => {
    const view = await mount(); await view.click('[data-dino-hadrosaur-distal="manus"]'); await view.change('[data-dino-hadrosaur-ray]', '5'); await view.click('[data-dino-shape-keep-view="1"]');
    await view.click('[data-dino-hadrosaur-distal="pes"]'); window.__hadYaw.current.pitch = 1.45; await view.click('[data-dino-shape-keep-view="2"]');
    expect(view.host.querySelector('[data-dino-shape-view-caption="1"]').textContent).toContain('hand (manus) / selected ray V'); expect(view.host.querySelector('[data-dino-shape-view-caption="2"]').textContent).toContain('hind foot (pes) / selected ray III');
    await view.click('[data-dino-shape-layer="life"]'); await view.click('[data-dino-shape-replay-view="1"]'); expect(window.__hadChoice.current).toMatchObject({ kind: 'manus', ray: 5 }); expect(view.camera.focusHadrosaurDistal).toHaveBeenLastCalledWith('manus'); expect(view.data().field3dShowBody).toBe(true);
    await view.click('[data-dino-shape-append-views]'); const saved = structuredClone(view.data().compareInquiry); expect(saved.pairs[0].explanation).toMatch(/^My own observation/); expect(saved.pairs[0].explanation).toContain('hand (manus)'); expect(saved.pairs[0].explanation).toContain('hind foot (pes)'); expect(saved.pairs[0].explanation).not.toContain('observation region: Trunk'); expect(saved.pairs[0].prediction).toBe(own.pairs[0].prediction); expect(saved.pairs[0].limit).toBe(own.pairs[0].limit); expect(saved.pairs[0].explanation.length).toBeLessThanOrEqual(1800);
    await view.click('[data-dino-shape-append-views]'); expect(view.data().compareInquiry).toEqual(saved);
    await view.change('#dinolab-shape-study-species', 'olorotitan'); expect(view.host.querySelectorAll('[data-dino-shape-view-caption]')).toHaveLength(0); expect(view.data().compareInquiry).toEqual(saved); expect(window.__hadChoice.current.kind).toBe('manus');
    await view.click('[data-dino-shape-lens="outline"]'); await view.click('[data-dino-shape-lens="hands-feet"]'); expect(window.__hadChoice.current).toMatchObject({ kind: null, ray: 3 }); expect(view.data().compareInquiry).toEqual(saved);
  }, 120000);
});
