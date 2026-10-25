import {test,expect,type Page} from '@playwright/test';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {makeHarness,mount,data,accessibility} from './helpers/migration_round31';
const report=join(process.cwd(),'reports/migration-deep-review-round39-2026-10-23');
const source=readFileSync(join(process.cwd(),'stem_lab/stem_tool_migration.js'));
if(!source.equals(readFileSync(join(process.cwd(),'desktop/web-app/public/stem_lab/stem_tool_migration.js'))))throw Error('Mirror mismatch');
const hash=createHash('sha256').update(source).digest('hex');
const harness=makeHarness('stem_lab/stem_tool_migration.js');
const tabs=['flight3d','vformation','wind','routes','world','aero','navigate','inquiry'];
test.beforeAll(async()=>{mkdirSync(report,{recursive:true});await harness.start();});test.afterAll(async()=>harness.stop());test.afterEach(async({page})=>harness.destroy(page));
async function enter(page:Page,selector:string){await page.locator(selector).focus();await page.keyboard.press('Enter');}
async function scan(page:Page){return page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('.migration-tool-shell'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return {violations:r.violations,incomplete:r.incomplete.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})),width:innerWidth,scrollWidth:document.documentElement.scrollWidth};});}
async function focusProof(page:Page,selector:string){await page.locator(selector).focus();return page.locator(selector).evaluate(n=>{const c=getComputedStyle(n),r=n.getBoundingClientRect(),p=getComputedStyle(n,'::after');return{selector:n.tagName,color:c.outlineColor,style:c.outlineStyle,width:c.outlineWidth,offset:c.outlineOffset,visible:n.matches(':focus-visible'),rect:{x:r.x,y:r.y,width:r.width,height:r.height},overlay:{content:p.content,border:p.borderColor,pointerEvents:p.pointerEvents}};});}
for(const mode of ['light','dark'])test('WCAG learning journey '+mode,async({page})=>{
 const dark=mode==='dark';await page.setViewportSize({width:dark?320:1280,height:900});
 await mount(harness,page,'canada_goose',{dark,reduced:true});await page.addScriptTag({path:join(process.cwd(),'axe-core/4.12.1/axe.min.js')});
 const audits=[];for(const tab of tabs){await enter(page,'[data-migration-tab="'+tab+'"]');await expect(page.locator('[role="tabpanel"]')).toHaveAttribute('aria-labelledby',await page.locator('[data-migration-tab="'+tab+'"]').getAttribute('id') || '');const r=await scan(page);audits.push({tab,...r});expect(r.violations,tab+JSON.stringify(r.violations)).toEqual([]);expect(r.scrollWidth).toBeLessThanOrEqual(r.width+1);}
 await enter(page,'[data-migration-tab="wind"]');
 const field=page.locator('[data-wind-placement-canvas]');await page.getByRole('button',{name:/^Place Mountain:/}).focus();await page.keyboard.press('Enter');
 await enter(page,'[data-wind-placement-focus]');await expect(field).toBeFocused();await page.keyboard.press('ArrowRight');await page.keyboard.press('Shift+ArrowUp');
 await expect(page.locator('[data-wind-placement-position]')).toContainText('55% from the left, 49% from the top');await page.keyboard.press('Enter');
 let state=await data(page);expect(state.windObjects).toHaveLength(1);expect(state.windObjects[0].type).toBe('mountain');
 const box=await field.boundingBox();expect(state.windObjects[0].x).toBeCloseTo(box!.width*.55,0);expect(state.windObjects[0].y).toBeCloseTo((box!.height-35)*.49,0);
 await expect(field).toBeFocused();await expect(page.locator('[data-wind-placement-status]')).toContainText('Mountain placed');
 await page.getByRole('button',{name:/^Place Lake:/}).focus();await page.keyboard.press('Space');
 await page.locator('[data-wind-placement-axis=x]').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
 await page.locator('[data-wind-placement-axis=y]').focus();await page.keyboard.press('End');
 await enter(page,'[data-wind-placement-place]');state=await data(page);expect(state.windObjects).toHaveLength(2);expect(state.windObjects[1].type).toBe('lake');
 await expect(page.locator('[data-wind-placement-status]')).toContainText('1% from the left, 100% from the top');
 await page.getByRole('button',{name:/^Place Forest:/}).focus();await page.keyboard.press('Enter');await enter(page,'[data-wind-placement-focus]');await page.keyboard.press('Escape');expect((await data(page)).windObjects).toHaveLength(2);await expect(page.locator('[data-wind-placement-status]')).toContainText('cancelled');
 // Keep placement tied to the logical field after its displayed size changes.
 await page.setViewportSize({width:dark?640:320,height:900});
 await page.getByRole('button',{name:/^Place Thermal:/}).focus();await page.keyboard.press('Enter');
 for(const axis of ['x','y']){await page.locator('[data-wind-placement-axis='+axis+']').focus();await page.keyboard.press('Home');for(let i=0;i<5;i++)await page.keyboard.press('PageUp');}
 await enter(page,'[data-wind-placement-place]');state=await data(page);expect(state.windObjects).toHaveLength(3);expect(state.windObjects[2].x).toBeCloseTo(box!.width*.5,0);expect(state.windObjects[2].y).toBeCloseTo((box!.height-35)*.5,0);
 await expect(page.locator('[data-wind-placement-place]')).toBeFocused();await expect(page.locator('[data-wind-placement-place]')).toHaveAttribute('aria-disabled','true');
 await page.getByRole('button',{name:/^Place Building:/}).click();const resized=await field.boundingBox();await field.evaluate(n=>n.addEventListener('click',e=>{const r=n.getBoundingClientRect(),m=e as MouseEvent;(window as any).__placementClick={x:m.clientX-r.left,y:m.clientY-r.top,width:r.width,height:r.height};},{once:true,capture:true}));await field.click({position:{x:resized!.width*.25,y:resized!.height*.25}});
 // Native MouseEvent coordinates round to CSS pixels; compare the actual dispatched location.
 const pointer=await page.evaluate(()=>(window as any).__placementClick);state=await data(page);expect(state.windObjects).toHaveLength(4);expect(state.windObjects[3].x).toBeCloseTo(box!.width*pointer.x/pointer.width,5);expect(state.windObjects[3].y).toBeCloseTo(box!.height*pointer.y/pointer.height,5);
 await page.setViewportSize({width:dark?320:1280,height:900});
 const selected=page.getByRole('radio',{checked:true});await selected.focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('radio',{checked:true})).toBeFocused();await page.keyboard.press('End');await expect(page.getByRole('radio',{checked:true})).toBeFocused();expect((await data(page)).windDir).toBe(315);await page.keyboard.press('Home');expect((await data(page)).windDir).toBe(0);await page.keyboard.press('Tab');expect(await page.getByRole('radio',{checked:true}).evaluate(n=>n===document.activeElement)).toBe(false);
 expect((await scan(page)).violations).toEqual([]);
 await page.locator('[data-wind-placement-controls]').screenshot({path:join(report,mode+'-wind-controls.png')});
 for(const tab of ['vformation','navigate']){await enter(page,'[data-migration-tab="'+tab+'"]');const button=page.locator('.migration-disclosure-trigger').first();await button.focus();await page.keyboard.press('Enter');await expect(button).toHaveAttribute('aria-expanded','true');const id=await button.getAttribute('aria-controls');const content=page.locator('#'+id);await expect(content).toBeVisible();expect(await content.evaluate(n=>!!n.closest('button,[role=button]'))).toBe(false);await expect(button).toBeFocused();expect(await button.getAttribute('aria-label')).toBeNull();await page.keyboard.press('Space');await expect(content).toBeHidden();await page.keyboard.press('Enter');await expect(content).toBeVisible();expect((await scan(page)).violations).toEqual([]);}
 await page.setViewportSize({width:320,height:900});await page.addStyleTag({content:'.migration-tool-shell *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important;}.migration-tool-shell p{margin-bottom:2em!important;}'});
 const spacing=[];for(const tab of tabs){await enter(page,'[data-migration-tab="'+tab+'"]');const r=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));spacing.push({tab,...r});expect(r.scrollWidth,tab).toBeLessThanOrEqual(r.width+1);}
 await enter(page,'[data-migration-tab="flight3d"]');const focus=[];for(const selector of ['.migration-guide > summary','.migration-missions > summary','.migration-flight-stage']){const p=await focusProof(page,selector);focus.push(p);expect(p.visible).toBe(true);expect(p.width).toBe('3px');expect(parseFloat(p.offset)).toBeLessThan(0);}
 await page.locator('.migration-guide > summary').focus();await page.locator('.migration-guide > summary').screenshot({path:join(report,mode+'-summary-focus.png')});
 const final=await accessibility(page);expect(final.errors).toEqual([]);expect(final.violations).toEqual([]);
 writeFileSync(join(report,mode+'-wcag-proof.json'),JSON.stringify({hash,audits,spacing,focus,final},null,2));
});
test('system forced colors preserve focus and selection',async({page})=>{
 await page.emulateMedia({forcedColors:'active'});await mount(harness,page,'canada_goose',{reduced:true});await page.keyboard.press('Tab');
 const focus=[];for(const selector of ['.migration-guide > summary','.migration-missions > summary','.migration-flight-stage']){const p=await focusProof(page,selector);focus.push(p);expect(p.visible).toBe(true);expect(p.style).toBe('solid');expect(parseFloat(p.offset)).toBeLessThan(0);}
 await enter(page,'[data-migration-tab="wind"]');const tab=await page.locator('[data-migration-tab="wind"]').evaluate(n=>({style:getComputedStyle(n).borderTopStyle,width:getComputedStyle(n).borderTopWidth}));expect(tab).toEqual({style:'double',width:'3px'});
 await page.getByRole('button',{name:/^Place Mountain:/}).focus();await page.keyboard.press('Enter');const pressed=await page.getByRole('button',{name:/^Place Mountain:/}).evaluate(n=>({style:getComputedStyle(n).borderTopStyle,width:getComputedStyle(n).borderTopWidth}));expect(pressed).toEqual({style:'double',width:'3px'});
 await page.locator('.migration-route-board').screenshot({path:join(report,'forced-colors-tabs.png')});writeFileSync(join(report,'forced-colors-proof.json'),JSON.stringify({hash,focus,tab,pressed},null,2));
});
