import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
test.use({ deviceScaleFactor: 2 });

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
    w.__tickVisualPhysics = (ms: number) => {
      now += ms;
      const pending = [...frames.values()]; frames.clear();
      pending.forEach(fn => fn(now));
    };

    // Observe actual canvas drawing; metadata alone cannot prove readable text.
    w.__physicsTextCalls = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth?) {
      if (this.canvas.id === 'physicsCanvas') {
        const px = this.font.match(/([\d.]+)px/);
        const dpr = this.canvas.width / this.canvas.offsetWidth;
        w.__physicsTextCalls.push({ text: String(text), size: px ? Number(px[1]) / dpr : 0 });
      }
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    // The harness normally has a fixed mount width. Reproduce a responsive host.
    const wrap = document.getElementById('wrap') as HTMLElement;
    wrap.style.width = '100%';
    const main = document.createElement('main');
    wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div');
    main.insertBefore(card, wrap); card.appendChild(wrap);
    (window as any).__setVisualTheme = (theme: string) => {
      const ctx = (window as any).__ctx;
      ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      (window as any).__rerender();
    };
  });
}

async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({
    ...prev, physics: { ...prev.physics, ...p },
  })), patch);
  await page.waitForTimeout(40);
}

async function readDraw(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    w.__physicsTextCalls = [];
    cv._physScheduleFrame(); w.__tickVisualPhysics(1000 / 60);
    return {
      text: w.__physicsTextCalls as Array<{ text: string; size: number }>,
      layout: cv._visualLayout as {
        width: number; height: number; plotTop: number; groundY: number;
        labels: Array<{
          id: string; x: number; y: number; width: number; height: number;
          anchor: { x: number; y: number; radius: number };
          connector: { from: { x: number; y: number }; to: { x: number; y: number } };
        }>;
      },
      view: cv._launchView, prediction: cv._predictionCache?.range,
      preview: cv._visualPreview,
      projectile: cv._ball && cv._launched ? {
        x: cv._launchView.x + cv._ball.mX * cv._launchView.scale,
        y: cv._launchView.groundY - cv._ball.mY * cv._launchView.scale,
      } : null,
      time: cv._ball?.t, launched: cv._launched,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    };
  });
}

function expectReadableDraw(draw: Awaited<ReturnType<typeof readDraw>>, context: string) {
  expect(draw.text.length, context + ' draws measured text').toBeGreaterThan(5);
  for (const item of draw.text) {
    expect(item.size, `${context}: "${item.text}" canvas font`).toBeGreaterThanOrEqual(11.99);
  }
  expect(draw.documentWidth, context + ' document overflow').toBeLessThanOrEqual(draw.viewportWidth + 1);
  expect(draw.layout.labels.length, context + ' contains plotted annotations').toBeGreaterThan(0);
  for (const [index, box] of draw.layout.labels.entries()) {
    expect(box.x, context + ' ' + box.id + ' left bound').toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, context + ' ' + box.id + ' right bound').toBeLessThanOrEqual(draw.layout.width + 0.01);
    expect(box.y, context + ' ' + box.id + ' top bound').toBeGreaterThanOrEqual(draw.layout.plotTop);
    expect(box.y + box.height, context + ' ' + box.id + ' ground bound').toBeLessThanOrEqual(draw.layout.groundY + 0.01);
    expect(box.anchor, context + ' ' + box.id + ' has a measured anchor').toBeTruthy();
    expect(box.connector, context + ' ' + box.id + ' has a leader').toBeTruthy();
    for (const point of [box.anchor, box.connector.from, box.connector.to]) {
      expect(point.x, context + ' leader left bound').toBeGreaterThanOrEqual(draw.view.x - 0.01);
      expect(point.x, context + ' leader right bound').toBeLessThanOrEqual(draw.layout.width - 20 + 0.01);
      expect(point.y, context + ' leader top bound').toBeGreaterThanOrEqual(draw.layout.plotTop - 0.01);
      expect(point.y, context + ' leader ground bound').toBeLessThanOrEqual(draw.layout.groundY + 0.01);
    }
    const end = box.connector.to, start = box.connector.from;
    expect(end.x).toBeGreaterThanOrEqual(box.x - 0.01);
    expect(end.x).toBeLessThanOrEqual(box.x + box.width + 0.01);
    expect(end.y).toBeGreaterThanOrEqual(box.y - 0.01);
    expect(end.y).toBeLessThanOrEqual(box.y + box.height + 0.01);
    expect(Math.min(Math.abs(end.x - box.x), Math.abs(end.x - box.x - box.width), Math.abs(end.y - box.y), Math.abs(end.y - box.y - box.height)),
      context + ' ' + box.id + ' leader touches its card edge').toBeLessThan(0.01);
    expect(Math.hypot(start.x - box.anchor.x, start.y - box.anchor.y), context + ' leader begins at marker edge').toBeCloseTo(box.anchor.radius + 2, 8);
    const cross = (end.x - box.anchor.x) * (start.y - box.anchor.y) - (end.y - box.anchor.y) * (start.x - box.anchor.x);
    expect(Math.abs(cross), context + ' leader points to the true anchor').toBeLessThan(1e-6);
    for (const marker of draw.layout.labels) {
      const dx = Math.max(box.x - marker.anchor.x, 0, marker.anchor.x - box.x - box.width);
      const dy = Math.max(box.y - marker.anchor.y, 0, marker.anchor.y - box.y - box.height);
      expect(Math.hypot(dx, dy), `${context}: ${box.id} obscures ${marker.id} marker`).toBeGreaterThanOrEqual(marker.anchor.radius + 3.99);
    }
    if (draw.projectile) {
      const dx = Math.max(box.x - draw.projectile.x, 0, draw.projectile.x - box.x - box.width);
      const dy = Math.max(box.y - draw.projectile.y, 0, draw.projectile.y - box.y - box.height);
      expect(Math.hypot(dx, dy), context + ' ' + box.id + ' obscures the projectile').toBeGreaterThanOrEqual(7);
    }
    for (const other of draw.layout.labels.slice(index + 1)) {
      const intersects = box.x < other.x + other.width && box.x + box.width > other.x
        && box.y < other.y + other.height && box.y + box.height > other.y;
      expect(intersects, `${context}: ${box.id} overlaps ${other.id}`).toBe(false);
    }
  }
}

