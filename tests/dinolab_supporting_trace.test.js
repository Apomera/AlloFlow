// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url), THREE = require(resolve('vendor/three-r128/three.min.js'));
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync(resolve(process.env.DINO_SUPPORT_PAIR_SOURCE || 'stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
const marker = "window.StemLab.registerTool('dinoLab'", mounted = [];
const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT, previousRaf = window.requestAnimationFrame, frames = [];
beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
});
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; window.requestAnimationFrame = previousRaf; });
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) { await React.act(async () => root.unmount()); host.remove(); }
  delete window.__dinoTraceCameraRef; delete window.__dinoTraceRelationRef; delete window.__dinoTraceSetStudyView;
  frames.splice(0);
});
function block(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw new Error('Trace source seam missing: ' + start);
  return source.slice(a, b);
}
function load() {
  const captured = {};
  window.StemLab = { ensureThree: () => new Promise(() => {}), registerTool(_id, cfg) { captured.cfg = cfg; } };
  new Function(source.replace('var cameraControlRef = React.useRef(null);', 'var cameraControlRef = React.useRef(null); window.__dinoTraceCameraRef = cameraControlRef;')
    .replace('var supportingRelationRef = React.useRef(null);', 'var supportingRelationRef = React.useRef(null); window.__dinoTraceRelationRef = supportingRelationRef;')
    .replace("var activeStudy = studyView.speciesId === props.species.id ? studyView.region : 'full';", "window.__dinoTraceSetStudyView = setStudyView; var activeStudy = studyView.speciesId === props.species.id ? studyView.region : 'full';")
    .replace(marker, 'globalThis.__dinoTraceContract = { DINOS, skeletalAnatomyProfileFor, reconstructionHypothesesFor, dinoDetailedBodyPartDefinitions, dinoSupportingRelationsFor, dinoSupportingRelationBounds }; ' + marker))();
  const art = globalThis.__dinoTraceContract; delete globalThis.__dinoTraceContract;
  const dn = id => art.DINOS.find(entry => entry.id === id);
  function parts(id, mode = 'evidence') {
    const animal = dn(id), profile = art.skeletalAnatomyProfileFor(animal), active = art.reconstructionHypothesesFor(animal, profile, mode).active;
    return art.dinoDetailedBodyPartDefinitions(animal, profile.weightBearingForelimbs, active);
  }
  return { cfg: captured.cfg, art, dn, parts, relations: (id, mode) => art.dinoSupportingRelationsFor(dn(id), parts(id, mode)) };
}
async function mount(id = 'tyrannosaurus', overrides = {}) {
  const api = load(), host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host), patches = [];
  let data = { tab: 'field3d', selected: id, field3dSelected: id, field3dLabelMode: 'anatomy',
    field3dReconstructionMode: 'evidence', field3dAutoRotate: false, field3dShowSkeleton: true,
    field3dShowBody: true, field3dBodyOpacity: 28, field3dShowHuman: true, field3dShowEvidence: true,
    field3dScanSpecies: id, field3dScanLogged: { skull: true },
    field3dPartComparisons: { [id + '|knee|evidence']: { bone: 'My bone observation', life: 'My life observation', question: 'My evidence question' } }, ...overrides };
  function render() {
    root.render(api.cfg.render({ React, toolData: { dinoLab: data },
      update(_scope, key, value) { const patch = { [key]: value }; patches.push(patch); data = { ...data, ...patch }; render(); },
      updateMulti(_scope, patch) { patches.push(patch); data = { ...data, ...patch }; render(); }, announceToSR() {} }));
  }
  mounted.push({ root, host }); await React.act(async () => render());
  const camera = vi.fn(); camera.preserveInspectionFrame = vi.fn(); window.__dinoTraceCameraRef.current = camera;
  async function act(callback) {
    await React.act(async () => callback());
    await React.act(async () => { frames.splice(0).forEach(callback => callback(0)); });
  }
  const click = selector => act(() => { const node = host.querySelector(selector); if (!node) throw new Error('Missing trace control: ' + selector); node.click(); });
  return { ...api, host, camera, patches, data: () => data, relation: () => window.__dinoTraceRelationRef.current,
    select: partId => act(() => { const picker = host.querySelector('#dinolab-part-picker'); picker.value = partId; picker.dispatchEvent(new Event('change', { bubbles: true })); }),
    start: () => click('[data-dino-support-start]'), endpoint: id => click('[data-dino-support-endpoint="' + id + '"]'),
    layer: layer => click('[data-dino-part-inspect="' + layer + '"]'), click,
    study: region => act(() => window.__dinoTraceSetStudyView({ speciesId: data.field3dSelected, region })),
    patch: patch => act(() => { data = { ...data, ...patch }; render(); }) };
}

