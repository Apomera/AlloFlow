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

const worlds = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'ceres', 'haumea', 'eris', 'halley', 'encke'];
const worldNames = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'Ceres', 'Haumea', 'Eris', 'Halley’s Comet', 'Encke’s Comet'];
const metricKeys = ['a', 'period', 'predicted-period', 'period-squared', 'axis-cubed', 'ratio'];
const metricLabels: Record<string, string> = {
  a: 'Orbit size (a)', period: 'Listed period (T)', 'predicted-period': 'Kepler prediction',
  'period-squared': 'T²', 'axis-cubed': 'a³', ratio: 'T²/a³',
};

test.describe.configure({ mode: 'default', timeout: 120_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountInspection(page: Page, width = 1060, dark = true, patch: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Capture the font used by the real canvas renderer, rather than inspecting CSS or source literals.
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.getAttribute('role') === 'application') {
        const canvas = this.canvas as HTMLCanvasElement & { _testK3TextSamples?: { text: string; font: string }[] };
        const samples = canvas._testK3TextSamples ||= [];
        samples.push({ text: String(text), font: this.font });
        if (samples.length > 1000) samples.splice(0, samples.length - 1000);
      }
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.solarSystem));
  // CanvasPanel must measure the final document width on its first mount.
  await page.locator('#wrap').evaluate((wrap, nextWidth) => {
    (wrap as HTMLElement).style.width = `${nextWidth}px`;
  }, width);
  await page.evaluate((data) => {
    (window as any).__mount({ solarSystem: data });
    (window as any).__ctx.isDark = data.isDark;
    document.documentElement.classList.toggle('dark', data.isDark);
    (window as any).__rerender();
  }, {
    tutorialDismissed: true,
    solarMissionDashboardOpen: false,
    orreryMode: true,
    orr_tab: 3,
    orr_time: 0.37,
    orr_paused: true,
    orr_sel: 'mars',
    orr_compare: 'earth',
    orr_follow: 'mars',
    orr_k3hover: null,
    orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
    missionLog: [{ title: 'Retained observation', detail: 'Do not replace my evidence.' }],
    keplerInquiry: { a: 2, e: 0.2, mass: 1, testVariable: 'a', baseline: { a: 1, e: 0.2, mass: 1 },
      hypothesis: 'Keep my earlier prediction.', explanation: 'Keep my earlier explanation.',
      log: [{ t: 'Earlier', a: '1.00', e: '0.200', m: '1.00', p: '1.00', state: 'Elliptical' }] },
    isDark: dark,
    ...patch,
  });
  const section = page.locator('#orrery-k3-inspection');
  await expect(section).toBeVisible();
  await expect(section).toHaveAttribute('aria-labelledby', 'orrery-k3-title');
  await expect(section.getByRole('heading', { level: 3 })).toHaveAttribute('id', 'orrery-k3-title');
  await expect.poll(() => page.locator('canvas[role="application"]').evaluate((canvas: any) =>
    canvas._k3Plot?.points?.length || 0)).toBe(worlds.length);
  return section;
}

async function inspectedWorld(page: Page) {
  return page.evaluate(() => (window as any).__toolData.solarSystem.orr_k3hover);
}

async function retainedState(page: Page) {
  return page.evaluate(() => {
    const { orr_k3hover, ...otherState } = (window as any).__toolData.solarSystem;
    return JSON.parse(JSON.stringify(otherState));
  });
}

