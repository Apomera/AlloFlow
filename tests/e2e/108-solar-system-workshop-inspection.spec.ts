import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem',
  width: 1060, height: 1600, appStyles: true, layout: 'document',
});
const tau = 2 * Math.PI;
const metricKeys = ['phase', 'angle', 'distance', 'speed', 'potential', 'kinetic', 'total', 'energy-sum',
  'period', 'perihelion', 'aphelion', 'peri-speed', 'aph-speed', 'escape-speed'];
const circularSpeed = Math.sqrt(6.674e-11 * 1.989e30 / (1.496e8 * 1000)) / 1000;

test.describe.configure({ mode: 'default', timeout: 120_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function showCanvas(canvas: Locator) {
  await canvas.evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' }));
  await expect.poll(() => canvas.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight &&
      box.right > 0 && box.left < innerWidth;
  })).toBe(true);
}

async function mountLesson(page: Page, width = 1060, dark = true, patch: Record<string, unknown> = {}) {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.getAttribute('aria-label')?.startsWith('Orbit Workshop ')) {
        const canvas = this.canvas as HTMLCanvasElement & { _testWsTextSamples?: { text: string; font: string; x: number; y: number }[] };
        const samples = canvas._testWsTextSamples ||= [];
        samples.push({ text: String(text), font: this.font, x, y });
        if (samples.length > 1000) samples.splice(0, samples.length - 1000);
      }
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.solarSystem));
  await page.locator('#wrap').evaluate((wrap, nextWidth) => { (wrap as HTMLElement).style.width = `${nextWidth}px`; }, width);
  await page.evaluate((data) => {
    (window as any).__mount({ solarSystem: data });
    (window as any).__ctx.isDark = data.isDark;
    document.documentElement.classList.toggle('dark', data.isDark);
    (window as any).__rerender();
  }, {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: true, orr_tab: 4,
    orr_time: 0.37, orr_paused: true, orr_sel: 'mars', orr_compare: 'earth', orr_follow: 'mars',
    orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
    missionLog: [{ title: 'Retained observation', detail: 'Keep my saved evidence.' }],
    keplerInquiry: { a: 2, e: 0.2, mass: 1, testVariable: 'a', baseline: { a: 1, e: 0.2, mass: 1 },
      hypothesis: 'Keep my earlier prediction.', explanation: 'Keep my earlier explanation.',
      log: [{ t: 'Earlier', a: '1.00', e: '0.200', m: '1.00', p: '1.00', state: 'Elliptical' }] },
    orr_wsb: 'earth', orr_wsphase: 0, orr_wscompare: false, orr_wshz: true,
    isDark: dark, ...patch,
  });
  const lesson = page.locator('#orrery-workshop-inspection');
  await expect(lesson).toBeVisible();
  const canvases = lesson.locator('canvas');
  await expect(canvases).toHaveCount(2);
  for (const canvas of await canvases.all()) {
    await expect(canvas).toHaveAttribute('role', 'img');
    expect(await canvas.getAttribute('tabindex')).toBeNull();
    await expect(canvas).toHaveAttribute('aria-describedby',
      (await canvas.getAttribute('aria-label'))?.startsWith('Orbit Workshop preview')
        ? 'orrery-workshop-evidence' : 'orrery-workshop-energy-note');
    await showCanvas(canvas);
    await expect.poll(() => canvas.evaluate((element: any) => Boolean(element._wsOrbit || element._wsEnergy))).toBe(true);
  }
  return lesson;
}

async function state(page: Page) { return page.evaluate(() => (window as any).__toolData.solarSystem); }

async function retainedState(page: Page, omitTab = false) {
  return page.evaluate((ignoreTab) => {
    const { orr_wsb, orr_wse, orr_wsa, orr_wsphase, orr_wscompare, orr_wshz, ...rest } = (window as any).__toolData.solarSystem;
    if (ignoreTab) delete rest.orr_tab;
    return JSON.parse(JSON.stringify(rest));
  }, omitTab);
}

