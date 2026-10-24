import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe('Raptor wing design atlas', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 1000, appStyles: true });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    await harness.mount(page, { raptorHunt: { activeSection: 'flight', selectedSpecies: 'peregrine' } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block;padding:16px}' });
  });

  test('suggested pairs update the shared raptor, both profiles, and numerical differences', async ({ page }) => {
    await page.getByRole('button', { name: 'Two kinds of eagle', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Active raptor', exact: true })).toHaveValue('goldenEagle');
    await expect(page.getByRole('combobox', { name: 'Compare with', exact: true })).toHaveValue('harpyEagle');
    await expect(page.locator('[data-wing-profile=A]')).toContainText('Golden Eagle');
    await expect(page.locator('[data-wing-profile=B]')).toContainText('Harpy Eagle');
    await expect(page.locator('[data-wing-metric=wingLoading]')).toContainText('A − B: -3.5 kg/m²');
    await expect(page.locator('[data-wing-metric=aspectRatio]')).toContainText('A − B: +1.2');
    expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.selectedSpecies)).toBe('goldenEagle');
  });

  test('map points work with Enter and swapping the pair keeps two different profiles', async ({ page }) => {
    const owl = page.locator('[data-flight-point=greatHorned]');
    await owl.focus();
    await page.keyboard.press('Enter');
    await expect(owl).toHaveAttribute('data-map-selected', 'true');
    await expect(owl).toBeFocused();
    await expect(page.getByRole('combobox', { name: 'Active raptor', exact: true })).toHaveValue('greatHorned');
    await expect(page.getByRole('combobox', { name: 'Compare with', exact: true })).toHaveValue('peregrine');
    const selector = page.getByRole('combobox', { name: 'Active raptor', exact: true });
    await selector.selectOption('peregrine');
    await expect(page.getByRole('combobox', { name: 'Compare with', exact: true })).toHaveValue('greatHorned');
    await expect(page.locator('[data-raptor-wing-atlas] [role=img]')).toHaveCount(0);
  });

  test('family filters retain the comparison pair and the separate glide model retains its species', async ({ page }) => {
    const total = await page.locator('[data-flight-point]').count();
    await page.getByRole('combobox', { name: 'Glide calculator species', exact: true }).selectOption('osprey');
    await page.getByRole('button', { name: 'Two kinds of eagle', exact: true }).click();
    await page.getByRole('button', { name: 'Owls', exact: true }).click();
    expect(await page.locator('[data-flight-point]').count()).toBeLessThan(total);
    await expect(page.locator('[data-flight-point=goldenEagle]')).toBeVisible();
    await expect(page.locator('[data-flight-point=harpyEagle]')).toBeVisible();
    await expect(page.locator('[data-flight-point=greatHorned]')).toBeVisible();
    await expect(page.locator('[data-flight-point=peregrine]')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Glide calculator species', exact: true })).toHaveValue('osprey');
    await page.getByRole('button', { name: 'All raptors', exact: true }).click();
    await expect(page.locator('[data-flight-point]')).toHaveCount(total);
  });
});