async function measurements(page: Page) {
  const entries = await page.locator('#orrery-k3-inspection').evaluate((section) => {
    return [...section.querySelectorAll<HTMLElement>('dd[data-k3-metric]')].map((value) => ({
      key: value.dataset.k3Metric!, raw: value.getAttribute('data-value'), inDefinitionList: Boolean(value.closest('dl')),
      termTag: value.previousElementSibling?.tagName, term: value.previousElementSibling?.textContent?.trim(),
    }));
  });
  expect(entries.map((entry) => entry.key).sort()).toEqual([...metricKeys].sort());
  const numeric = Object.fromEntries(entries.map(({ key, raw, inDefinitionList, termTag, term }) => {
    expect(inDefinitionList, `${key} belongs to its visible definition list`).toBe(true);
    expect(termTag, `${key} has a semantic term`).toBe('DT');
    expect(term, `${key} is named for the quantity it measures`).toBe(metricLabels[key]);
    expect(raw, `${key} exposes an actual measurement`).not.toBeNull();
    const value = Number(raw);
    expect(Number.isFinite(value), `${key} is finite`).toBe(true);
    expect(value, `${key} is positive`).toBeGreaterThan(0);
    return [key, value];
  }));
  expect(numeric['predicted-period']).toBeCloseTo(Math.sqrt(numeric.a ** 3), 8);
  expect(numeric['period-squared']).toBeCloseTo(numeric.period ** 2, 8);
  expect(numeric['axis-cubed']).toBeCloseTo(numeric.a ** 3, 8);
  expect(numeric.ratio).toBeCloseTo(numeric.period ** 2 / numeric.a ** 3, 8);
  return numeric;
}

async function expectSelection(page: Page, id: string | null) {
  await expect.poll(() => inspectedWorld(page)).toBe(id);
  await expect(page.getByLabel('Inspect a world', { exact: true })).toHaveValue(id || '');
  const rows = page.locator('#orrery-k3-verification-table tr[data-k3-world]');
  await expect(rows).toHaveCount(worlds.length);
  for (let index = 0; index < worlds.length; index++) {
    const selected = worlds[index] === id ? 'true' : 'false';
    const row = rows.filter({ has: page.getByRole('button', { name: `Inspect ${worldNames[index]}`, exact: true }) });
    await expect(row).toHaveAttribute('data-k3-world', worlds[index]);
    await expect(row).toHaveAttribute('data-selected', selected);
    await expect(row.getByRole('button', { name: `Inspect ${worldNames[index]}`, exact: true }))
      .toHaveAttribute('aria-pressed', selected);
  }
  const status = page.locator('#orrery-k3-selected');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  if (id) {
    await expect(status).toContainText(`Selected ${worldNames[worlds.indexOf(id)]}:`);
    await measurements(page);
  } else {
    await expect(status).toContainText('Select a plotted world');
  }
}

async function expectTable(page: Page) {
  const table = page.locator('#orrery-k3-verification-table');
  await expect(table).toHaveAttribute('aria-describedby', 'orrery-k3-units-note');
  await expect(table.locator('caption')).toBeVisible();
  await expect(table.locator('caption')).toContainText(/T²\/a³/);
  await expect(table.getByRole('columnheader')).toHaveText([
    'Body', 'a (AU)', 'T (yr)', 'T² (yr²)', 'a³ (AU³)', 'T²/a³ (yr²/AU³)',
  ]);
  for (const heading of await table.getByRole('columnheader').all()) await expect(heading).toHaveAttribute('scope', 'col');
  await expect(table.getByRole('rowheader')).toHaveCount(worlds.length);
  for (const heading of await table.getByRole('rowheader').all()) await expect(heading).toHaveAttribute('scope', 'row');
  for (const row of await table.locator('tr[data-k3-world]').all()) await expect(row.getByRole('cell')).toHaveCount(5);
  const scroll = page.getByRole('region', { name: 'Kepler III verification data', exact: true });
  await expect(scroll).toHaveAttribute('id', 'orrery-k3-table-scroll');
  await expect(scroll).toHaveAttribute('tabindex', '0');
  return scroll;
}