async function setRange(page: Page, id: string, value: number) {
  const range = page.locator(`#${id}`);
  await range.evaluate((control, nextValue) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(control, String(nextValue));
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect.poll(async () => Number(await range.inputValue())).toBeCloseTo(value, 4);
}

async function measurements(page: Page) {
  const entries = await page.locator('#orrery-workshop-inspection').evaluate((lesson) =>
    [...lesson.querySelectorAll<HTMLElement>('dd[data-ws-metric]')].map((value) => ({
      key: value.dataset.wsMetric!, raw: value.getAttribute('data-value'),
      inDefinitionList: Boolean(value.closest('dl')), termTag: value.previousElementSibling?.tagName,
      term: value.previousElementSibling?.textContent?.trim(),
    })));
  expect(entries.map((entry) => entry.key).sort()).toEqual([...metricKeys].sort());
  expect(entries.filter(({ raw, inDefinitionList, termTag, term }) => raw === null || raw.trim() === '' ||
    !inDefinitionList || termTag !== 'DT' || !term || !Number.isFinite(Number(raw))),
  'every workshop value has a semantic term and finite measured number').toEqual([]);
  return Object.fromEntries(entries.map(({ key, raw }) => [key, Number(raw)]));
}

// Independent long bisection and Cartesian geometry, rather than the shipped
// solver or its energy helper, provide the expected physical readings.
function modelAt(a: number, e: number, phase: number) {
  const mean = phase * tau;
  let low = 0, high = tau;
  for (let step = 0; step < 90; step++) {
    const middle = (low + high) / 2;
    if (middle - e * Math.sin(middle) < mean) low = middle;
    else high = middle;
  }
  const E = phase === 0 ? 0 : phase === 1 ? tau : (low + high) / 2;
  const b = Math.sqrt(1 - e * e), x = a * (Math.cos(E) - e), y = -a * b * Math.sin(E);
  const r = Math.hypot(x, y), potential = -1 / r, total = -1 / (2 * a), kinetic = total - potential;
  let angle = Math.atan2(-y, x) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  if (phase === 1) angle = 360;
  return { E, x, y, r, angle, potential, kinetic, total, sum: potential + kinetic,
    speed: circularSpeed * Math.sqrt(2 / r - 1 / a) };
}

function bandFraction(a: number, e: number) {
  if (e === 0) return a >= 0.75 && a <= 1.7 ? 1 : 0;
  const anomaly = (radius: number) => Math.acos(Math.max(-1, Math.min(1, (1 - radius / a) / e)));
  const lo = anomaly(0.75), hi = anomaly(1.7);
  return Math.max(0, (hi - e * Math.sin(hi) - lo + e * Math.sin(lo)) / Math.PI);
}

async function expectReadings(page: Page, a: number, e: number, phase: number) {
  const values = await measurements(page), expected = modelAt(a, e, phase);
  const expectedValues: Record<string, number> = {
    phase, angle: expected.angle, distance: expected.r, speed: expected.speed,
    potential: expected.potential, kinetic: expected.kinetic, total: expected.total, 'energy-sum': expected.sum,
    period: Math.sqrt(a ** 3), perihelion: a * (1 - e), aphelion: a * (1 + e),
    'peri-speed': circularSpeed * Math.sqrt((1 + e) / (a * (1 - e))),
    'aph-speed': circularSpeed * Math.sqrt((1 - e) / (a * (1 + e))),
    'escape-speed': circularSpeed * Math.sqrt(2 / (a * (1 - e))),
  };
  const failures = Object.entries(expectedValues).flatMap(([key, expectedValue]) => {
    const actual = values[key], difference = Math.abs(actual - expectedValue);
    return difference < 5e-8 ? [] : [{ key, actual, expected: expectedValue, difference }];
  });
  expect(failures, 'all readings agree with independent bound-orbit and vis-viva calculations').toEqual([]);
  expect(values['energy-sum']).toBeCloseTo(values.total, 8);
  expect(values.total).toBeLessThan(0);
  expect(values.speed).toBeGreaterThan(0);
  expect(values['escape-speed']).toBeGreaterThan(values['peri-speed']);
  return values;
}

async function expectFrames(page: Page, a: number, e: number, phase: number) {
  const lesson = page.locator('#orrery-workshop-inspection'), canvases = lesson.getByRole('img');
  const model = await state(page);
  await expect(canvases).toHaveCount(2);
  for (const canvas of await canvases.all()) {
    await showCanvas(canvas);
    await expect.poll(() => canvas.evaluate((element: any, options) => {
      const actual = element._wsOrbit || element._wsEnergy;
      const expected = { aAU: options.a, e: options.e, phase: options.phase };
      const failures: Array<{ key: string; expected: number | boolean; actual: unknown }> = Object.entries(expected).flatMap(([key, value]) =>
        Math.abs(actual?.[key] - value) < 5e-9 ? [] : [{ key, expected: value, actual: actual?.[key] }]);
      if (element._wsOrbit) {
        if (Boolean(actual.reference) !== options.reference)
          failures.push({ key: 'reference visible', expected: options.reference, actual: Boolean(actual.reference) });
        if (Boolean(actual.band) !== options.band)
          failures.push({ key: 'band visible', expected: options.band, actual: Boolean(actual.band) });
      }
      return failures;
    }, { a, e, phase, reference: model.orr_wscompare === true, band: model.orr_wshz !== false })).toEqual([]);
  }
  const frames = await canvases.evaluateAll((elements) => elements.map((element: any) => {
    const box = element.getBoundingClientRect(), style = getComputedStyle(element);
    const insetX = Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.borderRightWidth) +
      Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
    const insetY = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth) +
      Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
    return { name: element.getAttribute('aria-label'), width: element._logicalWidth, height: element._logicalHeight,
      cssWidth: box.width - insetX, cssHeight: box.height - insetY,
      orbit: element._wsOrbit, energy: element._wsEnergy, samples: element._testWsTextSamples || [] };
  }));
  for (const frame of frames) {
    expect(frame.width).toBeCloseTo(frame.cssWidth, 0);
    expect(frame.height).toBeCloseTo(frame.cssHeight, 0);
    expect(frame.height).toBeGreaterThanOrEqual(359);
    expect(frame.height).toBeLessThanOrEqual(441);
    expect(frame.samples.length).toBeGreaterThan(0);
    const invalidFonts = frame.samples.map((sample: any, index: number) => ({
      index, ...sample, size: Number(sample.font.match(/(\d+(?:\.\d+)?)px/)?.[1]),
    })).filter((sample: any) => !(sample.size >= 13));
    expect(invalidFonts, `${frame.name}: all actual canvas text remains at least 13px`).toEqual([]);
  }
  const orbit = frames.find((frame) => frame.orbit)!.orbit;
  const graph = frames.find((frame) => frame.energy)!.energy;
  expect(frames.find((frame) => frame.orbit)!.name).toMatch(/^Orbit Workshop preview/);
  expect(frames.find((frame) => frame.energy)!.name).toMatch(/^Orbit Workshop energy diagram/);
  const expected = modelAt(a, e, phase), ellipse = orbit.ellipse;
  expect(ellipse.a / orbit.scale).toBeCloseTo(a, 8);
  expect(ellipse.b / ellipse.a).toBeCloseTo(Math.sqrt(1 - e ** 2), 8);
  expect(ellipse.cx + ellipse.a * e).toBeCloseTo(orbit.focus.x, 8);
  expect(ellipse.cy).toBeCloseTo(orbit.focus.y, 8);
  expect(orbit.point.x).toBeCloseTo(orbit.focus.x + expected.x * orbit.scale, 7);
  expect(orbit.point.y).toBeCloseTo(orbit.focus.y + expected.y * orbit.scale, 7);
  expect(Math.hypot(orbit.point.x - orbit.focus.x, orbit.point.y - orbit.focus.y) / orbit.scale).toBeCloseTo(expected.r, 8);
  expect(orbit.peri.x).toBeCloseTo(ellipse.cx + ellipse.a, 8);
  expect(orbit.aph.x).toBeCloseTo(ellipse.cx - ellipse.a, 8);
  const visibleEllipses = [{ name: 'current', ...ellipse }, ...(orbit.reference ? [{ name: 'reference', ...orbit.reference }] : [])];
  const invalidEllipses = visibleEllipses.filter((shape: any) => ![shape.cx, shape.cy, shape.a, shape.b].every(Number.isFinite) ||
    shape.a <= 0 || shape.b <= 0 || shape.cx - shape.a < 0 || shape.cx + shape.a > orbit.width ||
    shape.cy - shape.b < 0 || shape.cy + shape.b > orbit.height);
  expect(invalidEllipses, 'all visible current and reference geometry shares an unclipped frame').toEqual([]);
  if (orbit.reference) {
    const reference = orbit.reference;
    expect(reference.a / orbit.scale).toBeCloseTo(reference.aAU, 8);
    expect(reference.b / reference.a).toBeCloseTo(Math.sqrt(1 - reference.e ** 2), 8);
    expect(reference.cx + reference.a * reference.e).toBeCloseTo(orbit.focus.x, 8);
    expect(reference.peri.x - orbit.focus.x).toBeCloseTo(reference.aAU * (1 - reference.e) * orbit.scale, 8);
    expect(orbit.focus.x - reference.aph.x).toBeCloseTo(reference.aAU * (1 + reference.e) * orbit.scale, 8);
  }
  if (orbit.band) {
    expect(orbit.band.innerAU).toBe(0.75);
    expect(orbit.band.outerAU).toBe(1.7);
    expect(orbit.band.inner / orbit.scale).toBeCloseTo(0.75, 8);
    expect(orbit.band.outer / orbit.scale).toBeCloseTo(1.7, 8);
    expect(orbit.focus.x - orbit.band.outer).toBeGreaterThanOrEqual(0);
    expect(orbit.focus.x + orbit.band.outer).toBeLessThanOrEqual(orbit.width);
    expect(orbit.focus.y - orbit.band.outer).toBeGreaterThanOrEqual(0);
    expect(orbit.focus.y + orbit.band.outer).toBeLessThanOrEqual(orbit.height);
  }
  const invalidTags = orbit.tags.filter((tag: any) => ![tag.x, tag.y, tag.width, tag.height].every(Number.isFinite) ||
    tag.width <= 0 || tag.height <= 0 || tag.x < 0 || tag.y < 0 || tag.x + tag.width > orbit.width || tag.y + tag.height > orbit.height);
  expect(invalidTags, 'all orbit annotation boxes are inside the canvas').toEqual([]);
  expect(graph.samples).toHaveLength(257);
  expect(graph.yMin).toBeLessThan(graph.yMax);
  const graphFailures = graph.samples.flatMap((sample: any, index: number) => {
    const angle = index * 360 / 256, r = a * (1 - e ** 2) / (1 + e * Math.cos(angle * Math.PI / 180));
    const potential = -1 / r, total = -1 / (2 * a), kinetic = total - potential;
    const numeric = { angle, r, potential, kinetic, total, sum: potential + kinetic };
    const failed = Object.entries(numeric).filter(([key, value]) => !(Math.abs(sample[key] - value) < 5e-8)).map(([key]) => key);
    if (!(Math.abs(sample.x - (graph.plot.left + angle / 360 * (graph.plot.right - graph.plot.left))) < 5e-8)) failed.push('true-anomaly x');
    if (!(sample.x >= graph.plot.left - 0.01 && sample.x <= graph.plot.right + 0.01)) failed.push('x bounds');
    for (const key of ['potential', 'kinetic', 'total']) {
      const y = sample[`${key}Y`];
      if (!Number.isFinite(y) || y < graph.plot.top - 0.01 || y > graph.plot.bottom + 0.01) failed.push(`${key} y bounds`);
      if (!(sample[key] >= graph.yMin && sample[key] <= graph.yMax)) failed.push(`${key} value bounds`);
    }
    return failed.length ? [{ index, ...sample, failed }] : [];
  });
  expect(graphFailures, 'every energy sample obeys independent physics, true-anomaly coordinates, and adaptive plot bounds').toEqual([]);
  expect(graph.current.angle).toBeCloseTo(expected.angle, 8);
  expect(graph.current.r).toBeCloseTo(expected.r, 8);
  expect(graph.current.sum).toBeCloseTo(expected.total, 8);
  expect(graph.current.x).toBeCloseTo(graph.plot.left + expected.angle / 360 * (graph.plot.right - graph.plot.left), 7);
  for (const key of ['potential', 'kinetic', 'total']) {
    expect(graph.current[key]).toBeCloseTo(expected[key as keyof typeof expected], 8);
    expect(graph.current[`${key}Y`]).toBeGreaterThanOrEqual(graph.plot.top - 0.01);
    expect(graph.current[`${key}Y`]).toBeLessThanOrEqual(graph.plot.bottom + 0.01);
  }
  return { orbit, graph };
}

