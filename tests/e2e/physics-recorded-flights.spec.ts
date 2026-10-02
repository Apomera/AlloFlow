import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const sourceHashAtLoad = digest(readFileSync('stem_lab/stem_tool_physics.js'));
import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1100, height: 900, layout: 'document', appStyles: true });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

type AnalysisView = 'motion' | 'forces' | 'energy' | 'data';

async function selectAnalysisView(page: Page, view: AnalysisView) {
  const tab = page.locator('[data-physics-analysis-tab="' + view + '"]');
  if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-physics-analysis-panel="' + view + '"]')).toBeVisible();
}

async function mount(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__historyTick = () => {
      now += 1000 / 60;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    };
    w.__historyCanvasText = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth?) {
      if (this.canvas.id === 'physicsCanvas') w.__historyCanvasText.push(String(text));
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    document.getElementById('wrap')!.style.width = '100%';
    const w = window as any; w.__historyCsv = [];
    w.StemLab.writeClipboard = (text: string) => { w.__historyCsv.push(text); return Promise.resolve(); };
  });
}
async function patch(page: Page, next: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({ ...prev, physics: { ...prev.physics, ...p } })), next);
  await page.waitForTimeout(40);
}
async function redraw(page: Page) {
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    w.__historyCanvasText = []; cv._physScheduleFrame(); w.__historyTick();
  });
}
async function launch(page: Page, airResist: boolean, count: number, settings = {}) {
  await patch(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist, simSpeed: 2, showGraphs: true, showFlightData: true, showEnergy: true, ...settings });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 10000) w.__historyTick();
    if (cv._launched) throw Error('History fixture did not land');
  });
  await page.waitForFunction(n => (window as any).__toolData.physics.runCount === n, count, { polling: 20 });
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    return { ball: cv._ball, trails: cv._trails.map((t: any) => ({ points: [...t], parameters: t.parameters, run: t.run, apex: t.apex, modelVersion: t.modelVersion })),
      log: w.__toolData.physics.runLog, lastFlight: w.__toolData.physics.lastFlight };
  });
}
async function copyCsv(page: Page) {
  const previousView = await page.locator('[data-physics-analysis-workspace]').getAttribute('data-physics-analysis-view') as AnalysisView;
  await selectAnalysisView(page, 'data');
  try {
    const before = await page.evaluate(() => (window as any).__historyCsv.length);
    await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__historyCsv.length)).toBe(before + 1);
    return await page.evaluate(() => (window as any).__historyCsv.at(-1) as string);
  } finally {
    await selectAnalysisView(page, previousView);
  }
}
async function assertRun(page: Page, run: number, landmarks = true) {
  await redraw(page);
  const state = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, s = cv._inspection.snapshot, t = cv._inspection.trail;
    return { s, recorded: t[s.index], marker: cv._visualInspection, text: (window as any).__historyCanvasText,
      apex: t.apex, end: t.at(-1), retained: cv._trails.includes(t), simSpeed: cv.dataset.simSpeed };
  });
  expect(state.retained).toBe(true);
  expect(state.s.run).toBe(run);
  expect(state.simSpeed).toBe('0');
  expect(state.s).toMatchObject({ t: state.recorded.t, x: state.recorded.mX, y: state.recorded.mY, vx: state.recorded.mVx, vy: state.recorded.mVy });
  expect(state.marker).toMatchObject({ run, index: state.s.index, t: state.s.t });
  if (landmarks) {
    expect(state.text).toContain(`Landed ${state.end.mX.toFixed(1)} m`);
    if (state.apex?.tSec > .001) expect(state.text.some((t: string) => t.includes((state.apex.mY !== 0 && Math.abs(state.apex.mY) < .01 ? state.apex.mY.toPrecision(3) : state.apex.mY.toFixed(2)) + ' m') && t.includes('APEX'))).toBe(true);
  }
  await expect(page.locator('[data-physics-graph-flight]')).toHaveAttribute('data-physics-graph-flight', String(run));
  await expect(page.locator('[data-physics-flight-summary]')).toHaveAttribute('data-run', String(run));
  for (const field of ['vx', 'vy']) {
    await expect(page.locator(`[data-physics-graph-marker="${field}"]`)).toHaveAttribute('data-sample-index', String(state.s.index));
    await expect(page.locator(`[data-physics-graph-marker="${field}"]`)).toHaveAttribute('data-value', String(state.s[field]));
  }
  await expect(page.locator('[data-physics-sample-inspector]')).toContainText('Run ' + run);
  await expect(page.locator('[data-physics-plot-key]')).toContainText('Selected flight speed');
  return state;
}

