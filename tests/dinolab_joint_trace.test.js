// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url), THREE = require(resolve('vendor/three-r128/three.min.js'));
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync(resolve(process.env.DINO_JOINT_TRACE_SOURCE || 'stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
const marker = "window.StemLab.registerTool('dinoLab'", mounted = [], frames = [];
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT, previousRaf = window.requestAnimationFrame;
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; }; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct; window.requestAnimationFrame = previousRaf; });
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) { await React.act(async () => root.unmount()); host.remove(); }
  delete window.__jointTraceCamera; delete window.__jointTraceYaw; delete window.__jointTraceProps; frames.splice(0);
});

function load() {
  const captured = { ensures: 0 };
  window.StemLab = { ensureThree() { captured.ensures++; return new Promise(() => {}); }, registerTool(_id, cfg) { captured.cfg = cfg; } };
  new Function(source
    .replace('function DinoFieldStation3D(props) {', 'function DinoFieldStation3D(props) { window.__jointTraceProps = props;')
    .replace('var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 });', 'var yawRef = React.useRef({ speciesId: props.species.id, value: 0.35, pitch: 0.18, zoom: 1 }); window.__jointTraceYaw = yawRef;')
    .replace('var cameraControlRef = React.useRef(null);', 'var cameraControlRef = React.useRef(null); window.__jointTraceCamera = cameraControlRef;')
    .replace(marker, 'globalThis.__jointTraceContract = { DINOS, DINO_SHAPE_STUDY_FAMILIES, dinoShapeStudyFor, dinoShapeStudyPairFor, dinoShapeLimbTraceEligible, dinoShapeLimbTraceProject, dinoShapeLimbTraceCapture, dinoShapeViewCapture, dinoShapeViewCaption, comparisonPairKey, comparisonInquiryState }; ' + marker))();
  const api = globalThis.__jointTraceContract; delete globalThis.__jointTraceContract;
  return { api, cfg: captured.cfg, ensures: () => captured.ensures };
}
function fixture() {
  const model = new THREE.Group(), camera = new THREE.PerspectiveCamera(45, 4 / 3, .1, 100);
  camera.position.set(0, 3, 8); camera.lookAt(0, .5, 0); camera.updateMatrixWorld(true);
  const limbs = [];
  for (const side of [-1, 1]) for (const front of [true, false]) {
    const x = front ? -1 : 1;
    limbs.push({ front, side, top: [x, 1.2, side * .5], knee: [x + (front ? -.2 : -.25), .7, side * .6], ankle: [x, .2, side * .65], foot: [x - .15, 0, side * .7] });
  }
  return { model, camera, anatomy: { family: 'ankylosaurs', limbs } };
}
const project = (api, f, width = 800, height = 600, previous = []) => {
  f.camera.aspect = width / height; f.camera.updateProjectionMatrix();
  return api.dinoShapeLimbTraceProject(THREE, f.anatomy, f.model, f.camera, width, height, previous);
};

async function mount() {
  const loaded = load(), host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
  const progress = { version: 1, speciesId: 'ankylosaurus', hasProgress: true, workflowStarted: true, scanSpecies: 'ankylosaurus', scanLogged: { skull: true }, assemblySpecies: 'ankylosaurus', assemblyPlaced: {}, claimBoneSpecies: 'ankylosaurus', claimBone: 'skull', autoRotate: true };
  const writing = { version: 1, pairs: [{ key: 'ankylosaurus|euoplocephalus', a: 'ankylosaurus', b: 'euoplocephalus', step: 'explain', prediction: 'The forelimb shapes might differ.', evidence: ['traits'], explanation: 'My original explanation.', limit: 'The pose is reconstructed.' }] };
  let data = { tab: 'field3d', selected: 'ankylosaurus', field3dSelected: 'ankylosaurus', field3dLabelMode: 'anatomy', field3dReconstructionMode: 'evidence', field3dAutoRotate: true, field3dProgress: progress, compareInquiry: writing };
  function render() { root.render(loaded.cfg.render({ React, toolData: { dinoLab: data }, update(_scope, key, value) { data = { ...data, [key]: value }; render(); }, updateMulti(_scope, patch) { data = { ...data, ...patch }; render(); }, announceToSR() {} })); }
  mounted.push({ root, host }); await React.act(async () => render());
  const camera = vi.fn(); camera.preserveInspectionFrame = vi.fn(); window.__jointTraceCamera.current = camera;
  async function act(callback) { await React.act(async () => callback()); await React.act(async () => frames.splice(0).forEach(frame => frame(0))); }
  const click = selector => act(() => { const node = host.querySelector(selector); if (!node) throw new Error('Missing joint guide control ' + selector); node.click(); });
  return { ...loaded, host, camera, click, progress, writing, data: () => data, yaw: () => window.__jointTraceYaw.current };
}

