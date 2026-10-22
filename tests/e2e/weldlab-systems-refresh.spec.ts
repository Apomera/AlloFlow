import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const output = resolve('reports/weldlab-systems-refresh');
const harness = new GlHarness({ toolId: 'weldLab', toolFile: 'stem_lab/stem_tool_weldlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'], appStyles: true, layout: 'document' });
test.describe.configure({ retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: any, width: number, state: object, contrast = false) {
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { weldLab: state }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: 'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}' });
  if (contrast) await page.evaluate(() => {
    document.body.classList.add('theme-contrast');
    (window as any).__ctx.isContrast = true; (window as any).__ctx.theme = 'contrast'; (window as any).__rerender();
  });
}
async function inspect(page: any, name: string, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
  await page.locator(selector).screenshot({ path: resolve(output, name + '.png') });
  const result = await page.evaluate(async (selector: string) => {
    const audit = await (window as any).axe.run(document.querySelector(selector), { runOnly: { type: 'rule',
      values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'nested-interactive'] } });
    return { overflow: document.documentElement.scrollWidth - innerWidth, overflowNodes: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && !el.closest('[data-noise-chart-scroll],.overflow-x-auto,.preview-bar')).slice(0, 12).map(el => ({ tag: el.tagName, className: el.getAttribute('class'), right: el.getBoundingClientRect().right })), violations: audit.violations.map((v: any) => ({ id: v.id,
      nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })) };
  }, selector);
  writeFileSync(resolve(output, name + '.json'), JSON.stringify(result, null, 2));
  expect(result.overflow).toBeLessThanOrEqual(1); expect(result.violations).toEqual([]);
}





