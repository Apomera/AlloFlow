import {test, expect, type Page} from '@playwright/test';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off', trace:'off', hasTouch:true});
test.describe.configure({retries:0, timeout:180000});
const output=resolve('reports/avian-simulations-round42-wcag-2026-10-23');
const bird=new GlHarness({toolId:'birdLab',toolFile:'stem_lab/stem_tool_birdlab.js',preScripts:['stem_lab/stem_lab_module.js'],extraScripts:['node_modules/axe-core/axe.min.js'],width:1100,height:1000,appStyles:true,layout:'document'});
const raptor=new GlHarness({toolId:'raptorHunt',toolFile:'stem_lab/stem_tool_raptorhunt.js',extraScripts:['node_modules/axe-core/axe.min.js'],width:1100,height:1000,appStyles:true,layout:'document'});
const errors=new WeakMap<Page,string[]>();
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await bird.start();await raptor.start();});
test.afterAll(async()=>{await bird.stop();await raptor.stop();});
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.stack||e.message));});
test.afterEach(async({page})=>{await bird.destroy(page);expect(errors.get(page)).toEqual([]);});
async function mount(page:Page,kind:'bird'|'raptor'){
 await page.setViewportSize({width:1280,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 await (kind==='bird'?bird:raptor).mount(page,kind==='bird'?{birdLab:{view:'featherAnatomy',blXp:0,blLifeList:{},blBadges:{}}}:{raptorHunt:{activeSection:'ecology'}},undefined,{expectCanvas:false});
 await page.locator('#wrap').evaluate((n:HTMLElement)=>{n.style.maxWidth='100%';n.setAttribute('data-stem-tool-shell','true');});
}
async function audit(page:Page,scope:string,id:string){
 const scans=[];
 for(const width of [1280,320]){
  await page.setViewportSize({width,height:1000});await page.locator('#wrap').evaluate((n:HTMLElement,w)=>n.style.width=Math.min(1100,w)+'px',width);
  const scan=await page.evaluate(async scope=>{const result=await(window as any).axe.run(scope,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return {violations:result.violations,incomplete:result.incomplete.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})),pageWidth:document.documentElement.scrollWidth};},scope);
  scans.push({width,...scan});expect(scan.violations).toEqual([]);expect(scan.pageWidth).toBeLessThanOrEqual(width);
 }
 const style=await page.addStyleTag({content:`${scope},${scope} *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}${scope} p{margin-bottom:2em!important}`});
 const spacing=await page.locator(scope).evaluate(n=>({width:document.documentElement.scrollWidth,clipped:[...n.querySelectorAll('button,summary,td,th,dt,dd')].filter(e=>e.getClientRects().length&&(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)).map(e=>({tag:e.tagName,text:e.textContent}))}));
 await style.evaluate(n=>n.remove());writeFileSync(resolve(output,id+'-audit.json'),JSON.stringify({scans,spacing},null,2));expect(spacing.width).toBeLessThanOrEqual(320);expect(spacing.clipped).toEqual([]);
}
async function focus(page:Page,selector:string){
 await page.keyboard.press('Tab');const item=page.locator(selector);await item.focus();await item.scrollIntoViewIfNeeded();await expect(item).toBeFocused();
 const result=await item.evaluate(n=>{const s=getComputedStyle(n);let parent=n.parentElement!;while(parent.parentElement&&getComputedStyle(parent).backgroundColor==='rgba(0, 0, 0, 0)')parent=parent.parentElement;const background=getComputedStyle(parent).backgroundColor;function luminance(color:string){const channels=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;}const a=luminance(s.outlineColor),b=luminance(background);return{outline:s.outlineStyle,width:s.outlineWidth,color:s.outlineColor,background,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),visible:n.matches(':focus-visible')};});expect(result.visible).toBe(true);expect(result.outline).toBe('solid');expect(result.width).toBe('3px');expect(result.contrast).toBeGreaterThanOrEqual(3);return {selector,...result};
}
async function photo(page:Page,selector:string,file:string){await page.locator(selector).scrollIntoViewIfNeeded();await page.locator(selector).screenshot({path:resolve(output,file),animations:'disabled'});}

