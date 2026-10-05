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

test.describe.configure({ mode: 'default', timeout: 120_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const retainedWriting = {
  hypothesis: 'I predict changing one setting will help me distinguish period from shape.',
  explanation: 'Keep my explanation from the earlier investigation.',
  understood: true,
  stuckRevealed: true,
  log: [{ t: 'Earlier', a: '1.00', e: '0.000', m: '1.00', p: '1.00', state: 'Circular' }],
};

async function mountInquiry(page: Page, width = 1060, dark = true, patch: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.solarSystem));
  // Finalize the document width before React mounts the model and diagram.
  await page.locator('#wrap').evaluate((wrap, nextWidth) => {
    (wrap as HTMLElement).style.width = `${nextWidth}px`;
  }, width);
  await page.evaluate((data) => {
    (window as any).__mount({ solarSystem: data });
    // GlHarness initializes the actual host theme on ctx, outside toolData.
    (window as any).__ctx.isDark = data.isDark;
    document.documentElement.classList.toggle('dark', data.isDark);
    (window as any).__rerender();
  }, {
    tutorialDismissed: true,
    solarMissionDashboardOpen: false,
    orreryMode: true,
    orr_tab: 8,
    orr_time: 0.37,
    orr_paused: true,
    orr_sel: 'mercury',
    orr_compare: 'earth',
    orr_follow: null,
    orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
    isDark: dark,
    keplerInquiry: { a: 1, e: 0, mass: 1, testVariable: 'e', ...retainedWriting, ...patch },
  });
  const inquiry = page.locator('#solar-kepler-inquiry');
  await expect(inquiry).toBeVisible();
  await expect(inquiry).toHaveAttribute('aria-labelledby', 'solar-kepler-inquiry-title');
  await expect(inquiry.getByRole('heading', { level: 3 })).toHaveAttribute('id', 'solar-kepler-inquiry-title');
  return inquiry;
}

async function inquiryState(page: Page) {
  return page.evaluate(() => (window as any).__toolData.solarSystem.keplerInquiry);
}

async function orbitState(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__toolData.solarSystem;
    return { time: state.orr_time, paused: state.orr_paused, selected: state.orr_sel,
      compare: state.orr_compare, follow: state.orr_follow, snapshots: state.orr_snapshots };
  });
}

