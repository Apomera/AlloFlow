# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-diagram-reader.spec.ts >> diagram reading view zooms independently, traps focus, and restores its opener on Escape
- Location: tests\e2e\dissection-diagram-reader.spec.ts:10:5

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('dialog').getByRole('button', { name: 'Close diagram' })
Expected: focused
Received: inactive
Timeout:  15000ms

Call log:
  - Expect "toBeFocused" with timeout 15000ms
  - waiting for getByRole('dialog').getByRole('button', { name: 'Close diagram' })
    25 × locator resolved to <button type="button">Close diagram</button>
       - unexpected value "inactive"

```

```yaml
- button "Close diagram"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { mkdir } from 'node:fs/promises';
  3  | import { GlHarness } from './helpers/stem_gl_harness';
  4  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_dissection.js',toolId:'dissection',width:1180,height:900,appStyles:true,preScripts:['stem_lab/stem_lab_module.js']});
  5  | const out='reports/dissection-enhancement-2026-09-08';
  6  | test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
  7  | test.afterAll(async()=>{await harness.stop();});
  8  | const base={specimen:'frog',_dissLoadedSpec:'frog',activeLayer:'organs',anatomicalView:'internal',selectedOrgan:'lungs',compareMode:true,reducedMotion:true,soundEnabled:false,organNotes:{'frog|lungs':'A visible sac beside the heart.'},organConfidence:{'frog|lungs':2},exploredOrgans:{'frog|lungs':true},quizScore:1,quizTotal:2};
  9  | const snapshot=async(page:any)=>page.evaluate(()=>{const d=(window as any).__ctx.toolData.dissection;return {specimen:d.specimen,layer:d.activeLayer,selected:d.selectedOrgan,compare:d.compareMode,zoom:d.canvasZoom,notes:d.organNotes,confidence:d.organConfidence,explored:d.exploredOrgans,score:d.quizScore,total:d.quizTotal};});
  10 | test('diagram reading view zooms independently, traps focus, and restores its opener on Escape',async({page})=>{
  11 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  12 |   await harness.mount(page,{dissection:base},undefined,{expectCanvas:false});
  13 |   const before=await snapshot(page);
  14 |   const opener=page.locator('[data-comparison-specimen="perch"] [data-diagram-open]');await opener.focus();await page.keyboard.press('Enter');
  15 |   const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  16 |   const close=dialog.getByRole('button',{name:'Close diagram'});await expect(close).toBeFocused();
  17 |   await expect(dialog).toContainText('two fluids do not mix');await expect(dialog.getByRole('img')).toHaveAccessibleName(/Perch gill concept/);
  18 |   await dialog.getByRole('button',{name:'Zoom in',exact:true}).click();await expect(dialog.locator('[data-diagram-zoom]')).toHaveText('150%');
  19 |   const viewport=dialog.getByRole('region',{name:'Scrollable diagram'});
  20 |   expect(await viewport.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
> 21 |   await viewport.focus();await page.keyboard.press('Tab');await expect(close).toBeFocused();
     |                                                                               ^ Error: expect(locator).toBeFocused() failed
  22 |   await dialog.getByRole('button',{name:'Fit width'}).click();await expect(dialog.locator('[data-diagram-zoom]')).toHaveText('100%');
  23 |   await dialog.screenshot({path:out+'/diagram-reader-desktop.png'});
  24 |   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
  25 |   expect(await snapshot(page)).toEqual(before);expect(errors).toEqual([]);
  26 | });
  27 | test('diagram reading view supports phone zoom, keyboard pan, accessible text, and close',async({page})=>{
  28 |   await page.setViewportSize({width:320,height:844});
  29 |   await harness.mount(page,{dissection:{...base,selectedOrgan:'heart'}},undefined,{expectCanvas:false});
  30 |   await page.addStyleTag({content:'#wrap { width:100% !important; max-width:1180px; }'});
  31 |   const before=await snapshot(page);const opener=page.locator('[data-comparison-specimen="earthworm"] [data-diagram-open]');await opener.click();
  32 |   const dialog=page.getByRole('dialog');await expect(dialog).toContainText('five pairs');
  33 |   await dialog.getByRole('button',{name:'Zoom in',exact:true}).click();await dialog.getByRole('button',{name:'Zoom in',exact:true}).click();
  34 |   await expect(dialog.locator('[data-diagram-zoom]')).toHaveText('200%');
  35 |   const viewport=dialog.getByRole('region',{name:'Scrollable diagram'});await viewport.focus();await page.keyboard.press('ArrowRight');
  36 |   await expect.poll(()=>viewport.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  37 |   const bounds=await dialog.evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,overflow:el.scrollWidth-el.clientWidth}));
  38 |   expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(320);expect(bounds.overflow).toBeLessThanOrEqual(1);
  39 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  40 |   const audit=await page.evaluate(async()=>(window as any).axe.run({include:[['dialog']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  41 |   expect(audit.violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)}))).toEqual([]);
  42 |   await dialog.screenshot({path:out+'/diagram-reader-mobile.png'});
  43 |   await dialog.locator('.diss-diagram-reader__scope').scrollIntoViewIfNeeded();
  44 |   await dialog.screenshot({path:out+'/diagram-reader-mobile-text.png'});
  45 |   await dialog.getByRole('button',{name:'Close diagram'}).click();await expect(dialog).toHaveCount(0);await expect(opener).toBeFocused();
  46 |   expect(await snapshot(page)).toEqual(before);
  47 |   await opener.click();await expect(page.locator('[data-diagram-zoom]')).toHaveText('100%');await page.keyboard.press('Escape');
  48 | });
  49 | test('diagram reading view releases modality when comparison is withdrawn',async({page})=>{
  50 |   await harness.mount(page,{dissection:base},undefined,{expectCanvas:false});
  51 |   await page.locator('[data-diagram-open]').first().click();await expect(page.getByRole('dialog')).toBeVisible();
  52 |   await page.evaluate(()=>(window as any).__ctx.update('dissection','compareMode',false));
  53 |   await expect(page.getByRole('dialog')).toHaveCount(0);
  54 |   await page.locator('#diss-note-lungs').click();await expect(page.locator('#diss-note-lungs')).toBeFocused();
  55 |   await expect(page.locator('#diss-note-lungs')).toHaveValue('A visible sac beside the heart.');
  56 | });
  57 | test('diagram reading view provides a text fallback if native opening fails',async({page})=>{
  58 |   await harness.mount(page,{dissection:base},undefined,{expectCanvas:false});
  59 |   await page.evaluate(()=>{HTMLDialogElement.prototype.showModal=function(){throw new Error('Unavailable fixture');};});
  60 |   const opener=page.locator('[data-comparison-specimen="frog"] [data-diagram-open]');await opener.click();
  61 |   await expect(page.getByRole('dialog')).toHaveCount(0);await expect(opener).toBeFocused();
  62 |   await expect(page.locator('[data-comparison-specimen="frog"] [role="status"]')).toContainText('Adult frog: air is moved in by the mouth pump');
  63 | });
  64 | 
```