async function remount(page: Page, physics: any) {
  await page.evaluate(seed => {
    const w = window as any;
    w.__destroy();
    w.__mount({ physics: seed });
    document.getElementById('wrap')!.style.width = '100%';
  }, physics);
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await redraw(page);
}

async function durableState(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.physics)));
}

async function originalRecordings(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    return cv._trails.map((trail: any) => ({
      points: [...trail], run: trail.run, parameters: trail.parameters,
      modelVersion: trail.modelVersion, apex: trail.apex,
      prediction: trail.prediction, mission: trail.mission,
      samples: [0, w.StemLab._physics.recordedMoments(trail).apexIndex, trail.length - 1]
        .map(index => w.StemLab._physics.inspectSample(trail, index))
    }));
  });
}

test('two short flights before a render retain distinct completed IDs and original recordings', async ({ page }) => {
  await mount(page);
  await patch(page, { angle: 5, velocity: 5, gravity: 25, launchHeight: 0, airResist: false, simSpeed: 2 });
  const landed = await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    const button = document.querySelector('[data-physics-launch]') as HTMLButtonElement;
    const initialNext = cv.dataset.runNext;
    for (let flight = 0; flight < 2; flight++) {
      button.click();
      let ticks = 0;
      while (cv._launched && ticks++ < 100) w.__historyTick();
      if (cv._launched) throw Error('Short flight did not land');
    }
    return { initialNext, unchangedNext: cv.dataset.runNext, runs: cv._trails.map((trail: any) => trail.run) };
  });
  expect(landed.initialNext).toBe(landed.unchangedNext);
  expect(landed.runs).toEqual([1, 2]);
  await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 2, null, { polling: 20 });
  const saved = await durableState(page);
  expect(saved.runLog.map((row: any) => row.n)).toEqual([1, 2]);
  expect(saved.recordedFlights.map((record: any) => record.run)).toEqual([1, 2]);
  const original = await originalRecordings(page);
  await remount(page, saved);
  expect(await originalRecordings(page)).toEqual(original);
});

test('completed vacuum and drag recordings reopen exact points, apex, readings, and full CSV', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await launch(page, false, 1);
  await launch(page, true, 2);
  const originals = await originalRecordings(page);
  const saved = await durableState(page);
  expect(saved.recordedFlights).toHaveLength(2);
  const csv: string[] = [];
  for (const index of [0, 1]) {
    await page.locator('[data-physics-history-select]').selectOption(String(index));
    csv.push(await copyCsv(page));
  }
  saved.angle = 80; saved.velocity = 5; saved.mass = 9; saved.launchHeight = 30;
  saved.runLog = []; saved.runCount = 0; saved.simSpeed = 0;
  await remount(page, saved);
  expect(await originalRecordings(page)).toEqual(originals);
  await expect(page.locator('[data-physics-history-select] option')).toHaveCount(2);
  await expect(page.locator('[data-physics-history-recording]')).toHaveAttribute('data-physics-history-recording', 'saved');
  for (const index of [0, 1]) {
    await page.locator('[data-physics-history-select]').selectOption(String(index));
    expect(await copyCsv(page)).toBe(csv[index]);
    await selectAnalysisView(page, 'motion');
    await page.locator('[data-physics-sample-jump="highest"]').click();
    const selected = await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._inspection.snapshot);
    expect(selected).toEqual(originals[index].samples[1]);
    await selectAnalysisView(page, 'forces');
    await expect(page.locator('[data-physics-force-component="net-y"]')).toHaveAttribute('data-value', String(selected.fy));
    await selectAnalysisView(page, 'energy');
    await expect(page.locator('[data-physics-energy-value="ke"]')).toHaveAttribute('data-value', String(selected.ke));
  }
  const stationary = await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    return { launched: cv._launched, runs: w.StemLab._physics.normalizeState(w.__toolData.physics).runCount,
      launches: w.__toolData.physics.launchCount, hits: w.__toolData.physics.targetsHit, log: w.__toolData.physics.runLog };
  });
  expect(stationary).toEqual({ launched: false, runs: 2, launches: saved.launchCount, hits: saved.targetsHit, log: [] });
  await launch(page, false, 3, { angle: 5, velocity: 5, gravity: 25, launchHeight: 0 });
  expect((await durableState(page)).recordedFlights.map((record: any) => record.run)).toEqual([1, 2, 3]);
  expect(errors).toEqual([]);
});

