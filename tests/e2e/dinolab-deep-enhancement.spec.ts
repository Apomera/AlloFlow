import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'default', timeout: 300_000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
const report = path.resolve(process.env.DINO_DEEP_REPORT || 'reports/dinolab-deep-enhancement');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true,
  probes: 'var DeepRenderer=THREE.WebGLRenderer; THREE.WebGLRenderer=function(options){var renderer=new DeepRenderer(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.__deepScene=scene;window.__deepCamera=camera;window.__deepRenderer=renderer;return render(scene,camera);};return renderer;};'
});
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, species: string, mode = 'evidence', opacity = 100, labelMode = 'anatomy') {
  await page.setViewportSize({ width: 1180, height: 920 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: { tab: 'field3d', field3dSelected: species, field3dStage: 'studio',
    field3dReconstructionMode: mode, field3dAutoRotate: false, field3dOrientationDismissed: true,
    field3dShowSkeleton: false, field3dShowBody: true, field3dShowHuman: false, field3dShowEvidence: false,
    field3dBodyOpacity: opacity, field3dLabelMode: labelMode } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  const end = css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start));
  await page.addStyleTag({ content: css.slice(start, end) });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block'; });
  await expect.poll(() => page.evaluate(() => !!(window as any).__deepScene?.getObjectByName('dinolab-specimen')?.userData.anatomyParts)).toBe(true);
  await page.evaluate(() => { (window as any).__deepInitialRenderer = (window as any).__deepRenderer; });
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
  await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
}

async function audit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, model = w.__deepScene.getObjectByName('dinolab-specimen');
    w.__deepScene.updateMatrixWorld(true);
    let invalid = 0, meshCount = 0;
    const paddedFeet: any[] = [], thumbParts: any[] = [], wingLayers: string[] = [], features: string[] = [];
    model.traverse((mesh: any) => {
      if (!mesh.isMesh || !mesh.geometry || mesh.userData.dinoContour) return;
      meshCount++;
      for (const attribute of Object.values(mesh.geometry.attributes) as any[]) {
        if (!Array.from(attribute.array as ArrayLike<number>).every(Number.isFinite)) invalid++;
      }
      if (![...mesh.position.toArray(), ...mesh.quaternion.toArray(), ...mesh.scale.toArray()].every(Number.isFinite)) invalid++;
      if (mesh.userData.dinoWingLayer) wingLayers.push(mesh.userData.dinoWingLayer);
      if (mesh.userData.dinoFeature) features.push(mesh.userData.dinoFeature);
      if (mesh.userData.dinoPartIds?.includes('thumbspike')) thumbParts.push({ feature: mesh.userData.dinoFeature, attached: !!mesh.parent?.parent?.userData.dinoBodyPart, position: mesh.getWorldPosition(new w.THREE.Vector3()).toArray() });
      if (mesh.userData.dinoFeature === 'plantar-pad') {
        const box = new w.THREE.Box3().setFromObject(mesh);
        paddedFeet.push({ min: box.min.toArray(), max: box.max.toArray() });
      }
    });
    const canvas = document.querySelector('.dinolab-3d-canvas')!.getBoundingClientRect();
    const labels = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dino-part-label]')).filter(node => getComputedStyle(node).display !== 'none').map(node => {
      const box = node.getBoundingClientRect(); return { id: node.dataset.dinoPartLabel, x: box.x-canvas.x, y: box.y-canvas.y, width: box.width, height: box.height, pressed: node.getAttribute('aria-pressed') };
    });
    return { parts: model.userData.anatomyParts, bounds: model.userData.anatomyPartBounds, labels, meshCount, invalid, paddedFeet, thumbParts, wingLayers, features,
      rendererPreserved: w.__deepInitialRenderer === w.__deepRenderer, lost: w.__glLive().lost, errors: w.__events.errors,
      shaderFailures: w.__deepRenderer.info.programs.filter((program: any) => program.diagnostics?.runnable === false).length,
      noOverflow: document.documentElement.scrollWidth <= innerWidth };
  });
}

