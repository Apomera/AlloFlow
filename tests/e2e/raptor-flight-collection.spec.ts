import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const captures = resolve('reports/avian-richness-2026-10-17/final');

test.describe('Raptor flight collection and illustrated field guide', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 1000, appStyles: true });
  test.beforeAll(async () => { mkdirSync(captures, { recursive: true }); await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    await harness.mount(page, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block;padding:16px}' });
  });

  test('preview selection updates the shared flight profile and wing illustration', async ({ page }) => {
    await page.getByRole('button', { name: 'Preview Great Horned Owl', exact: true }).click();
    await expect(page.locator('[data-raptor-spotlight]')).toHaveAttribute('data-raptor-spotlight', 'greatHorned');
    await expect(page.locator('.rh-stat-card').first()).toContainText('Great Horned Owl');
    await page.getByRole('button', { name: 'Wings tucked', exact: true }).click();
    await expect(page.locator('.rh-spotlight-stage svg')).toHaveAttribute('data-wing-posture', 'tucked');
    await expect(page.locator('.rh-spotlight-posture [role=status]')).toHaveText('Less exposed wing area');
    await page.getByRole('button', { name: 'Wings spread', exact: true }).click();
    await expect(page.locator('.rh-spotlight-stage svg')).toHaveAttribute('data-wing-posture', 'spread');
    await page.getByRole('button', { name: 'Browse Species Roster', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Select Great Horned Owl', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test('motion requires opt-in, can pause, and honors the operating system preference', async ({ page }) => {
    const bird = page.locator('.rh-spotlight-stage .rh-field-bird');
    await expect(bird).toHaveCSS('animation-name', 'none');
    await page.getByRole('button', { name: 'Animate flight', exact: true }).click();
    await expect(bird).toHaveCSS('animation-name', 'rh-field-glide');
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    await expect(bird).toHaveCSS('animation-name', 'none');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Animate flight', exact: true }).click();
    await expect(bird).toHaveCSS('animation-name', 'none');
  });

  test('field guide filters and searches species, recovers from empty results, and selects with a keyboard', async ({ page }) => {
    await page.getByRole('button', { name: 'Browse Species Roster', exact: true }).first().click();
    const total = await page.locator('.rh-roster-specimen').count();
    await page.getByRole('button', { name: 'Owls', exact: true }).click();
    expect(await page.locator('.rh-roster-specimen').count()).toBeLessThan(total);
    await expect(page.locator('.rh-roster-gallery')).toContainText('Great Horned Owl');
    await expect(page.locator('.rh-roster-gallery')).not.toContainText('Peregrine Falcon');
    const search = page.getByRole('searchbox', { name: 'Find your flight companion' });
    await search.fill('no-such-raptor');
    await expect(page.locator('.rh-roster-empty')).toBeVisible();
    await page.getByRole('button', { name: 'Show all raptors', exact: true }).click();
    await expect(page.locator('.rh-roster-specimen')).toHaveCount(total);
    await search.fill('Falco peregrinus');
    await expect(page.locator('.rh-roster-specimen')).toHaveCount(1);
    await page.getByRole('button', { name: 'Select Peregrine Falcon', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Select Peregrine Falcon', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await search.focus();
    await search.press('Escape');
    await expect(search).toHaveValue('');
    await expect(page.locator('.rh-roster-specimen')).toHaveCount(total);
  });

  test('comparison sorting and species selection work with keyboard controls', async ({ page }) => {
    await page.getByRole('button', { name: 'Browse Species Roster', exact: true }).first().click();
    await page.getByRole('button', { name: 'Show as comparison table', exact: true }).click();
    const mass = page.getByRole('columnheader').filter({ hasText: 'Mass (kg)' });
    await mass.getByRole('button').focus();
    await page.keyboard.press('Enter');
    await expect(mass).toHaveAttribute('aria-sort', 'ascending');
    await page.keyboard.press('Enter');
    await expect(mass).toHaveAttribute('aria-sort', 'descending');
    const owl = page.getByRole('button', { name: 'Select Great Horned Owl', exact: true });
    await owl.focus();
    await page.keyboard.press('Enter');
    await expect(owl).toHaveAttribute('aria-pressed', 'true');
  });

  for (const width of [1280, 768, 390]) {
    test(`illustrated discovery and roster fit a ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.locator('.rh-spotlight-stage')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: resolve(captures, `raptor-home-${width}.png`) });
      await page.getByRole('button', { name: 'Browse Species Roster', exact: true }).first().click();
      await expect(page.locator('.rh-roster-specimen-art').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const art = await page.locator('.rh-roster-specimen-art').first().boundingBox();
      expect(art?.width).toBeGreaterThan(150);
      await page.locator('.rh-roster-discovery').scrollIntoViewIfNeeded();
      await page.screenshot({ path: resolve(captures, `raptor-roster-${width}.png`) });
    });
  }
});