test('unfinished flights stay within the visit; Clear Log retains recordings and Clear Trails deletes them', async ({ page }) => {
  await mount(page);
  await patch(page, { simSpeed: 0, showGraphs: true, showFlightData: true });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._launched)).toBe(true);
  await expect(page.locator('[data-physics-history-recording]')).toContainText('Unfinished flight');
  const unfinished = await durableState(page);
  expect(unfinished.recordedFlights || []).toEqual([]);
  await remount(page, unfinished);
  await expect(page.locator('[data-physics-flight-history]')).toHaveCount(0);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._launched)).toBe(false);
  await launch(page, false, 1);
  await launch(page, true, 2);
  const originals = await originalRecordings(page);
  await page.getByRole('button', { name: 'Clear the experiment log', exact: true }).click();
  const clearedLog = await durableState(page);
  expect(clearedLog.runLog).toEqual([]);
  expect(clearedLog.recordedFlights).toHaveLength(2);
  await remount(page, clearedLog);
  expect(await originalRecordings(page)).toEqual(originals);
  await page.getByRole('button', { name: 'Clear all trajectory trails', exact: true }).click();
  const cleared = await durableState(page);
  expect(cleared.recordedFlights).toEqual([]);
  expect(cleared.lastFlight).toBeNull();
  expect(cleared.runCount).toBe(2);
  await remount(page, cleared);
  await expect(page.locator('[data-physics-flight-history]')).toHaveCount(0);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._trails)).toEqual([]);
});

test('late save loading keeps the empty controller; malformed and older records leave summaries intact', async ({ page }) => {
  await mount(page);
  await launch(page, false, 1);
  await launch(page, true, 2);
  const originals = await originalRecordings(page), saved = await durableState(page);
  await page.getByRole('button', { name: 'Clear all trajectory trails', exact: true }).click();
  await page.evaluate(() => {
    const w = window as any; w.__recordingController = (document.getElementById('physicsCanvas') as any)._launch;
  });
  await patch(page, { recordedFlights: saved.recordedFlights, showGraphs: true, showFlightData: true, simSpeed: 0 });
  await expect(page.locator('[data-physics-history-select] option')).toHaveCount(2);
  expect(await originalRecordings(page)).toEqual(originals);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._launch === (window as any).__recordingController)).toBe(true);
  const imported = JSON.parse(JSON.stringify(saved));
  imported.recordedFlights[0].points[1][0] = 0;
  await remount(page, imported);
  const retained = await originalRecordings(page);
  expect(retained).toEqual([originals[1]]);
  expect((await durableState(page)).runLog).toEqual(saved.runLog);
  await expect(page.locator('[data-physics-run-inspect="1"]')).toHaveCount(0);
  await expect(page.locator('[data-physics-run-inspect="2"]')).toHaveCount(1);
  const older = JSON.parse(JSON.stringify(saved));
  older.recordedFlights.forEach((record: any) => { record.modelVersion = 'projectile-v2'; });
  await remount(page, older);
  await expect(page.locator('[data-physics-flight-history]')).toHaveCount(0);
  expect((await durableState(page)).runLog).toEqual(saved.runLog);
  await expect(page.locator('[data-physics-run-inspect]')).toHaveCount(0);
});

test('clearing at impact cannot reinsert a queued recording or award a queued target hit', async ({ page }) => {
  await mount(page);
  await patch(page, { angle: 45, velocity: Math.sqrt(50 * 9.8), gravity: 9.8, mass: 1,
    launchHeight: 0, airResist: false, simSpeed: 1, targetMode: true, targetRound: 1,
    targetList: [{ id: 0, x: 50, y: 0, radius: 10, destroyed: false }], targetAttempts: 0, targetScore: 0, targetsHit: 0 });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 10000) w.__historyTick();
    if (cv._launched) throw Error('The clear-race fixture did not land');
    (document.querySelector('[data-physics-clear]') as HTMLButtonElement).click();
  });
  await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 1, null, { polling: 20 });
  const after = await durableState(page);
  expect(after.recordedFlights).toEqual([]);
  expect(after.lastFlight).toBeNull();
  expect(after.runLog).toHaveLength(1);
  expect(after.targetAttempts).toBe(0); expect(after.targetScore).toBe(0); expect(after.targetsHit).toBe(0);
  await remount(page, after);
  await expect(page.locator('[data-physics-flight-history]')).toHaveCount(0);
});

