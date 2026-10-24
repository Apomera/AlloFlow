// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url), THREE = require(resolve('vendor/three-r128/three.min.js'));
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync(resolve(process.env.DINO_PERSPECTIVE_CHECK_SOURCE || 'stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
const marker = "window.StemLab.registerTool('dinoLab'", mounted = [], frames = [];
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT, previousRaf = window.requestAnimationFrame;
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; }; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct; window.requestAnimationFrame = previousRaf; });
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) { await React.act(async () => root.unmount()); host.remove(); }
  delete window.__perspectiveCamera; delete window.__perspectiveYaw; frames.splice(0);
});
function load() {
  const captured = { ensures: 0 };
  window.StemLab = { ensureThree() { captured.ensures++; return new Promise(() => {}); }, registerTool(_id, cfg) { captured.cfg = cfg; } };
  new Function(source
    .replace('var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 });', 'var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 }); window.__perspectiveYaw = yawRef;')
    .replace('var cameraControlRef = React.useRef(null);', 'var cameraControlRef = React.useRef(null); window.__perspectiveCamera = cameraControlRef;')
    .replace(marker, 'globalThis.__perspectiveContract = { DINOS, DINO_SHAPE_STUDY_FAMILIES, dinoShapeStudyFor, dinoShapeStudyPairFor, dinoShapeLimbTraceProject, dinoShapeLimbPerspectiveRows, dinoShapeLimbPerspectiveText, dinoShapeLimbPerspectiveCapture, dinoShapeLimbTraceCapture, dinoShapeViewCapture, dinoShapeViewCaption, dinoShapeViewNotebookAppend, dinoPartInspectionFor, dinoDetailedBodyPartDefinitions, skeletalAnatomyProfileFor, reconstructionHypothesesFor, comparisonPairKey }; ' + marker))();
  const api = globalThis.__perspectiveContract; delete globalThis.__perspectiveContract;
  return { api, cfg: captured.cfg, ensures: () => captured.ensures };
}
const animal = (api, id) => api.DINOS.find(item => item.id === id);
const studyFor = (api, overrides = {}) => api.dinoShapeStudyFor({ family: 'stegosaurs', b: 'kentrosaurus', active: 'a', lens: 'limbs', ...overrides });
function fixture() {
  const model = new THREE.Group(), camera = new THREE.PerspectiveCamera(45, 4 / 3, .1, 100), limbs = [];
  camera.position.set(0, 3, 8); camera.lookAt(0, .7, 0); camera.updateMatrixWorld(true);
  for (const side of [-1, 1]) {
    limbs.push({ front: true, side, top: [-1, 1.2, side * .5], knee: [-1.25, .65, side * .6], ankle: [-.9, .3, side * .65], foot: [-1.05, .05, side * .7] });
    limbs.push({ front: false, side, top: [1, 1.4, side * .5], knee: [.8, .8, side * .6], ankle: [1.15, .3, side * .65], foot: [1, .05, side * .7] });
  }
  return { model, camera, anatomy: { family: 'stegosaurs', limbs } };
}
const projection = (api, f) => api.dinoShapeLimbTraceProject(THREE, f.anatomy, f.model, f.camera, 800, 600, []);
async function mount() {
  const loaded = load(), host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
  const writing = { version: 1, pairs: [{ key: 'kentrosaurus|stegosaurus', a: 'kentrosaurus', b: 'stegosaurus', step: 'explain', prediction: 'The limb outlines may look different.', evidence: ['traits'], explanation: 'My own explanation.', limit: 'Pose and tissue are reconstructed.' }] };
  let data = { tab: 'field3d', selected: 'stegosaurus', field3dSelected: 'stegosaurus', field3dLabelMode: 'anatomy', field3dReconstructionMode: 'evidence', field3dAutoRotate: true, compareInquiry: writing };
  function render() { root.render(loaded.cfg.render({ React, toolData: { dinoLab: data }, update(_scope, key, value) { data = { ...data, [key]: value }; render(); }, updateMulti(_scope, patch) { data = { ...data, ...patch }; render(); }, announceToSR() {} })); }
  mounted.push({ root, host }); await React.act(async () => render());
  const camera = vi.fn(); camera.preserveInspectionFrame = vi.fn(); window.__perspectiveCamera.current = camera;
  async function act(callback) { await React.act(async () => callback()); await React.act(async () => frames.splice(0).forEach(frame => frame(0))); }
  const click = selector => act(() => { const node = host.querySelector(selector); if (!node) throw new Error('Missing perspective inquiry control ' + selector); node.click(); });
  return { ...loaded, host, camera, click, writing, data: () => data, yaw: () => window.__perspectiveYaw.current };
}

