import { test, expect, Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio } from './helpers/png_pixels';

test.describe.configure({ timeout: 180_000, retries: 0 });
test.use({ deviceScaleFactor: 2, reducedMotion: 'reduce' });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});
const reports = path.resolve(process.env.PHYSICS_VISUAL_REPORT_DIR || 'reports/physics-velocity-diagram-2026-10-09');
type View = 'motion' | 'forces' | 'energy' | 'data';

test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__velocityTick = () => {
      now += 1000 / 60;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const w = window as any, wrap = document.getElementById('wrap') as HTMLElement;
    wrap.style.width = '100%';
    const main = document.createElement('main'); wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div'); main.insertBefore(card, wrap); card.appendChild(wrap);
    w.__setVelocityTheme = (theme: string) => {
      const ctx = w.__ctx; ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      w.__rerender();
    };
    w.__velocityCsv = [];
    w.StemLab.writeClipboard = (text: string) => { w.__velocityCsv.push(text); return Promise.resolve(); };
  });
}

async function patch(page: Page, values: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({
    ...prev, physics: { ...prev.physics, ...p },
  })), values);
  await page.waitForTimeout(40);
}

async function view(page: Page, name: View) {
  const tab = page.locator(`[data-physics-analysis-tab="${name}"]`);
  if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

async function redraw(page: Page) {
  await page.evaluate(() => {
    (document.getElementById('physicsCanvas') as any)._physScheduleFrame(); (window as any).__velocityTick();
  });
}

async function launch(page: Page, drag = false, complete = true) {
  const count = await page.evaluate(() => ((window as any).__toolData.physics.runLog || []).length);
  await patch(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: drag,
    simSpeed: complete ? 1 : 0, showGraphs: true, showFlightData: true, showEnergy: true });
  await page.locator('[data-physics-launch]').click();
  if (complete) {
    await page.evaluate(() => {
      const cv = document.getElementById('physicsCanvas') as any;
      let ticks = 0;
      while (cv._launched && ticks++ < 10000) (window as any).__velocityTick();
      if (cv._launched) throw Error('The velocity diagram fixture did not land');
    });
    await page.waitForFunction(n => (window as any).__toolData.physics.runLog.length === n + 1, count, { polling: 20 });
    await patch(page, { simSpeed: 0 });
  }
  await redraw(page); await view(page, 'motion');
  await expect(page.locator('[data-physics-motion-readings]')).toBeVisible();
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, d = (window as any).__toolData.physics;
    return { ball: cv._ball, trails: cv._trails.map((t: any) => ({ points: [...t], parameters: t.parameters,
      run: t.run, apex: t.apex, modelVersion: t.modelVersion })), runLog: d.runLog, lastFlight: d.lastFlight,
      recordedFlights: d.recordedFlights };
  });
}

async function copyCsv(page: Page) {
  const previous = await page.locator('[data-physics-analysis-workspace]').getAttribute('data-physics-analysis-view') as View;
  await view(page, 'data');
  try {
    const before = await page.evaluate(() => (window as any).__velocityCsv.length);
    await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__velocityCsv.length)).toBe(before + 1);
    return await page.evaluate(() => (window as any).__velocityCsv.at(-1) as string);
  } finally { await view(page, previous); }
}

function formatted(value: number) {
  return value !== 0 && Math.abs(value) < .01 ? value.toPrecision(3) : value.toFixed(2);
}

