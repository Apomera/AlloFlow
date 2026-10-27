import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test.use({video:'off'});test.describe.configure({timeout:150_000,retries:0});
test('Local preview supports Blueprint edge focus, Codes feedback and readable robot markers',async({page})=>{
 test.skip(!process.env.WELDLAB_PREVIEW_URL,'Local preview is opt-in.');
 await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(process.env.WELDLAB_PREVIEW_URL!);
 await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css')as HTMLLinkElement)?.sheet));
 await page.locator('[data-blueprint-zoom="2"]').click();const pan=page.locator('[data-blueprint-pan="left"]');await pan.focus();
 for(let i=0;i<4;i++)await page.keyboard.press('Enter');await expect(pan).toHaveAttribute('aria-disabled','true');await expect(pan).toBeFocused();
 await page.getByRole('button',{name:'Codes inspection feedback',exact:true}).click();await expect(page.locator('#wps3-field-reading')).toHaveAttribute('aria-live','polite');
 await page.locator('[data-codes-flow-step="7"]').click();await page.locator('[data-codes-flow-next]').focus();await page.keyboard.press('Enter');await expect(page.locator('#codes6-flow-step-8')).toBeFocused();
 await page.getByRole('button',{name:'Robot marker clarity',exact:true}).click();await page.locator('[data-robot-inspect-select]').selectOption('1');const slider=page.locator('[data-robot-inspect-progress]');
 await slider.focus();await page.keyboard.press('End');await expect(slider).toHaveValue('100');await expect(page.locator('[data-robot-torch]')).toHaveAttribute('data-label-overlap','true');
 await page.getByRole('button',{name:'High contrast',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.locator('[data-robot-workcell]').screenshot({path:resolve('reports/weldlab-navigation-accessibility/preview-robot-320-contrast.png')});
});
