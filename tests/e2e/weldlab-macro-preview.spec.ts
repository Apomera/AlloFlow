import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test.use({video:'off'});test.describe.configure({timeout:150_000,retries:0});
test('Local preview shows clearer macro guides and high-contrast selections',async({page})=>{
 test.skip(!process.env.WELDLAB_PREVIEW_URL,'Local preview is opt-in.');
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(process.env.WELDLAB_PREVIEW_URL!);
 await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css')as HTMLLinkElement)?.sheet));
 const plot=page.locator('[data-arc-xs]');await expect(plot).toBeVisible();await expect(plot.locator('[data-arc-xs-target-outline]')).toHaveAttribute('stroke-width','4.5');await expect(plot.locator('[data-arc-xs-ghost-outline]')).toHaveCount(1);
 await plot.screenshot({path:resolve('reports/weldlab-macro-accessibility/preview-macro-320.png')});
 await page.getByRole('button',{name:'High-contrast selections',exact:true}).click();await page.getByRole('button',{name:'High contrast',exact:true}).click();const choices=page.locator('[data-code-reader-section]');await choices.nth(1).focus();await page.keyboard.press('Enter');await expect(choices.nth(1)).toBeFocused();await expect(choices.nth(1)).toHaveAttribute('aria-pressed','true');
 expect(await choices.nth(1).evaluate(el=>getComputedStyle(el).textDecorationLine)).toContain('underline');expect(await choices.first().evaluate(el=>getComputedStyle(el).textDecorationLine)).toBe('none');
 await page.locator('[data-code-reader]').screenshot({path:resolve('reports/weldlab-macro-accessibility/preview-selection-320-contrast.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);expect(errors).toEqual([]);
});
