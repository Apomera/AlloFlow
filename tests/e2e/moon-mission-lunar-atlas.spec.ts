import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_LUNAR_ATLAS_REPORT_DIR || 'reports/moon-mission-enhancement-pass40-2026-10-10/browser/atlas');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 4, animPaused: true, soundOff: true, missionXP: 0, missionLog: [], lunarSamples: [],
  difficulty: 'pilot', quizCorrect: 0, earnedBadges: { first_step: true, mission_complete: true }, ...extra,
} });
async function mount(page: Page, data: any = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-lunar-atlas]')).toBeVisible();
  await expect.poll(() => page.locator('[data-lunar-atlas]').getAttribute('data-atlas-site')).not.toBeNull();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function flight(page: Page) {
  const state = await saved(page); delete state.moonLabels; delete state.lunarAtlasSite; return state;
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator('[data-lunar-atlas-workspace]').screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function atlasPixels(page: Page) {
  return page.locator('[data-lunar-atlas]').evaluate((cv: HTMLCanvasElement) => {
    const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let hash = 2166136261; for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data[i], 16777619);
    return hash >>> 0;
  });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-lunar-atlas-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  await info.attach(name, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
  expect(violations).toEqual([]);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('lunar atlas spherical light and site inspection preserve flight state across desktop, phone and reload', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Record atlas text extents from the real Chromium font metrics.
  await page.addInitScript(() => {
    (window as any).__atlasText = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
      if (this.canvas.hasAttribute('data-lunar-atlas')) {
        const scale = this.getTransform().a, metrics = this.measureText(text), width = metrics.width;
        const left = this.textAlign === 'right' ? x - width : this.textAlign === 'center' ? x - width / 2 : x;
        (window as any).__atlasText.push({ text, left, right: left + width, top: y - metrics.actualBoundingBoxAscent,
          bottom: y + metrics.actualBoundingBoxDescent, width: this.canvas.width / scale, height: this.canvas.height / scale, font: this.font });
      }
      return original.call(this, text, x, y, maxWidth as number);
    };
  });
  await mount(page, seed({ loiRun: { version: 1, time: 300, recorded: false } }));
  const initialFlight = await flight(page);
  await expect(page.locator('[data-lunar-atlas-selection]')).toContainText('10.8°');
  await expect(page.locator('[data-lunar-atlas-selection]')).toContainText('0.674°N, 23.473°E');
  await expect(page.locator('[data-lunar-light-note]')).toContainText('Other missions landed on different dates');
  const desktopRadius = Number(await page.locator('[data-lunar-atlas]').getAttribute('data-atlas-radius'));
  expect(desktopRadius).toBeGreaterThan(125);
  await capture(page, info, 'atlas-daylight-1100');
  const geometry = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, term = P.terminatorLon() * Math.PI / 180;
    // Rasterize light on a uniform white sphere, separately from texture and labels.
    const cv = document.createElement('canvas'); cv.width = cv.height = 512;
    const ctx = cv.getContext('2d')!; ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 512, 512);
    P.drawLunarLighting(ctx, 256, 256, 240, P.terminatorLon());
    const pixels = ctx.getImageData(0, 0, 512, 512).data;
    const points = [[0, 0], [-0.7, 0], [0.7, 0], [0.4, 0], [0.4, 0.7], [1.04, 0.2]];
    const rows = points.map(([u, v]) => {
      const x = Math.round(256 + 240 * u), y = Math.round(256 - 240 * v);
      const normal = [u, v, Math.sqrt(Math.max(0, 1 - u * u - v * v))];
      const mu = normal[0] * Math.cos(term) - normal[2] * Math.sin(term);
      const alpha = u * u + v * v > 1 ? 0 : mu <= 0 ? 0.9 : 0.9 * (1 - Math.pow(mu, 0.55));
      return { u, v, mu, red: pixels[(y * 512 + x) * 4], expectedRed: 255 * (1 - alpha) + 4 * alpha };
    });
    let light = 0, disc = 0, mismatch = 0;
    for (let y = 20; y < 492; y += 3) for (let x = 20; x < 492; x += 3) {
      const u = (x - 256) / 240, v = (256 - y) / 240, z2 = 1 - u * u - v * v;
      if (z2 < 0.02) continue;
      const mu = u * Math.cos(term) - Math.sqrt(z2) * Math.sin(term);
      disc++; if (mu > 0) light++;
      if (Math.abs(mu) > 0.06) { const red = pixels[(y * 512 + x) * 4]; if (mu < 0 ? red > 35 : red < 45) mismatch++; }
    }
    (window as any).__atlasLightCanvas = cv; return { rows, light, disc, mismatch };
  });
  for (const row of geometry.rows) expect(Math.abs(row.red - row.expectedRed)).toBeLessThan(4);
  expect(geometry.mismatch).toBe(0);
  expect(geometry.light / geometry.disc).toBeGreaterThan(0.37);
  expect(geometry.light / geometry.disc).toBeLessThan(0.40);
  const lightingPng = await page.evaluate(() => (window as any).__atlasLightCanvas.toDataURL());
  const lightingPath = join(REPORT, 'atlas-light-mask.png');
  await writeFile(lightingPath, Buffer.from(lightingPng.split(',')[1], 'base64'));
  await info.attach('atlas-light-mask', { path: lightingPath, contentType: 'image/png' });
  await page.locator('[data-moonmission-moon-labels]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-moonmission-moon-labels]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-moonmission-moon-sites] > ul').first().locator('li')).toHaveCount(6);
  await expect(page.locator('[data-lunar-atlas-seas] li')).toHaveCount(8);
  const measuredSites = [];
  for (const mission of [11, 12, 14, 15, 16, 17]) {
    await page.locator('[data-lunar-atlas-select]').selectOption(String(mission));
    await expect(page.locator('[data-lunar-atlas]')).toHaveAttribute('data-atlas-site', String(mission));
    const row = await page.evaluate((m: number) => {
      const P = (window as any).MoonMissionPure, s = P.moonSites().find((s: any) => s.m === m);
      const expected = Math.asin(Math.cos(s.lat * Math.PI / 180) * Math.sin((s.lon - P.terminatorLon()) * Math.PI / 180)) * 180 / Math.PI;
      return { mission: m, expected, displayed: Number((document.querySelector('[data-lunar-atlas]') as HTMLElement).dataset.atlasElevation) };
    }, mission);
    expect(row.displayed).toBeCloseTo(row.expected, 8); measuredSites.push(row);
    expect(await flight(page)).toEqual(initialFlight);
  }
  await expect(page.locator('[data-lunar-atlas-selection]')).toContainText('17.0°');
  await capture(page, info, 'atlas-sites-1100');
  await accessibility(page, info, 'atlas-a11y-1100');
  const settled = await atlasPixels(page); await page.waitForTimeout(250); expect(await atlasPixels(page)).toBe(settled);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(async () => Number(await page.locator('[data-lunar-atlas]').getAttribute('data-atlas-radius'))).toBeLessThan(125);
  const stablePhone = await atlasPixels(page); await page.waitForTimeout(250); expect(await atlasPixels(page)).toBe(stablePhone);
  expect(await flight(page)).toEqual(initialFlight);
  await page.locator('[data-lunar-atlas-select]').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await expect(page.locator('[data-lunar-atlas-select]')).toHaveValue('12');
  await expect(page.locator('[data-lunar-atlas]')).toHaveAttribute('data-atlas-site', '12');
  await expect(page.locator('[data-lunar-atlas-selection]')).toContainText('3.012°S, 23.422°W');
  await expect(page.locator('[data-lunar-atlas-selection]')).toContainText('Below the horizon');
  await capture(page, info, 'atlas-night-site-320');
  await page.locator('[data-lunar-atlas-select]').selectOption('11');
  await expect(page.locator('[data-lunar-atlas]')).toHaveAttribute('data-atlas-site', '11');
  await capture(page, info, 'atlas-site-keys-320');
  await accessibility(page, info, 'atlas-a11y-320');
  const bounds = await page.locator('[data-lunar-atlas-workspace]').evaluate(el => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    controls: [...el.querySelectorAll('button,select')].map(c => { const b = c.getBoundingClientRect(); return { left: b.left, right: b.right, height: b.height }; }),
    smallText: [...el.querySelectorAll('p,li,select,label')].filter(c => parseFloat(getComputedStyle(c).fontSize) < 12).length,
  }));
  expect(bounds.overflow).toBe(false); expect(bounds.smallText).toBe(0);
  for (const b of bounds.controls) { expect(b.left).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(320); expect(b.height).toBeGreaterThanOrEqual(44); }
  const text = await page.evaluate(() => (window as any).__atlasText);
  for (const t of text) { expect(t.left, t.text).toBeGreaterThanOrEqual(0); expect(t.right, t.text).toBeLessThanOrEqual(t.width); expect(t.top).toBeGreaterThan(0); expect(t.bottom, t.text).toBeLessThan(t.height); }
  const stored = await saved(page), priorPixels = await atlasPixels(page);
  await mount(page, { moonMission: stored });
  await expect(page.locator('[data-lunar-atlas-select]')).toHaveValue('11');
  await expect(page.locator('[data-moonmission-moon-labels]')).toHaveAttribute('aria-pressed', 'true');
  expect(await atlasPixels(page)).toBe(priorPixels); expect(await flight(page)).toEqual(initialFlight);
  await mount(page, seed({ lunarAtlasSite: '17', moonLabels: true }));
  await expect(page.locator('[data-lunar-atlas-select]')).toHaveValue('11');
  await expect(page.locator('[data-lunar-atlas]')).toHaveAttribute('data-atlas-site', '11');
  expect((await saved(page)).missionXP).toBe(0);
  expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'atlas-measured.json'), JSON.stringify({ geometry, measuredSites, desktopRadius, bounds, text, errors }, null, 2));
});
