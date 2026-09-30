import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});

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
    w.__apexCanvasText = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth?) {
      if (this.canvas.id === 'physicsCanvas') w.__apexCanvasText.push(String(text));
      if (maxWidth === undefined) fillText.call(this, text, x, y);
      else fillText.call(this, text, x, y, maxWidth);
    };
    w.__tickApexPhysics = (ms: number) => {
      now += ms;
      const pending = [...frames.values()]; frames.clear();
      pending.forEach(fn => fn(now));
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const w = window as any;
    w.__apexCsvCopies = [];
    w.StemLab.writeClipboard = (text: string) => {
      w.__apexCsvCopies.push(text);
      return Promise.resolve();
    };
  });
}

async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({
    ...prev, physics: { ...prev.physics, ...p },
  })), patch);
  await page.waitForTimeout(40);
}

async function redraw(page: Page) {
  await page.evaluate(() => {
    (window as any).__apexCanvasText = [];
    (document.getElementById('physicsCanvas') as any)._physScheduleFrame();
    (window as any).__tickApexPhysics(1000 / 60);
  });
}

async function finish(page: Page, run = 1) {
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 10000) w.__tickApexPhysics(1000 / 60);
    if (cv._launched) throw new Error('The apex fixture did not land');
  });
  await page.waitForFunction(n => (window as any).__toolData.physics.runLog?.length === n, run, { polling: 20 });
  await setState(page, { simSpeed: 0 });
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    return {
      ball: cv._ball,
      trails: cv._trails.map((trail: any) => ({
        points: [...trail], parameters: trail.parameters,
        run: trail.run, apex: trail.apex, modelVersion: trail.modelVersion,
      })),
      records: w.__toolData.physics.runLog,
      lastFlight: w.__toolData.physics.lastFlight,
    };
  });
}

async function copyCsv(page: Page) {
  const before = await page.evaluate(() => (window as any).__apexCsvCopies.length);
  await page.getByRole('button', { name: 'Copy the flight data as CSV for a spreadsheet', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__apexCsvCopies.length)).toBe(before + 1);
  return page.evaluate(() => (window as any).__apexCsvCopies.at(-1) as string);
}

function canonicalApex(trail: any) {
  const matching = trail.points.map((point: any, index: number) => ({ point, index })).filter(({ point }: any) =>
    point.t === trail.apex.tSec && point.mX === trail.apex.mX && point.mY === trail.apex.mY &&
    point.mVx === trail.apex.vx && point.mVy === 0);
  expect(matching).toHaveLength(1);
  const times = trail.points.map((point: any) => point.t);
  expect(new Set(times).size).toBe(times.length);
  for (let index = 1; index < times.length; index++) expect(times[index]).toBeGreaterThan(times[index - 1]);
  return matching[0].index as number;
}

