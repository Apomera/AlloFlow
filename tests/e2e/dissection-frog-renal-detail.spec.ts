import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { frogRenalTargets, observeFrogRenalPaint, observeFrogRenalCaption, observeFrogRenalMaterial } from './helpers/dissection_frog_renal_paint.cjs';


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
  await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'organs',
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
    Object.entries(patch).every(([key, value]) => typeof value === 'object' && value !== null ? JSON.stringify(node._drawD[key]) === JSON.stringify(value) : node._drawD[key] === value), patch)).toBe(true);
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
function expectRenal(d:any,detailed:boolean,simple=false,mesentery=true,alpha=.96){
 expect(d.matrixObserved).toBe(true);expect(d.activePins).toBe(2);expect(d.kidneys).toHaveLength(2);expect(d.kidneys.every((p:any)=>p.alpha===alpha)).toBe(true);expect(d.kidneys.map((p:any)=>p.cubics)).toEqual(simple?[0,0]:[5,5]);expect(d.kidneys.map((p:any)=>p.ellipse)).toEqual([simple,simple]);expect(d.kidneys.map((p:any)=>p.containsTargets)).toEqual([[false,true],[true,false]]);expect(d.kidneys.every((p:any)=>p.insideCavity.total>0&&p.insideCavity.outside===0&&p.insideBody.outside===0)).toBe(true);
 expect(d.adrenals).toHaveLength(detailed?6:0);expect(d.adrenals.every((p:any)=>p.cubics===4&&!p.containsTargets[0]&&p.insideRenalBody.total>0&&p.insideRenalBody.outside===0)).toBe(true);expect(d.clips).toHaveLength(detailed?4:0);expect(d.clips.every((p:any)=>p.cubics===5)).toBe(true);expect(d.mottles).toHaveLength(detailed?6:0);expect(d.targets.every((p:any)=>p.target&&p.ownPaint&&p.insideCavity)).toBe(true);
 expect(d.exposureVeils.every((p:any)=>p.owner==='exposure-veil'&&['fill','stroke'].includes(p.paint)&&p.cubics===0&&p.paintStack.includes('drawAnatomicalExposureVeil'))).toBe(true);expect(d.laterAnatomical.length).toBeGreaterThan(20);const membrane=d.laterAnatomical.filter((p:any)=>p.owner==='mesentery'&&p.paint==='fill');expect(membrane).toHaveLength(mesentery?1:0);for(const p of membrane){expect(p.containsTargets[0]).toBe(true);expect(p.style).toBe('rgba(224, 185, 150, 0.19)');expect(p.alpha).toBe(alpha);}
 for(const p of d.laterAnatomical.filter((p:any)=>p.owner!=='mesentery')){expect(p.containsTargets[0]).toBe(false);expect(p.targetPixelsUnchanged[0]).toBe(true);}
}
function expectReticle(d:any){const p=d.targets[0].target;expect(d.reticle).not.toBeNull();expect(Math.hypot(p.x-d.reticle.x,p.y-d.reticle.y)).toBeLessThan(.5);}
async function pose(page:Page,width=500,height=600,view='internal',zoom=3){const p=frogRenalTargets(width,height)[0];await update(page,{anatomicalView:view,canvasZoom:zoom,canvasPanX:(.5-p.x)*width*zoom*(view==='ventral'?-1:1),canvasPanY:(.5-p.y)*height*zoom,selectedOrgan:null,hoveredOrgan:null});return ready(page);}
async function selectActual(page:Page,canvas:any){await update(page,{selectedOrgan:null,hoveredOrgan:null});await ready(page);const d=await observeFrogRenalPaint(canvas),p=d.targets[0].target;await page.mouse.click(p.x,p.y);await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBe('kidneys');const selected=await observeFrogRenalPaint(canvas);expectReticle(selected);return selected;}
async function expectClear(canvas:any,phone=false,id='kidneys'){
 const l=await observeFrogRenalCaption(canvas,id);expect(l.card).not.toBeNull();if(id==='kidneys'){expect(l.caption).not.toBeNull();expect(l.caption.text).toBe('DEEP \u00b7 RENAL');expect(l.leader).not.toBeNull();expect(l.caption.fontCss).toBeGreaterThanOrEqual(8.5);expect(l.caption.x).toBeGreaterThanOrEqual(0);expect(l.caption.y).toBeGreaterThanOrEqual(0);expect(l.caption.x+l.caption.width).toBeLessThanOrEqual(l.width+.5);expect(l.caption.y+l.caption.height).toBeLessThanOrEqual(l.height+.5);expect(l.crossesCaption).toBe(false);expect(l.markerIntersections).toEqual([]);}
 const obstacles=[{id:'card',...l.card},id==='kidneys'&&{id:'caption',...l.caption}].filter(Boolean),native=await observeFrogRenalPaint(canvas,obstacles);expect(native.kidneys.every((p:any)=>p.obstacleIntersections.length===0)).toBe(true);expect(native.adrenals.every((p:any)=>p.obstacleIntersections.length===0)).toBe(true);if(phone)for(const id of['orientation','scale']){expect(l.hudPanels.some((p:any)=>p.id===id)).toBe(true);expect(l.cardHudIntersections).not.toContain(id);expect(l.captionHudIntersections).not.toContain(id);}return l;
}

