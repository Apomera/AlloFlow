import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js',
  toolId: 'solarSystem',
  width: 1060,
  height: 1600,
  appStyles: true,
  layout: 'document',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test.describe.configure({ timeout: 120_000, retries: 0 });

async function mountLearning(page: Page, width: number, dark: boolean) {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.solarSystem);
  // Measure the document at its final width before React mounts either view.
  await page.locator('#wrap').evaluate((wrap, nextWidth) => {
    (wrap as HTMLElement).style.width = `${nextWidth}px`;
  }, width);
  await page.evaluate((isDark) => (window as any).__mount({ solarSystem: {
    tutorialDismissed: true,
    solarMissionDashboardOpen: false,
    orreryMode: true,
    orr_tab: 0,
    orr_sel: 'mercury',
    orr_paused: true,
    orr_time: 0,
    orr_zoom: 'inner',
    missionLog: [],
    orr_snapshots: {},
    isDark,
  } }), dark);
  await expect(page.locator('.orr-rhythm-panel')).toBeVisible();
  await expect(page.getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true })).toBeVisible();
}

async function expectContained(region: Locator, width: number) {
  const bounds = await region.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const overflowing = [...element.querySelectorAll('*')]
      .filter((child): child is HTMLElement => child instanceof HTMLElement)
      .map((child) => ({ tag: child.tagName, id: child.id, box: child.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && (box.left < rect.left - 1 || box.right > rect.right + 1))
      .map(({ tag, id }) => ({ tag, id }));
    return {
      left: rect.left,
      right: rect.right,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      pageWidth: document.documentElement.scrollWidth,
      overflowing,
    };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(-1);
  expect(bounds.right).toBeLessThanOrEqual(width + 1);
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth + 1);
  expect(bounds.pageWidth).toBeLessThanOrEqual(width + 1);
  expect(bounds.overflowing, JSON.stringify(bounds)).toEqual([]);
}

async function expectComfortableControls(region: Locator) {
  const controls = await region.locator('button, input[type="range"], select, summary').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        name: element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName,
        width: rect.width,
        height: rect.height,
      };
    }).filter(({ width, height }) => width > 0 && height > 0));
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    expect(control.height, control.name).toBeGreaterThanOrEqual(43.5);
    expect(control.width, control.name).toBeGreaterThanOrEqual(43.5);
  }
}

