import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test.use({video:'off'});test.describe.configure({timeout:150_000,retries:0});
test('Local preview offers the improved career, interval, ledger and heat controls',async({page})=>{
 test.skip(!process.env.WELDLAB_PREVIEW_URL,'Local preview is opt-in.');
 await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(process.env.WELDLAB_PREVIEW_URL!);
 await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css')as HTMLLinkElement)?.sheet));
 await page.locator('[data-career-milestone-next]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-career-milestone-pick="2"]')).toBeFocused();
 await expect(page.locator('#story5-milestone-readings')).toHaveAttribute('aria-live','polite');
 await page.getByRole('button',{name:'Career comparison feedback',exact:true}).click();
 await expect(page.locator('[data-career-age-slider]')).toHaveAccessibleDescription(/Sarah[\s\S]*Mike/);
 await page.getByRole('button',{name:'Bead interval navigation',exact:true}).click();await page.locator('[data-arc-intervals] > summary').click();
 await page.locator('[data-arc-interval-select]').selectOption('3');await page.locator('[data-arc-interval-next]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-arc-interval-select]')).toBeFocused();
 await page.getByRole('button',{name:'Robot time navigation',exact:true}).click();await page.locator('[data-rob-time-select]').selectOption('3');await page.locator('[data-rob-time-next]').focus();await page.keyboard.press('Enter');await expect(page.locator('[data-rob-time-select]')).toBeFocused();
 await page.getByRole('button',{name:'Heat dimension contrast',exact:true}).click();await expect(page.locator('[data-hi-penetration-dimension]')).toHaveAttribute('stroke','#0f172a');
 await page.getByRole('button',{name:'High contrast',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.locator('svg[aria-label^="Bead cross-section on"]').screenshot({path:resolve('reports/weldlab-milestone-accessibility/preview-heat-320-contrast.png')});
});