async function assertDiagram(page: Page, phase?: string) {
  await redraw(page);
  const captured = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, inspection = cv._inspection;
    const trail = inspection ? inspection.trail : cv._trails.at(-1), index = inspection ? inspection.index : trail.length - 1;
    return { point: trail[index], index, run: trail.run ?? null,
      scale: Math.max(...trail.map((p: any) => Math.hypot(p.mVx, p.mVy))), phase: inspection?.snapshot.phase };
  });
  const vx = captured.point.mVx, vy = captured.point.mVy, speed = Math.hypot(vx, vy), scale = captured.scale;
  const card = page.locator('[data-physics-motion-readings]'), svg = card.locator('[data-physics-velocity-diagram]');
  await expect(svg).toBeVisible(); await expect(svg).toHaveAttribute('viewBox', '0 0 280 228');
  await expect(svg).toHaveAttribute('role', 'img');
  expect(await svg.getAttribute('tabindex')).toBeNull();
  await expect(svg).toHaveAttribute('data-sample-index', String(captured.index));
  await expect(svg).toHaveAttribute('data-run', captured.run == null ? 'unfinished' : String(captured.run));
  await expect(svg).toHaveAttribute('data-time', String(captured.point.t));
  await expect(svg).toHaveAttribute('data-speed', String(speed));
  await expect(svg).toHaveAttribute('data-scale-speed', String(scale));
  await expect(svg.locator('[data-physics-velocity-scale-circle]')).toHaveAttribute('r', '70');
  const describedBy = (await svg.getAttribute('aria-describedby') || '').split(/\s+/);
  for (const id of ['physics-velocity-construction-help', 'physics-velocity-scale-help', 'physics-velocity-component-note']) {
    expect(describedBy).toContain(id); await expect(page.locator('#' + id)).toHaveCount(1);
    if (id !== 'physics-velocity-component-note' || (await page.locator('#' + id).textContent())?.trim()) {
      await expect(page.locator('#' + id)).toBeVisible();
    }
  }
  if (phase) {
    expect(captured.phase).toBe(phase);
    await expect(page.locator('[data-physics-motion-phase]')).toHaveAttribute('data-physics-motion-phase', phase);
  }
  const x = 140 + (scale > 0 ? 70 * (vx / scale) : 0), y = 104 - (scale > 0 ? 70 * (vy / scale) : 0);
  for (const [field, vector] of Object.entries({
    vx: { value: vx, x1: 140, y1: 104, x2: x, y2: 104, dash: '7px, 4px' },
    vy: { value: vy, x1: x, y1: 104, x2: x, y2: y, dash: '2px, 3px' },
    resultant: { value: speed, x1: 140, y1: 104, x2: x, y2: y, dash: 'none' },
  })) {
    const line = svg.locator(`[data-physics-velocity-vector="${field}"]`);
    await expect(line).toHaveCount(vector.value === 0 ? 0 : 1);
    if (vector.value === 0) continue;
    await expect(line).toHaveAttribute('data-value', String(vector.value));
    await expect(line).toHaveAttribute('data-scale-speed', String(scale));
    const actual = await line.evaluate(node => ({
      ...Object.fromEntries(['x1', 'y1', 'x2', 'y2'].map(key => [key, Number(node.getAttribute(key))])),
      dash: getComputedStyle(node).strokeDasharray, width: parseFloat(getComputedStyle(node).strokeWidth),
    }));
    for (const coordinate of ['x1', 'y1', 'x2', 'y2'] as const) expect(actual[coordinate]).toBeCloseTo(vector[coordinate], 12);
    expect(actual.dash).toBe(vector.dash); expect(actual.width).toBe(field === 'resultant' ? 5 : 2.5);
    const length = Math.hypot(vector.x2 - vector.x1, vector.y2 - vector.y1), head = svg.locator(`[data-physics-velocity-head="${field}"]`);
    await expect(head).toHaveCount(1);
    expect(Number(await head.getAttribute('data-head-length'))).toBeCloseTo(Math.min(8, length / 3), 12);
  }
  for (const [field, value] of Object.entries({ vx, vy, speed })) {
    await expect(card.locator(`[data-physics-measurement="${field}"] dd`)).toHaveText(formatted(value) + ' m/s');
  }
  await expect(card.locator('[data-physics-velocity-formula]')).toHaveAttribute('data-value', String(speed));
  await expect(card.locator('[data-physics-velocity-formula]')).toContainText(formatted(speed) + ' m/s');
  return { ...captured, vx, vy, speed, x, y };
}

