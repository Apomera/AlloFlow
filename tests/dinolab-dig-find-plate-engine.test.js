import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const bytes = readFileSync('stem_lab/stem_tool_dinolab.js');
const source = bytes.toString('utf8').replace(/\r\n/g, '\n');
function bounded(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous find plate seam: ' + start);
  return text.slice(a, b);
}
const model = bounded(source, '// DINO_VOXEL_DIG_FIND_PLATE_START', '// DINO_VOXEL_DIG_FIND_PLATE_END');
const engine = bounded(source, '// DINO_VOXEL_FIND_PLATE_ENGINE_START', '// DINO_VOXEL_FIND_PLATE_ENGINE_END');
const dino3D = bounded(source, '  function makeDinoVoxelDig3D(React) {', '  var DinoVoxelDig3DStable = null;');
const invalidate = bounded(dino3D, '        function invalidate() {', '        function findLookLabel(p) {');
const intersectionSetup = bounded(dino3D, "            if (typeof IntersectionObserver !== 'undefined') {", '            invalidate();');
const frame = bounded(source, '        function frame(now) {', '        // DINO_VOXEL_CAMERA_INPUT_STATE_START');
const dispose = bounded(source, '        function dispose() {', "        setStatus('loading');");
const normalize = new Function(model + '\nreturn digVoxelFindPlate;')();
// Use the exact shipped r128 math and target types; no renderer or GL context is created.
const sandbox = { console, module: { exports: {} } }; sandbox.exports = sandbox.module.exports;
vm.runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), sandbox);
const THREE = sandbox.module.exports;
const record = (index = 7, removed = 3) => ({ index, row: Math.floor(index / 6), col: index % 6,
  coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1), removed, remaining: 4 - removed, shape: ['curved', 'elongate', 'compact'][index % 3] });

