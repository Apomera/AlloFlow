import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ASCENT_ACCELERATION_REPORT_DIR || 'reports/moon-mission-enhancement-pass45-2026-10-10/browser/acceleration');
const MAIN = '[data-ascent-canvas]', INSPECTOR = '[data-ascent-acceleration]';
const TOGGLE = '[data-ascent-acceleration-toggle]', DIAGRAM = '[data-ascent-acceleration-diagram]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = () => ({ moonMission: { missionPhase: 7, animPaused: true, ascentPaused: true, ascentView: 'surface',
  soundOff: true, missionXP: 0, missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
  difficulty: 'pilot', lunarSamples: [], quizCorrect: 0 } });

async function mount(page: Page, data: any = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-view', 'surface');
  await expect(page.locator(INSPECTOR)).toBeAttached();
  await expect.poll(() => page.locator(MAIN).getAttribute('data-ascent-time')).not.toBeNull();
  await expect.poll(async () => !!(await saved(page)).ascentRun).toBe(true);
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function flight(page: Page) { const value = await saved(page); delete value.ascentView; return value; }
async function storage(page: Page) { return page.evaluate(() => ({ local: Object.keys(localStorage).sort(), session: Object.keys(sessionStorage).sort() })); }
async function seek(page: Page, seconds: number) {
  await page.locator('[data-ascent-seek]').evaluate((input: HTMLInputElement, time) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(time));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, seconds);
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-ascent-time'))).toBeCloseTo(seconds, 6);
  await expect.poll(async () => Number(await page.locator(INSPECTOR).getAttribute('data-acceleration-time'))).toBeCloseTo(seconds, 6);
}
async function pixels(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    let hash = 2166136261;
    for (const value of cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data) hash = Math.imul(hash ^ value, 16777619);
    return hash >>> 0;
  });
}
async function capture(page: Page, info: TestInfo, name: string, workspace = false) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(workspace ? '[data-ascent-workspace]' : INSPECTOR).screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}

