import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Review the complete experience in a browser: the static scene matrix cannot
// measure responsive page layout or run the phone's ResizeObserver lens choice.
const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['node_modules/axe-core/axe.min.js'],
  width: 1280, height: 960, appStyles: true, layout: 'document',
});
const phase = process.env.BIRDLAB_QA_PHASE || 'current';
const output = resolve('reports/birdlab-field-studio-2026-10-11', phase);
test.describe.configure({ timeout: 180_000, retries: 0, mode: 'serial' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, view: string, width: number, height: number, isContrast = false) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.setViewportSize({ width, height });
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.birdLab);
  await page.evaluate(({ view, width, isContrast }) => {
    const wrap = document.querySelector('#wrap') as HTMLElement;
    wrap.style.width = width + 'px';
    wrap.setAttribute('data-stem-tool-shell', 'true');
    wrap.style.background = '#0f172a';
    wrap.style.color = '#e2e8f0';
    (window as any).__mount({ birdLab: { view, activeHabitat: 'forest', blSceneMotion: false } });
    (window as any).__ctx.isContrast = isContrast;
  }, { view, width, isContrast });
  await page.waitForFunction(() => (document.querySelector('#wrap')?.textContent || '').length > 80);
  await page.waitForTimeout(700);
  return errors;
}