async function setRange(page: Page, key: 'a' | 'e' | 'mass', value: number) {
  const range = page.locator(`#solar-kepler-${key}`);
  await range.evaluate((control, nextValue) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(control, String(nextValue));
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect.poll(async () => Number(await range.inputValue())).toBe(value);
  await expect.poll(async () => (await inquiryState(page))[key]).toBe(value);
}

async function metric(page: Page, key: string) {
  const raw = await page.locator(`dd[data-inquiry-metric="${key}"]`).getAttribute('data-value');
  expect(raw, `${key} must expose its numeric measurement`).not.toBeNull();
  const value = Number(raw);
  expect(Number.isFinite(value), `${key} must expose a finite measured value`).toBe(true);
  return value;
}

async function expectTable(page: Page) {
  const table = page.locator('#solar-kepler-comparison-table');
  await expect(table.locator('caption')).toHaveText('Baseline and current orbit');
  await expect(table.getByRole('columnheader')).toHaveText(['Measure', 'Baseline', 'Current']);
  for (const heading of await table.getByRole('columnheader').all()) await expect(heading).toHaveAttribute('scope', 'col');
  await expect(table.getByRole('rowheader')).toHaveText([
    'Period', 'Closest distance', 'Farthest distance', 'Speed at closest', 'Speed at farthest', 'Speed ratio',
  ]);
  for (const heading of await table.getByRole('rowheader').all()) await expect(heading).toHaveAttribute('scope', 'row');
  return table;
}

async function tableValues(table: Locator, label: string) {
  const row = table.getByRole('rowheader', { name: label, exact: true }).locator('..');
  await expect(row).toHaveCount(1);
  await expect(row).toHaveJSProperty('tagName', 'TR');
  const values = await row.getByRole('cell').allTextContents();
  expect(values).toHaveLength(2);
  return values.map((value) => {
    const number = Number(value.match(/[-+]?\d+(?:\.\d+)?/)?.[0]);
    expect(Number.isFinite(number), `${label}: ${value}`).toBe(true);
    return number;
  });
}

async function expectNoErrors(page: Page) {
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}

async function expectPhoneUsability(inquiry: Locator, width: number) {
  const samples = await inquiry.evaluate((region) => {
    const bounds = region.getBoundingClientRect();
    const controls = [...region.querySelectorAll<HTMLElement>('button, input[type="range"], select, textarea')]
      .map((control) => ({ name: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
        box: control.getBoundingClientRect(), font: Number.parseFloat(getComputedStyle(control).fontSize) }))
      .filter(({ box }) => box.width > 0 && box.height > 0)
      .map(({ name, box, font }) => ({ name, width: box.width, height: box.height, left: box.left, right: box.right, font }));
    const overflow = [...region.querySelectorAll<HTMLElement>('*')]
      .filter((child) => child instanceof HTMLElement)
      .map((child) => ({ text: child.textContent?.trim().slice(0, 50), box: child.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && (box.left < bounds.left - 1 || box.right > bounds.right + 1))
      .map(({ text }) => text);
    return { left: bounds.left, right: bounds.right, clientWidth: region.clientWidth,
      scrollWidth: region.scrollWidth, pageWidth: document.documentElement.scrollWidth, controls, overflow };
  });
  expect(samples.left).toBeGreaterThanOrEqual(-1);
  expect(samples.right).toBeLessThanOrEqual(width + 1);
  expect(samples.pageWidth).toBeLessThanOrEqual(width + 1);
  expect(samples.scrollWidth).toBeLessThanOrEqual(samples.clientWidth + 1);
  expect(samples.overflow).toEqual([]);
  expect(samples.controls.length).toBeGreaterThanOrEqual(7);
  for (const control of samples.controls) {
    expect(control.width, String(control.name)).toBeGreaterThanOrEqual(43.5);
    expect(control.height, String(control.name)).toBeGreaterThanOrEqual(43.5);
    expect(control.font, String(control.name)).toBeGreaterThanOrEqual(12);
    expect(control.left, String(control.name)).toBeGreaterThanOrEqual(-1);
    expect(control.right, String(control.name)).toBeLessThanOrEqual(width + 1);
  }
}

async function expectReadableText(inquiry: Locator) {
  const failures = await inquiry.evaluate((region) => {
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
    return [...region.querySelectorAll<HTMLElement>('*')].filter((element) =>
      element instanceof HTMLElement && element.getBoundingClientRect().width > 0 &&
      element.getBoundingClientRect().height > 0 && !element.closest('button:disabled, input:disabled, select:disabled') &&
      [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
    ).map((element) => {
      const chain: HTMLElement[] = [];
      for (let current: HTMLElement | null = element; current; current = current.parentElement) chain.unshift(current);
      let background: Color = [255, 255, 255, 1];
      let opacity = 1;
      for (const ancestor of chain) {
        const style = getComputedStyle(ancestor);
        background = over(parse(style.backgroundColor), background);
        opacity *= Number(style.opacity);
      }
      const style = getComputedStyle(element);
      const foreground = parse(style.color);
      foreground[3] *= opacity;
      const a = luminance(over(foreground, background)), b = luminance(background);
      return { text: element.textContent?.trim().slice(0, 90), font: Number.parseFloat(style.fontSize),
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    }).filter(({ ratio, font }) => ratio < 4.5 || font < 12);
  });
  expect(failures, 'Inquiry prose, measurement values and active controls must remain readable').toEqual([]);
}

test('a frozen baseline supports one-variable investigation and restoration without erasing writing', async ({ page }) => {
  const inquiry = await mountInquiry(page);
  const orbitBefore = await orbitState(page);
  const status = page.locator('#solar-kepler-baseline-status');
  await expect(status).toHaveAttribute('data-comparison-state', 'unavailable');
  await expect(status).toContainText(/baseline/i);
  await inquiry.getByRole('button', { name: 'Save baseline', exact: true }).click();
  const baseline = (await inquiryState(page)).baseline;
  expect(baseline).toMatchObject({ a: 1, e: 0, mass: 1 });
  await expect(status).toHaveAttribute('data-comparison-state', 'unchanged');
  await setRange(page, 'e', 0.5);
  await expect(status).toHaveAttribute('data-comparison-state', 'controlled');
  expect(await metric(page, 'period')).toBeCloseTo(1, 8);
  const table = await expectTable(page);
  expect(await tableValues(table, 'Period')).toEqual([1, 1]);
  await setRange(page, 'a', 2);
  await expect(status).toHaveAttribute('data-comparison-state', 'confounded');
  await expect(status).toContainText(/held|more than one|other settings/i);
  await inquiry.getByRole('button', { name: 'Restore held settings', exact: true }).click();
  await expect(status).toHaveAttribute('data-comparison-state', 'controlled');
  const restored = await inquiryState(page);
  expect(restored).toMatchObject({ a: 1, e: 0.5, mass: 1, baseline, ...retainedWriting });
  await inquiry.getByRole('button', { name: 'Log this orbit', exact: true }).click();
  const logged = await inquiryState(page);
  expect(logged.log).toHaveLength(retainedWriting.log.length + 1);
  expect(logged.log[0]).toEqual(retainedWriting.log[0]);
  expect(logged.baseline).toEqual(baseline);
  await inquiry.getByRole('button', { name: 'Reset (Earth)', exact: true }).click();
  expect(await inquiryState(page)).toMatchObject({ a: 1, e: 0, mass: 1,
    hypothesis: retainedWriting.hypothesis, explanation: retainedWriting.explanation,
    understood: true, stuckRevealed: true, log: logged.log });
  expect(await orbitState(page)).toEqual(orbitBefore);
  await expect(page.locator('#solar-kepler-hypothesis')).toHaveValue(retainedWriting.hypothesis);
  await expect(inquiry.getByLabel('Explain in your own words', { exact: true })).toHaveValue(retainedWriting.explanation);
  await expectNoErrors(page);
});

test('orbit-size and central-mass experiments show independently calculated period and speed changes', async ({ page }) => {
  const inquiry = await mountInquiry(page, 1060, false, { e: 0.2, testVariable: 'a' });
  await inquiry.getByRole('button', { name: 'Save baseline', exact: true }).click();
  const baseline = (await inquiryState(page)).baseline;
  const initialSpeed = await metric(page, 'v-peri');
  const initialFarSpeed = await metric(page, 'v-aph');
  await setRange(page, 'a', 2);
  await expect(page.locator('#solar-kepler-baseline-status')).toHaveAttribute('data-comparison-state', 'controlled');
  expect(await metric(page, 'period')).toBeCloseTo(Math.sqrt(8), 8);
  expect((await metric(page, 'v-peri')) / initialSpeed).toBeCloseTo(1 / Math.sqrt(2), 8);
  const table = await expectTable(page);
  const periods = await tableValues(table, 'Period');
  expect(periods[0]).toBe(1);
  expect(periods[1]).toBeCloseTo(Math.sqrt(8), 2);
  await page.locator('#solar-kepler-variable').selectOption('mass');
  const switched = await inquiryState(page);
  expect(switched).toMatchObject({ a: 2, e: 0.2, mass: 1, testVariable: 'mass', baseline });
  await expect(page.locator('#solar-kepler-baseline-status')).toHaveAttribute('data-comparison-state', 'confounded');
  await inquiry.getByRole('button', { name: 'Restore held settings', exact: true }).click();
  await setRange(page, 'mass', 4);
  await expect(page.locator('#solar-kepler-baseline-status')).toHaveAttribute('data-comparison-state', 'controlled');
  expect(await metric(page, 'period')).toBeCloseTo(0.5, 8);
  expect((await metric(page, 'v-peri')) / initialSpeed).toBeCloseTo(2, 8);
  expect((await metric(page, 'v-aph')) / initialFarSpeed).toBeCloseTo(2, 8);
  expect(await tableValues(table, 'Period')).toEqual([1, 0.5]);
  const closestSpeeds = await tableValues(table, 'Speed at closest');
  expect(closestSpeeds[1] / closestSpeeds[0]).toBeCloseTo(2, 2);
  expect((await inquiryState(page)).baseline).toEqual(baseline);
  await inquiry.getByRole('button', { name: 'Replace baseline', exact: true }).click();
  expect((await inquiryState(page)).baseline).toMatchObject({ a: 1, e: 0.2, mass: 4 });
  await expect(page.locator('#solar-kepler-baseline-status')).toHaveAttribute('data-comparison-state', 'unchanged');
  expect(await inquiryState(page)).toMatchObject(retainedWriting);
  await expectNoErrors(page);
});

test('the bound-orbit diagram places its endpoints correctly and fits the circular orbit and ruler', async ({ page }) => {
  await mountInquiry(page);
  const svg = page.getByRole('img', { name: 'Kepler inquiry orbit visualization', exact: true });
  await expect(svg).toHaveAttribute('viewBox', '0 0 360 300');
  const geometry = () => svg.evaluate((element) => {
    const diagram = element as SVGSVGElement;
    const ellipse = diagram.querySelector<SVGEllipseElement>('[data-inquiry-ellipse]')!;
    const star = diagram.querySelector<SVGCircleElement>('[data-inquiry-star]')!;
    const point = (name: string) => {
      const circle = diagram.querySelector<SVGCircleElement>(`[data-orbit-endpoint="${name}"]`)!;
      return { x: circle.cx.baseVal.value, y: circle.cy.baseVal.value };
    };
    const bounds = (selector: string) => {
      const box = diagram.querySelector<SVGGraphicsElement>(selector)!.getBBox();
      return { left: box.x, right: box.x + box.width, top: box.y, bottom: box.y + box.height };
    };
    const view = diagram.viewBox.baseVal;
    return { star: { x: star.cx.baseVal.value, y: star.cy.baseVal.value },
      peri: point('perihelion'), aph: point('aphelion'), rx: ellipse.rx.baseVal.value,
      ry: ellipse.ry.baseVal.value, cx: ellipse.cx.baseVal.value, cy: ellipse.cy.baseVal.value,
      ellipse: bounds('[data-inquiry-ellipse]'), ruler: bounds('[data-inquiry-ruler]'),
      view: { left: view.x, top: view.y, right: view.x + view.width, bottom: view.y + view.height } };
  });
  const circular = await geometry();
  expect(circular.star).toEqual({ x: 225, y: 125 });
  expect(circular.rx).toBeGreaterThan(0);
  expect(circular.rx).toBeCloseTo(circular.ry, 6);
  for (const box of [circular.ellipse, circular.ruler]) {
    expect(box.left).toBeGreaterThanOrEqual(circular.view.left);
    expect(box.right).toBeLessThanOrEqual(circular.view.right);
    expect(box.top).toBeGreaterThanOrEqual(circular.view.top);
    expect(box.bottom).toBeLessThanOrEqual(circular.view.bottom);
  }
  await setRange(page, 'e', 0.5);
  const eccentric = await geometry();
  expect(eccentric.peri.x).toBeGreaterThan(eccentric.star.x);
  expect(eccentric.aph.x).toBeLessThan(eccentric.star.x);
  expect(eccentric.peri.y).toBe(eccentric.star.y);
  expect(eccentric.aph.y).toBe(eccentric.star.y);
  expect((eccentric.peri.x - eccentric.star.x) / (eccentric.star.x - eccentric.aph.x)).toBeCloseTo(1 / 3, 6);
  expect(eccentric.cx + eccentric.rx * 0.5).toBeCloseTo(eccentric.star.x, 6);
  expect(eccentric.ry / eccentric.rx).toBeCloseTo(Math.sqrt(1 - 0.5 ** 2), 6);
  await setRange(page, 'e', 0.98);
  await expect(page.locator('[data-inquiry-orbit-class]')).toHaveAttribute('data-inquiry-orbit-class', 'elongated');
  const elongated = await geometry();
  expect(elongated.ry).toBeGreaterThan(0);
  // SVG baseVal coordinates are single-precision floats in Chromium.
  expect(elongated.peri.x - elongated.star.x).toBeCloseTo(elongated.rx * 0.02, 4);
  expect(elongated.star.x - elongated.aph.x).toBeCloseTo(elongated.rx * 1.98, 4);
  await expectNoErrors(page);
});

for (const dark of [false, true]) {
  test(`native Inquiry controls and comparison remain readable at 320px in ${dark ? 'dark' : 'light'} theme`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const inquiry = await mountInquiry(page, 320, dark);
    await expectPhoneUsability(inquiry, 320);
    await expectReadableText(inquiry);
    for (const [id, name] of [['a', /^Semi-major axis \(a\)/], ['e', /^Eccentricity \(e\)/], ['mass', /^Central mass \(M\)/]] as const) {
      const slider = inquiry.getByRole('slider', { name });
      await expect(slider).toHaveAttribute('id', `solar-kepler-${id}`);
      expect(await slider.evaluate((control) => (control as HTMLInputElement).labels?.length)).toBeGreaterThan(0);
      await expect(slider).toBeEnabled();
    }
    const variable = page.locator('#solar-kepler-variable');
    await expect(variable).toHaveAccessibleName(/\S/);
    expect(await variable.evaluate((control) => (control as HTMLSelectElement).labels?.length)).toBeGreaterThan(0);
    await variable.focus();
    await variable.press('Home');
    await expect(variable).toHaveValue('a');
    await variable.press('ArrowDown');
    await expect(variable).toHaveValue('e');
    await expect(variable).toBeFocused();
    const save = inquiry.getByRole('button', { name: 'Save baseline', exact: true });
    await save.focus();
    await save.press('Enter');
    await expect(inquiry.getByRole('button', { name: 'Replace baseline', exact: true })).toBeFocused();
    const e = page.locator('#solar-kepler-e');
    await e.focus();
    await e.press('Home');
    const step = Number(await e.getAttribute('step'));
    expect(step).toBeGreaterThan(0);
    await e.press('ArrowRight');
    await expect.poll(async () => Number(await e.inputValue())).toBeCloseTo(step, 6);
    await expect(e).toBeFocused();
    await expect(page.locator('#solar-kepler-baseline-status')).toHaveAttribute('data-comparison-state', 'controlled');
    await expectTable(page);
    await expectPhoneUsability(inquiry, 320);
    await expectReadableText(inquiry);
    expect(pageErrors).toEqual([]);
    await expectNoErrors(page);
  });
}