async function expectPlotGeometry(page: Page) {
  const snapshot = await page.locator('canvas[role="application"]').evaluate((element: any) => {
    const box = element.getBoundingClientRect();
    return { cssWidth: box.width, cssHeight: box.height, logicalWidth: element._logicalWidth,
      logicalHeight: element._logicalHeight, plot: element._k3Plot, samples: element._testK3TextSamples || [] };
  });
  expect(snapshot.logicalWidth).toBeCloseTo(snapshot.cssWidth, 0);
  expect(snapshot.logicalHeight).toBeCloseTo(snapshot.cssHeight, 0);
  expect(snapshot.logicalHeight).toBeGreaterThanOrEqual(359);
  expect(snapshot.logicalHeight).toBeLessThanOrEqual(451);
  expect(snapshot.plot.width).toBe(snapshot.logicalWidth);
  expect(snapshot.plot.height).toBe(snapshot.logicalHeight);
  expect(snapshot.plot.points.map((point: any) => point.id)).toEqual(worlds);
  for (const point of snapshot.plot.points) {
    expect(point.x, point.id).toBeGreaterThanOrEqual(snapshot.plot.left);
    expect(point.x, point.id).toBeLessThanOrEqual(snapshot.plot.right);
    expect(point.y, point.id).toBeGreaterThanOrEqual(snapshot.plot.top);
    expect(point.y, point.id).toBeLessThanOrEqual(snapshot.plot.bottom);
  }
  // Earth has a = 1 AU, T = 1 yr: log10(a) = log10(T) = 0 on these published axes.
  const earth = snapshot.plot.points.find((point: any) => point.id === 'earth');
  expect(earth.x).toBeCloseTo(snapshot.plot.left + 0.6 / 2.7 * (snapshot.plot.right - snapshot.plot.left), 6);
  expect(earth.y).toBeCloseTo(snapshot.plot.bottom - 0.8 / 3.8 * (snapshot.plot.bottom - snapshot.plot.top), 6);
  for (const label of snapshot.plot.labels) {
    expect(label.x, label.text).toBeGreaterThanOrEqual(0);
    expect(label.y, label.text).toBeGreaterThanOrEqual(0);
    expect(label.x + label.width, label.text).toBeLessThanOrEqual(snapshot.logicalWidth + 1);
    expect(label.y + label.height, label.text).toBeLessThanOrEqual(snapshot.logicalHeight + 1);
  }
  if (snapshot.logicalWidth >= 560) {
    for (let index = 0; index < snapshot.plot.labels.length; index++) {
      const first = snapshot.plot.labels[index];
      for (const second of snapshot.plot.labels.slice(index + 1)) {
        const overlapX = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
        const overlapY = Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y);
        expect(Math.min(overlapX, overlapY), `${first.text} and ${second.text} labels must remain disjoint`)
          .toBeLessThanOrEqual(0.01);
      }
    }
  }
  expect(snapshot.samples.length, 'the actual chart renderer should draw named axes and worlds').toBeGreaterThan(0);
  for (const sample of snapshot.samples) {
    const size = Number(sample.font.match(/(\d+(?:\.\d+)?)px/)?.[1]);
    expect(size, `${sample.text}: ${sample.font}`).toBeGreaterThanOrEqual(12);
  }
  return snapshot;
}

async function clickPlottedWorld(page: Page, id: string) {
  const canvas = page.locator('canvas[role="application"]');
  await canvas.scrollIntoViewIfNeeded();
  const point = await canvas.evaluate((element: any, world) => {
    const box = element.getBoundingClientRect();
    const plotted = element._k3Plot.points.find((entry: any) => entry.id === world);
    return { x: box.left + plotted.x * box.width / element._logicalWidth,
      y: box.top + plotted.y * box.height / element._logicalHeight };
  }, id);
  await page.mouse.click(point.x, point.y);
  await expectSelection(page, id);
}

async function expectPhoneLayout(section: Locator, width: number) {
  const layout = await section.evaluate((region) => {
    const scroll = region.querySelector<HTMLElement>('#orrery-k3-table-scroll')!;
    const box = region.getBoundingClientRect();
    const scrollBox = scroll.getBoundingClientRect();
    const controls = [...region.querySelectorAll<HTMLElement>('button, select')].map((control) => {
      const bounds = control.getBoundingClientRect();
      return { name: control.textContent?.trim(), width: bounds.width, height: bounds.height,
        font: Number.parseFloat(getComputedStyle(control).fontSize), insideTable: Boolean(control.closest('#orrery-k3-table-scroll')),
        left: bounds.left, right: bounds.right };
    }).filter((control) => control.width > 0 && control.height > 0);
    return { left: box.left, right: box.right, clientWidth: region.clientWidth, scrollWidth: region.scrollWidth,
      pageWidth: document.documentElement.scrollWidth, scrollLeft: scrollBox.left, scrollRight: scrollBox.right,
      localOverflow: scroll.scrollWidth - scroll.clientWidth, controls };
  });
  expect(layout.left).toBeGreaterThanOrEqual(-1);
  expect(layout.right).toBeLessThanOrEqual(width + 1);
  expect(layout.pageWidth).toBeLessThanOrEqual(width + 1);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.scrollLeft).toBeGreaterThanOrEqual(-1);
  expect(layout.scrollRight).toBeLessThanOrEqual(width + 1);
  expect(layout.localOverflow, 'only the data table should require horizontal scrolling').toBeGreaterThan(0);
  expect(layout.controls.length).toBeGreaterThanOrEqual(worlds.length + 2);
  for (const control of layout.controls) {
    expect(control.width, control.name).toBeGreaterThanOrEqual(43.5);
    expect(control.height, control.name).toBeGreaterThanOrEqual(43.5);
    expect(control.font, control.name).toBeGreaterThanOrEqual(12);
    if (!control.insideTable) {
      expect(control.left, control.name).toBeGreaterThanOrEqual(-1);
      expect(control.right, control.name).toBeLessThanOrEqual(width + 1);
    }
  }
}

