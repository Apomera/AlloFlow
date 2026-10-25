import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const require = createRequire(resolve('package.json'));
const { PNG } = require(resolve('node_modules/playwright-core/lib/utilsBundle.js'));
const phase = process.env.WELDLAB_PHASE_CHECK || 'final';
const results: any[] = [];
const output = resolve('reports/weldlab-phase-accessibility');
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
    if(name.startsWith('phase-')) { expect(glyphSamples,name).toBeGreaterThan(0);expect(glyphMinimum,name+': '+JSON.stringify(result)).toBeGreaterThanOrEqual(data.threshold); }
    else expect(minimum, name + ': ' + JSON.stringify(result)).toBeGreaterThanOrEqual(data.threshold);
  }
}


async function setRange(input: Locator, value: number) {
  await input.evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

const retained = { car2_reflect: 'Keep this reflection.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const observations: any[] = [];
for (const width of [1280,320]) test('Probe endpoint keyboard and reader feedback at '+width+'px',async({page})=>{
 for(const contrast of [false,true]) {
  const suffix=width+'-'+(contrast?'contrast':'default');
  await mount(page,{...retained,view:'underwater',uw_view:'pressure',tech2_uw_pred:'skip',uw_probe_time:39.75,uw_depth:30,uw_tech:'wet'},width,contrast);
  const slider=page.locator('#uw4-cooling-time'), forward=page.locator('[data-uw-probe-step="forward"]'),back=page.locator('[data-uw-probe-step="back"]');
  const before=await saved(page);
  await activate(page,forward); await expect(slider).toHaveValue('40');await expect(forward).toBeDisabled();
  const endpoint=await page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id}));
  observations.push({module:'underwater',suffix,endpoint});
  if(phase!=='baseline') {
   await expect(slider).toBeFocused();
   const live=page.locator('#uw5-probe-readings');await expect(live).toHaveAttribute('aria-live','polite');await expect(live).toHaveAttribute('aria-atomic','true');
   await expect(slider).toHaveAccessibleDescription(/Topside, in air[\s\S]*Wet weld at 30 ft[\s\S]*Dry habitat at 30 ft/);
   const node=await live.elementHandle(),text=await live.textContent();
   await setRange(slider,.25);await activate(page,back);await expect(slider).toHaveValue('0');await expect(slider).toBeFocused();
   expect(await node!.evaluate(el=>el===document.getElementById('uw5-probe-readings'))).toBe(true);expect(await live.textContent()).not.toBe(text);
   const jump=page.locator('[data-uw-probe-jump="wet:800"]');await activate(page,jump);await expect(jump).toBeFocused();await expect(live).toContainText('800.0 °C');
   const ax=await axRecord(page,['#uw4-cooling-time','#uw5-probe-readings'],'underwater-'+suffix);
   expect(ax[0].node.role?.value).toBe('slider');expect(ax[0].node.description?.value).toContain('800.0 °C');
   expect(ax[1].node.properties?.find(p=>p.name==='live')?.value.value).toBe('polite');
   expect(await saved(page)).toMatchObject(retained);expect((await saved(page)).uw_depth).toBe(before.uw_depth);
   await audit(page,'underwater-'+suffix);
  }
  await mount(page,{...retained,view:'safetyHealth',sh_mode:'browse',sh_sect:'ergonomics'},width,contrast);
  const select=page.locator('#safe10-posture-select');await expect(select).toBeVisible();
  await select.selectOption('3');const next=page.locator('[data-posture-next]');await activate(page,next);await expect(select).toHaveValue('4');await expect(next).toBeDisabled();
  observations.push({module:'posture',suffix,endpoint:await page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id}))});
  if(phase!=='baseline') {
   await focusVisible(page,select);await select.selectOption('1');await activate(page,page.locator('[data-posture-prev]'));await expect(select).toHaveValue('0');await focusVisible(page,select);
   await select.selectOption('2');await expect(select).toBeFocused();
   await expect(page.locator('#safe10-posture-reading')).toHaveAttribute('aria-live','polite');
   expect(await saved(page)).toMatchObject(retained);await audit(page,'posture-'+suffix);
  }
 }
 writeFileSync(resolve(output,phase+'-endpoint-observations.json'),JSON.stringify(observations,null,2));
});

