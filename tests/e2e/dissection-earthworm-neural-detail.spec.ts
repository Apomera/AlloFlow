import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { earthwormNeuralTargets, earthwormNeuralGeometryForQa, observeEarthwormNeuralPaint, observeEarthwormNeuralCaption } from './helpers/dissection_earthworm_neural_paint.cjs';


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
  await harness.mount(page, { dissection: { specimen: 'earthworm', _dissLoadedSpec: 'earthworm', activeLayer: 'nervous',
    anatomicalView: 'dorsal', workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false,
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
      pins: (window as any).__ctx.toolData.dissection.procedureByLayer.nervous.pins.length };
  })).toEqual({ specimen: { ok: true, opaque: true }, full: { ok: true, opaque: true }, visibleOpaque: true,
    preserved: true, cameraPreserved: true, pins: 2 });
}
function expectNeural(drawing:any,detailed:boolean,alpha=.72){
 expect(drawing.matrixObserved).toBe(true);expect(drawing.activePins).toBe(2);
 expect(drawing.bodyPaints.some((p:any)=>p.containsTargets.every(Boolean))).toBe(true);
 expect(drawing.bodyClips.some((p:any)=>p.containsTargets.every(Boolean)&&p.lines===113)).toBe(true);
 expect(drawing.regions).toHaveLength(14);expect(drawing.regions.every((p:any)=>p.cubics===4&&p.alpha===alpha&&p.gradient===detailed)).toBe(true);
 expect(drawing.regions.every((p:any)=>p.insideBody.total>0&&p.insideBody.outside===0)).toBe(true);
 expect(drawing.regions.filter((p:any)=>p.containsTargets[0])).toHaveLength(1);expect(drawing.regions.filter((p:any)=>p.containsTargets[2])).toHaveLength(1);
 expect(drawing.routes).toHaveLength(detailed?3:1);expect(drawing.routes.every((p:any)=>p.cubics===4&&p.moves===4&&p.lines===44&&p.containsTargets[1])).toBe(true);
 expect(drawing.clips).toHaveLength(detailed?14:0);if(detailed){expect(drawing.clips.filter((p:any)=>p.cubics===8)).toHaveLength(2);expect(drawing.clips.filter((p:any)=>p.cubics===4)).toHaveLength(12);}
 expect(drawing.grain).toHaveLength(detailed?36:0);expect(drawing.targets.map((p:any)=>p.id)).toEqual(['cerebral_g','ventral_cord','segmental_g']);expect(drawing.targets.every((p:any)=>p.ownPaint&&p.insideBody&&p.target)).toBe(true);
}
function expectReticle(drawing:any,id:string){const p=drawing.targets.find((t:any)=>t.id===id).target;expect(drawing.reticle).not.toBeNull();expect(Math.hypot(p.x-drawing.reticle.x,p.y-drawing.reticle.y)).toBeLessThan(.5);}
async function pose(page:Page,id:string,width=500,height=600,view='dorsal',zoom=3){const anchor=earthwormNeuralTargets(width,height).find((t:any)=>t.id===id);await update(page,{anatomicalView:view,canvasZoom:zoom,canvasPanX:(.5-anchor.x)*width*zoom*(view==='ventral'?-1:1),canvasPanY:(.5-anchor.y)*height*zoom,selectedOrgan:null,hoveredOrgan:null});return ready(page);}
async function selectActual(page:Page,canvas:any,id:string){await update(page,{selectedOrgan:null,hoveredOrgan:null});await ready(page);const d=await observeEarthwormNeuralPaint(canvas),p=d.targets.find((t:any)=>t.id===id).target;await page.mouse.click(p.x,p.y);await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBe(id);const result=await observeEarthwormNeuralPaint(canvas);expectReticle(result,id);const index=['cerebral_g','ventral_cord','segmental_g'].indexOf(id);if(index===1)expect(result.routes.some((p:any)=>p.containsTargets[index]&&p.targetPixelsChanged[index])).toBe(true);else expect(result.regions.some((p:any)=>p.containsTargets[index]&&p.targetPixelsChanged[index])).toBe(true);return result;}
async function expectClear(canvas:any,id:string,phone=false){const layout=await observeEarthwormNeuralCaption(canvas,id);expect(layout.card).not.toBeNull();expect(layout.caption).not.toBeNull();expect(layout.caption.text).toMatch(/^DEEP /);expect(layout.leader).not.toBeNull();expect(layout.caption.fontCss).toBeGreaterThanOrEqual(8.5);expect(layout.caption.x).toBeGreaterThanOrEqual(0);expect(layout.caption.y).toBeGreaterThanOrEqual(0);expect(layout.caption.x+layout.caption.width).toBeLessThanOrEqual(layout.width+.5);expect(layout.caption.y+layout.caption.height).toBeLessThanOrEqual(layout.height+.5);expect(layout.crossesCaption).toBe(false);expect(layout.markerIntersections).toEqual([]);const native=await observeEarthwormNeuralPaint(canvas,[{id:'card',...layout.card},{id:'caption',...layout.caption}]);expect(native.regions.every((p:any)=>p.obstacleIntersections.length===0)).toBe(true);expect(native.routes.every((p:any)=>p.obstacleIntersections.length===0)).toBe(true);if(phone)for(const id of['orientation','scale']){expect(layout.hudPanels.some((p:any)=>p.id===id)).toBe(true);expect(layout.cardHudIntersections).not.toContain(id);expect(layout.captionHudIntersections).not.toContain(id);}return layout;}