test('vane contacts offer a keyboard comparison, full saved-view restoration and readable results',async({page})=>{
 await mount(page,'bird');const scope='[data-birdlab-vane-study]',status=page.locator('[data-vane-notice]'),play=page.locator('[data-vane-play]');
 const progress=await page.evaluate(()=>JSON.stringify((window as any).__toolData.birdLab));
 const motionStyles=await page.locator(scope+' svg,'+scope+' svg *').evaluateAll(nodes=>nodes.map(n=>({property:getComputedStyle(n).transitionProperty,animation:getComputedStyle(n).animationName})));expect(motionStyles.every(s=>s.property==='none'&&s.animation==='none')).toBe(true);writeFileSync(resolve(output,'vane-drawing-motion.json'),JSON.stringify({elements:motionStyles.length,cssTweensDisabled:true},null,2));
 await expect(play).toBeDisabled();await expect(page.getByRole('slider',{name:'Initial opening',exact:true})).toHaveAttribute('aria-valuetext','70 of 100 schematic opening units');
 await expect(page.getByRole('slider',{name:'Smoothing pass',exact:true})).toHaveAttribute('aria-valuetext',/35 percent.*4 of 12/);
 await page.locator('[data-vane-data] summary').click();const rows=page.locator('[data-vane-data] tbody tr');await expect(rows).toHaveCount(12);await expect(rows.locator('td')).toHaveText(Array.from({length:12},(_,i)=>i<4?'Rejoined':'Open'));
 await page.locator('#birdlab-vane-opening').fill('100');await page.locator('[data-vane-lens=barbules]').click();await page.locator('#birdlab-vane-junction').fill('8');await page.locator('[data-vane-pin]').click();
 await expect(status).toContainText('View pinned. 0 of 12');await expect(status).toContainText('Selected contact 9.');
 await page.locator('#birdlab-vane-stroke').fill('50');await page.locator('[data-vane-lens=barbs]').click();
 for(let i=0;i<12;i++)await expect(rows.nth(i).locator('td')).toHaveText([i<6?'Rejoined':'Open','Open']);
 await page.locator('[data-vane-inspect="2"]').focus();await page.keyboard.press('Space');await expect(page.locator('[data-vane-inspect="2"]')).toBeFocused();await expect(page.locator('#birdlab-vane-junction')).toHaveValue('2');await expect(status).toHaveText('Contact 3: rejoined in the current drawing; open in the pinned drawing.');
 await page.locator('[data-vane-first-open]').focus();await page.keyboard.press('Enter');await expect(page.locator('#birdlab-vane-junction')).toHaveValue('6');await expect(page.locator('[data-vane-contact-detail]')).toHaveAccessibleName(/contact 7: hook separated/);
 await page.locator('[data-vane-read]').click();await expect(status).toContainText('Current: 6 of 12');await expect(status).toContainText('Pinned: 0 of 12');const snapshot=await status.textContent();await page.locator('#birdlab-vane-stroke').fill('100');await expect(status).toHaveText(snapshot!);
 await expect(page.locator('[data-vane-first-open]')).toHaveAttribute('aria-disabled','true');await page.locator('[data-vane-first-open]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-vane-first-open]')).toBeFocused();await expect(page.locator('#birdlab-vane-junction')).toHaveValue('6');
 await page.locator('[data-vane-restore]').click();await expect(page.locator('#birdlab-vane-opening')).toHaveValue('100');await expect(page.locator('#birdlab-vane-stroke')).toHaveValue('0');await expect(page.locator('#birdlab-vane-junction')).toHaveValue('8');await expect(page.locator('[data-vane-lens=barbules]')).toHaveAttribute('aria-pressed','true');await expect(status).toContainText('Pinned view restored.');
 await page.locator('#birdlab-vane-opening').fill('0');await expect(rows.locator('td').filter({hasText:'Rejoined'})).toHaveCount(12);await expect(page.locator('[data-vane-first-open]')).toHaveAttribute('aria-disabled','true');
 await page.locator('[data-vane-clear-pin]').click();await expect(page.locator('[data-vane-pin]')).toBeFocused();await expect(rows.locator('td')).toHaveCount(12);await expect(page.locator('[data-vane-restore]')).toBeDisabled();
 await page.locator('#birdlab-vane-opening').fill('70');await page.locator('[data-vane-pin]').click();await page.locator('#birdlab-vane-stroke').fill('50');await page.locator('[data-vane-inspect="6"]').click();
 await expect(page.locator(scope+' output:not([aria-hidden=true])')).toHaveCount(0);await audit(page,scope,'vane');
 const targets=await page.locator(scope+' button,'+scope+' input').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44;}).map(n=>n.id||n.textContent));expect(targets).toEqual([]);
 const normal=await focus(page,'[data-vane-inspect="6"]');await photo(page,'[data-vane-data]','vane-contacts-320.png');await photo(page,'.birdlab-vane-detail','vane-detail-320.png');await page.emulateMedia({forcedColors:'active'});const forced=await focus(page,'[data-vane-data] summary');await expect(page.locator('[data-vane-specimen=current] > rect').first()).toHaveCSS('fill','rgb(255, 255, 255)');await photo(page,'[data-vane-specimen=current]','vane-forced-320.png');
 expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);writeFileSync(resolve(output,'vane-feedback.json'),JSON.stringify({normal,forced,fullRestore:true,zeroOpeningAllJoined:true,clearRestoresFocus:true,quietManualChanges:true,minimum44px:true},null,2));
});

