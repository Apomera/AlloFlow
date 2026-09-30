'use strict';
// Guide layout, native keyboard controls, and actual journey semantics in an owned browser.
// Run from the repository: node dev-tools/watercycle_handoff_guide_qa.cjs [--baseline]
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reports/watercycle-handoff-guide');
const BASELINE = process.argv.includes('--baseline');
const SOURCE_PATH = path.join(ROOT, 'stem_lab/stem_tool_watercycle.js');
const MIRROR_PATH = path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const source = BASELINE ? (() => {
  const run = spawnSync('git', ['show', 'd1095faae:stem_lab/stem_tool_watercycle.js'], { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
  assert.equal(run.status, 0, String(run.stderr));
  return run.stdout;
})() : fs.readFileSync(SOURCE_PATH);
const resultPath = path.join(OUT, 'results.json');
const saved = fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, 'utf8')) : {};
const beforeMobilePath=path.join(OUT,'results-before-mobile-dock.json');
const beforeMobile=fs.existsSync(beforeMobilePath)?JSON.parse(fs.readFileSync(beforeMobilePath,'utf8')):{};
const report = {
  title: 'Water Cycle handoff guide clarity and keyboard browser checks',
  startedAt: new Date().toISOString(),
  method: 'Frozen runtime served by an owned ephemeral server; native process controls and keyboard events, real React journey/view fixtures, DOM geometry, expanded-label DOM layout stress, and guide-scoped axe audits in isolated Chromium.',
  sourceSha256: digest(source), sourceMirrorSha256: digest(fs.readFileSync(MIRROR_PATH)),
  baselineSourceSha256: BASELINE ? digest(source) : saved.baselineSourceSha256,
  baselineCommit: 'd1095faae', baselineCapture: 'before-root-uptake-light-320.png',
  beforeMobileDockSourceSha256:beforeMobile.sourceSha256,
  beforeMobileDockCapture:'before-mobile-dock-root-uptake-3d-light-320.png',
  checks: [], cases: [], audits: [], errors: [], failures: [], browserClosed: false, serverClosed: false,
};
function check(pass, label, detail) {
  report.checks.push({ label, pass: !!pass, ...(detail === undefined ? {} : { detail }) });
  if (!pass) report.failures.push(label);
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Water Cycle handoff guide QA</title><link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css"><style>body{margin:0;font-family:system-ui;background:#eef2f2}main{padding:12px;max-width:1500px;margin:auto}</style></head><body><main id="slot"></main><script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/vendor/three-r128/three.min.js"></script><script src="/vendor/three-r128/OrbitControls.js"></script><script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script><script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
const theme=new URLSearchParams(location.search).get('theme')||'light';
function translate(k,f){return f==null?k:f;}
function Host(){const [data,setData]=React.useState({waterCycle:{wcMode:'explore',wcSection:'explore',journeyView:'2d',journeyPaused:true,wc2dPaused:true,activeStage:'evaporation'},_threeLoaded:true});window.guideData=data.waterCycle;window.guideSet=setData;const noop=()=>{};return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:theme==='dark',isContrast:theme==='contrast',gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:noop,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:translate,props:{},srOnly:{},callGemini:null});}
window.patchGuide=patch=>guideSet(previous=>({...previous,waterCycle:{...previous.waterCycle,...patch}}));
document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.classList.toggle('high-contrast',theme==='contrast');document.body.style.background=theme==='dark'?'#081b21':'#eef2f2';ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
</script></body></html>`;
const types = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(html); }
  if (url.pathname === '/stem_lab/stem_tool_watercycle.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(source); }
  const file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, bytes) => { res.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(error ? 'Not found' : bytes); });
});
const stages = [
  { id:'evaporation', name:'Evaporation', from:'Liquid water', to:'Water vapor', storeFrom:'Ocean or surface water', storeTo:'Atmospheric vapor', energy:'Latent heat absorbed' },
  { id:'condensation', name:'Condensation', from:'Water vapor', to:'Liquid droplets or ice', storeFrom:'Atmospheric vapor', storeTo:'Cloud droplets or ice', energy:'Latent heat released' },
  { id:'precipitation', name:'Precipitation', from:'Cloud water or ice', to:'Falling liquid or solid water', storeFrom:'Cloud water or ice', storeTo:'Land or ocean', energy:'No required phase change' },
  { id:'collection', name:'Collection', from:'Liquid or solid water', to:'Stored liquid water or ice', storeFrom:'Runoff, rivers, rain, or groundwater discharge', storeTo:'Surface water storage', energy:'No required phase change' },
  { id:'transpiration', name:'Transpiration', from:'Liquid plant water', to:'Water vapor', storeFrom:'Plant xylem', storeTo:'Atmospheric vapor', energy:'Latent heat absorbed' },
  { id:'infiltration', name:'Infiltration', from:'Liquid surface water', to:'Liquid soil pore water', storeFrom:'Surface water', storeTo:'Soil pore water', energy:'No required phase change' },
];
const journeys = [
  { state:'plant_absorb', stage:'transpiration', name:'Plant uptake', from:'Liquid soil water', to:'Liquid plant water', storeFrom:'Soil water', storeTo:'Plant xylem', energy:'No required phase change' },
  { state:'transpiring', stage:'transpiration', name:'Transpiration', from:'Liquid plant water', to:'Water vapor', storeFrom:'Plant xylem', storeTo:'Atmospheric vapor', energy:'Latent heat absorbed' },
  { state:'aquifer_flow', stage:'infiltration', name:'Aquifer flow', from:'Liquid groundwater', to:'Liquid surface water', storeFrom:'Groundwater', storeTo:'Surface water or ocean discharge', energy:'No required phase change' },
];
async function metrics(page) {
  return page.evaluate(() => {
    const guide = document.getElementById('wcCanvasGuideDescription');
    const driver = document.getElementById('wcCanvas');
    const canvas = window.guideData.journeyView==='3d' ? document.getElementById('wcJourney3d') : driver;
    const handoff = guide.querySelector('.wc-canvas-guide-handoff');
    const rect = el => { if (!el) return null; const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}; };
    const inspect = el => { if(!el)return null; const s=getComputedStyle(el); return {text:el.innerText,rect:rect(el),order:s.order,font:s.fontSize,lineHeight:s.lineHeight,whiteSpace:s.whiteSpace,overflow:s.overflow,textOverflow:s.textOverflow,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,color:s.color,background:s.backgroundColor}; };
    const guideRect = rect(guide);
    const energyNode=handoff.querySelector('.wc-canvas-guide-handoff-energy');
    const energy=inspect(energyNode);
    const energyCopy=energyNode.cloneNode(true);energyCopy.querySelectorAll('[aria-hidden="true"]').forEach(node=>node.remove());energy.labelText=energyCopy.textContent.trim();
    const from=handoff.querySelector('.wc-canvas-guide-handoff-from');
    const to=handoff.querySelector('.wc-canvas-guide-handoff-to');
    const flow=handoff.querySelector('.wc-canvas-guide-water-flow');
    const arrows=[...handoff.querySelectorAll('.wc-canvas-guide-handoff-arrow')];
    const overflow=[...guide.querySelectorAll('*')].filter(el=>{const r=rect(el);return r.w&&(r.x<guideRect.x-1||r.right>guideRect.right+1||el.scrollWidth>el.clientWidth+1&&getComputedStyle(el).overflow!=='visible');}).map(el=>({class:el.className,text:el.innerText,rect:rect(el),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
    return {
      text:guide.innerText,copy:guide.querySelector('.wc-canvas-guide-copy').innerText,process:inspect(handoff.querySelector('.wc-canvas-guide-handoff-process')),handoff:inspect(handoff),flow:inspect(flow),from:inspect(from),to:inspect(to),fromStore:inspect(from&&from.querySelector('.wc-canvas-guide-store')),toStore:inspect(to&&to.querySelector('.wc-canvas-guide-store')),fromPhase:inspect(from&&from.querySelector('.wc-canvas-guide-phase')),toPhase:inspect(to&&to.querySelector('.wc-canvas-guide-phase')),energy,arrows:arrows.map(el=>({...inspect(el),hidden:el.getAttribute('aria-hidden')})),handoffOrder:[...handoff.children].map(el=>el.className),flowOrder:flow?[...flow.children].map(el=>el.className):[],guideRect,overflow,
      sceneTitle:document.querySelector('.wc-canvas-title strong').innerText,phaseFrom:canvas.dataset.waterPhaseFrom,phaseTo:canvas.dataset.waterPhaseTo,energyTransfer:canvas.dataset.energyTransfer,activeStage:canvas.dataset.activeStage,journeyState:canvas.dataset.journeyState,progress:Number(driver.dataset.journeyProgress||0),paused:driver.dataset.wc2dPaused,pendingFrame:!!driver._wcAnim,view:guideData.journeyView,guideAssociation:canvas.getAttribute('aria-describedby'),associationTargets:(canvas.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean).map(id=>({id,exists:!!document.getElementById(id)})),canvasAria:canvas.getAttribute('aria-label'),vaporGuidance:guide.querySelector('[data-vapor-guidance]').dataset.vaporGuidance,viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,state:{...guideData},camera:document.querySelector('.wc-scene-lens-mode')&&document.querySelector('.wc-scene-lens-mode').innerText,
    };
  });
}
function assess(m, fixture, label) {
  report.cases.push({label,...m});
  check(m.process&&m.process.text===fixture.name,label+' identifies the actual process',m.process);
  check(m.sceneTitle===fixture.name,label+' scene and guide process agree',m.sceneTitle);
  check(m.fromPhase&&m.fromPhase.text===fixture.from&&m.phaseFrom===fixture.from,label+' starting phase matches model state',{guide:m.fromPhase,model:m.phaseFrom});
  check(m.toPhase&&m.toPhase.text===fixture.to&&m.phaseTo===fixture.to,label+' destination phase matches model state',{guide:m.toPhase,model:m.phaseTo});
  check(m.fromStore&&m.fromStore.text.startsWith('From')&&m.fromStore.text.includes(fixture.storeFrom),label+' source store is explicitly named',m.fromStore);
  check(m.toStore&&m.toStore.text.startsWith('To')&&m.toStore.text.includes(fixture.storeTo),label+' destination store is explicitly named',m.toStore);
  check(m.energy&&m.energy.labelText===fixture.energy,label+' energy cue explains the selected transfer',m.energy);
  check(m.handoffOrder.join('|')==='wc-canvas-guide-handoff-process|wc-canvas-guide-water-flow|wc-canvas-guide-handoff-energy',label+' reading order is process then water flow then energy',m.handoffOrder);
  check(m.flowOrder.join('|')==='wc-canvas-guide-handoff-from|wc-canvas-guide-handoff-arrow|wc-canvas-guide-handoff-to',label+' water reads from source to destination',m.flowOrder);
  check(m.arrows.length===1&&m.arrows[0].hidden==='true',label+' handoff has one decorative direction arrow',m.arrows);
  check(m.flow&&m.process.rect.bottom<=m.flow.rect.y+1&&(m.energy.rect.y>=m.flow.rect.bottom-1||m.energy.rect.x>=m.flow.rect.right-1),label+' process precedes flow and energy is a separate region',{process:m.process,flow:m.flow,energy:m.energy});
  check(m.from&&m.to&&m.from.rect.right<=m.to.rect.x+1&&m.arrows[0].rect.x>=m.from.rect.right-1&&m.arrows[0].rect.right<=m.to.rect.x+1,label+' source and destination remain left to right',{from:m.from,to:m.to,arrows:m.arrows});
  check(m.fromPhase&&m.toPhase&&parseFloat(m.fromPhase.font)>=12&&parseFloat(m.toPhase.font)>=12,label+' water phase text stays readable', {from:m.fromPhase&&m.fromPhase.font,to:m.toPhase&&m.toPhase.font});
  check(m.overflow.length===0&&m.scrollWidth<=m.viewportWidth,label+' guide content fits without clipping or horizontal page scroll',m.overflow);
  check([m.process,m.fromStore,m.toStore,m.fromPhase,m.toPhase,m.energy].every(el=>el&&el.whiteSpace!=='nowrap'&&el.overflow==='visible'),label+' process store phase and energy text can wrap');
  check(m.associationTargets.length>0&&m.associationTargets.every(target=>target.exists)&&(m.view==='3d'?m.guideAssociation.includes('wcMatterEnergySummary'):m.guideAssociation.includes('wcCanvasGuideDescription')),label+' active canvas description references resolve',m.associationTargets);
  check(m.canvasAria&&(m.view==='3d'?m.canvasAria.includes(fixture.storeFrom)&&m.canvasAria.includes(fixture.storeTo):m.canvasAria.includes(fixture.name)),label+' active canvas text names the current transfer',m.canvasAria);
}
async function patch(page, fields) {
  await page.evaluate(fields=>window.patchGuide(fields), fields);
  await page.waitForTimeout(140);
}
async function capture(page,name,withScene=false) {
  if(withScene) {
    await page.evaluate(()=>scrollTo(0,0));
    const clip=await page.evaluate(()=>{const a=document.querySelector('.wc-canvas-shell').getBoundingClientRect(),b=document.getElementById('wcCanvasGuideDescription').getBoundingClientRect();return{x:a.x,y:a.y,width:a.width,height:b.bottom-a.y};});
    await page.screenshot({path:path.join(OUT,name),clip,fullPage:true,animations:'disabled',timeout:60000});
    const bytes=fs.readFileSync(path.join(OUT,name));
    check(bytes.readUInt32BE(20)>=Math.floor(clip.height)-1,'Capture '+name+' includes the intended scene and guide',{captureHeight:bytes.readUInt32BE(20),intendedHeight:clip.height});
  } else await page.locator('#wcCanvasGuideDescription').screenshot({path:path.join(OUT,name),animations:'disabled',timeout:60000});
}
async function longText(page,label) {
  const replacement=await page.evaluate(()=>{
    const guide=document.getElementById('wcCanvasGuideDescription');
    const text={
      '.wc-canvas-guide-handoff-process':'Transport des Wassers durch die Pflanzenwurzeln und Leitgefäße',
      '.wc-canvas-guide-handoff-from .wc-canvas-guide-store':'Ausgangspunkt · Gespeichertes Wasser in den Zwischenräumen des ungesättigten Bodens',
      '.wc-canvas-guide-handoff-to .wc-canvas-guide-store':'Zielbereich · Wasser in den pflanzlichen Leitgefäßen und im Blattgewebe',
      '.wc-canvas-guide-handoff-from .wc-canvas-guide-phase':'Flüssiges Wasser in den Bodenporenzwischenräumen',
      '.wc-canvas-guide-handoff-to .wc-canvas-guide-phase':'Flüssiges Wasser in den pflanzlichen Wasserleitungsbahnen',
      '.wc-canvas-guide-handoff-energy':'Bei dieser Wasserübertragung ist keine Änderung des Aggregatzustands erforderlich',
    };
    window.guideOriginalText={};
    for(const [selector,value]of Object.entries(text)){const node=guide.querySelector(selector);if(node){window.guideOriginalText[selector]=node.innerHTML;node.textContent=value;}}
    return text;
  });
  const m=await metrics(page);report.cases.push({label,fixture:'DOM text replacement to stress expanded translated labels; model state unchanged',...m});
  check(m.overflow.length===0&&m.scrollWidth<=m.viewportWidth,label+' expanded translated text fits without clipping',m.overflow);
  check(m.process&&m.flow&&m.energy&&m.process.rect.bottom<=m.flow.rect.y+1&&(m.energy.rect.y>=m.flow.rect.bottom-1||m.energy.rect.x>=m.flow.rect.right-1),label+' expanded process precedes flow and energy remains separate',{process:m.process,flow:m.flow,energy:m.energy});
  check(m.from&&m.to&&m.from.rect.right<=m.to.rect.x+1,label+' expanded translated phase cards preserve direction',{from:m.from,to:m.to});
  check(Object.entries(replacement).every(([selector,text])=>{const current={'.wc-canvas-guide-handoff-process':m.process,'.wc-canvas-guide-handoff-from .wc-canvas-guide-store':m.fromStore,'.wc-canvas-guide-handoff-to .wc-canvas-guide-store':m.toStore,'.wc-canvas-guide-handoff-from .wc-canvas-guide-phase':m.fromPhase,'.wc-canvas-guide-handoff-to .wc-canvas-guide-phase':m.toPhase,'.wc-canvas-guide-handoff-energy':m.energy}[selector];return current&&current.text===text;}),label+' expanded translated strings remain complete');
  await capture(page,'expanded-text-'+label+'.png');
  await page.evaluate(()=>{const guide=document.getElementById('wcCanvasGuideDescription');for(const [selector,html]of Object.entries(window.guideOriginalText)){guide.querySelector(selector).innerHTML=html;}delete window.guideOriginalText;});
}
async function mobileSceneMetrics(page) {
  return page.evaluate(()=>{
    const shell=document.querySelector('.wc-canvas-shell');
    const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
    const dock=shell.querySelector('.wc-viewport-dock'),scene=shell.querySelector('#wcJourney3d'),choice=shell.querySelector('.wc-viewport-choice');
    const info=el=>el?{rect:rect(el),position:getComputedStyle(el).position,overflowX:getComputedStyle(el).overflowX,overflowY:getComputedStyle(el).overflowY}:null;
    const buttons=[...dock.querySelectorAll('button')].map(el=>({label:el.getAttribute('aria-label'),disabled:el.disabled,rect:rect(el)}));
    const cards=choice?[...choice.querySelectorAll('.wc-route-choice-card')].map(el=>({route:el.dataset.routeChoice,text:el.innerText,rect:rect(el),disabled:el.disabled})):[];
    const heading=shell.querySelector('.wc-canvas-title strong'),lens=shell.querySelector('.wc-scene-lens');
    return{shell:info(shell),scene:info(scene),dock:info(dock),choice:info(choice),heading:heading?{text:heading.innerText,...info(heading)}:null,lens:info(lens),buttons,cards,shellView:shell.dataset.watercycleView,viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,fullscreen:document.fullscreenElement===shell,journeyState:guideData.journeyState};
  });
}
function assessMobileScene(m,label,groundChoice=false) {
  report.cases.push({label,...m});
  check(m.shellView==='3d',label+' shell explicitly identifies the 3D view',m.shellView);
  check(m.scene.rect.h>=360,label+' scene retains at least 360px height',m.scene.rect);
  const overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
  check(m.heading&&m.heading.rect.w>0&&m.heading.rect.h>0&&m.lens&&!overlap(m.heading.rect,m.lens.rect),label+' actual process heading remains clear of the scene lens',{heading:m.heading,lens:m.lens});
  check(m.scene.position==='relative'&&m.dock.position!=='absolute',label+' mobile scene and controls use normal flow',{scene:m.scene,dock:m.dock});
  check(m.dock.rect.y>=m.scene.rect.bottom-1,label+' camera dock sits below the visible scene',{scene:m.scene.rect,dock:m.dock.rect});
  check(m.dock.rect.x>=m.shell.rect.x-1&&m.dock.rect.right<=m.shell.rect.right+1&&m.dock.rect.bottom<=m.shell.rect.bottom+1,label+' camera dock stays within the scene shell',{shell:m.shell.rect,dock:m.dock.rect});
  const labels=['Rotate scene left','Rotate scene right','Zoom in','Zoom out','Follow the droplet with the guided camera'];
  const cameras=m.buttons.filter(button=>labels.includes(button.label));
  check(cameras.length===labels.length,label+' all five camera controls remain available',cameras);
  check(cameras.every(button=>button.rect.w>=44&&button.rect.h>=44&&!button.disabled),label+' every camera target is enabled and at least 44px',cameras);
  check(m.buttons.every(button=>button.rect.x>=m.dock.rect.x-1&&button.rect.right<=m.dock.rect.right+1&&button.rect.y>=m.dock.rect.y-1&&button.rect.bottom<=m.dock.rect.bottom+1),label+' dock controls fit inside the dock',m.buttons);
  check(m.scrollWidth<=m.viewportWidth,label+' mobile 3D layout has no horizontal page scroll',{scrollWidth:m.scrollWidth,viewportWidth:m.viewportWidth});
  if(groundChoice) {
    check(m.journeyState==='ground_choice'&&m.choice&&m.cards.length===3,label+' all three native route choices are present',m.cards);
    check(m.choice&&m.choice.position!=='absolute'&&m.choice.rect.y>=m.scene.rect.bottom-1,label+' route choices sit below the scene',{scene:m.scene,choice:m.choice});
    check(m.choice&&m.cards.every(card=>!overlap(card.rect,m.scene.rect)&&!overlap(card.rect,m.dock.rect)),label+' route cards overlap neither scene nor camera dock',m.cards);
    check(m.choice&&m.cards.every(card=>card.rect.x>=m.choice.rect.x-1&&card.rect.right<=m.choice.rect.right+1&&card.rect.h>=44),label+' route cards fit their container and keep 44px targets',m.cards);
  } else check(!m.choice&&m.cards.length===0,label+' route chooser remains conditional to the land decision');
}
async function mobileDockChecks(page,prefix) {
  assessMobileScene(await mobileSceneMetrics(page),prefix+' root-uptake mobile 3D');
  if(prefix==='forced-colors-320')await page.locator('.wc-viewport-dock').screenshot({path:path.join(OUT,'dock-forced-colors-320.png'),animations:'disabled',timeout:60000});
  const cameraLabels=['Rotate scene left','Rotate scene right','Zoom in','Zoom out','Follow the droplet with the guided camera'];
  await page.locator('#wcJourney3d').focus();await page.keyboard.press('Tab');
  for(const label of cameraLabels) {
    const camera=page.locator('.wc-viewport-dock button[aria-label="'+label+'"]');
    await camera.scrollIntoViewIfNeeded();await camera.focus();
    const reach=await camera.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{active:document.activeElement===el,focusVisible:el.matches(':focus-visible'),outline:s.outlineStyle,width:s.outlineWidth,shadow:s.boxShadow,inViewport:r.y>=0&&r.bottom<=innerHeight,uncovered:top===el||el.contains(top),rect:{x:r.x,y:r.y,w:r.width,h:r.height}};});
    check(reach.active&&reach.focusVisible&&(parseFloat(reach.width)>=2&&reach.outline!=='none'||reach.shadow!=='none'),prefix+' '+label+' has visible keyboard focus',reach);
    check(reach.inViewport&&reach.uncovered,prefix+' '+label+' remains scroll reachable and uncovered',reach);
  }
  const dockViolations=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('.wc-viewport-dock'),{rules:{region:{enabled:false}}});return result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}));});
  report.audits.push({label:prefix+' mobile 3D dock',violations:dockViolations});check(dockViolations.length===0,prefix+' mobile 3D dock accessibility audit',dockViolations);
  await patch(page,{journeyActive:true,journeyPaused:true,journeyState:'ground_choice',activeStage:'collection'});
  assessMobileScene(await mobileSceneMetrics(page),prefix+' ground-choice mobile 3D',true);
  const firstRoute=page.locator('.wc-viewport-choice button[data-route-choice="runoff"]');
  await firstRoute.scrollIntoViewIfNeeded();await firstRoute.focus();
  const routeFocus=await firstRoute.evaluate(el=>{const s=getComputedStyle(el);return{visible:el.matches(':focus-visible'),outline:s.outlineStyle,width:s.outlineWidth,shadow:s.boxShadow};});
  check(routeFocus.visible&&(parseFloat(routeFocus.width)>=2&&routeFocus.outline!=='none'||routeFocus.shadow!=='none'),prefix+' route choice has visible keyboard focus',routeFocus);
  await capture(page,'ground-choice-3d-'+prefix+'.png',true);
  // Native and fallback fullscreen behavior is covered by the separate camera harness.
}
async function main() {
  fs.mkdirSync(OUT,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const configs=BASELINE?[{theme:'light',width:320}]:[{theme:'light',width:1280},{theme:'light',width:320},{theme:'dark',width:320},{theme:'contrast',width:320},{theme:'contrast',width:320,forced:true}];
    for(const config of configs) {
      const context=await browser.newContext({viewport:{width:config.width,height:1800},reducedMotion:'reduce',...(config.forced?{forcedColors:'active'}:{})});
      const page=await context.newPage();page.setDefaultTimeout(30000);
      page.on('pageerror',error=>report.errors.push(String(error)));
      await page.goto('http://127.0.0.1:'+server.address().port+'/?theme='+config.theme);
      await page.locator('#wcCanvas').waitFor();await page.waitForTimeout(200);
      const prefix=(config.forced?'forced-colors':config.theme)+'-'+config.width;
      if(BASELINE) {
        await patch(page,{journeyActive:true,journeyPaused:true,journeyState:'plant_absorb',activeStage:'transpiration'});
        report.cases.push({label:'baseline root uptake phone guide',...await metrics(page)});
        await capture(page,'before-root-uptake-light-320.png',true);
        console.log('Baseline root uptake captured from '+report.sourceSha256);
        await context.close();continue;
      }
      for(const [index,fixture]of stages.entries()) {
        await page.locator('button[aria-label^="Stage '+(index+1)+':"]').click();
        const m=await metrics(page);assess(m,fixture,prefix+' standalone '+fixture.id);
        check(m.activeStage===fixture.id,prefix+' native control selects '+fixture.id,m.activeStage);
        check(m.paused==='true'&&!m.pendingFrame,prefix+' '+fixture.id+' stays paused with no animation loop');
        if(fixture.id==='precipitation'&&config.width===320||fixture.id==='evaporation'&&config.width===1280)await capture(page,fixture.id+'-'+prefix+'.png',true);
      }
      for(const fixture of journeys) {
        await patch(page,{journeyActive:true,journeyPaused:true,journeyState:fixture.state,activeStage:fixture.stage});
        const m=await metrics(page);assess(m,fixture,prefix+' journey '+fixture.state);
        if(fixture.state==='plant_absorb') {
          check(m.vaporGuidance==='not-applicable'&&!m.text.includes('Water vapor is invisible'),prefix+' root uptake stays liquid through the guide',m.text);
          if(config.theme==='light')await capture(page,'root-uptake-'+prefix+'.png',true);
        }
        if(fixture.state==='transpiring')check(m.vaporGuidance==='visible'&&m.text.includes('Water vapor is invisible'),prefix+' actual transpiration explains invisible vapor',m.vaporGuidance);
        if(fixture.state==='aquifer_flow')check(m.energyTransfer==='none',prefix+' aquifer flow avoids a phase-change claim',m.energyTransfer);
      }
      await patch(page,{journeyActive:true,journeyPaused:false,journeyState:'plant_absorb',activeStage:'transpiration',wc2dPaused:true});
      const before=await metrics(page);
      await page.locator('#wcCanvas').focus();await page.keyboard.press('Space');await page.waitForTimeout(160);
      const active=await metrics(page);
      check(active.paused==='false'&&!active.copy.includes('Animation paused'),prefix+' native Space resumes the diagram and updates guide',active.copy);
      await page.keyboard.press('Enter');await page.waitForTimeout(160);
      const paused=await metrics(page);await page.waitForTimeout(300);const stable=await metrics(page);
      check(paused.paused==='true'&&stable.paused==='true'&&!stable.pendingFrame,prefix+' native Enter pauses the diagram and animation loop');
      check(paused.copy.includes('Paused')||paused.copy.includes('paused'),prefix+' paused guidance explicitly names playback state',paused.copy);
      check(!/repaint|frame|control changes/i.test(paused.copy),prefix+' paused guidance uses learner wording',paused.copy);
      check(paused.progress===stable.progress&&paused.journeyState===stable.journeyState&&paused.journeyState===before.journeyState,prefix+' keyboard pause preserves the current journey',{before,paused:paused.progress,stable:stable.progress});
      await page.locator('.wc-2d-playback').focus();
      const focus=await page.locator('.wc-2d-playback').evaluate(el=>{const s=getComputedStyle(el);return{visible:el.matches(':focus-visible'),outline:s.outlineStyle,width:s.outlineWidth,shadow:s.boxShadow,height:el.getBoundingClientRect().height};});
      check(focus.visible&&(parseFloat(focus.width)>=2&&focus.outline!=='none'||focus.shadow!=='none'),prefix+' native playback has visible keyboard focus',focus);
      check(focus.height>=44,prefix+' native playback target reaches 44px',focus.height);
      await page.addScriptTag({url:'/desktop/web-app/node_modules/axe-core/axe.min.js'});
      const violations=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('.wc-canvas-guide'),{rules:{region:{enabled:false}}});return result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({html:n.html,summary:n.failureSummary}))}));});
      report.audits.push({label:prefix+' handoff guide',violations});check(violations.length===0,prefix+' guide-scoped accessibility audit',violations);
      await longText(page,prefix);
      // A real React view fixture confirms the same water handoff remains visible in the 3D scene.
      await patch(page,{journeyView:'3d',journeyActive:true,journeyPaused:true,journeyState:'plant_absorb',activeStage:'transpiration'});
      await page.locator('#wcJourney3d').waitFor();await page.waitForTimeout(200);
      assess(await metrics(page),journeys[0],prefix+' 3D root uptake');
      if(config.theme==='light'&&config.width===320)await capture(page,'root-uptake-3d-light-320.png',true);
      if(config.width===320)await mobileDockChecks(page,prefix);
      await page.evaluate(()=>ReactDOM.unmountComponentAtNode(document.getElementById('slot')));
      await context.close();console.log('Checked '+prefix);
    }
    check(report.errors.length===0,'No browser runtime errors',report.errors);
    if(!BASELINE) {
      report.finalSourceSha256=digest(fs.readFileSync(SOURCE_PATH));report.finalMirrorSha256=digest(fs.readFileSync(MIRROR_PATH));
      check(report.sourceSha256===report.finalSourceSha256,'Frozen browser source stayed unchanged during guide QA');
      check(report.sourceSha256===report.finalMirrorSha256,'Source and desktop public mirror match tested guide runtime');
    }
  } finally {
    await browser.close();report.browserClosed=true;
    await new Promise(resolve=>server.close(resolve));report.serverClosed=true;
    report.finishedAt=new Date().toISOString();report.passed=report.checks.filter(c=>c.pass).length;report.failed=report.checks.length-report.passed;
    fs.writeFileSync(resultPath,JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify({sourceSha256:report.sourceSha256,checks:report.checks.length,cases:report.cases.length,audits:report.audits.length,failures:report.failures,errors:report.errors,browserClosed:report.browserClosed,serverClosed:report.serverClosed},null,2));
  assert.deepEqual(report.failures,[]);assert.deepEqual(report.errors,[]);
}
main().catch(error=>{console.error(error);process.exitCode=1;server.close();});
