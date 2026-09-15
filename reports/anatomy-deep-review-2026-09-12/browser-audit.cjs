const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {GlHarness}=require('./harness.cjs');
const out=__dirname;
(async()=>{
 const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1120,height:1600,appStyles:true});
 await harness.start();
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const rows=[];
 try{
  await harness.mount(page,{anatomy:{_bodyView3d:false}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:white}#wrap{height:auto;min-height:100%;width:min(1120px,100%);margin:auto}'});
  async function record(name,screenshot=true){
   const row=await page.evaluate(()=>{
    const root=document.querySelector('[data-anatomy-tool]')||document.querySelector('.anatomy-tool-shell');
    const visible=el=>!!(el.getClientRects().length && getComputedStyle(el).visibility!=='hidden');
    const rect=s=>{const el=document.querySelector(s);if(!el||!visible(el))return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height};};
    const controls=Array.from(root.querySelectorAll('button,input,select,textarea,summary,[role=tab]')).filter(visible);
    return {viewport:{width:innerWidth,height:innerHeight},pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,state:window.__toolData.anatomy,text:root.innerText,controls:controls.map(el=>({text:(el.getAttribute('aria-label')||el.innerText||el.title||el.id).slice(0,160),w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,y:el.getBoundingClientRect().y+scrollY})),tabs:Array.from(root.querySelectorAll('[role=tab]')).filter(visible).map(e=>e.innerText),figure:rect('.anatomy-canvas-column'),detail:rect('[data-anatomy-structure-detail]'),recall:rect('[data-anatomy-recall-card]'),side:rect('.anatomy-side-column')};
   });row.name=name;rows.push(row);
   if(screenshot) await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
   console.log(name,JSON.stringify({width:row.pageWidth,height:row.pageHeight,controls:row.controls.length,tabs:row.tabs,detail:row.detail,side:row.side}));
  }
  async function state(patch,grade='8th Grade') {await page.evaluate(({patch,grade})=>{window.__ctx.gradeLevel=grade;window.__ctx.setToolData(p=>({...p,anatomy:{...p.anatomy,...patch}}));},{patch,grade});await page.waitForTimeout(180);await page.evaluate(()=>scrollTo(0,0));}
  await record('desktop-default-grade5');
  await state({system:'skeletal',complexity:3,selectedStructure:'fibula',_showClinical:true});await record('desktop-fibula');
  await page.setViewportSize({width:390,height:844});await record('phone-explore');
  await state({_activeTab:'quiz',quizMode:true});await record('phone-quiz');
  await state({_activeTab:'flashcards',quizMode:false});await record('phone-cards');
  await page.setViewportSize({width:320,height:844});await state({_activeTab:'explore'});await record('phone-320-explore');
  await page.setViewportSize({width:1280,height:1000});
  for(const tab of ['tour','connections','aiTutor','spotter','pathways','homeoHunt','imaging','procedure']){await state({_activeTab:tab});await record('mode-'+tab,tab==='homeoHunt'||tab==='procedure');}
  await state({_activeTab:'explore',system:'circulatory',selectedStructure:'heart',_bodyView3d:true});await page.waitForTimeout(2500);await record('desktop-3d');
  await state({_activeTab:'explore',_bodyView3d:false,system:'skeletal',selectedStructure:'fibula'});
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const axe=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('.anatomy-tool-shell'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:result.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))};});
  fs.writeFileSync(path.join(out,'browser-evidence.json'),JSON.stringify({rows,errors,axe},null,2));
  console.log('errors',JSON.stringify(errors),'axe',JSON.stringify(axe));
 }finally{await harness.destroy(page);await browser.close();await harness.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
