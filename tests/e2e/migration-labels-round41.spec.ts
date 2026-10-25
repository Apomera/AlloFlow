import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, data, accessibility } from './helpers/migration_round31';

test.describe.configure({ timeout: 150_000, retries: 0 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round41-2026-10-24');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath), hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const board = (page: Page) => page.locator('[data-formation-readout]');
const field = (page: Page) => page.locator('[data-formation-canvas]');

function unchangedSource() {
  expect(readFileSync(sourcePath).equals(source), 'source changed during verification').toBe(true);
  expect(readFileSync(mirrorPath).equals(source), 'desktop mirror differs from tested source').toBe(true);
}
test.beforeAll(async () => { unchangedSource(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); }
async function paint(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function openFormation(page: Page, dark = false) {
  await mount(harness, page, 'canada_goose', { dark, reduced: true, extra: {
    vBirdCount: 9, vLeaderRotations: 3, perfectVFormed: true,
    inquiry: { hypothesis: 'Keep the learner prediction.' },
    flightStudyObservations: { drafts: { 'goose:wing': 'Keep the learner evidence.' } }
  } });
  await activate(page, page.locator('[data-migration-tab="vformation"]'));
  await expect(field(page)).toBeVisible(); await expect(board(page)).toBeVisible(); await paint(page);
}
async function readout(page: Page) {
  return board(page).evaluate(node => {
    const meter = node.querySelector('[data-formation-efficiency-meter]') as HTMLMeterElement;
    return {
      efficiency: node.querySelector('[data-formation-efficiency]')!.textContent!.trim(),
      saving: node.querySelector('[data-formation-saving]')!.textContent!.trim(),
      rotations: node.querySelector('[data-formation-rotations]')!.textContent!.trim(),
      meter: { value: meter.value, min: meter.min, max: meter.max },
      description: document.querySelector('[data-formation-position]')!.textContent!
    };
  });
}
async function expectConsistentReadout(page: Page) {
  const result = await readout(page), efficiency = Number(result.efficiency.replace('%', ''));
  expect(result.meter).toEqual({ value: efficiency, min: 0, max: 100 });
  expect(efficiency).toBeGreaterThanOrEqual(0); expect(efficiency).toBeLessThanOrEqual(100);
  expect(result.description).toContain('Formation efficiency: ' + efficiency + '%');
  expect(Number(result.saving.replace('%', ''))).toBe(Math.round(efficiency * .22));
  expect(result.rotations).toBe('3');
  return result;
}
async function fittedCanvas(page: Page) {
  await expect.poll(() => field(page).evaluate(node => {
    const canvas = node as HTMLCanvasElement, width = canvas.getBoundingClientRect().width;
    return Math.max(Math.abs(canvas.width / devicePixelRatio - width), Math.abs((canvas as any)._vfLogicalSize.width - width));
  })).toBeLessThanOrEqual(1);
}
async function scan(page: Page) {
  await page.addScriptTag({ path: join(process.cwd(), 'axe-core/4.12.1/axe.min.js') });
  return page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('.migration-tool-shell'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
    });
    return { violations: result.violations, incomplete: result.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) };
  });
}
async function layoutProof(page: Page) {
  const result = await board(page).evaluate(node => {
    const rect = (element: Element) => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const boundary = rect(node), canvas = rect(document.querySelector('[data-formation-canvas]')!);
    const failures: string[] = [], labels: any[] = [], lines: any[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      if (!text.textContent?.trim() || text.parentElement?.closest('[aria-hidden="true"]')) continue;
      const range = document.createRange(); range.selectNodeContents(text);
      for (const line of Array.from(range.getClientRects())) {
        if (!line.width || !line.height) continue;
        const record = { text: text.textContent.trim(), left: line.left, right: line.right, top: line.top, bottom: line.bottom };
        lines.push(record);
        if (line.left < boundary.left - 1 || line.right > boundary.right + 1 || line.top < boundary.top - 1 || line.bottom > boundary.bottom + 1) failures.push('Clipped label: ' + record.text);
      }
    }
    // Sibling definition terms/values and wake items must have their own space.
    for (const parent of [node.querySelector('dl'), node.querySelector('[data-formation-wake-key]')]) {
      if (!parent) continue;
      const children = Array.from(parent.children);
      for (let i = 0; i < children.length; i++) for (let j = i + 1; j < children.length; j++) {
        const a = rect(children[i]), b = rect(children[j]);
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) failures.push('Overlapping metric or key items');
      }
    }
    for (const item of Array.from(node.querySelectorAll('dt,dd,[data-formation-wake], [data-formation-readout-title]'))) {
      const style = getComputedStyle(item);
      labels.push({ text: item.textContent?.trim(), ...rect(item), font: style.fontSize, color: style.color, overflow: style.overflow, scrollWidth: item.scrollWidth, clientWidth: item.clientWidth });
      if (item.scrollWidth > item.clientWidth + 1) failures.push('Horizontally overflowing label: ' + item.textContent);
    }
    if (boundary.bottom > canvas.top + 1) failures.push('Readout overlaps canvas');
    return { boundary, canvas, labels, lineCount: lines.length, failures, width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(result.failures).toEqual([]); expect(result.lineCount).toBeGreaterThan(6);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.width + 1);
  return result;
}
async function enlargeReadout(page: Page) {
  const sizes = await board(page).evaluate(node => {
    const nodes = [node, ...Array.from(node.querySelectorAll('*'))];
    const sizes = nodes.map(element => parseFloat(getComputedStyle(element).fontSize));
    nodes.forEach((element, index) => (element as HTMLElement).style.setProperty('font-size', sizes[index] * 2 + 'px', 'important'));
    return nodes.map((element, index) => ({ before: sizes[index], after: parseFloat(getComputedStyle(element).fontSize) }));
  });
  expect(sizes.every(item => Math.abs(item.after - item.before * 2) < .1)).toBe(true);
  await page.addStyleTag({ content: '.migration-tool-shell *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.migration-tool-shell p{margin-bottom:2em!important}' });
}
async function assertSemanticBoard(page: Page) {
  await expect(page.locator('[data-formation-figure]')).toHaveRole('figure');
  await expect(page.locator('[data-formation-figure]')).toHaveAccessibleName(/\S/);
  expect(await board(page).evaluate(node => node.tagName)).toBe('FIGCAPTION');
  await expect(board(page).locator('dl')).toHaveCount(1);
  await expect(board(page).locator('[data-formation-efficiency-meter]')).toHaveRole('meter');
  await expect(board(page).locator('[data-formation-efficiency-meter]')).toHaveAccessibleName(/formation efficiency/i);
  const described = await field(page).getAttribute('aria-describedby'), key = page.locator('[data-formation-wake-key]');
  expect(described!.split(' ')).toContain(await key.getAttribute('id'));
  await expect(key).toHaveRole('list');
  for (const kind of ['upwash', 'downwash']) {
    const item = key.locator('[data-formation-wake=' + kind + ']');
    await expect(item).toHaveRole('listitem'); await expect(item).toContainText(new RegExp(kind, 'i'));
    await expect(item.locator('[aria-hidden="true"]')).not.toHaveCount(0);
  }
  expect(await board(page).locator('[aria-live],[role=status],[role=alert]').count(), 'automatic values must not become a second live announcement stream').toBe(0);
}

for (const theme of ['light', 'dark']) test('formation labels reflow and remain operable in ' + theme, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await openFormation(page, theme === 'dark');
  const initial = await data(page); await assertSemanticBoard(page);
  await activate(page, page.getByRole('button', { name: 'Auto-form V formation', exact: true })); await paint(page);
  const formed = await expectConsistentReadout(page); expect(formed.efficiency).toBe('100%'); expect(formed.saving).toBe('22%');
  await page.locator('[data-formation-bird-select]').selectOption('1');
  await activate(page, page.locator('[data-formation-focus]')); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowUp');
  await expect(field(page)).toBeFocused(); await paint(page); const moved = await expectConsistentReadout(page);
  await page.keyboard.press('Tab'); await expect(field(page)).not.toBeFocused();
  const desktop = await layoutProof(page), normalAudit = await scan(page); expect(normalAudit.violations).toEqual([]);
  unchangedSource(); await page.locator('[data-formation-figure]').screenshot({ path: join(report, theme + '-formation-figure.png') });
  await page.setViewportSize({ width: 320, height: 1000 }); await fittedCanvas(page); await paint(page);
  expect(await expectConsistentReadout(page)).toEqual(moved);
  await enlargeReadout(page); await paint(page);
  const enlarged = await layoutProof(page), enlargedAudit = await scan(page); expect(enlargedAudit.violations).toEqual([]);
  await activate(page, page.locator('[data-formation-move=left]')); await paint(page); await expectConsistentReadout(page);
  await activate(page, page.getByRole('button', { name: 'Scatter birds randomly', exact: true })); await paint(page); const scattered = await expectConsistentReadout(page);
  const final = await accessibility(page); expect(final.errors).toEqual([]); expect(final.violations).toEqual([]);
  const saved = await data(page); expect(saved.inquiry).toEqual(initial.inquiry); expect(saved.flightStudyObservations).toEqual(initial.flightStudyObservations);
  unchangedSource(); await board(page).screenshot({ path: join(report, theme + '-formation-labels-spacing.png') });
  writeFileSync(join(report, theme + '-labels-proof.json'), JSON.stringify({ hash, formed, moved, scattered, desktop, enlarged, normalAudit, enlargedAudit, final }, null, 2));
});

