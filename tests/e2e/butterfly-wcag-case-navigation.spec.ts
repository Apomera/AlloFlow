import {test,expect,type Page} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:90000,retries:0});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce',video:'off'});
test.beforeAll(()=>harness.start());
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:Page){
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{
  const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test illustrated fallback'));
  w.__mount({butterfly:{observations:['milkweed']}});
  Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
 });
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}

test('forms navigation distinguishes every case and keeps context through checking and retrying',async({page})=>{
 await mount(page);
 const titles=['School pollinator garden','Roadside milkweed strip','Backyard milkweed patch','Farm field edge','Neat front lawn','Park meadow'];
 for(const title of titles){
  const card=page.getByRole('article',{name:title,exact:true});await expect(card).toHaveCount(1);
  for(const question of ['Where does the generation stop?','Why?']){
   const field=page.getByRole('combobox',{name:question+' '+title,exact:true});
   await expect(field).toHaveCount(1);await expect(field).toHaveAccessibleName(question+' '+title);
   await expect(card.getByRole('combobox',{name:question+' '+title,exact:true})).toHaveCount(1);
  }
 }
 const stop=page.getByRole('combobox',{name:'Where does the generation stop? School pollinator garden',exact:true});
 const reason=page.getByRole('combobox',{name:'Why? School pollinator garden',exact:true});
 await stop.focus();await stop.selectOption('caterpillar');await page.keyboard.press('Tab');await expect(reason).toBeFocused();
 await reason.selectOption('missing');
 // The selected option remains the value; it must not pollute either name.
 await expect(stop).toHaveAccessibleName('Where does the generation stop? School pollinator garden');
 await expect(reason).toHaveAccessibleName('Why? School pollinator garden');
 await page.keyboard.press('Tab');
 const check=page.getByRole('button',{name:'Check with the model · School pollinator garden',exact:true});
 await expect(check).toBeFocused();await page.keyboard.press('Enter');
 const result=page.getByRole('region',{name:'Model feedback · School pollinator garden',exact:true});
 await expect(result).toBeFocused();await expect(result).toHaveAttribute('data-matched','true');
 const retry=page.getByRole('button',{name:'Try this case again · School pollinator garden',exact:true});
 await retry.focus();await page.keyboard.press('Enter');await expect(stop).toBeFocused();await expect(stop).toHaveValue('');
 await expect(page.getByRole('article',{name:'School pollinator garden',exact:true})).toHaveCount(1);
});

test('case context and citation instructions use the same translated text as their visible labels',async({page})=>{
 await mount(page);
 const group=page.getByRole('group',{name:'3. Cite records from your investigation',exact:true});
 await group.focus();await expect(group).toBeFocused();
 await expect(group).toHaveAccessibleDescription('Select at least two records to compare (up to eight). Only evidence you actually recorded is offered. 0 of 8 citations selected.');
 await page.evaluate(()=>{
  const w=window as any,translations:Record<string,string>={
   'stem.butterfly.case_garden_title':'Jardín escolar',
   'stem.butterfly.cs_where_does_it_stop':'¿Dónde termina la generación?',
   'stem.butterfly.cs_why':'¿Por qué?',
   'stem.butterfly.nb_help_cite_records':'Selecciona al menos dos registros para comparar (hasta ocho). Solo se ofrece evidencia que hayas registrado.',
   'stem.butterfly.nb_citation_count':'{value1} de 8 citas seleccionadas.'
  };
  w.__ctx.t=(key:string,fallback:string)=>translations[key]||fallback;w.__rerender();
 });
 await expect(page.getByRole('article',{name:'Jardín escolar',exact:true})).toHaveCount(1);
 await expect(page.getByRole('combobox',{name:'¿Dónde termina la generación? Jardín escolar',exact:true})).toHaveCount(1);
 await expect(page.getByRole('combobox',{name:'¿Por qué? Jardín escolar',exact:true})).toHaveCount(1);
 await expect(group).toHaveAccessibleDescription('Selecciona al menos dos registros para comparar (hasta ocho). Solo se ofrece evidencia que hayas registrado. 0 de 8 citas seleccionadas.');
});