test('canvas text and annotations remain readable at desktop and phone widths in every theme', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  for (const width of [1100, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['default', 'dark', 'contrast']) {
      await page.evaluate(t => (window as any).__setVisualTheme(t), theme);
      await page.waitForTimeout(60);
      await expect(page.locator('#physics-fs-outer')).toHaveAttribute('data-physics-theme', theme === 'default' ? 'light' : theme);
      await page.getByRole('button', { name: 'Clear all trajectory trails', exact: true }).click();
      await setState(page, {
        angle: 45, velocity: 25, gravity: 9.8, launchHeight: 0, mass: 1,
        airResist: false, simSpeed: 0, showFormulas: true, showVectors: true,
        showEnergy: true, showOverlay: false,
      });
      const idle = await readDraw(page);
      expectReadableDraw(idle, `${theme} ${width}px idle`);
      if (width === 320) {
        const availableWidth = idle.layout.width - idle.view.x - 20;
        const analyticRange = 25 * 25 / 9.8;
        expect(idle.prediction).toBeCloseTo(analyticRange, 8);
        expect(analyticRange * idle.view.scale, `${theme} default flight uses the phone plot`).toBeGreaterThanOrEqual(availableWidth * 0.6);
      }
      for (const launch of [{ angle: 0, launchHeight: 10 }, { angle: 35, launchHeight: 50 }]) {
        await page.getByRole('button', { name: 'Clear all trajectory trails', exact: true }).click();
        await setState(page, { ...launch, velocity: 15 });
        await page.getByRole('button', { name: 'Launch!', exact: true }).click();
        // Check the settled paused drawing as well as its initial launch frame.
        await readDraw(page);
        const paused = await readDraw(page);
        expect(paused.launched).toBe(true);
        expect(paused.time).toBe(0);
        expectReadableDraw(paused, `${theme} ${width}px paused at ${launch.launchHeight}m`);
      }
    }
  }
  expect(errors).toEqual([]);
});

