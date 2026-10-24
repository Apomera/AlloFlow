import {test, expect, type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

// The transfer cases, the restoration mission, and the meadow's wayfinding.
const shots = 'scratch/butterfly-field-cases';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_butterfly.js', toolId: 'butterfly',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1280, height: 1000,
});
test.describe.configure({timeout: 180000, retries: 0});
test.use({viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce'});
test.beforeAll(async () => { mkdirSync(shots, {recursive: true}); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({page}) => harness.destroy(page));

async function mount(page: Page, saved: Record<string, unknown> = {}, fallback = true) {
  await page.goto(harness.url + '/__harness');
  await page.evaluate(({saved, fallback}) => {
    const w = window as any;
    if (fallback) w.StemLab.ensureThree = () => Promise.reject(new Error('Test map fallback'));
    w.__mount({butterfly: saved});
    Object.assign(document.getElementById('wrap')!.style, {width: '100%', height: 'auto', display: 'block'});
  }, {saved, fallback});
  await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer', fallback ? 'map' : 'three');
}
async function audit(page: Page) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-butterfly-root]'), {
      runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']},
    });
    return result.violations.map((v: any) => ({id: v.id, nodes: v.nodes.map((n: any) => ({target: n.target, summary: n.failureSummary}))}));
  });
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test('a learner predicts a field case, checks it against the model, keeps it, and can try again', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page, {observations: ['milkweed']});
  const cases = page.getByRole('region', {name: 'Where would the generation stop?'});
  await expect(page.locator('.bf-notebook [data-bf-citation]')).toHaveCount(1);
  const roadside = cases.locator('[data-case="roadside"]');
  await expect(cases.locator('.bf-cases-score')).toHaveText('0 of 6 checked · 0 matched');
  const check = roadside.getByRole('button', {name: 'Check with the model · Roadside milkweed strip', exact: true});
  await expect(check).toBeDisabled();
  await roadside.getByLabel('Where does the generation stop?').selectOption('chrysalis');
  await expect(check).toBeDisabled();
  await roadside.getByLabel('Why?').selectOption('cut');
  await check.click();
  // Milkweed is there; the early cut removes it before the caterpillar stage.
  await expect(roadside).toHaveAttribute('data-checked', 'true');
  await expect(roadside).toHaveAttribute('data-matched', 'false');
  await expect(roadside.locator('.bf-case-result')).toContainText('it stops at the caterpillar stage');
  await expect(roadside.locator('[data-bf-timeline="early"]')).toHaveAttribute('data-bf-reveal', 'true');
  await expect(cases.locator('.bf-cases-score')).toHaveText('1 of 6 checked · 0 matched');
  const saved = await page.evaluate(() => (window as any).__toolData.butterfly);
  expect(saved.version).toBe(6);
  expect(saved.cases).toEqual({answers: {roadside: {stop: 'chrysalis', reason: 'cut'}}});
  // Practice is never offered as evidence for the notebook.
  await expect(page.locator('.bf-notebook [data-bf-citation]')).toHaveCount(1);
  await roadside.screenshot({path: shots + '/roadside-checked.png'});
  await audit(page);

  await roadside.getByRole('button', {name: 'Try this case again · Roadside milkweed strip', exact: true}).click();
  await expect(roadside).toHaveAttribute('data-checked', 'false');
  await roadside.getByLabel('Where does the generation stop?').selectOption('caterpillar');
  await roadside.getByLabel('Why?').selectOption('cut');
  await roadside.getByRole('button', {name: 'Check with the model · Roadside milkweed strip', exact: true}).click();
  await expect(roadside).toHaveAttribute('data-matched', 'true');
  await expect(cases.locator('.bf-cases-score')).toHaveText('1 of 6 checked · 1 matched');
  expect(errors).toEqual([]);
});

test('the mission card follows the restoration plot records and resets when it is replanted', async ({page}) => {
  await mount(page, {
    observations: ['milkweed', 'bergamot', 'lawn'],
    restoration: {design: 'mixed', prediction: null, trials: [{design: 'mixed', prediction: 'both'}]},
    lifecycle: {patch: null, prediction: null, stage: null, broods: [{patch: 'restoration', plan: 'mixed', prediction: 'complete', result: 'complete'}]},
    season: {mowing: 'never', prediction: null, runs: [{patch: 'restoration', plan: 'mixed', mowing: 'never', prediction: 'complete', result: 'complete'}]},
  });
  const mission = page.locator('.bf-mission');
  await expect(mission).toHaveAttribute('data-bf-mission', 'supported');
  await expect(mission).toContainText('Your records support this plan: Plant milkweed + bergamot');
  await expect(mission.locator('li[data-done="true"]')).toHaveCount(3);
  await mission.screenshot({path: shots + '/mission-supported.png'});
  const design = page.getByRole('region', {name: 'Habitat design activity'});
  await design.getByRole('button', {name: /Plant wild bergamot/}).click();
  await design.getByRole('combobox').selectOption('nectar');
  await design.getByRole('button', {name: 'Apply habitat plan', exact: true}).click();
  await expect(mission).toHaveAttribute('data-bf-mission', 'open');
  await expect(mission.locator('li[data-done="true"]')).toHaveCount(0);
  await audit(page);
});

