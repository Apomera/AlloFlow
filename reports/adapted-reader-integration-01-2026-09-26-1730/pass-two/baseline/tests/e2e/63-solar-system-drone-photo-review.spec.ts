import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const wide = new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:1180,height:900,appStyles:true});
const phone = new GlHarness({toolFile:'stem_lab/stem_tool_solarsystem.js',toolId:'solarSystem',width:340,height:820,appStyles:true});
test.beforeAll(async()=>{await wide.start();await phone.start();});
test.afterAll(async()=>{await wide.stop();await phone.stop();});
test.afterEach(async({page})=>{await wide.destroy(page);});
test.describe.configure({timeout:300000});
// Real WebGL screenshots provide visual evidence without continuous video encoding.
test.use({video:'off',trace:'off'});

for(const mode of [{planet:'mars',mobile:false},{planet:'earth',mobile:true}]) {
  test(mode.planet+' retains an uncropped photo and its captured camera context',async({page},info)=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize(mode.mobile?{width:340,height:820}:{width:1180,height:900});
    const harness=mode.mobile?phone:wide;
    await harness.mount(page,{solarSystem:{tutorialDismissed:true,selectedPlanet:'stem.solar_sys.'+mode.planet,viewTab:'drone',paused:true}},'document.querySelector("[data-drone-camera-bar]")');
    const canvas=page.locator('[data-drone-canvas]');
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>!document.getElementById('descent-status'),null,{timeout:60000});
    await page.getByRole('button',{name:'Survey camera',exact:true}).click();
    await page.getByRole('button',{name:'Closer survey view',exact:true}).click();
    await page.getByRole('button',{name:'Closer survey view',exact:true}).click();
    await expect(canvas).toHaveAttribute('data-drone-camera-fov','52.0');
    await expect(canvas).toHaveAttribute('data-drone-survey-zoom','1.5');
    await page.getByRole('button',{name:'Scene focus',exact:true}).click();
    await expect(page.locator('[data-drone-action-dock]')).toBeHidden();
    const capture=page.getByRole('button',{name:'Capture photo',exact:true});
    const review=page.getByRole('button',{name:'Review photo',exact:true});
    await expect(review).toBeDisabled();
    await capture.evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
    const card=page.getByRole('region',{name:'Photo captured'});
    await expect(card).toBeVisible();
    await expect(page.getByRole('button',{name:'Close photo review'})).toBeFocused();
    const image=page.locator('[data-drone-photo-image]');
    await expect(image).toBeVisible();
    const imageData=await image.evaluate((img:HTMLImageElement)=>({src:img.src,w:img.naturalWidth,h:img.naturalHeight,fit:getComputedStyle(img).objectFit}));
    expect(imageData.src).toMatch(/^data:image\/jpeg/);
    expect(Math.max(imageData.w,imageData.h)).toBeLessThanOrEqual(1280);
    const original=await canvas.evaluate((c:HTMLCanvasElement)=>({w:c.width,h:c.height}));
    expect(imageData.w/imageData.h).toBeCloseTo(original.w/original.h,2);
    expect(imageData.fit).toBe('contain');
    const caption=await page.locator('[data-drone-photo-context]').innerText();
    expect(caption).toContain('Survey view, north up; 1.5× framing.');
    expect(caption).toContain('Vehicle heading');
    const photoEntries=()=>page.evaluate(()=>(window as any).__toolData.solarSystem.journalEntries.filter((e:any)=>e.kind==='Photo'));
    const entries=await photoEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].photoContext.cameraView).toBe('survey');
    expect(entries[0].photoContext.surveyFraming).toBe(1.5);
    expect(entries[0].photoThumb).toBeUndefined();
    expect(JSON.stringify(entries[0])).not.toContain('data:image');
    // Preserve the captured pixels/context while the live camera changes.
    await page.getByRole('button',{name:'Pilot camera',exact:true}).click();
    await expect(canvas).toHaveAttribute('data-drone-camera-fov','70.0');
    await expect(image).toHaveAttribute('src',imageData.src);
    await expect(page.locator('[data-drone-photo-context]')).toHaveText(caption);
    // The old preview disappeared after 6.5 seconds.
    await page.waitForTimeout(7000);
    await expect(card).toBeVisible();
    await page.getByRole('button',{name:'Close photo review'}).click();
    await expect(canvas).toBeFocused();
    await expect(card).toHaveCount(0);
    await review.click();
    await expect(page.locator('[data-drone-photo-context]')).toHaveText(caption);
    await expect(image).toHaveAttribute('src',imageData.src);
    const downloadEvent=page.waitForEvent('download');
    await page.getByRole('link',{name:'Download photo',exact:true}).click();
    const download=await downloadEvent;
    expect(download.suggestedFilename()).toMatch(/\.jpg$/);
    expect(await download.failure()).toBeNull();
    await page.locator('#drone-fullscreen-container').screenshot({path:info.outputPath(mode.planet+'-photo-review.png'),timeout:60000});
    if(mode.mobile){
      const box=await card.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(340);
      for(const button of [capture,review,page.getByRole('button',{name:'Close photo review'})]) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button',{name:'Close photo review'}).press('Escape');
    await expect(card).toHaveCount(0);
    await expect(canvas).toBeFocused();
    // Failed capture must not manufacture evidence or replace the last valid photo.
    await page.evaluate(()=>{(window as any).__photoDataURL=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=()=>{throw new Error('capture blocked for test');};});
    await capture.click();
    await expect(page.getByRole('region',{name:'Photo unavailable'})).toBeVisible();
    expect(await photoEntries()).toHaveLength(1);
    await page.evaluate(()=>{HTMLCanvasElement.prototype.toDataURL=(window as any).__photoDataURL;});
    await review.click();
    await expect(image).toHaveAttribute('src',imageData.src);
    await page.getByRole('button',{name:'Close photo review'}).click();
    await page.locator('[data-drone-fullscreen-toggle]').click();
    await expect(page.locator('[data-drone-fullscreen-toggle]')).toHaveAttribute('aria-pressed','true');
    await expect.poll(()=>page.evaluate(()=>document.querySelector('[data-drone-camera-bar]')!.getBoundingClientRect().bottom<=innerHeight+1)).toBe(true);
    await review.click();
    await expect(card).toBeVisible();
    await page.getByRole('button',{name:'Close photo review'}).click();
    await page.locator('[data-drone-fullscreen-toggle]').click();
    await expect(page.locator('[data-drone-fullscreen-toggle]')).toHaveAttribute('aria-pressed','false');
    expect((await page.evaluate(()=>(window as any).__events.errors)).filter((e:string)=>!/ResizeObserver loop/.test(e))).toEqual([]);
    await harness.destroy(page);
    await expect(page.locator('[data-drone-photo-review]')).toHaveCount(0);
  });
}