describe('Perspective checks distinguish the reconstruction from its projection', () => {
  it('resolves overlapping stegosaur pairs to full-body studies while honoring validated legacy armor context', () => {
    const { api } = load(), stego = animal(api, 'stegosaurus'), kentro = animal(api, 'kentrosaurus'), tuo = animal(api, 'tuojiangosaurus'), hua = animal(api, 'huayangosaurus'), hesper = animal(api, 'hesperosaurus');
    const family = api.DINO_SHAPE_STUDY_FAMILIES.find(item => item.id === 'stegosaurs');
    expect(family).toMatchObject({ reference: 'stegosaurus', choices: ['kentrosaurus', 'huayangosaurus', 'tuojiangosaurus'], fullBody: true });
    for (const b of [kentro, tuo, hua]) for (const pair of [[stego, b], [b, stego]]) expect(api.dinoShapeStudyPairFor(...pair).family.id).toBe('stegosaurs');
    expect(api.dinoShapeStudyPairFor(stego, kentro, 'armor').family.id).toBe('armor');
    expect(api.dinoShapeStudyPairFor(stego, kentro, { family: 'armor', key: api.comparisonPairKey(stego, kentro) }).family.id).toBe('armor');
    expect(api.dinoShapeStudyPairFor(stego, kentro, { family: 'armor', key: 'wrong-pair' }).family.id).toBe('stegosaurs');
    expect(api.dinoShapeStudyPairFor(stego, hua, 'armor').family.id).toBe('stegosaurs');
    expect(api.dinoShapeStudyPairFor(stego, hesper).family.id).toBe('armor');
    expect(api.dinoShapeStudyFor({ family: 'armor', b: 'kentrosaurus', active: 'a' }).lens).toBeNull();
    expect(api.dinoShapeStudyFor({ family: 'stegosaurs', b: 'hesperosaurus', active: 'a' })).toBeNull();
  });

  it('keeps native 3D joint-center proportions fixed under orbit while the same projected segments change', () => {
    const { api } = load(), f = fixture(), before = projection(api, f), first = api.dinoShapeLimbPerspectiveRows(before.chains);
    expect(before.chains).toHaveLength(2); expect(first.every(row => row.status === 'ready')).toBe(true);
    f.model.rotation.y = 1.3; f.model.updateMatrixWorld(true);
    const after = projection(api, f), second = api.dinoShapeLimbPerspectiveRows(after.chains);
    expect(after.chains).toHaveLength(2); expect(second.every(row => row.status === 'ready')).toBe(true);
    expect(second.map(row => row.modelPercent)).toEqual(first.map(row => row.modelPercent));
    expect(second.map(row => row.viewPercent)).not.toEqual(first.map(row => row.viewPercent));
    for (const row of second) {
      const limb = f.anatomy.limbs.find(item => item.front === (row.id === 'fore') && item.side === after.side);
      const a = new THREE.Vector3(...limb.top), b = new THREE.Vector3(...limb.knee), c = new THREE.Vector3(...limb.ankle);
      expect(row.modelPercent).toBe(Math.round(b.distanceTo(c) / a.distanceTo(b) * 100));
    }
    expect(f.model.children).toHaveLength(0);
    const withoutFoot = structuredClone(after.chains); withoutFoot.forEach(chain => { chain.points[3].world = [999, 999, 999]; });
    expect(api.dinoShapeLimbPerspectiveRows(withoutFoot)).toEqual(second);
  });

  it('withholds unstable screen ratios for small, edge-on, clipped or invalid segments', () => {
    const { api } = load(), f = fixture(), chains = projection(api, f).chains;
    const compressed = structuredClone(chains); compressed[0].points[1].x = compressed[0].points[0].x + 1; compressed[0].points[1].y = compressed[0].points[0].y + 1;
    const edge = api.dinoShapeLimbPerspectiveRows(compressed)[0];
    expect(edge.status).toBe('edge'); expect(edge.modelPercent).toBeGreaterThan(0); expect(edge.viewPercent).toBeNull(); expect(api.dinoShapeLimbPerspectiveText(edge)).toContain('too compressed or small');
    for (const change of [points => { points[0].inFrame = false; }, points => { points[1].world[0] = NaN; }, points => { points[1].world = points[0].world.slice(); }]) {
      const invalid = structuredClone(chains); change(invalid[0].points);
      expect(api.dinoShapeLimbPerspectiveRows(invalid)[0]).toEqual({ id: 'fore', modelPercent: null, viewPercent: null, status: 'outside' });
    }
    expect(api.dinoShapeLimbPerspectiveRows([]).every(row => row.status === 'outside')).toBe(true);
  });

  it('captures bounded readouts only while enabled and explicitly appends them without replacing student reasoning', () => {
    const { api } = load(), study = studyFor(api), f = fixture(), rows = api.dinoShapeLimbPerspectiveRows(projection(api, f).chains);
    const raw = { key: study.key, species: study.species.id, hypothesis: 'evidence', yaw: .3, pitch: .3, zoom: 1, showBody: true, opacity: 100, trace: { active: true, side: 1, visible: ['fore-0'], perspective: { active: true, rows } } };
    const first = api.dinoShapeViewCapture(study, raw, []);
    expect(first.trace.perspective).toEqual({ active: true, rows }); expect(api.dinoShapeViewCaption(first, [])).toContain('perspective check');
    const disabled = api.dinoShapeViewCapture(study, { ...raw, trace: { ...raw.trace, perspective: { active: false, rows } } }, []);
    expect(disabled.trace).not.toHaveProperty('perspective'); expect(api.dinoShapeViewCaption(disabled, [])).not.toContain('perspective check');
    expect(api.dinoShapeLimbPerspectiveCapture({ active: true, rows: [{ id: 'fore', modelPercent: Infinity, viewPercent: 99999, status: 'ready' }] }).rows[0].status).toBe('outside');
    expect(api.dinoShapeLimbPerspectiveCapture({ active: true, rows: Array(3).fill(rows[0]) })).toBeNull();
    const key = api.comparisonPairKey(study.a, study.b), original = { version: 1, pairs: [{ key, a: 'kentrosaurus', b: 'stegosaurus', step: 'explain', prediction: 'I expect the image ratio to change.', evidence: ['traits'], explanation: 'My own reasoning.', limit: 'These are model centers.' }] };
    const result = api.dinoShapeViewNotebookAppend(original, study, [first, { ...disabled, yaw: 1.3 }], [], 'evidence');
    expect(result.added).toBe(true); expect(result.state.pairs[0]).toMatchObject({ prediction: original.pairs[0].prediction, limit: original.pairs[0].limit, evidence: ['traits', 'model'] });
    expect(result.state.pairs[0].explanation).toMatch(/^My own reasoning\./); expect(result.state.pairs[0].explanation).toContain('perspective check'); expect(result.state.pairs[0].explanation).toContain('not fossil proof');
    expect(api.dinoShapeViewNotebookAppend(result.state, study, [first, { ...disabled, yaw: 1.3 }], [], 'evidence').reason).toBe('duplicate');
  });

  it('keeps perspective optional, preserves the spatial frame, and resets it with guide or lens changes', async () => {
    const view = await mount(); await view.click('[data-dino-shape-family="stegosaurs"]'); await view.click('[data-dino-shape-lens="limbs"]');
    expect(view.host.querySelector('[data-dino-perspective-check-toggle]')).toBeNull();
    await view.click('[data-dino-joint-trace-toggle]');
    const button = view.host.querySelector('[data-dino-perspective-check-toggle]'), canvas = view.host.querySelector('canvas.dinolab-3d-canvas'), count = view.ensures();
    expect(button.getAttribute('aria-pressed')).toBe('false'); expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    Object.assign(view.yaw(), { value: .8, pitch: .4, zoom: .9 }); view.camera.mockClear();
    await view.click('[data-dino-perspective-check-toggle]');
    expect(button.getAttribute('aria-pressed')).toBe('true'); expect(view.host.querySelector('#dinolab-perspective-check-readouts').hidden).toBe(false);
    expect(view.host.querySelector('#dinolab-perspective-check-readouts').textContent).toContain('authored reconstruction');
    expect(view.camera).not.toHaveBeenCalled(); expect(view.ensures()).toBe(count); expect(view.host.querySelector('canvas.dinolab-3d-canvas')).toBe(canvas);
    expect(view.yaw()).toMatchObject({ value: .8, pitch: .4, zoom: .9 });
    await view.click('[data-dino-shape-layer="life"]'); await view.click('[data-dino-shape-dock-side="b"]');
    expect(view.host.querySelector('[data-dino-perspective-check-toggle]').getAttribute('aria-pressed')).toBe('true');
    expect(view.data().compareInquiry).toEqual(view.writing);
    await view.click('[data-dino-joint-trace-toggle]'); await view.click('[data-dino-joint-trace-toggle]');
    expect(view.host.querySelector('[data-dino-perspective-check-toggle]').getAttribute('aria-pressed')).toBe('false');
    await view.click('[data-dino-perspective-check-toggle]'); await view.click('[data-dino-shape-lens="allocation"]');
    expect(view.host.querySelector('[data-dino-perspective-check-toggle]')).toBeNull();
    await view.click('[data-dino-shape-lens="limbs"]'); await view.click('[data-dino-joint-trace-toggle]');
    expect(view.host.querySelector('[data-dino-perspective-check-toggle]').getAttribute('aria-pressed')).toBe('false');
  }, 120000);

  it('preserves explicit legacy armor notebook navigation and the original comparison writing', async () => {
    const view = await mount(); await view.click('[data-dino-shape-family="armor"]'); await view.click('[data-dino-shape-notebook]');
    expect(view.data().compareShapeContext).toEqual({ family: 'armor', key: 'kentrosaurus|stegosaurus' });
    expect(view.host.querySelector('[data-dino-shape-resume="armor"]')).toBeTruthy();
    await view.click('[data-dino-shape-resume="armor"]'); expect(view.data().field3dShapeStudy.family).toBe('armor');
    await view.click('[data-dino-shape-family="stegosaurs"]'); await view.click('[data-dino-shape-notebook]');
    expect(view.host.querySelector('[data-dino-shape-resume="stegosaurs"]')).toBeTruthy();
    await view.click('[data-dino-shape-resume="stegosaurs"]'); expect(view.data().field3dShapeStudy.family).toBe('stegosaurs');
    expect(view.data().compareInquiry).toEqual(view.writing);
  }, 120000);

  it('links all four body and skull guides to primary evidence while distinguishing fossils from authored dimensions', () => {
    const { api } = load();
    for (const id of ['stegosaurus', 'kentrosaurus', 'huayangosaurus', 'tuojiangosaurus']) {
      const dn = animal(api, id), profile = api.skeletalAnatomyProfileFor(dn), mode = api.reconstructionHypothesesFor(dn, profile, 'evidence').active;
      const parts = api.dinoDetailedBodyPartDefinitions(dn, profile.weightBearingForelimbs, mode);
      for (const partId of ['trunk', 'forelimb', 'foot']) {
        const guide = api.dinoPartInspectionFor(dn, parts.find(part => part.id === partId));
        expect(guide.source.url).toMatch(/^https:\/\/doi\.org\//); expect(guide.life).toContain('same fixed'); expect(guide.limit).toContain('authored reconstruction');
        if (partId === 'forelimb') expect(guide.bone).toContain('not measured maximum fossil bone lengths');
        if (partId === 'foot') expect(guide.source.url).toBe('https://doi.org/10.4202/app.2010.0055');
        if (id === 'stegosaurus') expect(guide.limit).toContain('its hands are not preserved');
        if (id === 'kentrosaurus' && partId === 'forelimb') { expect(guide.bone).toContain('mostly erect'); expect(guide.source.url).toContain('s00015-010-0024-2'); }
      }
      for (const partId of ['head', 'skull', 'snout', 'jaw', 'teeth', 'beak']) {
        const part = parts.find(item => item.id === partId);
        expect(part, `${id}: ${partId} is inspectable`).toBeDefined();
        const guide = api.dinoPartInspectionFor(dn, part);
        expect(guide.question).toContain('side and above');
        expect(guide.life).toContain('same fixed skull and snout landmarks');
        expect(guide.limit).toContain('authored reconstruction dimensions, not fossil measurements');
        expect(guide.limit).toContain('openings and sutures remain unresolved');
        expect(guide.limit).toContain('exact tooth count or dental formula');
        if (id === 'huayangosaurus') {
          expect(guide.source.url).toBe('https://doi.org/10.1080/02724634.1992.10011463');
          expect(guide.bone).toContain('premaxillary teeth at the front of its upper jaw');
          expect(guide.bone).toContain('toothless lower predentary supports a lower beak');
          expect(guide.bone).toContain('shorter, deeper skull frame');
        } else {
          expect(guide.source.url).toBe('https://doi.org/10.1017/S1477201908002459');
          expect(guide.bone).toContain('small, low skull frame');
          expect(guide.bone).toContain('Huayangosaurus');
        }
      }
      if (id === 'huayangosaurus') {
        const beak = parts.find(part => part.id === 'beak'), teeth = parts.find(part => part.id === 'teeth');
        expect(beak.label).toBe('Lower beak');
        expect(beak.characteristics).toContain('toothless lower predentary');
        expect(beak.characteristics).toContain('retained premaxillary teeth in the upper snout');
        expect(beak.evidence).toContain('lower-beak keratin outline remains inferred');
        expect(teeth.look).toContain('front of the upper jaw');
        expect(teeth.look).toContain('lower beak');
        expect(teeth.characteristics).toContain('rather than reproduce an exact fossil dental formula');
      } else expect(parts.find(part => part.id === 'beak').label).toBe('Beak');
      if (id === 'stegosaurus' || id === 'huayangosaurus') {
        const plateGuide = api.dinoPartInspectionFor(dn, parts.find(part => part.id === 'plates'));
        expect(plateGuide.source.title).toContain('Maidment'); expect(plateGuide.source.title).not.toContain('Hesperosaurus');
        expect(plateGuide.question).not.toContain('front-to-back length greater than its height');
        if (id === 'huayangosaurus') expect(plateGuide.limit).toContain('parascapular spines');
      }
    }
    const hesperosaurus = animal(api, 'hesperosaurus'), profile = api.skeletalAnatomyProfileFor(hesperosaurus);
    const parts = api.dinoDetailedBodyPartDefinitions(hesperosaurus, profile.weightBearingForelimbs, api.reconstructionHypothesesFor(hesperosaurus, profile, 'evidence').active);
    expect(parts.find(part => part.id === 'beak').label).toBe('Beak');
    expect(api.dinoPartInspectionFor(hesperosaurus, parts.find(part => part.id === 'skull')).limit).not.toContain('Skull and snout axes');
  });
});
