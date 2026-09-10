const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/chemistry-refinement-2026-09-06');
(async()=>{const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report={checks:[],errors:[],scans:[]};
try{const page=await browser.newPage({viewport:{width:1200,height:1100},hasTouch:true,reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));
await page.route('**/*',r=>r.request().url()==='http://127.0.0.1:7777/titration'?r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Titration bench QA</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#071422"><main id="root"></main></body></html>'}):r.abort());
await page.goto('http://127.0.0.1:7777/titration');
for(const p of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js','stem_lab/stem_lab_module.js','app_styles_module.js','stem_lab/stem_tool_titration.js'])await page.addScriptTag({path:path.join(root,p)});
const cssDir=path.join(root,'app/static/css');await page.addStyleTag({path:path.join(cssDir,fs.readdirSync(cssDir).find(f=>/^main\..*\.css$/.test(f)))});
await page.evaluate(()=>{const noop=()=>{};const ctx={React,icons:new Proxy({},{get:()=>()=>null}),gradeLevel:'10',t:(k,f)=>f||k,addToast:noop,announceToSR:noop,setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,awardXP:noop,getXP:()=>0,beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:()=>'',toolSnapshots:[],a11yClick:fn=>({onClick:fn}),srOnly:{position:'absolute',width:1,height:1,overflow:'hidden'},callGemini:null,callTTS:null};
function App(){const [toolData,setToolData]=React.useState({titrationLab:{safetyChecked:true,labTab:'equipment',presetId:'sa_sb',volumeAdded:24.9,_prevVolume:24.9}});window.qaState=toolData;window.qaUpdate=patch=>setToolData(prev=>({titrationLab:{...prev.titrationLab,...patch}}));const updateMulti=(id,patch)=>setToolData(prev=>({...prev,[id]:{...prev[id],...patch}}));return React.createElement(React.Fragment,null,React.createElement(AlloModules.AppStyles.AppStyles),StemLab._registry.titrationLab.render({...ctx,toolData,setToolData,updateMulti,update:(id,key,value)=>updateMulti(id,{[key]:value})}));}
window.qaRoot=ReactDOM.createRoot(document.getElementById('root'));qaRoot.render(React.createElement(App));});

const guide=page.locator('[data-titration-equipment-guide]'),study=guide.locator('[data-titration-equipment-study]'),cards=guide.locator('button[id^="titration-equipment-button-"]');
await guide.waitFor();assert.equal(await cards.count(),14);
const ids=['volumetric-flask','pipette-filler','funnel','stand-clamp','magnetic-stirrer','ph-electrode','analytical-balance','weighing-boat','spatula'];
const experiment=()=>page.evaluate(()=>({preset:qaState.titrationLab.presetId,volume:qaState.titrationLab.volumeAdded,notebook:qaState.titrationLab.benchNotebook,previous:qaState.titrationLab._prevVolume}));const original=await experiment();
await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
for(const id of ids){
  const card=guide.locator('#titration-equipment-button-'+id);await card.click();await study.waitFor();
  await page.waitForFunction(id=>document.activeElement.id==='titration-equipment-detail-'+id,id);
  assert.equal(await card.getAttribute('aria-expanded'),'true');
  assert.equal(await study.getAttribute('data-titration-equipment-study'),id);
  const steps=study.getByRole('group',{name:'Illustrated technique steps'}).getByRole('button');assert.equal(await steps.count(),3);
  assert.equal(await steps.nth(0).getAttribute('aria-pressed'),'true');
  assert.equal(await study.locator('a').getAttribute('target'),'_blank');assert.match(await study.locator('a').getAttribute('href'),/^https:\/\//);
  let prevImage='';let descriptions=[];
  for(let phase=0;phase<3;phase++){
    await steps.nth(phase).focus();await page.keyboard.press(phase%2?'Space':'Enter');
    assert.equal(await steps.nth(phase).getAttribute('aria-pressed'),'true');
    assert.equal(await study.locator('button[aria-pressed="true"]').count(),1);
    const diagram=study.locator('[data-equipment-diagram]');assert.equal(await diagram.getAttribute('data-equipment-phase'),String(phase));
    const markup=await diagram.innerHTML();assert.notEqual(markup,prevImage);prevImage=markup;
    descriptions.push(await study.locator('[aria-live="polite"]').textContent());
    for(const width of [1200,320]){
      await page.setViewportSize({width,height:1100});await study.scrollIntoViewIfNeeded();
      const scan=await page.evaluate(async()=>{const node=document.querySelector('[data-titration-equipment-study]');const result=await axe.run({include:['[data-titration-equipment-study]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return{overflow:node.scrollWidth>node.clientWidth,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))};});
      report.scans.push({id,phase,width,...scan});assert.equal(scan.overflow,false);assert.deepEqual(scan.violations,[]);
      if((phase===1 && (width===1200 || id==='ph-electrode' || id==='volumetric-flask')) || (phase===2 && width===1200))await study.screenshot({type:'jpeg',quality:88,path:path.join(out,'titration-equipment-'+id+'-'+width+(phase===2?'-finish':'')+'.jpg')});
    }
  }
  assert.equal(new Set(descriptions).size,3);assert.deepEqual(await experiment(),original);
  // Reopening starts a fresh guide; both close actions restore the equipment launcher.
  await study.getByRole('button',{name:'Back to equipment',exact:true}).click();await study.waitFor({state:'detached'});
  await page.waitForFunction(id=>document.activeElement.id==='titration-equipment-button-'+id,id);
  assert.equal(await card.getAttribute('aria-expanded'),'false');await card.press('Enter');await study.waitFor();assert.equal(await study.locator('[data-equipment-phase]').getAttribute('data-equipment-phase'),'0');
  await study.getByRole('button',{name:'Back to equipment',exact:true}).focus();await page.keyboard.press('Escape');await study.waitFor({state:'detached'});
  await page.waitForFunction(id=>document.activeElement.id==='titration-equipment-button-'+id,id);
  report.checks.push(id+': three distinct keyboard-selectable illustrated steps, reference link, reopening reset, close/Escape focus return, experiment preservation, desktop and phone accessibility/layout.');
}
// Switching directly between equipment also resets the local illustration step.
await guide.locator('#titration-equipment-button-volumetric-flask').click();await study.getByRole('button',{name:'Mix',exact:true}).click();
await guide.locator('#titration-equipment-button-ph-electrode').click();assert.equal(await study.locator('[data-equipment-phase]').getAttribute('data-equipment-phase'),'0');
await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await study.getByRole('button',{name:'Measure',exact:true}).focus();await page.keyboard.press('Enter');assert.equal(await study.locator('[data-equipment-phase]').getAttribute('data-equipment-phase'),'1');await page.emulateMedia({forcedColors:'none'});
await page.setViewportSize({width:1200,height:1100});
const full=await page.evaluate(async()=>{const a=await axe.run({include:['[data-titration-equipment-guide]']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}));});report.fullGuideViolations=full;assert.deepEqual(full,[]);
// Existing guide entries are still available with their original technique panels.
await guide.locator('#titration-equipment-button-burette').click();await study.waitFor({state:'detached'});assert((await guide.locator('#titration-equipment-detail-burette').textContent()).includes('initial reading'));
assert.deepEqual(await experiment(),original);await page.evaluate(()=>qaRoot.unmount());assert.deepEqual(report.errors,[]);
console.log(JSON.stringify({checks:report.checks.length,scans:report.scans.length,errors:report.errors,fullGuideViolations:report.fullGuideViolations}));
}finally{fs.writeFileSync(path.join(out,'titration-equipment-browser-results.json'),JSON.stringify(report,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
