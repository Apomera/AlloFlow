import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// This workflow checks data, real controls and frozen history. Actual alternate
// camera geometry and dock focus are verified separately with the real renderer.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true,
  probes: `window.THREE=undefined;window.StemLab.ensureThree=function(){return Promise.reject(new Error('Renderer deferred for uncertainty-record regression'));};`,
});
test.describe.configure({ timeout: 180_000, retries: 0 });
test.use({ acceptDownloads: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => (window as any).__events?.errors || [])).toEqual([]);
  expect(await harness.glContexts(page), 'this workflow never creates a WebGL context').toEqual([]);
  await harness.destroy(page);
});
async function mount(page: Page, foodWeb: any = { showMeadow: false }) {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true, foodWeb } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white'; });
}
async function notes(page: Page) { return page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook); }

test('explicit uncertain paw observations preserve first and revised evidence through checking, saving, export and legacy reopening', async ({ page }) => {
  await mount(page); await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const fixture = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = api.normalize(w.__toolData.ecosystem.foodWeb.run.config);
    const pair = api.compare(config), frames = api.behaviorTimeline(config, pair.experiment), study = api.motionStudy(frames, 'rabbits', 0), plan = api.footfallPlan(frames, study);
    if (!study || !plan) throw new Error('The current rabbit recording has no complete original movement study');
    const grid = plan.samples.map((sample: any) => sample.feet.map((foot: any) => foot.planted)), prediction = api.footfallCheck(plan, grid).prediction;
    const firstGrid = grid.map((column: boolean[]) => column.map(value => !value)), base = { key: JSON.stringify(config) + '|experiment', id: study.id, species: 'rabbits', order: [0, 1, 2], firstOrder: [2, 0, 1], sequenceAttempted: true, checked: true, reflection: 'Original movement sequence explanation.', saved: false };
    const evidence = api.movementEvidence(study, 'experiment', base, plan);
    const legacyStrip = { version: 1, studyId: study.id, samples: plan.samples, grid, firstGrid, prediction, firstPrediction: 'unsure', reflection: 'Original legacy boolean footfall strip.' };
    const legacy = api.capture(config, pair, evidence.step, 'rabbits', evidence.prediction, evidence.explanation, 1, null, null, { ...evidence.movement, footfall: legacyStrip });
    if (!legacy.movement?.footfall) throw new Error('The genuine legacy fixture was rejected');
    return { study, grid, prediction, firstGrid, legacy, steps: plan.samples.map((sample: any) => sample.step), key: JSON.stringify(api.footfallIdentity(plan, 'experiment')),
      foodWeb: { ...config, run: { config, prediction: 'Original population forecast.' }, showMeadow: true, focus: 'rabbits', cursor: study.samples[0].step, notebook: [legacy], notebookSequence: 1,
        motionStudy: { ...base, footfall: { version: 2, sampleKey: JSON.stringify(api.footfallIdentity(plan, 'experiment')), open: true, grid: Array.from({ length: 3 }, () => Array(4).fill(null)), firstGrid: null, checked: false, visited: [], prediction: '', firstPrediction: '', reflection: '' } }
      }
    };
  });
  await harness.destroy(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page, fixture.foodWeb);
  const movement = page.locator('[data-efw-movement-study]'), lab = movement.locator('[data-efw-footfall-lab]');
  const save = movement.getByRole('button', { name: 'Save movement observation', exact: true });
  const paws = ['Left hind', 'Left fore', 'Right hind', 'Right fore'];
  const check = lab.getByRole('button', { name: 'Check my footfall strip', exact: true });
  await expect(lab.locator('[data-efw-footfall-reduced]')).toContainText('Alternate camera views are off.');
  await expect(lab.getByRole('button', { name: 'Observe checkpoint 1 from left', exact: true })).toBeDisabled();
  await expect(check).toBeDisabled(); await lab.getByLabel('Footfall support prediction', { exact: true }).selectOption('unsure');
  for (let k = 0; k < 3; k++) {
    await lab.getByRole('button', { name: 'Inspect footfall checkpoint ' + (k + 1), exact: true }).press('Enter');
    await expect(lab.locator('[data-efw-footfall-checkpoint="' + k + '"]')).toHaveAttribute('aria-current', 'true');
    await expect(lab.locator('[data-efw-footfall-description]').nth(k)).toContainText('Left hind:');
    for (let j = 0; j < 4; j++) if (!(k === 2 && j === 3)) await lab.getByLabel('Checkpoint ' + (k + 1) + ' ' + paws[j] + ' contact', { exact: true }).selectOption('uncertain');
  }
  await expect(check).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.motionStudy.footfall.grid[2][3])).toBeNull();
  await lab.getByLabel('Checkpoint 3 Right fore contact', { exact: true }).selectOption('uncertain');
  await expect(check).toBeEnabled(); await check.press('Enter');
  const feedback = lab.locator('[data-efw-footfall-feedback]');
  await expect(feedback).toContainText('All 12 marks are uncertain; there are no definite marks to compare.');
  await expect(feedback).not.toContainText('0 of 0');
  await expect(lab.locator('[data-efw-footfall-observation-bounds]')).toContainText('0–4 supporting paws');
  await expect(lab.locator('[data-efw-footfall-observation-bounds]')).toContainText('Your marks leave the support claim unresolved.');
  expect((await notes(page)).length).toBe(1);
  const reflection = 'I could not tell whether the hidden paws supported the body. Unknown is not evidence of no support.';
  await lab.getByLabel('Footfall evidence reflection', { exact: true }).fill(reflection); await expect(save).toBeEnabled(); await save.click();
  const uncertainNote = (await notes(page)).at(-1), frozenUncertain = JSON.stringify(uncertainNote), frozenLegacy = JSON.stringify(fixture.legacy);
  const uncertain = Array.from({ length: 3 }, () => Array(4).fill('uncertain'));
  expect(uncertainNote.movement.footfall).toMatchObject({ version: 2, sampleKey: fixture.key, firstGrid: uncertain, grid: uncertain, firstPrediction: 'unsure', prediction: 'unsure', reflection });
  expect(JSON.stringify((await notes(page))[0])).toBe(frozenLegacy);
  await page.getByRole('button', { name: 'Reopen observation ' + uncertainNote.id, exact: true }).click();
  await expect(lab.getByLabel('Checkpoint 1 Left hind contact', { exact: true })).toHaveValue('uncertain');
  // All twelve explicit marks are required again after a submitted revision;
  // the pending strip cannot silently disappear from the movement save.
  await lab.getByLabel('Checkpoint 3 Right fore contact', { exact: true }).selectOption('');
  await expect(save).toBeDisabled(); await expect(lab.getByRole('button', { name: 'Check revised footfall strip', exact: true })).toBeDisabled();
  await expect(movement).toContainText('Recheck the revised footfall strip before saving this movement observation.');
  for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) await lab.getByLabel('Checkpoint ' + (k + 1) + ' ' + paws[j] + ' contact', { exact: true }).selectOption(fixture.grid[k][j] ? 'contact' : 'clear');
  await lab.getByLabel('Footfall support prediction', { exact: true }).selectOption(fixture.prediction);
  await lab.getByRole('button', { name: 'Check revised footfall strip', exact: true }).press('Enter');
  await expect(feedback).toContainText('12 matching and 0 differing definite marks; 0 uncertain.');
  await expect(feedback).toContainText('First submission: all 12 marks were uncertain.');
  await expect(save).toBeEnabled(); await save.click();
  const revised = (await notes(page)).at(-1);
  expect(revised.movement.footfall).toMatchObject({ version: 2, firstGrid: uncertain, grid: fixture.grid, firstPrediction: 'unsure', prediction: fixture.prediction, sampleKey: fixture.key });
  expect(JSON.stringify((await notes(page))[1])).toBe(frozenUncertain); expect(JSON.stringify((await notes(page))[0])).toBe(frozenLegacy);
  // A legacy record remains v1 in the notebook. Revising its working copy can
  // use the v2 uncertainty vocabulary without rewriting its first answers.
  await page.getByRole('button', { name: 'Reopen observation 1', exact: true }).click();
  await expect(lab.getByLabel('Checkpoint 1 Left hind contact', { exact: true })).toHaveValue(fixture.grid[0][0] ? 'contact' : 'clear');
  await lab.getByLabel('Checkpoint 1 Left hind contact', { exact: true }).selectOption('uncertain'); await expect(save).toBeDisabled();
  await lab.getByRole('button', { name: 'Check revised footfall strip', exact: true }).press('Enter'); await expect(save).toBeEnabled(); await save.click();
  const legacyRevision = (await notes(page)).at(-1);
  expect(legacyRevision.movement.footfall.version).toBe(2); expect(legacyRevision.movement.footfall.firstGrid).toEqual(fixture.firstGrid); expect(legacyRevision.movement.footfall.grid[0][0]).toBe('uncertain');
  expect(JSON.stringify((await notes(page))[0])).toBe(frozenLegacy); expect(JSON.stringify((await notes(page))[1])).toBe(frozenUncertain);
  // An unsaved pre-v2 draft without frozen samples has no provenance to
  // migrate. Keep its answers visible and untouched until an explicit reset.
  const unverifiable = await page.evaluate(({ firstGrid, grid }) => {
    const foodWeb = JSON.parse(JSON.stringify((window as any).__toolData.ecosystem.foodWeb));
    foodWeb.motionStudy.saved = false;
    foodWeb.motionStudy.footfall = { version: 1, open: true, checked: true, visited: [0, 1, 2], grid, firstGrid, prediction: 'supported', firstPrediction: 'unsure', reflection: 'Old unsaved draft without original coordinates.' };
    return foodWeb;
  }, { firstGrid: fixture.firstGrid, grid: fixture.grid });
  const frozenNotebook = JSON.stringify(unverifiable.notebook);
  await harness.destroy(page); await mount(page, unverifiable);
  await expect(lab.locator('[data-efw-footfall-legacy-draft]')).toContainText('no available validated original checkpoints');
  await expect(lab.locator('[data-efw-footfall-legacy-draft]')).toContainText('Preserved first marks:');
  await expect(lab.getByLabel('Checkpoint 1 Left hind contact', { exact: true })).toBeDisabled();
  await expect(save).toBeDisabled();
  await lab.locator('summary').press('Enter'); await lab.locator('summary').press('Enter');
  const retained = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.motionStudy.footfall);
  expect(retained.version).toBe(1); expect(retained.sampleKey).toBeUndefined(); expect(retained.firstGrid).toEqual(fixture.firstGrid); expect(retained.grid).toEqual(fixture.grid);
  await lab.getByRole('button', { name: 'Start a new footfall strip', exact: true }).press('Enter');
  await expect(lab.locator('[data-efw-footfall-legacy-draft]')).toHaveCount(0);
  await expect(lab.getByRole('button', { name: 'Check my footfall strip', exact: true })).toBeDisabled();
  await expect(save).toBeEnabled();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook))).toBe(frozenNotebook);
  const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export field notebook', exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('ecosystem-field-notebook.txt'); expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream(); if (!stream) throw new Error('The browser did not return its completed notebook download');
  const chunks: Buffer[] = []; for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exported = Buffer.concat(chunks).toString('utf8'), prefix = 'Frozen footfall evidence (JSON): ';
  const frozenRecords = exported.split('\n').filter(line => line.startsWith(prefix)).map(line => JSON.parse(line.slice(prefix.length)));
  expect(frozenRecords).toContainEqual(revised.movement.footfall); expect(exported).toContain('First uncertain marks: 12; latest uncertain marks: 0.');
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await test.info().attach('uncertain-footfall-history', { body: JSON.stringify({ saved: (await notes(page)).length, originalUnresolved: 12, revisedUnresolved: 0, legacyVersion: (await notes(page))[0].movement.footfall.version, key: fixture.key }), contentType: 'application/json' });
});
