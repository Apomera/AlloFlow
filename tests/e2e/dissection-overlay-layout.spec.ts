import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-overlay-layout-2026-09-29';
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', revealedLayers: { skin: true }, workspaceMode: 'advanced', selectedOrgan: 'ventral_skin', anatomicalView: 'ventral', canvasZoom: 2.5, canvasPanX: -30, canvasPanY: 10, parallaxDepth: false, sceneDetail: false, reducedMotion: true, soundEnabled: false, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  const canvas = page.locator('[data-diss-canvas]'); await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((el: any) => el._dissInViewport)).toBe(true);
}

async function paint(page: Page, feedback = false) {
  return page.locator('[data-diss-canvas]').evaluate((el: any, contact: boolean) => {
    if (contact) {
      const selected = el._drawOrgans.find((item: any) => item.id === el._drawD.selectedOrgan);
      el._toolPointer = { x: selected.x, y: selected.y };
    }
    const ctx = el.getContext('2d'), original = { rect: ctx.roundRect, text: ctx.fillText };
    const rectangles: any[] = [], captions: any[] = [], texts: string[] = [], textSizes: any[] = [];
    ctx.roundRect = function (x: number, y: number, w: number, h: number, ...rest: any[]) {
      const m = this.getTransform(), density = el._dpr || 1;
      const points = [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b]) => new DOMPoint(a,b).matrixTransform(m));
      const left = Math.min(...points.map(p => p.x)) / density, top = Math.min(...points.map(p => p.y)) / density;
      rectangles.push({ x:left, y:top, width:Math.max(...points.map(p => p.x)) / density - left, height:Math.max(...points.map(p => p.y)) / density - top });
      return original.rect.call(this,x,y,w,h,...rest);
    };
    ctx.fillText = function (value: string, x: number, y: number, ...rest: any[]) {
      texts.push(String(value));
      const transform = this.getTransform();
      textSizes.push({text:String(value), size:parseFloat(this.font.replace(/^bold /,'')) * Math.hypot(transform.a,transform.b) / el.width * el.getBoundingClientRect().width});
      if (/^(SURFACE|MID|DEEP) · /.test(String(value))) {
        const m = this.getTransform(), p = new DOMPoint(x,y).matrixTransform(m);
        captions.push({ text:String(value), x:p.x / el._dpr, y:p.y / el._dpr, direction:Math.sign(m.a) });
      }
      return original.text.call(this,value,x,y,...rest);
    };
    try { el._drawDissectionNow(); } finally { ctx.roundRect = original.rect; ctx.fillText = original.text; }
    return { hud:el._canvasHudBoxes, guides:el._guidanceBoxes, feedback:el._contactFeedbackBox, rectangles, captions, texts, textSizes, W:el._logicalW, H:el._logicalH };
  }, feedback);
}

function overlaps(a: any, b: any) {
  return Math.min(a.x+a.width,b.x+b.width) - Math.max(a.x,b.x) > 0.1 && Math.min(a.y+a.height,b.y+b.height) - Math.max(a.y,b.y) > 0.1;
}

