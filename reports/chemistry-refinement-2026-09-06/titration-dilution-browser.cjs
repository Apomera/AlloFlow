const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/chemistry-refinement-2026-09-06');
(async()=>{const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report={checks:[],errors:[],scans:[]};
try{const page=await browser.newPage({viewport:{width:1200,height:1100},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));
await page.route('**/*',r=>r.request().url()==='http://127.0.0.1:7777/titration'?r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Titration bench QA</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#071422"><main id="root"></main></body></html>'}):r.abort());
await page.goto('http://127.0.0.1:7777/titration');
for(const p of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js','stem_lab/stem_lab_module.js','app_styles_module.js','stem_lab/stem_tool_titration.js'])await page.addScriptTag({path:path.join(root,p)});
const cssDir=path.join(root,'app/static/css');await page.addStyleTag({path:path.join(cssDir,fs.readdirSync(cssDir).find(f=>/^main\..*\.css$/.test(f)))});
await page.evaluate(()=>{const noop=()=>{};const ctx={React,icons:new Proxy({},{get:()=>()=>null}),gradeLevel:'10',t:(k,f)=>f||k,addToast:noop,announceToSR:noop,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,awardXP:noop,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:()=>'',toolSnapshots:[],a11yClick:fn=>({onClick:fn}),srOnly:{position:'absolute',width:1,height:1,overflow:'hidden'},callGemini:null,callTTS:null};
function App(){const [toolData,setToolData]=React.useState({titrationLab:{safetyChecked:true,labTab:'molarity',presetId:'sa_sb',volumeAdded:0,molarityC1:1,molarityC2:0.1,molarityV1:100}});window.qaState=toolData;window.qaUpdate=patch=>setToolData(prev=>({titrationLab:{...prev.titrationLab,...patch}}));const updateMulti=(id,patch)=>setToolData(prev=>({...prev,[id]:{...prev[id],...patch}}));return React.createElement(React.Fragment,null,React.createElement(AlloModules.AppStyles.AppStyles),StemLab._registry.titrationLab.render({...ctx,toolData,setToolData,updateMulti,update:(id,key,value)=>updateMulti(id,{[key]:value})}));}
window.qaRoot=ReactDOM.createRoot(document.getElementById('root'));qaRoot.render(React.createElement(App));});
const panel=page.locator('[data-titration-dilution]'),stage=panel.locator('.titr-dilution-stage');
async function reveal(){await stage.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('.titr-dilution-stage')?.__dilutionViewer?.debug().state==='ready');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
const state=()=>stage.evaluate(el=>el.__dilutionViewer.debug());
await reveal();assert.equal((await state()).fraction,0.1);assert.equal((await state()).stockMl,10);assert.equal((await state()).finalMl,100);
const front=await stage.screenshot();await stage.focus();await page.keyboard.press('ArrowRight');const rotated=await stage.screenshot();assert.notDeepEqual(front,rotated);
await panel.getByRole('button',{name:'Reset view',exact:true}).click();await reveal();
await panel.getByRole('button',{name:'Solute markers',exact:true}).click();await reveal();await page.waitForFunction(()=>document.querySelector('.titr-dilution-stage').__dilutionViewer.debug().markers===false);
await panel.getByRole('button',{name:'Solute markers',exact:true}).click();await reveal();
report.checks.push('Real WebGL shows the correct stock fraction; keyboard orbit changes the image; marker visibility is controllable.');
await page.getByRole('slider',{name:'Target concentration',exact:true}).focus();await page.keyboard.press('ArrowRight');await reveal();await page.waitForFunction(()=>Math.abs(document.querySelector('.titr-dilution-stage').__dilutionViewer.debug().fraction-0.101)<1e-8);
assert.equal(await page.evaluate(()=>qaState.titrationLab.molarityC2),0.101);
await page.evaluate(()=>qaUpdate({molarityC2:0.5,molarityV1:200}));await reveal();await page.waitForFunction(()=>document.querySelector('.titr-dilution-stage').__dilutionViewer.debug().stockMl===100);
assert.equal((await state()).fraction,0.5);assert((await panel.textContent()).includes('1.00e-1 mol'));

await panel.getByRole('button',{name:'2D comparison',exact:true}).click();assert.equal(await page.locator('[data-titration-dilution-gl]').count(),0);assert.equal(await panel.locator('.titr-dilution-dot').count(),36);
assert.deepEqual(await panel.locator('.titr-dilution-fill').evaluateAll(nodes=>nodes.map(n=>n.style.height)),['42.5%','85%']);
await panel.getByRole('button',{name:'Solute markers',exact:true}).click();assert.equal(await panel.locator('.titr-dilution-dot').count(),0);await panel.getByRole('button',{name:'Solute markers',exact:true}).click();
await panel.getByRole('button',{name:'3D vessels',exact:true}).click();await reveal();assert.equal((await state()).stockMl,100);
report.checks.push('The real target slider updates 3D; final-volume changes retain conservation; 2D levels use the same ratio and switching views preserves calculator data.');
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
for(const width of [1200,360,320]){await page.setViewportSize({width,height:1100});for(const view of ['3D vessels','2D comparison']){
 await panel.getByRole('button',{name:view,exact:true}).click();if(view==='3D vessels')await reveal();
 const scan=await page.evaluate(async()=>{const a=await axe.run({include:['[data-titration-dilution]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}),p=document.querySelector('[data-titration-dilution]');return {overflow:p.scrollWidth>p.clientWidth,violations:a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))};});report.scans.push({width,view,...scan});assert.equal(scan.overflow,false);assert.deepEqual(scan.violations,[]);
}}
await panel.getByRole('button',{name:'3D vessels',exact:true}).click();await reveal();
await page.evaluate(()=>qaUpdate({molarityC1:18,molarityC2:0.001,molarityV1:1000}));await reveal();await page.waitForFunction(()=>Math.abs(document.querySelector('.titr-dilution-stage').__dilutionViewer.debug().fraction-0.001/18)<1e-10);assert(Number.isFinite((await state()).stockMl));
await page.evaluate(()=>qaUpdate({molarityC1:1,molarityC2:1,molarityV1:100}));await reveal();await page.waitForFunction(()=>document.querySelector('.titr-dilution-stage').__dilutionViewer.debug().fraction===1);
await stage.evaluate(el=>el.querySelector('canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await panel.getByText('3D is unavailable. The 2D comparison and calculator remain available.',{exact:true}).waitFor();assert.equal(await panel.locator('.titr-dilution-diagram').count(),1);
report.checks.push('All calculator extremes stay finite, equal concentrations produce equal fill heights, and context loss exposes the 2D comparison.');
await page.evaluate(()=>qaUpdate({labTab:'buffers'}));assert.equal(await page.locator('[data-titration-dilution-gl]').count(),0);await page.evaluate(()=>qaUpdate({labTab:'molarity'}));await reveal();assert.equal((await state()).fraction,1);
// Capture tall panels after interaction assertions: screenshots temporarily resize the viewport.
await page.evaluate(()=>qaUpdate({molarityC1:1,molarityC2:0.5,molarityV1:200}));await page.setViewportSize({width:1200,height:1100});await reveal();await page.waitForFunction(()=>document.querySelector('.titr-dilution-stage').__dilutionViewer.debug().fraction===0.5);
await panel.screenshot({type:'jpeg',quality:85,path:path.join(out,'titration-dilution-desktop.jpg')});await page.setViewportSize({width:320,height:1100});await reveal();await panel.screenshot({type:'jpeg',quality:85,path:path.join(out,'titration-dilution-mobile.jpg')});
await page.evaluate(()=>qaRoot.unmount());assert.equal(await page.locator('[data-titration-dilution-gl]').count(),0);assert.deepEqual(report.errors,[]);report.checks.push('Tab changes and unmount remove the renderer; returning to the calculator restores its data.');console.log(JSON.stringify(report));
}finally{fs.writeFileSync(path.join(out,'titration-dilution-browser-results.json'),JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
