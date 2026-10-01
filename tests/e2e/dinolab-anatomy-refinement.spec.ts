import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'default', timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
// Run with --workers=1; the shared SwiftShader harness must run alone.
const report = path.resolve(process.env.DINO_REFINEMENT_REPORT || 'reports/dinolab-anatomy-refinement');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true,
  probes: 'var refinementNativeNow=performance.now.bind(performance); window.__refinementNow=10000; performance.now=function(){return window.__refinementNow==null?refinementNativeNow():window.__refinementNow;}; var RefinementRenderer=THREE.WebGLRenderer; THREE.WebGLRenderer=function(options){var renderer=new RefinementRenderer(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.__refinementScene=scene;window.__refinementCamera=camera;window.__refinementRenderer=renderer;return render(scene,camera);};return renderer;};'
});
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, species: string) {
  await page.setViewportSize({ width: 1180, height: 920 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: {
    tab: 'field3d', field3dSelected: species, field3dStage: 'studio',
    field3dReconstructionMode: 'evidence', field3dAutoRotate: false,
    field3dOrientationDismissed: true, field3dShowSkeleton: false,
    field3dShowBody: true, field3dShowHuman: false,
    field3dShowEvidence: false, field3dBodyOpacity: 100, field3dLabelMode: 'off'
  } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8');
  const start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block';
  });
  try {
    await expect.poll(() => page.evaluate(() => !!(window as any).__refinementScene?.getObjectByName('dinolab-specimen'))).toBe(true);
  } catch (error) {
    const details = await page.evaluate(() => ({ events: (window as any).__events, renderer: !!(window as any).__refinementRenderer, text: document.body.innerText }));
    throw new Error('Dino Lab did not render: ' + JSON.stringify(details) + '\n' + String(error));
  }
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
}

async function inspect(page: Page, scope: 'head' | 'whole' = 'head') {
  return page.evaluate(scope => {
    const w = window as any, T = w.THREE, scene = w.__refinementScene;
    const camera = w.__refinementCamera, renderer = w.__refinementRenderer;
    const model = scene.getObjectByName('dinolab-specimen');
    const head = model.getObjectByName('continuous-cranial-surface');
    const jaw = model.getObjectByName('lower-jaw-surface');
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    const eyes: any[] = [], nostrils: any[] = [];
    let invalid = 0, outside = 0, projectedVertices = 0, meshCount = 0;
    function visible(object: any) {
      for (let owner = object; owner; owner = owner.parent) if (!owner.visible) return false;
      return true;
    }
    function isNostril(object: any) {
      return object.userData?.dinoFeature === 'nostril' ||
        (object.geometry?.type === 'SphereGeometry' && object.renderOrder === 10 &&
         Math.abs(object.scale.x - 1.25) < 1e-8 && Math.abs(object.scale.y - .55) < 1e-8 && Math.abs(object.scale.z - .42) < 1e-8);
    }
    model.traverse((object: any) => {
      if (!object.isMesh || !object.geometry) return;
      meshCount++;
      for (const attribute of Object.values(object.geometry.attributes) as any[]) {
        if (!Array.from(attribute.array as ArrayLike<number>).every(Number.isFinite)) invalid++;
      }
      if (![...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()].every(Number.isFinite)) invalid++;
      if (object.userData?.dinoFeature === 'eye') eyes.push(object);
      if (isNostril(object)) nostrils.push(object);
      const inScope = scope === 'whole' ? object.userData?.dinoAnatomy :
        object === head || object === jaw || object.userData?.dinoRegion === 'head' || isNostril(object) ||
        ['mouth-crease', 'brow-relief'].includes(object.userData?.dinoFeature);
      if (!inScope || !visible(object)) return;
      const positions = object.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const point = new T.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera);
        projectedVertices++;
        if (![point.x, point.y, point.z].every(Number.isFinite)) invalid++;
        if (Math.max(Math.abs(point.x), Math.abs(point.y), Math.abs(point.z)) > 1.002) outside++;
      }
    });
    function clearance(object: any) {
      const radius = object.geometry.parameters.radius;
      const side = object.userData?.dinoEyeSide || Math.sign(object.position.z);
      const out = new T.Vector3(0, 0, side).transformDirection(head.matrixWorld);
      const origin = object.getWorldPosition(new T.Vector3()).addScaledVector(out, radius * 4);
      const hit = new T.Raycaster(origin, out.clone().negate(), 0, radius * 8).intersectObject(head, false)[0];
      return hit ? (hit.distance - radius * (4 - object.scale.z)) / radius : null;
    }
    // Same enclosure test as dinolab-3d-jaw-contours.spec.ts: both rounded jaw
    // terminal rings must close within the head, including its newly narrow sides.
    const capEnclosures: number[] = []; let capOutside = 0;
    if (head && jaw && jaw.userData.dinoJawTerminals) {
      const reach = new T.Box3().setFromObject(head).getSize(new T.Vector3()).length() * 2;
      for (const [endpoint, ring] of [[0, 0], [1, 48]]) {
        const center = new T.Vector3().fromArray(jaw.userData.dinoJawTerminals[endpoint]).applyMatrix4(jaw.parent.matrixWorld);
        let minimum = Infinity;
        for (let i = 0; i < 24; i++) {
          const point = new T.Vector3().fromBufferAttribute(jaw.geometry.attributes.position, ring * 25 + i).applyMatrix4(jaw.matrixWorld);
          const delta = point.clone().sub(center), direction = delta.clone().normalize();
          const hit = new T.Raycaster(center.clone().addScaledVector(direction, reach), direction.clone().negate(), 0, reach * 2).intersectObject(head, false)[0];
          const ratio = hit ? hit.point.distanceTo(center) / delta.length() : 0;
          minimum = Math.min(minimum, ratio); if (ratio < 1.1) capOutside++;
        }
        capEnclosures.push(minimum);
      }
    }
    return {
      hasHead: !!head, hasJaw: !!jaw, meshCount, invalid, outside, projectedVertices,
      eyeClearances: head ? eyes.map(clearance) : [], noseClearances: head ? nostrils.map(clearance) : [],
      capOutside, capEnclosures, lost: w.__glLive().lost, errors: w.__events.errors,
      shaderFailures: renderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length
    };
  }, scope);
}

