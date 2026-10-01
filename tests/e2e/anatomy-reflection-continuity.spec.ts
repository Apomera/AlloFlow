import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_REFLECTION_QA_OUT||'reports/anatomy-reflection-continuity-2026-09-30';
const validation:Record<string,any>={};
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const themes=['light','dark','contrast'];
const skeletalIds=['skull','mandible','clavicle','sternum','ribs','scapula','humerus','radius','ulna','carpals','vertebral','pelvis','femur','patella','tibia','fibula','tarsals','sacrum','hyoid','atlas_axis','metatarsals','metacarpals','scaphoid_bone'];
const cardContext=(scope:string)=>'skeletal:3:'+scope+':'+skeletalIds.join(',');
const savedAllRound={context:cardContext('all'),deckIds:skeletalIds,index:8,rated:{ulna:true}};

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>{await writeFile(out+'/reflection-browser-validation.json',JSON.stringify(validation,null,2));await harness.stop();});
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
async function scan(page:Page,record:any,width:number,theme:string,locale:string,selectors:string[]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(theme=>{document.body.className=theme==='light'?'':'theme-'+theme;},theme);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async selectors=>{
    const result=await (window as any).axe.run({include:selectors.map(selector=>[selector])},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
    return result.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  },selectors);
  record.scans.push({width,theme,locale,dimensions,violations});
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
function protectedWork(s:any){return {
  notes:s._structureNotes,confidence:s._structureConfidence,confidenceAt:s._confidenceAt,evidence:s._retrievalEvidence,
  tutorDraft:s._aiInput,tutorContext:s._aiDraftContext,tutorRevision:s._aiDraftRevision,tutorMessages:s._aiMessages,tutorBand:s._aiConversationBand,
  quizIndex:s.quizIdx,quizScore:s.quizScore,quizFeedback:s.quizFeedback,quizAttempts:s._quizAttempts,
  cards:{scope:s._flashcardScope,index:s._flashcardIdx,deck:s._flashcardDeck,deckContext:s._flashcardDeckContext,roundContext:s._flashcardRoundContext,rated:s._flashcardRoundRated,flipped:s._flashcardFlipped,rounds:s._flashcardRounds}
};}
async function openSheet(page:Page){
  const sheet=page.locator('[data-anatomy-study-sheet]');
  if(!await sheet.count())await page.locator('[data-anatomy-study-toggle]').click();
  await expect(sheet).toBeVisible();return sheet;
}
async function namedCard(sheet:Locator,id:string,writing:string){
  const card=sheet.locator('[data-anatomy-study-reflection="'+id+'"]');
  await expect(card).toBeVisible();await expect(card).toContainText(writing);
  await expect(card).toHaveAccessibleName(await card.locator('h5').innerText());
  return card;
}
async function resumeFeedback(page:Page,direction:string,writing:string,revealed:boolean){
  const sheet=await openSheet(page),card=await namedCard(sheet,'homeostasis-'+direction,writing);
  await expect(card).toHaveAttribute('data-anatomy-study-reflection-direction',direction);
  const resume=card.locator('[data-anatomy-resume-reflection="homeostasis-'+direction+'"]');
  await resume.focus();await resume.press('Enter');await expect(sheet).toHaveCount(0);
  const experiment=page.locator('[data-anatomy-feedback-experiment]');
  await expect(experiment).toHaveAttribute('data-anatomy-feedback-direction',direction);
  await expect(page.locator('[data-anatomy-tool]')).toHaveAttribute('data-anatomy-tab','homeoHunt');
  const editor=experiment.locator('#anatomy-feedback-explanation');
  if(revealed){await expect(editor).toBeFocused();await expect(editor).toHaveValue(writing);}
  else{
    await expect(experiment.locator('#anatomy-feedback-title')).toBeFocused();
    await experiment.locator('input[name="anatomy-feedback-prediction"][value="active"]').check();
    await experiment.locator('[data-anatomy-run-feedback]').click();
    await expect(experiment.locator('[data-anatomy-feedback-results]')).toBeFocused();await expect(editor).toHaveValue(writing);
  }
  await expect(editor).toHaveAttribute('dir','auto');return editor;
}
async function resumeMotion(page:Page,writing:string,comparison:string){
  const sheet=await openSheet(page),card=await namedCard(sheet,'exercise',writing);
  const resume=card.locator('[data-anatomy-resume-reflection="exercise"]');
  await resume.focus();await resume.press('Enter');await expect(sheet).toHaveCount(0);
  const reflection=page.locator('[data-anatomy-motion-reflection="exercise"]');
  await expect(reflection).toBeVisible();
  const editor=reflection.locator('[data-anatomy-motion-explanation]'),transfer=reflection.locator('#anatomy-motion-transfer-explanation');
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue(writing);await expect(transfer).toHaveValue(comparison);
  await expect(editor).toHaveAttribute('dir','auto');await expect(transfer).toHaveAttribute('dir','auto');
  expect((await state(page))._systemsMotionScenario).toBe('exercise');return {reflection,editor,transfer};
}

test('Saved activity reflections resume their exact context, preserve other learning and round-trip both temperature directions',async({page})=>{
  test.setTimeout(300000);
  const record:any={errors:[],scans:[]};validation.reflections=record;
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});
  const warm='Warm: the corrective response falls as the temperature difference gets smaller. شرح محفوظ للتدفئة.';
  const cool='Cool: the response opposes the temperature drop and approaches the starting value. شرح محفوظ للتبريد.';
  const unassigned='Earlier temperature writing has no recorded direction. محفوظ من سجل سابق.';
  const explanation='Exercise connects muscle force with oxygen transport and gas exchange.';
  const comparison='Both situations need delivery; the structural change affects a different part of the chain.';
  const revisedExplanation=explanation+'\nI connect the local structural effect to another system.';
  const revisedComparison=comparison+'\nI compare the shared transport function.';
  const now=Date.now(),deck=['ribs','skull'],context=cardContext('review');
  await harness.mount(page,{anatomy:{
    _activeTab:'flashcards',system:'skeletal',view:'anterior',complexity:3,_bodyView3d:false,_startHereDismissed:true,
    selectedStructure:'ribs',_flashcardScope:'review',_flashcardDeck:deck,_flashcardDeckContext:context,
    _flashcardRoundContext:context,_flashcardRoundRated:{},_flashcardIdx:0,_flashcardFlipped:false,
    _flashcardRounds:{'skeletal:3:all':savedAllRound,'skeletal:3:review':{context,deckIds:deck,index:0,rated:{}}},
    _structureNotes:{ribs:'My structure explanation stays saved.'},_structureConfidence:{ribs:'practice',skull:'learning'},
    _confidenceAt:{ribs:now,skull:now-3*86400000},_retrievalEvidence:{ribs:{attempts:4,correct:2}},
    quizIdx:4,quizScore:7,quizFeedback:null,_quizAttempts:9,
    _aiInput:'How does circulation support exercise?',_aiDraftContext:{version:1,systemId:'circulatory',structureId:'heart',band:'g912'},_aiDraftRevision:3,_aiConversationBand:'g912',
    _aiMessages:[{role:'user',text:'My earlier question.',systemId:'circulatory',structureId:'heart',band:'g912'}],
    _systemsMotionLearning:{exercise:{prediction:'less',explanation,transfer:1,transferExplanation:comparison,selfReview:true},fluid:{explanation:'My separate fluid-balance explanation.',transferExplanation:'My separate fluid comparison.'}},
    _feedbackExperiment:{direction:'warm',context:'temperature-feedback-v1|warm',token:'saved-warming-attempt',prediction:'active',revealed:true,explanation:warm,unassignedExplanation:unassigned,sessions:{cool:{prediction:'active',revealed:true,explanation:cool}}},
    homeoHunt:{tempC:38,pH:7.4,glucose:90,hypothesis:'Keep each measurement context separate.',explanation:'Reference ranges need context.',understood:true,log:[]}
  }},undefined,{expectCanvas:false});
  await frame(page);
  const cards=page.locator('[data-anatomy-flashcards]'),card=cards.locator('[data-anatomy-recall-card]');
  await expect(cards).toHaveAttribute('data-anatomy-current-card','ribs');await card.focus();await card.press('Space');await card.press('2');
  await cards.locator('[data-anatomy-card-next]').click();await expect(cards).toHaveAttribute('data-anatomy-current-card','skull');
  await card.press('Space');await expect(card).toHaveAttribute('data-anatomy-card-revealed','true');
  const inProgress=await state(page),originalWork=protectedWork(inProgress);record.inProgress=inProgress;
  let sheet=await openSheet(page);
  await expect(sheet.locator('[data-anatomy-study-reflection]')).toHaveCount(5);
  const warmCard=await namedCard(sheet,'homeostasis-warm',warm),coolCard=await namedCard(sheet,'homeostasis-cool',cool);
  await expect(warmCard.locator('h5')).toContainText('Brief warming');await expect(coolCard.locator('h5')).toContainText('Brief cooling');
  const unknownCard=await namedCard(sheet,'homeostasis-unassigned',unassigned);
  await expect(unknownCard).toHaveAttribute('data-anatomy-study-reflection-direction','unassigned');
  for(const direction of ['warm','cool']){
    const assign=unknownCard.locator('[data-anatomy-resume-reflection="homeostasis-unassigned-'+direction+'"]');
    await assign.focus();await assign.press('Enter');await expect(sheet).toBeVisible();
    await expect(sheet.locator('[data-anatomy-study-record-notice]')).toBeFocused();
    await namedCard(sheet,'homeostasis-'+direction,direction==='warm'?warm:cool);
    await namedCard(sheet,'homeostasis-unassigned',unassigned);
    expect(protectedWork(await state(page))).toEqual(originalWork);
  }
  await resumeFeedback(page,'warm',warm,true);expect(protectedWork(await state(page))).toEqual(originalWork);
  await resumeFeedback(page,'cool',cool,true);expect(protectedWork(await state(page))).toEqual(originalWork);
  const motion=await resumeMotion(page,explanation,comparison);
  expect(protectedWork(await state(page))).toEqual(originalWork);
  await motion.editor.fill(revisedExplanation);await motion.transfer.fill(revisedComparison);
  expect((await state(page))._systemsMotionLearning.fluid.explanation).toBe('My separate fluid-balance explanation.');
  expect(protectedWork(await state(page))).toEqual(originalWork);

  // Download the actual portable file, then import it in a fresh local workspace with different current Quiz/Tutor work.
  sheet=await openSheet(page);
  const downloadEvent=page.waitForEvent('download');await sheet.locator('[data-anatomy-study-export="json"]').click();
  const download=await downloadEvent,portableText=await readFile((await download.path())!,'utf8'),packet=JSON.parse(portableText);record.exportedPacket=packet;
  expect(packet.feedbackNotes.map((row:any)=>row.direction??'unassigned').sort()).toEqual(['cool','unassigned','warm']);
  for(const [direction,writing] of [['warm',warm],['cool',cool],[null,unassigned]])expect(packet.feedbackNotes.find((row:any)=>row.direction===direction)?.explanation).toBe(writing);
  expect(packet.learningNotes.filter((row:any)=>row.id==='homeostasis')).toHaveLength(1);
  expect(packet.learningNotes.find((row:any)=>row.id==='exercise')).toMatchObject({explanation:revisedExplanation,transferExplanation:revisedComparison});
  expect(portableText).not.toContain('How does circulation support exercise?');expect(packet).not.toHaveProperty('quizScore');
  await harness.destroy(page);
  await harness.mount(page,{anatomy:{
    _activeTab:'quiz',quizMode:true,system:'skeletal',view:'posterior',complexity:3,_bodyView3d:false,_startHereDismissed:true,
    quizIdx:1,quizScore:11,quizFeedback:null,_quizAttempts:2,
    _aiInput:'My fresh local Tutor draft remains.',_aiDraftContext:{version:1,systemId:'circulatory',structureId:'heart',band:'g912'},_aiDraftRevision:8,_aiConversationBand:'g912',_aiMessages:[],
    _flashcardScope:'all',_flashcardDeck:skeletalIds,_flashcardDeckContext:cardContext('all'),_flashcardRoundContext:cardContext('all'),_flashcardRoundRated:{ulna:true},_flashcardIdx:8,_flashcardFlipped:true,_flashcardRounds:{'skeletal:3:all':savedAllRound},
    _feedbackExperiment:{direction:'cool',context:'temperature-feedback-v1|cool',token:'fresh-cooling-attempt',prediction:'disabled',revealed:false,explanation:'',sessions:{}}
  }},undefined,{expectCanvas:false});
  await frame(page);const fresh=await state(page);record.freshBeforeImport=fresh;
  sheet=await openSheet(page);
  await sheet.locator('[data-anatomy-study-import] > summary').click();
  const file=sheet.locator('#anatomy-study-import-file');await file.focus();
  await file.setInputFiles({name:'activity-reflections.json',mimeType:'application/json',buffer:Buffer.from(portableText)});
  await expect(sheet.locator('[data-anatomy-study-import-preview-title]')).toBeFocused();
  await sheet.locator('[data-anatomy-study-import-merge]').click();
  await expect(sheet.locator('[data-anatomy-study-record-notice]')).toBeFocused();
  const imported=await state(page);record.importedState=imported;
  for(const key of ['quizIdx','quizScore','quizFeedback','_quizAttempts','_aiInput','_aiDraftContext','_aiDraftRevision','_aiMessages','_flashcardRounds','_flashcardDeck','_flashcardIdx','_flashcardFlipped'])expect(imported[key]).toEqual(fresh[key]);
  expect(imported._feedbackExperiment).toMatchObject({direction:'cool',token:'fresh-cooling-attempt',prediction:'disabled',revealed:false});
  for(const [id,writing] of [['homeostasis-warm',warm],['homeostasis-cool',cool],['homeostasis-unassigned',unassigned],['exercise',revisedExplanation]])await namedCard(sheet,id,writing);
  const importedWork=protectedWork(imported);
  await resumeFeedback(page,'warm',warm,false);expect(protectedWork(await state(page))).toEqual(importedWork);
  await resumeFeedback(page,'cool',cool,false);expect(protectedWork(await state(page))).toEqual(importedWork);
  sheet=await openSheet(page);record.beforeScans=await state(page);
  const reflectionRegion=sheet.locator('[data-anatomy-study-reflections]');
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const width of [320,768,1440])for(const theme of themes){
    await scan(page,record,width,theme,'en-sheet',['[data-anatomy-study-reflections]','[data-anatomy-study-toggle]']);
    if(width===320&&theme==='light')await capture(page,reflectionRegion,out+'/sheet-phone.png');
    if(width===320&&theme==='dark')await capture(page,reflectionRegion,out+'/sheet-dark.png');
  }
  const arabic=await installArabic(page);
  await expect(sheet.locator('[data-anatomy-study-reflection="homeostasis-warm"] h5')).toContainText(arabic.study_homeostasis_reflection);
  await expect(sheet.locator('[data-anatomy-study-reflection="homeostasis-warm"] h5')).toContainText(arabic.feedback_warming);
  await expect(sheet.locator('[data-anatomy-study-reflection="homeostasis-cool"] h5')).toContainText(arabic.feedback_cooling);
  await expect(sheet.locator('[data-anatomy-study-reflection="exercise"] h5')).toHaveText(arabic.study_flow_activity_exercise_title);
  record.sheetReadingFonts=await reflectionRegion.locator('p,span,button,h4,h5').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length>0).map(element=>({tag:element.tagName,size:parseFloat(getComputedStyle(element).fontSize)})));
  for(const font of record.sheetReadingFonts)expect(font.size).toBeGreaterThanOrEqual(17);
  await expect(sheet.locator('[data-anatomy-study-reflection="homeostasis-warm"] .anatomy-study-saved-text')).toHaveAttribute('dir','auto');
  for(const theme of themes){
    await scan(page,record,320,theme,'ar-larger-sheet',['[data-anatomy-study-reflections]','[data-anatomy-study-toggle]']);
    if(theme==='light')await capture(page,reflectionRegion,out+'/sheet-arabic.png');
  }
  const resumed=await resumeMotion(page,revisedExplanation,revisedComparison);
  await expect(resumed.reflection.locator('#anatomy-motion-reflection-title')).toHaveText(arabic.motion_reflection_title);
  record.motionReadingFonts=await resumed.reflection.locator('p,label,legend,button,textarea').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length>0).map(element=>({tag:element.tagName,size:parseFloat(getComputedStyle(element).fontSize)})));
  for(const font of record.motionReadingFonts)expect(font.size).toBeGreaterThanOrEqual(17);
  for(const theme of themes){
    await scan(page,record,320,theme,'ar-larger-motion',['[data-anatomy-motion-reflection="exercise"]']);
    if(theme==='light')await capture(page,resumed.reflection,out+'/resumed-motion.png');
  }
  record.finalState=await state(page);
  expect(protectedWork(record.finalState)).toEqual(importedWork);
  expect(record.finalState._systemsMotionLearning.exercise).toMatchObject({explanation:revisedExplanation,transferExplanation:revisedComparison});
  expect(record.scans).toHaveLength(15);expect(record.scans.flatMap((scenario:any)=>scenario.violations)).toEqual([]);expect(record.errors).toEqual([]);
});