test('descending high-speed vectors share a scale and visual changes preserve measured flight evidence', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page);
  await setState(page, {
    angle: 45, velocity: 50, gravity: 25, launchHeight: 50, mass: 1,
    airResist: false, simSpeed: 1, showVectors: true, showEnergy: true, showFormulas: true,
  });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  const descending = await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 1000) {
      w.__tickVisualPhysics(1000 / 60);
      if (cv._ball.mVy < 0 && cv._ball.speed > 55) break;
    }
    return {
      ball: { vx: cv._ball.mVx, vy: cv._ball.mVy, speed: cv._ball.speed, t: cv._ball.t },
      vectors: cv._visualVectors, layout: cv._visualLayout, launched: cv._launched,
    };
  });
  expect(descending.launched).toBe(true);
  expect(descending.ball.speed).toBeGreaterThan(55);
  expect(descending.ball.vy).toBeLessThan(0);
  await setState(page, { showVectors: false, simSpeed: 0 });
  await readDraw(page);
  expect(await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._visualVectors)).toBeNull();
  await setState(page, { showVectors: true });
  await readDraw(page);
  descending.vectors = await page.evaluate(() => (document.getElementById('physicsCanvas') as any)._visualVectors);
  const vector = descending.vectors;
  expect(vector).not.toBeNull();
  expect(vector.scale).toBeGreaterThan(0);
  expect(vector.endX).toBeCloseTo(vector.vxX, 9);
  expect(vector.endY).toBeCloseTo(vector.vyY, 9);
  expect(vector.endX - vector.x).toBeCloseTo(descending.ball.vx * vector.scale, 9);
  expect(vector.endY - vector.y).toBeCloseTo(-descending.ball.vy * vector.scale, 9);
  for (const point of [
    { x: vector.x, y: vector.y }, { x: vector.vxX, y: vector.y },
    { x: vector.x, y: vector.vyY }, { x: vector.endX, y: vector.endY },
  ]) {
    expect(point.x).toBeGreaterThanOrEqual(0);
    expect(point.x).toBeLessThanOrEqual(descending.layout.width);
    expect(point.y).toBeGreaterThanOrEqual(descending.layout.plotTop);
    expect(point.y).toBeLessThanOrEqual(descending.layout.groundY);
  }

  await setState(page, { simSpeed: 1 });
  const result = await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 1000) w.__tickVisualPhysics(1000 / 60);
    const trail = cv._trails.at(-1);
    return {
      landed: !cv._launched, vectors: cv._visualVectors,
      range: cv._ball.mX, time: cv._ball.t, maxH: cv._ball.maxH, energy: cv._ball.E0,
      parameters: trail.parameters,
      samples: [...trail] as Array<{ mX: number; mY: number; mVx: number; mVy: number; t: number }>,
    };
  });
  // Independent constant-gravity equations ensure the redraw did not change the data.
  const vx = 50 * Math.cos(Math.PI / 4), vy = 50 * Math.sin(Math.PI / 4);
  const time = (vy + Math.sqrt(vy * vy + 2 * 25 * 50)) / 25;
  expect(result.landed).toBe(true);
  expect(result.vectors).toBeNull();
  expect(result.time).toBeCloseTo(time, 9);
  expect(result.range).toBeCloseTo(vx * time, 9);
  expect(result.maxH).toBeCloseTo(50 + vy * vy / (2 * 25), 9);
  expect(result.energy).toBeCloseTo(2500, 9);
  expect(result.parameters).toMatchObject({ angle: 45, velocity: 50, gravity: 25, launchHeight: 50, mass: 1 });
  expect(result.samples.length).toBeGreaterThan(50);
  for (const sample of result.samples) {
    expect(sample.mX).toBeCloseTo(vx * sample.t, 8);
    expect(sample.mY).toBeCloseTo(50 + vy * sample.t - 0.5 * 25 * sample.t * sample.t, 8);
    expect(sample.mVx).toBeCloseTo(vx, 9);
    expect(sample.mVy).toBeCloseTo(vy - 25 * sample.t, 8);
  }
  expect(result.samples.at(-1)?.mY).toBe(0);
  await page.waitForFunction(() => (window as any).__toolData.physics.runLog?.length === 1, null, { polling: 20 });
  const saved = await page.evaluate(() => (window as any).__toolData.physics.runLog[0]);
  expect(saved).toMatchObject({ angle: 45, vel: 50, grav: 25, launchHeight: 50, mass: 1, modelVersion: 'projectile-v3' });
  expect(saved.range).toBeCloseTo(result.range, 9);
  expect(saved.time).toBeCloseTo(result.time, 9);
});