function verify(result: Awaited<ReturnType<typeof inspect>>) {
  expect(result.hasHead).toBe(true); expect(result.hasJaw).toBe(true);
  expect(result.meshCount).toBeGreaterThan(0); expect(result.projectedVertices).toBeGreaterThan(0);
  expect(result.invalid).toBe(0); expect(result.outside).toBe(0);
  expect(result.eyeClearances).toHaveLength(2);
  for (const clearance of result.eyeClearances) { expect(clearance).not.toBeNull(); expect(clearance).toBeGreaterThan(.04); }
  expect(result.noseClearances).toHaveLength(2);
  for (const clearance of result.noseClearances) { expect(clearance).not.toBeNull(); expect(clearance).toBeGreaterThan(.04); }
  expect(result.capEnclosures).toHaveLength(2); expect(result.capOutside).toBe(0);
  expect(result.errors).toEqual([]); expect(result.lost).toBe(false); expect(result.shaderFailures).toBe(0);
}

for (const species of ['archaeopteryx', 'spinosaurus', 'tyrannosaurus', 'brachiosaurus']) {
  test(species + ' retains enclosed jaws and clear facial features after silhouette refinement', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /shader|webglprogram|validate_status/i.test(message.text())) browserErrors.push(message.text());
    });
    await mount(page, species);
    await page.getByRole('button', { name: 'Study head details', exact: true }).click();
    await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
    const head = await inspect(page);
    // Save diagnostics and a reviewable image before checking enclosure, so any
    // genuine cap regression leaves enough evidence to fix the geometry.
    fs.writeFileSync(path.join(report, species + '-head-metrics.json'), JSON.stringify(head, null, 2));
    await page.locator('.dinolab-3d-canvas').screenshot({ path: path.join(report, species + '-head.png') });
    verify(head);

    await page.locator('.dinolab-3d-controls-disclosure > summary').click();
    await page.getByRole('button', { name: 'Side camera view', exact: true }).click();
    await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
    const side = await inspect(page);
    fs.writeFileSync(path.join(report, species + '-side-metrics.json'), JSON.stringify(side, null, 2));
    await page.locator('.dinolab-3d-canvas').screenshot({ path: path.join(report, species + '-side.png') });
    verify(side);
    await page.getByRole('button', { name: 'Front camera view', exact: true }).click();
    await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
    verify(await inspect(page));

    if (species === 'brachiosaurus') {
      await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
      await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
      verify(await inspect(page, 'whole'));
      await page.locator('.dinolab-3d-canvas').screenshot({ path: path.join(report, species + '-whole.png') });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
      await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const mobile = await inspect(page, 'whole');
      fs.writeFileSync(path.join(report, species + '-mobile-metrics.json'), JSON.stringify(mobile, null, 2));
      await page.locator('.dinolab-3d-canvas').screenshot({ path: path.join(report, species + '-whole-mobile.png') });
      verify(mobile);
    }
    expect(browserErrors).toEqual([]);
  });
}