test('recorded velocity construction uses original signed components and a fixed flight scale through moments and older runs', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  let firstCsv = '', firstScale = 0;
  for (const drag of [false, true]) {
    await launch(page, drag);
    const before = await evidence(page), csv = await copyCsv(page);
    await page.locator('[data-physics-inspect]').click(); await view(page, 'motion');
    const scales: number[] = [];
    for (const [jump, phase] of [['launch', 'rising'], ['highest', 'apex'], ['latest', 'impact']] as const) {
      await page.locator(`[data-physics-sample-jump="${jump}"]`).click();
      const selected = await assertDiagram(page, phase); scales.push(selected.scale);
      expect(selected.run).toBe(drag ? 2 : 1);
      if (phase === 'apex') {
        expect(selected.vy).toBe(0); expect(selected.y).toBe(104); expect(selected.speed).toBe(Math.abs(selected.vx));
        await expect(page.locator('[data-physics-velocity-zero="vy"]')).toBeVisible();
      }
      if (phase === 'impact') expect(selected.y).toBeGreaterThan(104);
    }
    expect(new Set(scales).size).toBe(1);
    await patch(page, { angle: 80, velocity: 5, mass: 9, gravity: 25, launchHeight: 30, airResist: !drag });
    await page.locator('[data-physics-sample-jump="launch"]').click();
    const captured = await assertDiagram(page, 'rising'); expect(captured.scale).toBe(scales[0]);
    expect(await copyCsv(page)).toBe(csv); expect(await evidence(page)).toEqual(before);
    if (!drag) { firstCsv = csv; firstScale = scales[0]; }
  }
  const both = await evidence(page);
  await page.locator('[data-physics-history-select]').selectOption('0'); await view(page, 'motion');
  await page.locator('[data-physics-sample-jump="highest"]').click();
  const older = await assertDiagram(page, 'apex'); expect(older.run).toBe(1); expect(older.scale).toBe(firstScale);
  expect(await copyCsv(page)).toBe(firstCsv); expect(await evidence(page)).toEqual(both); expect(errors).toEqual([]);
});

test('zero, leftward, downward and tiny velocity components retain exact geometry and visible numeric explanations', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page, false, false);
  for (const fixture of [{ vx: 0, vy: 0 }, { vx: 12, vy: 0 }, { vx: 0, vy: -12 },
    { vx: -12, vy: 8 }, { vx: .001, vy: -12 }, { vx: 12, vy: -.001 }]) {
    if (await page.locator('[data-physics-sample-close]').count()) await page.locator('[data-physics-sample-close]').click();
    await page.evaluate(value => {
      const cv = document.getElementById('physicsCanvas') as any, trail = cv._trails.at(-1);
      if (trail.length !== 1 || trail.apex) throw Error('Synthetic velocity fixture requires a paused launch record');
      trail[0] = { ...trail[0], mVx: value.vx, mVy: value.vy };
      (window as any).__rerender();
    }, fixture);
    await redraw(page); const before = await evidence(page);
    await page.locator('[data-physics-inspect]').click(); await view(page, 'motion');
    const selected = await assertDiagram(page);
    for (const field of ['vx', 'vy', 'speed'] as const) {
      const value = selected[field];
      await expect(page.locator(`[data-physics-velocity-zero="${field}"]`)).toHaveCount(value === 0 ? 1 : 0);
      if (field === 'speed') continue;
      const length = selected.scale > 0 ? 70 * (Math.abs(value) / selected.scale) : 0;
      await expect(page.locator(`[data-physics-velocity-tiny="${field}"]`)).toHaveCount(value !== 0 && length < 4.5 ? 1 : 0);
      if (value !== 0 && length < 4.5) {
        const line = page.locator(`[data-physics-velocity-vector="${field}"]`);
        const actualLength = await line.evaluate(node => Math.hypot(Number(node.getAttribute('x2')) - Number(node.getAttribute('x1')),
          Number(node.getAttribute('y2')) - Number(node.getAttribute('y1'))));
        expect(actualLength).toBeGreaterThan(0); expect(actualLength).toBeCloseTo(length, 12);
        await expect(page.locator(`[data-physics-measurement="${field}"] dd`)).toContainText(formatted(value));
      }
    }
    if (fixture.vx < 0) expect(selected.x).toBeLessThan(140);
    if (fixture.vy < 0) expect(selected.y).toBeGreaterThan(104);
    if (fixture.vy > 0) expect(selected.y).toBeLessThan(104);
    expect(await evidence(page)).toEqual(before);
  }
  await page.locator('[data-physics-sample-close]').click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, trail = cv._trails.at(-1), original = trail[0];
    // Put the fastest velocity away from the retained launch, apex and latest moments.
    trail.splice(0, trail.length, ...Array.from({ length: 200 }, (_, i) => ({ ...original,
      t: i / 60, mX: i / 100, mY: 10, mVx: i === 93 ? 100 : 12, mVy: 0 })));
    (window as any).__rerender();
  });
  await redraw(page); const fullResolution = await evidence(page);
  await page.locator('[data-physics-inspect]').click(); await view(page, 'motion');
  await page.locator('[data-physics-graph="vx"]').focus(); await page.locator('[data-physics-graph="vx"]').press('Home');
  const retained = await assertDiagram(page, 'level');
  expect(retained.index).toBe(0); expect(retained.vx).toBe(12); expect(retained.scale).toBe(100);
  expect(await evidence(page)).toEqual(fullResolution);
  expect(errors).toEqual([]);
});

