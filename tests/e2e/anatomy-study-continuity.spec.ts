import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_STUDY_QA_OUT||'reports/anatomy-flashcard-continuity-2026-09-30';
const validation:Record<string,any>={};
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const widths=[320,390,768,1440];
const themes=['light','dark','contrast'];
const skeletalIds=['skull','mandible','clavicle','sternum','ribs','scapula','humerus','radius','ulna','carpals','vertebral','pelvis','femur','patella','tibia','fibula','tarsals','sacrum','hyoid','atlas_axis','metatarsals','metacarpals','scaphoid_bone'];
const context=(scope:string)=>'skeletal:3:'+scope+':'+skeletalIds.join(',');
const savedAllRound={context:context('all'),deckIds:skeletalIds,index:8,rated:{ulna:true}};

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0,mode:'serial'});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>{await writeFile(out+'/study-browser-validation.json',JSON.stringify(validation,null,2));await harness.stop();});
test.afterEach(async({page})=>harness.destroy(page));

const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
async function frame(page:Page){await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});}
async function scan(page:Page,record:any,width:number,theme:string,locale:string,selectors:string[]){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(theme=>{document.body.className=theme==='light'?'':'theme-'+theme;},theme);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async selectors=>{
    const result=await (window as any).axe.run({include:selectors.map(selector=>[selector])},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
    return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));
  },selectors);
  record.scans.push({width,theme,locale,dimensions,violations});
  expect(dimensions.scroll).toBeLessThanOrEqual(width);
}
async function installArabic(page:Page){
  const dict=JSON.parse(await readFile('lang/arabic.js','utf8'));
  await page.evaluate(dict=>{
    document.documentElement.dir='rtl';
    const ctx=(window as any).__ctx;
    ctx.t=(key:string,fallback:string)=>key.split('.').reduce((o:any,p:string)=>o?.[p],dict)||fallback;
    ctx.updateMulti('anatomy',{_readingMode:true});
  },dict);
  return dict.stem.anatomy;
}
async function openCardNote(panel:Locator){
  const details=panel.locator('[data-anatomy-flashcard-note]');
  if(!await details.evaluate(element=>(element as HTMLDetailsElement).open))await details.locator('summary').click();
  return details.locator('textarea');
}
// Revisions can advance when locating a card; its place and saved work must remain identical.
function cardWork(s:any){return {
  scope:s._flashcardScope,index:s._flashcardIdx,deck:s._flashcardDeck,deckContext:s._flashcardDeckContext,
  roundContext:s._flashcardRoundContext,rated:s._flashcardRoundRated,flipped:s._flashcardFlipped,
  notes:s._structureNotes,confidence:s._structureConfidence,confidenceAt:s._confidenceAt,
  evidence:s._retrievalEvidence,rounds:s._flashcardRounds
};}
function expectClean(record:any){
  expect(record.scans).toHaveLength(15);
  expect(record.scans.flatMap((scenario:any)=>scenario.violations)).toEqual([]);
  expect(record.errors).toEqual([]);
}