function verify(result: Awaited<ReturnType<typeof audit>>) {
  expect(result.parts.length).toBeGreaterThanOrEqual(31);
  expect(result.parts.every((part: any) => part.anchorCount > 0)).toBe(true);
  expect(Object.values(result.bounds).every((box: any) => [...box.min,...box.max].every(Number.isFinite))).toBe(true);
  expect(result.meshCount).toBeGreaterThan(30); expect(result.invalid).toBe(0);
  expect(result.rendererPreserved).toBe(true); expect(result.lost).toBe(false); expect(result.errors).toEqual([]);
  expect(result.shaderFailures).toBe(0); expect(result.noOverflow).toBe(true);
  for (const label of result.labels) expect(label.height).toBeGreaterThanOrEqual(43.99);
  for (let i=0;i<result.labels.length;i++) for(let j=i+1;j<result.labels.length;j++) {
    const a=result.labels[i],b=result.labels[j];
    expect(a.x+a.width<=b.x+.5||b.x+b.width<=a.x+.5||a.y+a.height<=b.y+.5||b.y+b.height<=a.y+.5).toBe(true);
  }
}

async function explain(page: Page, id: string) {
  await page.locator('#dinolab-part-picker').selectOption(id);
  const guide = page.locator('#dinolab-selected-part-guide');
  await expect(guide).toBeVisible();
  for (const name of ['What it does', 'Characteristics', 'Look for', 'Fossils and inference']) await expect(guide.getByText(name, { exact: true })).toBeVisible();
  await expect(guide.locator('dd')).toHaveCount(4);
  expect(await guide.locator('a').getAttribute('href')).toMatch(/^https:\/\//);
  await page.getByRole('button', { name: 'Show part', exact: true }).click();
  await expect(page.locator('[data-dino-part-label="'+id+'"]')).toBeVisible();
  await expect(page.locator('[data-dino-part-label="'+id+'"]')).toHaveAttribute('aria-pressed', 'true');
}

for (const [species, feature] of [['archaeopteryx','wing'],['brachiosaurus','toes'],['triceratops','horns'],['iguanodon','thumbspike'],['spinosaurus','sail']]) {
  test(species+' has complete interactive anatomy and finite refined geometry', async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mount(page, species);
    const initial = await audit(page); verify(initial);
    expect(await page.locator('#dinolab-part-picker option').count()).toBe(initial.parts.length+1);
    await page.locator('.dinolab-3d-canvas').screenshot({ path: path.join(report,species+'-labeled.png') });
    const callout = page.locator('[data-dino-part-label]:visible').first();
    const id = await callout.getAttribute('data-dino-part-label');
    await callout.click();
    await expect(page.locator('#dinolab-selected-part-guide')).toBeFocused();
    await expect(page.locator('#dinolab-part-picker')).toHaveValue(id!);
    await page.locator('.dinolab-body-part-key > summary').click();
    await expect(page.locator('[data-dino-part-choice]')).toHaveCount(initial.parts.length);
    await page.locator('[data-dino-part-choice="wrist"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#dinolab-selected-part-guide h3')).toHaveText('Wrist');
    await explain(page, feature);
    const selected=await audit(page); verify(selected);
    if(species==='archaeopteryx') expect(new Set(selected.wingLayers)).toEqual(new Set(['primary','secondary','shoulder-covert']));
    if(species==='brachiosaurus') {
      expect(selected.paddedFeet).toHaveLength(4);
      for(const pad of selected.paddedFeet) expect(pad.min[1]).toBeCloseTo(.004, 4);
    }
    if(species==='iguanodon') {
      expect(selected.thumbParts.length).toBeGreaterThanOrEqual(4);
      expect(selected.thumbParts.every(part=>part.attached)).toBe(true);
    }
    await page.locator('.dinolab-3d-canvas').screenshot({ path: path.join(report,species+'-'+feature+'.png') });
    await page.locator('#dinolab-selected-part-guide').screenshot({ path: path.join(report,species+'-'+feature+'-description.png') });
    if(species==='brachiosaurus') {
      await page.setViewportSize({width:390,height:844});
      await explain(page,'foot');
      const mobile=await audit(page); verify(mobile); expect(mobile.labels.length).toBeLessThanOrEqual(4);
      await page.locator('.dinolab-3d-canvas').screenshot({path:path.join(report,'brachiosaurus-mobile.png')});
      await page.locator('#dinolab-selected-part-guide').screenshot({path:path.join(report,'brachiosaurus-mobile-description.png')});
    }
    fs.writeFileSync(path.join(report,species+'-metrics.json'),JSON.stringify({initial,selected},null,2));
    expect(errors).toEqual([]);
  });
}

