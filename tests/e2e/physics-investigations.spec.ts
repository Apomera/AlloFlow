import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 120_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1000, height: 900, layout: 'document', appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function installClock(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__advancePhysics = () => {
      const canvas = document.getElementById('physicsCanvas') as any;
      let count = 0;
      while (canvas._launched && count++ < 10000) {
        now += 1000 / 60;
        const next = [...frames.values()]; frames.clear(); next.forEach(fn => fn(now));
      }
      return !canvas._launched;
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { w.__copiedInvestigation = text; },
    } });
  });
}
async function openNotebook(page: Page) {
  const notebook = page.locator('[data-physics-investigations]');
  if (!(await notebook.evaluate(el => (el as HTMLDetailsElement).open))) await notebook.locator('summary').click();
  return notebook;
}
async function launchAndFinish(page: Page, count: number) {
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__advancePhysics())).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.physics.runLog.length)).toBe(count);
}

test('a guided experiment saves immutable evidence and exports it after restoration', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await installClock(page);
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  const notebook = await openNotebook(page);
  await notebook.locator('[data-physics-investigation-activity]').selectOption('speed_squared');
  await notebook.locator('#physics-investigation-prediction').fill('Doubling speed will give four times the range.');
  await notebook.locator('[data-physics-investigation-trial="1"]').click();
  await launchAndFinish(page, 1);
  await notebook.locator('[data-physics-investigation-trial="2"]').click();
  await launchAndFinish(page, 2);
  await expect(notebook.locator('#physics-investigation-prediction')).toHaveValue('Doubling speed will give four times the range.');
  const runs = await page.evaluate(() => (window as any).__toolData.physics.runLog);
  expect(runs[1].vel / runs[0].vel).toBe(2);
  expect(runs[1].range / runs[0].range).toBeCloseTo(4, 8);
  expect(runs.every((run: any) => run.launchHeight === 0 && run.modelVersion === 'projectile-v3')).toBe(true);
  await notebook.getByRole('checkbox', { name: 'Run 1', exact: true }).check();
  await notebook.getByRole('checkbox', { name: 'Run 2', exact: true }).check();
  await expect(notebook.locator('[data-physics-investigation-comparison]')).toContainText(/range/i);
  await notebook.locator('#physics-investigation-title').fill('Speed and range evidence');
  await notebook.locator('#physics-investigation-observation').fill('The second measured range was four times the first.');
  await notebook.locator('#physics-investigation-claim').fill('At fixed angle and gravity without drag, range scales with speed squared.');
  await notebook.locator('[data-physics-investigation-save]').click();
  await expect(notebook.locator('[data-physics-investigation-report]')).toContainText('Speed and range evidence');
  const report = await notebook.locator('[data-physics-investigation-report]').innerText();
  await page.getByRole('button', { name: 'Clear the experiment log', exact: true }).click();
  await expect(notebook.locator('[data-physics-investigation-report]')).toHaveText(report);
  const snapshot = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
  expect(snapshot.physics.runLog).toEqual([]);
  await harness.mount(page, snapshot, undefined, { expectCanvas: false });
  const restored = await openNotebook(page);
  await expect(restored.locator('[data-physics-investigation-report]')).toHaveText(report);
  await restored.locator('[data-physics-investigation-copy]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__copiedInvestigation)).toBe(report);
  expect(report).toMatch(/Run 1/);
  expect(report).toMatch(/Run 2/);
  expect(report).toMatch(/m\/s/);
  expect(report).toContain('projectile-v3');
  expect(report).toContain('Launch height above ground: 0 m');
  expect(report).toContain('Doubling speed will give four times the range.');
  expect(errors).toEqual([]);
});

test('activity settings cannot override an active mission', async ({ page }) => {
  await installClock(page);
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  const notebook = await openNotebook(page);
  await notebook.locator('[data-physics-investigation-activity]').selectOption('mass_drag');
  for (const mode of ['targetMode', 'challengeActive', 'battleMode']) {
    await page.evaluate(key => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: {
      ...prev.physics, targetMode: false, challengeActive: false, battleMode: false, [key]: true,
    } })), mode);
    await expect(notebook.locator('[data-physics-investigation-trial="1"]')).toBeDisabled();
    await expect(notebook.locator('[data-physics-investigation-trial="2"]')).toBeDisabled();
  }
});

test('legacy run IDs stay selectable and unknown model provenance remains visible', async ({ page }) => {
  const legacy = { angle: 45, vel: 15, grav: 9.8, mass: 1, drag: false, range: 22.8, maxH: 5.7, time: 2.16 };
  await installClock(page);
  await harness.mount(page, { physics: { runLog: [legacy, { ...legacy, vel: 30, range: 91.5, maxH: 22.8, time: 4.32 }], runCount: 2 } }, undefined, { expectCanvas: false });
  const notebook = await openNotebook(page);
  await notebook.getByRole('checkbox', { name: 'Run 1', exact: true }).check();
  await notebook.getByRole('checkbox', { name: 'Run 2', exact: true }).check();
  await notebook.locator('#physics-investigation-title').fill('Recovered measurements');
  await notebook.locator('#physics-investigation-observation').fill('These measurements were recorded before the numerical model was identified.');
  await expect(notebook.getByRole('checkbox', { name: 'Run 1', exact: true })).toBeChecked();
  await expect(notebook.getByRole('checkbox', { name: 'Run 2', exact: true })).toBeChecked();
  await expect(notebook.locator('[data-physics-investigation-comparison]')).toContainText('Recorded model versions are missing or different.');
  await notebook.locator('[data-physics-investigation-save]').click();
  const report = notebook.locator('[data-physics-investigation-report]');
  await expect(report).toContainText('Run 1');
  await expect(report).toContainText('Run 2');
  await expect(report).toContainText(/numerical model versions/i);
  await expect(report).toContainText('These measurements were recorded before');
});
