const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');const {chromium}=require('playwright');
const out=path.join(__dirname,'third-pass');fs.mkdirSync(out,{recursive:true});
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

 await page.locator('#sf-title').fill('Keyboard and review checks');
 await openMenu();await page.locator('[data-sf-checkpoint-name]').focus();await page.keyboard.press('Escape');
 assert.equal(await page.locator('[data-sf-project-menu]').getAttribute('open'),null);
 assert.equal(await page.locator('[data-sf-project-menu-trigger]').evaluate(e=>e===document.activeElement),true);
 assert.equal(await page.locator('#sf-title').count(),1);
 await openMenu();await page.locator('#sf-title').click();assert.equal(await page.locator('[data-sf-project-menu]').getAttribute('open'),null);
 await openMenu();await page.locator('#sf-title').focus();assert.equal(await page.locator('[data-sf-project-menu]').getAttribute('open'),null);
 await go('write');await editors().first().fill('Maya built a bridge with her friend. They worked together and crossed the river.');await go('review');
 await page.getByRole('button',{name:'More review tools',exact:true}).click();
 for(const name of ['Senses Check','Mentor Match','Show vs Tell','Character Arcs','Dialogue Tune-Up'])assert.equal(await page.getByRole('button',{name:new RegExp(name)}).isDisabled(),true);
 const ratings=page.locator('[data-sf-self-rating]');assert.ok(await ratings.count()>0);assert.equal(await ratings.first().inputValue(),'3');
 await ratings.first().selectOption('4');assert.equal(await ratings.first().inputValue(),'4');
 await page.setViewportSize({width:390,height:844});
 const bounds=await ratings.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,width:r.width,height:r.height}}));assert.ok(bounds.every(r=>r.x>=0&&r.x+r.width<=390&&r.height>=44));
 await page.getByRole('button',{name:'Hide review tools',exact:true}).click();await ratings.last().scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:path.join(out,'review-mobile.png')});
 await page.addScriptTag({path:path.resolve('node_modules/axe-core/axe.min.js')});
 const accessibility=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.sf-modal-root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
 assert.deepEqual(accessibility,[]);
 await page.getByRole('button',{name:'Submit Self-Assessment',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Continue to Design',exact:true}).isDisabled(),false);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({menuEscapeReturnsFocus:true,outsideClickDismisses:true,focusOutsideDismisses:true,unavailableAiDisabled:true,ratingsKeyboardAccessible:true,reviewProgression:true,accessibility,errors},null,2));
 console.log(JSON.stringify({success:true,accessibility,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
