import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_magnetism.js', toolId: 'magnetism',
  width: 1080, height: 1000, layout: 'document', appStyles: true,
});
const artifacts = join(process.cwd(), 'tmp', 'magnetism-visual');
const stage = process.env.MAGNETISM_VISUAL_STAGE || 'before';
test.describe.configure({ mode: 'serial', timeout: 120_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(artifacts, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width: number, station: string) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { magnetism: {
    tab: station, fieldView: 'map', learningMode: 'guided', motorMode: 'particle', chargeView: '2d',
    fieldMapStrength: 1, fieldMapNoise: 0, fieldMapSamples: [], fieldMapReference: [],
    induceMode: 'hand', induceX: -100, induceTurns: 50, lastEMF: 0, peakEMF: 0, emfTrace: [],
    missionId: 'power_path', labShellPanel: '', labShellMenuOpen: false, notebookTrials: [], notebookOpen: false,
  } }, undefined, { expectCanvas: false });
  await page.locator('#wrap').evaluate((wrap, width) => { (wrap as HTMLElement).style.width = width + 'px'; }, width);
  const theme = process.env.MAGNETISM_VISUAL_THEME;
  if (theme === 'light' || theme === 'contrast') {
    // Canonical host palette from stem_lab/stem_lab_module.js: _ASTPalettes.
    const palette = theme === 'light'
      ? { canvas: '#ffffff', panel: '#f8fafc', deeper: '#e2e8f0', text: '#0f172a', 'text-soft': '#475569', border: '#cbd5e1', 'button-bg': '#f1f5f9', 'button-text': '#0f172a', 'button-border': '#cbd5e1' }
      : { canvas: '#000000', panel: '#000000', deeper: '#000000', text: '#ffff00', 'text-soft': '#ffff00', border: '#ffff00', 'button-bg': '#000000', 'button-text': '#00ff00', 'button-border': '#00ff00' };
    await page.evaluate(({ theme, palette }) => {
      document.body.classList.add('theme-' + theme);
      const wrap = document.getElementById('wrap')!;
      wrap.setAttribute('data-stem-tool-shell', 'magnetism');
      for (const [key, value] of Object.entries(palette)) wrap.style.setProperty('--allo-stem-' + key, value);
    }, { theme, palette });
  }
  if (process.env.MAGNETISM_VISUAL_FORCED_COLORS === '1') await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
}

async function capture(page: Page, name: string, panel: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(artifacts, stage + '-' + name + '-full.png'), fullPage: true });
  await page.locator(panel).evaluate((element) => {
    window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 85);
  });
  await page.screenshot({ path: join(artifacts, stage + '-' + name + '-viewport.png') });
  const layout = await page.evaluate((panel) => {
    const root = document.querySelector<HTMLElement>('.mag-root')!;
    const station = document.querySelector<HTMLElement>(panel)!;
    return {
      viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      rootWidth: root.clientWidth, rootScroll: root.scrollWidth,
      stationHeight: station.getBoundingClientRect().height, rootHeight: root.getBoundingClientRect().height,
      fontFamily: getComputedStyle(root).fontFamily,
    };
  }, panel);
  await writeFile(join(artifacts, stage + '-' + name + '-layout.json'), JSON.stringify(layout, null, 2));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.rootScroll).toBeLessThanOrEqual(layout.rootWidth + 1);
}