test('frog renal capsules and exposed caudal selection survive aspect, view and variation changes',async({page})=>{
 for(const[width,height,seed]of[[500,600,3],[1000,600,19],[320,900,7]]){
  let canvas=await ready(page);await canvas.evaluate((n:any,s)=>{n._logicalW=s.width;n._logicalH=s.height;n.style.aspectRatio=s.width+' / '+s.height;n.style.height='auto';n._drawDissectionNow();},{width,height});await update(page,{variationSeed:seed});
  for(const view of['internal','dorsal']){canvas=await pose(page,width,height,view);await expect(page.locator('#diss-organ-kidneys')).toHaveAttribute('data-exposure-state','visible');const d=await selectActual(page,canvas);expectRenal(d,true);await expectClear(canvas);await expectNativePreserved(page);}
  canvas=await pose(page,width,height,'ventral');await expect(page.locator('#diss-organ-kidneys')).toHaveAttribute('data-exposure-state','occluded');expectRenal(await observeFrogRenalPaint(canvas),true);await expectNativePreserved(page);
 }
 const canvas=await ready(page);await canvas.evaluate((n:any)=>{n._logicalW=500;n._logicalH=600;n.style.aspectRatio='500 / 600';n._drawDissectionNow();});await pose(page,500,600,'internal',1);await page.locator('#diss-organ-kidneys').click();await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBe('kidneys');expectReticle(await observeFrogRenalPaint(canvas));
 await pose(page,500,600,'internal',2);for(const id of['stomach','sm_intestine','pancreas','lg_intestine']){await update(page,{selectedOrgan:id,hoveredOrgan:null});await ready(page);await expectClear(canvas,false,id);}
});

test('frog renal material and clarity modes preserve phone tissue, status and opaque exports',async({page})=>{
 for(const mode of[{visualRealism:'guided',highContrast:false,sceneDetail:true,detailed:true,simple:false,mesentery:true},{visualRealism:'accessible',highContrast:true,sceneDetail:true,detailed:false,simple:true,mesentery:false},{visualRealism:'realistic',highContrast:true,sceneDetail:true,detailed:false,simple:true,mesentery:true},{visualRealism:'realistic',highContrast:false,sceneDetail:false,detailed:false,simple:false,mesentery:false}]){
  const{detailed,simple,mesentery,...presentation}=mode;await update(page,presentation);const canvas=await pose(page),d=await selectActual(page,canvas);expectRenal(d,detailed,simple,mesentery,mode.visualRealism==='realistic'?.96:.90);await expectClear(canvas);await expectNativePreserved(page);
 }
 await update(page,{visualRealism:'realistic',highContrast:false,sceneDetail:true,lightDirection:'left'});let canvas=await pose(page);const left=await observeFrogRenalMaterial(canvas);await update(page,{lightDirection:'right'});await ready(page);const right=await observeFrogRenalMaterial(canvas);for(const reading of[left,right]){expect(reading.records).toHaveLength(2);expect(reading.records.map((p:any)=>p.contains)).toEqual([[true,false],[false,true]]);expect(reading.records.every((p:any)=>p.gradient&&p.alpha===.96)).toBe(true);}expect(left.records[1].pixels[1]).not.toEqual(right.records[1].pixels[1]);await test.info().attach('renal-native-light-response',{contentType:'application/json',body:JSON.stringify({left,right},null,2)});
 for(const moisture of[15,90]){await update(page,{lightDirection:'overhead',procedureByLayer:{organs:{...healthy,tissueState:{...healthy.tissueState,moisture}},nervous:healthy}});await ready(page);expectRenal(await observeFrogRenalPaint(canvas),true);await expectNativePreserved(page);}
 await page.evaluate(()=>{const meta=document.querySelector('meta[name="viewport"]')||document.head.appendChild(document.createElement('meta'));meta.setAttribute('name','viewport');meta.setAttribute('content','width=device-width, initial-scale=1');(document.querySelector('#wrap')as HTMLElement).style.cssText='width:100%;max-width:1180px';});await page.setViewportSize({width:390,height:844});const device=await page.context().newCDPSession(page);
 try{await device.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:2});expect(await page.evaluate(()=>devicePixelRatio)).toBe(2);await update(page,{visualRealism:'realistic',highContrast:false,sceneDetail:true,largeText:true,procedureByLayer:{organs:healthy,nervous:healthy}});canvas=await pose(page,500,600,'internal',2);
  for(const width of[null,333.25]){if(width){await canvas.evaluate((n:any,width)=>{n.style.width=width+'px';n.style.maxWidth=width+'px';n._dpr=0;n._drawDissectionNow();},width);await ready(page);expect(await canvas.evaluate((n:any)=>Math.max(Math.abs(n.width-n._logicalW*n._dpr),Math.abs(n.height-n._logicalH*n._dpr)))).toBeGreaterThan(.01);}
   const d=await selectActual(page,canvas);expectRenal(d,true);const l=await expectClear(canvas,true),field=await canvas.boundingBox();expect(field).not.toBeNull();const x=field.x+l.card.x+l.card.width/2,y=field.y+l.card.y+l.card.height/2;await page.mouse.move(x,y);await expect(page.locator('#diss-canvas-status')).toContainText('Selected Kidneys in the Organs layer.');await page.mouse.click(x,y);await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBeNull();await selectActual(page,canvas);await expectNativePreserved(page);
  }
 }finally{await device.detach();}
});






