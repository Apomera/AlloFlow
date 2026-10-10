import { test, expect, Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
test.use({ deviceScaleFactor: 2, reducedMotion: 'reduce' });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics', width: 1100, height: 1000, layout: 'document', appStyles: true });
const reports = path.resolve(process.env.PHYSICS_VISUAL_REPORT_DIR || 'reports/physics-hud-layout-2026-10-09');
const captures: any[] = [], errors: string[] = [];
type Paint = { text: string; fontSize: number; x: number; y: number; left: number; right: number; top: number; bottom: number; color: string; maxWidth: number | null; inkPixels: number };
test.beforeAll(async () => { mkdirSync(reports, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); writeFileSync(path.join(reports, 'hud-visual-results.json'), JSON.stringify({ captures, errors }, null, 2)); expect(errors).toEqual([]); });
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const w = window as any, nativeRaf = window.requestAnimationFrame.bind(window), nativeCancel = window.cancelAnimationFrame.bind(window);
    let id = 0, now = 1000, nativeMode = false;
    const frames = new Map<number, FrameRequestCallback>(), running = new Map<number, { callback: FrameRequestCallback; nativeId: number }>();
    const queueNative = (key: number, callback: FrameRequestCallback) => running.set(key, { callback, nativeId: nativeRaf(time => { running.delete(key); callback(time); }) });
    window.requestAnimationFrame = callback => { const key = ++id; if (nativeMode) queueNative(key, callback); else frames.set(key, callback); return key; };
    window.cancelAnimationFrame = key => { frames.delete(key); const pending = running.get(key); if (pending) { nativeCancel(pending.nativeId); running.delete(key); } };
    w.__hudTick = () => { now += 1000 / 60; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); };
    w.__hudNative = (enabled: boolean) => {
      if (enabled && (document.getElementById('physicsCanvas') as any)?.dataset.simSpeed !== '0') throw Error('Native captures require paused playback');
      nativeMode = enabled;
      if (enabled) { const pending = [...frames.entries()]; frames.clear(); pending.forEach(([key, callback]) => queueNative(key, callback)); }
      else { for (const [key, pending] of running) { nativeCancel(pending.nativeId); frames.set(key, pending.callback); } running.clear(); }
    };
    w.__hudSettle = () => new Promise<void>(resolve => nativeRaf(() => nativeRaf(() => resolve())));
    w.__hudText = [];
    const proto = CanvasRenderingContext2D.prototype, fillText = proto.fillText, clearRect = proto.clearRect;
    proto.clearRect = function (x, y, width, height) {
      if (this.canvas.id === 'physicsCanvas' && x === 0 && y === 0 && width >= this.canvas.width && height >= this.canvas.height) w.__hudText = [];
      return clearRect.call(this, x, y, width, height);
    };
    proto.fillText = function (value, x, y, maxWidth?) {
      if (this.canvas.id === 'physicsCanvas') {
        const metrics = this.measureText(value), t = this.getTransform(), rect = this.canvas.getBoundingClientRect();
        const project = (px: number, py: number) => ({ x: (t.a * px + t.c * py + t.e) * rect.width / this.canvas.width, y: (t.b * px + t.d * py + t.f) * rect.height / this.canvas.height });
        const corners = [project(x - metrics.actualBoundingBoxLeft, y - metrics.actualBoundingBoxAscent), project(x + metrics.actualBoundingBoxRight, y - metrics.actualBoundingBoxAscent), project(x - metrics.actualBoundingBoxLeft, y + metrics.actualBoundingBoxDescent), project(x + metrics.actualBoundingBoxRight, y + metrics.actualBoundingBoxDescent)], origin = project(x, y);
        w.__hudText.push({ text: String(value), fontSize: Number(this.font.match(/([\d.]+)px/)?.[1] || 0) * Math.hypot(t.a, t.b) * rect.width / this.canvas.width,
          x: origin.x, y: origin.y, left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)), top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)), color: this.fillStyle, maxWidth: maxWidth === undefined ? null : maxWidth });
      }
      if (maxWidth === undefined) fillText.call(this, value, x, y); else fillText.call(this, value, x, y, maxWidth);
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const w = window as any, wrap = document.getElementById('wrap')!; wrap.style.width = '100%';
    const main = document.createElement('main'); wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div'); main.insertBefore(card, wrap); card.appendChild(wrap);
    w.__hudTheme = (theme: string) => {
      w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark' ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px' : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : ''); w.__rerender();
    };
  });
}
async function patch(page: Page, changes: object) {
  await page.evaluate(value => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, physics: { ...previous.physics, ...value } })), changes); await page.waitForTimeout(40);
}
async function launch(page: Page, complete = true) {
  await page.evaluate(() => (window as any).__hudNative(false));
  await patch(page, { angle: 45, velocity: 50, gravity: 25, launchHeight: 50, mass: 10, airResist: false, simSpeed: complete ? 1 : 0, showVectors: true, showEnergy: true, showOverlay: complete });
  await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  if (complete) {
    const landed = await page.evaluate(() => { const w = window as any, cv = document.getElementById('physicsCanvas') as any; let steps = 0; while (cv._launched && steps++ < 1000) w.__hudTick(); return !cv._launched; });
    expect(landed).toBe(true);
    await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 1, null, { polling: 20 });
    await page.locator('[data-physics-plot-flight="1"]').click(); await page.locator('[data-physics-plot-moment="apex"]').click();
  }
  await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-sim-speed', '0');
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any, physics = (window as any).__toolData.physics;
    return { trails: cv._trails.map((trail: any) => ({ points: [...trail], parameters: trail.parameters, run: trail.run, apex: trail.apex, modelVersion: trail.modelVersion })), log: physics.runLog, recordedFlights: physics.recordedFlights,
      selection: cv._inspection ? { snapshot: cv._inspection.snapshot, index: cv._inspection.index, originalPoint: cv._inspection.trail[cv._inspection.index] } : null };
  });
}
async function labels(page: Page, changes: Record<string, string> | null) {
  await page.evaluate(value => { const w = window as any, cv = document.getElementById('physicsCanvas') as any; if (!w.__hudOriginalLabels) w.__hudOriginalLabels = { ...cv._L }; cv._L = { ...w.__hudOriginalLabels, ...value }; cv._physScheduleFrame(); }, changes);
}
async function draw(page: Page) {
  return page.evaluate(async () => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    w.__hudNative(true); cv._physScheduleFrame(); await w.__hudSettle(); await w.__hudSettle();
    const rect = cv.getBoundingClientRect(), context = cv.getContext('2d'), dx = cv.width / rect.width, dy = cv.height / rect.height;
    const texts = w.__hudText.map((paint: any) => {
      let inkPixels = 0;
      const rgb = /^#[\da-f]{6}$/i.test(paint.color) ? [1, 3, 5].map(start => parseInt(paint.color.slice(start, start + 2), 16)) : null;
      if (rgb && paint.right > paint.left && paint.bottom > paint.top) {
        const x = Math.max(0, Math.floor(paint.left * dx)), y = Math.max(0, Math.floor(paint.top * dy));
        const width = Math.max(0, Math.min(cv.width, Math.ceil(paint.right * dx)) - x), height = Math.max(0, Math.min(cv.height, Math.ceil(paint.bottom * dy)) - y);
        if (width && height) { const pixels = context.getImageData(x, y, width, height).data; for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] === 255 && rgb.every((value, channel) => Math.abs(value - pixels[i + channel]) <= 4)) inkPixels++; }
      }
      return { ...paint, inkPixels };
    });
    return { width: rect.width, height: rect.height, texts, layout: cv._visualLayout, view: cv._launchView, telemetry: cv._visualTelemetry, energy: cv._visualEnergy,
      description: cv.getAttribute('aria-description'), documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth,
      marker: cv._visualInspection, selected: cv._inspection?.snapshot, originalPoint: cv._inspection?.trail[cv._inspection.index], ball: cv._ball ? { t: cv._ball.t, vx: cv._ball.mVx, vy: cv._ball.mVy } : null, launched: cv._launched };
  });
}
function readable(result: Awaited<ReturnType<typeof draw>>, name: string) {
  const header = (result.texts as Paint[]).filter(paint => paint.y < result.layout.plotTop - 18), footer = (result.texts as Paint[]).filter(paint => paint.y > result.layout.groundY + 48);
  expect(header.length, name + ' native header calls').toBeGreaterThanOrEqual(7);
  expect(footer.length, name + ' native energy calls').toBeGreaterThanOrEqual(5);
  expect(result.documentWidth, name + ' document width').toBeLessThanOrEqual(result.viewportWidth + 1);
  for (const [region, entries] of [['header', header], ['footer', footer]] as const) for (const [index, paint] of entries.entries()) {
    expect(paint.fontSize, name + ' font: ' + paint.text).toBeGreaterThanOrEqual(11.99);
    expect(paint.maxWidth, name + ' no horizontal font compression: ' + paint.text).toBeNull();
    expect(paint.left, name + ' left: ' + paint.text).toBeGreaterThanOrEqual(10);
    expect(paint.right, name + ' right: ' + paint.text).toBeLessThanOrEqual(result.width - 10);
    expect(paint.top, name + ' top: ' + paint.text).toBeGreaterThanOrEqual(region === 'header' ? 0 : result.layout.groundY + 48);
    expect(paint.bottom, name + ' bottom: ' + paint.text).toBeLessThanOrEqual(region === 'header' ? result.layout.plotTop - 18 : result.height - 2);
    expect(paint.inkPixels, name + ' final native ink: ' + paint.text).toBeGreaterThan(0);
    for (const other of entries.slice(index + 1)) expect(paint.left < other.right && paint.right > other.left && paint.top < other.bottom && paint.bottom > other.top, `${name}: ${paint.text} overlaps ${other.text}`).toBe(false);
  }
  expect(header.some(paint => paint.fontSize >= 13.99), name + ' 14px heading').toBe(true); expect(result.description).toBeTruthy();
  return { header, footer };
}
async function capture(page: Page, name: string) {
  const result = await draw(page), regions = readable(result, name), file = name + '.png';
  await page.locator('#physicsCanvas').screenshot({ path: path.join(reports, file), animations: 'disabled' });
  captures.push({ name, file, ...result, ...regions }); return { ...result, ...regions };
}
const compact = (value: string) => value.replace(/\s/g, '');

