import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_ACTIVITY_WRITING_QA_OUT||'reports/anatomy-activity-writing-2026-09-30';
const validation:Record<string,any>={};
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const themes=['light','dark','contrast'];
const skeletalIds=['skull','mandible','clavicle','sternum','ribs','scapula','humerus','radius','ulna','carpals','vertebral','pelvis','femur','patella','tibia','fibula','tarsals','sacrum','hyoid','atlas_axis','metatarsals','metacarpals','scaphoid_bone'];
const reviewContext='skeletal:3:review:'+skeletalIds.join(',');
const reviewDeck=['ribs','skull'];

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>{await writeFile(out+'/activity-writing-browser-validation.json',JSON.stringify(validation,null,2));await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});

const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
async function frame(page:Page){
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});});
}
async function capture(page:Page,locator:Locator,path:string){
  const width=page.viewportSize()!.width,box=await locator.boundingBox();
  if(!box)throw Error('Screenshot target is not visible: '+path);
  await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  try{
    await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-100)));
    const clip=await locator.evaluate(element=>{
      const rect=element.getBoundingClientRect(),root=document.documentElement,body=document.body;
      const rightBound=Math.min(innerWidth,Math.max(root.scrollWidth,body.scrollWidth)-scrollX);
      const bottomBound=Math.min(innerHeight,Math.max(root.scrollHeight,body.scrollHeight)-scrollY);
      const x=Math.max(0,Math.floor(rect.left-6)),y=Math.max(0,Math.floor(rect.top-6));
      return {x,y,width:Math.min(rightBound,Math.ceil(rect.right+6))-x,height:Math.min(bottomBound,Math.ceil(rect.bottom+6))-y};
    });
    if(clip.width<=0||clip.height<=0)throw Error('Screenshot target is outside the viewport: '+path);
    await page.screenshot({path,clip});
  }finally{await page.setViewportSize({width,height:1000});}
}
async function scan(page:Page,record:any,width:number,theme:string,locale:string,area:string,selectors:string[]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(theme=>{document.body.className=theme==='light'?'':'theme-'+theme;},theme);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async selectors=>{
    const result=await (window as any).axe.run({include:selectors.map(selector=>[selector])},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
    return result.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  },selectors);
  record.scans.push({width,theme,locale,area,dimensions,violations});
  expect(dimensions.scroll).toBeLessThanOrEqual(width);
}
async function installArabic(page:Page){
  const dict=JSON.parse(await readFile('lang/arabic.js','utf8'));
  await page.evaluate(dict=>{
    document.documentElement.lang='ar';document.documentElement.dir='rtl';const ctx=(window as any).__ctx;
    ctx.t=(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback;
    ctx.updateMulti('anatomy',{_readingMode:true});
  },dict);
  return dict.stem.anatomy;
}
function feedbackWriting(s:any){
  const feedback=s._feedbackExperiment||{},active=feedback.direction==='cool'?'cool':'warm';
  return {warm:active==='warm'?feedback.explanation:feedback.sessions?.warm?.explanation,cool:active==='cool'?feedback.explanation:feedback.sessions?.cool?.explanation,unassigned:feedback.unassignedExplanation};
}
function protectedWork(s:any){return {
  notes:s._structureNotes,confidence:s._structureConfidence,confidenceAt:s._confidenceAt,evidence:s._retrievalEvidence,
  tutorDraft:s._aiInput,tutorContext:s._aiDraftContext,tutorRevision:s._aiDraftRevision,tutorMessages:s._aiMessages,tutorBand:s._aiConversationBand,
  quizIndex:s.quizIdx,quizScore:s.quizScore,quizFeedback:s.quizFeedback,quizAttempts:s._quizAttempts,
  cards:{scope:s._flashcardScope,index:s._flashcardIdx,deck:s._flashcardDeck,deckContext:s._flashcardDeckContext,roundContext:s._flashcardRoundContext,rated:s._flashcardRoundRated,flipped:s._flashcardFlipped,rounds:s._flashcardRounds},
  feedbackWriting:feedbackWriting(s),ranges:s.homeoHunt,otherMotion:s._systemsMotionLearning?.meal
};}
async function resumeSaved(page:Page,id:string,writing:string){
  const sheet=page.locator('[data-anatomy-study-sheet]');
  if(!await sheet.count())await page.locator('[data-anatomy-study-toggle]').click();
  const card=sheet.locator('[data-anatomy-study-reflection="'+id+'"]');
  await expect(card).toContainText(writing);await expect(card).toHaveAccessibleName(await card.locator('h5').innerText());
  const resume=card.locator('[data-anatomy-resume-reflection="'+id+'"]');
  await resume.focus();await resume.press('Enter');await expect(sheet).toHaveCount(0);
}
async function openSavedPreview(page:Page,writing:string){
  const preview=page.locator('[data-anatomy-feedback-saved-writing]');
  await expect(preview).toHaveCount(1);await expect(preview).toBeVisible();
  if(await preview.getAttribute('open')===null){const summary=preview.locator('summary');await summary.focus();await summary.press('Enter');}
  const text=preview.locator('[data-anatomy-feedback-saved-text]');
  await expect(text).toBeVisible();await expect(text).toHaveText(writing);await expect(text).toHaveAttribute('dir','auto');
  await expect(page.locator('#anatomy-feedback-explanation')).toHaveCount(0);
  return preview;
}
async function checkLimit(page:Page,editor:Locator,field:string,descriptionId:string,writing:string){
  const counter=page.locator('[data-anatomy-motion-writing-limit="'+field+'"]');
  await expect(editor).toHaveAttribute('maxlength','1200');await expect(editor).toHaveAttribute('dir','auto');
  expect((await editor.getAttribute('aria-describedby'))?.split(/\s+/)).toContain(descriptionId);
  await expect(counter).toHaveAttribute('id',descriptionId);await expect(editor).toHaveAccessibleDescription(/1200/);
  await editor.fill('x'.repeat(1200));await expect(counter).toContainText('1200');
  await editor.press('End');await page.keyboard.insertText('Extra');await expect(editor).toHaveValue('x'.repeat(1200));
  expect((await state(page))._systemsMotionLearning.exercise[field]).toHaveLength(1200);
  await editor.fill(writing);await expect(editor).toHaveValue(writing);
  await expect(counter).toContainText(String(writing.length));await expect(counter).toContainText('1200');
}
async function readingFonts(locator:Locator){
  const fonts=await locator.locator('h4,p,label,legend,button,summary,textarea,span,bdi').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length>0).map(element=>({tag:element.tagName,text:element.textContent?.trim().slice(0,60),size:parseFloat(getComputedStyle(element).fontSize)})));
  expect(fonts.length).toBeGreaterThan(0);for(const font of fonts)expect(font.size,'Larger text: '+font.tag+' '+font.text).toBeGreaterThanOrEqual(17);
  return fonts;
}

