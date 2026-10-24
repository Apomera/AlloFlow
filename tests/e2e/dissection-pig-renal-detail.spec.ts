import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { renalTargets, observePigRenalPaint, observePigRenalCaption } from './helpers/dissection_pig_renal_paint.cjs';

const anchor = renalTargets[0];
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180,
  height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const healthy = { inspected: true, incisionStarted: true, incisionExtended: true, retracted: false, probed: true,
  pins: [{ x: .43, y: .32 }, { x: .57, y: .68 }], history: ['inspect', 'scalpel', 'scissors', 'pin', 'probe'],
  tissueState: { moisture: 65, tension: 40, exposure: 95, trauma: 0, clarity: 95, stability: 95, risk: 5,
    salineDrops: 0, variantId: 'standard', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] } };
const failures = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0, timeout: 180000 });
test.use({ channel: process.env.PW_BROWSER_CHANNEL || undefined, video: 'off', viewport: { width: 1440, height: 1000 } });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; failures.set(page, errors);
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }));
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text() + ' ' + message.location().url); });
  await harness.mount(page, { dissection: { specimen: 'pig', _dissLoadedSpec: 'pig', activeLayer: 'organs',
    anatomicalView: 'internal', workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false,
    visualRealism: 'realistic', labelMode: 'hidden', instrumentVisuals: false, sceneDetail: true, tissueRelief: true,
    inspectionLens: false, macroInset: false, focusMode: false, relationshipMode: false, depthAtlas: false,
    parallaxDepth: false, livingFunctionEnabled: false, variationSeed: 3, selectedOrgan: null, hoveredOrgan: null,
    canvasZoom: 1, canvasPanX: 0, canvasPanY: 0, revealedLayers: { skin: true, muscle: true, organs: true, nervous: true },
    procedureByLayer: { organs: healthy, nervous: healthy } } }, undefined, { expectCanvas: false });
});
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(failures.get(page) || []).toEqual([]); });
async function update(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => (window as any).__ctx.updateMulti('dissection', patch), patch);
  await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((node: any, patch) =>
    Object.entries(patch).every(([key, value]) => node._drawD[key] === value), patch)).toBe(true);
}
async function ready(page: Page) {
  const canvas = page.locator('[data-diss-canvas]');
  await canvas.evaluate((node: any) => { node.scrollIntoView({ block: 'center' }); node._drawDissectionNow(); });
  await expect.poll(() => canvas.evaluate((node: any) => node._dissInViewport)).toBe(true); return canvas;
}
async function expectNativePreserved(page: Page) {
  expect(await page.locator('[data-diss-canvas]').evaluate((node: any) => {
    const before = JSON.stringify((window as any).__ctx.toolData.dissection), camera = [node._interactionZoom, node._interactionPanX, node._interactionPanY];
    const opaque = (context: CanvasRenderingContext2D, width: number, height: number) => {
      const pixels = context.getImageData(0, 0, width, height).data;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] !== 255) return false; return true;
    };
    const visibleOpaque = opaque(node.getContext('2d'), node.width, node.height);
    const capture = (method: string) => {
      const destination = document.createElement('canvas'); destination.width = node._logicalW * 2; destination.height = node._logicalH * 2;
      const context = destination.getContext('2d')!;
      return { ok: node[method](context, destination.width, destination.height), opaque: opaque(context, destination.width, destination.height) };
    };
    const specimen = capture('_captureDissectionEvidence'), full = capture('_captureFullDissectionEvidence');
    return { specimen, full, visibleOpaque, preserved: before === JSON.stringify((window as any).__ctx.toolData.dissection),
      cameraPreserved: JSON.stringify(camera) === JSON.stringify([node._interactionZoom, node._interactionPanX, node._interactionPanY]),
      pins: (window as any).__ctx.toolData.dissection.procedureByLayer.organs.pins.length };
  })).toEqual({ specimen: { ok: true, opaque: true }, full: { ok: true, opaque: true }, visibleOpaque: true,
    preserved: true, cameraPreserved: true, pins: 2 });
}