test('native HUD and energy text fit extreme settings at three widths in every theme', async ({ page }) => {
  await mount(page); await launch(page, false);
  for (const width of [1100, 375, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['default', 'dark', 'contrast']) {
      await page.evaluate(value => (window as any).__hudTheme(value), theme); await page.waitForTimeout(60);
      const result = await capture(page, `hud-${theme}-${width}`);
      expect(result.launched).toBe(true); expect(result.ball.t).toBe(0);
      expect(result.header.map(paint => paint.text).join(' ')).toContain('50 m/s'); expect(result.description).toContain('10 kg'); expect(result.description).toContain('25 m/s²');
      if (width === 1100) {
        expect(result.header.find(paint => paint.fontSize >= 13.99)?.y).toBeCloseTo(25, 6);
        expect(result.header.find(paint => paint.text.startsWith('g '))?.y).toBeCloseTo(47, 6);
        expect(result.header.find(paint => paint.text.includes('Current flight'))?.y).toBeCloseTo(68, 6);
        expect(result.header.find(paint => paint.text.startsWith('t '))?.y).toBeCloseTo(89, 6); expect(result.layout.plotTop).toBe(128);
      }
    }
  }
  await page.getByRole('button', { name: 'Advance 0.035 seconds (available when paused)', exact: true }).click();
  const stepped = await capture(page, 'paused-step');
  expect(stepped.ball.t).toBeCloseTo(0.035, 12);
  const readings = stepped.header.map(paint => paint.text);
  expect(readings).toContain('t ' + stepped.ball.t.toFixed(2) + ' s');
  expect(readings).toContain('Vx ' + stepped.ball.vx.toFixed(1) + ' m/s');
  expect(readings).toContain('Vy ' + stepped.ball.vy.toFixed(1) + ' m/s');
});