test('earthworm neural topology and three actual tissue targets survive aspect, view and variation changes',async({page})=>{
 for(const[width,height,seed]of[[500,600,3],[1000,600,19],[320,900,7]]){
  let canvas=await ready(page);await canvas.evaluate((n:any,s)=>{n._logicalW=s.width;n._logicalH=s.height;n.style.aspectRatio=s.width+' / '+s.height;n.style.height='auto';n._drawDissectionNow();},{width,height});
  for(const view of['dorsal','internal','ventral']){
   await update(page,{variationSeed:seed,anatomicalView:view,selectedOrgan:null,hoveredOrgan:null});
   const ids=view==='ventral'?['ventral_cord','segmental_g']:['cerebral_g','ventral_cord','segmental_g'];
   await expect(page.locator('#diss-organ-cerebral_g')).toHaveAttribute('data-exposure-state',view==='ventral'?'occluded':'visible');
   for(const id of ids){canvas=await pose(page,id,width,height,view,id==='cerebral_g'?4:3);const d=await selectActual(page,canvas,id);expectNeural(d,true);await expectClear(canvas,id);await expectNativePreserved(page);}
  }
 }
 const canvas=await ready(page);await canvas.evaluate((n:any)=>{n._logicalW=500;n._logicalH=600;n.style.aspectRatio='500 / 600';n._drawDissectionNow();});await pose(page,'cerebral_g',500,600,'dorsal',1);
 for(const id of['cerebral_g','ventral_cord','segmental_g']){await update(page,{selectedOrgan:null,hoveredOrgan:null});await page.locator('#diss-organ-'+id).click();await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBe(id);expectReticle(await observeEarthwormNeuralPaint(canvas),id);}
});

test('earthworm neural clarity modes and phone cards preserve tissue, status and opaque exports',async({page})=>{
 for(const mode of[{visualRealism:'guided',highContrast:false,sceneDetail:true,detailed:true},{visualRealism:'accessible',highContrast:true,sceneDetail:true,detailed:false},{visualRealism:'realistic',highContrast:true,sceneDetail:true,detailed:false},{visualRealism:'realistic',highContrast:false,sceneDetail:false,detailed:false}]){
  const{detailed,...presentation}=mode;await update(page,presentation);const canvas=await pose(page,'cerebral_g',500,600,'dorsal',3);const d=await selectActual(page,canvas,'cerebral_g');expectNeural(d,detailed,mode.visualRealism==='accessible'?.88:.72);await expectClear(canvas,'cerebral_g');await expectNativePreserved(page);
 }
 await page.evaluate(()=>{const meta=document.querySelector('meta[name="viewport"]')||document.head.appendChild(document.createElement('meta'));meta.setAttribute('name','viewport');meta.setAttribute('content','width=device-width, initial-scale=1');(document.querySelector('#wrap')as HTMLElement).style.cssText='width:100%;max-width:1180px';});await page.setViewportSize({width:390,height:844});const device=await page.context().newCDPSession(page);
 try{await device.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:2});expect(await page.evaluate(()=>devicePixelRatio)).toBe(2);await update(page,{visualRealism:'realistic',highContrast:false,sceneDetail:true,largeText:true});
  let canvas=await ready(page);for(const width of[null,333.25]){if(width){await canvas.evaluate((n:any,width)=>{n.style.width=width+'px';n.style.maxWidth=width+'px';n._dpr=0;n._drawDissectionNow();},width);await ready(page);expect(await canvas.evaluate((n:any)=>Math.max(Math.abs(n.width-n._logicalW*n._dpr),Math.abs(n.height-n._logicalH*n._dpr)))).toBeGreaterThan(.01);}
   for(const id of['cerebral_g','ventral_cord','segmental_g']){canvas=await pose(page,id,500,600,'dorsal',id==='cerebral_g'?4:3);const d=await selectActual(page,canvas,id);expectNeural(d,true);const layout=await expectClear(canvas,id,true),field=await canvas.boundingBox();expect(field).not.toBeNull();const x=field.x+layout.card.x+layout.card.width/2,y=field.y+layout.card.y+layout.card.height/2;await page.mouse.move(x,y);const names:any={cerebral_g:'Cerebral Ganglia',ventral_cord:'Ventral Nerve Cord',segmental_g:'Segmental Ganglia'};await expect(page.locator('#diss-canvas-status')).toContainText('Selected '+names[id]+' in the Nervous System layer.');await page.mouse.click(x,y);await expect.poll(()=>canvas.evaluate((n:any)=>n._drawD.selectedOrgan)).toBeNull();await selectActual(page,canvas,id);await expectNativePreserved(page);}
  }
 }finally{await device.detach();}
});







