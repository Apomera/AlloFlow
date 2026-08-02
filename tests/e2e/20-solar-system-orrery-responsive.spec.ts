import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js',
  toolId: 'solarSystem',
  width: 736,
  height: 1600,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test.describe.configure({ timeout: 90_000 });

test('keeps the Orrery free of horizontal overflow at 320px and 736px', async ({ page }) => {
  const widths = [320, 736];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1600 });
    await harness.mount(page, {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: 0,
        orr_sel: 'earth',
      },
    }, undefined, { expectCanvas: false });

    const metrics = await page.evaluate((nextWidth) => {
      const wrap = document.getElementById('wrap');
      if (!wrap) throw new Error('Orrery harness wrapper did not mount');
      wrap.style.width = `${nextWidth}px`;
      const wrapBox = wrap.getBoundingClientRect();
      const overflowing = [...wrap.querySelectorAll<HTMLElement>('*')]
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: element.className,
          rect: element.getBoundingClientRect(),
        }))
        .filter(({ rect }) => rect.width > 0 && (rect.left < wrapBox.left - 1 || rect.right > wrapBox.right + 1))
        .slice(0, 8)
        .map(({ tag, id, className, rect }) => ({ tag, id, className, left: Math.round(rect.left), right: Math.round(rect.right) }));
      return {
        viewportWidth: window.innerWidth,
        wrapWidth: Math.round(wrapBox.width),
        wrapScrollWidth: wrap.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        overflowing,
      };
    }, width);

    expect(metrics.wrapWidth).toBe(width);
    expect(metrics.wrapScrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(width + 1);
    expect(metrics.documentScrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(width + 1);
    expect(metrics.overflowing, JSON.stringify(metrics)).toEqual([]);

    await harness.destroy(page);
  }
});
test('keeps selected-world DOM readouts moving with the orbit clock', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_sel: 'earth',
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  expect(await page.locator('#orrery-timeline-jump-0').getAttribute('aria-pressed')).toBe('true');
  expect(await page.locator('#orrery-timeline-mark-0').getAttribute('aria-current')).toBe('step');
  const activeMarkBorder = await page.locator('#orrery-timeline-mark-0').evaluate((element) => getComputedStyle(element).borderTopColor);

  const before = await page.locator('#orrery-live-timeline-value').textContent();
  await page.evaluate(() => {
    const ctx = (window as any).__ctx;
    ctx.updateMulti('solarSystem', { orr_speed: 1, orr_paused: false });
  });
  await page.waitForTimeout(350);

  const after = await page.locator('#orrery-live-timeline-value').textContent();
  expect(after).not.toBe(before);
  expect(Number(await page.locator('#orrery-phase-scrubber').inputValue())).toBeGreaterThan(0);
  expect(await page.locator('#orrery-phase-scrubber').getAttribute('aria-valuetext')).toContain('years into Earth');
  expect(await page.locator('#orrery-timeline-jump-0').getAttribute('aria-pressed')).toBe('false');
  expect(await page.locator('#orrery-timeline-mark-0').getAttribute('aria-current')).toBe('false');
  expect(await page.locator('#orrery-timeline-mark-0').evaluate((element) => getComputedStyle(element).borderTopColor)).not.toBe(activeMarkBorder);

  await harness.destroy(page);
});