test('restored flight details stay readable across desktop, phone, dark, and contrast layouts', async ({ page }) => {
  test.setTimeout(600_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await launch(page, false, 1);
  await launch(page, true, 2);
  const originals = await originalRecordings(page), saved = await durableState(page);
  const configurations: any[] = [];
  const report = 'reports/physics-recorded-flights-2026-10-02';
  mkdirSync(report, { recursive: true });
  for (const theme of ['default', 'dark', 'contrast']) for (const width of [1100, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await remount(page, saved);
    await page.evaluate(name => {
      const w = window as any; w.__ctx.isDark = name === 'dark'; w.__ctx.isContrast = name === 'contrast'; w.__rerender();
    }, theme);
    await expect(page.locator('#physics-fs-outer')).toHaveAttribute('data-physics-theme', theme === 'default' ? 'light' : theme);
    await page.locator('[data-physics-history-select]').focus();
    await expect(page.locator('[data-physics-history-select]')).toBeFocused();
    expect(await originalRecordings(page)).toEqual(originals);
    const metrics = await page.locator('[data-physics-flight-history]').evaluate(root => {
      const rgb = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
      const luminance = (color: number[]) => color.slice(0, 3).reduce((sum, value, index) => {
        const s = value / 255; return sum + [0.2126, 0.7152, 0.0722][index] * (s <= .04045 ? s / 12.92 : Math.pow((s + .055) / 1.055, 2.4));
      }, 0);
      const background = (element: Element) => {
        const layers: number[][] = [];
        for (let node: Element | null = element; node; node = node.parentElement) {
          const color = rgb(getComputedStyle(node).backgroundColor);
          const alpha = color.length > 3 ? color[3] : 1;
          if (alpha > 0) layers.push([color[0], color[1], color[2], alpha]);
          if (alpha === 1) break;
        }
        return layers.reverse().reduce((base, color) => color.slice(0, 3).map((value, index) => value * color[3] + base[index] * (1 - color[3])), [255, 255, 255]);
      };
      const texts = [...root.querySelectorAll('label, strong, span, p, button, select')].filter(element => element.getBoundingClientRect().width > 0);
      const contrast = texts.map(element => {
        const ink = luminance(rgb(getComputedStyle(element).color)), paper = luminance(background(element));
        return (Math.max(ink, paper) + .05) / (Math.min(ink, paper) + .05);
      });
      const targets = [...root.querySelectorAll('button, select')].map(element => {
        const box = element.getBoundingClientRect(); return { width: box.width, height: box.height };
      });
      const box = root.getBoundingClientRect();
      return { cardWidth: box.width, pageOverflow: document.documentElement.scrollWidth - innerWidth,
        overflow: root.scrollWidth - root.clientWidth, minFont: Math.min(...texts.map(element => parseFloat(getComputedStyle(element).fontSize))),
        minContrast: Math.min(...contrast), targets,
        kept: root.querySelector('[data-physics-history-recording]')?.textContent,
        focused: document.activeElement === root.querySelector('select') };
    });
    expect(metrics.pageOverflow).toBeLessThanOrEqual(1); expect(metrics.overflow).toBeLessThanOrEqual(1);
    expect(metrics.minFont).toBeGreaterThanOrEqual(12);
    expect(metrics.minContrast).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
    expect(metrics.targets.every(target => target.width >= 44 && target.height >= 44)).toBe(true);
    expect(metrics.focused).toBe(true); expect(metrics.kept).toContain('original points');
    const screenshot = 'recordings-' + theme + '-' + width + '.png';
    await page.locator('[data-physics-flight-history]').screenshot({ path: report + '/' + screenshot, animations: 'disabled' });
    configurations.push({ theme, width, ...metrics, screenshot });
  }
  expect(errors).toEqual([]);
  const sourceSha256 = digest(readFileSync('stem_lab/stem_tool_physics.js'));
  const mirrorSha256 = digest(readFileSync('desktop/web-app/public/stem_lab/stem_tool_physics.js'));
  expect(sourceSha256).toBe(sourceHashAtLoad); expect(mirrorSha256).toBe(sourceSha256);
  writeFileSync(report + '/visual-results.json', JSON.stringify({ passed: true, sourceSha256, mirrorSha256,
    sourceUnchanged: true, configurations, originalFlights: originals.map((flight: any) => ({ run: flight.run, samples: flight.points.length })), errors }, null, 2) + '\n');
});
