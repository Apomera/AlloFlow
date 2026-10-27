import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test.use({video:'off'});test.describe.configure({timeout:150_000,retries:0});
test('Local preview supports repair feedback, Code Reader focus and laser visibility',async({page})=>{
 test.skip(!process.env.WELDLAB_PREVIEW_URL,'Local preview is opt-in.');
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(process.env.WELDLAB_PREVIEW_URL!);
 await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css')as HTMLLinkElement)?.sheet));
 const slider=page.locator('#repair6-candidate');await slider.focus();await page.keyboard.press('ArrowLeft');await page.locator('[data-repair-apply]').focus();await page.keyboard.press('Enter');await expect(slider).toBeFocused();await expect(page.locator('#repair6-preview-readings')).toHaveAttribute('aria-live','polite');
 await page.getByRole('button',{name:'Code reader keyboard flow',exact:true}).click();const tiles=page.locator('[data-code-reader-section]');await tiles.nth(1).click();await page.locator('[data-code-reader-nav="previous"]').focus();await page.keyboard.press('Enter');await expect(tiles.nth(0)).toBeFocused();
 const search=page.locator('#code3-reader-search');await search.fill('no matching clause here');await page.locator('[data-code-reader-clear]').focus();await page.keyboard.press('Enter');await expect(search).toBeFocused();
 await page.getByRole('button',{name:'Robot laser clarity',exact:true}).click();await expect(page.locator('[data-robot-sensing-projection]')).toHaveAttribute('stroke','#ffe4e6');await expect(page.locator('[data-robot-sensing-projection-outline]')).toHaveAttribute('stroke-width','9');
 await page.getByRole('button',{name:'High contrast',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.locator('[data-robot-sensing-diagram="laser"]').screenshot({path:resolve('reports/weldlab-repair-accessibility/preview-laser-320-contrast.png')});expect(errors).toEqual([]);
});
