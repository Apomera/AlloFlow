import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.describe.configure({timeout:360_000});test.use({video:'off',trace:'off'});
const report='reports/dinolab-anatomy-quest';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dinolab.js',toolId:'dinoLab',width:1180,height:920,appStyles:true,probes:"var R=THREE.WebGLRenderer;THREE.WebGLRenderer=function(o){var r=new R(o),render=r.render.bind(r);r.render=function(s,c){window.__partScene=s;window.__partCamera=c;window.__partRenderer=r;return render(s,c);};return r;};"});
test.beforeAll(async()=>{fs.mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function settle(page){await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));}
async function mount(page,species,width=1180){
 await page.setViewportSize({width,height:920});await page.emulateMedia({reducedMotion:'reduce'});
 await harness.mount(page,{dinoLab:{tab:'field3d',field3dSelected:species,field3dReconstructionMode:'evidence',field3dAutoRotate:false,field3dOrientationDismissed:true,field3dWorkflowStarted:false,field3dShowSkeleton:false,field3dShowBody:true,field3dShowHuman:false,field3dShowEvidence:false,field3dBodyOpacity:100,field3dLabelMode:'key',field3dScanLogged:{skull:true},field3dScanSpecies:species}},undefined,{expectCanvas:false});
 const css=fs.readFileSync('app_styles_module.js','utf8'),start=css.indexOf(':root, .theme-default {');await page.addStyleTag({content:css.slice(start,css.indexOf('/* ─',css.indexOf('--allo-stem-button-border:#00ff00',start)))});
 await page.evaluate(()=>{document.body.className='theme-default';document.getElementById('wrap')!.style.cssText='width:100%;height:auto;display:block';});
 await expect.poll(()=>page.evaluate(()=>!!(window as any).__partScene)).toBe(true);await page.getByRole('button',{name:'Fit whole animal',exact:true}).click();await settle(page);
}
const source=fs.readFileSync('stem_lab/stem_tool_dinolab.js','utf8');
const guides=JSON.parse(source.match(/var DINO_ANATOMY_GUIDES = ([\s\S]*?);\n/)![1]);
const labels={head:'Head',tail:'Tail',trunk:'Trunk',hand:'Hand',foot:'Foot',neck:'Neck',forelimb:'Upper arm',knee:'Knee',ankle:'Ankle',thigh:'Thigh'};
async function question(page,quad=false){const clue=await page.locator('.dinolab-quiz-question').innerText(),id=Object.keys(guides).find(id=>guides[id].clue===clue)!;expect(id).toBeTruthy();return {id,label:quad&&id==='hand'?'Front foot':quad&&id==='foot'?'Hind foot':quad&&id==='forelimb'?'Foreleg':labels[id]};}
async function stats(page){return page.evaluate(()=>{const w=window as any,r=w.__partRenderer;return {model:w.__partScene.getObjectByName('dinolab-specimen').uuid,geometries:r.info.memory.geometries,textures:r.info.memory.textures,errors:w.__events.errors,lost:w.__glLive().lost,shaderFailures:r.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).length};});}
async function axe(page){await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});return page.evaluate(async()=>{const r=await (window as any).axe.run({include:[['.dinolab-anatomy-quest'],['.dinolab-body-label-controls']]});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});}
test('desktop quest explains answers, scores once, reviews mistakes and replays without rebuilding',async({page})=>{
 await mount(page,'tyrannosaurus');const before=await stats(page),quest=page.locator('.dinolab-anatomy-quest');
 await page.getByRole('button',{name:'Anatomy Quest',exact:true}).click();await expect(page.getByRole('button',{name:'Start anatomy quiz',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('.dinolab-quiz-question')).toBeFocused();
 await quest.screenshot({path:report+'/desktop-question.png'});let missed;
 for(let i=0;i<5;i++){
  const q=await question(page);if(i===0){missed=q;await quest.getByRole('button',{name:'Need a hint?',exact:true}).click();await expect(quest.getByRole('status')).toHaveText(guides[q.id].hint);}
  const options=await quest.locator('.dinolab-quiz-choices button').allTextContents(),pick=i===0?options.find(text=>text!==q.label)!:q.label;
  await quest.getByRole('button',{name:pick,exact:true}).focus();await page.keyboard.press('Enter');
  await expect(quest.locator('.dinolab-quiz-choices button:enabled')).toHaveCount(0);expect(await quest.locator('.dinolab-quiz-choices button').evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).opacity==='1'))).toBe(true);await expect(page.getByLabel('Locate a body part')).toHaveValue(q.id);await expect(quest.locator('.dinolab-quiz-feedback')).toContainText(guides[q.id].evidence);
  const next=quest.getByRole('button',{name:i===4?'See results':'Next clue',exact:true});await expect(next).toBeFocused();
  if(i===0){await expect(quest.locator('.dinolab-quiz-progress')).toContainText('0 correct');await quest.screenshot({path:report+'/desktop-feedback.png'});}
  await next.click();
 }
 await expect(quest.getByRole('heading',{name:'Quest complete: 4 of 5 correct',exact:true})).toBeFocused();await quest.screenshot({path:report+'/desktop-results.png'});
 await quest.getByRole('button',{name:'Review '+missed.label,exact:true}).click();await expect(quest.locator('.dinolab-quiz-review-guide')).toContainText(guides[missed.id].purpose);await expect(page.getByLabel('Locate a body part')).toHaveValue(missed.id);
 const violations=await axe(page);expect(violations).toEqual([]);
 await quest.getByRole('button',{name:'Play another quest',exact:true}).click();await expect(quest.locator('.dinolab-quiz-progress')).toHaveText('Clue 1 of 5 · 0 correct');
 const q=await question(page);await quest.getByRole('button',{name:q.label,exact:true}).click();await page.getByRole('button',{name:'Anatomy Quest',exact:true}).click();await expect(page.locator('#dinolab-anatomy-quest-panel')).toHaveCount(0);await page.getByRole('button',{name:'Anatomy Quest',exact:true}).click();await expect(quest.locator('.dinolab-quiz-progress')).toHaveText('Clue 1 of 5 · 1 correct');
 const after=await stats(page);expect(after).toEqual(before);expect(after.errors).toEqual([]);expect(after.lost).toBe(false);expect(after.shaderFailures).toBe(0);fs.writeFileSync(report+'/desktop-validation.json',JSON.stringify({before,after,violations,score:'4/5',reviewed:missed.id,replayAndResume:true},null,2));
});
test('phone guides adapt to quadrupeds and the quiz survives hidden layers then resets by species',async({page})=>{
 await mount(page,'triceratops',320);await page.getByRole('button',{name:'Body-part labels',exact:true}).click();const picker=page.getByLabel('Locate a body part');
 await picker.selectOption('hand');await expect(page.locator('.dinolab-part-guide')).toContainText('front foot helps support');await page.locator('.dinolab-part-locator').screenshot({path:report+'/phone-part-guide.png'});
 for(const id of Object.keys(guides)){
  await picker.selectOption(id);await expect(page.locator('.dinolab-part-guide')).toContainText(guides[id].look);await expect(page.locator('.dinolab-part-guide')).toContainText(guides[id].evidence);await expect(page.locator('.dinolab-part-guide a')).toHaveAttribute('rel','noopener noreferrer');
 }
 await page.getByRole('button',{name:'Anatomy Quest',exact:true}).click();await page.getByRole('button',{name:'Start anatomy quiz',exact:true}).click();const quest=page.locator('.dinolab-anatomy-quest'),q=await question(page,true);await quest.getByRole('button',{name:q.label,exact:true}).click();await quest.screenshot({path:report+'/phone-feedback.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const violations=await axe(page);expect(violations).toEqual([]);
 await quest.getByRole('button',{name:'Next clue',exact:true}).click();await page.evaluate(()=>{(window as any).__ctx.updateMulti('dinoLab',{field3dShowBody:false,field3dShowSkeleton:false});});await expect(quest).toContainText('The text quiz works with the model hidden');await expect(quest.locator('.dinolab-quiz-progress')).toHaveText('Clue 2 of 5 · 1 correct');
 const second=await question(page,true);await quest.getByRole('button',{name:second.label,exact:true}).click();await expect(quest.locator('.dinolab-quiz-progress')).toContainText('2 correct');
 await page.evaluate(()=>{(window as any).__ctx.updateMulti('dinoLab',{field3dSelected:'velociraptor'});});await expect(page.getByRole('button',{name:'Anatomy Quest',exact:true})).toHaveAttribute('aria-expanded','false');await page.getByRole('button',{name:'Anatomy Quest',exact:true}).click();await expect(quest.getByRole('button',{name:'Start anatomy quiz',exact:true})).toBeVisible();await expect(quest.locator('.dinolab-quiz-progress')).toHaveCount(0);await expect(picker.locator('option[value="hand"]')).toHaveText('Hand');
 const after=await stats(page);expect(after.errors).toEqual([]);expect(after.lost).toBe(false);expect(after.shaderFailures).toBe(0);fs.writeFileSync(report+'/phone-validation.json',JSON.stringify({violations,allTenGuides:true,quadrupedLabels:true,hiddenLayerQuiz:true,speciesReset:true,after},null,2));
});