async function expectReadableText(section: Locator) {
  const failures = await section.evaluate((region) => {
    type Color = [number, number, number, number];
    const parse = (color: string): Color => {
      if (color === 'transparent') return [0, 0, 0, 0];
      const values = color.match(/[\d.]+/g)?.map(Number) || [];
      if (values.length < 3) throw new Error(`Unsupported computed color: ${color}`);
      return [values[0], values[1], values[2], values[3] ?? 1];
    };
    const over = (top: Color, bottom: Color): Color => {
      const alpha = top[3] + bottom[3] * (1 - top[3]);
      return [0, 1, 2].map((index) =>
        (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha,
      ).concat(alpha) as Color;
    };
    const luminance = (color: Color) => color.slice(0, 3).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    return [...region.querySelectorAll<HTMLElement>('*')].filter((element) => {
      const style = getComputedStyle(element);
      return element instanceof HTMLElement && element.getBoundingClientRect().width > 0 &&
        element.getBoundingClientRect().height > 0 && style.visibility !== 'hidden' &&
        !element.closest('.sr-only, button:disabled, select:disabled') &&
        [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    }).map((element) => {
      const chain: HTMLElement[] = [];
      for (let current: HTMLElement | null = element; current; current = current.parentElement) chain.unshift(current);
      let background: Color = [255, 255, 255, 1];
      let opacity = 1;
      for (const ancestor of chain) {
        const style = getComputedStyle(ancestor);
        background = over(parse(style.backgroundColor), background);
        opacity *= Number(style.opacity);
      }
      const style = getComputedStyle(element), foreground = parse(style.color);
      foreground[3] *= opacity;
      const a = luminance(over(foreground, background)), b = luminance(background);
      return { text: element.textContent?.trim().slice(0, 90), font: Number.parseFloat(style.fontSize),
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    }).filter(({ ratio, font }) => ratio < 4.5 || font < 12);
  });
  expect(failures, 'Kepler III labels, selected measurements, numeric cells and active controls must be readable').toEqual([]);
}

async function expectNoErrors(page: Page) {
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}

test('native world selection and semantic table inspection share accurate selected measurements', async ({ page }) => {
  const section = await mountInspection(page);
  const picker = page.getByLabel('Inspect a world', { exact: true });
  await expect(picker).toHaveAttribute('id', 'orrery-k3-world-picker');
  expect(await picker.locator('option').evaluateAll((options) => options.map((option: any) => option.value)))
    .toEqual(['', ...worlds]);
  const clear = section.getByRole('button', { name: 'Clear selected world', exact: true });
  await expect(clear).toBeDisabled();
  await expectSelection(page, null);
  await expectTable(page);
  await picker.selectOption('mercury');
  await expectSelection(page, 'mercury');
  await expect(page.locator('#orrery-k3-selected')).toContainText('a = 0.387 AU');
  await expect(page.locator('#orrery-k3-selected')).toContainText('T²/a³ = 1.0021');
  await expect(clear).toBeEnabled();
  const earth = section.getByRole('button', { name: 'Inspect Earth', exact: true });
  await earth.click();
  await expectSelection(page, 'earth');
  expect(await measurements(page)).toEqual(Object.fromEntries(metricKeys.map((key) => [key, 1])));
  await earth.click();
  await expectSelection(page, null);
  await expect(earth).toBeFocused();
  await expect(clear).toBeDisabled();
  await expectPlotGeometry(page);
  await expectNoErrors(page);
});

test('the responsive log plot uses the same world positions for pointer inspection and keyboard clearing', async ({ page }) => {
  await mountInspection(page, 1060, false);
  const plot = await expectPlotGeometry(page);
  expect(plot.plot.labels).toHaveLength(plot.logicalWidth >= 560 ? worlds.length : 0);
  const canvas = page.locator('canvas[role="application"]');
  await expect(canvas).toHaveAttribute('aria-keyshortcuts', 'Enter Space Escape');
  await expect(canvas).toHaveAttribute('aria-describedby', 'orrery-k3-canvas-help orrery-k3-axis-note');
  await clickPlottedWorld(page, 'jupiter');
  await canvas.focus();
  await canvas.press('Escape');
  await expectSelection(page, null);
  await expect(canvas).toBeFocused();
  await canvas.press('Enter');
  await expectSelection(page, 'mercury');
  await canvas.press('Enter');
  await expectSelection(page, 'venus');
  await canvas.press('Space');
  await expectSelection(page, 'earth');
  await clickPlottedWorld(page, 'pluto');
  await expectNoErrors(page);
});

test('inspecting and clearing worlds preserves the shared clock, camera, saved evidence and inquiry writing', async ({ page }) => {
  const section = await mountInspection(page, 736, true);
  const retained = await retainedState(page);
  const picker = page.getByLabel('Inspect a world', { exact: true });
  await picker.selectOption('saturn');
  await expectSelection(page, 'saturn');
  expect(await retainedState(page)).toEqual(retained);
  await section.getByRole('button', { name: 'Inspect Mars', exact: true }).click();
  await expectSelection(page, 'mars');
  expect(await retainedState(page)).toEqual(retained);
  await section.getByRole('button', { name: 'Clear selected world', exact: true }).click();
  await expectSelection(page, null);
  await expect(picker).toBeFocused();
  expect(await retainedState(page)).toEqual(retained);
  const canvas = page.locator('canvas[role="application"]');
  await canvas.focus();
  await canvas.press('Enter');
  await expectSelection(page, 'mercury');
  await canvas.press('Escape');
  await expectSelection(page, null);
  await expect(canvas).toBeFocused();
  expect(await retainedState(page)).toEqual(retained);
  const plot = await expectPlotGeometry(page);
  expect(plot.logicalWidth, 'the single-column tablet chart exercises all-world label placement').toBeGreaterThanOrEqual(560);
  expect(plot.plot.labels).toHaveLength(worlds.length);
  await expectNoErrors(page);
});

for (const dark of [false, true]) {
  test(`320px ${dark ? 'dark' : 'light'} inspection has readable native controls and keyboard-scrollable data without page overflow`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const section = await mountInspection(page, 320, dark);
    const picker = page.getByLabel('Inspect a world', { exact: true });
    await picker.focus();
    await picker.press('Home');
    await expectSelection(page, null);
    await picker.press('ArrowDown');
    await expectSelection(page, 'mercury');
    await expect(picker).toBeFocused();
    await expectPhoneLayout(section, 320);
    await expectReadableText(section);
    const plot = await expectPlotGeometry(page);
    expect(plot.plot.labels).toHaveLength(1);
    expect(plot.plot.labels[0].text).toContain('Mercury');
    const scroll = await expectTable(page);
    await scroll.focus();
    await scroll.evaluate((element) => { element.scrollLeft = 0; });
    for (let step = 0; step < 5; step++) await scroll.press('ArrowRight');
    await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await expect(scroll).toBeFocused();
    async function expectPinnedWorld(id: string, name: string) {
      const row = section.locator(`tr[data-k3-world="${id}"]`);
      const header = row.getByRole('rowheader');
      const button = header.getByRole('button', { name: `Inspect ${name}`, exact: true });
      await expect(header).toHaveAttribute('scope', 'row');
      await expect(row.getByRole('cell')).toHaveCount(5);
      await button.scrollIntoViewIfNeeded();
      await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
      await expect.poll(() => scroll.evaluate((element) =>
        element.scrollWidth - element.clientWidth - element.scrollLeft)).toBeLessThanOrEqual(1);
      const geometry = await row.evaluate((element) => {
        const viewport = document.getElementById('orrery-k3-table-scroll')!;
        const world = element.querySelector<HTMLElement>('th[scope="row"]')!;
        const control = world.querySelector<HTMLButtonElement>('button')!;
        const ratio = element.querySelector<HTMLElement>('td:last-child')!;
        const bounds = (node: Element) => {
          const box = node.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
        };
        const range = document.createRange();
        range.selectNodeContents(ratio);
        const reading = range.getBoundingClientRect();
        const worldBox = world.getBoundingClientRect(), controlBox = control.getBoundingClientRect();
        const background = getComputedStyle(world).backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
        const worldHit = document.elementFromPoint(worldBox.left + worldBox.width / 2, worldBox.top + worldBox.height / 2);
        const buttonHit = document.elementFromPoint(controlBox.left + controlBox.width / 2, controlBox.top + controlBox.height / 2);
        const ratioHit = document.elementFromPoint(reading.left + reading.width / 2, reading.top + reading.height / 2);
        return { viewport: bounds(viewport), world: bounds(world), button: bounds(control),
          reading: { left: reading.left, right: reading.right, top: reading.top, bottom: reading.bottom,
            width: reading.width, height: reading.height },
          ratio: Number(ratio.textContent?.trim()), backgroundAlpha: background.length === 4 ? background[3] : 1,
          worldExposed: Boolean(worldHit && world.contains(worldHit)),
          buttonExposed: Boolean(buttonHit && control.contains(buttonHit)),
          ratioExposed: Boolean(ratioHit && ratio.contains(ratioHit)) };
      });
      for (const [label, bounds] of [['world header', geometry.world], ['world button', geometry.button]] as const) {
        expect(bounds.left, `${name} ${label}`).toBeGreaterThanOrEqual(geometry.viewport.left - 1);
        expect(bounds.right, `${name} ${label}`).toBeLessThanOrEqual(geometry.viewport.right + 1);
        expect(bounds.top, `${name} ${label}`).toBeGreaterThanOrEqual(geometry.viewport.top - 1);
        expect(bounds.bottom, `${name} ${label}`).toBeLessThanOrEqual(geometry.viewport.bottom + 1);
      }
      expect(geometry.backgroundAlpha, `${name}'s pinned heading must cover the scrolled cells behind it`).toBeGreaterThanOrEqual(0.99);
      expect(geometry.worldExposed, `${name}'s row heading remains exposed`).toBe(true);
      expect(geometry.buttonExposed, `${name}'s inspection action remains exposed`).toBe(true);
      expect(geometry.reading.width, `${name}'s ratio reading has visible text`).toBeGreaterThan(0);
      expect(geometry.reading.height).toBeGreaterThan(0);
      expect(geometry.reading.left, `${name}'s complete ratio stays beside its world heading`).toBeGreaterThanOrEqual(geometry.world.right - 0.5);
      expect(geometry.reading.right, `${name}'s complete ratio stays in the table viewport`).toBeLessThanOrEqual(geometry.viewport.right + 1);
      expect(geometry.ratioExposed, `${name}'s ratio is not covered by the pinned world column`).toBe(true);
      expect(Number.isFinite(geometry.ratio)).toBe(true);
      expect(geometry.ratio).toBeCloseTo((await measurements(page)).ratio, 3);
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(row).toHaveAttribute('data-selected', 'true');
    }
    await expectPinnedWorld('mercury', 'Mercury');
    await expectReadableText(section);
    await section.getByRole('button', { name: 'Inspect Jupiter', exact: true }).click();
    await expectSelection(page, 'jupiter');
    await expectPinnedWorld('jupiter', 'Jupiter');
    await expectReadableText(section);
    await section.getByRole('button', { name: 'Clear selected world', exact: true }).click();
    await expectSelection(page, null);
    await expect(picker).toBeFocused();
    await expectPhoneLayout(section, 320);
    await expectReadableText(section);
    await expectNoErrors(page);
    expect(pageErrors).toEqual([]);
  });
}
