import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video:'off' });
test.describe.configure({ mode:'default', retries:0, timeout:180_000 });
const harness = new GlHarness({ toolId:'birdLab', toolFile:'stem_lab/stem_tool_birdlab.js', preScripts:['stem_lab/stem_lab_module.js'],
  extraScripts:['node_modules/axe-core/axe.min.js'], width:1100, height:960, appStyles:true, layout:'document' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function sizing(page:Page, viewport:number, host:number) {
  await page.setViewportSize({width:viewport,height:1000});
  await page.locator('#wrap').evaluate((element:HTMLElement,width) => {
    element.style.width=width+'px'; element.style.maxWidth='100%'; element.setAttribute('data-stem-tool-shell','true');
  },host);
}
async function mount(page:Page) {
  await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{birdLab:{view:'footTypes',blXp:0,blLifeList:{},blBadges:{}}},undefined,{expectCanvas:false});
  await sizing(page,1280,1100);
  await expect(page.locator('[data-birdlab-toe-study]')).toBeVisible();
}
async function seek(page:Page,curl:number) {
  await page.locator('#birdlab-toe-curl').fill(String(curl));
  await expect(page.locator('[data-birdlab-toe-study]')).toHaveAttribute('data-toe-curl',curl.toFixed(3));
}
async function nativeGeometry(page:Page) {
  return page.locator('[data-toe-slice="current"]').evaluate(element => {
    const svg=element as unknown as SVGSVGElement, path=svg.querySelector('[data-toe-slice-path]') as SVGPathElement;
    const circle=svg.querySelector('[data-toe-branch]') as SVGCircleElement;
    const length=path.getTotalLength(), samples=Array.from({length:41},(_,index)=>{
      const point=path.getPointAtLength(length*index/40); return [point.x,point.y];
    });
    return {length,radius:circle.r.baseVal.value,samples,stations:[...svg.querySelectorAll('[data-toe-station]')].map(node=>{
      const dot=node as SVGCircleElement;return {fraction:Number(node.getAttribute('data-toe-station')),x:dot.cx.baseVal.value,y:dot.cy.baseVal.value};
    })};
  });
}

test('toe identities persist across arrangements and the native side arc preserves length and stays outside its branch',async({page})=>{
  await mount(page); const progress=await page.evaluate(()=>JSON.stringify((window as any).__toolData.birdLab));
  for(const pattern of [{id:'songbird',outer:0},{id:'parrot',outer:100},{id:'owl',outer:0}]) {
    await page.locator('button[data-toe-kind="'+pattern.id+'"]').click();
    const paths=await page.locator('[data-toe-map="current"]').evaluate(element=>[...element.querySelectorAll('[data-toe-centerline]')].map(node=>{
      const path=node as SVGPathElement, start=path.getPointAtLength(0), end=path.getPointAtLength(path.getTotalLength());
      return {length:path.getTotalLength(),angle:Math.atan2(end.x-start.x,start.y-end.y)*180/Math.PI};
    }));
    const expected=[-152,-31,0,37+1.2*pattern.outer];
    for(let index=0;index<4;index++) { expect(paths[index].angle).toBeCloseTo(expected[index],3); expect(paths[index].length).toBeCloseTo([112,134,160,140][index],3); }
  }
  await page.locator('#birdlab-toe-outer').fill('50');
  const outerVector=await page.locator('[data-toe-centerline="3"]').evaluate(element=>{
    const path=element as unknown as SVGPathElement, first=path.getPointAtLength(0),last=path.getPointAtLength(path.getTotalLength());
    return {x:last.x-first.x,y:last.y-first.y};
  }); expect(Math.atan2(outerVector.x,-outerVector.y)*180/Math.PI).toBeCloseTo(97,3);
  await seek(page,0); await page.locator('[data-toe-pin]').click();
  const pinned=await page.locator('[data-toe-frozen]').innerHTML();
  for(const example of [{toe:0,radius:38,curl:0},{toe:2,radius:38,curl:100},{toe:3,radius:82,curl:63},{toe:1,radius:56,curl:1}]) {
    await page.locator('[data-toe-select="'+example.toe+'"]').click();
    await page.locator('#birdlab-toe-branch').fill(String(example.radius)); await seek(page,example.curl);
    const geometry=await nativeGeometry(page), length=[112,134,160,140][example.toe], amount=example.curl/100, reach=example.radius+6;
    expect(geometry.radius).toBe(example.radius); expect(geometry.length).toBeCloseTo(length,1);
    for(let index=0;index<geometry.samples.length;index++) {
      const fraction=index/40, effective=amount?reach/amount:0, angle=amount?length*fraction/effective:0;
      const x=240+(amount?effective*Math.sin(angle):length*fraction),y=188-reach+(amount?effective*(1-Math.cos(angle)):0);
      expect(Math.hypot(geometry.samples[index][0]-x,geometry.samples[index][1]-y)).toBeLessThan(.05);
      expect(Math.hypot(geometry.samples[index][0]-240,geometry.samples[index][1]-188)).toBeGreaterThanOrEqual(reach-.05);
      if(example.curl===100) expect(Math.hypot(geometry.samples[index][0]-240,geometry.samples[index][1]-188)).toBeCloseTo(reach,1);
    }
    for(const station of geometry.stations) {
      const point=geometry.samples[Math.round(station.fraction*40)]; expect(Math.hypot(station.x-point[0],station.y-point[1])).toBeLessThan(.05);
    }
    expect(await page.locator('[data-toe-frozen]').innerHTML()).toBe(pinned);
  }
  await page.locator('[data-toe-answer="hallux"]').click(); await expect(page.locator('.birdlab-toe-feedback[role="status"]')).toContainText('points backward in both');
  await page.locator('[data-toe-answer="outer"]').click(); await expect(page.locator('.birdlab-toe-feedback[role="status"]')).toContainText('does not mean a songbird can swivel');
  await page.locator('[data-toe-clear-pin]').click(); await expect(page.locator('[data-toe-comparison]')).toHaveCount(0);
  expect(await page.evaluate(()=>JSON.stringify((window as any).__toolData.birdLab))).toBe(progress);
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});

test('the optional curl clock starts paused, supports inspection and stops at the endpoint, on hiding, and on unmount',async({page})=>{
  await mount(page);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{
    let now=1000,id=0;const frames=new Map<number,FrameRequestCallback>();
    requestAnimationFrame=callback=>{frames.set(++id,callback);return id;};cancelAnimationFrame=handle=>{frames.delete(handle);};
    (window as any).toeStep=(ms:number)=>{now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(now));};
    (window as any).toePending=()=>frames.size;
  });
  const root=page.locator('[data-birdlab-toe-study]'), step=(ms:number)=>page.evaluate(ms=>(window as any).toeStep(ms),ms);
  await expect(root).toHaveAttribute('data-playing','false'); const initial=await nativeGeometry(page); await step(5000); expect(await nativeGeometry(page)).toEqual(initial);
  await page.locator('[data-toe-play]').click(); await step(10); await step(80); await expect(root).toHaveAttribute('data-toe-curl','47.000');
  await page.locator('[data-toe-play]').click(); const paused=await nativeGeometry(page);await step(10000);expect(await nativeGeometry(page)).toEqual(paused);
  await page.locator('[data-toe-play]').click();await step(10);await step(80);await expect(root).toHaveAttribute('data-toe-curl','49.000');
  await seek(page,99);await expect(root).toHaveAttribute('data-playing','false');await page.locator('[data-toe-play]').click();await step(10);await step(80);
  await expect(root).toHaveAttribute('data-toe-curl','100.000');await expect(root).toHaveAttribute('data-playing','false');await step(10000);await expect(root).toHaveAttribute('data-toe-curl','100.000');
  await page.locator('[data-toe-play]').click();await expect(root).toHaveAttribute('data-toe-curl','0.000');
  await page.locator('[data-toe-select="0"]').click();await expect(root).toHaveAttribute('data-playing','false');
  await page.locator('[data-toe-play]').click();await page.locator('[data-toe-pin]').click();await expect(root).toHaveAttribute('data-playing','false');
  await page.locator('[data-toe-play]').click();await page.locator('button[data-toe-kind="owl"]').click();await expect(root).toHaveAttribute('data-playing','false');
  await page.locator('[data-toe-play]').click();await page.locator('#birdlab-toe-outer').fill('80');await expect(root).toHaveAttribute('data-playing','false');
  await page.locator('[data-toe-play]').click();await page.locator('#birdlab-toe-branch').fill('70');await expect(root).toHaveAttribute('data-playing','false');
  await page.locator('[data-toe-play]').click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(root).toHaveAttribute('data-playing','false');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(root).toHaveAttribute('data-playing','false');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-toe-play]').click();await page.emulateMedia({reducedMotion:'reduce'});await expect(root).toHaveAttribute('data-playing','false');
  await expect(page.locator('[data-toe-play]')).toBeDisabled();await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-toe-play]').click();await page.getByRole('button',{name:'← Menu',exact:true}).click();await expect(root).toHaveCount(0);await step(10000);
  expect(await page.evaluate(()=>(window as any).toePending())).toBe(0);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});