describe('Connected anatomical landmarks', () => {
  it('offers only real available parts, with species and covering eligibility and explicit interpretation limits', () => {
    const api = load();
    expect(api.relations('tyrannosaurus').map(pair => pair.id)).toEqual(['knee-ankle', 'elbow-wrist']);
    expect(api.relations('microraptor').map(pair => pair.id)).toContain('forearm-wing');
    expect(api.relations('microraptor', 'classic').map(pair => pair.id)).not.toContain('forearm-wing');
    expect(api.relations('alioramus').map(pair => pair.id)).toContain('skull-nasal');
    expect(api.relations('qianzhousaurus').map(pair => pair.id)).toContain('skull-nasal');
    for (const id of ['baryonyx', 'suchomimus']) {
      const pair = api.relations(id).find(pair => pair.id === 'snout-teeth');
      expect(pair.ids).toEqual(['snout', 'teeth']); expect(pair.limit).toContain('exact tooth formula'); expect(pair.limit).toContain('exclusive fish diet');
    }
    expect(api.relations('spinosaurus').map(pair => pair.id)).not.toContain('snout-teeth');
    expect(api.relations('dimetrodon')).toEqual([]);
    expect(api.art.dinoSupportingRelationsFor(api.dn('tyrannosaurus'), [{ id: 'knee', region: 'body' }, { id: 'ankle', region: 'body', inferredProxy: true }])).toEqual([]);
  });

  it('fits the union of actual endpoint bounds without mutating either and gracefully falls back when a bound is unavailable', () => {
    const api = load(), pair = api.relations('tyrannosaurus')[0], vec = (x, y, z) => new THREE.Vector3(x, y, z);
    const boxes = { knee: new THREE.Box3(vec(-2, 4, -1), vec(0, 6, 1)), ankle: new THREE.Box3(vec(1, 0, -2), vec(3, 2, 2)) };
    const snapshot = JSON.stringify(boxes), union = api.art.dinoSupportingRelationBounds(THREE, pair, boxes);
    expect(union.min.toArray()).toEqual([-2, 0, -2]); expect(union.max.toArray()).toEqual([3, 6, 2]);
    expect(JSON.stringify(boxes)).toBe(snapshot); expect(union).not.toBe(boxes.knee);
    expect(api.art.dinoSupportingRelationBounds(THREE, pair, { knee: boxes.knee })).toBeNull();
    expect(api.art.dinoSupportingRelationBounds(THREE, pair, { knee: boxes.knee, ankle: new THREE.Box3() })).toBeNull();
    expect(api.art.dinoSupportingRelationBounds(THREE, pair, { knee: boxes.knee, ankle: new THREE.Box3(vec(NaN, 0, 0), vec(1, 1, 1)) })).toBeNull();
    const boundsCode = block('            function boundsForStudy(region) {', '            model.userData.studyBounds');
    const selected = { current: 'knee' }, relation = { current: pair }, region = new THREE.Box3(vec(-9, -9, -9), vec(9, 9, 9));
    const getBounds = new Function('THREE', 'supportingRelationRef', 'bodyPartDefinitions', 'selectedBodyPartRef', 'bodyPartStudyBounds', 'studyBounds', 'dinoSupportingRelationBounds', 'props', boundsCode + '\nreturn boundsForStudy;')
      (THREE, relation, api.parts('tyrannosaurus'), selected, boxes, { body: region, head: region }, api.art.dinoSupportingRelationBounds, { shapeStudy: null });
    expect(getBounds('body').equals(union)).toBe(true); selected.current = 'ankle'; expect(getBounds('body').equals(union)).toBe(true);
    delete boxes.knee; expect(getBounds('body')).toBe(boxes.ankle);
    relation.current = null; expect(getBounds('head')).toBe(region);
  });

  it('executes the actual camera-frame reuse logic across endpoint and layer changes while invalidating other contexts', () => {
    const api = load(), pair = api.relations('tyrannosaurus')[0];
    const frameCode = block('              var inspectionFrame = partInspectionFrameRef.current;', '              var rotatedWidth =');
    const run = new Function('partInspectionFrameRef', 'supportingRelationRef', 'selectedBodyPartRef', 'inspectionFrameContext', 'cameraStudy', 'viewHalf', 'targetForView', frameCode + '\nreturn currentCameraFrame;');
    const initialHalf = new THREE.Vector3(1, 3, 1), initialTarget = new THREE.Vector3(0, 3, 0);
    const saved = run({ current: null }, { current: pair }, { current: 'knee' }, 'tyrannosaurus|evidence', 'body', initialHalf, initialTarget);
    expect(saved.part).toBe('support:knee-ankle');
    // Skin and bone bounds may differ. Selecting B must still use the frame
    // retained at A when the next layer is shown.
    const large = new THREE.Vector3(20, 20, 20), shifted = new THREE.Vector3(10, 10, 10);
    const next = run({ current: saved }, { current: pair }, { current: 'ankle' }, 'tyrannosaurus|evidence', 'body', large, shifted);
    expect(next.half.toArray()).toEqual(initialHalf.toArray()); expect(next.target.toArray()).toEqual(initialTarget.toArray());
    const changed = run({ current: saved }, { current: pair }, { current: 'ankle' }, 'tyrannosaurus|classic', 'body', large, shifted);
    expect(changed.half.toArray()).toEqual(large.toArray());
    const ended = run({ current: saved }, { current: null }, { current: 'ankle' }, 'tyrannosaurus|evidence', 'body', large, shifted);
    expect(ended.part).toBe('ankle'); expect(ended.target.toArray()).toEqual(shifted.toArray());
  });
});

