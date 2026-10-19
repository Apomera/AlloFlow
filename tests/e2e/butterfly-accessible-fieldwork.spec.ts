import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,width:1280,height:1000});
test.describe.configure({timeout:180000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:any,fallback:boolean){
 await page.goto(harness.url+'/__harness');
 await page.evaluate((fallback:boolean)=>{const w=window as any;if(fallback)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test map'));w.__mount({butterfly:{}});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});},fallback);
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer',fallback?'map':'three');
}
async function directVisit(page:any,name:string){
 const button=page.getByRole('button',{name:'Visit '+name+' without flying',exact:true});
 await button.focus();await page.keyboard.press('Enter');
 await expect(page.locator('.bf-stage')).toBeFocused();
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-paused','true');
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-landed','');
 await expect(page.getByRole('button',{name:'Land here',exact:true})).toBeEnabled();
}
async function audit(page:any){
 const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-butterfly-root]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));});
 expect(violations).toEqual([]);
}

for(const fallback of [false,true])test('keyboard fieldwork without flight preserves the examination requirement in '+(fallback?'the mobile map':'3D'),async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 if(fallback)await page.setViewportSize({width:375,height:900});
 await mount(page,fallback);
 const stage=page.locator('.bf-stage'),clock=await stage.getAttribute('data-clock');
 await expect(page.locator('[data-direction="right"]')).toBeDisabled();
 await directVisit(page,'Common milkweed');
 await expect(page.getByRole('heading',{name:'0 of 3 patches investigated'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Examine patch',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Land here',exact:true}).click();
 await expect(page.getByRole('heading',{name:'0 of 3 patches investigated'})).toBeVisible();
 await page.getByRole('button',{name:'Examine patch',exact:true}).click();
 await expect(page.getByRole('heading',{name:'1 of 3 patches investigated'})).toBeVisible();
 const design=page.getByRole('region',{name:'Habitat design activity'});
 await design.getByRole('button',{name:/^Plant milkweed/}).click();
 await design.getByRole('combobox').selectOption('both');
 await design.getByRole('button',{name:'Apply habitat plan',exact:true}).click();
 await directVisit(page,'Restoration plot');
 await expect(page.locator('[data-design-record="mixed"]')).toContainText('Not examined');
 await page.getByRole('button',{name:'Land here',exact:true}).click();
 await page.getByRole('button',{name:'Leaves',exact:true}).click();
 await expect(page.getByRole('region',{name:'Field lens reading'})).toContainText('Leaves for monarch caterpillars');
 await page.getByRole('button',{name:'Examine patch',exact:true}).click();
 await expect(page.locator('[data-design-record="mixed"] td').nth(1)).toHaveText('Present');
 expect(await stage.getAttribute('data-clock')).toBe(clock);
 expect(await page.locator('meter').getAttribute('value')).toBe('100');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await audit(page);
 if(fallback){
  await page.evaluate(()=>{const w=window as any;w.__ctx.isDark=true;w.__ctx.isContrast=true;w.__rerender();});
  // React commits asynchronously. Audit one settled theme, rather than caching
  // the light backgrounds before the high-contrast text has committed.
  await expect(page.locator('.bfl')).toHaveAttribute('data-contrast','true');
  await expect(page.locator('.bfl')).toHaveCSS('background-color','rgb(0, 0, 0)');
  await audit(page);
 }
 expect(errors).toEqual([]);
});

test('direction input releases reliably and direct arrival cancels flight input',async({page})=>{
 await mount(page,true);
 await page.getByRole('button',{name:'Take flight',exact:true}).click();
 const stage=page.locator('.bf-stage'),right=page.locator('[data-direction="right"]');
 await expect(right).toBeEnabled();await right.scrollIntoViewIfNeeded();
 let position=await stage.getAttribute('data-position');
 const box=(await right.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down({button:'right'});await page.waitForTimeout(200);await page.mouse.up({button:'right'});
 expect(await stage.getAttribute('data-position')).toBe(position);
 await page.mouse.down();await expect.poll(()=>stage.getAttribute('data-position')).not.toBe(position);
 await right.dispatchEvent('pointercancel',{pointerId:1});
 position=await stage.getAttribute('data-position');await page.waitForTimeout(250);
 expect(await stage.getAttribute('data-position')).toBe(position);await page.mouse.up();
 await right.focus();await page.keyboard.down('Enter');
 await expect.poll(()=>stage.getAttribute('data-position')).not.toBe(position);
 await directVisit(page,'Wild bergamot');await page.keyboard.up('Enter');
 const arrival=await stage.getAttribute('data-position');
 await page.getByRole('button',{name:'Take flight',exact:true}).click();
 await page.waitForTimeout(250);expect(await stage.getAttribute('data-position')).toBe(arrival);
 await page.getByRole('button',{name:'Land here',exact:true}).click();
 await expect(right).toBeDisabled();await expect(stage).toHaveAttribute('data-bf-landed','bergamot');
});