async function assertSelected(page: Page, index: number, phase: string, checkTimeline = true) {
  await expect(page.locator('[data-physics-sample-slider]')).toHaveValue(String(index));
  await redraw(page);
  const result = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    const sample = cv._inspection.snapshot;
    return { sample, recorded: cv._inspection.trail[sample.index], marker: cv._visualInspection };
  });
  expect(result.sample).toMatchObject({
    index, t: result.recorded.t, x: result.recorded.mX, y: result.recorded.mY,
    vx: result.recorded.mVx, vy: result.recorded.mVy, phase, apex: phase === 'apex', impact: phase === 'impact',
  });
  expect(result.marker).toMatchObject({ index, t: result.recorded.t, run: result.sample.run });
  await expect(page.locator('[data-physics-motion-phase]')).toHaveAttribute('data-physics-motion-phase', phase);
  const label = page.locator('[data-physics-phase-label]');
  await expect(label).toBeVisible();
  for (const [key, unit] of [['vy', 'm/s'], ['ay', 'm/s²']] as const) {
    const value = page.locator(`[data-physics-phase-value="${key}"]`);
    await expect(value).toBeVisible();
    await expect(value).toHaveAttribute('data-value', String(result.sample[key]));
    const formatted = result.sample[key] !== 0 && Math.abs(result.sample[key]) < .01
      ? result.sample[key].toPrecision(3) : result.sample[key].toFixed(2);
    await expect(value).toHaveText(formatted + ' ' + unit);
  }
  const status = page.locator('[data-physics-sample-status]');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
  await expect(status).toContainText('Sample ' + (index + 1));
  await expect(status).toContainText(result.sample.t.toFixed(3) + ' s');
  await expect(status).toContainText(await label.innerText());
  if (result.sample.run != null) await expect(status).toContainText('Run ' + result.sample.run);
  expect((await status.innerText()).length).toBeLessThan(200);
  await expect(status).not.toContainText(/kinetic|potential|force|energy/i);
  await expect(page.locator(`[data-physics-flight-table] tr[data-selected="true"] [data-physics-sample-index="${index}"]`)).toHaveCount(1);
  for (const field of ['vx', 'vy']) {
    const graph = page.locator(`[data-physics-graph-marker="${field}"]`);
    await expect(graph).toHaveAttribute('data-sample-index', String(index));
    await expect(graph).toHaveAttribute('data-time', String(result.sample.t));
    await expect(graph).toHaveAttribute('data-value', String(result.sample[field]));
    expect(await graph.getAttribute('cx')).toBe(await page.locator(`[data-physics-graph-cursor="${field}"]`).getAttribute('x1'));
  }
  if (checkTimeline) {
    const cursor = page.locator('[data-physics-energy-cursor]');
    await expect(cursor).toHaveAttribute('data-sample-index', String(index));
    await expect(cursor).toHaveAttribute('data-time', String(result.sample.t));
    await expect(page.locator('[data-physics-energy-boundary="mechanical"]')).toHaveAttribute('data-value', String(result.sample.totalEnergy));
    await expect(page.locator('[data-physics-energy-boundary="ke"]')).toHaveAttribute('data-value', String(result.sample.ke));
  }
  return result.sample;
}

async function expectSelectionCleared(page: Page) {
  await expect(page.locator('[data-physics-sample-inspector]')).toHaveCount(0);
  await expect(page.locator('[data-physics-graph-marker]')).toHaveCount(0);
  await expect(page.locator('[data-physics-energy-cursor]')).toHaveCount(0);
  await redraw(page);
  expect(await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    return { selection: cv._inspection, marker: cv._visualInspection };
  })).toEqual({ selection: null, marker: null });
}

