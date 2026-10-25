import { test,expect } from '@playwright/test';
test.use({video:'off'});
test('Local accessibility review shortcuts use the current working copy',async({page})=>{
 test.skip(!process.env.WELDLAB_PREVIEW_URL,'Local preview is opt-in.');
 await page.setViewportSize({width:320,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(process.env.WELDLAB_PREVIEW_URL!);
 await page.waitForFunction(()=>Boolean((document.getElementById('preview-app-css') as HTMLLinkElement)?.sheet));
 await page.locator('[data-weld-module-query]').fill('Symbols Reader');
 await page.locator('[data-weld-module-result="symbolsReader"] button').focus();await page.keyboard.press('Enter');
 await expect(page.locator('[data-weld-view="symbolsReader"] h1')).toBeFocused();
 await page.getByRole('button',{name:'Camera click controls',exact:true}).click();
 await expect(page.locator('[data-weld-scene-controls]')).toBeVisible({timeout:30000});
 await page.locator('[data-weld-scene-orbit="left"]').click();
 await page.getByRole('button',{name:'Pay form feedback',exact:true}).click();
 await page.getByRole('button',{name:'Check',exact:true}).click();
 await expect(page.locator('#pipe2-guess')).toHaveAccessibleDescription('Type a dollar amount first.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