async function motionTick(page: Page, ms: number, steps = 1) {
  await page.evaluate(async ({ ms, steps }) => {
    for (let i = 0; i < steps; i++) {
      (window as any).__refinementNow += ms / steps;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
  }, { ms, steps });
}

async function cranialMotionState(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, scene = w.__refinementScene;
    const model = scene.getObjectByName('dinolab-specimen');
    const rig = model.getObjectByName('dinolab-connected-cranial-motion');
    const head = model.getObjectByName('continuous-cranial-surface');
    let neck: any;
    model.traverse((object: any) => { if (object.userData?.dinoRegion === 'neck') neck = object; });
    scene.updateMatrixWorld(true);
    const junction = new T.Vector3().fromArray(head.userData.dinoNeckJunction.point);
    const skinJunction = junction.clone().sub(neck.position).applyMatrix4(neck.matrixWorld);
    const skullJunction = junction.clone().applyMatrix4(rig.matrixWorld);
    const neckTip = new T.Vector3().fromArray(neck.userData.dinoNeckTip);
    const skinTip = neckTip.clone().sub(neck.position).applyMatrix4(neck.matrixWorld);
    const skullTip = neckTip.clone().applyMatrix4(rig.matrixWorld);
    const faceRoots: any[] = [];
    rig.traverse((object: any) => {
      if (object.userData?.dinoFeature === 'eye' || object.userData?.dinoFeature === 'nostril' || object.name === 'lower-jaw-surface') {
        faceRoots.push({ feature: object.userData.dinoFeature || object.name, parent: object.parent === rig,
          position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray() });
      }
    });
    function coordinates(mesh: any) {
      const result: any = {};
      for (const key of ['position', 'normal', 'uv', 'dinoSkinPosition', 'dinoSkinNormal']) {
        const attribute = mesh.geometry.attributes[key];
        if (attribute) {
          let sum = 0;
          for (let i = 0; i < attribute.array.length; i++) sum += attribute.array[i] * (i % 37 + 1);
          result[key] = [attribute.count, sum];
        }
      }
      return result;
    }
    return { quaternion: rig.quaternion.toArray(), scale: rig.scale.toArray(), rootCount: rig.children.length,
      junctionGap: skinJunction.distanceTo(skullJunction), tipGap: skinTip.distanceTo(skullTip),
      faceRoots, headCoordinates: coordinates(head), neckCoordinates: coordinates(neck),
      rendererPreserved: w.__refinementInitialRenderer === w.__refinementRenderer };
  });
}

test('life motion keeps the skull and face connected and freezes when paused', async ({ page }) => {
  await mount(page, 'brachiosaurus');
  await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  await page.evaluate(() => { (window as any).__refinementInitialRenderer = (window as any).__refinementRenderer; });
  await motionTick(page, 0);
  const initial = await cranialMotionState(page);
  expect(initial.rootCount).toBeGreaterThan(8);
  expect(initial.faceRoots).toHaveLength(5);
  expect(initial.faceRoots.every(root => root.parent)).toBe(true);
  expect(initial.scale).toEqual([1, 1, 1]);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeEnabled();
  await motionTick(page, 0);
  const poses = [];
  for (let sample = 0; sample < 6; sample++) {
    await motionTick(page, 2400, 12);
    const pose = await cranialMotionState(page);
    expect(pose.junctionGap).toBeLessThan(1e-7); expect(pose.tipGap).toBeLessThan(1e-7);
    expect(pose.scale).toEqual([1, 1, 1]);
    // Eye height changes during the existing blink animation; its attachment,
    // rotation and depth must stay seated on the rigidly moving skull.
    const attachments = (roots: typeof pose.faceRoots) => roots.map(root => ({ ...root,
      scale: root.feature === 'eye' ? [root.scale[0], null, root.scale[2]] : root.scale }));
    expect(attachments(pose.faceRoots)).toEqual(attachments(initial.faceRoots));
    for (const eye of pose.faceRoots.filter(root => root.feature === 'eye')) {
      expect(eye.scale[1]).toBeGreaterThan(0); expect(eye.scale[1]).toBeLessThanOrEqual(.82);
    }
    expect(pose.headCoordinates).toEqual(initial.headCoordinates);
    expect(pose.neckCoordinates).toEqual(initial.neckCoordinates);
    expect(pose.rendererPreserved).toBe(true);
    verify(await inspect(page, 'whole'));
    poses.push(pose);
  }
  expect(poses[0].quaternion).not.toEqual(poses[5].quaternion);
  await page.locator('.dinolab-3d-canvas').screenshot({ path: path.join(report, 'brachiosaurus-connected-motion.png') });
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await motionTick(page, 0);
  const paused = await cranialMotionState(page);
  await motionTick(page, 30000, 4);
  expect(await cranialMotionState(page)).toEqual(paused);
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
  await motionTick(page, 0); await motionTick(page, 500, 3);
  expect((await cranialMotionState(page)).quaternion).not.toEqual(paused.quaternion);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Motion reduced', exact: true })).toBeDisabled();
  await motionTick(page, 0);
  const reduced = await cranialMotionState(page);
  await motionTick(page, 30000, 4);
  expect(await cranialMotionState(page)).toEqual(reduced);
  expect(reduced.quaternion).toEqual([0, 0, 0, 1]);
  fs.writeFileSync(path.join(report, 'connected-cranial-motion.json'), JSON.stringify({ initial, poses, paused, reduced }, null, 2));
});
