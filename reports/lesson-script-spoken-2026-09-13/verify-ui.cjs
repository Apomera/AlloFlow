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
 const browser=await chromium.launch({headless:true});const results=[],errors=[];
 try {for(const width of [1280,320]){const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.getByRole('button',{name:'Teaching script',exact:true}).click();await page.getByRole('button',{name:'Spoken directions',exact:true}).click();
 const view=page.locator('[data-spoken-directions]');await view.waitFor();if(!await view.evaluate(node=>node.matches(':modal')))throw Error('Focus view is not isolated');if(await view.getByText('It is halfway between zero and one because the spaces are equal.',{exact:true}).count())throw Error('Teacher answer leaked');await page.getByRole('button',{name:'Next step',exact:true}).click();await page.getByRole('button',{name:'Larger text',exact:true}).click();await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const axe=await page.evaluate(async()=>axe.run(document.querySelector('[data-spoken-directions]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);await page.screenshot({path:path.join(__dirname,'spoken-'+width+'.png'),fullPage:false});results.push({width,overflow,violations:axe.violations.map(item=>({id:item.id,nodes:item.nodes.map(n=>n.target)}))});await page.keyboard.press('Escape');await page.getByRole('button',{name:'Spoken directions',exact:true}).waitFor();if(!await page.getByRole('button',{name:'Spoken directions',exact:true}).evaluate(node=>document.activeElement===node))throw Error('Focus did not return');await page.close();}
 fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify({results,errors},null,2));if(errors.length||results.some(result=>result.overflow||result.violations.length))throw Error('Browser verification failed');console.log(JSON.stringify({results,errors}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
