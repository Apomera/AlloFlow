import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_STUDY_RECORD_QA_OUT||'reports/anatomy-study-record-readability-2026-09-30';
const validation:Record<string,any>={};
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
const themes=['light','dark','contrast'];

test.use({video:'off',trace:'off'});
test.describe.configure({retries:0});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>{await writeFile(out+'/study-record-browser-validation.json',JSON.stringify(validation,null,2));await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});

const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
async function openDetails(details:Locator){
  if(!await details.evaluate(element=>(element as HTMLDetailsElement).open))await details.locator(':scope > summary').click();
}
async function upload(file:Locator,name:string,content:string){
  await file.focus();await expect(file).toBeFocused();
  await file.setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(content)});
}
async function capture(page:Page,locator:Locator,path:string){
  const width=page.viewportSize()!.width,box=await locator.boundingBox();
  if(!box)throw Error('Screenshot target is not visible: '+path);
  await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  try{
    await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-100)));
    await locator.screenshot({path});
  }finally{await page.setViewportSize({width,height:1000});}
}
async function scan(page:Page,record:any,width:number,theme:string,locale:string){
  await page.setViewportSize({width,height:1000});
  await page.evaluate(theme=>{document.body.className=theme==='light'?'':'theme-'+theme;},theme);
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  const violations=await page.evaluate(async()=>{
    const result=await (window as any).axe.run({include:[['[data-anatomy-study-sheet]'],['[data-anatomy-study-toggle]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
    return result.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  });
  const overflow=await page.locator('[data-anatomy-study-sheet]').evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth}));
  record.scans.push({width,theme,locale,dimensions,overflow,violations});
  expect(dimensions.scroll).toBeLessThanOrEqual(width);expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
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

test('Study records stay readable and staged imports preserve learner work with keyboard focus recovery',async({page})=>{
  test.setTimeout(300000);
  const record:any={errors:[],scans:[]};validation.study=record;
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:1000});
  const now=Date.now(),day=86400000;
  const savedNote='My own explanation stays saved: the ribs protect the chest. هذا شرح محفوظ للتعلّم والمراجعة.';
  const savedReflection='My explanation: feedback reduces the temperature disturbance. تبقى ملاحظاتي محفوظة.';
  const work={
    _structuresViewed:{skull:true,ribs:true},
    _structureConfidence:{skull:'mastered',ribs:'practice'},_confidenceAt:{skull:now-10*day,ribs:now-day},
    _structureNotes:{ribs:savedNote,femur:'The femur transmits weight through the thigh to the knee.'},
    _retrievalEvidence:{ribs:{attempts:4,correct:2}},
    _systemsMotionLearning:{exercise:{explanation:'My saved exercise explanation.',prediction:'same',transfer:2}},
    _feedbackExperiment:{explanation:savedReflection,direction:'cool',prediction:'active',revealed:true}
  };
  await harness.mount(page,{anatomy:{
    _activeTab:'explore',system:'skeletal',view:'posterior',complexity:3,selectedStructure:'ribs',
    _bodyView3d:false,_startHereDismissed:true,_showStudySheet:false,quizScore:7,_aiInput:'Keep my Tutor draft.',...work
  }},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  const toggle=page.locator('[data-anatomy-study-toggle]'),sheet=page.locator('[data-anatomy-study-sheet]');
  const title=page.locator('#anatomy-study-sheet-title');
  await toggle.focus();await toggle.press('Enter');await expect(title).toBeFocused();await expect(sheet).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded','true');
  await openDetails(sheet.locator('[data-anatomy-study-evidence-guide]'));
  await openDetails(sheet.locator('[data-anatomy-study-import]'));
  const file=sheet.locator('#anatomy-study-import-file'),notice=sheet.locator('[data-anatomy-study-record-notice]');
  const preview=sheet.locator('[data-anatomy-study-import-preview]');
  const previewTitle=preview.locator('[data-anatomy-study-import-preview-title]');
  const filename=sheet.locator('[data-anatomy-study-import-filename]');
  const merge=preview.locator('[data-anatomy-study-import-merge]'),cancel=preview.locator('[data-anatomy-study-import-cancel]');
  const collection=sheet.getByLabel('Browsing collection',{exact:true}),filter=sheet.getByLabel('Show',{exact:true});

  await filter.selectOption('mastered');await collection.selectOption('muscular');
  await expect(sheet.locator('.anatomy-study-sheet-empty')).toContainText('No recorded structures match');
  await sheet.locator('[data-anatomy-study-reset-filters]').click();
  await expect(filter).toHaveValue('all');await expect(collection).toHaveValue('all');
  for(const [key,value] of Object.entries(work))expect((await state(page))[key]).toEqual(value);

  // Actual malformed-file selection recovers without modifying saved work.
  await upload(file,'invalid-study.json','{invalid');
  await expect(notice).toContainText('not valid JSON');await expect(notice).toBeFocused();await expect(preview).toHaveCount(0);
  for(const [key,value] of Object.entries(work))expect((await state(page))[key]).toEqual(value);
  await upload(file,'unsupported-study.json',JSON.stringify({schema:'alloflow-anatomy-study',version:2,records:[]}));
  await expect(notice).toContainText('version 1');await expect(notice).toBeFocused();await expect(preview).toHaveCount(0);

  const incoming={schema:'alloflow-anatomy-study',version:1,records:[
    {id:'ribs',viewed:true,confidence:'learning',ratedAt:now,note:'A conflicting incoming note.',recall:{attempts:7,correct:4}},
    {id:'mandible',viewed:true,confidence:'practice',ratedAt:now,note:'The mandible supports the lower teeth and moves during chewing.'},
    {id:'unknown-catalog-entry',viewed:true,confidence:null,ratedAt:null,note:'Skipped work.'}
  ],learningNotes:[
    {id:'exercise',explanation:'A conflicting incoming explanation.',transferExplanation:'My new comparison of exercise and rest.'},
    {id:'homeostasis',explanation:'A conflicting incoming temperature explanation.',transferExplanation:''}
  ],feedbackNotes:[{direction:'cool',explanation:'A conflicting incoming temperature explanation.'}]};
  const importName='resume-notes-الأناتومي-2026-09-30-long-file-name.json';
  await upload(file,importName,JSON.stringify(incoming));
  await expect(preview).toBeVisible();await expect(previewTitle).toBeFocused();
  await expect(preview).toHaveAttribute('aria-labelledby',(await previewTitle.getAttribute('id'))!);
  await expect(filename).toContainText(importName);await expect(preview).toContainText('2 recognized structures');
  await expect(filename.locator('bdi')).toHaveAttribute('dir','auto');
  await expect(preview).toContainText('1 unrecognized structures skipped');
  for(const [key,value] of Object.entries(work))expect((await state(page))[key]).toEqual(value);
  await capture(page,sheet.locator('[data-anatomy-study-workbench]'),out+'/import-preview-phone.png');
  await cancel.focus();await cancel.press('Enter');await expect(preview).toHaveCount(0);await expect(file).toBeFocused();
  for(const [key,value] of Object.entries(work))expect((await state(page))[key]).toEqual(value);

  await upload(file,importName,JSON.stringify(incoming));await expect(previewTitle).toBeFocused();
  await merge.focus();await merge.press('Enter');await expect(preview).toHaveCount(0);
  await expect(notice).toContainText('Structures imported: 2');
  await expect(notice).toBeFocused();
  const merged=await state(page);record.mergedState=merged;
  expect(merged._structureNotes.ribs).toBe(savedNote);expect(merged._structureNotes.femur).toBe(work._structureNotes.femur);
  expect(merged._structureNotes.mandible).toBe(incoming.records[1].note);
  expect(merged._structureConfidence).toMatchObject({skull:'mastered',ribs:'learning',mandible:'practice'});
  expect(merged._confidenceAt.skull).toBe(work._confidenceAt.skull);expect(merged._confidenceAt.ribs).toBe(now);
  expect(merged._retrievalEvidence).toEqual({ribs:{attempts:7,correct:4}});
  expect(merged._systemsMotionLearning.exercise).toMatchObject({explanation:work._systemsMotionLearning.exercise.explanation,transferExplanation:incoming.learningNotes[0].transferExplanation,prediction:'same',transfer:2});
  expect(merged._feedbackExperiment).toMatchObject(work._feedbackExperiment);
  expect(merged._feedbackExperiment.sessions.cool.explanation).toBe(savedReflection);
  expect(merged).toMatchObject({quizScore:7,complexity:3,view:'posterior',_activeTab:'explore',_aiInput:'Keep my Tutor draft.'});
  await expect(sheet.locator('[data-anatomy-study-recall="ribs"]')).toContainText('4/7');
  await expect(sheet.locator('[data-anatomy-study-open="mandible"]')).toBeVisible();
  await capture(page,sheet,out+'/merged-work-phone.png');

  // A second merge keeps the larger cumulative record without adding the same practice twice.
  await upload(file,importName,JSON.stringify(incoming));await expect(previewTitle).toBeFocused();await merge.click();
  await expect(preview).toHaveCount(0);await expect(notice).toBeFocused();
  expect((await state(page))._retrievalEvidence).toEqual(merged._retrievalEvidence);
  expect((await state(page))._structureNotes).toEqual(merged._structureNotes);

  await sheet.locator('[data-anatomy-study-open="mandible"]').focus();await sheet.locator('[data-anatomy-study-open="mandible"]').press('Enter');
  await expect(sheet).toHaveCount(0);await expect(page.locator('[data-anatomy-structure-detail]')).toHaveAttribute('data-anatomy-structure-detail','mandible');
  await expect(page.locator('[data-anatomy-structure-detail-heading]')).toBeFocused();
  await toggle.click();await expect(title).toBeFocused();
  await sheet.locator('[data-anatomy-study-review-system="skeletal"]').click();await expect(sheet).toHaveCount(0);
  await expect(page.locator('[data-anatomy-recall-card]')).toBeVisible();
  expect((await state(page))._flashcardScope).toBe('review');
  await toggle.click();await expect(title).toBeFocused();
  await sheet.getByRole('button',{name:'Close study sheet',exact:true}).click();await expect(sheet).toHaveCount(0);await expect(toggle).toBeFocused();
  await toggle.press('Enter');await expect(title).toBeFocused();
  await openDetails(sheet.locator('[data-anatomy-study-evidence-guide]'));
  await openDetails(sheet.locator('[data-anatomy-study-import]'));
  await upload(file,importName,JSON.stringify(incoming));await expect(previewTitle).toBeFocused();
  record.beforeScans=await state(page);

  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  for(const width of [320,390,768,1440])for(const theme of themes){
    await scan(page,record,width,theme,'en');
    if(width===390&&theme==='light')await capture(page,sheet,out+'/after-phone.png');
    if(width===390&&theme==='dark')await capture(page,sheet,out+'/after-dark.png');
    if(width===1440&&theme==='light')await capture(page,sheet,out+'/after-desktop.png');
  }
  const arabic=await installArabic(page);
  await expect(title).toHaveText(arabic.study_sheet_title);
  await expect(merge).toHaveText(arabic.study_import_merge);await expect(cancel).toHaveText(arabic.study_import_cancel);
  await expect(sheet.locator('[data-anatomy-study-import] > summary')).toHaveText(arabic.study_import_title);
  await upload(file,'invalid-study.json','{invalid');
  await expect(notice).toHaveText(arabic.study_import_failed+arabic.study_invalid_json);
  await expect(notice).toBeFocused();await expect(preview).toHaveCount(0);
  await upload(file,'unsupported-study.json',JSON.stringify({schema:'alloflow-anatomy-study',version:2,records:[]}));
  await expect(notice).toHaveText(arabic.study_import_failed+arabic.study_flow_error_schema);
  await expect(notice).toBeFocused();await expect(preview).toHaveCount(0);
  await upload(file,importName,JSON.stringify(incoming));
  await expect(previewTitle).toBeFocused();await expect(previewTitle).toHaveText(arabic.study_flow_import_title);
  await expect(filename).toContainText(arabic.study_flow_import_file);await expect(filename).toContainText(importName);
  await expect(notice).toHaveText(arabic.study_import_preview_ready);
  const arabicState=await state(page);
  expect(arabicState).toMatchObject({system:'skeletal',view:'anterior',complexity:3});
  const reviewIds=Object.entries(arabicState._structureConfidence).filter(([,level])=>level==='practice'||level==='learning').map(([id])=>id);
  expect(reviewIds.slice().sort()).toEqual(['mandible','ribs']);
  const reviewTargetName=await sheet.locator('[data-anatomy-study-open="mandible"]').innerText();
  const nextTitle=arabic.study_flow_next_review_title.replace('{structure}',reviewTargetName);
  const nextDetail=arabic.study_flow_next_review_detail.replace('{count}',String(reviewIds.length));
  record.arabicRecommendation={reviewIds,title:nextTitle,detail:nextDetail};
  await expect(sheet.locator('.anatomy-study-sheet-next').first()).toHaveText(arabic.study_sheet_next+nextTitle+' — '+nextDetail);
  await expect(sheet.locator('[data-anatomy-study-reflection="exercise"] h5')).toHaveText(arabic.study_flow_activity_exercise_title);
  await expect(sheet.locator('[data-anatomy-study-open="ribs"]')).toHaveCSS('text-align','start');
  await expect(sheet.locator('[data-anatomy-stale="skull"]')).toHaveCSS('white-space','normal');
  await expect(sheet.locator('[data-anatomy-study-open="ribs"]').locator('..').locator('.anatomy-study-sheet-note [dir="auto"]')).toHaveText(savedNote);
  await expect(sheet.locator('[data-anatomy-study-reflection="homeostasis-cool"] [dir="auto"]')).toContainText(savedReflection);
  record.readingFonts=await sheet.locator('p,button,summary,label,select,input,span,bdi').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length>0).map(element=>({tag:element.tagName,text:element.textContent?.trim().slice(0,60),size:parseFloat(getComputedStyle(element).fontSize)})));
  for(const font of record.readingFonts)expect(font.size).toBeGreaterThanOrEqual(17);
  for(const theme of themes){await scan(page,record,320,theme,'ar-larger');if(theme==='light')await capture(page,sheet,out+'/after-arabic.png');}
  const beforePrint=await state(page),screenTheme=await page.evaluate(()=>document.body.className);
  record.printChecks=[];
  try{
    await page.emulateMedia({media:'print'});
    for(const theme of themes){
      await page.evaluate(theme=>{document.body.className=theme==='light'?'':'theme-'+theme;},theme);
      await expect(sheet).toBeVisible();
      const metrics=await sheet.evaluate(element=>{
        const collect=(selector:string)=>Array.from(element.querySelectorAll(selector)).filter(node=>node.getClientRects().length>0).map(node=>{
          const style=getComputedStyle(node);
          return {text:node.textContent?.trim().slice(0,100),color:style.color,background:style.backgroundColor};
        });
        return {
          text:{
            heading:collect('#anatomy-study-sheet-title'),numbers:collect('.anatomy-study-sheet-stats strong'),
            notes:collect('.anatomy-study-sheet-note .anatomy-study-saved-text'),
            badges:collect('.anatomy-structure-status,.anatomy-study-sheet-stale'),
            reflectionHeadings:collect('[data-anatomy-study-reflection] h5'),
            body:collect('.anatomy-study-sheet-fn,.anatomy-study-sheet-next,[data-anatomy-study-reflection] p,.anatomy-study-evidence-guide p')
          },
          paper:{color:getComputedStyle(element).color,background:getComputedStyle(element).backgroundColor},
          surfaces:collect('.anatomy-study-sheet-stats>div,.anatomy-study-sheet-system li,.anatomy-structure-status,.anatomy-study-sheet-stale,[data-anatomy-study-reflection],.anatomy-study-evidence-guide'),
          hidden:{workbench:getComputedStyle(element.querySelector('[data-anatomy-study-workbench]')!).display,actions:getComputedStyle(element.querySelector('.anatomy-study-sheet-actions')!).display}
        };
      });
      record.printChecks.push({theme,metrics});
      expect(metrics.paper).toEqual({color:'rgb(0, 0, 0)',background:'rgb(255, 255, 255)'});
      for(const [kind,items] of Object.entries(metrics.text)){
        expect(items.length,'Visible printed '+kind).toBeGreaterThan(0);
        for(const item of items)expect(item.color,'Printed '+kind+': '+item.text).toBe('rgb(0, 0, 0)');
      }
      expect(metrics.surfaces.length).toBeGreaterThan(0);
      for(const surface of metrics.surfaces)expect(surface.background,'Printed paper surface: '+surface.text).toBe('rgb(255, 255, 255)');
      expect(metrics.hidden).toEqual({workbench:'none',actions:'none'});
      await expect(sheet.locator('[data-anatomy-study-open="ribs"]').locator('..').locator('.anatomy-study-saved-text')).toHaveText(savedNote);
      await expect(sheet.locator('[data-anatomy-study-reflection="homeostasis-cool"] .anatomy-study-saved-text')).toHaveText(savedReflection);
      expect(await state(page)).toEqual(beforePrint);
    }
  }finally{
    await page.emulateMedia({media:'screen'});
    await page.evaluate(theme=>{document.body.className=theme;},screenTheme);
  }
  expect(record.printChecks).toHaveLength(3);expect(await state(page)).toEqual(beforePrint);
  record.finalState=await state(page);
  for(const key of ['_structureNotes','_structureConfidence','_confidenceAt','_retrievalEvidence','_systemsMotionLearning','_feedbackExperiment','quizScore','_aiInput'])expect(record.finalState[key]).toEqual(record.beforeScans[key]);
  expect(record.scans).toHaveLength(15);expect(record.scans.flatMap((scenario:any)=>scenario.violations)).toEqual([]);expect(record.errors).toEqual([]);
});