function fixture({ index = 7, seed = 42, look = 'surface', dpr = 2, visible = true, findPlateVisible = false, pageVisible = true, contextLost = false, plateRect } = {}) {
  const calls = { renders: [], reads: [], bindings: [], globals: [], disposal: [], targets: [], contexts: [], requested: [], canceled: [], observes: [], unobserves: [], observers: [], rectReads: [], cameraPoses: 0, throwRender: null, throwRead: null, throwPut: null, emptyRead: false };
  const pending = new Map(); let nextRAF = 1;
  function requestFrame(callback) { const id = nextRAF++; calls.requested.push(id); pending.set(id, callback); return id; }
  function cancelFrame(id) { calls.canceled.push(id); pending.delete(id); }
  class TrackedIntersectionObserver {
    constructor(callback) { this.callback = callback; this.targets = new Set(); calls.observers.push(this); }
    observe(target) { calls.observes.push(target); this.targets.add(target); }
    unobserve(target) { calls.unobserves.push(target); this.targets.delete(target); }
    disconnect() { calls.disposal.push('intersection'); this.targets.clear(); }
  }
  class TrackedTarget extends THREE.WebGLRenderTarget {
    constructor(...args) { super(...args); calls.targets.push(this); this.addEventListener('dispose', () => calls.disposal.push('plate-target')); }
  }
  const runtime = { ...THREE, WebGLRenderTarget: TrackedTarget }, globalViewport = new THREE.Vector4(9, 11, 640, 420), globalScissor = new THREE.Vector4(4, 5, 600, 400);
  let activeTarget = null, activeFace = 0, activeLevel = 0, physicalViewport = globalViewport.clone().multiplyScalar(dpr).floor(), physicalScissor = globalScissor.clone().multiplyScalar(dpr).floor(), physicalScissorTest = true;
  const renderer = {
    getRenderTarget() { return activeTarget; }, getActiveCubeFace() { return activeFace; }, getActiveMipmapLevel() { return activeLevel; },
    getViewport(value) { return value.copy(globalViewport); }, getScissor(value) { return value.copy(globalScissor); }, getScissorTest() { return true; },
    getCurrentViewport(value) { return value.copy(physicalViewport); },
    setViewport() { calls.globals.push('setViewport'); throw Error('Capture changed DPR-scaled global viewport'); },
    setScissor() { calls.globals.push('setScissor'); throw Error('Capture changed DPR-scaled global scissor'); },
    setScissorTest() { calls.globals.push('setScissorTest'); throw Error('Capture changed global scissor test'); },
    setRenderTarget(target, face = 0, level = 0) {
      activeTarget = target; activeFace = face; activeLevel = level;
      physicalViewport = target ? target.viewport.clone() : globalViewport.clone().multiplyScalar(dpr).floor();
      physicalScissor = target ? target.scissor.clone() : globalScissor.clone().multiplyScalar(dpr).floor();
      physicalScissorTest = target ? target.scissorTest : true;
      calls.bindings.push({ target, face, level, viewport: physicalViewport.toArray(), scissor: physicalScissor.toArray(), scissorTest: physicalScissorTest });
    },
    render(scene, camera) {
      calls.renders.push({ scene, camera, target: activeTarget, viewport: physicalViewport.toArray(), scissor: physicalScissor.toArray(), scissorTest: physicalScissorTest });
      if (calls.throwRender === calls.renders.length) throw Error('Render failed');
    },
    readRenderTargetPixels(target, x, y, width, height, pixels) {
      calls.reads.push({ target, x, y, width, height, pixels });
      if (calls.throwRead === calls.reads.length) throw Error('Readback failed');
      pixels.fill(0); if (calls.emptyRead) return;
      const view = calls.reads.length;
      for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
        const offset = (row * width + col) * 4; pixels[offset] = row; pixels[offset + 1] = col; pixels[offset + 2] = view; pixels[offset + 3] = 255;
      }
    },
    getSize(value) { return value.set(640, 420); }, setSize() { throw Error('Unexpected main-canvas resize'); },
    renderLists: { dispose() { calls.disposal.push('render-lists'); } }, dispose() { calls.disposal.push('renderer'); }
  };
  const scene = new THREE.Scene(), findStage = new THREE.Group(), findModels = [], mainCamera = new THREE.PerspectiveCamera(42, 640 / 420, .1, 80);
  mainCamera.position.set(6, 5, 4); mainCamera.lookAt(new THREE.Vector3(0, .62, 0)); mainCamera.updateMatrixWorld();
  scene.add(findStage);
  let selected = record(index), plate = normalize(seed, selected, look), previews = [];
  const inViewport = { width: 512, height: 240, bottom: 340, right: 600, top: 100, left: 88 };
  function makeWrapper(rect = inViewport) {
    return { dataset: { digFindPlateKey: plate.key, digFindPlateReady: 'false' }, rect: { ...rect },
      querySelector(selector) { return previews.find(preview => '#' + preview.id === selector) || null; },
      getBoundingClientRect() { calls.rectReads.push(this); return this.rect; } };
  }
  let wrapper = makeWrapper(plateRect);
  const root = { querySelector(selector) { return selector === '#dino-find-view-plate' ? wrapper : null; } };
  const canvas = { clientWidth: 640, clientHeight: 420, isConnected: true, closest(selector) { return selector === '.dinolab-root' ? root : null; } };
  function installDOM(nextPlate) {
    wrapper.dataset.digFindPlateKey = nextPlate.key;
    previews = nextPlate.views.map((view, index) => {
      const context = { image: null, clears: 0, puts: 0,
        createImageData(width, height) { return { width, height, data: new Uint8ClampedArray(width * height * 4) }; },
        putImageData(image, x, y) { this.puts++; if (calls.throwPut === index + 1) throw Error('2D write failed'); this.image = { ...image, data: new Uint8ClampedArray(image.data), x, y }; },
        clearRect() { this.clears++; this.image = null; }
      };
      calls.contexts.push(context);
      return { id: 'dino-find-plate-' + view.id, width: 256, height: 176,
        dataset: { digFindPlateKey: nextPlate.key, digFindPlateView: view.id, digFindPlateReady: 'false' }, context,
        getContext(type) { if (type !== '2d') throw Error('Unexpected preview context'); return this.context; } };
    });
  }
  function installShown(find, actualSeed) {
    findModels.forEach(model => { if (model) model.visible = false; });
    let shown = findModels[find.index];
    if (!shown) {
      shown = new THREE.Group(); shown.name = 'actual-exposed-test-model-' + find.shape;
      const geometry = find.shape === 'curved' ? new THREE.TorusGeometry(.7, .16, 8, 24, Math.PI * 1.28) : find.shape === 'elongate' ? new THREE.CylinderGeometry(.16, .19, 1.8, 12) : new THREE.DodecahedronGeometry(.8, 0);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#e8d7b6' }));
      if (find.shape === 'elongate') mesh.rotation.z = Math.PI / 2;
      shown.add(mesh); shown.position.y = .7; findStage.add(shown); findModels[find.index] = shown;
    }
    shown.rotation.y = (find.index * 1.813 + actualSeed * .19) % (Math.PI * 2); shown.visible = true; shown.updateMatrixWorld(true);
    return shown;
  }
  installDOM(plate); installShown(selected, seed); findStage.visible = true; findStage.userData.find = selected;
  const p = { findMode: true, findPlate: plate, site: { seed }, findLook: look }, latest = { current: p };
  const engineWindow = { THREE: runtime, innerHeight: 800, innerWidth: 1200, StemLab: { releaseGl() { calls.disposal.push('release-gl'); } } };
  const build = new Function('window', 'digVoxelFindPlate', 'renderer', 'canvas', 'scene', 'findStage', 'findModels', 'camera', 'latest', 'gates', 'calls', 'requestAnimationFrame', 'cancelAnimationFrame', 'IntersectionObserver',
    'var findPlateTarget=null,findPlateCameras=[],findPlatePixels=[],findPlateKey=null,findPlateCanvases=[],findPlateVisible=gates.findPlateVisible,findPlateObserved=null;\n' +
    'var alive=true,raf=0,poseTimer=0,observer=null,intersection=null,cleanups=[],engineRef={current:{}},instanced=[],batch=null,world=null,geometries=[],materials=[],textures=[];\n' +
    'var contextLost=gates.contextLost,visible=gates.visible,pageVisible=gates.pageVisible,dustStart=null,dust=null;function cameraPose(){calls.cameraPoses++;}\n' +
    invalidate + '\n' + engine + '\n' + frame + '\n' + dispose +
    '\nreturn {renderFindPlate,fitFindPlateCameras,frame,dispose,invalidate,syncFindPlateVisibility,' +
    'installObserver:function(){' + intersectionSetup + '},deliverIntersection:function(entries){intersection.callback(entries);},' +
    'setFlags:function(flags){if("visible" in flags)visible=flags.visible;if("findPlateVisible" in flags)findPlateVisible=flags.findPlateVisible;if("pageVisible" in flags)pageVisible=flags.pageVisible;if("contextLost" in flags)contextLost=flags.contextLost;},' +
    'state:function(){return {target:findPlateTarget,cameras:findPlateCameras,pixels:findPlatePixels,key:findPlateKey,canvases:findPlateCanvases,alive,raf,visible,findPlateVisible,findPlateObserved,pageVisible,contextLost};}};');
  const api = build(engineWindow, normalize, renderer, canvas, scene, findStage, findModels, mainCamera, latest, { visible, findPlateVisible, pageVisible, contextLost }, calls, requestFrame, cancelFrame, TrackedIntersectionObserver);
  return { api, calls, renderer, scene, findStage, findModels, mainCamera, p, root, canvas, dpr,
    get wrapper() { return wrapper; }, get pendingFrames() { return pending.size; },
    flushFrame(now = 0) { const next = pending.entries().next().value; if (!next) throw Error('No scheduled frame'); pending.delete(next[0]); next[1](now); },
    get previews() { return previews; }, get shown() { return findModels[p.findPlate.index]; },
    physical() { return { viewport: physicalViewport.toArray(), scissor: physicalScissor.toArray(), scissorTest: physicalScissorTest }; },
    replaceDOM() { installDOM(p.findPlate); },
    replaceWrapper(rect) { wrapper = makeWrapper(rect); installDOM(p.findPlate); },
    removeWrapper() { wrapper = null; },
    change({ seed: nextSeed = p.site.seed, index: nextIndex = p.findPlate.index, look: nextLook = p.findLook } = {}) {
      selected = record(nextIndex); plate = normalize(nextSeed, selected, nextLook); p.site.seed = nextSeed; p.findLook = nextLook; p.findPlate = plate;
      findStage.userData.find = selected; installShown(selected, nextSeed); installDOM(plate);
    }
  };
}

