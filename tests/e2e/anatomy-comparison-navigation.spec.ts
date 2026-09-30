import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_COMPARISON_QA_OUT||'reports/anatomy-comparison-navigation-2026-09-30';
const validation:Record<string,any>={};
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const themes=['light','dark','contrast'];
const skeletalIds=['skull','mandible','clavicle','sternum','ribs','scapula','humerus','radius','ulna','carpals','vertebral','pelvis','femur','patella','tibia','fibula','tarsals','sacrum','hyoid','atlas_axis','metatarsals','metacarpals','scaphoid_bone'];
const cardContext='skeletal:3:review:'+skeletalIds.join(',');
const cardDeck=['femur','skull'];

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>{await writeFile(out+'/comparison-browser-validation.json',JSON.stringify(validation,null,2));await harness.stop();});
test.afterEach(async({page})=>harness.destroy(page));

const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
function practiceAttempts(s:any){return Object.values(s._retrievalEvidence||{}).reduce((total:number,evidence:any)=>total+(Number(evidence.attempts)||0),0);}
function cardWork(s:any){return {
  scope:s._flashcardScope,index:s._flashcardIdx,deck:s._flashcardDeck,deckContext:s._flashcardDeckContext,
  roundContext:s._flashcardRoundContext,rated:s._flashcardRoundRated,flipped:s._flashcardFlipped,
  rounds:s._flashcardRounds,notes:s._structureNotes,confidence:s._structureConfidence,confidenceAt:s._confidenceAt,evidence:s._retrievalEvidence
};}
async function captureTall(page:Page,locator:Locator,path:string){
  const width=page.viewportSize()!.width;
  const height=Math.ceil((await locator.boundingBox())!.height)+200;
  await page.setViewportSize({width,height:Math.max(1600,height)});
  try{
    await locator.evaluate(element=>{element.scrollIntoView({block:'start'});window.scrollBy(0,-100);});
    await locator.screenshot({path});
  }
  finally{await page.setViewportSize({width,height:1000});}
}
async function scan(page:Page,record:any,width:number,theme:string,locale:string){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(theme=>{document.body.className=theme==='light'?'':'theme-'+theme;},theme);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async()=>{
    const result=await (window as any).axe.run({include:[['[data-anatomy-comparison-panel]'],['[data-anatomy-compare-tray]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
    return result.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  });
  record.scans.push({width,theme,locale,dimensions,violations});
  expect(dimensions.scroll).toBeLessThanOrEqual(width);
}
async function installArabic(page:Page){
  const dict=JSON.parse(await readFile('lang/arabic.js','utf8'));
  await page.evaluate(dict=>{
    document.documentElement.dir='rtl';
    const ctx=(window as any).__ctx;
    ctx.t=(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback;
    ctx.updateMulti('anatomy',{_readingMode:true});
  },dict);
  return dict.stem.anatomy;
}

test('Comparison practice, pinned targets and study work remain clear through navigation',async({page})=>{
  test.setTimeout(300000);
  const record:any={errors:[],scans:[]};validation.comparison=record;
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:1000});
  const savedNote='My saved femur explanation',now=Date.now();
  await harness.mount(page,{anatomy:{
    _activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,_bodyView3d:false,_startHereDismissed:true,
    selectedStructure:'femur',_compareStructure:'tibia',
    _structureNotes:{femur:savedNote,skull:'My saved skull note'},_structureConfidence:{femur:'practice',skull:'learning'},
    _confidenceAt:{femur:now,skull:now},_retrievalEvidence:{skull:{attempts:3,correct:2}},
    _flashcardScope:'review',_flashcardDeck:cardDeck,_flashcardDeckContext:cardContext,
    _flashcardRoundContext:cardContext,_flashcardRoundRated:{},_flashcardIdx:0,_flashcardFlipped:false,
    _flashcardRounds:{'skeletal:3:review':{context:cardContext,deckIds:cardDeck,index:0,rated:{}}}
  }},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  const panel=page.locator('[data-anatomy-comparison-panel]');
  const tray=page.locator('[data-anatomy-compare-tray]');
  const heading=panel.locator('#anatomy-comparison-title');
  const check=panel.locator('[data-anatomy-compare-check]');
  const question=panel.locator('[data-anatomy-compare-question-title]');
  const feedback=panel.locator('[data-anatomy-compare-feedback]');
  const detail=page.locator('[data-anatomy-structure-detail]');
  const detailHeading=page.locator('#anatomy-structure-detail-title');
  const pin=page.locator('[data-anatomy-compare-pin]');
  await expect(panel).toHaveAttribute('data-anatomy-comparison-panel','femur|tibia');
  await expect(panel).toHaveAttribute('data-anatomy-comparison-context','skeletal:anterior:3');
  await expect(panel).toHaveAttribute('data-anatomy-comparison-revision',/^\d+$/);
  await expect(check).toHaveJSProperty('tagName','FIELDSET');
  await expect(check.locator('legend [data-anatomy-compare-question-title]')).toHaveCount(1);
  await expect(question).toHaveAttribute('tabindex','-1');
  await expect(check).toHaveAccessibleName('Which one does this?');
  await expect(check).toHaveAccessibleDescription(/Practice with the comparison above/);
  await expect(check.locator('[data-anatomy-compare-option]')).toHaveCount(2);

  await tray.locator('[data-anatomy-compare-jump]').focus();await tray.locator('[data-anatomy-compare-jump]').press('Enter');
  await expect(heading).toBeFocused();
  await panel.locator('[data-anatomy-compare-practice-jump]').focus();await panel.locator('[data-anatomy-compare-practice-jump]').press('Enter');
  await expect(question).toBeFocused();
  const initial=await state(page),key=await check.getAttribute('data-anatomy-compare-question');
  expect(key).toMatch(/^v2:g912:femur\|tibia:(femur|tibia)$/);
  const correctId=key!.split(':').at(-1)!,wrongId=correctId==='femur'?'tibia':'femur';
  record.question={key,correctId,wrongId,clue:await check.locator('[data-anatomy-compare-clue]').textContent()};
  await check.locator('[data-anatomy-compare-option="'+wrongId+'"]').focus();
  await check.locator('[data-anatomy-compare-option="'+wrongId+'"]').press('Enter');
  await expect(feedback).toBeFocused();await expect(feedback).toContainText('Comparison feedback');
  await expect(check).toHaveAttribute('data-anatomy-compare-check-state','miss');
  await expect(check.locator('[data-anatomy-compare-option="'+wrongId+'"]')).toContainText('Your answer');
  await expect(check.locator('[data-anatomy-compare-option="'+correctId+'"]')).toContainText('Correct answer');
  for(const option of await check.locator('[data-anatomy-compare-option]').all())await expect(option).toBeDisabled();
  const answered=await state(page);record.answered=answered;
  expect(practiceAttempts(answered)).toBe(practiceAttempts(initial)+1);
  expect(answered._structureNotes).toEqual(initial._structureNotes);
  const feedbackText=await feedback.textContent();
  await captureTall(page,check,out+'/feedback-phone.png');
  await feedback.locator('[data-anatomy-compare-review]').focus();await feedback.locator('[data-anatomy-compare-review]').press('Enter');
  await expect(heading).toBeFocused();expect(await state(page)).toEqual(answered);
  await panel.locator('[data-anatomy-compare-practice-jump]').click();await expect(question).toBeFocused();

  // Swap the two positions through actual target, pin and structure navigation controls.
  await tray.locator('[data-anatomy-compare-open]').click();await expect(detailHeading).toBeFocused();
  await expect(detail).toHaveAttribute('data-anatomy-structure-detail','tibia');await expect(panel).toHaveCount(0);
  await pin.click();await expect(tray).toHaveCount(0);
  await detail.locator('[data-anatomy-browse="previous"]').click();await expect(detail).toHaveAttribute('data-anatomy-structure-detail','patella');
  await detail.locator('[data-anatomy-browse="previous"]').click();await expect(detail).toHaveAttribute('data-anatomy-structure-detail','femur');
  await pin.click();await expect(tray).toBeVisible();
  await detail.locator('[data-anatomy-browse="next"]').click();await expect(detail).toHaveAttribute('data-anatomy-structure-detail','patella');
  await detail.locator('[data-anatomy-browse="next"]').click();await expect(detail).toHaveAttribute('data-anatomy-structure-detail','tibia');
  await expect(panel).toHaveAttribute('data-anatomy-comparison-panel','femur|tibia');
  await expect(check).toHaveAttribute('data-anatomy-compare-question',key!);await expect(check).toHaveAttribute('data-anatomy-compare-check-state','miss');
  expect(await check.locator('[data-anatomy-compare-clue]').textContent()).toBe(record.question.clue);
  expect(await feedback.textContent()).toBe(feedbackText);
  expect((await state(page))._retrievalEvidence).toEqual(answered._retrievalEvidence);

  await panel.locator('[data-anatomy-compare-clear]').click();await expect(pin).toBeFocused();
  await expect(pin).toHaveAttribute('data-anatomy-compare-pin','tibia');await expect(tray).toHaveCount(0);
  await pin.click();
  await detail.locator('[data-anatomy-browse="previous"]').click();await detail.locator('[data-anatomy-browse="previous"]').click();
  await expect(detail).toHaveAttribute('data-anatomy-structure-detail','femur');
  await page.locator('#anatomy-mobile-activity').selectOption('flashcards');
  const cards=page.locator('[data-anatomy-flashcards]'),card=cards.locator('[data-anatomy-recall-card]');
  await expect(cards).toHaveAttribute('data-anatomy-current-card','femur');
  await card.focus();if(await card.getAttribute('data-anatomy-card-revealed')==='false')await card.press('Space');
  await card.press('2');
  const cardNote=cards.locator('[data-anatomy-flashcard-note]');
  await cardNote.locator('summary').click();await cardNote.locator('textarea').fill('The femur supports weight and helps move the leg.');
  await expect.poll(async()=>(await state(page))._structureNotes.femur).toBe('The femur supports weight and helps move the leg.');
  await expect(tray).toContainText('Comparison is ready in Explore. Open it to review these structures together.');
  await expect(tray).not.toContainText('ready below the selected structure');
  await expect(tray.locator('[data-anatomy-compare-jump]')).toBeVisible();await expect(panel).toHaveCount(0);
  await tray.screenshot({path:out+'/tray-phone.png'});
  const beforeLeavingCards=await state(page);record.beforeLeavingCards=beforeLeavingCards;
  await tray.locator('[data-anatomy-compare-jump]').focus();await tray.locator('[data-anatomy-compare-jump]').press('Enter');
  await expect(heading).toBeFocused();await expect(page.locator('[data-anatomy-tool]')).toHaveAttribute('data-anatomy-tab','explore');
  expect(cardWork(await state(page))).toEqual(cardWork(beforeLeavingCards));

  // A target above the current level becomes visible at its actual minimum level in Explore.
  await page.locator('#anatomy-explorer-level').selectOption('1');
  await expect(tray.locator('[data-anatomy-compare-open]')).toHaveText('Open target in Explore');
  await tray.locator('[data-anatomy-compare-open]').focus();await tray.locator('[data-anatomy-compare-open]').press('Enter');
  await expect(detailHeading).toBeFocused();await expect(detail).toHaveAttribute('data-anatomy-structure-detail','tibia');
  await expect(page.locator('#anatomy-explorer-level')).toHaveValue('2');
  expect((await state(page)).complexity).toBe(2);
  expect(cardWork(await state(page))).toEqual(cardWork(beforeLeavingCards));
  await page.locator('#anatomy-explorer-level').selectOption('3');
  const search=page.locator('#anatomy-global-search-input');await search.fill('femur');await search.press('Enter');
  await expect(detail).toHaveAttribute('data-anatomy-structure-detail','femur');
  await tray.locator('[data-anatomy-compare-jump]').click();await expect(heading).toBeFocused();
  await expect(check).toHaveAttribute('data-anatomy-compare-check-state','miss');
  expect((await state(page))._retrievalEvidence).toEqual(answered._retrievalEvidence);

  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const width of [320,390,768,1440])for(const theme of themes){
    await scan(page,record,width,theme,'en');
    if(width===390&&theme==='light')await captureTall(page,panel,out+'/after-phone.png');
    if(width===390&&theme==='dark')await captureTall(page,panel,out+'/after-dark.png');
    if(width===1440&&theme==='light')await captureTall(page,panel,out+'/after-desktop.png');
  }
  const arabic=await installArabic(page);
  record.reading=await page.evaluate(()=>{
    const font=(selector:string)=>parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize);
    return {body:font('.anatomy-comparison-panel p'),note:font('.anatomy-comparison-note'),question:font('[data-anatomy-compare-question-title]'),button:font('[data-anatomy-compare-practice-jump]'),header:font('.anatomy-comparison-panel h5'),tray:font('[data-anatomy-compare-open]')};
  });
  for(const size of Object.values(record.reading))expect(Number(size)).toBeGreaterThanOrEqual(17);
  await expect(panel.locator('[data-anatomy-compare-practice-jump]')).toHaveText(arabic.compare_nav_practice);
  await expect(feedback.locator('[data-anatomy-compare-review]')).toHaveText(arabic.compare_nav_review);
  await expect(tray.locator('[data-anatomy-compare-open]')).toHaveText(arabic.compare_nav_open_target);
  await expect(check).toHaveAccessibleName(arabic.compare_ref_question_title);
  await panel.locator('[data-anatomy-compare-practice-jump]').click();await expect(question).toBeFocused();
  await feedback.locator('[data-anatomy-compare-review]').click();await expect(heading).toBeFocused();
  for(const theme of themes){
    await scan(page,record,320,theme,'ar-larger');
    if(theme==='light')await captureTall(page,panel,out+'/after-arabic.png');
  }
  record.finalState=await state(page);
  expect(record.finalState._retrievalEvidence).toEqual(answered._retrievalEvidence);
  expect(cardWork(record.finalState)).toEqual(cardWork(beforeLeavingCards));
  expect(record.scans).toHaveLength(15);
  expect(record.scans.flatMap((scenario:any)=>scenario.violations)).toEqual([]);
  expect(record.errors).toEqual([]);
});
