import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000 });
test.use({ video: 'off', trace: 'off' });
const report = 'reports/dinolab-3d-evidence-scale';
const baseline = process.env.DINOLAB_EVIDENCE_BASELINE === '1';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_dinolab.js', toolId: 'dinoLab', width: 1180, height: 920, appStyles: true,
  probes: "var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__evidenceScene=s;window.__evidenceCamera=c;window.__evidenceRenderer=r;return render(s,c);};return r;};"
});
test.beforeAll(async () => { fs.mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

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
    field3dScanLogged: { skull: true }, field3dScanSpecies: species, ...state
  } }, undefined, { expectCanvas: false });
  const css = fs.readFileSync('app_styles_module.js', 'utf8'), start = css.indexOf(':root, .theme-default {');
  await page.addStyleTag({ content: css.slice(start, css.indexOf('/* ─', css.indexOf('--allo-stem-button-border:#00ff00', start))) });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block';
  });
  await expect.poll(() => page.evaluate(() => !!(window as any).__evidenceScene)).toBe(true);
  await page.getByRole('button', { name: 'Fit whole animal', exact: true }).click();
  await settle(page);
}
async function inspect(page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, s = w.__evidenceScene, c = w.__evidenceCamera;
    const m = s.getObjectByName('dinolab-specimen'), r = w.__evidenceRenderer;
    s.updateMatrixWorld(true); c.updateMatrixWorld(true);
    const canvas = document.querySelector('.dinolab-3d-canvas') as HTMLCanvasElement;
    function measure(mesh) {
      const geometry = mesh.geometry.parameters;
      const box = new T.Box3().setFromObject(mesh), points = [];
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        points.push(new T.Vector3(x, y, z).project(c));
      }
      return {
        name: mesh.name, radius: geometry.radius ?? geometry.radiusTop, height: geometry.height,
        local: mesh.position.toArray(), scale: mesh.scale.toArray(),
        pixels: [(Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))) * canvas.clientWidth / 2,
          (Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))) * canvas.clientHeight / 2]
      };
    }
    const markers = [], halos = [], beams = [], sockets = [], labels = [], placed = [];
    m.traverse(p => {
      if (p.isMesh) {
        if (p.geometry.type === 'SphereGeometry' && [10, 23].includes(p.renderOrder) && p.material.isMeshBasicMaterial) markers.push(measure(p));
        if (p.geometry.type === 'TorusGeometry' && [22, 25, 34].includes(p.renderOrder)) halos.push(measure(p));
        if (p.geometry.type === 'CylinderGeometry' && [24, 33].includes(p.renderOrder) && p.material.isMeshBasicMaterial) beams.push(measure(p));
        if (p.name.startsWith('evidence-socket-')) sockets.push(measure(p));
        if (p.userData.dinoAssemblyPiece) placed.push({ piece: p.userData.dinoAssemblyPiece, ...measure(p) });
      }
      if (p.isSprite && /^(Skull|Shoulder|Hip)( done)?$/.test(p.userData.dinoLabel)) {
        const v = p.getWorldPosition(new T.Vector3()).project(c);
        labels.push({ text: p.userData.dinoLabel, visible: p.visible, local: p.position.toArray(), center: [(v.x + 1) * canvas.clientWidth / 2, (1 - v.y) * canvas.clientHeight / 2] });
      }
    });
    const b = m.userData.studyBounds.head;
    return { markers, halos, beams, sockets, labels, placed, headSpan: b.max[0] - b.min[0], bounds: m.userData.specimenBounds,
      errors: w.__events.errors, lost: w.__glLive().lost, shaderFailures: r.info.programs.filter(p => p.diagnostics && p.diagnostics.runnable === false).length };
  });
}
function check(result) {
  expect(result.errors).toEqual([]); expect(result.lost).toBe(false); expect(result.shaderFailures).toBe(0);
  expect(result.markers).toHaveLength(3); expect(result.halos.length).toBeGreaterThanOrEqual(2);
  for (const item of [...result.markers, ...result.halos, ...result.beams]) {
    expect([...item.local, ...item.scale, ...item.pixels].every(Number.isFinite)).toBe(true);
  }
}
const speciesHeights = { microraptor: .25, anchiornis: .25, sinosauropteryx: .3, tyrannosaurus: 3.7, brachiosaurus: 12 };
for (const species of Object.keys(speciesHeights)) test(species + ' keeps evidence proportionate in close-up and whole views', async ({ page }) => {
  await mount(page, species);
  const whole = await inspect(page); check(whole);
  await page.getByRole('button', { name: 'Study head details', exact: true }).click(); await settle(page);
  const head = await inspect(page); check(head);
  const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  if (!baseline) {
    const height = speciesHeights[species];
    for (const marker of head.markers) expect(marker.radius / height).toBeLessThanOrEqual(.046);
    for (const halo of head.halos) expect(halo.radius / height).toBeLessThanOrEqual(.111);
    expect(head.beams).toHaveLength(1);
    expect(head.beams[0].height / height).toBeLessThanOrEqual(.451);
    expect(head.markers[0].radius * 2 / head.headSpan).toBeLessThan(.24);
  }
  if (species === 'microraptor') {
    await page.setViewportSize({ width: 390, height: 844 }); await settle(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (!baseline) {
      const layout = await page.locator('.dinolab-3d-evidence-route [role=listitem] button').evaluateAll(buttons => buttons.map(button => {
        const label = button.children[1].getBoundingClientRect(), state = button.children[2].getBoundingClientRect(), bounds = button.getBoundingClientRect();
        return { overlap: state.top < label.bottom && state.right > label.left, inside: label.right <= bounds.right && state.right <= bounds.right, height: bounds.height };
      }));
      for (const button of layout) { expect(button.overlap).toBe(false); expect(button.inside).toBe(true); expect(button.height).toBeGreaterThanOrEqual(44); }
    }
    await page.locator('.dinolab-3d-shell').screenshot({ path: report + '/' + (baseline ? 'before' : 'after') + '-microraptor-mobile.png' });
    if (!baseline) {
      await page.locator('.dinolab-3d-canvas').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('PageUp'); await settle(page);
      const camera = await inspect(page); check(camera);
      expect(camera.markers.map(p => p.local)).toEqual(head.markers.map(p => p.local));
      expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(saved);
      await page.locator('.dinolab-surface-presets').getByRole('button', { name: /Fossil anchors/ }).click(); await settle(page);
      const fossil = await inspect(page); check(fossil);
      expect(fossil.markers.map(p => p.radius)).toEqual(head.markers.map(p => p.radius));
      await expect(page.getByRole('button', { name: 'Study head details', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.locator('.dinolab-3d-shell').screenshot({ path: report + '/microraptor-fossil-mobile.png' });
    }
  } else if (!baseline) {
    await page.locator('.dinolab-3d-canvas').screenshot({ path: report + '/' + species + '-head.png' });
  }
  fs.writeFileSync(report + '/' + (baseline ? 'before-' : '') + species + '.json', JSON.stringify({ whole, head }, null, 2));
});

for (const species of ['microraptor', 'tyrannosaurus']) test(species + ' keeps placed fossils and claim highlights proportionate', async ({ page }) => {
  const placed = { skull: true, spine: true, ribs: true, pelvis: true, hindlimb: true, tail: true };
  await mount(page, species, {
    field3dScanLogged: { skull: true, shoulder: true, hip: true },
    field3dAssemblyPlaced: placed, field3dAssemblySpecies: species,
    field3dClaimBone: 'skull', field3dClaimBoneSpecies: species
  });
  const whole = await inspect(page); check(whole);
  expect(whole.sockets).toHaveLength(6); expect(whole.placed).toHaveLength(11);
  expect(new Set(whole.placed.map(p => p.piece))).toEqual(new Set(Object.keys(placed)));
  const height = speciesHeights[species];
  for (const socket of whole.sockets) expect(socket.radius / height).toBeLessThanOrEqual(.091);
  const claim = whole.halos.find(p => p.name === 'evidence-claim-halo-skull');
  expect(claim).toBeDefined(); expect(claim.radius / height).toBeLessThanOrEqual(.121);
  for (const piece of whole.placed) {
    expect([...piece.local, ...piece.scale, ...piece.pixels].every(Number.isFinite)).toBe(true);
    if (piece.piece === 'ribs') expect(piece.radius / height).toBeLessThan(.2);
    if (piece.piece === 'hindlimb') {
      expect(piece.local[1]).toBeLessThan(height);
      expect(piece.radius / height).toBeLessThan(.025);
    }
  }
  await page.getByRole('button', { name: 'Study head details', exact: true }).click(); await settle(page);
  check(await inspect(page));
  await page.locator('.dinolab-3d-canvas').screenshot({ path: report + '/' + species + '-claim-head.png' });
  await page.getByRole('button', { name: 'Study body details', exact: true }).click(); await settle(page);
  await page.locator('.dinolab-3d-canvas').screenshot({ path: report + '/' + species + '-assembly-body.png' });
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.field3dAssemblyPlaced)).toEqual(placed);
  fs.writeFileSync(report + '/' + species + '-assembly.json', JSON.stringify(whole, null, 2));
});

test('phone evidence route still focuses and logs each anchor', async ({ page }) => {
  await mount(page, 'anchiornis', { field3dScanLogged: {} });
  await page.setViewportSize({ width: 390, height: 844 }); await settle(page);
  for (const label of ['Skull', 'Shoulder', 'Hip']) {
    const focus = page.getByRole('button', { name: new RegExp('^Focus ' + label + ' evidence anchor') });
    await focus.focus(); await page.keyboard.press('Enter'); await settle(page);
    await expect(focus).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('.dinolab-3d-camera-readout')).toContainText(label + ' anchor');
    await page.getByRole('button', { name: 'Log ' + label + ' observation', exact: true }).click(); await settle(page);
  }
  await expect(page.locator('.dinolab-3d-evidence-route')).toContainText('3/3');
  expect(await page.evaluate(() => (window as any).__toolData.dinoLab.field3dScanLogged)).toEqual({ skull: true, shoulder: true, hip: true });
  const result = await inspect(page); check(result); expect(result.sockets).toHaveLength(6);
  await page.locator('.dinolab-3d-shell').screenshot({ path: report + '/anchiornis-completed-route-mobile.png' });
});