function boxAndPlatformPoints(shown) {
  const box = new THREE.Box3().setFromObject(shown), points = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) points.push(new THREE.Vector3(x, y, z));
  for (let edge = 0; edge < 24; edge++) for (const y of [-.15, .01]) points.push(new THREE.Vector3(Math.cos(edge * Math.PI / 12) * 1.88, y, Math.sin(edge * Math.PI / 12) * 1.88));
  return { box, points };
}

describe('actual-r128 retained exposed-find plate engine', () => {
  it('ships byte-identical app and the same bounded capture helper in the desktop mirror', () => {
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js'); expect(mirror.equals(bytes)).toBe(true);
    expect(bounded(mirror.toString('utf8').replace(/\r\n/g, '\n'), '// DINO_VOXEL_FIND_PLATE_ENGINE_START', '// DINO_VOXEL_FIND_PLATE_ENGINE_END')).toBe(engine);
    expect(THREE.REVISION).toBe('128');
  });

  it('lazily allocates one correctly encoded byte target shared by three captures', () => {
    const f = fixture(); expect(f.calls.targets).toHaveLength(0); f.api.renderFindPlate(f.p);
    expect(f.calls.targets).toHaveLength(1); expect(f.calls.renders).toHaveLength(3); expect(f.calls.reads).toHaveLength(3);
    const target = f.api.state().target;
    expect(target).toMatchObject({ width: 256, height: 176, depthBuffer: true, stencilBuffer: false, scissorTest: false });
    expect(target.texture).toMatchObject({ encoding: THREE.sRGBEncoding, format: THREE.RGBAFormat, type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
    expect(f.calls.renders.every(call => call.scene === f.scene && call.target === target)).toBe(true);
    expect(f.calls.reads.every(call => call.target === target && call.x === 0 && call.y === 0 && call.width === 256 && call.height === 176 && call.pixels.length === 256 * 176 * 4)).toBe(true);
    expect(f.previews.every(preview => preview.dataset.digFindPlateReady === 'true')).toBe(true); expect(f.wrapper.dataset.digFindPlateReady).toBe('true');
  });

  it('captures the canonical oblique, top and end views with public metadata and one shared distance', () => {
    const f = fixture(); f.api.renderFindPlate(f.p); const cameras = f.api.state().cameras, views = f.p.findPlate.views;
    expect(cameras).toHaveLength(3);
    const { box } = boxAndPlatformPoints(f.shown), target = new THREE.Vector3(0, (Math.min(-.15, box.min.y) + box.max.y) / 2, 0);
    const distances = cameras.map(camera => camera.position.distanceTo(target)); distances.forEach(distance => expect(distance).toBeCloseTo(distances[0]));
    cameras.forEach((camera, index) => {
      expect(camera).toMatchObject({ name: 'dino-find-plate-camera-' + views[index].id, fov: 42, aspect: 256 / 176, near: .1, far: 100 });
      expect(Object.keys(camera.userData).sort()).toEqual(['index', 'key', 'look', 'role', 'sharedDistance', 'view']);
      expect(camera.userData).toEqual({ role: 'exposed-find-reference-view', view: views[index].id, key: f.p.findPlate.key, index: f.p.findPlate.index, look: f.p.findPlate.look, sharedDistance: cameras[0].userData.sharedDistance });
      expect(camera.userData.sharedDistance).toBeCloseTo(distances[0]);
      const direction = camera.position.clone().sub(target).normalize();
      expect(direction.x).toBeCloseTo(Math.sin(views[index].yaw) * Math.cos(views[index].pitch)); expect(direction.y).toBeCloseTo(Math.sin(views[index].pitch)); expect(direction.z).toBeCloseTo(Math.cos(views[index].yaw) * Math.cos(views[index].pitch));
      expect(camera.getWorldDirection(new THREE.Vector3()).dot(direction)).toBeCloseTo(-1);
    });
  });

  it.each([0, 1, 2])('fits the observed %s-shape bounding box and platform in all three actual camera projections', index => {
    const f = fixture({ index }); f.api.renderFindPlate(f.p); const { points } = boxAndPlatformPoints(f.shown);
    for (const camera of f.api.state().cameras) for (const point of points) {
      const clip = point.clone().project(camera); expect([clip.x, clip.y, clip.z].every(Number.isFinite)).toBe(true);
      expect(Math.abs(clip.x)).toBeLessThan(1); expect(Math.abs(clip.y)).toBeLessThan(1); expect(clip.z).toBeGreaterThan(-1); expect(clip.z).toBeLessThan(1);
    }
  });

  it('uses target viewport/scissor pixels at2×DPR and restores the main renderer globals unchanged', () => {
    const f = fixture({ dpr: 2 }), before = f.physical(), viewport = f.renderer.getViewport(new THREE.Vector4()).toArray(), scissor = f.renderer.getScissor(new THREE.Vector4()).toArray();
    f.api.renderFindPlate(f.p);
    expect(f.calls.globals).toEqual([]); expect(f.calls.renders.every(call => JSON.stringify(call.viewport) === '[0,0,256,176]' && JSON.stringify(call.scissor) === '[0,0,256,176]' && !call.scissorTest)).toBe(true);
    expect(f.renderer.getRenderTarget()).toBeNull(); expect(f.physical()).toEqual(before); expect(f.renderer.getViewport(new THREE.Vector4()).toArray()).toEqual(viewport); expect(f.renderer.getScissor(new THREE.Vector4()).toArray()).toEqual(scissor);
  });

  it('restores the preceding target, active cube face and mip level', () => {
    const f = fixture(), prior = new THREE.WebGLCubeRenderTarget(64); prior.viewport.set(1, 2, 30, 40); prior.scissor.set(3, 4, 20, 25); prior.scissorTest = true;
    f.renderer.setRenderTarget(prior, 4, 2); const before = f.physical(); f.api.renderFindPlate(f.p);
    expect(f.renderer.getRenderTarget()).toBe(prior); expect(f.renderer.getActiveCubeFace()).toBe(4); expect(f.renderer.getActiveMipmapLevel()).toBe(2); expect(f.physical()).toEqual(before);
  });

  it('flips complete RGBA rows into top-down2D images without changing channels', () => {
    const f = fixture(); f.api.renderFindPlate(f.p);
    f.previews.forEach((preview, index) => {
      const image = preview.context.image; expect(image).toMatchObject({ width: 256, height: 176, x: 0, y: 0 });
      expect([...image.data.slice(0, 4)]).toEqual([175, 0, index + 1, 255]); expect([...image.data.slice(255 * 4, 256 * 4)]).toEqual([175, 255, index + 1, 255]);
      const bottom = 175 * 256 * 4; expect([...image.data.slice(bottom, bottom + 4)]).toEqual([0, 0, index + 1, 255]);
    });
  });

  it('reuses reference cameras, buffers and target, and skips identical key/canvas captures', () => {
    const f = fixture(); f.api.renderFindPlate(f.p); const first = f.api.state(), cameras = first.cameras.slice(), pixels = first.pixels.slice();
    for (let i = 0; i < 5; i++) f.api.renderFindPlate({ ...f.p, pose: { yaw: i }, cameraReset: i, action: { kind: 'unrelated' } });
    expect(f.calls.renders).toHaveLength(3); expect(f.calls.targets).toHaveLength(1);
    f.change({ look: 'raking' }); f.api.renderFindPlate(f.p);
    expect(f.calls.renders).toHaveLength(6); expect(f.api.state().target).toBe(first.target);
    f.api.state().cameras.forEach((camera, index) => expect(camera).toBe(cameras[index])); f.api.state().pixels.forEach((pixel, index) => expect(pixel).toBe(pixels[index]));
    expect(f.api.state().cameras.every(camera => camera.userData.look === 'raking' && camera.userData.key === f.p.findPlate.key)).toBe(true);
  });

  it('recaptures a changed canvas identity even when the public descriptor key is unchanged', () => {
    const f = fixture(); f.api.renderFindPlate(f.p); const firstCanvases = f.api.state().canvases.slice(); f.replaceDOM(); f.api.renderFindPlate(f.p);
    expect(f.calls.renders).toHaveLength(6); expect(f.api.state().canvases.every((canvas, index) => canvas !== firstCanvases[index])).toBe(true); expect(f.calls.targets).toHaveLength(1);
  });

  it('recaptures seed/index changes and updates the actual end angle without allocating another target', () => {
    const f = fixture(); f.api.renderFindPlate(f.p); const target = f.api.state().target, firstAngle = f.api.state().cameras[2].position.clone();
    f.change({ seed: 73, index: 23, look: 'outline' }); f.api.renderFindPlate(f.p);
    expect(f.calls.renders).toHaveLength(6); expect(f.api.state().target).toBe(target); expect(f.api.state().key).toBe('73:23:3:compact:outline');
    expect(f.api.state().cameras[2].position.equals(firstAngle)).toBe(false); expect(f.api.state().cameras.every(camera => camera.userData.index === 23)).toBe(true);
  });

  it.each(['render', 'read', 'put'])('restores target state, clears all previews and caches a failed %s capture', failure => {
    const f = fixture(), prior = new THREE.WebGLCubeRenderTarget(64); f.renderer.setRenderTarget(prior, 3, 1); const before = f.physical();
    if (failure === 'render') f.calls.throwRender = 3; if (failure === 'read') f.calls.throwRead = 3; if (failure === 'put') f.calls.throwPut = 3;
    expect(() => f.api.renderFindPlate(f.p)).not.toThrow();
    expect(f.renderer.getRenderTarget()).toBe(prior); expect(f.renderer.getActiveCubeFace()).toBe(3); expect(f.renderer.getActiveMipmapLevel()).toBe(1); expect(f.physical()).toEqual(before);
    expect(f.wrapper.dataset.digFindPlateReady).toBe('false'); expect(f.previews.every(preview => preview.dataset.digFindPlateReady === 'false' && preview.context.image === null && preview.context.clears > 0)).toBe(true);
    const renderCount = f.calls.renders.length; f.api.renderFindPlate(f.p); expect(f.calls.renders).toHaveLength(renderCount); expect(f.calls.targets).toHaveLength(1);
  });

  it('allows a cached failure to retry after a new preview canvas is mounted', () => {
    const f = fixture(); f.calls.throwRead = 1; f.api.renderFindPlate(f.p); const target = f.api.state().target; f.calls.throwRead = null;
    f.api.renderFindPlate(f.p); expect(f.calls.reads).toHaveLength(1); f.replaceDOM(); f.api.renderFindPlate(f.p);
    expect(f.calls.reads).toHaveLength(4); expect(f.api.state().target).toBe(target); expect(f.wrapper.dataset.digFindPlateReady).toBe('true');
  });

  it('keeps absent2D contexts in fallback without allocation or frame-by-frame retries', () => {
    const f = fixture(); f.wrapper.dataset.digFindPlateReady = 'true'; f.previews[1].context = null;
    expect(() => f.api.renderFindPlate(f.p)).not.toThrow(); expect(f.wrapper.dataset.digFindPlateReady).toBe('false'); expect(f.previews.every(preview => preview.dataset.digFindPlateReady === 'false')).toBe(true);
    expect(f.calls.targets).toHaveLength(0); expect(f.calls.renders).toHaveLength(0); expect(f.api.state().key).toBe(f.p.findPlate.key);
    f.api.renderFindPlate(f.p); expect(f.calls.targets).toHaveLength(0);
  });

  it('treats empty alpha readback as unavailable and keeps the existing view-button fallback', () => {
    const f = fixture(); f.calls.emptyRead = true; f.api.renderFindPlate(f.p);
    expect(f.wrapper.dataset.digFindPlateReady).toBe('false'); expect(f.previews.every(preview => preview.context.image === null && preview.dataset.digFindPlateReady === 'false')).toBe(true);
    expect(f.renderer.getRenderTarget()).toBeNull(); const count = f.calls.renders.length; f.api.renderFindPlate(f.p); expect(f.calls.renders).toHaveLength(count);
  });

  it('rejects missing exposure, hidden stage, stale descriptor or unavailable DOM without drawing', () => {
    const scenarios = [f => { f.p.findMode = false; }, f => { f.p.findPlate = null; }, f => { f.findStage.visible = false; }, f => { f.findStage.userData.find = null; }, f => { f.findStage.userData.find = { ...record(), remaining: 99 }; }, f => { f.p.findPlate = { ...f.p.findPlate, key: 'stale' }; }, f => { f.p.findPlate = { ...f.p.findPlate, seed: 43 }; }, f => { f.shown.visible = false; }, f => { f.wrapper.dataset.digFindPlateKey = 'stale'; }, f => { f.previews[1].width = 300; }, f => { f.previews[1].dataset.digFindPlateView = 'wrong'; }, f => { f.previews[1].dataset.digFindPlateKey = 'stale'; }, f => { f.wrapper.querySelector = () => null; }, f => { f.canvas.closest = () => null; }];
    for (const change of scenarios) { const f = fixture(); change(f); expect(() => f.api.renderFindPlate(f.p)).not.toThrow(); expect(f.calls.targets).toHaveLength(0); expect(f.calls.renders).toHaveLength(0); expect(f.api.state().key).toBeNull(); }
  });

  it('reads only exposed public find fields, seed and display metadata rather than supplied hidden views', () => {
    const f = fixture();
    for (const object of [f.p, f.p.site, f.findStage.userData.find]) for (const key of ['state', 'burial', 'hasBone', 'fossilY', 'species', 'chosen', 'anatomy', 'clues', 'catalog', 'onSelect', 'onExcavate', 'pose', 'camera', 'action']) Object.defineProperty(object, key, { get() { throw Error('Hidden capture read: ' + key); } });
    Object.defineProperty(f.p.findPlate, 'views', { get() { throw Error('Arbitrary supplied views read'); } });
    expect(() => f.api.renderFindPlate(f.p)).not.toThrow(); expect(f.calls.renders).toHaveLength(3); expect(f.wrapper.dataset.digFindPlateReady).toBe('true');
  });

  it('leaves main camera, display lights, materials and visibility unchanged', () => {
    const f = fixture(), light = new THREE.DirectionalLight('#fff0d1', 1.15); light.position.set(-6, 2.3, 4); f.scene.add(light);
    const cameraBefore = f.mainCamera.matrixWorld.toArray(), lightBefore = { intensity: light.intensity, position: light.position.toArray(), visible: light.visible }, shown = f.shown, material = shown.children[0].material, rotation = shown.rotation.toArray(), visibility = f.scene.children.map(object => object.visible), pBefore = JSON.stringify(f.p);
    f.api.renderFindPlate(f.p);
    expect(f.mainCamera.matrixWorld.toArray()).toEqual(cameraBefore); expect({ intensity: light.intensity, position: light.position.toArray(), visible: light.visible }).toEqual(lightBefore);
    expect(shown.children[0].material).toBe(material); expect(shown.rotation.toArray()).toEqual(rotation); expect(f.scene.children.map(object => object.visible)).toEqual(visibility); expect(JSON.stringify(f.p)).toBe(pBefore);
  });

  it('runs preview capture after the normal frame render and leaves subsequent orbit frames cached', () => {
    const f = fixture(); f.api.frame(0);
    expect(f.calls.renders).toHaveLength(4); expect(f.calls.renders[0].camera).toBe(f.mainCamera); expect(f.calls.renders[0].target).toBeNull(); expect(f.calls.renders.slice(1).every(call => call.target === f.api.state().target)).toBe(true);
    f.api.frame(16); expect(f.calls.renders).toHaveLength(5); expect(f.calls.renders[4].camera).toBe(f.mainCamera); expect(f.calls.renders[4].target).toBeNull();
  });

  it('refreshes a visible plate after Look changes while the main canvas is offscreen, with no idle RAF', () => {
    const f = fixture({ visible: false }); f.api.installObserver();
    expect(f.api.state()).toMatchObject({ visible: false, findPlateVisible: true, findPlateObserved: f.wrapper });
    f.api.invalidate(); f.api.invalidate(); expect(f.pendingFrames).toBe(1); expect(f.calls.requested).toHaveLength(1);
    f.flushFrame(0); const target = f.api.state().target, cameras = f.api.state().cameras.slice();
    expect(f.calls.renders).toHaveLength(3); expect(f.calls.reads).toHaveLength(3);
    expect(f.calls.renders.every(call => call.target === target && call.camera !== f.mainCamera)).toBe(true);
    expect(f.api.state().raf).toBe(0); expect(f.pendingFrames).toBe(0);
    f.change({ look: 'raking' }); f.api.syncFindPlateVisibility(f.p);
    expect(f.previews.every(preview => preview.context.image === null)).toBe(true);
    f.api.invalidate(); f.flushFrame(16);
    expect(f.calls.renders).toHaveLength(6); expect(f.calls.reads).toHaveLength(6); expect(f.calls.targets).toHaveLength(1);
    expect(f.calls.renders.every(call => call.target === target && call.camera !== f.mainCamera)).toBe(true);
    expect(f.previews.every(preview => preview.dataset.digFindPlateReady === 'true')).toBe(true);
    expect(f.api.state().cameras.every((camera, index) => camera === cameras[index] && camera.userData.look === 'raking')).toBe(true);
    f.api.invalidate(); f.flushFrame(32);
    expect(f.calls.renders).toHaveLength(6); expect(f.calls.reads).toHaveLength(6);
    expect(f.calls.requested).toHaveLength(3); expect(f.pendingFrames).toBe(0); expect(f.api.state().raf).toBe(0);
  });

  it.each([
    ['both surfaces hidden', { visible: false, findPlateVisible: false }],
    ['page hidden', { visible: true, findPlateVisible: true, pageVisible: false }],
    ['context lost', { visible: true, findPlateVisible: true, contextLost: true }]
  ])('blocks scheduling and capture when %s', (label, flags) => {
    const f = fixture(flags); f.api.invalidate(); f.api.frame(0);
    expect(f.calls.requested).toHaveLength(0); expect(f.pendingFrames).toBe(0);
    expect(f.calls.renders).toHaveLength(0); expect(f.calls.reads).toHaveLength(0); expect(f.calls.targets).toHaveLength(0);
    expect(f.calls.cameraPoses).toBe(0);
  });

  it('keeps ordinary main-canvas rendering and coalesces invalidations when the plate is hidden', () => {
    const f = fixture({ visible: true, findPlateVisible: false });
    f.api.invalidate(); f.api.invalidate(); expect(f.calls.requested).toHaveLength(1); f.flushFrame(0);
    expect(f.calls.renders).toHaveLength(4); expect(f.calls.renders[0]).toMatchObject({ camera: f.mainCamera, target: null });
    expect(f.calls.renders.slice(1).every(call => call.target === f.api.state().target)).toBe(true);
    f.api.invalidate(); f.flushFrame(16);
    expect(f.calls.renders).toHaveLength(5); expect(f.calls.renders[4]).toMatchObject({ camera: f.mainCamera, target: null });
    expect(f.calls.reads).toHaveLength(3); expect(f.calls.cameraPoses).toBe(2); expect(f.pendingFrames).toBe(0);
  });

  it('observes the main canvas and active plate, and preserves observer visibility across same-wrapper syncs', () => {
    const f = fixture({ visible: false }); f.api.installObserver();
    expect(f.calls.observers).toHaveLength(1); expect([...f.calls.observers[0].targets]).toEqual([f.canvas, f.wrapper]);
    expect(f.calls.rectReads).toEqual([f.wrapper]); expect(f.api.state().findPlateVisible).toBe(true);
    f.api.deliverIntersection([{ target: f.wrapper, isIntersecting: false }]);
    f.wrapper.rect = { ...f.wrapper.rect, top: 100, bottom: 340 }; f.api.syncFindPlateVisibility(f.p);
    expect(f.calls.rectReads).toEqual([f.wrapper]); expect(f.api.state()).toMatchObject({ visible: false, findPlateVisible: false });
    expect(f.calls.requested).toHaveLength(0); expect(f.pendingFrames).toBe(0);
  });

  it('distinguishes canvas and plate entries in one callback and ignores unrelated targets', () => {
    const f = fixture({ visible: false, plateRect: { width: 512, height: 240, bottom: 1140, right: 600, top: 900, left: 88 } });
    f.api.installObserver(); f.api.deliverIntersection([{ target: {}, isIntersecting: true }]);
    expect(f.api.state()).toMatchObject({ visible: false, findPlateVisible: false }); expect(f.pendingFrames).toBe(0);
    f.api.deliverIntersection([{ target: f.wrapper, isIntersecting: true }, { target: f.canvas, isIntersecting: false }]);
    expect(f.api.state()).toMatchObject({ visible: false, findPlateVisible: true }); expect(f.pendingFrames).toBe(1); f.flushFrame(0);
    expect(f.calls.renders).toHaveLength(3); expect(f.calls.renders.every(call => call.target !== null)).toBe(true);
    f.api.deliverIntersection([{ target: f.canvas, isIntersecting: true }, { target: f.wrapper, isIntersecting: false }]);
    expect(f.api.state()).toMatchObject({ visible: true, findPlateVisible: false }); f.flushFrame(16);
    expect(f.calls.renders).toHaveLength(4); expect(f.calls.renders[3]).toMatchObject({ camera: f.mainCamera, target: null });
    expect(f.calls.reads).toHaveLength(3); expect(f.pendingFrames).toBe(0);
  });

  it('unobserves replaced and removed wrappers and ignores their late intersection entries', () => {
    const f = fixture({ visible: false }); f.api.installObserver(); const first = f.wrapper;
    f.replaceWrapper({ width: 512, height: 240, bottom: 1140, right: 600, top: 900, left: 88 });
    const second = f.wrapper; f.api.syncFindPlateVisibility(f.p);
    expect(f.calls.unobserves).toEqual([first]); expect(f.calls.rectReads).toEqual([first, second]);
    expect([...f.calls.observers[0].targets]).toEqual([f.canvas, second]);
    f.api.deliverIntersection([{ target: first, isIntersecting: true }]);
    expect(f.api.state()).toMatchObject({ findPlateObserved: second, visible: false, findPlateVisible: false }); expect(f.pendingFrames).toBe(0);
    f.api.deliverIntersection([{ target: second, isIntersecting: true }]); f.flushFrame(0); expect(f.calls.reads).toHaveLength(3);
    f.removeWrapper(); f.api.syncFindPlateVisibility(f.p);
    expect(f.calls.unobserves).toEqual([first, second]); expect([...f.calls.observers[0].targets]).toEqual([f.canvas]);
    f.api.deliverIntersection([{ target: second, isIntersecting: true }]);
    expect(f.api.state()).toMatchObject({ findPlateObserved: null, visible: false, findPlateVisible: false }); expect(f.pendingFrames).toBe(0);
  });

  it.each(['findMode', 'findPlate'])('unobserves the plate when %s is no longer active', field => {
    const f = fixture({ visible: false }); f.api.installObserver(); const wrapper = f.wrapper;
    f.p[field] = field === 'findMode' ? false : null; f.api.syncFindPlateVisibility(f.p);
    expect(f.calls.unobserves).toEqual([wrapper]); expect([...f.calls.observers[0].targets]).toEqual([f.canvas]);
    expect(f.api.state()).toMatchObject({ findPlateObserved: null, findPlateVisible: false });
    f.api.invalidate(); f.api.frame(0); expect(f.calls.renders).toHaveLength(0); expect(f.pendingFrames).toBe(0);
  });

  it('cancels a queued plate frame and disconnects observation on disposal', () => {
    const f = fixture({ visible: false }); f.api.installObserver(); f.api.invalidate(); const id = f.api.state().raf;
    f.api.dispose(); expect(f.calls.canceled).toEqual([id]); expect(f.pendingFrames).toBe(0); expect(f.calls.disposal).toContain('intersection');
    expect(f.api.state()).toMatchObject({ alive: false, findPlateObserved: null, findPlateVisible: false });
    f.api.invalidate(); f.api.frame(16); expect(f.calls.requested).toHaveLength(1); expect(f.calls.renders).toHaveLength(0);
  });

  it('disposes the owned target once before renderer cleanup and clears retained references', () => {
    const f = fixture(); f.api.renderFindPlate(f.p); f.api.dispose(); f.api.dispose();
    expect(f.calls.disposal.filter(value => value === 'plate-target')).toHaveLength(1); expect(f.calls.disposal.indexOf('plate-target')).toBeLessThan(f.calls.disposal.indexOf('renderer'));
    expect(f.api.state()).toMatchObject({ target: null, cameras: [], pixels: [], canvases: [], alive: false });
    const before = f.calls.renders.length; f.api.frame(32); expect(f.calls.renders).toHaveLength(before);
  });

  it('does not allocate or dispose a plate target when the engine is closed before any eligible capture', () => {
    const f = fixture(); f.api.dispose(); expect(f.calls.targets).toHaveLength(0); expect(f.calls.disposal).not.toContain('plate-target'); expect(f.calls.disposal).toContain('renderer');
  });
});