function overlaps(a: any, b: any) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function expectRenal(drawing: any, detailed: boolean) {
 expect(drawing.matrixObserved).toBe(true); expect(drawing.activePins).toBe(2);
 expect(drawing.kidneys).toHaveLength(2); expect(drawing.hila).toHaveLength(2);
 expect(drawing.kidneys.map((p:any)=>p.cubics)).toEqual([6,6]);
 expect(drawing.hila.map((p:any)=>p.cubics)).toEqual([4,4]);
 expect(drawing.kidneys.map((p:any)=>p.alpha)).toEqual([.52,.84]);
 expect(drawing.kidneys.map((p:any)=>p.containsTargets)).toEqual([[false,true],[true,false]]);
 expect(drawing.hila.every((p:any)=>p.containsTargets.every((v:boolean)=>!v))).toBe(true);
 expect(drawing.clips).toHaveLength(detailed?4:2); expect(drawing.clips.every((p:any)=>p.cubics===6)).toBe(true);
 expect(drawing.coelomClips.length).toBeGreaterThanOrEqual(1);
 expect(drawing.coelomClips.every((p:any)=>p.cubics===4&&p.containsTargets.every(Boolean))).toBe(true);
 expect(drawing.renalOutsideWindow).toHaveLength(2);
 for(const probe of drawing.renalOutsideWindow){ expect(probe.samples).toBeGreaterThan(0); expect(probe.changed).toBe(0); }
 expect(drawing.renalComplexOutsideWindow).toHaveLength(2);for(const probe of drawing.renalComplexOutsideWindow){expect(probe.samples).toBeGreaterThan(0);expect(probe.changed).toBe(0);}
 expect(drawing.laterAnatomical.length).toBeGreaterThan(20);
 expect(drawing.laterAnatomical.every((p:any)=>p.containsTargets.every((v:boolean)=>!v))).toBe(true);
 expect(drawing.laterAnatomical.every((p:any)=>p.targetPixelsUnchanged.every(Boolean))).toBe(true);
 expect(drawing.sectionIndicators).toHaveLength(2);
 expect(drawing.sectionIndicators.every((p:any)=>p.owner==='section-indicator'&&p.style==='#94a3b8'&&p.alpha===.15&&p.lineWidth===.5)).toBe(true);
 expect(drawing.targets.every((p:any)=>p.target&&p.ownPaint&&p.insideCoelom)).toBe(true);
}
function expectReticle(drawing:any){const p=drawing.targets[0].target;expect(drawing.reticle).not.toBeNull();expect(Math.hypot(p.x-drawing.reticle.x,p.y-drawing.reticle.y)).toBeLessThan(.5);}
async function expectSelectionClear(page:Page,canvas:any,drawing:any,phone=false){
 const layout=await observePigRenalCaption(canvas,'kidneys_p');expect(layout.card).not.toBeNull();expect(layout.caption).not.toBeNull();expect(layout.leader).not.toBeNull();
 expect(layout.caption.text).toBe('DEEP · RENAL');expect(layout.caption.fontCss).toBeGreaterThanOrEqual(8.5);
 expect(layout.caption.x).toBeGreaterThanOrEqual(0);expect(layout.caption.y).toBeGreaterThanOrEqual(0);
 expect(layout.caption.x+layout.caption.width).toBeLessThanOrEqual(layout.width+.5);expect(layout.caption.y+layout.caption.height).toBeLessThanOrEqual(layout.height+.5);
 expect(layout.crossesCaption).toBe(false);expect(layout.markerIntersections).toEqual([]);
 for(const body of drawing.kidneys){expect(overlaps(layout.card,body.bounds)).toBe(false);expect(overlaps(layout.caption,body.bounds)).toBe(false);}
 const actual=await observePigRenalPaint(canvas,[{id:'card',...layout.card},{id:'caption',...layout.caption}]);
 expect(actual.kidneys.every((p:any)=>p.obstacleIntersections.length===0)).toBe(true);expect(actual.hila.every((p:any)=>p.obstacleIntersections.length===0)).toBe(true);
 if(phone){for(const id of['orientation','scale']){expect(layout.hudPanels.some((p:any)=>p.id===id)).toBe(true);expect(layout.cardHudIntersections).not.toContain(id);expect(layout.captionHudIntersections).not.toContain(id);}}
 return layout;
}
async function expectNeighborCardClear(canvas:any,id:string){const layout=await observePigRenalCaption(canvas,id),drawing=await observePigRenalPaint(canvas);expect(layout.card).not.toBeNull();for(const body of drawing.kidneys)expect(overlaps(layout.card,body.bounds)).toBe(false);const native=await observePigRenalPaint(canvas,[{id:'neighbor-card',...layout.card}]);expect(native.kidneys.every((p:any)=>p.obstacleIntersections.length===0)).toBe(true);}
async function selectActual(page:Page,canvas:any){await update(page,{selectedOrgan:null,hoveredOrgan:null});await ready(page);const d=await observePigRenalPaint(canvas),p=d.targets[0].target;await page.mouse.click(p.x,p.y);await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBe('kidneys_p');const selected=await observePigRenalPaint(canvas);await test.info().attach('renal-selected-native',{contentType:'application/json',body:JSON.stringify({state:await canvas.evaluate((n:any)=>({view:n._drawD.anatomicalView,width:n._logicalW,height:n._logicalH,hover:n._drawD.hoveredOrgan})),overlaps:selected.laterAnatomical.filter((p:any)=>p.containsTargets.some(Boolean)||!p.targetPixelsUnchanged.every(Boolean))},null,2)});expectReticle(selected);return selected;}
test('porcine renal capsules remain selectable and coelom-clipped through aspect, view and variation changes',async({page})=>{
 for(const[width,height,seed]of[[500,600,3],[1000,600,19],[320,900,7]]){
  const canvas=await ready(page);await canvas.evaluate((n:any,size)=>{n._logicalW=size.width;n._logicalH=size.height;n.style.aspectRatio=size.width+' / '+size.height;n.style.height='auto';n._drawDissectionNow();},{width,height});
  for(const anatomicalView of['internal','ventral','dorsal']){
   const mirrored=anatomicalView==='ventral';const zoom=width===320?2:3;
   await update(page,{anatomicalView,variationSeed:seed,canvasZoom:zoom,canvasPanX:(.5-anchor.x)*width*zoom*(mirrored?-1:1),canvasPanY:(.5-anchor.y)*height*zoom,selectedOrgan:null,hoveredOrgan:null});
   await ready(page);await expect(page.locator('#diss-organ-kidneys_p')).toHaveAttribute('data-exposure-state','visible');
   const d=await selectActual(page,canvas);expectRenal(d,true);await expectSelectionClear(page,canvas,d);await expectNativePreserved(page);
  }
 }
 const canvas=await ready(page);await canvas.evaluate((n:any)=>{n._logicalW=500;n._logicalH=600;n.style.aspectRatio='500 / 600';n._drawDissectionNow();});
 await update(page,{anatomicalView:'internal',canvasZoom:1,canvasPanX:0,canvasPanY:0,selectedOrgan:null,hoveredOrgan:null});
 await page.locator('#diss-organ-kidneys_p').click();await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBe('kidneys_p');expectReticle(await observePigRenalPaint(canvas));
 await update(page,{anatomicalView:'ventral',canvasZoom:2,canvasPanX:(anchor.x-.5)*1000,canvasPanY:(.5-anchor.y)*1200});
 for(const id of['liver_p','stomach_p','pancreas_p']){await update(page,{selectedOrgan:id,hoveredOrgan:null});await ready(page);await expectNeighborCardClear(canvas,id);}
});
test('renal detail and clarity modes preserve both phone capsules, status and opaque exports',async({page})=>{
 for(const mode of[{visualRealism:'guided',highContrast:false,sceneDetail:true,detailed:true},{visualRealism:'accessible',highContrast:true,sceneDetail:true,detailed:false},{visualRealism:'realistic',highContrast:true,sceneDetail:true,detailed:false},{visualRealism:'realistic',highContrast:false,sceneDetail:false,detailed:false}]){
  const{detailed,...presentation}=mode;await update(page,{...presentation,selectedOrgan:'kidneys_p',canvasZoom:2,canvasPanX:(.5-anchor.x)*1000,canvasPanY:(.5-anchor.y)*1200});
  const canvas=await ready(page),d=await observePigRenalPaint(canvas);expectRenal(d,detailed);expectReticle(d);await expectSelectionClear(page,canvas,d);await expectNativePreserved(page);
 }
 await page.evaluate(()=>{const meta=document.querySelector('meta[name="viewport"]')||document.head.appendChild(document.createElement('meta'));meta.setAttribute('name','viewport');meta.setAttribute('content','width=device-width, initial-scale=1');(document.querySelector('#wrap')as HTMLElement).style.cssText='width:100%;max-width:1180px';});
 await page.setViewportSize({width:390,height:844});const device=await page.context().newCDPSession(page);
 try{await device.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:2});expect(await page.evaluate(()=>devicePixelRatio)).toBe(2);
 await update(page,{visualRealism:'realistic',highContrast:false,sceneDetail:true,largeText:true,canvasZoom:2,canvasPanX:(.5-anchor.x)*1000,canvasPanY:(.5-anchor.y)*1200});const canvas=await ready(page);
 for(const width of[null,333.25]){if(width){await canvas.evaluate((n:any,width)=>{n.style.width=width+'px';n.style.maxWidth=width+'px';n._dpr=0;n._drawDissectionNow();},width);await ready(page);expect(await canvas.evaluate((n:any)=>Math.max(Math.abs(n.width-n._logicalW*n._dpr),Math.abs(n.height-n._logicalH*n._dpr)))).toBeGreaterThan(.01);}
 const d=await selectActual(page,canvas);expectRenal(d,true);const layout=await expectSelectionClear(page,canvas,d,true),field=await canvas.boundingBox();expect(field).not.toBeNull();
 const x=field.x+layout.card.x+layout.card.width/2,y=field.y+layout.card.y+layout.card.height/2;await page.mouse.move(x,y);await expect(page.locator('#diss-canvas-status')).toContainText('Selected Kidneys in the Visceral Organs layer.');
 await page.mouse.click(x,y);await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBeNull();await selectActual(page,canvas);await expectNativePreserved(page);
 }
 for(const id of['liver_p','stomach_p','pancreas_p']){await update(page,{selectedOrgan:id,hoveredOrgan:null});await ready(page);await expectNeighborCardClear(canvas,id);}
 }finally{await device.detach();}
});