function expectClear(result: Awaited<ReturnType<typeof paint>>, orientation = false) {
  const primary = result.guides.filter((box: any) => box.priority === 8);
  expect(primary.length).toBeGreaterThanOrEqual(2);
  const panels = result.hud.filter((box: any) => ['scale','orientation'].includes(box.id));
  expect(panels.map((box: any) => box.id)).toContain('scale');
  if (orientation) expect(panels.map((box: any) => box.id)).toContain('orientation');
  if (orientation) {
    const heading = result.textSizes.find(item => item.text === 'ANATOMICAL AXIS');
    expect(heading).toBeTruthy(); expect(heading.size).toBeGreaterThanOrEqual(11.9);
  }
  for (const box of [...primary,...panels]) {
    expect(box.x).toBeGreaterThanOrEqual(13.9); expect(box.y).toBeGreaterThanOrEqual(13.9);
    expect(box.x+box.width).toBeLessThanOrEqual(result.W-13.9);
    expect(box.y+box.height).toBeLessThanOrEqual(result.H-13.9);
    // Confirm the published bounds correspond to an actual painted rectangle.
    expect(result.rectangles.some(rect => ['x','y','width','height'].every(key => Math.abs(rect[key]-box[key]) < 0.01))).toBe(true);
  }
  for (const panel of panels) {
    for (const caption of primary) expect(overlaps(panel,caption), `${panel.id} covers anatomy text`).toBe(false);
    for (const other of result.hud.filter((box: any) => box.id !== panel.id)) expect(overlaps(panel,other), `${panel.id} covers ${other.id}`).toBe(false);
  }
  for (let i = 0; i < primary.length; i++) for (let j = i+1; j < primary.length; j++) {
    expect(overlaps(primary[i],primary[j]), 'selected depth caption covers the selected name').toBe(false);
  }
  expect(result.captions.length).toBeGreaterThan(0);
  for (const caption of result.captions) expect(caption.direction).toBe(1);
}

test.describe('phone overlays', () => {
  test.use({ hasTouch:true, isMobile:true });
  test('320px selected captions and scale stay clear with large text and contact feedback', async ({ page }) => {
    await page.setViewportSize({width:320,height:844});
    const notes = {'frog|ventral_skin':'Retain this observation.'};
    await mount(page,{largeText:true,highContrast:true,macroInset:false,organNotes:notes});
    const result = await paint(page,true); expectClear(result);
    for (const caption of result.guides.filter((box: any) => box.priority === 8)) expect(overlaps(result.feedback,caption)).toBe(false);
    for (const panel of result.hud) expect(overlaps(result.feedback,panel), `contact feedback covers ${panel.id}`).toBe(false);
    expect(result.texts).toContain('1 cm  /  2.5x');
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes)).toEqual(notes);
    await page.locator('[data-diss-canvas]').screenshot({path:out+'/phone-320.png'});
  });
  for (const anatomicalView of ['dorsal','ventral']) {
    test(`390px ${anatomicalView} panels avoid selected captions during pan`, async ({ page }) => {
      await page.setViewportSize({width:390,height:844});
      await mount(page,{sceneDetail:true,anatomicalView,selectedOrgan:anatomicalView==='dorsal'?'dorsal_skin':'ventral_skin'});
      expectClear(await paint(page),true);
      for (const canvasPanY of [-220,220]) {
        await page.evaluate(state => (window as any).__ctx.updateMulti('dissection',state),{canvasPanY});
        await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((el: any) => el._drawD.canvasPanY)).toBe(canvasPanY);
        expectClear(await paint(page),true);
      }
      await page.locator('[data-diss-canvas]').screenshot({path:out+`/phone-${anatomicalView}.png`});
    });
  }
  test('lateral perch keeps its inspection caption inside the canvas at an edge', async ({ page }) => {
    await page.setViewportSize({width:390,height:844});
    await mount(page,{specimen:'perch',_dissLoadedSpec:'perch',anatomicalView:'lateral',selectedOrgan:'scales',canvasPanX:-190,canvasPanY:190,sceneDetail:true,largeText:true});
    const result = await paint(page); expectClear(result,true);
    expect(result.captions.some(caption => caption.text.includes('SURFACE'))).toBe(true);
    await page.locator('[data-diss-canvas]').screenshot({path:out+'/perch-edge.png'});
  });
});

test('fullscreen scale, orientation, and system key leave selected anatomy text clear', async ({ page }) => {
  await page.setViewportSize({width:1440,height:1100});
  await mount(page,{sceneDetail:true});
  const canvas = page.locator('[data-diss-canvas]');
  await canvas.evaluate(async el => { await el.parentElement!.requestFullscreen(); });
  expectClear(await paint(page),true);
  await canvas.screenshot({path:out+'/fullscreen.png'});
  await page.evaluate(() => document.exitFullscreen());
});