test('changing a landed flight previews the next launch and hides annotations for off-screen measurements', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page);
  await setState(page, {
    angle: 45, velocity: 50, gravity: 9.8, launchHeight: 0, mass: 1,
    airResist: false, simSpeed: 1, showOverlay: false, showFormulas: false,
  });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 1000) w.__tickVisualPhysics(1000 / 60);
    if (cv._launched) throw new Error('Reference flight did not land');
  });
  await page.waitForFunction(() => (window as any).__toolData.physics.runLog?.length === 1, null, { polling: 20 });
  const before = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    return { samples: [...cv._trails.at(-1)], records: (window as any).__toolData.physics.runLog };
  });
  // Record the actual clipping call without replacing the browser canvas renderer.
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as HTMLCanvasElement;
    const ctx = cv.getContext('2d')!;
    const nativeRect = ctx.rect, nativeClip = ctx.clip;
    let rect: number[] | null = null;
    w.__physicsPlotClips = [];
    ctx.rect = function (x, y, width, height) {
      const dpr = cv.width / cv.offsetWidth;
      rect = [x, y, width, height].map(value => value / dpr);
      nativeRect.call(this, x, y, width, height);
    };
    ctx.clip = function (...args: any[]) {
      w.__physicsPlotClips.push(rect && [...rect]);
      (nativeClip as any).apply(this, args);
    };
  });
  await setState(page, { angle: 5, velocity: 5, simSpeed: 0 });
  const next = await readDraw(page);
  expect(next.launched).toBe(false);
  expect(next.preview).toMatchObject({ kind: 'preview', angle: 5, velocity: 5, gravity: 9.8, launchHeight: 0 });
  expect(next.preview.range).toBeCloseTo(25 * Math.sin(10 * Math.PI / 180) / 9.8, 9);
  expect(next.text.some(item => item.text === 'Vacuum preview')).toBe(true);
  expect(next.layout.labels.map(box => box.id)).not.toContain('apex');
  expect(next.layout.labels.map(box => box.id)).not.toContain('landing');
  expectReadableDraw(next, 'phone preview after a long completed flight');
  const after = await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    return {
      samples: [...cv._trails.at(-1)], records: w.__toolData.physics.runLog,
      oldLandingX: cv._launchView.x + cv._ball.mX * cv._launchView.scale,
      clips: w.__physicsPlotClips as number[][],
    };
  });
  expect(after.oldLandingX).toBeGreaterThan(next.layout.width);
  expect({ samples: after.samples, records: after.records }).toEqual(before);
  expect(after.clips.length).toBeGreaterThan(0);
  for (const clip of after.clips) {
    expect(clip).toEqual([
      next.view.x, next.layout.plotTop,
      next.layout.width - next.view.x - 20, next.layout.groundY - next.layout.plotTop,
    ]);
  }
});

test('apex, prediction, and landing leaders attach to their true flight coordinates', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await mount(page);
  await setState(page, {
    angle: 45, velocity: 25, gravity: 9.8, launchHeight: 0, mass: 1,
    airResist: false, simSpeed: 1, showFormulas: true, showOverlay: false,
  });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 1000) w.__tickVisualPhysics(1000 / 60);
    if (cv._launched) throw new Error('Reference flight did not land');
  });
  await page.waitForFunction(() => (window as any).__toolData.physics.runLog?.length === 1, null, { polling: 20 });
  const draw = await readDraw(page);
  expectReadableDraw(draw, 'completed desktop flight with measured leaders');
  const range = 25 * 25 / 9.8;
  const height = Math.pow(25 * Math.sin(Math.PI / 4), 2) / (2 * 9.8);
  const expected = {
    apex: { x: draw.view.x + range * draw.view.scale / 2, y: draw.view.groundY - height * draw.view.scale },
    prediction: { x: draw.view.x + range * draw.view.scale, y: draw.view.groundY - 30 },
    landing: { x: draw.view.x + range * draw.view.scale, y: draw.view.groundY },
  };
  for (const [id, point] of Object.entries(expected)) {
    const label = draw.layout.labels.find(box => box.id === id);
    expect(label, id + ' annotation is rendered').toBeTruthy();
    expect(label!.anchor.x, id + ' true horizontal anchor').toBeCloseTo(point.x, 8);
    expect(label!.anchor.y, id + ' true vertical anchor').toBeCloseTo(point.y, 8);
  }
});
