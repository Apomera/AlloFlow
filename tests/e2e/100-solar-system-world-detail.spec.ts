import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js',
  toolId: 'solarSystem',
  width: 1180,
  height: 1600,
  appStyles: true,
  layout: 'document',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });
test.describe.configure({ timeout: 90_000 });

async function mountWorld(page: Page, width = 1180, dark = false, state: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.solarSystem);
  // Establish the document-flow width before React and the canvas measure it.
  await page.locator('#wrap').evaluate((wrap, nextWidth) => {
    (wrap as HTMLElement).style.width = `${nextWidth}px`;
  }, width);
  await page.evaluate((data) => (window as any).__mount({ solarSystem: data }), {
    tutorialDismissed: true,
    solarMissionDashboardOpen: false,
    orreryMode: true,
    orr_tab: 0,
    orr_paused: true,
    orr_time: 0,
    orr_sel: 'mercury',
    isDark: dark,
    ...state,
  });
  await expect(page.locator('#orrery-world-detail')).toBeVisible();
  await expect(page.locator('canvas[role="application"]')).toBeVisible();
}

async function expectWorldDefinitions(page: Page, id: string, name: string) {
  const detail = page.locator('#orrery-world-detail');
  await expect(detail).toHaveAttribute('data-orrery-world-detail', id);
  await expect(detail).toHaveAccessibleName(name);
  await expect(detail.getByRole('heading', { name, exact: true })).toBeVisible();
  const current = detail.locator('dl[data-current-reading]');
  await expect(current).toHaveAttribute('aria-labelledby', 'orrery-detail-current-title');
  await expect(page.locator('#orrery-detail-current-title')).toHaveText('Current reading');
  const reading = await current.evaluate((list) => [...list.querySelectorAll('dt')].map((term) => {
    const definition = term.nextElementSibling;
    return {
      label: term.textContent?.trim(),
      tag: definition?.tagName,
      id: definition?.id,
      children: definition?.children.length,
      value: definition?.textContent?.trim(),
    };
  }));
  expect(reading.map(({ label, tag, id, children }) => ({ label, tag, id, children }))).toEqual([
    { label: 'Distance from Sun', tag: 'DD', id: 'orrery-live-distance', children: 0 },
    { label: 'Orbital speed', tag: 'DD', id: 'orrery-live-speed', children: 0 },
    { label: 'Orbital phase', tag: 'DD', id: 'orrery-live-phase', children: 0 },
  ]);
  expect(reading[0].value).toMatch(/^\d+(?:\.\d+)? AU$/);
  expect(reading[1].value).toMatch(/^\d+(?:\.\d+)? km\/s$/);
  expect(reading[2].value?.length).toBeGreaterThan(0);

  const properties = detail.locator('dl[aria-labelledby="orrery-detail-properties-title"]');
  await expect(page.locator('#orrery-detail-properties-title')).toHaveText('Orbit and world properties');
  const propertyPairs = await properties.evaluate((list) => [...list.querySelectorAll('dt')].map((term) => ({
    label: term.textContent?.trim(),
    tag: term.nextElementSibling?.tagName,
    value: term.nextElementSibling?.textContent?.trim(),
  })));
  expect(propertyPairs.map((pair) => pair.label)).toEqual(expect.arrayContaining([
    'Orbit size (a)', 'Orbit shape (e)', 'Orbital period (T)',
    'Orbit tilt (i)', 'Closest to Sun', 'Farthest from Sun',
  ]));
  expect(propertyPairs.every((pair) => pair.tag === 'DD' && !!pair.value)).toBe(true);
  await expect(detail.locator('#orrery-live-selected-summary')).toHaveAttribute('role', 'status');
  await expect(detail.locator('#orrery-live-selected-summary')).toHaveAttribute('aria-live', 'polite');
  await expect(detail.locator('#orrery-live-selected-summary')).toContainText(`${name}: distance`);
}

async function expectTableRelationships(page: Page, table: Locator, rows: string[], evidence: boolean) {
  await expect(table.locator('caption')).toHaveText(evidence ? 'B minus A' : 'Values update with the simulation');
  const columnHeaders = table.getByRole('columnheader');
  await expect(columnHeaders).toHaveCount(4);
  for (const header of await columnHeaders.all()) await expect(header).toHaveAttribute('scope', 'col');
  if (evidence) {
    await expect(columnHeaders).toHaveText(['Measure', 'A', 'B', 'Delta']);
  } else {
    await expect(columnHeaders.nth(0)).toHaveText('Measure');
    await expect(columnHeaders.nth(1)).toContainText('Mercury');
    await expect(columnHeaders.nth(3)).toContainText('Mars');
  }
  for (const label of rows) {
    const row = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: label, exact: true }) });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('rowheader', { name: label, exact: true })).toHaveAttribute('scope', 'row');
    await expect(row.getByRole('cell')).toHaveCount(3);
    await expect(row.getByRole('cell').first()).toContainText(/\d/);
    await expect(row.getByRole('cell').last()).toContainText(/\d/);
  }
}

