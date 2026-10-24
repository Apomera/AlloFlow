import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { semilunarTargets, observeSheepSemilunarPaint, observeSheepSemilunarCaption } from './helpers/dissection_sheep_semilunar_paint.cjs';
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
  await harness.mount(page, { dissection: { specimen: 'sheepHeart', _dissLoadedSpec: 'sheepHeart', activeLayer: 'organs',
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

const cuspHits=[[false,false],[true,false],[false,false],[false,false],[false,true],[false,false]];
function expectSemilunar(d:any,detailed:boolean,accessible=false){
 expect(d.matrixObserved).toBe(true);expect(d.targetMatrixSource).toBe('opened-heart-fill');expect(d.heartScaleFromNativeMatrices).toBe(true);expect(d.activePins).toBe(2);expect(d.bodies.length).toBeGreaterThanOrEqual(2);expect(d.bodies.every((p:any)=>p.cubics===5&&p.containsTargets.every(Boolean))).toBe(true);for(const p of[...d.pockets,...d.arcStrokes])expect(p.paintMatrix).toEqual(d.openingMatrix);
 expect(d.pockets).toHaveLength(detailed?6:0);if(detailed)expect(d.pockets.map((p:any)=>p.containsTargets)).toEqual(cuspHits);for(const p of d.pockets){expect(p.arcs).toHaveLength(1);expect(p.quadratics).toBe(1);expect(p.closed).toBe(true);expect(p.gradient).toBe(true);expect(p.alpha).toBe(1);expect(p.insideBody.total).toBeGreaterThan(0);expect(p.insideBody.outside).toBe(0);expect(p.insideOpening.outside).toBe(0);expect(p.obstacleIntersections).toEqual([]);}
 expect(d.unionClips).toHaveLength(detailed?2:0);if(detailed)expect(d.unionClips.map((p:any)=>p.containsTargets)).toEqual([[true,false],[false,true]]);for(const c of d.unionClips){expect(c.arcs).toHaveLength(3);expect(c.quadratics).toBe(3);expect(c.insideBody.total).toBeGreaterThan(0);expect(c.insideBody.outside).toBe(0);expect(c.obstacleIntersections).toEqual([]);}
 expect(d.glints).toHaveLength(detailed?6:0);for(const p of d.glints){expect(p.quadratics).toBe(1);expect(p.unionClipActive).toBe(true);expect(p.gradient).toBe(true);expect(p.lineWidth).toBeCloseTo(.25,6);expect(p.containsTargets).toEqual([false,false]);expect(p.targetPixelsUnchanged).toEqual([true,true]);expect(p.obstacleIntersections).toEqual([]);}
 expect(d.arcStrokes).toHaveLength(6);expect(d.arcStrokes.map((p:any)=>p.containsTargets)).toEqual(cuspHits);for(const p of d.arcStrokes){expect(p.arcs).toHaveLength(1);expect(p.arcs[0].radius).toBeCloseTo(d.logicalWidth*.011,8);expect(p.arcs[0].start).toBe(0);expect(p.arcs[0].end).toBe(Math.PI);expect(p.lineWidth).toBeCloseTo(accessible?1.15:.75,6);expect(p.insideBody.total).toBeGreaterThan(0);expect(p.insideBody.outside).toBe(0);expect(p.obstacleIntersections).toEqual([]);}expect(d.arcStrokes.map((p:any)=>p.style)).toEqual(detailed?Array(6).fill('rgba(125, 112, 92, 0.78)'):['#fde68a','#fde68a','#fde68a','#bfdbfe','#bfdbfe','#bfdbfe']);
 expect(d.targets.every((p:any)=>p.target&&p.ownStroke&&(!detailed||p.ownFill))).toBe(true);expect(d.laterAnatomical.every((p:any)=>p.containsTargets.every((v:boolean)=>!v)&&p.targetPixelsUnchanged.every(Boolean))).toBe(true);expect(d.labels.length).toBeGreaterThanOrEqual(6);expect(d.labels.every((p:any)=>p.targetPixelsUnchanged.every(Boolean))).toBe(true);
 for(const p of d.overlays){if(p.owner==='flow'){expect(p.flowSite).not.toBeNull();expect(p.paintStack).toContain('/stem_tool_dissection.js:'+p.flowSite.line+':');expect(p.containsTargets).toEqual([false,false]);expect(p.targetPixelsUnchanged).toEqual([true,true]);}else expect(p.paintStack).toMatch(/drawAnatomicalExposureVeil|drawSpecimenTissueRelief|drawProbePalpationPreview/);}
 const light=d.laterRectangles.filter((p:any)=>p.sourceSite);expect(light.length).toBeGreaterThanOrEqual(2);for(const p of light){expect(p.owner).toBe(p.sourceSite.owner);expect(p.paintStack).toContain('/stem_tool_dissection.js:'+p.sourceSite.line+':');if(p.owner!=='specimen-glare')expect(p.rectangle).toEqual([0,0,d.logicalWidth,d.logicalHeight]);if(p.owner==='specimen-condition-tint'){expect(p.style).toBe(({preserved:'rgba(148, 163, 184, 0.18)',dehydrated:'rgba(180, 126, 84, 0.18)',cloudy:'rgba(226, 232, 240, 0.16)'}as any)[d.specimenCondition]);expect(p.composite).toBe(d.specimenCondition==='cloudy'?'screen':'soft-light');}}
 expect(d.laterRectangles.filter((p:any)=>!p.sourceSite&&!['inspection-relief','instrument-preview'].includes(p.owner)).every((p:any)=>p.targetPixelsUnchanged.every(Boolean))).toBe(true);
}
function expectReticle(d:any,id:string){const p=d.targets.find((p:any)=>p.id===id).target;expect(d.reticle).not.toBeNull();expect(Math.hypot(p.x-d.reticle.x,p.y-d.reticle.y)).toBeLessThan(.5);}
async function pose(page:Page,W=500,H=600,view='internal',zoom=3){await update(page,{anatomicalView:view,canvasZoom:zoom,canvasPanX:(.5-.515)*W*zoom*(view==='ventral'?-1:1),canvasPanY:(.5-.363)*H*zoom,selectedOrgan:null,hoveredOrgan:null});return ready(page);}
async function selectActual(page:Page,canvas:any,id:string){await update(page,{selectedOrgan:null,hoveredOrgan:null});await ready(page);const d=await observeSheepSemilunarPaint(canvas),p=d.targets.find((p:any)=>p.id===id).target;await page.mouse.click(p.x,p.y);try{await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBe(id);}catch(error){await test.info().attach('semilunar-actual-input-failure',{contentType:'application/json',body:JSON.stringify({requested:id,click:p,before:d,after:await observeSheepSemilunarPaint(canvas),state:await canvas.evaluate((n:any)=>({data:(window as any).__ctx.toolData.dissection,rect:n.getBoundingClientRect().toJSON(),labels:n._hotspotLabelBoxes}))},null,2)});await test.info().attach('semilunar-actual-input-canvas',{contentType:'image/png',body:await canvas.screenshot()});throw error;}const selected=await observeSheepSemilunarPaint(canvas);expectReticle(selected,id);return selected;}
async function expectClear(canvas:any,id:string,phone=false){
 const l=await observeSheepSemilunarCaption(canvas,id);expect(l.card).not.toBeNull();const primary=['aortic_v','pulm_v'].includes(id);if(primary){expect(l.caption).not.toBeNull();expect(l.caption.text).toBe('DEEP \u00b7 LAYERED');expect(l.caption.fontCss).toBeGreaterThanOrEqual(8.5);expect(l.caption.x).toBeGreaterThanOrEqual(0);expect(l.caption.y).toBeGreaterThanOrEqual(0);expect(l.caption.x+l.caption.width).toBeLessThanOrEqual(l.width+.5);expect(l.caption.y+l.caption.height).toBeLessThanOrEqual(l.height+.5);expect(l.crossesCaption).toBe(false);expect(l.markerIntersections).toEqual([]);}
 expect(l.hitRectangles).toHaveLength(l.expectedHitRectangleCount);expect(new Set(l.hitRectangles.map((b:any)=>b.id)).size).toBe(l.expectedHitRectangleCount);const obstacles=[{id:'card',...l.card},primary&&{id:'caption',...l.caption},...l.hitRectangles.map((b:any)=>({...b,id:'hit-'+b.id})),...l.markers.filter((m:any)=>m.kind==='badge').map((m:any)=>({...m,id:'badge-'+m.number}))].filter(Boolean),d=await observeSheepSemilunarPaint(canvas,obstacles),collisions=[...d.pockets,...d.unionClips,...d.glints,...d.arcStrokes].flatMap((p:any)=>p.obstacleIntersections);if(collisions.length)await test.info().attach('semilunar-layout-failure',{contentType:'application/json',body:JSON.stringify({layout:l,native:d,state:await canvas.evaluate((n:any)=>({data:(window as any).__ctx.toolData.dissection,rect:n.getBoundingClientRect().toJSON()}))},null,2)});expect(collisions).toEqual([]);if(phone)for(const id of['orientation','scale']){expect(l.hudPanels.some((p:any)=>p.id===id)).toBe(true);expect(l.cardHudIntersections).not.toContain(id);expect(l.captionHudIntersections).not.toContain(id);}return l;
}
for(const[width,height,seed]of[[500,600,3],[1000,600,19],[320,900,7]])test(`semilunar aspect ${width}x${height}: actual cusp clicks preserve tissue through mirror and view changes`,async({page})=>{
 let canvas=await ready(page);await canvas.evaluate((n:any,s)=>{n._logicalW=s.width;n._logicalH=s.height;n.style.aspectRatio=s.width+' / '+s.height;n.style.height='auto';n._drawDissectionNow();},{width,height});await update(page,{variationSeed:seed});
  for(const view of['internal','lateral','ventral']){canvas=await pose(page,width,height,view);for(const id of['aortic_v','pulm_v']){await update(page,{selectedOrgan:null,hoveredOrgan:null});await ready(page);await expect(page.locator('#diss-organ-'+id)).toHaveAttribute('data-exposure-state','visible');expectSemilunar(await selectActual(page,canvas,id),true);await expectClear(canvas,id);}await expectNativePreserved(page);}
  canvas=await pose(page,width,height,'dorsal');await expect(page.locator('#diss-organ-pulm_v')).toHaveAttribute('data-exposure-state','occluded');await expect(page.locator('#diss-organ-aortic_v')).toHaveAttribute('data-exposure-state','visible');expectSemilunar(await selectActual(page,canvas,'aortic_v'),true);await expectClear(canvas,'aortic_v');await expectNativePreserved(page);
 if(width===500){canvas=await ready(page);for(const id of['aortic_v','pulm_v']){await pose(page,500,600,'internal',1);await page.locator('#diss-organ-'+id).click();await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBe(id);expectReticle(await observeSheepSemilunarPaint(canvas),id);}
 await pose(page,500,600,'internal',2);for(const id of['mitral','tricuspid','lv','rv','ra','la']){await update(page,{selectedOrgan:id,hoveredOrgan:null});await ready(page);await expectClear(canvas,id);}expect((await observeOcularCardiacPaint(canvas,'sheepHeart')).mitralInsideLeaflet).toBe(true);}
});
test('semilunar material, heartbeat and clarity modes preserve phone tissue and opaque exports',async({page})=>{
 for(const mode of[{visualRealism:'guided',highContrast:false,sceneDetail:true,detailed:true},{visualRealism:'accessible',highContrast:true,sceneDetail:true,detailed:false},{visualRealism:'realistic',highContrast:true,sceneDetail:true,detailed:false},{visualRealism:'realistic',highContrast:false,sceneDetail:false,detailed:false}]){const{detailed,...presentation}=mode;await update(page,presentation);const canvas=await pose(page);for(const id of['aortic_v','pulm_v']){const d=await selectActual(page,canvas,id);expectSemilunar(d,detailed,mode.visualRealism==='accessible');await expectClear(canvas,id);}await expectNativePreserved(page);}
 await update(page,{visualRealism:'realistic',highContrast:false,sceneDetail:true,lightDirection:'left'});let canvas=await pose(page),left=await observeSheepSemilunarPaint(canvas);await update(page,{lightDirection:'right'});await ready(page);const right=await observeSheepSemilunarPaint(canvas);for(const d of[left,right]){expectSemilunar(d,true);expect(d.pockets.map((p:any)=>p.materialSampleContains)).toEqual([[false,false],[false,false],[true,false],[false,false],[false,false],[false,true]]);}expect(left.pockets[2].materialPixels[0]).not.toEqual(right.pockets[2].materialPixels[0]);expect(left.pockets[5].materialPixels[1]).not.toEqual(right.pockets[5].materialPixels[1]);await test.info().attach('semilunar-native-interior-light',{contentType:'application/json',body:JSON.stringify({left:left.pockets.map((p:any)=>p.materialPixels),right:right.pockets.map((p:any)=>p.materialPixels)})});
 for(const moisture of[15,90]){await update(page,{lightDirection:'overhead',procedureByLayer:{organs:{...healthy,tissueState:{...healthy.tissueState,moisture}}}});await ready(page);expectSemilunar(await observeSheepSemilunarPaint(canvas),true);await expectNativePreserved(page);}for(const condition of['preserved','dehydrated','cloudy']){await update(page,{specimenCondition:condition});await ready(page);expectSemilunar(await observeSheepSemilunarPaint(canvas),true);await expectNativePreserved(page);}
 await update(page,{specimenCondition:'standard',livingFunctionEnabled:true,reducedMotion:false});canvas=await pose(page);let motionScale=1;for(const id of['aortic_v','pulm_v']){const d=await selectActual(page,canvas,id);expectSemilunar(d,true);expect(d.heartScale).toBeGreaterThanOrEqual(1);expect(d.heartScale).toBeLessThanOrEqual(1.019);motionScale=Math.max(motionScale,d.heartScale);await expectClear(canvas,id);}expect(motionScale).toBeGreaterThan(1);await expectNativePreserved(page);
 await update(page,{livingFunctionPaused:true});await canvas.evaluate((n:any)=>{n._livingFunctionElapsedMs=1300;n._livingFunctionLastAt=performance.now();n._drawDissectionNow();});for(const id of['aortic_v','pulm_v']){const d=await selectActual(page,canvas,id);expectSemilunar(d,true);expect(d.heartScale).toBeCloseTo(1.018,7);await expectClear(canvas,id);}await expectNativePreserved(page);
 await page.evaluate(()=>{const meta=document.querySelector('meta[name="viewport"]')||document.head.appendChild(document.createElement('meta'));meta.setAttribute('name','viewport');meta.setAttribute('content','width=device-width, initial-scale=1');(document.querySelector('#wrap')as HTMLElement).style.cssText='width:100%;max-width:1180px';});await page.setViewportSize({width:390,height:844});const device=await page.context().newCDPSession(page);
 try{await device.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:2});expect(await page.evaluate(()=>devicePixelRatio)).toBe(2);await update(page,{visualRealism:'realistic',highContrast:false,sceneDetail:true,largeText:true,livingFunctionEnabled:false,reducedMotion:true,procedureByLayer:{organs:healthy}});canvas=await pose(page,500,600,'internal',2);for(const width of[null,333.25]){if(width){await canvas.evaluate((n:any,width)=>{n.style.width=width+'px';n.style.maxWidth=width+'px';n._dpr=0;n._drawDissectionNow();},width);await ready(page);expect(await canvas.evaluate((n:any)=>Math.max(Math.abs(n.width-n._logicalW*n._dpr),Math.abs(n.height-n._logicalH*n._dpr)))).toBeGreaterThan(.01);}for(const id of['aortic_v','pulm_v']){expectSemilunar(await selectActual(page,canvas,id),true);const l=await expectClear(canvas,id,true),box=await canvas.boundingBox(),x=box.x+l.card.x+l.card.width/2,y=box.y+l.card.y+l.card.height/2;await page.mouse.move(x,y);await expect(page.locator('#diss-canvas-status')).toContainText('Selected '+(id==='aortic_v'?'Aortic Valve':'Pulmonary Valve')+' in the Internal layer.');await page.mouse.click(x,y);await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBeNull();await selectActual(page,canvas,id);await expectNativePreserved(page);}}}finally{await device.detach();}
});