describe('Limb-joint exploration uses actual model centers', () => {
  it('curates the four armored body plans with primary sources and explicit preservation limits', () => {
    const { api } = load(), family = api.DINO_SHAPE_STUDY_FAMILIES.find(item => item.id === 'ankylosaurs');
    expect(family).toMatchObject({ label: 'Armored body plans', reference: 'ankylosaurus', choices: ['euoplocephalus', 'sauropelta', 'borealopelta'], fullBody: true });
    expect(family.sources.map(item => item.url)).toEqual(['https://doi.org/10.1371/journal.pone.0062421', 'https://doi.org/10.1016/j.cub.2017.06.071', 'https://doi.org/10.1111/joa.12363']);
    expect(family.limit).toContain('skin bones'); expect(family.limit).toContain('largely comparative'); expect(family.limit).toContain('reconstructed');
    for (const b of family.choices) {
      const study = api.dinoShapeStudyFor({ family: 'ankylosaurs', b, active: 'b', lens: 'limbs' });
      expect(study.species.id).toBe(b); expect(api.dinoShapeLimbTraceEligible(study)).toBe(true);
      expect(api.dinoShapeStudyPairFor(study.a, study.b).family.id).toBe('ankylosaurs');
    }
    expect(api.dinoShapeStudyFor({ family: 'ankylosaurs', b: 'stegosaurus', active: 'b' })).toBeNull();
    expect(api.dinoShapeLimbTraceEligible(api.dinoShapeStudyFor({ family: 'ankylosaurs', b: 'sauropelta', active: 'a', lens: 'outline' }))).toBe(false);
  });

  it('projects the actual limb centers through the complete model transform and camera', () => {
    const { api } = load(), f = fixture(), parent = new THREE.Group();
    parent.position.set(-.6, .15, -.3); parent.rotation.y = -.2; parent.add(f.model);
    f.model.position.set(.7, .1, -.5); f.model.rotation.y = .3; f.model.scale.setScalar(.8); parent.updateMatrixWorld(true);
    const result = project(api, f);
    expect(result.chains.map(chain => chain.id)).toEqual(['fore', 'hind']);
    for (const chain of result.chains) for (const [i, point] of chain.points.entries()) {
      const record = f.anatomy.limbs.find(limb => limb.side === result.side && limb.front === (chain.id === 'fore'));
      const original = [record.top, record.knee, record.ankle, record.foot][i], expectedWorld = new THREE.Vector3(...original).applyMatrix4(f.model.matrixWorld), expectedClip = expectedWorld.clone().project(f.camera);
      expect(point.anchor).toEqual(original); expect(point.world).toEqual(expectedWorld.toArray());
      expect(point.x).toBeCloseTo((expectedClip.x + 1) * 400); expect(point.y).toBeCloseTo((1 - expectedClip.y) * 300);
    }
    expect(f.model.children).toHaveLength(0); expect(f.model.scale.toArray()).toEqual([.8, .8, .8]);
  });

  it('selects the near side again after orbiting and never substitutes a distant chain for one outside the frame', () => {
    const { api } = load(), f = fixture();
    expect(project(api, f).side).toBe(1);
    f.camera.position.z = -8; f.camera.lookAt(0, .5, 0); f.camera.updateMatrixWorld(true);
    expect(project(api, f).side).toBe(-1);
    f.camera.position.set(0, 3, 8); f.camera.lookAt(0, .5, 0); f.camera.updateMatrixWorld(true);
    f.anatomy.limbs.find(limb => limb.front && limb.side === 1).foot[0] = -100;
    const clipped = project(api, f);
    expect(clipped.side).toBe(1); expect(clipped.chains.map(chain => chain.id)).toEqual(['hind']);
    expect(clipped.labels.every(label => label.id.startsWith('hind-'))).toBe(true);
  });

  it('rejects malformed or unsupported records and bounds collision-safe labels on a mobile viewport', () => {
    const { api } = load(), f = fixture(), original = structuredClone(f.anatomy);
    for (const family of ['sauropods', 'ornithopods', 'ceratopsids', 'ankylosaurs']) {
      f.anatomy.family = family; const result = project(api, f, 341, 520);
      expect(result.chains).toHaveLength(2); expect(result.labels.length).toBeGreaterThan(0); expect(result.labels.length).toBeLessThanOrEqual(4);
      for (const label of result.labels) { expect(label.x).toBeGreaterThanOrEqual(8); expect(label.y).toBeGreaterThanOrEqual(12); expect(label.x + label.width).toBeLessThanOrEqual(333); expect(label.y + label.height).toBeLessThanOrEqual(508); }
      for (let i = 0; i < result.labels.length; i++) for (let j = i + 1; j < result.labels.length; j++) {
        const a = result.labels[i], b = result.labels[j];
        expect(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).toBe(false);
      }
    }
    for (const mutate of [a => { a.family = 'other'; }, a => { a.limbs[0].knee[0] = NaN; }, a => { a.limbs.pop(); }, a => { a.limbs[1] = a.limbs[0]; }, a => { a.limbs[0].side = 0; }]) {
      f.anatomy = structuredClone(original); mutate(f.anatomy); expect(project(api, f).chains).toEqual([]);
    }
  });

  it('captures guide activity and only actual visible joint labels without treating them as fossil measurements', () => {
    const { api } = load(), study = api.dinoShapeStudyFor({ family: 'ankylosaurs', b: 'sauropelta', active: 'a', lens: 'limbs' });
    const raw = { key: study.key, species: study.species.id, hypothesis: 'evidence', yaw: .2, pitch: .3, zoom: 1, showBody: true, opacity: 100, trace: { active: true, side: -1, visible: ['fore-1', 'fake', 'hind-0', 'hind-0'] } };
    const pin = api.dinoShapeViewCapture(study, raw, []);
    expect(pin.trace).toEqual({ enabled: true, side: -1, visible: ['fore-1', 'hind-0'] });
    const caption = api.dinoShapeViewCaption(pin, []);
    expect(caption).toContain('reconstructed joint guide on'); expect(caption).toContain('Elbow, Hip'); expect(caption).not.toContain('fake');
    expect(api.dinoShapeViewCapture(study, { ...raw, trace: null }, []).trace).toEqual({ enabled: false, side: null, visible: [] });
    const outline = api.dinoShapeStudyFor({ family: 'ankylosaurs', b: 'sauropelta', active: 'a', lens: 'outline' });
    expect(api.dinoShapeLimbTraceCapture(outline, raw.trace)).toEqual({ enabled: false, side: null, visible: [] });
  });

  it('toggles the native guide without rebuilding or refitting, retains it across A/B and layers, and resets on lens/exit', async () => {
    const view = await mount(); await view.click('[data-dino-shape-family="ankylosaurs"]'); await view.click('[data-dino-shape-lens="limbs"]');
    const canvas = view.host.querySelector('canvas.dinolab-3d-canvas'), count = view.ensures();
    Object.assign(view.yaw(), { value: .8, pitch: .4, zoom: .9 }); view.camera.mockClear();
    await view.click('[data-dino-joint-trace-toggle]');
    expect(view.host.querySelector('[data-dino-joint-trace-toggle]').getAttribute('aria-pressed')).toBe('true');
    expect(view.camera).not.toHaveBeenCalled(); expect(view.ensures()).toBe(count); expect(view.host.querySelector('canvas.dinolab-3d-canvas')).toBe(canvas);
    expect(view.yaw()).toMatchObject({ value: .8, pitch: .4, zoom: .9 });
    const button = view.host.querySelector('[data-dino-joint-trace-toggle]'); expect(button.type).toBe('button'); expect(parseInt(button.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    expect(button.getAttribute('aria-controls')).toBe('dinolab-joint-trace-status');
    expect(view.host.querySelector('.dinolab-joint-trace-control').textContent).toContain('reconstructed joint centers');
    await view.click('[data-dino-shape-layer="life"]'); await view.click('[data-dino-shape-dock-side="b"]');
    expect(view.host.querySelector('[data-dino-joint-trace-toggle]').getAttribute('aria-pressed')).toBe('true');
    expect(view.data().compareInquiry).toEqual(view.writing); expect(view.data().field3dProgress).toEqual(view.progress);
    await view.click('[data-dino-shape-lens="allocation"]'); expect(view.host.querySelector('[data-dino-joint-trace-toggle]')).toBeNull();
    await view.click('[data-dino-shape-lens="limbs"]'); expect(view.host.querySelector('[data-dino-joint-trace-toggle]').getAttribute('aria-pressed')).toBe('false');
    await view.click('[data-dino-joint-trace-toggle]'); await view.click('[data-dino-shape-exit]');
    await view.click('[data-dino-shape-family="ankylosaurs"]'); await view.click('[data-dino-shape-lens="limbs"]');
    expect(view.host.querySelector('[data-dino-joint-trace-toggle]').getAttribute('aria-pressed')).toBe('false');
  }, 120000);
});