test('Flashcards preserve recall, ratings and notes through the atlas and keyboard navigation',async({page})=>{
  test.setTimeout(300000);
  const record:any={errors:[],scans:[]};validation.flashcards=record;
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:1000});
  const reviewContext=context('review'),deck=['ribs','skull','femur'];
  await harness.mount(page,{anatomy:{
    _activeTab:'flashcards',system:'skeletal',view:'anterior',complexity:3,_bodyView3d:false,_startHereDismissed:true,
    selectedStructure:'ribs',_flashcardScope:'review',_flashcardDeck:deck,_flashcardDeckContext:reviewContext,
    _flashcardRoundContext:reviewContext,_flashcardRoundRated:{femur:true},_flashcardIdx:0,_flashcardFlipped:false,
    _flashcardRounds:{'skeletal:3:all':savedAllRound,'skeletal:3:review':{context:reviewContext,deckIds:deck,index:0,rated:{femur:true}}},
    _structureNotes:{ribs:'Ribs protect the chest organs.',femur:'My saved femur note'},
    _structureConfidence:{ribs:'practice',femur:'mastered'},_confidenceAt:{ribs:Date.now(),femur:Date.now()},
    _retrievalEvidence:{ribs:{attempts:3,correct:2}}
  }},undefined,{expectCanvas:false});
  await frame(page);
  const panel=page.locator('[data-anatomy-flashcards]');
  const card=panel.locator('[data-anatomy-recall-card]');
  const canvas=page.locator('[data-anatomy-model-shell] [data-anatomy-canvas]');
  const returnButton=page.locator('[data-anatomy-return-card]');
  const shell=page.locator('.anatomy-tool-shell');
  await expect(panel).toHaveAttribute('data-anatomy-current-card','ribs');
  await expect(panel).toHaveAttribute('data-anatomy-card-context',reviewContext);
  await expect(card).toHaveAttribute('data-anatomy-card-revealed','false');
  await expect(panel.locator('.anatomy-confidence')).toHaveCount(0);
  await card.focus();const beforeHidden=await state(page);
  for(const rating of ['1','2','3'])await card.press(rating);
  expect(cardWork(await state(page))).toEqual(cardWork(beforeHidden));
  await expect(card).toBeFocused();
  await card.press('Space');await expect(card).toBeFocused();
  await expect(panel).toHaveAttribute('data-anatomy-card-flipped','true');
  for(const [key,rating] of [['1','practice'],['2','learning'],['3','mastered']]){
    await card.press(key);
    await expect.poll(async()=>(await state(page))._structureConfidence.ribs).toBe(rating);
    await expect(card).toBeFocused();
  }
  expect((await state(page))._flashcardRoundRated).toEqual({femur:true,ribs:true});
  const note=await openCardNote(panel);
  await note.fill('Ribs protect the lungs and heart. ملاحظتي');
  await expect.poll(async()=>(await state(page))._structureNotes.ribs).toBe('Ribs protect the lungs and heart. ملاحظتي');
  await panel.screenshot({path:out+'/cards-phone.png'});
  const beforeDiagram=await state(page);record.beforeDiagram=beforeDiagram;
  await panel.locator('[data-anatomy-locate-card]').focus();
  await panel.locator('[data-anatomy-locate-card]').press('Enter');
  await expect(canvas).toBeFocused();
  expect(cardWork(await state(page))).toEqual(cardWork(beforeDiagram));
  await expect(returnButton).toHaveAccessibleName(/^Return to the Ribs\b.*flashcard$/i);
  await returnButton.focus();await returnButton.press('Enter');await expect(card).toBeFocused();
  expect(cardWork(await state(page))).toEqual(cardWork(beforeDiagram));
  await panel.locator('[data-anatomy-locate-card]').click();await expect(canvas).toBeFocused();
  await page.locator('[data-anatomy-model-focus-toggle]').click();
  await expect(shell).toHaveAttribute('data-anatomy-model-focus','true');
  await page.locator('[data-anatomy-model-shell]').screenshot({path:out+'/cards-diagram-phone.png'});
  await returnButton.click();await expect(card).toBeFocused();
  await expect(shell).toHaveAttribute('data-anatomy-model-focus','false');
  expect(cardWork(await state(page))).toEqual(cardWork(beforeDiagram));
  expect((await state(page))._anatomyModelFocus).toBe(false);

  await panel.locator('[data-anatomy-card-next]').focus();await panel.locator('[data-anatomy-card-next]').press('Enter');
  await expect(panel).toHaveAttribute('data-anatomy-current-card','skull');await expect(card).toBeFocused();
  await expect(card).toHaveAttribute('data-anatomy-card-revealed','false');
  const beforeSecondHidden=await state(page);await card.press('3');expect(cardWork(await state(page))).toEqual(cardWork(beforeSecondHidden));
  await card.press('Space');await expect(card).toHaveAttribute('data-anatomy-card-revealed','true');await expect(card).toBeFocused();
  await card.press('Space');await expect(card).toHaveAttribute('data-anatomy-card-revealed','false');await expect(card).toBeFocused();
  await card.press('ArrowRight');await expect(panel).toHaveAttribute('data-anatomy-current-card','femur');await expect(card).toBeFocused();
  await card.press('ArrowLeft');await expect(panel).toHaveAttribute('data-anatomy-current-card','skull');await expect(card).toBeFocused();
  await card.press('ArrowLeft');await expect(panel).toHaveAttribute('data-anatomy-current-card','ribs');await expect(card).toBeFocused();
  await card.press('Space');await expect(card).toHaveAttribute('data-anatomy-card-revealed','true');
  await expect(await openCardNote(panel)).toHaveValue('Ribs protect the lungs and heart. ملاحظتي');
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const width of widths)for(const theme of themes){
    await scan(page,record,width,theme,'en',['[data-anatomy-flashcards]','[data-anatomy-return-card]']);
    if(width===390&&theme==='dark')await panel.screenshot({path:out+'/cards-dark.png'});
  }
  const arabic=await installArabic(page);
  await expect(panel.locator('[data-anatomy-locate-card]')).toHaveText(arabic.locate_flashcard);
  await card.focus();const beforeArabic=await state(page);
  await card.press('ArrowLeft');await expect(card).toBeFocused();
  await expect(panel).toHaveAttribute('data-anatomy-current-card',deck[(beforeArabic._flashcardIdx+1)%deck.length]);
  await card.press('Space');await expect(card).toHaveAttribute('data-anatomy-card-revealed','true');
  await openCardNote(panel);
  record.readingFonts=await panel.locator('button,[data-anatomy-note-context="flashcard"] :is(label,textarea)').evaluateAll(elements=>elements.map(element=>({tag:element.tagName,text:element.textContent?.trim().slice(0,70),size:parseFloat(getComputedStyle(element).fontSize)})));
  for(const font of record.readingFonts)expect(font.size).toBeGreaterThanOrEqual(17);
  for(const theme of themes){
    await scan(page,record,320,theme,'ar-larger',['[data-anatomy-flashcards]','[data-anatomy-return-card]']);
    if(theme==='light')await panel.screenshot({path:out+'/cards-arabic.png'});
  }
  record.finalState=await state(page);
  expect(record.finalState._structureNotes).toEqual(beforeDiagram._structureNotes);
  expect(record.finalState._structureConfidence).toEqual(beforeDiagram._structureConfidence);
  expect(record.finalState._retrievalEvidence).toEqual(beforeDiagram._retrievalEvidence);
  expect(record.finalState._flashcardRounds['skeletal:3:all']).toEqual(savedAllRound);
  expect(record.finalState._flashcardRoundRated).toEqual({femur:true,ribs:true});
  expectClean(record);
});

