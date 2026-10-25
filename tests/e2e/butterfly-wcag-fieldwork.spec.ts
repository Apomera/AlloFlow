import {test, expect, type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness = new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js', toolId:'butterfly', preScripts:['stem_lab/stem_lab_module.js'], extraScripts:['node_modules/axe-core/axe.min.js'], appStyles:true, layout:'document', width:1000, height:900});
test.describe.configure({timeout:120000, retries:0});
test.use({viewport:{width:1000,height:900}, reducedMotion:'reduce'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(({page})=>harness.destroy(page));

async function mount(page:Page){
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Accessible map'));w.__mount({butterfly:{}});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});});
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}

test('direct visit names include the full visible command and identify the destination',async({page})=>{
 await mount(page);
 for(const [id,name] of [['milkweed','Common milkweed'],['bergamot','Wild bergamot'],['lawn','Mown lawn'],['restoration','Restoration plot']]){
  const visit=page.locator('[data-habitat="'+id+'"] .bf-visit-direct');
  await expect(visit).toHaveAccessibleName('Visit without flying · '+name);
 }
 const visit=page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true});
 await visit.focus();await page.keyboard.press('Enter');
 await expect(page.locator('.bf-stage')).toBeFocused();
 await expect(page.getByRole('button',{name:'Land here',exact:true})).toBeEnabled();
 const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('.bfl'),{runOnly:{type:'rule',values:['label-content-name-mismatch']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}));});
 expect(violations).toEqual([]);
});

test('checking and retrying a case keep keyboard focus with its feedback and question',async({page})=>{
 await mount(page);
 const card=page.locator('[data-case="roadside"]');
 await card.getByLabel('Where does the generation stop?').selectOption('chrysalis');
 await card.getByLabel('Why?').selectOption('cut');
 const check=card.getByRole('button',{name:'Check with the model · Roadside milkweed strip',exact:true});
 await check.focus();await page.keyboard.press('Enter');
 const feedback=card.getByRole('region',{name:'Model feedback · Roadside milkweed strip',exact:true});
 await expect(feedback).toBeFocused();
 await expect(feedback).toContainText('it stops at the caterpillar stage');
 await page.keyboard.press('Tab');
 const retry=card.getByRole('button',{name:'Try this case again · Roadside milkweed strip',exact:true});
 await expect(retry).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(card.getByLabel('Where does the generation stop?')).toBeFocused();
 await expect(card.getByLabel('Where does the generation stop?')).toHaveValue('');
 await page.keyboard.press('Tab');await expect(card.getByLabel('Why?')).toBeFocused();
});
