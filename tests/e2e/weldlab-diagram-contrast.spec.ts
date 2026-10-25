import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const require = createRequire(resolve('package.json'));
const { PNG } = require(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const phase = process.env.WELDLAB_READER_PHASE || 'final';
const output = resolve('reports/weldlab-diagram-accessibility');
const results: any[] = [];
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js', preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ timeout: 240_000, retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
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

// Sample the rendered ground behind actual text rectangles, with only the
// foreground text temporarily transparent. Foreground uses its computed color
// and opacity rather than antialiased glyph pixels, which would understate it.
async function sample(page: Page, target: Locator, name: string) {
  await target.scrollIntoViewIfNeeded();
  const data = await target.evaluate((el: HTMLElement | SVGTextElement) => {
    const s = getComputedStyle(el), box = el.getBoundingClientRect(), svg = el instanceof SVGTextElement;
    let opacity = 1; for (let p: Element | null = el; p; p = p.parentElement) opacity *= Number(getComputedStyle(p).opacity);
    const ranges = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()).flatMap(n => { const range = document.createRange(); range.selectNodeContents(n); return [...range.getClientRects()].map(r => ({ x: r.x - box.x, y: r.y - box.y, width: r.width, height: r.height })); });
    const scale = svg ? Math.abs(el.getScreenCTM()!.d) : 1, font = parseFloat(s.fontSize) * scale;
    return { text: el.textContent, foreground: svg ? s.fill : s.color, opacity, font, weight: s.fontWeight, ranges, box: { width: box.width, height: box.height }, style: el.getAttribute('style'), svg, threshold: font >= 24 || (font >= 18.6666667 && Number(s.fontWeight) >= 700) ? 3 : 4.5 };
  });
  if (!data.ranges.length) throw Error('No measured text: ' + name);
  await target.screenshot({ path: resolve(output, phase + '-' + name + '-visible.png') });
  await target.evaluate((el: HTMLElement | SVGTextElement) => { if (el instanceof SVGTextElement) el.style.setProperty('opacity', '0', 'important'); else { el.style.setProperty('color', 'transparent', 'important'); el.style.setProperty('text-shadow', 'none', 'important'); } });
  let buffer: Buffer;
  try { buffer = await target.screenshot({ path: resolve(output, phase + '-' + name + '-ground.png') }); }
  finally { await target.evaluate((el, style) => { if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style); }, data.style); }
  const png = PNG.sync.read(buffer!), foreground = rgb(data.foreground), scaleX = png.width / data.box.width, scaleY = png.height / data.box.height;
  let minimum = Infinity, samples = 0; const colors = new Set<string>();
  for (const r of data.ranges) for (let y = Math.max(0, Math.ceil(r.y * scaleY)); y < Math.min(png.height, Math.floor((r.y + r.height) * scaleY)); y++) for (let x = Math.max(0, Math.ceil(r.x * scaleX)); x < Math.min(png.width, Math.floor((r.x + r.width) * scaleX)); x++) {
    const i = (y * png.width + x) * 4, bg = [png.data[i], png.data[i + 1], png.data[i + 2]], fg = foreground.map((v, j) => v * data.opacity + bg[j] * (1 - data.opacity));
    minimum = Math.min(minimum, ratio(fg, bg)); colors.add(bg.join(',')); samples++;
  }
  const result = { name, text: data.text, foreground: data.foreground, opacity: data.opacity, renderedFontPx: data.font, threshold: data.threshold, minimum, samples, groundColors: colors.size };
  results.push(result); writeFileSync(resolve(output, phase + '-contrast-measurements.json'), JSON.stringify(results, null, 2));
  if (phase !== 'baseline') expect(minimum, name + ': ' + JSON.stringify(result)).toBeGreaterThanOrEqual(data.threshold);
}


async function setRange(input: Locator, value: number) {
  await input.evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function audit(page: Page, name: string) {
  const result = await page.evaluate(async () => {
    const axe = (window as any).axe; axe.reset();
    const r = await axe.run(document.getElementById('wrap'), { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } });
    const detail = (v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target:n.target, html:n.html, summary:n.failureSummary, checks:[...n.any,...n.all,...n.none].map((c:any)=>({id:c.id,message:c.message,data:c.data})) })) });
    return { violations:r.violations.map(detail), incomplete:r.incomplete.map(detail), overflow:document.documentElement.scrollWidth-innerWidth };
  });
  writeFileSync(resolve(output, name+'-axe.json'), JSON.stringify(result,null,2));
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
}
test('HAZ zone numbers remain readable when the probe crosses the label strip', async ({page}) => {
  for (const width of [1280,320]) for (const contrast of [false,true]) {
    await mount(page,{view:'metallurgy',met_sect:'haz',met2_hazPred:2,met2_hazH:16,met2_hazProbe:2.1},width,contrast);
    const plot=page.locator('svg[aria-label^="Peak temperature against distance"]'), input=page.locator('#met2-haz-probe');
    const originalCurve=await plot.locator('polyline').getAttribute('points');
    const labels=plot.locator('[data-met-haz-zone-label] text'); await expect(labels).toHaveCount(5);
    for (const value of [0,2.1,Number(await input.getAttribute('max'))]) {
      await setRange(input,value); await expect(input).toHaveValue(String(value));
      await expect(plot).toHaveAccessibleName(new RegExp('Probe at '+value.toFixed(1).replace('.','\\.')+' mm:'));
      expect(await plot.locator('polyline').getAttribute('points')).toBe(originalCurve);
      for(let index=0;index<await labels.count();index++) await sample(page,labels.nth(index),'haz-'+width+'-'+(contrast?'contrast':'default')+'-probe-'+value+'-zone-'+(index+2));
    }
    await plot.screenshot({path:resolve(output,'haz-labels-'+width+'-'+(contrast?'contrast':'default')+'.png')});
    await audit(page,'haz-labels-'+width+'-'+(contrast?'contrast':'default'));
  }
});
test('Pipe pass numbers remain readable while later bead shapes are dimmed', async ({page}) => {
  for (const width of [1280,320]) for (const contrast of [false,true]) {
    await mount(page,{view:'pipeWelding',pipe_sect:'passes',pipe2_wall:.218,pipe2_stack:['root','hot','cap']},width,contrast);
    const plot=page.locator('[data-pipe-groove]');
    const before=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    const shapes=await plot.locator('[data-pipe-groove-bead] > path:first-child').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')));
    for(const view of ['wall','close']) {
      await page.locator('[data-pipe-zoom="'+view+'"]').click(); await expect(plot).toHaveAttribute('data-pipe-groove-view',view);
      for(const selected of [0,1,2]) {
        await page.locator('[data-pipe-pass-node="'+selected+'"]').click();
        await expect(plot).toHaveAccessibleName(new RegExp('Pass '+(selected+1)+', '));
        for(let index=0;index<3;index++) {
          const bead=plot.locator('[data-pipe-groove-bead="'+index+'"]');
          await expect(bead.locator('path').first()).toHaveAttribute('opacity',index>selected?'0.3':'1');
          await sample(page,plot.locator('[data-pipe-groove-pass-number="'+index+'"] text'),'pipe-'+width+'-'+(contrast?'contrast':'default')+'-'+view+'-selected-'+selected+'-number-'+(index+1));
        }
        expect(await plot.locator('[data-pipe-groove-bead] > path:first-child').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d')))).toEqual(shapes);
      }
    }
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(before);
    await plot.screenshot({path:resolve(output,'pipe-labels-'+width+'-'+(contrast?'contrast':'default')+'.png')});
    await audit(page,'pipe-labels-'+width+'-'+(contrast?'contrast':'default'));
  }
});