async function expectReadableLayout(lesson: Locator, width: number) {
  const layout = await lesson.evaluate((region) => {
    const box = region.getBoundingClientRect();
    const controls = [...region.querySelectorAll<HTMLElement>('button, input[type="range"]')].map((control) => {
      const bounds = control.getBoundingClientRect();
      return { name: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
        width: bounds.width, height: bounds.height, left: bounds.left, right: bounds.right,
        font: Number.parseFloat(getComputedStyle(control).fontSize) };
    }).filter((control) => control.width > 0 && control.height > 0);
    return { left: box.left, right: box.right, clientWidth: region.clientWidth, scrollWidth: region.scrollWidth,
      pageWidth: document.documentElement.scrollWidth, controls };
  });
  expect(layout.left).toBeGreaterThanOrEqual(-1);
  expect(layout.right).toBeLessThanOrEqual(width + 1);
  expect(layout.pageWidth).toBeLessThanOrEqual(width + 1);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.controls.filter((control) => control.width < 43.5 || control.height < 43.5 || control.font < 12 ||
    control.left < -1 || control.right > width + 1), 'all native controls are readable, 44px, and contained').toEqual([]);
}

async function expectReadableText(lesson: Locator) {
  const failures = await lesson.evaluate((region) => {
    type Color = [number, number, number, number];
    const parse = (color: string): Color => {
      if (color === 'transparent') return [0, 0, 0, 0];
      const values = color.match(/[\d.]+/g)?.map(Number) || [];
      if (values.length < 3) throw new Error(`Unsupported computed color: ${color}`);
      return [values[0], values[1], values[2], values[3] ?? 1];
    };
    const over = (top: Color, bottom: Color): Color => {
      const alpha = top[3] + bottom[3] * (1 - top[3]);
      return [0, 1, 2].map((index) => (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha)
        .concat(alpha) as Color;
    };
    const luminance = (color: Color) => color.slice(0, 3).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    return [...region.querySelectorAll<HTMLElement>('*')].filter((element) => {
      const style = getComputedStyle(element);
      return element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0 &&
        style.visibility !== 'hidden' && !element.closest('.sr-only, button:disabled, input:disabled') &&
        [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    }).map((element) => {
      const chain: HTMLElement[] = [];
      for (let current: HTMLElement | null = element; current; current = current.parentElement) chain.unshift(current);
      let background: Color = [255, 255, 255, 1], opacity = 1;
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
  expect(failures, 'all workshop explanations, controls and signed numeric readings remain readable').toEqual([]);
}

async function expectNoErrors(page: Page) { expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]); }

test('native phase anchors, body choices and reset preserve Workshop control semantics and unrelated saved work', async ({ page }) => {
  const lesson = await mountLesson(page), retained = await retainedState(page);
  const eccentricity = page.getByLabel('Eccentricity', { exact: true });
  const semiMajor = page.locator('#orrery-workshop-semi-major');
  const phase = page.getByLabel('Orbit time (% of period)', { exact: true });
  await expect(eccentricity).toHaveAttribute('id', 'orrery-workshop-eccentricity');
  await expect(eccentricity).toHaveAttribute('min', '0');
  await expect(eccentricity).toHaveAttribute('max', '0.99');
  await expect(eccentricity).toHaveAttribute('step', '0.00001');
  await expect(semiMajor).toHaveAttribute('min', '0.05');
  await expect(semiMajor).toHaveAttribute('max', '80');
  await expect(semiMajor).toHaveAttribute('step', '0.001');
  await expect(page.locator('label[for="orrery-workshop-semi-major"]')).toContainText('Semi-major');
  for (const control of [eccentricity, semiMajor]) await expect(control).toHaveAttribute('aria-describedby', 'orrery-workshop-controls-help');
  await expect(page.locator('#orrery-workshop-controls-help')).toHaveAttribute('role', 'note');
  await expect(page.locator('#orrery-workshop-controls-help')).toContainText('Values use AU, years, and km/s');
  await expect(page.locator('#orrery-workshop-energy-note')).toHaveAttribute('role', 'note');
  await expect(page.locator('#orrery-workshop-energy-note')).toContainText('normalized GM units');
  await expect(lesson.getByRole('img', { name: /^Orbit Workshop energy diagram/ })).toHaveAttribute('aria-describedby', 'orrery-workshop-energy-note');
  await expect(lesson.getByRole('img', { name: /^Orbit Workshop energy diagram/ })).toHaveAttribute('aria-label', /current semi-major axis/);
  await expect(phase).toHaveAttribute('id', 'orrery-workshop-phase');
  await expect(lesson.getByRole('button', { name: 'Show reference orbit', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(lesson.getByRole('button', { name: 'Show distance band', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const targets = [['Perihelion (0%)', 0], ['Quarter period (25%)', 0.25],
    ['Aphelion (50%)', 0.5], ['Three-quarter period (75%)', 0.75]] as const;
  for (const [name, fraction] of targets) {
    await lesson.getByRole('button', { name, exact: true }).click();
    expect((await measurements(page)).phase).toBe(fraction);
    expect((await state(page)).orr_wsphase).toBe(fraction);
  }
  await setRange(page, 'orrery-workshop-eccentricity', 0.6);
  await setRange(page, 'orrery-workshop-semi-major', 2);
  const choices = lesson.getByRole('group', { name: 'Orbit Workshop body selection', exact: true });
  const mercury = choices.getByRole('button', { name: /\bMercury$/ });
  await mercury.click();
  await expect(mercury).toHaveAttribute('aria-pressed', 'true');
  expect((await state(page)).orr_wsb).toBe('mercury');
  expect((await state(page)).orr_wse).toBeUndefined();
  expect((await state(page)).orr_wsa).toBeUndefined();
  const defaultValues = await measurements(page);
  await setRange(page, 'orrery-workshop-eccentricity', 0.5);
  await setRange(page, 'orrery-workshop-semi-major', 3);
  await lesson.getByRole('button', { name: /Reset to real values/ }).click();
  expect((await state(page)).orr_wse).toBeUndefined();
  expect((await state(page)).orr_wsa).toBeUndefined();
  expect(await measurements(page)).toEqual(defaultValues);
  for (const [name, a, e] of [
    ['Circular Earth', 1, 0], ['Eccentric Earth', 1, 0.3], ['Hot Jupiter', 0.05, 0.05],
    ['Halley-like', 17.8, 0.96], ['Habitable Mars', 1.2, 0],
  ] as const) {
    await lesson.getByRole('button', { name, exact: true }).click();
    expect((await state(page)).orr_wsa).toBe(a);
    expect((await state(page)).orr_wse).toBe(e);
    expect((await state(page)).orr_wsb).toBe('mercury');
    await expectReadings(page, a, e, 0.75);
  }
  await lesson.getByRole('button', { name: /Reset to real values/ }).click();
  expect(await measurements(page)).toEqual(defaultValues);
  expect(await retainedState(page)).toEqual(retained);
  await expectNoErrors(page);
});

test('bound-orbit readings remain finite and physically correct across circle, high-e and low-perihelion limits', async ({ page }) => {
  await mountLesson(page, 736, false);
  const retained = await retainedState(page);
  for (const [a, e] of [[1, 0], [1, 0.6], [0.05, 0.99], [80, 0.99]]) {
    await setRange(page, 'orrery-workshop-semi-major', a);
    await setRange(page, 'orrery-workshop-eccentricity', e);
    for (const phase of [0, 25, 50, 75, 100]) {
      await setRange(page, 'orrery-workshop-phase', phase);
      await expectReadings(page, a, e, phase / 100);
    }
  }
  expect(await retainedState(page)).toEqual(retained);
  await expectNoErrors(page);
});

test('energy curves use true anomaly with perihelion at both ends, aphelion in the middle, and a linked current marker', async ({ page }) => {
  await mountLesson(page, 1060, true, { orr_wsa: 1, orr_wse: 0.6, orr_wsphase: 0.25 });
  for (const [a, e, phase] of [[1, 0.6, 0.25], [0.05, 0.99, 0], [80, 0.99, 0.75], [1, 0, 1]]) {
    await setRange(page, 'orrery-workshop-semi-major', a);
    await setRange(page, 'orrery-workshop-eccentricity', e);
    await setRange(page, 'orrery-workshop-phase', phase * 100);
    const { graph } = await expectFrames(page, a, e, phase);
    expect(graph.samples[0].angle).toBe(0);
    expect(graph.samples[128].angle).toBe(180);
    expect(graph.samples[256].angle).toBe(360);
    expect(graph.samples[0].r).toBeCloseTo(a * (1 - e), 8);
    expect(graph.samples[128].r).toBeCloseTo(a * (1 + e), 8);
    expect(graph.samples[256].r).toBeCloseTo(graph.samples[0].r, 8);
    if (e > 0) expect(graph.samples[0].kinetic).toBeGreaterThan(graph.samples[128].kinetic);
    else expect(graph.samples[0].kinetic).toBeCloseTo(graph.samples[128].kinetic, 8);
  }
  await expectNoErrors(page);
});

test('the illustrative distance band uses honest radii and an independently calculated fraction of orbital time', async ({ page }) => {
  const lesson = await mountLesson(page);
  for (const [a, e, classification] of [
    [1, 0, 'within'], [0.75, 0, 'within'], [1.7, 0, 'within'],
    [0.5, 0, 'outside'], [2, 0, 'outside'], [0.5, 0.5, 'intersects'], [1, 0.9, 'intersects'],
  ] as const) {
    await setRange(page, 'orrery-workshop-semi-major', a);
    await setRange(page, 'orrery-workshop-eccentricity', e);
    await setRange(page, 'orrery-workshop-phase', 25);
    const note = page.locator('#orrery-workshop-band-note');
    await expect(note).toHaveAttribute('data-ws-band-state', classification);
    const fraction = lesson.locator('[data-ws-band-fraction][data-value]');
    await expect(fraction).toBeVisible();
    expect(Number(await fraction.getAttribute('data-value'))).toBeCloseTo(bandFraction(a, e), 8);
    const { orbit } = await expectFrames(page, a, e, 0.25);
    expect(orbit.band).not.toBeNull();
  }
  const before = await measurements(page), beforeState = await state(page);
  const toggle = lesson.getByRole('button', { name: 'Show distance band', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const { orbit } = await expectFrames(page, 1, 0.9, 0.25);
  expect(orbit.band).toBeNull();
  expect(await measurements(page)).toEqual(before);
  const { orr_wshz: oldBand, ...oldState } = beforeState;
  const { orr_wshz: newBand, ...newState } = await state(page);
  expect(newState).toEqual(oldState);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expectNoErrors(page);
});

test('custom settings and reference toggles repaint the same mounted charts and survive leaving the Workshop', async ({ page }) => {
  // These routes have already been explored, so this persistence check can
  // retain all progress fields without mistaking a new visit for lost work.
  const lesson = await mountLesson(page, 1060, true, {
    orreryKeplerSeen: ['keplerI'], orreryTabsSeen: ['1', '4'],
  });
  const retained = await retainedState(page, true);
  await lesson.evaluate((region) => { (window as any).__wsMountedCanvases = [...region.querySelectorAll('canvas')]; });
  const sameCanvases = async () => expect(await lesson.evaluate((region) => {
    const current = [...region.querySelectorAll('canvas')], original = (window as any).__wsMountedCanvases;
    return current.length === original.length && current.every((canvas, index) => canvas === original[index]);
  })).toBe(true);
  const reference = lesson.getByRole('button', { name: 'Show reference orbit', exact: true });
  await setRange(page, 'orrery-workshop-eccentricity', 0.6);
  await setRange(page, 'orrery-workshop-semi-major', 2);
  await setRange(page, 'orrery-workshop-phase', 25);
  await expectFrames(page, 2, 0.6, 0.25);
  await sameCanvases();
  await reference.click();
  await expect(reference).toHaveAttribute('aria-pressed', 'true');
  let frame = await expectFrames(page, 2, 0.6, 0.25);
  expect(frame.orbit.reference).not.toBeNull();
  const baseline = { a: frame.orbit.reference.aAU, e: frame.orbit.reference.e };
  await sameCanvases();
  for (const [a, e] of [[0.05, 0.99], [80, 0.99], [1, 0]]) {
    await setRange(page, 'orrery-workshop-semi-major', a);
    await setRange(page, 'orrery-workshop-eccentricity', e);
    frame = await expectFrames(page, a, e, 0.25);
    expect({ a: frame.orbit.reference.aAU, e: frame.orbit.reference.e }).toEqual(baseline);
    await sameCanvases();
  }
  const saved = await state(page), savedReadings = await measurements(page);
  await page.getByRole('tab', { name: 'Kepler I: ellipses and the Sun at one focus', exact: true }).click();
  await expect(lesson).toHaveCount(0);
  await page.getByRole('tab', { name: /Orbit Workshop/ }).click();
  await expect(lesson).toBeVisible();
  expect(await measurements(page)).toEqual(savedReadings);
  const restored = await state(page);
  for (const key of ['orr_wsb', 'orr_wse', 'orr_wsa', 'orr_wsphase', 'orr_wscompare', 'orr_wshz'])
    expect(restored[key], `${key} persists across tabs`).toEqual(saved[key]);
  await expectFrames(page, 1, 0, 0.25);
  expect(await retainedState(page, true)).toEqual(retained);
  await expectNoErrors(page);
});

for (const dark of [false, true]) {
  test(`320px ${dark ? 'dark' : 'light'} Workshop keeps native controls, diagrams and signed readings readable`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const lesson = await mountLesson(page, 320, dark, { orr_wsa: 1, orr_wse: 0.6 });
    const phase = page.getByLabel('Orbit time (% of period)', { exact: true });
    await phase.focus();
    await phase.press('Home');
    await phase.press('ArrowRight');
    expect((await measurements(page)).phase).toBeCloseTo(0.001, 8);
    await expect(phase).toBeFocused();
    await expectReadableLayout(lesson, 320);
    await expectReadableText(lesson);
    await expectFrames(page, 1, 0.6, 0.001);
    await lesson.getByRole('button', { name: 'Show reference orbit', exact: true }).click();
    for (const [a, e] of [[0.05, 0.99], [80, 0.99], [1, 0]]) {
      await setRange(page, 'orrery-workshop-semi-major', a);
      await setRange(page, 'orrery-workshop-eccentricity', e);
      await expectReadings(page, a, e, 0.001);
      await expectFrames(page, a, e, 0.001);
      await expectReadableLayout(lesson, 320);
      await expectReadableText(lesson);
    }
    await phase.focus();
    await phase.press('End');
    await expectReadings(page, 1, 0, 1);
    await expect(phase).toBeFocused();
    await expectNoErrors(page);
    expect(pageErrors).toEqual([]);
  });
}
