import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, data, accessibility } from './helpers/migration_round31';

test.describe.configure({ timeout: 150_000, retries: 0 });
const report = join(process.cwd(), 'reports/migration-deep-review-round40-2026-10-23');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath);
const hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const field = (page: Page) => page.locator('[data-formation-canvas]');
const axis = (page: Page, key: 'x' | 'y') => page.locator('[data-formation-axis=' + key + ']');
const chooser = (page: Page) => page.locator('[data-formation-bird-select]');

function unchangedSource() {
  expect(readFileSync(sourcePath).equals(source), 'source changed during browser proof').toBe(true);
  expect(readFileSync(mirrorPath).equals(source), 'desktop mirror differs from browser proof').toBe(true);
}
test.beforeAll(async () => { unchangedSource(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); }
async function paint(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function signature(page: Page) {
  return field(page).evaluate(node => {
    const canvas = node as HTMLCanvasElement, pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let value = 2166136261;
    for (let i = 0; i < pixels.length; i++) value = Math.imul(value ^ pixels[i], 16777619);
    return value >>> 0;
  });
}
async function changed(page: Page, before: number) { await expect.poll(() => signature(page)).not.toBe(before); }
async function fittedCanvas(page: Page) {
  await expect.poll(() => field(page).evaluate(node => {
    const canvas = node as HTMLCanvasElement, width = canvas.getBoundingClientRect().width;
    return Math.max(Math.abs(canvas.width / devicePixelRatio - width), Math.abs((canvas as any)._vfLogicalSize.width - width));
  }), { message: 'formation bitmap and logical width should follow the displayed width without horizontal compression' }).toBeLessThanOrEqual(1);
  return field(page).evaluate(node => {
    const canvas = node as HTMLCanvasElement, size = (canvas as any)._vfLogicalSize, rect = canvas.getBoundingClientRect();
    return { width: size.width, height: size.height, bitmapWidth: canvas.width / devicePixelRatio, displayedWidth: rect.width, displayedHeight: rect.height };
  });
}
async function selectContrast(page: Page) {
  const result = await chooser(page).evaluate(node => {
    const select = node as HTMLSelectElement, selected = select.selectedOptions[0], style = getComputedStyle(select), optionStyle = getComputedStyle(selected);
    const rgba = (value: string) => { const numbers = (value.match(/[\d.]+/g) || []).map(Number); return [numbers[0], numbers[1], numbers[2], numbers.length > 3 ? numbers[3] : 1]; };
    const luminance = (color: number[]) => color.slice(0, 3).map(c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    const ratio = (foreground: number[], background: number[]) => { const a = luminance(foreground), b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
    const background = rgba(style.backgroundColor), foreground = rgba(style.color), optionBackground = rgba(optionStyle.backgroundColor), optionForeground = rgba(optionStyle.color);
    // Transparent option backgrounds show the native select's explicitly themed surface.
    const effectiveOptionBackground = optionBackground[3] === 0 ? background : optionBackground;
    return { value: select.value, selectedText: selected.textContent, foreground: style.color, background: style.backgroundColor, opacity: style.opacity,
      foregroundAlpha: foreground[3], backgroundAlpha: background[3], contrast: ratio(foreground, background),
      optionForeground: optionStyle.color, optionBackground: optionStyle.backgroundColor, optionContrast: ratio(optionForeground, effectiveOptionBackground) };
  });
  expect(result.selectedText).toMatch(/^Bird \d+$/); expect(result.foregroundAlpha).toBe(1); expect(result.backgroundAlpha).toBe(1); expect(result.opacity).toBe('1');
  expect(result.contrast, 'selected bird text must contrast with its native select surface').toBeGreaterThanOrEqual(4.5);
  expect(result.optionContrast, 'selected option must inherit readable theme colors').toBeGreaterThanOrEqual(4.5);
  return result;
}
async function percent(page: Page, key: 'x' | 'y') { return Number(await axis(page, key).inputValue()); }
async function setHalf(page: Page, key: 'x' | 'y') {
  await axis(page, key).focus(); await page.keyboard.press('Home');
  for (let n = 0; n < 5; n++) await page.keyboard.press('PageUp');
  await expect(axis(page, key)).toHaveValue('50');
}
async function scan(page: Page) {
  await page.addScriptTag({ path: join(process.cwd(), 'axe-core/4.12.1/axe.min.js') });
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('.migration-tool-shell'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
    });
    return { violations: result.violations, incomplete: result.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })), width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
  });
}
async function openFormation(page: Page, dark: boolean, reduced: boolean) {
  await mount(harness, page, 'canada_goose', { dark, reduced, extra: { vBirdCount: 9 } });
  await expect(page.locator('.migration-flight-stat-grid')).toHaveRole('group');
  await expect(page.locator('.migration-flight-stat-grid')).toHaveAccessibleName('Current flight metrics');
  await expect(page.locator('.migration-flight-keys')).toHaveRole('group');
  await expect(page.locator('.migration-flight-keys')).toHaveAccessibleName('Camera keyboard shortcuts');
  await activate(page, page.locator('[data-migration-tab="vformation"]'));
  await expect(field(page)).toBeVisible(); await paint(page);
}