test('Heat labels and warnings keep contrast on the actual plate',async({page})=>{
 for(const width of [1280,320]) for(const contrast of [false,true]) for(const [name,state] of Object.entries({normal:{hi_V:22,hi_A:180,hi_TS:12,tech2_hi_th:.25},through:{hi_V:40,hi_A:350,hi_TS:3,tech2_hi_th:.125}})) {
  await mount(page,{...retained,view:'heatInput',hi_process:'mig',...state},width,contrast);
  const plot=page.locator('svg[aria-label^="Bead cross-section on"]');const prefix='heat-'+name+'-'+width+'-'+(contrast?'contrast':'default');
  for(const label of ['1','2','3',...(name==='through'?['!']:[])]) await sample(page,plot.locator('text').filter({hasText:new RegExp('^'+label.replace('!','\\!')+'$')}),prefix+'-'+label.replace('!','warning'));
  await plot.screenshot({path:resolve(output,phase+'-'+prefix+'.png')});
  if(phase!=='baseline') await audit(page,prefix);
 }
});

test('Fe-C current point and coincident callout remain distinguishable',async({page})=>{
 for(const width of [1280,320]) for(const contrast of [false,true]) {
  await mount(page,{...retained,view:'metallurgy',met_sect:'phase',met2_fecC:1,met2_fecT:1080},width,contrast);
  const plot=page.locator('svg[aria-label^="Iron-carbon diagram"]');const name='phase-'+width+'-'+(contrast?'contrast':'default');
  await sample(page,plot.locator('text').filter({hasText:/^4$/}),name+'-austenite');
  if(phase!=='baseline') {
   await expect(plot.locator('[data-fec-selected-marker]')).toHaveAttribute('data-collision','true');
   const marker=plot.locator('[data-fec-selected-marker] circle').last();
   expect(Number(await marker.getAttribute('cx'))).toBeCloseTo(50+1/2.1*416,8);expect(Number(await marker.getAttribute('cy'))).toBeCloseTo(318-(1080-400)/1200*306,8);
   const presets=[['a36','A36',.2],['4140','4140',.4],['1095','1095',.95]] as const;
   const ticks=plot.locator('line[stroke="#f8fafc"][stroke-width="1.5"]');await expect(ticks).toHaveCount(3);
   const originalTicks=await ticks.evaluateAll(nodes=>nodes.map(el=>el.outerHTML));
   for(const [index,[id,label,carbon]] of presets.entries()) {
    const group=plot.locator('[data-fec-preset-label="'+id+'"]'),text=group.locator('text');
    await expect(text).toHaveText(label);await expect(group.locator('rect')).toHaveAttribute('fill','#0f172a');
    expect(Number(await text.getAttribute('x'))).toBeCloseTo(50+carbon/2.1*416,8);await expect(text).toHaveAttribute('y','292');
    expect(await group.evaluate(el=>!!(el.parentElement!.querySelector('[data-fec-selected-marker]')!.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    expect(await ticks.nth(index).evaluate(el=>!!(el.compareDocumentPosition(el.closest('svg')!.querySelector('[data-fec-selected-marker]')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await sample(page,text,name+'-preset-'+id);
   }
   const c=page.locator('#met2-fec-c'),t=page.locator('#met2-fec-t');await c.focus();await page.keyboard.press('Home');await expect(c).toBeFocused();await expect(c).toHaveValue('0');
   await setRange(c,.4);await setRange(t,850);await expect(plot.locator('[data-fec-selected-marker]')).toHaveAttribute('data-collision','false');
   await setRange(c,.95);await setRange(t,515);await expect(plot.locator('[data-fec-selected-marker]')).toHaveAttribute('data-collision','true');
   const presetMarker=plot.locator('[data-fec-selected-marker] circle').last();await expect(presetMarker).toHaveAttribute('fill','none');
   expect(Number(await presetMarker.getAttribute('cx'))).toBeCloseTo(50+.95/2.1*416,8);expect(Number(await presetMarker.getAttribute('cy'))).toBeCloseTo(318-(515-400)/1200*306,8);
   const cy=Number(await presetMarker.getAttribute('cy')),inner=Number(await presetMarker.getAttribute('r'))-Number(await presetMarker.getAttribute('stroke-width'))/2;
   expect(cy-inner).toBeLessThan(280);expect(cy+inner).toBeGreaterThan(296);
   await sample(page,plot.locator('[data-fec-preset-label="1095"] text'),name+'-preset-1095-marker');
   expect(await ticks.evaluateAll(nodes=>nodes.map(el=>el.outerHTML))).toEqual(originalTicks);
   await plot.screenshot({path:resolve(output,phase+'-'+name+'-preset-marker.png')});
   await setRange(c,1);await setRange(t,1080);await expect(plot).toHaveAccessibleName(/1\.00 % carbon and 1080 °C: Austenite/);
   await audit(page,name);
  }
  await plot.screenshot({path:resolve(output,phase+'-'+name+'.png')});
 }
});