test('Search explains hidden matches, keeps the query and opens a fresh structure sequence',async({page})=>{
  test.setTimeout(300000);
  const record:any={errors:[],scans:[]};validation.search=record;
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:1000});
  const query='  skull  ',work={
    _structureNotes:{femur:'My saved femur explanation'},_structureConfidence:{femur:'learning'},
    _confidenceAt:{femur:Date.now()},_retrievalEvidence:{femur:{attempts:2,correct:1}},
    _flashcardRounds:{'skeletal:3:all':savedAllRound}
  };
  await harness.mount(page,{anatomy:{
    _activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,_bodyView3d:false,_startHereDismissed:true,
    search:query,_anatomySearchDismissed:true,_studyFilter:'notes',_explorerListSort:'name',selectedStructure:null,
    _explorerBrowseIds:['femur','skull'],_explorerBrowseContext:'skeletal:anterior:3',_explorerBrowseSelected:'skull',...work
  }},undefined,{expectCanvas:false});
  await frame(page);
  const search=page.locator('#anatomy-global-search-input');
  const list=page.locator('[data-anatomy-structure-list]');
  const empty=page.locator('[data-anatomy-search-empty="filter"]');
  const matching=page.locator('[data-anatomy-search-show-matching]');
  const detail=page.locator('[data-anatomy-structure-detail]');
  const heading=page.locator('#anatomy-structure-detail-title');
  await expect(empty).toContainText('Matches for');await expect(empty).toContainText('None match the My notes study filter');
  await expect(matching).toHaveText('Show all matching structures');await expect(search).toHaveValue(query);
  await expect(list.locator('[data-anatomy-structure-option]')).toHaveCount(0);
  await list.screenshot({path:out+'/search-empty-phone.png'});
  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const width of [320,390,768])for(const theme of themes)await scan(page,record,width,theme,'en',['.anatomy-explorer-nav','[data-anatomy-structure-list]']);
  await page.setViewportSize({width:390,height:1000});
  await page.evaluate(()=>{document.body.className='';});
  await matching.focus();await matching.press('Enter');
  await expect(page.locator('#anatomy-structure-list-title')).toBeFocused();
  await expect(search).toHaveValue(query);await expect(empty).toHaveCount(0);
  await expect(list).toHaveAttribute('data-anatomy-browser-filter-active','all');
  await expect(list.locator('[data-anatomy-structure-option]')).toHaveCount(2);
  await expect(list.locator('[data-anatomy-structure-option="skull"]')).toBeVisible();
  record.recovered=await state(page);
  expect(record.recovered.search).toBe(query);
  for(const [key,value] of Object.entries(work))expect(record.recovered[key]).toEqual(value);

  // The global search is available from Cards too. Its result must clear an older filtered browse sequence.
  await page.locator('#anatomy-mobile-activity').selectOption('flashcards');
  await expect(page.locator('[data-anatomy-flashcards]')).toBeVisible();
  const beforeSearch=await state(page);record.beforeSearch=beforeSearch;
  expect(beforeSearch._explorerBrowseIds).toEqual(['femur','skull']);
  await page.locator('[data-anatomy-study-controls-toggle]').click();
  await expect(search).toBeVisible();
  await search.fill('collarbone');await search.press('Enter');
  await expect(detail).toHaveAttribute('data-anatomy-structure-detail','clavicle');
  await expect(heading).toHaveText('Clavicle');await expect(heading).toBeFocused();
  await expect(search).toHaveValue('');
  const selected=await state(page);record.selected=selected;
  expect(selected).toMatchObject({_activeTab:'explore',_studyFilter:'all',_explorerBrowseIds:null,_explorerBrowseContext:null,_explorerBrowseSelected:null});
  for(const key of ['_structureNotes','_structureConfidence','_confidenceAt','_retrievalEvidence'])expect(selected[key]).toEqual(beforeSearch[key]);
  expect(selected._flashcardRounds).toMatchObject(beforeSearch._flashcardRounds);
  await detail.locator('[data-anatomy-browse="previous"]').click();await expect(heading).toHaveText('Mandible');await expect(heading).toBeFocused();
  await detail.locator('[data-anatomy-browse="previous"]').click();await expect(heading).toHaveText('Skull (Cranium)');await expect(heading).toBeFocused();
  await expect(detail.locator('[data-anatomy-browse="previous"]')).toBeDisabled();
  await detail.locator('[data-anatomy-browse="next"]').focus();await detail.locator('[data-anatomy-browse="next"]').press('Enter');
  await expect(heading).toHaveText('Mandible');await expect(heading).toBeFocused();
  await detail.locator('[data-anatomy-browse="next"]').click();await expect(heading).toHaveText('Clavicle');await expect(heading).toBeFocused();
  for(const theme of themes){
    await scan(page,record,1440,theme,'en',['.anatomy-explorer-nav','[data-anatomy-structure-detail]']);
    if(theme==='light'){
      // Fit the full reading panel before capture, keeping sticky navigation outside its bounds.
      await page.setViewportSize({width:1440,height:1600});
      await detail.evaluate(element=>element.scrollIntoView({block:'start',behavior:'auto'}));
      await detail.screenshot({path:out+'/search-detail-desktop.png'});
    }
  }
  await detail.getByRole('button',{name:/^Back to structures from /}).click();
  await expect(list).toBeVisible();
  await list.locator('[data-anatomy-browser-filter="notes"]').click();
  await search.fill(query);await search.press('Escape');
  await expect(empty).toBeVisible();
  const arabic=await installArabic(page);
  await expect(matching).toHaveText(arabic.study_ref_search_show_matching);
  await expect(matching).toHaveCSS('font-size','17px');
  for(const theme of themes)await scan(page,record,320,theme,'ar-larger',['.anatomy-explorer-nav','[data-anatomy-structure-list]']);
  await matching.click();await expect(page.locator('#anatomy-structure-list-title')).toBeFocused();await expect(search).toHaveValue(query);
  record.finalState=await state(page);
  for(const key of ['_structureNotes','_structureConfidence','_confidenceAt','_retrievalEvidence'])expect(record.finalState[key]).toEqual(work[key as keyof typeof work]);
  expect(record.finalState._flashcardRounds).toMatchObject(work._flashcardRounds);
  expectClean(record);
});
