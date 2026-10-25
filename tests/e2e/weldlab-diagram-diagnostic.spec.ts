import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const require = createRequire(resolve('package.json'));
const { PNG } = require(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const out = resolve('tmp/weld-wcag-diagrams');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js', preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'], appStyles: true, layout: 'document' });
const fixtures = [
  { name: 'haz-probe', state: { view: 'metallurgy', met_sect: 'haz', met2_hazPred: 2, met2_hazH: 16, met2_hazProbe: 2.1 } },
  { name: 'phase-point', state: { view: 'metallurgy', met_sect: 'phase', met2_fecC: 1, met2_fecT: 1080 } },
  { name: 'pipe-clock', state: { view: 'pipeWelding', pipe_sect: 'positions', pipe2_pos: '6GR', pipe2_hour: 6 } },
  { name: 'pipe-passes', state: { view: 'pipeWelding', pipe_sect: 'passes', pipe2_wall: .218, pipe2_stack: ['root', 'hot', 'cap'] } },
  { name: 'pipe-root-inspect', state: { view: 'pipeWelding', pipe_sect: 'passes', pipe2_wall: .218, pipe2_stack: ['root', 'hot', 'cap'] } },
  { name: 'inspection-ut', state: { view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'choose', insp2_ndtDemo: 'ut', insp2_utDepth: .5 } },
  { name: 'inspection-rt', state: { view: 'inspection', insp_sect: 'ndt', insp2_ndtMode: 'choose', insp2_ndtDemo: 'rt', insp2_rtAngle: 0 } },
  { name: 'math-geometry', state: { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'geometry' } },
  { name: 'math-measure', state: { view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'measure' } },
  { name: 'robot-pendant', state: { view: 'robotic', rob_sect: 'pendant' } },
  { name: 'spectrum', state: { view: 'safetyHealth', sh_mode: 'browse', sh_sect: 'eyes' } },
  { name: 'heat', state: { view: 'heatInput' } },
  { name: 'noise', state: { view: 'safetyHealth', sh_mode: 'browse', sh_sect: 'noise', safe2_noise: [{ db: 100, h: 1 }, { db: 85, h: 6 }] } },
];
const lum = (a: number[]) => a.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
const ratio = (a: number[], b: number[]) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
test.describe.configure({ timeout: 900_000, retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('Collect conservative rendered-ground contrast candidates for remaining diagram families', async ({ page }) => {
  const rows: any[] = [];
  for (const fixture of fixtures.filter(f => !process.env.WELDLAB_DIAGRAM_FILTER || process.env.WELDLAB_DIAGRAM_FILTER.split(',').includes(f.name))) for (const width of [1280, 320]) for (const contrast of [false, true]) {
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await harness.mount(page, { weldLab: fixture.state }, undefined, { expectCanvas: false });
    await page.evaluate(() => { const host = document.createElement('div'); document.body.append(host); const w = window as any; w.ReactDOM.render(w.React.createElement(w.AlloModules.AppStyles.AppStyles), host); });
    await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
    await page.locator('#wrap').evaluate((el: HTMLElement) => { el.style.width = '100%'; el.style.height = 'auto'; el.style.display = 'block'; });
    if (contrast) await page.evaluate(() => { document.body.classList.add('theme-contrast'); Object.assign((window as any).__ctx, { isContrast: true, theme: 'contrast' }); (window as any).__rerender(); });
    await page.locator('#wrap details:not(.weldlab-teacher-notes)').evaluateAll(nodes => nodes.forEach(el => (el as HTMLDetailsElement).open = true));
    if (fixture.name === 'pipe-root-inspect') await page.locator('[data-pipe-pass-node="0"]').click();
    await page.waitForTimeout(250);
    const diagrams = page.locator('#wrap svg');
    for (let diagram = 0; diagram < await diagrams.count(); diagram++) {
      const svg = diagrams.nth(diagram);
      if (!await svg.isVisible() || !await svg.locator('text').count()) continue;
      await svg.scrollIntoViewIfNeeded();
      const meta = await svg.evaluate((el: SVGSVGElement) => {
        const box = el.getBoundingClientRect();
        return { label: el.getAttribute('aria-label'), attrs: Object.fromEntries([...el.attributes].filter(a => a.name.startsWith('data-')).map(a => [a.name, a.value])), box: { width: box.width, height: box.height }, texts: [...el.querySelectorAll('text')].map((t, index) => {
          const s = getComputedStyle(t), rect = t.getBoundingClientRect(); let opacity = Number(s.fillOpacity);
          for (let p: Element | null = t; p; p = p.parentElement) opacity *= Number(getComputedStyle(p).opacity);
          const font = parseFloat(s.fontSize) * Math.abs(t.getScreenCTM()!.d);
          return { index, text: t.textContent, fill: s.fill, opacity, stroke: s.stroke, font, threshold: font >= 24 || (font >= 18.6666667 && Number(s.fontWeight) >= 700) ? 3 : 4.5, rect: { x: rect.x - box.x, y: rect.y - box.y, width: rect.width, height: rect.height }, style: t.getAttribute('style'), html: t.outerHTML };
        }) };
      });
      const name = fixture.name + '-' + width + '-' + (contrast ? 'contrast' : 'default') + '-' + diagram;
      await svg.screenshot({ path: resolve(out, name + '-visible.png') });
      await svg.locator('text').evaluateAll(nodes => nodes.forEach(t => (t as SVGTextElement).style.setProperty('opacity', '0', 'important')));
      let buffer: Buffer;
      try { buffer = await svg.screenshot({ path: resolve(out, name + '-ground.png') }); }
      finally { await svg.locator('text').evaluateAll((nodes, styles) => nodes.forEach((t, i) => { if (styles[i] === null) t.removeAttribute('style'); else t.setAttribute('style', styles[i]!); }), meta.texts.map(t => t.style)); }
      const png = PNG.sync.read(buffer!), sx = png.width / meta.box.width, sy = png.height / meta.box.height;
      const measured = meta.texts.map(t => {
        const foreground = t.fill.match(/[\d.]+/g)?.slice(0, 3).map(Number); if (!foreground || foreground.length !== 3) return { ...t, skipped: 'Non-solid fill requires manual review' };
        const values: number[] = [];
        for (let y = Math.max(0, Math.ceil(t.rect.y * sy)); y < Math.min(png.height, Math.floor((t.rect.y + t.rect.height) * sy)); y++) for (let x = Math.max(0, Math.ceil(t.rect.x * sx)); x < Math.min(png.width, Math.floor((t.rect.x + t.rect.width) * sx)); x++) {
          const i = (y * png.width + x) * 4, bg = [png.data[i], png.data[i + 1], png.data[i + 2]], fg = foreground.map((v, j) => v * t.opacity + bg[j] * (1 - t.opacity)); values.push(ratio(fg, bg));
        }
        values.sort((a, b) => a - b);
        return { ...t, minimum: values[0], median: values[Math.floor(values.length / 2)], lowFraction: values.filter(v => v < t.threshold).length / values.length, pixels: values.length };
      });
      rows.push({ name, fixture: fixture.name, state: fixture.state, width, contrast, diagram, label: meta.label, attrs: meta.attrs, texts: measured });
    }
    writeFileSync(resolve(out, process.env.WELDLAB_DIAGRAM_FILTER ? 'filtered-ground-diagnostic.json' : 'diagram-ground-diagnostic.json'), JSON.stringify(rows, null, 2));
    console.log(fixture.name + '/' + width + '/' + contrast + ': ' + rows.filter(r => r.fixture === fixture.name && r.width === width && r.contrast === contrast).length + ' diagrams');
  }
});