test('native keyboard controls and the maps remain contained at desktop, phone and embedded sizes with scoped accessible controls',async({page})=>{
  await mount(page);await page.locator('button[data-toe-kind="owl"]').click();
  for(const layout of [{viewport:1280,host:1100},{viewport:390,host:390},{viewport:1280,host:500}]) {
    await sizing(page,layout.viewport,layout.host);
    for(const id of ['#birdlab-toe-outer','#birdlab-toe-curl']) {
      const slider=page.locator(id);await slider.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');await expect(slider).toBeFocused();await expect(slider).toHaveValue('1');await page.keyboard.press('End');await expect(slider).toHaveValue('100');
    }
    const branch=page.locator('#birdlab-toe-branch');await branch.focus();await page.keyboard.press('Home');await expect(branch).toHaveValue('38');await page.keyboard.press('ArrowRight');await expect(branch).toHaveValue('39');await expect(branch).toBeFocused();
    const toe=page.locator('[data-toe-select="3"]');await toe.focus();await page.keyboard.press('Enter');await expect(toe).toBeFocused();await expect(toe).toHaveAttribute('aria-pressed','true');
    await seek(page,65);await page.locator('[data-toe-pin]').click();await page.locator('[data-toe-answer="outer"]').click();
    const host=(await page.locator('#wrap').boundingBox())!;
    for(const selector of ['[data-birdlab-toe-study]','[data-toe-map="current"]','[data-toe-slice="current"]','.birdlab-toe-controls','[data-toe-comparison]','.birdlab-toe-evidence','.birdlab-toe-model']) {
      const element=page.locator(selector),box=(await element.boundingBox())!;expect(box.x,selector).toBeGreaterThanOrEqual(host.x-1);expect(box.x+box.width,selector).toBeLessThanOrEqual(host.x+host.width+1);expect(await element.evaluate(node=>node.scrollWidth-node.clientWidth),selector).toBeLessThanOrEqual(1);
    }
    expect((await page.locator('[data-toe-map="current"]').boundingBox())!.width).toBeGreaterThan(300);
    // The comparison has its own size container: even on a wide viewport,
    // the sidebar can be narrow. Frozen diagrams must retain the full card
    // width rather than shrinking toe numerals into two tiny half-width maps.
    const frozen=await page.locator('[data-toe-frozen]').boundingBox();
    const pinnedMap=await page.locator('[data-toe-map="Pinned"]').boundingBox();
    const pinnedSlice=await page.locator('[data-toe-slice="Pinned"]').boundingBox();
    expect(pinnedMap!.width).toBeGreaterThan(300);
    if(frozen!.width<=440) {
      expect(pinnedMap!.width).toBeCloseTo(frozen!.width,0);
      expect(pinnedSlice!.width).toBeCloseTo(frozen!.width,0);
      expect(pinnedSlice!.y).toBeGreaterThanOrEqual(pinnedMap!.y+pinnedMap!.height-.5);
    }
    const violations=await page.evaluate(async()=>{
      const report=await (window as any).axe.run(document.querySelector('[data-birdlab-toe-study]'),{runOnly:{type:'rule',values:['color-contrast','button-name','select-name','label','aria-valid-attr-value','aria-required-children','aria-required-parent','nested-interactive']}});
      return report.violations.map((item:any)=>({id:item.id,targets:item.nodes.map((node:any)=>node.target)}));
    });expect(violations).toEqual([]);
  }
  expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
});