async function expectReadableContainedTable(table: Locator, expectedNumericCells: number) {
  const report = await table.evaluate((element) => {
    type Color = { r: number; g: number; b: number; a: number };
    const parse = (value: string): Color | null => {
      const channels = value.match(/[\d.]+/g)?.map(Number);
      return channels && channels.length >= 3
        ? { r: channels[0], g: channels[1], b: channels[2], a: channels[3] ?? 1 } : null;
    };
    const over = (foreground: Color, background: Color): Color => ({
      r: foreground.r * foreground.a + background.r * (1 - foreground.a),
      g: foreground.g * foreground.a + background.g * (1 - foreground.a),
      b: foreground.b * foreground.a + background.b * (1 - foreground.a), a: 1,
    });
    const luminance = (color: Color) => {
      const channels = [color.r, color.g, color.b].map((value) => {
        const linear = value / 255;
        return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const background = (node: Element): Color | null => {
      const layers: Color[] = [];
      let ancestor: Element | null = node;
      while (ancestor) {
        const style = getComputedStyle(ancestor);
        if (style.backgroundImage !== 'none') return null;
        const color = parse(style.backgroundColor);
        if (color && color.a > 0) {
          layers.push(color);
          if (color.a >= 0.999) break;
        }
        ancestor = ancestor.parentElement;
      }
      const base = layers.pop();
      if (!base || base.a < 0.999) return null;
      return layers.reverse().reduce((result, layer) => over(layer, result), base);
    };
    const numeric = [...element.querySelectorAll('tbody td')].filter((cell) => /\d/.test(cell.textContent || ''));
    const headers = [...element.querySelectorAll('thead th')].filter((cell) => !!cell.textContent?.trim());
    const contrastFailures: unknown[] = [];
    for (const cell of [...numeric, ...headers]) {
      const backdrop = background(cell);
      const foreground = parse(getComputedStyle(cell).color);
      if (!backdrop || !foreground) {
        contrastFailures.push({ text: cell.textContent, error: 'No measurable solid backdrop' });
        continue;
      }
      const ink = over(foreground, backdrop);
      const a = luminance(ink), b = luminance(backdrop);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (ratio < 4.49) contrastFailures.push({ text: cell.textContent, ratio });
    }
    const bounds = element.getBoundingClientRect();
    const detail = element.closest('#orrery-world-detail')!.getBoundingClientRect();
    const contentOverflow: unknown[] = [];
    for (const cell of element.querySelectorAll('th, td, caption')) {
      const range = document.createRange();
      range.selectNodeContents(cell);
      for (const rect of range.getClientRects()) {
        if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) {
          contentOverflow.push({ text: cell.textContent, left: rect.left, right: rect.right });
        }
      }
    }
    return {
      numericCells: numeric.length, contrastFailures, contentOverflow,
      contained: bounds.left >= detail.left - 1 && bounds.right <= detail.right + 1,
      tableOverflow: element.scrollWidth > element.clientWidth + 1,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(report.numericCells).toBe(expectedNumericCells);
  expect(report.contrastFailures, JSON.stringify(report.contrastFailures)).toEqual([]);
  expect(report.contentOverflow, JSON.stringify(report.contentOverflow)).toEqual([]);
  expect(report.contained).toBe(true);
  expect(report.tableOverflow).toBe(false);
  expect(report.documentWidth).toBeLessThanOrEqual(report.viewportWidth + 1);
}

test('world detail pairs readable labels with live text leaves for Mercury and a comet', async ({ page }) => {
  await mountWorld(page);
  await expectWorldDefinitions(page, 'mercury', 'Mercury');
  await page.getByLabel('Select a world', { exact: true }).selectOption('halley');
  await expectWorldDefinitions(page, 'halley', 'Halley’s Comet');
  await expect(page.locator('#orrery-world-detail .orr-detail-type')).toHaveText('Comet');
  await expect(page.locator('#orrery-world-detail [aria-hidden="true"]').first()).toHaveAttribute('aria-hidden', 'true');
});

test('world detail keeps unique Follow and Compare actions in the navigator through rerenders', async ({ page }) => {
  await mountWorld(page);
  const navigator = page.getByRole('group', { name: 'Keyboard world navigator', exact: true });
  const actions = navigator.getByRole('group', { name: 'Selected world actions', exact: true });
  const follow = page.getByRole('button', { name: 'Follow Mercury with the camera', exact: true });
  const compare = page.getByRole('combobox', { name: 'Compare Mercury with another world', exact: true });
  await expect(follow).toHaveCount(1);
  await expect(page.locator('#orrery-compare-body')).toHaveCount(1);
  await expect(actions.getByRole('button', { name: 'Follow Mercury with the camera', exact: true })).toHaveCount(1);
  await expect(actions.getByRole('combobox', { name: 'Compare Mercury with another world', exact: true })).toHaveCount(1);
  await expect(actions.locator('label[for="orrery-compare-body"]')).toHaveText('Compare Mercury with');
  await expect(page.locator('#orrery-world-detail #orrery-compare-body')).toHaveCount(0);
  await follow.focus();
  await follow.press('Enter');
  const release = page.getByRole('button', { name: 'Release camera follow for Mercury', exact: true });
  await expect(release).toHaveAttribute('aria-pressed', 'true');
  await compare.selectOption('mars');
  await expect(release).toHaveCount(1);
  await expect(release).toHaveAttribute('aria-pressed', 'true');
  await expect(compare).toHaveValue('mars');
  await expect(page.getByRole('region', { name: 'Orbital comparison for Mercury with Mars', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_follow)).toBe('mercury');
  await release.focus();
  await release.press('Space');
  await expect(follow).toHaveAttribute('aria-pressed', 'false');
  await follow.click();
  await page.getByLabel('Select a world', { exact: true }).selectOption('halley');
  await expect(page.getByRole('button', { name: 'Follow Halley’s Comet with the camera', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('combobox', { name: 'Compare Halley’s Comet with another world', exact: true })).toHaveCount(1);
});

test('world detail preserves native display-options keyboard state across world selection', async ({ page }) => {
  await mountWorld(page, 320);
  const options = page.locator('details#orrery-display-options');
  const summary = options.locator(':scope > summary');
  const views = options.getByRole('group', { name: 'Orbit view controls', exact: true, includeHidden: true });
  await expect(summary).toHaveText('Map display options');
  await expect(options).toHaveJSProperty('open', true);
  await summary.focus();
  await summary.press('Enter');
  await expect(options).toHaveJSProperty('open', false);
  await expect(views).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_displayOptionsOpen)).toBe(false);
  await page.getByLabel('Select a world', { exact: true }).selectOption('halley');
  await expect(options).toHaveJSProperty('open', false);
  await expect(summary).toBeVisible();
  await summary.focus();
  await summary.press('Space');
  await expect(options).toHaveJSProperty('open', true);
  await expect(views).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_displayOptionsOpen)).toBe(true);
  await page.getByLabel('Select a world', { exact: true }).selectOption('mercury');
  await expect(options).toHaveJSProperty('open', true);
  await expect(summary).toBeVisible();
});

for (const width of [320, 1180]) {
  for (const dark of [false, true]) {
    test(`world detail comparison and evidence tables stay accessible and readable at ${width}px in ${dark ? 'dark' : 'light'} theme`, async ({ page }, info) => {
      await mountWorld(page, width, dark, { orr_compare: 'mars' });
      const fonts = await page.locator('#orrery-world-detail').evaluate((detail) => {
        const nodes = [detail, detail.querySelector('h3'), detail.querySelector('dt'), detail.querySelector('#orrery-live-distance')];
        return nodes.map((node) => {
          if (!node) throw new Error('Detail font sample was missing');
          const style = getComputedStyle(node);
          return { tag: node.tagName, id: node.id, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight };
        });
      });
      await info.attach('world-detail-fonts', {
        body: Buffer.from(JSON.stringify({ width, theme: dark ? 'dark' : 'light', fonts }, null, 2)),
        contentType: 'application/json',
      });
      const comparison = page.getByRole('table', { name: 'Orbital comparison between Mercury and Mars', exact: true });
      await expect(comparison).toBeVisible();
      await expectTableRelationships(page, comparison, [
        'Orbit size (a)', 'Period (T)', 'Eccentricity (e)', 'Current distance', 'Current speed',
      ], false);
      await expectReadableContainedTable(comparison, 10);

      const evidence = page.getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true });
      await expect(evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury after saving snapshot A', exact: true })).toBeDisabled();
      await evidence.getByRole('button', { name: 'Save orbital snapshot A for Mercury', exact: true }).click();
      await expect(evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury after choosing a prediction', exact: true })).toBeDisabled();
      await evidence.getByRole('combobox', { name: 'Predict B: will orbital speed be faster, slower, or about the same as A?', exact: true }).selectOption('slower');
      const saveB = evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury', exact: true });
      await expect(saveB).toBeEnabled();
      await page.locator('#orrery-timeline-jump-2').click();
      await expect(page.locator('#orrery-live-phase')).toContainText(/aphelion/i);
      await saveB.click();
      const change = evidence.getByRole('table', { name: 'Orbital evidence change from snapshot A to B for Mercury', exact: true });
      await expect(change).toBeVisible();
      await expectTableRelationships(page, change, ['Elapsed time', 'Distance', 'Orbital speed'], true);
      await expect(evidence).toContainText('Prediction supported');
      await expectReadableContainedTable(change, 9);
      await expectReadableContainedTable(comparison, 10);
      expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    });
  }
}