for (const viewport of [{ id: 'desktop', width: 1280, height: 960 }, { id: 'mobile', width: 390, height: 844 }]) {
  for (const view of ['menu', 'ispy']) {
    test(`${view} ${viewport.id}: complete layout and controls`, async ({ page }) => {
      const errors = await mount(page, view, viewport.width, viewport.height);
      const name = view + '-' + viewport.id;
      await page.screenshot({ path: join(output, name + '.png'), fullPage: true });
      await page.screenshot({ path: join(output, name + '-viewport.png') });
      const report = await page.evaluate(async () => {
        const wrap = document.querySelector('#wrap') as HTMLElement;
        const rect = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        const scene = document.querySelector('[data-birdlab-realistic-scene]');
        const result = await (window as any).axe.run(wrap, { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value'] } });
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          scene: scene ? { ...rect(scene), lens: scene.getAttribute('data-birdlab-scene-lens'), viewBox: scene.getAttribute('viewBox') } : null,
          controls: [...wrap.querySelectorAll('button')].filter(el => el.getBoundingClientRect().width > 0).map(el => ({ text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 100), ...rect(el) })),
          violations: result.violations.map((v: any) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })),
        };
      });
      writeFileSync(join(output, name + '.json'), JSON.stringify({ ...report, errors }, null, 2));
      expect(errors).toEqual([]);
      expect(report.documentWidth, 'the tool must fit the viewport').toBeLessThanOrEqual(report.viewportWidth + 1);
      expect(report.violations).toEqual([]);
      if (view === 'ispy') {
        expect(report.scene).not.toBeNull();
        expect(report.scene!.width).toBeGreaterThan(viewport.width * 0.7);
        if (viewport.id === 'mobile') expect(Number(report.scene!.viewBox!.split(/\s+/)[2])).toBeLessThan(900);
        await page.locator('[data-birdlab-scene-shell]').screenshot({ path: join(output, name + '-scene.png') });
      }
    });
  }

  test(`${viewport.id}: module discovery and hero start`, async ({ page }) => {
    const errors = await mount(page, 'menu', viewport.width, viewport.height);
    const search = page.getByRole('searchbox', { name: 'Find a BirdLab module' });
    const allCards = await page.locator('.birdlab-module-card').count();
    expect(allCards).toBeGreaterThan(10);
    await page.getByRole('button', { name: 'Migration', exact: true }).click();
    await expect(search).toHaveValue('migration');
    await expect(page.getByRole('button', { name: 'Migration', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.locator('.birdlab-module-card').count()).toBeLessThan(allCards);
    expect(await page.locator('.birdlab-module-card').count()).toBeGreaterThan(0);
    await search.fill('no-matching-birdlab-module');
    await expect(page.locator('#birdlab-module-search-status')).toHaveText('0 modules found');
    await expect(page.locator('.birdlab-module-card')).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear module search' }).click();
    await expect(page.locator('.birdlab-module-card')).toHaveCount(allCards);
    await page.locator('.birdlab-hero-action').click();
    await expect(page.locator('[data-birdlab-ispy]')).toBeVisible();
    await expect(page.locator('[data-birdlab-realistic-scene]')).toHaveAttribute('data-birdlab-realistic-scene', 'forest');
    expect(errors).toEqual([]);
  });

  test(`${viewport.id}: menu remains legible in host high-contrast mode`, async ({ page }) => {
    const errors = await mount(page, 'menu', viewport.width, viewport.height, true);
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), {
        runOnly: { type: 'rule', values: ['color-contrast'] },
      });
      return result.violations.map((violation: any) => ({
        id: violation.id,
        nodes: violation.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })),
      }));
    });
    writeFileSync(join(output, `menu-${viewport.id}-high-contrast.json`), JSON.stringify({ errors, violations }, null, 2));
    await page.screenshot({ path: join(output, `menu-${viewport.id}-high-contrast.png`), fullPage: true });
    expect(errors).toEqual([]);
    expect(violations).toEqual([]);
  });

  test(`${viewport.id}: reduced motion preserves a usable, still scene`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await mount(page, 'ispy', viewport.width, viewport.height);
    const scene = page.locator('[data-birdlab-scene-shell]');
    await expect(page.getByRole('button', { name: 'Scene motion disabled by reduced-motion preference', exact: true })).toBeDisabled();
    await expect(scene).toHaveClass(/birdlab-scene--motion-off/);
    const motion = await scene.locator('.birdlab-motion-subject, .birdlab-anatomy-motion, .birdlab-ambient-motion').evaluateAll(elements =>
      elements.map(element => ({ name: getComputedStyle(element).animationName, state: getComputedStyle(element).animationPlayState })));
    expect(motion.length).toBeGreaterThan(0);
    expect(motion.every(animation => animation.name === 'none' || animation.state === 'paused')).toBe(true);
    expect(await scene.locator('button[data-birdlab-kind="bird"]:enabled').count()).toBeGreaterThan(0);
    await scene.screenshot({ path: join(output, `ispy-${viewport.id}-reduced-motion.png`) });
    expect(errors).toEqual([]);
  });

  test(`${viewport.id}: habitat, conditions, motion and accessible observation`, async ({ page }) => {
    const errors = await mount(page, 'ispy', viewport.width, viewport.height);
    const scene = page.locator('[data-birdlab-scene-shell]');
    const habitats = ['marsh', 'backyard', 'coast', 'mountain', 'forest'];
    for (const habitat of habitats) {
      const tab = page.getByRole('tab', { name: new RegExp('^' + habitat, 'i') });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('[data-birdlab-realistic-scene]')).toHaveAttribute('data-birdlab-realistic-scene', habitat);
      const celebration = page.getByRole('button', { name: 'Dismiss expedition celebration and keep exploring', exact: true });
      if (await celebration.isVisible()) {
        await celebration.click();
        await expect(page.locator('[data-birdlab-expedition-celebration]')).toHaveCount(0);
      }
      await scene.screenshot({ path: join(output, `${viewport.id}-${habitat}-scene.png`) });
    }
    for (const condition of [{ id: 'dawn', label: 'Dawn chorus' }, { id: 'dusk', label: 'Dusk watch' }, { id: 'day', label: 'Clear day' }]) {
      const choice = page.getByRole('radio', { name: new RegExp('^' + condition.label) });
      await choice.click();
      await expect(choice).toHaveAttribute('aria-checked', 'true');
      await expect(scene).toHaveAttribute('data-birdlab-condition', condition.id);
      await expect(page.locator('[data-birdlab-condition-effect]')).toHaveAttribute('data-birdlab-condition-effect', condition.id);
    }
    await page.getByRole('button', { name: 'Play scene motion', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause scene motion', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Pause scene motion', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play scene motion', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(scene).toHaveClass(/birdlab-scene--motion-off/);

    // Exercise the real pointer dwell loop with a shorter, user-selectable hold.
    await page.getByLabel('Binocular hold', { exact: true }).selectOption('steady');
    await expect(page.locator('[data-birdlab-binocular-hold]')).toHaveAttribute('data-birdlab-binocular-hold', 'steady');
    const bird = scene.locator('button[data-birdlab-kind="bird"][data-birdlab-presence="visible"]:enabled').first();
    await bird.scrollIntoViewIfNeeded();
    await bird.hover();
    await expect(bird).toHaveAttribute('data-birdlab-found', 'true', { timeout: 10_000 });

    // Keyboard activation of direct access must still identify a second bird.
    const access = page.getByRole('button', { name: 'Switch to accessibility mode (direct identify, unlimited)', exact: true });
    await access.focus();
    await page.keyboard.press('Enter');
    const direct = page.getByRole('button', { name: /^Identify .+ directly$/ }).first();
    const directName = await direct.getAttribute('aria-label');
    const speciesName = directName!.replace(/^Identify /, '').replace(/ directly$/, '');
    await direct.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: speciesName + ' — found. Click to review.', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
