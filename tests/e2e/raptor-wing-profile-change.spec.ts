import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

test.use({video:'off',trace:'off',hasTouch:true});test.describe.configure({timeout:180000,retries:0});
const output=resolve('reports/avian-simulations-round33-2026-10-22/raptor'),root='[data-wing-profile-study]';
const harness=new GlHarness({toolId:'raptorHunt',toolFile:'stem_lab/stem_tool_raptorhunt.js',width:1100,height:1000,appStyles:true,layout:'document',extraScripts:['node_modules/axe-core/axe.min.js']});
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
const opening=[55,60,65,70,75,80,85,90,95,100];
async function mount(page:Page){const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1280,height:1000});await harness.mount(page,{raptorHunt:{activeSection:'wingformula',wingFormulaSpeciesIdx:0,wingFormulaOwner:0,wingFormulaLengths:opening.slice(),wingFormulaFocus:4,wingFormulaCompareIdx:2}},undefined,{expectCanvas:false});await expect(page.locator(root)).toBeVisible();return errors;}
async function values(page:Page):Promise<number[]>{return JSON.parse((await page.locator(root).getAttribute('data-profile-values'))!);}
async function verify(page:Page,wanted:number[],pin?:number[]){
  expect(await values(page)).toEqual(wanted);
  const data=await page.locator(root).evaluate(n=>({tips:[...n.querySelectorAll('[data-profile-tip]')].map(p=>[Number(p.getAttribute('cx')),Number(p.getAttribute('cy'))]),paths:[...n.querySelectorAll('[data-profile-curve]')].map(p=>({kind:p.getAttribute('data-profile-curve'),d:p.getAttribute('d')})),bars:[...n.querySelectorAll('[data-profile-bar]')].map(p=>({left:(p as HTMLElement).style.left,width:(p as HTMLElement).style.width})),mean:n.querySelector('[data-profile-mean]')!.textContent,spread:n.querySelector('[data-profile-spread]')!.textContent}));
  for(let i=0;i<10;i++){expect(data.tips[i][0]).toBe(80+62*i);expect((220-data.tips[i][1])/3+50).toBe(wanted[i]);const change=pin?wanted[i]-pin[i]:0;expect(parseFloat(data.bars[i].left)).toBe(pin?Math.min(50,50+change):0);expect(parseFloat(data.bars[i].width)).toBe(pin?Math.abs(change):(wanted[i]-50)*2);}
  expect(data.spread).toBe(`${Math.max(...wanted)-Math.min(...wanted)} pts`);
  const native=await page.locator('[data-raptor-wing-formula-stage] [data-wing-primary]').evaluateAll(ns=>ns.map(n=>Number(n.getAttribute('data-wing-length'))));expect(native).toEqual(wanted);
  if(pin){expect(data.mean).toBe((wanted.reduce((a,v,i)=>a+Math.abs(v-pin[i]),0)/10).toFixed(1)+' pts');const coordinates=data.paths.find(p=>p.kind==='saved')!.d!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);expect(coordinates.filter((_,i)=>i%2===1).map(v=>(220-v)/3+50)).toEqual(pin);}
  return data;
}
test('complete saved profiles, individual changes, equal shifts, ties and all eight references remain synchronized',async({page})=>{
  const errors=await mount(page),checks:any[]=[];await verify(page,opening);await page.locator('[data-profile-keep]').click();
  const saved=JSON.parse((await page.locator('[data-profile-saved]').getAttribute('data-profile-saved'))!);
  await page.locator('[data-profile-row="4"]').click();await page.locator('[data-profile-length]').fill('95');const changed=opening.slice();changed[4]=95;checks.push(await verify(page,changed,opening));await expect(page.locator('[data-profile-rank]')).toContainText('P5 = P9');
  await page.locator('[data-profile-restore-one]').click();await verify(page,opening,opening);
  await expect(page.locator('[data-profile-shift="5"]')).toBeDisabled();await page.locator('[data-profile-shift="-5"]').click();const shifted=opening.map(v=>v-5);await verify(page,shifted,opening);await expect(page.locator('[data-profile-shift="-5"]')).toBeDisabled();
  await page.locator('[data-profile-shift="5"]').click();await verify(page,opening,opening);
  const tabs=page.locator('.rh-wing-formula-tabs [role=tab]');expect(await tabs.count()).toBe(8);
  for(let i=0;i<8;i++){await tabs.nth(i).click();const current=await values(page);checks.push(await verify(page,current,opening));await expect(page.locator('[data-profile-saved]')).toHaveAttribute('data-profile-saved',JSON.stringify(saved));}
  await page.locator('[data-profile-restore]').click();await verify(page,opening,opening);await expect(page.locator(root)).toHaveAttribute('data-profile-focus','4');
  expect(await page.evaluate(()=>{const s=(window as any).__toolData.raptorHunt;return [s.wingFormulaSpeciesIdx,s.wingFormulaOwner,s.wingFormulaCompareIdx];})).toEqual([0,0,2]);
  await page.locator('[data-profile-clear]').click();await expect(page.locator('[data-profile-keep]')).toBeFocused();await expect(page.locator('[data-profile-curve=saved]')).toHaveCount(0);
  expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);writeFileSync(resolve(output,'profile-geometry.json'),JSON.stringify(checks,null,2));
});
test('keyboard, touch and responsive comparisons keep their readable axes and accessible controls',async({page})=>{
  const errors=await mount(page),layouts:any[]=[];await page.locator('[data-profile-keep]').click();
  await page.locator('[data-profile-row="2"]').focus();await page.keyboard.press('Enter');await expect(page.locator(root)).toHaveAttribute('data-profile-focus','2');await page.locator('[data-profile-length]').focus();await page.keyboard.press('End');await expect(page.locator('[data-profile-length]')).toHaveValue('100');await page.keyboard.press('Home');await expect(page.locator('[data-profile-length]')).toHaveValue('50');
  await page.locator('[data-profile-length]').fill('82');
  for(const [width,host] of [[1280,1100],[1280,500],[390,390]]){
    await page.setViewportSize({width,height:1000});await page.locator('#wrap').evaluate((n:HTMLElement,w)=>{n.style.width=w+'px';n.style.maxWidth='100%';},host);
    const checks=await page.locator(root).evaluate(async n=>({overflow:document.documentElement.scrollWidth-innerWidth,controls:[...n.querySelectorAll('button,input')].map(c=>({h:c.getBoundingClientRect().height,w:c.getBoundingClientRect().width})),labels:[...n.querySelectorAll('svg text')].map(c=>({display:getComputedStyle(c).display,h:c.getBoundingClientRect().height})),violations:(await (window as any).axe.run(n,{runOnly:{type:'rule',values:['color-contrast','button-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))}));
    expect(checks.overflow).toBeLessThanOrEqual(1);checks.controls.forEach(c=>expect(c.h).toBeGreaterThanOrEqual(44));checks.labels.forEach(t=>{expect(t.display).not.toBe('none');expect(t.h).toBeGreaterThan(9);});expect(checks.violations).toEqual([]);layouts.push({width,host,...checks});
    if(host===1100||host===390){await page.setViewportSize({width,height:3200});await page.locator(root).evaluate(n=>{for(let p=n.parentElement;p;p=p.parentElement)p.scrollTop=0;window.scrollTo(0,0);n.scrollIntoView({block:'center',behavior:'instant'});});await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});const b=(await page.locator(root).boundingBox())!;expect(b.y).toBeGreaterThanOrEqual(0);expect(b.y+b.height).toBeLessThanOrEqual(3200);const path=resolve(output,`profile-${host}.png`);await page.locator(root).screenshot({path,animations:'disabled',scale:'css'});const png=readPng(readFileSync(path));expect(Math.abs(png.width-b.width)).toBeLessThanOrEqual(2);expect(Math.abs(png.height-b.height)).toBeLessThanOrEqual(2);await page.setViewportSize({width,height:1000});}
  }
  await page.locator('[data-profile-row="8"]').tap();await expect(page.locator(root)).toHaveAttribute('data-profile-focus','8');await page.locator('[data-profile-step="-5"]').tap();expect((await values(page))[8]).toBe(90);
  await verify(page,await values(page),opening);expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);writeFileSync(resolve(output,'layouts.json'),JSON.stringify(layouts,null,2));
});
