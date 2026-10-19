// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url), React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync(resolve(process.env.DINO_FULLBODY_STUDY_SOURCE || 'stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
const marker = "window.StemLab.registerTool('dinoLab'", mounted = [], frames = [];
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT, previousRaf = window.requestAnimationFrame;
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; }; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct; window.requestAnimationFrame = previousRaf; });
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) { await React.act(async () => root.unmount()); host.remove(); }
  for (const key of ['__fullbodyYaw', '__fullbodyProps', '__fullbodyCamera']) delete window[key];
  frames.splice(0);
});
function load() {
  const captured = { ensures: 0 };
  window.StemLab = { ensureThree() { captured.ensures++; return new Promise(() => {}); }, registerTool(_id, cfg) { captured.cfg = cfg; } };
  new Function(source
    .replace('function DinoFieldStation3D(props) {', 'function DinoFieldStation3D(props) { window.__fullbodyProps = props;')
    .replace('var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 });', 'var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 }); window.__fullbodyYaw = yawRef;')
    .replace('var cameraControlRef = React.useRef(null);', 'var cameraControlRef = React.useRef(null); window.__fullbodyCamera = cameraControlRef;')
    .replace(marker, 'globalThis.__fullbodyContract = { DINOS, DINO_SHAPE_STUDY_FAMILIES, DINO_FULL_BODY_STUDY_LENSES, dinoShapeStudyFor, dinoShapeStudyPairFor, dinoShapeStudyNavigationPatch, dinoShapeStudyPose, dinoShapeStudyLandmarkIds, dinoDetailedBodyPartDefinitions, dinoPartInspectionFor, skeletalAnatomyProfileFor, reconstructionHypothesesFor, comparisonPairKey, comparisonInquiryState }; ' + marker))();
  const art = globalThis.__fullbodyContract; delete globalThis.__fullbodyContract;
  const dn = id => art.DINOS.find(entry => entry.id === id);
  function parts(id) { const animal = dn(id), profile = art.skeletalAnatomyProfileFor(animal), active = art.reconstructionHypothesesFor(animal, profile, 'evidence').active; return art.dinoDetailedBodyPartDefinitions(animal, profile.weightBearingForelimbs, active); }
  return { art, cfg: captured.cfg, dn, parts, ensures: () => captured.ensures };
}
async function mount(overrides = {}) {
  const api = load(), host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host), patches = [];
  const original = { version: 1, speciesId: 'brachiosaurus', hasProgress: true, workflowStarted: true, scanSpecies: 'brachiosaurus', scanLogged: { skull: true }, assemblySpecies: 'brachiosaurus', assemblyPlaced: {}, claimBoneSpecies: 'brachiosaurus', claimBone: 'skull', autoRotate: true };
  let data = { tab: 'field3d', selected: 'brachiosaurus', field3dSelected: 'brachiosaurus', field3dProgress: original,
    field3dWorkflowStarted: true, field3dScanSpecies: 'brachiosaurus', field3dScanLogged: { skull: true },
    field3dAssemblySpecies: 'brachiosaurus', field3dAssemblyPlaced: {}, field3dClaimBoneSpecies: 'brachiosaurus', field3dClaimBone: 'skull',
    field3dAutoRotate: true, field3dShowHuman: true, field3dShowEvidence: true, field3dStage: 'habitat', field3dLabelMode: 'anatomy', ...overrides };
  function render() { root.render(api.cfg.render({ React, toolData: { dinoLab: data },
    update(_scope, key, value) { patches.push({ [key]: value }); data = { ...data, [key]: value }; render(); },
    updateMulti(_scope, patch) { patches.push(patch); data = { ...data, ...patch }; render(); }, announceToSR() {} })); }
  mounted.push({ root, host }); await React.act(async () => render());
  const camera = vi.fn(); camera.preserveInspectionFrame = vi.fn(); window.__fullbodyCamera.current = camera;
  async function act(callback) { await React.act(async () => callback()); await React.act(async () => frames.splice(0).forEach(fn => fn(0))); }
  const click = selector => act(() => { const node = host.querySelector(selector); if (!node) throw new Error('Missing full-body control ' + selector); node.click(); });
  const change = (selector, value) => act(() => { const node = host.querySelector(selector); if (!node) throw new Error('Missing full-body input ' + selector); node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); });
  return { ...api, host, camera, patches, click, change, original, data: () => data, props: () => window.__fullbodyProps, yaw: () => window.__fullbodyYaw.current };
}

