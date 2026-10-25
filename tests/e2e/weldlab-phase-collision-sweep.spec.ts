import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const require = createRequire(resolve('package.json'));
const { PNG } = require(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const output = resolve('reports/weldlab-phase-accessibility/collision-sweep');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js', preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'], appStyles: true, layout: 'document' });
// The source/spec revision survives Playwright worker restarts. Each context
// persists independently, so a failed worker cannot overwrite earlier results.
const revision = createHash('sha256').update(readFileSync(resolve('stem_lab/stem_tool_weldlab.js'))).update(readFileSync(resolve('tests/e2e/weldlab-phase-collision-sweep.spec.ts'))).digest('hex');
function persistedResults(): any[] {
  return readdirSync(output).filter(name => name.endsWith('-measurements.json')).map(name => JSON.parse(readFileSync(resolve(output, name), 'utf8'))).filter(result => result.revision === revision).sort((a, b) => a.name.localeCompare(b.name));
}
const callouts = [
  { id: 'liquid', number: 1, c: 1.5, t: 1560, r: 9 }, { id: 'mushy', number: 2, c: 1.45, t: 1338, r: 9 },
  { id: 'delta', number: 3, c: .045, t: 1468, r: 7 }, { id: 'austenite', number: 4, c: 1, t: 1080, r: 9 },
  { id: 'ferrite_austenite', number: 5, c: .25, t: 783, r: 9 }, { id: 'austenite_cementite', number: 6, c: 1.6, t: 870, r: 9 },
  { id: 'ferrite_pearlite', number: 7, c: .6, t: 640, r: 9 }, { id: 'pearlite_cementite', number: 8, c: 1.45, t: 620, r: 9 }
];
const retained = { car2_reflect: 'Keep my project notes.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const x = (c: number) => 50 + c / 2.1 * 416;
const y = (t: number) => 318 - (t - 400) / 1200 * 306;
test.describe.configure({ timeout: 360_000, retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => {
  const results = persistedResults();
  const candidates = results.flatMap(context => context.texts.filter((text: any) => text.rectangleMinimum < text.threshold).map((text: any) => ({ context: context.name, text: text.text, callout: text.callout, rectangleMinimum: text.rectangleMinimum, rectangleMedian: text.rectangleMedian, rectangleLowFraction: text.rectangleLowFraction, glyphSamples: text.glyphSamples, glyphMinimum: text.glyphMinimum })));
  const groups = new Map<string, any[]>();
  for (const context of results) for (const text of context.texts) {
    const themeWidth = context.name.replace(/^[^-]+-/, '');
    const key = themeWidth + ':' + text.index + ':' + text.text;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ context: context.name, samples: text.glyphSamples });
  }
  const glyphCoverageVariation = [...groups].map(([key, values]) => ({ key, minimum: Math.min(...values.map(v => v.samples)), maximum: Math.max(...values.map(v => v.samples)), values })).filter(record => record.minimum !== record.maximum);
  writeFileSync(resolve(output, 'triage.json'), JSON.stringify({ contexts: results.length, textMeasurements: results.reduce((n, context) => n + context.texts.length, 0), rectangleCandidates: candidates, glyphCoverageVariation, interpretation: 'Conservative rectangle candidates can include badge borders or spaces; inspect captured images. Glyph coverage variation can identify partially occluded letters but also pixel rounding differences. Do not equate the core-glyph contrast assertions with complete text integrity or full WCAG conformance.' }, null, 2));
  await harness.stop();
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, state: object, width: number, contrast: boolean) {
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const host = document.createElement('div'); document.body.append(host); const w = window as any; w.ReactDOM.render(w.React.createElement(w.AlloModules.AppStyles.AppStyles), host); });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
  await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.height = 'auto'; el.style.display = 'block'; });
  await page.waitForFunction(() => Math.abs(document.getElementById('wrap')!.getBoundingClientRect().width - innerWidth) < 1);
  if (contrast) await page.evaluate(() => { document.body.classList.add('theme-contrast'); Object.assign((window as any).__ctx, { isContrast: true, theme: 'contrast' }); (window as any).__rerender(); });
  await page.waitForTimeout(250);
}
const rgb = (s: string) => s.match(/[\d.]+/g)!.slice(0, 3).map(Number);
const luminance = (c: number[]) => c.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
const ratio = (a: number[], b: number[]) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