test('hornless species omit generic horns and hidden layers explain how to inspect them', async({page})=>{
  await mount(page,'protoceratops');
  const result=await audit(page); verify(result);
  expect(result.parts.some((part:any)=>part.id==='horns')).toBe(false);
  expect(result.features.includes('keratin-horn')).toBe(false);
  await explain(page,'skull');
  await expect(page.locator('.dinolab-part-layer-help')).toContainText('fossil layer');
  await page.locator('#dinolab-part-picker').selectOption('');
  await expect(page.locator('#dinolab-selected-part-guide')).toHaveCount(0);
  expect((await audit(page)).rendererPreserved).toBe(true);
});

test('transparent tissue proxies have inspectable, explicitly inferred descriptions', async({page})=>{
  await mount(page,'brachiosaurus','evidence',100,'key');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.dinolab-3d-canvas').scrollIntoViewIfNeeded();
  const entryLayout=await page.evaluate(()=>{
    const actions=document.querySelector('.dinolab-viewer-actions')!.getBoundingClientRect(),readout=document.querySelector('.dinolab-3d-camera-readout')!.getBoundingClientRect();
    return {overlap:actions.left<readout.right&&actions.right>readout.left&&actions.top<readout.bottom&&actions.bottom>readout.top,
      heights:Array.from(document.querySelectorAll('.dinolab-viewer-actions button')).map(node=>node.getBoundingClientRect().height),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  expect(entryLayout.overlap).toBe(false);expect(entryLayout.overflow).toBe(false);
  expect(entryLayout.heights.every(height=>height>=43.99)).toBe(true);
  await page.locator('.dinolab-3d-canvas').screenshot({path:path.join(report,'brachiosaurus-mobile-entry.png')});
  await page.getByRole('button',{name:'Explore anatomy',exact:true}).click();
  await expect(page.locator('#dinolab-selected-part-guide')).toBeFocused();
  await expect(page.locator('#dinolab-part-picker')).toHaveValue('head');
  const result=await audit(page); verify(result);
  for(const id of ['lungs','airsacs','muscles']) {
    const part=result.parts.find((entry:any)=>entry.id===id);
    expect(part).toBeTruthy(); expect(part.meshCount).toBeGreaterThan(0);
    await explain(page,id);
    await expect(page.locator('#dinolab-selected-part-guide')).toContainText(/inferred|inference|reconstructed/i);
    if(id==='lungs') {
      await expect(page.locator('.dinolab-part-layer-help')).toContainText('inside the body');
      await page.getByRole('button',{name:'Reveal inferred tissues',exact:true}).click();
      expect((await audit(page)).rendererPreserved).toBe(true);
      await expect.poll(()=>page.evaluate(()=>{
        let visible=0; (window as any).__deepScene.getObjectByName('dinolab-specimen').traverse((mesh:any)=>{if(mesh.userData.dinoFeature==='lung-proxy'&&mesh.visible&&mesh.material.visible) visible++;}); return visible;
      })).toBe(2);
    }
  }
  await page.locator('.dinolab-3d-canvas').screenshot({path:path.join(report,'brachiosaurus-tissue-proxies.png')});
  await page.locator('#dinolab-selected-part-guide').screenshot({path:path.join(report,'brachiosaurus-muscles-description.png')});
  fs.writeFileSync(path.join(report,'brachiosaurus-tissue-proxies-metrics.json'),JSON.stringify(await audit(page),null,2));
});
