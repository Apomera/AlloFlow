import { expect, test, type Page, type Locator } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';

const report = process.env.FIRST_RESPONSE_HAND_COMPARISON_REPORT || 'reports/firstresponse-hand-comparison';
const expectedSourceSha = process.env.FIRST_RESPONSE_HAND_COMPARISON_SOURCE_SHA;
const baselineSourceSha = 'cc354bd12dd0712e1e628ebfc16689ba584c3b988d1b085df5a41e1f67cecc26';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
const prompt = 'Choose a hand close-up to compare the completed poses.';
const nearLegend = 'After the turn, which side of the near hand stays facing upward?';
const supportLegend = 'As the body turns, which surface of the supporting hand stays beside the cheek?';
const evidence: Record<string, unknown>[] = [];
const errors = new WeakMap<Page, string[]>();

// This pass changes comparison controls, not mesh data. Keep browser evidence
// bounded to the rendered camera, tool state, GL owner and resource counters.
// The source preservation report separately verifies the unchanged geometry.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_firstresponse.js', toolId: 'firstResponse',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1160, height: 1080,
  layout: 'document', appStyles: true,
  probes: `
    window.__comparisonDraws = new WeakMap();
    var ComparisonRenderer = THREE.WebGLRenderer;
    THREE.WebGLRenderer = new Proxy(ComparisonRenderer, {construct: function(target, args, newTarget) {
      var renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
      renderer.render = function(scene, camera) {
        var result = render.apply(this, arguments);
        if (scene && scene.isScene && camera && camera.isPerspectiveCamera
            && scene.getObjectByName('fr-training-manikin')) {
          var previous = window.__comparisonDraws.get(this.domElement);
          window.__comparisonDraws.set(this.domElement, {
            scene: scene, camera: camera, renderer: renderer,
            calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
            sequence: previous ? previous.sequence + 1 : 1
          });
        }
        return result;
      };
      return renderer;
    }});
    window.__comparisonProbe = function() {
      var canvas = document.querySelector('#wrap canvas');
      var drawn = canvas && window.__comparisonDraws.get(canvas);
      var record = canvas && window.__glRecorder.forCanvas(canvas);
      if (!drawn || !record) return null;
      var camera = drawn.camera, box = canvas.getBoundingClientRect();
      camera.updateMatrixWorld(true);
      return {
        camera: {
          position: camera.getWorldPosition(new THREE.Vector3()).toArray(),
          quaternion: camera.quaternion.toArray(),
          projection: camera.projectionMatrix.elements.slice(), aspect: camera.aspect
        },
        draw: {
          id: record.id, createdBy: record.createdBy, draws: record.draws,
          sequence: drawn.sequence, calls: drawn.calls, triangles: drawn.triangles,
          geometries: drawn.renderer.info.memory.geometries,
          programs: drawn.renderer.info.programs.length
        },
        canvasSize: [box.width, box.height],
        state: window.__ctx.toolData.firstResponse,
        errors: window.__events.errors.slice()
      };
    };
  `,
});

