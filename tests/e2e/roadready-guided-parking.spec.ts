import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 1100, height: 780, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'], probes: "window.__testHooks={};document.documentElement.classList.add('theme-dark');" });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test('keyboard driver can follow the instructor from the starting pose to legal parking', async ({ page }) => {
  await page.setViewportSize({ width: 1140, height: 950 });
  await harness.mount(page, { roadReady: { view: 'parking', reducedMotion: true, badges: { park_master: true } } }, undefined, { expectCanvas: false });
  const coach = page.getByRole('region', { name: 'Parking instructor' });
  const status = page.getByRole('region', { name: 'Live parking measurements' }).getByRole('status');
  // React to the rendered instruction in the browser. Protocol round trips can
  // take longer than a steering cue under CPU load; they are not learner reaction time.
  await page.evaluate(() => {
    const instructor = document.querySelector('[aria-label="Parking instructor"]')!;
    const key = (type: string, value: string, code: string) => document.body.dispatchEvent(new KeyboardEvent(type, { key: value, code, bubbles: true, cancelable: true }));
    const cues: string[] = [];
    (window as any).__parkingDrivenCues = cues;
    const observer = new MutationObserver(() => {
      const text = instructor.textContent || '';
      if (cues.length === 0 && text.includes('Straighten the wheels and keep reversing')) {
        cues.push('straighten'); key('keyup', 'd', 'KeyD');
      } else if (cues.length === 1 && text.includes('Steer left while reversing')) {
        cues.push('countersteer'); key('keydown', 'a', 'KeyA');
      } else if (cues.length === 2 && text.includes('Straighten the wheels and stop')) {
        cues.push('stop'); key('keyup', 'a', 'KeyA'); key('keyup', 's', 'KeyS'); key('keydown', ' ', 'Space');
        observer.disconnect();
      }
    });
    observer.observe(instructor, { subtree: true, childList: true, characterData: true });
    key('keydown', 's', 'KeyS'); key('keydown', 'd', 'KeyD');
  });
  await expect.poll(() => page.evaluate(() => (window as any).__parkingDrivenCues), { timeout: 30000 }).toEqual(['straighten', 'countersteer', 'stop']);
  await expect(status).toContainText('Ready to secure');
  await page.keyboard.up(' ');
  await page.getByRole('button', { name: 'Park + parking brake', exact: true }).click();
  await expect(status).toContainText('Parking secured');
  await expect(coach).toContainText('100/100 (0 hits)');
  await page.screenshot({ path: 'reports/roadready-review/parking-guided-complete.png', fullPage: true, scale: 'css' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
