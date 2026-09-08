const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');const {chromium}=require('playwright');
const out=path.join(__dirname,'fourth-pass');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://storyforge.audit/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Story Forge recovery verification</title></head><body><div id="root"></div></body></html>'}));
 await page.goto('http://storyforge.audit/');
 await page.addStyleTag({path:path.resolve('dev-tools/.cache/sweep-tailwind.css')});
 for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','story_forge_module.js'])await page.addScriptTag({path:path.resolve(file)});
 const strings=JSON.parse(fs.readFileSync('ui_strings.js','utf8'));
 await page.evaluate(strings=>{
  window.auditToasts=[];window.auditProps={isOpen:true,onClose:()=>{},codename:'Recovery Browser',t:key=>key.split('.').reduce((v,k)=>v?.[k],strings)||key,addToast:(...a)=>window.auditToasts.push(a),lessonResources:[
   {type:'sentence-frames',title:'Lesson scene starters',data:'1. A new opening prompt'},
   {type:'timeline',title:'Short timeline',data:'Day 1\nDay 2'},
   {type:'glossary',title:'Lesson vocabulary',data:[{term:'BRIDGE',definition:'Replacement definition'},{term:'cooperate',definition:'Work together'}]},
   {type:'timeline',title:'Empty resource',data:'  \n '}
  ]};window.auditRoot=ReactDOM.createRoot(document.getElementById('root'));window.auditRoot.render(React.createElement(window.AlloModules.StoryForge,window.auditProps));
 },strings);
 const go=async phase=>{if(page.viewportSize().width<640)await page.locator('#sf-mobile-step').selectOption(phase);else await page.locator('[data-sf-phase-step="'+phase+'"]').click()};
 const editors=()=>page.locator('textarea[id^="sf-paragraph-text"]');
 const undo=()=>page.locator('[data-sf-undo-project-edit]');
 const texts=()=>editors().evaluateAll(es=>es.map(e=>e.value));
 const waitCount=n=>page.waitForFunction(n=>document.querySelectorAll('textarea[id^="sf-paragraph-text"]').length===n,n);
 const openMenu=async()=>{if(!(await page.locator('[data-sf-project-menu]').getAttribute('open')!==null))await page.locator('[data-sf-project-menu-trigger]').click()};
 const closeMenu=async()=>{if(await page.locator('[data-sf-project-menu]').getAttribute('open')!==null)await page.locator('[data-sf-project-menu-trigger]').click()};


 await page.evaluate(()=>{window.feedbackRequests=[];window.auditProps.onCallGemini=()=>new Promise((resolve,reject)=>window.feedbackRequests.push({resolve,reject}));window.auditRoot.render(React.createElement(window.AlloModules.StoryForge,window.auditProps));});
 const feedback=()=>page.getByRole('button',{name:'Get Feedback',exact:true});
 const retry=()=>page.getByRole('button',{name:'Retry feedback',exact:true});
 const valid={scores:[{criteria:'Story',score:'4/5',comment:'Clear arc'}],totalScore:'999/999',feedback:{glow:'A clear opening',grow:'Add setting detail'}};
 const resolve=async(i,value)=>page.evaluate(({i,value})=>window.feedbackRequests[i].resolve(JSON.stringify(value)),{i,value});
 const notice=()=>page.locator('[data-sf-feedback-notice]');
 await page.locator('#sf-title').fill('Feedback recovery');await go('write');await editors().first().fill('Maya crossed the bridge with her friend. The river rushed beneath their feet.');await go('review');
 await page.getByRole('button',{name:'Skip self-assessment',exact:true}).click();
 await feedback().click();await resolve(0,{scores:{},feedback:{glow:{}}});await notice().waitFor();assert.match(await notice().innerText(),/could not be prepared/);assert.equal(await page.locator('[data-sf-phase-step="illustrate"]').isDisabled(),true);
 await retry().click();await page.evaluate(()=>window.feedbackRequests[1].reject(new Error('Simulated network failure')));await notice().waitFor();assert.match(await notice().innerText(),/writing is safe/);
 await retry().click();await page.locator('[data-sf-cancel-feedback]').click();await notice().waitFor();assert.match(await notice().innerText(),/cancelled/);
 await retry().click();await resolve(2,valid);assert.equal(await page.locator('[data-sf-cancel-feedback]').count(),1);await resolve(3,valid);await page.getByRole('button',{name:'Revise Draft',exact:true}).waitFor();assert.equal(await page.getByText('999/999',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Revise Draft',exact:true}).click();await go('review');await page.getByRole('button',{name:'Skip self-assessment',exact:true}).click();await feedback().click();
 await go('write');await editors().first().fill('An edited draft must keep its own review status.');await resolve(4,valid);await go('review');await notice().waitFor();assert.match(await notice().innerText(),/draft changed/);assert.equal(await page.getByRole('button',{name:'Revise Draft',exact:true}).count(),0);
 await page.setViewportSize({width:390,height:844});await notice().scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:path.join(out,'feedback-recovery-mobile.png')});
 await page.getByRole('button',{name:'Return to self-check',exact:true}).click();await page.getByRole('button',{name:'Submit Self-Assessment',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Continue to Design',exact:true}).isDisabled(),false);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({malformedRejected:true,networkFailureRecoverable:true,cancelledResponseIgnored:true,newRequestSurvivesOldResponse:true,totalDerived:true,editedDraftRejectsOldFeedback:true,selfCheckRecovery:true,errors},null,2));console.log('Feedback recovery browser checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
