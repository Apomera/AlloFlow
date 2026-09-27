import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-owl-face-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;window.owlRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.owlRenderer=r;r.render=function(scene,camera){window.owlScene=scene;window.owlCamera=camera;window.owlRenders++;return render(scene,camera);};return r;};})();`;

test.describe('Owl facial feather surfaces', () => {
  test.describe.configure({ mode: 'serial', timeout: 240000 });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
  test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 1100 });
    await page.addInitScript(() => {
      let time = 1000, id = 0, seed = 731; const frames = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; performance.now = () => time;
      window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; }; window.cancelAnimationFrame = key => frames.delete(key);
      (window as any).owlStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  function frozen(a: any, b: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'gazeYaw', 'gazePitch']) expect(b[key], key).toEqual(a[key]);
  }
  for (const model of [
    { species: 'greatHorned', quality: 'low' }, { species: 'greatHorned', quality: 'high' },
    { species: 'snowyOwl', quality: 'low' }, { species: 'snowyOwl', quality: 'high' }
  ]) test(`keeps the feathered face visible and attached: ${model.species} ${model.quality}`, async ({ page }) => {
    const errors: string[] = [], label = model.species + '-' + model.quality;
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: model.species,
      flightSession: { speciesId: model.species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: model.quality
    } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 }); for (let i = 0; i < 8; i++) (window as any).owlStep(25); });
    const flight = await snapshot(page);
    await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
    await expect(page.locator('#rh-study-observation-copy')).toContainText(model.species === 'snowyOwl' ? 'white facial feathers' : 'darker rim');
    const structure = await page.evaluate(() => {
      const w = window as any, T = w.THREE, rig = w.owlScene.getObjectByName('raptor-head-rig'), disc = rig.getObjectByName('field-mark-owl-facial-disc'), head = rig.getObjectByName('raptor-head');
      w.owlDisc = disc; w.owlHead = head; w.owlDisposed = { geometry: 0, material: 0, texture: 0 };
      disc.geometry.addEventListener('dispose', () => w.owlDisposed.geometry++); disc.material.addEventListener('dispose', () => w.owlDisposed.material++); disc.material.map.addEventListener('dispose', () => w.owlDisposed.texture++);
      const p = disc.geometry.attributes.position, n = disc.geometry.attributes.normal, color = disc.geometry.attributes.color, ids = disc.geometry.index.array;
      const tri = new T.Triangle(), origin = new T.Vector3(), nearest = new T.Vector3(); let clearance = Infinity, area = Infinity, minColor = 1, maxColor = 0, chroma = 0;
      for (let i = 0; i < ids.length; i += 3) { tri.a.fromBufferAttribute(p, ids[i]); tri.b.fromBufferAttribute(p, ids[i + 1]); tri.c.fromBufferAttribute(p, ids[i + 2]); clearance = Math.min(clearance, tri.closestPointToPoint(origin, nearest).length() - 0.22); area = Math.min(area, tri.getArea()); }
      for (let i = 0; i < color.count; i++) { const rgb = [color.getX(i), color.getY(i), color.getZ(i)]; minColor = Math.min(minColor, ...rgb); maxColor = Math.max(maxColor, ...rgb); chroma = Math.max(chroma, Math.max(...rgb) - Math.min(...rgb)); }
      return { vertices: p.count, triangles: ids.length / 3, headVertices: head.geometry.attributes.position.count, clearance, area, minColor, maxColor, chroma,
        finite: [p, n, color, disc.geometry.attributes.uv].every(attr => Array.from(attr.array).every(Number.isFinite)),
        attached: disc.parent === rig && ['left-eye', 'right-eye', 'hooked-beak'].every(name => rig.getObjectByName(name).parent === rig),
        eyeClearance: Math.min(...['left-eye', 'right-eye'].map(name => rig.getObjectByName(name).position.length() - 0.224)),
        plumage: disc.userData.raptorFacialPlumage, meshes: rig.children.filter(o => o.isMesh).length,
        texture: disc.material.map.uuid, geometry: disc.geometry.uuid, version: p.version, bytes: Object.values(disc.geometry.attributes).reduce((sum: number, attr: any) => sum + attr.array.byteLength, 0) + ids.byteLength,
        drawCalls: w.owlRenderer.info.render.calls, textures: w.owlRenderer.info.memory.textures, geometries: w.owlRenderer.info.memory.geometries };
    });
    expect(structure.finite).toBe(true); expect(structure.attached).toBe(true); expect(structure.clearance).toBeGreaterThan(0.0005); expect(structure.area).toBeGreaterThan(1e-8); expect(structure.eyeClearance).toBeGreaterThan(0.001);
    expect(structure.vertices).toBeLessThanOrEqual(1800); expect(structure.headVertices).toBe(model.quality === 'low' ? 425 : 825); expect(structure.meshes).toBe(model.species === 'greatHorned' ? 10 : 9);
    if (model.species === 'snowyOwl') { expect(structure.minColor).toBeGreaterThan(0.75); expect(structure.chroma).toBeLessThan(0.06); expect(structure.plumage).toBe('white-facial-feathers'); }
    else { expect(structure.maxColor - structure.minColor).toBeGreaterThan(0.3); expect(structure.plumage).toBe('buff-disc-dark-rim'); }
    const pixelChecks: any[] = [];
    for (const view of ['front', 'side']) {
      await page.locator('[data-study-view=' + view + ']').click();
      await page.getByRole('combobox', { name: 'Studio light', exact: true }).selectOption('side');
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-' + view + '.png' });
      await page.locator('[data-raptor-canvas]').evaluate((canvas: any) => { const w = window as any, copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height; const ctx = copy.getContext('2d')!; ctx.drawImage(canvas, 0, 0); w.owlPixels = ctx.getImageData(0, 0, copy.width, copy.height).data; w.owlDisc.visible = false; });
      await page.locator('[data-study-view=' + view + ']').click();
      const changed = await page.locator('[data-raptor-canvas]').evaluate((canvas: any) => { const w = window as any, copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height; const ctx = copy.getContext('2d')!; ctx.drawImage(canvas, 0, 0); const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data; let changed = 0; for (let i = 0; i < pixels.length; i += 4) if (Math.abs(pixels[i] - w.owlPixels[i]) + Math.abs(pixels[i + 1] - w.owlPixels[i + 1]) + Math.abs(pixels[i + 2] - w.owlPixels[i + 2]) > 15) changed++; w.owlDisc.visible = true; return changed; });
      expect(changed).toBeGreaterThan(1000); pixelChecks.push({ view, changed }); await page.locator('[data-study-view=' + view + ']').click();
    }
    frozen(flight, await snapshot(page)); const renders = await page.evaluate(() => (window as any).owlRenders); await page.evaluate(() => (window as any).owlStep(60000)); expect(await page.evaluate(() => (window as any).owlRenders)).toBe(renders);
    await page.locator('[data-study-view=front]').click(); await page.getByRole('button', { name: 'Keep moment', exact: true }).click(); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.flightStudyMoments[0].view.focus)).toBe('head');
    await page.locator('[data-study-view=side]').click(); await page.getByRole('button', { name: 'Match saved view', exact: true }).click(); await expect(page.locator('[data-study-view=front]')).toHaveAttribute('aria-pressed', 'true');
    if (model.quality === 'low') {
      await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 740 }); await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-phone.png' });
      expect(await page.locator('.rh-study-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => v.id))).toEqual([]);
    }
    await page.getByRole('button', { name: 'Close study', exact: true }).click(); const restored = await snapshot(page); expect(restored.cameraPosition).toEqual(flight.cameraPosition); restored.cameraQuaternion.forEach((v: number, i: number) => expect(v).toBeCloseTo(flight.cameraQuaternion[i], 12));
    const stable = await page.evaluate(() => { const w = window as any; return { geometry: w.owlDisc.geometry.uuid, texture: w.owlDisc.material.map.uuid, version: w.owlDisc.geometry.attributes.position.version }; });
    expect(stable).toEqual({ geometry: structure.geometry, texture: structure.texture, version: structure.version });
    writeFileSync(output + '/' + label + '-checks.json', JSON.stringify({ structure, pixelChecks }, null, 2));
    await page.getByRole('button', { name: 'Restart this flight', exact: true }).click(); await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
    const disposed = await page.evaluate(() => (window as any).owlDisposed); expect(disposed.geometry).toBe(1); expect(disposed.material).toBe(1); expect(disposed.texture).toBeGreaterThanOrEqual(1);
    expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
