import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = process.env.RAPTOR_CARRY_DEPTH_SCREENSHOTS || resolve(process.cwd(), 'scratch/raptor-carry-depth');
const boundPaths = ['stem_lab/stem_tool_raptorhunt.js', 'desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js', 'tests/stem_raptor_carry_depth.test.js', 'tests/e2e/raptor-carry-depth.spec.ts'];
const hashes = () => Object.fromEntries(boundPaths.map(path => [path, createHash('sha256').update(readFileSync(resolve(process.cwd(), path))).digest('hex')]));
const probes = `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.depthScene=scene;window.depthCamera=camera;window.depthRenderer=r;if(window.skipDepthRender)return;const result=render(scene,camera);if(window.depthCaptureRequested){const gl=r.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight,pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);window.depthCaptured={pixels,width,height,draw:{camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),fov:camera.fov,aspect:camera.aspect,view:camera.view?Object.assign({},camera.view):null},background:scene.background?(scene.background.isColor?{kind:'color',color:scene.background.toArray()}:{kind:'texture',uuid:scene.background.uuid,version:scene.background.version}):null,fog:scene.fog?{near:scene.fog.near,far:scene.fog.far,color:scene.fog.color.toArray()}:null,exposure:r.toneMappingExposure,visibleRoots:scene.children.map(o=>[o.uuid,o.visible]),lights:scene.children.filter(o=>o.isLight).map(o=>({uuid:o.uuid,visible:o.visible,intensity:o.intensity,color:o.color.toArray(),position:o.position.toArray(),target:o.target?.position.toArray()||null})),calls:r.info.render.calls}};window.depthCaptureRequested=false;}return result;};return r;};})();`;
const canvas = (page: Page) => page.locator('[data-raptor-canvas]');
const errors = new WeakMap<Page, string[]>();
let launchHashes: Record<string, string>;

