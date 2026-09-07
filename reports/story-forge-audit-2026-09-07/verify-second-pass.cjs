const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');const {chromium}=require('playwright');
const out=path.join(__dirname,'second-pass');fs.mkdirSync(out,{recursive:true});
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
 await page.locator('#sf-title').fill('The Bridge');
 await page.locator('#sf-new-vocab-term').fill('bridge');
 await page.getByRole('textbox',{name:/term definition/i}).fill('My original definition');
 await page.getByRole('button',{name:'Add',exact:true}).click();
 await go('write');await editors().first().fill('My opening scene is about a bridge.');
 await page.getByRole('button',{name:'Add Scene',exact:true}).click();await editors().nth(1).fill('My authored ending must survive.');
 await go('configure');await page.getByRole('button',{name:/Lesson scene starters/}).click();
 await page.locator('[data-sf-lesson-preview]').waitFor();
 await page.screenshot({animations:'disabled',path:path.join(out,'lesson-preview-desktop.png')});
 await page.locator('[data-sf-apply-lesson]').click();await page.locator('[data-sf-lesson-preview]').waitFor({state:'detached'});
 await go('write');assert.deepEqual(await texts(),['My opening scene is about a bridge.','My authored ending must survive.']);
 await undo().click();await page.waitForFunction(()=>document.querySelector('#sf-title'));
 await go('write');assert.deepEqual(await texts(),['My opening scene is about a bridge.','My authored ending must survive.']);
 assert.equal(await page.getByText('A new opening prompt',{exact:true}).count(),0);
 // Restoring creates a new backup of the latest version, so Undo can return to it.
 await openMenu();await page.locator('[data-sf-checkpoint-name]').fill('My named checkpoint');
 await page.locator('[data-sf-project-menu-checkpoint]').click();
 await page.locator('[data-sf-menu-checkpoint]').filter({hasText:'My named checkpoint'}).waitFor();await closeMenu();
 await editors().first().fill('My newer opening after the checkpoint.');
 await openMenu();await page.locator('[data-sf-menu-checkpoint]').filter({hasText:'My named checkpoint'}).click();
 await page.waitForFunction(()=>document.querySelector('textarea[id^="sf-paragraph-text"]')?.value==='My opening scene is about a bridge.');
 await undo().click();await page.waitForFunction(()=>document.querySelector('textarea[id^="sf-paragraph-text"]')?.value==='My newer opening after the checkpoint.');
 // Authored removal is recoverable with the same one-click Undo.
 await page.getByRole('button',{name:/Remove scene 2/i}).click();await waitCount(1);
 await undo().click();await waitCount(2);assert.equal((await texts())[1],'My authored ending must survive.');
 // A failing vault must prevent removal rather than pretend a checkpoint succeeded.
 await page.evaluate(()=>{window.originalAuditOpen=window.indexedDB.open;window.indexedDB.open=()=>{throw new Error('Simulated vault failure')};});
 await page.getByRole('button',{name:/Remove scene 2/i}).click();
 await page.waitForFunction(()=>window.auditToasts.some(t=>String(t[0]).toLowerCase().includes('checkpoint')&&t[1]==='error'));
 assert.equal(await editors().count(),2);await page.evaluate(()=>window.indexedDB.open=window.originalAuditOpen);
 // New goals merge rather than replacing the student's existing definition.
 await go('configure');await page.getByRole('button',{name:/Lesson vocabulary/}).click();await page.locator('[data-sf-apply-lesson]').click();await page.locator('[data-sf-lesson-preview]').waitFor({state:'detached'});
 await go('write');assert.ok((await page.locator('body').innerText()).includes('cooperate'));
 await go('configure');await page.getByRole('button',{name:/Empty resource/}).click();assert.equal(await page.locator('[data-sf-lesson-preview]').count(),0);
 await go('write');await page.setViewportSize({width:390,height:844});
 if(await undo().count())await page.getByRole('button',{name:'Dismiss',exact:true}).click();
 await page.getByRole('button',{name:'Focus on writing',exact:true}).click();
 await page.locator('.sf-focus-jump').last().click();
 for(let i=2;i<8;i++){await page.locator('[data-sf-focus-next]').click();await page.waitForFunction(n=>document.querySelectorAll('.sf-focus-jump').length===n,i+1);}
 assert.equal(await page.locator('[data-sf-focus-next]').isDisabled(),true);
 assert.equal(await page.locator('[data-sf-focus-next]').innerText(),'Section limit reached');
 assert.equal(await page.locator('.sf-focus-jump').count(),8);
 const targets=await page.locator('.sf-focus-jump').evaluateAll(es=>es.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
 assert.ok(targets.every(t=>t.width>=44&&t.height>=44));
 await page.locator('.sf-focus-jump').first().click();await page.waitForFunction(()=>document.activeElement?.tagName==='TEXTAREA');
 await page.screenshot({animations:'disabled',path:path.join(out,'focus-mobile.png')});
 await openMenu();const menuBounds=await page.locator('.sf-project-menu-panel').boundingBox();assert.ok(menuBounds.x>=0&&menuBounds.x+menuBounds.width<=390);await page.screenshot({animations:'disabled',path:path.join(out,'checkpoints-mobile.png')});await closeMenu();
 await page.addScriptTag({path:path.resolve('node_modules/axe-core/axe.min.js')});
 const accessibility=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.sf-modal-root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
 assert.deepEqual(errors,[]);assert.deepEqual(accessibility,[]);
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({lessonImportPreservedWriting:true,checkpointRestoreUndo:true,removeUndo:true,failedSavePreservedWriting:true,focusLimit:8,targets,errors,accessibility},null,2));
 console.log(JSON.stringify({success:true,errors,accessibility}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