// One visible/ground screenshot pair covers every SVG text. Rectangle metrics
// retain candidates such as guide crossings and circle-border corners. The
// actual glyph mask excludes surrounding whitespace and antialiased edges;
// it cannot by itself prove that every partially occluded glyph is intact.
async function sampleAllText(page: Page, plot: Locator, name: string) {
  await plot.scrollIntoViewIfNeeded();
  const data = await plot.evaluate((svg: SVGSVGElement) => {
    const bounds = svg.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height, texts: [...svg.querySelectorAll('text')].map((el, index) => {
      const style = getComputedStyle(el), box = el.getBoundingClientRect();
      let opacity = 1; for (let p: Element | null = el; p; p = p.parentElement) opacity *= Number(getComputedStyle(p).opacity);
      const font = parseFloat(style.fontSize) * Math.abs(el.getScreenCTM()!.d);
      const ranges = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()).flatMap(n => { const range = document.createRange(); range.selectNodeContents(n); return [...range.getClientRects()].map(r => ({ x: r.x - bounds.x, y: r.y - bounds.y, width: r.width, height: r.height })); });
      return { index, text: el.textContent, callout: el.closest('[data-fec-callout]')?.getAttribute('data-fec-callout') || null, foreground: style.fill, opacity, font, threshold: font >= 24 || (font >= 18.6666667 && Number(style.fontWeight) >= 700) ? 3 : 4.5, style: el.getAttribute('style'), ranges, box: { x: box.x - bounds.x, y: box.y - bounds.y, width: box.width, height: box.height } };
    }) };
  });
  const visible = PNG.sync.read(await plot.screenshot({ path: resolve(output, name + '-visible.png') }));
  await plot.locator('text').evaluateAll(nodes => nodes.forEach(el => {
    const style = (el as SVGTextElement).style;
    style.setProperty('transition', 'none', 'important'); style.setProperty('animation', 'none', 'important');
    style.setProperty('opacity', '0', 'important');
  }));
  await page.waitForFunction(() => [...document.querySelectorAll('svg[aria-label^="Iron-carbon diagram"] text')].every(el => Number(getComputedStyle(el).opacity) === 0));
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  let ground: any;
  try { ground = PNG.sync.read(await plot.screenshot({ path: resolve(output, name + '-ground.png') })); }
  finally { await plot.locator('text').evaluateAll((nodes, texts) => nodes.forEach((el, i) => { if (texts[i].style === null) el.removeAttribute('style'); else el.setAttribute('style', texts[i].style!); }), data.texts); }
  expect(visible.width).toBe(ground.width); expect(visible.height).toBe(ground.height);
  const sx = ground.width / data.width, sy = ground.height / data.height;
  const measured = data.texts.map(text => {
    const foreground = rgb(text.foreground), rectangles: number[] = [], glyph: number[] = [];
    for (const rect of text.ranges) for (let yy = Math.max(0, Math.ceil(rect.y * sy)); yy < Math.min(ground.height, Math.floor((rect.y + rect.height) * sy)); yy++) for (let xx = Math.max(0, Math.ceil(rect.x * sx)); xx < Math.min(ground.width, Math.floor((rect.x + rect.width) * sx)); xx++) {
      const offset = (yy * ground.width + xx) * 4;
      const bg = [ground.data[offset], ground.data[offset + 1], ground.data[offset + 2]], seen = [visible.data[offset], visible.data[offset + 1], visible.data[offset + 2]];
      const fg = foreground.map((v, i) => v * text.opacity + bg[i] * (1 - text.opacity));
      const contrast = ratio(fg, bg); rectangles.push(contrast);
      // Windows LCD antialiasing uses separate RGB coverages. A scalar-alpha
      // fit wrongly rejects a three-pixel-wide glyph whose channels cover
      // different subpixels. Require actual paint in at least one channel and
      // bound every channel between its background and canonical foreground.
      const coverage = fg.map((v, i) => Math.abs(v - bg[i]) >= 4 ? (seen[i] - bg[i]) / (v - bg[i]) : null);
      const supported = coverage.filter((value): value is number => value !== null);
      const unchangedChannels = coverage.every((value, i) => value !== null || Math.abs(seen[i] - bg[i]) <= 8);
      if (supported.length && unchangedChannels && Math.max(...supported) >= .2 && supported.every(value => value >= -.05 && value <= 1.05)) glyph.push(contrast);
    }
    rectangles.sort((a, b) => a - b); glyph.sort((a, b) => a - b);
    return { ...text, rectangleSamples: rectangles.length, rectangleMinimum: rectangles[0] ?? null, rectangleMedian: rectangles[Math.floor(rectangles.length / 2)] ?? null, rectangleLowFraction: rectangles.length ? rectangles.filter(v => v < text.threshold).length / rectangles.length : null, glyphSamples: glyph.length, glyphMinimum: glyph[0] ?? null, glyphMedian: glyph[Math.floor(glyph.length / 2)] ?? null };
  });
  const result = { name, revision, texts: measured, method: 'Canonical foreground against foreground-hidden rendered ground; glyph contribution mask supports independent LCD RGB subpixel coverage. Conservative rectangle metrics are retained. Actual speech is not tested.' };
  writeFileSync(resolve(output, name + '-measurements.json'), JSON.stringify(result, null, 2));
  writeFileSync(resolve(output, 'measurements.json'), JSON.stringify(persistedResults(), null, 2));
  for (const text of measured) {
    expect(text.opacity, name + ': ' + text.text).toBe(1);
    expect(text.rectangleSamples, name + ': ' + text.text).toBeGreaterThan(0);
    expect(text.glyphSamples, name + ': ' + text.text).toBeGreaterThan(0);
    expect(text.glyphMinimum, name + ': ' + JSON.stringify(text)).toBeGreaterThanOrEqual(text.threshold);
  }
}