test.describe('Raptor carried prey surface depth in real catches', () => {
  test.describe.configure({ mode: 'default', timeout: 300000, retries: 0 });
  const harness = new GlHarness({ toolFile: boundPaths[0], toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  test.beforeAll(async () => {
    expect(process.env.STEM_GL_SUBSTITUTE || '').toBe(''); mkdirSync(output, { recursive: true });
    launchHashes = hashes(); expect(launchHashes[boundPaths[0]]).toBe(launchHashes[boundPaths[1]]); await harness.start();
  });
  test.afterAll(async () => { await harness.stop(); expect(hashes()).toEqual(launchHashes); });
  test.beforeEach(async ({ page }) => {
    const entries: string[] = []; errors.set(page, entries);
    page.on('pageerror', error => entries.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /shader|THREE\.WebGL|WebGLProgram|INVALID_OPERATION/i.test(message.text())) entries.push(message.text()); });
    await page.setViewportSize({ width: 960, height: 1100 });
    await page.addInitScript(() => {
      let time = 1000, id = 0, seed = 731; const frames = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; performance.now = () => time;
      window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; }; window.cancelAnimationFrame = key => { frames.delete(key); };
      const w = window as any;
      w.stepDepth = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
      w.advanceDepth = (ms: number) => { while (ms > 0) { const step = Math.min(ms, 40); w.stepDepth(step); ms -= step; } };
    });
  });
  test.afterEach(async ({ page }, info) => {
    const completion = hashes(); await info.attach('carry-depth-source-binding', { body: JSON.stringify({ launch: launchHashes, completion, unchanged: JSON.stringify(completion) === JSON.stringify(launchHashes) }), contentType: 'application/json' });
    expect(completion).toEqual(launchHashes); const caughtErrors = errors.get(page) || []; await harness.destroy(page); expect(caughtErrors).toEqual([]);
  });

  async function sizing(page: Page) {
    return canvas(page).evaluate((c: any) => {
      const w = window as any, T = w.THREE, r = w.depthRenderer, gl = r.getContext(), camera = w.depthCamera, rect = c.getBoundingClientRect(), snapshot = c._rhSnapshot();
      const finite = [...camera.position.toArray(), ...camera.quaternion.toArray(), ...camera.projectionMatrix.elements, ...camera.matrixWorld.elements, camera.fov, camera.aspect, camera.near, camera.far].every(Number.isFinite);
      return { rendererIsCurrentCanvas: r.domElement === c, rendererCanvasConnected: r.domElement.isConnected, currentCanvasConnected: c.isConnected,
        canvasClient: [c.clientWidth, c.clientHeight], canvasRect: [rect.width, rect.height], canvasAttributes: [c.width, c.height], viewport: [innerWidth, innerHeight],
        rendererSize: r.getSize(new T.Vector2()).toArray(), drawingBufferSize: r.getDrawingBufferSize(new T.Vector2()).toArray(), glDrawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        pixelRatio: r.getPixelRatio(), contextLost: gl.isContextLost(), glError: gl.getError(), glViewport: Array.from(gl.getParameter(gl.VIEWPORT)), glScissor: Array.from(gl.getParameter(gl.SCISSOR_BOX)),
        scissorEnabled: gl.isEnabled(gl.SCISSOR_TEST), framebufferUnbound: gl.getParameter(gl.FRAMEBUFFER_BINDING) === null,
        camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), aspect: camera.aspect, fov: camera.fov, near: camera.near, far: camera.far, finite,
          matchesProductionSnapshot: JSON.stringify(camera.position.toArray()) === JSON.stringify(snapshot.cameraPosition) && JSON.stringify(camera.quaternion.toArray()) === JSON.stringify(snapshot.cameraQuaternion) }, motionTimeMs: snapshot.motionTimeMs };
    });
  }
  async function settleMobileRendering(page: Page, info: TestInfo) {
    const before = await sizing(page); let sourceStepCycles = 0;
    await expect.poll(async () => {
      // Yield between real window resize and manually stepped source frames so
      // the production ResizeObserver can see the final narrow layout.
      await page.evaluate(() => { (window as any).skipDepthRender = true; window.dispatchEvent(new Event('resize')); });
      if (sourceStepCycles < 20) { await canvas(page).evaluate(() => (window as any).stepDepth(25)); sourceStepCycles++; }
      const state = await sizing(page), [width, height] = state.canvasClient;
      return state.rendererIsCurrentCanvas && state.rendererCanvasConnected && state.currentCanvasConnected && width > 0 && height > 0 && state.rendererSize[0] === width && state.rendererSize[1] === height &&
        state.canvasAttributes[0] === width && state.canvasAttributes[1] === height && state.glDrawingBuffer[0] === width && state.glDrawingBuffer[1] === height &&
        state.drawingBufferSize[0] === width && state.drawingBufferSize[1] === height && Math.abs(state.camera.aspect - width / height) < 1e-8 && !state.contextLost;
    }, { timeout: 30000 }).toBe(true);
    await canvas(page).evaluate(() => { const w = window as any; w.skipDepthRender = false; w.stepDepth(25); });
    const settled = await sizing(page), proof = { before, settled, sourceStepCycles, manualStepMs: 25, productionResizeOnly: true, separatePageCallsYieldEventLoop: true };
    await info.attach('fish-mobile-settled-rendering', { body: JSON.stringify(proof), contentType: 'application/json' });
    expect(settled.viewport).toEqual([360, 1100]); expect(settled.pixelRatio).toBe(1); expect(settled.canvasClient[0]).toBeGreaterThan(0); expect(settled.canvasClient[0]).toBeLessThanOrEqual(320);
    for (const size of [settled.rendererSize, settled.drawingBufferSize, settled.glDrawingBuffer, settled.canvasAttributes]) expect(size).toEqual(settled.canvasClient);
    for (const field of ['rendererIsCurrentCanvas', 'rendererCanvasConnected', 'currentCanvasConnected']) expect((settled as any)[field]).toBe(true);
    expect(settled.glViewport).toEqual([0, 0, ...settled.canvasClient]); expect(settled.contextLost).toBe(false); expect(settled.glError).toBe(0);
    expect(settled.scissorEnabled).toBe(false); expect(settled.framebufferUnbound).toBe(true); expect(settled.camera.finite).toBe(true); expect(settled.camera.matchesProductionSnapshot).toBe(true);
    return proof;
  }
  async function mount(page: Page, species: string, mobile: boolean, info: TestInfo) {
    if (mobile) { await page.setViewportSize({ width: 360, height: 1100 }); await page.emulateMedia({ reducedMotion: 'reduce' }); }
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', selectedSpecies: species, activeMission: 'open', flightSession: { speciesId: species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: 'low', focusSlowmo: false } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if (mobile) await page.addStyleTag({ content: '#wrap{width:320px}' });
    await canvas(page).evaluate((c: any) => { c.dataset.raptorFocusSlowmo = 'false'; c._rhCommand('environment', { windSpeed: 0, dayPhase: .44, cloudCover: .15 }); });
    if (mobile) await settleMobileRendering(page, info);
    await canvas(page).evaluate((c: any) => {
      const w = window as any, T = w.THREE;
      w.cameraState = () => ({ position: w.depthCamera.position.toArray(), quaternion: w.depthCamera.quaternion.toArray(), fov: w.depthCamera.fov, aspect: w.depthCamera.aspect, view: w.depthCamera.view ? { ...w.depthCamera.view } : null });
      w.renderDepth = () => { w.depthScene.updateMatrixWorld(true); w.depthCamera.updateMatrixWorld(true); w.skipDepthRender = false; w.depthRenderer.render(w.depthScene, w.depthCamera); };
      w.nativeRoots = () => w.depthScene.children.filter((o: any) => o.children.some((child: any) => child.name.startsWith('prey-')));
      const alias = (name: string) => /^morph(Target|Normal)[0-7]$/.test(name);
      w.captureNative = (kind: string) => {
        const before = c._rhSnapshot(), roots = w.nativeRoots(), chosen = roots.find((root: any) => root.children.some((child: any) => child.name.startsWith('prey-' + kind + '-')));
        if (!chosen) throw new Error('Actual session has no native ' + kind + ' prey');
        const visual = chosen.children.find((child: any) => child.name.startsWith('prey-' + kind + '-')), feet = ['left-raptor-foot', 'right-raptor-foot'].map(name => w.depthScene.getObjectByName(name));
        w.carriedRoot = chosen; w.carriedVisual = visual; w.retainedMeshes = [];
        visual.traverse((o: any) => { if (o.isMesh) w.retainedMeshes.push(o); }); w.retainedMeshes.push(...feet);
        w.meshOwners = w.retainedMeshes.map((mesh: any) => ({ mesh, geometry: mesh.geometry, material: mesh.material, weights: mesh.morphTargetInfluences, morphs: Object.entries(mesh.geometry.morphAttributes).map(([name, list]) => ({ name, list })) }));
        w.ownedAttributes = () => w.retainedMeshes.flatMap((mesh: any) => {
          const g = mesh.geometry, entries: any[] = g.index ? [{ name: g.uuid + '/index', attribute: g.index }] : [];
          Object.keys(g.attributes).sort().forEach(name => { if (!alias(name)) entries.push({ name: g.uuid + '/' + name, attribute: g.attributes[name] }); });
          Object.keys(g.morphAttributes).sort().forEach(name => g.morphAttributes[name].forEach((attribute: any, index: number) => entries.push({ name: g.uuid + '/morph/' + name + '/' + index, attribute }))); return entries;
        });
        w.savedBuffers = w.ownedAttributes().map((entry: any) => ({ ...entry, array: entry.attribute.array, version: entry.attribute.version, bytes: new Uint8Array(entry.attribute.array.buffer, entry.attribute.array.byteOffset, entry.attribute.array.byteLength).slice() }));
        w.ownership = () => w.retainedMeshes.map((mesh: any, i: number) => { const owner = w.meshOwners[i]; return { name: mesh.name, meshUuid: mesh.uuid, geometryUuid: mesh.geometry.uuid,
          meshIdentity: mesh === owner.mesh, geometryIdentity: mesh.geometry === owner.geometry, materialIdentity: mesh.material === owner.material, weightsIdentity: mesh.morphTargetInfluences === owner.weights,
          morphListsIdentity: owner.morphs.every((entry: any) => mesh.geometry.morphAttributes[entry.name] === entry.list) }; });
        w.rendererAliases = () => w.retainedMeshes.flatMap((mesh: any) => Object.entries(mesh.geometry.attributes).filter(([name]) => alias(name)).map(([name, attribute]: any) => {
          const match = name.match(/^morph(Target|Normal)([0-7])$/), targets = mesh.geometry.morphAttributes[match[1] === 'Target' ? 'position' : 'normal'], targetIndex = targets.indexOf(attribute);
          return { name: mesh.name + '/' + name, targetIndex, ownedTargetReference: targetIndex >= 0 && attribute.array === targets[targetIndex].array, version: attribute.version };
        }));
        w.sameBuffers = () => { const now = w.ownedAttributes(); return now.length === w.savedBuffers.length && now.every((entry: any, i: number) => {
          const before = w.savedBuffers[i], a = entry.attribute, bytes = new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength);
          return entry.name === before.name && a === before.attribute && a.array === before.array && a.version === before.version && bytes.length === before.bytes.length && bytes.every((value: number, j: number) => value === before.bytes[j]);
        }); };
        w.originalMaterials = []; const seen = new Set<any>();
        visual.traverse((o: any) => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((material: any) => { if (!seen.has(material)) { seen.add(material); w.originalMaterials.push({ material, uuid: material.uuid, opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite, version: material.version }); } }));
        w.readMaterials = () => w.originalMaterials.map((entry: any) => ({ uuid: entry.material.uuid, opacity: entry.material.opacity, transparent: entry.material.transparent, depthWrite: entry.material.depthWrite, version: entry.material.version,
          original: { opacity: entry.opacity, transparent: entry.transparent, depthWrite: entry.depthWrite, version: entry.version } }));
        w.carryPose = () => ({ rootPosition: chosen.position.toArray(), rootRotation: chosen.rotation.toArray(), rootScale: chosen.scale.toArray(), visualPosition: visual.position.toArray(), visualRotation: visual.rotation.toArray(),
          meshes: w.retainedMeshes.map((mesh: any) => ({ uuid: mesh.uuid, position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), scale: mesh.scale.toArray(), weights: mesh.morphTargetInfluences?.slice() || [] })) });
        w.readCarry = () => ({ snapshot: c._rhSnapshot(), ageMs: c._rhSnapshot().motionTimeMs - w.catchStartedAt, materials: w.readMaterials(), pose: w.carryPose(), ownership: w.ownership(), sameBuffers: w.sameBuffers(), ownedAttributeCount: w.ownedAttributes().length, rendererAliases: w.rendererAliases(), attached: !!chosen.parent, parent: chosen.parent?.name || null });
        const cameraBefore = JSON.stringify(w.cameraState()), orientationBefore = JSON.stringify(chosen.quaternion.toArray()), fromWorld = chosen.getWorldPosition(new T.Vector3()).toArray(), p = before.raptorPosition, h = before.headingRadians, pitch = before.pitchRadians;
        // Disclosed controlled positions use the real native models and resolver.
        // The production flight posture/camera and prey orientation remain intact.
        roots.forEach((root: any, i: number) => root.position.set(root === chosen ? p.x + Math.sin(h) * Math.cos(pitch) * 3 : 2000 + i * 20,
          root === chosen ? p.y + Math.sin(pitch) * 3 : 2000, root === chosen ? p.z - Math.cos(h) * Math.cos(pitch) * 3 : 2000)); chosen.updateWorldMatrix(true, true);
        const placement = { fromWorld, toWorld: chosen.getWorldPosition(new T.Vector3()).toArray(), raptorPosition: p, headingRadians: h, pitchRadians: pitch, forwardMeters: 3,
          cameraPreserved: cameraBefore === JSON.stringify(w.cameraState()), orientationPreserved: orientationBefore === JSON.stringify(chosen.quaternion.toArray()), nativeModelUuid: chosen.uuid };
        const originalMaterials = w.readMaterials(); c._rhCommand('strike'); w.catchStartedAt = c._rhSnapshot().motionTimeMs;
        const carried = w.depthScene.getObjectByName('raptor-carried-prey'), resources = new Set<any>(); w.disposals = [];
        chosen.traverse((o: any) => { if (o.geometry) resources.add(o.geometry); (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((material: any) => resources.add(material)); });
        resources.forEach(resource => { const entry = { uuid: resource.uuid, kind: resource.isMaterial ? 'material' : 'geometry', count: 0 }; resource.addEventListener('dispose', () => entry.count++); w.disposals.push(entry); });
        w.footDisposals = 0; new Set(feet.flatMap((foot: any) => [foot.geometry, foot.material])).forEach((resource: any) => resource.addEventListener('dispose', () => w.footDisposals++));
        return { before, after: c._rhSnapshot(), kind, chosenUuid: chosen.uuid, carriedUuid: carried?.uuid, sameNativeIdentity: carried === chosen, visualUuid: visual.uuid, placement, originalMaterials, state: w.readCarry(), resources: w.disposals.length };
      };
      w.toCarryAge = (target: number) => { const age = c._rhSnapshot().motionTimeMs - w.catchStartedAt; if (age > target + 1e-7) throw new Error('Carry age passed target'); w.skipDepthRender = true; w.advanceDepth(Math.max(0, target - age)); return w.readCarry(); };
      w.projectCarry = () => {
        const rect = c.getBoundingClientRect(), points: any[] = []; w.depthScene.updateMatrixWorld(true); w.depthCamera.updateMatrixWorld(true);
        w.carriedVisual.traverse((mesh: any) => { if (!mesh.geometry) return; const g = mesh.geometry, p = g.attributes.position, targets = g.morphAttributes.position || [], weights = mesh.morphTargetInfluences || [];
          for (let i = 0; i < p.count; i++) { const base = new T.Vector3().fromBufferAttribute(p, i), vertex = base.clone(); targets.forEach((target: any, j: number) => vertex.addScaledVector(new T.Vector3().fromBufferAttribute(target, i).sub(base), weights[j] || 0));
            const ndc = vertex.applyMatrix4(mesh.matrixWorld).project(w.depthCamera); points.push({ x: (ndc.x + 1) * rect.width / 2, y: (1 - ndc.y) * rect.height / 2, z: ndc.z }); }
        });
        return { coordinateSpace: 'canvas CSS pixels', canvasSize: [rect.width, rect.height], viewport: [innerWidth, innerHeight], bounds: { vertices: points.length, minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y)), insideDepth: points.every(p => p.z > -1 && p.z < 1) } };
      };
      w.beginDepthProof = (study: boolean) => {
        const r = w.depthRenderer; w.proofContext = { study, camera: JSON.stringify(w.cameraState()), pose: JSON.stringify(w.carryPose()), time: c._rhSnapshot().motionTimeMs,
          materials: w.readMaterials(), flags: w.originalMaterials.map((entry: any) => ({ material: entry.material, transparent: entry.material.transparent, depthWrite: entry.material.depthWrite })), visibility: w.carriedRoot.visible,
          shadowAutoUpdate: r.shadowMap.autoUpdate, shadowNeedsUpdate: r.shadowMap.needsUpdate, phases: {} };
        w.depthTake = (phase: string) => {
          w.skipDepthRender = false; w.depthCaptureRequested = true;
          if (study) document.querySelector('.rh-study-inspect select')!.dispatchEvent(new Event('change', { bubbles: true })); else w.renderDepth();
          if (w.depthCaptureRequested || !w.depthCaptured) throw new Error('Actual source draw was not captured');
          w.proofContext.phases[phase] = { ...w.depthCaptured, materials: w.readMaterials(), aliases: w.rendererAliases() };
        };
        w.depthTake('production'); r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = false; w.depthTake('repeat');
      };
      w.oldCarryDepth = () => {
        w.proofContext.flags.forEach((entry: any) => { if (!entry.material.transparent || entry.material.depthWrite) { entry.material.transparent = true; entry.material.depthWrite = false; entry.material.needsUpdate = true; } });
        w.depthTake('oldFlags');
      };
      w.finishDepthProof = () => {
        const context = w.proofContext, r = w.depthRenderer;
        const restoreFlags = () => context.flags.forEach((entry: any) => { if (entry.material.transparent !== entry.transparent || entry.material.depthWrite !== entry.depthWrite) {
          entry.material.transparent = entry.transparent; entry.material.depthWrite = entry.depthWrite; entry.material.needsUpdate = true;
        } });
        try { restoreFlags(); w.carriedRoot.visible = false; w.depthTake('hidden'); }
        finally { restoreFlags(); w.carriedRoot.visible = context.visibility; r.shadowMap.autoUpdate = context.shadowAutoUpdate; r.shadowMap.needsUpdate = context.shadowNeedsUpdate; w.depthTake('restored'); }
        const difference = (a: Uint8Array, b: Uint8Array) => { let count = 0; for (let i = 0; i < a.length; i += 4) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 3) count++; return count; };
        const phases = context.phases, production = phases.production;
        const drawComparable = (draw: any) => { const { calls, ...state } = draw; return state; };
        return { view: context.study ? 'separate production Feet study view' : 'unchanged production flight camera', productionCamera: !context.study, studyView: context.study,
          changedPixels: difference(production.pixels, phases.oldFlags.pixels), visiblePreyPixels: difference(production.pixels, phases.hidden.pixels), repeatNoisePixels: difference(production.pixels, phases.repeat.pixels), restoredDifferencePixels: difference(production.pixels, phases.restored.pixels), width: production.width, height: production.height,
          cameraUnchanged: context.camera === JSON.stringify(w.cameraState()), poseUnchanged: context.pose === JSON.stringify(w.carryPose()), motionClockUnchanged: context.time === c._rhSnapshot().motionTimeMs,
          lightingAndBackgroundUnchanged: JSON.stringify(drawComparable(production.draw)) === JSON.stringify(drawComparable(phases.oldFlags.draw)), shadowsFrozenForComparison: true,
          originalMaterials: context.materials, phaseMaterials: Object.fromEntries(Object.entries(phases).map(([phase, record]: any) => [phase, record.materials])),
          drawStates: Object.fromEntries(Object.entries(phases).map(([phase, record]: any) => [phase, record.draw])), rendererAliases: Object.fromEntries(Object.entries(phases).map(([phase, record]: any) => [phase, record.aliases])),
          materialVersionsChangedByExplicitCounterfactualInstrumentation: true, productionFlagsRestored: context.flags.every((entry: any) => entry.material.transparent === entry.transparent && entry.material.depthWrite === entry.depthWrite),
          sameBuffers: w.sameBuffers(), ownership: w.ownership(), ownedAttributeCount: w.ownedAttributes().length, framing: w.projectCarry(), glError: r.getContext().getError(), contextLost: r.getContext().isContextLost() };
      };
      w.skipDepthRender = true; for (let i = 0; i < 4; i++) w.stepDepth(25); w.renderDepth();
    });
  }

  function expectOwnership(state: any) {
    expect(state.sameBuffers).toBe(true); expect(state.ownedAttributeCount).toBeGreaterThan(18);
    state.ownership.forEach((owner: any) => { for (const field of ['meshIdentity', 'geometryIdentity', 'materialIdentity', 'weightsIdentity', 'morphListsIdentity']) expect(owner[field], owner.name + '/' + field).toBe(true); });
    const aliases = Array.isArray(state.rendererAliases) ? state.rendererAliases : Object.values(state.rendererAliases).flat();
    aliases.forEach((alias: any) => { expect(alias.ownedTargetReference, alias.name).toBe(true); expect(alias.targetIndex).toBeGreaterThanOrEqual(0); });
  }
  function expectMaterials(state: any, fade: number) {
    expectOwnership(state); expect(state.materials.length).toBeGreaterThan(1);
    state.materials.forEach((entry: any) => { expect(entry.opacity).toBeCloseTo(entry.original.opacity * fade, 9);
      expect(entry.transparent).toBe(fade < 1 ? true : entry.original.transparent); expect(entry.depthWrite).toBe(fade < 1 ? false : entry.original.depthWrite); });
  }
  function expectContact(contact: any, kind: string) {
    expect(contact.kind).toBe(kind); expect(contact.sameNativeIdentity).toBe(true); expect(contact.carriedUuid).toBe(contact.chosenUuid);
    expect(contact.after.missionCatches - contact.before.missionCatches).toBe(1); expect(contact.after.carriedPreyMs).toBe(1100); expect(contact.state.parent).toBe('raptor-feet');
    expect(contact.state.materials).toEqual(contact.originalMaterials); expectMaterials(contact.state, 1);
    const p = contact.placement, h = p.headingRadians, pitch = p.pitchRadians, r = p.raptorPosition;
    expect(p.cameraPreserved).toBe(true); expect(p.orientationPreserved).toBe(true); expect(p.nativeModelUuid).toBe(contact.chosenUuid);
    const expected = [r.x + Math.sin(h) * Math.cos(pitch) * 3, r.y + Math.sin(pitch) * 3, r.z - Math.cos(h) * Math.cos(pitch) * 3];
    p.toWorld.forEach((value: number, i: number) => expect(value).toBeCloseTo(expected[i], 8));
  }
  async function depthProof(page: Page, info: TestInfo, label: string, study: boolean) {
    await canvas(page).evaluate((_: any, study: boolean) => (window as any).beginDepthProof(study), study);
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: resolve(output, label + '-depth-correct.png'), timeout: 90000 });
    let proof: any;
    try {
      await canvas(page).evaluate(() => (window as any).oldCarryDepth());
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: resolve(output, label + '-old-depth-comparison.png'), timeout: 90000 });
    } finally { proof = await canvas(page).evaluate(() => (window as any).finishDepthProof()); }
    await info.attach(label + '-depth-proof', { body: JSON.stringify(proof), contentType: 'application/json' });
    expectOwnership(proof);
    for (const field of ['cameraUnchanged', 'poseUnchanged', 'motionClockUnchanged', 'lightingAndBackgroundUnchanged', 'shadowsFrozenForComparison', 'productionFlagsRestored']) expect(proof[field], field).toBe(true);
    expect(proof.glError).toBe(0); expect(proof.contextLost).toBe(false); expect(proof.restoredDifferencePixels).toBeLessThanOrEqual(proof.repeatNoisePixels);
    expect(proof.visiblePreyPixels).toBeGreaterThan(Math.max(2, proof.repeatNoisePixels * 5 + 2));
    expect(proof.productionCamera).toBe(!study); expect(proof.studyView).toBe(study);
    if (study) expect(proof.changedPixels).toBeGreaterThan(Math.max(2, proof.repeatNoisePixels * 5 + 2));
    // A tiny native silhouette can report zero changed pixels. Only the separate
    // production study close-up requires a measurable surface-depth difference.
    expect(proof.framing.bounds.vertices).toBeGreaterThan(100); expect(proof.framing.bounds.insideDepth).toBe(true);
    expect(proof.framing.bounds.minX).toBeGreaterThanOrEqual(0); expect(proof.framing.bounds.minY).toBeGreaterThanOrEqual(0);
    expect(proof.framing.bounds.maxX).toBeLessThanOrEqual(proof.framing.canvasSize[0]); expect(proof.framing.bounds.maxY).toBeLessThanOrEqual(proof.framing.canvasSize[1]);
    proof.phaseMaterials.production.forEach((entry: any, i: number) => {
      const old = proof.phaseMaterials.oldFlags[i], restored = proof.phaseMaterials.restored[i];
      expect(entry.opacity).toBe(1); expect(old.opacity).toBe(1); expect(old.transparent).toBe(true); expect(old.depthWrite).toBe(false);
      expect(restored.transparent).toBe(entry.transparent); expect(restored.depthWrite).toBe(entry.depthWrite);
      const changedFlags = !entry.transparent || entry.depthWrite;
      expect(old.version).toBe(entry.version + (changedFlags ? 1 : 0)); expect(restored.version).toBe(entry.version + (changedFlags ? 2 : 0));
    });
    return proof;
  }
  async function studyProof(page: Page, info: TestInfo, label: string) {
    const before = await canvas(page).evaluate((c: any) => ({ time: c._rhSnapshot().motionTimeMs, camera: (window as any).cameraState() }));
    await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('feet');
    await page.getByRole('button', { name: 'Studio', exact: true }).click();
    const state = await canvas(page).evaluate((c: any) => ({ snapshot: c._rhSnapshot(), carry: (window as any).readCarry() }));
    expect(state.snapshot.studyActive).toBe(true); expect(state.snapshot.studyFocus).toBe('feet'); expect(state.snapshot.studyPresentation).toBe('studio'); expectMaterials(state.carry, 1);
    const proof = await depthProof(page, info, label + '-study', true);
    await page.locator('.rh-study-close').click();
    const after = await canvas(page).evaluate((c: any) => ({ time: c._rhSnapshot().motionTimeMs, camera: (window as any).cameraState(), carry: (window as any).readCarry() }));
    expect(after.time).toBe(before.time); expect(after.camera).toEqual(before.camera); expectMaterials(after.carry, 1);
    return { before, state, proof, after, enteredAndClosedActualProductionStudy: true };
  }
  async function expired(page: Page) {
    const result = await canvas(page).evaluate((c: any) => { const w = window as any; w.toCarryAge(1100); return { snapshot: c._rhSnapshot(), attached: !!w.carriedRoot.parent, carriedRootExists: !!w.depthScene.getObjectByName('raptor-carried-prey'),
      disposals: w.disposals, footDisposals: w.footDisposals, sameBuffers: w.sameBuffers(), ownership: w.ownership(), ownedAttributeCount: w.ownedAttributes().length, rendererAliases: w.rendererAliases() }; });
    expectOwnership(result); expect(result.snapshot.carriedPreyMs).toBe(0); expect(result.snapshot.carriedPreyLabel).toBeNull(); expect(result.snapshot.talonGrip).toBe(0);
    expect(result.attached).toBe(false); expect(result.carriedRootExists).toBe(false); expect(result.footDisposals).toBe(0); expect(result.disposals.length).toBeGreaterThan(4); result.disposals.forEach((entry: any) => expect(entry.count).toBe(1));
    return result;
  }

  test('retains solid native bird surfaces through hold, fade and paused motion preference changes', async ({ page }, info) => {
    await mount(page, 'peregrine', false, info);
    const contact = await canvas(page).evaluate(() => (window as any).captureNative('bird')); await info.attach('bird-desktop-contact', { body: JSON.stringify(contact), contentType: 'application/json' }); expectContact(contact, 'bird');
    const held = await canvas(page).evaluate((c: any) => { const w = window as any; const state = w.toCarryAge(240); w.renderDepth(); c._rhCommand('pause'); return state; });
    expectMaterials(held, 1); held.materials.forEach((entry: any) => expect(entry.version).toBe(entry.original.version));
    const native = await depthProof(page, info, 'bird-desktop-native', false), study = await studyProof(page, info, 'bird-desktop');
    const versionBaseline = await canvas(page).evaluate((c: any) => { c._rhCommand('pause'); return (window as any).readMaterials(); });
    const samples = await canvas(page).evaluate(() => { const w = window as any; return [900, 950, 1000].map(age => w.toCarryAge(age)); });
    const fades = [1, .84375, .5]; samples.forEach((state: any, i: number) => { expect(state.ageMs).toBe([900, 950, 1000][i]); expectMaterials(state, fades[i]); state.materials.forEach((entry: any, j: number) => expect(entry.version).toBe(versionBaseline[j].version + (i === 0 ? 0 : 1))); });
    expect(samples.map((state: any) => state.ageMs)).toEqual([900, 950, 1000]);
    const paused = await canvas(page).evaluate((c: any) => { const w = window as any; c._rhCommand('pause'); const before = w.readCarry(); w.stepDepth(60000); return { before, after: w.readCarry() }; });
    expect(paused.after.snapshot.motionTimeMs).toBe(paused.before.snapshot.motionTimeMs); expect(paused.after.materials).toEqual(paused.before.materials); expect(paused.after.pose).toEqual(paused.before.pose);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await expect.poll(() => canvas(page).evaluate((c: any) => c._rhSnapshot().reducedMotion)).toBe(true);
    const quiet = await canvas(page).evaluate(() => (window as any).readCarry()); expectMaterials(quiet, 1); expect(quiet.ageMs).toBe(1000); expect(quiet.snapshot.motionTimeMs).toBe(paused.before.snapshot.motionTimeMs);
    quiet.materials.forEach((entry: any, i: number) => expect(entry.version).toBe(paused.before.materials[i].version + 1));
    const quietFrozen = await canvas(page).evaluate(() => { const w = window as any; w.stepDepth(60000); return w.readCarry(); }); expect(quietFrozen.materials).toEqual(quiet.materials); expect(quietFrozen.pose).toEqual(quiet.pose); expect(quietFrozen.ageMs).toBe(1000);
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await expect.poll(() => canvas(page).evaluate((c: any) => c._rhSnapshot().reducedMotion)).toBe(false);
    const restoredFade = await canvas(page).evaluate(() => (window as any).readCarry()); expectMaterials(restoredFade, .5); expect(restoredFade.ageMs).toBe(1000);
    restoredFade.materials.forEach((entry: any, i: number) => expect(entry.version).toBe(quiet.materials[i].version + 1));
    const late = await canvas(page).evaluate((c: any) => { c._rhCommand('pause'); const w = window as any; return [1050, 1099].map(age => w.toCarryAge(age)); });
    late.forEach((state: any) => { const progress = (state.ageMs - 900) / 200; expectMaterials(state, 1 - progress * progress * (3 - 2 * progress)); state.materials.forEach((entry: any, i: number) => expect(entry.version).toBe(restoredFade.materials[i].version)); });
    expect(late.map((state: any) => state.ageMs)).toEqual([1050, 1099]); const release = await expired(page);
    await info.attach('bird-desktop-lifecycle', { body: JSON.stringify({ source: launchHashes, contact, held, native, study, versionBaseline, samples, paused, quiet, quietFrozen, restoredFade, late, release }), contentType: 'application/json' });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('keeps native fish opaque in narrow mobile reduced motion and releases retained resources once', async ({ page }, info) => {
    await mount(page, 'osprey', true, info);
    const posture = await canvas(page).evaluate((c: any) => {
      const w = window as any, keys = [' ', 'a'], durationMs = 800, source = 'carry-depth-mobile-fixed-posture', before = { snapshot: c._rhSnapshot(), camera: w.cameraState() }; let held: any;
      try { keys.forEach(key => c._rhCommand('hold', { key, pressed: true, source })); w.skipDepthRender = true; w.advanceDepth(durationMs); w.renderDepth(); held = { snapshot: c._rhSnapshot(), camera: w.cameraState() }; }
      finally { keys.forEach(key => c._rhCommand('hold', { key, pressed: false, source })); }
      return { before, held, released: { snapshot: c._rhSnapshot(), camera: w.cameraState() }, publicCommand: 'hold', keys, durationMs, elapsedMotionMs: held.snapshot.motionTimeMs - before.snapshot.motionTimeMs, releasedBeforeCatch: true, sourceControlledPostureAndCamera: true };
    });
    await info.attach('fish-mobile-fixed-public-flight-posture', { body: JSON.stringify(posture), contentType: 'application/json' }); expect(posture.elapsedMotionMs).toBeCloseTo(800, 6); expect(posture.released.snapshot.motionTimeMs).toBe(posture.held.snapshot.motionTimeMs); expect(posture.held.snapshot.pitchRadians).toBeGreaterThan(.2);
    const contact = await canvas(page).evaluate(() => (window as any).captureNative('fish')); await info.attach('fish-mobile-contact', { body: JSON.stringify(contact), contentType: 'application/json' }); expectContact(contact, 'fish'); expect(contact.after.reducedMotion).toBe(true);
    const held = await canvas(page).evaluate((c: any) => { const w = window as any; const state = w.toCarryAge(240); w.renderDepth(); c._rhCommand('pause'); return state; }); expectMaterials(held, 1); held.materials.forEach((entry: any) => expect(entry.version).toBe(entry.original.version));
    const native = await depthProof(page, info, 'fish-mobile-native', false), study = await studyProof(page, info, 'fish-mobile');
    const versionBaseline = await canvas(page).evaluate((c: any) => { c._rhCommand('pause'); return (window as any).readMaterials(); });
    const samples = await canvas(page).evaluate(() => { const w = window as any; return [900, 950, 1000, 1050, 1099].map(age => w.toCarryAge(age)); });
    expect(samples.map((state: any) => state.ageMs)).toEqual([900, 950, 1000, 1050, 1099]); samples.forEach((state: any) => { expectMaterials(state, 1); state.materials.forEach((entry: any, i: number) => expect(entry.version).toBe(versionBaseline[i].version)); });
    const release = await expired(page);
    await info.attach('fish-mobile-lifecycle', { body: JSON.stringify({ source: launchHashes, posture, contact, held, native, study, versionBaseline, samples, release }), contentType: 'application/json' });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