test('translated run identities and energy labels retain complete text and original measurements', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 }); await mount(page); await launch(page); const before = await evidence(page);
  const fixtures = [
    { name: 'long-translation', values: { runPrefix: 'ComparisonRecordingWithoutWhitespaceABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', selectedPoint: 'Original selected measurement from the recorded trajectory', vacuum: 'Without atmospheric resistance', initialEnergy: 'Initial mechanical energy for this recorded launch', selectedEnergy: 'Energy at the original selected recorded point', ke: 'Kinetic energy of the moving projectile', pe: 'Gravitational potential energy above ground', dragLoss: 'Energy transferred by air resistance' } },
    { name: 'arabic-emoji', values: { runPrefix: 'التجربة المسجلة 🧑‍🚀 ', selectedPoint: 'موضع القياس الأصلي في مسار المقذوف', vacuum: 'بدون مقاومة الهواء', initialEnergy: 'الطاقة الميكانيكية الابتدائية 🚀', selectedEnergy: 'الطاقة عند النقطة المحددة', ke: 'الطاقة الحركية', pe: 'طاقة وضع الجاذبية', dragLoss: 'الطاقة المفقودة' } },
  ];
  for (const fixture of fixtures) {
    await labels(page, fixture.values); const result = await capture(page, fixture.name), painted = compact([...result.header, ...result.footer].map(paint => paint.text).join(''));
    for (const value of Object.values(fixture.values)) { expect(painted, fixture.name + ' retains ' + value).toContain(compact(value)); expect(result.description).toContain(value); }
    expect(await evidence(page)).toEqual(before); expect(result.selected.t).toBe(before.selection!.snapshot.t);
  }
  const cluster = '\u0915' + '\u094d\u0915'.repeat(60);
  await labels(page, { runPrefix: cluster, selectedEnergy: cluster }); const result = await capture(page, 'oversized-grapheme');
  expect(result.description).toContain(cluster); expect(result.header.some(paint => paint.text.includes('…'))).toBe(true); expect(result.footer.some(paint => paint.text.includes('…'))).toBe(true);
  expect([...result.header, ...result.footer].some(paint => paint.text.includes('\u0915') || paint.text.includes('\u094d'))).toBe(false); expect(await evidence(page)).toEqual(before);
});

