import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GlHarness } from '../../tests/e2e/helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
test('diagnose changes to the paused visual frame inputs', async ({ page }) => {
  // Observe the existing serialization in this diagnostic page only. Production
  // source and renderer inputs are preserved. No assertion replaces acceptance.
  await page.addInitScript(() => {
    const original = JSON.stringify;
    (window as any).__mmVisualKeys = [];
    (JSON as any).stringify = function(value: any, ...args: any[]) {
      const serialized = (original as any)(value, ...args);
      if (Array.isArray(value) && value.length === 15 && typeof value[0] === 'number' &&
        typeof value[10] === 'string' && typeof value[12] === 'number' && typeof value[13] === 'number' && typeof value[14] === 'boolean') {
        (window as any).__mmVisualKeys.push({ at: performance.now(), key: JSON.parse(serialized) });
      }
      return serialized;
    };
  });
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(() => {
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__mount({ moonMission: { missionPhase: 5, descentStarted: true, descentPredictionOpen: false,
      animPaused: true, soundOff: true, difficulty: 'pilot', missionXP: 42, landingRewarded: true,
      lunarSamples: [], quizCorrect: 0, earnedBadges: { first_step: true, mission_complete: true } } });
  });
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  await page.locator('[data-descent-vectors] > summary').click();
  await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-available', 'true');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  await expect.poll(async () => (await harness.glScene(page, '[data-descent-session]'))?.draws || 0).toBeGreaterThan(0);
  const samples: any[] = [];
  for (let i = 0; i < 10; i++) {
    samples.push({ i, scene: await harness.glScene(page, '[data-descent-session]'),
      keys: await page.evaluate(() => (window as any).__mmVisualKeys) });
    await page.waitForTimeout(100);
  }
  await writeFile(join(__dirname, 'cache-diagnostic.json'), JSON.stringify({ samples }, null, 2));
  expect(samples[0].keys.length).toBeGreaterThan(0);
});
