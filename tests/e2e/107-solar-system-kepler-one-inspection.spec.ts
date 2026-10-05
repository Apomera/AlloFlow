import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem',
  width: 1060, height: 1600, appStyles: true, layout: 'document',
});
const tau = 2 * Math.PI;
const metricKeys = ['phase', 'focus-one', 'focus-two', 'focal-sum', 'semi-minor',
  'focus-offset', 'perihelion', 'aphelion'];
const positions = ['perihelion', 'top', 'aphelion', 'bottom'];
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
  // Offscreen animation is intentionally suspended. Scroll before polling its
  // geometry, and avoid smooth scrolling under the simulated clock.
  await canvas.evaluate((element) => element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' }));
  await expect.poll(() => canvas.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight &&
      box.right > 0 && box.left < innerWidth;
  })).toBe(true);
  if (clockPages.has(page)) await page.clock.runFor(48);
}

async function mountLesson(page: Page, width = 1060, dark = true,
  patch: Record<string, unknown> = {}, reducedMotion = true) {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.getAttribute('aria-label')?.startsWith('Kepler I orbit visualization')) {
        const canvas = this.canvas as HTMLCanvasElement & { _testK1TextSamples?: { text: string; font: string }[] };
        const samples = canvas._testK1TextSamples ||= [];
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
    tutorialDismissed: true, solarMissionDashboardOpen: false, orreryMode: true, orr_tab: 1,
    orr_time: 0.37, orr_paused: true, orr_sel: 'mars', orr_compare: 'earth', orr_follow: 'mars',
    orr_snapshots: { mercury: { a: { bodyId: 'mercury', time: 0, distance: 0.31, speed: 59 } } },
    missionLog: [{ title: 'Retained observation', detail: 'Keep my saved evidence.' }],
    keplerInquiry: { a: 2, e: 0.2, mass: 1, testVariable: 'a', baseline: { a: 1, e: 0.2, mass: 1 },
      hypothesis: 'Keep my earlier prediction.', explanation: 'Keep my earlier explanation.',
      log: [{ t: 'Earlier', a: '1.00', e: '0.200', m: '1.00', p: '1.00', state: 'Elliptical' }] },
    orr_k1e: 0.5, orr_k1phase: 0, orr_k1playing: false, orr_k1axes: true,
    isDark: dark, ...patch,
  });
  const lesson = page.locator('#orrery-k1-inspection');
  await expect(lesson).toBeVisible();
  const canvas = lesson.getByRole('img', { name: /^Kepler I orbit visualization/ });
  await expect(canvas).toHaveAttribute('aria-describedby', 'orrery-k1-evidence');
  expect(await canvas.getAttribute('tabindex')).toBeNull();
  await showCanvas(page, canvas);
  await expect.poll(() => canvas.evaluate((element: any) => Boolean(element._k1Orbit))).toBe(true);
  return lesson;
}

async function state(page: Page) {
  return page.evaluate(() => (window as any).__toolData.solarSystem);
}

async function retainedState(page: Page) {
  return page.evaluate(() => {
    const { orr_k1e, orr_k1phase, orr_k1playing, orr_k1axes, ...otherState } = (window as any).__toolData.solarSystem;
    return JSON.parse(JSON.stringify(otherState));
  });
}

