const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');const {chromium}=require('playwright');
const out=path.join(__dirname,'followup-review');fs.mkdirSync(out,{recursive:true});
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


 await page.evaluate(()=>{window.auditProps.onCallGemini=async()=>JSON.stringify({tellings:{unexpected:'object'},summary:'Try adding sensory detail.'});window.auditRoot.render(React.createElement(window.AlloModules.StoryForge,window.auditProps));});
 await page.locator('#sf-title').fill('Coach validation audit');await go('write');await editors().first().fill('Maya felt scared as she crossed the bridge. She was cold and tired, but she wanted to help her friend find a safe way home.');await go('review');await page.getByRole('button',{name:'More review tools',exact:true}).click();await page.getByRole('button',{name:/Show vs Tell/}).click();
 await page.waitForFunction(()=>!document.querySelector('.sf-modal-root'));
 fs.writeFileSync(path.join(out,'coach-malformed-response.json'),JSON.stringify({scenario:'Show vs Tell returns a valid JSON object with tellings as an object',componentStillMounted:await page.locator('.sf-modal-root').count()>0,errors},null,2));console.log(JSON.stringify({componentStillMounted:await page.locator('.sf-modal-root').count()>0,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
