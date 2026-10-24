import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off',trace:'off'});
test.describe.configure({timeout:180000,retries:0});
const harness=new GlHarness({toolId:'birdLab',toolFile:'stem_lab/stem_tool_birdlab.js'});
const output=resolve(process.env.STEM_ASSET_REPORT||'reports/shared-assets-pilot');
test.beforeAll(async()=>{mkdirSync(output,{recursive:true});await harness.start();});
test.afterAll(async()=>harness.stop());
test('native and catalog render identically with isolated cleanup and keyboard/mobile access',async({page})=>{
  const errors:string[]=[],remote:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{if(!request.url().startsWith(harness.url))remote.push(request.url());});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{const native=HTMLCanvasElement.prototype.getContext,contexts:any[]=[];(window as any).previewContexts=contexts;
    HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:any[]){const value=(native as any).apply(this,args);if(value&&/^webgl|experimental-webgl/.test(args[0])&&!contexts.some(x=>x.gl===value))contexts.push({canvas:this,gl:value});return value; } as any;
  });
  await page.goto(harness.url+'/dev-tools/shared_assets_preview.html');
  await expect(page.locator('#asset-entry option')).toHaveCount(5);
  expect(await page.evaluate(()=>(window as any).previewContexts.length)).toBe(0);
  await page.locator('#open-preview').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#shared-assets-preview')).toHaveAttribute('data-preview-live','true');
  const measurements:any[]=[];
  async function compare(){
    const result=await page.evaluate(()=>{
      const get=(id:string)=>({...((document.getElementById(id) as HTMLElement).dataset)});
      const current=(window as any).previewContexts.filter((x:any)=>x.canvas.isConnected),pixels=current.map((x:any)=>{const g=x.gl,w=g.drawingBufferWidth,h=g.drawingBufferHeight,b=new Uint8Array(w*h*4);g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,b);return b;});
      let difference=0,colors=new Set<string>();for(let i=0;i<pixels[0].length;i+=4){difference+=Math.abs(pixels[0][i]-pixels[1][i])+Math.abs(pixels[0][i+1]-pixels[1][i+1])+Math.abs(pixels[0][i+2]-pixels[1][i+2]);if(i%32===0)colors.add(pixels[0].slice(i,i+3).join(','));}
      return{native:get('native-pane'),catalog:get('catalog-pane'),live:current.length,meanDifference:difference/(pixels[0].length*.75),colors:colors.size,canvasLabels:current.map((x:any)=>x.canvas.getAttribute('aria-label'))};
    });
    expect(result.live).toBe(2);expect(result.native).toEqual(result.catalog);expect(result.colors).toBeGreaterThan(20);expect(result.meanDifference).toBeLessThan(.5);expect(result.native.modelScale).toBe('[1,1,1]');
    expect(result.canvasLabels.every((x:string)=>x.length>15)).toBe(true);measurements.push(result);
  }
  await compare();
  await page.locator('#asset-pose').selectOption('flight');await compare();
  await page.screenshot({path:resolve(output,'preview-dove.jpg'),type:'jpeg',quality:85});
  await page.locator('#asset-quality').selectOption('low');await compare();
  for(const kind of ['shrub','grass','reed','seed']){
    await page.locator('#asset-entry').selectOption('plant.meadow-'+kind);await compare();
    await expect(page.locator('#asset-quality')).toBeDisabled();await expect(page.locator('#asset-pose')).toBeDisabled();
    await expect(page.locator('#asset-metadata')).toContainText('authored-relative');
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#asset-entry').selectOption('plant.meadow-grass');await compare();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({path:resolve(output,'preview-mobile.jpg'),type:'jpeg',quality:85,fullPage:true});
  await page.locator('#close-preview').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#shared-assets-preview')).toHaveAttribute('data-preview-live','false');
  await expect(page.locator('#open-preview')).toBeFocused();await expect(page.locator('canvas')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>(window as any).previewContexts.every((x:any)=>x.gl.isContextLost()))).toBe(true);
  const cleanup=await page.locator('#shared-assets-preview').evaluate((node:HTMLElement)=>({...node.dataset}));
  expect(Number(cleanup.disposedModels)).toBe(Number(cleanup.openCount)*2);expect(cleanup.disposedModels).toBe(cleanup.disposedRenderers);
  expect(remote).toEqual([]);expect(errors).toEqual([]);
  writeFileSync(resolve(output,'preview.json'),JSON.stringify({measurements,cleanup,remote,errors},null,2));
});