async function measurements(page: Page) {
  const entries = await page.locator('#orrery-k1-inspection').evaluate((lesson) =>
    [...lesson.querySelectorAll<HTMLElement>('dd[data-k1-metric]')].map((value) => ({
      key: value.dataset.k1Metric!, raw: value.getAttribute('data-value'),
      inDefinitionList: Boolean(value.closest('dl')), termTag: value.previousElementSibling?.tagName,
      term: value.previousElementSibling?.textContent?.trim(),
    })));
  expect(entries.map((entry) => entry.key).sort()).toEqual([...metricKeys].sort());
  const invalid = entries.filter(({ raw, inDefinitionList, termTag, term }) =>
    raw === null || !inDefinitionList || termTag !== 'DT' || !term || !Number.isFinite(Number(raw)) || Number(raw) < 0);
  expect(invalid, 'every measured value has an adjacent semantic term and finite nonnegative number').toEqual([]);
  return Object.fromEntries(entries.map(({ key, raw }) => [key, Number(raw)]));
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

async function expectPhase(page: Page, phase: number) {
  await expect.poll(async () => (await state(page)).orr_k1phase).toBeCloseTo(phase, 8);
  const values = await measurements(page);
  expect(values.phase).toBeCloseTo(phase, 8);
  expect(values['focal-sum']).toBeCloseTo(2, 8);
  return values;
}

function checkCartesianProof(orbit: any, point: any, name: string) {
  const r1 = Math.hypot(point.x - orbit.focusOne.x, point.y - orbit.focusOne.y) / orbit.a;
  const r2 = Math.hypot(point.x - orbit.focusTwo.x, point.y - orbit.focusTwo.y) / orbit.a;
  expect(r1, `${name}: distance to the Sun`).toBeCloseTo(point.r1, 8);
  expect(r2, `${name}: distance to the other focus`).toBeCloseTo(point.r2, 8);
  expect(r1 + r2, `${name}: independent Cartesian focal sum`).toBeCloseTo(2, 8);
  expect(point.sum).toBeCloseTo(r1 + r2, 8);
  expect(((point.x - orbit.cx) / orbit.a) ** 2 + ((point.y - orbit.cy) / orbit.b) ** 2,
    `${name}: point lies on the ellipse`).toBeCloseTo(1, 8);
}

async function expectOrbit(page: Page) {
  const canvas = page.locator('#orrery-k1-inspection').getByRole('img', { name: /^Kepler I orbit visualization/ });
  const model = await state(page);
  await showCanvas(page, canvas);
  await expect.poll(() => canvas.evaluate((element: any) => element._k1Orbit.phase)).toBeCloseTo(model.orr_k1phase, 8);
  await expect.poll(() => canvas.evaluate((element: any) => element._k1Orbit.e)).toBeCloseTo(model.orr_k1e, 8);
  await expect.poll(() => canvas.evaluate((element: any) => element._k1Orbit.axes)).toBe(model.orr_k1axes !== false);
  const frame = await canvas.evaluate((element: any) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const horizontalInset = Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.borderRightWidth) +
      Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
    const verticalInset = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth) +
      Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
    // The backing drawing fills the CSS content box; the bounding rectangle
    // also includes the visible CanvasPanel border and any canvas padding.
    return { cssWidth: box.width - horizontalInset, cssHeight: box.height - verticalInset,
      width: element._logicalWidth, height: element._logicalHeight,
      orbit: element._k1Orbit, samples: element._testK1TextSamples || [] };
  });
  expect(frame.width).toBeCloseTo(frame.cssWidth, 0);
  expect(frame.height).toBeCloseTo(frame.cssHeight, 0);
  expect(frame.height).toBeGreaterThanOrEqual(375);
  expect(frame.height).toBeLessThanOrEqual(441);
  expect(frame.samples.length, 'the actual canvas renderer was exercised').toBeGreaterThan(0);
  const unreadableFonts = frame.samples.map((sample: any, index: number) => ({
    index, text: sample.text, font: sample.font, size: Number(sample.font.match(/(\d+(?:\.\d+)?)px/)?.[1]),
  })).filter((sample: any) => !(sample.size >= 13));
  expect(unreadableFonts, 'every actual canvas text sample is at least 13px').toEqual([]);
  const orbit = frame.orbit;
  expect(orbit.width).toBe(frame.width);
  expect(orbit.height).toBe(frame.height);
  expect(orbit.a).toBeGreaterThan(0);
  expect(orbit.b / orbit.a).toBeCloseTo(Math.sqrt(1 - orbit.e ** 2), 8);
  expect(orbit.c / orbit.a).toBeCloseTo(orbit.e, 8);
  expect(orbit.cx - orbit.a).toBeGreaterThanOrEqual(0);
  expect(orbit.cx + orbit.a).toBeLessThanOrEqual(orbit.width);
  expect(orbit.cy - orbit.b).toBeGreaterThanOrEqual(0);
  expect(orbit.cy + orbit.b).toBeLessThanOrEqual(orbit.height);
  expect(orbit.focusOne.x).toBeCloseTo(orbit.cx + orbit.c, 8);
  expect(orbit.focusTwo.x).toBeCloseTo(orbit.cx - orbit.c, 8);
  expect(orbit.focusOne.y).toBeCloseTo(orbit.cy, 8);
  expect(orbit.focusTwo.y).toBeCloseTo(orbit.cy, 8);
  checkCartesianProof(orbit, orbit.point, 'inspected position');
  expect(orbit.point.phase).toBeCloseTo(orbit.phase, 8);
  const meanAnomaly = orbit.point.E - orbit.e * Math.sin(orbit.point.E);
  const expectedMeanAnomaly = tau * orbit.phase;
  // The 100% endpoint can use E=0 or E=2π while preserving its displayed phase.
  expect(Math.min(Math.abs(meanAnomaly - expectedMeanAnomaly),
    Math.abs(meanAnomaly - expectedMeanAnomaly + tau), Math.abs(meanAnomaly - expectedMeanAnomaly - tau)))
    .toBeLessThan(5e-9);
  expect(orbit.anchors.map((anchor: any) => anchor.key)).toEqual(positions);
  const expected = [
    { phase: 0, x: orbit.cx + orbit.a, y: orbit.cy, r1: 1 - orbit.e, r2: 1 + orbit.e },
    { phase: (Math.PI / 2 - orbit.e) / tau, x: orbit.cx, y: orbit.cy - orbit.b, r1: 1, r2: 1 },
    { phase: 0.5, x: orbit.cx - orbit.a, y: orbit.cy, r1: 1 + orbit.e, r2: 1 - orbit.e },
    { phase: (3 * Math.PI / 2 + orbit.e) / tau, x: orbit.cx, y: orbit.cy + orbit.b, r1: 1, r2: 1 },
  ];
  for (let index = 0; index < expected.length; index++) {
    const anchor = orbit.anchors[index];
    for (const key of ['phase', 'x', 'y', 'r1', 'r2'] as const)
      expect(anchor[key], `${anchor.key}: ${key}`).toBeCloseTo(expected[index][key], 8);
    checkCartesianProof(orbit, anchor, anchor.key);
  }
  expect(orbit.tags).toHaveLength(orbit.e === 0 ? 3 : 4);
  const invalidTags = orbit.tags.flatMap((tag: any, index: number) => {
    const failed = [
      ['finite geometry', [tag.x, tag.y, tag.width, tag.height].every(Number.isFinite)],
      ['positive width', tag.width > 0], ['height 24', tag.height === 24],
      ['left', tag.x >= 0], ['right', tag.x + tag.width <= orbit.width],
      ['top', tag.y >= 0], ['bottom', tag.y + tag.height <= orbit.height],
      ['outside ellipse bounds', tag.y + tag.height <= orbit.cy - orbit.b || tag.y >= orbit.cy + orbit.b],
    ].filter(([, valid]) => !valid).map(([condition]) => condition);
    return failed.length ? [{ index, ...tag, failed }] : [];
  });
  expect(invalidTags, 'every focus and reference tag is readable, contained, and outside the orbit contour').toEqual([]);
  const collisions: any[] = [];
  for (let index = 0; index < orbit.tags.length; index++) {
    for (let other = index + 1; other < orbit.tags.length; other++) {
      const a = orbit.tags[index], b = orbit.tags[other];
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y)
        collisions.push({ first: a, second: b });
    }
  }
  expect(collisions, 'all focus and reference label boxes are pairwise disjoint').toEqual([]);
  return orbit;
}

