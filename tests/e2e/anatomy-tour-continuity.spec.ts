import {test,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out=process.env.ANATOMY_TOUR_QA_OUT||process.env.ANATOMY_QA_OUT||'reports/anatomy-tutor-flow-2026-09-29';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});

test.use({video:'off',trace:'off'});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

test('Tour recap review, return, and restart preserve learning history and keyboard continuity',async({page})=>{
  test.setTimeout(300000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});
  await harness.mount(page,{anatomy:{
    _activeTab:'tour',_tourActive:true,_tourSystem:'skeletal',_tourStepIdx:4,
    system:'skeletal',view:'anterior',complexity:3,selectedStructure:'pelvis',
    _startHereDismissed:true,_structureNotes:{skull:'Saved study note'},quizScore:7,_quizAttempts:9
  }},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}'});
  await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});});

  const panel=page.locator('[data-anatomy-tour-panel]');
  const recap=page.locator('[data-anatomy-recap="tour"]');
  const pelvisClue=panel.locator('[data-anatomy-recap-question="pelvis"]');
  const step=panel.locator('[data-anatomy-tour-step]');
  const resume=panel.locator('[data-anatomy-tour-recap-resume]');
  const state=()=>page.evaluate(()=>(window as any).__toolData.anatomy);
  const top=await panel.evaluate(element=>element.getBoundingClientRect().top+scrollY);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/tour-desktop.png'});

  await panel.locator('[data-anatomy-tour-recap-open]').focus();
  await panel.locator('[data-anatomy-tour-recap-open]').press('Enter');
  await expect(recap.locator('[data-anatomy-recap-heading]')).toBeFocused();
  await expect(recap.locator('[data-anatomy-recap-question]')).toHaveCount(4);
  const skullClue=recap.locator('[data-anatomy-recap-question="skull"]');
  await skullClue.locator('[data-anatomy-tour-option="skull"]').focus();
  await skullClue.locator('[data-anatomy-tour-option="skull"]').press('Enter');
  await expect(skullClue.locator('[data-anatomy-tour-feedback]')).toBeFocused();
  await expect(skullClue.locator('[data-anatomy-tour-feedback]')).toHaveAttribute('data-anatomy-tour-feedback','correct');
  const wrong=pelvisClue.locator('[data-anatomy-tour-option]:not([data-anatomy-tour-option="pelvis"])').first();
  await wrong.focus();await wrong.press('Enter');
  await expect(pelvisClue.locator('[data-anatomy-tour-feedback]')).toBeFocused();
  await expect(pelvisClue.locator('[data-anatomy-tour-feedback]')).toHaveAttribute('data-anatomy-tour-feedback','incorrect');
  const answered=await state();
  expect(Object.keys(answered._tourRecap.answers)).toHaveLength(2);
  expect(answered._retrievalEvidence.skull).toMatchObject({attempts:1,correct:1});
  expect(answered._retrievalEvidence.pelvis).toMatchObject({attempts:1,correct:0});

  await page.setViewportSize({width:390,height:844});
  await panel.screenshot({path:out+'/tour-feedback-phone.png'});
  await pelvisClue.locator('[data-anatomy-tour-review]').focus();
  await pelvisClue.locator('[data-anatomy-tour-review]').press('Enter');
  await expect(step).toBeFocused();await expect(step).toHaveAttribute('data-anatomy-tour-step','4');
  await expect(recap).toHaveCount(0);await expect(resume).toContainText('Clue 4');
  const paused=await state();
  expect(paused._tourRecap.answers).toEqual(answered._tourRecap.answers);
  expect(paused._tourRecap.active).toBe(false);
  expect(paused._tourRecapReturn).toMatchObject({questionIndex:3,token:answered._tourRecap.token});
  await page.evaluate(()=>{const ctx=(window as any).__ctx,data=(window as any).__toolData.anatomy;ctx.updateMulti('anatomy',{_structureNotes:{...data._structureNotes,pelvis:'My explanation after reviewing the pelvis'}});});
  await panel.locator('[data-anatomy-tour-diagram]').click();
  await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  await page.locator('[data-anatomy-tour-return]').click();await expect(step).toBeFocused();
  await panel.screenshot({path:out+'/tour-paused-review.png'});
  await resume.focus();await resume.press('Enter');
  await expect(pelvisClue.locator('[data-anatomy-tour-feedback]')).toBeFocused();
  await expect(pelvisClue.locator('[data-anatomy-tour-option]:disabled')).toHaveCount(4);
  let returned=await state();
  expect(returned._tourRecap.answers).toEqual(answered._tourRecap.answers);
  expect(returned._tourRecap.token).toBe(answered._tourRecap.token);
  expect(returned._retrievalEvidence).toEqual(answered._retrievalEvidence);
  expect(returned._tourRecapReturn).toBeNull();
  expect(returned._structureNotes).toEqual({skull:'Saved study note',pelvis:'My explanation after reviewing the pelvis'});

  await panel.getByRole('button',{name:'← Back to the tour',exact:true}).click();
  await expect(step).toBeFocused();await expect(resume).toContainText('Clue 4');
  await panel.locator('#anatomy-tour-step-select').selectOption('2');
  await expect(step).toBeFocused();await expect(step).toHaveAttribute('data-anatomy-tour-step','2');
  await panel.getByRole('button',{name:'Next tour step',exact:true}).click();
  await expect(step).toBeFocused();await expect(step).toHaveAttribute('data-anatomy-tour-step','3');
  expect((await state())._tourRecap.answers).toEqual(answered._tourRecap.answers);
  await resume.click();await expect(pelvisClue.locator('[data-anatomy-tour-feedback]')).toBeFocused();
  // A step selected from the recap pauses it at the last submitted clue rather than clearing answers.
  await panel.locator('#anatomy-tour-step-select').selectOption('1');
  await expect(step).toBeFocused();await expect(resume).toContainText('Clue 4');
  await resume.click();await expect(pelvisClue.locator('[data-anatomy-tour-feedback]')).toBeFocused();

  // Give the separate Quiz record a nonzero value after orientation changes, so the
  // restart check detects an accidental reset of another activity's saved score.
  await page.evaluate(()=>(window as any).__ctx.updateMulti('anatomy',{quizScore:7,_quizAttempts:9}));
  const beforeRestart=await state();
  await panel.locator('[data-anatomy-tour-recap-restart]').focus();
  await panel.locator('[data-anatomy-tour-recap-restart]').press('Enter');
  await expect(recap.locator('[data-anatomy-recap-heading]')).toBeFocused();
  await expect(recap.locator('[data-anatomy-tour-feedback]')).toHaveCount(0);
  const restarted=await state();
  expect(restarted._tourRecap.answers).toEqual({});expect(restarted._tourRecap.token).not.toBe(beforeRestart._tourRecap.token);
  expect(restarted._tourRecapReturn).toBeNull();
  expect(restarted._retrievalEvidence).toEqual(beforeRestart._retrievalEvidence);
  expect(restarted._structureNotes).toEqual(beforeRestart._structureNotes);
  expect(restarted.quizScore).toBe(7);expect(restarted._quizAttempts).toBe(9);
  await skullClue.locator('[data-anatomy-tour-option="skull"]').click();
  await expect(skullClue.locator('[data-anatomy-tour-feedback]')).toBeFocused();
  expect((await state())._retrievalEvidence.skull).toMatchObject({attempts:2,correct:2});
  expect((await state())._retrievalEvidence.pelvis).toEqual(answered._retrievalEvidence.pelvis);

  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  const scans:any[]=[],sizes:any[]=[];
  const scan=async(label:string,width:number,theme:string)=>{
    const violations=await page.evaluate(async()=>{
      const result=await (window as any).axe.run({include:[['[data-anatomy-tour-panel]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
      return result.violations.map((violation:any)=>({id:violation.id,nodes:violation.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
    });
    scans.push({label,width,theme,violations});
  };
  for(const width of [390,1440])for(const theme of ['light','dark','contrast']){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
    await scan('recap',width,theme);await panel.screenshot({path:out+'/tour-recap-'+theme+'-'+width+'.png'});
  }
  await page.evaluate(()=>document.body.className='');
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    sizes.push(size);expect(size.scroll).toBeLessThanOrEqual(width+2);
  }
  await page.getByRole('button',{name:'Larger text',exact:true}).click();await page.setViewportSize({width:320,height:900});
  await scan('larger-text',320,'light');await panel.screenshot({path:out+'/tour-larger-text-320.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(322);

  const arabic=JSON.parse(await readFile(process.env.ANATOMY_QA_ARABIC||'lang/arabic.js','utf8'));
  await page.evaluate(dict=>{
    document.documentElement.dir='rtl';
    (window as any).__ctx.t=(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback;
    (window as any).__ctx.updateMulti('anatomy',{_readingMode:false});
  },arabic);
  await expect(panel.locator('[data-anatomy-tour-recap-restart]')).toHaveText(arabic.stem.anatomy.tour_flow_restart);
  await expect(panel.locator('#anatomy-tour-recap-restart-help')).toHaveText(arabic.stem.anatomy.tour_flow_restart_help);
  await panel.locator('#anatomy-tour-step-select').selectOption('0');
  await expect(step).toBeFocused();await expect(panel.locator('[data-anatomy-tour-recap-return]')).toContainText(arabic.stem.anatomy.tour_flow_saved);
  await expect(resume).toHaveText(arabic.stem.anatomy.tour_flow_return.replace('{clue}','1'));
  for(const theme of ['light','dark','contrast']){
    await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
    await scan('arabic-saved-return',320,theme);await panel.screenshot({path:out+'/tour-arabic-'+theme+'-320.png'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(322);
  }
  await resume.click();await expect(skullClue.locator('[data-anatomy-tour-feedback]')).toBeFocused();
  returned=await state();
  expect(returned._retrievalEvidence.skull.attempts).toBe(2);
  expect(returned._structureNotes.pelvis).toBe('My explanation after reviewing the pelvis');
  await writeFile(out+'/tour-browser-validation.json',JSON.stringify({top,scans,sizes,errors,initialAnswers:answered._tourRecap.answers,finalEvidence:returned._retrievalEvidence},null,2));
  expect(scans.flatMap(result=>result.violations)).toEqual([]);expect(errors).toEqual([]);
});