test('wrapping preserves plot space and restores the original selected sample through resizing', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 }); await mount(page); await launch(page);
  const before = await evidence(page), base = await capture(page, 'growth-base');
  const translations = { runPrefix: 'A recorded comparison trajectory with a fully visible identity ', selectedPoint: 'The originally recorded selected measurement', initialEnergy: 'The initial mechanical energy before this trajectory started', selectedEnergy: 'Energy at the currently selected original recorded moment', ke: 'Kinetic energy', pe: 'Gravitational potential energy', dragLoss: 'Energy transferred to air' };
  await labels(page, translations);
  const grown = await capture(page, 'growth-expanded');
  expect(grown.height).toBeGreaterThan(base.height); expect(grown.layout.groundY - grown.layout.plotTop).toBeCloseTo(base.layout.groundY - base.layout.plotTop, 6);
  expect(grown.view.scale).toBeCloseTo(base.view.scale, 9); expect(grown.marker.x).toBeCloseTo(base.marker.x, 9);
  expect(grown.layout.groundY - grown.marker.y).toBeCloseTo(base.layout.groundY - base.marker.y, 9);
  const headerGrowth = grown.layout.plotTop - base.layout.plotTop, footerGrowth = (grown.height - grown.layout.groundY) - (base.height - base.layout.groundY);
  expect(headerGrowth).toBeGreaterThan(0); expect(footerGrowth).toBeGreaterThan(0); expect(grown.height - base.height).toBeCloseTo(headerGrowth + footerGrowth, 6);
  await patch(page, { showEnergy: false }); await labels(page, translations); const hidden = await draw(page);
  expect(hidden.height).toBeCloseTo(grown.height - grown.energy.extraHeight, 6);
  expect(hidden.layout.plotTop).toBe(grown.layout.plotTop);
  expect(hidden.layout.groundY - hidden.layout.plotTop).toBeCloseTo(grown.layout.groundY - grown.layout.plotTop, 6);
  expect((hidden.texts as Paint[]).filter(paint => paint.y > hidden.layout.groundY + 48)).toEqual([]);
  expect(await evidence(page)).toEqual(before);
  await patch(page, { showEnergy: true }); await labels(page, translations);
  for (const width of [1100, 320, 375]) {
    await page.setViewportSize({ width, height: 1000 }); const resized = await capture(page, 'growth-resize-' + width);
    expect(resized.selected).toEqual(base.selected); expect(resized.originalPoint).toEqual(base.originalPoint); expect(await evidence(page)).toEqual(before);
  }
  await labels(page, null); const restored = await capture(page, 'growth-restored');
  expect(restored.height).toBeCloseTo(base.height, 6); expect(restored.layout.plotTop).toBe(base.layout.plotTop); expect(restored.view).toEqual(base.view);
  expect(restored.header).toEqual(base.header); expect(restored.footer).toEqual(base.footer); expect(await evidence(page)).toEqual(before);
});