async function expectTable(page: Page, circle = false) {
  const table = page.locator('#orrery-k1-reference-table');
  await expect(table.locator('caption')).toHaveText('Four reference positions on one ellipse');
  await expect(table.locator('caption')).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveText([
    'Position', 'Time (%T)', 'r₁ / a', 'r₂ / a', '(r₁ + r₂) / a',
  ]);
  for (const heading of await table.getByRole('columnheader').all()) await expect(heading).toHaveAttribute('scope', 'col');
  const rows = table.locator('tr[data-k1-position]');
  await expect(rows).toHaveCount(4);
  expect(await rows.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-k1-position')))).toEqual(positions);
  const names = [circle ? '0% reference' : 'Perihelion', 'Top minor-axis vertex',
    circle ? '50% reference' : 'Aphelion', 'Bottom minor-axis vertex'];
  for (let index = 0; index < 4; index++) {
    await expect(rows.nth(index).getByRole('rowheader')).toHaveAttribute('scope', 'row');
    await expect(rows.nth(index).getByRole('cell')).toHaveCount(4);
    await expect(rows.nth(index).getByRole('button', { name: `Inspect ${names[index]}`, exact: true })).toBeVisible();
  }
  const scroll = page.getByRole('region', { name: 'Focal distances at reference positions', exact: true });
  await expect(scroll).toHaveAttribute('id', 'orrery-k1-table-scroll');
  await expect(scroll).toHaveAttribute('tabindex', '0');
  return { table, rows, scroll };
}

async function expectPhoneLayout(lesson: Locator) {
  const layout = await lesson.evaluate((region) => {
    const box = region.getBoundingClientRect(), scroll = region.querySelector<HTMLElement>('#orrery-k1-table-scroll')!;
    const controls = [...region.querySelectorAll<HTMLElement>('button, input[type="range"]')].map((control) => {
      const bounds = control.getBoundingClientRect();
      return { name: control.getAttribute('aria-label') || control.id || control.textContent?.trim(),
        width: bounds.width, height: bounds.height, left: bounds.left, right: bounds.right,
        font: Number.parseFloat(getComputedStyle(control).fontSize), inTable: Boolean(control.closest('#orrery-k1-table-scroll')) };
    }).filter((control) => control.width > 0 && control.height > 0);
    const scrollBox = scroll.getBoundingClientRect();
    return { left: box.left, right: box.right, clientWidth: region.clientWidth, scrollWidth: region.scrollWidth,
      pageWidth: document.documentElement.scrollWidth, scrollLeft: scrollBox.left, scrollRight: scrollBox.right,
      localOverflow: scroll.scrollWidth - scroll.clientWidth, controls };
  });
  expect(layout.left).toBeGreaterThanOrEqual(-1);
  expect(layout.right).toBeLessThanOrEqual(321);
  expect(layout.pageWidth).toBeLessThanOrEqual(321);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.scrollLeft).toBeGreaterThanOrEqual(-1);
  expect(layout.scrollRight).toBeLessThanOrEqual(321);
  expect(layout.localOverflow).toBeGreaterThan(0);
  const invalidControls = layout.controls.filter((control) => control.width < 43.5 || control.height < 43.5 || control.font < 12 ||
    (!control.inTable && (control.left < -1 || control.right > 321)));
  expect(invalidControls, 'every visible native control is readable, at least 44px, and locally contained').toEqual([]);
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
  expect(failures, 'all explanations, native controls, readings and reference cells remain readable').toEqual([]);
}