for (const width of [1280, 320]) for (const contrast of [false, true]) test('All eight Fe-C callout collisions preserve markers and readable labels at ' + width + 'px, contrast=' + contrast, async ({ page }) => {
  let originalShapes: string[] | null = null;
  for (const selected of callouts) {
    const state = { ...retained, view: 'metallurgy', met_sect: 'phase', met2_fecC: selected.c, met2_fecT: selected.t };
    // Exact saved coordinates include narrow fields between native slider steps.
    await mount(page, state, width, contrast);
    const plot = page.locator('svg[aria-label^="Iron-carbon diagram"]');
    const marker = plot.locator('[data-fec-selected-marker]');
    await expect(marker).toHaveAttribute('data-collision', 'true');
    await expect(marker).toHaveAttribute('clip-path', 'url(#met2-fec-marker-clip)');
    const clip = plot.locator('#met2-fec-marker-clip rect');
    expect(await clip.evaluate(el => ['x', 'y', 'width', 'height'].map(a => Number(el.getAttribute(a))))).toEqual([50, 12, 416, 306]);
    const selectedCircle = marker.locator('circle').last();
    expect(Number(await selectedCircle.getAttribute('cx'))).toBeCloseTo(x(selected.c), 8); expect(Number(await selectedCircle.getAttribute('cy'))).toBeCloseTo(y(selected.t), 8);
    await expect(selectedCircle).toHaveAttribute('fill', 'none');
    expect(Number(await selectedCircle.getAttribute('r')) - Number(await selectedCircle.getAttribute('stroke-width')) / 2).toBeGreaterThan(selected.r + .625);
    for (const callout of callouts) {
      const group = plot.locator('[data-fec-callout="' + callout.id + '"]'), circle = group.locator('circle');
      expect(Number(await circle.getAttribute('cx'))).toBeCloseTo(x(callout.c), 8); expect(Number(await circle.getAttribute('cy'))).toBeCloseTo(y(callout.t), 8);
      await expect(group.locator('text')).toHaveText(String(callout.number));
    }
    expect(await marker.evaluate(el => [...el.parentElement!.children].slice(-8).every(child => child.hasAttribute('data-fec-callout')))).toBe(true);
    const shapes = await plot.locator('polygon,polyline').evaluateAll(nodes => nodes.map(n => n.getAttribute('points')!));
    if (originalShapes) expect(shapes).toEqual(originalShapes); else originalShapes = shapes;
    const saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.weldLab)));
    for (const [key, value] of Object.entries(state)) expect(saved[key]).toEqual(value);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await sampleAllText(page, plot, selected.id + '-' + width + '-' + (contrast ? 'contrast' : 'default'));
  }
});
