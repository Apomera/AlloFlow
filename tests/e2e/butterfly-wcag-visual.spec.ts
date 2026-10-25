import {test,expect,type Locator} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
import {readPng} from './helpers/png_pixels';

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_butterfly.js',toolId:'butterfly',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,layout:'document',width:1280,height:1000});
test.describe.configure({timeout:120000});
test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
test.beforeAll(()=>{mkdirSync('scratch/butterfly-wcag',{recursive:true});return harness.start();});
test.afterAll(()=>harness.stop());
test.afterEach(async({page})=>harness.destroy(page));

async function mount(page:any){
 await page.goto(harness.url+'/__harness');
 await page.evaluate(()=>{const w=window as any;w.StemLab.ensureThree=()=>Promise.reject(new Error('Test map'));w.__mount({butterfly:{}});Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});});
 await expect(page.locator('.bf-stage')).toHaveAttribute('data-bf-renderer','map');
}
async function theme(page:any,dark:boolean,contrast:boolean){
 await page.evaluate(({dark,contrast}:any)=>{const w=window as any;w.__ctx.isDark=dark;w.__ctx.isContrast=contrast;w.__rerender();},{dark,contrast});
 await expect(page.locator('.bfl')).toHaveAttribute('data-dark',String(dark));
 await expect(page.locator('.bfl')).toHaveAttribute('data-contrast',String(contrast));
}
async function contrast(locator:Locator,property:'borderTopColor'|'outlineColor',against:'self'|'parent'='self'){
 return locator.evaluate((element,args)=>{
  const luminance=(color:string)=>{const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
  const style=getComputedStyle(element);let background:Element|null=args.against==='self'?element:element.parentElement;
  while(background&&['rgba(0, 0, 0, 0)','transparent'].includes(getComputedStyle(background).backgroundColor))background=background.parentElement;
  if(!background)throw new Error('No opaque background for contrast check');
  const a=luminance(style[args.property]),b=luminance(getComputedStyle(background).backgroundColor);
  return {ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),color:style[args.property],background:getComputedStyle(background).backgroundColor,width:args.property==='outlineColor'?style.outlineWidth:style.borderTopWidth,style:args.property==='outlineColor'?style.outlineStyle:style.borderTopStyle};
 },{property,against});
}

test('form boundaries and keyboard focus retain contrast in light, dark and high contrast themes',async({page})=>{
 await mount(page);
 const select=page.locator('.bf-design select'),writing=page.locator('#bf-notebook-reasoning'),volume=page.getByRole('slider',{name:'Meadow volume',exact:true});
 for(const [dark,high] of [[false,false],[true,false],[false,true],[true,true]]){
  await theme(page,dark,high);
  await page.keyboard.press('Tab');
  for(const field of [select,writing]){
   await field.focus();await expect(field).toBeFocused();
   expect((await contrast(field,'borderTopColor')).ratio).toBeGreaterThanOrEqual(3);
   const focus=await contrast(field,'outlineColor','parent');expect(focus.ratio).toBeGreaterThanOrEqual(3);expect(focus.width).toBe('3px');expect(focus.style).toBe('solid');
  }
  await volume.focus();await expect(volume).toBeFocused();
  if(dark&&!high)await page.screenshot({path:'scratch/butterfly-wcag/dark-keyboard-focus.png'});
  const focus=await contrast(volume,'outlineColor','parent');expect(focus.ratio).toBeGreaterThanOrEqual(3);expect(focus.width).toBe('3px');
  const current=Number(await volume.inputValue());await volume.press(current<100?'ArrowRight':'ArrowLeft');await expect(volume).toHaveValue(String(current+(current<100?1:-1)));
  // A persistent selection keeps this contrast check independent of flight arrival timing.
  const selected=page.getByRole('button',{name:'Butterfly steering',exact:true});await selected.focus();await expect(selected).toHaveAttribute('aria-pressed','true');
  await expect(selected).toHaveCSS('outline-offset','3px');
  expect((await contrast(selected,'outlineColor','parent')).ratio).toBeGreaterThanOrEqual(3);
 }
});