async function expectNoErrors(page: Page) {
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}

test('native controls and reference rows expose the focal-distance proof at four meaningful positions', async ({ page }) => {
  const lesson = await mountLesson(page);
  const retained = await retainedState(page);
  const eccentricity = page.getByLabel('Eccentricity', { exact: true });
  await expect(eccentricity).toHaveAttribute('id', 'orrery-k1-eccentricity');
  await expect(eccentricity).toHaveAttribute('min', '0');
  await expect(eccentricity).toHaveAttribute('max', '0.98');
  await expect(eccentricity).toHaveAttribute('step', '0.001');
  const phase = page.getByLabel('Orbit time (% of period)', { exact: true });
  await expect(phase).toHaveAttribute('id', 'orrery-k1-phase');
  await expect(phase).toHaveAttribute('min', '0');
  await expect(phase).toHaveAttribute('max', '100');
  await expect(phase).toHaveAttribute('step', '0.1');
  await expect(lesson.getByRole('button', { name: 'Play orbit', exact: true })).toBeDisabled();
  await expect(lesson.getByRole('button', { name: 'Show axes and center', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const peri = await expectPhase(page, 0);
  expect(peri['focus-one']).toBeCloseTo(0.5, 8);
  expect(peri['focus-two']).toBeCloseTo(1.5, 8);
  await expect(page.locator('#orrery-k1-evidence')).toContainText('Perihelion = 0.500a');
  await expect(page.locator('#orrery-k1-evidence')).toContainText('aphelion = 1.500a');
  await expect(page.locator('#orrery-k1-evidence')).toContainText(/center.to.focus/i);
  await expect(page.locator('#orrery-k1-evidence')).not.toContainText('Sun-to-focus');
  const { rows } = await expectTable(page);
  const targets = [
    { button: 'Perihelion (0%)', phase: 0, r1: 0.5, r2: 1.5 },
    { button: 'Top of minor axis', phase: (Math.PI / 2 - 0.5) / tau, r1: 1, r2: 1 },
    { button: 'Aphelion (50%)', phase: 0.5, r1: 1.5, r2: 0.5 },
    { button: 'Bottom of minor axis', phase: (3 * Math.PI / 2 + 0.5) / tau, r1: 1, r2: 1 },
  ];
  for (let index = 0; index < targets.length; index++) {
    const target = targets[index];
    await lesson.getByRole('button', { name: target.button, exact: true }).click();
    const values = await expectPhase(page, target.phase);
    expect(values['focus-one']).toBeCloseTo(target.r1, 8);
    expect(values['focus-two']).toBeCloseTo(target.r2, 8);
    const rowValues = await rows.nth(index).getByRole('cell').evaluateAll((cells) =>
      cells.map((cell) => ({ key: cell.getAttribute('data-k1-reading'), value: Number(cell.getAttribute('data-value')) })));
    expect(rowValues.map((cell) => cell.key)).toEqual(['phase', 'r1', 'r2', 'sum']);
    for (const [column, expected] of [target.phase, target.r1, target.r2, 2].entries())
      expect(rowValues[column].value, `${positions[index]} reference reading ${column}`).toBeCloseTo(expected, 8);
    await rows.nth(index).getByRole('button').click();
    await expectPhase(page, target.phase);
    await expect(rows.nth(index).getByRole('button')).toBeFocused();
  }
  await phase.focus();
  await phase.press('End');
  await expectPhase(page, 1);
  await phase.press('Home');
  await phase.press('ArrowRight');
  await expectPhase(page, 0.001);
  await expect(phase).toBeFocused();
  expect(await retainedState(page)).toEqual(retained);
  await expectNoErrors(page);
});

test('circle, near-circular and elongated ellipses preserve independent geometry and separated labels', async ({ page }) => {
  const lesson = await mountLesson(page, 736, false);
  const presets = [
    ['Circle (0)', 0], ['Venus (0.007)', 0.007], ['Earth (0.017)', 0.017], ['Mars (0.093)', 0.093],
    ['Mercury (0.206)', 0.206], ['Pluto (0.249)', 0.249], ['Halley (0.967)', 0.967],
  ] as const;
  for (const [label, e] of presets) {
    await lesson.getByRole('button', { name: label, exact: true }).click();
    await expect(lesson.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true');
    const values = await measurements(page);
    expect(values['focus-offset']).toBeCloseTo(e, 8);
    expect(values['semi-minor']).toBeCloseTo(Math.sqrt(1 - e ** 2), 8);
    expect(values.perihelion).toBeCloseTo(1 - e, 8);
    expect(values.aphelion).toBeCloseTo(1 + e, 8);
    const orbit = await expectOrbit(page);
    if (e === 0) {
      expect(orbit.focusOne).toEqual(orbit.focusTwo);
      expect(orbit.tags.filter((tag: any) => /focus|foci|sun/i.test(tag.text))).toHaveLength(1);
      await expect(page.locator('#orrery-k1-evidence')).toContainText(/coincid/i);
      await expectTable(page, true);
    } else {
      await expectTable(page);
      if (e === 0.007) await expect(page.locator('#orrery-k1-evidence')).not.toContainText(/\(circular\)/i);
    }
  }
  await setRange(page, 'orrery-k1-eccentricity', 0.98);
  for (const phase of [0, 13, 25, 50, 75, 100]) {
    await setRange(page, 'orrery-k1-phase', phase);
    await expectOrbit(page);
  }
  await expectNoErrors(page);
});

test('phase, eccentricity and axes changes repaint the same mounted canvas without moving the foci', async ({ page }) => {
  const lesson = await mountLesson(page);
  const canvas = lesson.getByRole('img', { name: /^Kepler I orbit visualization/ });
  await canvas.evaluate((element) => { (window as any).__k1MountedCanvas = element; });
  const sameCanvas = async () => expect(await canvas.evaluate((element) => element === (window as any).__k1MountedCanvas)).toBe(true);
  const retained = await retainedState(page);
  await setRange(page, 'orrery-k1-phase', 25);
  let orbit = await expectOrbit(page);
  expect(orbit.phase).toBe(0.25);
  const semiMajorAxis = orbit.a;
  const foci = { first: orbit.focusOne, second: orbit.focusTwo };
  await sameCanvas();
  const axes = lesson.getByRole('button', { name: 'Show axes and center', exact: true });
  await axes.click();
  await expect(axes).toHaveAttribute('aria-pressed', 'false');
  orbit = await expectOrbit(page);
  expect(orbit.axes).toBe(false);
  expect(orbit.a, 'toggling axes retains the displayed semi-major axis').toBe(semiMajorAxis);
  expect({ first: orbit.focusOne, second: orbit.focusTwo }).toEqual(foci);
  expect(orbit.phase).toBe(0.25);
  await sameCanvas();
  await setRange(page, 'orrery-k1-eccentricity', 0);
  orbit = await expectOrbit(page);
  expect(orbit.a, 'the circular reference retains the same displayed orbit size').toBe(semiMajorAxis);
  expect(orbit.a).toBeCloseTo(orbit.b, 8);
  expect(orbit.focusOne).toEqual(orbit.focusTwo);
  expect(orbit.point.r1).toBeCloseTo(1, 8);
  await sameCanvas();
  await axes.click();
  await setRange(page, 'orrery-k1-eccentricity', 0.98);
  orbit = await expectOrbit(page);
  expect(orbit.axes).toBe(true);
  expect(orbit.e).toBe(0.98);
  expect(orbit.a, 'changing eccentricity retains the displayed semi-major axis at a fixed viewport').toBe(semiMajorAxis);
  expect(orbit.phase).toBe(0.25);
  await sameCanvas();
  expect(await retainedState(page)).toEqual(retained);
  await expectNoErrors(page);
});

test('local playback pauses and resumes continuously while deliberate inspection preserves the shared state', async ({ page }) => {
  await installTestClock(page);
  const lesson = await mountLesson(page, 1060, true, { orr_k1phase: 0.2 }, false);
  const retained = await retainedState(page);
  const canvas = lesson.getByRole('img', { name: /^Kepler I orbit visualization/ });
  const readPhase = () => canvas.evaluate((element: any) => element._k1Orbit.phase as number);
  const start = await readPhase();
  await lesson.getByRole('button', { name: 'Play orbit', exact: true }).click();
  await expect(lesson.getByRole('button', { name: 'Pause orbit', exact: true })).toBeVisible();
  await expect(lesson.locator('dd[data-k1-metric]')).toHaveCount(0);
  await expect(page.getByLabel('Orbit time (% of period)', { exact: true })).toBeDisabled();
  await expect(lesson).toContainText(/pause.{0,40}inspect/i);
  await showCanvas(page, canvas);
  await page.clock.runFor(500);
  await expect.poll(readPhase).not.toBe(start);
  await lesson.getByRole('button', { name: 'Pause orbit', exact: true }).click();
  const paused = (await measurements(page)).phase;
  await showCanvas(page, canvas);
  await expect.poll(readPhase).toBeCloseTo(paused, 8);
  await page.clock.runFor(500);
  expect(await readPhase()).toBeCloseTo(paused, 8);
  await lesson.getByRole('button', { name: 'Play orbit', exact: true }).click();
  await showCanvas(page, canvas);
  const resumed = await readPhase();
  expect(Math.min(Math.abs(resumed - paused), 1 - Math.abs(resumed - paused))).toBeLessThan(0.1);
  await page.clock.runFor(250);
  await expect.poll(readPhase).not.toBe(paused);
  await lesson.getByRole('button', { name: 'Aphelion (50%)', exact: true }).click();
  await expectPhase(page, 0.5);
  await showCanvas(page, canvas);
  await page.clock.runFor(500);
  expect(await readPhase()).toBe(0.5);
  await lesson.getByRole('button', { name: 'Play orbit', exact: true }).click();
  await showCanvas(page, canvas);
  await page.clock.runFor(150);
  const beforePreset = await readPhase();
  await lesson.getByRole('button', { name: 'Earth (0.017)', exact: true }).click();
  await expect(lesson.getByRole('button', { name: 'Play orbit', exact: true })).toBeEnabled();
  const captured = (await measurements(page)).phase;
  expect(Math.min(Math.abs(captured - beforePreset), 1 - Math.abs(captured - beforePreset))).toBeLessThan(0.1);
  await showCanvas(page, canvas);
  await page.clock.runFor(500);
  expect(await readPhase()).toBeCloseTo(captured, 8);
  expect((await state(page)).orr_k1e).toBe(0.017);
  expect(await retainedState(page)).toEqual(retained);
  await expectNoErrors(page);
});

test('reduced motion freezes restored playback and preserves manual reference inspection', async ({ page }) => {
  await installTestClock(page);
  const lesson = await mountLesson(page, 1060, false, { orr_k1playing: true, orr_k1phase: 0.37 });
  const retained = await retainedState(page);
  await expect(lesson.getByRole('button', { name: 'Play orbit', exact: true })).toBeDisabled();
  await expect(lesson.getByRole('button', { name: 'Pause orbit', exact: true })).toHaveCount(0);
  await expectPhase(page, 0.37);
  const canvas = lesson.getByRole('img', { name: /^Kepler I orbit visualization/ });
  await showCanvas(page, canvas);
  const first = await canvas.evaluate((element: any) => ({ phase: element._k1Orbit.phase, image: element.toDataURL() }));
  await page.clock.runFor(1000);
  expect(await canvas.evaluate((element: any) => ({ phase: element._k1Orbit.phase, image: element.toDataURL() }))).toEqual(first);
  await lesson.getByRole('button', { name: 'Top of minor axis', exact: true }).click();
  const top = (Math.PI / 2 - 0.5) / tau;
  await expectPhase(page, top);
  await showCanvas(page, canvas);
  await page.clock.runFor(500);
  expect(await canvas.evaluate((element: any) => element._k1Orbit.phase)).toBeCloseTo(top, 8);
  expect(await retainedState(page)).toEqual(retained);
  await expectNoErrors(page);
});

for (const dark of [false, true]) {
  test(`320px ${dark ? 'dark' : 'light'} inspection keeps controls, proof and pinned reference readings readable`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const lesson = await mountLesson(page, 320, dark);
    const phase = page.getByLabel('Orbit time (% of period)', { exact: true });
    await phase.focus();
    await phase.press('Home');
    await phase.press('ArrowRight');
    await expectPhase(page, 0.001);
    await expect(phase).toBeFocused();
    await expectPhoneLayout(lesson);
    await expectReadableText(lesson);
    await expectOrbit(page);
    for (const e of [0, 0.007, 0.98]) {
      await setRange(page, 'orrery-k1-eccentricity', e);
      await expectOrbit(page);
    }
    await setRange(page, 'orrery-k1-eccentricity', 0.5);
    const { table, scroll } = await expectTable(page);
    await scroll.focus();
    for (let step = 0; step < 5; step++) await scroll.press('ArrowRight');
    await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await expect(scroll).toBeFocused();
    const row = table.locator('tr[data-k1-position="perihelion"]');
    const header = row.getByRole('rowheader'), button = header.getByRole('button', { name: 'Inspect Perihelion', exact: true });
    await button.scrollIntoViewIfNeeded();
    await scroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    await expect.poll(() => scroll.evaluate((element) => element.scrollWidth - element.clientWidth - element.scrollLeft)).toBeLessThanOrEqual(1);
    const geometry = await row.evaluate((element) => {
      const viewport = document.getElementById('orrery-k1-table-scroll')!.getBoundingClientRect();
      const heading = element.querySelector<HTMLElement>('th[scope="row"]')!;
      const control = heading.querySelector<HTMLButtonElement>('button')!;
      const sum = element.querySelector<HTMLElement>('td:last-child')!;
      const range = document.createRange(); range.selectNodeContents(sum);
      const reading = range.getBoundingClientRect(), header = heading.getBoundingClientRect(), button = control.getBoundingClientRect();
      const background = getComputedStyle(heading).backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
      const buttonHit = document.elementFromPoint(button.left + button.width / 2, button.top + button.height / 2);
      const readingHit = document.elementFromPoint(reading.left + reading.width / 2, reading.top + reading.height / 2);
      return { viewport: { left: viewport.left, right: viewport.right }, header: { left: header.left, right: header.right },
        button: { left: button.left, right: button.right }, reading: { left: reading.left, right: reading.right, width: reading.width },
        sum: sum.textContent?.trim(), alpha: background.length === 4 ? background[3] : 1,
        buttonExposed: Boolean(buttonHit && control.contains(buttonHit)), readingExposed: Boolean(readingHit && sum.contains(readingHit)) };
    });
    for (const bounds of [geometry.header, geometry.button]) {
      expect(bounds.left).toBeGreaterThanOrEqual(geometry.viewport.left - 1);
      expect(bounds.right).toBeLessThanOrEqual(geometry.viewport.right + 1);
    }
    expect(geometry.alpha, 'the pinned position column covers readings scrolling behind it').toBeGreaterThanOrEqual(0.99);
    expect(geometry.buttonExposed).toBe(true);
    expect(Number(geometry.sum)).toBeCloseTo(2, 2);
    expect(geometry.reading.width).toBeGreaterThan(0);
    expect(geometry.reading.left).toBeGreaterThanOrEqual(geometry.header.right - 0.5);
    expect(geometry.reading.right).toBeLessThanOrEqual(geometry.viewport.right + 1);
    expect(geometry.readingExposed).toBe(true);
    await button.click();
    await expectPhase(page, 0);
    await expect(button).toBeFocused();
    await expect(header).toHaveAttribute('scope', 'row');
    await expect(row.getByRole('cell')).toHaveCount(4);
    await expectReadableText(lesson);
    await expectPhoneLayout(lesson);
    await expectNoErrors(page);
    expect(pageErrors).toEqual([]);
  });
}
