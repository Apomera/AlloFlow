// SCRATCH captures (Claude session e669a4c8) -- delete after use. Not a gate.
import { test } from '@playwright/test';
import { GlHarness } from '../../tests/e2e/helpers/stem_gl_harness';
import fs from 'node:fs';

const OUT = process.env.EV_OUT || "reports/moon-mission-capture-2026-09-26/captures";
const W = Number(process.env.EV_W || 1180), H = Number(process.env.EV_H || 900);
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: W, height: H, appStyles: true });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 900_000 });

// EV_STEPS: comma list of "label:key:ms" actions; each shoots after it runs.
test('eva shots', async ({ page }) => {
  fs.mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: W, height: H });
  await harness.mount(page, { moonMission: Object.assign({ missionPhase: 6, evaStarted: true }, JSON.parse(process.env.EV_SEED || '{}')) }, 'document.querySelector(\'canvas[data-eva-canvas="true"]\')');
  const cv = page.locator('canvas[data-eva-canvas="true"]');
  await cv.scrollIntoViewIfNeeded();
  await page.waitForTimeout(Number(process.env.EV_WAIT || 4000));
  await cv.focus();
  const steps = String(process.env.EV_STEPS || 'start::0').split(',');
  for (const st of steps) {
    const [label, key, ms] = st.split(':');
    if (key) { await page.keyboard.down(key); await page.waitForTimeout(Number(ms)); await page.keyboard.up(key); await page.waitForTimeout(600); }
    await cv.screenshot({ path: `${OUT}/${label}${process.env.EV_TAG || ''}.png` });
  }
  const perf = await page.evaluate(() => (window as any).__evaFps || null);
  console.log('perf', JSON.stringify(perf));
  await harness.destroy(page);
});