describe('Full-body comparative exploration', () => {
  it('connects the four ceratopsid body and face guides to fossil evidence and reconstruction limits', () => {
    const api = load();
    const inspect = (id, part) => api.art.dinoPartInspectionFor(api.dn(id), api.parts(id).find(entry => entry.id === part));
    for (const id of ['triceratops', 'styracosaurus', 'centrosaurus', 'chasmosaurus']) {
      for (const part of ['trunk', 'forelimb', 'head', 'horns']) {
        const guide = inspect(id, part);
        expect(guide.source.url).toMatch(/^https:\/\//);
        expect(guide.question).toMatch(/front|direction/);
        expect(guide.life).toContain('reconstructed');
        expect(guide.limit).toMatch(/representative|reconstructions/);
      }
      expect(inspect(id, 'trunk').bone).toContain('narrower anterior chest');
    }
    expect(inspect('centrosaurus', 'horns').bone).toContain('reduced or resorbed');
    expect(inspect('chasmosaurus', 'horns').limit).toContain('not a character');
    expect(inspect('styracosaurus', 'forelimb').bone).toContain('CMN 344');
    expect(inspect('triceratops', 'forelimb').bone).toContain('CM 1618');
  });
  it('distinguishes fossil measurements, comparative anatomy and pose limits in the actual part guides', () => {
    const api = load();
    const inspect = (id, part) => api.art.dinoPartInspectionFor(api.dn(id), api.parts(id).find(entry => entry.id === part));
    for (const id of ['brachiosaurus', 'diplodocus', 'apatosaurus', 'camarasaurus', 'iguanodon', 'edmontosaurus', 'maiasaura']) {
      for (const part of ['trunk', 'forelimb', 'neck']) {
        const guide = inspect(id, part);
        expect(guide.source.url).toMatch(/^https:\/\//); expect(guide.life).toContain('reconstructed');
        expect(guide.limit).toMatch(/pose|position|angles/);
      }
    }
    expect(inspect('edmontosaurus', 'forelimb').bone).toContain('ROM 801');
    expect(inspect('maiasaura', 'forelimb').bone).toContain('not an adult Maiasaura mean');
    expect(inspect('camarasaurus', 'neck').bone).toContain('C. lentus');
    expect(inspect('diplodocus', 'neck').bone).toContain('same curved axis');
  });
  it('curates only approved full-body taxa and keeps legacy records and invalid-lens fallback bounded', () => {
    const { art } = load();
    const families = art.DINO_SHAPE_STUDY_FAMILIES.filter(family => family.fullBody);
    expect(families.map(family => [family.id, family.reference, family.choices])).toEqual([
      ['sauropods', 'brachiosaurus', ['diplodocus', 'apatosaurus', 'camarasaurus']],
      ['ornithopods', 'edmontosaurus', ['iguanodon', 'maiasaura']],
      ['ceratopsids', 'triceratops', ['styracosaurus', 'centrosaurus', 'chasmosaurus']]
    ]);
    for (const family of families) for (const b of family.choices) {
      const study = art.dinoShapeStudyFor({ family: family.id, b, active: 'b', lens: 'allocation' });
      expect(study).toMatchObject({ region: 'full', partId: 'trunk', lens: { id: 'allocation' } });
      expect(art.dinoShapeStudyFor({ family: family.id, b, active: 'b' }).lens.id).toBe('outline');
      expect(art.dinoShapeStudyFor({ family: family.id, b, active: 'b', lens: '__proto__' }).lens.id).toBe('outline');
      expect(family.limit).toMatch(/reconstruct|inferred|model outlines/); expect(family.sources.every(source => /^https:\/\//.test(source.url))).toBe(true);
    }
    expect(art.dinoShapeStudyFor({ family: 'ornithopods', b: 'ouranosaurus', active: 'b' })).toBeNull();
    for (const raw of [{ family: 'crests', b: 'corythosaurus', active: 'a' }, { family: 'armor', b: 'kentrosaurus', active: 'b', lens: 'limbs' }]) expect(art.dinoShapeStudyFor(raw).lens).toBeNull();
  });

  it('uses only existing nonproxy anatomical parts and never supplies a missing projected landmark', () => {
    const api = load();
    const pointsLine = source.split('\n').find(line => line.includes('var points = bodyPartDefinitions.filter(function (part) { return projectedParts[part.id]'));
    const pointBlock = pointsLine + '\n' + source.slice(source.indexOf(pointsLine) + pointsLine.length + 1).split('\n').slice(0, 4).join('\n');
    const collect = new Function('bodyPartDefinitions', 'projectedParts', 'cameraStudy', 'pairVisible', 'relation', 'shapeLensVisible', 'shapeLensIds', 'bodyLabelMetrics', pointBlock + '\nreturn points;');
    for (const family of api.art.DINO_SHAPE_STUDY_FAMILIES.filter(f => f.fullBody)) for (const id of [family.reference, ...family.choices]) {
      const parts = api.parts(id), raw = { family: family.id, b: family.choices[0], active: id === family.reference ? 'a' : 'b' };
      const support = api.art.dinoShapeStudyFor({ ...raw, lens: 'limbs' }), allocation = api.art.dinoShapeStudyFor({ ...raw, lens: 'allocation' });
      expect(api.art.dinoShapeStudyLandmarkIds(support, parts)).toEqual(['forelimb', 'thigh']);
      expect(api.art.dinoShapeStudyLandmarkIds(allocation, parts)).toEqual(['neck', 'trunk', 'tail']);
      expect(api.art.dinoShapeStudyLandmarkIds(allocation, parts.filter(part => part.id !== 'neck').map(part => part.id === 'tail' ? { ...part, inferredProxy: true } : part))).toEqual(['trunk']);
      // Only a projected trunk exists in this sparse frame. The production
      // filter must not create points for either of the other requested IDs.
      expect(collect(parts, { trunk: { id: 'trunk' } }, 'full', false, null, true, ['neck', 'trunk', 'tail'], {})).toEqual([{ id: 'trunk' }]);
    }
  });

  it('changes the real lens handlers and annotations without a geometry rebuild, camera refit or pose reset', async () => {
    const view = await mount(); await view.click('[data-dino-shape-family="sauropods"]');
    const canvas = view.host.querySelector('.dinolab-3d-canvas'), ensureCount = view.ensures();
    Object.assign(view.yaw(), { value: 1.05, pitch: 0.38, zoom: 0.92 }); view.camera.mockClear();
    await view.click('[data-dino-shape-lens="limbs"]');
    expect(view.data().field3dShapeStudy.lens).toBe('limbs'); expect(view.yaw()).toMatchObject({ value: 1.05, pitch: 0.38, zoom: 0.92, study: 'full' });
    expect(view.ensures()).toBe(ensureCount); expect(view.camera).not.toHaveBeenCalled(); expect(view.host.querySelector('.dinolab-3d-canvas')).toBe(canvas);
    const dock = view.host.querySelector('.dinolab-viewer-actions .dinolab-shape-switch-dock'); expect(dock).toBeTruthy();
    expect(dock.textContent).toContain('Brachiosaurus'); expect(dock.textContent).toContain('Diplodocus');
    for (const button of dock.querySelectorAll('button')) { expect(button.type).toBe('button'); expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44); }
    await view.click('[data-dino-shape-dock-side="a"]'); expect(view.camera).not.toHaveBeenCalled(); expect(view.ensures()).toBe(ensureCount);
    expect([...view.host.querySelectorAll('[data-dino-shape-landmark="true"]')].map(node => node.dataset.dinoPartLabel).sort()).toEqual(['forelimb', 'thigh']);
    await view.click('[data-dino-shape-lens="allocation"]');
    expect(view.ensures()).toBe(ensureCount); expect(view.camera).not.toHaveBeenCalled();
    expect([...view.host.querySelectorAll('[data-dino-shape-landmark="true"]')].map(node => node.dataset.dinoPartLabel).sort()).toEqual(['neck', 'tail', 'trunk']);
    const prompt = view.host.querySelector('#dinolab-shape-lens-prompt'); expect(prompt.textContent).toContain('bone and life'); expect(prompt.getAttribute('aria-live')).toBe('polite');
    for (const button of view.host.querySelectorAll('[data-dino-shape-lens]')) { expect(button.type).toBe('button'); expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44); expect(button.getAttribute('aria-controls')).toBe(prompt.id); }
    expect(view.host.querySelectorAll('[data-dino-shape-lens][aria-pressed="true"]')).toHaveLength(1);
  }, 120000);

  it('carries the investigation and shared layer across A/B without mixing species evidence or overwriting progress/preferences', async () => {
    const notes = { 'brachiosaurus|trunk|evidence': { bone: 'Ribs constrain the trunk', life: 'Volume is inferred', question: 'How complete is the skeleton?' } };
    const view = await mount({ field3dPartComparisons: notes }); await view.click('[data-dino-shape-family="sauropods"]'); await view.click('[data-dino-shape-lens="limbs"]');
    Object.assign(view.yaw(), { value: 0.8, pitch: 0.3, zoom: 1.1 }); await view.click('[data-dino-shape-dock-side="b"]');
    expect(view.data()).toMatchObject({ field3dSelected: 'diplodocus', field3dShapeStudy: { lens: 'limbs' }, field3dScanLogged: {}, field3dAssemblyPlaced: {}, field3dClaimBone: null, field3dProgress: view.original });
    expect(view.yaw()).toMatchObject({ value: 0.8, pitch: 0.3, zoom: 1.1, study: 'full' });
    expect(view.host.querySelector('[data-dino-shape-dock-side="b"]').getAttribute('aria-pressed')).toBe('true');
    await view.click('[data-dino-shape-layer="life"]'); await view.click('[data-dino-shape-side="a"]'); expect(view.data().field3dShapeStudy.lens).toBe('limbs');
    expect(view.props()).toMatchObject({ showSkeleton: false, showBody: true, autoRotate: false, showHuman: false, showEvidence: false, stage: 'studio' });
    await view.change('#dinolab-shape-study-species', 'camarasaurus'); expect(view.data().field3dShapeStudy.lens).toBe('limbs');
    expect(view.data().field3dProgress).toEqual(view.original); expect(view.data().field3dPartComparisons).toEqual(notes);
    await view.click('[data-dino-shape-exit]'); expect(view.props()).toMatchObject({ autoRotate: true, showHuman: true, showEvidence: true, stage: 'habitat' });
    expect(view.data().field3dShapeStudy).toBeNull(); expect(view.data().field3dProgress).toEqual(view.original);
  }, 120000);

  it('reuses the existing prediction notebook for full-body pairs and ends lenses predictably for ordinary selection', async () => {
    const api = load(), key = api.art.comparisonPairKey(api.dn('edmontosaurus'), api.dn('iguanodon'));
    const inquiry = { version: 1, pairs: [{ key, a: 'edmontosaurus', b: 'iguanodon', step: 'inspect', prediction: 'The whole limb outlines will differ.', evidence: ['model'], explanation: 'Compare both layers.', limit: 'The pose is reconstructed.' }] };
    const view = await mount({ compareInquiry: inquiry }); await view.click('[data-dino-shape-family="ornithopods"]'); await view.click('[data-dino-shape-lens="allocation"]');
    expect(view.host.querySelector('.dinolab-shape-study blockquote').textContent).toContain(inquiry.pairs[0].prediction);
    expect(view.host.querySelector('.dinolab-shape-study-sources a').href).toContain('10.1371/journal.pone.0036904');
    expect(view.host.querySelectorAll('.dinolab-shape-study textarea')).toHaveLength(0);
    await view.click('[data-dino-shape-notebook]'); expect(view.data()).toMatchObject({ tab: 'compare', compareA: 'edmontosaurus', compareB: 'iguanodon', field3dShapeStudy: null, compareInquiry: inquiry });
    await view.click('[data-dino-shape-resume="ornithopods"]'); expect(view.data().field3dShapeStudy).toMatchObject({ family: 'ornithopods', lens: 'outline' });
    await view.click('[data-dino-shape-lens="limbs"]'); await view.change('#dinolab-part-picker', 'tail'); expect(view.data().field3dShapeStudy).toBeNull();
    await view.click('[data-dino-shape-family="crests"]'); expect(view.host.querySelector('.dinolab-shape-study-lenses')).toBeNull(); expect(view.data().compareInquiry).toEqual(inquiry);
  }, 120000);
});