test('vane playback pauses for inspection, loss of attention and motion preference changes',async({page})=>{
 await mount(page,'bird');const root=page.locator('[data-birdlab-vane-study]'),play=page.locator('[data-vane-play]'),status=page.locator('[data-vane-notice]');await expect(play).toBeDisabled();await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-vane-pin]').click();const cases=[];
 for(const reason of ['read','contact','table','blur','hidden','reduced','restore']){
  await page.locator('#birdlab-vane-stroke').fill('35');if(await page.locator('[data-vane-data]').getAttribute('open')!==null)await page.locator('[data-vane-data] summary').click();
  await play.click();await expect(root).toHaveAttribute('data-playing','true');const message=await status.textContent();await expect.poll(async()=>Number(await root.getAttribute('data-vane-stroke'))).toBeGreaterThan(35);await expect(status).toHaveText(message!);
  if(reason==='read')await page.locator('[data-vane-read]').click();if(reason==='contact')await page.locator('[data-vane-first-open]').click();if(reason==='table')await page.locator('[data-vane-data] summary').click();if(reason==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));if(reason==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete(document as any).hidden;});if(reason==='reduced')await page.emulateMedia({reducedMotion:'reduce'});if(reason==='restore')await page.locator('[data-vane-restore]').click();
  await expect(root).toHaveAttribute('data-playing','false');const stopped=await root.getAttribute('data-vane-stroke');await page.waitForTimeout(100);await expect(root).toHaveAttribute('data-vane-stroke',stopped!);cases.push({reason,stopped});if(reason==='reduced'){await expect(play).toBeDisabled();await page.emulateMedia({reducedMotion:'no-preference'});await expect(root).toHaveAttribute('data-playing','false');}
 }
 writeFileSync(resolve(output,'vane-pause-cases.json'),JSON.stringify(cases,null,2));
});

