const fs = require('fs');
const path = require('path');
const http = require('http');
const { createRequire } = require('module');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const req = createRequire(path.join(root, 'desktop/web-app/package.json'));
const labels = {
 'lesson_plan.header_title':'Lesson plan', 'lesson_plan.topic_label':'Topic', 'lesson_plan.grade_label':'Grade', 'lesson_plan.materials_header':'Materials needed',
 'lesson_headers.teacher.essentialQuestion':'Essential question', 'lesson_headers.teacher.objectives':'Learning objectives', 'lesson_headers.teacher.hook':'Hook',
 'lesson_headers.teacher.directInstruction':'Direct instruction', 'lesson_headers.teacher.guidedPractice':'Guided practice', 'lesson_headers.teacher.independentPractice':'Independent practice', 'lesson_headers.teacher.closure':'Closure',
 'lesson_headers.extensions_header':'Extensions', 'lesson_plan.print':'Print lesson plan', 'common.edit':'Edit', 'common.done':'Done', 'common.copy':'Copy', 'lesson_plan.pdf_button':'PDF',
 'progression.title':'Plan the next lesson', 'progression.analyze_btn':'Explore next lessons', 'progression.helper_text':'Find opportunities to extend or revisit this learning.'
};
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8'));
function flattenLabels(value, prefix) { for (const [key, child] of Object.entries(value || {})) { const name=prefix ? prefix+'.'+key : key; if(typeof child==='string')labels[name]=child;else if(child&&typeof child==='object'&&!Array.isArray(child))flattenLabels(child,name); } }
for(const namespace of ['lesson_plan','lesson_headers','lesson_script','common','progression','brainstorm'])flattenLabels(catalog[namespace],namespace);
const savedScript = {
 id:'review-script',schemaVersion:2,scope:'segment',title:'Compare fractions on a number line',durationMinutes:15,researchStatus:'disabled',
 createdAt:'2026-09-12T16:00:00.000Z',inputSnapshot:{settings:{grade:'4th Grade',subject:'mathematics'},materialIds:['fraction-cards']},sources:[],
 steps:[1,2,3].map((number)=>({id:'step-'+number,title:['Model equal intervals','Compare and explain','Check the reasoning'][number-1],phase:'directInstruction',minutes:5,
 teacherSays:'Place one half on our shared number line. Explain how the equal spaces help you choose its position. Now show your partner how your model proves the comparison.',
 studentDoes:'Learners place fraction cards on their number lines and compare their models with a partner.',checkQuestion:'How do you know where one half belongs?',possibleResponse:'It is halfway between zero and one because the spaces are equal.',
 ifStruggling:'Fold a paper strip into equal halves together, then match the fold to the number line.',ifReady:'Compare one half with three fourths and explain your answer using equivalent fractions.',resourceIds:['fraction-cards'],recommendationIds:[]}))
};
const plan = {id:'review-plan',type:'lesson-plan',title:'Comparing fractions',config:{sourceTopic:'Comparing fractions',gradeLevel:'4th Grade'},data:{
 essentialQuestion:'How can models help us compare fractions?',objectives:['Compare fractions using visual models and a number line.','Explain why a comparison is valid when both fractions refer to the same whole.'],
 materialsNeeded:['Fraction cards','Blank number lines','Paper strips and pencils'],hook:'Show two equal-sized paper strips. Fold one into halves and the other into fourths. Which piece is larger? Ask learners to predict and explain.',
 directInstruction:'Model placing one half and three fourths on a number line. Think aloud about equal intervals and the size of the whole.',guidedPractice:'Partners compare fraction pairs with models, then explain their reasoning.',independentPractice:'Learners compare three fraction pairs and justify one comparison using a labeled model.',closure:'Ask learners to explain why fractions must refer to the same whole before comparing them.',
 extensions:[{title:'Find another way',description:'Challenge learners to represent a comparison using two different models.'}],teachingScripts:[savedScript]
}};
async function main() {
 const css=(await req('postcss')([req('tailwindcss')({...req('./tailwind.config.js'),content:[path.join(root,'view_lesson_plan_source.jsx'),path.join(root,'view_lesson_teaching_script_source.jsx')]})]).process('@tailwind base;@tailwind components;@tailwind utilities;', {from:undefined})).css;
 const scripts=['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','resource_content_fingerprint_module.js','lesson_teaching_script_module.js','view_lesson_teaching_script_module.js','view_lesson_plan_module.js'].map(file=>'<script>'+fs.readFileSync(path.join(root,file),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>').join('\n');
 const fixtureCode=`function App(){
 const fixture=window.reviewFixture;
 const [visible,setVisible]=React.useState(true);window.reviewShow=setVisible;
 const [scope,setScope]=React.useState('teacher-a|profile-one|workspace-one');window.reviewSetScope=setScope;
 const [resource,setResource]=React.useState(()=>JSON.parse(sessionStorage.getItem('review:saved-plan')||'null')||fixture.plan);window.reviewSetResource=setResource;
 const persistResource=next=>{setResource(next);sessionStorage.setItem('review:saved-plan',JSON.stringify(next));};
 return React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>setVisible(v=>!v),className:'mb-3 rounded border border-slate-600 px-4 py-2 text-slate-900 bg-white'},visible?'Leave lesson':'Return to lesson'),visible?React.createElement(window.AlloModules.LessonPlanView,{
 generatedContent:resource,isTeacherMode:true,teachingScriptDraftScope:scope,t:key=>fixture.labels[key]||'',history:[],teachingScriptMaterials:[{id:'fraction-cards',title:'Fraction models',type:'source',data:{text:'Use models of equal wholes to compare halves and fourths.'}}],
 teachingScriptLoadState:'ready',capabilities:{canGenerate:true,canResearch:true},defaultSettings:{grade:'4th Grade',gradeSource:'plan',subject:'mathematics',subjectDetected:true,topic:'Comparing fractions',language:'English',suggestedDuration:{segment:15,lesson:50}},
 onGenerateTeachingScript:async()=>({ok:true}),onUpdateTeachingScript:async(planId,versionId,steps,expectedSteps)=>{const current=resource.data.teachingScripts.find(v=>v.id===versionId);if(!current||JSON.stringify(current.steps)!==JSON.stringify(expectedSteps))return{ok:false,error:'Saved version changed'};persistResource({...resource,data:{...resource.data,teachingScripts:resource.data.teachingScripts.map(v=>v.id===versionId?{...v,steps}:v)}});return{ok:true}},
 onCancelTeachingScript:()=>{},onOpenTeachingMaterial:()=>{},handleToggleIsEditingLessonPlan:()=>{},handleCopyToClipboard:()=>{},handleExportPDF:()=>{},handleExport:()=>{},getRows:()=>3,normalizeMaterialItem:value=>value,renderFormattedText:value=>value,BilingualFieldRenderer:({text,className})=>React.createElement('p',{className},text),handleGenerateProgression:()=>{},handleGenerateExtensionGuide:()=>{}
 }):React.createElement('p',null,'Another workspace view'));}
 ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));`;
 const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lesson script recovery review</title><style>'+css+'body{background:#f8fafc;padding:16px}button:focus-visible{outline:2px solid #4338ca;outline-offset:2px}</style><h1 class="sr-only">AlloFlow lesson plan workspace</h1><main id="root"></main>'+scripts+'<script>window.reviewFixture='+JSON.stringify({plan,savedScript,labels})+';'+fixtureCode+'</script></html>';
 fs.writeFileSync(path.join(__dirname,'lesson-ui-preview.html'),html);
 const server=http.createServer((request,response)=>{response.setHeader('Content-Type','text/html; charset=utf-8');response.end(html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});const errors=[];const results=[];const url='http://127.0.0.1:'+server.address().port;const draftText='Recovered instruction: use equal-sized wholes to compare the fractions, then explain how your model supports the comparison.';
 const record=page=>page.evaluate(()=>{const key=Object.keys(sessionStorage).find(k=>k.startsWith('alloflow:lesson-script-session:v1:'));return key?JSON.parse(sessionStorage.getItem(key)):null;});
 const openPanel=async page=>{const panel=page.getByRole('button',{name:'Teaching script',exact:true});if(await panel.getAttribute('aria-expanded')==='false')await panel.click();};
 const openSettings=async page=>{await openPanel(page);const toggle=page.getByRole('button',{name:'Create another script',exact:true});if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();};
 try {
  for(const viewport of [{name:'desktop',width:1280,height:900},{name:'small-phone',width:320,height:900}]){
   const page=await browser.newPage({viewport});page.on('pageerror',error=>errors.push(error.message));await page.goto(url);await openSettings(page);
   await page.getByLabel('Lesson topic',{exact:true}).fill('My saved comparison focus');await page.getByLabel('Relevant prior learning',{exact:true}).fill('Yesterday we folded equal paper strips.');await page.getByLabel('Use research',{exact:false}).uncheck();
   await page.getByRole('button',{name:'Edit script',exact:true}).click();await page.getByLabel(/^Teacher says/).first().fill(draftText);
   await page.getByRole('button',{name:'Leave lesson',exact:true}).click();await page.getByRole('button',{name:'Return to lesson',exact:true}).click();
   await page.getByText('Recovered unsaved script edits and settings from this tab. Save edits to add them to the lesson plan.',{exact:true}).waitFor();if(await page.getByLabel(/^Teacher says/).first().inputValue()!==draftText)throw Error('Navigation lost draft');
   await page.reload();await page.getByText('Recovered unsaved script edits and settings from this tab. Save edits to add them to the lesson plan.',{exact:true}).waitFor();if(await page.getByLabel(/^Teacher says/).first().inputValue()!==draftText)throw Error('Refresh lost draft');
   await page.getByText('Recovered unsaved script edits and settings from this tab. Save edits to add them to the lesson plan.',{exact:true}).scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(__dirname,'recovered-draft-'+viewport.name+'.png'),fullPage:true});await page.screenshot({path:path.join(__dirname,'recovered-draft-'+viewport.name+'-viewport.png'),fullPage:false});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Horizontal overflow on '+viewport.name);
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const axe=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}));});if(axe.length)throw Error('Accessibility violations '+JSON.stringify(axe));
   await page.evaluate(()=>window.reviewSetScope('teacher-b|profile-one|workspace-one'));await openPanel(page);if(await page.getByRole('button',{name:'Save edits',exact:true}).count())throw Error('Actor isolation leaked draft');if(await page.getByText(draftText,{exact:true}).count())throw Error('Actor isolation leaked text');
   await page.evaluate(()=>window.reviewSetScope('teacher-a|profile-one|workspace-one'));if(await page.getByLabel(/^Teacher says/).first().inputValue()!==draftText)throw Error('Original actor lost draft');
   await page.getByRole('button',{name:'Save edits',exact:true}).click();await page.getByText('Script edits added to this plan.',{exact:true}).waitFor();if((await record(page)).draft!==null)throw Error('Successful save retained recovery draft');
   await page.reload();await openSettings(page);if(await page.getByRole('button',{name:'Save edits',exact:true}).count())throw Error('Saved edits recovered as draft');if(await page.getByLabel('Lesson topic',{exact:true}).inputValue()!=='My saved comparison focus')throw Error('Custom settings lost after save/reload');if(await page.getByLabel('Use research',{exact:false}).isChecked())throw Error('Research opted back in');
   await page.getByRole('button',{name:'Edit script',exact:true}).click();if(await page.getByLabel(/^Teacher says/).first().inputValue()!==draftText)throw Error('Saved fixture edit not retained');await page.getByLabel(/^Teacher says/).first().fill(draftText+' This change will be discarded.');await page.getByRole('button',{name:'Discard edits',exact:true}).click();if((await record(page)).draft!==null)throw Error('Discard retained recovery draft');await page.reload();await openPanel(page);if(await page.getByRole('button',{name:'Save edits',exact:true}).count())throw Error('Discarded edit restored after refresh');
   results.push({viewport:viewport.name,navigationRecovery:'passed',refreshRecovery:'passed',actorIsolation:'passed',saveClearsDraft:'passed',settingsRetainedAfterSave:'passed',researchChoicePreserved:'passed',discardClearsDraft:'passed',horizontalOverflow:overflow,axeViolations:axe});await page.close();
  }
  const page=await browser.newPage({viewport:{width:375,height:812}});page.on('pageerror',error=>errors.push(error.message));await page.goto(url);await openPanel(page);await page.getByRole('button',{name:'Edit script',exact:true}).click();await page.getByLabel(/^Teacher says/).first().fill(draftText);await page.getByRole('button',{name:'Discard edits',exact:true}).click();if((await record(page)).draft!==null)throw Error('Fresh default-settings discard retained draft');await page.reload();await openPanel(page);if(await page.getByRole('button',{name:'Save edits',exact:true}).count())throw Error('Fresh discarded draft returned');
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Blocked','QuotaExceededError');};});await page.getByRole('button',{name:'Edit script',exact:true}).click();await page.getByLabel(/^Teacher says/).first().fill(draftText);await page.getByText('This tab could not keep a recovery copy of the latest changes. Save script edits before leaving this lesson; your current edits are still on this page.',{exact:true}).waitFor();const guarded=await page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;});if(!guarded)throw Error('Unrecoverable draft lacks refresh guard');
  await page.getByText('This tab could not keep a recovery copy of the latest changes. Save script edits before leaving this lesson; your current edits are still on this page.',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'storage-failure-phone.png'),fullPage:false});results.push({freshDefaultDiscard:'passed',unavailableStorageNotice:'passed',unrecoverableRefreshGuard:'passed'});await page.close({runBeforeUnload:false});
  fs.writeFileSync(path.join(__dirname,'ui-browser-results.json'),JSON.stringify({results,pageErrors:errors},null,2));if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({results,pageErrors:errors},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
