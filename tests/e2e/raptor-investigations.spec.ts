import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe('Raptor Lab evidence and reflection', () => {
  test.describe.configure({ mode: 'serial' });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 1280, height: 1000, layout: 'document', appStyles: true });
  test.beforeAll(async () => harness.start());
  test.afterAll(async () => harness.stop());
  test.afterEach(async ({ page }) => harness.destroy(page));
  test.beforeEach(async ({ page }) => {
    await harness.mount(page, { raptorHunt: { activeSection: 'hub' } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap{width:100%;height:auto;display:block;padding:16px}' });
  });

  test('predicts, captures immutable readings, compares, reflects, and exports actual notes', async ({ page }) => {
    await page.locator('[data-inquiry-start=speed]').click();
    await expect(page.locator('#rh-journal-title')).toBeFocused();
    await page.getByLabel('My prediction', { exact: true }).fill('A smaller area should produce less drag and a higher terminal speed.');
    await page.locator('[data-inquiry-station=stoop]').click();
    await expect(page.locator('#rh-active-section-title')).toBeFocused();
    await page.locator('[data-inquiry-shortcut]').click();
    await expect(page.locator('#rh-journal-title')).toBeFocused();
    await page.getByLabel('What did you notice?', { exact: true }).fill('Baseline: the small tucked area gives a high predicted terminal speed.');
    await page.getByRole('button', { name: 'Save observation', exact: true }).click();
    const first = await page.evaluate(() => (window as any).__toolData.raptorHunt.investigations.speed.evidence[0]);
    expect(first.reading.area).toBe(0.0065);
    expect(first.reading.mph).toBeCloseTo(Math.sqrt(2 * 0.95 * 9.81 / (1.225 * 0.0065 * 0.18)) * 2.237, 6);
    const area = page.getByRole('slider', { name: 'Frontal cross-section area in square meters' });
    await area.press('Home');
    for (let i = 0; i < 8; i++) await area.press('ArrowRight');
    await page.getByLabel('What did you notice?', { exact: true }).fill('Doubling area lowered terminal speed while mass and Cd stayed fixed.');
    await page.getByRole('button', { name: 'Save observation', exact: true }).click();
    await expect(page.locator('[data-inquiry-comparison]')).toHaveAttribute('data-inquiry-comparison', '1');
    await expect(page.locator('[data-inquiry-comparison]')).toContainText('-29.3%');
    expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.investigations.speed.evidence[0])).toEqual(first);
    await page.locator('.rh-journal-reflection summary').click();
    await expect(page.getByRole('button', { name: 'Mark reflection reviewed' })).toBeDisabled();
    await page.getByLabel('My explanation', { exact: true }).fill('At the same mass and drag coefficient, doubling area reduced the model speed by about 29%. The model assumes constant drag.');
    await page.getByLabel('My next question', { exact: true }).fill('Would changing drag coefficient alone show the same relationship?');
    await page.getByRole('button', { name: 'Mark reflection reviewed' }).click();
    await expect(page.locator('.rh-journal-review')).toHaveAttribute('data-reviewed', 'true');
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download field notes' }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('raptor-field-notes-speed.txt');
    const text = readFileSync((await download.path())!, 'utf8');
    expect(text).toContain('0.0065 m²');
    expect(text).toContain('0.0130 m²');
    expect(text).toContain('The model assumes constant drag.');
    expect(text).toContain('Reflection self-reviewed');
    await page.screenshot({ path: 'reports/raptor-engagement-2026-09-26/notebook-desktop.png', fullPage: false });
    await page.getByLabel('My explanation', { exact: true }).fill('I want to revise this explanation.');
    await expect(page.locator('.rh-journal-review')).toHaveAttribute('data-reviewed', 'false');
    await page.getByRole('button', { name: 'Remove observation 1', exact: true }).click();
    await expect(page.locator('#rh-journal-evidence-title')).toBeFocused();
    await expect(page.getByRole('button', { name: 'Mark reflection reviewed' })).toBeDisabled();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('keeps independent notebooks and restores records through the host session state', async ({ page }) => {
    await page.locator('[data-inquiry-start=night]').click();
    await page.getByLabel('My prediction', { exact: true }).fill('Hearing could help locate prey in darkness.');
    await page.locator('[data-inquiry-station=silent]').click();
    await page.getByRole('button', { name: 'Open notebook', exact: true }).click();
    await page.getByLabel('What did you notice?', { exact: true }).fill('The feather structures change how air flows and how much sound is produced.');
    await page.getByRole('button', { name: 'Save observation', exact: true }).click();
    await page.getByRole('button', { name: 'Go to Hub', exact: true }).click();
    await page.locator('[data-inquiry-start=recovery]').click();
    await expect(page.getByLabel('My prediction', { exact: true })).toHaveValue('');
    await page.getByLabel('My prediction', { exact: true }).fill('Removing a threat could help the population recover.');
    await page.getByRole('button', { name: 'Set aside', exact: true }).click();
    await expect(page.locator('#rh-command-title')).toBeFocused();
    await page.locator('[data-inquiry-start=night]').click();
    await expect(page.getByLabel('My prediction', { exact: true })).toHaveValue('Hearing could help locate prey in darkness.');
    await expect(page.locator('.rh-journal-note')).toHaveCount(1);
    const state = await page.evaluate(() => (window as any).__toolData);
    await harness.destroy(page);
    await page.evaluate((data) => (window as any).__mount(data), state);
    await expect(page.locator('.rh-journal-note')).toContainText('feather structures');
    await page.locator('[data-inquiry-start=recovery]').click();
    await expect(page.getByLabel('My prediction', { exact: true })).toHaveValue('Removing a threat could help the population recover.');
    await expect(page.locator('.rh-journal-note')).toHaveCount(0);
  });

  test('does not call multiple changed variables a fair test or visits evidence', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__toolData.raptorHunt = {
        activeSection: 'stoop', activeInvestigation: 'speed', inquiryExpanded: true, visited: { stoop: 20 },
        investigations: { speed: { prediction: 'Less area means more speed.', evidence: [
          { id: 'a', text: 'First trial', station: 'stoop', stationLabel: 'Stoop Calculator', reading: { mass: 0.95, cd: 0.18, area: 0.0065, mph: 250 } },
          { id: 'b', text: 'Second trial', station: 'stoop', stationLabel: 'Stoop Calculator', reading: { mass: 1.95, cd: 0.18, area: 0.013, mph: 253 } }
        ] } }
      };
      (window as any).__rerender();
    });
    await expect(page.locator('[data-inquiry-comparison]')).toContainText('More than one variable changed');
    await expect(page.locator('.rh-journal-note')).toHaveCount(2);
    await page.getByRole('button', { name: 'Remove observation 1', exact: true }).click();
    await page.getByRole('button', { name: 'Remove observation 1', exact: true }).click();
    await expect(page.locator('.rh-journal-note')).toHaveCount(0);
    await expect(page.locator('.rh-journal-phases li').nth(1)).toHaveAttribute('data-done', 'false');
    await expect(page.getByRole('button', { name: 'Save observation', exact: true })).toBeDisabled();
  });

  test('new inquiry controls pass WCAG checks and fit an embedded desktop panel', async ({ page }) => {
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    await page.locator('[data-inquiry-start=night]').click();
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run({ include: ['.rh-inquiry-choices', '.rh-journal'] }, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
      });
      return result.violations.map((v: any) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n: any) => n.target) }));
    });
    expect(violations).toEqual([]);
    await page.addStyleTag({ content: '#wrap{width:420px}' });
    const bounds = await page.locator('.rh-inquiry-card,.rh-journal').evaluateAll(els => els.map(el => el.getBoundingClientRect().right));
    expect(Math.max(...bounds)).toBeLessThanOrEqual(420);
    await page.getByRole('button', { name: 'Close notebook', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Open notebook', exact: true })).not.toHaveAttribute('aria-controls');
    await page.locator('.rh-category-card').filter({ hasText: 'Labs & Physics' }).click();
    await expect(page.locator('[data-inquiry-journal=night]')).toBeVisible();
    await page.getByRole('button', { name: 'Set aside', exact: true }).click();
    await expect(page.locator('.rh-collection-title')).toBeFocused();
  });

  for (const width of [1280, 768, 390]) {
    test(`visuals, keyboard controls, and readable journal fit ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.locator('.rh-inquiry-card')).toHaveCount(3);
      await page.screenshot({ path: `reports/raptor-engagement-2026-09-26/preview-${width}.png` });
      await page.screenshot({ path: `reports/raptor-engagement-2026-09-26/hub-${width}.png`, fullPage: true });
      await page.locator('[data-inquiry-start=speed]').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#rh-journal-title')).toBeFocused();
      await expect(page.locator('.rh-journal')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.locator('.rh-journal').screenshot({ path: `reports/raptor-engagement-2026-09-26/journal-${width}.png` });
      const textarea = await page.getByLabel('My prediction', { exact: true }).boundingBox();
      expect(textarea!.width).toBeGreaterThan(width === 390 ? 270 : 280);
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      await expect(page.locator('[data-inquiry-station=stoop]')).toBeVisible();
      const colors = await page.locator('[data-inquiry-station=stoop]').evaluate(el => ({ fg: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }));
      expect(colors.fg).not.toBe(colors.bg);
      await expect(page.getByRole('button', { name: 'Close notebook', exact: true })).toHaveAttribute('aria-expanded', 'true');
      expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    });
  }
});