function rgb(color: string): [number, number, number] {
  const match = color.match(/^rgba?\(([^)]+)\)$/);
  if (!match) throw Error('Unresolved velocity diagram color: ' + color);
  const channels = match[1].split(',').map(Number); return [channels[0], channels[1], channels[2]];
}

async function capture(page: Page, file: string, highContrast: boolean) {
  const card = page.locator('[data-physics-motion-readings]');
  const measured = await card.evaluate(node => {
    const svg = node.querySelector('[data-physics-velocity-diagram]') as SVGSVGElement;
    const cardBox = node.getBoundingClientRect(), bounds = svg.getBoundingClientRect(), matrix = svg.getScreenCTM()!;
    const point = (x: number, y: number) => { const p = new DOMPoint(x, y).matrixTransform(matrix); return { x: p.x - cardBox.left, y: p.y - cardBox.top }; };
    const surface = (element: Element) => {
      for (let parent: Element | null = element; parent; parent = parent.parentElement) {
        const color = getComputedStyle(parent).backgroundColor, channels = color.match(/^rgba?\(([^)]+)\)$/)?.[1].split(',').map(Number);
        if (channels && (channels.length === 3 || channels[3] >= .99)) return color;
      }
      throw Error('Velocity content has no resolved surface');
    };
    const scaleCircle = svg.querySelector('[data-physics-velocity-scale-circle]')!;
    const vectors = [...svg.querySelectorAll('[data-physics-velocity-vector]')].map(line => {
      const x1 = Number(line.getAttribute('x1')), x2 = Number(line.getAttribute('x2'));
      const y1 = Number(line.getAttribute('y1')), y2 = Number(line.getAttribute('y2'));
      return { field: line.getAttribute('data-physics-velocity-vector'), color: getComputedStyle(line).stroke,
        background: surface(line), witnesses: [.15, .3, .45, .6, .75, .9].map(t => point(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) };
    });
    const texts = [...svg.querySelectorAll('text')].map(text => {
      const box = text.getBBox(), transform = text.getScreenCTM()!, corners = [new DOMPoint(box.x, box.y), new DOMPoint(box.x + box.width, box.y + box.height)].map(p => p.matrixTransform(transform));
      return { text: text.textContent, left: corners[0].x - bounds.left, top: corners[0].y - bounds.top,
        right: corners[1].x - bounds.left, bottom: corners[1].y - bounds.top,
        font: parseFloat(getComputedStyle(text).fontSize) * Math.hypot(transform.c, transform.d),
        color: getComputedStyle(text).fill, background: surface(text) };
    });
    const bodyTexts: Array<{ text: string; font: number; color: string; background: string; left: number; right: number }> = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      const element = text.parentElement!;
      if (!text.textContent?.trim() || !element.getClientRects().length || element.closest('svg,.sr-only')) continue;
      const style = getComputedStyle(element), range = document.createRange(); range.selectNodeContents(text);
      for (const rect of range.getClientRects()) bodyTexts.push({ text: text.textContent.trim(), font: parseFloat(style.fontSize),
        color: style.color, background: surface(element), left: rect.left, right: rect.right });
    }
    return { width: bounds.width, height: bounds.height, pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth, card: { left: cardBox.left, right: cardBox.right, width: cardBox.width },
      scaleCircle: { radius: Number(scaleCircle.getAttribute('r')), color: getComputedStyle(scaleCircle).stroke, background: surface(scaleCircle) }, vectors, texts, bodyTexts };
  });
  expect(measured.width).toBeGreaterThan(150); expect(measured.pageWidth).toBeLessThanOrEqual(measured.viewportWidth + 1);
  expect(measured.card.left).toBeGreaterThanOrEqual(0); expect(measured.card.right).toBeLessThanOrEqual(measured.viewportWidth + 1);
  expect(measured.scaleCircle.radius).toBe(70);
  expect(contrastRatio(rgb(measured.scaleCircle.color), rgb(measured.scaleCircle.background))).toBeGreaterThanOrEqual(highContrast ? 7 : 3);
  expect(measured.texts.length).toBeGreaterThan(2); expect(measured.bodyTexts.length).toBeGreaterThan(6);
  for (const text of measured.texts) {
    expect(text.font, text.text || '').toBeGreaterThanOrEqual(12); expect(text.left).toBeGreaterThanOrEqual(-.5);
    expect(text.top).toBeGreaterThanOrEqual(-.5); expect(text.right).toBeLessThanOrEqual(measured.width + .5);
    expect(text.bottom).toBeLessThanOrEqual(measured.height + .5);
    expect(contrastRatio(rgb(text.color), rgb(text.background)), text.text || '').toBeGreaterThanOrEqual(highContrast ? 7 : 4.5);
  }
  for (const text of measured.bodyTexts) {
    expect(text.font, text.text).toBeGreaterThanOrEqual(12); expect(text.left).toBeGreaterThanOrEqual(measured.card.left - .5);
    expect(text.right).toBeLessThanOrEqual(measured.card.right + .5);
    expect(contrastRatio(rgb(text.color), rgb(text.background)), text.text).toBeGreaterThanOrEqual(highContrast ? 7 : 4.5);
  }
  for (const vector of measured.vectors) expect(contrastRatio(rgb(vector.color), rgb(vector.background)), vector.field || '').toBeGreaterThanOrEqual(highContrast ? 7 : 3);
  mkdirSync(reports, { recursive: true });
  const buffer = await card.screenshot({ path: path.join(reports, file) }), pixels = readPng(buffer);
  const box = (await card.boundingBox())!, ratioX = pixels.width / box.width, ratioY = pixels.height / box.height;
  const witnesses = measured.vectors.map(vector => {
    const wanted = rgb(vector.color); let best = { error: Infinity, x: -1, y: -1, actual: [] as number[] };
    for (const point of vector.witnesses) {
      const x = Math.round(point.x * ratioX), y = Math.round(point.y * ratioY);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (x + dx < 0 || y + dy < 0 || x + dx >= pixels.width || y + dy >= pixels.height) continue;
        const actual = pixels.at(x + dx, y + dy), error = Math.max(...actual.map((channel, i) => Math.abs(channel - wanted[i])));
        if (error < best.error) best = { error, x: x + dx, y: y + dy, actual };
      }
    }
    expect(best.error, vector.field + ' must paint in the saved PNG').toBeLessThanOrEqual(8);
    return { field: vector.field, wanted, ...best };
  });
  return { file, measured, pixels: { width: pixels.width, height: pixels.height, witnesses } };
}

test('velocity construction, legends and readings remain visible and readable in twelve saved layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await launch(page, true); await page.locator('[data-physics-inspect]').click();
  const original = await evidence(page), captures: any[] = [];
  try {
    for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(value => (window as any).__setVelocityTheme(value), theme);
      await view(page, 'motion'); await page.locator('[data-physics-sample-jump="latest"]').click();
      await assertDiagram(page, 'impact');
      captures.push({ width, theme, phase: 'impact', ...(await capture(page, `velocity-${theme}-${width}.png`, theme === 'contrast')) });
      if (width === 320) {
        await page.locator('[data-physics-sample-jump="highest"]').click(); await assertDiagram(page, 'apex');
        captures.push({ width, theme, phase: 'apex', ...(await capture(page, `velocity-apex-${theme}-${width}.png`, theme === 'contrast')) });
      }
    }
    expect(captures).toHaveLength(12); expect(await evidence(page)).toEqual(original); expect(errors).toEqual([]);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error)); throw error;
  } finally {
    mkdirSync(reports, { recursive: true });
    writeFileSync(path.join(reports, 'velocity-visual-results.json'), JSON.stringify({ captures, errors }, null, 2) + '\n');
  }
});
