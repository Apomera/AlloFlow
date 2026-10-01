import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * The 99 activity pages are hand-written Tailwind. The station layer does not edit
 * them; it recognises four class idioms they already share and tags them so a scoped
 * stylesheet can reach them. That makes it a DETECTOR, and a detector that stops
 * matching fails silently: the pages keep rendering, just flat again. These checks
 * pin the coverage so a future markup change surfaces as a red test rather than as
 * an unnoticed regression.
 */
test.describe('Raptor Lab station visual layer', () => {
  test.describe.configure({ mode: 'serial' });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 900, appStyles: true });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    await harness.mount(page, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block;padding:16px}' });
  });

  async function open(page: any, section: string) {
    await page.evaluate((s: string) => {
      const d = (window as any).__toolData;
      d.raptorHunt = Object.assign({}, d.raptorHunt, { activeSection: s, sectionSearch: '' });
      (window as any).__rerender();
    }, section);
    await page.waitForFunction(
      (s: string) => document.querySelector('[data-raptorhunt-root][data-raptor-active-section="' + s + '"] [id="rh-panel-' + s + '"]') != null,
      section
    );
    // The tagger runs off a MutationObserver on an animation frame.
    await page.waitForTimeout(160);
  }

  test('tags and styles the four shared idioms on an activity page', async ({ page }) => {
    await open(page, 'tracking');
    const root = page.locator('[data-raptorhunt-root]');
    await expect(root).toHaveAttribute('data-rh-station', 'true');

    // Banner: the emoji is seated in a plate rather than floating as bare text.
    const glyph = page.locator('.rh-st-banner .rh-st-glyph').first();
    await expect(glyph).toBeVisible();
    const glyphBox = await glyph.boundingBox();
    expect(glyphBox!.width).toBeGreaterThan(50);
    expect(Math.abs(glyphBox!.width - glyphBox!.height)).toBeLessThan(2);

    // Banner copy fills the card instead of wrapping short of its edge.
    const banner = page.locator('.rh-st-banner').first();
    const copy = page.locator('.rh-st-banner-copy').first();
    const bannerBox = await banner.boundingBox();
    const copyBox = await copy.boundingBox();
    expect(copyBox!.width).toBeGreaterThan(bannerBox!.width * 0.7);

    // Chip row: one height for every chip, and real spacing between them.
    const chips = page.locator('.rh-st-chips > button');
    expect(await chips.count()).toBeGreaterThan(3);
    const first = await chips.nth(0).boundingBox();
    const second = await chips.nth(1).boundingBox();
    expect(first!.height).toBeGreaterThanOrEqual(32);
    expect(Math.abs(first!.height - second!.height)).toBeLessThan(1.5);
    expect(second!.x - (first!.x + first!.width)).toBeGreaterThan(4);

    // Stat strip: each metric sits on its own surface, label above value.
    const stats = page.locator('.rh-st-stats').first();
    await expect(stats).toBeVisible();
    expect(await page.locator('.rh-st-stats .rh-st-stat-label').count()).toBeGreaterThan(2);
    const label = await page.locator('.rh-st-stats .rh-st-stat-label').first().boundingBox();
    const value = await page.locator('.rh-st-stats .rh-st-stat-value').first().boundingBox();
    expect(value!.y).toBeGreaterThan(label!.y);

    // Content card: the accent rule is drawn, and the label reads as an eyebrow.
    const card = page.locator('.rh-st-card').first();
    await expect(card).toBeVisible();
    const transform = await page.locator('.rh-st-card-label').first().evaluate(
      (el) => getComputedStyle(el).textTransform
    );
    expect(transform).toBe('uppercase');
    const accent = await card.evaluate((el) => getComputedStyle(el, '::before').width);
    expect(accent).toBe('2px');
  });

  test('leaves the hub and the 3D flight view to their own visual system', async ({ page }) => {
    const root = page.locator('[data-raptorhunt-root]');
    await expect(root).toHaveAttribute('data-raptor-active-section', 'hub');
    await expect(root).not.toHaveAttribute('data-rh-station', 'true');
    // The hub's own command deck is untouched by the station stylesheet.
    await expect(page.locator('.rh-command-deck')).toBeVisible();
    expect(await page.locator('.rh-st-banner').count()).toBe(0);

    await open(page, 'tracking');
    await expect(root).toHaveAttribute('data-rh-station', 'true');
    // Returning to the hub clears the scope again rather than leaving it stuck on.
    await page.evaluate(() => {
      const d = (window as any).__toolData;
      d.raptorHunt = Object.assign({}, d.raptorHunt, { activeSection: 'hub' });
      (window as any).__rerender();
    });
    await page.waitForTimeout(160);
    await expect(root).not.toHaveAttribute('data-rh-station', 'true');
  });

  test('re-tags after a section change and after an in-page interaction', async ({ page }) => {
    await open(page, 'culture');
    await expect(page.locator('.rh-st-banner')).toHaveCount(1);
    const chips = page.locator('.rh-st-chips > button');
    expect(await chips.count()).toBeGreaterThan(3);

    // Clicking a chip re-renders the panel; the new content must be tagged too.
    await chips.nth(2).click();
    await page.waitForTimeout(160);
    await expect(page.locator('.rh-st-banner')).toHaveCount(1);
    await expect(chips.nth(2)).toHaveAttribute('aria-pressed', 'true');

    // And a different section picks up its own tags.
    await open(page, 'tracking');
    await expect(page.locator('.rh-st-stats')).toHaveCount(1);
  });

  test('holds coverage across the lab', async ({ page }) => {
    // A floor, not an exact count: new activities may add idioms, but a markup
    // change that stops the detector matching drops these sharply.
    const sections = ['tracking', 'culture', 'ecology', 'hunting', 'urban', 'careers', 'gear', 'evolution'];
    let banners = 0, chipRows = 0;
    for (const s of sections) {
      await open(page, s);
      banners += await page.locator('.rh-st-banner').count();
      chipRows += await page.locator('.rh-st-chips').count();
    }
    expect(banners).toBeGreaterThanOrEqual(7);
    expect(chipRows).toBeGreaterThanOrEqual(5);
  });

  test('keeps the treatment legible under reduced motion and forced colors', async ({ page, browser }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, 'tracking');
    const hoverTransition = await page.locator('.rh-st-chips > button').first().evaluate(
      (el) => getComputedStyle(el).transitionDuration
    );
    expect(hoverTransition === 'none' || hoverTransition === '0s').toBeTruthy();

    const ctx = await browser.newContext({ forcedColors: 'active', colorScheme: 'dark' });
    const fc = await ctx.newPage();
    await harness.mount(fc, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await open(fc, 'tracking');
    // In forced colors the decoration drops but the structure must survive: the
    // glyph plate and the stat cells stay visible, and the banner loses its shadow.
    await expect(fc.locator('.rh-st-banner .rh-st-glyph')).toBeVisible();
    await expect(fc.locator('.rh-st-stats')).toBeVisible();
    const shadow = await fc.locator('.rh-st-banner').first().evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).toBe('none');
    await harness.destroy(fc);
    await ctx.close();
  });
});