test('Listen reads the mission and a field case aloud through the browser voice', async ({page}) => {
  await mount(page);
  await page.evaluate(() => { const w = window as any; w.__spoken = []; w.speechSynthesis.speak = (u: any) => w.__spoken.push(u.text); });
  await page.getByRole('button', {name: 'Listen · your mission', exact: true}).click();
  await page.getByRole('button', {name: 'Listen · Park meadow', exact: true}).click();
  const spoken: string[] = await page.evaluate(() => (window as any).__spoken);
  expect(spoken[0]).toContain('Your mission: plan the restoration plot');
  expect(spoken[0]).toContain('Still to do:');
  expect(spoken[1]).toContain('Park meadow.');
  expect(spoken[1]).toContain('Mowing plan: Cut after the generation.');
});

test('the life cycle loop, the stage icons and the season timeline render in every theme without new accessible names', async ({page}) => {
  await mount(page);
  await expect(page.locator('.bf-wheel')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.bf-uses li')).toHaveCount(4);
  await expect(page.locator('.bf-facts li')).toHaveCount(4);
  const unhidden = await page.evaluate(() => Array.from(document.querySelectorAll('[data-butterfly-root] svg')).filter(svg => !svg.closest('[aria-hidden="true"]')).length);
  expect(unhidden).toBe(0);
  await expect(page.locator('.bf-season [data-bf-timeline="never"]')).toHaveAttribute('data-bf-reveal', 'false');
  for (const theme of ['dark', 'contrast']) {
    await page.evaluate((theme) => { const w = window as any; w.__ctx.isDark = true; w.__ctx.isContrast = theme === 'contrast'; w.__rerender(); }, theme);
    await page.locator('.bf-life-card').screenshot({path: shots + '/life-' + theme + '.png'});
    await audit(page);
  }
});

test('phone width keeps the new panels inside the page', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await mount(page);
  await page.locator('[data-case="garden"]').scrollIntoViewIfNeeded();
  await page.locator('.bf-cases').screenshot({path: shots + '/cases-phone.png'});
  await audit(page);
});

test('in 3D, bees work the flowers, the minimap rides along in flight and the overview names every patch', async ({page}) => {
  await mount(page, {}, false);
  await page.evaluate(() => {
    const w = window as any, original = w.THREE.Scene.prototype.onAfterRender;
    w.THREE.Scene.prototype.onAfterRender = function (renderer: any, scene: any, camera: any) {
      if (this.getObjectByName('player-monarch')) w.__fieldScene = this;
      return original.call(this, renderer, scene, camera);
    };
  });
  await page.getByRole('button', {name: 'Map', exact: true}).click();
  await page.getByRole('button', {name: 'Map', exact: true}).click();
  await expect.poll(() => page.evaluate(() => !!(window as any).__fieldScene)).toBe(true);
  const bees = await page.evaluate(() => { const list: any[] = []; (window as any).__fieldScene.traverse((o: any) => { if (o.name === 'meadow-bumblebee' && o.visible) list.push(o.position.toArray()); }); return list; });
  expect(bees.length).toBe(5);
  const signs = await page.evaluate(() => ['milkweed', 'bergamot', 'lawn', 'restoration'].filter(id => !!(window as any).__fieldScene.getObjectByName('trail-sign-' + id)).length);
  expect(signs).toBe(4);
  await page.getByRole('button', {name: 'Take flight', exact: true}).click();
  await page.locator('.bf-stage').focus();
  await page.keyboard.down('KeyW'); await page.waitForTimeout(700); await page.keyboard.up('KeyW');
  await expect(page.locator('.bf-minimap')).toBeVisible();
  await expect(page.locator('.bf-place-label[data-place="milkweed"]')).toBeHidden();
  await page.getByRole('button', {name: 'Meadow view', exact: true}).click();
  await expect(page.locator('.bf-minimap')).toBeHidden();
  await expect(page.locator('.bf-place-label:visible')).toHaveCount(4);
  await page.locator('.bf-stage').screenshot({path: shots + '/overview-labels.png'});
});
