import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:320,height:1000});
test.describe.configure({timeout:90000,retries:0});
test.use({viewport:{width:320,height:1000},video:'off'});
test.beforeAll(()=>{mkdirSync('scratch/butterfly-wcag-workflows',{recursive:true});return harness.start();});
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

test('doubling text keeps investigation progress visible and navigation usable on a narrow screen',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));w.__mount({butterfly:{}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
 // Model text-only enlargement: freeze twice each existing computed font size,
 // without enlarging the layout boxes as full-page zoom would do.
 await page.evaluate(()=>{
  const sizes=Array.from(document.querySelectorAll<HTMLElement>('.bfl,.bfl *')).filter(element=>!(element instanceof SVGElement)).map(element=>({element,size:parseFloat(getComputedStyle(element).fontSize)*2}));
  for(const {element,size} of sizes)element.style.setProperty('font-size',size+'px','important');
 });
 const guide=page.locator('.bf-guide'),progress=page.locator('.bf-guide-count');
 await guide.scrollIntoViewIfNeeded();
 const bounds=await progress.evaluate(element=>{const box=element.getBoundingClientRect(),parent=element.closest('.bf-guide')!.getBoundingClientRect();return {left:box.left,right:box.right,parentLeft:parent.left,parentRight:parent.right};});
 expect(bounds.left).toBeGreaterThanOrEqual(bounds.parentLeft);expect(bounds.right).toBeLessThanOrEqual(bounds.parentRight);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await guide.screenshot({path:'scratch/butterfly-wcag-workflows/guide-text200.png'});
 const firstStep=guide.locator('.bf-guide-steps button').first();expect((await firstStep.boundingBox())!.width).toBeGreaterThan(200);await firstStep.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('region',{name:/^Butterfly flight area/})).toBeFocused();await expect(page.locator('.bf-stage')).toBeInViewport();
});