test('a flight shorter than one step records launch, exact apex, and impact with discrete keyboard landmarks', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await setState(page, {
    angle: 5, velocity: 5, gravity: 25, launchHeight: 0, mass: 2, airResist: false,
    simSpeed: 1, showFlightData: true, showGraphs: true, showEnergy: true,
  });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await finish(page);
  const before = await evidence(page), trail = before.trails[0];
  expect(trail.points).toHaveLength(3);
  expect(canonicalApex(trail)).toBe(1);
  const exported = (await copyCsv(page)).split('\n').slice(2).map(row => row.split(',').map(Number));
  expect(exported.map(row => row[0])).toEqual(trail.points.map((point: any) => point.t));
  expect(exported[1]).toEqual([trail.points[1].t, trail.points[1].mX, trail.points[1].mY, trail.points[1].mVx, 0, Math.hypot(trail.points[1].mVx, 0)]);
  expect(trail.points[0].t).toBe(0);
  expect(trail.points[2].t).toBeLessThan(.035);
  expect(trail.points[2].mY).toBe(0);
  await page.locator('[data-physics-inspect]').click();
  await assertSelected(page, 2, 'impact');
  await page.evaluate(() => { (window as any).__apexStatusNode = document.querySelector('[data-physics-sample-status]'); });
  for (const [landmark, index, phase] of [['launch', 0, 'rising'], ['apex', 1, 'apex'], ['impact', 2, 'impact']] as const) {
    const button = page.locator(`[data-physics-sample-landmark="${landmark}"]`);
    await expect(button).toContainText(trail.points[index].t.toFixed(3) + ' s');
    await button.focus();
    await button.press(index === 1 ? 'Space' : 'Enter');
    const selected = await assertSelected(page, index, phase);
    if (phase === 'apex') {
      expect(selected.y).toBeGreaterThan(0);
      expect(selected.y).toBeLessThan(.01);
      await expect(page.locator('[data-physics-measurement="y"] dd')).toHaveText(selected.y.toPrecision(3) + ' m');
      await expect(page.locator('[data-physics-flight-summary-value="height"]')).toHaveText(selected.y.toPrecision(3) + ' m');
      await expect(page.locator('[data-physics-flight-table] tr[data-selected="true"] td').nth(1)).toHaveText(selected.y.toPrecision(3));
      await setState(page, { showVectors: false });
      await redraw(page);
      expect(await page.evaluate(() => (window as any).__apexCanvasText)).toContain('y ' + selected.y.toPrecision(3) + ' m');

    }
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => (window as any).__apexStatusNode === document.querySelector('[data-physics-sample-status]'))).toBe(true);
  }
  await expect(page.locator('[data-physics-sample-landmark="apex"]')).toHaveAttribute('data-physics-sample-jump', 'highest');
  const slider = page.locator('[data-physics-sample-slider]');
  await slider.focus();
  await slider.press('Home');
  await assertSelected(page, 0, 'rising');
  await slider.press('ArrowRight');
  await assertSelected(page, 1, 'apex');
  await slider.press('End');
  await assertSelected(page, 2, 'impact');
  expect(await evidence(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test('vacuum and drag apex selections synchronize all recorded views and keep original evidence after controls change', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const csvByRun: string[] = [], apexByRun: number[] = [];
  for (const [run, drag] of [[1, false], [2, true]] as const) {
    await setState(page, {
      angle: 35, velocity: 35, gravity: 9.8, launchHeight: 10, mass: 2, airResist: drag,
      simSpeed: 1, showFlightData: true, showGraphs: true, showEnergy: true,
    });
    await page.getByRole('button', { name: 'Launch!', exact: true }).click();
    await finish(page, run);
    const before = await evidence(page), trail = before.trails[run - 1];
    expect(trail.points.length).toBeGreaterThan(80);
    const apexIndex = canonicalApex(trail); apexByRun.push(apexIndex);
    const csv = await copyCsv(page); csvByRun.push(csv);
    expect(csv.split('\n')).toHaveLength(trail.points.length + 2);
    await page.locator('[data-physics-inspect]').click();
    await page.locator('[data-physics-sample-landmark="apex"]').click();
    const selected = await assertSelected(page, apexIndex, 'apex');
    expect(selected).toMatchObject({
      t: trail.apex.tSec, x: trail.apex.mX, y: trail.apex.mY, vx: trail.apex.vx, vy: 0,
      parameters: { angle: 35, velocity: 35, gravity: 9.8, launchHeight: 10, mass: 2, airResist: drag },
    });
    expect(selected.ay).toBe(-9.8);
    await setState(page, { angle: 80, velocity: 5, gravity: 25, launchHeight: 30, mass: 9, airResist: !drag });
    await page.locator('[data-physics-sample-next]').click();
    await assertSelected(page, apexIndex + 1, 'falling');
    await page.locator('[data-physics-sample-prev]').click();
    await assertSelected(page, apexIndex, 'apex');
    await page.locator('[data-physics-sample-landmark="launch"]').click();
    await assertSelected(page, 0, 'rising');
    await page.locator('[data-physics-sample-landmark="impact"]').click();
    await assertSelected(page, trail.points.length - 1, 'impact');
    expect(await evidence(page)).toEqual(before);
    expect(await copyCsv(page)).toBe(csv);
  }
  const complete = await evidence(page);
  await page.locator('[data-physics-history-select]').selectOption('0');
  await page.locator('[data-physics-sample-landmark="apex"]').click();
  const older = await assertSelected(page, apexByRun[0], 'apex');
  expect(older.run).toBe(1);
  expect(older.parameters).toMatchObject({ angle: 35, velocity: 35, gravity: 9.8, launchHeight: 10, mass: 2, airResist: false });
  expect(older.ay).toBe(-9.8);
  await expect(page.locator('[data-physics-graph-flight]')).toHaveAttribute('data-physics-graph-flight', '1');
  expect(await copyCsv(page)).toBe(csvByRun[0]);
  await page.locator('[data-physics-history-select]').selectOption('1');
  await page.locator('[data-physics-sample-landmark="apex"]').click();
  expect((await assertSelected(page, apexByRun[1], 'apex')).parameters.airResist).toBe(true);
  expect(await copyCsv(page)).toBe(csvByRun[1]);
  expect(await evidence(page)).toEqual(complete);
  expect(errors).toEqual([]);
});

test('a paused horizontal launch stays a single level sample and reuses its launch time for the apex after stepping', async ({ page }) => {
  await mount(page);
  await setState(page, {
    angle: 0, velocity: 15, gravity: 9.8, launchHeight: 10, mass: 2, airResist: false,
    simSpeed: 0, showFlightData: true, showGraphs: true, showEnergy: true,
  });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await redraw(page);
  await page.locator('[data-physics-inspect]').click();
  await assertSelected(page, 0, 'level', false);
  const before = await evidence(page);
  expect(before.trails[0].points).toHaveLength(1);
  expect(before.ball.t).toBe(0);
  await expect(page.locator('[data-physics-sample-slider]')).toBeDisabled();
  await expect(page.locator('[data-physics-sample-landmark="latest"]')).toContainText('0.000 s');
  await page.locator('[data-physics-step]').click();
  await expectSelectionCleared(page);
  const stepped = await evidence(page);
  expect(stepped.trails[0].points).toHaveLength(2);
  expect(canonicalApex(stepped.trails[0])).toBe(0);
  expect(stepped.trails[0].points[0]).toEqual(before.trails[0].points[0]);
  await page.locator('[data-physics-inspect]').click();
  await assertSelected(page, 1, 'falling');
  await page.locator('[data-physics-sample-landmark="apex"]').click();
  await assertSelected(page, 0, 'apex');
  await page.locator('[data-physics-sample-landmark="latest"]').click();
  await assertSelected(page, 1, 'falling');
  await page.locator('[data-physics-playback-rate="1"]').click();
  await expectSelectionCleared(page);
});

test('legacy apex metadata keeps highest recorded point fallback without inventing a sample', async ({ page }) => {
  await mount(page);
  await setState(page, {
    angle: 35, velocity: 30, gravity: 9.8, launchHeight: 12, mass: 2, airResist: true,
    simSpeed: 1, showFlightData: true, showGraphs: true, showEnergy: true,
  });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await finish(page);
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, original = cv._trails[0];
    const legacy = original.filter((point: any) => point.t !== original.apex.tSec);
    Object.keys(original).filter(key => !/^\d+$/.test(key)).forEach(key => { (legacy as any)[key] = original[key]; });
    cv._trails[0] = legacy;
    (window as any).__rerender();
  });
  const before = await evidence(page), trail = before.trails[0], csv = await copyCsv(page);
  expect(trail.points.some((point: any) => point.t === trail.apex.tSec)).toBe(false);
  const highest = trail.points.reduce((best: number, point: any, index: number) => point.mY > trail.points[best].mY ? index : best, 0);
  await page.locator('[data-physics-inspect]').click();
  await expect(page.locator('[data-physics-sample-landmark="apex"]')).toHaveCount(0);
  const button = page.locator('[data-physics-sample-jump="highest"]');
  await expect(button).toContainText('Highest recorded point');
  await expect(button).toContainText(trail.points[highest].t.toFixed(3) + ' s');
  await button.click();
  const phase = trail.points[highest].mVy > 0 ? 'rising' : trail.points[highest].mVy < 0 ? 'falling' : 'level';
  expect((await assertSelected(page, highest, phase)).apex).toBe(false);
  expect(await evidence(page)).toEqual(before);
  expect(await copyCsv(page)).toBe(csv);
});

