import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const read = file => readFileSync(resolve(file), 'utf8');
const hostSource = read('stem_lab/stem_lab_module.js');
const catalogSource = read('stem_lab/stem_sim_assets.js');
const deliverySource = read('browser_delivery_policy.js');
const createDeliveryPolicy = Function('URL', deliverySource + '\nreturn _alloCreateBrowserDeliveryPolicy;')(URL);
const raptorSource = read('stem_lab/stem_tool_raptorhunt.js');
const birdSource = read('stem_lab/stem_tool_birdlab.js');
const wildlifeSource = read('stem_lab/birdlab_3d_wildlife.js');
// Normal runs compare the two production paths. A verification run can also
// supply an untouched pre-pilot tree, without making tests depend on tmp files.
const baselineDir = process.env.STEM_ASSET_BASELINE_DIR;
function baseline(file) { return baselineDir ? read(resolve(baselineDir, file)) : read(file); }
function fn(source, name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Missing production function: ' + name);
  let end = source.indexOf('{', start), depth = 1;
  while (depth && ++end < source.length) {
    if (source[end] === '{') depth++;
    else if (source[end] === '}') depth--;
  }
  if (depth) throw new Error('Unclosed production function: ' + name);
  return source.slice(start, end + 1);
}
function runCatalog(local) { Function('window', catalogSource)(local); return local.StemSimAssets; }
function providerWindow(providerSource = read('stem_lab/avian_woodland_birds.js')) {
  const local = {}; Function('window', providerSource)(local); return local;
}
function withCatalog(local, calls) {
  const catalog = runCatalog(local);
  local.StemSimAssets = { ...catalog, create(...args) {
    calls.push({ id: args[1], version: args[2], quality: args[3]?.quality });
    return catalog.create(...args);
  } };
}
function hostLoader() {
  const start = hostSource.indexOf('        loadScriptResilient: function');
  const middle = hostSource.indexOf('        // One canonical way', start);
  const catalog = hostSource.indexOf('        ensureSimulationAssets: function');
  const end = hostSource.indexOf('        // Small shared scene kit', catalog);
  if ([start, middle, catalog, end].some(index => index < 0)) throw Error('Missing host loader boundaries');
  const anchor = [...document.querySelectorAll('script[src]')].find(script => /\/stem_lab\/stem_lab_module\.js(?:[?#]|$)/.test(script.src));
  const baseUrl = anchor ? new URL('../', anchor.src).href : new URL('.', document.baseURI).href;
  const catalogBytes = Buffer.from(catalogSource);
  const policy = createDeliveryPolicy({
    schemaVersion: 1, releaseId: 'a'.repeat(64), fallbackCommit: null, allowDesktopRemoteFallback: false,
    assets: { 'stem_lab/stem_sim_assets.js': {
      integrity: 'sha384-' + createHash('sha384').update(catalogBytes).digest('base64'), bytes: catalogBytes.length,
    } },
  }, { baseUrl });
  window.__alloConfigureTrustedScript = (script, url) => policy.configureScript(script, url);
  // Both methods are the host's actual implementations, including its shared
  // promise cache, DOM requests, URL resolution, failure and retry logic.
  return Function('window', 'document', 'URL', fn(hostSource, '_configureStemScript') + '\nreturn ({' + hostSource.slice(start, middle) + hostSource.slice(catalog, end) + '});')(window, document, URL);
}
async function flush() { for (let i = 0; i < 24; i++) await Promise.resolve(); }
function catalogScripts() { return [...document.querySelectorAll('script')].filter(script => /\/stem_sim_assets\.js(?:[?#]|$)/.test(script.src)); }
function anchor(src) { const script = document.createElement('script'); script.src = src; document.head.appendChild(script); return script; }

describe('shared asset catalog host loading', () => {
  let saved, initialScripts;
  beforeEach(() => {
    vi.useFakeTimers();
    saved = new Map(['StemSimAssets', '__stemScriptPromises', 'AvianWoodlandBirds', 'StemMeadow', '__alloConfigureTrustedScript'].map(key => [key, window[key]]));
    saved.forEach((value, key) => { delete window[key]; });
    initialScripts = new Set(document.querySelectorAll('script'));
  });
  afterEach(() => {
    document.querySelectorAll('script').forEach(script => { if (!initialScripts.has(script)) script.remove(); });
    saved.forEach((value, key) => { if (value === undefined) delete window[key]; else window[key] = value; });
    vi.useRealTimers();
  });

  it('fetches once for concurrent consumers, beside a nested host, preserving its release query and loading no providers', async () => {
    anchor('https://local.invalid/offline/stem_lab/stem_lab_module.js?revision=pilot#host');
    anchor('https://local.invalid/offline/stem_lab/stem_tool_birdlab.js?revision=pilot');
    const host = hostLoader();
    expect(catalogScripts()).toHaveLength(0);
    const first = host.ensureSimulationAssets(), second = host.ensureSimulationAssets();
    expect(catalogScripts()).toHaveLength(1);
    const request = catalogScripts()[0];
    expect(request.src).toBe('https://local.invalid/offline/stem_lab/stem_sim_assets.js?revision=pilot');
    expect(request.async).toBe(true);
    const catalog = runCatalog(window); request.dispatchEvent(new Event('load'));
    expect(await first).toBe(catalog); expect(await second).toBe(catalog);
    expect(await host.ensureSimulationAssets()).toBe(catalog);
    expect(catalogScripts()).toHaveLength(1);
    expect(window.AvianWoodlandBirds).toBeUndefined(); expect(window.StemMeadow).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
    expect([...document.querySelectorAll('script')].filter(script => !initialScripts.has(script)).map(script => script.src)).toEqual([
      'https://local.invalid/offline/stem_lab/stem_lab_module.js?revision=pilot#host',
      'https://local.invalid/offline/stem_lab/stem_tool_birdlab.js?revision=pilot', request.src
    ]);
  });

  it('accepts an existing complete catalog without a network request or provider construction', async () => {
    const catalog = runCatalog(window);
    expect(await hostLoader().ensureSimulationAssets()).toBe(catalog);
    expect(catalogScripts()).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
    expect(window.AvianWoodlandBirds).toBeUndefined(); expect(window.StemMeadow).toBeUndefined();
  });

  it('falls back to the document-local bundled path when no host script is present', async () => {
    const pending = hostLoader().ensureSimulationAssets(), script = catalogScripts()[0];
    expect(script.src).toBe(new URL('stem_lab/stem_sim_assets.js', document.baseURI).href);
    const catalog = runCatalog(window); script.dispatchEvent(new Event('load'));
    expect(await pending).toBe(catalog); expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['network', 'incomplete', 'wrong-version'])('retries independently after a %s failure and removes the failed request', async failure => {
    const host = hostLoader(), first = host.ensureSimulationAssets(), old = catalogScripts()[0];
    const rejected = expect(first).rejects.toThrow('shared asset catalog could not load');
    if (failure === 'incomplete') window.StemSimAssets = { version: '1.0.0', available() { return true; } };
    if (failure === 'wrong-version') window.StemSimAssets = { version: '0.9.0', available() { return true; }, create() {} };
    old.dispatchEvent(new Event(failure === 'network' ? 'error' : 'load'));
    await rejected;
    expect(old.isConnected).toBe(false); expect(catalogScripts()).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
    delete window.StemSimAssets;
    const retry = host.ensureSimulationAssets(), current = catalogScripts()[0];
    expect(current).not.toBe(old);
    const catalog = runCatalog(window); current.dispatchEvent(new Event('load'));
    expect(await retry).toBe(catalog); expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds a stalled optional load and ignores a late event from that request during retry', async () => {
    const host = hostLoader(), pending = host.ensureSimulationAssets(), old = catalogScripts()[0];
    const rejected = expect(pending).rejects.toThrow('shared asset catalog could not load');
    await vi.advanceTimersByTimeAsync(4000); await rejected;
    expect(old.isConnected).toBe(false); expect(vi.getTimerCount()).toBe(0);
    const retry = host.ensureSimulationAssets(); let resolved = false;
    retry.then(() => { resolved = true; });
    const catalog = runCatalog(window); old.dispatchEvent(new Event('load')); await flush();
    expect(resolved).toBe(false);
    catalogScripts()[0].dispatchEvent(new Event('load')); expect(await retry).toBe(catalog);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('optional catalog startup in existing tools', () => {
  let scripts;
  beforeEach(() => { vi.useFakeTimers(); scripts = new Set(document.querySelectorAll('script')); });
  afterEach(() => { document.querySelectorAll('script').forEach(script => { if (!scripts.has(script)) script.remove(); }); vi.useRealTimers(); });

  it.each(['absent', 'host-absent', 'failed', 'stalled'])('keeps Raptor startup usable with an %s optional catalog loader', async state => {
    const ready = vi.fn(), failed = vi.fn(), load = vi.fn(() => state === 'stalled' ? new Promise(() => {}) : Promise.reject(new Error('offline catalog')));
    const local = { THREE, StemLab: state === 'absent' ? {} : { ensureSimulationAssets: load } };
    if (state === 'host-absent') delete local.StemLab;
    const start = Function('window', 'ensureRaptorFeatherArt', 'ensureRaptorWoodlandBirds', fn(raptorSource, 'ensureThreeJS') + ';return ensureThreeJS;')(
      local, () => Promise.resolve(), () => Promise.resolve());
    start(ready, failed); await flush();
    expect(ready).toHaveBeenCalledTimes(1); expect(failed).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(state === 'absent' || state === 'host-absent' ? 0 : 1);
  });

  it.each(['absent', 'host-absent', 'failed', 'stalled'])('keeps BirdLab dependency ordering and mount readiness with an %s catalog loader', async state => {
    const loadCatalog = vi.fn(() => state === 'stalled' ? new Promise(() => {}) : Promise.reject(new Error('offline catalog')));
    const local = { ...providerWindow(), THREE, StemLab: state === 'absent' ? {} : { ensureSimulationAssets: loadCatalog },
      AvianFeatherArt: { createFlightFeatherCanvas() {}, createVaneDetailCanvases() {}, applyVaneGrain() {}, vaneGrainCacheKey() {} },
      BirdLab3DMammals: { create() {} }, setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window) };
    const companionAssets = Object.fromEntries(['birdlab_3d_bird.js', 'birdlab_3d_habitat.js', 'birdlab_3d_wildlife.js', 'birdlab_3d_engine.js'].map(name => {
      const bytes = readFileSync(resolve('stem_lab', name));
      return ['stem_lab/' + name, { integrity: 'sha384-' + createHash('sha384').update(bytes).digest('base64'), bytes: bytes.length }];
    }));
    const companionPolicy = createDeliveryPolicy({ schemaVersion: 1, releaseId: 'a'.repeat(64), fallbackCommit: null,
      allowDesktopRemoteFallback: false, assets: companionAssets }, { baseUrl: 'https://local.invalid/offline/' });
    Object.defineProperty(local, '__alloConfigureTrustedScript', { value: (script, url) => companionPolicy.configureScript(script, url), writable: false });
    if (state === 'host-absent') delete local.StemLab;
    const start = birdSource.indexOf('  var BIRDLAB_MODULE_BASE');
    const end = birdSource.indexOf('\n  (function() {', start);
    const load = Function('window', 'document', 'URL', 'BIRDLAB_HABITAT_ASSET_BASE', birdSource.slice(start, end) + ';return loadBirdlab3D;')(
      local, document, URL, 'https://local.invalid/offline/stem_lab/assets/birdlab/habitats/');
    expect([...document.querySelectorAll('script')].filter(script => !scripts.has(script))).toHaveLength(0);
    const pending = load(); expect(load()).toBe(pending);
    let settled = false; pending.then(() => { settled = true; });
    for (const file of ['birdlab_3d_bird.js', 'birdlab_3d_habitat.js', 'birdlab_3d_wildlife.js', 'birdlab_3d_engine.js']) {
      await flush();
      const script = [...document.querySelectorAll('script[data-birdlab-3d-script]')].filter(script => !scripts.has(script)).at(-1);
      expect(script?.getAttribute('data-birdlab-3d-script')).toBe(file);
      if (file === 'birdlab_3d_wildlife.js') local.BirdLab3DWildlife = { create() {} };
      if (file === 'birdlab_3d_engine.js') local.BirdLab3D = { mount() {} };
      script.dispatchEvent(new Event('load'));
    }
    // A catalog request that never resolves must not delay native readiness.
    await flush(); expect(settled).toBe(true);
    await pending;
    const requests = [...document.querySelectorAll('script')];
    let warmReady = false; load().then(() => { warmReady = true; });
    await flush(); expect(warmReady).toBe(true);
    expect([...document.querySelectorAll('script')]).toEqual(requests);
    expect(loadCatalog).toHaveBeenCalledTimes(state === 'absent' || state === 'host-absent' ? 0 : 3);
    expect(vi.getTimerCount()).toBe(0);
  });
});

// Hash every actual buffer and selected material field, excluding generated IDs.
// Transform checks include the scene graph hierarchy and its world matrices.
function sceneSignature(root, geometry = true) {
  root.updateMatrixWorld(true);
  const hash = createHash('sha256'), geometries = new Map(), materials = new Map(); let nodes = 0;
  const record = value => hash.update(JSON.stringify(value));
  const buffer = attribute => { record([attribute.itemSize, attribute.normalized, attribute.array.constructor.name]); hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength)); };
  root.traverse(object => {
    nodes++; record([object.type, object.name, object.children.length, object.visible, object.position.toArray(), object.quaternion.toArray(), object.scale.toArray(), object.matrixWorld.elements]);
    if (!geometry) return;
    if (object.geometry) {
      const g = object.geometry;
      if (!geometries.has(g)) {
        geometries.set(g, geometries.size);
        record([g.type, g.name, g.groups, g.drawRange, g.morphTargetsRelative]);
        for (const name of Object.keys(g.attributes).sort()) { record(name); buffer(g.attributes[name]); }
        if (g.index) { record('index'); buffer(g.index); }
        for (const name of Object.keys(g.morphAttributes).sort()) { record(name); g.morphAttributes[name].forEach(buffer); }
      }
      record(['geometry', geometries.get(g)]);
    }
    for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
      if (!materials.has(material)) {
        materials.set(material, materials.size);
        record(['material', material.type, material.color?.toArray(), material.emissive?.toArray(), material.roughness, material.metalness,
          material.shininess, material.opacity, material.transparent, material.side, material.vertexColors, material.depthWrite, material.depthTest,
          material.alphaTest, material.flatShading, material.wireframe, material.blending]);
      }
      record(['material-ref', materials.get(material)]);
    }
  });
  return { hash: hash.digest('hex'), nodes, geometries: geometries.size, materials: materials.size };
}
function raptorAPI(source, local) {
  return Function('THREE', 'window', ['buildSharedWoodlandPrey', 'applySharedWoodlandPreyPose', 'releaseSharedWoodlandPrey',
    'advancePreyVisualPose', 'advanceBirdPreyHead', 'applyBirdPreyHeadPose'].map(name => fn(source, name)).join('\n') +
    ';return {build:buildSharedWoodlandPrey,pose:applySharedWoodlandPreyPose,release:releaseSharedWoodlandPrey,advance:advancePreyVisualPose};')(THREE, local);
}
function preyFor(api, size, id = 'mourningDove') {
  const data = { id, sizeM: .15, speedMps: 9, color: 0xa8a29e }, animation = api.build(data, size), mesh = new THREE.Group();
  mesh.add(animation.root);
  return { data, animation, mesh, visual: animation.root, visualSize: size, vx: 0, vz: 0, bobPhase: .7, flightHeight: 0 };
}

describe('existing host adapters through the catalog', () => {
  it.each([.75, 3.15])('preserves Raptor anatomy, host scaling, ground contacts and motion at display size %s', size => {
    const original = providerWindow(baseline('stem_lab/avian_woodland_birds.js')), current = providerWindow(), calls = [];
    withCatalog(current, calls);
    const oldAPI = raptorAPI(baseline('stem_lab/stem_tool_raptorhunt.js'), original), api = raptorAPI(raptorSource, current);
    const before = preyFor(oldAPI, size), after = preyFor(api, size);
    try {
      expect(calls).toEqual([{ id: 'animal.mourning-dove', version: '1.0.0', quality: 'low' }]);
      expect(sceneSignature(after.mesh)).toEqual(sceneSignature(before.mesh));
      expect(after.animation.sharedProfile).toEqual(before.animation.sharedProfile);
      expect(after.animation.sharedBird.root.scale.toArray()).toEqual(before.animation.sharedBird.root.scale.toArray());
      for (let frame = 0; frame < 125; frame++) {
        const dt = frame % 3 === 0 ? .032 : 1 / 60, airborne = frame >= 45 && frame < 95, reduced = frame >= 115;
        for (const [engine, prey] of [[oldAPI, before], [api, after]]) {
          prey.vx = airborne ? 8 : 1.2; prey.vz = airborne ? 2 : 0; prey.flightHeight = airborne ? 6 : 0; prey.alerted = airborne;
          engine.advance(prey.animation.pose, prey.vx, prey.vz, prey.flightHeight, frame * 16, .7, airborne, dt, reduced);
          prey.mesh.position.x += prey.vx * dt; prey.mesh.position.z += prey.vz * dt;
          engine.pose(prey, dt, reduced);
        }
        expect(after.animation.sharedPose, 'pose at frame ' + frame).toEqual(before.animation.sharedPose);
        expect(sceneSignature(after.mesh, false), 'scene at frame ' + frame).toEqual(sceneSignature(before.mesh, false));
      }
      expect(sceneSignature(after.mesh)).toEqual(sceneSignature(before.mesh));
    } finally { oldAPI.release(before); api.release(after); }
  });

  it.each(['absent', 'incomplete', 'wrong-version', 'unavailable'])('retains the Raptor direct-provider path with an %s catalog', state => {
    const local = providerWindow();
    const forbidden = vi.fn(() => { throw Error('Catalog must not handle this request'); });
    if (state === 'incomplete') local.StemSimAssets = { version: '1.0.0', available: () => true };
    if (state === 'wrong-version') local.StemSimAssets = { version: '0.9.0', available: () => true, create: forbidden };
    if (state === 'unavailable') local.StemSimAssets = { version: '1.0.0', available: () => false, create: forbidden };
    const api = raptorAPI(raptorSource, local), oldAPI = raptorAPI(baseline('stem_lab/stem_tool_raptorhunt.js'), providerWindow());
    const before = preyFor(oldAPI, 1.25), after = preyFor(api, 1.25);
    try { expect(sceneSignature(after.mesh)).toEqual(sceneSignature(before.mesh)); expect(forbidden).not.toHaveBeenCalled(); }
    finally { oldAPI.release(before); api.release(after); }
  });

  it.each(['high', 'low'])('preserves all BirdLab residents, guided evidence and free interactions (%s)', quality => {
    const oldLocal = providerWindow(baseline('stem_lab/avian_woodland_birds.js')), local = providerWindow(), calls = [];
    withCatalog(local, calls);
    Function('window', baseline('stem_lab/birdlab_3d_wildlife.js'))(oldLocal); Function('window', wildlifeSource)(local);
    const options = { quality, groundHeight: (x, z) => x * .018 - z * .012 };
    const before = oldLocal.BirdLab3DWildlife.create(THREE, new THREE.Scene(), options), after = local.BirdLab3DWildlife.create(THREE, new THREE.Scene(), options);
    try {
      expect(calls).toEqual([{ id: 'animal.mourning-dove', version: '1.0.0', quality }]);
      expect(sceneSignature(after.root)).toEqual(sceneSignature(before.root));
      for (const time of [0, 3.8, 4.9, 6.2, 8.53, 11.92, 12, 12.7, 13.4, 21, 23.5, 29.5, 30.3, 31.1, 43.999, 4.9, 0]) {
        before.update(time); after.update(time);
        expect(after.snapshot(), 'guided time ' + time).toEqual(before.snapshot());
        expect(sceneSignature(after.root, false), 'transforms at ' + time).toEqual(sceneSignature(before.root, false));
        expect(after.getFocus('mourningDove', new THREE.Vector3()).toArray()).toEqual(before.getFocus('mourningDove', new THREE.Vector3()).toArray());
      }
      before.setMode('free'); after.setMode('free');
      for (let frame = 0; frame < 90; frame++) {
        const observer = { position: { x: frame < 40 ? -.75 : 7, z: frame < 40 ? -1.4 : 7 }, speed: frame < 40 ? 1 : 0, crouching: false };
        before.update(frame / 5, .2, observer); after.update(frame / 5, .2, observer);
        expect(after.snapshot(), 'free frame ' + frame).toEqual(before.snapshot());
        expect(sceneSignature(after.root, false), 'free transforms ' + frame).toEqual(sceneSignature(before.root, false));
      }
      expect(sceneSignature(after.root)).toEqual(sceneSignature(before.root));
      const count = new Map();
      after.root.traverse(object => { for (const resource of [object.geometry, ...(Array.isArray(object.material) ? object.material : [object.material])]) {
        if (!resource || count.has(resource)) continue;
        count.set(resource, 0); resource.addEventListener('dispose', () => count.set(resource, count.get(resource) + 1));
      } });
      after.dispose(); after.dispose(); expect(count.size).toBeGreaterThan(0); expect([...count.values()].every(value => value === 1)).toBe(true);
    } finally { before.dispose(); after.dispose(); }
  }, 30000 /* exhaustive geometry/replay assertions; not a wall-clock performance test */);

  it.each(['absent', 'incomplete', 'wrong-version', 'unavailable'])('keeps BirdLab residents available with an %s catalog', state => {
    const local = providerWindow(), forbidden = vi.fn(() => { throw Error('Catalog must not handle this request'); });
    if (state === 'incomplete') local.StemSimAssets = { version: '1.0.0', create: forbidden };
    if (state === 'wrong-version') local.StemSimAssets = { version: '0.9.0', available: () => true, create: forbidden };
    if (state === 'unavailable') local.StemSimAssets = { version: '1.0.0', available: () => false, create: forbidden };
    Function('window', wildlifeSource)(local);
    const wildlife = local.BirdLab3DWildlife.create(THREE, new THREE.Scene(), { quality: 'low' });
    try {
      expect(wildlife.isShared('mourningDove')).toBe(true); expect(wildlife.snapshot().find(bird => bird.id === 'mourningDove').scientificName).toBe('Zenaida macroura');
      wildlife.update(12.7); expect(wildlife.snapshot().find(bird => bird.id === 'mourningDove').altitude).toBeGreaterThan(.4);
      expect(forbidden).not.toHaveBeenCalled();
    } finally { wildlife.dispose(); }
  });
});

describe('shared asset pilot distribution', () => {
  it('ships byte-identical companions and both legacy and current desktop host paths', () => {
    for (const file of ['stem_lab_module.js', 'stem_sim_assets.js', 'stem_sim_meadow.js', 'avian_woodland_birds.js',
      'birdlab_3d_wildlife.js', 'stem_tool_birdlab.js', 'stem_tool_raptorhunt.js']) {
      const mirror = 'desktop/web-app/public/stem_lab/' + file;
      expect(existsSync(mirror), mirror).toBe(true);
      expect(readFileSync(mirror).equals(readFileSync('stem_lab/' + file)), mirror).toBe(true);
    }
    expect(readFileSync('desktop/web-app/public/stem_lab_module.js').equals(readFileSync('stem_lab/stem_lab_module.js'))).toBe(true);
  });
  it('retains catalog and meadow providers in the clean-build companion copy list', () => {
    const build = read('build.js'), start = build.indexOf('const modulesToCopy = ['), end = build.indexOf('let copyCount', start);
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
    const companions = build.slice(start, end);
    for (const file of ['stem_sim_assets.js', 'stem_sim_meadow.js', 'avian_woodland_birds.js']) expect(companions).toContain("'stem_lab/" + file + "'");
  });
});
