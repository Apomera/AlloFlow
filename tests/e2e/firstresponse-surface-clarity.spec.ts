import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

const report = process.env.FIRST_RESPONSE_SURFACE_REPORT || 'reports/firstresponse-surface-clarity';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const metrics: Record<string, unknown>[] = [];
const errors = new WeakMap<Page, string[]>();
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `window.__surfaceDraws = new WeakMap();
    var SurfaceRenderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = new Proxy(SurfaceRenderer,{ construct:function (target,args,newTarget) {
      var renderer = Reflect.construct(target,args,newTarget), render = renderer.render;
      renderer.render = function (scene,camera) {
        var result = render.apply(this,arguments);
        if (scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')) {
          var previous = window.__surfaceDraws.get(this.domElement);
          window.__surfaceDraws.set(this.domElement,{scene:scene,camera:camera,sequence:(previous ? previous.sequence : 0)+1});
        }
        return result;
      }; return renderer;
    }});
    window.__surfaceMaterials = function () {
      var canvas = document.querySelector('#wrap canvas'), drawn = canvas && window.__surfaceDraws.get(canvas), materials = [];
      if (!drawn) return materials;
      drawn.scene.getObjectByName('fr-depth-hands').traverse(function (mesh) {
        if (mesh.isMesh && mesh.material.name === 'fr-rescuer-skin' && materials.indexOf(mesh.material) < 0) materials.push(mesh.material);
      }); return materials;
    };
    window.__setSurfaceContour = function (value) {
      var materials = window.__surfaceMaterials();
      if (!materials.length || materials.some(function (m) { return !m.userData.frContourStrength; })) throw new Error('Compiled contrast contour controls are unavailable');
      materials.forEach(function (m) { m.userData.frContourStrength.value = value; });
      return materials.length;
    };
    window.__surfaceClarity = function () {
      var canvas = document.querySelector('#wrap canvas'), drawn = canvas && window.__surfaceDraws.get(canvas);
      var record = canvas && window.__glRecorder.forCanvas(canvas);
      if (!drawn || !record) return null;
      var scene = drawn.scene, camera = drawn.camera;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      function visible(object) { for (var p = object; p; p = p.parent) if (!p.visible) return false; return true; }
      function bounds(mesh,name) {
        var positions = mesh.geometry.attributes.position, min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
        var worldMin=min.slice(), worldMax=max.slice(), invalid=0, hash=2166136261;
        for (var i=0;i<positions.count;i++) {
          var world=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
          var point=world.clone().project(camera).toArray(), coords=world.toArray();
          if (!point.concat(coords).every(Number.isFinite)) invalid++;
          for (var axis=0;axis<3;axis++) {
            min[axis]=Math.min(min[axis],point[axis]);max[axis]=Math.max(max[axis],point[axis]);
            worldMin[axis]=Math.min(worldMin[axis],coords[axis]);worldMax[axis]=Math.max(worldMax[axis],coords[axis]);
          }
        }
        [positions.array,mesh.geometry.attributes.normal && mesh.geometry.attributes.normal.array,mesh.geometry.index && mesh.geometry.index.array]
          .filter(Boolean).forEach(function (array) {
            var bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);
            for(var j=0;j<bytes.length;j++)hash=Math.imul(hash^bytes[j],16777619);
          });
        return {name:name||mesh.name,min:min,max:max,worldMin:worldMin,worldMax:worldMax,vertices:positions.count,invalid:invalid,
          fingerprint:('00000000'+(hash>>>0).toString(16)).slice(-8),material:mesh.material.name,
          flat:mesh.material.type==='MeshBasicMaterial'};
      }
      var hands=[],surfaces=[],skinRegions=[],markers=[];
      ['lower','upper'].forEach(function (side) {
        var hand=scene.getObjectByName('fr-rescuer-'+side); if(!hand || !visible(hand))return;
        hands.push(side); var unnamed=0;
        hand.traverse(function (mesh) {
          if(!mesh.isMesh || !visible(mesh))return;
          var isSurface=/^fr-rescuer-(lower|upper)-(palm|heel|wrist-bridge|finger-[0-3]-surface|thumb-surface|nail-[0-3]|thumb-nail)$/.test(mesh.name);
          var isSkin=mesh.material.name==='fr-rescuer-skin';
          if(isSurface || isSkin) {
            var summary=bounds(mesh,mesh.name||hand.name+'-unnamed-skin-'+(++unnamed));
            if(isSurface)surfaces.push(summary);
            if(isSkin)skinRegions.push(summary);
          }
        });
      });
      ['fr-depth-marker','fr-depth-reference','fr-depth-resting-left','fr-depth-resting-right'].forEach(function (name) {
        var mesh=scene.getObjectByName(name);if(mesh && mesh.isMesh && visible(mesh))markers.push(bounds(mesh));
      });
      var heel=scene.getObjectByName('fr-rescuer-lower-heel'), center=heel.getWorldPosition(new THREE.Vector3());
      var hit=new THREE.Raycaster(new THREE.Vector3(center.x,center.y+2,center.z),new THREE.Vector3(0,-1,0))
        .intersectObject(scene.getObjectByName('fr-manikin-torso'),false)[0];
      var heelBox=new THREE.Box3().setFromObject(heel);
      return {hands:hands,surfaces:surfaces,skinRegions:skinRegions,markers:markers,
        contactGap:hit?heelBox.min.y-hit.point.y:null,
        marker:scene.getObjectByName('fr-depth-marker').getWorldPosition(new THREE.Vector3()).toArray(),
        materials:window.__surfaceMaterials().map(function(m){return{name:m.name,type:m.type,color:m.color.toArray(),
          specular:m.specular?m.specular.toArray():null,contour:m.userData.frContourStrength?m.userData.frContourStrength.value:null,
          depthTest:m.depthTest,depthWrite:m.depthWrite,transparent:m.transparent};}),
        camera:{position:camera.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice()},
        canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],
        draw:{id:record.id,draws:record.draws,sequence:drawn.sequence,createdBy:record.createdBy},
        state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),errors:window.__events.errors.slice()};
    };`,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 420000 });
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { writeFileSync(report + '/surface-metrics.json', JSON.stringify(metrics, null, 2)); await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const found: string[] = []; errors.set(page, found);
  page.on('pageerror', error => found.push('page: ' + error.message));
  page.on('console', message => { if (message.type() === 'error') found.push('console: ' + message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, age: string, width: number) {
  await page.setViewportSize({ width, height: width < 760 ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { firstResponse: { consentAccepted: true, view: 'body3d', b3dTab: 'depth', b3dAge: age,
    b3dChildHands: 'two', b3dPlaced: 'correct', b3dRec: ['check', 'arm', 'hand'],
    b3dDepthLab: { age, depth: age === 'adult' ? 5.5 : 5, lean: 1, rate: 110, motion: 'inspect', phase: 50, hands: true, anatomy: false, measure: false },
    b3dDepthReference: { age, depth: age === 'adult' ? 5.5 : 5, lean: 0 },
    b3dDepthInquiry: { signature: 'surface-material-preservation', explanation: 'Keep my observation.' } } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  await settle(page);
}
async function settle(page: Page) {
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__surfaceDraws.get(canvas)?.sequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__surfaceDraws.get(canvas);
    return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  }, previous);
}
async function probe(page: Page): Promise<any> {
  const value = await page.waitForFunction(() => (window as any).__surfaceClarity());
  try { return await value.jsonValue(); } finally { await value.dispose(); }
}
async function control(page: Page, label: string, keyboard = false) {
  const button = page.getByRole('button', { name: label, exact: true }); await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  await settle(page);
}
function valid(pose: any, count: number, contrast: boolean) {
  expect(pose.hands).toEqual(count === 2 ? ['lower', 'upper'] : ['lower']); expect(pose.surfaces).toHaveLength(13 * count);
  for (const part of pose.surfaces) {
    expect(part.invalid, part.name).toBe(0); expect(part.fingerprint).toMatch(/^[0-9a-f]{8}$/);
    for (const axis of [0, 1]) { expect(part.min[axis], part.name).toBeGreaterThan(-.99); expect(part.max[axis], part.name).toBeLessThan(.99); }
    expect(part.min[2]).toBeGreaterThan(-1); expect(part.max[2]).toBeLessThan(1);
    expect(part.flat).toBe(contrast);
  }
  expect(pose.materials).toHaveLength(1);
  expect(pose.materials[0]).toMatchObject({ name: 'fr-rescuer-skin', depthTest: true, depthWrite: true, transparent: false });
  if (contrast) expect(pose.materials[0].contour).toBe(1);
  else { expect(pose.materials[0].contour).toBeNull(); expect(pose.materials[0].specular).toEqual([0, 0, 0]); }
  expect(pose.contactGap).not.toBeNull(); expect(Math.abs(pose.contactGap)).toBeLessThan(.00001);
  expect(pose.draw.createdBy).toBe('page'); expect(pose.draw.draws).toBeGreaterThan(0); expect(pose.errors).toEqual([]);
}
function unchangedGeometry(before: any, after: any) {
  for (const property of ['surfaces', 'skinRegions']) expect(after[property].map((part: any) => [part.name, part.fingerprint, part.worldMin, part.worldMax]))
    .toEqual(before[property].map((part: any) => [part.name, part.fingerprint, part.worldMin, part.worldMax]));
}
async function photograph(page: Page, filename?: string) {
  const shot = await harness.glPixels(page, '#wrap'); expect(shot).toBeTruthy();
  if (filename) writeFileSync(report + '/' + filename + '.png', shot!.png);
  return shot!.png;
}
function pixelEvidence(onBuffer: Buffer, offBuffer: Buffer, restoredBuffer: Buffer, pose: any) {
  const on = readPng(onBuffer), off = readPng(offBuffer), restored = readPng(restoredBuffer);
  expect([on.width, on.height]).toEqual([off.width, off.height]); expect([on.width, on.height]).toEqual([restored.width, restored.height]);
  const pixelScale = on.width / pose.canvasSize[0], areaScale = pixelScale * pixelScale;
  function regions(parts: any[]) { return parts.map(part => ({
    left: Math.floor((part.min[0] + 1) * on.width / 2) - 2, right: Math.ceil((part.max[0] + 1) * on.width / 2) + 2,
    top: Math.floor((1 - part.max[1]) * on.height / 2) - 2, bottom: Math.ceil((1 - part.min[1]) * on.height / 2) + 2,
  })); }
  const skin = regions(pose.skinRegions), hand = regions(pose.surfaces.filter((part: any) => part.material === 'fr-rescuer-skin')), marks = regions(pose.markers);
  const inside = (list: ReturnType<typeof regions>, x: number, y: number) => list.some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
  const maxDifference = (a: number[], b: number[]) => Math.max(...a.map((channel, index) => Math.abs(channel - b[index])));
  let changed = 0, noise = 0, exteriorChanged = 0, exteriorNoise = 0, exteriorSamples = 0;
  let markerChanged = 0, markerNoise = 0, markerSamples = 0, whiteHand = 0, darkHand = 0;
  const contour = new Uint8Array(on.width * on.height);
  for (let y = 0; y < on.height; y++) for (let x = 0; x < on.width; x++) {
    const a = on.at(x, y), b = off.at(x, y), c = restored.at(x, y);
    const effect = maxDifference(a, b) > 32, repeatNoise = maxDifference(a, c) > 32;
    if (inside(skin, x, y)) { if (effect) changed++; if (repeatNoise) noise++; }
    else {
      exteriorSamples++; if (effect) exteriorChanged++; if (repeatNoise) exteriorNoise++;
      if (inside(marks, x, y)) { markerSamples++; if (effect) markerChanged++; if (repeatNoise) markerNoise++; }
    }
    // White-to-dark pixels inside actual hand projections prove contour detail
    // against the hand surface, rather than counting the black background.
    if (inside(hand, x, y) && Math.min(...b) >= 240) {
      whiteHand++;
      if (Math.max(...a) < 100 && Math.max(...c) < 100) { darkHand++; contour[y * on.width + x] = 1; }
    }
  }
  let largestComponent = 0;
  for (let start = 0; start < contour.length; start++) {
    if (!contour[start]) continue;
    const queue = [start]; contour[start] = 0;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const index = queue[cursor], x = index % on.width, y = Math.floor(index / on.width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * on.width + nx;
        if (nx >= 0 && nx < on.width && ny >= 0 && ny < on.height && contour[next]) { contour[next] = 0; queue.push(next); }
      }
    }
    largestComponent = Math.max(largestComponent, queue.length);
  }
  expect(changed, 'rim effect exceeds same-input raster noise').toBeGreaterThan(Math.max(40 * areaScale, noise * 5));
  expect(whiteHand / areaScale).toBeGreaterThan(100);
  expect(darkHand / areaScale, 'visible internal dark hand contours').toBeGreaterThan(25);
  expect(largestComponent / areaScale, 'contour forms a connected feature').toBeGreaterThan(10);
  expect(darkHand / whiteHand, 'white hand surfaces remain visible').toBeLessThan(.55);
  expect(exteriorSamples).toBeGreaterThan(on.width * on.height * .1);
  expect(exteriorChanged, 'background and patient remain unchanged').toBeLessThanOrEqual(Math.max(10, exteriorNoise * 3 + 5));
  expect(markerChanged, 'resting and depth markers remain unchanged').toBeLessThanOrEqual(Math.max(5, markerNoise * 3 + 2));
  return { width: on.width, height: on.height, pixelScale, changed, noise, whiteHand, darkHand, largestComponent,
    exteriorSamples, exteriorChanged, exteriorNoise, markerSamples, markerChanged, markerNoise };
}
async function pairedContours(page: Page, name: string, count: number) {
  const before = await probe(page); valid(before, count, true);
  const on = await photograph(page, name);
  let off: Buffer;
  try {
    expect(await page.evaluate(() => (window as any).__setSurfaceContour(0))).toBe(1);
    await settle(page); off = await photograph(page, name + '-rim-off');
  } finally {
    await page.evaluate(() => (window as any).__setSurfaceContour(1)); await settle(page);
  }
  const restored = await photograph(page), after = await probe(page); valid(after, count, true);
  expect(after.camera).toEqual(before.camera); expect(after.state).toEqual(before.state); unchangedGeometry(before, after);
  const pixels = pixelEvidence(on, off!, restored, after);
  metrics.push({ condition: name, pixels, pose: after });
  return after;
}
async function audit(page: Page) {
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await (window as any).axe.run('.fr-body3d', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
  })).violations.map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) })));
  expect(violations).toEqual([]); expect(errors.get(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
}
async function release(page: Page) {
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.locator('#wrap canvas').count()).toBe(0); expect(errors.get(page)).toEqual([]);
}