test.describe.configure({ mode: 'default', retries: 0, timeout: 480000 });
test.beforeAll(async () => {
  expect(expectedSourceSha, 'runner must pin the integrated source').toMatch(/^[a-f0-9]{64}$/);
  expect(createHash('sha256').update(readFileSync('stem_lab/stem_tool_firstresponse.js')).digest('hex')).toBe(expectedSourceSha);
  expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js'))
    .toEqual(readFileSync('stem_lab/stem_tool_firstresponse.js'));
  mkdirSync(report, { recursive: true });
  await harness.start();
});
test.afterAll(async () => {
  writeFileSync(report + '/hand-comparison-metrics.json', JSON.stringify({ baselineSourceSha, finalSourceSha: expectedSourceSha, evidence }, null, 2));
  await harness.stop();
});
test.beforeEach(async ({ page }) => {
  const found: string[] = []; errors.set(page, found);
  page.on('pageerror', error => found.push('page: ' + error.message));
  page.on('console', message => { if (message.type() === 'error') found.push('console: ' + message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator('.fr-body3d-stage').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const previous = await page.evaluate(() => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    return { id: runtime.__glRecorder.forCanvas(canvas)?.id || 0, sequence: runtime.__comparisonDraws.get(canvas)?.sequence || 0 };
  });
  await page.waitForFunction(previous => {
    const canvas = document.querySelector('#wrap canvas'), runtime = window as any;
    const record = runtime.__glRecorder.forCanvas(canvas), drawn = runtime.__comparisonDraws.get(canvas);
    return record && drawn && drawn.sequence >= (record.id === previous.id ? previous.sequence + 2 : 2);
  }, previous);
}

async function probe(page: Page): Promise<any> {
  // Transfer a single native JSON string. Remote JSHandle property walking
  // stalled on the loaded Windows runner in the preceding hand-study pass.
  const encoded = await page.evaluate(() => JSON.stringify((window as any).__comparisonProbe(), (key, value) => {
    if (value === undefined) return { __frComparisonUndefined: true };
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Non-finite comparison evidence: ' + key);
    return value;
  }));
  expect(encoded, 'the page must have drawn a real training model').not.toBe('null');
  function restore(value: any): any {
    if (value && typeof value === 'object') {
      if (Object.keys(value).length === 1 && value.__frComparisonUndefined === true) return undefined;
      for (const key of Object.keys(value)) value[key] = restore(value[key]);
    }
    return value;
  }
  const result = restore(JSON.parse(encoded));
  expect(result.draw.createdBy).toBe('page');
  expect(result.draw.draws).toBeGreaterThan(0);
  expect(result.draw.sequence).toBeGreaterThanOrEqual(2);
  expect(result.draw.calls).toBeGreaterThan(0);
  expect(result.draw.triangles).toBeGreaterThan(0);
  expect(result.camera.aspect).toBeCloseTo(result.canvasSize[0] / result.canvasSize[1], 2);
  expect(result.errors).toEqual([]);
  return result;
}

async function activate(page: Page, button: Locator, keyboard: boolean) {
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); }
  else await button.click();
}

function rail(page: Page) { return page.locator('.fr-recovery-comparison'); }
function caption(kind: 'near' | 'support', pose: number) {
  return 'Selected hand: ' + (kind === 'near' ? 'Near hand' : 'Supporting hand')
    + ' · Pose ' + pose + ' — ' + (pose === 4 ? 'Before the turn' : 'After the turn');
}

async function selected(page: Page, kind: 'near' | 'support' | null, pose: number) {
  const panel = rail(page);
  await expect(panel).toHaveCount(1);
  const description = kind ? caption(kind, pose) : prompt;
  await expect(panel.locator('.fr-recovery-comparison-caption')).toHaveText(description);
  await expect(page.locator('.fr-body3d-stage')).toHaveAttribute('aria-describedby', 'fr-recovery-comparison-caption');
  await expect(page.locator('.fr-body3d-stage')).toHaveAccessibleDescription(description);
  const selections: [Locator, boolean][] = [
    [panel.getByRole('button', { name: 'Near hand', exact: true }), kind === 'near'],
    [panel.getByRole('button', { name: 'Supporting hand', exact: true }), kind === 'support'],
    [panel.getByRole('button', { name: 'Before the turn', exact: true }), !!kind && pose === 4],
    [panel.getByRole('button', { name: 'After the turn', exact: true }), !!kind && pose === 5],
    [page.getByRole('button', { name: 'Inspect before the turn', exact: true }), kind === 'near' && pose === 4],
    [page.getByRole('button', { name: 'Inspect after the turn', exact: true }), kind === 'near' && pose === 5],
    [page.getByRole('button', { name: 'Inspect support before turn', exact: true }), kind === 'support' && pose === 4],
    [page.getByRole('button', { name: 'Inspect support after turn', exact: true }), kind === 'support' && pose === 5],
    [page.getByRole('button', { name: 'Near palm before turn', exact: true }), kind === 'near' && pose === 4],
    [page.getByRole('button', { name: 'Near palm after turn', exact: true }), kind === 'near' && pose === 5],
    [page.getByRole('button', { name: 'Supporting hand before turn', exact: true }), kind === 'support' && pose === 4],
    [page.getByRole('button', { name: 'Supporting hand after turn', exact: true }), kind === 'support' && pose === 5],
  ];
  for (const [button, pressed] of selections) await expect(button).toHaveAttribute('aria-pressed', String(pressed));
  await expect(panel.getByRole('button', { name: 'Near hand', exact: true })).toBeEnabled();
  await expect(panel.getByRole('button', { name: 'Supporting hand', exact: true })).toBeEnabled();
  for (const label of ['Before the turn', 'After the turn']) {
    if (kind) await expect(panel.getByRole('button', { name: label, exact: true })).toBeEnabled();
    else await expect(panel.getByRole('button', { name: label, exact: true })).toBeDisabled();
  }
}

async function openStudy(page: Page, keyboard: boolean) {
  const details = page.locator('details.fr-hand-study');
  await expect(details).toHaveCount(1);
  if (!(await details.evaluate(element => (element as HTMLDetailsElement).open))) {
    const summary = details.locator('summary');
    if (keyboard) { await summary.focus(); await page.keyboard.press('Enter'); } else await summary.click();
  }
  await expect(details).toHaveAttribute('open', '');
  return details;
}

async function notebookUnchanged(page: Page, details: Locator, note: string) {
  await expect(details.getByRole('textbox', { name: 'Explain your hand comparison', exact: true })).toHaveValue(note);
  await expect(details.getByRole('group', { name: nearLegend, exact: true }).getByRole('radio', { name: 'Palm side', exact: true })).toBeChecked();
  await expect(details.getByRole('group', { name: supportLegend, exact: true }).getByRole('radio', { name: 'Back of hand', exact: true })).toBeChecked();
  await expect(details.locator('.fr-hand-study-feedback')).toContainText('Compare your choices with the model');
}

async function audit(page: Page, name: string) {
  await page.addScriptTag({ content: axe });
  const result = await page.evaluate(async () => {
    const options = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      rules: matchMedia('(forced-colors:active)').matches ? { 'color-contrast': { enabled: false } } : {} };
    const report = await (window as any).axe.run('.fr-recovery-comparison', options);
    return { scope: '.fr-recovery-comparison', violations: report.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) };
  });
  writeFileSync(report + '/' + name + '-axe.json', JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  expect(errors.get(page)).toEqual([]);
}

