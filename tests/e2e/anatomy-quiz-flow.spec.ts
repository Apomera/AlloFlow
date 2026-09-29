import {test,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';
const out=process.env.ANATOMY_QA_OUT||'reports/anatomy-quiz-clarity-2026-09-28';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
test.use({video:'off',trace:'off'});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));
test('Quiz feedback, diagram study, and keyboard return preserve the current practice',async({page})=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});
 await harness.mount(page,{anatomy:{_activeTab:'quiz',quizMode:true,system:'skeletal',complexity:1,_startHereDismissed:true,_structureNotes:{skull:'Saved study note'}}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}'});
 const panel=page.locator('[data-anatomy-quiz-panel]'),feedback=page.locator('[data-anatomy-quiz-feedback]');
 const top=await panel.evaluate(el=>el.getBoundingClientRect().top+scrollY);expect(top).toBeLessThan(350);
 await expect(page.locator('#anatomy-study-system')).toBeVisible();await expect(page.locator('#anatomy-study-mission')).toBeHidden();
 await page.locator('[data-anatomy-study-controls-toggle]').click();await expect(page.locator('#anatomy-study-mission')).toBeVisible();
 await page.locator('[data-anatomy-study-controls-toggle]').click();await expect(page.locator('#anatomy-study-mission')).toBeHidden();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/after-desktop.png'});
 await page.setViewportSize({width:390,height:844});await panel.screenshot({path:out+'/question-phone.png'});
 await expect(panel.locator('[data-result=correct]')).toHaveCount(0);
 const savedQuestion=await page.evaluate(()=>(window as any).__toolData.anatomy._quizQuestion);
 await panel.focus();await panel.press('1');
 await expect(feedback).toBeFocused();await expect(panel.locator('[data-anatomy-quiz-option=humerus]')).toContainText('Your answer');
 await expect(panel.locator('[data-anatomy-quiz-option=skull]')).toContainText('Correct answer');
 await expect(panel.locator('[data-anatomy-quiz-score]')).toContainText('0 correct · 1 answered');
 await expect(panel.locator('[data-anatomy-quiz-option]:disabled')).toHaveCount(4);
 await panel.screenshot({path:out+'/feedback-phone.png'});
 await feedback.press('Tab');await expect(panel.locator('[data-anatomy-quiz-next]')).toBeFocused();
 await panel.locator('[data-anatomy-quiz-study]').click();
 const returnPanel=page.locator('[data-anatomy-quiz-return]');await expect(returnPanel).toBeVisible();
 await expect(page.locator('[data-anatomy-structure-detail=skull]')).toBeVisible();await returnPanel.screenshot({path:out+'/return-to-question.png'});
 await returnPanel.getByRole('button',{name:'Return to Question 1',exact:true}).click();await expect(feedback).toBeFocused();
 expect(await page.evaluate(()=>(window as any).__toolData.anatomy._quizQuestion)).toEqual(savedQuestion);
 await panel.locator('[data-anatomy-quiz-next]').click();await expect(panel).toBeFocused();await expect(feedback).toHaveCount(0);
 await expect(panel.locator('.anatomy-quiz-answer-help')).toContainText('1–2');
 const truth=await page.evaluate(()=>(window as any).__toolData.anatomy._quizQuestion.binaryTrue);
 await panel.locator('[data-anatomy-quiz-option="'+String(truth)+'"]').click();await expect(feedback).toHaveAttribute('data-result','correct');
 await expect(panel.locator('[data-anatomy-quiz-score]')).toContainText('1 correct · 2 answered');
 await panel.locator('[data-anatomy-quiz-next]').click();
 const wrongSystem=panel.locator('[data-anatomy-quiz-option]:not([data-anatomy-quiz-option=skeletal])').first();await wrongSystem.click();
 await panel.locator('[data-anatomy-quiz-study]').click();await returnPanel.getByRole('button',{name:'Return to Question 3',exact:true}).click();await expect(feedback).toBeFocused();
 await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});const scans:any[]=[],sizes:any[]=[];
 for(const width of [390,1440])for(const theme of ['light','dark','contrast']){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
  const violations=await page.evaluate(async()=>{const result=await (window as any).axe.run({include:[['[data-anatomy-quiz-panel]'],['[data-anatomy-study-controls]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});
  scans.push({width,theme,violations});await panel.screenshot({path:out+'/feedback-'+theme+'-'+width+'.png'});
 }
 await page.evaluate(()=>document.body.className='');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));sizes.push(size);expect(size.scroll).toBeLessThanOrEqual(width+2);}
 await panel.getByRole('button',{name:'Restart quiz',exact:true}).click();await expect(panel).toBeFocused();await expect(feedback).toHaveCount(0);
 await expect(panel.locator('[data-anatomy-quiz-score]')).toContainText('0 correct · 0 answered');
 expect(await page.evaluate(()=>(window as any).__toolData.anatomy._structureNotes.skull)).toBe('Saved study note');
 await panel.getByRole('button',{name:'End quiz and return to Explore',exact:true}).click();await expect(returnPanel).toHaveCount(0);
 await page.getByRole('tab',{name:'Quiz',exact:true}).click();
 await page.getByRole('button',{name:'Larger text',exact:true}).click();await page.setViewportSize({width:320,height:900});
 await panel.screenshot({path:out+'/larger-text-320.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(322);
 const arabic=JSON.parse(await readFile(process.env.ANATOMY_QA_ARABIC||'lang/arabic.js','utf8'));
 await page.evaluate(dict=>{document.documentElement.dir='rtl';(window as any).__ctx.t=(key:string,fallback:string)=>key.split('.').reduce((n:any,k:string)=>n?.[k],dict)||fallback;(window as any).__ctx.updateMulti('anatomy',{_readingMode:false});},arabic);
 await expect(panel.locator('.anatomy-quiz-summary')).toContainText(arabic.stem.anatomy.quiz_flow_continuous);
 await expect(panel.getByRole('button',{name:arabic.stem.anatomy.restart_quiz,exact:true})).toBeVisible();
 await expect(panel.locator('.anatomy-quiz-session')).toContainText(arabic.stem.anatomy.quiz_misses_go_to_review);
 await expect(panel.locator('.anatomy-quiz-question>p:last-child')).toHaveCSS('direction','ltr');
 await panel.screenshot({path:out+'/arabic-320.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(322);
 await writeFile(out+'/browser-validation.json',JSON.stringify({top,scans,sizes,errors},null,2));expect(scans.flatMap(s=>s.violations)).toEqual([]);expect(errors).toEqual([]);
});

test('Older learners can read application feedback in each theme',async({page})=>{
 test.setTimeout(180000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
 await harness.mount(page,{anatomy:{_activeTab:'quiz',quizMode:true,system:'skeletal',complexity:3,quizIdx:3,_structureConfidence:{skull:'practice',ribs:'practice',clavicle:'practice',femur:'practice'},_startHereDismissed:true}},undefined,{expectCanvas:false});
 await page.addStyleTag({content:'#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}'});
 await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{_quizQuestion:null,quizFeedback:null});});
 await expect.poll(()=>page.evaluate(()=>(window as any).__toolData.anatomy._quizQuestion?.context)).toContain('g912');
 const panel=page.locator('[data-anatomy-quiz-panel]');await expect(panel.locator('.anatomy-quiz-question')).toContainText('A fracture near the hip');
 await panel.locator('[data-anatomy-quiz-option=femur]').click();await expect(panel.locator('[data-anatomy-quiz-feedback]')).toBeFocused();
 await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});const scans:any[]=[];
 for(const theme of ['light','dark','contrast']){
  await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
  const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run({include:[['[data-anatomy-quiz-panel]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));});
  scans.push({theme,violations});await panel.screenshot({path:out+'/application-'+theme+'-390.png'});
 }
 await writeFile(out+'/application-validation.json',JSON.stringify({scans},null,2));expect(scans.flatMap(s=>s.violations)).toEqual([]);
});