test('Activity writing stays saved through keyboard practice, activity switches and pre-reveal feedback review',async({page})=>{
  test.setTimeout(420000);
  const record:any={errors:[],scans:[]};validation.activityWriting=record;
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});
  const warm='My saved warming explanation: feedback reduces the temperature disturbance. شرح محفوظ للتدفئة.';
  const cool='My saved cooling explanation: the corrective response opposes the temperature drop. شرح محفوظ للتبريد.';
  const explanation='The local change reduces effective muscle force. I connect that change to oxygen delivery and the pathway consequence. شرح محفوظ للحركة.';
  const comparison='The shared chain still depends on delivery. The changed structure acts at a different point in the second situation. مقارنة محفوظة.';
  const now=Date.now();
  await harness.mount(page,{anatomy:{
    _activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,selectedStructure:'ribs',_bodyView3d:false,_startHereDismissed:true,
    _showSystemsMotion:true,_systemsMotionScenario:'exercise',_systemsMotionStep:0,_systemsMotionPerturbation:false,
    _systemsMotionLearning:{exercise:{prediction:'',explanation:'',transfer:null,transferExplanation:'',selfReview:false},meal:{prediction:'same',explanation:'My other meal explanation stays saved.',transfer:2,transferExplanation:'My other meal comparison.',selfReview:true}},
    _structureNotes:{ribs:'My structure note remains.'},_structureConfidence:{ribs:'learning'},_confidenceAt:{ribs:now},_retrievalEvidence:{ribs:{attempts:4,correct:2}},
    quizIdx:4,quizScore:7,quizFeedback:null,_quizAttempts:9,
    _flashcardScope:'review',_flashcardDeck:reviewDeck,_flashcardDeckContext:reviewContext,_flashcardRoundContext:reviewContext,_flashcardRoundRated:{ribs:true},_flashcardIdx:1,_flashcardFlipped:true,
    _flashcardRounds:{'skeletal:3:review':{context:reviewContext,deckIds:reviewDeck,index:1,rated:{ribs:true}}},
    _aiInput:'My unrelated Tutor draft stays saved.',_aiDraftContext:{version:1,systemId:'circulatory',structureId:'heart',band:'g912'},_aiDraftRevision:4,_aiConversationBand:'g912',_aiMessages:[{role:'user',text:'My previous Tutor question.',systemId:'circulatory',structureId:'heart',band:'g912'}],
    _feedbackExperiment:{direction:'warm',context:'temperature-feedback-v1|warm',token:'saved-warm-writing-attempt',prediction:'',revealed:false,explanation:warm,sessions:{cool:{prediction:'disabled',revealed:true,explanation:cool}}},
    homeoHunt:{tempC:37,pH:7.4,glucose:90,hypothesis:'Keep reference ranges separate from model comparison.',explanation:'My reference-range writing remains.',understood:true,log:[]}
  }},undefined,{expectCanvas:false});
  await frame(page);const initial=await state(page),work=protectedWork(initial);record.initialState=initial;
  const motion=page.locator('[data-systems-motion-scenario="exercise"]');
  await expect(motion).toBeVisible();await expect(motion.locator('[data-anatomy-motion-reflection]')).toHaveCount(0);
  const apply=motion.locator('.anatomy-motion-whatif button');await apply.focus();await apply.press('Enter');
  const prediction=motion.locator('[data-anatomy-motion-prediction="exercise"]');await expect(prediction).toBeFocused();
  const radio=prediction.locator('input[value="less"]');await radio.focus();await radio.press('Space');await expect(radio).toBeChecked();
  const reveal=prediction.locator('[data-anatomy-motion-reveal]');await reveal.focus();await reveal.press('Enter');
  await expect(motion.locator('[data-systems-motion-impact]')).toBeFocused();
  await expect(motion.locator('[data-anatomy-motion-prediction-feedback]')).toBeVisible();
  const reflection=motion.locator('[data-anatomy-motion-reflection="exercise"]');await expect(reflection).toBeVisible();
  const editor=reflection.locator('#anatomy-motion-explanation'),transferEditor=reflection.locator('#anatomy-motion-transfer-explanation');
  await checkLimit(page,editor,'explanation','anatomy-motion-explanation-limit',explanation);
  const selfReview=reflection.locator('[data-anatomy-motion-self-review-toggle]');await selfReview.focus();await selfReview.press('Enter');
  await expect(selfReview).toHaveAttribute('aria-expanded','true');await expect(reflection.locator('#anatomy-motion-self-review')).toBeVisible();
  const wrong=reflection.locator('[data-anatomy-motion-transfer-option="0"]');await wrong.focus();await wrong.press('Enter');
  await expect(reflection.locator('[data-anatomy-motion-transfer-correct]')).toHaveAttribute('data-anatomy-motion-transfer-correct','false');
  const correct=reflection.locator('[data-anatomy-motion-transfer-option="1"]');await correct.focus();await correct.press('Enter');
  await expect(correct).toHaveAttribute('aria-pressed','true');await expect(reflection.locator('[data-anatomy-motion-transfer-correct]')).toHaveAttribute('data-anatomy-motion-transfer-correct','true');
  await checkLimit(page,transferEditor,'transferExplanation','anatomy-motion-transfer-limit',comparison);
  const completed=await state(page);record.completedMotion=completed;
  expect(completed._systemsMotionLearning.exercise).toMatchObject({prediction:'less',explanation,transfer:1,transferExplanation:comparison,selfReview:true});
  expect(protectedWork(completed)).toEqual(work);

  // Use the actual activity control, then return to this writing through its named study-sheet card.
  await page.locator('#anatomy-mobile-activity').selectOption('homeoHunt');
  const experiment=page.locator('[data-anatomy-feedback-experiment]');await expect(experiment).toBeVisible();
  let preview=await openSavedPreview(page,warm);await expect(preview.locator('summary')).toHaveText('My saved explanation');expect(protectedWork(await state(page))).toEqual(work);
  const feedbackRadio=experiment.locator('input[name="anatomy-feedback-prediction"][value="active"]');
  await feedbackRadio.focus();await feedbackRadio.press('Space');await expect(feedbackRadio).toBeChecked();
  const run=experiment.locator('[data-anatomy-run-feedback]');await run.focus();await run.press('Enter');
  await expect(experiment.locator('[data-anatomy-feedback-results]')).toBeFocused();await expect(preview).toHaveCount(0);
  await expect(experiment.locator('#anatomy-feedback-explanation')).toHaveValue(warm);
  await run.focus();await run.press('Enter');await expect(experiment.locator('[data-anatomy-feedback-prediction]')).toBeFocused();
  preview=await openSavedPreview(page,warm);expect(protectedWork(await state(page))).toEqual(work);
  await resumeSaved(page,'exercise',explanation);await expect(editor).toBeFocused();await expect(editor).toHaveValue(explanation);await expect(transferEditor).toHaveValue(comparison);
  expect((await state(page))._systemsMotionLearning.exercise).toEqual(completed._systemsMotionLearning.exercise);
  expect(protectedWork(await state(page))).toEqual(work);
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  const motionScope=['[data-anatomy-motion-learning="exercise"]','[data-anatomy-motion-reflection="exercise"]'];
  const previewScope=['[data-anatomy-feedback-saved-writing]','[data-anatomy-feedback-prediction]'];
  for(const width of [320,768,1440])for(const theme of themes){
    await scan(page,record,width,theme,'en','motion',motionScope);
    if(width===320&&theme==='light')await capture(page,motion.locator('[data-anatomy-motion-learning="exercise"]'),out+'/activity-phone.png');
    if(width===320&&theme==='dark')await capture(page,reflection,out+'/activity-dark.png');
  }
  await resumeSaved(page,'homeostasis-warm',warm);await expect(experiment.locator('#anatomy-feedback-title')).toBeFocused();preview=await openSavedPreview(page,warm);
  for(const width of [320,768,1440])for(const theme of themes){
    await scan(page,record,width,theme,'en','saved-feedback',previewScope);
    if(width===320&&theme==='light')await capture(page,preview,out+'/saved-writing-phone.png');
  }
  const arabic=await installArabic(page);preview=await openSavedPreview(page,warm);
  await expect(preview.locator('summary')).toHaveText(arabic.feedback_saved_explanation_title);
  await expect(preview.locator('p').first()).toHaveText(arabic.feedback_saved_explanation_help);
  record.previewReadingFonts=await readingFonts(preview);
  for(const theme of themes)await scan(page,record,320,theme,'ar-larger','saved-feedback',previewScope);
  await resumeSaved(page,'exercise',explanation);await expect(editor).toBeFocused();
  await expect(reflection.locator('#anatomy-motion-reflection-title')).toHaveText(arabic.motion_reflection_title);
  await expect(selfReview).toHaveText(arabic.motion_check_explanation);
  for(const [field,length] of [['explanation',explanation.length],['transferExplanation',comparison.length]] as const){
    await expect(reflection.locator('[data-anatomy-motion-writing-limit="'+field+'"]')).toHaveText(arabic.motion_writing_limit.replace('{count}',String(length)).replace('{limit}','1200'));
  }
  record.predictionReadingFonts=await readingFonts(motion.locator('[data-anatomy-motion-learning="exercise"]'));
  record.reflectionReadingFonts=await readingFonts(reflection);
  for(const theme of themes){
    await scan(page,record,320,theme,'ar-larger','motion',motionScope);
    if(theme==='light')await capture(page,reflection,out+'/activity-arabic.png');
  }
  record.finalState=await state(page);expect(protectedWork(record.finalState)).toEqual(work);
  expect(record.finalState._systemsMotionLearning.exercise).toEqual(completed._systemsMotionLearning.exercise);
  expect(record.scans).toHaveLength(24);expect(record.scans.flatMap((scenario:any)=>scenario.violations)).toEqual([]);expect(record.errors).toEqual([]);
});