test('adult matte surfaces and compiled contrast contours reveal the stacked hands while preserving contact and camera controls', async ({ page }) => {
  await mount(page, 'adult', 1280);
  const canvas = await page.locator('#wrap canvas').elementHandle(), saved = (await probe(page)).state;
  const standard: Record<string, any> = {};
  for (const [label, view] of [['Hand contact close-up', 'oblique'], ['Heel side view', 'side']] as const) {
    await control(page, label); standard[view] = await probe(page); valid(standard[view], 2, false);
    expect(standard[view].state).toEqual(saved); await photograph(page, 'adult-standard-' + view);
    metrics.push({ condition: 'adult-standard-' + view, pose: standard[view] });
  }
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  await control(page, 'Hand contact close-up');
  const contrast = await pairedContours(page, 'adult-contrast-oblique', 2);
  unchangedGeometry(standard.oblique, contrast); expect(contrast.state).toEqual(saved);
  await control(page, 'Heel side view'); const side = await probe(page); valid(side, 2, true);
  unchangedGeometry(standard.side, side); await photograph(page, 'adult-contrast-side');
  // Canvas-only photography temporarily hides surrounding DOM. Wait for
  // restored frames and confirm focus before exercising the real key handler.
  await settle(page);
  const stage = page.locator('.fr-body3d-stage');
  await expect(stage).toBeVisible(); await stage.focus(); await expect(stage).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await settle(page);
  const rotated = await probe(page); expect(rotated.camera.position).not.toEqual(side.camera.position); expect(rotated.state).toEqual(saved);
  await control(page, 'Heel side view'); await control(page, 'Inspect released contact');
  const released = await probe(page); valid(released, 2, true); expect(released.camera).toEqual(side.camera);
  expect(released.marker[1]).toBeGreaterThan(side.marker[1]);
  expect(released.surfaces.map((part: any) => part.fingerprint)).toEqual(side.surfaces.map((part: any) => part.fingerprint));
  expect(released.state.b3dDepthInquiry).toEqual(saved.b3dDepthInquiry); expect(released.state.b3dDepthReference).toEqual(saved.b3dDepthReference);
  await expect.poll(async () => canvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  await audit(page); await release(page);
});

test('320px child and infant hand surfaces retain visible contours through camera changes and renderer cleanup', async ({ page }) => {
  await mount(page, 'child', 320);
  const canvas = await page.locator('#wrap canvas').elementHandle(), saved = (await probe(page)).state;
  const standard: Record<string, any> = {};
  for (const [label, view] of [['Hand contact close-up', 'oblique'], ['Heel side view', 'side']] as const) {
    await control(page, label, true); standard[view] = await probe(page); valid(standard[view], 2, false);
    await photograph(page, 'phone-child-standard-' + view);
  }
  await page.evaluate(() => { (window as any).__ctx.isContrast = true; (window as any).__rerender(); }); await settle(page);
  await control(page, 'Heel side view', true);
  const side = await pairedContours(page, 'phone-child-contrast-side', 2);
  expect(side.state).toEqual(saved); unchangedGeometry(standard.side, side);
  const sidePixels = (metrics.at(-1) as any).pixels;
  expect(sidePixels.markerSamples, 'visible reference pixels participate in the comparison').toBeGreaterThan(20);
  await control(page, 'Hand contact close-up', true); const oblique = await probe(page); valid(oblique, 2, true);
  unchangedGeometry(standard.oblique, oblique); expect(oblique.state).toEqual(saved); await photograph(page, 'phone-child-contrast-oblique');
  await page.setViewportSize({ width: 390, height: 840 }); await settle(page); await control(page, 'Heel side view', true);
  valid(await probe(page), 2, true); expect((await probe(page)).state).toEqual(saved);
  await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
  await page.getByRole('button', { name: /^Infant —/ }).click(); await settle(page); await control(page, 'Heel side view', true);
  const infant = await probe(page); valid(infant, 1, true); await photograph(page, 'phone-infant-contrast-side');
  metrics.push({ condition: 'phone-infant-contrast-side', pose: infant });
  await expect.poll(async () => canvas!.evaluate(element => (window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  await audit(page); await release(page);
});
