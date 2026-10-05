import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem',
  width: 1060, height: 1600, appStyles: true, layout: 'document',
});
const metricKeys = ['phase', 'distance', 'speed', 'transverse-speed', 'angular-momentum',
  'interval-angle', 'interval-area', 'interval-time'];
const clockPages = new WeakSet<Page>();

test.describe.configure({ mode: 'default', timeout: 120_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function installTestClock(page: Page) {
  await page.clock.install();
  clockPages.add(page);
}

async function showCanvas(page: Page, canvas: Locator) {
  // DOM visibility does not imply viewport intersection. Initialize a visible
  // canvas before waiting for geometry; offscreen RAF is intentionally paused.
  await canvas.evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' }));
  await expect.poll(() => canvas.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight &&
      box.right > 0 && box.left < innerWidth;
  })).toBe(true);
  // Give IntersectionObserver and the mocked RAF queue a frame to initialize.
  if (clockPages.has(page)) await page.clock.runFor(48);
}

async function mountLesson(page: Page, width = 1060, dark = true,
  patch: Record<string, unknown> = {}, reducedMotion = true) {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.getAttribute('aria-label')?.startsWith('Kepler II ')) {
        const canvas = this.canvas as HTMLCanvasElement & { _testK2TextSamples?: { text: string; font: string }[] };
        const samples = canvas._testK2TextSamples ||= [];
        samples.push({ text: String(text), font: this.font });
        if (samples.length > 1000) samples.splice(0, samples.length - 1000);
      }
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.solarSystem));
  await page.locator('#wrap').evaluate((wrap, nextWidth) => {
    (wrap as HTMLElement).style.width = `${nextWidth}px`;
  }, width);
  await page.evaluate((data) => {
    (window as any).__mount({ solarSystem: data });
    (window as any).__ctx.isDark = data.isDark;
    document.documentElement.classList.toggle('dark', data.isDark);
    (window as any).__rerender();
  }, {
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: true, orr_tab: 2,
    orr_time: 0.37, orr_paused: true, orr_sel: 'mars', orr_compare: 'earth', orr_follow: 'mars',
    orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
    missionLog: [{ title: 'Retained observation', detail: 'Keep my saved evidence.' }],
    keplerInquiry: { a: 2, e: 0.2, mass: 1, testVariable: 'a', baseline: { a: 1, e: 0.2, mass: 1 },
      hypothesis: 'Keep my earlier prediction.', explanation: 'Keep my earlier explanation.',
      log: [{ t: 'Earlier', a: '1.00', e: '0.200', m: '1.00', p: '1.00', state: 'Elliptical' }] },
    orr_k2e: 0.6, orr_k2s: 6, orr_k2phase: 0, orr_k2playing: false,
    isDark: dark, ...patch,
  });
  const lesson = page.locator('#orrery-k2-inspection');
  await expect(lesson).toBeVisible();
  const orbit = page.getByRole('img', { name: /^Kepler II equal-area visualization/ });
  await expect(orbit).toHaveAttribute('aria-describedby', 'orrery-k2-evidence');
  await showCanvas(page, orbit);
  await expect.poll(() => orbit.evaluate((canvas: any) => canvas._k2Orbit?.sectors?.length || 0))
    .toBe(Number(patch.orr_k2s ?? 6));
  return lesson;
}

async function state(page: Page) {
  return page.evaluate(() => (window as any).__toolData.solarSystem);
}

async function retainedState(page: Page) {
  return page.evaluate(() => {
    const { orr_k2e, orr_k2s, orr_k2phase, orr_k2playing, ...otherState } = (window as any).__toolData.solarSystem;
    return JSON.parse(JSON.stringify(otherState));
  });
}

