import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.ANATOMY_IMAGING_QA_OUT || 'reports/anatomy-homeostasis-flow-2026-09-29';
const validation: Record<string, any> = {};
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_anatomy.js', toolId: 'anatomy',
  width: 1280, height: 1000, layout: 'document', appStyles: true
});
const regions = ['head', 'chest', 'abdomen'];
const landmarks: Record<string, { superior: string; inferior: string }> = {
  head: { superior: 'Right hemisphere', inferior: 'Cerebellum' },
  chest: { superior: 'Trachea', inferior: 'Liver dome' },
  abdomen: { superior: 'Liver', inferior: 'Bladder' }
};

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ mode: 'serial', retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => {
  await writeFile(out + '/imaging-browser-validation.json', JSON.stringify(validation, null, 2));
  await harness.stop();
});
test.afterEach(async ({ page }) => harness.destroy(page));

async function setImaging(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const root = window as any;
    root.__ctx.updateMulti('anatomy', { imaging: { ...root.__toolData.anatomy.imaging, ...patch } });
  }, patch);
}

// Record native drawing commands from the page's real 2D context. The test clicks
// the bar that the painter drew, so a 50 mm label on a wrongly sized bar fails.
async function recordImagingPaint(page: Page) {
  await page.addInitScript(() => {
    const prototype = CanvasRenderingContext2D.prototype;
    const paths = new WeakMap<CanvasRenderingContext2D, Array<{ x: number; y: number }>>();
    const beginPath = prototype.beginPath, moveTo = prototype.moveTo, lineTo = prototype.lineTo;
    const stroke = prototype.stroke, clearRect = prototype.clearRect, fillText = prototype.fillText;
    prototype.beginPath = function () { paths.set(this, []); return beginPath.call(this); };
    prototype.moveTo = function (x, y) { paths.get(this)?.push({ x, y }); return moveTo.call(this, x, y); };
    prototype.lineTo = function (x, y) { paths.get(this)?.push({ x, y }); return lineTo.call(this, x, y); };
    prototype.clearRect = function (x, y, width, height) {
      if (this.canvas.hasAttribute('data-anatomy-imaging-canvas')) {
        (this.canvas as any).__imagingPaintedText = [];
        (this.canvas as any).__imagingScaleBar = null;
      }
      return clearRect.call(this, x, y, width, height);
    };
    prototype.fillText = function (...args: any[]) {
      if (this.canvas.hasAttribute('data-anatomy-imaging-canvas')) {
        const canvas = this.canvas as any;
        (canvas.__imagingPaintedText ||= []).push(String(args[0]));
      }
      return Reflect.apply(fillText, this, args);
    };
    prototype.stroke = function (...args: any[]) {
      const points = paths.get(this) || [];
      if (this.canvas.hasAttribute('data-anatomy-imaging-canvas') &&
          (this.strokeStyle === '#ffffff' || this.strokeStyle === '#fff') && this.lineWidth === 3 &&
          points.length === 2 && points[0].y === points[1].y) {
        (this.canvas as any).__imagingScaleBar = points.map(point => ({ ...point }));
      }
      return Reflect.apply(stroke, this, args);
    };
  });
}

