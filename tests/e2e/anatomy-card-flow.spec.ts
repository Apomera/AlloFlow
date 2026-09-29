import {test, expect} from '@playwright/test';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {GlHarness} from './helpers/stem_gl_harness';

const out='reports/anatomy-study-flow-2026-09-28';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
test.use({video:'off',trace:'off'});
test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
test.afterAll(async()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

test('Explore to Cards to Quiz preserves work and makes round progress and completion clear',async({page})=>{
  test.setTimeout(240000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1440,height:1000});
  await harness.mount(page,{anatomy:{_activeTab:'explore',system:'skeletal',complexity:1,selectedStructure:'femur',_structureNotes:{femur:'The long bone of the thigh'},_startHereDismissed:true}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}'});
  await page.getByRole('button',{name:'Practice this structure',exact:true}).click();
  const panel=page.locator('[data-anatomy-flashcards]');
  const card=page.locator('[data-anatomy-recall-card]');
  await expect(card).toBeFocused();
  await expect(card).toHaveAttribute('data-anatomy-recall-card','femur');
  await expect(card).toHaveAttribute('data-anatomy-card-revealed','false');
  await expect(page.locator('#anatomy-study-system')).toBeVisible();
  const compactTop=await panel.evaluate(el=>el.getBoundingClientRect().top+scrollY);
  expect(compactTop).toBeLessThan(350);
  await expect(page.locator('#anatomy-study-mission')).toBeHidden();
  await page.locator('[data-anatomy-study-controls-toggle]').click();
  await expect(page.locator('#anatomy-study-mission')).toBeVisible();
  await page.locator('[data-anatomy-study-controls-toggle]').click();
  await expect(page.locator('#anatomy-study-mission')).toBeHidden();
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:out+'/after-desktop.png'});
  await panel.screenshot({path:out+'/after-card-front.png'});
  const meter=panel.getByRole('progressbar',{name:'Cards rated this round'});
  const count=Number(await meter.getAttribute('aria-valuemax'));
  await expect(meter).toHaveAttribute('aria-valuenow','0');
  await card.focus();await card.press('ArrowRight');
  await expect(meter).toHaveAttribute('aria-valuenow','0');
  const name=await card.locator('h3').innerText();
  await panel.getByRole('button',{name:'Reveal function',exact:true}).click();
  await expect(card.locator('.anatomy-card-answer-name')).toHaveText(name);
  await panel.screenshot({path:out+'/after-card-back.png'});
  await page.setViewportSize({width:390,height:844});
  await panel.screenshot({path:out+'/after-phone-card.png'});
  await panel.getByRole('button',{name:'! Need practice',exact:true}).click();
  await expect(meter).toHaveAttribute('aria-valuenow','1');
  for(let i=1;i<count;i++){
    await panel.getByRole('button',{name:'Next flashcard',exact:true}).click();
    await panel.getByRole('button',{name:'Reveal function',exact:true}).click();
    await panel.getByRole('button',{name:'OK Got it',exact:true}).click();
  }
  const complete=page.locator('[data-anatomy-card-completion]');
  await expect(complete).toBeVisible();
  await expect(complete.locator('[data-anatomy-round-rating=practice] dd')).toHaveText('1');
  await expect(meter).toHaveAttribute('aria-valuenow',String(count));
  await complete.screenshot({path:out+'/round-complete-phone.png'});
  await complete.locator('[data-anatomy-round-next=review]').click();
  await expect(panel).toHaveAttribute('data-anatomy-flashcards','review');
  await expect(card).toBeFocused();
  await expect(meter).toHaveAttribute('aria-valuemax','1');
  await expect(meter).toHaveAttribute('aria-valuenow','0');
  await expect(complete).toHaveCount(0);
  await panel.getByRole('button',{name:'Reveal function',exact:true}).click();
  await panel.getByRole('button',{name:'OK Got it',exact:true}).click();
  await complete.getByRole('button',{name:'Continue to Quiz',exact:true}).click();
  await expect(page.locator('[data-anatomy-quiz-panel]')).toBeVisible();
  await page.locator('#anatomy-mobile-activity').selectOption('flashcards');
  await expect(complete).toBeVisible();
  expect(await page.evaluate(()=>(window as any).__toolData.anatomy._structureNotes.femur)).toBe('The long bone of the thigh');

  await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  const scans:any[]=[],sizes:any[]=[];
  for(const width of [390,1440])for(const theme of ['light','dark','contrast']){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(theme=>document.body.className=theme==='light'?'':'theme-'+theme,theme);
    const violations=await page.evaluate(async()=>{
      const result=await (window as any).axe.run({include:[['[data-anatomy-flashcards]'],['[data-anatomy-study-controls]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
      return result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>({target:n.target,summary:n.failureSummary}))}));
    });scans.push({width,theme,violations});
    await panel.screenshot({path:out+'/complete-'+theme+'-'+width+'.png'});
  }
  await page.evaluate(()=>document.body.className='');
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    sizes.push(size);expect(size.scroll).toBeLessThanOrEqual(width+2);
  }
  await page.getByRole('button',{name:'Larger text',exact:true}).click();
  await page.setViewportSize({width:320,height:900});
  await panel.screenshot({path:out+'/larger-text-320.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(322);
  // Exercise the new labels in a right-to-left locale as well as the default language.
  const arabic=JSON.parse(await readFile('lang/arabic.js','utf8'));
  await page.evaluate(dict=>{
    document.documentElement.dir='rtl';
    (window as any).__ctx.t=(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback;
    (window as any).__ctx.updateMulti('anatomy',{_readingMode:false});
  },arabic);
  await expect(complete).toContainText(arabic.stem.anatomy.card_flow_complete);
  await expect(card.locator('.anatomy-card-description')).toHaveCSS('direction','ltr');
  await panel.screenshot({path:out+'/arabic-320.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(322);
  await writeFile(out+'/browser-validation.json',JSON.stringify({compactTop,cardCount:count,scans,sizes,errors},null,2));
  expect(scans.flatMap(scan=>scan.violations)).toEqual([]);expect(errors).toEqual([]);
});
