import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Real controls and persisted history use the tool's handled unavailable-3D
// path. Physical route/matrix invariants remain in ecosystem-cue-lab.spec.ts.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true,
  probes: `window.THREE=undefined;window.StemLab.ensureThree=function(){return Promise.reject(new Error('Renderer deferred for paired cue evidence lifecycle'));};`,
});
const reportDir = process.env.ECOLOGY_REPORT_DIR || 'reports/ecosystem-observation-next';
test.use({ acceptDownloads: true });
test.describe.configure({ timeout: 180_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => (window as any).__events?.errors || [])).toEqual([]);
  expect(await harness.glContexts(page), 'paired evidence lifecycle creates no WebGL context').toEqual([]);
  await harness.destroy(page);
});
async function notebook(page: Page) { return page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook); }

test('collecting an explicit control supports one fair intervention, preserves first/revised predictions, guards stale controls and reopens both frozen runs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white'; });
  await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByLabel('Your prediction (optional)', { exact: true }).fill('A detached rule test cannot establish a changed animal route or population outcome.');
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const meadow = page.locator('[data-efw-meadow]');
  if (!(await meadow.isVisible())) await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  const fixture = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = api.normalize(w.__toolData.ecosystem.foodWeb.run.config), result = api.compare(config), frames = api.behaviorTimeline(config, result.baseline), encounter = api.encounters(frames, config).find((item: any) => item.kind === 'spacing'), context = api.spacingProbeCase(frames, encounter);
    if (!context) throw new Error('Rabbit neighbors has no complete original spacing decision');
    const control = api.spacingProbeRun(context, 'feeding', true), trial = api.spacingProbeRun(context, 'feeding', false);
    return { context, control, trial, key: api.spacingProbeContextKey(context, 'baseline'), wrong: trial.outcome === 'continue' ? 'stop' : 'continue', run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  });
  const fieldwork = meadow.locator('[data-efw-fieldwork]');
  await fieldwork.locator('[data-efw-encounter="spacing"]').click();
  await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('avoid');
  await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
  const bench = fieldwork.locator('[data-efw-cue-probe]'), save = fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true });
  await bench.locator('summary').press('Enter');
  await bench.getByLabel('Cue test variable', { exact: true }).selectOption('feeding');
  await bench.getByLabel('Cue test neighbor action', { exact: true }).selectOption('resting');
  await bench.getByLabel('Cue test prediction', { exact: true }).selectOption(fixture.trial.outcome);
  await bench.getByRole('button', { name: 'Test this cue', exact: true }).press('Enter');
  await save.click();
  const legacy = (await notebook(page))[0], frozenLegacy = JSON.stringify(legacy);
  expect(legacy.sighting.probe).toMatchObject({ version: 1, trial: fixture.trial });
  expect(legacy.sighting.probe).not.toHaveProperty('control');

  // Collecting is a real action, rather than treating the bench's recomputed
  // original output as if the learner had already collected a control.
  await bench.getByRole('button', { name: 'Collect control for a paired test', exact: true }).press('Enter');
  await expect(bench.getByLabel('Cue test variable', { exact: true })).toBeDisabled();
  await expect(bench.locator('[data-efw-cue-pair-control]')).toContainText('Grazing');
  await expect(bench.locator('[data-efw-cue-pair-control]')).toContainText('Giving space');
  await expect(bench.locator('[data-efw-cue-pair-intervention]')).toContainText('Not collected yet');
  await expect(save).toBeDisabled();
  await bench.getByRole('button', { name: 'Use original neighbor input', exact: true }).click();
  await expect(bench.getByRole('button', { name: 'Run paired cue test', exact: true })).toBeDisabled();
  await expect(bench.locator('[data-efw-cue-pair]')).toContainText('an unchanged run is not a treatment');
  await bench.getByLabel('Cue test neighbor action', { exact: true }).selectOption('resting');
  await bench.getByLabel('Cue test prediction', { exact: true }).selectOption(fixture.wrong);
  await bench.getByRole('button', { name: 'Run paired cue test', exact: true }).press('Enter');
  const first = await page.evaluate(() => { const p = (window as any).__toolData.ecosystem.foodWeb.fieldwork.probe; return { firstPrediction: p.firstPrediction, control: p.control, trial: p.trial }; });
  expect(first).toEqual({ firstPrediction: fixture.wrong, control: fixture.control, trial: fixture.trial });
  await expect(save).toBeEnabled();
  await bench.getByLabel('Cue test prediction', { exact: true }).selectOption(fixture.trial.outcome);
  await expect(save).toBeDisabled();
  await expect(bench.locator('[data-efw-cue-pair]')).toContainText('Recheck the revised paired prediction before saving.');
  await bench.getByRole('button', { name: 'Check revised paired prediction', exact: true }).press('Enter');
  await bench.getByLabel('Paired cue test reflection', { exact: true }).fill('The unchanged control reproduced spacing. I changed only the selected neighbor action; another neighbor could still provide a spacing cue. This is one rule decision, not a changed route.');
  await expect(bench.locator('[data-efw-cue-pair]')).toContainText('Your latest paired prediction matches this intervention.');
  await save.click();
  const saved = (await notebook(page))[1], frozenPairNote = JSON.stringify(saved);
  expect(saved.sighting.probe).toMatchObject({ version: 2, branch: 'baseline', contextKey: fixture.key, ...first, prediction: fixture.trial.outcome });
  expect(JSON.stringify((await notebook(page))[0])).toBe(frozenLegacy);

  await page.getByRole('button', { name: 'Reopen observation 1', exact: true }).press('Enter');
  await expect(bench.locator('[data-efw-cue-probe-output]')).toBeVisible();
  await expect(bench.locator('[data-efw-cue-pair]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.probe.version)).toBe(1);
  await page.getByRole('button', { name: 'Reopen observation 2', exact: true }).press('Enter');
  await expect(bench.locator('[data-efw-cue-pair-intervention]')).toContainText('Resting');
  await expect(bench.getByLabel('Cue test variable', { exact: true })).toBeDisabled();
  await bench.getByLabel('Cue test neighbor action', { exact: true }).selectOption('feeding');
  await expect(bench.locator('[data-efw-cue-pair-pending]')).toContainText('Its frozen result remains above.');
  await expect(bench.locator('[data-efw-cue-pair-intervention]')).toContainText('Resting');
  await expect(bench.getByRole('button', { name: 'Check revised paired prediction', exact: true })).toBeDisabled();
  await expect(save).toBeDisabled();
  await bench.locator('summary').press('Enter'); await expect(bench).not.toHaveAttribute('open', '');
  await fieldwork.locator('[data-efw-save-readiness]').getByRole('button', { name: 'Return to cue test', exact: true }).press('Enter');
  await expect(bench).toHaveAttribute('open', ''); await expect(bench.getByLabel('Cue test prediction', { exact: true })).toBeFocused();
  await bench.getByLabel('Cue test neighbor action', { exact: true }).selectOption('resting');
  await bench.getByRole('button', { name: 'Check revised paired prediction', exact: true }).press('Enter');
  await save.click();
  const resaved = (await notebook(page))[2];
  expect(resaved.sighting.probe).toEqual(saved.sighting.probe);
  expect(JSON.stringify((await notebook(page))[0])).toBe(frozenLegacy); expect(JSON.stringify((await notebook(page))[1])).toBe(frozenPairNote);
  await bench.locator('[data-efw-cue-pair]').screenshot({ path: reportDir + '/cue-pair-desktop.jpg', type: 'jpeg', quality: 90 });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'the collected comparison remains usable on a phone').toBe(true);
  await expect(bench.locator('[data-efw-cue-pair] table')).toBeVisible();
  await bench.locator('[data-efw-cue-pair]').screenshot({ path: reportDir + '/cue-pair-mobile.jpg', type: 'jpeg', quality: 90 });
  await page.setViewportSize({ width: 1140, height: 1050 });
  const frozenNotebook = JSON.stringify(await notebook(page));
  await bench.getByRole('button', { name: 'Start a new cue test', exact: true }).press('Enter');
  await expect(bench.locator('[data-efw-cue-pair]')).toHaveCount(0); await expect(bench.getByLabel('Cue test variable', { exact: true })).toBeEnabled();
  await expect(save).toBeEnabled(); expect(JSON.stringify(await notebook(page))).toBe(frozenNotebook);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(fixture.run);
  await page.setViewportSize({ width: 390, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  // Keep actual browser download completion after all history assertions so a
  // host download failure cannot hide the legacy/reopen/reset coverage.
  const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export field notebook', exact: true }).click();
  const download = await downloading; expect(download.suggestedFilename()).toBe('ecosystem-field-notebook.txt'); expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream(); expect(stream).toBeTruthy(); let exported = '';
  for await (const chunk of stream!) exported += chunk.toString();
  const prefix = 'Frozen paired cue experiment (JSON): ',pairs = exported.split('\n').filter(line => line.startsWith(prefix)).map(line => JSON.parse(line.slice(prefix.length)));
  expect(pairs).toEqual([saved.sighting.probe, resaved.sighting.probe]); expect(exported).toContain('Frozen original rule inputs (JSON): '); expect(exported).toContain('Held fixed: actor, all other rabbits, food availability and decision time.');
  await test.info().attach('paired-cue-evidence-history', { body: JSON.stringify({ control: first.control, intervention: first.trial, firstPrediction: first.firstPrediction, latestPrediction: saved.sighting.probe.prediction, legacyVersion: legacy.sighting.probe.version, frozenNotes: (await notebook(page)).length }), contentType: 'application/json' });
});
