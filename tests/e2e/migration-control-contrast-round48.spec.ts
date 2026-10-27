import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, frames, data } from './helpers/migration_round31';

test.describe.configure({ timeout: 120_000, retries: 0 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round48-2026-10-26');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath), hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const errors = new WeakMap<Page, string[]>();
const snapshot = (wind = 0) => ({ speciesId: 'canada_goose', season: 'fall', wind, formationMode: 'natural' });
function authored() {
  const record = (region: string) => ({ speciesId: 'canada_goose', region, note: 'Saved ' + region + ' evidence.', bird: 0,
    yaw: 35, pitch: 15, zoom: 1.2, wingStep: 13, paused: true, motionReduced: true });
  const challengeBaseline = { speciesId: 'monarch', season: 'fall', wind: -15, formationMode: 'natural', formation: 'swarm', groundSpeed: 0, benefit: 0 };
  return {
    flightStudyObservations: { drafts: { 'canada_goose:primaries': 'My Study draft.' },
      records: { 'canada_goose:primaries': record('primaries'), 'canada_goose:tail': record('tail') },
      comparison: { firstKey: 'canada_goose:primaries', secondKey: 'canada_goose:tail', draft: 'My comparison draft.' } },
    flightInvestigation: { variable: 'wind', prediction: 'My investigation prediction.', baseline: snapshot(),
      trials: [{ variable: 'wind', prediction: 'Saved prediction.', baseline: snapshot(), snapshot: snapshot(10) }],
      evidence: 'My investigation evidence.', explanation: 'My investigation explanation.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'My challenge prediction.', notes: 'My challenge explanation.',
      setup: challengeBaseline, attempts: [{ baseline: challengeBaseline, snapshot: { ...challengeBaseline, wind: 4, groundSpeed: 21 }, prediction: 'Saved prediction.', notes: 'Saved explanation.' }] } } }
  };
}
function unchangedSource() {
  expect(readFileSync(sourcePath).equals(source)).toBe(true);
  expect(readFileSync(mirrorPath).equals(source)).toBe(true);
}
test.beforeAll(async () => { unchangedSource(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { expect(errors.get(page) || []).toEqual([]); unchangedSource(); await harness.destroy(page); });
async function openDetails(page: Page, details: Locator) {
  if (!(await details.evaluate(node => (node as HTMLDetailsElement).open))) {
    await details.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
  }
}
async function prepare(page: Page, theme: string) {
  const failures: string[] = []; errors.set(page, failures); page.on('pageerror', error => failures.push(error.stack || error.message));
  await mount(harness, page, 'canada_goose', { dark: theme === 'dark', reduced: true, extra: authored() });
  if (theme === 'contrast') {
    await page.evaluate(() => { const w = window as any; w.__ctx.isContrast = true; w.__ctx.isDark = false; w.__ctx.theme = 'contrast'; document.documentElement.classList.add('theme-contrast'); w.__rerender(); });
  }
  await expect(page.locator('.migration-tool-shell')).toHaveAttribute('data-migration-theme', theme);
  const challenge = page.locator('[data-migration-flight-challenges]'); await openDetails(page, challenge);
  await openDetails(page, challenge.locator('[data-flight-challenge-history]'));
  await openDetails(page, challenge.locator('[data-flight-challenge-attempt="1"] [data-flight-challenge-reflection]'));
  await challenge.locator('[data-flight-challenge-attempt="1"] [data-flight-reflection-action="edit"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-flight-reflection-input="1"]')).toBeVisible(); await frames(page);
}
async function inspectFields(page: Page) {
  return page.locator('.migration-tool-shell').evaluate(root => {
    type Color = [number, number, number, number];
    type Bounds = { min: Color; max: Color };
    const color = (value: string): Color => {
      if (/^#[\da-f]{6}$/i.test(value)) return [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16), 1];
      if (/^#[\da-f]{3}$/i.test(value)) return [parseInt(value[1] + value[1], 16), parseInt(value[2] + value[2], 16), parseInt(value[3] + value[3], 16), 1];
      const channels = value.match(/[\d.]+/g)?.map(Number); if (!channels || channels.length < 3) throw new Error('Unsupported computed color: ' + value);
      return [channels[0], channels[1], channels[2], channels[3] ?? 1];
    };
    const composite = (front: Color, back: Color): Color => {
      const alpha = front[3] + back[3] * (1 - front[3]);
      return [0, 1, 2].map(index => alpha ? (front[index] * front[3] + back[index] * back[3] * (1 - front[3])) / alpha : 0).concat(alpha) as Color;
    };
    const bounds = (values: Color[]): Bounds => ({ min: [0, 1, 2, 3].map(i => Math.min(...values.map(v => v[i]))) as Color, max: [0, 1, 2, 3].map(i => Math.max(...values.map(v => v[i]))) as Color });
    const solid = (c: Color): Bounds => ({ min: c, max: c });
    const over = (front: Bounds, back: Bounds): Bounds => bounds([front.min, front.max].flatMap(f => [back.min, back.max].map(b => composite(f, b))));
    const luminance = (c: Color) => c.slice(0, 3).map(value => { const n = value / 255; return n <= .04045 ? n / 12.92 : Math.pow((n + .055) / 1.055, 2.4); }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
    const worstRatio = (a: Bounds, b: Bounds) => {
      const alo = luminance(a.min), ahi = luminance(a.max), blo = luminance(b.min), bhi = luminance(b.max);
      if (ahi < blo) return (blo + .05) / (ahi + .05);
      if (bhi < alo) return (alo + .05) / (bhi + .05);
      return 1;
    };
    const icon = (node: Element, image: string) => {
      if (node.tagName !== 'SELECT' || !image.startsWith('url("data:image/svg+xml,')) return null;
      const url = image.slice(5, -2), svgText = decodeURIComponent(url.slice(url.indexOf(',') + 1));
      const svg = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement, paths = [...svg.querySelectorAll('path')];
      if (svg.localName !== 'svg' || svg.getAttribute('viewBox') !== '0 0 20 20' || paths.length !== 1 ||
          paths[0].getAttribute('d')?.replace(/[\s,]/g, '') !== 'm68444-4' || svg.querySelectorAll('*').length !== 1 || svg.getAttribute('fill') !== 'none') return null;
      const path = paths[0], stroke = path.getAttribute('stroke') || svg.getAttribute('stroke');
      if (!stroke || Number(path.getAttribute('stroke-opacity') || svg.getAttribute('stroke-opacity') || 1) !== 1) return null;
      return { stroke, strokeWidth: Number(path.getAttribute('stroke-width') || svg.getAttribute('stroke-width') || 1), image };
    };
    const effective = (node: Element | null) => {
      let range = solid([0, 0, 0, 0]); const layers: any[] = [], unresolved: string[] = [];
      for (let current = node; current && range.min[3] < .9999; current = current.parentElement) {
        const style = getComputedStyle(current), fill = color(style.backgroundColor), image = style.backgroundImage;
        let layer = solid(fill), model = 'solid';
        if (image !== 'none') {
          if (icon(current, image)) model = 'known-dropdown-chevron-measured-separately';
          else if (current.classList.contains('migration-flight-controls') && image.startsWith('linear-gradient(')) {
            const stops = image.match(/rgba?\([^)]*\)/g)?.map(color) || [];
            // Bound every channel across the opaque dark-sidebar stops. This tests
            // the worst luminance within the envelope, not just one endpoint.
            if (stops.length >= 2 && stops.every(stop => stop[3] === 1)) { layer = bounds(stops); model = 'opaque-sidebar-gradient-channel-envelope'; }
            else unresolved.push('Unsupported sidebar gradient: ' + image);
          } else unresolved.push('Unknown background image at ' + current.tagName + '.' + current.className);
        }
        if (Number(style.opacity) !== 1) unresolved.push('Group opacity at ' + current.tagName + '.' + current.className);
        layers.push({ element: current.tagName + (current.className ? '.' + String(current.className).trim().split(/\s+/).join('.') : ''), color: style.backgroundColor, image, model, opacity: style.opacity });
        range = over(range, layer);
      }
      if (range.min[3] < .9999) unresolved.push('Transparent page background');
      return { range, layers, unresolved };
    };
    return [...root.querySelectorAll<HTMLTextAreaElement | HTMLSelectElement>('textarea,select')].filter(field => {
      const rect = field.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && getComputedStyle(field).visibility !== 'hidden';
    }).map(field => {
      const style = getComputedStyle(field), outside = effective(field.parentElement), inside = effective(field);
      const borders = ['Top', 'Right', 'Bottom', 'Left'].map(side => {
        const c = (style as any)['border' + side + 'Color'], painted = over(solid(color(c)), inside.range);
        return { side, color: c, width: (style as any)['border' + side + 'Width'], style: (style as any)['border' + side + 'Style'], painted,
          againstInside: worstRatio(painted, inside.range), againstOutside: worstRatio(painted, outside.range) };
      });
      const arrow = icon(field, style.backgroundImage), rect = field.getBoundingClientRect();
      const placeholderText = field.getAttribute('placeholder'), placeholderStyle = placeholderText ? getComputedStyle(field, '::placeholder') : null;
      const placeholderColor: Color = placeholderStyle ? color(placeholderStyle.color) : [0, 0, 0, 0];
      if (placeholderStyle) placeholderColor[3] *= Number(placeholderStyle.opacity);
      return { key: field.getAttribute('data-migration-id') || field.getAttribute('aria-label') || field.name || field.tagName,
        tag: field.tagName, labels: [...(field.labels || [])].map(label => label.textContent?.trim()), disabled: field.disabled,
        background: style.backgroundColor, backgroundImage: style.backgroundImage, backgroundClip: style.backgroundClip, opacity: style.opacity,
        appearance: style.appearance, colorScheme: style.colorScheme, direction: style.direction,
        paddingLeft: style.paddingLeft, paddingRight: style.paddingRight, paddingInlineEnd: style.paddingInlineEnd, backgroundPositionX: style.backgroundPositionX,
        inside, outside, fillAgainstOutside: worstRatio(inside.range, outside.range), borders,
        width: rect.width, height: rect.height, fontSize: style.fontSize, color: style.color,
        textAgainstInside: worstRatio(over(solid(color(style.color)), inside.range), inside.range),
        placeholder: placeholderStyle ? { text: placeholderText, color: placeholderStyle.color, opacity: placeholderStyle.opacity,
          againstInside: worstRatio(over(solid(placeholderColor), inside.range), inside.range) } : null,
        arrow: arrow ? { ...arrow, againstInside: worstRatio(over(solid(color(arrow.stroke)), inside.range), inside.range) } : null,
        focus: { visible: field.matches(':focus-visible'), outlineColor: style.outlineColor, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineOffset: style.outlineOffset,
          againstOutside: worstRatio(over(solid(color(style.outlineColor)), outside.range), outside.range) } };
    });
  });
}
function assertFields(fields: Awaited<ReturnType<typeof inspectFields>>, nativeArrows = false) {
  expect(fields).toHaveLength(15);
  for (const field of fields) {
    expect([...field.inside.unresolved, ...field.outside.unresolved], field.key + ' has an unresolved surface').toEqual([]);
    expect(field.disabled).toBe(false);
    for (const border of field.borders) {
      expect(parseFloat(border.width), field.key + ' ' + border.side + ' width').toBeGreaterThanOrEqual(2);
      expect(border.style).toBe('solid');
      expect(border.againstInside, field.key + ' ' + border.side + ' against field interior').toBeGreaterThanOrEqual(3);
      expect(border.againstOutside, field.key + ' ' + border.side + ' against surrounding surface').toBeGreaterThanOrEqual(3);
    }
    expect(field.textAgainstInside, field.key + ' text').toBeGreaterThanOrEqual(4.5);
    if (field.placeholder) expect(field.placeholder.againstInside, field.key + ' placeholder').toBeGreaterThanOrEqual(4.5);
    if (field.tag === 'SELECT') {
      if (nativeArrows) { expect(field.backgroundImage).toBe('none'); expect(field.appearance).toBe('auto'); }
      else { expect(field.arrow, field.key + ' known visible arrow').not.toBeNull(); expect(field.arrow!.againstInside, field.key + ' arrow').toBeGreaterThanOrEqual(3); expect(field.arrow!.strokeWidth).toBeGreaterThanOrEqual(2); }
    }
  }
}
async function scan(page: Page, forcedColors = false) {
  await page.addScriptTag({ path: join(process.cwd(), 'axe-core/4.12.1/axe.min.js') });
  const audit = await page.evaluate(async forcedColors => {
    const result = await (window as any).axe.run(document.querySelector('.migration-tool-shell'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: forcedColors ? { 'color-contrast': { enabled: false } } : {}
    });
    return { scope: '.migration-tool-shell', excludedRules: forcedColors ? [{ id: 'color-contrast', reason: 'Forced used colors are applied at paint time and do not reliably match computed author colors. The 15 native fields, their boundaries/placeholders, and active focus are measured separately; the scene screenshot records the painted system palette. All normal-theme and enlarged RTL scans retain this rule.' }] : [],
      violations: result.violations, incomplete: result.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) };
  }, forcedColors); expect(audit.violations).toEqual([]); return audit;
}
const snapshotWork = (state: any) => ({ observations: state.flightStudyObservations, investigation: state.flightInvestigation,
  notes: state.flightChallenges.work.wind.notes, attempts: state.flightChallenges.work.wind.attempts.map((attempt: any) => ({ baseline: attempt.baseline, snapshot: attempt.snapshot, prediction: attempt.prediction, notes: attempt.notes, reflection: attempt.reflection || '' })) });
for (const theme of ['light', 'dark', 'contrast']) test('field boundaries, placeholders and dropdown arrows remain readable in ' + theme, async ({ page }) => {
  await prepare(page, theme); await page.locator('.migration-flight-stage').focus(); const before = await data(page), fields = await inspectFields(page); assertFields(fields);
  const audit = await scan(page); expect(await data(page)).toEqual(before);
  await page.locator('.migration-mission-writing').screenshot({ path: join(report, theme + '-writing-boundaries.png') });
  writeFileSync(join(report, theme + '-control-contrast-proof.json'), JSON.stringify({ hash, theme, fields, audit,
    method: 'All four borders are checked against the field interior and surrounding surface. Dark sidebar gradient colors use a conservative channel envelope; only the verified dropdown chevron is excluded from fill and its stroke is checked separately. Placeholder opacity is composited before contrast measurement.' }, null, 2));
});
test('forced colors keeps native dropdown affordances and visible keyboard focus', async ({ page }) => {
  await prepare(page, 'light'); await page.emulateMedia({ forcedColors: 'active', colorScheme: 'light', reducedMotion: 'reduce' });
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);
  const prediction = page.locator('[data-migration-id="migration-mission-prediction"]'); await prediction.focus();
  const fields = await inspectFields(page); assertFields(fields, true);
  const active = fields.find(field => field.key === 'migration-mission-prediction')!;
  expect(active.focus.visible).toBe(true); expect(parseFloat(active.focus.outlineWidth)).toBeGreaterThanOrEqual(3); expect(active.focus.againstOutside).toBeGreaterThanOrEqual(3);
  await page.locator('.migration-mission-writing').screenshot({ path: join(report, 'forced-colors-writing-boundaries.png') });
  await page.locator('.migration-flight-deck').screenshot({ path: join(report, 'forced-colors-flight-deck.png') });
  const audit = await scan(page, true); expect(audit.excludedRules.map(rule => rule.id)).toEqual(['color-contrast']);
  writeFileSync(join(report, 'forced-colors-control-contrast-proof.json'), JSON.stringify({ hash, fields, audit, scope: 'Chromium forced-colors emulation with native dropdown appearance and keyboard focus; actual OS high-contrast verification remains manual.' }, null, 2));
});
test('large RTL text keeps field boundaries and arrows inside a narrow layout without losing learner work', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await prepare(page, 'light');
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  const sizes = await page.locator('.migration-tool-shell').evaluate(root => {
    const fields = [...root.querySelectorAll<HTMLElement>('textarea,select,label')], before = fields.map(field => parseFloat(getComputedStyle(field).fontSize));
    fields.forEach((field, index) => field.style.setProperty('font-size', before[index] * 2 + 'px', 'important'));
    return fields.map((field, index) => ({ before: before[index], after: parseFloat(getComputedStyle(field).fontSize) }));
  });
  expect(sizes.every(size => Math.abs(size.after - size.before * 2) < .1)).toBe(true);
  await page.addStyleTag({ content: '.migration-tool-shell :is(textarea,select,label){line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}' });
  const before = await data(page), preserved = snapshotWork(before), prediction = page.locator('[data-migration-id="migration-mission-prediction"]');
  const text = 'ملاحظتي التالية: أحافظ على الأدلة وأغيّر شرطًا واحدًا.'; await prediction.fill(text); await expect(prediction).toHaveValue(text);
  const individual = page.getByRole('combobox', { name: 'Study individual', exact: true }); await individual.selectOption('1'); await expect(individual).toHaveValue('1'); await individual.selectOption('0'); await expect(individual).toHaveValue('0');
  expect(snapshotWork(await data(page))).toEqual(preserved); expect((await data(page)).flightChallenges.work.wind.prediction).toBe(text);
  await prediction.focus(); const fields = await inspectFields(page); assertFields(fields);
  for (const field of fields.filter(field => field.tag === 'SELECT')) { expect(field.direction).toBe('rtl'); expect(parseFloat(field.paddingInlineEnd)).toBeGreaterThanOrEqual(40); expect(parseFloat(field.backgroundPositionX)).toBeLessThan(field.width / 2); }
  const layout = await page.locator('.migration-tool-shell').evaluate(root => {
    const failures: string[] = [], viewport = innerWidth;
    for (const node of root.querySelectorAll<HTMLElement>('textarea,select,label')) {
      const rect = node.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
      if (rect.left < -1 || rect.right > viewport + 1) failures.push('Field or label leaves viewport: ' + (node.getAttribute('data-migration-id') || node.getAttribute('aria-label') || node.textContent?.slice(0, 50)));
      if (node.tagName === 'TEXTAREA' && node.scrollWidth > node.clientWidth + 1) failures.push('Textarea content overflows horizontally: ' + node.getAttribute('data-migration-id'));
    }
    return { failures, viewport, documentWidth: document.documentElement.scrollWidth };
  });
  expect(layout.failures).toEqual([]); expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1);
  await page.locator('.migration-mission-writing').screenshot({ path: join(report, 'rtl-large-text-writing-boundaries.png') });
  const audit = await scan(page);
  writeFileSync(join(report, 'rtl-large-text-control-contrast-proof.json'), JSON.stringify({ hash, fields, layout, sizes, preservedBefore: preserved, preservedAfter: snapshotWork(await data(page)), prediction: text, audit,
    scope: '320 CSS-pixel viewport, doubled field/label text and text-spacing overrides, RTL direction, native typing and select changes. Actual browser zoom remains a manual check.' }, null, 2));
});