for (const mode of ['light', 'dark']) test('formation keyboard and native learning journey ' + mode, async ({ page }) => {
  const dark = mode === 'dark';
  await page.setViewportSize({ width: dark ? 320 : 1280, height: 900 });
  await openFormation(page, dark, true);
  await expect(chooser(page)).toHaveRole('combobox');
  await expect(chooser(page)).toHaveAccessibleName(/\S/);
  for (const key of ['x', 'y'] as const) {
    await expect(axis(page, key)).toHaveRole('slider'); await expect(axis(page, key)).toHaveAccessibleName(/\S/);
    await expect(axis(page, key)).toHaveAttribute('min', '0'); await expect(axis(page, key)).toHaveAttribute('max', '100'); await expect(axis(page, key)).toHaveAttribute('step', '1');
  }
  await expect(chooser(page).locator('option')).toHaveCount(9);
  const logical = await fittedCanvas(page), initialSelectContrast = await selectContrast(page);
  let before = await signature(page);
  await activate(page, page.getByRole('button', { name: 'Auto-form V formation', exact: true })); await changed(page, before);
  before = await signature(page);
  await activate(page, page.getByRole('button', { name: 'Scatter birds randomly', exact: true })); await changed(page, before);
  await chooser(page).selectOption('1'); await expect(page.locator('[data-formation-position]')).toContainText('Bird 2');
  await setHalf(page, 'x'); await setHalf(page, 'y'); await paint(page);
  before = await signature(page);
  await activate(page, page.locator('[data-formation-focus]')); await expect(field(page)).toBeFocused();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowUp');
  await expect(axis(page, 'x')).toHaveValue('55'); await expect(axis(page, 'y')).toHaveValue('49'); await changed(page, before);
  await expect(page.locator('[data-formation-status]')).toHaveAttribute('role', 'status');
  await expect(page.locator('[data-formation-status]')).toContainText('Bird 2'); await expect(field(page)).toBeFocused();
  await page.keyboard.press('Control+ArrowRight');
  await expect(axis(page, 'x')).toHaveValue('55'); await expect(axis(page, 'y')).toHaveValue('49');
  await page.keyboard.press('Tab'); await expect(field(page)).not.toBeFocused();
  for (const [direction, key, value] of [['right', 'x', '60'], ['left', 'x', '55'], ['down', 'y', '54'], ['up', 'y', '49']] as const) {
    const button = page.locator('[data-formation-move=' + direction + ']'); await activate(page, button);
    await expect(axis(page, key)).toHaveValue(value); await expect(button).toBeFocused();
  }
  await field(page).focus(); before = await signature(page); await page.keyboard.press('v'); await changed(page, before);
  before = await signature(page); await page.keyboard.press('s'); await changed(page, before);
  await paint(page); before = await signature(page); await page.keyboard.press('Control+v'); await paint(page);
  expect(await signature(page), 'modified shortcuts must preserve the formation').toBe(before);

  // Changing the count replaces the flock; it must repaint even when the motion preference stops the clock.
  const count = page.getByRole('slider', { name: /^Number of birds in flock:/ });
  before = await signature(page); await count.focus(); await page.keyboard.press('ArrowRight');
  await expect(chooser(page).locator('option')).toHaveCount(10); expect((await data(page)).vBirdCount).toBe(10); await changed(page, before);
  await chooser(page).selectOption('0'); await setHalf(page, 'x'); await setHalf(page, 'y');
  await paint(page); const descriptionBeforeResize = await page.locator('[data-formation-position]').innerText();

  // Resize an initialized canvas, then drag using displayed coordinates. Read the result through the native sliders.
  await page.setViewportSize({ width: dark ? 640 : 320, height: 900 });
  const resizedLogical = await fittedCanvas(page); await paint(page); await field(page).scrollIntoViewIfNeeded();
  await expect(axis(page, 'x')).toHaveValue('50'); await expect(axis(page, 'y')).toHaveValue('50');
  await expect(page.locator('[data-formation-position]'), 'passive resizing must preserve position, role, upwash partner and formation efficiency').toHaveText(descriptionBeforeResize);
  const resized = await field(page).boundingBox(); expect(resized).not.toBeNull();
  const box = resized!, safe = { left: 28, right: resizedLogical.width - 28, top: 92, bottom: resizedLogical.height - 40 };
  const displayPoint = (x: number, y: number) => ({ x: box.x + (safe.left + (safe.right - safe.left) * x) / resizedLogical.width * box.width, y: box.y + (safe.top + (safe.bottom - safe.top) * y) / resizedLogical.height * box.height });
  const start = displayPoint(.5, .5), end = displayPoint(.7, .6);
  await field(page).evaluate(node => {
    for (const type of ['mousedown', 'mousemove']) node.addEventListener(type, event => {
      const rect = node.getBoundingClientRect(), e = event as MouseEvent;
      (window as any)[type === 'mousedown' ? '__formationPointerDown' : '__formationPointer'] = { x: e.clientX - rect.left, y: e.clientY - rect.top, width: rect.width, height: rect.height };
    });
  });
  before = await signature(page); await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 4 }); await page.mouse.up();
  const pointer = await page.evaluate(() => ({ start: (window as any).__formationPointerDown, end: (window as any).__formationPointer }));
  expect(pointer.start).toBeTruthy(); expect(pointer.end).toBeTruthy();
  // Browser coordinates round to CSS pixels. Dragging preserves the initial grab offset.
  const expectedX = Math.round(50 + (pointer.end.x - pointer.start.x) / pointer.end.width * resizedLogical.width / (safe.right - safe.left) * 100);
  const expectedY = Math.round(50 + (pointer.end.y - pointer.start.y) / pointer.end.height * resizedLogical.height / (safe.bottom - safe.top) * 100);
  expect(await percent(page, 'x')).toBeCloseTo(expectedX, 0); expect(await percent(page, 'y')).toBeCloseTo(expectedY, 0); await changed(page, before);
  await paint(page); const still = await signature(page); await page.waitForTimeout(400); expect(await signature(page), 'reduced motion must keep the edited formation still').toBe(still);

  const descriptionBeforeRestore = await page.locator('[data-formation-position]').innerText();
  await page.setViewportSize({ width: dark ? 320 : 1280, height: 900 }); const restoredLogical = await fittedCanvas(page); await paint(page);
  await expect(page.locator('[data-formation-position]'), 'returning to the original viewport must preserve the edited formation explanation').toHaveText(descriptionBeforeRestore);
  const normalAudit = await scan(page); expect(normalAudit.violations).toEqual([]); expect(normalAudit.scrollWidth).toBeLessThanOrEqual(normalAudit.width + 1);
  const normalSelectContrast = await selectContrast(page), normalFinal = await accessibility(page); unchangedSource();
  await page.locator('[data-formation-controls]').screenshot({ path: join(report, mode + '-formation-controls-normal.png') });
  await field(page).screenshot({ path: join(report, mode + '-formation-canvas-normal.png') });
  await page.locator('[role="tabpanel"]').screenshot({ path: join(report, mode + '-formation-activity-normal.png') });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addStyleTag({ content: '.migration-tool-shell *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.migration-tool-shell p{margin-bottom:2em!important}' });
  const narrowLogical = await fittedCanvas(page), narrowSelectContrast = await selectContrast(page);
  const spacingAudit = await scan(page); expect(spacingAudit.violations).toEqual([]); expect(spacingAudit.scrollWidth).toBeLessThanOrEqual(spacingAudit.width + 1);
  const final = await accessibility(page); expect(final.errors).toEqual([]); expect(final.violations).toEqual([]); unchangedSource();
  await page.locator('[data-formation-controls]').screenshot({ path: join(report, mode + '-formation-controls.png') });
  await field(page).screenshot({ path: join(report, mode + '-formation-canvas.png') });
  await page.locator('[role="tabpanel"]').screenshot({ path: join(report, mode + '-formation-activity.png') });
  unchangedSource(); writeFileSync(join(report, mode + '-formation-proof.json'), JSON.stringify({ hash, logical, resizedLogical, restoredLogical, narrowLogical, initialSelectContrast, normalSelectContrast, narrowSelectContrast, descriptionBeforeResize, descriptionBeforeRestore, pointer, expectedPosition: { x: expectedX, y: expectedY }, normalAudit, normalFinal, spacingAudit, final }, null, 2));
});

