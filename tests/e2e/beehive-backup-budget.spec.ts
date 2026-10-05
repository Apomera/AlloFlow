import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive', preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, extraScripts: ['node_modules/axe-core/axe.min.js'], width: 1280, height: 950 });
test.describe.configure({ timeout: 120000 });
test.use({ reducedMotion: 'reduce', viewport: { width: 1280, height: 950 } });
test.beforeAll(async () => { mkdirSync('scratch/beehive-roadmap', { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: any, state: any = {}, dark = false) {
  await page.goto(harness.url + '/__harness');
  await page.evaluate(({ state, dark }: any) => {
    const w = window as any;
    w.__mount({ wave: { saved: 'other tool remains' }, beehive: { tutorialDone: true, soundOn: false, motionPaused: true, ...state } });
    w.__ctx.isDark = dark; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, { state, dark });
  await expect(page.locator('[data-beehive-root]')).toBeVisible();
}
async function openBackup(page: any) {
  await page.locator('#beehive-notebook-summary').click();
  await page.locator('[data-beehive-backup] > summary').click();
}
const file = (state: any) => ({ name: 'bee-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'alloflow-beehive-backup', schemaVersion: 1, createdAt: '2026-10-01T08:00:00Z', state })) });
const stateOn = (page: any) => page.evaluate(() => (window as any).__toolData.beehive);

test('downloads, reviews, restores once, and undoes a backup without disturbing other tools', async ({ page }) => {
  await mount(page, { day: 9, simulationSeed: 0, randomState: 17, honey: 30, syrup: 8, notebook: { synthesis: 'Original evidence' } });
  await openBackup(page);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-bee-backup-download]').click();
  const download = await downloadPromise;
  const saved = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(saved).toMatchObject({ kind: 'alloflow-beehive-backup', schemaVersion: 1, state: { day: 9, simulationSeed: 0, randomState: 17, syrup: 8, notebook: { synthesis: 'Original evidence' } } });
  const replacement = { day: 5, honey: 24, syrup: 3, simulationSeed: 0, randomState: 900, notebook: { synthesis: 'Imported evidence' }, autoAdvance: true, queen: { active: true, paused: false, day: 7, score: 120 } };
  await page.locator('[data-bee-backup-file]').setInputFiles(file(replacement));
  await expect(page.locator('[data-bee-backup-review] h5')).toBeFocused();
  expect((await stateOn(page)).day).toBe(9);
  await page.getByRole('button', { name: 'Cancel backup review' }).click();
  await expect(page.locator('[data-bee-backup-review]')).toHaveCount(0);
  await expect(page.locator('[data-bee-backup-download]')).toBeFocused();
  expect((await stateOn(page)).notebook.synthesis).toBe('Original evidence');
  await page.locator('[data-bee-backup-file]').setInputFiles(file(replacement));
  await expect(page.locator('[data-bee-backup-restore]')).toBeVisible();
  await page.evaluate(() => {
    const button = document.querySelector('[data-bee-backup-restore]') as HTMLButtonElement;
    (window as any).ReactDOM.unstable_batchedUpdates(() => { button.click(); button.click(); });
  });
  await expect(page.locator('[data-bee-backup-undo]')).toBeVisible();
  await expect(page.locator('[data-bee-backup-download]')).toBeFocused();
  expect(await stateOn(page)).toMatchObject({ day: 5, randomState: 900, autoAdvance: false, motionPaused: true, queen: { active: true, paused: true, day: 7 }, notebook: { synthesis: 'Imported evidence' } });
  await page.locator('[data-bee-backup-undo]').click();
  await expect(page.locator('[data-bee-backup-download]')).toBeFocused();
  expect(await stateOn(page)).toMatchObject({ day: 9, randomState: 17, simulationSeed: 0, syrup: 8, notebook: { synthesis: 'Original evidence' }, autoAdvance: false });
  expect(await page.evaluate(() => (window as any).__toolData.wave.saved)).toBe('other tool remains');
});

test('reviews damaged fields before restoring and stays readable on a phone', async ({ page }) => {
  await mount(page, { day: 12, notebook: { synthesis: 'Keep this until restore' } }, true);
  await openBackup(page); await page.setViewportSize({ width: 320, height: 900 });
  await page.locator('[data-bee-backup-file]').setInputFiles({ name: 'wrong.json', mimeType: 'application/json', buffer: Buffer.from('not JSON') });
  await expect(page.locator('[data-beehive-backup] [role=alert]')).toContainText('not valid JSON');
  expect((await stateOn(page)).day).toBe(12);
  await page.locator('[data-bee-backup-file]').setInputFiles(file({ day: 27, workers: 17000, honey: 28, history: {}, journal: {}, notebook: { synthesis: 'Recovered note', discoveries: { stores: { explanation: 'Food budget' } } }, experimentArchive: { schemaVersion: 1, records: [{ broken: true }] } }));
  await expect(page.locator('[data-bee-backup-review]')).toContainText('history, journal');
  await expect(page.locator('[data-bee-backup-review]')).toContainText('1 unsupported or damaged trial');
  expect((await stateOn(page)).day).toBe(12);
  const box = await page.locator('[data-beehive-backup]').boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(321);
  expect(await page.locator('[data-beehive-backup]').evaluate((node: HTMLElement) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await page.locator('[data-beehive-backup]').screenshot({ path: 'scratch/beehive-roadmap/backup-phone-review.png' });
  const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-beehive-backup]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.failureSummary) })));
  expect(violations).toEqual([]);
  await page.locator('[data-bee-backup-restore]').click();
  expect(await stateOn(page)).toMatchObject({ day: 27, workers: 17000, honey: 28, history: [], journal: [], notebook: { synthesis: 'Recovered note' } });
});

test('advancing a fed colony preserves food origins and queen introduction timing', async ({ page }) => {
  await mount(page, { day: 0, simulationSeed: 24581, honey: 200, syrup: 190, queenHealth: 30 });
  await page.locator('[data-management-choice="requeen"]').click();
  expect((await stateOn(page)).queenTransition).toMatchObject({ kind: 'requeen', daysRemaining: 3 });
  await expect(page.locator('[data-colony-queen-transition]')).toContainText('3 more modeled');
  for (let day = 1; day <= 3; day++) {
    await page.locator('[data-discovery-advance]').click();
    expect((await stateOn(page)).day).toBe(day);
  }
  const state = await stateOn(page);
  expect(state.queenTransition).toBeNull(); expect(state.queenHealth).toBe(100);
  expect(state.syrup).toBeGreaterThan(180);
  await expect(page.locator('[data-colony-food-origins]')).toContainText('nectar-derived honey');
  await expect(page.locator('[data-colony-food-origins]')).toContainText('syrup cannot be harvested');
  expect(state.broodCohorts.workers.length).toBe(21); expect(state.broodCohorts.drones.length).toBe(24);
  expect(state.experimentEnvironment).toMatchObject({ gardenBonus: 0, trackedFromDay: 0 });
});