for (const width of [1080, 390]) {
  const size = width === 1080 ? 'desktop' : 'phone';
  test('field map visual capture at ' + width, async ({ page }) => {
    await mount(page, width, 'field');
    await page.getByRole('button', { name: 'Run 7-point scan', exact: true }).click();
    await page.getByRole('button', { name: 'Keep scan as reference', exact: true }).click();
    await page.getByRole('slider', { name: /^Magnet strength/ }).fill('2');
    await page.getByRole('button', { name: 'Run 7-point scan', exact: true }).click();
    await capture(page, 'field-' + size, '#mag-panel-field');
  });
  test('hand generator and timed motion visual capture at ' + width, async ({ page }) => {
    await mount(page, width, 'induce');
    await page.getByRole('button', { name: 'Run timed motion', exact: true }).click();
    await page.getByRole('combobox', { name: 'Inspect motion sample', exact: true }).selectOption('30');
    await capture(page, 'induction-' + size, '#mag-panel-induce');
    if (stage !== 'before' && width === 1080) {
      const workbench = page.locator('.mag-hand-workbench');
      await workbench.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 85));
      await workbench.screenshot({ path: join(artifacts, stage + '-generator-workbench.png') });
    }
    await page.locator('[data-induction-motion-studio]').evaluate((element) => {
      const card = element.closest('.mag-card') || element;
      window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 85);
    });
    await page.screenshot({ path: join(artifacts, stage + '-motion-' + size + '-viewport.png') });
    if (stage !== 'before' && width === 390) {
      const modes = page.getByRole('group', { name: 'Generator investigation mode', exact: true });
      await modes.getByRole('button').first().focus();
      await page.keyboard.press('Tab');
      await page.evaluate(() => new Promise<void>((resolve) => {
        let frames = 0;
        const tick = () => { if (++frames >= 12) resolve(); else requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }));
      const focus = await modes.evaluate((rail) => {
        const container = rail.getBoundingClientRect();
        const active = document.activeElement!;
        const button = active.getBoundingClientRect();
        return { label: active.textContent, scrollLeft: rail.scrollLeft, scrollWidth: rail.scrollWidth, railLeft: container.left, railRight: container.right, buttonLeft: button.left, buttonRight: button.right };
      });
      await writeFile(join(artifacts, stage + '-mode-focus-phone.json'), JSON.stringify(focus, null, 2));
      await modes.screenshot({ path: join(artifacts, stage + '-mode-focus-phone.png') });
    }
  });
  test('particle visual capture at ' + width, async ({ page }) => {
    await mount(page, width, 'motor');
    await expect(page.getByRole('button', { name: '2D bend diagram', exact: true })).toBeVisible();
    await capture(page, 'particle-' + size, '#mag-panel-motor');
    if (stage !== 'before') {
      await page.getByRole('slider', { name: 'Particle speed (v)', exact: true }).fill('2');
      await page.getByRole('slider', { name: 'Magnetic field strength (B)', exact: true }).fill('8');
      const chamber = page.getByRole('img', { name: /particle moving right/ });
      await chamber.screenshot({ path: join(artifacts, stage + '-particle-' + size + '-strong-down.png') });
      await page.getByRole('button', { name: '− Negative', exact: true }).click();
      await chamber.screenshot({ path: join(artifacts, stage + '-particle-' + size + '-strong-up.png') });
    }
  });
}

test('phone mode rails reveal keyboard and directly focused buttons without moving the page', async ({ page }) => {
  for (const station of [
    { tab: 'field', label: 'Field Explorer dimension' },
    { tab: 'induce', label: 'Generator investigation mode' },
    { tab: 'motor', label: 'Motor investigation' },
  ]) {
    await mount(page, 390, station.tab);
    const rail = page.getByRole('group', { name: station.label, exact: true });
    const buttons = rail.getByRole('button');
    const count = await buttons.count();
    await rail.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 85));
    await buttons.first().focus();
    const pageTop = await page.evaluate(() => window.scrollY);
    const originalSelection = await buttons.evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-pressed')));
    const checkFocus = async (index: number) => {
      await expect(buttons.nth(index)).toBeFocused();
      await expect.poll(() => rail.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const active = document.activeElement!.getBoundingClientRect();
        return active.left >= bounds.left + 5.5 && active.right <= bounds.right - 5.5;
      })).toBe(true);
      expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(pageTop, 0);
    };
    await checkFocus(0);
    for (let index = 1; index < count; index++) {
      await page.keyboard.press('Tab');
      await checkFocus(index);
    }
    await page.keyboard.press('Shift+Tab');
    await checkFocus(count - 2);
    for (let index = count - 1; index >= 0; index--) {
      await buttons.nth(index).focus();
      await checkFocus(index);
    }
    expect(await rail.evaluate((element) => element.scrollLeft)).toBeCloseTo(0, 0);
    expect(await buttons.evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-pressed')))).toEqual(originalSelection);
    await page.keyboard.press('Tab');
    await checkFocus(1);
    await rail.screenshot({ path: join(artifacts, stage + '-' + station.tab + '-mode-focus-phone.png') });
    if (station.tab === 'induce') await rail.screenshot({ path: join(artifacts, stage + '-mode-focus-phone.png') });
  }
});