test('formation pause keeps pixels still while controls repaint and resume restores motion', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); await openFormation(page, false, false);
  const pause = page.locator('[data-formation-pause]'); await expect(pause).toHaveAttribute('aria-pressed', 'false');
  const running = await signature(page); await changed(page, running);
  await activate(page, pause); await expect(pause).toHaveAttribute('aria-pressed', 'true'); await paint(page);
  const paused = await signature(page); await page.waitForTimeout(500); expect(await signature(page)).toBe(paused);
  await chooser(page).selectOption('1'); await setHalf(page, 'x'); await paint(page);
  const before = await signature(page); await activate(page, page.locator('[data-formation-move=right]'));
  await expect(axis(page, 'x')).toHaveValue('55'); await changed(page, before); await paint(page);
  const edited = await signature(page); await page.waitForTimeout(500); expect(await signature(page), 'moving a bird must not resume the simulation').toBe(edited);
  await activate(page, pause); await expect(pause).toHaveAttribute('aria-pressed', 'false'); await changed(page, edited);
  await activate(page, pause); await expect(pause).toHaveAttribute('aria-pressed', 'true'); await paint(page);
  const final = await accessibility(page); expect(final.errors).toEqual([]); expect(final.violations).toEqual([]); unchangedSource();
  await page.locator('[data-formation-controls]').screenshot({ path: join(report, 'paused-formation-controls.png') });
  writeFileSync(join(report, 'formation-pause-proof.json'), JSON.stringify({ hash, running, paused, edited, final }, null, 2));
});