test('encounter comparisons expose finite and zero-rate budgets in semantic tables',async({page})=>{
 await mount(page,'raptor');const scope='[data-raptor-encounter-study]',status=page.locator('[data-encounter-notice]');const row=(key:string,condition='current')=>page.locator('[data-encounter-row='+key+'] [data-condition='+condition+']');
 await expect(page.getByRole('slider',{name:'Effective search coefficient · a',exact:true})).toHaveAttribute('aria-valuetext','0.5 area units per search-time unit');await expect(page.getByRole('slider',{name:'Handling time per capture · h',exact:true})).toHaveAttribute('aria-valuetext','0.2 time units per prey');await expect(page.getByRole('slider',{name:'Shared prey-density inspector · N',exact:true})).toHaveAttribute('aria-valuetext','20 prey per area unit');
 await page.locator('[data-encounter-data] summary').click();
 const baseline={search:'0.500',handling:'0.200',rate:'3.333','search-share':'33.333%','handling-share':'66.667%',wait:'0.100',cycle:'0.300',ceiling:'5.000'};for(const[key,value]of Object.entries(baseline))await expect(row(key)).toHaveText(value);
 await page.locator('[data-encounter-pin]').click();await page.locator('[data-encounter-experiment=double-search]').click();await expect(status).toContainText('Doubled effective searching');
 const doubled={search:'1.000',handling:'0.200',rate:'4.000','search-share':'20.000%','handling-share':'80.000%',wait:'0.050',cycle:'0.250',ceiling:'5.000'};for(const[key,value]of Object.entries(doubled)){await expect(row(key)).toHaveText(value);await expect(row(key,'pinned')).toHaveText((baseline as any)[key]);}
 await page.locator('[data-encounter-read]').click();await expect(status).toContainText('Budget snapshot at density 20');await expect(status).toContainText('Current: Expected captures 4.000');await expect(status).toContainText('Pinned: Expected captures 3.333');const message=await status.textContent();await page.locator('#rh-encounter-density').fill('0');await expect(status).toHaveText(message!);
 for(const condition of ['current','pinned']){await expect(row('rate',condition)).toHaveText('0.000');await expect(row('search-share',condition)).toHaveText('100.000%');await expect(row('handling-share',condition)).toHaveText('0.000%');await expect(row('wait',condition)).toHaveText('No finite wait');await expect(row('cycle',condition)).toHaveText('No finite cycle');}await page.locator('[data-encounter-read]').click();await expect(status).toContainText('No finite mean search wait or capture cycle.');
 await page.locator('#rh-encounter-density').fill('20');await page.locator('[data-encounter-experiment=no-handling]').click();await expect(row('rate')).toHaveText('10.000');await expect(row('cycle')).toHaveText('0.100');await expect(row('ceiling')).toHaveText('No finite ceiling');await page.locator('#rh-encounter-search').fill('0');await expect(row('rate')).toHaveText('0.000');await expect(row('wait')).toHaveText('No finite wait');
 await page.locator('[data-encounter-restore]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-encounter-restore]')).toBeFocused();await expect(page.locator('#rh-encounter-search')).toHaveValue('0.5');await expect(page.locator('#rh-encounter-handling')).toHaveValue('0.2');await expect(page.locator('#rh-encounter-density')).toHaveValue('20');
 await page.locator('[data-encounter-clear-pin]').click();await expect(page.locator('[data-encounter-pin]')).toBeFocused();await expect(page.locator('[data-encounter-data] th[scope=col]')).toHaveText(['Measurement','Current']);await expect(page.locator('[data-encounter-restore]')).toBeDisabled();
 await page.locator('[data-encounter-pin]').click();await page.locator('[data-encounter-experiment=double-handling]').click();await page.locator('[data-encounter-answer=budget]').click();await expect(page.locator('[data-encounter-answer=budget]')).toHaveAttribute('aria-pressed','true');await page.locator('[data-encounter-reset]').click();await expect(status).toContainText('Physical settings reset');await expect(page.locator('[data-encounter-answer=budget]')).toHaveAttribute('aria-pressed','false');await page.locator('[data-encounter-experiment=double-search]').click();
 await expect(page.locator(scope+' output:not([aria-hidden=true])')).toHaveCount(0);await audit(page,scope,'encounter');
 const small=await page.locator(scope+' button,'+scope+' input').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).filter(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44;}).map(n=>n.id||n.textContent));expect(small).toEqual([]);
 const normal=await focus(page,'[data-encounter-data] summary');await photo(page,'[data-encounter-data]','encounter-measurements-320.png');await page.emulateMedia({forcedColors:'active'});const forced=await focus(page,'#rh-encounter-density');await expect(page.locator('[data-encounter-plot] svg > rect').first()).toHaveCSS('fill','rgb(255, 255, 255)');await photo(page,'[data-encounter-plot]','encounter-forced-320.png');await photo(page,'[data-encounter-budget=current]','encounter-budget-forced-320.png');writeFileSync(resolve(output,'encounter-feedback.json'),JSON.stringify({normal,forced,baseline,doubled,zeroRatesChecked:true,zeroHandlingChecked:true,restoreAndClearFocus:true,minimum44px:true},null,2));
});
