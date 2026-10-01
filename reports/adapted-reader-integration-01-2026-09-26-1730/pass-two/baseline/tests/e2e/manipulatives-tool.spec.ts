import { test, expect } from '@playwright/test';
import { bootAlloFlow } from './helpers';

// Smoke test for Math Manipulatives v3.
// Covers the v3 expansion from 4 modes to 17 (12 manipulatives + 5 meta modes).
test.describe('Math Manipulatives v3', () => {
  test('opens, switches between v3 modes, and exercises challenges', async ({ page }) => {
    test.setTimeout(240000);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (e) => {
      console.log('PageError:', e.message);
      pageErrors.push(e.message);
    });
    page.on('console', (m) => {
      if (m.type() === 'error') {
        const text = m.text();
        if (!/firebase|firestore|workbox|GA_/i.test(text)) {
          consoleErrors.push(text);
        }
      }
    });

    await page.addInitScript(() => {
      try { delete (window.Navigator.prototype as any).serviceWorker; } catch (e) {}
    });

    await bootAlloFlow(page, 'learning');

    const stemLabBtn = page.locator('button').filter({ hasText: /STEM Lab.*interactive math/i }).first();
    await stemLabBtn.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(2000);
    await stemLabBtn.click({ force: true });

    await page.waitForFunction(() => !!(window as any).StemLab?._registry, null, { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Open Math Manipulatives
    const manipBtn = page.locator('button').filter({ hasText: /Math Manipulatives/i }).first();
    await manipBtn.waitFor({ state: 'visible', timeout: 30000 });
    await manipBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Verify the default mode tab (Base-10 Blocks) is visible
    const blocksTab = page.locator('button').filter({ hasText: /Base-10 Blocks/i }).first();
    await expect(blocksTab).toBeVisible({ timeout: 30000 });

    // Open Ten Frames mode (v3 addition)
    const tenFrameTab = page.locator('button').filter({ hasText: /Ten Frames/i }).first();
    await tenFrameTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Double frame|of 10/i').first()).toBeVisible();

    // Open Counters mode
    const countersTab = page.locator('button').filter({ hasText: /^\s*[\u{1F534}\u{2705}\u{2728}]?\s*Counters/u }).first();
    await countersTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Net value|yellow|red/i').first()).toBeVisible();

    // Open Pattern Blocks mode
    const pbTab = page.locator('button').filter({ hasText: /Pattern Blocks/i }).first();
    await pbTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Shape palette|Hexagon/i').first()).toBeVisible();

    // Open Hundreds Chart
    const hcTab = page.locator('button').filter({ hasText: /Hundreds Chart/i }).first();
    await hcTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Skip-count|Show primes/i').first()).toBeVisible();

    // Open Cuisenaire
    const crTab = page.locator('button').filter({ hasText: /Cuisenaire/i }).first();
    await crTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Rod palette|Workspace/i').first()).toBeVisible();

    // Open Number Bonds
    const nbTab = page.locator('button').filter({ hasText: /Number Bonds/i }).first();
    await nbTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Explore|Practice|Rainbow/i').first()).toBeVisible();

    // ── v3.1 NEW MANIPULATIVES ──
    // (Number Line mode removed in v3.2 — the richer standalone stem_tool_numberline.js
    //  covers number-line work. Use the STEM Lab launcher's Number Line tool instead.)

    // Fraction Bars
    const fbTab = page.locator('button').filter({ hasText: /Fraction Bars/i }).first();
    await fbTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/1\/2|1\/3|1\/4|Clear/i').first()).toBeVisible();

    // Algebra Tiles
    const atTab = page.locator('button').filter({ hasText: /Algebra Tiles/i }).first();
    await atTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Tile palette|expression|zero pair/i').first()).toBeVisible();

    // ── v3 META MODES ──

    // CRA Progression
    const craTab = page.locator('button').filter({ hasText: /CRA Progression/i }).first();
    await craTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Choose an operation|Addition|Concrete/i').first()).toBeVisible();

    // Challenge Hub
    const chTab = page.locator('button').filter({ hasText: /Challenge Hub/i }).first();
    await chTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Pick a problem|Categories/i').first()).toBeVisible();

    // Brain Teasers
    const ptTab = page.locator('button').filter({ hasText: /Brain Teasers/i }).first();
    await ptTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Brain Teaser|Show hint|Reveal answer/i').first()).toBeVisible();

    // History
    const histTab = page.locator('button').filter({ hasText: /^\s*[^\w]*\s*History/i }).first();
    await histTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/BCE|Cuisenaire|Abacus/i').first()).toBeVisible();

    // Curriculum Map
    const cmTab = page.locator('button').filter({ hasText: /Curriculum Map/i }).first();
    await cmTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Legend|core|intro|review/i').first()).toBeVisible();

    // Glossary
    const glTab = page.locator('button').filter({ hasText: /Glossary/i }).first();
    await glTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Place value|Regroup|Decompose/i').first()).toBeVisible();

    // Standards
    const stTab = page.locator('button').filter({ hasText: /Standards/i }).first();
    await stTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Grade|CCSS|standard/i').first()).toBeVisible();

    // Library
    const libTab = page.locator('button').filter({ hasText: /Library/i }).first();
    await libTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Save|Saved|Export JSON/i').first()).toBeVisible();

    // Teacher
    const tchTab = page.locator('button').filter({ hasText: /Teacher/i }).first();
    await tchTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/Student progress|Export|Reset/i').first()).toBeVisible();

    // Activity Cards
    const acTab = page.locator('button').filter({ hasText: /Activity Cards/i }).first();
    await acTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/MATERIALS|STEPS|EXTENSION/i').first()).toBeVisible();

    // Help & FAQ
    const hpTab = page.locator('button').filter({ hasText: /Help/i }).first();
    await hpTab.click({ force: true });
    await page.waitForTimeout(400);
    await expect(page.locator('text=/FAQ|Shortcuts|About/i').first()).toBeVisible();

    // Verify no critical page errors
    expect(pageErrors).toHaveLength(0);
  });
});
