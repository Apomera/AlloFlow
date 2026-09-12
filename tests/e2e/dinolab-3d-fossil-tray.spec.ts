import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000 });
test.use({ video: 'off', trace: 'off' });
const report = 'reports/dinolab-3d-fossil-tray';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true,
  probes: "var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__trayScene=s;window.__trayCamera=c;window.__trayRenderer=r;var result=render(s,c);s.traverse(function(p){var target=p.shadow&&p.shadow.map;if(!target||target.__trayTracked)return;target.__trayTracked=true;var record={disposed:false};(window.__trayShadowTargets=window.__trayShadowTargets||[]).push(record);var dispose=target.dispose.bind(target);target.dispose=function(){record.disposed=true;dispose();};});return result;};return r;};"
});
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  await harness.destroy(page);
  expect(await page.evaluate(() => ((window as any).__trayShadowTargets || []).filter(p => !p.disposed).length)).toBe(0);
});

async function settle(page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}
async function mount(page, species, state = {}) {
  await page.setViewportSize({ width: 1180, height: 920 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { dinoLab: {
    tab: 'field3d', field3dSelected: species, field3dReconstructionMode: 'evidence',
    field3dAutoRotate: false, field3dOrientationDismissed: true, field3dWorkflowStarted: true,
    field3dShowSkeleton: false, field3dShowBody: true, field3dShowHuman: false,
    field3dShowEvidence: true, field3dBodyOpacity: 100,
    field3dScanLogged: { skull: true, shoulder: true, hip: true }, field3dScanSpecies: species,
    field3dAssemblyPlaced: {}, field3dAssemblySpecies: species, ...state
  } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block';
  });
  await expect.poll(() => page.evaluate(() => !!(window as any).__trayScene)).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click(); await settle(page);
}
async function inspect(page, view = 'overview') {
  return page.evaluate(view => {
    const w = window as any, T = w.THREE, s = w.__trayScene, c = w.__trayCamera, r = w.__trayRenderer;
    const m = s.getObjectByName('dinolab-specimen'), tray = m.getObjectByName('dinolab-fossil-tray'), light = s.getObjectByName('dinolab-key-light');
    s.updateMatrixWorld(true); c.updateMatrixWorld(true);
    const b = view === 'overview' ? m.userData.overviewBounds : m.userData.studyBounds[view];
    let outside = 0, invalid = 0, maxProjection = 0, shadowOutside = 0;
    if (b) for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) {
      const p = new T.Vector3(x, y, z).applyMatrix4(m.matrixWorld).project(c);
      const max = Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z));
      if (!Number.isFinite(max)) invalid++; if (max > 1.001) outside++; maxProjection = Math.max(maxProjection, max);
    }
    const parts = [];
    if (tray) {
      const inverse = tray.matrixWorld.clone().invert(), size = tray.userData.dinoTrayScale;
      for (const group of tray.children.filter(p => p.userData.dinoTrayPiece)) {
        const box = new T.Box3();
        group.traverse(p => {
          if (!p.isMesh) return; if (!p.geometry.boundingBox) p.geometry.computeBoundingBox();
          box.union(p.geometry.boundingBox.clone().applyMatrix4(inverse.clone().multiply(p.matrixWorld)));
          if (p.castShadow) {
            const g = p.geometry.boundingBox;
            for (const x of [g.min.x, g.max.x]) for (const y of [g.min.y, g.max.y]) for (const z of [g.min.z, g.max.z]) {
              const v = new T.Vector3(x, y, z).applyMatrix4(p.matrixWorld).project(light.shadow.camera);
              if (Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) > 1.001) shadowOutside++;
            }
          }
        });
        const slot = tray.getObjectByName('fossil-tray-slot-' + group.userData.dinoTrayPiece), pad = slot.geometry.parameters;
        parts.push({
          id: group.userData.dinoTrayPiece, baseGap: (box.min.y - (slot.position.y + pad.height / 2)) * size,
          slotOutside: box.min.x < slot.position.x - pad.width / 2 - .001 || box.max.x > slot.position.x + pad.width / 2 + .001 || box.min.z < slot.position.z - pad.depth / 2 - .001 || box.max.z > slot.position.z + pad.depth / 2 + .001,
          min: box.min.toArray(), max: box.max.toArray()
        });
      }
    }
    const sockets = tray ? tray.children.filter(p => p.userData.dinoAssemblySlot).map(p => ({ id: p.userData.dinoAssemblySlot, placed: p.userData.placed })) : [];
    return { tray: !!tray, visible: tray?.visible, trayScale: tray?.userData.dinoTrayScale, trayPosition: tray?.position.toArray(), parent: tray?.parent.name, parts, sockets, outside, invalid, maxProjection, shadowOutside,
      specimenBounds: m.userData.specimenBounds, overviewBounds: m.userData.overviewBounds, trayBounds: m.userData.studyBounds.tray, studyBounds: m.userData.studyBounds,
      model: m.uuid, memory: { ...r.info.memory }, liveShadowTargets: (w.__trayShadowTargets || []).filter(p => !p.disposed).length, errors: w.__events.errors, lost: w.__glLive().lost, shaderFailures: r.info.programs.filter(p => p.diagnostics && p.diagnostics.runnable === false).length };
  }, view);
}
function check(result, remaining = 6) {
  expect(result.errors).toEqual([]); expect(result.lost).toBe(false); expect(result.shaderFailures).toBe(0);
  expect(result.invalid).toBe(0); expect(result.outside).toBe(0); expect(result.tray).toBe(true);
  expect(result.parts).toHaveLength(remaining); expect(result.sockets).toHaveLength(6);
  expect(result.parent).toBe('dinolab-specimen'); expect(result.shadowOutside).toBe(0); expect(result.liveShadowTargets).toBe(1);
  for (const part of result.parts) { expect(Math.abs(part.baseGap)).toBeLessThan(1e-6); expect(part.slotOutside).toBe(false); }
}
const lengths = { microraptor: .9, anchiornis: .5, sinosauropteryx: 1.1, tyrannosaurus: 12.3, brachiosaurus: 22 };
for (const species of Object.keys(lengths)) test(species + ' has a fitted grounded fossil tray', async ({ page }) => {
  await mount(page, species);
  const whole = await inspect(page); check(whole); expect(whole.visible).toBe(true);
  expect(whole.trayScale).toBeCloseTo(lengths[species] / 4, 10);
  expect(whole.trayBounds.min[2]).toBeGreaterThan(whole.specimenBounds.max[2]);
  expect(whole.trayBounds.min[1]).toBeCloseTo(0, 6);
  await page.locator('.dinolab-3d-canvas').screenshot({ path: report + '/' + species + '-whole.png' });
  const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  const button = page.getByRole('button', { name: 'Study fossil tray', exact: true });
  await button.focus(); await page.keyboard.press('Enter'); await settle(page);
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.dinolab-3d-camera-readout')).toContainText('Tray study');
  const detail = await inspect(page, 'tray'); check(detail); expect(detail.visible).toBe(true);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(saved);
  await page.locator('.dinolab-3d-canvas').screenshot({ path: report + '/' + species + '-tray.png' });
  fs.writeFileSync(report + '/' + species + '.json', JSON.stringify({ whole, detail }, null, 2));
});