async function capture(page: Page, name: string) {
  await settle(page);
  await page.locator('.fr-body3d-stage').screenshot({ path: report + '/' + name + '-stage.png', timeout: 60000 });
  await rail(page).screenshot({ path: report + '/' + name + '-comparison.png', timeout: 60000 });
}

async function compare(page: Page, button: Locator, kind: 'near' | 'support', pose: number, reference: any, keyboard: boolean) {
  const before = await probe(page);
  await activate(page, button, keyboard);
  const stage = page.locator('.fr-body3d-stage');
  await expect(stage).toBeFocused();
  const box = await stage.boundingBox(); expect(box).toBeTruthy();
  const viewport = page.viewportSize()!;
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  await settle(page);
  const after = await probe(page);
  expect(after.state).toEqual({ ...before.state, b3dRecView: pose });
  expect(after.camera).toEqual(reference.camera);
  expect(after.draw.calls).toBe(reference.draw.calls);
  expect(after.draw.triangles).toBe(reference.draw.triangles);
  expect(after.draw.id).toBe(before.draw.id);
  if (before.state.b3dRecView === pose) {
    expect(after.draw.geometries).toBe(before.draw.geometries);
    expect(after.draw.programs).toBe(before.draw.programs);
  }
  await selected(page, kind, pose);
  return after;
}

