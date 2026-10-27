import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test.use({video:'off'});test.describe.configure({timeout:150_000,retries:0});
test('Local preview links notebook, recorded interval and comparison improvements',async({page})=>{
 test.skip(!process.env.WELDLAB_PREVIEW_URL,'Local preview is opt-in.');
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(process.env.WELDLAB_PREVIEW_URL!);
 await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css')as HTMLLinkElement)?.sheet));
 await page.locator('[data-arc-intervals] > summary').click();const select=page.locator('[data-arc-interval-select]');await select.focus();await select.selectOption('3');await expect(select).toBeFocused();await expect(page.locator('[data-arc-interval-section]')).toBeVisible();await expect(page.locator('[data-arc-interval-unfused-outline]')).toHaveAttribute('stroke-width','5');
 await page.getByRole('button',{name:'High contrast',exact:true}).click();await expect(page.locator('[data-arc-interval-unfused]')).toHaveAttribute('stroke','#000000');
 await page.locator('[data-arc-intervals]').screenshot({path:resolve('reports/weldlab-notebook-accessibility/preview-interval-320-contrast.png')});
 await page.getByRole('button',{name:'Comparison section clarity',exact:true}).click();await expect(page.locator('[data-arc-compare-unfused]')).toHaveCount(2);
 await page.getByRole('button',{name:'Notebook keyboard review',exact:true}).click();await expect(page.locator('[data-hunt-review]')).toHaveAttribute('data-hunt-review','empty');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);expect(errors).toEqual([]);
});