test('long translated formation labels retain their shape cues in forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 }); await page.emulateMedia({ forcedColors: 'active' }); await openFormation(page);
  const headerProof = await page.locator('.migration-command').evaluate(header => {
    const probe = document.createElement('span'); probe.style.display = 'none'; document.body.append(probe);
    const system = (foreground: string, background: string) => {
      probe.style.color = foreground; probe.style.backgroundColor = background;
      const style = getComputedStyle(probe); return { color: style.color, background: style.backgroundColor };
    };
    const canvas = system('CanvasText', 'Canvas'), button = system('ButtonText', 'ButtonFace'); probe.remove();
    const luminance = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(c => {
      c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
    }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
    const contrast = (foreground: string, background: string) => {
      const a = luminance(foreground), b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    };
    const background = getComputedStyle(header).backgroundColor;
    const labels = Array.from(header.querySelectorAll('h2,p,.migration-eyebrow')).map(element => {
      const style = getComputedStyle(element);
      return { text: element.textContent?.trim(), color: style.color, contrast: contrast(style.color, background) };
    });
    const back = header.querySelector('.migration-command-main>button')!, style = getComputedStyle(back);
    return { canvas, button, background, labels, back: { color: style.color, background: style.backgroundColor, contrast: contrast(style.color, style.backgroundColor) } };
  });
  expect(headerProof.background).toBe(headerProof.canvas.background);
  expect(headerProof.labels.length).toBeGreaterThanOrEqual(3);
  for (const label of headerProof.labels) {
    expect(label.color, label.text).toBe(headerProof.canvas.color);
    expect(label.contrast, label.text).toBeGreaterThanOrEqual(4.5);
  }
  expect(headerProof.back.color).toBe(headerProof.button.color);
  expect(headerProof.back.background).toBe(headerProof.button.background);
  expect(headerProof.back.contrast).toBeGreaterThanOrEqual(4.5);
  unchangedSource(); await page.locator('.migration-command').screenshot({ path: join(report, 'forced-color-header.png') });
  await page.evaluate(() => {
    const w = window as any, original = w.__ctx.t;
    w.__ctx.t = (key: string, fallback: string, ...args: any[]) => {
      const value = original(key, fallback, ...args);
      return key.startsWith('stem.migration.formation_') ? 'Ausführliche Übersetzung: ' + value + ' — zusätzliche Erläuterung für den genauen Vergleich.' : value;
    };
    w.__rerender();
  });
  await paint(page); await enlargeReadout(page); await paint(page);
  await expect(page.locator('[data-formation-readout-title]')).toContainText('Ausführliche Übersetzung');
  for (const item of await board(page).locator('dt,[data-formation-wake]').all()) await expect(item).toContainText('Ausführliche Übersetzung');
  const layout = await layoutProof(page), audit = await scan(page); expect(audit.violations).toEqual([]);
  const shapes = await page.locator('[data-formation-wake-key]').evaluate(node => Array.from(node.querySelectorAll('[aria-hidden="true"]')).map(item => ({ text: item.textContent, color: getComputedStyle(item).color, visibility: getComputedStyle(item).visibility, display: getComputedStyle(item).display })));
  expect(shapes.length).toBeGreaterThanOrEqual(2); expect(new Set(shapes.map(item => item.text)).size).toBeGreaterThanOrEqual(2);
  expect(shapes.every(item => item.visibility !== 'hidden' && item.display !== 'none')).toBe(true);
  await activate(page, page.locator('[data-formation-focus]')); await expect(field(page)).toBeFocused();
  const focus = await field(page).evaluate(node => ({ width: getComputedStyle(node).outlineWidth, style: getComputedStyle(node).outlineStyle, offset: getComputedStyle(node).outlineOffset }));
  expect(focus.width).toBe('3px'); expect(focus.style).toBe('solid'); expect(parseFloat(focus.offset)).toBeLessThan(0);
  const final = await accessibility(page); expect(final.errors).toEqual([]); expect(final.violations).toEqual([]);
  unchangedSource(); await board(page).screenshot({ path: join(report, 'translated-forced-color-labels.png') });
  writeFileSync(join(report, 'translated-labels-proof.json'), JSON.stringify({ hash, headerProof, layout, audit, shapes, focus, final }, null, 2));
});
