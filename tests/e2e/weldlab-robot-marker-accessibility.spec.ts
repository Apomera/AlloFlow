import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const require = createRequire(resolve('package.json'));
const { PNG } = require(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const phase = process.env.WELDLAB_NAVIGATION_CHECK || 'final';
const results: any[] = [];
const output = resolve('reports/weldlab-navigation-accessibility');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js', preScripts: ['stem_lab/stem_lab_module.js', 'app_styles_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ timeout: 420_000, retries: 0 });
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
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); }
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.weldLab))); }
async function focusVisible(page: Page, target: Locator) {
  await expect(target).toBeFocused();
  const box = await target.boundingBox(); expect(box).toBeTruthy();
  expect(box!.y).toBeLessThan(900); expect(box!.y + box!.height).toBeGreaterThan(0);
  const outline = await target.evaluate(el => ({ width: parseFloat(getComputedStyle(el).outlineWidth), style: getComputedStyle(el).outlineStyle }));
  expect(outline.width).toBeGreaterThanOrEqual(2); expect(outline.style).not.toBe('none');
}
async function audit(page: Page, name: string) {
  const result = await page.evaluate(async () => {
    const axe = (window as any).axe; axe.reset();
    const r = await axe.run(document.getElementById('wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    const detail = (v: any) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n: any) => ({ target: n.target, html: n.html, summary: n.failureSummary, checks: [...n.any, ...n.all, ...n.none].map((c: any) => ({ id: c.id, message: c.message, data: c.data })) })) });
    return { violations: r.violations.map(detail), incomplete: r.incomplete.map(detail), overflow: document.documentElement.scrollWidth - innerWidth };
  });
  writeFileSync(resolve(output, 'reader-' + name + '-axe.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
}
// These are actual browser accessibility nodes. They do not establish the
// spoken behavior of NVDA, Narrator, JAWS, VoiceOver, or another screen reader.
async function axRecord(page: Page, selectors: string[], name: string) {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send('Accessibility.enable');
    const { root } = await client.send('DOM.getDocument');
    const targets = [];
    for (const selector of selectors) {
      const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      expect(nodeId, selector).toBeGreaterThan(0);
      const { node } = await client.send('DOM.describeNode', { nodeId });
      targets.push({ selector, backendDOMNodeId: node.backendNodeId });
    }
    const { nodes } = await client.send('Accessibility.getFullAXTree');
    const records = targets.map(target => {
      const node = nodes.find(n => n.backendDOMNodeId === target.backendDOMNodeId);
      expect(node, target.selector).toBeTruthy();
      const children = new Set(node!.childIds || []);
      return { selector: target.selector, node: node!, children: nodes.filter(n => children.has(n.nodeId)) };
    });
    writeFileSync(resolve(output, 'reader-' + name + '-ax.json'), JSON.stringify({ method: 'Chromium CDP Accessibility.getFullAXTree; browser exposure only, not spoken assistive-technology validation', totalNodes: nodes.length, records }, null, 2));
    return records;
  } finally { await client.detach(); }
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
  const visible = PNG.sync.read(await target.screenshot({ path: resolve(output, phase + '-' + name + '-visible.png') }));
  await target.evaluate((el: HTMLElement | SVGTextElement) => { el.style.setProperty('transition', 'none', 'important'); el.style.setProperty('animation', 'none', 'important'); if (el instanceof SVGTextElement) el.style.setProperty('opacity', '0', 'important'); else { el.style.setProperty('color', 'transparent', 'important'); el.style.setProperty('text-shadow', 'none', 'important'); } });
  // Contrast-theme transitions must not leave ghost glyphs in the ground capture.
  await target.evaluate(el => { void getComputedStyle(el).opacity; });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  let buffer: Buffer;
  try { buffer = await target.screenshot({ path: resolve(output, phase + '-' + name + '-ground.png') }); }
  finally { await target.evaluate((el, style) => { if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style); }, data.style); }
  const png = PNG.sync.read(buffer!), foreground = rgb(data.foreground), scaleX = png.width / data.box.width, scaleY = png.height / data.box.height;
  let minimum = Infinity, samples = 0, glyphMinimum = Infinity, glyphSamples = 0; const colors = new Set<string>();
  for (const r of data.ranges) for (let y = Math.max(0, Math.ceil(r.y * scaleY)); y < Math.min(png.height, Math.floor((r.y + r.height) * scaleY)); y++) for (let x = Math.max(0, Math.ceil(r.x * scaleX)); x < Math.min(png.width, Math.floor((r.x + r.width) * scaleX)); x++) {
    const i = (y * png.width + x) * 4, bg = [png.data[i], png.data[i + 1], png.data[i + 2]], fg = foreground.map((v, j) => v * data.opacity + bg[j] * (1 - data.opacity));
    const value = ratio(fg, bg);
    minimum = Math.min(minimum, value); colors.add(bg.join(',')); samples++;
    const seen = [visible.data[i], visible.data[i+1], visible.data[i+2]], delta = fg.map((v,j)=>v-bg[j]);
    // Windows LCD antialiasing gives each color channel its own coverage.
    const coverage=delta.flatMap((v,j)=>Math.abs(v)>=5?[(seen[j]-bg[j])/v]:[]);
    if(coverage.length && Math.max(...coverage)>=.2 && coverage.every(v=>v>=-.05 && v<=1.05)){glyphMinimum=Math.min(glyphMinimum,value);glyphSamples++;}
  }
  const result = { name, text: data.text, foreground: data.foreground, opacity: data.opacity, renderedFontPx: data.font, threshold: data.threshold, minimum, samples, glyphMinimum:Number.isFinite(glyphMinimum)?glyphMinimum:null, glyphSamples, groundColors: colors.size };
  results.push(result); writeFileSync(resolve(output, phase + '-contrast-measurements.json'), JSON.stringify(results, null, 2));
  if (phase !== 'baseline') {
    // A round badge's rectangular text bounds can touch its white border at a corner.
    // Retain that conservative minimum; assert canonical contrast under contributing glyph ink.
    if(name.startsWith('robot-')) { expect(glyphSamples,name).toBeGreaterThan(0);expect(glyphMinimum,name+': '+JSON.stringify(result)).toBeGreaterThanOrEqual(data.threshold); }
    else expect(minimum, name + ': ' + JSON.stringify(result)).toBeGreaterThanOrEqual(data.threshold);
  }
}


async function setRange(input: Locator, value: number) {
  await input.evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

// Keep Home distinct from a taught waypoint, isolating torch/annotation collisions.
const program=[{x:4,y:6,m:'J',w:false},{x:12,y:6,m:'L',w:true},{x:12,y:1,m:'J',w:false},{x:1,y:2,m:'J',w:false}];
test('Robot marker preserves numbered waypoints and Home at coincident positions',async({page})=>{
 for(const width of [1280,320])for(const contrast of [false,true]){
  const suffix=width+'-'+(contrast?'contrast':'default');
  await mount(page,{view:'robotic',rob_sect:'pendant',tech2_rob_prog:program,car2_reflect:'Keep the project.'},width,contrast);
  const before=await saved(page),plot=page.locator('[data-robot-workcell]'),slider=page.locator('[data-robot-inspect-progress]'),select=page.locator('[data-robot-inspect-select]');
  const cases=[{name:'home',move:0,value:0,label:'H',x:1,y:1},{name:'first-point',move:1,value:0,label:'1',x:4,y:6},{name:'weld-end',move:1,value:100,label:'2',x:12,y:6},{name:'weld-near-end',move:1,value:98,label:'2',x:11.84,y:6},{name:'arc-off-end',move:2,value:100,label:'3',x:12,y:1}];
  for(const c of cases){
   await select.selectOption(String(c.move));await slider.focus();await setRange(slider,c.value);
   await expect(page.locator('[data-robot-inspector]')).toHaveAttribute('data-robot-inspector','active');
   const torch=plot.locator('[data-robot-torch]');expect(Number(await torch.getAttribute('data-x'))).toBeCloseTo(c.x,8);expect(Number(await torch.getAttribute('data-y'))).toBeCloseTo(c.y,8);
   if(phase!=='baseline')await expect(torch).toHaveAttribute('data-label-overlap','true');
   await sample(page,plot.locator('text').filter({hasText:new RegExp('^'+c.label+'$')}),'robot-'+suffix+'-'+c.name);
   if(['home','weld-end','arc-off-end'].includes(c.name))await plot.screenshot({path:resolve(output,phase+'-robot-'+suffix+'-'+c.name+'.png')});
  }
  await select.selectOption('1');await slider.focus();await setRange(slider,50);
  if(phase!=='baseline'){
   await expect(plot.locator('[data-robot-torch]')).toHaveAttribute('data-label-overlap','false');await expect(slider).toBeFocused();
   await expect(slider).toHaveAccessibleName('Progress within selected move: 50%');
   expect(await saved(page)).toEqual(before);await audit(page,'robot-'+suffix);
  }
 }
});

