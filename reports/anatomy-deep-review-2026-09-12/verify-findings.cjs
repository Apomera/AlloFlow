const fs=require('node:fs');const path=require('node:path');const {chromium}=require('playwright');const {GlHarness}=require('./harness.cjs');
(async()=>{
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1120,height:1600,appStyles:true,extraScripts:['vendor/three-r128/OrbitControls.js','vendor/three-r128/GLTFLoader.js']});await harness.start();
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl']});const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});const evidence={};
try{
await harness.mount(page,{anatomy:{_bodyView3d:false,_activeTab:'quiz',system:'organs',complexity:3,view:'anterior',quizIdx:90}},undefined,{expectCanvas:false});
await page.addStyleTag({content:'html,body{background:white}#wrap{height:auto;min-height:100%;width:min(1120px,100%);margin:auto}'});
await page.evaluate(()=>{window.__ctx.gradeLevel='8th Grade';window.__rerender();});
evidence.quizBefore=await page.locator('.anatomy-side-column').innerText();
console.log('quiz before',evidence.quizBefore);
const endocrine=page.locator('.anatomy-side-column').getByRole('button',{name:/Endocrine/});
if(await endocrine.count()){await endocrine.click();await page.waitForTimeout(150);evidence.quizAfter=await page.locator('.anatomy-side-column').innerText();evidence.quizState=await page.evaluate(()=>window.__toolData.anatomy);await page.locator('.anatomy-side-column').screenshot({path:path.join(__dirname,'quiz-system-misclassification.png')});}
await page.evaluate(()=>{window.__ctx.gradeLevel='8th Grade';window.__ctx.setToolData(p=>({...p,anatomy:{_activeTab:'explore',_bodyView3d:false,system:'skeletal',complexity:1,selectedStructure:'skull'}}));});await page.waitForTimeout(150);evidence.levelK5WithGrade8=await page.locator('[data-anatomy-structure-detail]').innerText();
await page.evaluate(()=>{window.__ctx.gradeLevel='5th Grade';window.__ctx.setToolData(p=>({...p,anatomy:{_activeTab:'explore',_bodyView3d:false,system:'skeletal',complexity:1,selectedStructure:'skull'}}));});await page.waitForTimeout(150);evidence.grade5Skull=await page.locator('[data-anatomy-structure-detail]').innerText();
await page.evaluate(()=>{window.__ctx.gradeLevel='8th Grade';window.__ctx.setToolData(p=>({...p,anatomy:{_activeTab:'explore',_bodyView3d:true,_body3dStyle:'blueprint',system:'circulatory',complexity:3,selectedStructure:'heart'}}));});
await page.waitForTimeout(4000); evidence.blueprintDiagnostics = await page.locator('[data-anatomy-3d-canvas]').evaluate(el=>({...el.dataset}));
evidence.blueprint=await page.locator('[data-anatomy-3d-canvas]').evaluate(el=>({state:el.dataset.anatomy3dState,style:el.dataset.anatomy3dStyle}));
await page.locator('[data-anatomy-3d-canvas]').screenshot({path:path.join(__dirname,'blueprint-ready.png')});
await page.getByRole('button',{name:'Surface',exact:true}).click();await page.waitForTimeout(4000);
evidence.surface=await page.locator('[data-anatomy-3d-canvas]').evaluate(el=>({...el.dataset}));await page.locator('[data-anatomy-3d-canvas]').screenshot({path:path.join(__dirname,'surface-ready.png')});
}finally{fs.writeFileSync(path.join(__dirname,'verified-findings.json'),JSON.stringify(evidence,null,2));await harness.destroy(page);await browser.close();await harness.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