test('320 pixel reflow and increased text spacing keep fieldwork controls usable',async({page})=>{
 await page.setViewportSize({width:320,height:900});await mount(page);
 await page.addStyleTag({content:'.bfl *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.bfl p{margin-bottom:2em!important}'});
 const overflowing=await page.locator('.bfl').evaluate(root=>Array.from(root.querySelectorAll('button,input,select,textarea')).filter(element=>{const box=element.getBoundingClientRect();return box.width>0&&(box.left<-.5||box.right>document.documentElement.clientWidth+.5);}).map(element=>({text:(element.textContent||element.getAttribute('aria-label')||element.tagName).slice(0,80),left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right})));
 expect(overflowing).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:'scratch/butterfly-wcag/narrow-text-spacing.png'});
 const field=page.locator('#bf-notebook-reasoning');await field.focus();await field.fill('A keyboard-accessible habitat observation.');await expect(field).toHaveValue('A keyboard-accessible habitat observation.');
 await page.getByRole('button',{name:'Visit without flying · Common milkweed',exact:true}).click();await expect(page.locator('.bf-stage')).toBeFocused();await page.getByRole('button',{name:'Land here',exact:true}).click();await page.getByRole('button',{name:'Examine patch',exact:true}).click();await expect(page.getByRole('heading',{name:'1 of 3 patches investigated'})).toBeVisible();
});

test('forced colors preserves visible field boundaries and keyboard indicators',async({page})=>{
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await mount(page);await theme(page,true,true);await page.keyboard.press('Tab');
 for(const field of [page.locator('.bf-design select'),page.locator('#bf-notebook-reasoning'),page.getByRole('slider',{name:'Meadow volume',exact:true})]){
  await field.focus();await expect(field).toBeFocused();const focus=await contrast(field,'outlineColor','parent');expect(focus.ratio).toBeGreaterThanOrEqual(3);expect(focus.style).toBe('solid');expect(focus.width).toBe('3px');
 }
 await page.screenshot({path:'scratch/butterfly-wcag/forced-colors-focus.png'});
 const select=page.locator('.bf-design select');expect((await contrast(select,'borderTopColor')).ratio).toBeGreaterThanOrEqual(3);
});

test('forced colors paints legible selected and primary button labels, including hover',async({page})=>{
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await mount(page);await theme(page,true,true);
 // Computed colors can pass contrast while Chromium paints an opaque white
 // backplate over the text. Inspect the actual label pixels, not just styles.
 for(const name of ['Take flight','Butterfly steering','Follow view','Soft daylight']){
  const button=page.getByRole('button',{name,exact:true});await button.scrollIntoViewIfNeeded();
  const bounds=await button.evaluate(element=>{
   const text=Array.from(element.childNodes).find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent?.trim());if(!text)throw new Error('Expected a visible text label');
   const range=document.createRange();range.selectNodeContents(text);const box=range.getBoundingClientRect(),outer=element.getBoundingClientRect();
   return {left:box.left-outer.left,top:box.top-outer.top,width:box.width,height:box.height,outerWidth:outer.width,color:getComputedStyle(element).color};
  });
  for(const hover of [false,true]){
   if(hover)await button.hover();else await page.mouse.move(0,0);
   const png=readPng(await button.screenshot());const scale=png.width/bounds.outerWidth;
   const background=png.at(Math.floor(png.width/2),Math.round(8*scale));
   const foreground=bounds.color.match(/[\d.]+/g)!.slice(0,3).map(Number);
   let backgroundPixels=0,textPixels=0,total=0;
   const near=(pixel:number[],color:number[])=>pixel.every((value,index)=>Math.abs(value-color[index])<=28);
   for(let y=Math.ceil(bounds.top*scale)+1;y<Math.floor((bounds.top+bounds.height)*scale)-1;y++)for(let x=Math.ceil(bounds.left*scale)+1;x<Math.floor((bounds.left+bounds.width)*scale)-1;x++){
    const pixel=png.at(x,y);total++;if(near(pixel,background))backgroundPixels++;if(near(pixel,foreground))textPixels++;
   }
   expect(total,name+' has rendered text bounds').toBeGreaterThan(100);
   expect(backgroundPixels/total,name+' label retains background between glyphs').toBeGreaterThan(.25);
   expect(textPixels/total,name+' has visible text strokes').toBeGreaterThan(.025);
  }
 }
 // Nested labels inherit the same system foreground rather than retaining a
 // decorative muted color after the targeted forced-color adjustment.
 const plan=page.locator('.bf-design-choices button[aria-pressed="true"]');
 expect(await plan.locator('small').evaluate(element=>getComputedStyle(element).color)).toBe(await plan.evaluate(element=>getComputedStyle(element).color));
});