const treatments: [string,number,number][] = [['stress',1100,1250],['hydrogen',400,600],['normalize',1600,1700],['anneal',1500,1700],['solution',1900,2100]];
for(const width of [1280,390]){
  test('Sleuth effect inspection stays behind the first-answer gate at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await mount(page,width,{view:'processSleuth',psIdx:0,psShown:[0],psAns:false,proc2_psLocked:false,proc2_psClues:[1,2]});
    await expect(page.locator('[data-sleuth-effects]')).toHaveCount(0);
    await page.getByRole('button',{name:'Done marking: choose the process →',exact:true}).click();
    await expect(page.locator('[data-sleuth-effects]')).toHaveCount(0);
    const answers=page.getByRole('radiogroup',{name:'Pick the right welding process',exact:true}).getByRole('radio');
    await answers.first().click();await expect(page.locator('[data-sleuth-effects]')).toBeVisible();
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    const options=await page.locator('[data-sleuth-effect-clue] option').evaluateAll(els=>els.map(el=>(el as HTMLOptionElement).value));
    for(const clue of options){
      await page.locator('[data-sleuth-effect-clue]').selectOption(clue);
      const data=await page.evaluate((n:string)=>{
        const core=(window as any).__WeldLabCore.proc,def=core.PS_V[0].clues[Number(n)];
        return {actual:[...document.querySelectorAll('[data-sleuth-effect-process]')].map((el:any)=>({id:el.dataset.sleuthEffectProcess,effect:el.dataset.effect,points:el.dataset.points})),expected:core.PS_SHOWN.map((id:string)=>{if(!def||!def.f)return{id,effect:'context',points:''};const d=core.cell(def.f,def.v,id).d;return{id,effect:d===null?'out':d>0?'up':d<0?'down':'neutral',points:d===null?'out':String(d)};})};
      },clue);
      expect(data.actual).toEqual(data.expected);
      await page.locator('[data-sleuth-effect-process="spot"]').focus();await page.keyboard.press('Space');
    }
    await page.locator('[data-sleuth-effect-clue]').selectOption(options[0]);
    await page.locator('[data-sleuth-effect-process="tig"]').click();
    await page.locator('[data-sleuth-effect-prose] summary').click();
    await inspect(page,'sleuth-effects-'+width,'[data-sleuth-effects]');
    await expect(answers.nth(1)).toHaveAttribute('aria-disabled','true');expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);
    await page.getByRole('button',{name:'➡️ Next vignette',exact:true}).click();
    await expect(page.locator('[data-sleuth-effects]')).toHaveCount(0);expect(errors).toEqual([]);
  });
  test('Robot sensing locations follow manual geometry without changing programs at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await mount(page,width,{view:'robotic',rob_sect:'vision',tech2_rob_prog:[{x:4,y:6,m:'J',w:false},{x:12,y:6,m:'L',w:true}]});
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    const joint=await page.locator('[data-robot-sensing-joint]').evaluate(el=>el.outerHTML);
    for(const method of ['laser','touch','arc','map']){
      await page.locator('[data-robot-sensing-method="'+method+'"]').focus();await page.keyboard.press('Space');
      for(const position of [0,50,100]){
        await page.locator('[data-robot-sensing-stop="'+position+'"]').click();
        const torch=100+3.8*position,offset=method==='laser'?65:method==='map'?10:0;
        expect(Number(await page.locator('[data-robot-sensing-torch]').getAttribute('data-x'))).toBeCloseTo(torch,8);
        expect(Number(await page.locator('[data-robot-sensing-focus]').getAttribute('data-x'))).toBeCloseTo(torch+offset,8);
        expect(Number(await page.locator('[data-robot-sensing-focus]').getAttribute('data-y'))).toBe(220);
      }
      expect(await page.locator('[data-robot-sensing-joint]').evaluate(el=>el.outerHTML)).toBe(joint);
      if(method==='touch'||method==='map')await expect(page.locator('[data-robot-sensing-arc]')).toHaveCount(0);
      else await expect(page.locator('[data-robot-sensing-arc]')).toHaveCount(1);
    }
    await page.locator('[data-robot-sensing-method="map"]').click();await page.locator('[data-robot-sensing-stop="0"]').click();
    await expect(page.locator('[data-robot-sensing-mesh]')).toHaveAttribute('clip-path','url(#rob5-part-surface)');
    await inspect(page,'robot-map-edge-'+width,'[data-robot-sensing]');
    await page.locator('[data-robot-sensing-position]').fill('37');
    await page.locator('[data-robot-sensing-method="laser"]').click();
    await inspect(page,'robot-sensing-'+width,'[data-robot-sensing]');
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
  test('Treatment bands use a common temperature scale and retain distinct cooling descriptions at '+width+'px',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await mount(page,width,{view:'metallurgy',met_sect:'pwht',met2_cdPicks:{0:1}});
    const saved=await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab));
    for(const[id,min,max]of treatments){
      await page.locator('[data-met-pwht-pick="'+id+'"]').click();
      const band=page.locator('[data-met-pwht-band="'+id+'"]');
      await expect(band).toHaveAttribute('data-min',String(min));await expect(band).toHaveAttribute('data-max',String(max));
      expect(Number(await band.getAttribute('x'))).toBeCloseTo(20+min/2200*600,8);
      expect(Number(await band.getAttribute('width'))).toBeCloseTo((max-min)/2200*600,8);
      await expect(page.locator('[data-met-pwht-detail="selected"]')).toHaveAttribute('data-treatment',id);
    }
    const ends=await page.evaluate(()=>['normalize','anneal'].map(id=>document.querySelector('[data-met-pwht-band="'+id+'"]')!.getBoundingClientRect().right));
    expect(Math.abs(ends[0]-ends[1])).toBeLessThan(0.2);
    await page.locator('[data-met-pwht-pick="normalize"]').click();await page.locator('[data-met-pwht-compare]').click();await page.locator('[data-met-pwht-peer]').selectOption('anneal');
    await expect(page.locator('[data-met-pwht-detail="comparison"]')).toHaveAttribute('data-treatment','anneal');
    await expect(page.locator('[data-met-pwht-detail="selected"]')).toContainText('air cool');await expect(page.locator('[data-met-pwht-detail="comparison"]')).toContainText('furnace cool');
    await inspect(page,'treatment-bands-'+width,'[data-met-pwht]');
    expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.weldLab))).toBe(saved);expect(errors).toEqual([]);
  });
}
test('Evidence, sensing and treatment controls remain readable in high contrast',async({page})=>{
  for(const[name,state,selector]of[
    ['sleuth-effects',{view:'processSleuth',psIdx:0,psShown:[0],psAns:true,psPick:'tig',proc2_psLocked:true,proc2_psClues:[1,2]},'[data-sleuth-effects]'],
    ['robot-sensing',{view:'robotic',rob_sect:'vision'},'[data-robot-sensing]'],
    ['treatment-bands',{view:'metallurgy',met_sect:'pwht'},'[data-met-pwht]']
  ] as const){await mount(page,390,state,true);if(name==='sleuth-effects')await page.locator('[data-sleuth-effect-prose] summary').click();if(name==='robot-sensing')await page.locator('[data-robot-sensing-method="touch"]').click();if(name==='treatment-bands')await page.locator('[data-met-pwht-compare]').click();await inspect(page,name+'-contrast',selector);}
});
test('Local preview routes expose all three new module improvements',async({page})=>{
  await page.setViewportSize({width:390,height:900});await page.goto('http://127.0.0.1:8741/tmp/weld-review/index.html?pass=systems#sensing');
  await expect(page.locator('[data-robot-sensing]')).toBeVisible();await page.getByRole('button',{name:'Clue effects',exact:true}).click();await expect(page.locator('[data-sleuth-effects]')).toBeVisible();await page.getByRole('button',{name:'Treatment bands',exact:true}).click();await expect(page.locator('[data-met-pwht]')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