async function measurements(page: Page) {
  const entries = await page.locator('#orrery-k2-inspection').evaluate((lesson) =>
    [...lesson.querySelectorAll<HTMLElement>('dd[data-k2-metric]')].map((value) => ({
      key: value.dataset.k2Metric!, raw: value.getAttribute('data-value'),
      inDefinitionList: Boolean(value.closest('dl')), termTag: value.previousElementSibling?.tagName,
      term: value.previousElementSibling?.textContent?.trim(),
    })));
  expect(entries.map((entry) => entry.key).sort()).toEqual([...metricKeys].sort());
  return Object.fromEntries(entries.map(({ key, raw, inDefinitionList, termTag, term }) => {
    expect(inDefinitionList, `${key} belongs to a definition list`).toBe(true);
    expect(termTag, `${key} has a semantic term`).toBe('DT');
    expect(term, `${key} has a visible name`).toBeTruthy();
    expect(raw, `${key} exposes a measured number`).not.toBeNull();
    const number = Number(raw);
    expect(Number.isFinite(number), `${key} is finite`).toBe(true);
    expect(number, `${key} is nonnegative`).toBeGreaterThanOrEqual(0);
    return [key, number];
  }));
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

async function expectPhase(page: Page, phase: number, interval: number) {
  await expect.poll(async () => (await state(page)).orr_k2phase).toBeCloseTo(phase, 8);
  await expect(page.getByLabel('Inspect equal-time interval', { exact: true })).toHaveValue(String(interval));
  const values = await measurements(page);
  expect(values.phase).toBeCloseTo(phase, 8);
  return values;
}

async function expectTable(page: Page, count: number) {
  const table = page.locator('#orrery-k2-interval-table');
  await expect(table.locator('caption')).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveText([
    'Interval', 'Time window (%T)', 'Area (% orbit)', 'Angle swept (°)', 'Midpoint r/a', 'Midpoint v/v₀',
  ]);
  for (const heading of await table.getByRole('columnheader').all()) await expect(heading).toHaveAttribute('scope', 'col');
  const rows = table.locator('tr[data-k2-interval]');
  await expect(rows).toHaveCount(count);
  expect(await rows.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-k2-interval'))))
    .toEqual(Array.from({ length: count }, (_, index) => String(index)));
  for (let index = 0; index < count; index++) {
    const row = rows.nth(index);
    await expect(row.getByRole('rowheader')).toHaveAttribute('scope', 'row');
    await expect(row.getByRole('cell')).toHaveCount(5);
    await expect(row.getByRole('button', { name: `Inspect interval ${index + 1}`, exact: true })).toBeVisible();
  }
  const scroll = page.getByRole('region', { name: 'Equal-time interval measurements', exact: true });
  await expect(scroll).toHaveAttribute('id', 'orrery-k2-table-scroll');
  await expect(scroll).toHaveAttribute('tabindex', '0');
  return { table, rows, scroll };
}

async function expectCanvasFrames(page: Page) {
  const canvases = page.locator('#orrery-k2-inspection canvas[role="img"]');
  await expect(canvases).toHaveCount(3);
  const model = await state(page);
  const expectedPhase = model.orr_k2phase;
  const expectedShape = Math.sqrt(1 - model.orr_k2e ** 2);
  const expectedPeak = Math.sqrt((1 + model.orr_k2e) / (1 - model.orr_k2e));
  for (const canvas of await canvases.all()) {
    await showCanvas(page, canvas);
    await expect.poll(() => canvas.evaluate((element: any) =>
      Boolean(element._k2Orbit || element._k2Graph))).toBe(true);
    await expect.poll(() => canvas.evaluate((element: any) =>
      element._k2Orbit?.phase ?? element._k2Graph?.marker.phase)).toBeCloseTo(expectedPhase, 8);
    if ((await canvas.getAttribute('aria-label'))?.startsWith('Kepler II equal-area visualization')) {
      await expect.poll(() => canvas.evaluate((element: any) => element._k2Orbit.b / element._k2Orbit.a))
        .toBeCloseTo(expectedShape, 8);
      await expect.poll(() => canvas.evaluate((element: any) => element._k2Orbit.sectors.length)).toBe(model.orr_k2s);
    } else {
      await expect.poll(() => canvas.evaluate((element: any) => {
        const curve = element._k2Graph.curves.find((entry: any) => entry.key === 'speed' || entry.key === 'transverse-speed');
        return curve.points[0].value;
      })).toBeCloseTo(expectedPeak, 8);
    }
  }
  const frames = await canvases.evaluateAll((elements) =>
    elements.map((element: any) => {
      const box = element.getBoundingClientRect();
      return { name: element.getAttribute('aria-label'), cssWidth: box.width, cssHeight: box.height,
        width: element._logicalWidth, height: element._logicalHeight,
        orbit: element._k2Orbit, graph: element._k2Graph, samples: element._testK2TextSamples || [] };
    }));
  expect(frames).toHaveLength(3);
  for (const frame of frames) {
    expect(frame.width, frame.name).toBeCloseTo(frame.cssWidth, 0);
    expect(frame.height, frame.name).toBeCloseTo(frame.cssHeight, 0);
    expect(frame.samples.length, `${frame.name} uses the actual canvas renderer`).toBeGreaterThan(0);
    const unreadableFonts = frame.samples.map((sample: any, index: number) => ({
      index, text: sample.text, font: sample.font,
      size: Number(sample.font.match(/(\d+(?:\.\d+)?)px/)?.[1]),
    })).filter((sample: any) => !(sample.size >= 13));
    expect(unreadableFonts, `${frame.name}: every rendered text sample uses at least 13px`).toEqual([]);
  }
  const primary = frames.find((frame) => frame.orbit)!;
  expect(primary.height).toBeGreaterThanOrEqual(359);
  expect(primary.height).toBeLessThanOrEqual(441);
  expect(primary.orbit.width).toBe(primary.width);
  expect(primary.orbit.height).toBe(primary.height);
  const graphFrames = frames.filter((frame) => frame.graph);
  expect(graphFrames).toHaveLength(2);
  const speedName = graphFrames.find((frame) => frame.graph.kind === 'speed')?.name;
  const momentumName = graphFrames.find((frame) => frame.graph.kind === 'momentum')?.name;
  expect(speedName).toMatch(/^Kepler II speed through one orbit\b/);
  expect(speedName).toMatch(/perihelion.*0.*100.*aphelion.*50/i);
  expect(speedName).toMatch(/normalized.*circular speed/i);
  expect(momentumName).toMatch(/^Kepler II angular momentum through one orbit\b/);
  expect(momentumName).toMatch(/distance.*transverse speed.*product.*specific angular momentum.*constant/i);
  for (const frame of frames.filter((entry) => entry.graph)) {
    const graph = frame.graph;
    expect(graph.width).toBe(frame.width);
    expect(graph.height).toBe(frame.height);
    for (const curve of graph.curves) {
      expect(curve.points.length).toBeGreaterThan(10);
      expect(curve.points[0].phase).toBe(0);
      expect(curve.points.at(-1).phase).toBe(1);
      expect(curve.points[0].x).toBeCloseTo(graph.left, 6);
      expect(curve.points.at(-1).x).toBeCloseTo(graph.right, 6);
      const invalidPoints = curve.points.flatMap((point: any, index: number) => {
        const failed = [
          ['finite value', Number.isFinite(point.value)],
          ['value >= 0', point.value >= 0],
          ['value <= graph maximum', point.value <= graph.max + 1e-8],
          ['x >= left', point.x >= graph.left - 0.01],
          ['x <= right', point.x <= graph.right + 0.01],
          ['y >= top', point.y >= graph.top - 0.01],
          ['y <= bottom', point.y <= graph.bottom + 0.01],
        ].filter(([, valid]) => !valid).map(([condition]) => condition);
        return failed.length ? [{ index, phase: point.phase, value: point.value,
          x: point.x, y: point.y, failed }] : [];
      });
      expect(invalidPoints, `${graph.kind}/${curve.key}: every sampled point is finite and inside its frame`).toEqual([]);
    }
  }
  return frames;
}

async function expectPhoneLayout(lesson: Locator, width: number) {
  const layout = await lesson.evaluate((region) => {
    const box = region.getBoundingClientRect();
    const scroll = region.querySelector<HTMLElement>('#orrery-k2-table-scroll')!;
    const controls = [...region.querySelectorAll<HTMLElement>('button, select, input[type="range"]')].map((control) => {
      const bounds = control.getBoundingClientRect();
      return { name: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
        width: bounds.width, height: bounds.height, left: bounds.left, right: bounds.right,
        font: Number.parseFloat(getComputedStyle(control).fontSize), inTable: Boolean(control.closest('#orrery-k2-table-scroll')) };
    }).filter((control) => control.width > 0 && control.height > 0);
    const scrollBox = scroll.getBoundingClientRect();
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
  expect(layout.localOverflow).toBeGreaterThan(0);
  expect(layout.controls.length).toBeGreaterThanOrEqual(10);
  for (const control of layout.controls) {
    expect(control.width, String(control.name)).toBeGreaterThanOrEqual(43.5);
    expect(control.height, String(control.name)).toBeGreaterThanOrEqual(43.5);
    expect(control.font, String(control.name)).toBeGreaterThanOrEqual(12);
    if (!control.inTable) {
      expect(control.left, String(control.name)).toBeGreaterThanOrEqual(-1);
      expect(control.right, String(control.name)).toBeLessThanOrEqual(width + 1);
    }
  }
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
        !element.closest('.sr-only, button:disabled, input:disabled, select:disabled') &&
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
  expect(failures, 'Kepler II explanations, native controls, measurements and interval cells remain readable').toEqual([]);
}

async function expectNoErrors(page: Page) {
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}

test('native phase and interval controls expose equal time and area despite different angles and speeds', async ({ page }) => {
  const lesson = await mountLesson(page);
  await expect(page.getByLabel('Eccentricity', { exact: true })).toHaveAttribute('id', 'orrery-k2-eccentricity');
  await expect(page.getByLabel('Sectors', { exact: true })).toHaveAttribute('id', 'orrery-k2-sectors');
  const phase = page.getByLabel('Orbit time (% of period)', { exact: true });
  await expect(phase).toHaveAttribute('id', 'orrery-k2-phase');
  await expect(phase).toHaveAttribute('min', '0');
  await expect(phase).toHaveAttribute('max', '100');
  const intervals = page.getByLabel('Inspect equal-time interval', { exact: true });
  await expect(intervals).toHaveAttribute('id', 'orrery-k2-interval');
  expect(await intervals.locator('option').evaluateAll((options) => options.map((option: any) => option.value)))
    .toEqual(['0', '1', '2', '3', '4', '5']);
  const perihelion = await expectPhase(page, 0, 0);
  expect(perihelion.distance).toBeCloseTo(0.4, 8);
  expect(perihelion.speed).toBeCloseTo(2, 8);
  expect(perihelion['angular-momentum']).toBeCloseTo(0.8, 8);
  await lesson.getByRole('button', { name: 'Aphelion (50%)', exact: true }).click();
  const aphelion = await expectPhase(page, 0.5, 3);
  expect(aphelion.distance).toBeCloseTo(1.6, 8);
  expect(aphelion.speed).toBeCloseTo(0.5, 8);
  expect(perihelion.speed / aphelion.speed).toBeCloseTo(4, 8);
  await intervals.selectOption('0');
  const near = await expectPhase(page, 0.5 / 6, 0);
  await intervals.selectOption('2');
  const far = await expectPhase(page, 2.5 / 6, 2);
  for (const values of [near, far]) {
    expect(values['interval-time']).toBeCloseTo(1 / 6, 8);
    expect(values['interval-area']).toBeCloseTo(Math.PI * 0.8 / 6, 8);
  }
  expect(near['interval-angle']).toBeGreaterThan(far['interval-angle']);
  expect(near.speed).toBeGreaterThan(far.speed);
  expect(near.distance).toBeLessThan(far.distance);
  await intervals.focus();
  await intervals.press('Home');
  await expectPhase(page, 0.5 / 6, 0);
  await intervals.press('End');
  await expectPhase(page, 5.5 / 6, 5);
  await expect(intervals).toBeFocused();
  await lesson.getByRole('button', { name: 'Next equal-time interval', exact: true }).click();
  await expectPhase(page, 0.5 / 6, 0);
  await lesson.getByRole('button', { name: 'Previous equal-time interval', exact: true }).click();
  await expectPhase(page, 5.5 / 6, 5);
  await phase.focus();
  await phase.press('End');
  const complete = await expectPhase(page, 1, 5);
  expect(complete.distance).toBeCloseTo(perihelion.distance, 8);
  expect(complete.speed).toBeCloseTo(perihelion.speed, 8);
  await expect(phase).toBeFocused();
  await lesson.getByRole('button', { name: 'Circle reference (e = 0)', exact: true }).click();
  const circular = await measurements(page);
  for (const key of ['distance', 'speed', 'transverse-speed', 'angular-momentum']) expect(circular[key]).toBeCloseTo(1, 8);
  expect(circular['interval-angle']).toBeCloseTo(60, 8);
  expect(circular['interval-area']).toBeCloseTo(Math.PI / 6, 8);
  const { rows } = await expectTable(page, 6);
  for (const row of await rows.all()) {
    const cells = await row.getByRole('cell').allTextContents();
    expect(Number(cells[2].match(/\d+(?:\.\d+)?/)?.[0])).toBeCloseTo(60, 1);
  }
  await setRange(page, 'orrery-k2-sectors', 3);
  await expectTable(page, 3);
  expect((await measurements(page))['interval-time']).toBeCloseTo(1 / 3, 8);
  expect((await measurements(page))['interval-angle']).toBeCloseTo(120, 8);
  await setRange(page, 'orrery-k2-sectors', 12);
  await expectTable(page, 12);
  expect((await measurements(page))['interval-time']).toBeCloseTo(1 / 12, 8);
  expect((await measurements(page))['interval-angle']).toBeCloseTo(30, 8);
  await setRange(page, 'orrery-k2-eccentricity', 0.2);
  await lesson.getByRole('button', { name: 'Perihelion (0%)', exact: true }).click();
  const gentle = await measurements(page);
  expect(gentle.distance).toBeCloseTo(0.8, 8);
  expect(gentle.speed).toBeCloseTo(Math.sqrt(1.2 / 0.8), 8);
  expect(gentle['interval-area']).toBeCloseTo(Math.PI * Math.sqrt(0.96) / 12, 8);
  await expectNoErrors(page);
});

test('high-eccentricity sectors and elapsed-time graphs preserve science and remain inside their frames', async ({ page }) => {
  const lesson = await mountLesson(page, 736, false, { orr_k2e: 0.95, orr_k2phase: 0.5 });
  const values = await measurements(page);
  expect(values.distance).toBeCloseTo(1.95, 8);
  expect(values.speed).toBeCloseTo(Math.sqrt(0.05 / 1.95), 8);
  expect(values['angular-momentum']).toBeCloseTo(Math.sqrt(1 - 0.95 ** 2), 8);
  const frames = await expectCanvasFrames(page);
  const orbit = frames.find((frame) => frame.orbit)!.orbit;
  expect(orbit.phase).toBe(0.5);
  expect(orbit.point.angle).toBeCloseTo(180, 8);
  expect(Math.hypot(orbit.point.x - orbit.focus.x, orbit.point.y - orbit.focus.y) / orbit.a)
    .toBeCloseTo(values.distance, 8);
  expect(orbit.b / orbit.a).toBeCloseTo(Math.sqrt(1 - 0.95 ** 2), 8);
  expect(orbit.sectors).toHaveLength(6);
  let totalAngle = 0;
  for (const sector of orbit.sectors) {
    expect(sector.phaseEnd - sector.phaseStart).toBeCloseTo(1 / 6, 8);
    expect(sector.area).toBeCloseTo(Math.PI * Math.sqrt(1 - 0.95 ** 2) / 6, 8);
    expect(sector.points).toHaveLength(98);
    expect(sector.points[0]).toMatchObject(orbit.focus);
    let twiceArea = 0;
    const invalidPoints: Array<{ index: number; x: number; y: number; failed: string[] }> = [];
    for (let index = 0; index < sector.points.length; index++) {
      const point = sector.points[index], next = sector.points[(index + 1) % sector.points.length];
      const failed = [
        ['x >= 0', point.x >= 0], ['x <= width', point.x <= orbit.width],
        ['y >= 0', point.y >= 0], ['y <= height', point.y <= orbit.height],
      ].filter(([, valid]) => !valid).map(([condition]) => condition as string);
      if (failed.length) invalidPoints.push({ index, x: point.x, y: point.y, failed });
      twiceArea += point.x * next.y - next.x * point.y;
    }
    expect(invalidPoints, `interval ${sector.index + 1}: every polygon point stays inside the orbit frame`).toEqual([]);
    const polygonArea = Math.abs(twiceArea) / (2 * orbit.a ** 2);
    expect(Math.abs(polygonArea / sector.area - 1), `interval ${sector.index + 1} polygon approximation`).toBeLessThan(0.003);
    totalAngle += sector.angle;
  }
  expect(totalAngle).toBeCloseTo(360, 8);
  const peak = Math.sqrt((1 + 0.95) / (1 - 0.95));
  for (const frame of frames.filter((entry) => entry.graph)) {
    const graph = frame.graph;
    expect(graph.marker.phase).toBe(0.5);
    expect(graph.max).toBeGreaterThanOrEqual(peak);
    const curves = Object.fromEntries(graph.curves.map((curve: any) => [curve.key, curve.points]));
    if (graph.kind === 'speed') {
      expect(Object.keys(curves)).toEqual(['speed']);
      const speed = curves.speed as any[];
      expect(speed[0].value).toBeCloseTo(peak, 8);
      expect(speed.at(-1).value).toBeCloseTo(peak, 8);
      expect(speed.find((point) => point.phase === 0.5).value).toBeCloseTo(1 / peak, 8);
    } else {
      expect(Object.keys(curves).sort()).toEqual(['angular-momentum', 'distance', 'transverse-speed']);
      const momentum = curves['angular-momentum'] as any[];
      const expectedMomentum = Math.sqrt(1 - 0.95 ** 2);
      const varyingMomentum = momentum.map((point, index) => ({ index, phase: point.phase,
        value: point.value, difference: Math.abs(point.value - expectedMomentum) }))
        .filter((point) => !(point.difference < 5e-9));
      expect(varyingMomentum, 'every angular-momentum sample remains constant to eight decimal places').toEqual([]);
    }
  }
  await lesson.getByRole('button', { name: 'Perihelion (0%)', exact: true }).click();
  expect((await measurements(page)).speed).toBeCloseTo(peak, 8);
  await expectNoErrors(page);
});

test('phase, shape and interval changes repaint the same mounted orbit and graph canvases', async ({ page }) => {
  await mountLesson(page);
  await expectCanvasFrames(page);
  await page.locator('#orrery-k2-inspection').evaluate((lesson) => {
    (window as any).__k2MountedCanvases = [...lesson.querySelectorAll('canvas[role="img"]')];
  });
  const expectSameCanvases = async () => {
    expect(await page.locator('#orrery-k2-inspection').evaluate((lesson) => {
      const current = [...lesson.querySelectorAll('canvas[role="img"]')];
      const original = (window as any).__k2MountedCanvases as HTMLCanvasElement[];
      return current.length === original.length && current.every((canvas, index) => canvas === original[index]);
    }), 'model inspection retains the mounted canvases').toBe(true);
  };
  const orbitCanvas = page.getByRole('img', { name: /^Kepler II equal-area visualization/ });
  await setRange(page, 'orrery-k2-phase', 25);
  await expectPhase(page, 0.25, 1);
  await showCanvas(page, orbitCanvas);
  await expect.poll(() => orbitCanvas.evaluate((canvas: any) => canvas._k2Orbit.phase)).toBe(0.25);
  let frames = await expectCanvasFrames(page);
  for (const frame of frames.filter((entry) => entry.graph)) expect(frame.graph.marker.phase).toBe(0.25);
  await expectSameCanvases();
  await setRange(page, 'orrery-k2-eccentricity', 0);
  await showCanvas(page, orbitCanvas);
  await expect.poll(() => orbitCanvas.evaluate((canvas: any) => canvas._k2Orbit.b / canvas._k2Orbit.a)).toBeCloseTo(1, 8);
  frames = await expectCanvasFrames(page);
  const circular = frames.find((frame) => frame.orbit)!.orbit;
  expect(circular.b).toBeCloseTo(circular.a, 8);
  expect(circular.point.r).toBeCloseTo(1, 8);
  expect(circular.point.speed).toBeCloseTo(1, 8);
  expect(circular.focus.x).toBeCloseTo(circular.cx, 8);
  expect(circular.focus.y).toBeCloseTo(circular.cy, 8);
  for (const frame of frames.filter((entry) => entry.graph)) {
    for (const curve of frame.graph.curves) {
      const nonCircularValues = curve.points.map((point: any, index: number) => ({
        index, phase: point.phase, value: point.value, difference: Math.abs(point.value - 1),
      })).filter((point: any) => !(point.difference < 5e-9));
      expect(nonCircularValues, `${curve.key}: every circular-reference sample equals one to eight decimal places`).toEqual([]);
    }
  }
  await expectSameCanvases();
  await setRange(page, 'orrery-k2-sectors', 12);
  await showCanvas(page, orbitCanvas);
  await expect.poll(() => orbitCanvas.evaluate((canvas: any) => canvas._k2Orbit.sectors.length)).toBe(12);
  const divided = await orbitCanvas.evaluate((canvas: any) => canvas._k2Orbit);
  expect(divided.selectedInterval).toBe(3);
  for (const sector of divided.sectors) {
    expect(sector.phaseEnd - sector.phaseStart).toBeCloseTo(1 / 12, 8);
    expect(sector.area).toBeCloseTo(Math.PI / 12, 8);
  }
  await expectTable(page, 12);
  await expectSameCanvases();
  await setRange(page, 'orrery-k2-eccentricity', 0.95);
  await showCanvas(page, orbitCanvas);
  await expect.poll(() => orbitCanvas.evaluate((canvas: any) => canvas._k2Orbit.b / canvas._k2Orbit.a))
    .toBeCloseTo(Math.sqrt(1 - 0.95 ** 2), 8);
  frames = await expectCanvasFrames(page);
  const eccentric = frames.find((frame) => frame.orbit)!.orbit;
  expect(eccentric.phase).toBe(0.25);
  expect(eccentric.sectors).toHaveLength(12);
  expect(eccentric.b / eccentric.a).toBeCloseTo(Math.sqrt(1 - 0.95 ** 2), 8);
  const speed = frames.find((frame) => frame.graph?.kind === 'speed')!.graph;
  expect(speed.curves[0].points[0].value).toBeCloseTo(Math.sqrt(1.95 / 0.05), 8);
  expect(speed.max).toBeGreaterThanOrEqual(Math.sqrt(1.95 / 0.05));
  await expectSameCanvases();
  await expectNoErrors(page);
});

test('local play, pause, resume and deliberate inspection preserve the shared Orrery state and writing', async ({ page }) => {
  await installTestClock(page);
  const lesson = await mountLesson(page, 1060, true, { orr_k2phase: 0.2 }, false);
  const retained = await retainedState(page);
  const orbit = page.getByRole('img', { name: /^Kepler II equal-area visualization/ });
  const readPhase = () => orbit.evaluate((canvas: any) => canvas._k2Orbit.phase as number);
  await showCanvas(page, orbit);
  const start = await readPhase();
  await lesson.getByRole('button', { name: 'Play orbit', exact: true }).click();
  await expect(lesson.getByRole('button', { name: 'Pause orbit', exact: true })).toBeVisible();
  await expect(lesson.locator('dd[data-k2-metric]')).toHaveCount(0);
  await expect(lesson).toContainText(/pause.{0,40}inspect/i);
  await showCanvas(page, orbit);
  await page.clock.runFor(500);
  await expect.poll(readPhase).not.toBe(start);
  await lesson.getByRole('button', { name: 'Pause orbit', exact: true }).click();
  const paused = (await measurements(page)).phase;
  expect((await state(page)).orr_k2phase).toBeCloseTo(paused, 8);
  await showCanvas(page, orbit);
  await expect.poll(readPhase).toBeCloseTo(paused, 8);
  await page.clock.runFor(500);
  expect(await readPhase()).toBeCloseTo(paused, 8);
  expect((await measurements(page)).phase).toBeCloseTo(paused, 8);
  expect(await retainedState(page)).toEqual(retained);
  await lesson.getByRole('button', { name: 'Play orbit', exact: true }).click();
  await showCanvas(page, orbit);
  const resumed = await readPhase();
  expect(Math.min(Math.abs(resumed - paused), 1 - Math.abs(resumed - paused))).toBeLessThan(0.1);
  await page.clock.runFor(250);
  await expect.poll(readPhase).not.toBe(paused);
  await lesson.getByRole('button', { name: 'Aphelion (50%)', exact: true }).click();
  await expect(lesson.getByRole('button', { name: 'Play orbit', exact: true })).toBeEnabled();
  await expectPhase(page, 0.5, 3);
  await showCanvas(page, orbit);
  await expect.poll(readPhase).toBe(0.5);
  await page.clock.runFor(500);
  expect(await readPhase()).toBe(0.5);
  await lesson.getByRole('button', { name: 'Play orbit', exact: true }).click();
  await expect(page.getByLabel('Orbit time (% of period)', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Inspect equal-time interval', { exact: true })).toBeDisabled();
  await lesson.getByRole('button', { name: 'Next equal-time interval', exact: true }).click();
  await expect(lesson.getByRole('button', { name: 'Play orbit', exact: true })).toBeEnabled();
  await expectPhase(page, 4.5 / 6, 4);
  expect(await retainedState(page)).toEqual(retained);
  await expectNoErrors(page);
});

test('reduced motion freezes restored playback while retaining usable phase and interval inspection', async ({ page }) => {
  await installTestClock(page);
  const lesson = await mountLesson(page, 1060, false, { orr_k2playing: true, orr_k2phase: 0.37 });
  const retained = await retainedState(page);
  await expect(lesson.getByRole('button', { name: 'Play orbit', exact: true })).toBeDisabled();
  await expect(lesson.getByRole('button', { name: 'Pause orbit', exact: true })).toHaveCount(0);
  expect((await measurements(page)).phase).toBeCloseTo(0.37, 8);
  const orbit = page.getByRole('img', { name: /^Kepler II equal-area visualization/ });
  await showCanvas(page, orbit);
  await expect.poll(() => orbit.evaluate((canvas: any) => canvas._k2Orbit.phase)).toBeCloseTo(0.37, 8);
  const first = await orbit.evaluate((canvas: any) => ({ phase: canvas._k2Orbit.phase, image: canvas.toDataURL() }));
  await page.clock.runFor(1000);
  expect(await orbit.evaluate((canvas: any) => ({ phase: canvas._k2Orbit.phase, image: canvas.toDataURL() }))).toEqual(first);
  await lesson.getByRole('button', { name: 'Next equal-time interval', exact: true }).click();
  await expectPhase(page, 3.5 / 6, 3);
  await showCanvas(page, orbit);
  await page.clock.runFor(500);
  expect((await measurements(page)).phase).toBeCloseTo(3.5 / 6, 8);
  expect(await retainedState(page)).toEqual(retained);
  await expectNoErrors(page);
});

for (const dark of [false, true]) {
  test(`320px ${dark ? 'dark' : 'light'} inspection keeps diagrams, measurements and pinned interval data readable`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const lesson = await mountLesson(page, 320, dark);
    const intervals = page.getByLabel('Inspect equal-time interval', { exact: true });
    await intervals.focus();
    await intervals.press('End');
    await expectPhase(page, 5.5 / 6, 5);
    await intervals.press('Home');
    await expectPhase(page, 0.5 / 6, 0);
    await expect(intervals).toBeFocused();
    const phase = page.getByLabel('Orbit time (% of period)', { exact: true });
    await phase.focus();
    await phase.press('Home');
    await expectPhase(page, 0, 0);
    await phase.press('ArrowRight');
    await expect.poll(async () => (await state(page)).orr_k2phase).toBeCloseTo(0.001, 8);
    await expect(phase).toBeFocused();
    await expectPhoneLayout(lesson, 320);
    await expectReadableText(lesson);
    await expectCanvasFrames(page);
    const { table, scroll } = await expectTable(page, 6);
    await scroll.focus();
    for (let step = 0; step < 5; step++) await scroll.press('ArrowRight');
    await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await expect(scroll).toBeFocused();
    const row = table.locator('tr[data-k2-interval="0"]');
    const header = row.getByRole('rowheader');
    const button = header.getByRole('button', { name: 'Inspect interval 1', exact: true });
    await button.scrollIntoViewIfNeeded();
    await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    await expect.poll(() => scroll.evaluate((element) =>
      element.scrollWidth - element.clientWidth - element.scrollLeft)).toBeLessThanOrEqual(1);
    const geometry = await row.evaluate((element) => {
      const viewport = document.getElementById('orrery-k2-table-scroll')!.getBoundingClientRect();
      const world = element.querySelector<HTMLElement>('th[scope="row"]')!;
      const control = world.querySelector<HTMLButtonElement>('button')!;
      const speed = element.querySelector<HTMLElement>('td:last-child')!;
      const range = document.createRange(); range.selectNodeContents(speed);
      const reading = range.getBoundingClientRect(), header = world.getBoundingClientRect(), button = control.getBoundingClientRect();
      const background = getComputedStyle(world).backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
      const buttonHit = document.elementFromPoint(button.left + button.width / 2, button.top + button.height / 2);
      const readingHit = document.elementFromPoint(reading.left + reading.width / 2, reading.top + reading.height / 2);
      return { viewport: { left: viewport.left, right: viewport.right },
        header: { left: header.left, right: header.right }, button: { left: button.left, right: button.right },
        reading: { left: reading.left, right: reading.right, width: reading.width },
        alpha: background.length === 4 ? background[3] : 1,
        buttonExposed: Boolean(buttonHit && control.contains(buttonHit)),
        readingExposed: Boolean(readingHit && speed.contains(readingHit)) };
    });
    for (const bounds of [geometry.header, geometry.button]) {
      expect(bounds.left).toBeGreaterThanOrEqual(geometry.viewport.left - 1);
      expect(bounds.right).toBeLessThanOrEqual(geometry.viewport.right + 1);
    }
    expect(geometry.alpha, 'the pinned interval header covers data scrolling behind it').toBeGreaterThanOrEqual(0.99);
    expect(geometry.buttonExposed).toBe(true);
    expect(geometry.reading.width).toBeGreaterThan(0);
    expect(geometry.reading.left).toBeGreaterThanOrEqual(geometry.header.right - 0.5);
    expect(geometry.reading.right).toBeLessThanOrEqual(geometry.viewport.right + 1);
    expect(geometry.readingExposed).toBe(true);
    await button.click();
    await expectPhase(page, 0.5 / 6, 0);
    await expect(button).toBeFocused();
    await expect(header).toHaveAttribute('scope', 'row');
    await expect(row.getByRole('cell')).toHaveCount(5);
    await expectReadableText(lesson);
    await expectPhoneLayout(lesson, 320);
    await expectNoErrors(page);
    expect(pageErrors).toEqual([]);
  });
}
