import { test } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const folder=resolve('tmp/weld-wcag-refresh');
const output=resolve('reports/weldlab-wcag-refresh');
const harness=new GlHarness({toolId:'weldLab',toolFile:'stem_lab/stem_tool_weldlab.js',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],appStyles:true,layout:'document'});
test.describe.configure({timeout:900_000,retries:0});
test.use({video:'off'});
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
test.afterAll(async()=>{await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});
const fixtures=JSON.parse(readFileSync(resolve(folder,'audit-fixtures.json'),'utf8'));
test('Broad WCAG AA discovery audit across module and activity states',async({page})=>{
  const rows:any[]=[];
  const phase=process.env.WELDLAB_AUDIT_PHASE||'baseline';
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const fixture of fixtures.filter((f:any)=>!process.env.WELDLAB_AUDIT_FILTER||process.env.WELDLAB_AUDIT_FILTER.split(',').includes(f.name))){
    await page.setViewportSize({width:1280,height:900});
    await harness.mount(page,{weldLab:fixture.state},undefined,{expectCanvas:false});
    await page.addStyleTag({content:'html,body{height:auto;background:#f8fafc}#wrap{width:100%;height:auto;display:block}'});
    await page.locator('#wrap').evaluate((el:HTMLElement)=>{el.style.width='100%';el.style.height='auto';el.style.display='block';});
    await page.waitForFunction(()=>Math.abs(document.getElementById('wrap')!.getBoundingClientRect().width-innerWidth)<1);
    for(const contrast of [false,true]){
      if(contrast)await page.evaluate(()=>{document.body.classList.add('theme-contrast');(window as any).__ctx.isContrast=true;(window as any).__ctx.theme='contrast';(window as any).__rerender();});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      if(contrast)await page.waitForFunction(()=>[...document.querySelectorAll('button[aria-label^="Open Welder"] [style]')].filter(el=>el.textContent?.trim()&&el.getAttribute('style')?.includes('color: rgb(255, 255, 255)')).every(el=>getComputedStyle(el).color==='rgb(255, 255, 255)'));
      if(contrast)await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,250)));
      const result=await page.evaluate(async()=>{
        (window as any).axe.reset();
        const audit=await (window as any).axe.run(document.getElementById('wrap'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
        return {violations:audit.violations.map((v:any)=>({id:v.id,impact:v.impact,help:v.help,tags:v.tags,nodes:v.nodes.map((n:any)=>({target:n.target,html:n.html,summary:n.failureSummary}))})),incomplete:audit.incomplete.map((v:any)=>({id:v.id,count:v.nodes.length})),passes:audit.passes.length};
      });
      await page.setViewportSize({width:320,height:900});
      const reflow=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,nodes:[...document.querySelectorAll('body *')].filter(el=>el instanceof HTMLElement&&el.getBoundingClientRect().right>innerWidth+1&&!el.closest('.overflow-x-auto,[style*="overflow-x: auto"],[style*="overflow: auto"]')).slice(0,8).map(el=>({tag:el.tagName,html:el.outerHTML.slice(0,220),right:el.getBoundingClientRect().right}))}));
      const diagnostic=process.env.WELDLAB_AUDIT_FILTER?await page.evaluate(()=>[...document.querySelectorAll('button[aria-label^="Open Welder"] [style]')].map((el:HTMLElement)=>({tag:el.tagName,text:el.textContent?.slice(0,80),style:el.getAttribute('style'),computed:getComputedStyle(el).color,parentBg:getComputedStyle(el.parentElement!).backgroundColor}))):undefined;
      if(process.env.WELDLAB_AUDIT_FILTER&&contrast&&fixture.state.view==='menu')await page.locator('button[aria-label^="Open Welder"]').screenshot({path:resolve(output,phase+'-'+fixture.name+'-tile.png')});
      if(process.env.WELDLAB_AUDIT_FILTER&&contrast&&await page.locator('[data-weld-microstructure-key]').count())await page.locator('[data-weld-microstructure-key]').locator('..').screenshot({path:resolve(output,phase+'-'+fixture.name+'-haz.png')});
      rows.push({name:fixture.name,state:fixture.state,contrast,...result,reflow,diagnostic});
      await page.setViewportSize({width:1280,height:900});
    }
    writeFileSync(resolve(output,phase+'-audit.json'),JSON.stringify(rows,null,2));
    console.log(fixture.name+': '+rows.slice(-2).map(r=>r.violations.reduce((n:any,v:any)=>n+v.nodes.length,0)+' findings/'+r.reflow.overflow+'px overflow').join(', '));
  }
});