describe('Student controlled supporting traces', () => {
  it('invokes actual endpoint handlers, keeps one canvas/frame and all saved writing, and supplies distinct accessible markers', async () => {
    const view = await mount(); await view.select('knee');
    const canvas = view.host.querySelector('.dinolab-3d-canvas'), before = structuredClone(view.data()); view.camera.mockClear(); view.patches.length = 0;
    const panel = view.host.querySelector('.dinolab-supporting-relation'); expect(panel.textContent).toContain('Before tracing'); panel.open = true;
    expect(panel.querySelectorAll('textarea')).toHaveLength(0); await view.start();
    expect(view.camera).toHaveBeenCalledOnce(); expect(view.camera.mock.calls[0].slice(0, 3)).toEqual([0, 0.16, 1]); expect(view.camera.mock.calls[0].at(-1)).toBe('body');
    expect(view.relation().id).toBe('knee-ankle'); view.camera.mockClear();
    expect(document.activeElement).toBe(view.host.querySelector('[data-dino-support-endpoint="knee"]'));
    for (const id of ['ankle', 'knee']) {
      await view.endpoint(id); expect(view.host.querySelector('#dinolab-part-picker').value).toBe(id);
      expect(view.relation().id).toBe('knee-ankle'); expect(view.host.querySelector('.dinolab-3d-canvas')).toBe(canvas); expect(view.camera).not.toHaveBeenCalled();
      const activePanel = view.host.querySelector('.dinolab-supporting-relation');
      expect(activePanel.querySelectorAll('[data-dino-support-endpoint][aria-pressed="true"]')).toHaveLength(1);
      for (const button of activePanel.querySelectorAll('[data-dino-support-endpoint]')) {
        expect(button.type).toBe('button'); expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
        expect(button.getAttribute('aria-controls')).toContain('dinolab-selected-part-guide');
      }
    }
    expect(view.host.querySelector('[data-dino-part-label="knee"]').textContent).toMatch(/^A · Knee/);
    expect(view.host.querySelector('[data-dino-part-label="ankle"]').textContent).toMatch(/^B · Ankle/);
    expect(view.host.querySelector('[data-dino-part-label="ankle"]').getAttribute('aria-label')).toContain('Endpoint B');
    await React.act(async () => view.host.querySelector('[data-dino-part-label="ankle"]').click());
    expect(view.host.querySelector('#dinolab-part-picker').value).toBe('ankle'); expect(view.camera).not.toHaveBeenCalled();
    expect(view.data()).toEqual(before); expect(view.patches).toEqual([]);
    await view.layer('bone'); await view.layer('life'); expect(view.camera).not.toHaveBeenCalled(); expect(view.camera.preserveInspectionFrame).toHaveBeenCalledTimes(2);
    expect(view.data().field3dPartComparisons).toEqual(before.field3dPartComparisons);
    expect(view.host.querySelector('#dinolab-supporting-relation-status').getAttribute('aria-live')).toBe('polite');
  }, 120000);

  it('ends traces through explicit action, ordinary selection, or the whole-animal view while keeping observations', async () => {
    const view = await mount(); await view.select('knee'); await view.start(); await view.endpoint('ankle');
    const notes = structuredClone(view.data().field3dPartComparisons);
    await view.click('[data-dino-support-end]'); expect(view.relation()).toBeNull(); expect(view.host.querySelector('#dinolab-part-picker').value).toBe('ankle');
    expect(document.activeElement).toBe(view.host.querySelector('[data-dino-support-start="knee-ankle"]'));
    await view.start(); await view.select('head'); expect(view.relation()).toBeNull(); expect(view.host.querySelector('[data-dino-part-label="knee"]').textContent).not.toContain('A ·');
    await view.select('knee'); await view.start(); await view.click('.dinolab-fit-model'); expect(view.relation()).toBeNull();
    expect(view.data().field3dPartComparisons).toEqual(notes);
  }, 120000);

  it('clears trace context permanently across study, hypothesis and species changes rather than resurrecting an old pair', async () => {
    const view = await mount('microraptor'); await view.select('wing'); await view.start(); expect(view.relation().id).toBe('forearm-wing');
    view.camera.mockClear();
    // Scene controls such as evidence-anchor focusing update study state
    // directly, bypassing the ordinary UI camera-preset handler.
    await view.study('full'); expect(view.relation()).toBeNull();
    expect(view.host.querySelector('#dinolab-part-picker').value).toBe('wing'); expect(view.camera).not.toHaveBeenCalled();
    await view.study('body'); expect(view.relation()).toBeNull();
    await view.start(); expect(view.relation().id).toBe('forearm-wing');
    await view.patch({ field3dReconstructionMode: 'classic' }); expect(view.relation()).toBeNull();
    await view.patch({ field3dReconstructionMode: 'evidence' }); expect(view.relation()).toBeNull();
    await view.select('knee'); await view.start();
    await view.patch({ selected: 'tyrannosaurus', field3dSelected: 'tyrannosaurus' }); expect(view.relation()).toBeNull();
    await view.patch({ selected: 'microraptor', field3dSelected: 'microraptor' }); expect(view.relation()).toBeNull();
    expect(view.host.querySelector('[data-dino-support-endpoint]')).toBeNull();
  }, 120000);
});