test('phase and landmarks remain readable and operable across nine width and theme layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await page.evaluate(() => {
    const wrap = document.getElementById('wrap') as HTMLElement;
    wrap.style.width = '100%';
    const main = document.createElement('main');
    wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div');
    main.insertBefore(card, wrap); card.appendChild(wrap);
    (window as any).__setApexTheme = (theme: string) => {
      const ctx = (window as any).__ctx;
      ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      (window as any).__rerender();
    };
  });
  await setState(page, {
    angle: 35, velocity: 25, gravity: 9.8, launchHeight: 12, mass: 2, airResist: true,
    simSpeed: 1, showFlightData: true, showGraphs: true, showEnergy: true,
  });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await finish(page);
  await page.locator('[data-physics-inspect]').click();
  await page.locator('[data-physics-sample-landmark="apex"]').click();
  await page.locator('[data-physics-sample-forces] summary').click();
  for (const width of [1100, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['default', 'dark', 'contrast']) {
      await page.evaluate(t => (window as any).__setApexTheme(t), theme);
      await expect(page.locator('#physics-fs-outer')).toHaveAttribute('data-physics-theme', theme === 'default' ? 'light' : theme);
      await redraw(page);
      const layout = await page.evaluate(() => {
        const panel = document.querySelector('[data-physics-sample-inspector]')!;
        const visible = (node: Element) => node.getClientRects().length > 0;
        const texts = [...panel.querySelectorAll<HTMLElement>('dt,dd,label,summary,h3,h4,button,p,strong,span')]
          .filter(node => visible(node) && !!node.textContent?.trim() && !node.classList.contains('sr-only'));
        const rgb = (value: string) => {
          const match = value.match(/^rgba?\(([^)]+)\)$/);
          if (!match) throw new Error('Cannot resolve inspector color: ' + value);
          return match[1].split(',').map(Number);
        };
        const luminance = (channels: number[]) => {
          const linear = channels.slice(0, 3).map(value => {
            const unit = value / 255;
            return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4;
          });
          return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
        };
        const contrasts = texts.map(node => {
          let ancestor: Element | null = node, background: number[] | null = null;
          while (ancestor) {
            const paint = rgb(getComputedStyle(ancestor).backgroundColor);
            if (paint.length === 3 || paint[3] >= .99) { background = paint; break; }
            ancestor = ancestor.parentElement;
          }
          if (!background) throw new Error('Inspector text has no resolved surface');
          const foreground = luminance(rgb(getComputedStyle(node).color)), surface = luminance(background);
          return { text: node.textContent, ratio: (Math.max(foreground, surface) + .05) / (Math.min(foreground, surface) + .05) };
        });
        const panelRect = panel.getBoundingClientRect();
        const phaseRect = document.querySelector('[data-physics-motion-phase]')!.getBoundingClientRect();
        return {
          width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
          panel: { left: panelRect.left, right: panelRect.right },
          phase: { left: phaseRect.left, right: phaseRect.right },
          textSizes: texts.map(node => parseFloat(getComputedStyle(node).fontSize)), contrasts,
          controls: [...panel.querySelectorAll<HTMLElement>('button,input[type="range"],summary')].filter(visible).map(node => {
            const box = node.getBoundingClientRect(); return { text: node.textContent, width: box.width, height: box.height };
          }),
          landmarks: [...panel.querySelectorAll('[data-physics-sample-landmark]')].filter(visible).length,
        };
      });
      const context = width + 'px ' + theme;
      expect(layout.scroll, context + ' page overflow').toBeLessThanOrEqual(layout.width + 1);
      for (const box of [layout.panel, layout.phase]) {
        expect(box.left, context).toBeGreaterThanOrEqual(0);
        expect(box.right, context).toBeLessThanOrEqual(layout.width + 1);
      }
      expect(layout.landmarks).toBe(3);
      expect(layout.textSizes.length).toBeGreaterThan(20);
      for (const size of layout.textSizes) expect(size, context + ' inspector text').toBeGreaterThanOrEqual(12);
      for (const mark of layout.contrasts) expect(mark.ratio, context + ': ' + mark.text).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
      expect(layout.controls.length).toBeGreaterThan(6);
      for (const control of layout.controls) {
        expect(control.width, context + ': ' + control.text).toBeGreaterThanOrEqual(44);
        expect(control.height, context + ': ' + control.text).toBeGreaterThanOrEqual(44);
      }
    }
  }
  expect(errors).toEqual([]);
});
