import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { retinalTargets, observeSheepRetinalPaint, observeSheepRetinalCaption } from './helpers/dissection_sheep_retinal_paint.cjs';
import { observeOcularCardiacPaint } from './helpers/dissection_ocular_cardiac_paint.cjs';


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
  await harness.mount(page, { dissection: { specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye', activeLayer: 'organs',
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

function expectRetina(d:any,detailed:boolean,accessible=false){
 expect(d.matrixObserved).toBe(true);expect(d.bodyObserved).toBe(true);expect(d.activePins).toBe(2);expect(d.bases).toHaveLength(1);const base=d.bases[0];expect(base.containsTargets).toEqual([true]);expect(base.alpha).toBe(1);expect(base.ellipses).toHaveLength(1);expect(base.ellipses[0].scaleX).toBeCloseTo(.89,8);expect(base.ellipses[0].scaleY).toBeCloseTo(.865,8);expect(base.ellipses[0].angle).toBe(-.015);expect(base.style).toBe(accessible?'rgba(254, 249, 195, 0.92)':'rgba(244, 230, 183, 0.72)');expect(base.insideBody.total).toBeGreaterThan(0);expect(base.insideBody.outside).toBe(0);
 expect(d.clips).toHaveLength(detailed?1:0);for(const c of d.clips){expect(c.rule).toBe('evenodd');expect(c.ellipses).toHaveLength(2);expect(c.containsTargets).toEqual([true]);expect(c.materialSampleContains).toEqual([true,false,false]);expect(c.centerInside).toBe(false);expect(c.fullBandObstacleIntersections).toEqual([]);}
 expect(d.pearls).toHaveLength(detailed?1:0);for(const p of d.pearls){expect(p.alpha).toBe(1);expect(p.gradient).toBe(true);expect(p.samplePixelsUnchanged.slice(1)).toEqual([true,true]);}
 expect(d.glints).toHaveLength(detailed?3:0);for(const g of d.glints){expect(g.cubics).toBe(1);expect(g.lineWidth).toBeCloseTo(.28,6);expect(g.alpha).toBe(1);expect(g.insideBand.total).toBeGreaterThan(0);expect(g.insideBand.outside).toBe(0);expect(g.containsTargets).toEqual([false]);expect(g.targetPixelsUnchanged).toEqual([true]);expect(g.obstacleIntersections).toEqual([]);}
 expect(d.targets.every((t:any)=>t.target&&t.ownPaint&&t.insideExposedBand)).toBe(true);expect(d.laterAnatomical.length).toBeGreaterThan(20);expect(d.laterAnatomical.every((p:any)=>p.containsTargets.every((v:boolean)=>!v)&&p.targetPixelsUnchanged.every(Boolean))).toBe(true);expect(d.exposureVeils.every((p:any)=>p.paintStack.includes('drawAnatomicalExposureVeil'))).toBe(true);expect(d.opticalRays.every((p:any)=>p.containsTargets.every((v:boolean)=>!v)&&p.targetPixelsUnchanged.every(Boolean))).toBe(true);expect(d.laterRectangles.filter((p:any)=>!['exposure-veil','inspection-relief','instrument-preview','specimen-directional-light','specimen-lab-glow','specimen-dim-light','specimen-glare','specimen-condition-tint'].includes(p.owner)).every((p:any)=>p.targetPixelsUnchanged.every(Boolean))).toBe(true);for(const p of d.laterRectangles.filter((p:any)=>['specimen-directional-light','specimen-lab-glow','specimen-dim-light','specimen-glare','specimen-condition-tint'].includes(p.owner))){expect(p.sourceSite.owner).toBe(p.owner);expect(p.paintStack).toContain('/stem_tool_dissection.js:'+p.sourceSite.line+':');if(p.owner!=='specimen-glare')expect(p.rectangle).toEqual([0,0,d.logicalWidth,d.logicalHeight]);if(p.owner==='specimen-condition-tint'){expect(p.style).toBe(({preserved:'rgba(148, 163, 184, 0.18)',dehydrated:'rgba(180, 126, 84, 0.18)',cloudy:'rgba(226, 232, 240, 0.16)',swollen:'rgba(251, 146, 160, 0.18)'} as any)[d.specimenCondition]);expect(p.composite).toBe(d.specimenCondition==='cloudy'?'screen':'soft-light');}}expect(d.retinalVessels).toBe(detailed?9:0);expect(d.fullBandObstacleIntersections).toEqual([]);
}
function expectReticle(d:any){const p=d.targets[0].target;expect(d.reticle).not.toBeNull();expect(Math.hypot(p.x-d.reticle.x,p.y-d.reticle.y)).toBeLessThan(.5);}
async function pose(page:Page,width=500,height=600,view='internal',zoom=3){const p=retinalTargets(width,height)[0];await update(page,{anatomicalView:view,canvasZoom:zoom,canvasPanX:(.5-p.x)*width*zoom*(view==='ventral'?-1:1),canvasPanY:(.5-p.y)*height*zoom,selectedOrgan:null,hoveredOrgan:null});return ready(page);}
async function selectActual(page:Page,canvas:any){await update(page,{selectedOrgan:null,hoveredOrgan:null});await ready(page);const d=await observeSheepRetinalPaint(canvas),p=d.targets[0].target;await page.mouse.click(p.x,p.y);await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBe('retina');const selected=await observeSheepRetinalPaint(canvas);expectReticle(selected);return selected;}
async function expectClear(canvas:any,phone=false,id='retina'){
 const l=await observeSheepRetinalCaption(canvas,id);expect(l.card).not.toBeNull();if(id==='retina'){expect(l.caption).not.toBeNull();expect(l.caption.text).toBe('DEEP \u00b7 LAYERED');expect(l.caption.fontCss).toBeGreaterThanOrEqual(8.5);expect(l.caption.x).toBeGreaterThanOrEqual(0);expect(l.caption.y).toBeGreaterThanOrEqual(0);expect(l.caption.x+l.caption.width).toBeLessThanOrEqual(l.width+.5);expect(l.caption.y+l.caption.height).toBeLessThanOrEqual(l.height+.5);expect(l.crossesCaption).toBe(false);expect(l.markerIntersections).toEqual([]);}
 const obstacles=[{id:'card',...l.card},id==='retina'&&{id:'caption',...l.caption}].filter(Boolean),d=await observeSheepRetinalPaint(canvas,obstacles);if(d.fullBandObstacleIntersections.length){await test.info().attach('retinal-layout-failure',{contentType:'application/json',body:JSON.stringify({layout:l,native:d,state:await canvas.evaluate((n:any)=>({data:(window as any).__ctx.toolData.dissection,logical:[n._logicalW,n._logicalH],backing:[n.width,n.height],rect:n.getBoundingClientRect().toJSON(),hotspots:n._hotspotLabelBoxes}))},null,2)});}expect(d.fullBandObstacleIntersections).toEqual([]);expect(d.glints.every((p:any)=>p.obstacleIntersections.length===0)).toBe(true);if(phone)for(const id of['orientation','scale']){expect(l.hudPanels.some((p:any)=>p.id===id)).toBe(true);expect(l.cardHudIntersections).not.toContain(id);expect(l.captionHudIntersections).not.toContain(id);}return l;
}
test('sheep retinal membrane remains selectable in its exposed band through aspect, view and variation changes',async({page})=>{
 for(const[width,height,seed]of[[500,600,3],[1000,600,19],[320,900,7]]){
  let canvas=await ready(page);await canvas.evaluate((n:any,s)=>{n._logicalW=s.width;n._logicalH=s.height;n.style.aspectRatio=s.width+' / '+s.height;n.style.height='auto';n._drawDissectionNow();},{width,height});await update(page,{variationSeed:seed});
  for(const view of['internal','lateral']){canvas=await pose(page,width,height,view);await expect(page.locator('#diss-organ-retina')).toHaveAttribute('data-exposure-state','visible');const d=await selectActual(page,canvas);expectRetina(d,true);await expectClear(canvas);await expectNativePreserved(page);}
  for(const view of['dorsal','ventral']){canvas=await pose(page,width,height,view);await expect(page.locator('#diss-organ-retina')).toHaveAttribute('data-exposure-state','occluded');expectRetina(await observeSheepRetinalPaint(canvas),true);await expectNativePreserved(page);}
 }
 const canvas=await ready(page);await canvas.evaluate((n:any)=>{n._logicalW=500;n._logicalH=600;n.style.aspectRatio='500 / 600';n._drawDissectionNow();});await pose(page,500,600,'internal',1);await page.locator('#diss-organ-retina').click();await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBe('retina');expectReticle(await observeSheepRetinalPaint(canvas));
 await pose(page,500,600,'internal',2);for(const id of['lens','ciliary_body','vitreous','tapetum','choroid']){await update(page,{selectedOrgan:id,hoveredOrgan:null});await ready(page);await expectClear(canvas,false,id);}
 const optical=await observeOcularCardiacPaint(canvas,'sheepEye');expect(optical.retinalVessels).toBe(9);expect(optical.targets.every((t:any)=>t.insidePaintedBody)).toBe(true);expect(optical.choroidInsideBand).toBe(true);
});
test('retinal membrane material and optical modes preserve phone selection, status and opaque exports',async({page})=>{
 for(const mode of[{visualRealism:'guided',highContrast:false,sceneDetail:true,detailed:true},{visualRealism:'accessible',highContrast:true,sceneDetail:true,detailed:false},{visualRealism:'realistic',highContrast:true,sceneDetail:true,detailed:false},{visualRealism:'realistic',highContrast:false,sceneDetail:false,detailed:false}]){const{detailed,...presentation}=mode;await update(page,presentation);const canvas=await pose(page),d=await selectActual(page,canvas);expectRetina(d,detailed,mode.visualRealism==='accessible');await expectClear(canvas);await expectNativePreserved(page);const o=await observeOcularCardiacPaint(canvas,'sheepEye');expect(o.retinalVessels).toBe(detailed?9:0);expect(o.simpleVessels).toBe(detailed?0:4);expect(o.incomingRays).toBe(mode.visualRealism==='realistic'?0:1);}
 await update(page,{visualRealism:'realistic',highContrast:false,sceneDetail:true,lightDirection:'left'});let canvas=await pose(page),left=await observeSheepRetinalPaint(canvas);await update(page,{lightDirection:'right'});await ready(page);const right=await observeSheepRetinalPaint(canvas);expectRetina(left,true);expectRetina(right,true);expect(left.pearls[0].samplesAfter[0]).not.toEqual(right.pearls[0].samplesAfter[0]);await test.info().attach('retinal-native-light-response',{contentType:'application/json',body:JSON.stringify({left:left.pearls,right:right.pearls},null,2)});
 const material=[];for(const moisture of[15,90]){await update(page,{lightDirection:'overhead',procedureByLayer:{organs:{...healthy,tissueState:{...healthy.tissueState,moisture}}}});await ready(page);const d=await observeSheepRetinalPaint(canvas);expectRetina(d,true);material.push(d.glints[0].style);await expectNativePreserved(page);}expect(material[0]).not.toBe(material[1]);
 for(const condition of['preserved','dehydrated','cloudy']){await update(page,{specimenCondition:condition});await ready(page);expectRetina(await observeSheepRetinalPaint(canvas),true);await expectNativePreserved(page);}await update(page,{specimenCondition:'standard',livingFunctionEnabled:true});await ready(page);expectRetina(await observeSheepRetinalPaint(canvas),true);expect((await observeOcularCardiacPaint(canvas,'sheepEye')).incomingRays).toBe(1);
 await page.evaluate(()=>{const meta=document.querySelector('meta[name="viewport"]')||document.head.appendChild(document.createElement('meta'));meta.setAttribute('name','viewport');meta.setAttribute('content','width=device-width, initial-scale=1');(document.querySelector('#wrap')as HTMLElement).style.cssText='width:100%;max-width:1180px';});await page.setViewportSize({width:390,height:844});const device=await page.context().newCDPSession(page);
 try{await device.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:2});expect(await page.evaluate(()=>devicePixelRatio)).toBe(2);await update(page,{visualRealism:'realistic',highContrast:false,sceneDetail:true,largeText:true,livingFunctionEnabled:false,procedureByLayer:{organs:healthy}});canvas=await pose(page,500,600,'internal',2);
  for(const width of[null,333.25]){if(width){await canvas.evaluate((n:any,width)=>{n.style.width=width+'px';n.style.maxWidth=width+'px';n._dpr=0;n._drawDissectionNow();},width);await ready(page);expect(await canvas.evaluate((n:any)=>Math.max(Math.abs(n.width-n._logicalW*n._dpr),Math.abs(n.height-n._logicalH*n._dpr)))).toBeGreaterThan(.01);}
   const d=await selectActual(page,canvas);expectRetina(d,true);const l=await expectClear(canvas,true),field=await canvas.boundingBox();expect(field).not.toBeNull();const x=field.x+l.card.x+l.card.width/2,y=field.y+l.card.y+l.card.height/2;await page.mouse.move(x,y);await expect(page.locator('#diss-canvas-status')).toContainText('Selected Retina in the Internal layer.');await page.mouse.click(x,y);await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBeNull();await selectActual(page,canvas);await expectNativePreserved(page);
  }
 }finally{await device.detach();}
});