test('Axial scan landmarks match BodyScope direction and the painted scale matches ruler measurements', async ({ page }) => {
  test.setTimeout(300000);
  const errors: string[] = [], orientation: any[] = [], measurements: any[] = [], visuals: any[] = [];
  validation.guidance = { errors, orientation, measurements, visuals };
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await recordImagingPaint(page);
  await harness.mount(page, { anatomy: {
    _activeTab: 'imaging', system: 'organs', view: 'anterior', complexity: 3,
    _startHereDismissed: true, imaging: { modality: 'CT', region: 'head', plane: 'axial', slice: 0 }
  } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: 'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}' });
  await page.evaluate(() => {
    const ctx = (window as any).__ctx;
    ctx.gradeLevel = '9'; ctx.gradeBand = 'g912'; ctx.updateMulti('anatomy', {});
  });
  const canvas = page.locator('[data-anatomy-imaging-canvas]');
  const bodyScope = page.locator('[data-anatomy-bodyscope]');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('role', 'application');
  await canvas.evaluate(element => {
    const canvas = element as HTMLCanvasElement;
    (canvas as any).__imagingPointerEvents = [];
    canvas.addEventListener('click', event => {
      const rect = canvas.getBoundingClientRect();
      (canvas as any).__imagingPointerEvents.push({
        sourceX: (event.clientX - rect.left) / rect.width * canvas.width,
        sourceY: (event.clientY - rect.top) / rect.height * canvas.height
      });
    });
  });

  for (const region of regions) {
    for (const [slice, position, expectedLandmark, absentLandmark] of [
      [0, 'Superior slice band', landmarks[region].superior, landmarks[region].inferior],
      [100, 'Inferior slice band', landmarks[region].inferior, landmarks[region].superior]
    ] as const) {
      await setImaging(page, { modality: 'CT', region, plane: 'axial', slice, showLabels: true, annotations: [], rulerStart: null });
      await expect(bodyScope).toHaveAttribute('data-bodyscope-position', position);
      await expect(bodyScope).toContainText('Axial · ' + position);
      await expect.poll(() => canvas.evaluate((element, landmark) =>
        ((element as any).__imagingPaintedText || []).includes(landmark), expectedLandmark)).toBe(true);
      const correspondence = await bodyScope.evaluate((element, slice) => {
        const band = element.querySelector('[data-bodyscope-locator] > rect[x="34"][width="112"]')!;
        const mark = element.querySelector('[data-bodyscope-plane-mark="axial"] rect')!;
        const top = Number(band.getAttribute('y')), height = Number(band.getAttribute('height'));
        return { top, height, markerCenter: Number(mark.getAttribute('y')) + 3, expectedCenter: top + Number(slice) / 100 * height };
      }, slice);
      expect(correspondence.markerCenter).toBeCloseTo(correspondence.expectedCenter, 8);
      const paintedText = await canvas.evaluate(element => (element as any).__imagingPaintedText as string[]);
      expect(paintedText).toContain(expectedLandmark);
      expect(paintedText).not.toContain(absentLandmark);
      orientation.push({ region, slice, position, expectedLandmark, paintedText, ...correspondence });
    }
  }

  await setImaging(page, { modality: 'CT', region: 'head', plane: 'axial', slice: 100, tool: 'pin' });
  for (const width of [390, 1440]) for (const theme of ['light', 'dark', 'contrast']) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(theme => { document.body.className = theme === 'light' ? '' : 'theme-' + theme; }, theme);
    await expect(bodyScope).toHaveAttribute('data-bodyscope-position', 'Inferior slice band');
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    visuals.push({ width, theme, dimensions });
    expect(dimensions.scroll).toBeLessThanOrEqual(width + 2);
    const suffix = theme === 'light' ? '' : '-' + theme;
    await canvas.screenshot({ path: out + '/imaging-guidance' + suffix + '-' + width + '.png' });
    if (theme === 'light') await bodyScope.screenshot({ path: out + '/imaging-bodyscope-' + width + '.png' });
  }
  await page.evaluate(() => { document.body.className = ''; });

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const region of regions) for (const modality of ['CT', 'MRI']) {
      await setImaging(page, {
        modality, region, plane: 'axial', slice: 50, tool: 'ruler', note: 'Scale check',
        windowWidth: modality === 'CT' ? 400 : 900, windowLevel: modality === 'CT' ? 40 : 450,
        annotations: [], rulerStart: null
      });
      await expect(bodyScope).toHaveAttribute('data-bodyscope-region', region);
      await expect(canvas).toHaveAttribute('aria-label', new RegExp('^' + modality + ' synthetic ' + region + ' phantom in the axial plane, slice 50'));
      await expect.poll(() => canvas.evaluate(element => !!(element as any).__imagingScaleBar)).toBe(true);
      await canvas.scrollIntoViewIfNeeded();
      const geometry = await canvas.evaluate(element => {
        const canvas = element as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        return {
          sourceWidth: canvas.width, sourceHeight: canvas.height,
          displayWidth: rect.width, displayHeight: rect.height,
          points: (canvas as any).__imagingScaleBar as Array<{ x: number; y: number }>
        };
      });
      expect(geometry.sourceWidth).toBe(640);
      expect(geometry.sourceHeight).toBe(480);
      expect(geometry.displayWidth).toBeGreaterThan(0);
      const [start, end] = geometry.points;
      expect(end.x - start.x).toBeCloseTo(62.5, 8);
      for (const [index, point] of [start, end].entries()) {
        await canvas.click({ position: {
          x: point.x / geometry.sourceWidth * geometry.displayWidth,
          y: point.y / geometry.sourceHeight * geometry.displayHeight
        } });
        if (index === 0) await expect.poll(() => page.evaluate(() =>
          !!(window as any).__toolData.anatomy.imaging.rulerStart)).toBe(true);
      }
      await expect.poll(() => page.evaluate(() =>
        ((window as any).__toolData.anatomy.imaging.annotations || []).length)).toBe(1);
      const saved = await page.evaluate(() => (window as any).__toolData.anatomy.imaging);
      expect(saved.annotations).toHaveLength(1);
      expect(saved.annotations[0]).toMatchObject({ type: 'ruler', modality, region, plane: 'axial', slice: 50, note: 'Scale check' });
      const pointerEvents = await canvas.evaluate(element => (element as any).__imagingPointerEvents.slice(-2) as Array<{ sourceX: number; sourceY: number }>);
      const actualSpan = Math.hypot(pointerEvents[1].sourceX - pointerEvents[0].sourceX, pointerEvents[1].sourceY - pointerEvents[0].sourceY);
      expect(saved.annotations[0].distanceMm).toBe(Math.round(actualSpan * 0.8 * 10) / 10);
      // Browser pointer events can round CSS coordinates. Bound that uncertainty
      // while the exact native painter geometry above still has to be 62.5 px.
      const pointerToleranceMm = 0.8 * geometry.sourceWidth / geometry.displayWidth + 0.1;
      expect(Math.abs(saved.annotations[0].distanceMm - 50)).toBeLessThanOrEqual(pointerToleranceMm);
      expect(saved.rulerStart).toBeNull();
      measurements.push({ width, modality, region, geometry, pointerEvents, pointerToleranceMm, annotation: saved.annotations[0] });
    }
  }
  expect(errors).toEqual([]);
});