test('phone tray view stays framed and hides during anatomy and anchor studies', async ({ page }) => {
  await mount(page, 'microraptor');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Study fossil tray', exact: true }).click(); await settle(page);
  check(await inspect(page, 'tray'));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.dinolab-3d-shell').screenshot({ path: report + '/microraptor-mobile-tray.png' });
  for (const region of ['head', 'body', 'tail']) {
    await page.getByRole('button', { name: 'Study ' + region + ' details', exact: true }).click(); await settle(page);
    const result = await inspect(page, region); expect(result.visible).toBe(false); expect(result.outside).toBe(0);
  }
  await page.getByRole('button', { name: /Focus Hip evidence anchor/ }).click(); await settle(page);
  expect((await inspect(page)).visible).toBe(false);
  await page.getByRole('button', { name: 'Study fossil tray', exact: true }).click(); await settle(page);
  await page.locator('.dinolab-3d-controls-disclosure > summary').click();
  await page.getByRole('button', { name: 'Overhead camera view', exact: true }).click(); await settle(page);
  check(await inspect(page, 'tray'));
  await page.locator('.dinolab-3d-canvas').focus(); await page.keyboard.press('Home'); await settle(page);
  check(await inspect(page));
  await expect(page.getByRole('button', { name: 'Study whole animal', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('placing fossils empties their slots and finishing returns to the animal', async ({ page }) => {
  await mount(page, 'anchiornis');
  await page.getByRole('button', { name: 'Study fossil tray', exact: true }).click(); await settle(page);
  const placed = { skull: true, ribs: true };
  await page.evaluate(placed => (window as any).__ctx.updateMulti('dinoLab', { field3dAssemblyPlaced: placed, field3dAssemblyFocusIdx: 1 }), placed); await settle(page);
  const partial = await inspect(page, 'tray'); check(partial, 4);
  expect(partial.parts.map(p => p.id)).not.toContain('skull'); expect(partial.parts.map(p => p.id)).not.toContain('ribs');
  expect(partial.sockets.filter(p => p.placed).map(p => p.id)).toEqual(['skull', 'ribs']);
  await expect(page.getByRole('button', { name: 'Study fossil tray', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.dinolab-3d-canvas').screenshot({ path: report + '/anchiornis-partial-tray.png' });
  const all = { skull: true, spine: true, ribs: true, pelvis: true, hindlimb: true, tail: true };
  await page.evaluate(all => (window as any).__ctx.update('dinoLab', 'field3dAssemblyPlaced', all), all); await settle(page);
  expect((await inspect(page)).tray).toBe(false);
  await expect(page.getByRole('button', { name: 'Study fossil tray', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Study whole animal', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.field3dAssemblyPlaced)).toEqual(all);
});

test('tray survives layer changes and is unavailable before the scan or without markers', async ({ page }) => {
  await mount(page, 'tyrannosaurus', { field3dScanLogged: {} });
  expect((await inspect(page)).tray).toBe(false);
  await expect(page.getByRole('button', { name: 'Study fossil tray', exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as any).__ctx.update('dinoLab', 'field3dScanLogged', { skull: true, shoulder: true, hip: true })); await settle(page);
  await page.getByRole('button', { name: 'Study fossil tray', exact: true }).click(); await settle(page);
  const before = await inspect(page, 'tray'); check(before);
  const resources = [before.memory];
  for (let i = 0; i < 2; i++) {
    await page.locator('.dinolab-surface-presets').getByRole('button', { name: /Fossil anchors/ }).click(); await settle(page);
    check(await inspect(page, 'tray'));
    await page.locator('.dinolab-surface-presets').getByRole('button', { name: /Life view/ }).click(); await settle(page);
    expect((await inspect(page)).tray).toBe(false);
    await expect(page.getByRole('button', { name: 'Study fossil tray', exact: true })).toHaveCount(0);
    await page.evaluate(() => (window as any).__ctx.update('dinoLab', 'field3dShowEvidence', true)); await settle(page);
    await page.getByRole('button', { name: 'Study fossil tray', exact: true }).click(); await settle(page);
    const after = await inspect(page, 'tray'); check(after);
    resources.push(after.memory);
    fs.writeFileSync(report + '/layer-resources.json', JSON.stringify(resources, null, 2));
    expect(after.parts).toEqual(before.parts);
    expect(after.memory.geometries).toBeLessThanOrEqual(before.memory.geometries + 2);
    expect(after.memory.textures).toBeLessThanOrEqual(before.memory.textures + 1);
  }
  await page.evaluate(() => (window as any).__ctx.update('dinoLab', 'field3dShowEvidence', false)); await settle(page);
  expect((await inspect(page)).tray).toBe(false);
  await expect(page.getByRole('button', { name: 'Study fossil tray', exact: true })).toHaveCount(0);
});

test('assembly tools place every tray fossil and return to the completed specimen', async ({ page }) => {
  await mount(page, 'microraptor');
  await page.getByRole('button', { name: 'Study fossil tray', exact: true }).click(); await settle(page);
  await page.getByRole('button', { name: 'Continue assembly', exact: true }).click();
  const progress = [];
  for (let placed = 1; placed <= 6; placed++) {
    await page.getByRole('button', { name: 'Place fossil', exact: true }).click(); await settle(page);
    if (placed < 6) {
      const result = await inspect(page, 'tray'); check(result, 6 - placed);
      await expect(page.getByRole('button', { name: 'Study fossil tray', exact: true })).toHaveAttribute('aria-pressed', 'true');
      progress.push({ placed, remaining: result.parts.length, occupied: result.sockets.filter(p => !p.placed).length });
      if (placed === 5) await expect(page.locator('.dinolab-tray-controls')).toContainText('1 fossil left to place.');
    } else {
      const result = await inspect(page);
      expect(result.tray).toBe(false); expect(result.outside).toBe(0);
      await expect(page.getByRole('button', { name: 'Study whole animal', exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
  }
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.field3dAssemblyPlaced)).toEqual({ skull: true, spine: true, ribs: true, pelvis: true, hindlimb: true, tail: true });
  fs.writeFileSync(report + '/assembly-workflow.json', JSON.stringify(progress, null, 2));
});

test('small-species habitat tray rests on the excavation surface', async ({ page }) => {
  await mount(page, 'microraptor', { field3dStage: 'habitat' });
  const whole = await inspect(page); check(whole);
  const support = await page.evaluate(() => {
    const w = window as any, T = w.THREE, pad = w.__trayScene.getObjectByName('dinolab-excavation-pad');
    const box = new T.Box3().setFromObject(pad);
    return { min: box.min.toArray(), max: box.max.toArray() };
  });
  expect(whole.trayBounds.min[1]).toBeCloseTo(support.max[1], 6);
  await page.getByRole('button', { name: 'Study fossil tray', exact: true }).click(); await settle(page);
  check(await inspect(page, 'tray'));
  await page.setViewportSize({ width: 390, height: 844 }); await settle(page);
  check(await inspect(page, 'tray'));
  await page.locator('.dinolab-3d-shell').screenshot({ path: report + '/microraptor-habitat-tray-mobile.png' });
  fs.writeFileSync(report + '/habitat.json', JSON.stringify({ support, tray: whole.trayBounds }, null, 2));
});