for (const width of [320, 1060]) {
  for (const dark of [false, true]) {
    test(`orbit learning and evidence remain usable at ${width}px in ${dark ? 'dark' : 'light'} theme`, async ({ page }) => {
      let downloadCount = 0;
      const pageErrors: string[] = [];
      page.on('download', () => { downloadCount += 1; });
      page.on('pageerror', (error) => { pageErrors.push(error.message); });
      await mountLearning(page, width, dark);

      const panel = page.locator('.orr-rhythm-panel');
      const figures = panel.locator('[data-orbit-linked-views] figure');
      await expect(figures).toHaveCount(2);
      for (const figure of await figures.all()) await expect(figure.locator('figcaption')).toHaveCount(1);
      const figureBoxes = await figures.evaluateAll((elements) => elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
      }));
      if (width > 640) {
        expect(Math.abs(figureBoxes[0].top - figureBoxes[1].top)).toBeLessThanOrEqual(2);
        expect(figureBoxes[0].right).toBeLessThanOrEqual(figureBoxes[1].left + 1);
        expect(figureBoxes.every((box) => box.width >= 300)).toBe(true);
      } else {
        expect(figureBoxes[0].bottom).toBeLessThanOrEqual(figureBoxes[1].top + 1);
        expect(Math.abs(figureBoxes[0].left - figureBoxes[1].left)).toBeLessThanOrEqual(2);
      }

      const orbit = panel.getByRole('img', { name: 'Mercury: equal time, changing speed', exact: true });
      const speed = panel.getByRole('img', { name: 'Mercury: orbital speed over time', exact: true });
      await expect(orbit).toHaveAccessibleDescription(/Twelve dots mark equal time intervals/);
      await expect(orbit).toHaveAccessibleDescription(/Sun is at one focus/);
      await expect(orbit).toHaveAccessibleDescription(/arrow length does not represent speed/);
      await expect(speed).toHaveAccessibleDescription(/zero-based axis/);
      await expect(speed).toHaveAccessibleDescription(/elapsed time as a percentage of one orbit/);
      await expect(orbit.locator('[data-rhythm-moment]')).toHaveCount(12);
      const readShape = () => orbit.locator('ellipse').evaluate((ellipse) =>
        ['cx', 'cy', 'rx', 'ry'].map((attribute) => ellipse.getAttribute(attribute)));
      const shapeBefore = await readShape();

      const details = panel.locator('[data-orbit-rhythm-details]');
      const summary = details.locator(':scope > summary');
      await expect(summary).toHaveText('How to read these views');
      await expect(details).toHaveJSProperty('open', false);
      const stateBeforeDisclosure = await page.evaluate(() => JSON.stringify((window as any).__toolData.solarSystem));
      await summary.focus();
      await summary.press('Enter');
      await expect(details).toHaveJSProperty('open', true);
      await expect(summary).toBeFocused();
      await expect(details).toContainText('velocity points in different directions');
      await expect(details.getByRole('link', { name: /NASA/ })).toBeVisible();
      await expectComfortableControls(panel);
      await expectContained(panel, width);
      await summary.press('Space');
      await expect(details).toHaveJSProperty('open', false);
      await expect(summary).toBeFocused();
      expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.solarSystem))).toBe(stateBeforeDisclosure);

      const liveIds = [
        'orrery-rhythm-reading', 'orrery-speed-inspect-reading',
        'orrery-live-distance', 'orrery-live-speed', 'orrery-live-phase',
        'orrery-live-selected-summary',
      ];
      const retained = await page.evaluateHandle((ids) => ids.map((id) => document.getElementById(id)), liveIds);
      const expectRetainedLeaves = async () => expect(await page.evaluate((nodes) => nodes.every((node) =>
        !!node && document.getElementById(node.id) === node && node.children.length === 0), retained)).toBe(true);
      await expectRetainedLeaves();

      const evidence = page.getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true });
      await expect(evidence).toHaveClass(/orr-evidence/);
      await expect(evidence.getByRole('heading', { name: 'Orbital evidence snapshots', exact: true })).toBeVisible();
      await expect(evidence.locator('.orr-evidence-snapshot')).toHaveCount(2);
      await expectComfortableControls(evidence);
      await expectContained(evidence, width);
      await expect(evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury after saving snapshot A', exact: true })).toBeDisabled();
      await expect(evidence.getByRole('button', { name: 'Export orbital evidence for Mercury', exact: true })).toBeDisabled();
      await evidence.getByRole('button', { name: 'Save orbital snapshot A for Mercury', exact: true }).click();
      await expect(evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury after choosing a prediction', exact: true })).toBeDisabled();
      await expect(evidence).toContainText('Next: predict B');
      const prediction = evidence.getByRole('combobox', { name: 'Predict B: will orbital speed be faster, slower, or about the same as A?', exact: true });
      await expect(prediction).toBeVisible();
      await expectComfortableControls(evidence);
      await prediction.selectOption('slower');
      const saveB = evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury', exact: true });
      await expect(saveB).toBeEnabled();
      await page.getByRole('button', { name: 'Jump to aphelion for Mercury', exact: true }).click();
      await expect(page.locator('#orrery-live-phase')).toContainText(/aphelion/i);
      await saveB.click();
      await expect(evidence).toContainText('Prediction supported');
      await expect(evidence.getByRole('table', { name: 'Orbital evidence change from snapshot A to B for Mercury', exact: true })).toBeVisible();
      const snapshots = evidence.locator('.orr-evidence-snapshot');
      await expect(snapshots.locator('dl')).toHaveCount(2);
      const definitions = await snapshots.locator('dl').evaluateAll((lists) => lists.map((list) =>
        [...list.querySelectorAll('dt')].map((term) => ({
          label: term.textContent?.trim(),
          tag: term.nextElementSibling?.tagName,
          value: term.nextElementSibling?.textContent?.trim(),
        }))));
      expect(definitions.every((pairs) => pairs.length >= 3 && pairs.every((pair) =>
        !!pair.label && pair.tag === 'DD' && !!pair.value))).toBe(true);
      const capturesBeforeStep = await snapshots.allTextContents();
      await panel.getByRole('button', { name: "Step forward one twelfth of Mercury's orbit", exact: true }).click();
      expect(await snapshots.allTextContents()).toEqual(capturesBeforeStep);
      expect(await readShape()).toEqual(shapeBefore);
      await expectRetainedLeaves();
      await expectComfortableControls(panel);
      await expectComfortableControls(evidence);
      await expectContained(panel, width);
      await expectContained(evidence, width);

      await evidence.getByRole('button', { name: 'Record orbital speed observation for Mercury', exact: true }).click();
      const recorded = evidence.getByRole('button', { name: 'Observation already recorded for Mercury', exact: true });
      await expect(recorded).toBeDisabled();
      await page.evaluate(() => (window as any).__rerender());
      await expect(recorded).toBeDisabled();
      const entries = await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog || []);
      expect(entries.filter((entry: { text: string }) => entry.text.includes('Orrery observation: Mercury'))).toHaveLength(1);
      expect(entries[0].text).toContain('slower than at A');
      expect(entries.some((entry: { text: string }) => /Exported orbital evidence/.test(entry.text))).toBe(false);
      expect(downloadCount).toBe(0);
      await expectRetainedLeaves();
      await retained.dispose();
      expect(pageErrors).toEqual([]);
      expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    });
  }
}