async function workflow(page: Page, age: 'adult' | 'infant', width: number, keyboard: boolean) {
  await page.setViewportSize({ width, height: keyboard ? 840 : 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const note = 'The near palm keeps its folds upward; the supporting hand stays beside the cheek.';
  const study = { version: 1, near: 'palm', support: 'back', checked: true, note };
  await harness.mount(page, { firstResponse: {
    consentAccepted: true, view: 'body3d', b3dTab: 'recovery', b3dAge: age,
    b3dRec: completed, b3dRecView: 5, b3dRecoveryGuides: false,
    b3dHandStudy: { [age]: study }, b3dChildHands: 'two', b3dPlaced: 'correct',
    b3dDepthLab: { age: 'child', depth: 5, lean: 1, rate: 110, motion: 'inspect', phase: 50, hands: true, anatomy: false, measure: false },
    b3dDepthReference: { age: 'child', depth: 5, lean: 0 },
    b3dDepthInquiry: { signature: 'hand-comparison-observation', explanation: 'Keep this saved prediction.' },
  } });
  await page.addStyleTag({ content: '#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}' });
  await settle(page);
  const original = await probe(page), details = await openStudy(page, keyboard);
  await selected(page, null, 5);
  await notebookUnchanged(page, details, note);
  expect(await rail(page).evaluate(element => {
    const stage = document.querySelector('.fr-body3d-stage');
    return !!stage && stage.nextElementSibling === element;
  }), 'comparison controls stay directly beside the displayed model').toBe(true);

  // Reference the existing detail controls independently of the comparison
  // buttons, including both hands at the same actual recovery pose.
  const reference: Record<string, any> = {};
  for (const pose of [4, 5]) {
    await page.getByLabel('Pose to inspect', { exact: true }).selectOption(String(pose));
    await settle(page);
    for (const kind of ['near', 'support'] as const) {
      const before = await probe(page);
      await activate(page, page.getByRole('button', { name: kind === 'near' ? 'Palm detail view' : 'Supporting hand close-up', exact: true }), keyboard);
      await settle(page);
      const after = await probe(page); reference[kind + pose] = after;
      expect(after.state).toEqual(before.state);
      await selected(page, kind, pose);
    }
    expect(reference['near' + pose].camera).not.toEqual(reference['support' + pose].camera);
  }
  const comparisons: any[] = [];
  comparisons.push(await compare(page, rail(page).getByRole('button', { name: 'Before the turn', exact: true }), 'support', 4, reference.support4, keyboard));
  comparisons.push(await compare(page, rail(page).getByRole('button', { name: 'After the turn', exact: true }), 'support', 5, reference.support5, keyboard));
  comparisons.push(await compare(page, page.getByRole('button', { name: 'Inspect before the turn', exact: true }), 'near', 4, reference.near4, keyboard));
  comparisons.push(await compare(page, page.getByRole('button', { name: 'Inspect after the turn', exact: true }), 'near', 5, reference.near5, keyboard));
  // Switching hand beside the model while pose 5 remains unchanged must update
  // every equivalent legacy/study control and refit the matching hand camera.
  comparisons.push(await compare(page, rail(page).getByRole('button', { name: 'Supporting hand', exact: true }), 'support', 5, reference.support5, keyboard));
  comparisons.push(await compare(page, rail(page).getByRole('button', { name: 'Near hand', exact: true }), 'near', 5, reference.near5, keyboard));
  await notebookUnchanged(page, details, note);
  const prefix = keyboard ? 'phone-infant' : 'adult';
  await audit(page, prefix + '-normal');
  await capture(page, prefix + '-near-after');

  // Reset and a general preset clear the selected hand without erasing the
  // learner's observations or changing their completed recovery sequence.
  const beforeReset = await probe(page);
  await activate(page, page.getByRole('button', { name: 'Reset the view', exact: true }), keyboard);
  await settle(page); await selected(page, null, 5);
  expect((await probe(page)).state).toEqual(beforeReset.state);
  comparisons.push(await compare(page, details.getByRole('button', { name: 'Supporting hand after turn', exact: true }), 'support', 5, reference.support5, keyboard));
  const beforeGeneral = await probe(page);
  await activate(page, page.getByRole('button', { name: 'Whole manikin', exact: true }), keyboard);
  await settle(page); await selected(page, null, 5);
  expect((await probe(page)).state).toEqual(beforeGeneral.state);
  comparisons.push(await compare(page, details.getByRole('button', { name: 'Supporting hand after turn', exact: true }), 'support', 5, reference.support5, keyboard));

  if (keyboard) {
    const narrow = await probe(page);
    await page.setViewportSize({ width: 760, height: 840 }); await settle(page);
    const wide = await probe(page);
    expect(wide.state).toEqual(narrow.state);
    expect(wide.draw.id).toBe(narrow.draw.id);
    expect(wide.draw.geometries).toBe(narrow.draw.geometries);
    expect(wide.draw.programs).toBe(narrow.draw.programs);
    await selected(page, 'support', 5);
    await page.setViewportSize({ width: 320, height: 840 }); await settle(page);
    const restored = await probe(page);
    expect(restored.state).toEqual(narrow.state);
    expect(restored.draw.id).toBe(narrow.draw.id);
    for (let axis = 0; axis < 3; axis++) expect(restored.camera.position[axis]).toBeCloseTo(narrow.camera.position[axis], 6);
    await selected(page, 'support', 5);
    await page.emulateMedia({ forcedColors: 'active' });
    await audit(page, prefix + '-forced-colors');
    await capture(page, prefix + '-forced-colors');
    await page.emulateMedia({ forcedColors: 'none' });
  }
  await notebookUnchanged(page, details, note);
  const final = await probe(page);
  expect(final.state).toEqual(original.state);
  expect(final.state.b3dHandStudy[age]).toEqual(study);
  writeFileSync(report + '/' + prefix + '-evidence.json', JSON.stringify({ baselineSourceSha, finalSourceSha: expectedSourceSha, original, reference, comparisons, final }, null, 2));
  evidence.push({ age, width, referenceCameras: 4, comparisonCameraChecks: 8, finalDraw: final.draw });
  expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect((await harness.glContexts(page)).filter(record => record.connected && record.inWrap && !record.lost)).toHaveLength(1);
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.locator('#wrap canvas').count()).toBe(0);
  expect(errors.get(page)).toEqual([]);
}

test('adult comparison rail follows the selected hand and actual before/after pose', async ({ page }) => { await workflow(page, 'adult', 1280, false); });
test('320px infant comparison rail keeps keyboard focus selection resize and forced colors', async ({ page }) => { await workflow(page, 'infant', 320, true); });