// Expectations use the independently stated SI force equations. The diagram's
// own model and datasets are evidence to check, never the expected values.
function expected(sample: any) {
  const radius = 1737400 + sample.altitude, gravityMagnitude = 4.9048695e12 / (radius * radius);
  const engineVisible = sample.engineOn === true && sample.thrust > 0, engineAcceleration = engineVisible ? sample.thrust / sample.mass : 0;
  const engine = { x: engineAcceleration * Math.sin(sample.pitch), y: engineAcceleration * Math.cos(sample.pitch), magnitude: engineAcceleration,
    forceMagnitude: engineVisible ? sample.thrust : 0 };
  const gravity = { x: 0, y: -gravityMagnitude, magnitude: gravityMagnitude, forceMagnitude: sample.mass * gravityMagnitude };
  const net = { x: engine.x, y: engine.y - gravityMagnitude, magnitude: Math.hypot(engine.x, engine.y - gravityMagnitude),
    forceMagnitude: sample.mass * Math.hypot(engine.x, engine.y - gravityMagnitude) };
  const basisRotationRate = sample.tangentialSpeed / radius;
  const curvatureRadial = sample.tangentialSpeed * sample.tangentialSpeed / radius;
  const curvatureTangential = sample.radialSpeed * sample.tangentialSpeed / radius;
  return { radius, engineVisible, engineAcceleration, gravityMagnitude, properLoadG: engineAcceleration / 9.80665,
    basisRotationRate, curvatureRadial, curvatureTangential, radialSpeedRate: net.y + curvatureRadial,
    tangentialSpeedRate: net.x - curvatureTangential, engine, gravity, net };
}
function arrow(vector: any) {
  const startX = 300, startY = 160, endX = startX + vector.x * 20, endY = startY - vector.y * 20;
  const dx = endX - startX, dy = endY - startY, length = Math.hypot(dx, dy), visible = vector.magnitude > 1e-9;
  const ux = length ? dx / length : 0, uy = length ? dy / length : 0, head = Math.min(11, length * 0.42), half = head * 0.42;
  return { startX, startY, endX, endY, visible, points: visible ? [[endX, endY],
    [endX - head * ux - half * uy, endY - head * uy + half * ux], [endX - head * ux + half * uy, endY - head * uy - half * ux]] : [] };
}
async function measured(page: Page) {
  return page.locator(INSPECTOR).evaluate((details: HTMLDetailsElement) => {
    const P = (window as any).MoonMissionPure, main = document.querySelector('[data-ascent-canvas]') as HTMLCanvasElement;
    const sample = P.ascentSample(P.ascentProfile(), Number(main.dataset.ascentTime));
    const svg = details.querySelector('[data-ascent-acceleration-diagram]') as SVGSVGElement;
    const box = svg.getBoundingClientRect(), matrix = svg.getScreenCTM()!;
    const attrs = (node: Element, names: string[]) => Object.fromEntries(names.map(name => [name, node.getAttribute(name)]));
    const vectors = Object.fromEntries(['engine', 'gravity', 'net'].map(key => {
      const group = details.querySelector('[data-ascent-acceleration-vector="' + key + '"]')!;
      const line = group.querySelector('line')!, head = group.querySelector('polygon')!;
      return [key, { ...attrs(group, ['data-x', 'data-y', 'data-magnitude', 'data-force-magnitude', 'visibility']),
        line: attrs(line, ['x1', 'y1', 'x2', 'y2']), points: (head.getAttribute('points') || '').trim().split(/\s+/).filter(Boolean).map(pair => pair.split(',').map(Number)) }];
    }));
    const textBounds = [...svg.querySelectorAll('text')].filter(node => getComputedStyle(node).visibility !== 'hidden').map(node => {
      const b = node.getBBox(); return { text: node.textContent, x: b.x, y: b.y, width: b.width, height: b.height };
    });
    const domBounds: any[] = [], walker = document.createTreeWalker(details, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement!;
      if (!node.textContent?.trim() || parent.closest('svg') || getComputedStyle(parent).display === 'none' || getComputedStyle(parent).visibility === 'hidden') continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const b of [...range.getClientRects()]) if (b.width && b.height) domBounds.push({ text: node.textContent.trim(), left: b.left, right: b.right, width: b.width });
    }
    const allLines = [...svg.querySelectorAll('line')].map(node => attrs(node, ['x1', 'y1', 'x2', 'y2']));
    const allPaths = [...svg.querySelectorAll('path')].map(node => node.getAttribute('d'));
    const readouts = Object.fromEntries([...details.querySelectorAll('[data-ascent-acceleration-value]')].map(node => [node.getAttribute('data-ascent-acceleration-value'), node.textContent]));
    return { sample, time: Number(main.dataset.ascentTime), mainWidth: main.width / 2, open: details.open, data: { ...details.dataset },
      model: P.ascentAcceleration(sample), geometry: P.ascentAccelerationGeometry(sample), vectors, readouts, textBounds, domBounds, allLines, allPaths,
      diagram: { viewBox: svg.getAttribute('viewBox'), preserveAspectRatio: svg.getAttribute('preserveAspectRatio'), describedBy: svg.getAttribute('aria-describedby'),
        label: svg.getAttribute('aria-label'), box: { left: box.left, right: box.right, width: box.width, height: box.height },
        matrix: { a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d }, text: svg.textContent },
      detailsBox: { left: details.getBoundingClientRect().left, right: details.getBoundingClientRect().right }, viewport: innerWidth };
  });
}
function check(row: any) {
  const model = expected(row.sample); expect(row.open).toBe(true);
  expect(Number(row.data.accelerationTime)).toBeCloseTo(row.time, 10);
  expect(row.data.accelerationEngine).toBe(model.engineVisible ? 'on' : 'off');
  expect(Number(row.data.accelerationMass)).toBeCloseTo(row.sample.mass, 10);
  expect(Number(row.data.accelerationRadius)).toBeCloseTo(model.radius, 10);
  expect(Number(row.data.accelerationRadialRate)).toBeCloseTo(model.radialSpeedRate, 10);
  expect(Number(row.data.accelerationTangentialRate)).toBeCloseTo(model.tangentialSpeedRate, 10);
  expect(Number(row.data.accelerationScale)).toBe(20);
  expect(row.geometry.view).toBe('local-acceleration');
  for (const [key, value] of Object.entries({ width: 600, height: 320, cx: 300, cy: 160, scale: 20 })) expect(row.geometry[key]).toBe(value);
  expect(row.model.engineVisible).toBe(model.engineVisible);
  for (const key of ['radius', 'engineAcceleration', 'gravityMagnitude', 'properLoadG', 'basisRotationRate', 'curvatureRadial', 'curvatureTangential', 'radialSpeedRate', 'tangentialSpeedRate']) {
    expect(row.model[key], key).toBeCloseTo((model as any)[key], 10); expect(row.geometry.model[key], key).toBeCloseTo((model as any)[key], 10);
  }
  for (const key of ['engine', 'gravity', 'net']) {
    const v = (model as any)[key], a = arrow(v), actual = row.vectors[key], geometry = row.geometry.vectors[key];
    for (const field of ['x', 'y', 'magnitude', 'forceMagnitude']) {
      expect(row.model[key][field], key + ':' + field).toBeCloseTo(v[field], 10);
      expect(Number(actual['data-' + (field === 'forceMagnitude' ? 'force-magnitude' : field)]), key + ':' + field).toBeCloseTo(v[field], 10);
      expect(geometry[field], key + ':' + field).toBeCloseTo(v[field], 10);
    }
    expect(actual.visibility).toBe(a.visible ? 'visible' : 'hidden'); expect(geometry.visible).toBe(a.visible);
    for (const [field, value] of Object.entries({ x1: a.startX, y1: a.startY, x2: a.endX, y2: a.endY })) expect(Number(actual.line[field]), key + ':' + field).toBeCloseTo(value, 10);
    expect(actual.points.length, key + ' head').toBe(a.points.length);
    for (let index = 0; index < a.points.length; index++) for (let coordinate = 0; coordinate < 2; coordinate++) expect(actual.points[index][coordinate]).toBeCloseTo(a.points[index][coordinate], 10);
    expect(Math.hypot(Number(actual.line.x2) - Number(actual.line.x1), Number(actual.line.y2) - Number(actual.line.y1))).toBeCloseTo(v.magnitude * 20, 10);
  }
  expect(row.diagram.viewBox).toBe('0 0 600 320'); expect(row.diagram.preserveAspectRatio).toBe('xMidYMid meet');
  expect(row.diagram.describedBy).toBe('mm-ascent-acceleration-note'); expect(row.diagram.label).toMatch(/acceleration/i);
  expect(row.diagram.box.width).toBeGreaterThan(200); expect(row.diagram.box.right).toBeLessThanOrEqual(row.viewport + 0.5);
  expect(row.diagram.matrix.a).toBeCloseTo(row.diagram.matrix.d, 10); expect(row.diagram.matrix.b).toBe(0); expect(row.diagram.matrix.c).toBe(0);
  expect(row.allPaths).toContain('M470 274V282M470 278H510M510 274V282');
  const verticalGrid = row.allLines.filter((line: any) => Number(line.x1) === Number(line.x2) && Number(line.y1) === 0 && Number(line.y2) === 320).map((line: any) => Number(line.x1));
  const horizontalGrid = row.allLines.filter((line: any) => Number(line.y1) === Number(line.y2) && Number(line.x1) === 140 && Number(line.x2) === 460).map((line: any) => Number(line.y1));
  for (let tick = 0; tick <= 8; tick++) { expect(verticalGrid).toContain(140 + tick * 40); expect(horizontalGrid).toContain(tick * 40); }
  expect(row.diagram.text).toMatch(/2\s*m\/s²/);
  expect(row.textBounds.length).toBeGreaterThan(0);
  for (const text of row.textBounds) {
    expect(text.x, text.text).toBeGreaterThanOrEqual(-0.5); expect(text.x + text.width, text.text).toBeLessThanOrEqual(600.5);
    expect(text.y, text.text).toBeGreaterThanOrEqual(-0.5); expect(text.y + text.height, text.text).toBeLessThanOrEqual(320.5);
  }
  for (const text of row.domBounds) { expect(text.left, text.text).toBeGreaterThanOrEqual(row.detailsBox.left - 1); expect(text.right, text.text).toBeLessThanOrEqual(row.detailsBox.right + 1); }
  for (const key of ['engine', 'gravity', 'net', 'up', 'right', 'radialRate', 'tangentialRate']) expect(row.readouts[key]).toMatch(/m\/s²/);
  const numeric = (key: string) => Number(row.readouts[key].match(/[+-]?\d+(?:\.\d+)?/)?.[0]);
  const expectedMetrics: any = { engine: model.engineAcceleration, gravity: model.gravityMagnitude, net: model.net.magnitude,
    up: model.net.y, right: model.net.x, radialRate: model.radialSpeedRate, tangentialRate: model.tangentialSpeedRate, load: model.properLoadG, time: row.time };
  for (const [key, value] of Object.entries(expectedMetrics)) expect(Math.abs(numeric(key) - Number(value)), key).toBeLessThanOrEqual(key === 'load' ? 0.00051 : key === 'time' ? 0.051 : 0.0051);
  for (const key of ['engine', 'gravity', 'net']) {
    expect(row.readouts[key]).toMatch(/kN/); const force = Number(row.readouts[key].match(/([+-]?\d+(?:\.\d+)?)\s*kN/)?.[1]);
    expect(Math.abs(force - (model as any)[key].forceMagnitude / 1000), key + ' force').toBeLessThanOrEqual(0.0051);
  }
  expect(row.readouts.load).toMatch(/g/); expect(row.readouts.time).toMatch(/s/);
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-ascent-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  await info.attach(name, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' }); expect(violations).toEqual([]);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('measured ascent acceleration resolves fixed thrust, inverse square gravity and inertial net vectors without altering saved flight', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  const details = page.locator(INSPECTOR), toggle = page.locator(TOGGLE), rows: any[] = [], unchanged: any[] = [];
  await expect(details).toHaveJSProperty('open', false); await expect(toggle).toHaveText('Explore ascent forces'); await expect(page.locator(DIAGRAM)).toBeHidden();
  const initial = await saved(page), initialPixels = await pixels(page), storageKeys = await storage(page);
  await toggle.click(); await expect(details).toHaveJSProperty('open', true);
  await expect.poll(() => details.getAttribute('data-acceleration-time')).not.toBeNull();
  expect(await saved(page)).toEqual(initial); expect(await pixels(page)).toBe(initialPixels); expect(await storage(page)).toEqual(storageKeys);
  unchanged.push({ action: 'open by click', time: initial.ascentRun.time, pixels: initialPixels, savedKeys: Object.keys(initial).sort(), storageKeys });
  await toggle.focus(); await page.keyboard.press('Space'); await expect(details).toHaveJSProperty('open', false);
  expect(await saved(page)).toEqual(initial); expect(await pixels(page)).toBe(initialPixels);
  await page.keyboard.press('Enter'); await expect(details).toHaveJSProperty('open', true);
  expect(await saved(page)).toEqual(initial); expect(await pixels(page)).toBe(initialPixels);
  await expect(page.locator('#mm-ascent-acceleration-note')).toContainText(/inertial/i);
  await expect(details).toContainText(/rotat/i);
  await expect(page.locator('#mm-ascent-acceleration-note')).toContainText(/cutoff|engine off/i);
  for (const time of [0, 120, 300]) {
    await seek(page, time); const row = await measured(page); check(row); rows.push(row);
    expect(row.mainWidth).toBe(986); expect((await saved(page)).missionXP).toBe(0);
    await capture(page, info, 'acceleration-' + (time === 0 ? 'liftoff' : time + 's') + '-1100');
  }
  expect(rows[1].sample.mass).toBeLessThan(rows[0].sample.mass); expect(rows[2].sample.mass).toBeLessThan(rows[1].sample.mass);
  expect(rows[2].model.engineAcceleration).toBeGreaterThan(rows[1].model.engineAcceleration); expect(rows[1].model.engineAcceleration).toBeGreaterThan(rows[0].model.engineAcceleration);
  expect(rows[1].sample.thrust).toBe(rows[0].sample.thrust); expect(rows[2].sample.thrust).toBe(rows[0].sample.thrust);
  expect(Math.abs(rows[2].model.radialSpeedRate - rows[2].model.net.y)).toBeGreaterThan(0.1);
  const paused = await saved(page), pausedPixels = await pixels(page); await page.waitForTimeout(250);
  expect(await saved(page)).toEqual(paused); expect(await pixels(page)).toBe(pausedPixels);
  await toggle.click(); await expect(details).toHaveJSProperty('open', false);
  expect(await saved(page)).toEqual(paused); expect(await pixels(page)).toBe(pausedPixels);
  await toggle.click(); await expect(details).toHaveJSProperty('open', true); expect(await saved(page)).toEqual(paused); expect(await pixels(page)).toBe(pausedPixels);
  unchanged.push({ action: 'close and reopen while paused', time: paused.ascentRun.time, pixels: pausedPixels });
  await page.locator('[data-ascent-complete-review]').click(); await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-engine', 'off');
  const cutoff = await measured(page); check(cutoff); rows.push(cutoff);
  expect(cutoff.model.engineAcceleration).toBe(0); expect(cutoff.model.properLoadG).toBe(0); expect(cutoff.model.gravityMagnitude).toBeGreaterThan(1);
  expect(cutoff.vectors.engine.visibility).toBe('hidden'); expect(cutoff.vectors.gravity.visibility).toBe('visible'); expect(cutoff.vectors.net.visibility).toBe('visible');
  expect(cutoff.model.net.y).toBeCloseTo(-cutoff.model.gravityMagnitude, 12);
  const completed = await saved(page), receiptFlight = await flight(page), cutoffPixels = await pixels(page);
  expect(completed.ascentRun.recorded).toBe(true); expect(completed.ascentResult.outcome).toBe('orbit'); expect(completed.missionXP).toBe(0);
  await capture(page, info, 'acceleration-cutoff-1100'); await accessibility(page, info, 'acceleration-a11y-1100');
  await page.locator('[data-ascent-view-control]').selectOption('physical'); await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-view', 'physical');
  expect(await flight(page)).toEqual(receiptFlight); const physical = await measured(page); check(physical); expect(physical.vectors).toEqual(cutoff.vectors);
  await page.locator('[data-ascent-view-control]').selectOption('surface'); await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-view', 'surface');
  expect(await flight(page)).toEqual(receiptFlight); expect(await pixels(page)).toBe(cutoffPixels);
  await page.setViewportSize({ width: 320, height: 900 }); await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBe(282);
  const phoneCutoff = await measured(page); check(phoneCutoff); rows.push(phoneCutoff); expect(await flight(page)).toEqual(receiptFlight);
  expect(phoneCutoff.diagram.box.width).toBeLessThanOrEqual(282); await capture(page, info, 'acceleration-cutoff-320');
  await accessibility(page, info, 'acceleration-a11y-320'); await seek(page, 120);
  const phoneReplay = await measured(page); check(phoneReplay); rows.push(phoneReplay); await capture(page, info, 'acceleration-120s-320');
  await capture(page, info, 'acceleration-workspace-open-320', true);
  const replay = await saved(page), replayPixels = await pixels(page);
  expect(replay.ascentResult).toEqual(completed.ascentResult); expect(replay.ascentRun.recorded).toBe(true);
  expect(replay.missionXP).toBe(completed.missionXP); expect(replay.earnedBadges).toEqual(completed.earnedBadges); expect(replay.missionLog).toEqual(completed.missionLog);
  await toggle.focus(); await page.keyboard.press('Space'); await expect(details).toHaveJSProperty('open', false);
  await capture(page, info, 'acceleration-closed-320'); expect(await saved(page)).toEqual(replay); expect(await pixels(page)).toBe(replayPixels);
  await mount(page, { moonMission: replay }); await expect(details).toHaveJSProperty('open', false);
  expect(await saved(page)).toEqual(replay); expect(await pixels(page)).toBe(replayPixels); expect(await storage(page)).toEqual(storageKeys);
  await toggle.focus(); await page.keyboard.press('Enter'); await expect(details).toHaveJSProperty('open', true);
  await expect.poll(async () => Number(await details.getAttribute('data-acceleration-time'))).toBeCloseTo(120, 6);
  const reloaded = await measured(page); check(reloaded); rows.push(reloaded); expect(reloaded.vectors).toEqual(phoneReplay.vectors);
  expect(await saved(page)).toEqual(replay); expect(await pixels(page)).toBe(replayPixels);
  unchanged.push({ action: 'phone close, reload and keyboard reopen', time: replay.ascentRun.time, pixels: replayPixels, storageKeys: await storage(page) });
  await page.locator('[data-ascent-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-ascent-time'))).toBeCloseTo(120.1, 6);
  await expect.poll(async () => Number(await details.getAttribute('data-acceleration-time'))).toBeCloseTo(120.1, 6); check(await measured(page));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); expect(overflow).toBe(false);
  expect(errors).toEqual([]); await writeFile(join(REPORT, 'acceleration-measured.json'), JSON.stringify({ rows, unchanged, errors, overflow }, null, 2));
});
