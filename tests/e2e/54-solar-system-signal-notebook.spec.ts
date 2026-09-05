import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ mode: 'serial' });
const desktop = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1180, height: 900, appStyles: true });
const mobile = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 340, height: 820, appStyles: true });
const state = { solarSystem: { tutorialDismissed: true, selectedPlanet: 'stem.solar_sys.earth', viewTab: 'overview', showSignalLab: true, signalTarget: 'Mars', signalAngle: 0, paused: true } };
test.beforeAll(async () => { await desktop.start(); await mobile.start(); });
test.afterAll(async () => { await desktop.stop(); await mobile.stop(); });
test.afterEach(async ({ page }) => { await desktop.destroy(page); });

test('records fixed observations on a shared scale and saves the student explanation', async ({ page }) => {
  await desktop.mount(page, state);
  const lab = page.locator('[data-solarsystem-signal-lab]');
  const notebook = lab.locator('[data-signal-notebook]');
  const record = notebook.locator('[data-signal-record-observation]');
  await record.focus();
  await page.keyboard.press('Enter');
  await expect(record).toBeDisabled();
  const a = notebook.locator('[data-signal-observation="A"]');
  const b = notebook.locator('[data-signal-observation="B"]');
  await expect(a).toContainText('4.4 min');
  await lab.getByRole('button', { name: 'Far alignment', exact: true }).click();
  await record.click();
  await expect(a).toContainText('0°');
  await expect(a).toContainText('0.524 AU');
  await expect(b).toContainText('180°');
  await expect(b).toContainText('21.0 min');
  const meterA = a.getByRole('meter');
  const meterB = b.getByRole('meter');
  const scale = Number(await meterA.getAttribute('aria-valuemax'));
  expect(Number(await meterB.getAttribute('aria-valuemax'))).toBe(scale);
  expect(Number(await meterA.getAttribute('aria-valuenow'))).toBeCloseTo(0.524 * 499.0047838, 5);
  const bars = await notebook.getByRole('meter').evaluateAll(els => els.map(el => (el.firstElementChild as HTMLElement).getBoundingClientRect().width / el.getBoundingClientRect().width));
  expect(bars[0]).toBeCloseTo(0.524 / 2.524, 2);
  expect(bars[1]).toBeCloseTo(1, 2);
  await expect(notebook.locator('[data-signal-notebook-status]')).toContainText('16.6 min longer');
  await lab.getByRole('button', { name: 'Right angle', exact: true }).click();
  await expect(b).toContainText('180°');
  const explanation = 'The signal speed stayed constant. B had a longer path, so its delay was greater.';
  await notebook.getByRole('textbox').fill(explanation);
  await lab.getByRole('button', { name: 'Increases', exact: true }).click();
  await lab.getByRole('button', { name: /Save signal evidence to journal/ }).click();
  const entry = await page.evaluate(() => (window as any).__toolData.solarSystem.journalEntries.at(-1));
  expect(entry.observation).toContain('A: 0°');
  expect(entry.observation).toContain('B: 180°');
  expect(entry.surprise).toBe(explanation);
});

test('retains destination notebooks and correctly describes a shorter second observation', async ({ page }) => {
  await desktop.mount(page, state);
  const lab = page.locator('[data-solarsystem-signal-lab]');
  const notebook = lab.locator('[data-signal-notebook]');
  const record = notebook.locator('[data-signal-record-observation]');
  await lab.getByRole('button', { name: 'Far alignment', exact: true }).click();
  await record.click();
  await lab.getByRole('button', { name: 'Near alignment', exact: true }).click();
  await record.click();
  await expect(notebook.locator('[data-signal-notebook-status]')).toContainText('16.6 min shorter');
  await notebook.getByRole('textbox').fill('Mars comparison draft');
  await lab.locator('[data-signal-target-option="Jupiter"]').click();
  await expect(notebook.getByRole('meter')).toHaveCount(0);
  await expect(notebook.getByRole('textbox')).toHaveValue('');
  await record.click();
  await lab.locator('[data-signal-target-option="Mars"]').click();
  await expect(notebook.getByRole('meter')).toHaveCount(2);
  await expect(notebook.getByRole('textbox')).toHaveValue('Mars comparison draft');
  await lab.getByRole('button', { name: 'Right angle', exact: true }).click();
  await expect(record).toHaveText('Update observation B');
  await record.click();
  await expect(notebook.locator('[data-signal-observation="A"]')).toContainText('180°');
  await expect(notebook.locator('[data-signal-observation="B"]')).toContainText('90°');
  await notebook.getByRole('button', { name: 'Clear observations', exact: true }).click();
  await expect(notebook.getByRole('meter')).toHaveCount(0);
  await expect(record).toHaveText('Record observation A');
  await expect(notebook.getByRole('textbox')).toHaveValue('Mars comparison draft');
});

test('keeps a sent ping tied to its original orbital position', async ({ page }) => {
  await desktop.mount(page, state);
  const lab = page.locator('[data-solarsystem-signal-lab]');
  const ping = lab.getByRole('button', { name: 'Send a light-speed ping', exact: true });
  await ping.click();
  const receipt = lab.getByText(/^Ping sent[.]/);
  await expect(receipt).toContainText('At 0°');
  await expect(receipt).toContainText('4.4 min');
  await lab.getByRole('button', { name: 'Far alignment', exact: true }).click();
  await expect(lab.locator('[data-signal-one-way]')).toHaveText('21.0 min');
  await expect(receipt).toContainText('At 0°');
  await expect(receipt).toContainText('4.4 min');
  await ping.click();
  await expect(receipt).toContainText('At 180°');
  await expect(receipt).toContainText('21.0 min');
  await lab.locator('[data-signal-target-option="Neptune"]').click();
  await expect(receipt).toHaveCount(0);
});

test('fits captured observations and writing controls at 340px in both themes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 340, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mobile.mount(page, state);
  const lab = page.locator('[data-solarsystem-signal-lab]');
  const notebook = lab.locator('[data-signal-notebook]');
  await notebook.locator('[data-signal-record-observation]').click();
  await lab.getByRole('button', { name: 'Far alignment', exact: true }).click();
  await notebook.locator('[data-signal-record-observation]').click();
  for (const dark of [false, true]) {
    await page.evaluate(value => { (window as any).__ctx.isDark = value; (window as any).__rerender(); }, dark);
    await expect(notebook.getByRole('textbox')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    for (const button of await notebook.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 341).toBe(true);
    }
    await notebook.screenshot({ path: testInfo.outputPath(dark ? 'signal-notebook-dark.png' : 'signal-notebook-light.png') });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
