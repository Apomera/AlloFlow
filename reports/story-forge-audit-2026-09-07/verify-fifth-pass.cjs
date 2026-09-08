const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');const {chromium}=require('playwright');
const out=path.join(__dirname,'fifth-pass');fs.mkdirSync(out,{recursive:true});
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


 await page.evaluate(()=>{window.coachCalls=[];window.auditProps.onCallGemini=(prompt)=>new Promise((resolve,reject)=>window.coachCalls.push({prompt,resolve,reject}));window.auditRoot.render(React.createElement(window.AlloModules.StoryForge,window.auditProps));});
 const respond=async(value)=>page.evaluate(value=>window.coachCalls.at(-1).resolve(JSON.stringify(value)),value);
 await page.locator('#sf-title').fill('Safe comic helpers');await page.locator('[data-sf-artifact-picker] button').filter({hasText:'Comic'}).first().click();await go('write');
 const speech=()=>page.getByRole('textbox',{name:/Panel 1 speech/i});await speech().fill('Maya felt frightened as she crossed the bridge, but her friend promised that they would work together and reach the other side safely.');
 await go('review');await page.getByRole('button',{name:'More review tools',exact:true}).click();await page.getByRole('button',{name:/Show vs Tell/}).click();
 await page.waitForFunction(()=>window.coachCalls.length===1);assert.ok((await page.evaluate(()=>window.coachCalls[0].prompt)).includes('Maya felt frightened'));
 await respond({tellings:{},summary:'Malformed'});await page.locator('[data-sf-coach-notice]').waitFor();assert.equal(await page.locator('.sf-modal-root').count(),1);assert.deepEqual(errors,[]);
 await page.getByRole('button',{name:/Show vs Tell/}).click();await page.waitForFunction(()=>window.coachCalls.length===2);await go('write');await speech().fill('My revised dialogue must stay.');await respond({tellings:[],summary:'OUTDATED COACH RESULT'});await go('review');await page.locator('[data-sf-coach-notice]').waitFor();assert.equal(await page.getByText('OUTDATED COACH RESULT',{exact:true}).count(),0);
 await go('write');await editors().first().fill('Maya and her friend cross the bridge together.');
 await page.getByRole('button',{name:'More tools',exact:true}).click();
 const draft=()=>page.getByRole('button',{name:/Draft Bubbles/i});
 await draft().click();await page.waitForFunction(()=>window.coachCalls.length===3);await respond({panels:[{panel:1,speaker:'Maya',speech:'Proposed dialogue',thought:'',sfx:''}]});await page.locator('[data-sf-comic-edit-preview]').waitFor();assert.equal(await speech().inputValue(),'My revised dialogue must stay.');
 await page.setViewportSize({width:390,height:844});await page.locator('[data-sf-comic-edit-preview]').scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:path.join(out,'comic-suggestions-mobile.png')});await page.setViewportSize({width:1280,height:900});
 await page.getByRole('button',{name:'Keep my version',exact:true}).click();assert.equal(await speech().inputValue(),'My revised dialogue must stay.');
 await draft().click();await page.waitForFunction(()=>window.coachCalls.length===4);await respond({panels:[{panel:1,speech:'Applied dialogue',thought:'',sfx:''}]});await page.locator('[data-sf-comic-edit-preview]').waitFor();await page.locator('[data-sf-apply-comic-edit]').click();await page.waitForFunction(()=>[...document.querySelectorAll('textarea')].some(e=>e.value==='Applied dialogue'));
 await page.locator('[data-sf-undo-project-edit]').click();await page.waitForFunction(()=>[...document.querySelectorAll('textarea')].some(e=>e.value==='My revised dialogue must stay.'));
 if(await draft().count()===0)await page.getByRole('button',{name:'More tools',exact:true}).click();
 await draft().click();await page.waitForFunction(()=>window.coachCalls.length===5);await respond({panels:[{panel:1,speech:'STALE REPLACEMENT'}]});await page.locator('[data-sf-comic-edit-preview]').waitFor();await speech().fill('Edited after preview');await page.locator('[data-sf-apply-comic-edit]').click();await page.locator('[data-sf-comic-edit-preview]').waitFor({state:'detached'});assert.equal(await speech().inputValue(),'Edited after preview');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({coachMalformedSafe:true,coachUsesComicSpeech:true,staleCoachRejected:true,comicPreviewPreservesWriting:true,comicDiscard:true,comicApplyUndo:true,staleComicApplyRejected:true,errors},null,2));console.log('Coach and comic replacement checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
