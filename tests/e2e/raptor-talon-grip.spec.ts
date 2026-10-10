import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = process.env.RAPTOR_TALON_GRIP_SCREENSHOTS || resolve(process.cwd(), 'scratch/raptor-talon-grip');
const boundPaths = [
  'stem_lab/stem_tool_raptorhunt.js',
  'desktop/web-app/public/stem_lab/stem_tool_raptorhunt.js',
  'tests/stem_raptor_talon_grip.test.js',
  'tests/e2e/raptor-talon-grip.spec.ts',
  'tests/fixtures/raptor-talon-grip-before.cjs',
];
const hashes = () => Object.fromEntries(boundPaths.map(path => [path, createHash('sha256').update(readFileSync(resolve(process.cwd(), path))).digest('hex')]));
const probes = `window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.gripScene=scene;window.gripCamera=camera;window.gripRenderer=r;if(window.skipGripRender)return;return render(scene,camera);};return r;};})();`;
const canvas = (page: Page) => page.locator('[data-raptor-canvas]');
const errors = new WeakMap<Page, string[]>();
let launchHashes: Record<string, string>;

test.describe('Raptor talon grip in the production capture lifecycle', () => {
  test.describe.configure({ mode: 'default', timeout: 300000 });
  const harness = new GlHarness({ toolFile: boundPaths[0], toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  test.beforeAll(async () => {
    expect(process.env.STEM_GL_SUBSTITUTE || '').toBe('');
    mkdirSync(output, { recursive: true });
    launchHashes = hashes();
    expect(launchHashes[boundPaths[0]]).toBe(launchHashes[boundPaths[1]]);
    await harness.start();
  });
  test.afterAll(async () => {
    await harness.stop();
    expect(hashes()).toEqual(launchHashes);
  });
  test.beforeEach(async ({ page }) => {
    const entries: string[] = []; errors.set(page, entries);
    page.on('pageerror', error => entries.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /shader|THREE\.WebGL|WebGLProgram|INVALID_OPERATION/i.test(message.text())) entries.push(message.text()); });
    await page.setViewportSize({ width: 960, height: 1100 });
    await page.addInitScript(() => {
      let time = 1000, id = 0, seed = 731;
      const frames = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      performance.now = () => time;
      window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
      window.cancelAnimationFrame = key => { frames.delete(key); };
      const w = window as any;
      w.stepGrip = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
      w.advanceGrip = (ms: number) => { while (ms > 0) { const step = Math.min(ms, 40); w.stepGrip(step); ms -= step; } };
    });
  });
  test.afterEach(async ({ page }, info) => {
    await info.attach('talon-grip-source-binding', { body: JSON.stringify({ launch: launchHashes, completion: hashes(), unchanged: JSON.stringify(hashes()) === JSON.stringify(launchHashes) }), contentType: 'application/json' });
    expect(hashes()).toEqual(launchHashes);
    const caughtErrors = errors.get(page) || [];
    await harness.destroy(page);
    expect(caughtErrors).toEqual([]);
  });

  async function renderingSizing(page: Page) {
    return canvas(page).evaluate((c: any) => {
      const w = window as any, T = w.THREE, r = w.gripRenderer, gl = r.getContext(), camera = w.gripCamera, rect = c.getBoundingClientRect(), snapshot = c._rhSnapshot();
      const finiteValues = [...camera.position.toArray(), ...camera.quaternion.toArray(), ...camera.projectionMatrix.elements, ...camera.matrixWorld.elements, camera.fov, camera.aspect, camera.near, camera.far];
      return { rendererIsCurrentCanvas: r.domElement === c, rendererCanvasConnected: r.domElement.isConnected, currentCanvasConnected: c.isConnected,
        canvasClient: [c.clientWidth, c.clientHeight], canvasRect: [rect.width, rect.height], canvasAttributes: [c.width, c.height], rendererCanvasAttributes: [r.domElement.width, r.domElement.height], viewport: [innerWidth, innerHeight],
        rendererSize: r.getSize(new T.Vector2()).toArray(), drawingBufferSize: r.getDrawingBufferSize(new T.Vector2()).toArray(), glDrawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        pixelRatio: r.getPixelRatio(), contextLost: gl.isContextLost(), glError: gl.getError(), glViewport: Array.from(gl.getParameter(gl.VIEWPORT)), glScissor: Array.from(gl.getParameter(gl.SCISSOR_BOX)),
        rendererViewport: r.getViewport(new T.Vector4()).toArray(), rendererScissor: r.getScissor(new T.Vector4()).toArray(), scissorEnabled: gl.isEnabled(gl.SCISSOR_TEST), framebufferUnbound: gl.getParameter(gl.FRAMEBUFFER_BINDING) === null,
        camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), aspect: camera.aspect, fov: camera.fov, near: camera.near, far: camera.far, finite: finiteValues.every(Number.isFinite),
          matchesProductionSnapshot: JSON.stringify(camera.position.toArray()) === JSON.stringify(snapshot.cameraPosition) && JSON.stringify(camera.quaternion.toArray()) === JSON.stringify(snapshot.cameraQuaternion) },
        motionTimeMs: snapshot.motionTimeMs, carriedPreyMs: snapshot.carriedPreyMs };
    });
  }
  async function settleMobileRendering(page: Page, info: TestInfo, label: string) {
    const before = await renderingSizing(page);
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    const afterWindowResize = await renderingSizing(page);
    await info.attach(label + '-resize-before-after', { body: JSON.stringify({ before, afterWindowResize, explicitProductionWindowResize: true }), contentType: 'application/json' });
    let sourceStepCycles = 0;
    await expect.poll(async () => {
      // Separate page calls yield to the browser event loop so the production
      // ResizeObserver sees settled layout while the test owns manual RAF time.
      await page.evaluate(() => { (window as any).skipGripRender = true; window.dispatchEvent(new Event('resize')); });
      if (sourceStepCycles < 20) { await canvas(page).evaluate(() => (window as any).stepGrip(25)); sourceStepCycles++; }
      const state = await renderingSizing(page), [width, height] = state.canvasClient;
      return state.rendererIsCurrentCanvas && state.rendererCanvasConnected && state.currentCanvasConnected && width > 0 && height > 0 && state.rendererSize[0] === width && state.rendererSize[1] === height &&
        state.canvasAttributes[0] === width && state.canvasAttributes[1] === height && state.glDrawingBuffer[0] === width && state.glDrawingBuffer[1] === height &&
        state.drawingBufferSize[0] === width && state.drawingBufferSize[1] === height && Math.abs(state.camera.aspect - width / height) < 1e-8 && !state.contextLost;
    }, { timeout: 30000 }).toBe(true);
    // Draw one real source frame after resize settling; no renderer/camera setter is used.
    await canvas(page).evaluate(() => { const w = window as any; w.skipGripRender = false; w.stepGrip(25); });
    const settled = await renderingSizing(page), proof = { before, afterWindowResize, settled, sourceStepCycles, manualStepMs: 25, productionResizeOnly: true, separatePageCallsYieldEventLoop: true };
    await info.attach(label + '-settled-rendering', { body: JSON.stringify(proof), contentType: 'application/json' });
    expect(settled.viewport).toEqual([360, 1100]); expect(settled.pixelRatio).toBe(1);
    expect(settled.rendererIsCurrentCanvas).toBe(true); expect(settled.rendererCanvasConnected).toBe(true); expect(settled.currentCanvasConnected).toBe(true);
    expect(settled.canvasClient[0]).toBeGreaterThan(0); expect(settled.canvasClient[0]).toBeLessThanOrEqual(320);
    for (const size of [settled.rendererSize, settled.drawingBufferSize, settled.glDrawingBuffer, settled.canvasAttributes]) expect(size).toEqual(settled.canvasClient);
    expect(settled.glViewport).toEqual([0, 0, ...settled.canvasClient]); expect(settled.contextLost).toBe(false); expect(settled.glError).toBe(0);
    expect(settled.scissorEnabled).toBe(false); expect(settled.framebufferUnbound).toBe(true); expect(settled.camera.finite).toBe(true); expect(settled.camera.matchesProductionSnapshot).toBe(true);
    expect(settled.camera.aspect).toBeCloseTo(settled.canvasClient[0] / settled.canvasClient[1], 8);
    return proof;
  }
  async function mount(page: Page, species: string, mobile = false, info?: TestInfo) {
    if (mobile) { await page.setViewportSize({ width: 360, height: 1100 }); await page.emulateMedia({ reducedMotion: 'reduce' }); }
    await harness.mount(page, { raptorHunt: {
      activeSection: 'hunt', selectedSpecies: species, activeMission: 'open',
      flightSession: { speciesId: species, missionId: 'open' }, huntTutorialDismissed: true,
      graphicsQuality: 'low', focusSlowmo: false,
    } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if (mobile) {
      await page.addStyleTag({ content: '#wrap{width:320px}' });
      await canvas(page).evaluate((c: any) => c._rhCommand('environment', { windSpeed: 0, dayPhase: .44, cloudCover: .15 }));
      await settleMobileRendering(page, info!, 'osprey-pre-census');
    }
    await canvas(page).evaluate((c: any, mobile: boolean) => {
      const w = window as any, T = w.THREE;
      c.dataset.raptorFocusSlowmo = 'false';
      if (!mobile) c._rhCommand('environment', { windSpeed: 0, dayPhase: .44, cloudCover: .15 });
      w.feet = ['left-raptor-foot', 'right-raptor-foot'].map(name => w.gripScene.getObjectByName(name));
      w.nativePrey = () => w.gripScene.children.filter((o: any) => o.children.some((child: any) => child.name.startsWith('prey-')));
      w.cameraState = () => ({ position: w.gripCamera.position.toArray(), quaternion: w.gripCamera.quaternion.toArray(), fov: w.gripCamera.fov, aspect: w.gripCamera.aspect });
      w.renderGrip = () => { w.gripScene.updateMatrixWorld(true); w.gripCamera.updateMatrixWorld(true); w.skipGripRender = false; w.gripRenderer.render(w.gripScene, w.gripCamera); };
      const isRendererAlias = (name: string) => /^morph(Target|Normal)[0-7]$/.test(name);
      w.footOwners = w.feet.map((foot: any) => ({ mesh: foot, geometry: foot.geometry, material: foot.material, weights: foot.morphTargetInfluences }));
      w.footOwnership = () => w.feet.map((foot: any, i: number) => { const before = w.footOwners[i]; return { name: foot.name, meshUuid: foot.uuid, geometryUuid: foot.geometry.uuid, materialUuid: foot.material.uuid,
        meshIdentity: foot === before.mesh, geometryIdentity: foot.geometry === before.geometry, materialIdentity: foot.material === before.material,
        weightsIdentity: foot.morphTargetInfluences === before.weights, sceneOwnerIdentity: w.gripScene.getObjectByName(foot.name) === foot }; });
      w.footAttributes = () => w.feet.flatMap((foot: any) => {
        const g = foot.geometry, attrs: any[] = [{ name: foot.name + '/index', attribute: g.index }];
        // Three r128 binds sorted active morphs into morphTargetN/morphNormalN
        // aliases during render. Their authored target buffers remain immutable.
        Object.entries(g.attributes).forEach(([name, attribute]) => { if (!isRendererAlias(name)) attrs.push({ name: foot.name + '/' + name, attribute }); });
        Object.entries(g.morphAttributes).forEach(([name, targets]: any) => targets.forEach((attribute: any, i: number) => attrs.push({ name: foot.name + '/morph/' + name + '/' + i, attribute })));
        return attrs;
      });
      w.footRendererAliases = () => w.feet.flatMap((foot: any) => Object.entries(foot.geometry.attributes).filter(([name]) => isRendererAlias(name)).map(([name, attribute]: any) => {
        const match = name.match(/^morph(Target|Normal)([0-7])$/), kind = match[1] === 'Target' ? 'position' : 'normal', targets = foot.geometry.morphAttributes[kind], targetIndex = targets.indexOf(attribute);
        return { foot: foot.name, name, kind, slot: Number(match[2]), targetIndex, ownedTargetReference: targetIndex >= 0 && attribute.array === targets[targetIndex].array, version: attribute.version,
          targetInfluence: targetIndex >= 0 ? foot.morphTargetInfluences[targetIndex] : null };
      }));
      w.footBuffers = w.footAttributes().map((entry: any) => ({ ...entry, array: entry.attribute.array, version: entry.attribute.version, bytes: new Uint8Array(entry.attribute.array.buffer, entry.attribute.array.byteOffset, entry.attribute.array.byteLength).slice() }));
      w.sameFootBuffers = () => {
        const now = w.footAttributes();
        const owned = w.feet.every((foot: any, i: number) => { const before = w.footOwners[i]; return foot === before.mesh && foot.geometry === before.geometry && foot.material === before.material && foot.morphTargetInfluences === before.weights && w.gripScene.getObjectByName(foot.name) === foot; });
        return owned && now.length === w.footBuffers.length && now.every((entry: any, i: number) => {
          const before = w.footBuffers[i], a = entry.attribute, bytes = new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength);
          return entry.name === before.name && a === before.attribute && a.array === before.array && a.version === before.version && bytes.length === before.bytes.length && bytes.every((v: number, j: number) => v === before.bytes[j]);
        });
      };
      w.readFeet = () => ({ snapshot: c._rhSnapshot(), weights: w.feet.map((f: any) => f.morphTargetInfluences.slice()),
        targets: w.feet.map((f: any) => f.geometry.morphAttributes.position.map((a: any) => a.name)),
        identities: w.feet.map((f: any) => ({ mesh: f.uuid, geometry: f.geometry.uuid, material: f.material.uuid })), ownedAttributeCount: w.footAttributes().length,
        footOwnership: w.footOwnership(), rendererAliases: w.footRendererAliases(), sameBuffers: w.sameFootBuffers() });
      w.catchNativePrey = () => {
        const before = c._rhSnapshot(), p = before.raptorPosition, h = before.headingRadians, pitch = before.pitchRadians, roots = w.nativePrey(), chosen = roots[0];
        if (!chosen) throw new Error('No actual native prey remains to catch');
        const uuid = chosen.uuid, fromWorld = chosen.getWorldPosition(new T.Vector3()).toArray(), cameraBefore = JSON.stringify(w.cameraState()), orientationBefore = JSON.stringify(chosen.quaternion.toArray());
        // Controlled root placement uses a real native prey/model. It changes only
        // world position; flight camera, orientation, buffers and catch resolver remain real.
        roots.forEach((root: any, i: number) => root.position.set(root === chosen ? p.x + Math.sin(h) * Math.cos(pitch) * 3 : 2000 + i * 20,
          root === chosen ? p.y + Math.sin(pitch) * 3 : 2000, root === chosen ? p.z - Math.cos(h) * Math.cos(pitch) * 3 : 2000));
        chosen.updateWorldMatrix(true, true);
        const placement = { fromWorld, toWorld: chosen.getWorldPosition(new T.Vector3()).toArray(), raptorPosition: p, headingRadians: h, pitchRadians: pitch, forwardMeters: 3,
          cameraPreserved: cameraBefore === JSON.stringify(w.cameraState()), orientationPreserved: orientationBefore === JSON.stringify(chosen.quaternion.toArray()), nativeModelUuid: uuid };
        c._rhCommand('strike');
        const root = w.gripScene.getObjectByName('raptor-carried-prey');
        return { before, after: c._rhSnapshot(), placement, chosenUuid: uuid, carriedUuid: root?.uuid, parent: root?.parent?.name, feet: w.readFeet() };
      };
      w.watchCarry = () => {
        const root = w.gripScene.getObjectByName('raptor-carried-prey'), resources = new Set<any>(), counts: any[] = [];
        root.traverse((o: any) => { if (o.geometry) resources.add(o.geometry); (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m: any) => resources.add(m)); });
        resources.forEach(resource => { const entry = { kind: resource.isMaterial ? 'material' : 'geometry', count: 0 }; resource.addEventListener('dispose', () => entry.count++); counts.push(entry); });
        const watch = { root, counts }; w.carryWatches = w.carryWatches || []; w.carryWatches.push(watch); return { uuid: root.uuid, resources: counts.length };
      };
      w.footResourceDisposals = 0;
      new Set(w.feet.flatMap((f: any) => [f.geometry, f.material])).forEach((r: any) => r.addEventListener('dispose', () => w.footResourceDisposals++));
      w.skipGripRender = true; for (let i = 0; i < 4; i++) w.stepGrip(25); w.renderGrip();
      w.projectFeet = () => {
        const rect = c.getBoundingClientRect(), points: any[] = [];
        w.gripScene.updateMatrixWorld(true); w.gripCamera.updateMatrixWorld(true);
        w.feet.forEach((foot: any) => { const g = foot.geometry, p = g.attributes.position, targets = g.morphAttributes.position, weights = foot.morphTargetInfluences;
          for (let i = 0; i < p.count; i++) { const base = new T.Vector3().fromBufferAttribute(p, i), v = base.clone(); targets.forEach((q: any, j: number) => v.addScaledVector(new T.Vector3().fromBufferAttribute(q, i).sub(base), weights[j] || 0));
            const ndc = v.applyMatrix4(foot.matrixWorld).project(w.gripCamera); points.push({ x: (ndc.x + 1) * rect.width / 2, y: (1 - ndc.y) * rect.height / 2, z: ndc.z }); }
        });
        const bounds = { vertices: points.length, minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y)), insideDepth: points.every(p => p.z > -1 && p.z < 1) };
        const selector = '.rh-flight-coach,.rh-flight-mission-hud,.rh-flight-telemetry-strip,.rh-flight-lock-meters,.rh-flight-target-cue,.rh-flight-state,.rh-flight-wind,.rh-flight-heading,.rh-flight-attitude,.rh-flight-altitude-gauge,.rh-flight-key-guide,.rh-scenic-toggle,.rh-practice-toggle';
        const overlays = Array.from(c.closest('[data-raptor-flight-stage]').querySelectorAll(selector)).map((el: any) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el);
          return { className: el.className, minX: r.left - rect.left, maxX: r.right - rect.left, minY: r.top - rect.top, maxY: r.bottom - rect.top, visible: r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0, pointerEvents: s.pointerEvents }; }).filter((o: any) => o.visible).map((o: any) => ({ ...o,
          footOverlapArea: Math.max(0, Math.min(bounds.maxX, o.maxX) - Math.max(bounds.minX, o.minX)) * Math.max(0, Math.min(bounds.maxY, o.maxY) - Math.max(bounds.minY, o.minY)) }));
        return { coordinateSpace: 'canvas CSS pixels', canvasSize: [rect.width, rect.height], bounds, overlays, viewport: [innerWidth, innerHeight], rendererSize: [w.gripRenderer.domElement.width, w.gripRenderer.domElement.height] };
      };
      w.nativeGripPixels = () => {
        const r = w.gripRenderer, scene = w.gripScene, camera = w.gripCamera, originalCamera = JSON.stringify(w.cameraState()), weights = w.feet.map((f: any) => f.morphTargetInfluences.slice()), visibility = w.feet.map((f: any) => f.visible);
        const gl = r.getContext(), width = gl.drawingBufferWidth, height = gl.drawingBufferHeight, shadowAutoUpdate = r.shadowMap.autoUpdate, shadowNeedsUpdate = r.shadowMap.needsUpdate;
        const take = () => { r.render(scene, camera); const pixels = new Uint8Array(width * height * 4); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels; };
        w.skipGripRender = false; scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
        let production: Uint8Array, repeat: Uint8Array, open: Uint8Array, hidden: Uint8Array, productionAliases: any[], openAliases: any[];
        try {
          production = take(); productionAliases = w.footRendererAliases();
          // Freeze the production shadow map: the comparison must prove visible
          // foot surfaces, rather than changes only to their cast shadows.
          r.shadowMap.autoUpdate = false; r.shadowMap.needsUpdate = false; repeat = take();
          w.feet.forEach((foot: any, i: number) => { foot.morphTargetInfluences[0] = weights[i][0] + weights[i][1]; foot.morphTargetInfluences[1] = 0; }); open = take(); openAliases = w.footRendererAliases();
          w.feet.forEach((foot: any, i: number) => { weights[i].forEach((v: number, j: number) => foot.morphTargetInfluences[j] = v); foot.visible = false; }); hidden = take();
        } finally { w.feet.forEach((foot: any, i: number) => { weights[i].forEach((v: number, j: number) => foot.morphTargetInfluences[j] = v); foot.visible = visibility[i]; }); r.shadowMap.autoUpdate = shadowAutoUpdate; r.shadowMap.needsUpdate = shadowNeedsUpdate; take(); }
        const difference = (a: Uint8Array, b: Uint8Array) => { let count = 0; for (let i = 0; i < a.length; i += 4) if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 3) count++; return count; };
        return { gripPixels: difference(production!, open!), visibleFootPixels: difference(production!, hidden!), repeatNoisePixels: difference(production!, repeat!), width, height,
          productionWeights: weights, restoredWeights: w.feet.map((f: any) => f.morphTargetInfluences.slice()), ownedAttributeCount: w.footAttributes().length, ownedAttributeNames: w.footAttributes().map((entry: any) => entry.name), footOwnership: w.footOwnership(),
          rendererAliases: { production: productionAliases!, open: openAliases!, restored: w.footRendererAliases() },
          shadowsFrozenForComparison: true, normalCamera: true, cameraUnchanged: originalCamera === JSON.stringify(w.cameraState()), sameBuffers: w.sameFootBuffers(), framing: w.projectFeet() };
      };
    }, mobile);
  }

  function expectFeet(state: any, grip: number) {
    expect(state.snapshot.talonGrip).toBeCloseTo(grip, 8);
    expect(state.snapshot.footGrip).toBeCloseTo(grip, 8);
    expect(state.snapshot.footExtension).toBeCloseTo(1, 8);
    expect(state.targets).toEqual([['extended-feet', 'gripping-feet'], ['extended-feet', 'gripping-feet']]);
    for (const weights of state.weights) { expect(weights[0]).toBeCloseTo(1 - grip, 8); expect(weights[1]).toBeCloseTo(grip, 8); }
    expect(state.ownedAttributeCount).toBe(18);
    state.footOwnership.forEach((owner: any) => { for (const field of ['meshIdentity', 'geometryIdentity', 'materialIdentity', 'weightsIdentity', 'sceneOwnerIdentity']) expect(owner[field], owner.name + '/' + field).toBe(true); });
    state.rendererAliases.forEach((alias: any) => { expect(alias.ownedTargetReference).toBe(true); expect(alias.targetIndex).toBeGreaterThanOrEqual(0); expect(alias.targetIndex).toBeLessThanOrEqual(1); });
    expect(state.sameBuffers).toBe(true);
  }
  function expectPlacement(caught: any) {
    const p = caught.placement, h = p.headingRadians, pitch = p.pitchRadians, r = p.raptorPosition;
    expect(p.cameraPreserved).toBe(true); expect(p.orientationPreserved).toBe(true); expect(p.forwardMeters).toBe(3);
    expect(p.nativeModelUuid).toBe(caught.chosenUuid);
    const expected = [r.x + Math.sin(h) * Math.cos(pitch) * 3, r.y + Math.sin(pitch) * 3, r.z - Math.cos(h) * Math.cos(pitch) * 3];
    p.toWorld.forEach((v: number, i: number) => expect(v).toBeCloseTo(expected[i], 8));
  }
  async function nativeProof(page: Page, info: TestInfo, label: string) {
    const proof = await canvas(page).evaluate(() => (window as any).nativeGripPixels());
    await info.attach(label + '-native-grip-proof', { body: JSON.stringify(proof), contentType: 'application/json' });
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: resolve(output, label + '-native-catch.png'), timeout: 90000 });
    expect(proof.normalCamera).toBe(true); expect(proof.cameraUnchanged).toBe(true); expect(proof.sameBuffers).toBe(true); expect(proof.restoredWeights).toEqual(proof.productionWeights);
    expect(proof.ownedAttributeCount).toBe(18);
    expect(proof.ownedAttributeNames).toHaveLength(18);
    proof.footOwnership.forEach((owner: any) => { for (const field of ['meshIdentity', 'geometryIdentity', 'materialIdentity', 'weightsIdentity', 'sceneOwnerIdentity']) expect(owner[field], owner.name + '/' + field).toBe(true); });
    for (const [phase, targetIndex] of [['production', 1], ['open', 0], ['restored', 1]] as const) {
      expect(proof.rendererAliases[phase]).toHaveLength(4);
      proof.rendererAliases[phase].forEach((alias: any) => { expect(alias.ownedTargetReference).toBe(true); expect(alias.targetIndex).toBe(targetIndex); expect(alias.slot).toBe(0); expect(alias.targetInfluence).toBe(1); });
    }
    expect(proof.gripPixels).toBeGreaterThan(Math.max(2, proof.repeatNoisePixels * 5 + 2));
    expect(proof.visibleFootPixels).toBeGreaterThan(Math.max(8, proof.repeatNoisePixels * 5 + 8));
    const { framing } = proof;
    expect(framing.bounds.insideDepth).toBe(true); expect(framing.bounds.vertices).toBe(1476);
    expect(framing.bounds.minX).toBeGreaterThanOrEqual(0); expect(framing.bounds.minY).toBeGreaterThanOrEqual(0);
    expect(framing.bounds.maxX).toBeLessThanOrEqual(framing.canvasSize[0]); expect(framing.bounds.maxY).toBeLessThanOrEqual(framing.canvasSize[1]);
    expect(framing.overlays.length).toBeGreaterThan(3);
    for (const overlay of framing.overlays) expect(overlay.footOverlapArea, overlay.className + ' foot occlusion').toBe(0);
    return proof;
  }

  test('eases a live peregrine catch into grip, retains foot buffers and clears each carried animal once', async ({ page }, info) => {
    await mount(page, 'peregrine');
    const initial = await canvas(page).evaluate((c: any) => {
      const w = window as any, caught = w.catchNativePrey(), watch = w.watchCarry(); return { caught, watch, time: c._rhSnapshot().motionTimeMs };
    });
    await info.attach('peregrine-first-contact', { body: JSON.stringify(initial), contentType: 'application/json' });
    expect(initial.caught.after.missionCatches - initial.caught.before.missionCatches).toBe(1);
    expect(initial.caught.carriedUuid).toBe(initial.caught.chosenUuid); expect(initial.caught.parent).toBe('raptor-feet');
    expectPlacement(initial.caught);
    expectFeet(initial.caught.feet, 0);
    const samples = await canvas(page).evaluate((c: any) => {
      const w = window as any, start = c._rhSnapshot().motionTimeMs, values: any[] = []; w.skipGripRender = true;
      for (let i = 0; i < 4; i++) { w.stepGrip(40); values.push({ age: c._rhSnapshot().motionTimeMs - start, feet: w.readFeet() }); }
      w.renderGrip(); return values;
    });
    for (const sample of samples) expectFeet(sample.feet, 1 - Math.pow(1 - Math.min(1, sample.age / 160), 3));
    expect(samples.map((s: any) => s.age)).toEqual([40, 80, 120, 160]); expectFeet(samples[3].feet, 1);
    const native = await nativeProof(page, info, 'peregrine-day-desktop');
    const paused = await canvas(page).evaluate((c: any) => {
      const w = window as any; c._rhCommand('pause'); const before = w.readFeet(); w.stepGrip(60000); return { before, after: w.readFeet(), sameBuffers: w.sameFootBuffers() };
    });
    expectFeet(paused.before, 1); expectFeet(paused.after, 1); expect(paused.after.snapshot.motionTimeMs).toBe(paused.before.snapshot.motionTimeMs); expect(paused.after.weights).toEqual(paused.before.weights);
    const replacement = await canvas(page).evaluate((c: any) => {
      const w = window as any; c._rhCommand('pause'); w.skipGripRender = true; w.advanceGrip(320);
      const caught = w.catchNativePrey(), watch = w.watchCarry(), disposedOld = w.carryWatches[0].counts.slice();
      // A pause during the fresh easing response must show an immediate secure grip.
      w.stepGrip(40); const partial = w.readFeet(); c._rhCommand('pause'); const held = w.readFeet();
      w.stepGrip(60000); const frozen = w.readFeet(); c._rhCommand('pause'); w.stepGrip(40); const resumed = w.readFeet();
      return { caught, watch, disposedOld, partial, held, frozen, resumed, footResourceDisposals: w.footResourceDisposals };
    });
    expect(replacement.caught.after.missionCatches - replacement.caught.before.missionCatches).toBe(1);
    expectPlacement(replacement.caught);
    expect(replacement.watch.uuid).not.toBe(initial.watch.uuid); expectFeet(replacement.caught.feet, 0);
    expect(replacement.partial.snapshot.talonGrip).toBeGreaterThan(0); expect(replacement.partial.snapshot.talonGrip).toBeLessThan(1);
    for (const state of [replacement.held, replacement.frozen, replacement.resumed]) expectFeet(state, 1);
    expect(replacement.frozen.snapshot.motionTimeMs).toBe(replacement.held.snapshot.motionTimeMs);
    expect(replacement.disposedOld).toHaveLength(initial.watch.resources); replacement.disposedOld.forEach((entry: any) => expect(entry.count).toBe(1));
    expect(replacement.footResourceDisposals).toBe(0);
    const expired = await canvas(page).evaluate((c: any) => {
      const w = window as any; w.skipGripRender = true; w.advanceGrip(1200);
      return { snapshot: c._rhSnapshot(), sameBuffers: w.sameFootBuffers(), watches: w.carryWatches.map((watch: any) => ({ attached: !!watch.root.parent, counts: watch.counts })), footResourceDisposals: w.footResourceDisposals, weights: w.feet.map((f: any) => f.morphTargetInfluences.slice()) };
    });
    expect(expired.snapshot.carriedPreyMs).toBe(0); expect(expired.snapshot.talonGrip).toBe(0); expect(expired.snapshot.footGrip).toBe(0);
    expect(expired.sameBuffers).toBe(true); expect(expired.footResourceDisposals).toBe(0); expired.weights.forEach((weights: number[]) => expect(weights[1]).toBe(0));
    expired.watches.forEach((watch: any) => { expect(watch.attached).toBe(false); watch.counts.forEach((entry: any) => expect(entry.count).toBe(1)); });
    await info.attach('peregrine-grip-lifecycle', { body: JSON.stringify({ source: launchHashes, initial, samples, native, paused, replacement, expired }), contentType: 'application/json' });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('holds an actual osprey catch immediately in narrow mobile reduced motion with opposed toes', async ({ page }, info) => {
    await mount(page, 'osprey', true, info);
    const posture = await canvas(page).evaluate((c: any) => {
      const w = window as any, keys = [' ', 'a'], durationMs = 800, source = 'talon-grip-mobile-fixed-posture';
      const read = () => ({ snapshot: c._rhSnapshot(), camera: w.cameraState(), modelRotationRadians: w.feet[0].parent.parent.rotation.toArray().slice(0, 3), modelQuaternion: w.feet[0].parent.parent.quaternion.toArray() });
      const before = read(); let held: ReturnType<typeof read>;
      try {
        keys.forEach(key => c._rhCommand('hold', { key, pressed: true, source }));
        w.skipGripRender = true; w.advanceGrip(durationMs); w.renderGrip(); held = read();
      } finally { keys.forEach(key => c._rhCommand('hold', { key, pressed: false, source })); }
      const released = read();
      return { before, held: held!, released, publicCommand: 'hold', keys, durationMs, elapsedMotionMs: held!.snapshot.motionTimeMs - before.snapshot.motionTimeMs,
        releasedBeforeCatch: true, sourceControlledPostureAndCamera: true, choice: 'Fixed pre-catch climbing left turn; source pitch lowers the chase camera toward the underside while essential bank remains active in reduced motion.' };
    });
    await info.attach('osprey-fixed-public-flight-posture', { body: JSON.stringify(posture), contentType: 'application/json' });
    expect(posture.elapsedMotionMs).toBeCloseTo(800, 6); expect(posture.released.snapshot.motionTimeMs).toBe(posture.held.snapshot.motionTimeMs);
    expect(posture.held.snapshot.pitchRadians).toBeGreaterThan(.2); expect(Math.abs(posture.held.modelRotationRadians[2])).toBeGreaterThan(.05);
    expect(Math.abs(posture.held.modelRotationRadians[2])).toBeLessThanOrEqual(.32000001);
    expect(posture.held.modelRotationRadians[0]).toBeCloseTo(-posture.held.snapshot.pitchRadians * .6, 8);
    const capture = await canvas(page).evaluate((c: any) => {
      const w = window as any, caught = w.catchNativePrey(), watch = w.watchCarry(); w.renderGrip();
      return { caught, watch, forwardToes: w.feet.map((f: any) => f.geometry.userData.forwardToes), rearToes: w.feet.map((f: any) => f.geometry.userData.rearToes), state: w.readFeet(),
        caughtPosture: { snapshot: c._rhSnapshot(), camera: w.cameraState(), modelRotationRadians: w.feet[0].parent.parent.rotation.toArray().slice(0, 3), modelQuaternion: w.feet[0].parent.parent.quaternion.toArray() } };
    });
    await info.attach('osprey-native-contact', { body: JSON.stringify(capture), contentType: 'application/json' });
    expect(capture.caught.after.reducedMotion).toBe(true); expect(capture.caught.after.missionCatches - capture.caught.before.missionCatches).toBe(1);
    expect(capture.caught.carriedUuid).toBe(capture.caught.chosenUuid); expect(capture.forwardToes).toEqual([2, 2]); expect(capture.rearToes).toEqual([2, 2]);
    expectPlacement(capture.caught);
    expectFeet(capture.caught.feet, 1); expectFeet(capture.state, 1);
    const rendering = await settleMobileRendering(page, info, 'osprey-post-catch');
    expectFeet(await canvas(page).evaluate(() => (window as any).readFeet()), 1);
    expect(rendering.settled.carriedPreyMs).toBeGreaterThan(0);
    const native = await nativeProof(page, info, 'osprey-day-mobile-reduced');
    expect(native.framing.viewport).toEqual([360, 1100]); expect(native.framing.canvasSize[0]).toBeLessThanOrEqual(320);
    expect(native.framing.rendererSize[0]).toBe(native.framing.canvasSize[0]); expect(native.framing.rendererSize[1]).toBe(native.framing.canvasSize[1]);
    const paused = await canvas(page).evaluate((c: any) => {
      const w = window as any; c._rhCommand('pause'); const before = w.readFeet(); w.stepGrip(60000); return { before, after: w.readFeet() };
    });
    expectFeet(paused.after, 1); expect(paused.after.snapshot.motionTimeMs).toBe(paused.before.snapshot.motionTimeMs);
    // A separate study view offers a close-up; native GPU evidence above retains the flight camera.
    await page.locator('[data-raptor-study-button]').click();
    await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('feet');
    const study = await canvas(page).evaluate(() => (window as any).readFeet()); expectFeet(study, 1);
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: resolve(output, 'osprey-mobile-gripped-study.png'), timeout: 90000 });
    const opened = await canvas(page).evaluate(() => {
      const w = window as any, saved = w.feet.map((f: any) => f.morphTargetInfluences.slice());
      w.feet.forEach((foot: any, i: number) => { foot.morphTargetInfluences[0] = saved[i][0] + saved[i][1]; foot.morphTargetInfluences[1] = 0; });
      // Repaint through the real paused study path so studio background, lights,
      // scene visibility and camera are identical in both close-up screenshots.
      document.querySelector('.rh-study-inspect select')!.dispatchEvent(new Event('change', { bubbles: true })); return saved;
    });
    try { await page.locator('[data-raptor-flight-stage]').screenshot({ path: resolve(output, 'osprey-mobile-open-study-comparison.png'), timeout: 90000 }); }
    finally { await canvas(page).evaluate((_: any, saved: number[][]) => { const w = window as any; w.feet.forEach((foot: any, i: number) => saved[i].forEach((weight, j) => foot.morphTargetInfluences[j] = weight)); document.querySelector('.rh-study-inspect select')!.dispatchEvent(new Event('change', { bubbles: true })); }, opened); }
    expectFeet(await canvas(page).evaluate(() => (window as any).readFeet()), 1);
    await info.attach('osprey-mobile-grip-lifecycle', { body: JSON.stringify({ source: launchHashes, posture, capture, rendering, native, paused, study, studyComparison: { camera: 'separate production study view', openWeightsComparedAndRestored: true } }), contentType: 'application/json' });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
